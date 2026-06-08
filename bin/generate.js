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
const path = __importStar(require("path"));
const mandolin_1 = require("@virtual-registry/mandolin");
const engine_1 = require("../engine");
const { Spinner, text } = mandolin_1.Components;
async function pickTemplate(templates) {
    if (templates.length === 1)
        return templates[0];
    const labels = templates.map((t) => t.manifest.title || t.manifest.name);
    const wizard = new mandolin_1.Terminal();
    wizard.initState({ choice: labels[0] });
    wizard.newLine('Choose a template');
    wizard.newSelectLine(labels, (sel, state) => ({ ...state, choice: String(sel) }));
    await wizard.draw({ clean: true });
    const idx = Math.max(0, labels.indexOf(wizard.state?.choice ?? labels[0]));
    return templates[idx];
}
async function main() {
    console.log(text(' virtuallab-create-library ', { color: 51 }));
    const templates = (0, engine_1.listTemplates)();
    if (!templates.length) {
        console.error('No templates found. Create one with the back-office: virtuallab-create-library-bo');
        process.exit(1);
    }
    const template = await pickTemplate(templates);
    const answers = await (0, engine_1.runTemplatePrompts)(template);
    const projectName = answers[(0, engine_1.nameVarOf)(template)] || template.manifest.name;
    const targetDir = path.join(process.cwd(), projectName);
    const spinner = process.stdout.isTTY ? new Spinner({ color: 82 }, 'Creating project') : null;
    spinner?.start();
    let tokens;
    try {
        ({ tokens } = (0, engine_1.generate)({ template, targetDir, answers }));
        const done = `Created ${projectName}`;
        if (spinner)
            spinner.stop(done);
        else
            console.log(done);
    }
    catch (err) {
        if (spinner)
            spinner.stop('Failed to create the project');
        throw err;
    }
    console.log(text(`\nProject: ${projectName}`, { color: 82 }));
    const steps = (0, engine_1.renderNextSteps)(template, tokens);
    if (steps.length) {
        console.log('\nNext steps:');
        for (const step of steps)
            console.log(text('  ' + step, { color: 51 }));
    }
}
main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
