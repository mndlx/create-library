#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prompts_1 = require("@clack/prompts");
const picocolors_1 = __importDefault(require("picocolors"));
const engine_1 = require("../engine");
const parseArgs = (argv) => {
    const args = { yes: false, force: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--template' || a === '-t')
            args.template = argv[++i];
        else if (a === '--preset')
            args.preset = argv[++i];
        else if (a === '--save-preset')
            args.savePreset = argv[++i];
        else if (a === '--into')
            args.into = argv[++i];
        else if (a === '--merge')
            args.mode = 'merge';
        else if (a === '--new')
            args.mode = 'new';
        else if (a === '--force')
            args.force = true;
        else if (a === '--yes' || a === '-y')
            args.yes = true;
    }
    return args;
};
const modeBadge = (mode) => mode === 'merge' ? picocolors_1.default.bgYellow(picocolors_1.default.black(' MERGE ')) : picocolors_1.default.bgGreen(picocolors_1.default.black(' NEW '));
async function pickTemplate(templates, wanted) {
    if (wanted) {
        const found = (0, engine_1.findTemplate)(wanted);
        if (!found) {
            prompts_1.log.error(`Unknown template: ${wanted}`);
            prompts_1.log.info(`Available: ${templates.map((t) => t.manifest.name).join(', ')}`);
            process.exit(1);
        }
        return found;
    }
    if (templates.length === 1)
        return templates[0];
    const value = await (0, prompts_1.select)({
        message: 'Pick a template',
        options: templates.map((t) => ({
            value: t.manifest.name,
            label: `${t.manifest.name}@${t.manifest.version ?? '1.0.0'}`,
            hint: `${(0, engine_1.outputModeOf)(t)}${t.manifest.title && t.manifest.title !== t.manifest.name ? ' · ' + t.manifest.title : ''}`,
        })),
    });
    if ((0, prompts_1.isCancel)(value)) {
        (0, prompts_1.cancel)('Cancelled.');
        process.exit(1);
    }
    return (0, engine_1.findTemplate)(String(value));
}
/** Card summarizing what was selected. */
const printTemplateCard = (t) => {
    const m = t.manifest;
    const cfg = (0, engine_1.tokenConfigOf)(t);
    const vars = (0, engine_1.resolveVariables)(t);
    const lines = [
        `${picocolors_1.default.bold(m.title ?? m.name)} ${picocolors_1.default.dim(`v${m.version ?? '1.0.0'}`)}  ${modeBadge((0, engine_1.outputModeOf)(t))}`,
        ...(m.description ? [picocolors_1.default.dim(m.description)] : []),
        picocolors_1.default.dim(`tokens ${cfg.start}…${cfg.end} · ${vars.length} variable(s) · ${(m.features ?? []).length} feature(s)`),
    ];
    (0, prompts_1.note)(lines.join('\n'), 'Template');
};
const featureSummary = (features) => Object.entries(features)
    .filter(([, v]) => v !== false && v !== '')
    .map(([k, v]) => (v === true ? k : `${k}=${v}`))
    .join(', ');
