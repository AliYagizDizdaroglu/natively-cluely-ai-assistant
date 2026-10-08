// Item 5: how often does each version of the timing expectation give the wrong answer? Exact binomial tails.
//   q = the chance that a CORRECT early close still logs cues and budget under 15 ms apart on one answer
//       (the prose came in one piece: a one-burst answer, or a first chunk that ends inside the block)
//   h = the same chance WITH the hold (no early close): 14 of 22 = 0.64 at the 05:00 smoke
// "false NOT GONE" = a correct build fails the expectation; "false GONE" = a build with the hold passes it.
const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
const pmf = (n, k, p) => C(n, k) * p ** k * (1 - p) ** (n - k);
const cdf = (n, k, p) => { let s = 0; for (let i = 0; i <= k; i++) s += pmf(n, i, p); return s; };   // P(X <= k)
const pct = (x) => (100 * x).toFixed(x < 0.001 ? 3 : 1) + '%';

console.log('--- the spec\'s rule: at most 3 answers under 15 ms, over ALL answers with prose (n about 22) ---');
for (const q of [1 / 47, 3 / 47, 0.10, 3 / 16, 0.25]) console.log(`  a correct build, q = ${q.toFixed(3)}: P(4 or more of 22 under 15 ms) = false NOT GONE ${pct(1 - cdf(22, 3, q))}`);
for (const h of [0.5, 14 / 22]) console.log(`  the hold, h = ${h.toFixed(2)}: P(3 or fewer of 22) = false GONE ${pct(cdf(22, 3, h))}`);

console.log('\n--- a share rule over the answers that can tell (stream of 50 ms or more): GONE at most n/4, NOT GONE at least n/2 ---');
for (const n of [10, 12, 14, 16, 18, 20]) {
    const lo = Math.floor(n / 4), hi = Math.ceil(n / 2);
    const row = [`n ${String(n).padStart(2)}: GONE <= ${lo}, NOT GONE >= ${hi}`];
    for (const q of [0.05, 0.10, 0.15]) row.push(`correct q=${q}: not GONE ${pct(1 - cdf(n, lo, q))}, read NOT GONE ${pct(1 - cdf(n, hi - 1, q))}`);
    for (const h of [0.5, 0.64, 0.75]) row.push(`hold h=${h}: read GONE ${pct(cdf(n, lo, h))}`);
    console.log('  ' + row.join(' | '));
}

console.log('\n--- "at most 3" kept as an absolute count over the answers with a stream of 50 ms or more ---');
for (const n of [12, 16, 20]) for (const q of [0.05, 0.10, 0.15]) console.log(`  n ${n}, correct q=${q}: P(4 or more) = false NOT GONE ${pct(1 - cdf(n, 3, q))};  hold h=0.64: P(3 or fewer) = false GONE ${pct(cdf(n, 3, 0.64))}`);

// The median of Appendix B's 22 gaps, and where 9.5 comes from.
const gaps = [13, 5, 7, 6, 369, 5, 46, 3, 283, 4, 5, 4, 3, 157, 1231, 129, 12, 3, 5, 92, 3, 127];
const s = [...gaps].sort((a, b) => a - b);
console.log(`\nAppendix B: n ${s.length}; sorted ${s.join(' ')}`);
console.log(`median = (11th + 12th)/2 = (${s[10]} + ${s[11]})/2 = ${(s[10] + s[11]) / 2};  the spec's 9.5 = (12th + 13th)/2 = (${s[11]} + ${s[12]})/2 = ${(s[11] + s[12]) / 2} (an off-by-one);  under 15 ms: ${s.filter((x) => x < 15).length};  p90 (nearest rank) ${s[Math.ceil(0.9 * s.length) - 1]};  the plan's own script's p90 index floor(0.9 n) = ${Math.floor(0.9 * s.length)} -> ${s[Math.floor(0.9 * s.length)]}`);
console.log(`50 ms over the true median: ${(50 / 6.5).toFixed(1)} times (the spec says "more than five times above today's 9.5 ms": 50/9.5 = ${(50 / 9.5).toFixed(2)});  156/50 = ${(156 / 50).toFixed(2)};  3 of 22 = ${(3 / 22 * 100).toFixed(1)}% against 3 of 47 = ${(3 / 47 * 100).toFixed(1)}% -> ${(3 / 22 / (3 / 47)).toFixed(2)} times`);
