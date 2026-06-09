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
exports.loadManifest = exports.validateManifest = exports.MANIFEST_FILENAME = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.MANIFEST_FILENAME = 'template.json';
/** Returns a list of human-readable validation errors (empty = valid). */
const validateManifest = (data) => {
    const errors = [];
    if (!data || typeof data !== 'object') {
        return ['manifest must be a JSON object'];
    }
    const m = data;
    if (typeof m.name !== 'string' || !m.name.trim())
        errors.push('"name" is required');
    if (!Array.isArray(m.prompts)) {
        errors.push('"prompts" must be an array');
    }
    else {
        m.prompts.forEach((raw, i) => {
            if (!raw || typeof raw !== 'object') {
                errors.push(`prompts[${i}] must be an object`);
                return;
            }
            const p = raw;
            if (typeof p.name !== 'string' || !p.name)
                errors.push(`prompts[${i}].name is required`);
            if (typeof p.message !== 'string' || !p.message)
                errors.push(`prompts[${i}].message is required`);
            const type = p.type ?? 'text';
            if (type !== 'text' && type !== 'select')
                errors.push(`prompts[${i}].type must be "text" or "select"`);
            if (type === 'select' && (!Array.isArray(p.options) || p.options.length === 0)) {
                errors.push(`prompts[${i}].options is required for a select prompt`);
            }
        });
    }
    const detok = m.detokenize;
    if (detok && detok.exclude !== undefined && !Array.isArray(detok.exclude)) {
        errors.push('"detokenize.exclude" must be an array');
    }
    const hooks = m.hooks;
    if (hooks && hooks.postGenerate !== undefined && !Array.isArray(hooks.postGenerate)) {
        errors.push('"hooks.postGenerate" must be an array');
    }
    if (m.nextSteps !== undefined && !Array.isArray(m.nextSteps)) {
        errors.push('"nextSteps" must be an array');
    }
    if (m.output !== undefined && m.output !== 'new' && m.output !== 'merge') {
        errors.push('"output" must be "new" or "merge"');
    }
    if (m.features !== undefined) {
        if (!Array.isArray(m.features)) {
            errors.push('"features" must be an array');
        }
        else {
            m.features.forEach((raw, i) => {
                if (!raw || typeof raw !== 'object') {
                    errors.push(`features[${i}] must be an object`);
                    return;
                }
                const f = raw;
                if (typeof f.id !== 'string' || !f.id)
                    errors.push(`features[${i}].id is required`);
                if (typeof f.label !== 'string' || !f.label)
                    errors.push(`features[${i}].label is required`);
                const type = f.type ?? 'boolean';
                if (type !== 'boolean' && type !== 'select') {
                    errors.push(`features[${i}].type must be "boolean" or "select"`);
                }
                if (type === 'select') {
                    if (!Array.isArray(f.options) || f.options.length === 0) {
                        errors.push(`features[${i}].options is required for a select feature`);
                    }
                    if (!f.variants || typeof f.variants !== 'object') {
                        errors.push(`features[${i}].variants is required for a select feature`);
                    }
                }
            });
        }
    }
    return errors;
};
exports.validateManifest = validateManifest;
const normalize = (m) => ({
    ...m,
    source: m.source || 'template',
    prompts: (m.prompts || []).map((p) => ({
        ...p,
        type: p.type || 'text',
        token: p.token || p.name,
        validate: p.validate || 'none',
    })),
});
const loadManifest = (manifestDir) => {
    const manifestPath = path.join(manifestDir, exports.MANIFEST_FILENAME);
    const raw = fs.readFileSync(manifestPath, 'utf8');
    let data;
    try {
        data = JSON.parse(raw);
    }
    catch (e) {
        throw new Error(`Invalid JSON in ${manifestPath}: ${e.message}`);
    }
    const errors = (0, exports.validateManifest)(data);
    if (errors.length) {
        throw new Error(`Invalid manifest ${manifestPath}:\n - ${errors.join('\n - ')}`);
    }
    const manifest = normalize(data);
    const sourceDir = path.join(manifestDir, manifest.source);
    return { manifest, dir: manifestDir, sourceDir, origin: path.dirname(manifestDir) };
};
exports.loadManifest = loadManifest;
