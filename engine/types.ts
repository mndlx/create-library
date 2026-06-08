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

export interface DetokenizeConfig {
    /** Extra path fragments to skip while replacing tokens. */
    exclude?: string[];
}

export interface PackageJsonPatch {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    [key: string]: unknown;
}

export interface TemplateHooks {
    /** Shell commands executed in the generated project after generation. */
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
    detokenize?: DetokenizeConfig;
    packageJson?: PackageJsonPatch;
    hooks?: TemplateHooks;
    nextSteps?: string[];
}

export interface LoadedTemplate {
    manifest: TemplateManifest;
    /** Directory containing template.json. */
    dir: string;
    /** Resolved payload directory. */
    sourceDir: string;
    /** Root the template was discovered in. */
    origin: string;
}
