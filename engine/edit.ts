import * as fs from 'fs';
import * as path from 'path';
import { MANIFEST_FILENAME } from './manifest';
import { TemplateManifest } from './types';

/** Read a manifest as a raw, mutable object (no normalization). */
export const readRawManifest = (templateDir: string): TemplateManifest =>
    JSON.parse(fs.readFileSync(path.join(templateDir, MANIFEST_FILENAME), 'utf8'));

/** Persist a manifest object back to disk. */
export const writeRawManifest = (templateDir: string, data: TemplateManifest): void =>
    fs.writeFileSync(path.join(templateDir, MANIFEST_FILENAME), JSON.stringify(data, null, 2) + '\n');
