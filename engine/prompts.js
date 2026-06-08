"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFeatureSelection = exports.runTemplatePrompts = void 0;
const mandolin_1 = require("@virtual-registry/mandolin");
const validators_1 = require("./validators");
const applyValidator = (prompt, value) => {
    const fallback = prompt.default ?? '';
    if (prompt.validate === 'packageName')
        return (0, validators_1.normalizePackageName)(value) || (0, validators_1.normalizePackageName)(fallback);
    if (prompt.validate === 'nonEmpty')
        return value || fallback;
    return value || fallback;
};
/** Drive the manifest's prompts through a mandolin wizard and return the answers. */
const runTemplatePrompts = async (template) => {
    const wizard = new mandolin_1.Terminal();
    const initial = {};
    for (const prompt of template.manifest.prompts)
        initial[prompt.name] = prompt.default ?? '';
    wizard.initState(initial);
    for (const prompt of template.manifest.prompts) {
        const label = prompt.default ? `${prompt.message} (default: ${prompt.default})` : prompt.message;
        wizard.newLine(label);
        if (prompt.type === 'select' && prompt.options && prompt.options.length) {
            const options = prompt.options;
            wizard.newSelectLine(options, (sel, state) => ({ ...state, [prompt.name]: String(sel) }));
        }
        else {
            wizard.newInputLine((input, state) => ({ ...state, [prompt.name]: applyValidator(prompt, input) }));
        }
    }
    await wizard.draw({ clean: true });
    return wizard.state ?? initial;
};
exports.runTemplatePrompts = runTemplatePrompts;
const YES = 'yes';
const NO = 'no';
/** Drive the manifest's features through a wizard and return a selection map. */
const runFeatureSelection = async (template) => {
    const features = template.manifest.features ?? [];
    if (!features.length)
        return {};
    const wizard = new mandolin_1.Terminal();
    const initial = {};
    for (const f of features) {
        initial[f.id] = f.type === 'boolean'
            ? (f.default ? YES : NO)
            : (f.default ?? f.options?.[0] ?? '');
    }
    wizard.initState(initial);
    for (const f of features) {
        wizard.newLine(f.label);
        if (f.type === 'select' && f.options && f.options.length) {
            const options = f.options;
            wizard.newSelectLine(options, (sel, state) => ({ ...state, [f.id]: String(sel) }));
        }
        else {
            wizard.newSelectLine([YES, NO], (sel, state) => ({ ...state, [f.id]: String(sel) }));
        }
    }
    await wizard.draw({ clean: true });
    const state = wizard.state ?? initial;
    const selection = {};
    for (const f of features) {
        selection[f.id] = f.type === 'boolean' ? state[f.id] === YES : state[f.id];
    }
    return selection;
};
exports.runFeatureSelection = runFeatureSelection;
