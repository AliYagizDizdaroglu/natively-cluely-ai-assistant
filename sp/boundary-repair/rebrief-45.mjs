// Throwaway (2026-09-29 ~22:05): rebuild the Task 4/5 briefs from PLAN-v4.md after Fable's erratum pass (M-d revert
// text, the M-a module constraint), then correct the one count that follows the plan's "v2" TEST where the tree has
// the "v2" EXPECT inside the "twenty five" test (Task 3 review, fix round 1): deepgramBoundaryRepair has 68 tests.
//   node rebrief-45.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const here = new URL('./', import.meta.url);
for (const n of [4, 5]) {
    fs.rmSync(new URL(`sdd/task-${n}-brief.md`, here), { force: true });
    execFileSync(process.execPath, ['task-brief.mjs', 'PLAN-v4.md', String(n), `sdd/task-${n}-brief.md`], { cwd: here });
}
execFileSync(process.execPath, ['brief-with-constraints.mjs', '4', '5'], { cwd: here, stdio: 'inherit' });
const f = new URL('sdd/task-4-brief.md', here);
const t = fs.readFileSync(f, 'utf8');
const from = '`deepgramBoundaryRepair` 69,';
const n69 = t.split(from).length - 1;
if (n69 !== 1) { console.log(`REFUSED: expected exactly one "${from}", found ${n69}`); process.exit(3); }
fs.writeFileSync(f, t.replace(from, '`deepgramBoundaryRepair` 68 (controller: the tree puts the "v2" digit pin INSIDE the "twenty five" test per the Task 3 review, so the file has 68 tests, not the plan\'s 69),'));
console.log('task 4: count 69 -> 68 corrected');
for (const g of ['sdd/task-4-brief.new.md', 'sdd/task-5-brief.new.md', 'sdd/_t4old.md', 'sdd/_t5old.md']) fs.rmSync(new URL(g, here), { force: true });
