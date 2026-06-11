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
exports.exportTemplate = exports.latestPublishedDirs = exports.listPublishedVersions = exports.bumpVersion = exports.compareVersions = exports.publishedRoot = void 0;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const edit_1 = require("./edit");
const fsx_1 = require("./fsx");
const manifest_1 = require("./manifest");
/** Local registry the CLI consumes: <root>/<name>/<version>/ holds a template snapshot. */
const publishedRoot = () => process.env.VLCL_PUBLISH_DIR || path.join(os.homedir(), '.virtuallab-create-library', 'published');
exports.publishedRoot = publishedRoot;
const parseVersion = (v) => {
    const parts = String(v || '0.0.0').split('.').map((n) => parseInt(n, 10));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
};
/** Semver-ish compare (numeric major.minor.patch). */
const compareVersions = (a, b) => {
    const [a1, a2, a3] = parseVersion(a);
    const [b1, b2, b3] = parseVersion(b);
    return a1 - b1 || a2 - b2 || a3 - b3;
};
exports.compareVersions = compareVersions;
const bumpVersion = (v, kind) => {
    const [maj, min, pat] = parseVersion(v);
    if (kind === 'major')
        return `${maj + 1}.0.0`;
    if (kind === 'minor')
        return `${maj}.${min + 1}.0`;
    return `${maj}.${min}.${pat + 1}`;
};
exports.bumpVersion = bumpVersion;
/** Every published <name>/<version> snapshot, newest version first per name. */
const listPublishedVersions = (name) => {
    const root = (0, exports.publishedRoot)();
    const out = [];
    let names;
    try {
        names = fs.readdirSync(root);
    }
    catch {
        return [];
    }
    for (const n of names) {
        if (name && n !== name)
            continue;
        const nameDir = path.join(root, n);
        let versions;
        try {
            versions = fs.readdirSync(nameDir);
        }
        catch {
            continue;
        }
        for (const v of versions) {
            const dir = path.join(nameDir, v);
            if (fs.existsSync(path.join(dir, manifest_1.MANIFEST_FILENAME)))
                out.push({ name: n, version: v, dir });
        }
    }
    out.sort((a, b) => a.name.localeCompare(b.name) || (0, exports.compareVersions)(b.version, a.version));
    return out;
};
exports.listPublishedVersions = listPublishedVersions;
/** The latest published snapshot per template name. */
const latestPublishedDirs = () => {
    const latest = new Map();
    for (const p of (0, exports.listPublishedVersions)()) {
        const cur = latest.get(p.name);
        if (!cur || (0, exports.compareVersions)(p.version, cur.version) > 0)
            latest.set(p.name, p);
    }
    return [...latest.values()].map((p) => p.dir);
};
exports.latestPublishedDirs = latestPublishedDirs;
/**
 * Export (publish) a template snapshot into the local registry. The CLI
 * discovers the latest published version of each template automatically.
 */
const exportTemplate = (template, { bump, overwrite = false } = {}) => {
    const m = (0, edit_1.readRawManifest)(template.dir);
    if (bump) {
        m.version = (0, exports.bumpVersion)(m.version || '1.0.0', bump);
        (0, edit_1.writeRawManifest)(template.dir, m);
    }
    const version = m.version || '1.0.0';
    const dest = path.join((0, exports.publishedRoot)(), m.name, version);
    if (fs.existsSync(dest)) {
        if (!overwrite)
            throw new Error(`Version ${version} of "${m.name}" is already published. Bump the version or enable overwrite.`);
        fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    (0, fsx_1.copyDir)(template.dir, dest);
    return { name: m.name, version, dir: dest };
};
exports.exportTemplate = exportTemplate;
