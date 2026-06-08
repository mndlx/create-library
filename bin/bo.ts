#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Components, Terminal } from '@virtual-registry/mandolin';
import {
    LoadedTemplate,
    addTemplateDir,
    findTemplate,
    generate,
    listTemplates,
    loadPreset,
    nameVarOf,
    normalizePackageName,
    readRawManifest,
    resolveTemplateDirs,
    runFeatureSelection,
    runTemplatePrompts,
    savePreset,
    scaffoldTemplate,
    validateManifest,
    writeRawManifest,
} from '../engine';

const { text } = Components;

async function select(question: string, options: string[]): Promise<string> {
    const w = new Terminal<{ value: string }>();
    w.initState({ value: options[0] });
    w.newLine(question);
    w.newSelectLine(options, (sel) => ({ value: String(sel) }));
    await w.draw({});
    return w.state?.value ?? options[0];
}

async function input(question: string, fallback = ''): Promise<string> {
    const w = new Terminal<{ value: string }>();
    w.initState({ value: fallback });
    w.newLine(fallback ? `${question} (default: ${fallback})` : question);
    w.newInputLine((raw) => ({ value: raw || fallback }));
    await w.draw({});
    return w.state?.value ?? fallback;
}

async function chooseTemplate(verb: string): Promise<LoadedTemplate | undefined> {
    const templates = listTemplates();
    if (!templates.length) {
        console.log('No templates available yet.');
        return undefined;
    }
    if (templates.length === 1) return templates[0];
    const labels = templates.map((t) => `${t.manifest.name}  —  ${t.dir}`);
    const picked = await select(`Pick a template to ${verb}`, labels);
    return templates[Math.max(0, labels.indexOf(picked))];
}

function summarizeFeatures(features: Record<string, boolean | string>): string {
    const on = Object.entries(features)
        .filter(([, v]) => v !== false && v !== '')
        .map(([k, v]) => (v === true ? k : `${k}=${v}`));
    return on.length ? on.join(', ') : '(none)';
}

function listAction(): void {
    const templates = listTemplates();
    if (!templates.length) return void console.log('No templates found.');
    console.log(text(`\n${templates.length} template(s):`, { color: 51 }));
    for (const t of templates) {
        console.log(`  • ${t.manifest.name}  —  ${t.manifest.title ?? ''}`);
        const feats = (t.manifest.features ?? []).map((f) => f.id);
        console.log(`      features: ${feats.length ? feats.join(', ') : '(none)'}`);
        console.log(`      ${t.dir}`);
    }
}

async function configure(template: LoadedTemplate) {
    const answers = await runTemplatePrompts(template);
    const features = await runFeatureSelection(template);
    return { answers, features };
}

async function generateAction(): Promise<void> {
    const template = await chooseTemplate('generate');
    if (!template) return;
    const { answers, features } = await configure(template);
    const name = answers[nameVarOf(template)] || template.manifest.name;
    const into = await input('Create in directory', process.cwd());
    const targetDir = path.join(path.resolve(into), name);
    try {
        generate({ template, targetDir, answers, features });
        console.log(text(`\nCreated ${name} at ${targetDir}`, { color: 82 }));
        console.log(`Features: ${summarizeFeatures(features)}`);
    } catch (err) {
        console.error((err as Error).message);
    }
}

async function savePresetAction(): Promise<void> {
    const template = await chooseTemplate('configure');
    if (!template) return;
    const { answers, features } = await configure(template);
    const file = await input('Save preset to', `${template.manifest.name}.preset.json`);
    savePreset(path.resolve(file), { template: template.manifest.name, answers, features });
    console.log(text(`\nSaved preset (${summarizeFeatures(features)}) to ${file}`, { color: 82 }));
}

async function fromPresetAction(): Promise<void> {
    const file = await input('Preset file');
    if (!file) return;
    try {
        const preset = loadPreset(path.resolve(file));
        const template = preset.template ? findTemplate(preset.template) : undefined;
        if (!template) return void console.error(`Unknown template: ${preset.template}`);
        const answers = preset.answers ?? {};
        const name = answers[nameVarOf(template)] || template.manifest.name;
        const into = await input('Create in directory', process.cwd());
        generate({ template, targetDir: path.join(path.resolve(into), name), answers, features: preset.features ?? {} });
        console.log(text(`\nCreated ${name} from preset.`, { color: 82 }));
    } catch (err) {
        console.error((err as Error).message);
    }
}

