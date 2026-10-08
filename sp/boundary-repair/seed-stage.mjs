// seed-stage.mjs (2026-09-29): seeds BR\stage with byte copies of the MAIN files PLAN-v4 modifies, so every
// implementer edit starts from MAIN's current content (the Write/Edit tools refuse MAIN paths; edits happen
// on the staged copy and go back with copy-into-main.mjs). Plain readFileSync/copyFileSync per file — the
// memory's rule for the non-ASCII MAIN path (fs.cpSync fails silently there). Prints size + sha256 prefix
// of source and copy; exits 1 on any mismatch.
//   node seed-stage.mjs            seeds the default list below
//   node seed-stage.mjs <rel>...   seeds only the given MAIN-relative paths
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'stage');
const DEFAULT = [
    'electron/audio/deepgramBoundaryRepair.ts',
    'electron/audio/deepgramBoundaryRepair.test.ts',
    'electron/audio/DeepgramStreamingSTT.ts',
    'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts',
    'electron/audio/deepgramKeyterms.ts',
    'electron/audio/deepgramKeyterms.test.ts',
    'electron/test/golden/interview60.turns-fixture.mjs',
];
const rels = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
let bad = 0;
for (const rel of rels) {
    const src = path.join(MAIN, rel), dst = path.join(STAGE, rel);
    const b = fs.readFileSync(src);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, b);
    const c = fs.readFileSync(dst);
    const ok = sha(b) === sha(c) && b.length === c.length;
    if (!ok) bad++;
    console.log(`${rel}: ${b.length} bytes, sha256 ${sha(b)} -> stage ${sha(c)} ${ok ? 'IDENTICAL' : 'DIFFERENT'}`);
}
process.exit(bad ? 1 : 0);
