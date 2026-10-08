// Review scratch (read-only): per captured-high rep, the median / p90 of `thoughts` (the model's reported
// thoughtsTokenCount) and of `ttft`, and the rank correlation-free check of whether thoughts track ttft
// (median ttft of the answers above vs below the rep's median thoughts). Numbers only.
//   node arm-thoughts.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter((x) => /captured-high(-r\d)?\.json$/.test(x) && x.startsWith('interview60.answers.')).sort()) {
    const recs = Object.values(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((v) => v && v.spoken && Number.isFinite(v.thoughts) && Number.isFinite(v.ttft));
    const th = recs.map((v) => v.thoughts).sort((a, b) => a - b);
    const mTh = pct(th, 0.5);
    const hi = recs.filter((v) => v.thoughts > mTh).map((v) => v.ttft).sort((a, b) => a - b);
    const lo = recs.filter((v) => v.thoughts <= mTh).map((v) => v.ttft).sort((a, b) => a - b);
    console.log(`${f.replace('interview60.answers.', '').replace('.json', '').padEnd(40)} n=${recs.length} thoughts p50=${mTh} p90=${pct(th, 0.9)}  ttft p50 (thoughts above median)=${pct(hi, 0.5)} (at/below)=${pct(lo, 0.5)}`);
}
