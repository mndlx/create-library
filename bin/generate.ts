#!/usr/bin/env node
import * as p from '@clack/prompts';
import * as color from 'picocolors';
import * as path from 'path';
import { promptUserProject } from '../prompts/promptUserProject';
import { copyTemplate } from '../utils/copyTemplate';
import { replaceReactViteUbundleTemplatePlaceholders } from '../utils/detokenize';

const TEMPLATE_DIR = path.join(__dirname, '..', 'vite-react-ubundle');

async function main() {
    const spinner = p.spinner();
    const currentPath = process.cwd();

    p.intro(`${color.cyan(' virtuallab-create-library ')}`);

    const project = await promptUserProject();
    const projectPath = path.join(currentPath, project.__name);

    spinner.start('Creating library template');
    copyTemplate(TEMPLATE_DIR, projectPath);
    spinner.stop(`Created ${project.__name} structure`);

    spinner.start('Finalizing');
    replaceReactViteUbundleTemplatePlaceholders(project, projectPath);
    spinner.stop('Ready');

    const nextSteps = color.white(`
Here are the details of your project:
${color.green('Project Name:')} ${project.__name}

Follow the next steps to get started:

> ${color.cyan('From the root folder')}
    Run the following command:
    yarn run dev
`);

    p.outro(nextSteps);
}

main().catch((err) => {
    p.cancel(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
