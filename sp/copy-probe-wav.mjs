// Throwaway: the harness preflight plays electron/test/golden/probe-continuous.wav, an untracked
// asset that exists only in MAIN, so a worktree run's probe could never pass. Copy it (copyFileSync:
// fs.cpSync fails silently on the Masaüstü path) and prove the copy is byte-identical.
import fs from 'node:fs';
import crypto from 'node:crypto';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const rel = 'electron/test/golden/probe-continuous.wav';
const src = `${MAIN}/${rel}`;
const dst = `${MAIN}/.claude/worktrees/whole-turn/${rel}`;
if (fs.existsSync(dst)) console.log('destination already present - not overwritten');
else fs.copyFileSync(src, dst);
const sum = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const [a, b] = [sum(src), sum(dst)];
console.log(`MAIN     ${fs.statSync(src).size} bytes  sha256 ${a.slice(0, 16)}`);
console.log(`worktree ${fs.statSync(dst).size} bytes  sha256 ${b.slice(0, 16)}`);
console.log(a === b ? 'IDENTICAL' : 'DIFFERENT');
process.exit(a === b ? 0 : 1);
