// Rule-8 calibration of decide-spike6.mjs's chooseWording(): synthetic spike rows, each set with a known winner under
// SPIKE6-RULE.md, one per branch (primary, each disqualifier, the 3.5-lite empties addendum, each tie key, all out).
import { chooseWording, ARMS, M31, M35 } from './decide-spike6.mjs';

const SIMPLE = { X1: 'Boosting', X2: 'Not necessary', X3: 'CPU utilization', X4: 'Parquet', X5: 'O(log n)', X6: 'Batch scoring' };
/** A full arm on one model: 24 simple (6 ids x 4 reps), 4 medium, 8 complex (S1Q09 x4 with 6 services, S1Q07 x4). */
function arm(model, name, { oneLine = 0, answerFirst = 24, emptySimple = 0, noText = 0, over3 = 0, services = 6, wordsExtra = 0 } = {}) {
    const rows = [];
    let k = 0;
    for (const [id, ans] of Object.entries(SIMPLE)) for (let rep = 1; rep <= 4; rep++) {
        const i = k++;
        let cues, raw = 'some answer text';
        if (i < emptySimple) cues = [];
        else if (i < emptySimple + noText) { cues = []; raw = ''; }
        else {
            const first = i < emptySimple + noText + answerFirst ? ans : 'Something else entirely';
            cues = i < emptySimple + noText + oneLine ? [first] : [first, 'Second point'];
        }
        const total = cues.reduce((a, c) => a + c.split(/\s+/).length, 0) + (cues.length ? wordsExtra : 0);
        rows.push({ id, kind: 'simple', model, arm: name, rep, n: cues.length, total, cues, spec: null, raw });
    }
    for (let rep = 1; rep <= 4; rep++) rows.push({ id: 'M1', kind: 'medium', model, arm: name, rep, n: 2, total: 4, cues: ['Layer caching', 'Instruction ordering'], spec: null, raw: 'x' });
    for (let rep = 1; rep <= 4; rep++) rows.push({ id: 'S1Q09', kind: 'complex', model, arm: name, rep, n: rep <= over3 ? 4 : 3, total: 15, cues: ['a', 'b', 'c'], spec: services, raw: 'x' });
    for (let rep = 1; rep <= 4; rep++) rows.push({ id: 'S1Q07', kind: 'complex', model, arm: name, rep, n: 3, total: 14, cues: ['a', 'b', 'c'], spec: null, raw: 'x' });
    return rows;
}
const set = (spec) => ARMS.flatMap((a) => [...arm(M31, a, spec[a]?.[M31] ?? {}), ...arm(M35, a, spec[a]?.[M35] ?? {})]);

const CASES = [
    ['primary: one-first has 3 more one-line answers on 3.5', set({ 'one-first': { [M35]: { oneLine: 10 } }, 'strict-ex': { [M35]: { oneLine: 7 } }, 'cap3-min': { [M35]: { oneLine: 5 } } }), 'one-first'],
    ['one-line that does NOT carry the answer does not count', set({ 'cap3-min': { [M35]: { oneLine: 12, answerFirst: 0 } }, 'strict-ex': { [M35]: { oneLine: 6 } } }), 'strict-ex'],
    ['disqualified: 3 complex over 3 lines on 3.1', set({ 'one-first': { [M35]: { oneLine: 12 }, [M31]: { over3: 3 } }, 'strict-ex': { [M35]: { oneLine: 6 } } }), 'strict-ex'],
    ['disqualified: S1Q09 services p50 4', set({ 'one-first': { [M35]: { oneLine: 12, services: 4 } }, 'cap3-min': { [M35]: { oneLine: 7 } } }), 'cap3-min'],
    ['disqualified: 3 empty simple blocks on 3.1', set({ 'one-first': { [M35]: { oneLine: 12 }, [M31]: { emptySimple: 3 } }, 'strict-ex': { [M35]: { oneLine: 6 } } }), 'strict-ex'],
    ['addendum: 2 empty blocks on 3.5 disqualify', set({ 'one-first': { [M35]: { oneLine: 12, emptySimple: 2 } }, 'strict-ex': { [M35]: { oneLine: 6 } } }), 'strict-ex'],
    ['a no-text response is not an empty block', set({ 'one-first': { [M35]: { oneLine: 12, noText: 2 } }, 'strict-ex': { [M35]: { oneLine: 6 } } }), 'one-first'],
    ['tie within 2: fewer empties wins', set({ 'one-first': { [M35]: { oneLine: 9, emptySimple: 1 } }, 'strict-ex': { [M35]: { oneLine: 8 } } }), 'strict-ex'],
    ['tie within 2, equal empties: more answer-first wins', set({ 'cap3-min': { [M35]: { oneLine: 9, answerFirst: 20 }, [M31]: { answerFirst: 20 } }, 'one-first': { [M35]: { oneLine: 8 } } }), 'one-first'],
    ['tie within 2, equal empties and answer-first: fewer words wins', set({ 'cap3-min': { [M35]: { oneLine: 9, wordsExtra: 3 } }, 'one-first': { [M35]: { oneLine: 9 } }, 'strict-ex': { [M35]: { oneLine: 9, wordsExtra: 3 } } }), 'one-first'],
    ['full tie: strict-ex', set({}), 'strict-ex'],
    ['every arm out: fewest over-3 wins', set({ 'cap3-min': { [M31]: { over3: 4 } }, 'strict-ex': { [M31]: { over3: 3 } }, 'one-first': { [M35]: { emptySimple: 2 } } }), 'one-first'],
];
let ok = true;
for (const [name, rows, want] of CASES) {
    const r = chooseWording(rows);
    const good = r.winner === want;
    ok &&= good;
    console.log(`${good ? 'OK ' : 'BAD'} ${name}: ${r.winner} (want ${want}) — ${r.branch}${Object.keys(r.disq).length ? `; out: ${Object.keys(r.disq).join(', ')}` : ''}`);
}
console.log(ok ? 'SPIKE6 RULE CALIBRATION OK' : 'SPIKE6 RULE CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
