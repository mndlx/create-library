// Typed client for the bo-web HTTP API.

export type OutputMode = 'new' | 'merge';

export interface PromptDef {
    name: string;
    message: string;
    type: 'text' | 'select';
    default?: string;
    token?: string;
    validate?: string;
    options?: string[];
}

export interface FeatureDef {
    id: string;
    label: string;
    type: 'boolean' | 'select';
    default?: boolean | string;
    options?: string[];
}

export interface Template {
    name: string;
    title: string;
    description: string;
    output: OutputMode;
    nameVar: string;
    dir: string;
    prompts: PromptDef[];
    features: FeatureDef[];
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

async function req<T>(path: string, body?: unknown): Promise<T> {
    const opt: RequestInit = body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {};
    const r = await fetch(path, opt);
    const data = await r.json().catch(() => ({}));
    if (!r.ok || (data as { error?: string }).error) {
        throw new Error((data as { error?: string }).error || `HTTP ${r.status}`);
    }
    return data as T;
}

/** What the file/editor APIs operate on: a registered template, or any directory. */
export type FileTarget = { template: string } | { root: string };

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();
const targetQs = (t: FileTarget) => qs('template' in t ? { template: t.template } : { root: t.root });
const targetBody = (t: FileTarget) => ('template' in t ? { templateName: t.template } : { root: t.root });

export const api = {
    state: () => req<AppState>('/api/state'),

    generate: (p: {
        templateName: string;
        answers: Record<string, string>;
        features: Record<string, boolean | string>;
        mode: OutputMode;
        into?: string;
        force?: boolean;
    }) => req<{ targetDir?: string; into?: string; report?: unknown; nextSteps: string[] }>('/api/generate', p),

    savePreset: (p: { templateName: string; answers: Record<string, string>; features: Record<string, boolean | string>; file: string }) =>
        req<{ file: string }>('/api/preset', p),

    createTemplate: (p: { name: string; title: string; description: string; output: OutputMode; rootDir: string }) =>
        req<{ dir: string; name: string }>('/api/create-template', p),

    addVariable: (p: { templateName: string; prompt: PromptDef }) => req<{ ok: true }>('/api/add-variable', p),
    addComponent: (p: { templateName: string; component: string; default: boolean }) =>
        req<{ ok: true }>('/api/add-component', p),
    setOutput: (p: { templateName: string; output: OutputMode }) => req<{ ok: true }>('/api/set-output', p),
    addDir: (p: { dir: string }) => req<{ dir: string }>('/api/add-dir', p),
    validate: (p: { templateName: string }) => req<{ errors: string[] }>('/api/validate', p),

    // ---- file explorer / editor (target = a template or any directory) ----
    files: (t: FileTarget) => req<{ root: string; tree: FileNode[] }>('/api/files?' + targetQs(t)),
    readFile: (t: FileTarget, path: string) =>
        req<{ binary: boolean; content: string }>('/api/file?' + targetQs(t) + '&' + qs({ path })),
    saveFile: (t: FileTarget, p: { path: string; content: string }) =>
        req<{ ok: true }>('/api/file/save', { ...targetBody(t), ...p }),
    createFile: (t: FileTarget, p: { path: string; dir?: boolean }) =>
        req<{ ok: true }>('/api/file/create', { ...targetBody(t), ...p }),
    deleteFile: (t: FileTarget, p: { path: string }) =>
        req<{ ok: true }>('/api/file/delete', { ...targetBody(t), ...p }),
    renameFile: (t: FileTarget, p: { from: string; to: string }) =>
        req<{ ok: true }>('/api/file/rename', { ...targetBody(t), ...p }),
};
