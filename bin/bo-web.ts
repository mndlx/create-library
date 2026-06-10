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
    resolveVariables,
    savePreset,
    scaffoldTemplate,
    tokenConfigOf,
    validateManifest,
    writeRawManifest,
} from '../engine';

const PORT = Number(process.env.PORT) || 4517;
const WEB_DIR = path.join(__dirname, '..', 'web');

const sendJson = (res: http.ServerResponse, code: number, data: unknown) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
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
    tokenConfig: tokenConfigOf(t),
    variables: resolveVariables(t),
});

const requireTemplate = (name: string): LoadedTemplate => {
    const t = findTemplate(name);
    if (!t) throw new Error(`Unknown template: ${name}`);
    return t;
};

/** Resolve a template-relative path, refusing anything that escapes the template dir. */
const safeJoin = (baseDir: string, rel: string): string => {
    const full = path.resolve(baseDir, rel || '.');
    const base = path.resolve(baseDir);
    if (full !== base && !full.startsWith(base + path.sep)) {
        throw new Error(`Path escapes template: ${rel}`);
    }
    return full;
};

interface FileNode {
    name: string;
    path: string; // template-relative, posix separators
    type: 'file' | 'dir';
    children?: FileNode[];
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.vs']);

/** Recursively list a template's files as a tree (dirs first, alphabetical). */
const buildTree = (baseDir: string, dir: string): FileNode[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const nodes: FileNode[] = [];
    for (const e of entries) {
        if (e.isDirectory() && IGNORED_DIRS.has(e.name)) continue;
        const full = path.join(dir, e.name);
        const rel = path.relative(baseDir, full).split(path.sep).join('/');
        if (e.isDirectory()) {
            nodes.push({ name: e.name, path: rel, type: 'dir', children: buildTree(baseDir, full) });
        } else {
            nodes.push({ name: e.name, path: rel, type: 'file' });
        }
    }
    nodes.sort((a, b) =>
        a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1
    );
    return nodes;
};

const isProbablyBinary = (buf: Buffer): boolean => {
    const len = Math.min(buf.length, 8000);
    for (let i = 0; i < len; i++) if (buf[i] === 0) return true;
    return false;
};

/**
 * Resolve the base directory the file APIs operate inside. Either a registered
 * template (by name) or an arbitrary `root` directory ("open a workspace").
 */
const resolveBase = (q: { template?: string; root?: string }): string => {
    if (q.root && q.root.trim()) {
        const dir = path.resolve(q.root.trim());
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`Not a directory: ${dir}`);
        return dir;
    }
    if (q.template && q.template.trim()) return requireTemplate(q.template).dir;
    throw new Error('Provide a "template" or a "root" directory');
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

async function handleApi(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    pathname: string,
    query: Record<string, string>
): Promise<void> {
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

        const includeManifest = !!body.includeManifest;

        if (mode === 'merge') {
            const { tokens, report } = mergeInto({ template: t, projectDir: into, answers, features, force: !!body.force, includeManifest });
            return sendJson(res, 200, { ok: true, mode, into, report, nextSteps: renderNextSteps(t, tokens) });
        }
        const name = answers[nameVarOf(t)] || t.manifest.name;
        const targetDir = path.join(into, name);
        const { tokens } = generate({ template: t, targetDir, answers, features, includeManifest });
        return sendJson(res, 200, { ok: true, mode, targetDir, nextSteps: renderNextSteps(t, tokens) });
    }

    if (req.method === 'POST' && pathname === '/api/preset') {
        const t = requireTemplate(body.templateName);
        const file = path.resolve(body.file || `${t.manifest.name}.preset.json`);
        savePreset(file, { template: t.manifest.name, answers: body.answers || {}, features: body.features || {} });
        return sendJson(res, 200, { ok: true, file });
    }

