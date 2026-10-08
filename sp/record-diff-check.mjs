// Throwaway: compares a regenerated pass record with its committed version, line by line. The
// grader-model change may alter only: the "| grader |" header, the "| run folder |" line (a copy
// lives elsewhere), and "- Arm …" summary lines that gain exactly " · grader <x>". Anything else is listed.
//   node record-diff-check.mjs <worktree> <path relative to it>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [wt, rel] = process.argv.slice(2);
const oldT = execFileSync('git', ['-C', wt, 'show', `HEAD:${rel}`], { encoding: 'utf8' }).split(/\r?\n/);
const newT = fs.readFileSync(path.join(wt, rel), 'utf8').split(/\r?\n/);
const header = [], armSuffix = {}, other = [];
let folder = false;
if (oldT.length !== newT.length) other.push(`line count ${oldT.length} -> ${newT.length}`);
for (let i = 0; i < Math.min(oldT.length, newT.length); i++) {
    const a = oldT[i], b = newT[i];
    if (a === b) continue;
    if (a.startsWith('| grader |') && b.startsWith('| grader |')) header.push(b);
    else if (a.startsWith('| run folder |') && b.startsWith('| run folder |')) folder = true;
    else if (a.startsWith('- Arm ') && b.startsWith(`${a} · grader `)) { const g = b.slice(`${a} · grader `.length); armSuffix[g] = (armSuffix[g] ?? 0) + 1; }
    else other.push(`${i + 1}: ${a.slice(0, 90)} ||| ${b.slice(0, 90)}`);
}
console.log(`  header now: ${header.join(' / ') || '(unchanged)'}`);
console.log(`  run-folder line changed: ${folder}`);
console.log(`  arm lines that only gained a grader suffix: ${JSON.stringify(armSuffix)}`);
console.log(`  other differing lines: ${other.length}${other.length ? '\n    ' + other.slice(0, 6).join('\n    ') : ''}`);
