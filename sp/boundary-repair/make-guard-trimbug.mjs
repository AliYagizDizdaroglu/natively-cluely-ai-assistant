// Throwaway: guard-br1-trimbug.mjs = guard-br1.mjs with the pre-fix status line (through git(), whose .trim()
// eats the first line's leading space), so cal-guard-pre.mjs can show it FAILS the golden-only case.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('./guard-br1.mjs', import.meta.url), 'utf8');
const FIXED = "const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no', '--', 'electron', 'src', 'scripts', 'package.json'], { cwd: PROJ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })\n        .split('\\n').filter((l) => l.trim() && !l.slice(3).startsWith('electron/test/golden/'));";
const BUGGY = "const dirty = git('status', '--porcelain', '--untracked-files=no', '--', 'electron', 'src', 'scripts', 'package.json')\n        .split('\\n').filter((l) => l && !l.slice(3).startsWith('electron/test/golden/'));";
if (src.split(FIXED).length !== 2) { console.log('REFUSED: the fixed line is not in guard-br1.mjs exactly once'); process.exit(1); }
fs.writeFileSync(new URL('./guard-br1-trimbug.mjs', import.meta.url), src.replace(FIXED, BUGGY));
console.log('wrote guard-br1-trimbug.mjs');
