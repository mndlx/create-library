"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePackageName = void 0;
/** Normalize a string to a valid-ish npm package name. */
const normalizePackageName = (raw) => (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
exports.normalizePackageName = normalizePackageName;
