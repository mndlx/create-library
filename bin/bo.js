#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const clack = __importStar(require("@clack/prompts"));
const picocolors_1 = __importDefault(require("picocolors"));
const engine_1 = require("../engine");
/** Colored text helper kept API-compatible with the old mandolin usage. */
const text = (s, opt) => {
    if (opt?.color === 82)
        return picocolors_1.default.green(s);
    if (opt?.color === 51)
        return picocolors_1.default.cyan(s);
    if (opt?.color === 197)
        return picocolors_1.default.red(s);
    return s;
};
const bail = () => {
    clack.cancel('Cancelled.');
    process.exit(1);
};
async function select(question, options) {
    const value = await clack.select({ message: question, options: options.map((o) => ({ value: o, label: o })) });
    if (clack.isCancel(value))
        bail();
    return String(value);
}
async function input(question, fallback = '') {
    const value = await clack.text({
        message: question,
        placeholder: fallback ? `Enter = ${fallback}` : undefined,
        defaultValue: fallback,
    });
    if (clack.isCancel(value))
        bail();
    return String(value ?? '') || fallback;
}
async function chooseTemplate(verb) {
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length)
        return void console.log('No templates available yet.');
    if (templates.length === 1)
        return templates[0];
    const labels = templates.map((t) => `${t.manifest.name}  —  ${t.dir}`);
    const picked = await select(`Pick a template to ${verb}`, labels);
    return templates[Math.max(0, labels.indexOf(picked))];
}
const featureSummary = (features) => {
    const on = Object.entries(features)
        .filter(([, v]) => v !== false && v !== '')
        .map(([k, v]) => (v === true ? k : `${k}=${v}`));
    return on.length ? on.join(', ') : '(none)';
};
function listAction() {
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length)
        return void console.log('No templates found.');
    console.log(text(`\n${templates.length} template(s):`, { color: 51 }));
    for (const t of templates) {
        console.log(`  • ${t.manifest.name}  [${(0, engine_1.outputModeOf)(t)}]  —  ${t.manifest.title ?? ''}`);
        const vars = t.manifest.prompts.map((p) => p.name);
        const feats = (t.manifest.features ?? []).map((f) => f.id);
        console.log(`      variables: ${vars.join(', ') || '(none)'}`);
        console.log(`      features:  ${feats.join(', ') || '(none)'}`);
        console.log(`      ${t.dir}`);
    }
}
async function configure(template) {
    const answers = await (0, engine_1.runTemplatePrompts)(template);
    const features = await (0, engine_1.runFeatureSelection)(template);
    return { answers, features };
}
async function runGeneration(template, answers, features) {
    if ((0, engine_1.outputModeOf)(template) === 'merge') {
        const into = path.resolve(await input('Merge into which project directory?', process.cwd()));
        const { report } = (0, engine_1.mergeInto)({ template, projectDir: into, answers, features });
        console.log(text(`\nMerged "${template.manifest.name}" into ${into}`, { color: 82 }));
        console.log(`Added ${report.created.length} file(s)${report.packageJsonMerged ? ', merged package.json' : ''}; skipped ${report.skipped.length}.`);
    }
    else {
        const name = answers[(0, engine_1.nameVarOf)(template)] || template.manifest.name;
        const into = path.resolve(await input('Create in directory', process.cwd()));
        (0, engine_1.generate)({ template, targetDir: path.join(into, name), answers, features });
        console.log(text(`\nCreated ${name} at ${path.join(into, name)}`, { color: 82 }));
    }
    console.log(`Features: ${featureSummary(features)}`);
}
async function generateAction() {
    const template = await chooseTemplate('generate');
    if (!template)
        return;
    const { answers, features } = await configure(template);
    try {
        await runGeneration(template, answers, features);
    }
    catch (err) {
        console.error(err.message);
    }
}
async function savePresetAction() {
    const template = await chooseTemplate('configure');
    if (!template)
        return;
    const { answers, features } = await configure(template);
    const file = await input('Save preset to', `${template.manifest.name}.preset.json`);
    (0, engine_1.savePreset)(path.resolve(file), { template: template.manifest.name, answers, features });
    console.log(text(`\nSaved preset (${featureSummary(features)}) to ${file}`, { color: 82 }));
}
async function fromPresetAction() {
    const file = await input('Preset file');
    if (!file)
        return;
    try {
        const preset = (0, engine_1.loadPreset)(path.resolve(file));
        const template = preset.template ? (0, engine_1.findTemplate)(preset.template) : undefined;
        if (!template)
            return void console.error(`Unknown template: ${preset.template}`);
        await runGeneration(template, preset.answers ?? {}, preset.features ?? {});
    }
    catch (err) {
        console.error(err.message);
    }
}
async function createTemplateAction() {
    const name = (0, engine_1.normalizePackageName)(await input('Template name'));
    if (!name)
        return void console.log('A name is required.');
    const title = await input('Title', name);
    const description = await input('Description', '');
    const output = (await select('Output mode', ['new', 'merge']));
    const roots = (0, engine_1.resolveTemplateDirs)();
    const where = await select('Where should it be created?', [...roots, 'Custom path…']);
    const rootDir = where === 'Custom path…' ? path.resolve(await input('Path')) : where;
    try {
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = (0, engine_1.scaffoldTemplate)({ rootDir, name, title, description, output });
        console.log(text(`\nCreated ${output} template at ${dir}`, { color: 82 }));
        if (!roots.includes(rootDir)) {
            const reg = await select('Register this directory so the CLI can find it?', ['yes', 'no']);
            if (reg === 'yes')
                console.log(`Registered: ${(0, engine_1.addTemplateDir)(rootDir)}`);
        }
    }
    catch (err) {
        console.error(err.message);
    }
}
async function addVariableAction() {
    const template = await chooseTemplate('add a variable to');
    if (!template)
        return;
    const manifest = (0, engine_1.readRawManifest)(template.dir);
    const name = (await input('Variable name')).trim();
    if (!name)
        return;
    const type = (await select('Type', ['text', 'select']));
    const message = await input('Question shown to the user', `Provide ${name}`);
    const token = (await input('Token to replace (__TOKEN__)', name.toUpperCase())).trim() || name.toUpperCase();
    const def = await input('Default value', '');
    const prompt = { name, message, type, token };
    if (def)
        prompt.default = def;
    if (type === 'select') {
        prompt.options = (await input('Options (comma-separated)'))
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
    }
    else {
        prompt.validate = (await select('Validator', ['none', 'packageName', 'nonEmpty']));
    }
    manifest.prompts = manifest.prompts || [];
    manifest.prompts.push(prompt);
    const errors = (0, engine_1.validateManifest)(manifest);
    if (errors.length)
        return void console.error('Invalid:\n - ' + errors.join('\n - '));
    (0, engine_1.writeRawManifest)(template.dir, manifest);
    console.log(text(`\nAdded variable "${name}" (token __${token}__).`, { color: 82 }));
}
async function setOutputModeAction() {
    const template = await chooseTemplate('change output mode of');
    if (!template)
        return;
    const mode = (await select('Output mode', ['new', 'merge']));
    const manifest = (0, engine_1.readRawManifest)(template.dir);
    manifest.output = mode;
    (0, engine_1.writeRawManifest)(template.dir, manifest);
    console.log(text(`\nSet output mode of "${manifest.name}" to ${mode}.`, { color: 82 }));
}
const COMPONENT_TSX = (name) => `import * as React from 'react';\n\n` +
    `export interface ${name}Props extends React.HTMLAttributes<HTMLDivElement> {}\n\n` +
    `export const ${name} = React.forwardRef<HTMLDivElement, ${name}Props>((props, ref) => (\n` +
    `    <div ref={ref} {...props} />\n));\n\n` +
    `${name}.displayName = '${name}';\n`;
