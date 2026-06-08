/** Normalize a string to a valid-ish npm package name. */
export const normalizePackageName = (raw: string): string =>
    (raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
