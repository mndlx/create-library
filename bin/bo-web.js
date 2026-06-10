#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const path = __importStar(require("path"));
const engine_1 = require("../engine");
const PORT = Number(process.env.PORT) || 4317;
const WEB_DIR = path.join(__dirname, '..', 'web');
const sendJson = (res, code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
};
const readBody = (req) => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
        raw += c;
        if (raw.length > 5000000)
            req.destroy();
    });
    req.on('end', () => {
        try {
            resolve(raw ? JSON.parse(raw) : {});
        }
        catch (e) {
            reject(e);
        }
    });
    req.on('error', reject);
});
const serialize = (t) => ({
    name: t.manifest.name,
    title: t.manifest.title ?? t.manifest.name,
    description: t.manifest.description ?? '',
    output: (0, engine_1.outputModeOf)(t),
    nameVar: (0, engine_1.nameVarOf)(t),
    dir: t.dir,
    prompts: t.manifest.prompts,
    features: t.manifest.features ?? [],
});
const requireTemplate = (name) => {
    const t = (0, engine_1.findTemplate)(name);
    if (!t)
        throw new Error(`Unknown template: ${name}`);
    return t;
};
const componentTsx = (name) => `import * as React from 'react';\n\n` +
    `export interface ${name}Props extends React.HTMLAttributes<HTMLDivElement> {}\n\n` +
    `export const ${name} = React.forwardRef<HTMLDivElement, ${name}Props>((props, ref) => (\n` +
    `    <div ref={ref} {...props} />\n));\n\n` +
    `${name}.displayName = '${name}';\n`;
function addComponent(t, rawName, onByDefault) {
    const comp = String(rawName || '').trim().replace(/[^A-Za-z0-9]/g, '');
    if (!comp)
        throw new Error('A component name is required');
    const featureId = comp.toLowerCase();
    const barrel = path.join(t.sourceDir, 'src', 'components', 'index.ts');
    fs.mkdirSync(path.dirname(barrel), { recursive: true });
    if (!fs.existsSync(barrel))
        fs.writeFileSync(barrel, '/* inject:componentExports */\n');
    else if (!fs.readFileSync(barrel, 'utf8').includes('/* inject:componentExports */')) {
        fs.appendFileSync(barrel, '\n/* inject:componentExports */\n');
    }
    const overlayRel = path.join('features', featureId);
    const compDir = path.join(t.dir, overlayRel, 'src', 'components', comp);
    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(path.join(compDir, `${comp}.tsx`), componentTsx(comp));
    fs.writeFileSync(path.join(compDir, 'index.ts'), `export * from './${comp}';\n`);
    const m = (0, engine_1.readRawManifest)(t.dir);
    m.features = m.features || [];
    if (m.features.some((f) => f.id === featureId))
        throw new Error(`Feature "${featureId}" already exists`);
    m.features.push({
        id: featureId,
        label: `Include the ${comp} component`,
        type: 'boolean',
        default: onByDefault,
        overlay: overlayRel.split(path.sep).join('/'),
        inject: [{ file: 'src/components/index.ts', marker: 'componentExports', content: `export * from './${comp}';` }],
    });
    const errors = (0, engine_1.validateManifest)(m);
    if (errors.length)
        throw new Error(errors.join('; '));
    (0, engine_1.writeRawManifest)(t.dir, m);
}
async function handleApi(req, res, pathname) {
    if (req.method === 'GET' && pathname === '/api/state') {
        return sendJson(res, 200, {
            templates: (0, engine_1.listTemplates)().map(serialize),
            dirs: (0, engine_1.resolveTemplateDirs)(),
            cwd: process.cwd(),
        });
    }
    const body = req.method === 'POST' ? await readBody(req) : {};
    if (req.method === 'POST' && pathname === '/api/generate') {
        const t = requireTemplate(body.templateName);
        const answers = body.answers || {};
        const features = body.features || {};
        const mode = body.mode || (0, engine_1.outputModeOf)(t);
        const into = path.resolve(body.into || process.cwd());
        if (mode === 'merge') {
            const { tokens, report } = (0, engine_1.mergeInto)({ template: t, projectDir: into, answers, features, force: !!body.force });
            return sendJson(res, 200, { ok: true, mode, into, report, nextSteps: (0, engine_1.renderNextSteps)(t, tokens) });
        }
        const name = answers[(0, engine_1.nameVarOf)(t)] || t.manifest.name;
        const targetDir = path.join(into, name);
        const { tokens } = (0, engine_1.generate)({ template: t, targetDir, answers, features });
        return sendJson(res, 200, { ok: true, mode, targetDir, nextSteps: (0, engine_1.renderNextSteps)(t, tokens) });
    }
    if (req.method === 'POST' && pathname === '/api/preset') {
        const t = requireTemplate(body.templateName);
        const file = path.resolve(body.file || `${t.manifest.name}.preset.json`);
        (0, engine_1.savePreset)(file, { template: t.manifest.name, answers: body.answers || {}, features: body.features || {} });
        return sendJson(res, 200, { ok: true, file });
    }
    if (req.method === 'POST' && pathname === '/api/create-template') {
        const rootDir = path.resolve(body.rootDir);
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = (0, engine_1.scaffoldTemplate)({
            rootDir,
            name: body.name,
            title: body.title,
            description: body.description,
            output: body.output === 'merge' ? 'merge' : 'new',
        });
        return sendJson(res, 200, { ok: true, dir });
    }
    if (req.method === 'POST' && pathname === '/api/add-variable') {
        const t = requireTemplate(body.templateName);
        const m = (0, engine_1.readRawManifest)(t.dir);
        m.prompts = m.prompts || [];
        m.prompts.push(body.prompt);
        const errors = (0, engine_1.validateManifest)(m);
        if (errors.length)
            throw new Error(errors.join('; '));
        (0, engine_1.writeRawManifest)(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/add-component') {
        addComponent(requireTemplate(body.templateName), body.component, !!body.default);
        return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/set-output') {
        const t = requireTemplate(body.templateName);
        const m = (0, engine_1.readRawManifest)(t.dir);
        m.output = body.output === 'merge' ? 'merge' : 'new';
        (0, engine_1.writeRawManifest)(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/add-dir') {
        return sendJson(res, 200, { ok: true, dir: (0, engine_1.addTemplateDir)(body.dir) });
    }
    if (req.method === 'POST' && pathname === '/api/validate') {
        const t = requireTemplate(body.templateName);
        return sendJson(res, 200, { ok: true, errors: (0, engine_1.validateManifest)((0, engine_1.readRawManifest)(t.dir)) });
    }
    sendJson(res, 404, { error: 'Not found' });
}
const CONTENT_TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
function serveStatic(res, pathname) {
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const full = path.join(WEB_DIR, rel);
    if (!full.startsWith(WEB_DIR) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(full)] || 'application/octet-stream' });
    res.end(fs.readFileSync(full));
}
const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
        handleApi(req, res, url.pathname).catch((e) => sendJson(res, 400, { error: e.message }));
        return;
    }
    serveStatic(res, url.pathname);
});
server.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`create-library back-office (web) → ${url}`);
    if (!process.env.NO_OPEN) {
        const opener = process.platform === 'win32' ? `start "" "${url}"` :
            process.platform === 'darwin' ? `open "${url}"` :
                `xdg-open "${url}"`;
        (0, child_process_1.exec)(opener, () => { });
    }
});
