import { copyDir } from './fsx';
import { runHooks } from './hooks';
import { mergePackageJson } from './packageJson';
import { detokenizeTree, tokenReplace } from './render';
import { LoadedTemplate } from './types';

export interface GenerateOptions {
    template: LoadedTemplate;
    targetDir: string;
    answers: Record<string, string>;
    runPostHooks?: boolean;
}

/** Build the `__TOKEN__` -> value map from a template's prompts and the collected answers. */
export const tokensFromAnswers = (
    template: LoadedTemplate,
    answers: Record<string, string>
): Record<string, string> => {
    const tokens: Record<string, string> = {};
    for (const prompt of template.manifest.prompts) {
        const token = prompt.token || prompt.name;
        tokens[token] = answers[prompt.name] ?? prompt.default ?? '';
    }
    return tokens;
};

/** Name of the prompt whose answer becomes the output folder name. */
export const nameVarOf = (template: LoadedTemplate): string =>
    template.manifest.nameVar || template.manifest.prompts[0]?.name || 'name';

export interface GenerateResult {
    tokens: Record<string, string>;
}

/** Copy the payload, replace tokens, merge package.json and optionally run hooks. */
export const generate = ({ template, targetDir, answers, runPostHooks }: GenerateOptions): GenerateResult => {
    const tokens = tokensFromAnswers(template, answers);

    copyDir(template.sourceDir, targetDir);
    detokenizeTree(targetDir, tokens, template.manifest.detokenize?.exclude ?? []);
    mergePackageJson(targetDir, template.manifest.packageJson);

    const hooks = template.manifest.hooks?.postGenerate ?? [];
    if (runPostHooks && hooks.length) runHooks(hooks, targetDir);

    return { tokens };
};

/** Render the manifest's next-steps lines with the resolved tokens. */
export const renderNextSteps = (
    template: LoadedTemplate,
    tokens: Record<string, string>
): string[] => (template.manifest.nextSteps ?? []).map((line) => tokenReplace(line, tokens));
