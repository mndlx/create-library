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
exports.findTemplate = exports.listTemplates = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("./config");
const manifest_1 = require("./manifest");
/** Discover every valid template across the resolved roots (first name wins). */
const listTemplates = () => {
    const out = [];
    const seen = new Set();
    for (const root of (0, config_1.resolveTemplateDirs)()) {
        let entries;
        try {
            entries = fs.readdirSync(root);
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const dir = path.join(root, entry);
            if (!fs.existsSync(path.join(dir, manifest_1.MANIFEST_FILENAME)))
                continue;
            try {
                const template = (0, manifest_1.loadManifest)(dir);
                if (seen.has(template.manifest.name))
                    continue;
                seen.add(template.manifest.name);
                out.push(template);
            }
            catch (e) {
                console.error(`Skipping invalid template at ${dir}: ${e.message}`);
            }
        }
    }
    return out;
};
exports.listTemplates = listTemplates;
const findTemplate = (name) => (0, exports.listTemplates)().find((t) => t.manifest.name === name);
exports.findTemplate = findTemplate;
