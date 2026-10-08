// Section D of the revision (the expectation), with this afternoon's "before": 15 of 21 answers with a stream of
// 50 ms or more have R2 under 15 ms (14 of 20 inside the hour). Exact binomial tails for n = 20 and 21.
//   q = chance that a CORRECT early close still writes the cues line and the budget line under 15 ms apart on an
//       answer whose stream lasted 50 ms or more (its first prose character came in the stream's last chunk)
//   h = the same chance WITH the hold: 0.70 measured this afternoon (0.64 at 05:00 over all 22)
const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
const pmf = (n, k, p) => C(n, k) * p ** k * (1 - p) ** (n - k);
const cdf = (n, k, p) => { let s = 0; for (let i = 0; i <= k; i++) s += pmf(n, i, p); return s; };
const pct = (x) => (x < 0.0005 ? '<0.05' : (100 * x).toFixed(1)) + '%';
for (const n of [20, 21]) {
    console.log(`\nn = ${n}`);
    for (const k of [3, 5]) {
        const cells = [0.02, 0.05, 0.10, 0.15, 0.20].map((q) => `q=${q}: ${pct(1 - cdf(n, k, q))}`).join('  ');
        const hold = [0.5, 0.6, 0.7].map((h) => `h=${h}: ${pct(cdf(n, k, h))}`).join('  ');
        console.log(`  "at most ${k} under 15 ms" -> a correct build fails it:  ${cells}`);
        console.log(`  ${' '.repeat(22)}  a build with the hold passes it: ${hold}`);
    }
    const half = Math.ceil(n / 2);
    console.log(`  "NOT GONE at ${half} or more" -> a correct build reads NOT GONE: ${[0.10, 0.20, 0.30].map((q) => `q=${q}: ${pct(1 - cdf(n, half - 1, q))}`).join('  ')};  a build with the hold reads NOT GONE: ${[0.5, 0.6, 0.7].map((h) => `h=${h}: ${pct(1 - cdf(n, half - 1, h))}`).join('  ')}`);
}
