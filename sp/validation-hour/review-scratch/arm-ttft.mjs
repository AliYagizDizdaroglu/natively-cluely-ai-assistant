// Review scratch (read-only): per answers file in a run folder, the ttft median / p90 (h40c's percentile
// method), n answered (spoken non-empty), transient holes, empty-spoken records. Numbers only; no text printed.
//   node arm-ttft.mjs <run-dir> [--pool a,b,c --pool d,e,f]
import fs from 'node:fs';
import path from 'node:path';
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => /^interview60\.answers.*\.json$/.test(f) && !f.includes('stale'));
const rec = {};
for (const f of files) {
    const store = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const vals = Object.values(store).filter((v) => v && typeof v === 'object');
    const answered = vals.filter((v) => v.spoken);
    const holes = vals.filter((v) => v.transientError).length;
    const emptySpoken = vals.filter((v) => !v.transientError && !v.spoken).length;
    const t = answered.map((v) => v.ttft).filter(Number.isFinite).sort((a, b) => a - b);
    const withCues = vals.filter((v) => Array.isArray(v.cues) && v.cues.length > 0).length;
    rec[f] = t;
    console.log(`${f.replace('interview60.answers.', '').replace('.json', '').padEnd(44)} n=${String(t.length).padStart(2)} holes=${holes} emptySpoken=${emptySpoken} withCues=${withCues} ttft p50=${pct(t, .5)} p90=${pct(t, .9)}`);
}
const pools = [];
process.argv.forEach((a, i) => { if (a === '--pool') pools.push(process.argv[i + 1].split(',')); });
for (const p of pools) {
    const all = p.flatMap((tag) => rec[`interview60.answers.${tag}.json`] ?? []).sort((a, b) => a - b);
    console.log(`POOL ${p.join('+')}: n=${all.length} p50=${pct(all, .5)} p90=${pct(all, .9)}`);
}
