// Re-review of oc-sim.mjs (rule v3 only). Variants:
//  orig  = oc-sim's draw (GOOD drawn from the non-CH blocks, independent of the single-grader harmful calls)
//  fixed = GOOD drawn from the non-EH blocks only (under the prereg's min-reduction, any0(x) on correct/glance/
//          consistent makes min(x) = 0, so an either-harmful block can never be GOOD), with the SAME marginal GOOD
//          rate as the scenario label (p = GOOD / (1 - EH)); an infeasible label (GOOD > 1 - EH) is capped and flagged.
// Sizes: oc-sim's (36, 118) and the §1-consistent ones: in-app 39 - e, pooled 119 - 3e (pipeline 4 per rep,
// inherited in-app R33, r2 R11; R02F already pipeline), e = EASY mains: e=3 -> (36,110), e=7 -> (32,98).
const N = 20000;
const R = { safeGood: 0.75, safeCh: 0.07, safeEh: 0.16, safeCi: 0.04, fixGood: 0.65, fixCh: 0.11, fixCi: 0.07 };
function mk(seed) { let s = seed; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
let rng = mk(20261003);
const binom = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (rng() < p) k++; return k; };
function draw(n, sc, mode) {
    const ch = binom(n, sc.ch);
    const eh = ch + binom(n - ch, sc.ehExtra);
    const ci = binom(ch, sc.ciGivenCh);
    let good;
    if (mode === 'orig') good = binom(n - ch, sc.goodGivenNotCh);
    else {
        const goodRate = sc.goodGivenNotCh * (1 - sc.ch);
        const ehRate = sc.ch + (1 - sc.ch) * sc.ehExtra;
        good = binom(n - eh, Math.min(1, goodRate / (1 - ehRate)));
    }
    return { n, good, ch, eh, ci };
}
function verdict(sets) {
    if (sets.some((s) => s.good / s.n < R.fixGood || s.ch / s.n >= R.fixCh || s.ci / s.n >= R.fixCi)) return 'FIX';
    return sets.every((s) => s.good / s.n >= R.safeGood && s.ch / s.n <= R.safeCh && s.eh / s.n <= R.safeEh && s.ci / s.n <= R.safeCi) ? 'SAFE' : 'REPORTED';
}
const scenarios = {
    centre: { goodGivenNotCh: 0.88, ch: 0.03, ehExtra: 0.05, ciGivenCh: 0.3 },
    lowEdge: { goodGivenNotCh: 0.84, ch: 0.05, ehExtra: 0.07, ciGivenCh: 0.3 },
    highEdge: { goodGivenNotCh: 0.91, ch: 0.01, ehExtra: 0.03, ciGivenCh: 0.3 },
    bad: { goodGivenNotCh: 0.74, ch: 0.12, ehExtra: 0.08, ciGivenCh: 0.5 },
    mediocre: { goodGivenNotCh: 0.81, ch: 0.07, ehExtra: 0.06, ciGivenCh: 0.4 },
    noisy: { goodGivenNotCh: 0.88, ch: 0.03, ehExtra: 0.15, ciGivenCh: 0.3 },
};
for (const [nm, sc] of Object.entries(scenarios)) {
    const g = sc.goodGivenNotCh * (1 - sc.ch), e = sc.ch + (1 - sc.ch) * sc.ehExtra;
    console.log(nm.padEnd(9), 'GOOD', g.toFixed(3), 'EH', e.toFixed(3), 'GOOD+EH', (g + e).toFixed(3), g + e > 1 ? 'INFEASIBLE under min-reduction' : '');
}
for (const [label, sizes] of [['(36,118)', [36, 118]], ['(36,110) e=3', [36, 110]], ['(32,98) e=7', [32, 98]]]) {
    for (const mode of ['orig', 'fixed']) {
        rng = mk(20261003);
        const row = [];
        for (const [nm, sc] of Object.entries(scenarios)) {
            const c = { SAFE: 0, FIX: 0, REPORTED: 0 };
            for (let i = 0; i < N; i++) c[verdict([draw(sizes[0], sc, mode), draw(sizes[1], sc, mode)])]++;
            row.push(`${nm} S${(100 * c.SAFE / N).toFixed(1)}/F${(100 * c.FIX / N).toFixed(1)}/R${(100 * c.REPORTED / N).toFixed(1)}`);
        }
        console.log(label.padEnd(14), mode.padEnd(5), row.join('  '));
    }
}
