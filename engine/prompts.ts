import { cancel, confirm, isCancel, log, select, text } from '@clack/prompts';
import pc from 'picocolors';
import { ResolvedVariable, resolveVariables, tokenConfigOf } from './tokens';
import { LoadedTemplate } from './types';
import { normalizePackageName } from './validators';

type State = Record<string, string>;

const bail = (): never => {
    cancel('Cancelled.');
    process.exit(1);
};

const applyValidator = (v: ResolvedVariable, value: string): string => {
    const fallback = v.default ?? '';
    if (v.validate === 'packageName') return normalizePackageName(value) || normalizePackageName(fallback);
    if (v.validate === 'nonEmpty') return value || fallback;
    return value || fallback;
};

/** Ask for every CLI-exposed variable and return the full answer map. */
export const runTemplatePrompts = async (template: LoadedTemplate): Promise<State> => {
    const variables = resolveVariables(template);
    const asked = variables.filter((x) => x.exposeCli);
    const cfg = tokenConfigOf(template);

    const answers: State = {};
    for (const v of variables) answers[v.name] = v.default;
    if (!asked.length) return answers;

    log.step(pc.bold('Variables') + pc.dim(` — ${asked.length} value(s), each replaces its token in the generated files`));

    for (const v of asked) {
        const token = pc.magenta(`${cfg.start}${v.token}${cfg.end}`);
        const message = `${token}  ${v.message}`;

        if (v.type === 'select' && v.options && v.options.length) {
            const value = await select({
                message,
                options: v.options.map((o) => ({ value: o, label: o })),
                initialValue: v.default && v.options.includes(v.default) ? v.default : v.options[0],
            });
            if (isCancel(value)) bail();
            answers[v.name] = String(value);
        } else {
            const value = await text({
                message,
                placeholder: v.default ? `Enter = ${v.default}` : v.required ? 'required' : 'optional',
                defaultValue: v.default,
                validate: v.required
                    ? (val) => ((String(val ?? '') || v.default).trim() ? undefined : 'A value is required')
                    : undefined,
            });
            if (isCancel(value)) bail();
            answers[v.name] = applyValidator(v, String(value ?? ''));
        }
    }
    return answers;
};

/** Ask for every feature and return a selection map. */
export const runFeatureSelection = async (
    template: LoadedTemplate
): Promise<Record<string, boolean | string>> => {
    const features = template.manifest.features ?? [];
    if (!features.length) return {};

    log.step(pc.bold('Features') + pc.dim(' — optional parts of the output'));

    const selection: Record<string, boolean | string> = {};
    for (const f of features) {
        if (f.type === 'select' && f.options && f.options.length) {
            const value = await select({
                message: f.label,
                options: f.options.map((o) => ({ value: o, label: o })),
                initialValue: typeof f.default === 'string' && f.options.includes(f.default) ? f.default : f.options[0],
            });
            if (isCancel(value)) bail();
            selection[f.id] = String(value);
        } else {
            const value = await confirm({ message: f.label, initialValue: !!f.default });
            if (isCancel(value)) bail();
            selection[f.id] = !!value;
        }
    }
    return selection;
};
