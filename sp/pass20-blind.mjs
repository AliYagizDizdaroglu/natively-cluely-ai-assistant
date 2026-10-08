// Throwaway: a BLIND A/B file for the 20 mains — s50c's answer (cut) against today's
// (guard), order randomised per question with a fixed seed so the grader cannot tell
// which is new, and the key kept in a separate file the grader never sees.
// Independent scoring answers "what does it score now"; this answers "which one covers
// what was asked", which is the claim under test.
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.join(MAIN, 'electron/test/golden');
const SCRATCH = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';

const now = JSON.parse(fs.readFileSync(path.join(HERE, 'interview60.runs/pass20.json'), 'utf8')).items;
const old = JSON.parse(fs.readFileSync(path.join(HERE, 'interview60.runs/2026-09-12T08-22-49-s50c/interview60.judge.json'), 'utf8')).items;

// Deterministic order from the id, so the split is fixed and reproducible but not obvious.
const flip = (id) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 2 === 1;

const cases = [];
const key = [];
for (const r of now) {
    const before = old[r.id];
    if (!before || !r.answer) continue;
    const swap = flip(r.id);
    cases.push({
        id: r.id,
        question: r.question,
        A: swap ? r.answer : before.answer,
        B: swap ? before.answer : r.answer,
    });
    key.push({ id: r.id, A: swap ? 'guard' : 'cut', B: swap ? 'cut' : 'guard', s50cVerdict: before.verdict });
}
fs.writeFileSync(path.join(SCRATCH, 'pass20-blind-cases.json'), JSON.stringify({ cases }, null, 1));
fs.writeFileSync(path.join(SCRATCH, 'pass20-blind-key.json'), JSON.stringify({ key }, null, 1));
console.log(`${cases.length} blind pairs; guard is A in ${key.filter((k) => k.A === 'guard').length} of them`);
