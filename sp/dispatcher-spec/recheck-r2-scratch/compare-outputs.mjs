// RECHECK THROWAWAY: compares every file the re-run wrote (recheck-r2-scratch/run/x/r2) with the saved original
// (DS/r2). Prints, per file: identical / differs (with the differing line pairs, capped) / missing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIG = path.resolve(HERE, '..', 'r2');
const NEW = path.join(HERE, 'run', 'x', 'r2');
const names = [...new Set([...fs.readdirSync(ORIG), ...fs.readdirSync(NEW)])].filter((n) => /^(out-|fx-)/.test(n)).sort();
let same = 0, differ = 0;
for (const n of names) {
  const a = path.join(ORIG, n), b = path.join(NEW, n);
  if (!fs.existsSync(a)) { console.log(`ONLY-NEW  ${n}`); continue; }
  if (!fs.existsSync(b)) { console.log(`ONLY-ORIG ${n}`); continue; }
  const A = fs.readFileSync(a, 'utf8'), B = fs.readFileSync(b, 'utf8');
  if (A === B) { same++; continue; }
  differ++;
  const al = A.split(/\r?\n/), bl = B.split(/\r?\n/);
  console.log(`DIFFERS   ${n}  (${al.length} vs ${bl.length} lines)`);
  if (/\.json$/.test(n)) continue;
  let shown = 0;
  for (let i = 0; i < Math.max(al.length, bl.length) && shown < 12; i++) {
    if (al[i] !== bl[i]) { shown++; console.log(`  L${i + 1}\n    orig: ${(al[i] ?? '<none>').slice(0, 220)}\n    new:  ${(bl[i] ?? '<none>').slice(0, 220)}`); }
  }
}
console.log(`\n${names.length} files: ${same} identical, ${differ} differ`);
