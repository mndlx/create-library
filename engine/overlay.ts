import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_EXCLUDE_DIRS, walkFiles } from './fsx';
import { InjectDef } from './types';

/** Copy every file from `src` over `dest`, overwriting on conflicts. */
export const overlayDir = (src: string, dest: string): void => {
    if (!fs.existsSync(src)) throw new Error(`Overlay not found: ${src}`);
    fs.cpSync(src, dest, {
        recursive: true,
        force: true,
        filter: (s) => !DEFAULT_EXCLUDE_DIRS.includes(path.basename(s)),
    });
};

const markerLiteral = (marker: string) => `/* inject:${marker} */`;
const ANY_MARKER = /[ \t]*\/\* inject:[^*]*\*\/[ \t]*\r?\n?/g;

/** Replace `/* inject:<marker> *​/` markers with the collected snippets, then strip the rest. */
export const applyInjects = (root: string, injects: InjectDef[]): void => {
    const byFile = new Map<string, Map<string, string[]>>();
    for (const inj of injects) {
        const perMarker = byFile.get(inj.file) ?? new Map<string, string[]>();
        const list = perMarker.get(inj.marker) ?? [];
        list.push(inj.content);
        perMarker.set(inj.marker, list);
        byFile.set(inj.file, perMarker);
    }

    for (const [relFile, perMarker] of byFile) {
        const filePath = path.join(root, relFile);
        if (!fs.existsSync(filePath)) continue;
        let content = fs.readFileSync(filePath, 'utf8');
        for (const [marker, snippets] of perMarker) {
            content = content.split(markerLiteral(marker)).join(snippets.join('\n'));
        }
        fs.writeFileSync(filePath, content);
    }

    // Remove any markers that received no contribution.
    for (const file of walkFiles(root)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('/* inject:')) {
            fs.writeFileSync(file, content.replace(ANY_MARKER, ''));
        }
    }
};
