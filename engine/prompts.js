"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFeatureSelection = exports.runTemplatePrompts = void 0;
const prompts_1 = require("@clack/prompts");
const picocolors_1 = __importDefault(require("picocolors"));
const tokens_1 = require("./tokens");
const validators_1 = require("./validators");
const bail = () => {
    (0, prompts_1.cancel)('Cancelled.');
    process.exit(1);
};
const applyValidator = (v, value) => {
    const fallback = v.default ?? '';
    if (v.validate === 'packageName')
        return (0, validators_1.normalizePackageName)(value) || (0, validators_1.normalizePackageName)(fallback);
    if (v.validate === 'nonEmpty')
        return value || fallback;
    return value || fallback;
};
/** Ask for every CLI-exposed variable and return the full answer map. */
const runTemplatePrompts = async (template) => {
    const variables = (0, tokens_1.resolveVariables)(template);
    const asked = variables.filter((x) => x.exposeCli);
    const cfg = (0, tokens_1.tokenConfigOf)(template);
    const answers = {};
    for (const v of variables)
        answers[v.name] = v.default;
    if (!asked.length)
        return answers;
    prompts_1.log.step(picocolors_1.default.bold('Variables') + picocolors_1.default.dim(` — ${asked.length} value(s), each replaces its token in the generated files`));
    for (const v of asked) {
        const token = picocolors_1.default.magenta(`${cfg.start}${v.token}${cfg.end}`);
        const message = `${token}  ${v.message}`;
        if (v.type === 'select' && v.options && v.options.length) {
            const value = await (0, prompts_1.select)({
                message,
                options: v.options.map((o) => ({ value: o, label: o })),
                initialValue: v.default && v.options.includes(v.default) ? v.default : v.options[0],
            });
            if ((0, prompts_1.isCancel)(value))
                bail();
            answers[v.name] = String(value);
        }
        else {
            const value = await (0, prompts_1.text)({
                message,
                placeholder: v.default ? `Enter = ${v.default}` : 'required',
                defaultValue: v.default,
            });
            if ((0, prompts_1.isCancel)(value))
                bail();
            answers[v.name] = applyValidator(v, String(value ?? ''));
        }
    }
    return answers;
};
exports.runTemplatePrompts = runTemplatePrompts;
/** Ask for every feature and return a selection map. */
const runFeatureSelection = async (template) => {
    const features = template.manifest.features ?? [];
    if (!features.length)
        return {};
    prompts_1.log.step(picocolors_1.default.bold('Features') + picocolors_1.default.dim(' — optional parts of the output'));
    const selection = {};
    for (const f of features) {
        if (f.type === 'select' && f.options && f.options.length) {
            const value = await (0, prompts_1.select)({
                message: f.label,
                options: f.options.map((o) => ({ value: o, label: o })),
                initialValue: typeof f.default === 'string' && f.options.includes(f.default) ? f.default : f.options[0],
            });
            if ((0, prompts_1.isCancel)(value))
                bail();
            selection[f.id] = String(value);
        }
        else {
            const value = await (0, prompts_1.confirm)({ message: f.label, initialValue: !!f.default });
            if ((0, prompts_1.isCancel)(value))
                bail();
            selection[f.id] = !!value;
        }
    }
    return selection;
};
exports.runFeatureSelection = runFeatureSelection;
