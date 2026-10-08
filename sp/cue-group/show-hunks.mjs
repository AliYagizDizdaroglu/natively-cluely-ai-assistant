// Throwaway: print each conflict hunk (with 3 lines of context above) of one file in a merge-tree result tree.
//   node show-hunks.mjs <tree> <file> [maxLinesPerSide]
import { execFileSync } from 'node:child_process';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const [tree, file, maxArg] = process.argv.slice(2);
const max = Number(maxArg ?? 40);
const L = execFileSync('git', ['show', `${tree}:${file}`], { cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n');
let i = 0, h = 0;
while (i < L.length) {
    if (!L[i].startsWith('<<<<<<< ')) { i++; continue; }
    h++;
    const start = i;
    let mid = -1, base = -1, end = -1;
    for (let j = i + 1; j < L.length; j++) {
        if (L[j].startsWith('||||||| ') && base < 0) base = j;
        else if (L[j] === '=======' && mid < 0) mid = j;
        else if (L[j].startsWith('>>>>>>> ')) { end = j; break; }
    }
    console.log(`\n### hunk ${h} at line ${start + 1} (${file})`);
    for (let k = Math.max(0, start - 3); k < start; k++) console.log(`  ${L[k]}`);
    const ours = L.slice(start + 1, base >= 0 ? base : mid), theirs = L.slice(mid + 1, end);
    console.log(`  <<<<<<< OURS (cue branch) ${ours.length} lines`);
    ours.slice(0, max).forEach((l) => console.log(`  ${l}`)); if (ours.length > max) console.log(`  ... (${ours.length - max} more)`);
    console.log(`  ======= THEIRS (MAIN) ${theirs.length} lines`);
    theirs.slice(0, max).forEach((l) => console.log(`  ${l}`)); if (theirs.length > max) console.log(`  ... (${theirs.length - max} more)`);
    i = end + 1;
}
