import * as fs from 'fs';
import * as path from 'path';
import { PackageJsonPatch } from './types';

/** Shallow-merge object fields (deps, scripts, ...) of a patch into the project's package.json. */
export const mergePackageJson = (projectDir: string, patch?: PackageJsonPatch): void => {
    if (!patch) return;
    const pkgPath = path.join(projectDir, 'package.json');
    const pkg: Record<string, unknown> = fs.existsSync(pkgPath)
        ? (JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>)
        : {};
    for (const [key, value] of Object.entries(patch)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            pkg[key] = { ...((pkg[key] as object) || {}), ...(value as object) };
        } else {
            pkg[key] = value;
        }
    }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
};
