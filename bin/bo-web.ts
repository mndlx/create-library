#!/usr/bin/env node
import { exec } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import {
    LoadedTemplate,
    PromptDef,
    addTemplateDir,
    findTemplate,
    generate,
    listTemplates,
    mergeInto,
    nameVarOf,
    outputModeOf,
    readRawManifest,
    renderNextSteps,
    resolveTemplateDirs,
    savePreset,
    scaffoldTemplate,
    validateManifest,
    writeRawManifest,
} from '../engine';

const PORT = Number(process.env.PORT) || 4317;
const WEB_DIR = path.join(__dirname, '..', 'web');

const sendJson = (res: http.ServerResponse, code: number, data: unknown) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
};

const readBody = (req: http.IncomingMessage): Promise<any> =>
    new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (c) => {
            raw += c;
            if (raw.length > 5_000_000) req.destroy();
        });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });

const serialize = (t: LoadedTemplate) => ({
    name: t.manifest.name,
    title: t.manifest.title ?? t.manifest.name,
    description: t.manifest.description ?? '',
    output: outputModeOf(t),
    nameVar: nameVarOf(t),
    dir: t.dir,
    prompts: t.manifest.prompts,
    features: t.manifest.features ?? [],
});

const requireTemplate = (name: string): LoadedTemplate => {
    const t = findTemplate(name);
    if (!t) throw new Error(`Unknown template: ${name}`);
    return t;
};

const componentTsx = (name: string) =>
    `import * as React from 'react';\n\n` +
    `export interface ${name}Props extends React.HTMLAttributes<HTMLDivElement> {}\n\n` +
    `export const ${name} = React.forwardRef<HTMLDivElement, ${name}Props>((props, ref) => (\n` +
    `    <div ref={ref} {...props} />\n));\n\n` +
    `${name}.displayName = '${name}';\n`;

function addComponent(t: LoadedTemplate, rawName: string, onByDefault: boolean): void {
    const comp = String(rawName || '').trim().replace(/[^A-Za-z0-9]/g, '');
    if (!comp) throw new Error('A component name is required');
    const featureId = comp.toLowerCase();

    const barrel = path.join(t.sourceDir, 'src', 'components', 'index.ts');
    fs.mkdirSync(path.dirname(barrel), { recursive: true });
    if (!fs.existsSync(barrel)) fs.writeFileSync(barrel, '/* inject:componentExports */\n');
    else if (!fs.readFileSync(barrel, 'utf8').includes('/* inject:componentExports */')) {
        fs.appendFileSync(barrel, '\n/* inject:componentExports */\n');
    }

    const overlayRel = path.join('features', featureId);
    const compDir = path.join(t.dir, overlayRel, 'src', 'components', comp);
    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(path.join(compDir, `${comp}.tsx`), componentTsx(comp));
    fs.writeFileSync(path.join(compDir, 'index.ts'), `export * from './${comp}';\n`);

    const m = readRawManifest(t.dir);
    m.features = m.features || [];
    if (m.features.some((f) => f.id === featureId)) throw new Error(`Feature "${featureId}" already exists`);
    m.features.push({
        id: featureId,
        label: `Include the ${comp} component`,
        type: 'boolean',
        default: onByDefault,
        overlay: overlayRel.split(path.sep).join('/'),
        inject: [{ file: 'src/components/index.ts', marker: 'componentExports', content: `export * from './${comp}';` }],
    });
    const errors = validateManifest(m);
    if (errors.length) throw new Error(errors.join('; '));
    writeRawManifest(t.dir, m);
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<void> {
    if (req.method === 'GET' && pathname === '/api/state') {
        return sendJson(res, 200, {
            templates: listTemplates().map(serialize),
            dirs: resolveTemplateDirs(),
            cwd: process.cwd(),
        });
    }

    const body = req.method === 'POST' ? await readBody(req) : {};

    if (req.method === 'POST' && pathname === '/api/generate') {
        const t = requireTemplate(body.templateName);
        const answers: Record<string, string> = body.answers || {};
        const features: Record<string, boolean | string> = body.features || {};
        const mode = body.mode || outputModeOf(t);
        const into = path.resolve(body.into || process.cwd());

        if (mode === 'merge') {
            const { tokens, report } = mergeInto({ template: t, projectDir: into, answers, features, force: !!body.force });
            return sendJson(res, 200, { ok: true, mode, into, report, nextSteps: renderNextSteps(t, tokens) });
        }
        const name = answers[nameVarOf(t)] || t.manifest.name;
        const targetDir = path.join(into, name);
        const { tokens } = generate({ template: t, targetDir, answers, features });
        return sendJson(res, 200, { ok: true, mode, targetDir, nextSteps: renderNextSteps(t, tokens) });
    }

    if (req.method === 'POST' && pathname === '/api/preset') {
        const t = requireTemplate(body.templateName);
        const file = path.resolve(body.file || `${t.manifest.name}.preset.json`);
        savePreset(file, { template: t.manifest.name, answers: body.answers || {}, features: body.features || {} });
        return sendJson(res, 200, { ok: true, file });
    }

    if (req.method === 'POST' && pathname === '/api/create-template') {
        const rootDir = path.resolve(body.rootDir);
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = scaffoldTemplate({
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
        const m = readRawManifest(t.dir);
        m.prompts = m.prompts || [];
        m.prompts.push(body.prompt as PromptDef);
        const errors = validateManifest(m);
        if (errors.length) throw new Error(errors.join('; '));
        writeRawManifest(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/add-component') {
        addComponent(requireTemplate(body.templateName), body.component, !!body.default);
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/set-output') {
        const t = requireTemplate(body.templateName);
        const m = readRawManifest(t.dir);
        m.output = body.output === 'merge' ? 'merge' : 'new';
        writeRawManifest(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/add-dir') {
        return sendJson(res, 200, { ok: true, dir: addTemplateDir(body.dir) });
    }

    if (req.method === 'POST' && pathname === '/api/validate') {
        const t = requireTemplate(body.templateName);
        return sendJson(res, 200, { ok: true, errors: validateManifest(readRawManifest(t.dir)) });
    }

    sendJson(res, 404, { error: 'Not found' });
}

const CONTENT_TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serveStatic(res: http.ServerResponse, pathname: string): void {
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
        handleApi(req, res, url.pathname).catch((e) => sendJson(res, 400, { error: (e as Error).message }));
        return;
    }
    serveStatic(res, url.pathname);
});

server.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`create-library back-office (web) → ${url}`);
    if (!process.env.NO_OPEN) {
        const opener =
            process.platform === 'win32' ? `start "" "${url}"` :
            process.platform === 'darwin' ? `open "${url}"` :
            `xdg-open "${url}"`;
        exec(opener, () => {});
    }
});
