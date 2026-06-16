import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Adapter over the standard `dotnet new` template engine.
 *
 * A template is a folder containing `.template.config/template.json` (the
 * schemastore "template" schema). User inputs are the manifest's `symbols` of
 * type "parameter"; generation shells out to `dotnet new` (install → invoke by
 * shortName → uninstall), so output is byte-for-byte what the .NET CLI produces.
 */

export const TEMPLATE_CONFIG_DIR = '.template.config';
export const DOTNET_MANIFEST_REL = path.join(TEMPLATE_CONFIG_DIR, 'template.json');

export interface DotnetSymbol {
    name: string;
    datatype: 'string' | 'bool' | 'choice' | 'text' | string;
    defaultValue?: string;
    replaces?: string;
    description?: string;
    choices?: string[];
}

export interface DotnetTemplate {
    dir: string;
    identity: string;
    name: string;
    shortName: string;
    author?: string;
    classifications: string[];
    sourceName?: string;
    tags: Record<string, string>;
    symbols: DotnetSymbol[];
}

const manifestPath = (dir: string) => path.join(dir, DOTNET_MANIFEST_REL);

export const isDotnetTemplate = (dir: string): boolean => fs.existsSync(manifestPath(dir));

export const readDotnetManifest = (dir: string): Record<string, any> =>
    JSON.parse(fs.readFileSync(manifestPath(dir), 'utf8'));

export const writeDotnetManifest = (dir: string, data: Record<string, any>): void => {
    fs.mkdirSync(path.dirname(manifestPath(dir)), { recursive: true });
    fs.writeFileSync(manifestPath(dir), JSON.stringify(data, null, 2) + '\n');
};

const first = <T>(v: T | T[] | undefined): T | undefined => (Array.isArray(v) ? v[0] : v);

/** Parse a template's manifest into a normalized DotnetTemplate. */
export const parseDotnetTemplate = (dir: string): DotnetTemplate => {
    const raw = readDotnetManifest(dir);
    const symbols: DotnetSymbol[] = Object.entries(raw.symbols ?? {})
        .filter(([, s]) => (s as any)?.type === 'parameter')
        .map(([name, s]) => {
            const sym = s as any;
            return {
                name,
                datatype: sym.datatype ?? 'string',
                defaultValue: sym.defaultValue !== undefined ? String(sym.defaultValue) : undefined,
                replaces: sym.replaces,
                description: sym.description,
                choices: Array.isArray(sym.choices) ? sym.choices.map((c: any) => (typeof c === 'string' ? c : c.choice)) : undefined,
            };
        });
    return {
        dir,
        identity: raw.identity ?? path.basename(dir),
        name: raw.name ?? path.basename(dir),
        shortName: first<string>(raw.shortName) ?? path.basename(dir),
        author: raw.author,
        classifications: raw.classifications ?? [],
        sourceName: raw.sourceName,
        tags: raw.tags ?? {},
        symbols,
    };
};

/** Discover `dotnet new` templates under a root (the root itself or any child holding `.template.config`). */
export const listDotnetTemplatesIn = (root: string): DotnetTemplate[] => {
    const out: DotnetTemplate[] = [];
    const tryDir = (d: string) => { if (isDotnetTemplate(d)) { try { out.push(parseDotnetTemplate(d)); } catch { /* skip invalid */ } } };
    tryDir(root);
    let entries: string[] = [];
    try { entries = fs.readdirSync(root); } catch { return out; }
    for (const e of entries) {
        const child = path.join(root, e);
        try { if (fs.statSync(child).isDirectory()) tryDir(child); } catch { /* skip */ }
    }
    return out;
};

const dotnet = (args: string[]): string => execFileSync('dotnet', args, { stdio: 'pipe' }).toString();

export interface DotnetGenerateOptions {
    template: DotnetTemplate;
    outDir: string;
    name?: string;
    /** symbol name -> value (empty values are skipped, falling back to the template default). */
    params?: Record<string, string>;
    force?: boolean;
}

/** Generate a project from a dotnet template via the CLI. Returns the dotnet output. */
export const generateDotnet = ({ template, outDir, name, params = {}, force = false }: DotnetGenerateOptions): string => {
    dotnet(['new', 'install', template.dir, '--force']);
    try {
        const args = ['new', template.shortName, '-o', outDir];
        if (name) args.push('-n', name);
        if (force) args.push('--force');
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== '') args.push(`--${k}`, v);
        }
        return dotnet(args);
    } finally {
        try { dotnet(['new', 'uninstall', template.dir]); } catch { /* best-effort cleanup */ }
    }
};

export interface ScaffoldDotnetOptions {
    rootDir: string;
    name: string;
    shortName?: string;
    author?: string;
    sourceName?: string;
}

/** Create a minimal `dotnet new` template skeleton. Returns its directory. */
export const scaffoldDotnetTemplate = ({ rootDir, name, shortName, author, sourceName = 'MyProject' }: ScaffoldDotnetOptions): string => {
    const dir = path.join(rootDir, name);
    if (fs.existsSync(dir)) throw new Error(`Template already exists: ${dir}`);
    const manifest = {
        $schema: 'http://json.schemastore.org/template',
        author: author || 'create-library',
        classifications: ['Common'],
        identity: name,
        name,
        shortName: shortName || name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        tags: { language: 'C#', type: 'project' },
        sourceName,
        preferNameDirectory: true,
        symbols: {
            Greeting: { type: 'parameter', datatype: 'string', defaultValue: 'Hello', replaces: 'GREETING', description: 'A sample text parameter' },
        },
    };
    writeDotnetManifest(dir, manifest);
    fs.writeFileSync(
        path.join(dir, `${sourceName}.txt`),
        `# ${sourceName}\n\nGREETING from a create-library dotnet template.\n`
    );
    return dir;
};
