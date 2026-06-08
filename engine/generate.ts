import * as path from 'path';
import { resolveEffects } from './features';
import { copyDir } from './fsx';
import { runHooks } from './hooks';
import { applyInjects, overlayDir } from './overlay';
import { mergePackageJson } from './packageJson';
import { detokenizeTree, tokenReplace } from './render';
import { InjectDef, LoadedTemplate } from './types';

export interface GenerateOptions {
    template: LoadedTemplate;
    targetDir: string;
    answers: Record<string, string>;
    features?: Record<string, boolean | string>;
    runPostHooks?: boolean;
}

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

export const nameVarOf = (template: LoadedTemplate): string =>
    template.manifest.nameVar || template.manifest.prompts[0]?.name || 'name';

export interface GenerateResult {
    tokens: Record<string, string>;
}

/**
 * Assemble the output:
 *  1. copy the base payload,
 *  2. overlay each active feature, in order,
 *  3. resolve inject markers,
 *  4. merge package.json (base + features),
 *  5. replace tokens across the tree,
 *  6. optionally run post-generate hooks.
 */
export const generate = ({
    template,
    targetDir,
    answers,
    features = {},
    runPostHooks,
}: GenerateOptions): GenerateResult => {
    const effects = resolveEffects(template, features);

    copyDir(template.sourceDir, targetDir);

    for (const effect of effects) {
        if (effect.overlay) overlayDir(path.join(template.dir, effect.overlay), targetDir);
    }

    const injects: InjectDef[] = [];
    for (const effect of effects) for (const inj of effect.inject ?? []) injects.push(inj);
    applyInjects(targetDir, injects);

    mergePackageJson(targetDir, template.manifest.packageJson);
    for (const effect of effects) mergePackageJson(targetDir, effect.packageJson);

    const tokens = tokensFromAnswers(template, answers);
    for (const effect of effects) Object.assign(tokens, effect.tokens ?? {});
    detokenizeTree(targetDir, tokens, template.manifest.detokenize?.exclude ?? []);

    const hooks = template.manifest.hooks?.postGenerate ?? [];
    if (runPostHooks && hooks.length) runHooks(hooks, targetDir);

    return { tokens };
};

export const renderNextSteps = (
    template: LoadedTemplate,
    tokens: Record<string, string>
): string[] => (template.manifest.nextSteps ?? []).map((line) => tokenReplace(line, tokens));
