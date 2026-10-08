// Task 4: snapshot MAIN's four ORIGINAL files (before any Task 4 byte is copied into MAIN) into sdd\t4-orig\,
// refusing to run if a file's sha256 differs from the one t4-check-stage.mjs recorded. Also records the two
// Task 3 files' size + sha256 (they must end exactly as they are now). Read-only on MAIN.
//   node t4-snapshot-orig.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 't4-orig');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const EXPECT = {
    'electron/audio/DeepgramStreamingSTT.ts': '9584012e74a483b9e14718cb51e1e27c23d756cf1ef1c6b79555a86d21c2c177',
    'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts': '4a2b34ecd4a0c86eff98e80f4ffa292f5d4bb6e295c3f5d20f5d01676170e298',
    'electron/audio/deepgramKeyterms.ts': '3650cdb24715eb9148d9518d4e3b2c3000f477f5031134214a2c7a03808fbd4d',
    'electron/audio/deepgramKeyterms.test.ts': 'f8255145686021bcfe707e37a6e35b40db44b3d1425ea09d2673ce2a669456ec',
};
fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
for (const [rel, want] of Object.entries(EXPECT)) {
    const b = fs.readFileSync(path.join(MAIN, rel));
    const ok = sha(b) === want;
    if (!ok) bad++;
    else fs.writeFileSync(path.join(OUT, path.basename(rel)), b);
    console.log(`${ok ? 'saved  ' : 'REFUSED'} ${rel}: ${b.length} B sha256 ${sha(b)}${ok ? '' : ' (expected ' + want + ')'}`);
}
for (const rel of ['electron/audio/deepgramBoundaryRepair.ts', 'electron/audio/deepgramBoundaryRepair.test.ts']) {
    const b = fs.readFileSync(path.join(MAIN, rel));
    console.log(`Task 3 file (must stay untouched) ${rel}: ${b.length} B sha256 ${sha(b)}`);
}
process.exit(bad ? 1 : 0);