async function addComponentAction() {
    const template = await chooseTemplate('add a component to');
    if (!template)
        return;
    const comp = (await input('Component name (PascalCase)')).trim().replace(/[^A-Za-z0-9]/g, '');
    if (!comp)
        return void console.log('A component name is required.');
    const featureId = comp.toLowerCase();
    const barrel = path.join(template.sourceDir, 'src', 'components', 'index.ts');
    fs.mkdirSync(path.dirname(barrel), { recursive: true });
    if (!fs.existsSync(barrel))
        fs.writeFileSync(barrel, '/* inject:componentExports */\n');
    else if (!fs.readFileSync(barrel, 'utf8').includes('/* inject:componentExports */')) {
        fs.appendFileSync(barrel, '\n/* inject:componentExports */\n');
    }
    const overlayRel = path.join('features', featureId);
    const compDir = path.join(template.dir, overlayRel, 'src', 'components', comp);
    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(path.join(compDir, `${comp}.tsx`), COMPONENT_TSX(comp));
    fs.writeFileSync(path.join(compDir, 'index.ts'), `export * from './${comp}';\n`);
    const manifest = (0, engine_1.readRawManifest)(template.dir);
    manifest.features = manifest.features || [];
    if (manifest.features.some((f) => f.id === featureId))
        return void console.log(`Feature "${featureId}" already exists.`);
    const onByDefault = (await select(`Include ${comp} by default?`, ['no', 'yes'])) === 'yes';
    manifest.features.push({
        id: featureId,
        label: `Include the ${comp} component`,
        type: 'boolean',
        default: onByDefault,
        overlay: overlayRel.split(path.sep).join('/'),
        inject: [{ file: 'src/components/index.ts', marker: 'componentExports', content: `export * from './${comp}';` }],
    });
    const errors = (0, engine_1.validateManifest)(manifest);
    if (errors.length)
        return void console.error('Manifest invalid:\n - ' + errors.join('\n - '));
    (0, engine_1.writeRawManifest)(template.dir, manifest);
    console.log(text(`\nAdded component "${comp}" as feature "${featureId}".`, { color: 82 }));
}
async function validateAction() {
    const template = await chooseTemplate('validate');
    if (!template)
        return;
    const errors = (0, engine_1.validateManifest)((0, engine_1.readRawManifest)(template.dir));
    if (!errors.length)
        console.log(text(`\n"${template.manifest.name}" is valid.`, { color: 82 }));
    else
        console.error(text(`\nIssues:\n - ${errors.join('\n - ')}`, { color: 197 }));
}
async function registerDirAction() {
    const dir = (await input('External templates directory')).trim();
    if (dir)
        console.log(text(`Registered: ${(0, engine_1.addTemplateDir)(dir)}`, { color: 82 }));
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
            'Add component to template',
            'Set template output mode',
            'List templates',
            'Validate template',
            'Register external dir',
            'Exit',
        ]);
        switch (action) {
            case 'Configure & generate':
                await generateAction();
                break;
            case 'Configure & save preset':
                await savePresetAction();
                break;
            case 'Generate from preset':
                await fromPresetAction();
                break;
            case 'Create template':
                await createTemplateAction();
                break;
            case 'Add variable to template':
                await addVariableAction();
                break;
            case 'Add component to template':
                await addComponentAction();
                break;
            case 'Set template output mode':
                await setOutputModeAction();
                break;
            case 'List templates':
                listAction();
                break;
            case 'Validate template':
                await validateAction();
                break;
            case 'Register external dir':
                await registerDirAction();
                break;
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
