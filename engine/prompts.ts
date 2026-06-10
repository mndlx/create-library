import { Terminal } from '@virtual-registry/mandolin';
import { ResolvedVariable, resolveVariables } from './tokens';
import { LoadedTemplate } from './types';
import { normalizePackageName } from './validators';

type State = Record<string, string>;

const applyValidator = (v: ResolvedVariable, value: string): string => {
    const fallback = v.default ?? '';
    if (v.validate === 'packageName') return normalizePackageName(value) || normalizePackageName(fallback);
    if (v.validate === 'nonEmpty') return value || fallback;
    return value || fallback;
};

/** Drive the template's variables through a mandolin wizard and return the answers. */
export const runTemplatePrompts = async (template: LoadedTemplate): Promise<State> => {
    const wizard = new Terminal<State>();
    const variables = resolveVariables(template);

    const initial: State = {};
    for (const v of variables) initial[v.name] = v.default;
    wizard.initState(initial);

    // Only tokens exposed to the CLI are asked; the rest use their defaults.
    for (const v of variables.filter((x) => x.exposeCli)) {
        const label = v.default ? `${v.message} (default: ${v.default})` : v.message;
        wizard.newLine(label);

        if (v.type === 'select' && v.options && v.options.length) {
            const options = v.options;
            wizard.newSelectLine(options, (sel, state) => ({ ...state, [v.name]: String(sel) }));
        } else {
            wizard.newInputLine((input, state) => ({ ...state, [v.name]: applyValidator(v, input) }));
        }
    }

    await wizard.draw({ clean: true });
    return wizard.state ?? initial;
};

const YES = 'yes';
const NO = 'no';

/** Drive the manifest's features through a wizard and return a selection map. */
export const runFeatureSelection = async (
    template: LoadedTemplate
): Promise<Record<string, boolean | string>> => {
    const features = template.manifest.features ?? [];
    if (!features.length) return {};

    const wizard = new Terminal<Record<string, string>>();
    const initial: Record<string, string> = {};
    for (const f of features) {
        initial[f.id] = f.type === 'boolean'
            ? (f.default ? YES : NO)
            : ((f.default as string) ?? f.options?.[0] ?? '');
    }
    wizard.initState(initial);

    for (const f of features) {
        wizard.newLine(f.label);
        if (f.type === 'select' && f.options && f.options.length) {
            const options = f.options;
            wizard.newSelectLine(options, (sel, state) => ({ ...state, [f.id]: String(sel) }));
        } else {
            wizard.newSelectLine([YES, NO], (sel, state) => ({ ...state, [f.id]: String(sel) }));
        }
    }

    await wizard.draw({ clean: true });
    const state = wizard.state ?? initial;

    const selection: Record<string, boolean | string> = {};
    for (const f of features) {
        selection[f.id] = f.type === 'boolean' ? state[f.id] === YES : state[f.id];
    }
    return selection;
};
