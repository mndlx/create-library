import { Components, Terminal } from '@virtual-registry/mandolin';
import { ResolvedVariable, resolveVariables, tokenConfigOf } from './tokens';
import { LoadedTemplate } from './types';
import { normalizePackageName } from './validators';

const { text, divider } = Components;

type State = Record<string, string>;

/** Palette shared by the CLI prompts (256-color codes). */
export const CLI_COLORS = {
    accent: 51,   // cyan
    ok: 82,       // green
    warn: 214,    // orange
    muted: 245,   // grey
    token: 213,   // pink
} as const;

const applyValidator = (v: ResolvedVariable, value: string): string => {
    const fallback = v.default ?? '';
    if (v.validate === 'packageName') return normalizePackageName(value) || normalizePackageName(fallback);
    if (v.validate === 'nonEmpty') return value || fallback;
    return value || fallback;
};

/** Drive the template's variables through a mandolin wizard and return the answers. */
export const runTemplatePrompts = async (template: LoadedTemplate): Promise<State> => {
    const variables = resolveVariables(template);
    const asked = variables.filter((x) => x.exposeCli);
    const cfg = tokenConfigOf(template);

    const initial: State = {};
    for (const v of variables) initial[v.name] = v.default;
    if (!asked.length) return initial;

    const wizard = new Terminal<State>();
    wizard.initState(initial);

    wizard.newLine(divider());
    wizard.newLine(
        text(' VARIABLES ', { bgcolor: CLI_COLORS.accent, color: 16, effect: ['bold'] }) +
        text(`  ${asked.length} value(s) — each replaces its token in the generated files`, { color: CLI_COLORS.muted })
    );

    for (const v of asked) {
        const tokenBadge = text(`${cfg.start}${v.token}${cfg.end}`, { color: CLI_COLORS.token, effect: ['bold'] });
        const hint = v.default
            ? text(`  (Enter = ${v.default})`, { color: CLI_COLORS.muted })
            : text('  (required)', { color: CLI_COLORS.warn });
        wizard.newLine('');
        wizard.newLine(`${tokenBadge}  ${text(v.message, { effect: ['bold'] })}${hint}`);

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

    wizard.newLine(divider());
    wizard.newLine(
        text(' FEATURES ', { bgcolor: CLI_COLORS.ok, color: 16, effect: ['bold'] }) +
        text('  optional parts of the output', { color: CLI_COLORS.muted })
    );

    for (const f of features) {
        wizard.newLine('');
        wizard.newLine(text('◆ ', { color: CLI_COLORS.ok }) + text(f.label, { effect: ['bold'] }));
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
