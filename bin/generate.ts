#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { intro, isCancel, cancel, log, note, outro, select, spinner } from '@clack/prompts';
import pc from 'picocolors';
import {
    GenerationConfig,
    LoadedTemplate,
    defaultSelection,
    findTemplate,
    generate,
    listTemplates,
    loadPreset,
    mergeInto,
    nameVarOf,
    outputModeOf,
    renderNextSteps,
    resolveVariables,
    runFeatureSelection,
    runTemplatePrompts,
    savePreset,
    tokenConfigOf,
    tokensFromAnswers,
    withDefaults,
} from '../engine';

interface Args {
    template?: string;
    preset?: string;
    savePreset?: string;
    into?: string;
    mode?: 'new' | 'merge';
    force: boolean;
    yes: boolean;
}

const parseArgs = (argv: string[]): Args => {
    const args: Args = { yes: false, force: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--template' || a === '-t') args.template = argv[++i];
        else if (a === '--preset') args.preset = argv[++i];
        else if (a === '--save-preset') args.savePreset = argv[++i];
        else if (a === '--into') args.into = argv[++i];
        else if (a === '--merge') args.mode = 'merge';
        else if (a === '--new') args.mode = 'new';
        else if (a === '--force') args.force = true;
        else if (a === '--yes' || a === '-y') args.yes = true;
    }
    return args;
};

const modeBadge = (mode: 'new' | 'merge'): string =>
    mode === 'merge' ? pc.bgYellow(pc.black(' MERGE ')) : pc.bgGreen(pc.black(' NEW '));

async function pickTemplate(templates: LoadedTemplate[], wanted?: string): Promise<LoadedTemplate> {
    if (wanted) {
        const found = findTemplate(wanted);
        if (!found) {
            log.error(`Unknown template: ${wanted}`);
            log.info(`Available: ${templates.map((t) => t.manifest.name).join(', ')}`);
            process.exit(1);
        }
        return found;
    }
    if (templates.length === 1) return templates[0];

    const value = await select({
        message: 'Pick a template',
        options: templates.map((t) => ({
            value: t.manifest.name,
            label: `${t.manifest.name}@${t.manifest.version ?? '1.0.0'}`,
            hint: `${outputModeOf(t)}${t.manifest.title && t.manifest.title !== t.manifest.name ? ' · ' + t.manifest.title : ''}`,
        })),
    });
    if (isCancel(value)) {
        cancel('Cancelled.');
        process.exit(1);
    }
    return findTemplate(String(value))!;
}

/** Card summarizing what was selected. */
const printTemplateCard = (t: LoadedTemplate) => {
    const m = t.manifest;
    const cfg = tokenConfigOf(t);
    const vars = resolveVariables(t);
    const lines = [
        `${pc.bold(m.title ?? m.name)} ${pc.dim(`v${m.version ?? '1.0.0'}`)}  ${modeBadge(outputModeOf(t))}`,
        ...(m.description ? [pc.dim(m.description)] : []),
        pc.dim(`tokens ${cfg.start}…${cfg.end} · ${vars.length} variable(s) · ${(m.features ?? []).length} feature(s)`),
    ];
    note(lines.join('\n'), 'Template');
};

const featureSummary = (features: Record<string, boolean | string>): string =>
    Object.entries(features)
        .filter(([, v]) => v !== false && v !== '')
        .map(([k, v]) => (v === true ? k : `${k}=${v}`))
        .join(', ');

/** Warn about tokens that would be replaced with an empty string. */
const warnEmptyTokens = (template: LoadedTemplate, answers: Record<string, string>) => {
    const tokens = tokensFromAnswers(template, answers);
    const empty = Object.entries(tokens).filter(([, v]) => v === '').map(([k]) => k);
    if (!empty.length) return;
    const cfg = tokenConfigOf(template);
    log.warn(
        `empty value for: ${empty.map((tk) => pc.magenta(`${cfg.start}${tk}${cfg.end}`)).join(', ')}` +
        pc.dim('  (they will be replaced with nothing)')
    );
};

