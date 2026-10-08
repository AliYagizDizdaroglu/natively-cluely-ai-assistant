// The combined band says "wash". Does that hold when mains and follow-ups are separated?
// Follow-ups may be saturated, and a saturated half dilutes a real effect in the other half.
// Exact permutation test on 3 reps a side: with 6 numbers split 3/3 there are only C(6,3)=20
// labellings, so the p-value is exact and countable, not estimated.
import { readFileSync, existsSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const load = (t) => { const f = `${S}/s50m-verdicts-${t}.json`; return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };

const LOWS = ['captured-low', 'captured-low-r2', 'captured-low-r3'];
const HIGHS = ['captured-high', 'captured-high-r2', 'captured-high-r3'];
const V = Object.fromEntries([...LOWS, ...HIGHS, 'inapp'].map((t) => [t, load(t)]));

let shared = null;
for (const t of [...LOWS, ...HIGHS, 'inapp']) {
    const ks = new Set(Object.keys(V[t]));
    shared = shared === null ? ks : new Set([...shared].filter((k) => ks.has(k)));
}
const SH = [...shared].sort();
const isFollowUp = (k) => /F$/.test(k);
const mains = SH.filter((k) => !isFollowUp(k));
const fups = SH.filter(isFollowUp);

const score = (tag, keys) => keys.reduce((n, k) => n + (V[tag][k] && verdictOf(V[tag][k]) === 'acceptable' ? 1 : 0), 0);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// Exact one-sided permutation test over all 20 relabellings of six rep scores.
function permP(lo, hi) {
    const all = [...lo, ...hi];
    const obs = mean(hi) - mean(lo);
    let atLeast = 0, total = 0;
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) for (let k = j + 1; k < 6; k++) {
        const pick = [all[i], all[j], all[k]];
        const rest = all.filter((_, x) => x !== i && x !== j && x !== k);
        total++;
        if (mean(pick) - mean(rest) >= obs - 1e-9) atLeast++;
    }
    return { obs, atLeast, total, p: atLeast / total };
}

for (const [label, keys] of [['ALL SHARED', SH], ['MAINS ONLY', mains], ['FOLLOW-UPS ONLY', fups]]) {
    const lo = LOWS.map((t) => score(t, keys));
    const hi = HIGHS.map((t) => score(t, keys));
    const live = score('inapp', keys);
    const r = permP(lo, hi);
    const overlap = Math.min(...hi) <= Math.max(...lo);
    console.log(`\n${label}  (${keys.length} items)`);
    console.log(`  3.1 LOW   reps ${lo.join('/')}   range ${Math.min(...lo)}-${Math.max(...lo)}  mean ${mean(lo).toFixed(1)}`);
    console.log(`  3.5 HIGH  reps ${hi.join('/')}   range ${Math.min(...hi)}-${Math.max(...hi)}  mean ${mean(hi).toFixed(1)}`);
    console.log(`  LIVE hour (3.5) ${live}`);
    console.log(`  bands overlap: ${overlap ? 'YES' : 'NO — 3.5 worst beats 3.1 best'}`);
    console.log(`  mean gain +${r.obs.toFixed(2)}   exact permutation p = ${r.atLeast}/${r.total} = ${r.p.toFixed(3)}`);
}
console.log('\nNOTE: the mains/follow-up split was NOT pre-registered. It is a post-hoc slice,');
console.log('reported as a hypothesis for the next instrument, not as grounds to pass a failed rule.');
