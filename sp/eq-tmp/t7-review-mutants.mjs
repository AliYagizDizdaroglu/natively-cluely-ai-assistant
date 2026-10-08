// Task 7 review: run turnDispatch.test.ts on the clean file and on three mutants; restore byte-identical.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const WT = MAIN + '\\.claude\\worktrees\\eq-build';
const file = WT + '\\electron\\services\\turnDispatch.ts';
const orig = readFileSync(file);
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const run = (label) => {
  const r = spawnSync(process.execPath, [MAIN + '\\node_modules\\vitest\\vitest.mjs', 'run', 'electron/services/turnDispatch.test.ts', '--root', WT], { cwd: process.cwd(), encoding: 'utf8' });
  const out = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, '');
  const tests = out.split('\n').filter((l) => /Tests\s+\d/.test(l)).join(' ').trim();
  const fails = out.split('\n').filter((l) => /^\s*(×|FAIL)/.test(l)).map((l) => l.trim()).slice(0, 6);
  console.log(`${label}: exit=${r.status} ${tests}`);
  for (const f of fails) console.log('   ' + f);
};
const src = orig.toString('utf8');
const anchor = "...(turnId != null ? { turnId } : {})";
if (src.split(anchor).length !== 2) { console.log('ANCHOR NOT UNIQUE'); process.exit(2); }
try {
  run('clean');
  const mutants = [
    ['M1 spread dropped', ''],
    ['M2 truthy (turnId ?)', '...(turnId ? { turnId } : {})'],
    ['M3 unconditional key', '...{ turnId }'],
  ];
  for (const [label, rep] of mutants) {
    writeFileSync(file, src.replace(anchor, rep), 'utf8');
    run(label);
  }
} finally {
  writeFileSync(file, orig);
  console.log('restored sha ' + sha(readFileSync(file)) + ' orig ' + sha(orig));
}
