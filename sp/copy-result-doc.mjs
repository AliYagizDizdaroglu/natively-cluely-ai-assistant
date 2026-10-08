// Throwaway: copy the replay result note from the stage into MAIN (Node handles the >260-char source path).
import fs from 'node:fs';
const src = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/stage/electron/test/golden/passes/2026-09-26-followup-replay-result.md';
const dst = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/passes/2026-09-26-followup-replay-result.md';
const text = fs.readFileSync(src, 'utf8');
if (!text.startsWith('# Follow-up parent replay result')) { console.error('REFUSED: source head is not the result note'); process.exit(1); }
fs.writeFileSync(dst, text.replace(/\r\n/g, '\n'));
const back = fs.readFileSync(dst, 'utf8');
console.log(`written ${Buffer.byteLength(back)} bytes; identical to source: ${back === text}`);
