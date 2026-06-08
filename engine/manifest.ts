import * as fs from 'fs';
import * as path from 'path';
import { LoadedTemplate, PromptDef, TemplateManifest } from './types';

export const MANIFEST_FILENAME = 'template.json';

/** Returns a list of human-readable validation errors (empty = valid). */
export const validateManifest = (data: unknown): string[] => {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
        return ['manifest must be a JSON object'];
    }
    const m = data as Record<string, unknown>;

    if (typeof m.name !== 'string' || !m.name.trim()) errors.push('"name" is required');

    if (!Array.isArray(m.prompts)) {
        errors.push('"prompts" must be an array');
    } else {
        m.prompts.forEach((raw, i) => {
            if (!raw || typeof raw !== 'object') {
                errors.push(`prompts[${i}] must be an object`);
                return;
            }
            const p = raw as Record<string, unknown>;
            if (typeof p.name !== 'string' || !p.name) errors.push(`prompts[${i}].name is required`);
            if (typeof p.message !== 'string' || !p.message) errors.push(`prompts[${i}].message is required`);
            const type = (p.type as string) ?? 'text';
            if (type !== 'text' && type !== 'select') errors.push(`prompts[${i}].type must be "text" or "select"`);
            if (type === 'select' && (!Array.isArray(p.options) || p.options.length === 0)) {
                errors.push(`prompts[${i}].options is required for a select prompt`);
            }
        });
    }

    const detok = m.detokenize as Record<string, unknown> | undefined;
    if (detok && detok.exclude !== undefined && !Array.isArray(detok.exclude)) {
        errors.push('"detokenize.exclude" must be an array');
    }

    const hooks = m.hooks as Record<string, unknown> | undefined;
    if (hooks && hooks.postGenerate !== undefined && !Array.isArray(hooks.postGenerate)) {
        errors.push('"hooks.postGenerate" must be an array');
    }

    if (m.nextSteps !== undefined && !Array.isArray(m.nextSteps)) {
        errors.push('"nextSteps" must be an array');
    }

    return errors;
};

const normalize = (m: TemplateManifest): TemplateManifest => ({
    ...m,
    source: m.source || 'template',
    prompts: (m.prompts || []).map(
        (p): PromptDef => ({
            ...p,
            type: p.type || 'text',
            token: p.token || p.name,
            validate: p.validate || 'none',
        })
    ),
});

export const loadManifest = (manifestDir: string): LoadedTemplate => {
    const manifestPath = path.join(manifestDir, MANIFEST_FILENAME);
    const raw = fs.readFileSync(manifestPath, 'utf8');

    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        throw new Error(`Invalid JSON in ${manifestPath}: ${(e as Error).message}`);
    }

    const errors = validateManifest(data);
    if (errors.length) {
        throw new Error(`Invalid manifest ${manifestPath}:\n - ${errors.join('\n - ')}`);
    }

    const manifest = normalize(data as TemplateManifest);
    const sourceDir = path.join(manifestDir, manifest.source as string);
    return { manifest, dir: manifestDir, sourceDir, origin: path.dirname(manifestDir) };
};
