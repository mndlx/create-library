"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNextSteps = exports.generate = exports.nameVarOf = exports.tokensFromAnswers = void 0;
const fsx_1 = require("./fsx");
const hooks_1 = require("./hooks");
const packageJson_1 = require("./packageJson");
const render_1 = require("./render");
/** Build the `__TOKEN__` -> value map from a template's prompts and the collected answers. */
const tokensFromAnswers = (template, answers) => {
    const tokens = {};
    for (const prompt of template.manifest.prompts) {
        const token = prompt.token || prompt.name;
        tokens[token] = answers[prompt.name] ?? prompt.default ?? '';
    }
    return tokens;
};
exports.tokensFromAnswers = tokensFromAnswers;
/** Name of the prompt whose answer becomes the output folder name. */
const nameVarOf = (template) => template.manifest.nameVar || template.manifest.prompts[0]?.name || 'name';
exports.nameVarOf = nameVarOf;
/** Copy the payload, replace tokens, merge package.json and optionally run hooks. */
const generate = ({ template, targetDir, answers, runPostHooks }) => {
    const tokens = (0, exports.tokensFromAnswers)(template, answers);
    (0, fsx_1.copyDir)(template.sourceDir, targetDir);
    (0, render_1.detokenizeTree)(targetDir, tokens, template.manifest.detokenize?.exclude ?? []);
    (0, packageJson_1.mergePackageJson)(targetDir, template.manifest.packageJson);
    const hooks = template.manifest.hooks?.postGenerate ?? [];
    if (runPostHooks && hooks.length)
        (0, hooks_1.runHooks)(hooks, targetDir);
    return { tokens };
};
exports.generate = generate;
/** Render the manifest's next-steps lines with the resolved tokens. */
const renderNextSteps = (template, tokens) => (template.manifest.nextSteps ?? []).map((line) => (0, render_1.tokenReplace)(line, tokens));
exports.renderNextSteps = renderNextSteps;
