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
exports.addTemplateDir = exports.resolveTemplateDirs = exports.bundledTemplatesDir = exports.configFilePath = exports.ENV_VAR = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/** Env var holding extra template directories (OS path-delimiter separated). */
exports.ENV_VAR = 'VLCL_TEMPLATES_DIR';
/** User config file with persisted external template directories. */
exports.configFilePath = path.join(os.homedir(), '.virtuallab-create-library.json');
/** Templates shipped with this package. */
exports.bundledTemplatesDir = path.join(__dirname, '..', 'templates');
const readConfig = () => {
    try {
        if (fs.existsSync(exports.configFilePath)) {
            return JSON.parse(fs.readFileSync(exports.configFilePath, 'utf8'));
        }
    }
    catch {
        /* ignore malformed config */
    }
    return {};
};
const isDir = (p) => {
    try {
        return fs.statSync(p).isDirectory();
    }
    catch {
        return false;
    }
};
/** Ordered, de-duplicated list of existing template roots (bundled first). */
const resolveTemplateDirs = () => {
    const dirs = [exports.bundledTemplatesDir];
    const env = process.env[exports.ENV_VAR];
    if (env) {
        for (const part of env.split(path.delimiter)) {
            if (part.trim())
                dirs.push(path.resolve(part.trim()));
        }
    }
    for (const part of readConfig().templateDirs ?? []) {
        if (typeof part === 'string' && part.trim())
            dirs.push(path.resolve(part.trim()));
    }
    return [...new Set(dirs)].filter(isDir);
};
exports.resolveTemplateDirs = resolveTemplateDirs;
/** Persist an external template directory to the user config. */
const addTemplateDir = (dir) => {
    const resolved = path.resolve(dir);
    const cfg = readConfig();
    const list = Array.isArray(cfg.templateDirs) ? cfg.templateDirs : [];
    if (!list.includes(resolved))
        list.push(resolved);
    fs.writeFileSync(exports.configFilePath, JSON.stringify({ ...cfg, templateDirs: list }, null, 2) + '\n');
    return resolved;
};
exports.addTemplateDir = addTemplateDir;