    if (req.method === 'POST' && pathname === '/api/create-template') {
        const name = String(body.name || '').trim();
        if (!name) throw new Error('A template name is required');
        const rootDir = path.resolve(body.rootDir && String(body.rootDir).trim() ? body.rootDir : process.cwd());
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = scaffoldTemplate({
            rootDir,
            name,
            title: body.title,
            description: body.description,
            output: body.output === 'merge' ? 'merge' : 'new',
            source: body.source === '.' ? '.' : 'template',
        });
        // Make the new template discoverable by registering its parent directory.
        if (!resolveTemplateDirs().includes(rootDir)) addTemplateDir(rootDir);
        return sendJson(res, 200, { ok: true, dir, name });
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

    if (req.method === 'POST' && pathname === '/api/set-token-config') {
        const t = requireTemplate(body.templateName);
        const start = String(body.start ?? '').trim();
        const end = String(body.end ?? '').trim();
        if (!start || !end) throw new Error('start and end delimiters are required');
        const m = readRawManifest(t.dir);
        m.tokenConfig = { start, end };
        const errors = validateManifest(m);
        if (errors.length) throw new Error(errors.join('; '));
        writeRawManifest(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }

    // Upsert a token's metadata (message, default, type, options, validate, exposeCli).
    if (req.method === 'POST' && pathname === '/api/set-variable') {
        const t = requireTemplate(body.templateName);
        const v = body.variable as PromptDef & { exposeCli?: boolean };
        if (!v || !v.name) throw new Error('variable.name is required');
        const m = readRawManifest(t.dir);
        m.prompts = m.prompts || [];
        const token = v.token || v.name;
        const idx = m.prompts.findIndex((p) => (p.token || p.name) === token);
        const next: PromptDef = {
            name: v.name,
            message: v.message || v.name,
            type: v.type === 'select' ? 'select' : 'text',
            token,
            default: v.default,
            validate: v.validate,
            options: v.type === 'select' ? v.options : undefined,
            exposeCli: v.exposeCli !== false,
        };
        if (idx >= 0) m.prompts[idx] = next;
        else m.prompts.push(next);
        const errors = validateManifest(m);
        if (errors.length) throw new Error(errors.join('; '));
        writeRawManifest(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/remove-variable') {
        const t = requireTemplate(body.templateName);
        const m = readRawManifest(t.dir);
        const token = String(body.token || '');
        m.prompts = (m.prompts || []).filter((p) => (p.token || p.name) !== token);
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

    // ---- File explorer / editor APIs (operate inside a template's directory) ----

    if (req.method === 'GET' && pathname === '/api/files') {
        const base = resolveBase(query);
        return sendJson(res, 200, { ok: true, root: base, tree: buildTree(base, base) });
    }

    if (req.method === 'GET' && pathname === '/api/file') {
        const base = resolveBase(query);
        const full = safeJoin(base, query.path || '');
        if (!fs.existsSync(full) || !fs.statSync(full).isFile()) throw new Error('File not found');
        const buf = fs.readFileSync(full);
        if (isProbablyBinary(buf)) return sendJson(res, 200, { ok: true, binary: true, content: '' });
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
        if (fs.existsSync(full)) throw new Error('Already exists');
        if (body.dir) {
            fs.mkdirSync(full, { recursive: true });
        } else {
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, String(body.content ?? ''));
        }
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/file/delete') {
        const base = resolveBase({ template: body.templateName, root: body.root });
        const full = safeJoin(base, body.path || '');
        if (full === path.resolve(base)) throw new Error('Refusing to delete the workspace root');
        fs.rmSync(full, { recursive: true, force: true });
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/file/rename') {
        const base = resolveBase({ template: body.templateName, root: body.root });
        const from = safeJoin(base, body.from || '');
        const to = safeJoin(base, body.to || '');
        if (!fs.existsSync(from)) throw new Error('Source not found');
        if (fs.existsSync(to)) throw new Error('Target already exists');
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.renameSync(from, to);
        return sendJson(res, 200, { ok: true });
    }

    sendJson(res, 404, { error: 'Not found' });
}

const CONTENT_TYPES: Record<string, string> = {
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

function serveStatic(res: http.ServerResponse, pathname: string): void {
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
        handleApi(req, res, url.pathname, query).catch((e) => sendJson(res, 400, { error: (e as Error).message }));
        return;
    }
    serveStatic(res, url.pathname);
});

const announce = (port: number) => {
    const url = `http://localhost:${port}`;
    console.log(`create-library back-office (web) → ${url}`);
    if (!process.env.NO_OPEN) {
        const opener =
            process.platform === 'win32' ? `start "" "${url}"` :
            process.platform === 'darwin' ? `open "${url}"` :
            `xdg-open "${url}"`;
        exec(opener, () => {});
    }
};

/**
 * Listen on PORT; if it's taken, try the next ports automatically. When PORT is
 * set explicitly via the environment we don't shift it (the user asked for it).
 */
const start = (port: number, attemptsLeft: number): void => {
    server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0 && !process.env.PORT) {
            console.warn(`Port ${port} in use, trying ${port + 1}…`);
            start(port + 1, attemptsLeft - 1);
        } else if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is in use. Set PORT to a free port and retry.`);
            process.exit(1);
        } else {
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
