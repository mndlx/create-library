#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as clack from '@clack/prompts';
import pc from 'picocolors';
import {
    LoadedTemplate,
    PromptDef,
    addTemplateDir,
    findTemplate,
    generate,
    listTemplates,
    loadPreset,
    mergeInto,
    nameVarOf,
    normalizePackageName,
    outputModeOf,
    readRawManifest,
    resolveTemplateDirs,
    runFeatureSelection,
    runTemplatePrompts,
    savePreset,
    scaffoldTemplate,
    validateManifest,
    writeRawManifest,
} from '../engine';

/** Colored text helper kept API-compatible with the old mandolin usage. */
const text = (s: string, opt?: { color?: number }): string => {
    if (opt?.color === 82) return pc.green(s);
    if (opt?.color === 51) return pc.cyan(s);
    if (opt?.color === 197) return pc.red(s);
    return s;
};

const bail = (): never => {
    clack.cancel('Cancelled.');
    process.exit(1);
};

async function select(question: string, options: string[]): Promise<string> {
    const value = await clack.select({ message: question, options: options.map((o) => ({ value: o, label: o })) });
    if (clack.isCancel(value)) bail();
    return String(value);
}

async function input(question: string, fallback = ''): Promise<string> {
    const value = await clack.text({
        message: question,
        placeholder: fallback ? `Enter = ${fallback}` : undefined,
        defaultValue: fallback,
    });
    if (clack.isCancel(value)) bail();
    return String(value ?? '') || fallback;
}

async function chooseTemplate(verb: string): Promise<LoadedTemplate | undefined> {
    const templates = listTemplates();
    if (!templates.length) return void console.log('No templates available yet.') as undefined;
    if (templates.length === 1) return templates[0];
    const labels = templates.map((t) => `${t.manifest.name}  —  ${t.dir}`);
    const picked = await select(`Pick a template to ${verb}`, labels);
    return templates[Math.max(0, labels.indexOf(picked))];
}

const featureSummary = (features: Record<string, boolean | string>): string => {
    const on = Object.entries(features)
        .filter(([, v]) => v !== false && v !== '')
        .map(([k, v]) => (v === true ? k : `${k}=${v}`));
    return on.length ? on.join(', ') : '(none)';
};

function listAction(): void {
    const templates = listTemplates();
    if (!templates.length) return void console.log('No templates found.');
    console.log(text(`\n${templates.length} template(s):`, { color: 51 }));
    for (const t of templates) {
        console.log(`  • ${t.manifest.name}  [${outputModeOf(t)}]  —  ${t.manifest.title ?? ''}`);
        const vars = t.manifest.prompts.map((p) => p.name);
        const feats = (t.manifest.features ?? []).map((f) => f.id);
        console.log(`      variables: ${vars.join(', ') || '(none)'}`);
        console.log(`      features:  ${feats.join(', ') || '(none)'}`);
        console.log(`      ${t.dir}`);
    }
}

async function configure(template: LoadedTemplate) {
    const answers = await runTemplatePrompts(template);
    const features = await runFeatureSelection(template);
    return { answers, features };
}

async function runGeneration(template: LoadedTemplate, answers: Record<string, string>, features: Record<string, boolean | string>) {
    if (outputModeOf(template) === 'merge') {
        const into = path.resolve(await input('Merge into which project directory?', process.cwd()));
        const { report } = mergeInto({ template, projectDir: into, answers, features });
        console.log(text(`\nMerged "${template.manifest.name}" into ${into}`, { color: 82 }));
        console.log(`Added ${report.created.length} file(s)${report.packageJsonMerged ? ', merged package.json' : ''}; skipped ${report.skipped.length}.`);
    } else {
        const name = answers[nameVarOf(template)] || template.manifest.name;
        const into = path.resolve(await input('Create in directory', process.cwd()));
        generate({ template, targetDir: path.join(into, name), answers, features });
        console.log(text(`\nCreated ${name} at ${path.join(into, name)}`, { color: 82 }));
    }
    console.log(`Features: ${featureSummary(features)}`);
}

async function generateAction(): Promise<void> {
    const template = await chooseTemplate('generate');
    if (!template) return;
    const { answers, features } = await configure(template);
    try {
        await runGeneration(template, answers, features);
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
    console.log(text(`\nSaved preset (${featureSummary(features)}) to ${file}`, { color: 82 }));
}

async function fromPresetAction(): Promise<void> {
    const file = await input('Preset file');
    if (!file) return;
    try {
        const preset = loadPreset(path.resolve(file));
        const template = preset.template ? findTemplate(preset.template) : undefined;
        if (!template) return void console.error(`Unknown template: ${preset.template}`);
        await runGeneration(template, preset.answers ?? {}, preset.features ?? {});
    } catch (err) {
        console.error((err as Error).message);
    }
}

async function createTemplateAction(): Promise<void> {
    const name = normalizePackageName(await input('Template name'));
    if (!name) return void console.log('A name is required.');
    const title = await input('Title', name);
    const description = await input('Description', '');
    const output = (await select('Output mode', ['new', 'merge'])) as 'new' | 'merge';
    const roots = resolveTemplateDirs();
    const where = await select('Where should it be created?', [...roots, 'Custom path…']);
    const rootDir = where === 'Custom path…' ? path.resolve(await input('Path')) : where;
    try {
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = scaffoldTemplate({ rootDir, name, title, description, output });
        console.log(text(`\nCreated ${output} template at ${dir}`, { color: 82 }));
        if (!roots.includes(rootDir)) {
            const reg = await select('Register this directory so the CLI can find it?', ['yes', 'no']);
            if (reg === 'yes') console.log(`Registered: ${addTemplateDir(rootDir)}`);
        }
    } catch (err) {
        console.error((err as Error).message);
    }
}

async function addVariableAction(): Promise<void> {
    const template = await chooseTemplate('add a variable to');
    if (!template) return;
    const manifest = readRawManifest(template.dir);

    const name = (await input('Variable name')).trim();
    if (!name) return;
    const type = (await select('Type', ['text', 'select'])) as PromptDef['type'];
    const message = await input('Question shown to the user', `Provide ${name}`);
    const token = (await input('Token to replace (__TOKEN__)', name.toUpperCase())).trim() || name.toUpperCase();
    const def = await input('Default value', '');

    const prompt: PromptDef = { name, message, type, token };
    if (def) prompt.default = def;
    if (type === 'select') {
        prompt.options = (await input('Options (comma-separated)'))
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
    } else {
        prompt.validate = (await select('Validator', ['none', 'packageName', 'nonEmpty'])) as PromptDef['validate'];
    }

    manifest.prompts = manifest.prompts || [];
    manifest.prompts.push(prompt);

    const errors = validateManifest(manifest);
    if (errors.length) return void console.error('Invalid:\n - ' + errors.join('\n - '));
    writeRawManifest(template.dir, manifest);
    console.log(text(`\nAdded variable "${name}" (token __${token}__).`, { color: 82 }));
}

async function setOutputModeAction(): Promise<void> {
    const template = await chooseTemplate('change output mode of');
    if (!template) return;
    const mode = (await select('Output mode', ['new', 'merge'])) as 'new' | 'merge';
    const manifest = readRawManifest(template.dir);
    manifest.output = mode;
    writeRawManifest(template.dir, manifest);
    console.log(text(`\nSet output mode of "${manifest.name}" to ${mode}.`, { color: 82 }));
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
            'Add variable to template',
            'Set template output mode',
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
            case 'Add variable to template': await addVariableAction(); break;
            case 'Set template output mode': await setOutputModeAction(); break;
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
