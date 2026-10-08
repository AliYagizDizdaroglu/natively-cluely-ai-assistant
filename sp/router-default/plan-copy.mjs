import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const D = path.dirname(fileURLToPath(import.meta.url));
const T = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\docs\\superpowers\\plans\\2026-10-06-live-router-default.md';
const b = fs.readFileSync(path.join(D, 'PLAN.md'));
if (b.includes(13)) { console.log('REFUSED: CR'); process.exit(2); }
if (fs.existsSync(T)) { console.log('REFUSED: exists'); process.exit(2); }
fs.mkdirSync(path.dirname(T), { recursive: true });
fs.writeFileSync(T, b);
console.log(`${createHash('sha256').update(b).digest('hex')} plan`);
