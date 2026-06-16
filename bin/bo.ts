#!/usr/bin/env node
import pc from 'picocolors';

// The terminal authoring menu has been replaced by the web back-office, which
// edits dotnet templates (parameters, files) and generates via `dotnet new`.
console.log(pc.bgCyan(pc.black(' create-library ')));
console.log('');
console.log('Authoring moved to the web back-office:');
console.log('  ' + pc.cyan('npm run bo:web') + pc.dim('   (or: npx virtuallab-create-library-bo-web)'));
console.log('');
console.log('Generate from the command line with:');
console.log('  ' + pc.cyan('npm run dev') + pc.dim('     (bin/generate.js — pick a template, answer parameters)'));
console.log('');
