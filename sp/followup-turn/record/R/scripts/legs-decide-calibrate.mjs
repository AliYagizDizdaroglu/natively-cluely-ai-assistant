// Rule-8 calibration of legs-decide.mjs's decide() (PREREGISTER-turn-followup.md section 6.5): synthetic verdict sets, each with a
// known section 7 answer, covering every clause holding / failing / inconclusive, each leg failing clause 1 ALONE, per-item and
// pooled gain, the 40-vs-70 split (D-case pairs must move no bar that is a formula on R), VOID with ZERO clause lines, the
// refusals (null thoughts, a record that does not match its leg), the pooled re-run's bars and additivity -- with the judge's REAL
// verdictOf. Must print CALIBRATION OK before decide() reads a real verdict. Imports ../legs-decide.mjs, or MUTANT_DECIDE (the
// mutation test, mutate-decide.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAIN } from './common.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { decide, formatResult, itemTables, checkAdditivity, pct, findDepartureNote, parseTagLines, checkGraders } = await import(pathToFileURL(process.env.MUTANT_DECIDE ?? path.join(HERE, '..', 'legs-decide.mjs')).href);
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);

const ACC = { correctness: 2, on_topic: 2, delivery: 2 };      // verdictOf: acceptable
const WEAK = { correctness: 2, on_topic: 2, delivery: 0 };     // weak: not wrong, not off-topic
const WRONG = { correctness: 0, on_topic: 2, delivery: 2 };    // consensus wrong when both graders say it
const OFF = { correctness: 2, on_topic: 1, delivery: 2 };      // consensus off-topic when both graders say it
const ROSTER = ['S1Q04F', 'S1Q06F', 'S2Q05F', 'S2Q08F'], DROPPED = ['D1', 'D2', 'D3'];
const FRONT = { model: 'gemini-3.5-flash-lite', thinking: 'HIGH', leg: 'front' }, BACK = { model: 'gemini-3.1-flash-lite', thinking: 'LOW', leg: 'back' };

/** The registered shape: front = 2 hours x (4 roster + 3 D) x 5 reps = 70 pairs (R = 40), back = 2 hours x 4 roster x 3 reps = 24. Both arms acceptable, equal. */
function base(hours = ['s50m', 's50l'], reps = [5, 3]) {
    const front = [], back = [];
    let k = 0;
    for (const hour of hours) {
        for (const [kind, ids] of [['roster', ROSTER], ['dropped', DROPPED]]) for (const id of ids) for (let rep = 1; rep <= reps[0]; rep++) {
            const ttft = 3000 + (k++ % 7) * 100;
            const side = () => ({ g1: ACC, g2: ACC, ttft, words: 80, thoughts: 1000, ...FRONT });
            front.push({ key: `${hour}:${id}`, hour, id, kind, rep, A: side(), B: side() });
        }
        for (const id of ROSTER) for (let rep = 1; rep <= reps[1]; rep++) {
            const side = () => ({ g1: ACC, g2: ACC, ttft: 3000, words: 80, thoughts: 700, ...BACK });
            back.push({ key: `${hour}:${id}`, hour, id, kind: 'roster', rep, A: side(), B: side() });
        }
    }
    return { front, back };
}
const pick = (set, f, n = Infinity) => { let seen = 0; return set.filter((p) => f(p) && seen++ < n); };
const roster = (d) => d.front.filter((p) => p.kind === 'roster');
const dropped = (d) => d.front.filter((p) => p.kind === 'dropped');
const setSide = (ps, arm, patch) => { ps.forEach((p) => { p[arm] = { ...p[arm], ...patch }; }); return ps; };
/** gain of d on the first d roster pairs: arm A made weak. */
const gain = (d, n) => { setSide(roster(d).slice(0, n), 'A', { g1: WEAK, g2: WEAK }); return d; };
const wrongB = (ps) => setSide(ps, 'B', { g1: WRONG, g2: WRONG });

