import * as fs from 'fs';
import * as path from 'path';
import { isProbablyBinary, walkFiles } from './fsx';
import { LoadedTemplate, PromptDef, TokenConfig } from './types';

/** Legacy default delimiters, used when a manifest has no explicit tokenConfig. */
export const DEFAULT_TOKEN_CONFIG: TokenConfig = { start: '__', end: '__' };

export const tokenConfigOf = (template: LoadedTemplate): TokenConfig =>
    template.manifest.tokenConfig ?? DEFAULT_TOKEN_CONFIG;

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Build the regex matching `<start>NAME<end>`; NAME is a token-name identifier. */
const tokenRegex = ({ start, end }: TokenConfig): RegExp =>
    new RegExp(`${escapeRe(start)}([A-Za-z0-9_]+)${escapeRe(end)}`, 'g');

/** Directories scanned for tokens: the payload plus any feature overlays. */
const scanDirs = (template: LoadedTemplate): string[] => {
    const dirs = [template.sourceDir];
    for (const f of template.manifest.features ?? []) {
        if (f.overlay) dirs.push(path.join(template.dir, f.overlay));
        for (const v of Object.values(f.variants ?? {})) {
            if (v.overlay) dirs.push(path.join(template.dir, v.overlay));
        }
    }
    return dirs;
};

/**
 * Scan a template's files (contents and path names) for dynamic tokens and
 * return the unique token names, sorted. This is what drives the inspector.
 */
export const detectTokens = (template: LoadedTemplate): string[] => {
    const cfg = tokenConfigOf(template);
    const found = new Set<string>();
    const collect = (text: string) => {
        const re = tokenRegex(cfg);
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) found.add(m[1]);
    };

    for (const dir of scanDirs(template)) {
        if (!fs.existsSync(dir)) continue;
        for (const file of walkFiles(dir)) {
            collect(path.relative(dir, file)); // tokens in file/dir names
            if (!isProbablyBinary(file)) collect(fs.readFileSync(file, 'utf8'));
        }
    }
    return [...found].sort();
};

export interface ResolvedVariable {
    name: string;
    token: string;
    message: string;
    type: 'text' | 'select';
    default: string;
    validate: 'packageName' | 'nonEmpty' | 'none';
    options?: string[];
    exposeCli: boolean;
    /** True when the token was found in the template files (vs. only declared). */
    detected: boolean;
}

const toVariable = (p: PromptDef, detected: boolean): ResolvedVariable => ({
    name: p.name,
    token: p.token || p.name,
    message: p.message || (p.token || p.name),
    type: p.type === 'select' ? 'select' : 'text',
    default: p.default ?? '',
    validate: p.validate ?? 'none',
    options: p.options,
    exposeCli: p.exposeCli !== false,
    detected,
});

/**
 * The full variable set for a template: every detected token (merged with its
 * saved metadata, if any) plus any declared-but-not-detected prompts.
 */
export const resolveVariables = (template: LoadedTemplate): ResolvedVariable[] => {
    const detected = detectTokens(template);
    const byToken = new Map<string, PromptDef>();
    for (const p of template.manifest.prompts) byToken.set(p.token || p.name, p);

    const out: ResolvedVariable[] = [];
    const seen = new Set<string>();
    for (const tok of detected) {
        const p = byToken.get(tok);
        out.push(
            p
                ? toVariable(p, true)
                : { name: tok, token: tok, message: tok, type: 'text', default: '', validate: 'none', exposeCli: true, detected: true }
        );
        seen.add(tok);
    }
    for (const p of template.manifest.prompts) {
        const tok = p.token || p.name;
        if (!seen.has(tok)) out.push(toVariable(p, false));
    }
    return out;
};
