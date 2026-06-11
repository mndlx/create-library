"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFeatureSelection = exports.runTemplatePrompts = exports.CLI_COLORS = void 0;
const mandolin_1 = require("@virtual-registry/mandolin");
const tokens_1 = require("./tokens");
const validators_1 = require("./validators");
const { text, divider } = mandolin_1.Components;
/** Palette shared by the CLI prompts (256-color codes). */
exports.CLI_COLORS = {
    accent: 51, // cyan
    ok: 82, // green
    warn: 214, // orange
    muted: 245, // grey
    token: 213, // pink
};
const applyValidator = (v, value) => {
    const fallback = v.default ?? '';
    if (v.validate === 'packageName')
        return (0, validators_1.normalizePackageName)(value) || (0, validators_1.normalizePackageName)(fallback);
    if (v.validate === 'nonEmpty')
        return value || fallback;
    return value || fallback;
};
/** Drive the template's variables through a mandolin wizard and return the answers. */
const runTemplatePrompts = async (template) => {
    const variables = (0, tokens_1.resolveVariables)(template);
    const asked = variables.filter((x) => x.exposeCli);
    const cfg = (0, tokens_1.tokenConfigOf)(template);
    const initial = {};
    for (const v of variables)
        initial[v.name] = v.default;
    if (!asked.length)
        return initial;
    const wizard = new mandolin_1.Terminal();
    wizard.initState(initial);
    wizard.newLine(divider());
    wizard.newLine(text(' VARIABLES ', { bgcolor: exports.CLI_COLORS.accent, color: 16, effect: ['bold'] }) +
        text(`  ${asked.length} value(s) — each replaces its token in the generated files`, { color: exports.CLI_COLORS.muted }));
    for (const v of asked) {
        const tokenBadge = text(`${cfg.start}${v.token}${cfg.end}`, { color: exports.CLI_COLORS.token, effect: ['bold'] });
        const hint = v.default
            ? text(`  (Enter = ${v.default})`, { color: exports.CLI_COLORS.muted })
            : text('  (required)', { color: exports.CLI_COLORS.warn });
        wizard.newLine('');
        wizard.newLine(`${tokenBadge}  ${text(v.message, { effect: ['bold'] })}${hint}`);
        if (v.type === 'select' && v.options && v.options.length) {
            const options = v.options;
            wizard.newSelectLine(options, (sel, state) => ({ ...state, [v.name]: String(sel) }));
        }
        else {
            wizard.newInputLine((input, state) => ({ ...state, [v.name]: applyValidator(v, input) }));
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
    wizard.newLine(divider());
    wizard.newLine(text(' FEATURES ', { bgcolor: exports.CLI_COLORS.ok, color: 16, effect: ['bold'] }) +
        text('  optional parts of the output', { color: exports.CLI_COLORS.muted }));
    for (const f of features) {
        wizard.newLine('');
        wizard.newLine(text('◆ ', { color: exports.CLI_COLORS.ok }) + text(f.label, { effect: ['bold'] }));
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
