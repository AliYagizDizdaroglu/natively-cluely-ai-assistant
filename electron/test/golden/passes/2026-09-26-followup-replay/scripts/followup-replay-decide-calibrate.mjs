// Rule-8 calibration of followup-replay-decide.mjs's decide() on three synthetic 30-(item,rep)-
// pair sets, per the h40c Task 6 brief's exact three cases. A check that decides something must
// be run on a known case before being trusted.
import { decide } from './followup-replay-decide.mjs';

const IDS = ['S1Q04F', 'S1Q05F', 'S1Q06F', 'S1Q07F', 'S1Q08F', 'S2Q04F', 'S2Q05F', 'S2Q06F', 'S2Q07F', 'S2Q08F'];
const REPS = [1, 2, 3];

function pairsWith(vA, vB) {
    const pairs = [];
    for (const id of IDS) for (const rep of REPS) {
        pairs.push({ id, rep, arm: 'A', verdict: vA(id, rep) });
        pairs.push({ id, rep, arm: 'B', verdict: vB(id, rep) });
    }
    return pairs;
}

const cases = [
    { name: 'all B acceptable, all A weak', pairs: pairsWith(() => 'weak', () => 'acceptable'), expect: 'PASS' },
    { name: 'identical (all acceptable both arms)', pairs: pairsWith(() => 'acceptable', () => 'acceptable'), expect: 'FAIL' },
    // B acceptable 3 more than A: A gets 10 acceptable (one per id, rep 1 only), B gets 13
    // (one per id, rep 1 only, plus 3 more on rep 2 for the first three ids) — delta = +3,
    // which lands strictly between the PASS (+5) and FAIL (<=+1) thresholds.
    {
        name: 'B acceptable 3 more than A',
        pairs: pairsWith(
            (id, rep) => (rep === 1 ? 'acceptable' : 'weak'),
            (id, rep) => (rep === 1 ? 'acceptable' : rep === 2 && ['S1Q04F', 'S1Q05F', 'S1Q06F'].includes(id) ? 'acceptable' : 'weak'),
        ),
        expect: 'INCONCLUSIVE',
    },
];

let allOk = true;
for (const c of cases) {
    const r = decide(c.pairs);
    const ok = r.outcome === c.expect;
    allOk &&= ok;
    console.log(`${ok ? 'OK  ' : 'FAIL'} "${c.name}": got ${r.outcome} (expected ${c.expect}) — ${r.reason}`);
}
console.log(allOk ? '\nCALIBRATION OK: decide() distinguishes all three pre-registered outcomes' : '\nCALIBRATION FAILED');
process.exit(allOk ? 0 : 1);
