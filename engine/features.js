"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withDefaults = exports.resolveEffects = exports.defaultSelection = exports.featureDefault = void 0;
const tokens_1 = require("./tokens");
const ownEffects = (f) => ({
    overlay: f.overlay,
    packageJson: f.packageJson,
    inject: f.inject,
    tokens: f.tokens,
});
const featureDefault = (f) => {
    if (f.type === 'boolean')
        return f.default ?? false;
    return f.default ?? f.options?.[0] ?? '';
};
exports.featureDefault = featureDefault;
/** Default selection map for a template's features. */
const defaultSelection = (template) => {
    const sel = {};
    for (const f of template.manifest.features ?? [])
        sel[f.id] = (0, exports.featureDefault)(f);
    return sel;
};
exports.defaultSelection = defaultSelection;
/** The effects active for a given selection, in manifest order. */
const resolveEffects = (template, selection) => {
    const effects = [];
    for (const f of template.manifest.features ?? []) {
        const value = selection[f.id] ?? (0, exports.featureDefault)(f);
        if (f.type === 'boolean') {
            if (value)
                effects.push(ownEffects(f));
        }
        else {
            const variant = f.variants?.[String(value)];
            if (variant)
                effects.push(variant);
        }
    }
    return effects;
};
exports.resolveEffects = resolveEffects;
/** Merge a partial config with defaults for a template. */
const withDefaults = (template, config) => {
    const features = { ...(0, exports.defaultSelection)(template), ...(config.features ?? {}) };
    const answers = { ...(config.answers ?? {}) };
    for (const v of (0, tokens_1.resolveVariables)(template))
        if (answers[v.name] === undefined)
            answers[v.name] = v.default;
    return { answers, features };
};
exports.withDefaults = withDefaults;
