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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mandolin_1 = require("@virtual-registry/mandolin");
const engine_1 = require("../engine");
const { Spinner, text, divider, br } = mandolin_1.Components;
const C = engine_1.CLI_COLORS;
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
const banner = () => {
    console.log(br());
    console.log(text(' create-library ', { bgcolor: C.accent, color: 16, effect: ['bold'] }) +
        text('  scaffold projects from tokenized templates', { color: C.muted }));
    console.log(divider());
};
const templateLabel = (t) => {
    const m = t.manifest;
    return `${m.name}@${m.version ?? '1.0.0'}  [${(0, engine_1.outputModeOf)(t)}]  ${m.title && m.title !== m.name ? '— ' + m.title : ''}`;
};
async function pickTemplate(templates, wanted) {
    if (wanted) {
        const found = (0, engine_1.findTemplate)(wanted);
        if (!found) {
            console.error(text(`Unknown template: ${wanted}`, { color: C.warn }));
            console.error(`Available: ${templates.map((t) => t.manifest.name).join(', ')}`);
            process.exit(1);
        }
        return found;
    }
    if (templates.length === 1)
        return templates[0];
    const labels = templates.map(templateLabel);
    const wizard = new mandolin_1.Terminal();
    wizard.initState({ choice: labels[0] });
    wizard.newLine(text(' TEMPLATE ', { bgcolor: C.token, color: 16, effect: ['bold'] }) +
        text('  pick what to generate', { color: C.muted }));
    wizard.newSelectLine(labels, (sel, state) => ({ ...state, choice: String(sel) }));
    await wizard.draw({ clean: true });
    const idx = Math.max(0, labels.indexOf(wizard.state?.choice ?? labels[0]));
    return templates[idx];
}
/** One-line card describing what was selected. */
const printTemplateCard = (t) => {
    const m = t.manifest;
    const cfg = (0, engine_1.tokenConfigOf)(t);
    const vars = (0, engine_1.resolveVariables)(t);
    console.log(br());
    console.log(text('  ▸ ', { color: C.accent }) + text(m.title ?? m.name, { effect: ['bold'] }) +
        text(`  v${m.version ?? '1.0.0'}`, { color: C.muted }) +
        '  ' + modeBadge((0, engine_1.outputModeOf)(t)));
    if (m.description)
        console.log(text(`    ${m.description}`, { color: C.muted }));
    console.log(text(`    tokens ${cfg.start}…${cfg.end} · ${vars.length} variable(s) · ${(m.features ?? []).length} feature(s)`, { color: C.muted }));
};
const modeBadge = (mode) => mode === 'merge'
    ? text(' MERGE ', { bgcolor: C.warn, color: 16, effect: ['bold'] })
    : text(' NEW ', { bgcolor: C.ok, color: 16, effect: ['bold'] });
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
    console.log(text('  ⚠ empty value for: ', { color: C.warn }) +
        empty.map((tk) => text(`${cfg.start}${tk}${cfg.end}`, { color: C.token })).join(', ') +
        text('  (they will be replaced with nothing)', { color: C.muted }));
};
async function main() {
    const args = parseArgs(process.argv.slice(2));
    banner();
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length) {
        console.error('No templates found. Create one with the back-office: npm run bo:web');
        process.exit(1);
    }
    let template;
    let config;
    if (args.preset) {
        const preset = (0, engine_1.loadPreset)(args.preset);
        const found = preset.template ? (0, engine_1.findTemplate)(preset.template) : undefined;
        if (!found) {
            console.error(`Preset references unknown template: ${preset.template}`);
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
        console.log(text(`  Saved preset to ${args.savePreset}`, { color: C.ok }));
    }
    // ----- plan summary ---------------------------------------------------
    const into = path.resolve(args.into ?? process.cwd());
    const projectName = answers[(0, engine_1.nameVarOf)(template)] || template.manifest.name;
    const targetDir = mode === 'merge' ? into : path.join(into, projectName);
    console.log(br());
    console.log(divider());
    console.log(modeBadge(mode) +
        (mode === 'merge'
            ? text('  merging into existing project → ', { color: C.muted }) + text(targetDir, { effect: ['bold'] })
            : text('  creating new folder → ', { color: C.muted }) + text(targetDir, { effect: ['bold'] })));
    if (featureSummary(features))
        console.log(text(`  features: ${featureSummary(features)}`, { color: C.muted }));
    warnEmptyTokens(template, answers);
    if (mode === 'merge' && !args.force) {
        console.log(text('  existing files are kept (use --force to overwrite)', { color: C.muted }));
    }
    console.log(divider());
    const spinner = process.stdout.isTTY ? new Spinner({ color: C.ok }, 'Working') : null;
    spinner?.start();
    try {
        if (mode === 'merge') {
            if (!fs.existsSync(into))
                throw new Error(`Target directory does not exist: ${into}`);
            const { tokens, report } = (0, engine_1.mergeInto)({ template, projectDir: into, answers, features, force: args.force });
            if (spinner)
                spinner.stop('Merged');
            else
                console.log('Merged');
            console.log(br());
            console.log(text(`  ✔ Merged "${template.manifest.name}" into ${into}`, { color: C.ok }));
            console.log(text(`    ${report.created.length} file(s) added${report.packageJsonMerged ? ', package.json merged' : ''}`, { color: C.muted }));
            for (const f of report.created.slice(0, 12))
                console.log(text(`      + ${f}`, { color: C.ok }));
            if (report.created.length > 12)
                console.log(text(`      … +${report.created.length - 12} more`, { color: C.muted }));
            if (report.skipped.length) {
                console.log(text(`    ${report.skipped.length} existing file(s) kept (use --force to overwrite):`, { color: C.warn }));
                for (const f of report.skipped)
                    console.log(text(`      = ${f}`, { color: C.warn }));
            }
            printNextSteps(template, tokens);
        }
        else {
            const { tokens } = (0, engine_1.generate)({ template, targetDir, answers, features });
            if (spinner)
                spinner.stop(`Created ${projectName}`);
            else
                console.log(`Created ${projectName}`);
            console.log(br());
            console.log(text(`  ✔ Created ${targetDir}`, { color: C.ok }));
            printNextSteps(template, tokens);
        }
    }
    catch (err) {
        if (spinner)
            spinner.stop('Failed');
        throw err;
    }
}
const printNextSteps = (template, tokens) => {
    const steps = (0, engine_1.renderNextSteps)(template, tokens);
    if (!steps.length)
        return;
    console.log(br());
    console.log(text('  Next steps:', { effect: ['bold'] }));
    for (const step of steps)
        console.log(text(`    ${step}`, { color: C.accent }));
};
main().catch((err) => {
    console.error(text(`✖ ${err instanceof Error ? err.message : String(err)}`, { color: 196 }));
    process.exit(1);
});
