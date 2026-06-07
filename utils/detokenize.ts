import * as path from 'path';
import * as fs from 'fs';
import { ProjectState } from '../types/index';

const ENCODING = 'utf8';

const tokenReplace = (template: string, tokens: Record<string, string>) => {
    let result = template;
    Object.keys(tokens).forEach((token) => {
        result = result.replace(new RegExp(`__${token}__`, 'g'), tokens[token]);
    });
    return result;
};

/**
 * Rimpiazza i token statici presenti nel template 'vite-react-ubundle'.
 * @param project       Stato contenente le info del progetto
 * @param projectPath   Percorso del progetto
 */
export const replaceReactViteUbundleTemplatePlaceholders = (
    project: ProjectState,
    projectPath: string
) => {
    const tokens = { REPLACE: project.__name };

    const targets = [
        'package.json',
        'demo/package.json',
        'lib/package.json',
        'demo/index.html',
        'demo/src/features/HomePage/index.tsx',
    ];

    for (const relativePath of targets) {
        const filePath = path.join(projectPath, relativePath);
        const content = fs.readFileSync(filePath, ENCODING);
        fs.writeFileSync(filePath, tokenReplace(content, tokens));
    }
};
