// Bound on oc-sim's stated approximation: the same ~37 items recur in-app and in 3 twin reps. Per item a latent
// propensity: with prob q the item is "prone" (it carries 60% of the CH mass), else low. Marginal CH, EH, GOOD match the
// centre / low-edge labels; GOOD drawn from non-EH blocks. q = 0 is oc-sim's independence. Rule v3.
// In-app 36 blocks, twins 110 (37 items x 3, minus 1).
const N = 20000; const R = { safeGood: 0.75, safeCh: 0.07, safeEh: 0.16, safeCi: 0.04, fixGood: 0.65, fixCh: 0.11, fixCi: 0.07 };
let s = 7; const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
function verdict(sets) {
    if (sets.some((x) => x.good / x.n < R.fixGood || x.ch / x.n >= R.fixCh || x.ci / x.n >= R.fixCi)) return 'FIX';
    return sets.every((x) => x.good / x.n >= R.safeGood && x.ch / x.n <= R.safeCh && x.eh / x.n <= R.safeEh && x.ci / x.n <= R.safeCi) ? 'SAFE' : 'REPORTED';
}
function block(pch, pehx, pgood, pci, acc) {
    const ch = rng() < pch; const eh = ch || rng() < pehx; const good = !eh && rng() < pgood; const ci = ch && rng() < pci;
    acc.n++; acc.ch += ch; acc.eh += eh; acc.good += good; acc.ci += ci;
}
for (const [nm, ch, good, ehx] of [['centre', 0.03, 0.854, 0.05], ['lowEdge', 0.05, 0.798, 0.07]]) {
    for (const q of [0, 0.1, 0.05]) {
        const pHi = q ? Math.min(0.9, ch * 0.6 / q) : ch; const pLo = q ? (ch - q * pHi) / (1 - q) : ch;
        const c = { SAFE: 0, FIX: 0, REPORTED: 0 };
        for (let i = 0; i < N; i++) {
            const a = { n: 0, ch: 0, eh: 0, good: 0, ci: 0 }, t = { n: 0, ch: 0, eh: 0, good: 0, ci: 0 };
            const ehRate = ch + (1 - ch) * ehx; const pg = Math.min(1, good / (1 - ehRate));
            for (let it = 0; it < 37; it++) {
                const prone = q && rng() < q; const pch = prone ? pHi : pLo;
                if (it < 36) block(pch, ehx, pg, 0.3, a);
                for (let r = 0; r < 3; r++) if (!(it === 36 && r > 0)) block(pch, ehx, pg, 0.3, t);
            }
            c[verdict([a, t])]++;
        }
        console.log(nm.padEnd(8), 'prone share', q, 'pHi', pHi.toFixed(2), 'pLo', pLo.toFixed(3), 'n', 36, 110, Object.entries(c).map(([k, v]) => `${k} ${(100 * v / N).toFixed(1)}%`).join('  '));
    }
}
