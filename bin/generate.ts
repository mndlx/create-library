#!/usr/bin/env node
import * as path from 'path';
import { Components } from '@virtual-registry/mandolin';
import { promptUserProject } from '../prompts/promptUserProject';
import { copyTemplate } from '../utils/copyTemplate';
import { replaceReactViteUbundleTemplatePlaceholders } from '../utils/detokenize';

const { Spinner, text } = Components;
const TEMPLATE_DIR = path.join(__dirname, '..', 'vite-react-ubundle');

async function main() {
    const currentPath = process.cwd();

    console.log(text(' virtuallab-create-library ', { color: 51 }));

    const project = await promptUserProject();
    const projectPath = path.join(currentPath, project.__name);

    // The animated spinner needs a TTY; fall back to plain logs otherwise.
    const spinner = process.stdout.isTTY ? new Spinner({ color: 82 }, 'Creating library template') : null;
    spinner?.start();
    try {
        copyTemplate(TEMPLATE_DIR, projectPath);
        replaceReactViteUbundleTemplatePlaceholders(project, projectPath);
        const done = `Created ${project.__name} structure`;
        if (spinner) spinner.stop(done);
        else console.log(done);
    } catch (err) {
        if (spinner) spinner.stop('Failed to create the library');
        throw err;
    }

    console.log(text(`\nProject: ${project.__name}`, { color: 82 }));
    console.log('From the root folder run:');
    console.log(text('  yarn run dev', { color: 51 }));
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
