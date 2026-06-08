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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mandolin_1 = require("@virtual-registry/mandolin");
const engine_1 = require("../engine");
const { text } = mandolin_1.Components;
async function select(question, options) {
    const w = new mandolin_1.Terminal();
    w.initState({ value: options[0] });
    w.newLine(question);
    w.newSelectLine(options, (sel) => ({ value: String(sel) }));
    await w.draw({});
    return w.state?.value ?? options[0];
}
async function input(question, fallback = '') {
    const w = new mandolin_1.Terminal();
    w.initState({ value: fallback });
    w.newLine(fallback ? `${question} (default: ${fallback})` : question);
    w.newInputLine((raw) => ({ value: raw || fallback }));
    await w.draw({});
    return w.state?.value ?? fallback;
}
async function chooseTemplate(verb) {
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length) {
        console.log('No templates available yet.');
        return undefined;
    }
    if (templates.length === 1)
        return templates[0];
    const labels = templates.map((t) => `${t.manifest.name}  —  ${t.dir}`);
    const picked = await select(`Pick a template to ${verb}`, labels);
    return templates[Math.max(0, labels.indexOf(picked))];
}
function summarizeFeatures(features) {
    const on = Object.entries(features)
        .filter(([, v]) => v !== false && v !== '')
        .map(([k, v]) => (v === true ? k : `${k}=${v}`));
    return on.length ? on.join(', ') : '(none)';
}
function listAction() {
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length)
        return void console.log('No templates found.');
    console.log(text(`\n${templates.length} template(s):`, { color: 51 }));
    for (const t of templates) {
        console.log(`  • ${t.manifest.name}  —  ${t.manifest.title ?? ''}`);
        const feats = (t.manifest.features ?? []).map((f) => f.id);
        console.log(`      features: ${feats.length ? feats.join(', ') : '(none)'}`);
        console.log(`      ${t.dir}`);
    }
}
async function configure(template) {
    const answers = await (0, engine_1.runTemplatePrompts)(template);
    const features = await (0, engine_1.runFeatureSelection)(template);
    return { answers, features };
}
async function generateAction() {
    const template = await chooseTemplate('generate');
    if (!template)
        return;
    const { answers, features } = await configure(template);
    const name = answers[(0, engine_1.nameVarOf)(template)] || template.manifest.name;
    const into = await input('Create in directory', process.cwd());
    const targetDir = path.join(path.resolve(into), name);
    try {
        (0, engine_1.generate)({ template, targetDir, answers, features });
        console.log(text(`\nCreated ${name} at ${targetDir}`, { color: 82 }));
        console.log(`Features: ${summarizeFeatures(features)}`);
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
    console.log(text(`\nSaved preset (${summarizeFeatures(features)}) to ${file}`, { color: 82 }));
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
        const answers = preset.answers ?? {};
        const name = answers[(0, engine_1.nameVarOf)(template)] || template.manifest.name;
        const into = await input('Create in directory', process.cwd());
        (0, engine_1.generate)({ template, targetDir: path.join(path.resolve(into), name), answers, features: preset.features ?? {} });
        console.log(text(`\nCreated ${name} from preset.`, { color: 82 }));
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
    const roots = (0, engine_1.resolveTemplateDirs)();
    const where = await select('Where should it be created?', [...roots, 'Custom path…']);
    const rootDir = where === 'Custom path…' ? path.resolve(await input('Path')) : where;
    try {
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = (0, engine_1.scaffoldTemplate)({ rootDir, name, title, description });
        console.log(text(`\nCreated template at ${dir}`, { color: 82 }));
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
const COMPONENT_TSX = (name) => `import * as React from 'react';\n\n` +
    `export interface ${name}Props extends React.HTMLAttributes<HTMLDivElement> {}\n\n` +
    `export const ${name} = React.forwardRef<HTMLDivElement, ${name}Props>((props, ref) => (\n` +
    `    <div ref={ref} {...props} />\n));\n\n` +
    `${name}.displayName = '${name}';\n`;
async function addComponentAction() {
    const template = await chooseTemplate('add a component to');
    if (!template)
        return;
    const raw = await input('Component name (PascalCase)');
    const comp = raw.trim().replace(/[^A-Za-z0-9]/g, '');
    if (!comp)
        return void console.log('A component name is required.');
    const featureId = comp.toLowerCase();
    // ensure the base barrel has the inject marker
    const barrel = path.join(template.sourceDir, 'src', 'components', 'index.ts');
    fs.mkdirSync(path.dirname(barrel), { recursive: true });
    if (!fs.existsSync(barrel))
        fs.writeFileSync(barrel, '/* inject:componentExports */\n');
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
    const manifest = (0, engine_1.readRawManifest)(template.dir);
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
            'Add component to template',
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
            case 'Add component to template':
                await addComponentAction();
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
