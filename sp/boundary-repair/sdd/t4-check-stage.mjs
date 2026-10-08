// Task 4 pre-edit check: for each of the 4 files Task 4 modifies, is the staged copy byte-identical to MAIN's
// current file (size + sha256), and does MAIN's size match the brief's starting size? Read-only.
//   node t4-check-stage.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'stage');
const FILES = [
    ['electron/audio/DeepgramStreamingSTT.ts', 14831],
    ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 5096],
    ['electron/audio/deepgramKeyterms.ts', 5404],
    ['electron/audio/deepgramKeyterms.test.ts', 2846],
];
const sha = (b) => createHash('sha256').update(b).digest('hex');
let bad = 0;
for (const [rel, briefSize] of FILES) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const s = fs.readFileSync(path.join(STAGE, rel));
    const same = m.length === s.length && sha(m) === sha(s);
    const sizeOk = m.length === briefSize;
    const cr = m.filter((x) => x === 13).length;
    if (!same || !sizeOk) bad++;
    console.log(`${rel}\n  MAIN  ${m.length} B  sha256 ${sha(m)}  CR=${cr}\n  STAGE ${s.length} B  sha256 ${sha(s)}\n  stage==MAIN: ${same ? 'IDENTICAL' : 'DIFFERENT'}   MAIN size vs brief ${briefSize}: ${sizeOk ? 'MATCH' : 'MISMATCH'}`);
}
process.exit(bad ? 1 : 0);
