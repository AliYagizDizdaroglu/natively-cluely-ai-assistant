// calibrate-latency-rule.mjs — sets the margins in paired-latency.decide.mjs and states what the
// rule can and cannot catch, BEFORE any counted window runs. Input is the 2026-09-22 probe run
// (39 paired prompts), which generated the hypothesis and does not count toward the verdict.
//
// The margins come from the null only — the two models' labels swapped at random inside each
// pair, which destroys any real difference while keeping the realistic spread of latencies —
// never from how the observed data would fare.
import fs from 'node:fs';
import { pairsOf, decide, effectiveWait, forcedFallback, pct } from './paired-latency.decide.mjs';

const SRC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/paired-latency.json';
const N = 117;        // three windows of 39
const B = 20_000;
let seed = 20260923;  // fixed, so the numbers in the rule reproduce
const rand = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const base = pairsOf(JSON.parse(fs.readFileSync(SRC, 'utf8')), '2026-09-22');
const sample = (transform) => Array.from({ length: N }, () => transform(base[Math.floor(rand() * base.length)]));
const swap = (p) => ({ ...p, cand: p.inc, inc: p.cand });
const stallIf = (r, prob) => (rand() < prob ? { ...r, error: undefined, ttft: 12_000 } : r);

// ── 1. The null: how far apart do equal models land at n = 117? ─────────────────────────────────
const dMed = [], dP90 = [], dFail = [];
for (let b = 0; b < B; b++) {
    const ps = sample((p) => (rand() < 0.5 ? swap(p) : p));
    const wc = ps.map((p) => effectiveWait(p.cand, p.inc)), wi = ps.map((p) => effectiveWait(p.inc, p.cand));
    dMed.push(pct(wc, 0.5) - pct(wi, 0.5));
    dP90.push(pct(wc, 0.9) - pct(wi, 0.9));
    dFail.push(ps.filter((p) => forcedFallback(p.cand)).length - ps.filter((p) => forcedFallback(p.inc)).length);
}
const q = (xs, p) => pct(xs, p);
console.log(`NULL (labels swapped at random inside each pair, ${B} bootstraps of ${N} pairs)`);
console.log(`  median-wait gap, candidate minus incumbent: 95% ${q(dMed, .95)}  97.5% ${q(dMed, .975)}  99% ${q(dMed, .99)} ms`);
console.log(`  p90-wait gap:                               95% ${q(dP90, .95)}  97.5% ${q(dP90, .975)}  99% ${q(dP90, .99)} ms`);
console.log(`  forced-fallback gap (only 2 failures in the source, so this understates it — see 2)`);

// ── 2. Forced fallbacks are rare, so their null is taken from the flights, not from 39 pairs ────
// Equal true rates, n = 117 each; exact distribution of (candidate count − incumbent count).
const binom = (n, p) => { const out = [Math.pow(1 - p, n)]; for (let k = 1; k <= n; k++) out.push(out[k - 1] * ((n - k + 1) / k) * (p / (1 - p))); return out; };
console.log(`\nFORCED-FALLBACK NULL (equal true rates, exact): P(candidate exceeds incumbent by MORE than m)`);
for (const rate of [0.025, 0.04, 0.06]) {
    const f = binom(N, rate);
    const tail = (m) => { let s = 0; for (let a = 0; a <= N; a++) for (let c = a + m + 1; c <= N; c++) s += f[a] * f[c]; return s; };
    console.log(`  rate ${(rate * 100).toFixed(1)}%: ` + [2, 3, 4, 5, 6].map((m) => `m=${m} ${(tail(m) * 100).toFixed(1)}%`).join('  '));
}

// ── 3. Margins: smallest round values at or under 2.5 % false-fail each ────────────────────────
const roundUp = (x, step) => Math.max(step, Math.ceil(x / step) * step);
const margins = { medianMs: roundUp(q(dMed, 0.975), 250), p90Ms: roundUp(q(dP90, 0.975), 250), failures: NaN };
{
    // at the conservative end of what the flights have shown: 8 stalls in 200 answers, both models pooled
    const f = binom(N, 0.04);
    for (let m = 0; m <= 20; m++) {
        let s = 0; for (let a = 0; a <= N; a++) for (let c = a + m + 1; c <= N; c++) s += f[a] * f[c];
        if (s <= 0.025) { margins.failures = m; break; }
    }
}
console.log(`\nMARGINS: median ${margins.medianMs} ms, p90 ${margins.p90Ms} ms, forced fallbacks ${margins.failures}`);

// ── 4. What the rule does with those margins, against cases whose answer is known ──────────────
const rate = (transform, want) => {
    let hits = 0;
    for (let b = 0; b < 5000; b++) if (decide(sample(transform), margins).pass === want) hits++;
    return `${((hits / 5000) * 100).toFixed(1)}%`;
};
console.log(`\nOPERATING CHARACTERISTICS (5000 bootstraps of ${N} pairs each)`);
console.log(`  equal models (labels swapped at random)          → PASS ${rate((p) => (rand() < 0.5 ? swap(p) : p), true)}   (want ≥ 90%)`);
console.log(`  as measured on 2026-09-22                        → PASS ${rate((p) => p, true)}`);
console.log(`  reversed: candidate as slow as the incumbent was → FAIL ${rate(swap, false)}   (want ~100%)`);
console.log(`  candidate stalls 10% (s50m's live hour), incumbent 2.5%, otherwise as measured → FAIL ${rate((p) => ({ ...p, cand: stallIf(p.cand, 0.10), inc: stallIf(p.inc, 0.025) }), false)}`);
console.log(`  candidate stalls 6.25% (its flight record), incumbent 2.5%, otherwise as measured → FAIL ${rate((p) => ({ ...p, cand: stallIf(p.cand, 0.0625), inc: stallIf(p.inc, 0.025) }), false)}`);
console.log(`  candidate stalls 15%, incumbent 2.5%, otherwise as measured              → FAIL ${rate((p) => ({ ...p, cand: stallIf(p.cand, 0.15), inc: stallIf(p.inc, 0.025) }), false)}`);
console.log(`  both stall 4%, otherwise as measured                                     → PASS ${rate((p) => ({ ...p, cand: stallIf(p.cand, 0.04), inc: stallIf(p.inc, 0.04) }), true)}`);

// ── 5. The 2026-09-22 run itself, for context only (it does not count) ─────────────────────────
const obs = decide(base, margins);
console.log(`\n2026-09-22 run (39 pairs, context only — does not count):`);
for (const c of obs.conditions) console.log(`  ${c.pass ? 'pass' : 'fail'}  ${c.name.padEnd(28)} candidate ${c.cand}  incumbent ${c.inc}`);
