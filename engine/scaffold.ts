import * as fs from 'fs';
import * as path from 'path';
import { copyDir } from './fsx';
import { MANIFEST_FILENAME } from './manifest';
import { TemplateManifest } from './types';

export interface ScaffoldOptions {
    /** Directory in which the `<name>/` template folder is created. */
    rootDir: string;
    name: string;
    title?: string;
    description?: string;
    output?: 'new' | 'merge';
    /**
     * Payload location relative to the template. "template" (default) nests files
     * in a `template/` subfolder; "." puts them at the template root (flat), in
     * which case the manifest is stripped from generated output by default.
     */
    source?: string;
}

/** Create a new template skeleton (manifest + minimal payload). Returns its directory. */
export const scaffoldTemplate = ({ rootDir, name, title, description, output = 'new', source = 'template' }: ScaffoldOptions): string => {
    const templateDir = path.join(rootDir, name);
    if (fs.existsSync(templateDir)) throw new Error(`Template already exists: ${templateDir}`);

    const payloadDir = path.join(templateDir, source);
    fs.mkdirSync(payloadDir, { recursive: true });

    const manifest: TemplateManifest = {
        name,
        title: title || name,
        description: description || '',
        version: '1.0.0',
        source,
        output,
        tokenConfig: { start: '@@', end: '@@' },
        nameVar: 'name',
        prompts: [
            {
                name: 'name',
                // In merge mode nothing is created from this name; it only fills the token.
                message: output === 'merge' ? 'Name (fills the REPLACE token)' : 'Provide a name for your project',
                type: 'text',
                default: 'my-app',
                token: 'REPLACE',
                validate: 'packageName',
                exposeCli: true,
            },
        ],
        detokenize: { exclude: [] },
        packageJson: {},
        hooks: { postGenerate: [] },
        nextSteps: output === 'merge' ? [] : ['cd @@REPLACE@@', 'npm install'],
    };
    fs.writeFileSync(path.join(templateDir, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2) + '\n');

    fs.writeFileSync(
        path.join(payloadDir, 'package.json'),
        JSON.stringify({ name: '@@REPLACE@@', version: '0.0.0', private: true }, null, 2) + '\n'
    );
    fs.writeFileSync(
        path.join(payloadDir, 'README.md'),
        `# @@REPLACE@@\n\n${description || 'A new project scaffolded by virtuallab-create-library.'}\n`
    );

    return templateDir;
};

export interface ImportOptions {
    /** Directory in which the `<name>/` template folder is created. */
    rootDir: string;
    name: string;
    title?: string;
    description?: string;
    output?: 'new' | 'merge';
    /** Payload layout: "template" subfolder (default) or "." (flat root). */
    source?: string;
    /** Existing directory whose contents become the template payload. */
    importFrom: string;
}

/**
 * Turn an existing directory into a template: copy its contents as the payload
 * (node_modules/.git etc. excluded) and write a minimal manifest. Tokens are
 * auto-detected from the imported files. Returns the new template directory.
 */
export const importTemplate = ({ rootDir, name, title, description, output = 'new', source = 'template', importFrom }: ImportOptions): string => {
    const from = path.resolve(importFrom);
    if (!fs.existsSync(from) || !fs.statSync(from).isDirectory()) throw new Error(`Import source is not a directory: ${from}`);
    const templateDir = path.join(rootDir, name);
    if (fs.existsSync(templateDir)) throw new Error(`Template already exists: ${templateDir}`);

    const payloadDir = source === '.' ? templateDir : path.join(templateDir, source);
    copyDir(from, payloadDir); // creates payloadDir (and templateDir) with the imported files

    const manifest: TemplateManifest = {
        name,
        title: title || name,
        description: description || '',
        version: '1.0.0',
        source,
        output,
        tokenConfig: { start: '@@', end: '@@' },
        nameVar: 'name',
        prompts: [],
        detokenize: { exclude: [] },
        packageJson: {},
        hooks: { postGenerate: [] },
        nextSteps: [],
    };
    fs.writeFileSync(path.join(templateDir, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2) + '\n');
    return templateDir;
};
