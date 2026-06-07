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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const p = __importStar(require("@clack/prompts"));
const color = __importStar(require("picocolors"));
const path = __importStar(require("path"));
const promptUserProject_1 = require("../prompts/promptUserProject");
const copyTemplate_1 = require("../utils/copyTemplate");
const detokenize_1 = require("../utils/detokenize");
const TEMPLATE_DIR = path.join(__dirname, '..', 'vite-react-ubundle');
async function main() {
    const spinner = p.spinner();
    const currentPath = process.cwd();
    p.intro(`${color.cyan(' virtuallab-create-library ')}`);
    const project = await (0, promptUserProject_1.promptUserProject)();
    const projectPath = path.join(currentPath, project.__name);
    spinner.start('Creating library template');
    (0, copyTemplate_1.copyTemplate)(TEMPLATE_DIR, projectPath);
    spinner.stop(`Created ${project.__name} structure`);
    spinner.start('Finalizing');
    (0, detokenize_1.replaceReactViteUbundleTemplatePlaceholders)(project, projectPath);
    spinner.stop('Ready');
    const nextSteps = color.white(`
Here are the details of your project:
${color.green('Project Name:')} ${project.__name}

Follow the next steps to get started:

> ${color.cyan('From the root folder')}
    Run the following command:
    yarn run dev
`);
    p.outro(nextSteps);
}
main().catch((err) => {
    p.cancel(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
