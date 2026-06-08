#!/usr/bin/env node
import * as path from 'path';
import { Components, Terminal } from '@virtual-registry/mandolin';
import {
    GenerationConfig,
    LoadedTemplate,
    defaultSelection,
    findTemplate,
    generate,
    listTemplates,
    loadPreset,
    nameVarOf,
    renderNextSteps,
    runFeatureSelection,
    runTemplatePrompts,
    savePreset,
    withDefaults,
} from '../engine';

const { Spinner, text } = Components;

interface Args {
    preset?: string;
    savePreset?: string;
    yes: boolean;
}

const parseArgs = (argv: string[]): Args => {
    const args: Args = { yes: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--preset') args.preset = argv[++i];
        else if (a === '--save-preset') args.savePreset = argv[++i];
        else if (a === '--yes' || a === '-y') args.yes = true;
    }
    return args;
};

async function pickTemplate(templates: LoadedTemplate[]): Promise<LoadedTemplate> {
    if (templates.length === 1) return templates[0];
    const labels = templates.map((t) => t.manifest.title || t.manifest.name);
    const wizard = new Terminal<{ choice: string }>();
    wizard.initState({ choice: labels[0] });
    wizard.newLine('Choose a template');
    wizard.newSelectLine(labels, (sel, state) => ({ ...state, choice: String(sel) }));
    await wizard.draw({ clean: true });
    const idx = Math.max(0, labels.indexOf(wizard.state?.choice ?? labels[0]));
    return templates[idx];
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    console.log(text(' virtuallab-create-library ', { color: 51 }));

    const templates = listTemplates();
    if (!templates.length) {
        console.error('No templates found. Create one with: virtuallab-create-library-bo');
        process.exit(1);
    }

    let template: LoadedTemplate;
    let config: GenerationConfig;

    if (args.preset) {
        const preset = loadPreset(args.preset);
        const found = preset.template ? findTemplate(preset.template) : undefined;
        if (!found) {
            console.error(`Preset references unknown template: ${preset.template}`);
            process.exit(1);
        }
        template = found;
        config = withDefaults(template, preset);
    } else if (args.yes) {
        template = await pickTemplate(templates);
        config = withDefaults(template, {});
    } else {
        template = await pickTemplate(templates);
        const answers = await runTemplatePrompts(template);
        const features = await runFeatureSelection(template);
        config = { answers, features };
    }

    const answers = config.answers ?? {};
    const features = config.features ?? defaultSelection(template);
    const projectName = answers[nameVarOf(template)] || template.manifest.name;
    const targetDir = path.join(process.cwd(), projectName);

    if (args.savePreset) {
        savePreset(args.savePreset, { template: template.manifest.name, answers, features });
        console.log(text(`Saved preset to ${args.savePreset}`, { color: 82 }));
    }

    const spinner = process.stdout.isTTY ? new Spinner({ color: 82 }, 'Creating project') : null;
    spinner?.start();
    let tokens: Record<string, string>;
    try {
        ({ tokens } = generate({ template, targetDir, answers, features }));
        const done = `Created ${projectName}`;
        if (spinner) spinner.stop(done);
        else console.log(done);
    } catch (err) {
        if (spinner) spinner.stop('Failed to create the project');
        throw err;
    }

    console.log(text(`\nProject: ${projectName}`, { color: 82 }));
    const enabled = Object.entries(features)
        .filter(([, v]) => v !== false && v !== '')
        .map(([k, v]) => (v === true ? k : `${k}=${v}`));
    if (enabled.length) console.log(`Features: ${enabled.join(', ')}`);

    const steps = renderNextSteps(template, tokens);
    if (steps.length) {
        console.log('\nNext steps:');
        for (const step of steps) console.log(text('  ' + step, { color: 51 }));
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
