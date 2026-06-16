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
exports.scaffoldDotnetTemplate = exports.generateDotnet = exports.listDotnetTemplatesIn = exports.parseDotnetTemplate = exports.writeDotnetManifest = exports.readDotnetManifest = exports.isDotnetTemplate = exports.DOTNET_MANIFEST_REL = exports.TEMPLATE_CONFIG_DIR = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Adapter over the standard `dotnet new` template engine.
 *
 * A template is a folder containing `.template.config/template.json` (the
 * schemastore "template" schema). User inputs are the manifest's `symbols` of
 * type "parameter"; generation shells out to `dotnet new` (install → invoke by
 * shortName → uninstall), so output is byte-for-byte what the .NET CLI produces.
 */
exports.TEMPLATE_CONFIG_DIR = '.template.config';
exports.DOTNET_MANIFEST_REL = path.join(exports.TEMPLATE_CONFIG_DIR, 'template.json');
const manifestPath = (dir) => path.join(dir, exports.DOTNET_MANIFEST_REL);
const isDotnetTemplate = (dir) => fs.existsSync(manifestPath(dir));
exports.isDotnetTemplate = isDotnetTemplate;
const readDotnetManifest = (dir) => JSON.parse(fs.readFileSync(manifestPath(dir), 'utf8'));
exports.readDotnetManifest = readDotnetManifest;
const writeDotnetManifest = (dir, data) => {
    fs.mkdirSync(path.dirname(manifestPath(dir)), { recursive: true });
    fs.writeFileSync(manifestPath(dir), JSON.stringify(data, null, 2) + '\n');
};
exports.writeDotnetManifest = writeDotnetManifest;
const first = (v) => (Array.isArray(v) ? v[0] : v);
/** Parse a template's manifest into a normalized DotnetTemplate. */
const parseDotnetTemplate = (dir) => {
    const raw = (0, exports.readDotnetManifest)(dir);
    const symbols = Object.entries(raw.symbols ?? {})
        .filter(([, s]) => s?.type === 'parameter')
        .map(([name, s]) => {
        const sym = s;
        return {
            name,
            datatype: sym.datatype ?? 'string',
            defaultValue: sym.defaultValue !== undefined ? String(sym.defaultValue) : undefined,
            replaces: sym.replaces,
            description: sym.description,
            choices: Array.isArray(sym.choices) ? sym.choices.map((c) => (typeof c === 'string' ? c : c.choice)) : undefined,
        };
    });
    return {
        dir,
        identity: raw.identity ?? path.basename(dir),
        name: raw.name ?? path.basename(dir),
        shortName: first(raw.shortName) ?? path.basename(dir),
        author: raw.author,
        classifications: raw.classifications ?? [],
        sourceName: raw.sourceName,
        tags: raw.tags ?? {},
        symbols,
    };
};
exports.parseDotnetTemplate = parseDotnetTemplate;
/** Discover `dotnet new` templates under a root (the root itself or any child holding `.template.config`). */
const listDotnetTemplatesIn = (root) => {
    const out = [];
    const tryDir = (d) => { if ((0, exports.isDotnetTemplate)(d)) {
        try {
            out.push((0, exports.parseDotnetTemplate)(d));
        }
        catch { /* skip invalid */ }
    } };
    tryDir(root);
    let entries = [];
    try {
        entries = fs.readdirSync(root);
    }
    catch {
        return out;
    }
    for (const e of entries) {
        const child = path.join(root, e);
        try {
            if (fs.statSync(child).isDirectory())
                tryDir(child);
        }
        catch { /* skip */ }
    }
    return out;
};
exports.listDotnetTemplatesIn = listDotnetTemplatesIn;
const dotnet = (args) => (0, child_process_1.execFileSync)('dotnet', args, { stdio: 'pipe' }).toString();
/** Generate a project from a dotnet template via the CLI. Returns the dotnet output. */
const generateDotnet = ({ template, outDir, name, params = {}, force = false }) => {
    dotnet(['new', 'install', template.dir, '--force']);
    try {
        const args = ['new', template.shortName, '-o', outDir];
        if (name)
            args.push('-n', name);
        if (force)
            args.push('--force');
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== '')
                args.push(`--${k}`, v);
        }
        return dotnet(args);
    }
    finally {
        try {
            dotnet(['new', 'uninstall', template.dir]);
        }
        catch { /* best-effort cleanup */ }
    }
};
exports.generateDotnet = generateDotnet;
/** Create a minimal `dotnet new` template skeleton. Returns its directory. */
const scaffoldDotnetTemplate = ({ rootDir, name, shortName, author, sourceName = 'MyProject' }) => {
    const dir = path.join(rootDir, name);
    if (fs.existsSync(dir))
        throw new Error(`Template already exists: ${dir}`);
    const manifest = {
        $schema: 'http://json.schemastore.org/template',
        author: author || 'create-library',
        classifications: ['Common'],
        identity: name,
        name,
        shortName: shortName || name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        tags: { language: 'C#', type: 'project' },
        sourceName,
        preferNameDirectory: true,
        symbols: {
            Greeting: { type: 'parameter', datatype: 'string', defaultValue: 'Hello', replaces: 'GREETING', description: 'A sample text parameter' },
        },
    };
    (0, exports.writeDotnetManifest)(dir, manifest);
    fs.writeFileSync(path.join(dir, `${sourceName}.txt`), `# ${sourceName}\n\nGREETING from a create-library dotnet template.\n`);
    return dir;
};
exports.scaffoldDotnetTemplate = scaffoldDotnetTemplate;
