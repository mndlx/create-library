import { Terminal } from '@virtual-registry/mandolin';
import { LoadedTemplate, PromptDef } from './types';
import { normalizePackageName } from './validators';

type State = Record<string, string>;

const applyValidator = (prompt: PromptDef, value: string): string => {
    const fallback = prompt.default ?? '';
    if (prompt.validate === 'packageName') return normalizePackageName(value) || normalizePackageName(fallback);
    if (prompt.validate === 'nonEmpty') return value || fallback;
    return value || fallback;
};

/** Drive the manifest's prompts through a mandolin wizard and return the answers. */
export const runTemplatePrompts = async (template: LoadedTemplate): Promise<State> => {
    const wizard = new Terminal<State>();

    const initial: State = {};
    for (const prompt of template.manifest.prompts) initial[prompt.name] = prompt.default ?? '';
    wizard.initState(initial);

    for (const prompt of template.manifest.prompts) {
        const label = prompt.default ? `${prompt.message} (default: ${prompt.default})` : prompt.message;
        wizard.newLine(label);

        if (prompt.type === 'select' && prompt.options && prompt.options.length) {
            const options = prompt.options;
            wizard.newSelectLine(options, (sel, state) => ({ ...state, [prompt.name]: String(sel) }));
        } else {
            wizard.newInputLine((input, state) => ({ ...state, [prompt.name]: applyValidator(prompt, input) }));
        }
    }

    await wizard.draw({ clean: true });
    return wizard.state ?? initial;
};
