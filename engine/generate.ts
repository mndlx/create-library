import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveEffects } from './features';
import { copyDir } from './fsx';
import { runHooks } from './hooks';
import { MergeReport, mergeTree } from './merge';
import { applyInjects, overlayDir } from './overlay';
import { mergePackageJson } from './packageJson';
import { MANIFEST_FILENAME } from './manifest';
import { detokenizePaths, detokenizeTree, tokenReplace } from './render';
import { InjectDef, LoadedTemplate } from './types';

/**
 * Authoring-only files that must not end up in generated output when the payload
 * lives at the template root (i.e. there is no separate `template/` subfolder).
 */
const PROPRIETARY_ENTRIES = [MANIFEST_FILENAME, 'features'];

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
    features: Record<string, boolean | string> = {},
    includeManifest = false
): Record<string, string> => {
    const effects = resolveEffects(template, features);

    copyDir(template.sourceDir, stagingDir);

    // When the payload is the template root (no `template/` subfolder), the
    // authoring files were copied too — drop them unless the caller opts in.
    const payloadIsRoot = path.resolve(template.sourceDir) === path.resolve(template.dir);
    if (payloadIsRoot && !includeManifest) {
        for (const entry of PROPRIETARY_ENTRIES) {
            fs.rmSync(path.join(stagingDir, entry), { recursive: true, force: true });
        }
    }

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
    /** Keep authoring files (template.json, features/) in the output. Default false. */
    includeManifest?: boolean;
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
    includeManifest = false,
}: GenerateOptions): GenerateResult => {
    const tokens = assemble(template, targetDir, answers, features, includeManifest);
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
    /** Keep authoring files (template.json, features/) in the output. Default false. */
    includeManifest?: boolean;
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
    includeManifest = false,
}: MergeOptions): MergeResult => {
    const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vlcl-'));
    const staging = path.join(stagingRoot, 'tree');
    try {
        const tokens = assemble(template, staging, answers, features, includeManifest);
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
