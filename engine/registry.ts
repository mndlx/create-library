import * as fs from 'fs';
import * as path from 'path';
import { resolveTemplateDirs } from './config';
import { loadManifest, MANIFEST_FILENAME } from './manifest';
import { LoadedTemplate } from './types';

/** Discover every valid template across the resolved roots (first name wins). */
export const listTemplates = (): LoadedTemplate[] => {
    const out: LoadedTemplate[] = [];
    const seen = new Set<string>();

    for (const root of resolveTemplateDirs()) {
        let entries: string[];
        try {
            entries = fs.readdirSync(root);
        } catch {
            continue;
        }
        for (const entry of entries) {
            const dir = path.join(root, entry);
            if (!fs.existsSync(path.join(dir, MANIFEST_FILENAME))) continue;
            try {
                const template = loadManifest(dir);
                if (seen.has(template.manifest.name)) continue;
                seen.add(template.manifest.name);
                out.push(template);
            } catch (e) {
                console.error(`Skipping invalid template at ${dir}: ${(e as Error).message}`);
            }
        }
    }

    return out;
};

export const findTemplate = (name: string): LoadedTemplate | undefined =>
    listTemplates().find((t) => t.manifest.name === name);
