// Scratch mirror of MAIN's electron/ (golden: top-level files only + the s50a run folder) to mutate freely.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const M = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const R = path.join(SPR, 'mirror');
const GOLDEN = path.join(M, 'electron', 'test', 'golden');
let n = 0;
const copyDir = (a, b) => {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    const s = path.join(a, e.name), d = path.join(b, e.name);
    if (e.isDirectory()) {
      if (s === GOLDEN) { copyGolden(s, d); continue; }
      if (e.name === 'node_modules') continue;
      copyDir(s, d);
    } else if (e.isFile()) { fs.copyFileSync(s, d); n++; }
  }
};
const copyGolden = (a, b) => {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    const s = path.join(a, e.name);
    if (e.isFile() && fs.statSync(s).size < 5_000_000) { fs.copyFileSync(s, path.join(b, e.name)); n++; }
  }
  copyDir(path.join(a, 'interview60.runs', '2026-09-09T15-00-55-s50a'), path.join(b, 'interview60.runs', '2026-09-09T15-00-55-s50a'));
};
if (fs.existsSync(R)) throw new Error('mirror exists (holds a junction to MAIN node_modules) - remove the junction with cmd rmdir first');
copyDir(path.join(M, 'electron'), path.join(R, 'electron'));
for (const f of ['package.json', 'tsconfig.json', 'vitest.config.ts']) { fs.copyFileSync(path.join(M, f), path.join(R, f)); n++; }
execFileSync('cmd', ['/c', 'mklink', '/J', path.join(R, 'node_modules'), path.join(M, 'node_modules')], { stdio: 'inherit' });
console.log('copied', n, 'files to', R);
