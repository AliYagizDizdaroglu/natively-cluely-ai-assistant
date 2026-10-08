// Operating characteristics of the cue-grading decision rule (PREREGISTER-cue-grading.md §5), review I5.
// Monte Carlo over independent per-block draws: consensus-harmful (CH), either-harmful (EH = CH plus an extra
// single-grader call), consensus cue-introduced (CI, a subset of CH), and GOOD. Two sets: IN-APP (n blocks) and the
// pooled TWINS-H (3 reps). Independence is an approximation (the same item recurs across reps); it is stated as such.
//
// Revision 3 (re-review m1, m2): sizes (36, 110) = §1's e = 3 EASY mains (in-app 39 - e, pooled 119 - 3e), not the
// rev 2 (36, 118); GOOD is drawn only among blocks that are NOT either-harmful (under the min-reduction an
// either-harmful block can never be GOOD), and each scenario is specified by its MARGINAL GOOD rate, from which the
// conditional p(GOOD | not EH) = GOOD / (1 - EH) is derived, so every scenario is feasible by construction.
// Rev 2 drew GOOD among non-CH blocks and labelled the noisy scenario GOOD .85 with EH .175 (sum > 1): rev 3 labels
// it GOOD .80, the largest round value under 1 - EH.
//   node oc-sim.mjs
const N = 20000;
const rng = (() => { let s = 20261003; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();
const binom = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (rng() < p) k++; return k; };

function draw(n, sc) {
    const ch = binom(n, sc.ch);
    const eh = ch + binom(n - ch, sc.ehExtra);
    const ci = binom(ch, sc.ciGivenCh);
    const ehRate = sc.ch + (1 - sc.ch) * sc.ehExtra;
    const goodGivenNotEh = sc.good / (1 - ehRate);
    if (goodGivenNotEh > 1) throw new Error(`infeasible scenario: GOOD ${sc.good} + EH ${ehRate.toFixed(3)} > 1`);
    const good = binom(n - eh, goodGivenNotEh);   // an either-harmful block is never GOOD (min-reduction)
    return { n, good, ch, eh, ci };
}

// Rule: rates on the cue-attributable denominator. Counts are rates x n, so one rule serves both set sizes.
function verdict(inapp, twins, R) {
    const sets = [inapp, twins];
    const fix = sets.some((s) => s.good / s.n < R.fixGood || s.ch / s.n >= R.fixCh || s.ci / s.n >= R.fixCi);
    if (fix) return 'FIX';
    const safe = sets.every((s) => s.good / s.n >= R.safeGood && s.ch / s.n <= R.safeCh && s.eh / s.n <= R.safeEh && s.ci / s.n <= R.safeCi);
    return safe ? 'SAFE' : 'REPORTED';
}

const RULES = {
    draft: { safeGood: 0.80, safeCh: 0.05, safeEh: 0.12, safeCi: 0.025, fixGood: 0.70, fixCh: 0.10, fixCi: 0.05 },
    v2: { safeGood: 0.78, safeCh: 0.06, safeEh: 0.14, safeCi: 0.04, fixGood: 0.68, fixCh: 0.10, fixCi: 0.06 },
    v3: { safeGood: 0.75, safeCh: 0.07, safeEh: 0.16, safeCi: 0.04, fixGood: 0.65, fixCh: 0.11, fixCi: 0.07 },   // registered
    v4: { safeGood: 0.75, safeCh: 0.07, safeEh: 0.18, safeCi: 0.05, fixGood: 0.65, fixCh: 0.12, fixCi: 0.08 },   // tried, looser, not chosen
};
const scenarios = {
    'expectation centre (GOOD .85, CH .03, EH +.05, CI|CH .3)': { good: 0.85, ch: 0.03, ehExtra: 0.05, ciGivenCh: 0.3 },
    'expectation low edge (GOOD .80, CH .05, EH +.07)': { good: 0.80, ch: 0.05, ehExtra: 0.07, ciGivenCh: 0.3 },
    'expectation high edge (GOOD .90, CH .01, EH +.03)': { good: 0.90, ch: 0.01, ehExtra: 0.03, ciGivenCh: 0.3 },
    'bad rule (GOOD .65, CH .12, CI|CH .5)': { good: 0.65, ch: 0.12, ehExtra: 0.08, ciGivenCh: 0.5 },
    'mediocre rule (GOOD .75, CH .07, CI|CH .4)': { good: 0.75, ch: 0.07, ehExtra: 0.06, ciGivenCh: 0.4 },
    'noisy graders, good rule (GOOD .80, CH .03, EH +.15)': { good: 0.80, ch: 0.03, ehExtra: 0.15, ciGivenCh: 0.3 },
};
const sizes = { inapp: 36, twins: 110 };   // cue-attributable HARD blocks after the §1 exclusions, e = 3 EASY mains (expected)
console.log('sizes', JSON.stringify(sizes), 'draws', N);
for (const [rn, RULE] of Object.entries(RULES)) {
    console.log(`\nrule ${rn}`, JSON.stringify(RULE), 'in-app counts: safe ch<=', Math.floor(RULE.safeCh * sizes.inapp), 'eh<=', Math.floor(RULE.safeEh * sizes.inapp), 'ci<=', Math.floor(RULE.safeCi * sizes.inapp), '| fix ch>=', Math.ceil(RULE.fixCh * sizes.inapp), 'ci>=', Math.ceil(RULE.fixCi * sizes.inapp), '| twins: safe ch<=', Math.floor(RULE.safeCh * sizes.twins), 'eh<=', Math.floor(RULE.safeEh * sizes.twins), 'ci<=', Math.floor(RULE.safeCi * sizes.twins), '| fix ch>=', Math.ceil(RULE.fixCh * sizes.twins), 'ci>=', Math.ceil(RULE.fixCi * sizes.twins));
    for (const [name, sc] of Object.entries(scenarios)) {
        const c = { SAFE: 0, FIX: 0, REPORTED: 0 };
        for (let i = 0; i < N; i++) c[verdict(draw(sizes.inapp, sc), draw(sizes.twins, sc), RULE)]++;
        console.log(name.padEnd(58), Object.entries(c).map(([k, v]) => `${k} ${(100 * v / N).toFixed(1)}%`).join('  '));
    }
}
