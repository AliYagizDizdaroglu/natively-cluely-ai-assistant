// Rule-8 calibration of followup-questions-decide.mjs's decide() (PREREGISTER-followup-questions.md §6 item 4):
// synthetic verdict sets, each with a known §7 answer, covering every branch and every edge of every clause,
// with the judge's REAL verdictOf. Must print CALIBRATION OK before decide() reads a real verdict.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { decide } from './followup-questions-decide.mjs';
import { MAIN } from './common.mjs';
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);

const ACC = { correctness: 2, on_topic: 2, delivery: 2 };      // verdictOf: acceptable
const WEAK = { correctness: 2, on_topic: 2, delivery: 0 };     // weak: not wrong, not off-topic
const WRONG = { correctness: 0, on_topic: 2, delivery: 2 };    // consensus wrong when both graders say it
const OFF = { correctness: 2, on_topic: 1, delivery: 2 };      // consensus off-topic when both graders say it
const ROSTER = ['S1Q04F', 'S1Q06F', 'S1Q08', 'S2Q05F', 'S2Q08', 'S2Q08F', 'S2Q09F'];
const CALLBACK = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const DROPPED = ['D1', 'D2', 'D3'];

/** 48 pairs (or 96 with copies = 2, the pooled shape), both arms acceptable, equal ttft and words. */
function base(copies = 1) {
    const pairs = [];
    let k = 0;
    for (let c = 0; c < copies; c++) for (const [kind, ids] of [['roster', ROSTER], ['callback', CALLBACK], ['dropped', DROPPED]]) for (const id of ids) for (const rep of [1, 2, 3]) {
        const ttft = 3000 + (k++ % 7) * 100;
        pairs.push({ id: c ? `${id}~${c}` : id, kind, rep, A: { g1: ACC, g2: ACC, ttft, words: 80 }, B: { g1: ACC, g2: ACC, ttft, words: 80 } });
    }
    return pairs;
}
/** Roster gain of `d`: A made weak on the first d roster pairs. */
function gain(pairs, d) { pairs.filter((p) => p.kind === 'roster').slice(0, d).forEach((p) => { p.A = { ...p.A, g1: WEAK, g2: WEAK }; }); return pairs; }
const edit = (pairs, pick, f) => { pairs.filter(pick).forEach(f); return pairs; };
const firstOf = (kind, n = 1) => { let seen = 0; return (p) => p.kind === kind && seen++ < n; };

