// Throwaway: top-level files in MAIN's electron/test/golden that the whole-turn worktree lacks, with
// size and whether git tracks them in MAIN (untracked = a local asset a worktree never gets by checkout).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const rel = 'electron/test/golden';
const files = (root) => new Set(fs.readdirSync(path.join(root, rel), { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name));
const inMain = files(MAIN);
const inWt = files(WT);
const tracked = new Set(execFileSync('git', ['-C', MAIN, 'ls-files', rel], { encoding: 'utf8' }).split('\n').filter(Boolean).map((p) => path.posix.basename(p)));
const missing = [...inMain].filter((f) => !inWt.has(f)).sort();
for (const f of missing) {
    const st = fs.statSync(path.join(MAIN, rel, f));
    console.log(`${tracked.has(f) ? 'tracked  ' : 'untracked'}  ${String(st.size).padStart(11)}  ${st.mtime.toISOString().slice(0, 16)}  ${f}`);
}
console.log(`${missing.length} missing of ${inMain.size} in MAIN`);
