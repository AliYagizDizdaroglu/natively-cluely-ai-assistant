// Copies AMENDMENT-A7.md byte-identical into MAIN passes/ as flight-eq-AMENDMENT-A7.md. Refuses an existing target or a CR byte.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const E = path.dirname(fileURLToPath(import.meta.url));
const PASSES = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\electron\\test\\golden\\passes';
const b = fs.readFileSync(path.join(E, 'AMENDMENT-A7.md'));
if (b.includes(13)) { console.log('REFUSED: CR'); process.exit(2); }
const t = path.join(PASSES, 'flight-eq-AMENDMENT-A7.md');
if (fs.existsSync(t)) { console.log('REFUSED: exists'); process.exit(2); }
fs.writeFileSync(t, b);
console.log(`${createHash('sha256').update(b).digest('hex')} flight-eq-AMENDMENT-A7.md`);