const cases = [
    ['identical arms: gain 0', () => base(), 'FAIL', 'c5'],
    ['roster gain +1 (FAIL edge)', () => gain(base(), 1), 'FAIL', 'c5'],
    ['roster gain +2', () => gain(base(), 2), 'INCONCLUSIVE', 'c5'],
    ['roster gain +3', () => gain(base(), 3), 'INCONCLUSIVE', 'c5'],
    ['roster gain +4 (PASS edge)', () => gain(base(), 4), 'PASS', null],
    ['roster gain +4 by ONE grader only: consensus gain 0', () => edit(gain(base(), 4), firstOf('roster', 4), (p) => { p.B = { ...p.B, g2: WEAK }; }), 'FAIL', 'c5'],
    ['gain +6, one callback wrong in B by both graders', () => edit(gain(base(), 6), firstOf('callback'), (p) => { p.B = { ...p.B, g1: WRONG, g2: WRONG }; }), 'FAIL', 'c1'],
    ['gain +6, one callback wrong in B by ONE grader only', () => edit(gain(base(), 6), firstOf('callback'), (p) => { p.B = { ...p.B, g1: WRONG }; }), 'PASS', null],
    ['gain +6, wrong in both arms of the same pair (no NEW wrong)', () => edit(gain(base(), 6), firstOf('callback'), (p) => { p.A = { ...p.A, g1: WRONG, g2: WRONG }; p.B = { ...p.B, g1: WRONG, g2: WRONG }; }), 'PASS', null],
    ['gain +6, one dropped-parent case off-topic in B by both graders', () => edit(gain(base(), 6), firstOf('dropped'), (p) => { p.B = { ...p.B, g1: OFF, g2: OFF }; }), 'FAIL', 'c2'],
    ['gain +6, B first token +1001 ms on every pair', () => edit(gain(base(), 6), () => true, (p) => { p.B = { ...p.B, ttft: p.A.ttft + 1001 }; }), 'FAIL', 'c3a'],
    ['gain +6, B first token +1000 ms (not over the FAIL bar)', () => edit(gain(base(), 6), () => true, (p) => { p.B = { ...p.B, ttft: p.A.ttft + 1000 }; }), 'INCONCLUSIVE', 'c3a'],
    ['gain +6, B first token +501 ms', () => edit(gain(base(), 6), () => true, (p) => { p.B = { ...p.B, ttft: p.A.ttft + 501 }; }), 'INCONCLUSIVE', 'c3a'],
    ['gain +6, B first token +500 ms (holds edge)', () => edit(gain(base(), 6), () => true, (p) => { p.B = { ...p.B, ttft: p.A.ttft + 500 }; }), 'PASS', null],
    ['gain +6, B +5000 ms on 6 pairs: median 0, p90 up', () => edit(gain(base(), 6), firstOf('callback', 6), (p) => { p.B = { ...p.B, ttft: p.A.ttft + 5000 }; }), 'INCONCLUSIVE', 'c3b'],
    ['gain +6, 4 more B answers over 10 s', () => edit(gain(base(), 6), firstOf('callback', 4), (p) => { p.B = { ...p.B, ttft: 12000 }; }), 'FAIL', 'c3c'],
    ['gain +6, 3 more B answers over 10 s (allowance edge)', () => edit(gain(base(), 6), firstOf('callback', 3), (p) => { p.B = { ...p.B, ttft: 12000 }; }), 'PASS', null],
    ['gain +6, B +11 words on every pair', () => edit(gain(base(), 6), () => true, (p) => { p.B = { ...p.B, words: p.A.words + 11 }; }), 'FAIL', 'c4'],
    ['gain +6, B +10 words (not over the FAIL bar)', () => edit(gain(base(), 6), () => true, (p) => { p.B = { ...p.B, words: p.A.words + 10 }; }), 'INCONCLUSIVE', 'c4'],
    ['gain +6, B +5 words (holds edge)', () => edit(gain(base(), 6), () => true, (p) => { p.B = { ...p.B, words: p.A.words + 5 }; }), 'PASS', null],
    ['roster gain +1 while every callback and dropped pair is weak in A (clause 5 counts roster pairs only)', () => edit(gain(base(), 1), (p) => p.kind !== 'roster', (p) => { p.A = { ...p.A, g1: WEAK, g2: WEAK }; }), 'FAIL', 'c5'],
    ['pooled shape (R=42), gain +8 (PASS edge)', () => gain(base(2), 8), 'PASS', null],
    ['pooled shape (R=42), gain +7, not flagged pooled', () => gain(base(2), 7), 'INCONCLUSIVE', 'c5'],
    ['pooled re-run (R=42), gain +7: a second INCONCLUSIVE is a FAIL', () => gain(base(2), 7), 'FAIL', 'c5', { pooled: true }],
    ['pooled re-run (R=42), gain +3', () => gain(base(2), 3), 'INCONCLUSIVE->FAIL', 'c5', { pooled: true }],
    ['pooled re-run (R=42), gain +2 (FAIL edge)', () => gain(base(2), 2), 'FAIL', 'c5', { pooled: true }],
    ['pooled shape (R=42), gain +3, not flagged pooled (above the scaled FAIL bar)', () => gain(base(2), 3), 'INCONCLUSIVE', 'c5'],
];

let ok = true;
for (const [name, make, expect, clause, opts] of cases) {
    const r = decide(make(), J.verdictOf, opts);
    const want = expect === 'INCONCLUSIVE->FAIL' ? 'FAIL' : expect;
    const clauseOk = clause ? r.clauses[clause] !== 'holds' && r.clauses[clause] !== 'PASS' : Object.entries(r.clauses).every(([k, v]) => (k === 'c5' ? v === 'PASS' : v === 'holds'));
    const good = r.outcome === want && clauseOk;
    ok &&= good;
    console.log(`${good ? 'OK  ' : 'BAD '} ${name}: ${r.outcome}${clause ? ` via ${clause}=${r.clauses[clause]}` : ''} (expected ${want})  [${Object.entries(r.clauses).map(([k, v]) => `${k}:${v}`).join(' ')}]`);
}
// Validation: a missing grader or a non-number stops decide() instead of being read as a verdict.
for (const [name, make] of [
    ['a pair without its second grader', () => { const p = base(); delete p[0].B.g2; return p; }],
    ['a pair with a 3 on a 0-2 scale', () => { const p = base(); p[0].A = { ...p[0].A, g1: { correctness: 3, on_topic: 2, delivery: 2 } }; return p; }],
    ['a pair with no ttft', () => { const p = base(); p[0].A = { ...p[0].A, ttft: null }; return p; }],
]) {
    let threw = false; try { decide(make(), J.verdictOf); } catch { threw = true; }
    ok &&= threw;
    console.log(`${threw ? 'OK  ' : 'BAD '} refuses ${name}`);
}
console.log(ok ? '\nCALIBRATION OK: every §7 branch and edge reads as pre-registered' : '\nCALIBRATION FAILED');
process.exit(ok ? 0 : 1);
