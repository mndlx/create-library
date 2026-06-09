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
exports.detokenizePaths = exports.detokenizeTree = exports.tokenReplace = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fsx_1 = require("./fsx");
/** Replace every `__TOKEN__` occurrence (literal, no regex) with its value. */
const tokenReplace = (input, tokens) => {
    let out = input;
    for (const [token, value] of Object.entries(tokens)) {
        out = out.split(`__${token}__`).join(value);
    }
    return out;
};
exports.tokenReplace = tokenReplace;
/** Replace tokens across every text file under `root`. */
const detokenizeTree = (root, tokens, extraExcludePaths = []) => {
    for (const file of (0, fsx_1.walkFiles)(root)) {
        if ((0, fsx_1.isProbablyBinary)(file))
            continue;
        const rel = path.relative(root, file);
        if (extraExcludePaths.some((ex) => rel.includes(ex)))
            continue;
        const content = fs.readFileSync(file, 'utf8');
        const replaced = (0, exports.tokenReplace)(content, tokens);
        if (replaced !== content)
            fs.writeFileSync(file, replaced);
    }
};
exports.detokenizeTree = detokenizeTree;
const fsx_2 = require("./fsx");
/** Rename files and directories whose names contain `__TOKEN__`, deepest first. */
const detokenizePaths = (root, tokens) => {
    const entries = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && fsx_2.DEFAULT_EXCLUDE_DIRS.includes(entry.name))
                continue;
            const full = path.join(dir, entry.name);
            entries.push(full);
            if (entry.isDirectory())
                walk(full);
        }
    };
    walk(root);
    entries
        .sort((a, b) => b.split(path.sep).length - a.split(path.sep).length)
        .forEach((full) => {
        const dir = path.dirname(full);
        const base = path.basename(full);
        const renamed = (0, exports.tokenReplace)(base, tokens);
        if (renamed !== base)
            fs.renameSync(full, path.join(dir, renamed));
    });
};
exports.detokenizePaths = detokenizePaths;