const ALL_HOLD = { c1: 'holds', c2: 'holds', c3a: 'holds', c3b: 'holds', c3c: 'holds', c4: 'holds', c5: 'holds' };
const cases = [
    // ── clause 7 (gain) on R = 40: PASS >= 8, FAIL <= 2
    ['identical arms: gain 0', () => base(), 'FAIL', { c7: 'FAIL' }],
    ['gain +2 (FAIL edge)', () => gain(base(), 2), 'FAIL', { c7: 'FAIL' }],
    ['gain +3', () => gain(base(), 3), 'INCONCLUSIVE', { c7: 'INCONCLUSIVE' }],
    ['gain +7', () => gain(base(), 7), 'INCONCLUSIVE', { c7: 'INCONCLUSIVE' }],
    ['gain +8 (PASS edge)', () => gain(base(), 8), 'PASS', { ...ALL_HOLD, c7: 'PASS' }],
    ['gain +8 by ONE grader only: consensus gain 0', () => { const d = gain(base(), 8); roster(d).slice(0, 8).forEach((p) => { p.B = { ...p.B, g2: WEAK }; }); return d; }, 'FAIL', { c7: 'FAIL' }],
    ['gain on D-case pairs only (A weak on every D pair): R unchanged, gain 0 (the 40-vs-70 split)', () => { const d = base(); setSide(dropped(d), 'A', { g1: WEAK, g2: WEAK }); return d; }, 'FAIL', { c7: 'FAIL' }],
    ['gain on back-leg pairs only: back is descriptive for clause 7', () => { const d = base(); setSide(d.back.slice(0, 12), 'A', { g1: WEAK, g2: WEAK }); return d; }, 'FAIL', { c7: 'FAIL' }],
    // ── clause 1 (no new wrong), per leg
    ['gain +8, a front roster pair wrong in B (both graders)', () => { const d = gain(base(), 9); wrongB(pick(roster(d).slice(20), () => true, 1)); return d; }, 'FAIL', { c1: 'FAIL', c7: 'PASS' }],
    ['gain +8, a front D-case pair wrong in B: clause 1 counts ALL front pairs', () => { const d = gain(base(), 8); wrongB(pick(dropped(d), () => true, 1)); return d; }, 'FAIL', { c1: 'FAIL', c7: 'PASS' }],
    ['gain +8, ONE back-leg pair wrong in B: the back leg fails clause 1 alone', () => { const d = gain(base(), 8); wrongB(d.back.slice(0, 1)); return d; }, 'FAIL', { c1: 'FAIL', c7: 'PASS' }, (r) => r.c1legs.front === 'holds' && r.c1legs.back === 'FAIL'],
    ['gain +8, ONE front pair wrong in B, back clean: the front leg fails clause 1 alone', () => { const d = gain(base(), 9); wrongB(pick(roster(d).slice(20), () => true, 1)); return d; }, 'FAIL', { c1: 'FAIL' }, (r) => r.c1legs.front === 'FAIL' && r.c1legs.back === 'holds'],
    ['gain +8, wrong in B by ONE grader only', () => { const d = gain(base(), 9); pick(roster(d).slice(20), () => true, 1).forEach((p) => { p.B = { ...p.B, g1: WRONG }; }); return d; }, 'PASS', { c1: 'holds' }],
    ['gain +8, wrong in BOTH arms of a front pair (no NEW wrong)', () => { const d = gain(base(), 8); pick(roster(d).slice(20), () => true, 1).forEach((p) => { p.A = { ...p.A, g1: WRONG, g2: WRONG }; p.B = { ...p.B, g1: WRONG, g2: WRONG }; }); return d; }, 'PASS', { c1: 'holds' }],
    ['gain +8, wrong in A only on a back pair (B better): holds', () => { const d = gain(base(), 8); setSide(d.back.slice(0, 1), 'A', { g1: WRONG, g2: WRONG }); return d; }, 'PASS', { c1: 'holds' }],
    ['gain +8, a back pair wrong in both arms: holds', () => { const d = gain(base(), 8); d.back.slice(0, 1).forEach((p) => { p.A = { ...p.A, g1: WRONG, g2: WRONG }; p.B = { ...p.B, g1: WRONG, g2: WRONG }; }); return d; }, 'PASS', { c1: 'holds' }],
    ['gain +8, one new wrong in B but one fewer elsewhere on the same leg: B <= A holds', () => { const d = gain(base(), 8); wrongB(pick(roster(d), () => true, 1)); setSide(pick(roster(d).slice(10), () => true, 1), 'A', { g1: WRONG, g2: WRONG }); return d; }, 'PASS', { c1: 'holds' }],
    // ── clause 2 (off-topic), all front pairs; back reported
    ['gain +8, a D-case pair off-topic in B (both graders)', () => { const d = gain(base(), 8); setSide(pick(dropped(d), () => true, 1), 'B', { g1: OFF, g2: OFF }); return d; }, 'FAIL', { c2: 'FAIL', c1: 'holds' }],
    ['gain +8, a roster pair off-topic in B', () => { const d = gain(base(), 9); setSide(pick(roster(d).slice(20), () => true, 1), 'B', { g1: OFF, g2: OFF }); return d; }, 'FAIL', { c2: 'FAIL' }],
    ['gain +8, off-topic in B by ONE grader only', () => { const d = gain(base(), 9); pick(roster(d).slice(20), () => true, 1).forEach((p) => { p.B = { ...p.B, g1: OFF }; }); return d; }, 'PASS', { c2: 'holds' }],
    ['gain +8, back-leg off-topic in B: reported, not decided', () => { const d = gain(base(), 8); setSide(d.back.slice(0, 3), 'B', { g1: OFF, g2: OFF }); return d; }, 'PASS', { c2: 'holds' }],
    // ── clause 3a (median paired TTFT on R)
    ['gain +8, B first token +1001 ms on every roster pair', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 1001 }; }); return d; }, 'FAIL', { c3a: 'FAIL' }],
    ['gain +8, +1000 ms (not over the FAIL bar)', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 1000 }; }); return d; }, 'INCONCLUSIVE', { c3a: 'INCONCLUSIVE' }],
    ['gain +8, +501 ms', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 501 }; }); return d; }, 'INCONCLUSIVE', { c3a: 'INCONCLUSIVE' }],
    ['gain +8, +500 ms (holds edge)', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 500 }; }); return d; }, 'PASS', { c3a: 'holds' }],
    ['gain +8, B +5000 ms on every D-case pair only: R unchanged (40-vs-70), PASS', () => { const d = gain(base(), 8); dropped(d).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 5000 }; }); return d; }, 'PASS', { c3a: 'holds', c3b: 'holds' }, (r) => r.numbers.all.p90B > r.numbers.all.p90A + 2000 && r.numbers.p90B <= r.numbers.p90A + 2000],
    ['gain +8, B +5000 ms on every back-leg pair: back is reported', () => { const d = gain(base(), 8); d.back.forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 5000 }; }); return d; }, 'PASS', { c3a: 'holds' }],
    // ── clause 3b (p90)
    ['gain +8, B +5000 ms on 6 roster pairs: median 0, p90 up', () => { const d = gain(base(), 8); roster(d).slice(0, 6).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 5000 }; }); return d; }, 'INCONCLUSIVE', { c3a: 'holds', c3b: 'INCONCLUSIVE' }],
    ['gain +20 but p90 up: still INCONCLUSIVE (PASS needs 3b)', () => { const d = gain(base(), 20); roster(d).slice(0, 6).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 5000 }; }); return d; }, 'INCONCLUSIVE', { c3b: 'INCONCLUSIVE', c7: 'PASS' }],
    // ── clause 3c (stalls > 10 s on R: allowance ceil(2R/39) = 3)
    ['gain +8, 4 more B answers over 10 s on R', () => { const d = gain(base(), 8); roster(d).slice(0, 4).forEach((p) => { p.B = { ...p.B, ttft: 12000 }; }); return d; }, 'FAIL', { c3c: 'FAIL' }],
    ['gain +8, 3 more B answers over 10 s (allowance edge; they sit above the p90 element)', () => { const d = gain(base(), 8); roster(d).slice(0, 3).forEach((p) => { p.B = { ...p.B, ttft: 12000 }; }); return d; }, 'PASS', { c3c: 'holds', c3b: 'holds' }],
    ['gain +8, 10 D-case pairs over 10 s in B only: not on R (the 70-pair count is reported)', () => { const d = gain(base(), 8); dropped(d).slice(0, 10).forEach((p) => { p.B = { ...p.B, ttft: 12000 }; }); return d; }, 'PASS', { c3c: 'holds' }, (r) => r.numbers.all.slowB === 10 && r.numbers.slowB === 0 && r.numbers.all.allow3c === 4],
    ['gain +8, an A stall offsets a B stall', () => { const d = gain(base(), 8); roster(d).slice(0, 4).forEach((p) => { p.B = { ...p.B, ttft: 12000 }; }); roster(d).slice(0, 2).forEach((p) => { p.A = { ...p.A, ttft: 12000 }; }); return d; }, 'INCONCLUSIVE', { c3c: 'holds' }],
    // ── clause 4 (words on R)
    ['gain +8, B +11 words on every roster pair', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, words: p.A.words + 11 }; }); return d; }, 'FAIL', { c4: 'FAIL' }],
    ['gain +8, +10 words (not over the FAIL bar)', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, words: p.A.words + 10 }; }); return d; }, 'INCONCLUSIVE', { c4: 'INCONCLUSIVE' }],
    ['gain +8, +6 words', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, words: p.A.words + 6 }; }); return d; }, 'INCONCLUSIVE', { c4: 'INCONCLUSIVE' }],
    ['gain +8, +5 words (holds edge)', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, words: p.A.words + 5 }; }); return d; }, 'PASS', { c4: 'holds' }],
    ['gain +8, B +40 words on every D-case pair only: not on R', () => { const d = gain(base(), 8); dropped(d).forEach((p) => { p.B = { ...p.B, words: p.A.words + 40 }; }); return d; }, 'PASS', { c4: 'holds' }],
    // ── clause 5 (thoughts on R)
    ['gain +8, B +151 thinking tokens on every roster pair', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, thoughts: p.A.thoughts + 151 }; }); return d; }, 'FAIL', { c5: 'FAIL' }],
    ['gain +8, +150 thinking tokens (holds edge)', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, thoughts: p.A.thoughts + 150 }; }); return d; }, 'PASS', { c5: 'holds' }],
    ['gain +8, B +500 thinking tokens on every D-case pair only: not on R', () => { const d = gain(base(), 8); dropped(d).forEach((p) => { p.B = { ...p.B, thoughts: p.A.thoughts + 500 }; }); return d; }, 'PASS', { c5: 'holds' }],
    ['gain +8, B +2000 thinking tokens on every back-leg pair: back at LOW is reported', () => { const d = gain(base(), 8); d.back.forEach((p) => { p.B = { ...p.B, thoughts: p.A.thoughts + 2000 }; }); return d; }, 'PASS', { c5: 'holds' }, (r) => r.numbers.backThoughts === 2000],
    ['gain +8, B thinks LESS (-341 per pair): holds', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, thoughts: p.A.thoughts - 341 }; }); return d; }, 'PASS', { c5: 'holds' }],
    // ── dominance of FAIL, and what PASS needs
    ['3a INCONCLUSIVE together with a clause-4 FAIL: FAIL', () => { const d = gain(base(), 8); roster(d).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 700, words: p.A.words + 11 }; }); return d; }, 'FAIL', { c3a: 'INCONCLUSIVE', c4: 'FAIL' }],
    ['gain FAIL together with every other clause holding: FAIL', () => gain(base(), 1), 'FAIL', { c7: 'FAIL' }],
    ['gain PASS with a clause-1 FAIL: FAIL', () => { const d = gain(base(), 30); wrongB(d.back.slice(0, 1)); return d; }, 'FAIL', { c1: 'FAIL', c7: 'PASS' }],
    // ── legs are read each, never pooled; R-formulas are not the 70-pair figures; the median is the median
    ['front B wrong +1 while back A is wrong +1: per leg the front FAILS (a pooled read would hold)', () => { const d = gain(base(), 9); wrongB(roster(d).slice(20, 21)); setSide(d.back.slice(0, 1), 'A', { g1: WRONG, g2: WRONG }); return d; }, 'FAIL', { c1: 'FAIL' }, (r) => r.c1legs.front === 'FAIL' && r.c1legs.back === 'holds'],
    ['back B wrong +1 while front A is wrong +1: per leg the back FAILS', () => { const d = gain(base(), 9); setSide(roster(d).slice(20, 21), 'A', { g1: WRONG, g2: WRONG }); wrongB(d.back.slice(0, 1)); return d; }, 'FAIL', { c1: 'FAIL' }, (r) => r.c1legs.front === 'holds' && r.c1legs.back === 'FAIL'],
    ['half the roster pairs +2000 ms in B, D-case pairs 5000 ms faster in B: the median on R is +2000 (FAIL); the 70-pair median would read 0', () => { const d = gain(base(), 8); roster(d).slice(0, 20).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 2000 }; }); dropped(d).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft - 2000 }; }); return d; }, 'FAIL', { c3a: 'FAIL' }, (r) => r.numbers.dTtft === 2000 && r.numbers.all.dTtft === 0],
    ['half the roster pairs +12 words in B, D-case pairs 40 words shorter: the median on R is +12 (FAIL); the 70-pair median would read 0', () => { const d = gain(base(), 8); roster(d).slice(0, 20).forEach((p) => { p.B = { ...p.B, words: p.A.words + 12 }; }); dropped(d).forEach((p) => { p.B = { ...p.B, words: p.A.words - 40 }; }); return d; }, 'FAIL', { c4: 'FAIL' }, (r) => r.numbers.dWords === 12 && r.numbers.all.dWords === 0],
    ['half the roster pairs +300 thinking tokens in B, D-case pairs 500 fewer: the median on R is +300 (FAIL); the 70-pair median would read 0', () => { const d = gain(base(), 8); roster(d).slice(0, 20).forEach((p) => { p.B = { ...p.B, thoughts: p.A.thoughts + 300 }; }); dropped(d).forEach((p) => { p.B = { ...p.B, thoughts: p.A.thoughts - 500 }; }); return d; }, 'FAIL', { c5: 'FAIL' }, (r) => r.numbers.dThoughts === 300 && r.numbers.all.dThoughts === 0],
    ['B +600 ms on 22 of the 40 roster pairs: the median (element 20) is +600, not the 40th percentile', () => { const d = gain(base(), 8); roster(d).slice(0, 22).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 600 }; }); return d; }, 'INCONCLUSIVE', { c3a: 'INCONCLUSIVE' }, (r) => r.numbers.dTtft === 600],
    ['B +1500 ms only on the pairs with the slowest A (p90 gap 1500 inside the 2000 margin)', () => { const d = gain(base(), 8); roster(d).filter((p) => p.A.ttft === 3600).forEach((p) => { p.B = { ...p.B, ttft: p.A.ttft + 1500 }; }); return d; }, 'PASS', { c3a: 'holds', c3b: 'holds' }, (r) => r.numbers.p90B - r.numbers.p90A === 1500],
    // ── pooled re-run: R_p = 60 (3 hours), bars PASS >= 12, FAIL <= 3, allowance 4, a second INCONCLUSIVE = FAIL
    ['re-run shape (R=60), gain +12 (PASS edge)', () => gain(base(['s50m', 's50l', 's50k']), 12), 'PASS', { c7: 'PASS' }, (r) => r.R === 60 && r.numbers.passBar === 12 && r.numbers.failBar === 3 && r.numbers.allow3c === 4, { rerun: true }],
    ['re-run shape (R=60), gain +11: a second INCONCLUSIVE is a FAIL', () => gain(base(['s50m', 's50l', 's50k']), 11), 'FAIL', { c7: 'INCONCLUSIVE' }, null, { rerun: true }],
    ['re-run shape (R=60), gain +11, NOT flagged re-run: INCONCLUSIVE', () => gain(base(['s50m', 's50l', 's50k']), 11), 'INCONCLUSIVE', { c7: 'INCONCLUSIVE' }],
    ['re-run shape (R=60), gain +4: INCONCLUSIVE band', () => gain(base(['s50m', 's50l', 's50k']), 4), 'INCONCLUSIVE', { c7: 'INCONCLUSIVE' }],
    ['re-run shape (R=60), gain +3 (FAIL edge)', () => gain(base(['s50m', 's50l', 's50k']), 3), 'FAIL', { c7: 'FAIL' }, null, { rerun: true }],
    ['re-run shape (R=60), 4 more B stalls: allowance 4 holds', () => { const d = gain(base(['s50m', 's50l', 's50k']), 12); roster(d).slice(0, 4).forEach((p) => { p.B = { ...p.B, ttft: 12000 }; }); return d; }, 'PASS', { c3c: 'holds', c3b: 'holds' }, null, { rerun: true }],
    ['re-run shape (R=60), 5 more B stalls: FAIL', () => { const d = gain(base(['s50m', 's50l', 's50k']), 12); roster(d).slice(0, 5).forEach((p) => { p.B = { ...p.B, ttft: 12000 }; }); return d; }, 'FAIL', { c3c: 'FAIL' }, null, { rerun: true }],
    ['s50k alone (R=20): bars scale to PASS >= 4, FAIL <= 1', () => gain(base(['s50k']), 4), 'PASS', { c7: 'PASS' }, (r) => r.R === 20 && r.numbers.passBar === 4 && r.numbers.failBar === 1],
    ['s50k alone (R=20), gain +1', () => gain(base(['s50k']), 1), 'FAIL', { c7: 'FAIL' }],
];

