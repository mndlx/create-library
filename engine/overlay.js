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
exports.applyInjects = exports.overlayDir = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fsx_1 = require("./fsx");
/** Copy every file from `src` over `dest`, overwriting on conflicts. */
const overlayDir = (src, dest) => {
    if (!fs.existsSync(src))
        throw new Error(`Overlay not found: ${src}`);
    fs.cpSync(src, dest, {
        recursive: true,
        force: true,
        filter: (s) => !fsx_1.DEFAULT_EXCLUDE_DIRS.includes(path.basename(s)),
    });
};
exports.overlayDir = overlayDir;
const markerLiteral = (marker) => `/* inject:${marker} */`;
const ANY_MARKER = /[ \t]*\/\* inject:[^*]*\*\/[ \t]*\r?\n?/g;
/** Replace `/* inject:<marker> *​/` markers with the collected snippets, then strip the rest. */
const applyInjects = (root, injects) => {
    const byFile = new Map();
    for (const inj of injects) {
        const perMarker = byFile.get(inj.file) ?? new Map();
        const list = perMarker.get(inj.marker) ?? [];
        list.push(inj.content);
        perMarker.set(inj.marker, list);
        byFile.set(inj.file, perMarker);
    }
    for (const [relFile, perMarker] of byFile) {
        const filePath = path.join(root, relFile);
        if (!fs.existsSync(filePath))
            continue;
        let content = fs.readFileSync(filePath, 'utf8');
        for (const [marker, snippets] of perMarker) {
            content = content.split(markerLiteral(marker)).join(snippets.join('\n'));
        }
        fs.writeFileSync(filePath, content);
    }
    // Remove any markers that received no contribution.
    for (const file of (0, fsx_1.walkFiles)(root)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('/* inject:')) {
            fs.writeFileSync(file, content.replace(ANY_MARKER, ''));
        }
    }
};
exports.applyInjects = applyInjects;
