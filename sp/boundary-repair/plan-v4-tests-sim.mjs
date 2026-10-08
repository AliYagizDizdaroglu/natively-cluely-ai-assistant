// Throwaway (2026-09-29, v4 authoring): PLAN-v4 Task 3 claims (a) the 13 existing synthetic-edge tests of
// deepgramBoundaryRepair.test.ts stay green on v4 and (b) the 9 new tests fail on v3 and pass on v4. The
// reference rules are semantically the module, so replay both test sets against rule-v3 and rule-v4 here.
import fs from 'node:fs';
import * as v3 from './rule-v3.mjs';
import * as v4 from './rule-v4.mjs';
const fx = JSON.parse(fs.readFileSync(new URL('./fixtures-v3.json', import.meta.url), 'utf8'));
const [I, F1, F2] = fx.symptom.events;
const at = (text, isFinal, atMs) => ({ text, isFinal, atMs });
function run(rule, name, tests) {
    let pass = 0, fail = 0;
    for (const [label, fn] of tests) {
        try { fn(rule); pass++; } catch (e) { fail++; console.log(`  ${name}: FAIL ${label} — ${String(e.message ?? e).slice(0, 90)}`); }
    }
    console.log(`${name}: ${pass} passed, ${fail} failed of ${tests.length}`);
}
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: got ${JSON.stringify(a)}`); };
const play = (rule, events) => { const r = rule.createRepair(); let out = ''; for (const e of events) { const res = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) out = res.text; } return out; };
const m13 = fx.positives[2];
const existingEdges = [
    ['window 5000 / 5001', (R) => { eq(play(R, [I, F1, { ...F2, atMs: F1.atMs + 5000 }]), fx.symptom.expectedF2, '5000'); eq(play(R, [I, F1, { ...F2, atMs: F1.atMs + 5001 }]), F2.text, '5001'); }],
    ['not a prefix / tolerant last token', (R) => { eq(play(R, [I, { ...F1, text: 'How do we cut' }, F2]), F2.text, 'we'); eq(play(R, [I, { ...F1, text: 'How do you cat' }, F2]), fx.symptom.expectedF2, 'cat'); }],
    ['interim-only stream', (R) => { const r = R.createRepair(); eq(r.onTranscript('How do', false, 0).text, 'How do', 'a'); eq(r.onTranscript(I.text, false, 500).text, I.text, 'b'); eq(r.onTranscript(I.text, true, 1000).text, I.text, 'c'); eq(r.onTranscript(F2.text, true, 2000).text, F2.text, 'd'); }],
    ['any final clears', (R) => eq(play(R, [I, F1, { text: 'Okay.', isFinal: true, atMs: 500 }, F2]), F2.text, 'okay')],
    ['interim between F1 and F2 (M13)', (R) => { const [i, f1, f2] = m13.events; eq(play(R, [i, f1, { text: 'as code without', isFinal: false, atMs: f1.atMs + 2 }, f2]), m13.expectedF2, 'm13'); }],
    ['Traw spelling past an apostrophe', (R) => eq(play(R, [{ text: "How'd you cut RAG hallucinations in a rag answer without just making", isFinal: false, atMs: 0 }, { ...F1, text: "How'd you cut" }, { ...F2, text: 'hallucinations in a rag answer without just making it refuse?' }]), 'RAG hallucinations in a rag answer without just making it refuse?', 'traw')],
    ['punctuation-only final', (R) => eq(play(R, [I, { ...F1, text: '?' }, { ...F2, text: 'you cut hallucinations in a rag answer without just making it refuse?' }]), 'you cut hallucinations in a rag answer without just making it refuse?', 'punct')],
    ['one-word final never tolerant', (R) => eq(play(R, [I, { ...F1, text: 'Wow.' }, { ...F2, text: 'you cut hallucinations in a rag answer without just making it refuse?' }]), 'you cut hallucinations in a rag answer without just making it refuse?', 'wow')],
    ['final with no interim before it', (R) => eq(play(R, [I, F1, { text: 'How do you', isFinal: true, atMs: 500 }, F2]), F2.text, 'stale')],
    ['three-word loss left alone', (R) => eq(play(R, [I, F1, { ...F2, text: 'rag answer without just making it refuse?' }]), 'rag answer without just making it refuse?', '3')],
    ['repeated first tail word is normal', (R) => eq(play(R, [{ text: 'How do you cut hallucinations in in a rag answer without just making', isFinal: false, atMs: 0 }, { ...F1, text: 'How do you cut hallucinations' }, F2]), F2.text, 'rep')],
    ['symptom', (R) => eq(play(R, [I, F1, F2]), fx.symptom.expectedF2, 'symptom')],
    ['seam', (R) => eq(play(R, fx.seam.events), fx.seam.expectedF2, 'seam')],
];
const newTests = [
    ['#28 running on', (R) => eq(play(R, [at('accuracy reaching ninety two percent for each', false, 0), at('accuracy reaching 92%.', true, 688), at('For each of those metrics, define the unit of evaluation,', true, 2688)]), 'For each of those metrics, define the unit of evaluation,', '#28')],
    ['twenty five', (R) => eq(play(R, [at('we cut latency by twenty five last quarter', false, 0), at('We cut latency by 25', true, 100), at('last quarter. What changed?', true, 2100)]), 'last quarter. What changed?', '25')],
    ['alright', (R) => eq(play(R, [at('thanks all right so tell me about', false, 0), at('Thanks. Alright.', true, 100), at('So tell me about your last project.', true, 2100)]), 'So tell me about your last project.', 'alright')],
    ['breaks', (R) => eq(play(R, [at('the deploy would break even before the rollout', false, 0), at('The deploy would breaks', true, 100), at('before the rollout finishes.', true, 2100)]), 'before the rollout finishes.', 'breaks')],
    ['put', (R) => eq(play(R, [I, { ...F1, text: 'How do you put' }, F2]), F2.text, 'put')],
    ['version two -> v2', (R) => eq(play(R, [at('the version two release shipped last week', false, 0), at('The v2', true, 100), at('release shipped last week.', true, 2100)]), 'release shipped last week.', 'v2')],
    ['İzmir', (R) => eq(play(R, [at('Peki İzmir projesinde hangi veritabanını seçtiniz', false, 0), at('Peki', true, 100), at('projesinde hangi veritabanını seçtiniz?', true, 2100)]), 'projesinde hangi veritabanını seçtiniz?', 'izmir')],
    ['résumé', (R) => eq(play(R, [at('tell me about your résumé and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]), 'and your last role.', 'resume')],
    ['clear() cut', (R) => { const r = R.createRepair(); r.onTranscript(I.text, false, I.atMs); r.onTranscript(F1.text, true, F1.atMs); r.clear(); eq(r.onTranscript(F2.text, true, F2.atMs), { text: F2.text, restored: null }, 'clear'); }],
    ['clear() interim', (R) => { const r = R.createRepair(); r.onTranscript(I.text, false, I.atMs); r.clear(); r.onTranscript(F1.text, true, F1.atMs); eq(r.onTranscript(F2.text, true, F2.atMs), { text: F2.text, restored: null }, 'clear2'); }],
    ['speechFinal', (R) => { const r = R.createRepair(); r.onTranscript(I.text, false, I.atMs); r.onTranscript(F1.text, true, F1.atMs, true); eq(r.onTranscript(F2.text, true, F2.atMs), { text: F2.text, restored: null }, 'sf1'); const r2 = R.createRepair(); r2.onTranscript(I.text, false, I.atMs); r2.onTranscript(F1.text, true, F1.atMs, false); eq(r2.onTranscript(F2.text, true, F2.atMs, true).text, fx.symptom.expectedF2, 'sf2'); }],
];
console.log('existing edges (+ symptom, seam):'); run(v3, 'v3', existingEdges); run(v4, 'v4', existingEdges);
console.log('new v4 tests:'); run(v3, 'v3', newTests); run(v4, 'v4', newTests);
