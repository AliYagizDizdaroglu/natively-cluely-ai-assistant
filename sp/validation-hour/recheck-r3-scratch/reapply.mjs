// Re-check r3, step 1: re-apply r3-edits.txt to revision 2 IN MEMORY (never writing r3), with {{TIME}} = the header
// time r3 carries, and compare with the r3 file byte for byte. If equal, r3 = r2 + exactly these edits.
// Also: for each edit, report where its NEW lands in r3 (line number) and the OLD's line in r2.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.dirname(HERE);
const r2 = fs.readFileSync(path.join(VH, 'PREREGISTER-h40d.md'), 'utf8');
const r3 = fs.readFileSync(path.join(VH, 'PREREGISTER-h40d.r3.md'), 'utf8');
const spec = fs.readFileSync(path.join(VH, 'r3-scratch', 'r3-edits.txt'), 'utf8').replace(/\r\n/g, '\n');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
console.log(`r2 sha ${sha(r2)} lines ${r2.split('\n').length}; r3 sha ${sha(r3)} lines ${r3.split('\n').length}`);
console.log(`r2 has CR: ${r2.includes('\r')}; r3 has CR: ${r3.includes('\r')}`);

const edits = [];
let cur = null, mode = null;
for (const line of spec.split('\n')) {
    if (line.startsWith('=== OLD')) { cur = { name: line.slice(7).trim(), old: [], new: [] }; mode = 'old'; continue; }
    if (line === '=== NEW') { mode = 'new'; continue; }
    if (line === '=== END') { edits.push(cur); cur = null; mode = null; continue; }
    if (mode === 'old') cur.old.push(line); else if (mode === 'new') cur.new.push(line);
}
const m = r3.match(/written 2026-10-01 about (\d\d:\d\d) local/);
const TIME = m ? m[1] : '??:??';
console.log(`edits parsed: ${edits.length}; header time in r3: ${TIME}`);
let text = r2;
const lineOf = (s, idx) => s.slice(0, idx).split('\n').length;
for (const e of edits) {
    const oldS = e.old.join('\n'), newS = e.new.join('\n').replace(/\{\{TIME\}\}/g, TIME);
    const n = text.split(oldS).length - 1;
    const r2n = r2.split(oldS).length - 1;
    const r2line = r2n === 1 ? lineOf(r2, r2.indexOf(oldS)) : `(${r2n} in r2)`;
    if (n !== 1) { console.log(`FAIL ${e.name}: OLD occurs ${n} times`); process.exit(1); }
    text = text.replace(oldS, () => newS);
    const r3n = r3.split(newS).length - 1;
    console.log(`${e.name.padEnd(55)} r2 line ${String(r2line).padEnd(6)} NEW in r3: ${r3n === 1 ? 'line ' + lineOf(r3, r3.indexOf(newS)) : r3n + ' times'}`);
}
console.log(`re-applied text sha ${sha(text)}; equal to r3: ${text === r3}`);
if (text !== r3) {
    const a = text.split('\n'), b = r3.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { console.log(`first difference at line ${i + 1}`); break; }
}
