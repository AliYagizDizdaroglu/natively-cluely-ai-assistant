// Throwaway (task 1): the reported symptom (flight h40c R22) and the seam case, before (pass-through = raw F2, what the app
// joined) and after (the module's emitted text), plus the full sha256 of the three files now in MAIN.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { createBoundaryRepair } = createRequire(import.meta.url)(path.join(SP, 't1/built/deepgramBoundaryRepair.cjs'));
const fx = JSON.parse(fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json'), 'utf8'));

for (const [name, f] of [['symptom (h40c R22)', fx.symptom], ['seam (S2Q07 play 3)', fx.seam]]) {
    const r = createBoundaryRepair();
    console.log(`\n${name}`);
    for (const e of f.events) {
        const res = r.onTranscript(e.text, e.isFinal, e.atMs);
        console.log(`  ${e.isFinal ? 'final  ' : 'interim'} @${String(e.atMs).padStart(5)} ms  in : ${JSON.stringify(e.text)}`);
        if (e.isFinal) console.log(`  ${' '.repeat(23)}  out: ${JSON.stringify(res.text)}  restored=${JSON.stringify(res.restored)}`);
    }
}

console.log('\nfull sha256 of the files in MAIN');
for (const rel of ['electron/audio/deepgramBoundaryRepair.ts', 'electron/audio/deepgramBoundaryRepair.fixtures.json', 'electron/audio/deepgramBoundaryRepair.test.ts']) {
    const b = fs.readFileSync(path.join(MAIN, rel));
    console.log(`  ${createHash('sha256').update(b).digest('hex')}  ${b.length} bytes  ${rel}`);
}
