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
    const wizard = new mandolin_1.Terminal();
    wizard.initState({ value: options[0] });
    wizard.newLine(question);
    wizard.newSelectLine(options, (sel) => ({ value: String(sel) }));
    await wizard.draw({});
    return wizard.state?.value ?? options[0];
}
async function input(question, fallback = '') {
    const wizard = new mandolin_1.Terminal();
    wizard.initState({ value: fallback });
    wizard.newLine(fallback ? `${question} (default: ${fallback})` : question);
    wizard.newInputLine((raw) => ({ value: raw || fallback }));
    await wizard.draw({});
    return wizard.state?.value ?? fallback;
}
async function chooseTemplate(action) {
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length) {
        console.log('No templates available yet.');
        return undefined;
    }
    const labels = templates.map((t) => `${t.manifest.name}  —  ${t.dir}`);
    const picked = await select(`Pick a template to ${action}`, labels);
    return templates[Math.max(0, labels.indexOf(picked))];
}
function listAction() {
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length) {
        console.log('No templates found.');
        return;
    }
    console.log(text(`\n${templates.length} template(s):`, { color: 51 }));
    for (const t of templates) {
        console.log(`  • ${t.manifest.name}  (${t.manifest.prompts.length} prompt/s)`);
        if (t.manifest.title)
            console.log(`      ${t.manifest.title}`);
        console.log(`      ${t.dir}`);
    }
}
async function createAction() {
    const name = (0, engine_1.normalizePackageName)(await input('Template name'));
    if (!name) {
        console.log('A template name is required.');
        return;
    }
    const title = await input('Title', name);
    const description = await input('Description', '');
    const roots = (0, engine_1.resolveTemplateDirs)();
    const where = await select('Where should it be created?', [...roots, 'Custom path…']);
    const rootDir = where === 'Custom path…' ? path.resolve(await input('Path')) : where;
    try {
        fs.mkdirSync(rootDir, { recursive: true });
        const dir = (0, engine_1.scaffoldTemplate)({ rootDir, name, title, description });
        console.log(text(`\nCreated template at ${dir}`, { color: 82 }));
        console.log('Add your files under its "template/" folder, then configure prompts/tokens.');
        if (!roots.includes(rootDir)) {
            const register = await select('Register this directory so the CLI can find it?', ['yes', 'no']);
            if (register === 'yes')
                console.log(`Registered: ${(0, engine_1.addTemplateDir)(rootDir)}`);
        }
    }
    catch (err) {
        console.error(err.message);
    }
}
async function addPrompt(manifest, type) {
    const name = (await input('Variable name')).trim();
    if (!name)
        return;
    const message = await input('Question', `Provide ${name}`);
    const token = (await input('Token', name.toUpperCase())).trim() || name.toUpperCase();
    const def = await input('Default', '');
    const prompt = { name, message, type, token };
    if (def)
        prompt.default = def;
    if (type === 'select') {
        const options = (await input('Options (comma-separated)'))
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
        prompt.options = options;
    }
    else {
        const validate = await select('Validator', ['none', 'packageName', 'nonEmpty']);
        prompt.validate = validate;
    }
    manifest.prompts = manifest.prompts || [];
    manifest.prompts.push(prompt);
}
async function addRecord(manifest, section) {
    const key = (await input(section === 'scripts' ? 'Script name' : 'Package name')).trim();
    if (!key)
        return;
    const value = await input(section === 'scripts' ? 'Command' : 'Version', section === 'scripts' ? '' : 'latest');
    manifest.packageJson = manifest.packageJson || {};
    const bucket = manifest.packageJson[section] || {};
    bucket[key] = value;
    manifest.packageJson[section] = bucket;
}
async function configureAction() {
    const template = await chooseTemplate('configure');
    if (!template)
        return;
    const manifest = (0, engine_1.readRawManifest)(template.dir);
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
    const errors = (0, engine_1.validateManifest)(manifest);
    if (errors.length) {
        console.error(text('\nNot saved — manifest is invalid:', { color: 197 }));
        for (const e of errors)
            console.error(`  - ${e}`);
        return;
    }
    (0, engine_1.writeRawManifest)(template.dir, manifest);
    console.log(text('Manifest saved.', { color: 82 }));
}
async function validateAction() {
    const template = await chooseTemplate('validate');
    if (!template)
        return;
    const errors = (0, engine_1.validateManifest)((0, engine_1.readRawManifest)(template.dir));
    if (!errors.length) {
        console.log(text(`\n"${template.manifest.name}" is valid.`, { color: 82 }));
    }
    else {
        console.error(text(`\n"${template.manifest.name}" has issues:`, { color: 197 }));
        for (const e of errors)
            console.error(`  - ${e}`);
    }
}
async function addDirAction() {
    const dir = (await input('External templates directory')).trim();
    if (!dir)
        return;
    console.log(text(`Registered: ${(0, engine_1.addTemplateDir)(dir)}`, { color: 82 }));
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
