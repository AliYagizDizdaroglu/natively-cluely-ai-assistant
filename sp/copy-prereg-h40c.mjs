// Throwaway: copy the staged PREREGISTER-h40c.md into MAIN (node handles the long stage path), LF, no BOM.
import fs from 'node:fs';
const src = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/stage/electron/test/golden/passes/PREREGISTER-h40c.md';
const dst = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/passes/PREREGISTER-h40c.md';
if (fs.existsSync(dst)) { console.error('REFUSED: MAIN already has PREREGISTER-h40c.md'); process.exit(1); }
const text = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
if (!text.startsWith('# Pre-registration: flight h40c')) { console.error('REFUSED: unexpected head'); process.exit(1); }
if (/[\u00c2\u00c3]\u0080|\u00e2\u20ac/.test(text)) { console.error('REFUSED: mojibake in the source'); process.exit(1); }
fs.writeFileSync(dst, text);
console.log(`written ${Buffer.byteLength(text)} bytes; identical: ${fs.readFileSync(dst, 'utf8') === text}`);
