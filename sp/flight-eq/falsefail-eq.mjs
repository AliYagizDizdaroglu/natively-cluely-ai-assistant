// Rule 4b's false-FAIL price for flight eq (ruling 4, 2026-10-04): followup-turn/falsefail.mjs's model at this hour's
// pair counts: P(Binom_B > Binom_A), n pairs, per-pair wrong rate p, A and B independent, no effect; front n=20, back n=12.
const binom = (n, p) => { const a = []; let c = 1; for (let k = 0; k <= n; k++) { if (k > 0) c = c * (n - k + 1) / k; a.push(c * p ** k * (1 - p) ** (n - k)); } return a; };
const pgt = (n, p) => { const b = binom(n, p); let s = 0; for (let i = 0; i <= n; i++) for (let j = i + 1; j <= n; j++) s += b[i] * b[j]; return s; };
console.log('calib n=1 p=.5', pgt(1, .5).toFixed(4), 'p=0', pgt(10, 0), 'replay n70 p=.01', (pgt(70, .01) * 100).toFixed(1) + '% (expect 30.9%)');
for (const p of [0.005, 0.0075, 0.01]) {
    const f = pgt(20, p), b = pgt(12, p), either = 1 - (1 - f) * (1 - b), pooled = pgt(32, p);
    console.log(`p=${p}: front20 ${(f * 100).toFixed(1)}%  back12 ${(b * 100).toFixed(1)}%  either(20,12) ${(either * 100).toFixed(1)}%  pooled32 ${(pooled * 100).toFixed(1)}%`);
}
