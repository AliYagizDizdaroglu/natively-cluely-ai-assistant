// Moves the replay's key files out of the graders' folder before any grader is dispatched (PREREGISTER-turn-followup.md section 1:
// "keys outside every grader's reach"), and back after the last verdict exists, before legs-decide reads them. Byte-verified;
// refuses to overwrite; refuses unless exactly 9 key files (7 front + 2 back) are found. FQ_OUT_DIR only for tests.
//   node move-keys.mjs out | back [--rerun]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.FQ_OUT_DIR ?? HERE;
const RERUN = process.argv.includes('--rerun');   // the s50k re-run's own blind folder: 5 key files (4 front + 1 back)
const BLIND = path.join(OUT, RERUN ? 'blind-rerun' : 'blind'), HOLD = `${OUT}-keyhold${RERUN ? '-rerun' : ''}`;
const EXPECTED = RERUN ? 5 : 9;
const dir = process.argv[2];
if (dir !== 'out' && dir !== 'back') { console.log('usage: move-keys.mjs out|back'); process.exit(2); }
const [from, to] = dir === 'out' ? [BLIND, HOLD] : [HOLD, BLIND];
if (!fs.existsSync(from)) { console.log(`REFUSED: ${from} does not exist`); process.exit(2); }
fs.mkdirSync(to, { recursive: true });
const keys = fs.readdirSync(from).filter((f) => /^key\.blind-\d\.json$/.test(f));
if (keys.length !== EXPECTED) { console.log(`REFUSED: expected ${EXPECTED} key files in ${from}, found ${keys.length}`); process.exit(2); }
for (const f of keys) if (fs.existsSync(path.join(to, f))) { console.log(`REFUSED: ${f} already in ${to}`); process.exit(2); }
for (const f of keys) {
    const buf = fs.readFileSync(path.join(from, f));
    fs.writeFileSync(path.join(to, f), buf);
    if (Buffer.compare(buf, fs.readFileSync(path.join(to, f))) !== 0) { console.log(`COPY MISMATCH ${f}`); process.exit(3); }
    fs.unlinkSync(path.join(from, f));
}
console.log(`moved ${keys.length} key files ${dir === 'out' ? 'OUT of' : 'BACK into'} the graders' folder; it now holds: ${fs.readdirSync(BLIND).join(', ')}`);