let ok = true;
for (const [name, make, expect, clauseWant, extra, opts] of cases) {
    const d = make();
    const r = decide(d, J.verdictOf, opts);
    const want = expect === 'INCONCLUSIVE->FAIL' ? 'FAIL' : expect;
    const clauseOk = Object.entries(clauseWant).every(([k, v]) => r.clauses[k] === v);
    const extraOk = !extra || extra(r);
    const good = r.outcome === want && clauseOk && extraOk;
    ok &&= good;
    console.log(`${good ? 'OK  ' : 'BAD '} ${name}: ${r.outcome} (expected ${want})  [${Object.entries(r.clauses).map(([k, v]) => `${k}:${v}`).join(' ')}]${extraOk ? '' : ' EXTRA CHECK FAILED'}`);
}

// ── VOID: parity first, zero clause lines, ahead of any validation ───────────────────────────────────────────────────
{
    const good = gain(base(), 8), bad = gain(base(), 0);
    const v1 = decide(good, J.verdictOf, { parity: { ok: false, why: 'x' } });
    const v2 = decide(bad, J.verdictOf, { parity: { ok: false } });
    const garbage = base(); garbage.front[0].A.thoughts = null;
    const v3 = decide(garbage, J.verdictOf, { parity: { ok: false } });
    const v4 = decide(garbage, J.verdictOf, { parity: { ok: false }, rerun: true });
    const voidOk = [v1, v2, v3, v4].every((v) => v.outcome === 'VOID' && v.clauses === null && v.numbers === null && v.lines.length === 1 && v.lines[0] === 'VOID' && formatResult(v) === 'VOID' && !/^[1-7][ab]?\. /m.test(formatResult(v)));
    ok &&= voidOk;
    console.log(`${voidOk ? 'OK  ' : 'BAD '} a parity failure prints VOID and NOTHING else (no clause line), whatever the data would have said, even invalid data`);
    const pass = decide(gain(base(), 8), J.verdictOf, { parity: { ok: true } });
    const fmt = formatResult(pass).split('\n');
    const printed = fmt.filter((l) => /^[1-7][abc]?\. /.test(l)).length;
    const fmtOk = printed === 9 && fmt.at(-1) === 'DECISION: PASS' && fmt.length === 11;
    ok &&= fmtOk;
    console.log(`${fmtOk ? 'OK  ' : 'BAD '} a decided result prints the 9 clause lines (1, 2, 3a, 3b, 3c, 4, 5, 6, 7), the header and the DECISION line`);
}

