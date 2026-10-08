// Throwaway: node port of the SDD skill's scripts/task-brief (the session guard refuses `bash <script>`).
// Extracts one task's full text (heading "### Task N" up to the next task heading outside code fences).
//   node task-brief.mjs <plan> <N> <outfile>
import fs from 'node:fs';
const [plan, n, out] = process.argv.slice(2);
let inFence = false, inTask = false;
const keep = [];
for (const line of fs.readFileSync(plan, 'utf8').split('\n')) {
    if (/^```/.test(line)) inFence = !inFence;
    if (!inFence && /^#+[ \t]+Task[ \t]+[0-9]+/.test(line)) inTask = new RegExp(`^#+[ \\t]+Task[ \\t]+${n}([^0-9]|$)`).test(line);
    // The plan's closing sections are not tasks: stop at the next level-2 heading outside a fence.
    if (!inFence && /^## /.test(line)) inTask = false;
    if (inTask) keep.push(line);
}
if (!keep.length) { console.log(`task ${n} not found in ${plan}`); process.exit(3); }
fs.writeFileSync(out, keep.join('\n') + '\n');
console.log(`${out}: ${keep.length} lines`);
