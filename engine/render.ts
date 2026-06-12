import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_EXCLUDE_DIRS, isProbablyBinary, walkFiles } from './fsx';
import { DEFAULT_TOKEN_CONFIG } from './tokens';
import { TokenConfig } from './types';

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replace every `<start>TOKEN<end>` occurrence with its value in a SINGLE pass.
 * Single-pass matters with mixed/nested boilerplates: a substituted value that
 * itself contains token-like text must never be re-scanned and replaced again
 * (the old sequential split/join did exactly that).
 */
export const tokenReplace = (
    input: string,
    tokens: Record<string, string>,
    cfg: TokenConfig = DEFAULT_TOKEN_CONFIG
): string => {
    const names = Object.keys(tokens);
    if (!names.length) return input;
    const pattern =
        escapeRe(cfg.start) +
        '(' + names.sort((a, b) => b.length - a.length).map(escapeRe).join('|') + ')' +
        escapeRe(cfg.end);
    return input.replace(new RegExp(pattern, 'g'), (whole, name: string) => tokens[name] ?? whole);
};

/** Replace tokens across every text file under `root`. */
export const detokenizeTree = (
    root: string,
    tokens: Record<string, string>,
    extraExcludePaths: string[] = [],
    cfg: TokenConfig = DEFAULT_TOKEN_CONFIG
): void => {
    for (const file of walkFiles(root)) {
        if (isProbablyBinary(file)) continue;
        const rel = path.relative(root, file);
        if (extraExcludePaths.some((ex) => rel.includes(ex))) continue;
        const content = fs.readFileSync(file, 'utf8');
        const replaced = tokenReplace(content, tokens, cfg);
        if (replaced !== content) fs.writeFileSync(file, replaced);
    }
};

/** Rename files and directories whose names contain a token, deepest first. */
export const detokenizePaths = (
    root: string,
    tokens: Record<string, string>,
    cfg: TokenConfig = DEFAULT_TOKEN_CONFIG
): void => {
    const entries: string[] = [];
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && DEFAULT_EXCLUDE_DIRS.includes(entry.name)) continue;
            const full = path.join(dir, entry.name);
            entries.push(full);
            if (entry.isDirectory()) walk(full);
        }
    };
    walk(root);

    entries
        .sort((a, b) => b.split(path.sep).length - a.split(path.sep).length)
        .forEach((full) => {
            const dir = path.dirname(full);
            const base = path.basename(full);
            const renamed = tokenReplace(base, tokens, cfg);
            if (renamed !== base) fs.renameSync(full, path.join(dir, renamed));
        });
};
