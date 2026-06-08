import * as fs from 'fs';
import * as path from 'path';
import { isProbablyBinary, walkFiles } from './fsx';

/** Replace every `__TOKEN__` occurrence (literal, no regex) with its value. */
export const tokenReplace = (input: string, tokens: Record<string, string>): string => {
    let out = input;
    for (const [token, value] of Object.entries(tokens)) {
        out = out.split(`__${token}__`).join(value);
    }
    return out;
};

/** Replace tokens across every text file under `root`. */
export const detokenizeTree = (
    root: string,
    tokens: Record<string, string>,
    extraExcludePaths: string[] = []
): void => {
    for (const file of walkFiles(root)) {
        if (isProbablyBinary(file)) continue;
        const rel = path.relative(root, file);
        if (extraExcludePaths.some((ex) => rel.includes(ex))) continue;
        const content = fs.readFileSync(file, 'utf8');
        const replaced = tokenReplace(content, tokens);
        if (replaced !== content) fs.writeFileSync(file, replaced);
    }
};
