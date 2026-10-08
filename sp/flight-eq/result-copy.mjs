// Copies the result note, the arming record and the re-check texts byte-identical into MAIN passes/. Refuses an existing target.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const E = path.dirname(fileURLToPath(import.meta.url));
const PASSES = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\electron\\test\\golden\\passes';
const MAP = [
  ['RESULT-flight-eq.md', 'flight-eq-RESULT.md'],
  ['ARMING-flight-eq.md', 'flight-eq-ARMING.md'],
  ['REVIEW-1.md', 'flight-eq-REVIEW-1.md'],
  ...['A2', 'A3', 'A4', 'A5', 'A6', 'A7'].map((a) => [`${a}-RECHECK.md`, `flight-eq-${a}-RECHECK.md`]),
  ['NOTE-post-hour-tools-2026-10-06.md', 'flight-eq-NOTE-post-hour-tools.md'],
  ['NOTE-post-hour-tools-2026-10-06-addendum.md', 'flight-eq-NOTE-post-hour-tools-addendum.md'],
  ['NOTE-post-hour-tools-2026-10-06-addendum-2.md', 'flight-eq-NOTE-post-hour-tools-addendum-2.md'],
  ['instruments.sha256.txt', 'flight-eq-instruments.sha256.txt'],
];
const out = [];
for (const [src, dst] of MAP) {
  const p = path.join(E, src);
  if (!fs.existsSync(p)) { console.log(`SKIP missing ${src}`); continue; }
  const t = path.join(PASSES, dst);
  if (fs.existsSync(t)) { console.log(`REFUSED: ${dst} exists`); process.exit(2); }
  const b = fs.readFileSync(p);
  fs.writeFileSync(t, b);
  out.push(`electron/test/golden/passes/${dst}`);
  console.log(`${createHash('sha256').update(b).digest('hex').slice(0, 12)} ${dst}`);
}
console.log('PATHS ' + out.join(','));
