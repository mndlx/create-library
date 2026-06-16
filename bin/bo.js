#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const picocolors_1 = __importDefault(require("picocolors"));
// The terminal authoring menu has been replaced by the web back-office, which
// edits dotnet templates (parameters, files) and generates via `dotnet new`.
console.log(picocolors_1.default.bgCyan(picocolors_1.default.black(' create-library ')));
console.log('');
console.log('Authoring moved to the web back-office:');
console.log('  ' + picocolors_1.default.cyan('npm run bo:web') + picocolors_1.default.dim('   (or: npx virtuallab-create-library-bo-web)'));
console.log('');
console.log('Generate from the command line with:');
console.log('  ' + picocolors_1.default.cyan('npm run dev') + picocolors_1.default.dim('     (bin/generate.js — pick a template, answer parameters)'));
console.log('');