// ── refusals ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const refusals = [
    ['a null thoughts in a FRONT record (A side)', (d) => { d.front[3].A.thoughts = null; }, /thoughts/],
    ['a null thoughts in a FRONT record (B side, a D-case pair)', (d) => { d.front.find((p) => p.kind === 'dropped').B.thoughts = null; }, /thoughts/],
    ['a missing thoughts field in a FRONT record', (d) => { delete d.front[0].B.thoughts; }, /thoughts/],
    ['thoughts 0 is a number (not null): accepted', null],
    ['a front record whose model is the back leg\'s', (d) => { d.front[0].A.model = 'gemini-3.1-flash-lite'; }, /REFUSED/],
    ['a front record whose thinking is LOW', (d) => { d.front[5].B.thinking = 'LOW'; }, /REFUSED/],
    ['a front record whose leg says back', (d) => { d.front[7].B.leg = 'back'; }, /REFUSED/],
    ['a back record whose model is the front leg\'s', (d) => { d.back[2].A.model = 'gemini-3.5-flash-lite'; }, /REFUSED/],
    ['a back record whose thinking is HIGH', (d) => { d.back[0].B.thinking = 'HIGH'; }, /REFUSED/],
    ['a D-case pair on the back leg', (d) => { d.back[0].kind = 'dropped'; }, /roster items only/],
    ['an unknown kind', (d) => { d.front[0].kind = 'callback'; }, /unknown kind/],
    ['a pair without its second grader', (d) => { delete d.front[0].B.g2; }, /grader scores/],
    ['a 3 on a 0-2 scale', (d) => { d.front[0].A.g1 = { correctness: 3, on_topic: 2, delivery: 2 }; }, /grader scores/],
    ['a pair with no ttft', (d) => { d.front[0].A.ttft = null; }, /ttft/],
    ['no complete front roster pair at all', (d) => { d.front = d.front.filter((p) => p.kind === 'dropped'); }, /no complete front roster/],
];
for (const [name, mutate, rx] of refusals) {
    const d = base();
    if (mutate === null) { d.front[0].A.thoughts = 0; d.front[0].B.thoughts = 0; let threw = false; try { decide(d, J.verdictOf); } catch { threw = true; } ok &&= !threw; console.log(`${!threw ? 'OK  ' : 'BAD '} ${name}`); continue; }
    mutate(d);
    let msg = null; try { decide(d, J.verdictOf); } catch (e) { msg = e.message; }
    const good = msg !== null && rx.test(msg);
    ok &&= good;
    console.log(`${good ? 'OK  ' : 'BAD '} refuses ${name}${good ? '' : msg === null ? ' (DID NOT REFUSE)' : ` (message: ${msg.slice(0, 80)})`}`);
}
{   // back-leg null thoughts: not refused (back thoughts are reported only), and reported as n/a
    const d = gain(base(), 8); d.back[0].A.thoughts = null;
    let r = null; try { r = decide(d, J.verdictOf); } catch { /* refused: bad */ }
    const good = r && r.outcome === 'PASS' && r.numbers.backThoughts === null;
    ok &&= good; console.log(`${good ? 'OK  ' : 'BAD '} a null thoughts on the BACK leg is not a refusal (reported n/a)`);
}

