// Throwaway (Task 3, fix round 1): splice the fix-round-1 text into sdd\task-3-report.md. The text lives in two files written with
// the Write tool (it keeps backslashes and escapes literal; the Edit tool does not), so nothing is typed into this script:
//   t3-r1-report-pointer.md   inserted as its own paragraph right before the line that starts with "`BR` = "
//   t3-r1-report-section.md   appended at the end
// Refuses to run twice (the report already holds "## 12. Fix round 1"), and when the pointer anchor is not exactly one line.
//   node t3-r1-append-report.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.join(HERE, 'task-3-report.md');
const report = fs.readFileSync(REPORT, 'utf8');
if (report.includes('## 12. Fix round 1')) { console.log('REFUSED: the report already has section 12'); process.exit(1); }
if (report.includes('\r')) { console.log('REFUSED: the report has CR characters'); process.exit(1); }
const pointer = fs.readFileSync(path.join(HERE, 't3-r1-report-pointer.md'), 'utf8');
const section = fs.readFileSync(path.join(HERE, 't3-r1-report-section.md'), 'utf8');
const lines = report.split('\n');
const idx = lines.map((l, i) => (l.startsWith('`BR` = ') ? i : -1)).filter((i) => i >= 0);
if (idx.length !== 1) { console.log(`REFUSED: expected exactly 1 anchor line, found ${idx.length}`); process.exit(1); }
lines.splice(idx[0], 0, ...pointer.replace(/\n+$/, '').split('\n'), '');
let out = lines.join('\n');
if (!out.endsWith('\n')) out += '\n';
out += section;
fs.writeFileSync(REPORT, out);
console.log(`report: ${Buffer.byteLength(report)} B -> ${Buffer.byteLength(out)} B; pointer inserted before line ${idx[0] + 1}; section 12 appended (${Buffer.byteLength(section)} B)`);
