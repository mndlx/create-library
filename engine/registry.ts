import * as fs from 'fs';
import * as path from 'path';
import { resolveTemplateDirs } from './config';
import { loadManifest, MANIFEST_FILENAME } from './manifest';
import { latestPublishedDirs } from './publish';
import { LoadedTemplate } from './types';

/** Discover every valid template across the resolved roots (first name wins). */
export const listTemplates = (): LoadedTemplate[] => {
    const out: LoadedTemplate[] = [];
    const seen = new Set<string>();

    const tryLoad = (dir: string) => {
        if (!fs.existsSync(path.join(dir, MANIFEST_FILENAME))) return;
        try {
            const template = loadManifest(dir);
            if (seen.has(template.manifest.name)) return;
            seen.add(template.manifest.name);
            out.push(template);
        } catch (e) {
            console.error(`Skipping invalid template at ${dir}: ${(e as Error).message}`);
        }
    };

    for (const root of resolveTemplateDirs()) {
        // A registered dir can itself be a template (folder linked directly)…
        tryLoad(root);
        // …or a parent holding one template per child directory.
        let entries: string[];
        try {
            entries = fs.readdirSync(root);
        } catch {
            continue;
        }
        for (const entry of entries) tryLoad(path.join(root, entry));
    }

    // Published snapshots come last so a local working copy shadows them.
    for (const dir of latestPublishedDirs()) tryLoad(dir);

    return out;
};

export const findTemplate = (name: string): LoadedTemplate | undefined =>
    listTemplates().find((t) => t.manifest.name === name);