// ── tables and additivity ────────────────────────────────────────────────────────────────────────────────────────────
{
    const d = gain(base(), 8);
    const lines = itemTables(roster(d), J.verdictOf, 'front');
    const rows = lines.filter((l) => /^ {2}s50[ml]:/.test(l));
    const good = rows.length === 8 && /A wwwww {2}B YYYYY/.test(rows[0]) && /A wwwYY {2}B YYYYY|A wwwYY/.test(rows[1]) && lines.some((l) => /hour s50m: roster pairs 20, .* delta \+8/.test(l)) && lines.some((l) => /hour s50l: roster pairs 20, .* delta \+0/.test(l));
    ok &&= good; console.log(`${good ? 'OK  ' : 'BAD '} per-item rows (8 = 4 ids x 2 hours, symbols per rep) and per-hour deltas`);
}
{
    const all = base(['s50m', 's50l', 's50k']);
    const f1 = { front: all.front.filter((p) => p.hour !== 's50k'), back: all.back.filter((p) => p.hour !== 's50k') }, f2 = { front: all.front.filter((p) => p.hour === 's50k'), back: all.back.filter((p) => p.hour === 's50k') };
    gain(all, 12);
    const rp = decide(all, J.verdictOf, { rerun: true }), r1 = decide(f1, J.verdictOf), r2 = decide(f2, J.verdictOf);
    const good = checkAdditivity(rp, r1, r2).length === 0;
    ok &&= good; console.log(`${good ? 'OK  ' : 'BAD '} additivity holds for a pooled set built from the first run and the re-run`);
    const short = decide({ front: all.front.slice(1), back: all.back }, J.verdictOf, { rerun: true });
    const caught = checkAdditivity(short, r1, r2).length > 0;
    ok &&= caught; console.log(`${caught ? 'OK  ' : 'BAD '} additivity is violated (and named) when a pair is missing from the pooled set`);
    const noBack = decide({ front: all.front, back: all.back.slice(1) }, J.verdictOf, { rerun: true });
    const caught3 = checkAdditivity(noBack, r1, r2).includes('pair counts');
    ok &&= caught3; console.log(`${caught3 ? 'OK  ' : 'BAD '} additivity names a missing BACK pair (pair counts)`);
    const weakB = JSON.parse(JSON.stringify({ front: all.front, back: all.back }));
    Object.assign(weakB.front.find((p) => p.kind === 'roster'), {}); weakB.front.find((p) => p.kind === 'roster').B.g1 = WEAK;     // B no longer acceptable on one roster pair, still not wrong
    const rw = decide(weakB, J.verdictOf, { rerun: true });
    const caught4 = checkAdditivity(rw, r1, r2).some((k) => k === 'accB' || k === 'accA');
    ok &&= caught4; console.log(`${caught4 ? 'OK  ' : 'BAD '} additivity is violated when only the consensus-acceptable count differs`);
    const weakA = JSON.parse(JSON.stringify({ front: all.front, back: all.back }));
    weakA.front.filter((p) => p.kind === 'roster').at(-1).A.g2 = WEAK;
    const caught5 = checkAdditivity(decide(weakA, J.verdictOf, { rerun: true }), r1, r2).includes('accA');
    ok &&= caught5; console.log(`${caught5 ? 'OK  ' : 'BAD '} additivity is violated when only A's consensus-acceptable count differs`);
    const w = decide({ front: all.front, back: all.back.map((p, i) => (i === 0 ? { ...p, B: { ...p.B, g1: WRONG, g2: WRONG } } : p)) }, J.verdictOf, { rerun: true });
    const caught2 = checkAdditivity(w, r1, r2).length > 0;
    ok &&= caught2; console.log(`${caught2 ? 'OK  ' : 'BAD '} additivity is violated when a pooled count differs from the sum of the two runs`);
}
{   // the percentile rule: element min(n-1, floor(n p))
    const g = pct([5, 1, 4, 2, 3], 0.5) === 3 && pct([1, 2, 3, 4], 0.5) === 3 && pct(Array.from({ length: 40 }, (_, i) => i), 0.9) === 36 && pct([7], 0.9) === 7;
    ok &&= g; console.log(`${g ? 'OK  ' : 'BAD '} percentile = element min(n-1, floor(n*p)) of the ascending list (p90 of 40 is element 36)`);
}
// ── A2 points 2 and 5: grader labels are DERIVED from the three tools' stdout, never typed; the departure note ───────────
{
    const PIN = 'claude-opus-5-5';
    const tags = Array.from({ length: 9 }, (_, i) => [`blind-${i + 1}.g1`, `blind-${i + 1}.g2`]).flat();
    const agentOf = (t) => `agentid${t.replace(/\W/g, '')}xxxxxxxxxx`;
    const mk = () => {
        const gs = { instrument: 'x', graders: {} }, lines = { models: [], memory: [], audit: [] }, launches = [];
        for (const t of tags) {
            const cwd = `C:/F/grading/${t}-a1`;
            gs.graders[t] = { agent: agentOf(t), attempt: 1, cwd, model: PIN, memory: 'ABSENT', projectMemory: 0, claudeMem: 0, audit: 'clean', bash: [], replaced: [] };
            launches.push({ slot: t, attempt: 1, session_id: agentOf(t), model: PIN, exit: 0, cwd, startedAt: '2026-10-04T05:00:00.000Z', endedAt: '2026-10-04T05:05:00.000Z', slugJsonl: 1, memoryDir: 'absent' });
            lines.models.push(`${t}: {"${PIN}":1} PINNED  (found by session path: x)`);
            lines.memory.push(`${t}: ABSENT  projectMemory=0 claudeMem=0  (project-memory markers: 0 hits in 0 distinct; claude-mem context markers: 0; scanned 13 records, 1000 bytes)`);
            lines.audit.push(`${t} (${agentOf(t).slice(0, 18)}): 4 tool inputs [Readx3 Writex1]; clean; bash=[]; dispatch=match`);
        }
        return { gs, lines, launches };
    };
    const filesOf = (l) => ({ models: `${l.models.join('\n')}\n`, memory: `${l.memory.join('\n')}\n`, audit: `${l.audit.join('\n')}\n` });
    const NOTE = { when: '2026-10-03 22:40' };
    const run = (x, extra = {}) => checkGraders({ gs: x.gs, files: filesOf(x.lines), nFiles: 9, pinned: PIN, departureNote: null, launches: x.launches, ...extra });
    const LN = (x, tag = T) => x.launches.find((l) => l.slot === tag);
    const rep = (arr, tag, to) => { const i = arr.findIndex((l) => l.startsWith(`${tag}:`) || l.startsWith(`${tag} (`)); arr[i] = to; };
    const T = 'blind-3.g1';
    const cases = [
        ['18 derived labels that agree with the tools\' stdout: no disagreement', () => mk(), {}, null],
        ['graders.json says another model than the tool printed', () => { const x = mk(); x.gs.graders[T].model = 'claude-opus-4'; return x; }, {}, /model claude-opus-4 in graders\.json, claude-opus-5-5 in the tool output/],
        ['the tool printed another model (graders.json hand-typed claude-opus-5-5)', () => { const x = mk(); rep(x.lines.models, T, `${T}: {"claude-opus-4":1} NOT PINNED`); return x; }, {}, /ran claude-opus-4, not claude-opus-5-5/],
        ['graders.json hand-typed ABSENT over a LOADED transcript (the prep review\'s C2 workaround)', () => { const x = mk(); rep(x.lines.memory, T, `${T}: LOADED  projectMemory=34 claudeMem=0  (x)`); return x; }, {}, /memory ABSENT in graders\.json, LOADED in the tool output/],
        ['graders.json says LOADED where the tool read ABSENT', () => { const x = mk(); x.gs.graders[T].memory = 'LOADED'; return x; }, {}, /memory LOADED in graders\.json, ABSENT/],
        ['projectMemory differs', () => { const x = mk(); x.gs.graders[T].projectMemory = 3; return x; }, {}, /projectMemory 3 in graders\.json, 0/],
        ['claudeMem differs', () => { const x = mk(); x.gs.graders[T].claudeMem = 2; return x; }, {}, /claudeMem 2 in graders\.json, 0/],
        ['graders.json hand-typed clean over a FLAGGED audit', () => { const x = mk(); rep(x.lines.audit, T, `${T} (${agentOf(T).slice(0, 18)}): 5 tool inputs [Grepx1]; FLAGGED 1: TOOL OTHER THAN Read/Write/Edit: Grep; bash=[]; dispatch=match`); return x; }, {}, /audit clean in graders\.json, FLAGGED/],
        ['an audit FLAGGED in both places still refuses the slot', () => { const x = mk(); x.gs.graders[T].audit = 'FLAGGED'; rep(x.lines.audit, T, `${T} (${agentOf(T).slice(0, 18)}): 5 tool inputs [Grepx1]; FLAGGED 1: x; bash=[]; dispatch=match`); return x; }, {}, /audit FLAGGED/],
        ['graders.json names a bash length:sha12 list but the audit shows none (point 15: graders have no Bash)', () => { const x = mk(); x.gs.graders[T].bash = ['641:000000000000']; return x; }, {}, /bash length:sha12/],
        ['the agent named in graders.json is not the transcript the audit read', () => { const x = mk(); x.gs.graders[T].agent = 'someotheragentid12345'; return x; }, {}, /agent someotheragentid1.* in graders.json, .* in the audit output/],
        ['a stray slot beside the 18', () => { const x = mk(); x.gs.graders['blind-10.g1'] = { ...x.gs.graders[T] }; return x; }, {}, /blind-10\.g1 is not one of/],
        ['a slot missing (17 + a stray name still counts 18)', () => { const x = mk(); delete x.gs.graders[T]; x.gs.graders['blind-3.g3'] = {}; return x; }, {}, /slot blind-3\.g1 missing/],
        ['a slot with no agent named', () => { const x = mk(); delete x.gs.graders[T].agent; return x; }, {}, /no agent named/],
        ['graders.memory.out.txt absent', () => { const x = mk(); x.noMemory = true; return x; }, { files: undefined }, /graders\.memory\.out\.txt is missing/],
        ['two lines for one tag in a tool file', () => { const x = mk(); x.lines.models.push(x.lines.models[0]); return x; }, {}, /2 lines for blind-1\.g1/],
        ['replaced twice', () => { const x = mk(); x.gs.graders[T].replaced = ['a1', 'a2']; return x; }, {}, /replaced more than once/],
        ['LOADED, consistent in both places, but NO departure: refused', () => { const x = mk(); x.gs.graders[T].memory = 'LOADED'; x.gs.graders[T].projectMemory = 4; rep(x.lines.memory, T, `${T}: LOADED  projectMemory=4 claudeMem=0  (x)`); return x; }, {}, /memory LOADED without an accepted departure/],
        ['the same LOADED slot with departure: true AND the dated note: accepted', () => { const x = mk(); x.gs.departure = true; x.gs.graders[T].memory = 'LOADED'; x.gs.graders[T].projectMemory = 4; rep(x.lines.memory, T, `${T}: LOADED  projectMemory=4 claudeMem=0  (x)`); return x; }, { departureNote: NOTE }, null],
        ['a departure label with no note in the registered file: refused', () => { const x = mk(); x.gs.departure = true; return x; }, { departureNote: null }, /departure: true but the registered file holds no section 3 note/],
        ['a note without a date time: refused', () => { const x = mk(); x.gs.departure = true; return x; }, { departureNote: { when: null } }, /carries no date time/],
        ['under the departure a claude-mem context marker still refuses the slot', () => { const x = mk(); x.gs.departure = true; Object.assign(x.gs.graders[T], { memory: 'LOADED', projectMemory: 4, claudeMem: 1 }); rep(x.lines.memory, T, `${T}: LOADED  projectMemory=4 claudeMem=1  (x)`); return x; }, { departureNote: NOTE }, /claude-mem context markers \(1\) refuse the slot/],
        ['a replacement whose .replaced lines show a FLAGGED audit in all three files: accepted', () => { const x = replaced(mk()); return x; }, {}, null],
        ['a replacement with one tool file lacking its .replaced line: refused', () => { const x = replaced(mk()); x.lines.models.pop(); return x; }, {}, /graders\.models\.out\.txt has no blind-3\.g1\.replaced line/],
        ['a replacement whose .replaced lines show nothing wrong (clean, pinned, ABSENT): refused', () => { const x = replaced(mk()); x.lines.audit[x.lines.audit.length - 1] = `${T}.replaced (agentOLD): 4 tool inputs [Readx2]; clean; bash=[]; dispatch=match`; return x; }, {}, /no \.replaced line shows the flag or marker/],
        ['.replaced lines with no replacement in graders.json: refused', () => { const x = replaced(mk()); x.gs.graders[T].replaced = []; return x; }, {}, /lists no replacement/],
        // A2 points 5 + 11: the launcher's launches.jsonl
        ['launches.jsonl absent (undefined): refused', () => { const x = mk(); x.launches = undefined; return x; }, {}, /launches\.jsonl is missing/],
        ['a slot whose agent has no launches line at all (a session the launcher never ran)', () => { const x = mk(); x.gs.graders[T].agent = 'handtypedsession00000'; return x; }, {}, /has no launches\.jsonl line for this slot/],
        ['the launches line of the agent is for ANOTHER slot', () => { const x = mk(); LN(x).slot = 'blind-4.g2'; return x; }, {}, /blind-3\.g1: agent .* has no launches\.jsonl line for this slot/],
        ['launcher exit 1', () => { const x = mk(); LN(x).exit = 1; return x; }, {}, /launcher exit 1, not 0/],
        ['launcher exit null (killed on timeout)', () => { const x = mk(); LN(x).exit = null; return x; }, {}, /launcher exit null, not 0/],
        ['slugJsonl 2 (a second session in the slug folder)', () => { const x = mk(); LN(x).slugJsonl = 2; return x; }, {}, /slugJsonl 2, not 1/],
        ['slugJsonl 0 (the transcript is not in the attempt\'s own slug folder)', () => { const x = mk(); LN(x).slugJsonl = 0; return x; }, {}, /slugJsonl 0, not 1/],
        ['memoryDir non-empty', () => { const x = mk(); LN(x).memoryDir = 'non-empty'; return x; }, {}, /memoryDir non-empty, not absent\|empty/],
        ['memoryDir empty is fine', () => { const x = mk(); LN(x).memoryDir = 'empty'; return x; }, {}, null],
        ['attempt in graders.json differs from the launches line', () => { const x = mk(); x.gs.graders[T].attempt = 2; return x; }, {}, /attempt 2 in graders\.json, 1 in launches\.jsonl/],
        ['cwd in graders.json differs from the launches line', () => { const x = mk(); x.gs.graders[T].cwd = 'C:/F/grading/other-a1'; return x; }, {}, /cwd in graders\.json differs/],
        ['a launches cwd that is not <slot>-a<attempt> (a shared cwd)', () => { const x = mk(); x.gs.graders[T].cwd = LN(x).cwd = 'C:/F/grading'; return x; }, {}, /is not <slot>-a<attempt>/],
        ['the same cwd used by two attempts', () => { const x = mk(); x.launches.push({ ...LN(x), session_id: 'someothersession' }); return x; }, {}, /was used by 2 attempts/],
        ['the launches model differs from graders.json', () => { const x = mk(); LN(x).model = 'claude-opus-4'; return x; }, {}, /model claude-opus-5-5 in graders\.json, claude-opus-4 in launches\.jsonl/],
        ['a replaced agent with no launches line of its own', () => { const x = replaced(mk()); x.launches = x.launches.filter((l) => l.session_id !== 'agentOLD'); return x; }, {}, /replaced agent agentOLD has no launches\.jsonl line of its own/],
        ['the replaced attempt is not earlier than the replacement', () => { const x = replaced(mk()); x.launches.find((l) => l.session_id === 'agentOLD').attempt = 3; return x; }, {}, /replaced attempt is not earlier/],
        ['a graders.json slot with no attempt', () => { const x = mk(); delete x.gs.graders[T].attempt; return x; }, {}, /attempt undefined in graders\.json/],
    ];
    function replaced(x) {
        x.gs.graders[T].replaced = ['agentOLD'];
        x.gs.graders[T].attempt = 2; x.gs.graders[T].cwd = `C:/F/grading/${T}-a2`; Object.assign(LN(x), { attempt: 2, cwd: `C:/F/grading/${T}-a2` });
        x.launches.push({ slot: T, attempt: 1, session_id: 'agentOLD', model: PIN, exit: 0, cwd: `C:/F/grading/${T}-a1`, startedAt: 'x', endedAt: 'y', slugJsonl: 1, memoryDir: 'absent' });
        x.lines.models.push(`${T}.replaced: {"${PIN}":1} PINNED  (x)`);
        x.lines.memory.push(`${T}.replaced: ABSENT  projectMemory=0 claudeMem=0  (x)`);
        x.lines.audit.push(`${T}.replaced (agentOLD): 5 tool inputs [Grepx1]; FLAGGED 1: TOOL OTHER THAN Read/Write/Edit: Grep; bash=[]; dispatch=match`);
        return x;
    }
    for (const [name, build, extra, rx] of cases) {
        const x = build();
        const problems = x.noMemory ? checkGraders({ gs: x.gs, files: { ...filesOf(x.lines), memory: undefined }, nFiles: 9, pinned: PIN, departureNote: null, launches: x.launches }) : run(x, extra);
        const good = rx === null ? problems.length === 0 : problems.some((p) => rx.test(p));
        ok &&= good;
        console.log(`${good ? 'OK  ' : 'BAD '} graders.json cross-check: ${name}${good ? '' : `  [got ${problems.length ? problems.slice(0, 2).join(' | ').slice(0, 160) : 'no problem'}]`}`);
    }
    // the departure note: a line of section 3 that STARTS with the marker; a mention (A2's own prose) is not the note
    const doc = (s3, after = '') => `## 2. Material\n\nx\n\n## 3. Items\n\n${s3}\n\n## 4. Legs\n\ny\n${after}`;
    const noteCases = [
        ['a section 3 line starting with the marker, with its date time', doc('**DEPARTURE-S6-ACCEPTED 2026-10-03 22:40** the user said yes'), (r) => r?.when === '2026-10-03 22:40'],
        ['... a heading line above it carrying the date time', doc('**2026-10-03 22:41 note**\n- DEPARTURE-S6-ACCEPTED: the user said yes'), (r) => r?.when === '2026-10-03 22:41'],
        ['a mere mention in section 3 (A2\'s own prose: "contains `DEPARTURE-S6-ACCEPTED`") is NOT the note', doc('the registered file contains `DEPARTURE-S6-ACCEPTED` on its first line 2026-10-03 22:40'), (r) => r === null],
        ['the marker at the start of a line OUTSIDE section 3 (an amendment) is not the note', doc('nothing', '\nDEPARTURE-S6-ACCEPTED 2026-10-03 22:40\n'), (r) => r === null],
        ['a note with no date time reads { when: null }', doc('DEPARTURE-S6-ACCEPTED the user said yes'), (r) => r && r.when === null],
        ['no marker anywhere', doc('nothing here'), (r) => r === null],
        ['the real registered file today holds no departure note', fs.readFileSync(path.join(HERE, '..', '..', 'PREREGISTER-turn-followup.md'), 'utf8'), (r) => r === null],
    ];
    for (const [name, text, test] of noteCases) {
        const r = findDepartureNote(text);
        const good = !!test(r);
        ok &&= good;
        console.log(`${good ? 'OK  ' : 'BAD '} departure note: ${name}`);
    }
    const pl = parseTagLines('blind-1.g1: {"a":1} PINNED\nblind-1.g2 (abc123): x; clean\nnoise\nblind-1.g1.replaced: y\n');
    const goodParse = pl.size === 3 && pl.get('blind-1.g2')[0].id === 'abc123' && pl.get('blind-1.g1.replaced')[0].rest === 'y';
    ok &&= goodParse; console.log(`${goodParse ? 'OK  ' : 'BAD '} tool lines parse as "<tag>: ..." and "<tag> (<id>): ...", the .replaced tag apart, noise ignored`);
}
console.log(ok ? '\nCALIBRATION OK: every section 7 branch and edge reads as pre-registered' : '\nCALIBRATION FAILED');
process.exit(ok ? 0 : 1);
