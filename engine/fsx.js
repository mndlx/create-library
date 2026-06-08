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
exports.walkFiles = exports.copyDir = exports.isProbablyBinary = exports.DEFAULT_EXCLUDE_DIRS = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Directories never copied or scanned. */
exports.DEFAULT_EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'storybook-static', 'coverage'];
const BINARY_EXT = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp', '.pdf', '.zip', '.gz',
    '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.mov', '.mp3', '.wasm',
]);
const isProbablyBinary = (file) => BINARY_EXT.has(path.extname(file).toLowerCase());
exports.isProbablyBinary = isProbablyBinary;
/** Recursively copy `src` to `dest`, skipping excluded directories. Fails if `dest` exists. */
const copyDir = (src, dest, excludeDirs = exports.DEFAULT_EXCLUDE_DIRS) => {
    if (!fs.existsSync(src))
        throw new Error(`Template source not found: ${src}`);
    if (fs.existsSync(dest))
        throw new Error(`Target directory already exists: ${dest}`);
    fs.cpSync(src, dest, {
        recursive: true,
        filter: (s) => !excludeDirs.includes(path.basename(s)),
    });
};
exports.copyDir = copyDir;
/** List every file under `root`, skipping excluded directories. */
const walkFiles = (root, excludeDirs = exports.DEFAULT_EXCLUDE_DIRS) => {
    const result = [];
    const stack = [root];
    while (stack.length) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (!excludeDirs.includes(entry.name))
                    stack.push(full);
            }
            else if (entry.isFile()) {
                result.push(full);
            }
        }
    }
    return result;
};
exports.walkFiles = walkFiles;
