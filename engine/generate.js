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
exports.renderNextSteps = exports.mergeInto = exports.generate = exports.assemble = exports.outputModeOf = exports.nameVarOf = exports.tokensFromAnswers = void 0;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const features_1 = require("./features");
const fsx_1 = require("./fsx");
const hooks_1 = require("./hooks");
const merge_1 = require("./merge");
const overlay_1 = require("./overlay");
const packageJson_1 = require("./packageJson");
const manifest_1 = require("./manifest");
const render_1 = require("./render");
const tokens_1 = require("./tokens");
/**
 * Authoring-only files that must not end up in generated output when the payload
 * lives at the template root (i.e. there is no separate `template/` subfolder).
 */
const PROPRIETARY_ENTRIES = [manifest_1.MANIFEST_FILENAME, 'features'];
const tokensFromAnswers = (template, answers) => {
    const tokens = {};
    // Every detected/declared variable contributes a token value.
    for (const v of (0, tokens_1.resolveVariables)(template)) {
        tokens[v.token] = answers[v.name] ?? answers[v.token] ?? v.default;
    }
    return tokens;
};
exports.tokensFromAnswers = tokensFromAnswers;
const nameVarOf = (template) => template.manifest.nameVar || template.manifest.prompts[0]?.name || 'name';
exports.nameVarOf = nameVarOf;
const outputModeOf = (template) => template.manifest.output === 'merge' ? 'merge' : 'new';
exports.outputModeOf = outputModeOf;
/** Build the fully-resolved template tree into a fresh `stagingDir`. Returns the tokens used. */
const assemble = (template, stagingDir, answers, features = {}, includeManifest = false) => {
    const effects = (0, features_1.resolveEffects)(template, features);
    // If the configured payload subfolder doesn't exist (files were authored
    // directly in the template root), fall back to the root as the payload.
    const payloadRoot = fs.existsSync(template.sourceDir) ? template.sourceDir : template.dir;
    (0, fsx_1.copyDir)(payloadRoot, stagingDir);
    // When the payload is the template root (no `template/` subfolder), the
    // authoring files were copied too — drop them unless the caller opts in.
    const payloadIsRoot = path.resolve(payloadRoot) === path.resolve(template.dir);
    if (payloadIsRoot && !includeManifest) {
        for (const entry of PROPRIETARY_ENTRIES) {
            fs.rmSync(path.join(stagingDir, entry), { recursive: true, force: true });
        }
    }
    for (const effect of effects) {
        if (effect.overlay)
            (0, overlay_1.overlayDir)(path.join(template.dir, effect.overlay), stagingDir);
    }
    const injects = [];
    for (const effect of effects)
        for (const inj of effect.inject ?? [])
            injects.push(inj);
    (0, overlay_1.applyInjects)(stagingDir, injects);
    (0, packageJson_1.mergePackageJson)(stagingDir, template.manifest.packageJson);
    for (const effect of effects)
        (0, packageJson_1.mergePackageJson)(stagingDir, effect.packageJson);
    const tokens = (0, exports.tokensFromAnswers)(template, answers);
    for (const effect of effects)
        Object.assign(tokens, effect.tokens ?? {});
    const cfg = (0, tokens_1.tokenConfigOf)(template);
    (0, render_1.detokenizeTree)(stagingDir, tokens, template.manifest.detokenize?.exclude ?? [], cfg);
    (0, render_1.detokenizePaths)(stagingDir, tokens, cfg);
    return tokens;
};
exports.assemble = assemble;
/** "new" mode: create a brand-new project directory from the template. */
const generate = ({ template, targetDir, answers, features = {}, runPostHooks, includeManifest = false, }) => {
    const tokens = (0, exports.assemble)(template, targetDir, answers, features, includeManifest);
    const hooks = template.manifest.hooks?.postGenerate ?? [];
    if (runPostHooks && hooks.length)
        (0, hooks_1.runHooks)(hooks, targetDir);
    return { tokens };
};
exports.generate = generate;
/** "merge" mode: integrate the template into an existing project (non-destructive by default). */
const mergeInto = ({ template, projectDir, answers, features = {}, force = false, runPostHooks, includeManifest = false, }) => {
    const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vlcl-'));
    const staging = path.join(stagingRoot, 'tree');
    try {
        const tokens = (0, exports.assemble)(template, staging, answers, features, includeManifest);
        const report = (0, merge_1.mergeTree)(staging, projectDir, { force });
        const hooks = template.manifest.hooks?.postGenerate ?? [];
        if (runPostHooks && hooks.length)
            (0, hooks_1.runHooks)(hooks, projectDir);
        return { tokens, report };
    }
    finally {
        fs.rmSync(stagingRoot, { recursive: true, force: true });
    }
};
exports.mergeInto = mergeInto;
const renderNextSteps = (template, tokens) => (template.manifest.nextSteps ?? []).map((line) => (0, render_1.tokenReplace)(line, tokens, (0, tokens_1.tokenConfigOf)(template)));
exports.renderNextSteps = renderNextSteps;
