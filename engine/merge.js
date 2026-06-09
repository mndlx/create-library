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
exports.mergeTree = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fsx_1 = require("./fsx");
const DEP_BUCKETS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
/** Merge dependency buckets and scripts from a staged package.json into the project's. */
const mergePackageJsonInto = (projectDir, stagedPkgPath) => {
    const targetPath = path.join(projectDir, 'package.json');
    const patch = JSON.parse(fs.readFileSync(stagedPkgPath, 'utf8'));
    const pkg = fs.existsSync(targetPath)
        ? JSON.parse(fs.readFileSync(targetPath, 'utf8'))
        : { name: path.basename(projectDir), version: '0.0.0' };
    for (const bucket of DEP_BUCKETS) {
        if (patch[bucket])
            pkg[bucket] = { ...(pkg[bucket] || {}), ...patch[bucket] };
    }
    if (patch.scripts)
        pkg.scripts = { ...(pkg.scripts || {}), ...patch.scripts };
    fs.writeFileSync(targetPath, JSON.stringify(pkg, null, 2) + '\n');
    return true;
};
/**
 * Merge an assembled template tree into an existing project.
 * - root package.json contributes dep buckets + scripts (never overwrites name/version),
 * - existing files are left untouched unless `force` is set (and reported as skipped).
 */
const mergeTree = (staging, projectDir, opts = {}) => {
    const report = { created: [], skipped: [], packageJsonMerged: false };
    for (const file of (0, fsx_1.walkFiles)(staging)) {
        const rel = path.relative(staging, file);
        if (rel === 'package.json') {
            report.packageJsonMerged = mergePackageJsonInto(projectDir, file);
            continue;
        }
        const dest = path.join(projectDir, rel);
        if (fs.existsSync(dest) && !opts.force) {
            report.skipped.push(rel);
            continue;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(file, dest);
        report.created.push(rel);
    }
    return report;
};
exports.mergeTree = mergeTree;
