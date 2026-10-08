// Revision 4 of PREREGISTER-h40d = revision 3 + the re-check's MAIN set of verbatim edits (RECHECK-r3.md, "The main
// set", recheck-r3-scratch/recheck-r3-edits.txt), applied in order, each OLD exactly once at the moment it is applied.
// The conditional sets (veto6, cap) are NOT applied: they wait for the user's decision items 7 and 8.
// Independent check: the result must equal the re-checker's own edited copy (recheck-r3-scratch/r3-with-recheck-edits.md)
// byte for byte before the revision-4 note is added. Writes PREREGISTER-h40d.r4.md only; r3 is never touched.
//   node make-r4.mjs "<note line>"
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const VH = path.dirname(fileURLToPath(import.meta.url));
const note = process.argv[2];
if (!note) { console.log('usage: make-r4.mjs "<note line>"'); process.exit(2); }
const r3 = fs.readFileSync(path.join(VH, 'PREREGISTER-h40d.r3.md'), 'utf8');
const spec = fs.readFileSync(path.join(VH, 'recheck-r3-scratch', 'recheck-r3-edits.txt'), 'utf8').replace(/\r\n/g, '\n');
const edits = []; let cur = null, mode = null;
for (const line of spec.split('\n')) {
    if (line.startsWith('=== OLD')) { cur = { name: line.slice(7).trim(), old: [], neu: [] }; mode = 'old'; continue; }
    if (line === '=== NEW') { mode = 'new'; continue; }
    if (line === '=== END') { edits.push({ name: cur.name, old: cur.old.join('\n'), neu: cur.neu.join('\n') }); cur = null; mode = null; continue; }
    if (mode === 'old') cur.old.push(line); else if (mode === 'new') cur.neu.push(line);
    else if (line.trim()) { console.log(`REFUSED: stray text in the edits file: ${line.slice(0, 60)}`); process.exit(3); }
}
let text = r3;
for (const e of edits) {
    const n = text.split(e.old).length - 1;
    if (n !== 1) { console.log(`REFUSED: ${e.name}: OLD occurs ${n} times at application`); process.exit(3); }
    text = text.replace(e.old, () => e.neu);
}
const theirs = fs.readFileSync(path.join(VH, 'recheck-r3-scratch', 'r3-with-recheck-edits.md'), 'utf8');
const h = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
console.log(`edits applied: ${edits.length}; result sha256/16 ${h(text)}; the re-checker's copy ${h(theirs)}: ${text === theirs ? 'IDENTICAL' : 'DIFFERENT'}`);
if (text !== theirs) { console.log('REFUSED: my application differs from the re-checker\'s copy'); process.exit(4); }
// the revision note goes right after the title line
const nl = text.indexOf('\n');
const r4 = `${text.slice(0, nl + 1)}\n${note}\n${text.slice(nl + 1)}`;
const out = path.join(VH, 'PREREGISTER-h40d.r4.md');
if (fs.existsSync(out)) { console.log(`REFUSED: ${out} exists`); process.exit(5); }
fs.writeFileSync(out, r4);
console.log(`wrote ${out}: ${r4.split('\n').length} lines, sha256/16 ${h(r4)}`);
