import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readRawManifest, writeRawManifest } from './edit';
import { copyDir } from './fsx';
import { MANIFEST_FILENAME } from './manifest';
import { LoadedTemplate } from './types';

/** Local registry the CLI consumes: <root>/<name>/<version>/ holds a template snapshot. */
export const publishedRoot = (): string =>
    process.env.VLCL_PUBLISH_DIR || path.join(os.homedir(), '.virtuallab-create-library', 'published');

const parseVersion = (v: string): [number, number, number] => {
    const parts = String(v || '0.0.0').split('.').map((n) => parseInt(n, 10));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
};

/** Semver-ish compare (numeric major.minor.patch). */
export const compareVersions = (a: string, b: string): number => {
    const [a1, a2, a3] = parseVersion(a);
    const [b1, b2, b3] = parseVersion(b);
    return a1 - b1 || a2 - b2 || a3 - b3;
};

export const bumpVersion = (v: string, kind: 'patch' | 'minor' | 'major'): string => {
    const [maj, min, pat] = parseVersion(v);
    if (kind === 'major') return `${maj + 1}.0.0`;
    if (kind === 'minor') return `${maj}.${min + 1}.0`;
    return `${maj}.${min}.${pat + 1}`;
};

export interface PublishedVersion {
    name: string;
    version: string;
    dir: string;
}

/** Every published <name>/<version> snapshot, newest version first per name. */
export const listPublishedVersions = (name?: string): PublishedVersion[] => {
    const root = publishedRoot();
    const out: PublishedVersion[] = [];
    let names: string[];
    try {
        names = fs.readdirSync(root);
    } catch {
        return [];
    }
    for (const n of names) {
        if (name && n !== name) continue;
        const nameDir = path.join(root, n);
        let versions: string[];
        try {
            versions = fs.readdirSync(nameDir);
        } catch {
            continue;
        }
        for (const v of versions) {
            const dir = path.join(nameDir, v);
            if (fs.existsSync(path.join(dir, MANIFEST_FILENAME))) out.push({ name: n, version: v, dir });
        }
    }
    out.sort((a, b) => a.name.localeCompare(b.name) || compareVersions(b.version, a.version));
    return out;
};

/** The latest published snapshot per template name. */
export const latestPublishedDirs = (): string[] => {
    const latest = new Map<string, PublishedVersion>();
    for (const p of listPublishedVersions()) {
        const cur = latest.get(p.name);
        if (!cur || compareVersions(p.version, cur.version) > 0) latest.set(p.name, p);
    }
    return [...latest.values()].map((p) => p.dir);
};

export interface ExportOptions {
    /** Bump the source manifest's version before exporting. */
    bump?: 'patch' | 'minor' | 'major';
    /** Replace an already-published version instead of failing. */
    overwrite?: boolean;
}

export interface ExportResult {
    name: string;
    version: string;
    dir: string;
}

/**
 * Export (publish) a template snapshot into the local registry. The CLI
 * discovers the latest published version of each template automatically.
 */
export const exportTemplate = (template: LoadedTemplate, { bump, overwrite = false }: ExportOptions = {}): ExportResult => {
    const m = readRawManifest(template.dir);
    if (bump) {
        m.version = bumpVersion(m.version || '1.0.0', bump);
        writeRawManifest(template.dir, m);
    }
    const version = m.version || '1.0.0';
    const dest = path.join(publishedRoot(), m.name, version);
    if (fs.existsSync(dest)) {
        if (!overwrite) throw new Error(`Version ${version} of "${m.name}" is already published. Bump the version or enable overwrite.`);
        fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    copyDir(template.dir, dest);
    return { name: m.name, version, dir: dest };
};
