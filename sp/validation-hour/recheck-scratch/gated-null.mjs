// Re-check: null STOP probability of 3c's gated wrong clause when cue and control reps are iid (no cue effect).
// Per rep, the gated wrong count ~ Poisson(lambda). Clause A (revision 2, benchDecide): some cue rep > max control rep.
// Clause B (alternative): sum over the three cue reps >= sum over the three control reps + 2.
// Also the expectation of clause A under the Beta posteriors that nine zero reps give for a per-rep event chance.
const pois = (l, k) => Math.exp(-l) * l ** k / [...Array(k).keys()].reduce((f, i) => f * (i + 1), 1);
const K = 12;
function clauseA(l) {
    const pmf = [...Array(K).keys()].map((k) => pois(l, k));
    const cdf = (k) => pmf.slice(0, k + 1).reduce((a, b) => a + b, 0);
    const pmax = pmf.map((_, k) => cdf(k) ** 3 - (k ? cdf(k - 1) ** 3 : 0));
    let s = 0; for (let a = 0; a < K; a++) for (let b = 0; b < a; b++) s += pmax[a] * pmax[b];
    return s;
}
function clauseB(l) {
    const L = 3 * l, pmf = [...Array(K * 3).keys()].map((k) => pois(L, k));
    let s = 0; for (let c = 0; c < pmf.length; c++) for (let n = 0; n <= c - 2; n++) s += pmf[c] * pmf[n];
    return s;
}
for (const p of [0.01, 0.02, 0.05, 0.1, 0.2]) {
    const l = -Math.log(1 - p); // per-rep chance of >= 1 event = p
    console.log(`per-rep chance of >= 1 gated wrong ${(p * 100).toFixed(0)}%: clause A (revision 2) ${(clauseA(l) * 100).toFixed(1)}%   clause B (sums, margin 1) ${(clauseB(l) * 100).toFixed(1)}%`);
}
// Beta posterior expectation of the Bernoulli form of clause A: E[(1-p)^3 - (1-p)^6] = B(a, b+3)/B(a,b) - B(a, b+6)/B(a,b).
const lgamma = (x) => { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x); x -= 1; let a = c[0]; const t = x + g + 0.5; for (let i = 1; i < g + 2; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); };
const lbeta = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);
for (const [name, a, b] of [['uniform prior, 0 of 9 reps', 1, 10], ['Jeffreys prior, 0 of 9 reps', 0.5, 9.5]]) {
    const e = (k) => Math.exp(lbeta(a, b + k) - lbeta(a, b));
    console.log(`${name}: expected null STOP of clause A ${(100 * (e(3) - e(6))).toFixed(1)}%`);
}
console.log(`95% upper bound on the per-rep chance after 0 of 9: ${(100 * (1 - 0.05 ** (1 / 9))).toFixed(1)}%`);
