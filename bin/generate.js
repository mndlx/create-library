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
const path = __importStar(require("path"));
const mandolin_1 = require("@virtual-registry/mandolin");
const engine_1 = require("../engine");
const { Spinner, text } = mandolin_1.Components;
const parseArgs = (argv) => {
    const args = { yes: false, force: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--preset')
            args.preset = argv[++i];
        else if (a === '--save-preset')
            args.savePreset = argv[++i];
        else if (a === '--into')
            args.into = argv[++i];
        else if (a === '--merge')
            args.mode = 'merge';
        else if (a === '--new')
            args.mode = 'new';
        else if (a === '--force')
            args.force = true;
        else if (a === '--yes' || a === '-y')
            args.yes = true;
    }
    return args;
};
async function pickTemplate(templates) {
    if (templates.length === 1)
        return templates[0];
    const labels = templates.map((t) => t.manifest.title || t.manifest.name);
    const wizard = new mandolin_1.Terminal();
    wizard.initState({ choice: labels[0] });
    wizard.newLine('Choose a template');
    wizard.newSelectLine(labels, (sel, state) => ({ ...state, choice: String(sel) }));
    await wizard.draw({ clean: true });
    const idx = Math.max(0, labels.indexOf(wizard.state?.choice ?? labels[0]));
    return templates[idx];
}
function featureSummary(features) {
    const on = Object.entries(features)
        .filter(([, v]) => v !== false && v !== '')
        .map(([k, v]) => (v === true ? k : `${k}=${v}`));
    return on.join(', ');
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    console.log(text(' virtuallab-create-library ', { color: 51 }));
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length) {
        console.error('No templates found. Create one with: virtuallab-create-library-bo');
        process.exit(1);
    }
    let template;
    let config;
    if (args.preset) {
        const preset = (0, engine_1.loadPreset)(args.preset);
        const found = preset.template ? (0, engine_1.findTemplate)(preset.template) : undefined;
        if (!found) {
            console.error(`Preset references unknown template: ${preset.template}`);
            process.exit(1);
        }
        template = found;
        config = (0, engine_1.withDefaults)(template, preset);
    }
    else if (args.yes) {
        template = await pickTemplate(templates);
        config = (0, engine_1.withDefaults)(template, {});
    }
    else {
        template = await pickTemplate(templates);
        const answers = await (0, engine_1.runTemplatePrompts)(template);
        const features = await (0, engine_1.runFeatureSelection)(template);
        config = { answers, features };
    }
    const answers = config.answers ?? {};
    const features = config.features ?? (0, engine_1.defaultSelection)(template);
    const mode = args.mode ?? (0, engine_1.outputModeOf)(template);
    if (args.savePreset) {
        (0, engine_1.savePreset)(args.savePreset, { template: template.manifest.name, answers, features });
        console.log(text(`Saved preset to ${args.savePreset}`, { color: 82 }));
    }
    const spinner = process.stdout.isTTY ? new Spinner({ color: 82 }, 'Working') : null;
    spinner?.start();
    try {
        if (mode === 'merge') {
            const projectDir = path.resolve(args.into ?? process.cwd());
            const { tokens, report } = (0, engine_1.mergeInto)({ template, projectDir, answers, features, force: args.force });
            if (spinner)
                spinner.stop('Merged template');
            else
                console.log('Merged template');
            console.log(text(`\nMerged "${template.manifest.name}" into ${projectDir}`, { color: 82 }));
            if (featureSummary(features))
                console.log(`Features: ${featureSummary(features)}`);
            console.log(`Added ${report.created.length} file(s)${report.packageJsonMerged ? ', merged package.json' : ''}.`);
            if (report.skipped.length) {
                console.log(text(`Skipped ${report.skipped.length} existing file(s) (use --force to overwrite):`, { color: 214 }));
                for (const f of report.skipped)
                    console.log(`  - ${f}`);
            }
            const steps = (0, engine_1.renderNextSteps)(template, tokens);
            if (steps.length) {
                console.log('\nNext steps:');
                for (const step of steps)
                    console.log(text('  ' + step, { color: 51 }));
            }
        }
        else {
            const projectName = answers[(0, engine_1.nameVarOf)(template)] || template.manifest.name;
            const targetDir = path.join(path.resolve(args.into ?? process.cwd()), projectName);
            const { tokens } = (0, engine_1.generate)({ template, targetDir, answers, features });
            if (spinner)
                spinner.stop(`Created ${projectName}`);
            else
                console.log(`Created ${projectName}`);
            console.log(text(`\nProject: ${projectName}`, { color: 82 }));
            if (featureSummary(features))
                console.log(`Features: ${featureSummary(features)}`);
            const steps = (0, engine_1.renderNextSteps)(template, tokens);
            if (steps.length) {
                console.log('\nNext steps:');
                for (const step of steps)
                    console.log(text('  ' + step, { color: 51 }));
            }
        }
    }
    catch (err) {
        if (spinner)
            spinner.stop('Failed');
        throw err;
    }
}
main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
