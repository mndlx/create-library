import * as fs from 'fs';
import * as path from 'path';

/** Directories never copied or scanned. */
export const DEFAULT_EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'storybook-static', 'coverage'];

const BINARY_EXT = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp', '.pdf', '.zip', '.gz',
    '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.mov', '.mp3', '.wasm',
]);

export const isProbablyBinary = (file: string): boolean => BINARY_EXT.has(path.extname(file).toLowerCase());

/** Recursively copy `src` to `dest`, skipping excluded directories. Fails if `dest` exists. */
export const copyDir = (src: string, dest: string, excludeDirs: string[] = DEFAULT_EXCLUDE_DIRS): void => {
    if (!fs.existsSync(src)) throw new Error(`Template source not found: ${src}`);
    if (fs.existsSync(dest)) throw new Error(`Target directory already exists: ${dest}`);
    fs.cpSync(src, dest, {
        recursive: true,
        filter: (s) => !excludeDirs.includes(path.basename(s)),
    });
};

/** List every file under `root`, skipping excluded directories. */
export const walkFiles = (root: string, excludeDirs: string[] = DEFAULT_EXCLUDE_DIRS): string[] => {
    const result: string[] = [];
    const stack = [root];
    while (stack.length) {
        const current = stack.pop() as string;
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (!excludeDirs.includes(entry.name)) stack.push(full);
            } else if (entry.isFile()) {
                result.push(full);
            }
        }
    }
    return result;
};
