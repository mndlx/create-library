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
const path = __importStar(require("path"));
const prompts_1 = require("@clack/prompts");
const picocolors_1 = __importDefault(require("picocolors"));
const engine_1 = require("../engine");
const parseArgs = (argv) => {
    const args = { force: false, yes: false, flat: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--template' || a === '-t')
            args.template = argv[++i];
        else if (a === '--into' || a === '-o')
            args.into = argv[++i];
        else if (a === '--name' || a === '-n')
            args.name = argv[++i];
        else if (a === '--force')
            args.force = true;
        else if (a === '--flat')
            args.flat = true; // do NOT create a <name> subfolder
        else if (a === '--yes' || a === '-y')
            args.yes = true;
    }
    return args;
};
const bail = () => { (0, prompts_1.cancel)('Cancelled.'); process.exit(1); };
const listTemplates = () => {
    const out = [];
    const seen = new Set();
    for (const root of (0, engine_1.resolveTemplateDirs)()) {
        for (const t of (0, engine_1.listDotnetTemplatesIn)(root)) {
            if (!seen.has(t.shortName)) {
                seen.add(t.shortName);
                out.push(t);
            }
        }
    }
    return out;
};
async function main() {
    const args = parseArgs(process.argv.slice(2));
    (0, prompts_1.intro)(picocolors_1.default.bgCyan(picocolors_1.default.black(' create-library ')) + picocolors_1.default.dim('  generate from a dotnet template'));
    const templates = listTemplates();
    if (!templates.length) {
        prompts_1.log.error('No dotnet templates found (looked for .template.config/template.json).');
        prompts_1.log.info('Create one in the back-office: npm run bo:web');
        process.exit(1);
    }
    let template;
    if (args.template) {
        template = templates.find((t) => t.shortName === args.template);
        if (!template) {
            prompts_1.log.error(`Unknown template: ${args.template}`);
            prompts_1.log.info(`Available: ${templates.map((t) => t.shortName).join(', ')}`);
            process.exit(1);
        }
    }
    else if (templates.length === 1) {
        template = templates[0];
    }
    else {
        const v = await (0, prompts_1.select)({
            message: 'Pick a template',
            options: templates.map((t) => ({ value: t.shortName, label: t.shortName, hint: t.name !== t.shortName ? t.name : undefined })),
        });
        if ((0, prompts_1.isCancel)(v))
            bail();
        template = templates.find((t) => t.shortName === String(v));
    }
    (0, prompts_1.note)(`${picocolors_1.default.bold(template.name)} ${picocolors_1.default.dim(template.shortName)}\n${picocolors_1.default.dim(`${template.symbols.length} parameter(s)`)}`, 'Template');
    // Name (-n).
    let name = args.name ?? template.sourceName ?? template.shortName;
    if (!args.yes && !args.name) {
        const v = await (0, prompts_1.text)({ message: 'Project name (-n)', defaultValue: name, placeholder: name });
        if ((0, prompts_1.isCancel)(v))
            bail();
        name = String(v || name);
    }
    // Parameter values.
    const params = {};
    for (const s of template.symbols) {
        if (args.yes) {
            if (s.defaultValue !== undefined)
                params[s.name] = s.defaultValue;
            continue;
        }
        if (s.datatype === 'bool') {
            const v = await (0, prompts_1.confirm)({ message: `${s.name}${s.description ? ` — ${s.description}` : ''}`, initialValue: s.defaultValue === 'true' });
            if ((0, prompts_1.isCancel)(v))
                bail();
            params[s.name] = v ? 'true' : 'false';
        }
        else if (s.datatype === 'choice' && s.choices?.length) {
            const v = await (0, prompts_1.select)({ message: s.name, options: s.choices.map((c) => ({ value: c })), initialValue: s.defaultValue && s.choices.includes(s.defaultValue) ? s.defaultValue : s.choices[0] });
            if ((0, prompts_1.isCancel)(v))
                bail();
            params[s.name] = String(v);
        }
        else {
            const v = await (0, prompts_1.text)({ message: `${s.name}${s.description ? ` — ${s.description}` : ''}`, defaultValue: s.defaultValue, placeholder: s.defaultValue || '' });
            if ((0, prompts_1.isCancel)(v))
                bail();
            params[s.name] = String(v ?? s.defaultValue ?? '');
        }
    }
    // Where + whether to nest in a <name> subfolder.
    const base = path.resolve(args.into ?? process.cwd());
    let subfolder = !args.flat;
    if (!args.yes && !args.flat) {
        const v = await (0, prompts_1.confirm)({ message: `Create a subfolder "${name}" inside ${base}?`, initialValue: true });
        if ((0, prompts_1.isCancel)(v))
            bail();
        subfolder = !!v;
    }
    const outDir = subfolder ? path.join(base, name) : base;
    prompts_1.log.step((subfolder ? picocolors_1.default.dim('output → ') : picocolors_1.default.dim('output (flat) → ')) + picocolors_1.default.bold(outDir));
    const s = process.stdout.isTTY ? (0, prompts_1.spinner)() : null;
    s?.start('Running dotnet new');
    try {
        const output = (0, engine_1.generateDotnet)({ template, outDir, name, params, force: args.force });
        s?.stop('Done');
        if (output.trim())
            prompts_1.log.info(picocolors_1.default.dim(output.trim()));
        (0, prompts_1.outro)(picocolors_1.default.green(`Created ${outDir}`));
    }
    catch (err) {
        s?.stop('Failed');
        throw err;
    }
}
main().catch((err) => { prompts_1.log.error(err instanceof Error ? err.message : String(err)); process.exit(1); });
