// RECHECK THROWAWAY: structural diff of a saved r2 fixture against the re-built one (top-level keys, array lengths,
// first differing element per key). Prints keys and counts only, never transcript text beyond 60 chars.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIG = path.resolve(HERE, '..', 'r2');
const NEW = path.join(HERE, 'run', 'x', 'r2');
for (const n of ['fx-cuesmoke2-raw.json', 'fx-cuesmoke2-off.json', 'fx-s50e-raw.json', 'fx-s50e-off.json', 'fx-s50g-raw.json', 'fx-s50g-off.json']) {
  const a = JSON.parse(fs.readFileSync(path.join(ORIG, n), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(NEW, n), 'utf8'));
  console.log(`== ${n}`);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  for (const k of keys) {
    const A = JSON.stringify(a[k]), B = JSON.stringify(b[k]);
    if (A === B) continue;
    if (Array.isArray(a[k]) && Array.isArray(b[k])) {
      let i = 0; while (i < Math.min(a[k].length, b[k].length) && JSON.stringify(a[k][i]) === JSON.stringify(b[k][i])) i++;
      console.log(`  ${k}: len ${a[k].length} vs ${b[k].length}; first diff at [${i}]\n    orig: ${JSON.stringify(a[k][i])?.slice(0, 300)}\n    new:  ${JSON.stringify(b[k][i])?.slice(0, 300)}`);
    } else console.log(`  ${k}: ${A?.slice(0, 200)} vs ${B?.slice(0, 200)}`);
  }
}
