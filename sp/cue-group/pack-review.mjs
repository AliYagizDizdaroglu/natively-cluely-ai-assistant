// Joins a diff stat and a diff (written by plain git commands, because the worktree guard refuses compound git lines)
// into ONE review package file with a header, and prints its size and the files it covers. The reviewer reads it in
// one call.
//   node pack-review.mjs <title> <stat.txt> <diff.txt> <out.diff>
import fs from 'node:fs';
const [title, statF, diffF, out] = process.argv.slice(2);
const stat = fs.readFileSync(statF, 'utf8'), diff = fs.readFileSync(diffF, 'utf8');
if (!diff.trim()) throw new Error('the diff is empty');
const files = [...diff.matchAll(/^diff --git a\/(\S+) /gm)].map((m) => m[1]);
fs.writeFileSync(out, `# Review package: ${title}\n\n## Files changed\n${stat}\n## Diff\n${diff}`);
console.log(`${out.split(/[\\/]/).pop()}: ${fs.statSync(out).size} bytes; files: ${files.join(', ')}`);
