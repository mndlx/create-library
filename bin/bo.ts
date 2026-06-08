#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Components, Terminal } from '@virtual-registry/mandolin';
import {
    LoadedTemplate,
    PromptDef,
    addTemplateDir,
    listTemplates,
    normalizePackageName,
    readRawManifest,
    resolveTemplateDirs,
    scaffoldTemplate,
    validateManifest,
    writeRawManifest,
} from '../engine';

const { text } = Components;

async function select(question: string, options: string[]): Promise<string> {
    const wizard = new Terminal<{ value: string }>();
    wizard.initState({ value: options[0] });
    wizard.newLine(question);
    wizard.newSelectLine(options, (sel) => ({ value: String(sel) }));
    await wizard.draw({});
    return wizard.state?.value ?? options[0];
}

async function input(question: string, fallback = ''): Promise<string> {
    const wizard = new Terminal<{ value: string }>();
    wizard.initState({ value: fallback });
    wizard.newLine(fallback ? `${question} (default: ${fallback})` : question);
    wizard.newInputLine((raw) => ({ value: raw || fallback }));
    await wizard.draw({});
    return wizard.state?.value ?? fallback;
}

async function chooseTemplate(action: string): Promise<LoadedTemplate | undefined> {
    const templates = listTemplates();
    if (!templates.length) {
        console.log('No templates available yet.');
        return undefined;
    }
    const labels = templates.map((t) => `${t.manifest.name}  —  ${t.dir}`);
    const picked = await select(`Pick a template to ${action}`, labels);
    return templates[Math.max(0, labels.indexOf(picked))];
}

function listAction(): void {
    const templates = listTemplates();
    if (!templates.length) {
        console.log('No templates found.');
        return;
    }
    console.log(text(`\n${templates.length} template(s):`, { color: 51 }));
    for (const t of templates) {
        console.log(`  • ${t.manifest.name}  (${t.manifest.prompts.length} prompt/s)`);
        if (t.manifest.title) console.log(`      ${t.manifest.title}`);
        console.log(`      ${t.dir}`);
    }
}

async function createAction(): Promise<void> {
    const name = normalizePackageName(await input('Template name'));
    if (!name) {
        console.log('A template name is required.');
        return;
    }
    const title = await input('Title', name);
    const description = await input('Description', '');

    const roots = resolveTemplateDirs();
    const where = await select('Where should it be created?', [...roots, 'Custom path…']);
    const rootDir = where === 'Custom path…' ? path.resolve(await input('Path')) : where;

    try {
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = scaffoldTemplate({ rootDir, name, title, description });
        console.log(text(`\nCreated template at ${dir}`, { color: 82 }));
        console.log('Add your files under its "template/" folder, then configure prompts/tokens.');
        if (!roots.includes(rootDir)) {
            const register = await select('Register this directory so the CLI can find it?', ['yes', 'no']);
            if (register === 'yes') console.log(`Registered: ${addTemplateDir(rootDir)}`);
        }
    } catch (err) {
        console.error((err as Error).message);
    }
}

async function addPrompt(manifest: ReturnType<typeof readRawManifest>, type: PromptDef['type']): Promise<void> {
    const name = (await input('Variable name')).trim();
    if (!name) return;
    const message = await input('Question', `Provide ${name}`);
    const token = (await input('Token', name.toUpperCase())).trim() || name.toUpperCase();
    const def = await input('Default', '');

    const prompt: PromptDef = { name, message, type, token };
    if (def) prompt.default = def;

    if (type === 'select') {
        const options = (await input('Options (comma-separated)'))
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
        prompt.options = options;
    } else {
        const validate = await select('Validator', ['none', 'packageName', 'nonEmpty']);
        prompt.validate = validate as PromptDef['validate'];
    }

    manifest.prompts = manifest.prompts || [];
    manifest.prompts.push(prompt);
}

async function addRecord(
    manifest: ReturnType<typeof readRawManifest>,
    section: 'dependencies' | 'devDependencies' | 'scripts'
): Promise<void> {
    const key = (await input(section === 'scripts' ? 'Script name' : 'Package name')).trim();
    if (!key) return;
    const value = await input(section === 'scripts' ? 'Command' : 'Version', section === 'scripts' ? '' : 'latest');
    manifest.packageJson = manifest.packageJson || {};
    const bucket = (manifest.packageJson[section] as Record<string, string>) || {};
    bucket[key] = value;
    manifest.packageJson[section] = bucket;
}

async function configureAction(): Promise<void> {
    const template = await chooseTemplate('configure');
    if (!template) return;
    const manifest = readRawManifest(template.dir);

    let editing = true;
    while (editing) {
        const choice = await select(`Configure "${manifest.name}"`, [
            'Add text prompt',
            'Add select prompt',
            'Add dependency',
            'Add devDependency',
            'Add script',
            'Add post-generate hook',
            'Show manifest',
            'Save & back',
        ]);

        switch (choice) {
            case 'Add text prompt':
                await addPrompt(manifest, 'text');
                break;
            case 'Add select prompt':
                await addPrompt(manifest, 'select');
                break;
            case 'Add dependency':
                await addRecord(manifest, 'dependencies');
                break;
            case 'Add devDependency':
                await addRecord(manifest, 'devDependencies');
                break;
            case 'Add script':
                await addRecord(manifest, 'scripts');
                break;
            case 'Add post-generate hook': {
                const cmd = (await input('Command')).trim();
                if (cmd) {
                    manifest.hooks = manifest.hooks || {};
                    manifest.hooks.postGenerate = manifest.hooks.postGenerate || [];
                    manifest.hooks.postGenerate.push(cmd);
                }
                break;
            }
            case 'Show manifest':
                console.log(JSON.stringify(manifest, null, 2));
                break;
            default:
                editing = false;
        }
    }

    const errors = validateManifest(manifest);
    if (errors.length) {
        console.error(text('\nNot saved — manifest is invalid:', { color: 197 }));
        for (const e of errors) console.error(`  - ${e}`);
        return;
    }
    writeRawManifest(template.dir, manifest);
    console.log(text('Manifest saved.', { color: 82 }));
}

async function validateAction(): Promise<void> {
    const template = await chooseTemplate('validate');
    if (!template) return;
    const errors = validateManifest(readRawManifest(template.dir));
    if (!errors.length) {
        console.log(text(`\n"${template.manifest.name}" is valid.`, { color: 82 }));
    } else {
        console.error(text(`\n"${template.manifest.name}" has issues:`, { color: 197 }));
        for (const e of errors) console.error(`  - ${e}`);
    }
}

async function addDirAction(): Promise<void> {
    const dir = (await input('External templates directory')).trim();
    if (!dir) return;
    console.log(text(`Registered: ${addTemplateDir(dir)}`, { color: 82 }));
}

async function main() {
    console.log(text(' create-library · back-office ', { color: 51 }));

    let running = true;
    while (running) {
        const action = await select('What do you want to do?', [
            'List templates',
            'Create template',
            'Configure template',
            'Validate template',
            'Register external dir',
            'Exit',
        ]);

        switch (action) {
            case 'List templates':
                listAction();
                break;
            case 'Create template':
                await createAction();
                break;
            case 'Configure template':
                await configureAction();
                break;
            case 'Validate template':
                await validateAction();
                break;
            case 'Register external dir':
                await addDirAction();
                break;
            default:
                running = false;
        }
    }
}

if (require.main === module) {
    main().catch((err) => {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    });
}
