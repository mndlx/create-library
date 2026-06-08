import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/** Env var holding extra template directories (OS path-delimiter separated). */
export const ENV_VAR = 'VLCL_TEMPLATES_DIR';

/** User config file with persisted external template directories. */
export const configFilePath = path.join(os.homedir(), '.virtuallab-create-library.json');

/** Templates shipped with this package. */
export const bundledTemplatesDir = path.join(__dirname, '..', 'templates');

const readConfig = (): { templateDirs?: string[] } => {
    try {
        if (fs.existsSync(configFilePath)) {
            return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
        }
    } catch {
        /* ignore malformed config */
    }
    return {};
};

const isDir = (p: string): boolean => {
    try {
        return fs.statSync(p).isDirectory();
    } catch {
        return false;
    }
};

/** Ordered, de-duplicated list of existing template roots (bundled first). */
export const resolveTemplateDirs = (): string[] => {
    const dirs: string[] = [bundledTemplatesDir];

    const env = process.env[ENV_VAR];
    if (env) {
        for (const part of env.split(path.delimiter)) {
            if (part.trim()) dirs.push(path.resolve(part.trim()));
        }
    }

    for (const part of readConfig().templateDirs ?? []) {
        if (typeof part === 'string' && part.trim()) dirs.push(path.resolve(part.trim()));
    }

    return [...new Set(dirs)].filter(isDir);
};

/** Persist an external template directory to the user config. */
export const addTemplateDir = (dir: string): string => {
    const resolved = path.resolve(dir);
    const cfg = readConfig();
    const list = Array.isArray(cfg.templateDirs) ? cfg.templateDirs : [];
    if (!list.includes(resolved)) list.push(resolved);
    fs.writeFileSync(configFilePath, JSON.stringify({ ...cfg, templateDirs: list }, null, 2) + '\n');
    return resolved;
};
