import * as fs from 'fs';
import * as path from 'path';
import { MANIFEST_FILENAME } from './manifest';
import { TemplateManifest } from './types';

export interface ScaffoldOptions {
    /** Directory in which the `<name>/` template folder is created. */
    rootDir: string;
    name: string;
    title?: string;
    description?: string;
}

/** Create a new template skeleton (manifest + minimal payload). Returns its directory. */
export const scaffoldTemplate = ({ rootDir, name, title, description }: ScaffoldOptions): string => {
    const templateDir = path.join(rootDir, name);
    if (fs.existsSync(templateDir)) throw new Error(`Template already exists: ${templateDir}`);

    const payloadDir = path.join(templateDir, 'template');
    fs.mkdirSync(payloadDir, { recursive: true });

    const manifest: TemplateManifest = {
        name,
        title: title || name,
        description: description || '',
        version: '1.0.0',
        source: 'template',
        nameVar: 'name',
        prompts: [
            {
                name: 'name',
                message: 'Provide a name for your project',
                type: 'text',
                default: 'my-app',
                token: 'REPLACE',
                validate: 'packageName',
            },
        ],
        detokenize: { exclude: [] },
        packageJson: {},
        hooks: { postGenerate: [] },
        nextSteps: ['cd __REPLACE__', 'npm install'],
    };
    fs.writeFileSync(path.join(templateDir, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2) + '\n');

    fs.writeFileSync(
        path.join(payloadDir, 'package.json'),
        JSON.stringify({ name: '__REPLACE__', version: '0.0.0', private: true }, null, 2) + '\n'
    );
    fs.writeFileSync(
        path.join(payloadDir, 'README.md'),
        `# __REPLACE__\n\n${description || 'A new project scaffolded by virtuallab-create-library.'}\n`
    );

    return templateDir;
};
