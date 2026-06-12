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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const engine_1 = require("../engine");
const PORT = Number(process.env.PORT) || 4517;
const WEB_DIR = path.join(__dirname, '..', 'web');
const sendJson = (res, code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
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
    version: t.manifest.version ?? '1.0.0',
    prompts: t.manifest.prompts,
    features: t.manifest.features ?? [],
    tokenConfig: (0, engine_1.tokenConfigOf)(t),
    variables: (0, engine_1.resolveVariables)(t),
    foreignTokens: (0, engine_1.detectForeignTokens)(t),
});
const requireTemplate = (name) => {
    const t = (0, engine_1.findTemplate)(name);
    if (!t)
        throw new Error(`Unknown template: ${name}`);
    return t;
};
/** Resolve a template-relative path, refusing anything that escapes the template dir. */
const safeJoin = (baseDir, rel) => {
    const full = path.resolve(baseDir, rel || '.');
    const base = path.resolve(baseDir);
    if (full !== base && !full.startsWith(base + path.sep)) {
        throw new Error(`Path escapes template: ${rel}`);
    }
    return full;
};
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.vs']);
/** Recursively list a template's files as a tree (dirs first, alphabetical). */
const buildTree = (baseDir, dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const nodes = [];
    for (const e of entries) {
        if (e.isDirectory() && IGNORED_DIRS.has(e.name))
            continue;
        const full = path.join(dir, e.name);
        const rel = path.relative(baseDir, full).split(path.sep).join('/');
        if (e.isDirectory()) {
            nodes.push({ name: e.name, path: rel, type: 'dir', children: buildTree(baseDir, full) });
        }
        else {
            nodes.push({ name: e.name, path: rel, type: 'file' });
        }
    }
    nodes.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1);
    return nodes;
};
const isProbablyBinary = (buf) => {
    const len = Math.min(buf.length, 8000);
    for (let i = 0; i < len; i++)
        if (buf[i] === 0)
            return true;
    return false;
};
/**
 * Resolve the base directory the file APIs operate inside. Either a registered
 * template (by name) or an arbitrary `root` directory ("open a workspace").
 */
