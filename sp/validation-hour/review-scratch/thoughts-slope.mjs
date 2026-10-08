// Review scratch (read-only): per captured-high rep, the least-squares slope of ttft (ms) on thoughts (tokens),
// and the Theil-Sen (median of pairwise slopes) slope, as a rough "ms per thought token". Numbers only.
//   node thoughts-slope.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const f of fs.readdirSync(dir).filter((x) => /captured-high(-r\d)?\.json$/.test(x) && x.startsWith('interview60.answers.')).sort()) {
    const r = Object.values(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((v) => v && v.spoken && Number.isFinite(v.thoughts) && Number.isFinite(v.ttft));
    const n = r.length, mx = r.reduce((s, v) => s + v.thoughts, 0) / n, my = r.reduce((s, v) => s + v.ttft, 0) / n;
    const ls = r.reduce((s, v) => s + (v.thoughts - mx) * (v.ttft - my), 0) / r.reduce((s, v) => s + (v.thoughts - mx) ** 2, 0);
    const ps = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (r[j].thoughts !== r[i].thoughts) ps.push((r[j].ttft - r[i].ttft) / (r[j].thoughts - r[i].thoughts));
    console.log(`${f.replace('interview60.answers.', '').replace('.json', '').padEnd(40)} n=${n} ms/token least-squares=${ls.toFixed(2)} theil-sen=${med(ps).toFixed(2)}`);
}
