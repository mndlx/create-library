import * as fs from 'fs';
import * as path from 'path';
import { walkFiles } from './fsx';

/* Minimal ZIP writer (method STORE, UTF-8 names) — no external dependencies. */

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};

// Buffer.concat's typing clashes with this @types/node version; isolate the cast.
const concat = (bufs: Buffer[]): Buffer => Buffer.concat(bufs as unknown as Uint8Array[]);

/** Zip every file under `srcDir` (paths relative to it). Returns the zip bytes. */
export const zipDirectory = (srcDir: string, outFile?: string): Buffer => {
    const files = walkFiles(srcDir).sort();
    const locals: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
        const rel = path.relative(srcDir, file).split(path.sep).join('/');
        const nameBuf = Buffer.from(rel, 'utf8');
        const data = fs.readFileSync(file);
        const crc = crc32(data);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); // local file header
        local.writeUInt16LE(20, 4);         // version needed
        local.writeUInt16LE(0x0800, 6);     // UTF-8 names
        local.writeUInt16LE(0, 8);          // method: store
        local.writeUInt16LE(0, 10);         // mod time
        local.writeUInt16LE(0x21, 12);      // mod date (1980-01-01)
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(data.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);
        locals.push(local, nameBuf, data);

        const cen = Buffer.alloc(46);
        cen.writeUInt32LE(0x02014b50, 0);   // central directory header
        cen.writeUInt16LE(20, 4);
        cen.writeUInt16LE(20, 6);
        cen.writeUInt16LE(0x0800, 8);
        cen.writeUInt16LE(0, 10);
        cen.writeUInt16LE(0, 12);
        cen.writeUInt16LE(0x21, 14);
        cen.writeUInt32LE(crc, 16);
        cen.writeUInt32LE(data.length, 20);
        cen.writeUInt32LE(data.length, 24);
        cen.writeUInt16LE(nameBuf.length, 28);
        cen.writeUInt32LE(offset, 42);
        central.push(cen, nameBuf);

        offset += local.length + nameBuf.length + data.length;
    }

    const centralBuf = concat(central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);      // end of central directory
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralBuf.length, 12);
    eocd.writeUInt32LE(offset, 16);

    const out = concat([...locals, centralBuf, eocd]);
    if (outFile) fs.writeFileSync(outFile, out as unknown as NodeJS.ArrayBufferView);
    return out;
};
