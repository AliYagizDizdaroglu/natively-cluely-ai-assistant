// Throwaway rule-8 check of spike 6's "first line carries the answer" test, on answers already seen in spikes 3-5.
// The two lines below must equal the ones make-spike6.mjs wrote into spike6.mjs (checked), so this tests THAT code.
import fs from 'node:fs';
const TERMS_LINE = "const TERMS = { X1: /boost/i, X2: /\\bno\\b|\\bnot\\b|n't|unnecessary|invarian/i, X3: /cpu/i, X4: /parquet/i, X5: /log/i, X6: /batch/i };";
const FIRST_LINE = 'const firstCarries = (r) => r.n >= 1 && Boolean(TERMS[r.id]?.test(r.cues[0]));';
const src = fs.readFileSync(new URL('./spike6.mjs', import.meta.url), 'utf8');
if (!src.includes(TERMS_LINE) || !src.includes(FIRST_LINE)) { console.log('MISMATCH: spike6.mjs does not carry these exact lines'); process.exit(1); }
const TERMS = { X1: /boost/i, X2: /\bno\b|\bnot\b|n't|unnecessary|invarian/i, X3: /cpu/i, X4: /parquet/i, X5: /log/i, X6: /batch/i };
const firstCarries = (r) => r.n >= 1 && Boolean(TERMS[r.id]?.test(r.cues[0]));
// Known cases, read by eye from the spike logs: first line -> does it carry the direct answer?
const KNOWN = [
    ['X1', ['Boosting method', 'Sequential error correction'], true],
    ['X1', ['Sequential error correction', 'Boosting'], false],
    ['X1', ['gradient boosting framework'], true],
    ['X2', ['Not strictly necessary'], true],
    ['X2', ['No, tree-based models are scale-invariant'], true],
    ['X2', ['Tree models are invariant', 'No normalization needed'], true],
    ['X2', ['Splits use monotonic thresholds', 'No normalization needed'], false],
    ['X3', ['CPU utilization'], true],
    ['X3', ['Metrics Server', 'CPU utilization'], false],
    ['X4', ['Parquet'], true],
    ['X4', ['Columnar format and schema'], false],
    ['X5', ['$O(\\log n)$ time complexity'], true],
    ['X5', ['Logarithmic time complexity'], true],
    ['X5', ['Sift-up operation'], false],
    ['X6', ['Batch scoring'], true],
    ['X6', ['Nightly Airflow pipeline', 'Batch scoring'], false],
    ['M1', ['Layer caching'], false],
    ['X1', [], false],
];
let ok = true;
for (const [id, cues, want] of KNOWN) {
    const got = firstCarries({ id, n: cues.length, cues });
    ok &&= got === want;
    console.log(`${got === want ? 'OK ' : 'BAD'} ${id} ${JSON.stringify(cues)} -> ${got}`);
}
console.log(ok ? 'TERMS CHECK OK' : 'TERMS CHECK FAILED');
process.exit(ok ? 0 : 1);
