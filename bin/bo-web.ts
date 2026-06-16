#!/usr/bin/env node
import { exec } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import {
    DotnetTemplate,
    addTemplateDir,
    generateDotnet,
    listDotnetTemplatesIn,
    parseDotnetTemplate,
    readDotnetManifest,
    resolveTemplateDirs,
    scaffoldDotnetTemplate,
    writeDotnetManifest,
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

/* ------------------------- dotnet template registry ---------------------- */

const listTemplates = (): DotnetTemplate[] => {
    const out: DotnetTemplate[] = [];
    const seen = new Set<string>();
    for (const root of resolveTemplateDirs()) {
        for (const t of listDotnetTemplatesIn(root)) {
            if (seen.has(t.shortName)) continue;
            seen.add(t.shortName);
            out.push(t);
        }
    }
    return out;
};

const requireTemplate = (name: string): DotnetTemplate => {
    const t = listTemplates().find((x) => x.shortName === name);
    if (!t) throw new Error(`Unknown template: ${name}`);
    return t;
};

const serialize = (t: DotnetTemplate) => ({
    name: t.shortName,
    shortName: t.shortName,
    identity: t.identity,
    title: t.name,
    author: t.author ?? '',
    sourceName: t.sourceName ?? '',
    classifications: t.classifications,
    tags: t.tags,
    dir: t.dir,
    symbols: t.symbols,
});

/* ------------------------------- file utils ----------------------------- */

/** Resolve a template-relative path, refusing anything that escapes the base dir. */
const safeJoin = (baseDir: string, rel: string): string => {
    const full = path.resolve(baseDir, rel || '.');
    const base = path.resolve(baseDir);
    if (full !== base && !full.startsWith(base + path.sep)) throw new Error(`Path escapes template: ${rel}`);
    return full;
};

interface FileNode { name: string; path: string; type: 'file' | 'dir'; children?: FileNode[]; }

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.vs', 'bin', 'obj']);

/** Recursively list a directory's files as a tree (dirs first, alphabetical). */
const buildTree = (baseDir: string, dir: string): FileNode[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const nodes: FileNode[] = [];
    for (const e of entries) {
        if (e.isDirectory() && IGNORED_DIRS.has(e.name)) continue;
        const full = path.join(dir, e.name);
        const rel = path.relative(baseDir, full).split(path.sep).join('/');
        if (e.isDirectory()) nodes.push({ name: e.name, path: rel, type: 'dir', children: buildTree(baseDir, full) });
        else nodes.push({ name: e.name, path: rel, type: 'file' });
    }
    nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    return nodes;
};

/** Move `from` onto an existing `to`: same-name dirs merge, conflicting files replaced. */
const moveMerge = (from: string, to: string): void => {
    if (fs.existsSync(to) && fs.statSync(from).isDirectory() && fs.statSync(to).isDirectory()) {
        for (const entry of fs.readdirSync(from)) moveMerge(path.join(from, entry), path.join(to, entry));
        fs.rmdirSync(from);
        return;
    }
    fs.rmSync(to, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
};

const isProbablyBinary = (buf: Buffer): boolean => {
    const len = Math.min(buf.length, 8000);
    for (let i = 0; i < len; i++) if (buf[i] === 0) return true;
    return false;
};

/** Base dir for the file APIs: a registered template (by name) or any `root`. */
const resolveBase = (q: { template?: string; root?: string }): string => {
    if (q.root && q.root.trim()) {
        const dir = path.resolve(q.root.trim());
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`Not a directory: ${dir}`);
        return dir;
    }
    if (q.template && q.template.trim()) return requireTemplate(q.template).dir;
    throw new Error('Provide a "template" or a "root" directory');
};

/* -------------------------------- symbols ------------------------------- */

interface SymbolInput {
    name: string;
    datatype?: string;
    defaultValue?: string;
    replaces?: string;
    description?: string;
    choices?: string[];
}

const writeSymbol = (dir: string, s: SymbolInput) => {
    const m = readDotnetManifest(dir);
    m.symbols = m.symbols || {};
    const sym: Record<string, unknown> = { type: 'parameter', datatype: s.datatype || 'string' };
    if (s.defaultValue !== undefined && s.defaultValue !== '') sym.defaultValue = s.defaultValue;
    if (s.replaces) sym.replaces = s.replaces;
    if (s.description) sym.description = s.description;
    if (s.datatype === 'choice') sym.choices = (s.choices ?? []).filter(Boolean).map((c) => ({ choice: c }));
    m.symbols[s.name] = sym;
    writeDotnetManifest(dir, m);
};

/* --------------------------------- API ---------------------------------- */

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, pathname: string, query: Record<string, string>): Promise<void> {
    if (req.method === 'GET' && pathname === '/api/state') {
        return sendJson(res, 200, { templates: listTemplates().map(serialize), dirs: resolveTemplateDirs(), cwd: process.cwd() });
    }

    const body = req.method === 'POST' ? await readBody(req) : {};

    // Generate a project from a dotnet template via the .NET CLI.
    if (req.method === 'POST' && pathname === '/api/generate') {
        const t = requireTemplate(body.templateName);
        const into = path.resolve(body.into || process.cwd());
        fs.mkdirSync(into, { recursive: true });
        const output = generateDotnet({ template: t, outDir: into, name: body.name || undefined, params: body.params || {}, force: !!body.force });
        return sendJson(res, 200, { ok: true, into, output });
    }

    if (req.method === 'POST' && pathname === '/api/create-template') {
        const name = String(body.name || '').trim();
        if (!name) throw new Error('A template name is required');
        const rootDir = path.resolve(body.rootDir && String(body.rootDir).trim() ? body.rootDir : process.cwd());
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = scaffoldDotnetTemplate({
            rootDir, name,
            shortName: body.shortName ? String(body.shortName) : undefined,
            author: body.author ? String(body.author) : undefined,
            sourceName: body.sourceName ? String(body.sourceName) : undefined,
        });
        if (!resolveTemplateDirs().includes(rootDir)) addTemplateDir(rootDir);
        const created = parseDotnetTemplate(dir);
        return sendJson(res, 200, { ok: true, dir, name: created.shortName });
    }

    // Edit manifest metadata.
    if (req.method === 'POST' && pathname === '/api/set-meta') {
        const t = requireTemplate(body.templateName);
        const m = readDotnetManifest(t.dir);
        if (body.title !== undefined) m.name = String(body.title);
        if (body.author !== undefined) m.author = String(body.author);
        if (body.sourceName !== undefined) m.sourceName = String(body.sourceName);
        if (body.classifications !== undefined) m.classifications = String(body.classifications).split(',').map((s: string) => s.trim()).filter(Boolean);
        writeDotnetManifest(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }

    // Rename: change shortName/identity and, when the folder matches, rename it.
    if (req.method === 'POST' && pathname === '/api/rename-template') {
        const t = requireTemplate(body.templateName);
        const newName = String(body.newName || '').trim();
        if (!newName) throw new Error('A new name is required');
        if (newName !== t.shortName && listTemplates().some((x) => x.shortName === newName)) throw new Error(`A template "${newName}" already exists`);
        const m = readDotnetManifest(t.dir);
        m.shortName = newName;
        if (!m.identity || m.identity === t.identity) m.identity = newName;
        writeDotnetManifest(t.dir, m);
        let dir = t.dir;
        if (path.basename(t.dir) === t.shortName) {
            const dest = path.join(path.dirname(t.dir), newName);
            if (!fs.existsSync(dest)) { fs.renameSync(t.dir, dest); dir = dest; }
        }
        return sendJson(res, 200, { ok: true, name: newName, dir });
    }

    if (req.method === 'POST' && pathname === '/api/delete-template') {
        const t = requireTemplate(body.templateName);
        fs.rmSync(t.dir, { recursive: true, force: true });
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/set-symbol') {
        const t = requireTemplate(body.templateName);
        const s = body.symbol as SymbolInput;
        if (!s || !s.name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(s.name)) throw new Error('A valid symbol name is required');
        writeSymbol(t.dir, s);
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/remove-symbol') {
        const t = requireTemplate(body.templateName);
        const m = readDotnetManifest(t.dir);
        if (m.symbols) delete m.symbols[String(body.name)];
        writeDotnetManifest(t.dir, m);
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/add-dir') {
        return sendJson(res, 200, { ok: true, dir: addTemplateDir(body.dir) });
    }

    if (req.method === 'POST' && pathname === '/api/validate') {
        const t = requireTemplate(body.templateName);
        const errors: string[] = [];
        try { parseDotnetTemplate(t.dir); } catch (e) { errors.push((e as Error).message); }
        if (!t.shortName) errors.push('shortName is required');
        return sendJson(res, 200, { ok: true, errors });
    }

    // Directory browser for folder pickers.
    if (req.method === 'GET' && pathname === '/api/fs/dirs') {
        const raw = (query.path || '').trim();
        if (!raw) {
            if (process.platform === 'win32') {
                const drives: string[] = [];
                for (let c = 65; c <= 90; c++) {
                    const d = String.fromCharCode(c) + ':\\';
                    try { if (fs.existsSync(d)) drives.push(d); } catch { /* skip */ }
                }
                return sendJson(res, 200, { ok: true, path: '', parent: null, dirs: drives, roots: true });
            }
            return sendJson(res, 200, { ok: true, path: '', parent: null, dirs: ['/'], roots: true });
        }
        const dir = path.resolve(raw);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`Not a directory: ${dir}`);
        const dirs = fs.readdirSync(dir, { withFileTypes: true })
            .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b));
        const parent = path.dirname(dir);
        return sendJson(res, 200, { ok: true, path: dir, parent: parent === dir ? '' : parent, dirs, roots: false });
    }

    if (req.method === 'POST' && pathname === '/api/fs/mkdir') {
        const dir = path.resolve(String(body.path || ''));
        if (!dir) throw new Error('A path is required');
        fs.mkdirSync(dir, { recursive: true });
        return sendJson(res, 200, { ok: true, dir });
    }

    // ---- File explorer / editor APIs ----

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
        if (fs.existsSync(full)) {
            const isDir = fs.statSync(full).isDirectory();
            if (body.dir || isDir || !body.overwrite) {
                throw new Error(isDir ? 'A folder with this name already exists here' : 'A file with this name already exists here');
            }
            fs.writeFileSync(full, String(body.content ?? ''));
            return sendJson(res, 200, { ok: true, overwritten: true });
        }
        if (body.dir) fs.mkdirSync(full, { recursive: true });
        else { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, String(body.content ?? '')); }
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
        if (fs.existsSync(to)) {
            if (!body.overwrite) throw new Error('Target already exists');
            moveMerge(from, to);
            return sendJson(res, 200, { ok: true, merged: true });
        }
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.renameSync(from, to);
        return sendJson(res, 200, { ok: true });
    }

    sendJson(res, 404, { error: 'Not found' });
}

const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon',
};

function serveStatic(res: http.ServerResponse, pathname: string): void {
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const full = path.join(WEB_DIR, rel);
    if (!full.startsWith(WEB_DIR) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    const cache = /^assets\//.test(rel) ? 'public, max-age=31536000, immutable' : 'no-store';
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': cache });
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
        const opener = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
        exec(opener, () => {});
    }
};

const start = (port: number, attemptsLeft: number): void => {
    server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0 && !process.env.PORT) {
            console.warn(`Port ${port} in use, trying ${port + 1}…`);
            start(port + 1, attemptsLeft - 1);
        } else if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is in use. Set PORT to a free port and retry.`);
            process.exit(1);
        } else { throw err; }
    });
    server.listen(port, '127.0.0.1');
};

server.on('listening', () => {
    const addr = server.address();
    announce(typeof addr === 'object' && addr ? addr.port : PORT);
});

start(PORT, 20);