async function main() {
    const args = parseArgs(process.argv.slice(2));
    intro(pc.bgCyan(pc.black(' create-library ')) + pc.dim('  scaffold projects from tokenized templates'));

    const templates = listTemplates();
    if (!templates.length) {
        log.error('No templates found. Create one with the back-office: npm run bo:web');
        process.exit(1);
    }

    let template: LoadedTemplate;
    let config: GenerationConfig;

    if (args.preset) {
        const preset = loadPreset(args.preset);
        const found = preset.template ? findTemplate(preset.template) : undefined;
        if (!found) {
            log.error(`Preset references unknown template: ${preset.template}`);
            process.exit(1);
        }
        template = found;
        config = withDefaults(template, preset);
        printTemplateCard(template);
    } else if (args.yes) {
        template = await pickTemplate(templates, args.template);
        config = withDefaults(template, {});
        printTemplateCard(template);
    } else {
        template = await pickTemplate(templates, args.template);
        printTemplateCard(template);
        const answers = await runTemplatePrompts(template);
        const features = await runFeatureSelection(template);
        config = { answers, features };
    }

    const answers = config.answers ?? {};
    const features = config.features ?? defaultSelection(template);
    const mode = args.mode ?? outputModeOf(template);

    if (args.savePreset) {
        savePreset(args.savePreset, { template: template.manifest.name, answers, features });
        log.success(`Saved preset to ${args.savePreset}`);
    }

    // ----- plan summary ---------------------------------------------------
    const into = path.resolve(args.into ?? process.cwd());
    const projectName = answers[nameVarOf(template)] || template.manifest.name;
    const targetDir = mode === 'merge' ? into : path.join(into, projectName);

    log.step(
        modeBadge(mode) +
        (mode === 'merge'
            ? pc.dim('  merging into existing project → ') + pc.bold(targetDir)
            : pc.dim('  creating new folder → ') + pc.bold(targetDir))
    );
    if (featureSummary(features)) log.info(pc.dim(`features: ${featureSummary(features)}`));
    warnEmptyTokens(template, answers);
    if (mode === 'merge' && !args.force) log.info(pc.dim('existing files are kept (use --force to overwrite)'));

    const s = process.stdout.isTTY ? spinner() : null;
    s?.start('Working');

    try {
        if (mode === 'merge') {
            if (!fs.existsSync(into)) throw new Error(`Target directory does not exist: ${into}`);
            const { tokens, report } = mergeInto({ template, projectDir: into, answers, features, force: args.force });
            s?.stop('Merged');

            log.success(`Merged "${template.manifest.name}" into ${into}`);
            log.info(pc.dim(`${report.created.length} file(s) added${report.packageJsonMerged ? ', package.json merged' : ''}`));
            for (const f of report.created.slice(0, 12)) log.info(pc.green(`  + ${f}`));
            if (report.created.length > 12) log.info(pc.dim(`  … +${report.created.length - 12} more`));
            if (report.skipped.length) {
                log.warn(`${report.skipped.length} existing file(s) kept (use --force to overwrite):`);
                for (const f of report.skipped) log.warn(pc.yellow(`  = ${f}`));
            }
            finish(template, tokens);
        } else {
            const { tokens } = generate({ template, targetDir, answers, features });
            s?.stop(`Created ${projectName}`);
            log.success(`Created ${targetDir}`);
            finish(template, tokens);
        }
    } catch (err) {
        s?.stop('Failed');
        throw err;
    }
}

const finish = (template: LoadedTemplate, tokens: Record<string, string>) => {
    const steps = renderNextSteps(template, tokens);
    if (steps.length) note(steps.map((st) => pc.cyan(st)).join('\n'), 'Next steps');
    outro(pc.green('Done.'));
};

main().catch((err) => {
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
