import * as fs from 'fs';
import * as path from 'path';
import { isProbablyBinary, walkFiles } from './fsx';
import { MANIFEST_FILENAME } from './manifest';
import { LoadedTemplate, PromptDef, TokenConfig } from './types';

/** Legacy default delimiters, used when a manifest has no explicit tokenConfig. */
export const DEFAULT_TOKEN_CONFIG: TokenConfig = { start: '__', end: '__' };

export const tokenConfigOf = (template: LoadedTemplate): TokenConfig =>
    template.manifest.tokenConfig ?? DEFAULT_TOKEN_CONFIG;

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Build the regex matching `<start>NAME<end>`. NAME allows dots and dashes so
 * tokens like `@@test.js@@` or `@@my-var@@` work.
 */
const tokenRegex = ({ start, end }: TokenConfig): RegExp =>
    new RegExp(`${escapeRe(start)}([A-Za-z0-9_.\\-]+)${escapeRe(end)}`, 'g');

/** Token names accepted when declaring a variable by hand. */
export const TOKEN_NAME_RE = /^[A-Za-z0-9_.-]+$/;

/** Scan a template's files (contents and path names) for tokens wrapped in `cfg`. */
const scanForTokens = (template: LoadedTemplate, cfg: TokenConfig): string[] => {
    const found = new Set<string>();
    const collect = (text: string) => {
        const re = tokenRegex(cfg);
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) found.add(m[1]);
    };

    // Scan the WHOLE template folder — payload, overlays, and any file the
    // editor shows — so tokens never hide because the payload subfolder is
    // missing or files live outside it. Only the manifest itself is skipped.
    const manifestPath = path.join(template.dir, MANIFEST_FILENAME);
    if (!fs.existsSync(template.dir)) return [];
    for (const file of walkFiles(template.dir)) {
        if (path.resolve(file) === path.resolve(manifestPath)) continue;
        collect(path.relative(template.dir, file)); // tokens in file/dir names
        if (!isProbablyBinary(file)) collect(fs.readFileSync(file, 'utf8'));
    }
    return [...found].sort();
};

/**
 * Scan a template's files for dynamic tokens using its configured delimiters
 * and return the unique token names, sorted. This drives the inspector.
 */
export const detectTokens = (template: LoadedTemplate): string[] =>
    scanForTokens(template, tokenConfigOf(template));

/** Delimiter styles people commonly use; checked for mismatch warnings. */
const COMMON_TOKEN_CONFIGS: TokenConfig[] = [
    { start: '@@', end: '@@' },
    { start: '__', end: '__' },
    { start: '{{', end: '}}' },
];

export interface ForeignTokens {
    config: TokenConfig;
    tokens: string[];
}

/**
 * Tokens written with a *different* delimiter style than the template's
 * configured one. These would NOT be replaced at generation time — surfaced
 * in the UI as a "did you mean to switch delimiters?" warning.
 */
export const detectForeignTokens = (template: LoadedTemplate): ForeignTokens[] => {
    const active = tokenConfigOf(template);
    const out: ForeignTokens[] = [];
    for (const cfg of COMMON_TOKEN_CONFIGS) {
        if (cfg.start === active.start && cfg.end === active.end) continue;
        const tokens = scanForTokens(template, cfg);
        if (tokens.length) out.push({ config: cfg, tokens });
    }
    return out;
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
    /** Value is mandatory: generation needs a non-empty answer or default. */
    required: boolean;
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
    required: p.required === true,
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
                : { name: tok, token: tok, message: tok, type: 'text', default: '', validate: 'none', exposeCli: true, required: false, detected: true }
        );
        seen.add(tok);
    }
    for (const p of template.manifest.prompts) {
        const tok = p.token || p.name;
        if (!seen.has(tok)) out.push(toVariable(p, false));
    }
    return out;
};