/** Warn about tokens that would be replaced with an empty string. */
const warnEmptyTokens = (template, answers) => {
    const tokens = (0, engine_1.tokensFromAnswers)(template, answers);
    const empty = Object.entries(tokens).filter(([, v]) => v === '').map(([k]) => k);
    if (!empty.length)
        return;
    const cfg = (0, engine_1.tokenConfigOf)(template);
    prompts_1.log.warn(`empty value for: ${empty.map((tk) => picocolors_1.default.magenta(`${cfg.start}${tk}${cfg.end}`)).join(', ')}` +
        picocolors_1.default.dim('  (they will be replaced with nothing)'));
};
async function main() {
    const args = parseArgs(process.argv.slice(2));
    (0, prompts_1.intro)(picocolors_1.default.bgCyan(picocolors_1.default.black(' create-library ')) + picocolors_1.default.dim('  scaffold projects from tokenized templates'));
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length) {
        prompts_1.log.error('No templates found. Create one with the back-office: npm run bo:web');
        process.exit(1);
    }
    let template;
    let config;
    if (args.preset) {
        const preset = (0, engine_1.loadPreset)(args.preset);
        const found = preset.template ? (0, engine_1.findTemplate)(preset.template) : undefined;
        if (!found) {
            prompts_1.log.error(`Preset references unknown template: ${preset.template}`);
            process.exit(1);
        }
        template = found;
        config = (0, engine_1.withDefaults)(template, preset);
        printTemplateCard(template);
    }
    else if (args.yes) {
        template = await pickTemplate(templates, args.template);
        config = (0, engine_1.withDefaults)(template, {});
        printTemplateCard(template);
    }
    else {
        template = await pickTemplate(templates, args.template);
        printTemplateCard(template);
        const answers = await (0, engine_1.runTemplatePrompts)(template);
        const features = await (0, engine_1.runFeatureSelection)(template);
        config = { answers, features };
    }
    const answers = config.answers ?? {};
    const features = config.features ?? (0, engine_1.defaultSelection)(template);
    const mode = args.mode ?? (0, engine_1.outputModeOf)(template);
    if (args.savePreset) {
        (0, engine_1.savePreset)(args.savePreset, { template: template.manifest.name, answers, features });
        prompts_1.log.success(`Saved preset to ${args.savePreset}`);
    }
    // ----- plan summary ---------------------------------------------------
    const into = path.resolve(args.into ?? process.cwd());
    const projectName = answers[(0, engine_1.nameVarOf)(template)] || template.manifest.name;
    const targetDir = mode === 'merge' ? into : path.join(into, projectName);
    prompts_1.log.step(modeBadge(mode) +
        (mode === 'merge'
            ? picocolors_1.default.dim('  merging into existing project → ') + picocolors_1.default.bold(targetDir)
            : picocolors_1.default.dim('  creating new folder → ') + picocolors_1.default.bold(targetDir)));
    if (featureSummary(features))
        prompts_1.log.info(picocolors_1.default.dim(`features: ${featureSummary(features)}`));
    warnEmptyTokens(template, answers);
    if (mode === 'merge' && !args.force)
        prompts_1.log.info(picocolors_1.default.dim('existing files are kept (use --force to overwrite)'));
    const s = process.stdout.isTTY ? (0, prompts_1.spinner)() : null;
    s?.start('Working');
    try {
        if (mode === 'merge') {
            if (!fs.existsSync(into))
                throw new Error(`Target directory does not exist: ${into}`);
            const { tokens, report } = (0, engine_1.mergeInto)({ template, projectDir: into, answers, features, force: args.force });
            s?.stop('Merged');
            prompts_1.log.success(`Merged "${template.manifest.name}" into ${into}`);
            prompts_1.log.info(picocolors_1.default.dim(`${report.created.length} file(s) added${report.packageJsonMerged ? ', package.json merged' : ''}`));
            for (const f of report.created.slice(0, 12))
                prompts_1.log.info(picocolors_1.default.green(`  + ${f}`));
            if (report.created.length > 12)
                prompts_1.log.info(picocolors_1.default.dim(`  … +${report.created.length - 12} more`));
            if (report.skipped.length) {
                prompts_1.log.warn(`${report.skipped.length} existing file(s) kept (use --force to overwrite):`);
                for (const f of report.skipped)
                    prompts_1.log.warn(picocolors_1.default.yellow(`  = ${f}`));
            }
            finish(template, tokens);
        }
        else {
            const { tokens } = (0, engine_1.generate)({ template, targetDir, answers, features });
            s?.stop(`Created ${projectName}`);
            prompts_1.log.success(`Created ${targetDir}`);
            finish(template, tokens);
        }
    }
    catch (err) {
        s?.stop('Failed');
        throw err;
    }
}
const finish = (template, tokens) => {
    const steps = (0, engine_1.renderNextSteps)(template, tokens);
    if (steps.length)
        (0, prompts_1.note)(steps.map((st) => picocolors_1.default.cyan(st)).join('\n'), 'Next steps');
    (0, prompts_1.outro)(picocolors_1.default.green('Done.'));
};
main().catch((err) => {
    prompts_1.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
