// Builder B scratch (read-only): which of my files hold a NON-ASCII character, where, and as which bytes?
// Prints file names, line numbers and code points only. (A tool layer may turn a backslash-u escape in what I write into
// the literal character; this scan finds out what actually landed on disk.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.resolve(HERE, '..');
const files = [
    path.join(VH, 'h40d-twins.mjs'),
    ...fs.readdirSync(HERE).filter((f) => /^B-.*\.(mjs|txt)$/.test(f)).map((f) => path.join(HERE, f)),
];
for (const f of files) {
    const buf = fs.readFileSync(f);
    const text = buf.toString('utf8');
    const bom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const hits = [];
    text.split('\n').forEach((line, i) => { for (const ch of line) if (ch.codePointAt(0) > 127) { hits.push(`${i + 1}:U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`); } });
    const escapes = (text.match(/\\u[0-9a-fA-F]{4}/g) || []).length;
    console.log(`${path.relative(VH, f).padEnd(40)} bytes ${String(buf.length).padStart(6)}  BOM ${bom}  CR ${buf.includes(13)}  non-ASCII chars ${hits.length}${hits.length ? ` [${[...new Set(hits.map((h) => h.split(':')[1]))].join(' ')}] first at lines ${hits.slice(0, 6).map((h) => h.split(':')[0]).join(',')}` : ''}  literal backslash-u escapes in the text: ${escapes}`);
}
