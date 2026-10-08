// Step 9: copy the flight-eq texts byte-identical into MAIN electron/test/golden/passes/ under their committed names.
// Refuses an existing target, a CR byte, or a missing folder. Prints name + sha256/12.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const E = path.dirname(fileURLToPath(import.meta.url));
const PASSES = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\electron\\test\\golden\\passes';
const MAP = [
  ['PREREGISTER-flight-eq.md', 'PREREGISTER-flight-eq.md'],
  ...[1, 2, 3, 4, 5, 6].map((n) => [`AMENDMENT-A${n}.md`, `flight-eq-AMENDMENT-A${n}.md`]),
  ['NOTE-controller-tools-2026-10-05.md', 'flight-eq-NOTE-controller-tools.md'],
  ['NOTE-b10-rev7-A1.md', 'flight-eq-NOTE-b10-rev7-A1.md'],
  ['USER-RULING-4c.txt', 'flight-eq-USER-RULING-4c.md'],
];
if (!fs.existsSync(PASSES)) { console.log('REFUSED: passes folder missing'); process.exit(2); }
for (const [src, dst] of MAP) {
  const b = fs.readFileSync(path.join(E, src));
  if (b.includes(13)) { console.log(`REFUSED: CR in ${src}`); process.exit(2); }
  const t = path.join(PASSES, dst);
  if (fs.existsSync(t)) { console.log(`REFUSED: ${dst} exists`); process.exit(2); }
  fs.writeFileSync(t, b);
  console.log(`${createHash('sha256').update(b).digest('hex').slice(0, 12)} ${dst}`);
}
console.log(`PASSES ${MAP.map(([, d]) => d).join(',')}`);
