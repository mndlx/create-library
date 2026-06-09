import * as fs from 'fs';
import * as path from 'path';
import { walkFiles } from './fsx';

export interface MergeReport {
    created: string[];
    skipped: string[];
    packageJsonMerged: boolean;
}

const DEP_BUCKETS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/** Merge dependency buckets and scripts from a staged package.json into the project's. */
const mergePackageJsonInto = (projectDir: string, stagedPkgPath: string): boolean => {
    const targetPath = path.join(projectDir, 'package.json');
    const patch = JSON.parse(fs.readFileSync(stagedPkgPath, 'utf8')) as Record<string, any>;
    const pkg: Record<string, any> = fs.existsSync(targetPath)
        ? JSON.parse(fs.readFileSync(targetPath, 'utf8'))
        : { name: path.basename(projectDir), version: '0.0.0' };

    for (const bucket of DEP_BUCKETS) {
        if (patch[bucket]) pkg[bucket] = { ...(pkg[bucket] || {}), ...patch[bucket] };
    }
    if (patch.scripts) pkg.scripts = { ...(pkg.scripts || {}), ...patch.scripts };

    fs.writeFileSync(targetPath, JSON.stringify(pkg, null, 2) + '\n');
    return true;
};

/**
 * Merge an assembled template tree into an existing project.
 * - root package.json contributes dep buckets + scripts (never overwrites name/version),
 * - existing files are left untouched unless `force` is set (and reported as skipped).
 */
export const mergeTree = (
    staging: string,
    projectDir: string,
    opts: { force?: boolean } = {}
): MergeReport => {
    const report: MergeReport = { created: [], skipped: [], packageJsonMerged: false };

    for (const file of walkFiles(staging)) {
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
