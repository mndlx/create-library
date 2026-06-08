#!/usr/bin/env node
import * as path from 'path';
import { Components, Terminal } from '@virtual-registry/mandolin';
import {
    LoadedTemplate,
    generate,
    listTemplates,
    nameVarOf,
    renderNextSteps,
    runTemplatePrompts,
} from '../engine';

const { Spinner, text } = Components;

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
    console.log(text(' virtuallab-create-library ', { color: 51 }));

    const templates = listTemplates();
    if (!templates.length) {
        console.error(
            'No templates found. Create one with the back-office: virtuallab-create-library-bo'
        );
        process.exit(1);
    }

    const template = await pickTemplate(templates);
    const answers = await runTemplatePrompts(template);

    const projectName = answers[nameVarOf(template)] || template.manifest.name;
    const targetDir = path.join(process.cwd(), projectName);

    const spinner = process.stdout.isTTY ? new Spinner({ color: 82 }, 'Creating project') : null;
    spinner?.start();
    let tokens: Record<string, string>;
    try {
        ({ tokens } = generate({ template, targetDir, answers }));
        const done = `Created ${projectName}`;
        if (spinner) spinner.stop(done);
        else console.log(done);
    } catch (err) {
        if (spinner) spinner.stop('Failed to create the project');
        throw err;
    }

    console.log(text(`\nProject: ${projectName}`, { color: 82 }));
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
