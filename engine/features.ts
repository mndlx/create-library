import { resolveVariables } from './tokens';
import { FeatureDef, FeatureEffects, GenerationConfig, LoadedTemplate } from './types';

const ownEffects = (f: FeatureDef): FeatureEffects => ({
    overlay: f.overlay,
    packageJson: f.packageJson,
    inject: f.inject,
    tokens: f.tokens,
});

export const featureDefault = (f: FeatureDef): boolean | string => {
    if (f.type === 'boolean') return f.default ?? false;
    return (f.default as string) ?? f.options?.[0] ?? '';
};

/** Default selection map for a template's features. */
export const defaultSelection = (template: LoadedTemplate): Record<string, boolean | string> => {
    const sel: Record<string, boolean | string> = {};
    for (const f of template.manifest.features ?? []) sel[f.id] = featureDefault(f);
    return sel;
};

/** The effects active for a given selection, in manifest order. */
export const resolveEffects = (
    template: LoadedTemplate,
    selection: Record<string, boolean | string>
): FeatureEffects[] => {
    const effects: FeatureEffects[] = [];
    for (const f of template.manifest.features ?? []) {
        const value = selection[f.id] ?? featureDefault(f);
        if (f.type === 'boolean') {
            if (value) effects.push(ownEffects(f));
        } else {
            const variant = f.variants?.[String(value)];
            if (variant) effects.push(variant);
        }
    }
    return effects;
};

/** Merge a partial config with defaults for a template. */
export const withDefaults = (template: LoadedTemplate, config: GenerationConfig): Required<Pick<GenerationConfig, 'answers' | 'features'>> => {
    const features = { ...defaultSelection(template), ...(config.features ?? {}) };
    const answers = { ...(config.answers ?? {}) };
    for (const v of resolveVariables(template)) if (answers[v.name] === undefined) answers[v.name] = v.default;
    return { answers, features };
};
