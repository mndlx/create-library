// Typed client for the bo-web HTTP API (dotnet-new backed).

export type Datatype = 'string' | 'bool' | 'choice' | 'text';

export interface DotnetSymbol {
    name: string;
    datatype: Datatype;
    defaultValue?: string;
    replaces?: string;
    description?: string;
    choices?: string[];
}

export interface Template {
    /** shortName — the id used everywhere in the UI. */
    name: string;
    shortName: string;
    identity: string;
    /** Display name (manifest "name"). */
    title: string;
    author: string;
    sourceName: string;
    classifications: string[];
    tags: Record<string, string>;
    dir: string;
    symbols: DotnetSymbol[];
}

export interface AppState {
    templates: Template[];
    dirs: string[];
    cwd: string;
}

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'dir';
    children?: FileNode[];
}

/** What the file/editor APIs operate on: a registered template, or any directory. */
export type FileTarget = { template: string } | { root: string };

async function req<T>(path: string, body?: unknown): Promise<T> {
    const opt: RequestInit = body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {};
    const r = await fetch(path, opt);
    const data = await r.json().catch(() => ({}));
    if (!r.ok || (data as { error?: string }).error) throw new Error((data as { error?: string }).error || `HTTP ${r.status}`);
    return data as T;
}

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();
const targetQs = (t: FileTarget) => qs('template' in t ? { template: t.template } : { root: t.root });
const targetBody = (t: FileTarget) => ('template' in t ? { templateName: t.template } : { root: t.root });

export const api = {
    state: () => req<AppState>('/api/state'),

    createTemplate: (p: { name: string; shortName?: string; author?: string; sourceName?: string; rootDir: string }) =>
        req<{ dir: string; name: string }>('/api/create-template', p),

    generate: (p: { templateName: string; name?: string; params: Record<string, string>; into?: string; force?: boolean; subfolder?: boolean }) =>
        req<{ into: string; output: string }>('/api/generate', p),

    setMeta: (p: { templateName: string; title?: string; author?: string; sourceName?: string; classifications?: string }) =>
        req<{ ok: true }>('/api/set-meta', p),
    renameTemplate: (p: { templateName: string; newName: string }) => req<{ name: string; dir: string }>('/api/rename-template', p),
    deleteTemplate: (p: { templateName: string }) => req<{ ok: true }>('/api/delete-template', p),

    setSymbol: (p: { templateName: string; symbol: DotnetSymbol }) => req<{ ok: true }>('/api/set-symbol', p),
    removeSymbol: (p: { templateName: string; name: string }) => req<{ ok: true }>('/api/remove-symbol', p),

    addDir: (p: { dir: string }) => req<{ dir: string }>('/api/add-dir', p),
    validate: (p: { templateName: string }) => req<{ errors: string[] }>('/api/validate', p),

    // ---- file explorer / editor (target = a template or any directory) ----
    files: (t: FileTarget) => req<{ root: string; tree: FileNode[] }>('/api/files?' + targetQs(t)),
    readFile: (t: FileTarget, path: string) => req<{ binary: boolean; content: string }>('/api/file?' + targetQs(t) + '&' + qs({ path })),
    saveFile: (t: FileTarget, p: { path: string; content: string }) => req<{ ok: true }>('/api/file/save', { ...targetBody(t), ...p }),
    createFile: (t: FileTarget, p: { path: string; dir?: boolean; overwrite?: boolean }) => req<{ ok: true }>('/api/file/create', { ...targetBody(t), ...p }),
    deleteFile: (t: FileTarget, p: { path: string }) => req<{ ok: true }>('/api/file/delete', { ...targetBody(t), ...p }),
    renameFile: (t: FileTarget, p: { from: string; to: string; overwrite?: boolean }) => req<{ ok: true }>('/api/file/rename', { ...targetBody(t), ...p }),
};
