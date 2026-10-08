// Throwaway: conflict hunks per file in a `git merge-tree --write-tree` result tree (read-only; git show only).
//   node count-hunks.mjs <tree> <file>...
import { execFileSync } from 'node:child_process';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const [tree, ...files] = process.argv.slice(2);
let total = 0;
for (const f of files) {
    const text = execFileSync('git', ['show', `${tree}:${f}`], { cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const n = (text.match(/^<<<<<<< /gm) ?? []).length;
    total += n;
    console.log(`${String(n).padStart(3)}  ${f}  (${text.split('\n').length} lines)`);
}
console.log(`${String(total).padStart(3)}  total`);
