// Builds PREREGISTER-h40d.r3.md from PREREGISTER-h40d.md (revision 2, never written) by applying the edits of
// r3-edits.txt IN ORDER. The edit file's format: `=== OLD <name>` / old lines / `=== NEW` / new lines / `=== END`.
// Every OLD must occur exactly once in the text at the moment it is applied, or nothing is written and the first
// failing edit is named. {{TIME}} in a NEW block is the local time of this run. Afterwards a list of strings that
// must be gone and a list that must be present are checked, and the result is written only if all hold.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.dirname(HERE);
let text = fs.readFileSync(path.join(VH, 'PREREGISTER-h40d.md'), 'utf8');
if (text.includes('\r')) { console.error('revision 2 carries CR characters; the anchors assume LF'); process.exit(1); }
const spec = fs.readFileSync(path.join(HERE, 'r3-edits.txt'), 'utf8').replace(/\r\n/g, '\n');

const edits = [];
let cur = null, mode = null;
for (const line of spec.split('\n')) {
    if (line.startsWith('=== OLD')) { cur = { name: line.slice(7).trim() || `#${edits.length + 1}`, old: [], new: [] }; mode = 'old'; continue; }
    if (line === '=== NEW') { mode = 'new'; continue; }
    if (line === '=== END') { edits.push(cur); cur = null; mode = null; continue; }
    if (mode === 'old') cur.old.push(line);
    else if (mode === 'new') cur.new.push(line);
    else if (line.trim()) { console.error(`stray text outside a block: ${line.slice(0, 60)}`); process.exit(1); }
}
const now = new Date();
const TIME = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
let applied = 0;
for (const e of edits) {
    const oldS = e.old.join('\n'), newS = e.new.join('\n').replace(/\{\{TIME\}\}/g, TIME);
    if (!oldS) { console.error(`${e.name}: empty OLD`); process.exit(1); }
    const n = text.split(oldS).length - 1;
    if (n !== 1) { console.error(`${e.name}: OLD occurs ${n} times (must be 1): ${oldS.slice(0, 80)}`); process.exit(1); }
    text = text.replace(oldS, () => newS);
    applied++;
}
const gone = ['REVISION 2', 'about 02:30 local', 'at least 44 of the 45', 'fills only its holes', 'Coaching-path answers', 'not below the smallest',
    'from the transcripts of the first agents dispatched', 'The user then chooses between', 'Neither is chosen after', 'first known case is Thursday',
    'decides rule 2 outright', 'h40a 2 — the salary', '2026-10-01T02-…-cuesmoke', 'rule 2 is reported, not gated', '(rule 1(a)–(c), 1(f))', 'grader alias at dispatch time'];
const present = ['REVISION 3', '- (g) knowledge mode not on', '2e is GATED', 'the controller\'s default, the sums with a margin of one', '3a NOISE',
    '`--only <that rep\'s transientError ids>`', 'at most 1 below the smallest', 'knowledge-mode-read.mjs', 'h40d-knowledge-lines.mjs', 'Only the user',
    '2026-10-01T02-37-41-cuesmoke', 'INCOMPLETE (more than 3 true holes', 'timeout /t 60 /nobreak', 'Technical questions answered via the coaching path'];
let bad = 0;
for (const s of gone) if (text.includes(s)) { console.error(`still present: ${s}`); bad++; }
for (const s of present) if (!text.includes(s)) { console.error(`missing: ${s}`); bad++; }
if (bad) { console.error(`${bad} post-check(s) failed; nothing written`); process.exit(1); }
const out = path.join(VH, 'PREREGISTER-h40d.r3.md');
fs.writeFileSync(out, text);
console.log(`applied ${applied} edits; wrote ${out} (${text.split('\n').length} lines, ${Buffer.byteLength(text)} bytes); header time ${TIME}`);
