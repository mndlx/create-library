import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveEffects } from './features';
import { copyDir } from './fsx';
import { runHooks } from './hooks';
import { MergeReport, mergeTree } from './merge';
import { applyInjects, overlayDir } from './overlay';
import { mergePackageJson } from './packageJson';
import { detokenizePaths, detokenizeTree, tokenReplace } from './render';
import { InjectDef, LoadedTemplate } from './types';

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

export const outputModeOf = (template: LoadedTemplate): 'new' | 'merge' =>
    template.manifest.output === 'merge' ? 'merge' : 'new';

/** Build the fully-resolved template tree into a fresh `stagingDir`. Returns the tokens used. */
export const assemble = (
    template: LoadedTemplate,
    stagingDir: string,
    answers: Record<string, string>,
    features: Record<string, boolean | string> = {}
): Record<string, string> => {
    const effects = resolveEffects(template, features);

    copyDir(template.sourceDir, stagingDir);
    for (const effect of effects) {
        if (effect.overlay) overlayDir(path.join(template.dir, effect.overlay), stagingDir);
    }

    const injects: InjectDef[] = [];
    for (const effect of effects) for (const inj of effect.inject ?? []) injects.push(inj);
    applyInjects(stagingDir, injects);

    mergePackageJson(stagingDir, template.manifest.packageJson);
    for (const effect of effects) mergePackageJson(stagingDir, effect.packageJson);

    const tokens = tokensFromAnswers(template, answers);
    for (const effect of effects) Object.assign(tokens, effect.tokens ?? {});
    detokenizeTree(stagingDir, tokens, template.manifest.detokenize?.exclude ?? []);
    detokenizePaths(stagingDir, tokens);

    return tokens;
};

export interface GenerateOptions {
    template: LoadedTemplate;
    targetDir: string;
    answers: Record<string, string>;
    features?: Record<string, boolean | string>;
    runPostHooks?: boolean;
}

export interface GenerateResult {
    tokens: Record<string, string>;
}

/** "new" mode: create a brand-new project directory from the template. */
export const generate = ({
    template,
    targetDir,
    answers,
    features = {},
    runPostHooks,
}: GenerateOptions): GenerateResult => {
    const tokens = assemble(template, targetDir, answers, features);
    const hooks = template.manifest.hooks?.postGenerate ?? [];
    if (runPostHooks && hooks.length) runHooks(hooks, targetDir);
    return { tokens };
};

export interface MergeOptions {
    template: LoadedTemplate;
    projectDir: string;
    answers: Record<string, string>;
    features?: Record<string, boolean | string>;
    force?: boolean;
    runPostHooks?: boolean;
}

export interface MergeResult {
    tokens: Record<string, string>;
    report: MergeReport;
}

/** "merge" mode: integrate the template into an existing project (non-destructive by default). */
export const mergeInto = ({
    template,
    projectDir,
    answers,
    features = {},
    force = false,
    runPostHooks,
}: MergeOptions): MergeResult => {
    const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vlcl-'));
    const staging = path.join(stagingRoot, 'tree');
    try {
        const tokens = assemble(template, staging, answers, features);
        const report = mergeTree(staging, projectDir, { force });
        const hooks = template.manifest.hooks?.postGenerate ?? [];
        if (runPostHooks && hooks.length) runHooks(hooks, projectDir);
        return { tokens, report };
    } finally {
        fs.rmSync(stagingRoot, { recursive: true, force: true });
    }
};

export const renderNextSteps = (
    template: LoadedTemplate,
    tokens: Record<string, string>
): string[] => (template.manifest.nextSteps ?? []).map((line) => tokenReplace(line, tokens));
