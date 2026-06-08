export type PromptType = 'text' | 'select';

export interface PromptDef {
    /** Variable name; also the default token base. */
    name: string;
    /** Question shown to the user. */
    message: string;
    /** Input kind. */
    type: PromptType;
    /** Default value (used when input is empty). */
    default?: string;
    /** Token replaced in the payload: `__<token>__` -> answer. Defaults to `name`. */
    token?: string;
    /** Named validator applied to the answer. */
    validate?: 'packageName' | 'nonEmpty' | 'none';
    /** Options for `type: "select"`. */
    options?: string[];
}

export interface InjectDef {
    /** Payload-relative file containing the marker `/* inject:<marker> *​/`. */
    file: string;
    /** Marker name. */
    marker: string;
    /** Snippet inserted at the marker when the effect is active. */
    content: string;
}

export interface PackageJsonPatch {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    [key: string]: unknown;
}

/** What an active feature (or select variant) contributes to the output. */
export interface FeatureEffects {
    /** Directory (relative to the template) copied over the output. */
    overlay?: string;
    /** package.json fields merged in. */
    packageJson?: PackageJsonPatch;
    /** Snippets injected at markers. */
    inject?: InjectDef[];
    /** Extra `__TOKEN__` values. */
    tokens?: Record<string, string>;
}

export type FeatureType = 'boolean' | 'select';

export interface FeatureDef extends FeatureEffects {
    id: string;
    label: string;
    type: FeatureType;
    /** Default value: boolean for "boolean", an option string for "select". */
    default?: boolean | string;
    /** Options for "select". */
    options?: string[];
    /** Per-option effects for "select". */
    variants?: Record<string, FeatureEffects>;
}

export interface DetokenizeConfig {
    exclude?: string[];
}

export interface TemplateHooks {
    postGenerate?: string[];
}

export interface TemplateManifest {
    name: string;
    title?: string;
    description?: string;
    version?: string;
    /** Payload directory relative to the manifest, default "template". */
    source?: string;
    /** Prompt whose answer names the output folder; defaults to the first prompt. */
    nameVar?: string;
    prompts: PromptDef[];
    /** Configurable, conditional parts of the output. */
    features?: FeatureDef[];
    detokenize?: DetokenizeConfig;
    packageJson?: PackageJsonPatch;
    hooks?: TemplateHooks;
    nextSteps?: string[];
}

export interface LoadedTemplate {
    manifest: TemplateManifest;
    dir: string;
    sourceDir: string;
    origin: string;
}

/** A saved/loaded generation configuration (a "preset"). */
export interface GenerationConfig {
    template?: string;
    answers?: Record<string, string>;
    features?: Record<string, boolean | string>;
}
