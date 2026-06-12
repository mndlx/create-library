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
exports.resolveVariables = exports.detectForeignTokens = exports.detectTokens = exports.TOKEN_NAME_RE = exports.tokenConfigOf = exports.DEFAULT_TOKEN_CONFIG = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fsx_1 = require("./fsx");
const manifest_1 = require("./manifest");
/** Legacy default delimiters, used when a manifest has no explicit tokenConfig. */
exports.DEFAULT_TOKEN_CONFIG = { start: '__', end: '__' };
const tokenConfigOf = (template) => template.manifest.tokenConfig ?? exports.DEFAULT_TOKEN_CONFIG;
exports.tokenConfigOf = tokenConfigOf;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Build the regex matching `<start>NAME<end>`. NAME allows dots and dashes so
 * tokens like `@@test.js@@` or `@@my-var@@` work.
 */
const tokenRegex = ({ start, end }) => new RegExp(`${escapeRe(start)}([A-Za-z0-9_.\\-]+)${escapeRe(end)}`, 'g');
/** Token names accepted when declaring a variable by hand. */
exports.TOKEN_NAME_RE = /^[A-Za-z0-9_.-]+$/;
/** Scan a template's files (contents and path names) for tokens wrapped in `cfg`. */
const scanForTokens = (template, cfg) => {
    const found = new Set();
    const collect = (text) => {
        const re = tokenRegex(cfg);
        let m;
        while ((m = re.exec(text)))
            found.add(m[1]);
    };
    // Scan the WHOLE template folder — payload, overlays, and any file the
    // editor shows — so tokens never hide because the payload subfolder is
    // missing or files live outside it. Only the manifest itself is skipped.
    const manifestPath = path.join(template.dir, manifest_1.MANIFEST_FILENAME);
    if (!fs.existsSync(template.dir))
        return [];
    for (const file of (0, fsx_1.walkFiles)(template.dir)) {
        if (path.resolve(file) === path.resolve(manifestPath))
            continue;
        collect(path.relative(template.dir, file)); // tokens in file/dir names
        if (!(0, fsx_1.isProbablyBinary)(file))
            collect(fs.readFileSync(file, 'utf8'));
    }
    return [...found].sort();
};
/**
 * Scan a template's files for dynamic tokens using its configured delimiters
 * and return the unique token names, sorted. This drives the inspector.
 */
const detectTokens = (template) => scanForTokens(template, (0, exports.tokenConfigOf)(template));
exports.detectTokens = detectTokens;
/** Delimiter styles people commonly use; checked for mismatch warnings. */
const COMMON_TOKEN_CONFIGS = [
    { start: '@@', end: '@@' },
    { start: '__', end: '__' },
    { start: '{{', end: '}}' },
];
/**
 * Tokens written with a *different* delimiter style than the template's
 * configured one. These would NOT be replaced at generation time — surfaced
 * in the UI as a "did you mean to switch delimiters?" warning.
 */
const detectForeignTokens = (template) => {
    const active = (0, exports.tokenConfigOf)(template);
    const out = [];
    for (const cfg of COMMON_TOKEN_CONFIGS) {
        if (cfg.start === active.start && cfg.end === active.end)
            continue;
        const tokens = scanForTokens(template, cfg);
        if (tokens.length)
            out.push({ config: cfg, tokens });
    }
    return out;
};
exports.detectForeignTokens = detectForeignTokens;
const toVariable = (p, detected) => ({
    name: p.name,
    token: p.token || p.name,
    message: p.message || (p.token || p.name),
    type: p.type === 'select' ? 'select' : 'text',
    default: p.default ?? '',
    validate: p.validate ?? 'none',
    options: p.options,
    exposeCli: p.exposeCli !== false,
    detected,
});
/**
 * The full variable set for a template: every detected token (merged with its
 * saved metadata, if any) plus any declared-but-not-detected prompts.
 */
const resolveVariables = (template) => {
    const detected = (0, exports.detectTokens)(template);
    const byToken = new Map();
    for (const p of template.manifest.prompts)
        byToken.set(p.token || p.name, p);
    const out = [];
    const seen = new Set();
    for (const tok of detected) {
        const p = byToken.get(tok);
        out.push(p
            ? toVariable(p, true)
            : { name: tok, token: tok, message: tok, type: 'text', default: '', validate: 'none', exposeCli: true, detected: true });
        seen.add(tok);
    }
    for (const p of template.manifest.prompts) {
        const tok = p.token || p.name;
        if (!seen.has(tok))
            out.push(toVariable(p, false));
    }
    return out;
};
exports.resolveVariables = resolveVariables;
