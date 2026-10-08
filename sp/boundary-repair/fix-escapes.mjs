// Throwaway (2026-09-29): the Edit tool turned the typed "́" escapes in check-v4.mjs into real combining
// characters (U+0301). Put the 6-character escape text back so the decomposed-accent probe stays visible in the
// source, and report the byte counts.
import fs from 'node:fs';
const file = new URL('./check-v4.mjs', import.meta.url);
const before = fs.readFileSync(file, 'utf8');
const after = before.split('́').join('\\u0301');
fs.writeFileSync(file, after);
const raw = (after.match(/́/g) ?? []).length, literal = (after.match(/\\u0301/g) ?? []).length;
console.log(`check-v4.mjs: raw U+0301 characters ${raw} (expected 0), literal \\u0301 escapes ${literal} (expected 5: comment 1, label 2, interim 2); bytes ${Buffer.byteLength(after)}`);
