// Throwaway, read-only: which in-app answers were dispatched latest after their question ended on
// h40c (dispatch p90 3.5 s, max 33.4 s), with the ear, dispatch verdict and heard text.
import fs from 'node:fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-29T11-42-00-h40c';
const tl = JSON.parse(fs.readFileSync(`${R}/interview60.timeline.json`, 'utf8'));
const items = new Map(tl.items.map((it) => [it.id, it]));
const pj = JSON.parse(fs.readFileSync(`${R}/interview60.judge.pairs.json`, 'utf8'));
const rows = pj.items.map((p) => {
    const it = items.get(p.id);
    const end = it.playedAt + Math.round((it.clipSecs ?? 0) * 1000);
    return { key: p.key, off: (Date.parse(p.dispatchedAt) - end) / 1000, src: p.source, v: p.verdict, at: p.dispatchedAt, heard: String(p.heard ?? '').slice(0, 90) };
}).sort((a, b) => b.off - a.off);
for (const r of rows.slice(0, 5)) console.log(`${r.key.padEnd(7)} +${r.off.toFixed(1)} s  ${r.src}/${r.v}  ${r.at}  heard: ${r.heard}`);
const rest = rows.filter((r) => r.key !== 'R18#2').map((r) => r.off).sort((a, b) => a - b);
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
console.log(`without R18#2: n ${rest.length}, p50 ${pct(rest, 0.5).toFixed(1)} s, p90 ${pct(rest, 0.9).toFixed(1)} s, max ${rest.at(-1).toFixed(1)} s`);
