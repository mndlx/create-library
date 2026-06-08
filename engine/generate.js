"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNextSteps = exports.generate = exports.nameVarOf = exports.tokensFromAnswers = void 0;
const path = __importStar(require("path"));
const features_1 = require("./features");
const fsx_1 = require("./fsx");
const hooks_1 = require("./hooks");
const overlay_1 = require("./overlay");
const packageJson_1 = require("./packageJson");
const render_1 = require("./render");
const tokensFromAnswers = (template, answers) => {
    const tokens = {};
    for (const prompt of template.manifest.prompts) {
        const token = prompt.token || prompt.name;
        tokens[token] = answers[prompt.name] ?? prompt.default ?? '';
    }
    return tokens;
};
exports.tokensFromAnswers = tokensFromAnswers;
const nameVarOf = (template) => template.manifest.nameVar || template.manifest.prompts[0]?.name || 'name';
exports.nameVarOf = nameVarOf;
/**
 * Assemble the output:
 *  1. copy the base payload,
 *  2. overlay each active feature, in order,
 *  3. resolve inject markers,
 *  4. merge package.json (base + features),
 *  5. replace tokens across the tree,
 *  6. optionally run post-generate hooks.
 */
const generate = ({ template, targetDir, answers, features = {}, runPostHooks, }) => {
    const effects = (0, features_1.resolveEffects)(template, features);
    (0, fsx_1.copyDir)(template.sourceDir, targetDir);
    for (const effect of effects) {
        if (effect.overlay)
            (0, overlay_1.overlayDir)(path.join(template.dir, effect.overlay), targetDir);
    }
    const injects = [];
    for (const effect of effects)
        for (const inj of effect.inject ?? [])
            injects.push(inj);
    (0, overlay_1.applyInjects)(targetDir, injects);
    (0, packageJson_1.mergePackageJson)(targetDir, template.manifest.packageJson);
    for (const effect of effects)
        (0, packageJson_1.mergePackageJson)(targetDir, effect.packageJson);
    const tokens = (0, exports.tokensFromAnswers)(template, answers);
    for (const effect of effects)
        Object.assign(tokens, effect.tokens ?? {});
    (0, render_1.detokenizeTree)(targetDir, tokens, template.manifest.detokenize?.exclude ?? []);
    const hooks = template.manifest.hooks?.postGenerate ?? [];
    if (runPostHooks && hooks.length)
        (0, hooks_1.runHooks)(hooks, targetDir);
    return { tokens };
};
exports.generate = generate;
const renderNextSteps = (template, tokens) => (template.manifest.nextSteps ?? []).map((line) => (0, render_1.tokenReplace)(line, tokens));
exports.renderNextSteps = renderNextSteps;
