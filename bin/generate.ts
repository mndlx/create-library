#!/usr/bin/env node
import * as path from 'path';
import { cancel, confirm, intro, isCancel, log, note, outro, select, spinner, text } from '@clack/prompts';
import pc from 'picocolors';
import {
    DotnetTemplate,
    generateDotnet,
    listDotnetTemplatesIn,
    resolveTemplateDirs,
} from '../engine';

interface Args {
    template?: string;
    into?: string;
    name?: string;
    force: boolean;
    yes: boolean;
    flat: boolean;
}

const parseArgs = (argv: string[]): Args => {
    const args: Args = { force: false, yes: false, flat: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--template' || a === '-t') args.template = argv[++i];
        else if (a === '--into' || a === '-o') args.into = argv[++i];
        else if (a === '--name' || a === '-n') args.name = argv[++i];
        else if (a === '--force') args.force = true;
        else if (a === '--flat') args.flat = true; // do NOT create a <name> subfolder
        else if (a === '--yes' || a === '-y') args.yes = true;
    }
    return args;
};

const bail = (): never => { cancel('Cancelled.'); process.exit(1); };

const listTemplates = (): DotnetTemplate[] => {
    const out: DotnetTemplate[] = [];
    const seen = new Set<string>();
    for (const root of resolveTemplateDirs()) {
        for (const t of listDotnetTemplatesIn(root)) {
            if (!seen.has(t.shortName)) { seen.add(t.shortName); out.push(t); }
        }
    }
    return out;
};

async function main() {
    const args = parseArgs(process.argv.slice(2));
    intro(pc.bgCyan(pc.black(' create-library ')) + pc.dim('  generate from a dotnet template'));

    const templates = listTemplates();
    if (!templates.length) {
        log.error('No dotnet templates found (looked for .template.config/template.json).');
        log.info('Create one in the back-office: npm run bo:web');
        process.exit(1);
    }

    let template: DotnetTemplate | undefined;
    if (args.template) {
        template = templates.find((t) => t.shortName === args.template);
        if (!template) { log.error(`Unknown template: ${args.template}`); log.info(`Available: ${templates.map((t) => t.shortName).join(', ')}`); process.exit(1); }
    } else if (templates.length === 1) {
        template = templates[0];
    } else {
        const v = await select({
            message: 'Pick a template',
            options: templates.map((t) => ({ value: t.shortName, label: t.shortName, hint: t.name !== t.shortName ? t.name : undefined })),
        });
        if (isCancel(v)) bail();
        template = templates.find((t) => t.shortName === String(v))!;
    }

    note(`${pc.bold(template.name)} ${pc.dim(template.shortName)}\n${pc.dim(`${template.symbols.length} parameter(s)`)}`, 'Template');

    // Name (-n).
    let name = args.name ?? template.sourceName ?? template.shortName;
    if (!args.yes && !args.name) {
        const v = await text({ message: 'Project name (-n)', defaultValue: name, placeholder: name });
        if (isCancel(v)) bail();
        name = String(v || name);
    }

    // Parameter values.
    const params: Record<string, string> = {};
    for (const s of template.symbols) {
        if (args.yes) { if (s.defaultValue !== undefined) params[s.name] = s.defaultValue; continue; }
        if (s.datatype === 'bool') {
            const v = await confirm({ message: `${s.name}${s.description ? ` — ${s.description}` : ''}`, initialValue: s.defaultValue === 'true' });
            if (isCancel(v)) bail();
            params[s.name] = v ? 'true' : 'false';
        } else if (s.datatype === 'choice' && s.choices?.length) {
            const v = await select({ message: s.name, options: s.choices.map((c) => ({ value: c })), initialValue: s.defaultValue && s.choices.includes(s.defaultValue) ? s.defaultValue : s.choices[0] });
            if (isCancel(v)) bail();
            params[s.name] = String(v);
        } else {
            const v = await text({ message: `${s.name}${s.description ? ` — ${s.description}` : ''}`, defaultValue: s.defaultValue, placeholder: s.defaultValue || '' });
            if (isCancel(v)) bail();
            params[s.name] = String(v ?? s.defaultValue ?? '');
        }
    }

    // Where + whether to nest in a <name> subfolder.
    const base = path.resolve(args.into ?? process.cwd());
    let subfolder = !args.flat;
    if (!args.yes && !args.flat) {
        const v = await confirm({ message: `Create a subfolder "${name}" inside ${base}?`, initialValue: true });
        if (isCancel(v)) bail();
        subfolder = !!v;
    }
    const outDir = subfolder ? path.join(base, name) : base;

    log.step((subfolder ? pc.dim('output → ') : pc.dim('output (flat) → ')) + pc.bold(outDir));

    const s = process.stdout.isTTY ? spinner() : null;
    s?.start('Running dotnet new');
    try {
        const output = generateDotnet({ template, outDir, name, params, force: args.force });
        s?.stop('Done');
        if (output.trim()) log.info(pc.dim(output.trim()));
        outro(pc.green(`Created ${outDir}`));
    } catch (err) {
        s?.stop('Failed');
        throw err;
    }
}

main().catch((err) => { log.error(err instanceof Error ? err.message : String(err)); process.exit(1); });
