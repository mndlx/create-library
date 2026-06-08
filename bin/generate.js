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
const promptUserProject_1 = require("../prompts/promptUserProject");
const copyTemplate_1 = require("../utils/copyTemplate");
const detokenize_1 = require("../utils/detokenize");
const { Spinner, text } = mandolin_1.Components;
const TEMPLATE_DIR = path.join(__dirname, '..', 'vite-react-ubundle');
async function main() {
    const currentPath = process.cwd();
    console.log(text(' virtuallab-create-library ', { color: 51 }));
    const project = await (0, promptUserProject_1.promptUserProject)();
    const projectPath = path.join(currentPath, project.__name);
    // The animated spinner needs a TTY; fall back to plain logs otherwise.
    const spinner = process.stdout.isTTY ? new Spinner({ color: 82 }, 'Creating library template') : null;
    spinner?.start();
    try {
        (0, copyTemplate_1.copyTemplate)(TEMPLATE_DIR, projectPath);
        (0, detokenize_1.replaceReactViteUbundleTemplatePlaceholders)(project, projectPath);
        const done = `Created ${project.__name} structure`;
        if (spinner)
            spinner.stop(done);
        else
            console.log(done);
    }
    catch (err) {
        if (spinner)
            spinner.stop('Failed to create the library');
        throw err;
    }
    console.log(text(`\nProject: ${project.__name}`, { color: 82 }));
    console.log('\nNext steps:');
    console.log(text(`  cd ${project.__name}`, { color: 51 }));
    console.log(text('  npm install', { color: 51 }));
    console.log(text('  npm run storybook', { color: 51 }));
}
main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
