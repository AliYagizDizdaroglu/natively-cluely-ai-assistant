// Throwaway (planning, 2026-09-29): run the v3 REFERENCE over fixtures-v3.json and over the plan's
// synthetic edge sequences, so the plan's expected values are the reference's. Also counts how many
// fixtures a pass-through stub would fail (the TDD "red" the plan predicts).
import fs from 'node:fs';
import { createRepair } from './rule-v3.mjs';

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures-v3.json', import.meta.url), 'utf8'));
const run = (events) => {
    const r = createRepair();
    let out = null, restored = null;
    for (const e of events) { const res = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) { out = res.text; restored = res.restored; } }
    return { out, restored };
};
let bad = 0, stubFails = 0;
const all = [['symptom', fx.symptom], ['seam', fx.seam], ...fx.positives.map((f, i) => [`positive ${i + 1}`, f]), ...fx.negatives.map((f, i) => [`negative ${i + 1}`, f])];
for (const [name, f] of all) {
    const { out, restored } = run(f.events);
    const lastRaw = f.events[f.events.length - 1].text;
    if (out !== f.expectedF2) { bad++; console.log(`MISMATCH ${name} (${f.run}): got ${JSON.stringify(out)} expected ${JSON.stringify(f.expectedF2)}`); }
    if (f.expectedF2 !== lastRaw) stubFails++;
    if (name.startsWith('negative') && f.expectedF2 !== lastRaw) console.log(`NEGATIVE WITH A CHANGE? ${name}`);
    if (!name.startsWith('negative')) console.log(`${name.padEnd(12)} restored ${JSON.stringify(restored)} | ${f.cls} | ${f.run}`);
}
console.log(`\nfixtures: ${all.length} (symptom 1, seam 1, positives ${fx.positives.length}, negatives ${fx.negatives.length}); reference mismatches ${bad}; a pass-through stub would fail ${stubFails}`);

// synthetic edges the design lists (R22 strings)
const I = 'How do you cut hallucinations in a rag answer without just making', F2 = 'in a rag answer without just making it refuse?';
const edge = (name, events) => console.log(`${name.padEnd(44)} -> ${JSON.stringify(run(events))}`);
edge('gap 5000 ms (inclusive?)', [{ text: I, isFinal: false, atMs: 0 }, { text: 'How do you cut', isFinal: true, atMs: 17 }, { text: F2, isFinal: true, atMs: 5017 }]);
edge('gap 5001 ms', [{ text: I, isFinal: false, atMs: 0 }, { text: 'How do you cut', isFinal: true, atMs: 17 }, { text: F2, isFinal: true, atMs: 5018 }]);
edge('F1 not a prefix (3rd word differs)', [{ text: I, isFinal: false, atMs: 0 }, { text: 'How do we cut', isFinal: true, atMs: 17 }, { text: F2, isFinal: true, atMs: 1564 }]);
edge('F1 tolerant (last word differs)', [{ text: I, isFinal: false, atMs: 0 }, { text: 'How do you cat', isFinal: true, atMs: 17 }, { text: F2, isFinal: true, atMs: 1564 }]);
edge('interim-only then equal final', [{ text: 'How do', isFinal: false, atMs: 0 }, { text: I, isFinal: false, atMs: 500 }, { text: I, isFinal: true, atMs: 1000 }, { text: F2, isFinal: true, atMs: 2000 }]);
edge('any final clears the cut', [{ text: I, isFinal: false, atMs: 0 }, { text: 'How do you cut', isFinal: true, atMs: 17 }, { text: 'Okay.', isFinal: true, atMs: 500 }, { text: F2, isFinal: true, atMs: 1564 }]);
edge('interim between F1 and F2 (M13 shape)', [{ text: 'How do you manage secrets in infrastructure as code without', isFinal: false, atMs: 0 }, { text: 'How do you manage secrets in', isFinal: true, atMs: 28 }, { text: 'as code without', isFinal: false, atMs: 30 }, { text: 'as code without committing them?', isFinal: true, atMs: 924 }]);
edge('k=2 skip (two words restored)', [{ text: 'a b c d e f g', isFinal: false, atMs: 0 }, { text: 'a b', isFinal: true, atMs: 10 }, { text: 'e f g h', isFinal: true, atMs: 900 }]);
edge('interim returns', [{ text: 'How do', isFinal: false, atMs: 0 }]);
const r = createRepair(); console.log('interim result shape', JSON.stringify(r.onTranscript('How do', false, 0)));
