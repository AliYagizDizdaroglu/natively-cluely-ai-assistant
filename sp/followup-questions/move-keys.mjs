// Moves the replay's key files out of the graders' folder before any grader is dispatched (PREREGISTER
// §5/§9: "Never show a grader a key file"), and back after the last verdict exists, before decide reads them.
// Byte-verified; refuses to overwrite; refuses unless exactly 4 key files are found.
//   node move-keys.mjs out | back
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BLIND = path.join(HERE, 'blind'), HOLD = path.join(path.dirname(HERE), 'followup-questions-keyhold');
const dir = process.argv[2];
if (dir !== 'out' && dir !== 'back') { console.log('usage: move-keys.mjs out|back'); process.exit(2); }
const [from, to] = dir === 'out' ? [BLIND, HOLD] : [HOLD, BLIND];
fs.mkdirSync(to, { recursive: true });
const keys = fs.readdirSync(from).filter((f) => /^key\.blind-\d\.json$/.test(f));
if (keys.length !== 4) { console.log(`REFUSED: expected 4 key files in ${from}, found ${keys.length}`); process.exit(2); }
for (const f of keys) if (fs.existsSync(path.join(to, f))) { console.log(`REFUSED: ${f} already in ${to}`); process.exit(2); }
for (const f of keys) {
    const buf = fs.readFileSync(path.join(from, f));
    fs.writeFileSync(path.join(to, f), buf);
    if (Buffer.compare(buf, fs.readFileSync(path.join(to, f))) !== 0) { console.log(`COPY MISMATCH ${f}`); process.exit(3); }
    fs.unlinkSync(path.join(from, f));
}
console.log(`moved ${keys.length} key files ${dir === 'out' ? 'OUT of' : 'BACK into'} the graders' folder; it now holds: ${fs.readdirSync(BLIND).join(', ')}`);
