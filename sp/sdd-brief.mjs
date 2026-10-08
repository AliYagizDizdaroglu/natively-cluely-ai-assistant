// Throwaway: the SDD skill's task-brief extraction (awk) in node, because plain bash here is WSL's stub.
//   node sdd-brief.mjs <plan.md> <N> <outfile>
// From the heading matching "Task N" to the next task heading; headings inside code fences are ignored.
import fs from 'node:fs';
const [plan, n, out] = process.argv.slice(2);
if (!plan || !n || !out) { console.error('usage: sdd-brief.mjs <plan.md> <N> <outfile>'); process.exit(2); }
let fence = false, intask = false;
const lines = [];
for (const line of fs.readFileSync(plan, 'utf8').split(/\r?\n/)) {
    if (/^```/.test(line)) fence = !fence;
    if (!fence && /^#+[ \t]+Task[ \t]+[0-9]+/.test(line)) intask = new RegExp(`^#+[ \\t]+Task[ \\t]+${n}([^0-9]|$)`).test(line);
    if (intask) lines.push(line);
}
if (!lines.length) { console.error(`task ${n} not found in ${plan}`); process.exit(3); }
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(`wrote ${out}: ${lines.length} lines`);
