// Copies router40's registration, amendments, re-checks, rulings and result texts byte-identical into MAIN passes/.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R = path.dirname(fileURLToPath(import.meta.url));
const PASSES = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\electron\\test\\golden\\passes';
const SRC = ['PREREGISTER-router40.md', 'PREREG-REVIEW.md', ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `AMENDMENT-A${n}.md`),
  'A1-RECHECK.md', 'A2-RECHECK.md', 'A3-RECHECK.md', 'A5-RECHECK.md', 'A8-RECHECK.md', 'HARNESS-REVIEW.md', 'A8-PRECONDITIONS-REVIEW.md',
  'USER-RULINGS.txt', 'RESULT-router40.md', 'RESULT-router40-ADDENDUM.md', 'RESULT-router40-REVIEW.md'];
const out = [];
for (const s of SRC) {
  const p = path.join(R, s);
  if (!fs.existsSync(p)) { console.log(`SKIP missing ${s}`); continue; }
  const d = `2026-10-06-router40-${s.replace(/\.txt$/, '.md')}`;
  const t = path.join(PASSES, d);
  if (fs.existsSync(t)) { console.log(`REFUSED: ${d} exists`); process.exit(2); }
  const b = fs.readFileSync(p);
  fs.writeFileSync(t, b);
  out.push(`electron/test/golden/passes/${d}`);
  console.log(`${createHash('sha256').update(b).digest('hex').slice(0, 12)} ${d}`);
}
fs.writeFileSync(path.join(R, 'result-copy.paths.txt'), out.join('\n') + '\n');
console.log(`${out.length} paths`);
