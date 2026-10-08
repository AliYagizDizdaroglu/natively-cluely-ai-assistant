// Rep 2 = chains 1-6 from l38f-r2.answers.json + chains 7-16 from l38f-r2-from7.answers.json (amendment 16:00).
// Refuses if an id would come from the wrong half or is missing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const R = path.join(path.dirname(fileURLToPath(import.meta.url)), 'runs');
const I = JSON.parse(fs.readFileSync(path.join(R, '..', 'items.json'), 'utf8'));
const a = JSON.parse(fs.readFileSync(path.join(R, 'l38f-r2.answers.json'), 'utf8'));
const b = JSON.parse(fs.readFileSync(path.join(R, 'l38f-r2-from7.answers.json'), 'utf8'));
const out = {};
I.chains.forEach((chain, i) => {
    const src = i < 6 ? a : b;
    for (const id of chain) {
        if (!src[id]?.played) throw new Error(`${id}: not played in its half`);
        out[id] = src[id];
    }
});
fs.writeFileSync(path.join(R, 'l38f-r2-merged.answers.json'), JSON.stringify(out, null, 1));
console.log(`merged ${Object.keys(out).length} ids`);