const resolveBase = (q) => {
    if (q.root && q.root.trim()) {
        const dir = path.resolve(q.root.trim());
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory())
            throw new Error(`Not a directory: ${dir}`);
        return dir;
    }
    if (q.template && q.template.trim())
        return requireTemplate(q.template).dir;
    throw new Error('Provide a "template" or a "root" directory');
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
async function handleApi(req, res, pathname, query) {
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
        const includeManifest = !!body.includeManifest;
        if (mode === 'merge') {
            fs.mkdirSync(into, { recursive: true }); // merging into a fresh folder is fine
            const { tokens, report } = (0, engine_1.mergeInto)({ template: t, projectDir: into, answers, features, force: !!body.force, includeManifest });
            return sendJson(res, 200, { ok: true, mode, into, report, nextSteps: (0, engine_1.renderNextSteps)(t, tokens) });
        }
        const name = answers[(0, engine_1.nameVarOf)(t)] || t.manifest.name;
        const targetDir = path.join(into, name);
        const { tokens } = (0, engine_1.generate)({ template: t, targetDir, answers, features, includeManifest });
        return sendJson(res, 200, { ok: true, mode, targetDir, nextSteps: (0, engine_1.renderNextSteps)(t, tokens) });
    }
    if (req.method === 'POST' && pathname === '/api/preset') {
        const t = requireTemplate(body.templateName);
        const file = path.resolve(body.file || `${t.manifest.name}.preset.json`);
        (0, engine_1.savePreset)(file, { template: t.manifest.name, answers: body.answers || {}, features: body.features || {} });
        return sendJson(res, 200, { ok: true, file });
    }
    if (req.method === 'POST' && pathname === '/api/create-template') {
        const name = String(body.name || '').trim();
        if (!name)
            throw new Error('A template name is required');
        const rootDir = path.resolve(body.rootDir && String(body.rootDir).trim() ? body.rootDir : process.cwd());
        fs.mkdirSync(rootDir, { recursive: true });
        const opts = {
            rootDir,
            name,
            title: body.title,
            description: body.description,
            output: (body.output === 'merge' ? 'merge' : 'new'),
            source: body.source === '.' ? '.' : 'template',
        };
        // If importFrom is given, copy that directory as the payload; else scaffold samples.
        const dir = body.importFrom && String(body.importFrom).trim()
            ? (0, engine_1.importTemplate)({ ...opts, importFrom: String(body.importFrom).trim() })
            : (0, engine_1.scaffoldTemplate)(opts);
        // Make the new template discoverable by registering its parent directory.
        if (!(0, engine_1.resolveTemplateDirs)().includes(rootDir))
            (0, engine_1.addTemplateDir)(rootDir);
        return sendJson(res, 200, { ok: true, dir, name });
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
    // Rename a template: update the manifest name and, when the folder is
    // named after the template, rename the folder too.
    if (req.method === 'POST' && pathname === '/api/rename-template') {
        const t = requireTemplate(body.templateName);
        const newName = String(body.newName || '').trim();
        if (!newName)
            throw new Error('A new name is required');
        if (newName !== t.manifest.name && (0, engine_1.findTemplate)(newName))
            throw new Error(`A template named "${newName}" already exists`);
        const m = (0, engine_1.readRawManifest)(t.dir);
        m.name = newName;
        const errors = (0, engine_1.validateManifest)(m);
        if (errors.length)
            throw new Error(errors.join('; '));
        (0, engine_1.writeRawManifest)(t.dir, m);
        let dir = t.dir;
        if (path.basename(t.dir) === body.templateName) {
            const dest = path.join(path.dirname(t.dir), newName);
            if (!fs.existsSync(dest)) {
                fs.renameSync(t.dir, dest);
                dir = dest;
            }
        }
        return sendJson(res, 200, { ok: true, name: newName, dir });
    }
    // Delete a template's working copy (and optionally its published versions).
    if (req.method === 'POST' && pathname === '/api/delete-template') {
        const t = requireTemplate(body.templateName);
        fs.rmSync(t.dir, { recursive: true, force: true });
        if (body.deletePublished) {
            fs.rmSync(path.join((0, engine_1.publishedRoot)(), t.manifest.name), { recursive: true, force: true });
        }
        return sendJson(res, 200, { ok: true });
    }
    // Update manifest metadata (title, description, version, output).
    if (req.method === 'POST' && pathname === '/api/set-meta') {
        const t = requireTemplate(body.templateName);
        const m = (0, engine_1.readRawManifest)(t.dir);
        if (body.title !== undefined)
            m.title = String(body.title);
        if (body.description !== undefined)
            m.description = String(body.description);
        if (body.version !== undefined)
            m.version = String(body.version);
        if (body.output !== undefined)
            m.output = body.output === 'merge' ? 'merge' : 'new';
        const errors = (0, engine_1.validateManifest)(m);
        if (errors.length)
            throw new Error(errors.join('; '));
        (0, engine_1.writeRawManifest)(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }
    // Export (publish) a snapshot of the template into the local registry.
    if (req.method === 'POST' && pathname === '/api/export') {
        const t = requireTemplate(body.templateName);
        const bump = ['patch', 'minor', 'major'].includes(body.bump) ? body.bump : undefined;
        const result = (0, engine_1.exportTemplate)(t, { bump, overwrite: !!body.overwrite });
        return sendJson(res, 200, { ok: true, ...result });
    }
    if (req.method === 'GET' && pathname === '/api/published') {
        return sendJson(res, 200, { ok: true, versions: (0, engine_1.listPublishedVersions)(query.template || undefined) });
    }
    // The latest published snapshot of a template, serialized like /api/state entries.
    if (req.method === 'GET' && pathname === '/api/published-template') {
        const pub = (0, engine_1.listPublishedVersions)(query.template || '')[0];
        if (!pub)
            return sendJson(res, 200, { ok: true, published: null });
        return sendJson(res, 200, { ok: true, published: serialize((0, engine_1.loadManifest)(pub.dir)) });
    }
    // Export: generate from the latest PUBLISHED snapshot with the given values
    // and stream the result as a zip (same engine path the CLI generation uses).
    if (req.method === 'POST' && pathname === '/api/export-zip') {
        const name = String(body.templateName || '');
        const pub = (0, engine_1.listPublishedVersions)(name)[0];
        if (!pub)
            throw new Error(`No published version of "${name}". Publish one first.`);
        const t = (0, engine_1.loadManifest)(pub.dir);
        const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vlcl-zip-'));
        const tree = path.join(stagingRoot, 'tree');
        try {
            (0, engine_1.assemble)(t, tree, body.answers || {}, body.features || {}, !!body.includeManifest);
            const zip = (0, engine_1.zipDirectory)(tree);
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${pub.name}-${pub.version}.zip"`,
                'Cache-Control': 'no-store',
            });
            res.end(zip);
        }
        finally {
            fs.rmSync(stagingRoot, { recursive: true, force: true });
        }
        return;
    }
    if (req.method === 'POST' && pathname === '/api/set-token-config') {
        const t = requireTemplate(body.templateName);
        const start = String(body.start ?? '').trim();
        const end = String(body.end ?? '').trim();
        if (!start || !end)
            throw new Error('start and end delimiters are required');
        const m = (0, engine_1.readRawManifest)(t.dir);
        m.tokenConfig = { start, end };
        const errors = (0, engine_1.validateManifest)(m);
        if (errors.length)
            throw new Error(errors.join('; '));
        (0, engine_1.writeRawManifest)(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }
    // Upsert a token's metadata (message, default, type, options, validate, exposeCli).
    if (req.method === 'POST' && pathname === '/api/set-variable') {
        const t = requireTemplate(body.templateName);
        const v = body.variable;
        if (!v || !v.name)
            throw new Error('variable.name is required');
        const m = (0, engine_1.readRawManifest)(t.dir);
        m.prompts = m.prompts || [];
        const token = v.token || v.name;
        const idx = m.prompts.findIndex((p) => (p.token || p.name) === token);
        const next = {
            name: v.name,
            message: v.message || v.name,
            type: v.type === 'select' ? 'select' : 'text',
            token,
            default: v.default,
            validate: v.validate,
            options: v.type === 'select' ? v.options : undefined,
            exposeCli: v.exposeCli !== false,
        };
        if (idx >= 0)
            m.prompts[idx] = next;
        else
            m.prompts.push(next);
        const errors = (0, engine_1.validateManifest)(m);
        if (errors.length)
            throw new Error(errors.join('; '));
        (0, engine_1.writeRawManifest)(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/remove-variable') {
        const t = requireTemplate(body.templateName);
        const m = (0, engine_1.readRawManifest)(t.dir);
        const token = String(body.token || '');
        m.prompts = (m.prompts || []).filter((p) => (p.token || p.name) !== token);
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
    // Directory browser for folder pickers: list subdirectories of a path.
    if (req.method === 'GET' && pathname === '/api/fs/dirs') {
        const raw = (query.path || '').trim();
        if (!raw) {
            // Roots: drive letters on Windows, '/' elsewhere.
            if (process.platform === 'win32') {
                const drives = [];
                for (let c = 65; c <= 90; c++) {
                    const d = String.fromCharCode(c) + ':\\';
                    try {
                        if (fs.existsSync(d))
                            drives.push(d);
                    }
                    catch { /* skip */ }
                }
                return sendJson(res, 200, { ok: true, path: '', parent: null, dirs: drives, roots: true });
            }
            return sendJson(res, 200, { ok: true, path: '', parent: null, dirs: ['/'], roots: true });
        }
        const dir = path.resolve(raw);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory())
            throw new Error(`Not a directory: ${dir}`);
        const dirs = fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b));
        const parent = path.dirname(dir);
        return sendJson(res, 200, { ok: true, path: dir, parent: parent === dir ? '' : parent, dirs, roots: false });
    }
    if (req.method === 'POST' && pathname === '/api/fs/mkdir') {
        const dir = path.resolve(String(body.path || ''));
        if (!dir)
            throw new Error('A path is required');
        fs.mkdirSync(dir, { recursive: true });
        return sendJson(res, 200, { ok: true, dir });
    }
    // ---- File explorer / editor APIs (operate inside a template's directory) ----
    if (req.method === 'GET' && pathname === '/api/files') {
        const base = resolveBase(query);
        return sendJson(res, 200, { ok: true, root: base, tree: buildTree(base, base) });
    }
    if (req.method === 'GET' && pathname === '/api/file') {
        const base = resolveBase(query);
        const full = safeJoin(base, query.path || '');
        if (!fs.existsSync(full) || !fs.statSync(full).isFile())
            throw new Error('File not found');
        const buf = fs.readFileSync(full);
        if (isProbablyBinary(buf))
            return sendJson(res, 200, { ok: true, binary: true, content: '' });
        return sendJson(res, 200, { ok: true, binary: false, content: buf.toString('utf8') });
    }
    if (req.method === 'POST' && pathname === '/api/file/save') {
        const base = resolveBase({ template: body.templateName, root: body.root });
        const full = safeJoin(base, body.path || '');
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, String(body.content ?? ''));
        return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/file/create') {
        const base = resolveBase({ template: body.templateName, root: body.root });
        const full = safeJoin(base, body.path || '');
        if (fs.existsSync(full))
            throw new Error('Already exists');
        if (body.dir) {
            fs.mkdirSync(full, { recursive: true });
        }
        else {
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, String(body.content ?? ''));
        }
        return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/file/delete') {
        const base = resolveBase({ template: body.templateName, root: body.root });
        const full = safeJoin(base, body.path || '');
        if (full === path.resolve(base))
            throw new Error('Refusing to delete the workspace root');
        fs.rmSync(full, { recursive: true, force: true });
        return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/file/rename') {
        const base = resolveBase({ template: body.templateName, root: body.root });
        const from = safeJoin(base, body.from || '');
        const to = safeJoin(base, body.to || '');
        if (!fs.existsSync(from))
            throw new Error('Source not found');
        if (fs.existsSync(to))
            throw new Error('Target already exists');
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.renameSync(from, to);
        return sendJson(res, 200, { ok: true });
    }
    sendJson(res, 404, { error: 'Not found' });
}
const CONTENT_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.map': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};
function serveStatic(res, pathname) {
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const full = path.join(WEB_DIR, rel);
    if (!full.startsWith(WEB_DIR) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    // Files under assets/ are content-hashed by Vite, so they're immutable; the
    // entry HTML must always revalidate so a rebuild's new bundle is picked up
    // without a manual hard-refresh.
    const cache = /^assets\//.test(rel) ? 'public, max-age=31536000, immutable' : 'no-store';
    res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(full)] || 'application/octet-stream',
        'Cache-Control': cache,
    });
    res.end(fs.readFileSync(full));
}
const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
        const query = Object.fromEntries(url.searchParams.entries());
        handleApi(req, res, url.pathname, query).catch((e) => sendJson(res, 400, { error: e.message }));
        return;
    }
    serveStatic(res, url.pathname);
});
const announce = (port) => {
    const url = `http://localhost:${port}`;
    console.log(`create-library back-office (web) → ${url}`);
    if (!process.env.NO_OPEN) {
        const opener = process.platform === 'win32' ? `start "" "${url}"` :
            process.platform === 'darwin' ? `open "${url}"` :
                `xdg-open "${url}"`;
        (0, child_process_1.exec)(opener, () => { });
    }
};
/**
 * Listen on PORT; if it's taken, try the next ports automatically. When PORT is
 * set explicitly via the environment we don't shift it (the user asked for it).
 */
const start = (port, attemptsLeft) => {
    server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0 && !process.env.PORT) {
            console.warn(`Port ${port} in use, trying ${port + 1}…`);
            start(port + 1, attemptsLeft - 1);
        }
        else if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is in use. Set PORT to a free port and retry.`);
            process.exit(1);
        }
        else {
            throw err;
        }
    });
    server.listen(port, '127.0.0.1');
};
// One persistent handler so a failed attempt's callback can't fire on a later bind.
server.on('listening', () => {
    const addr = server.address();
    announce(typeof addr === 'object' && addr ? addr.port : PORT);
});
start(PORT, 20);
