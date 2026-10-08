// Copies the approved spec byte-identical into MAIN docs/superpowers/specs/. Refuses an existing target or a CR byte.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const D = path.dirname(fileURLToPath(import.meta.url));
const T = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\docs\\superpowers\\specs\\2026-10-06-live-router-default-design.md';
const b = fs.readFileSync(path.join(D, 'SPEC.md'));
if (b.includes(13)) { console.log('REFUSED: CR'); process.exit(2); }
if (fs.existsSync(T)) { console.log('REFUSED: exists'); process.exit(2); }
fs.mkdirSync(path.dirname(T), { recursive: true });
fs.writeFileSync(T, b);
console.log(`${createHash('sha256').update(b).digest('hex')} docs/superpowers/specs/2026-10-06-live-router-default-design.md`);