async function createTemplateAction(): Promise<void> {
    const name = normalizePackageName(await input('Template name'));
    if (!name) return void console.log('A name is required.');
    const title = await input('Title', name);
    const description = await input('Description', '');
    const roots = resolveTemplateDirs();
    const where = await select('Where should it be created?', [...roots, 'Custom path…']);
    const rootDir = where === 'Custom path…' ? path.resolve(await input('Path')) : where;
    try {
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = scaffoldTemplate({ rootDir, name, title, description });
        console.log(text(`\nCreated template at ${dir}`, { color: 82 }));
        if (!roots.includes(rootDir)) {
            const reg = await select('Register this directory so the CLI can find it?', ['yes', 'no']);
            if (reg === 'yes') console.log(`Registered: ${addTemplateDir(rootDir)}`);
        }
    } catch (err) {
        console.error((err as Error).message);
    }
}

const COMPONENT_TSX = (name: string) =>
    `import * as React from 'react';\n\n` +
    `export interface ${name}Props extends React.HTMLAttributes<HTMLDivElement> {}\n\n` +
    `export const ${name} = React.forwardRef<HTMLDivElement, ${name}Props>((props, ref) => (\n` +
    `    <div ref={ref} {...props} />\n));\n\n` +
    `${name}.displayName = '${name}';\n`;

async function addComponentAction(): Promise<void> {
    const template = await chooseTemplate('add a component to');
    if (!template) return;

    const raw = await input('Component name (PascalCase)');
    const comp = raw.trim().replace(/[^A-Za-z0-9]/g, '');
    if (!comp) return void console.log('A component name is required.');
    const featureId = comp.toLowerCase();

    // ensure the base barrel has the inject marker
    const barrel = path.join(template.sourceDir, 'src', 'components', 'index.ts');
    fs.mkdirSync(path.dirname(barrel), { recursive: true });
    if (!fs.existsSync(barrel)) fs.writeFileSync(barrel, '/* inject:componentExports */\n');
    else if (!fs.readFileSync(barrel, 'utf8').includes('/* inject:componentExports */')) {
        fs.appendFileSync(barrel, '\n/* inject:componentExports */\n');
    }

    // create the overlay
    const overlayRel = path.join('features', featureId);
    const compDir = path.join(template.dir, overlayRel, 'src', 'components', comp);
    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(path.join(compDir, `${comp}.tsx`), COMPONENT_TSX(comp));
    fs.writeFileSync(path.join(compDir, 'index.ts'), `export * from './${comp}';\n`);

    // register a boolean feature in the manifest
    const manifest = readRawManifest(template.dir);
    manifest.features = manifest.features || [];
    if (manifest.features.some((f) => f.id === featureId)) {
        return void console.log(`A feature "${featureId}" already exists.`);
    }
    const onByDefault = (await select(`Include ${comp} by default?`, ['no', 'yes'])) === 'yes';
    manifest.features.push({
        id: featureId,
        label: `Include the ${comp} component`,
        type: 'boolean',
        default: onByDefault,
        overlay: overlayRel.split(path.sep).join('/'),
        inject: [
            {
                file: 'src/components/index.ts',
                marker: 'componentExports',
                content: `export * from './${comp}';`,
            },
        ],
    });

    const errors = validateManifest(manifest);
    if (errors.length) return void console.error('Manifest invalid:\n - ' + errors.join('\n - '));
    writeRawManifest(template.dir, manifest);
    console.log(text(`\nAdded component "${comp}" as feature "${featureId}".`, { color: 82 }));
}

async function validateAction(): Promise<void> {
    const template = await chooseTemplate('validate');
    if (!template) return;
    const errors = validateManifest(readRawManifest(template.dir));
    if (!errors.length) console.log(text(`\n"${template.manifest.name}" is valid.`, { color: 82 }));
    else console.error(text(`\nIssues:\n - ${errors.join('\n - ')}`, { color: 197 }));
}

async function registerDirAction(): Promise<void> {
    const dir = (await input('External templates directory')).trim();
    if (dir) console.log(text(`Registered: ${addTemplateDir(dir)}`, { color: 82 }));
}

async function main() {
    console.log(text(' create-library · back-office ', { color: 51 }));
    let running = true;
    while (running) {
        const action = await select('What do you want to do?', [
            'Configure & generate',
            'Configure & save preset',
            'Generate from preset',
            'Create template',
            'Add component to template',
            'List templates',
            'Validate template',
            'Register external dir',
            'Exit',
        ]);
        switch (action) {
            case 'Configure & generate': await generateAction(); break;
            case 'Configure & save preset': await savePresetAction(); break;
            case 'Generate from preset': await fromPresetAction(); break;
            case 'Create template': await createTemplateAction(); break;
            case 'Add component to template': await addComponentAction(); break;
            case 'List templates': listAction(); break;
            case 'Validate template': await validateAction(); break;
            case 'Register external dir': await registerDirAction(); break;
            default: running = false;
        }
    }
}

if (require.main === module) {
    main().catch((err) => {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    });
}
