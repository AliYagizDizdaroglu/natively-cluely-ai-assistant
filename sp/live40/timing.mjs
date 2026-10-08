// Timing summary of live40-r1 by route and class (numbers only, no text).
import fs from 'node:fs';
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/live40';
const run = JSON.parse(fs.readFileSync(`${D}/runs/live40-r1.json`, 'utf8'));
const items = JSON.parse(fs.readFileSync(`${D}/items.json`, 'utf8'));
const list = Array.isArray(items) ? items : items.items;
const byId = Object.fromEntries(list.map((i) => [i.id, i]));
const m = run.metrics ?? run.turns ?? run.perTurn;
if (!m) { console.log('top-level keys:', Object.keys(run).join(',')); process.exit(1); }
const rows = Array.isArray(m) ? m : Object.entries(m).map(([id, v]) => ({ id, ...v }));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };
const groups = { EASY: [], HARD: [], 'HARD follow-up': [], 'HARD standalone': [] };
let missing = [];
for (const r of rows) {
    const it = byId[r.id ?? r.item]; if (!it) continue;
    if (r.firstOutputTextMs == null) { missing.push(r.id ?? r.item); continue; }
    groups[it.route].push(r);
    if (it.route === 'HARD') groups[it.parent ? 'HARD follow-up' : 'HARD standalone'].push(r);
}
const f = (v) => (v == null ? '-' : (v / 1000).toFixed(2));
console.log('group | n | first text p50 / p90 / max (s) | full text p50 / p90 (s) | words p50 / max');
for (const [g, rs] of Object.entries(groups)) {
    const ft = rs.map((r) => r.firstOutputTextMs), lt = rs.map((r) => r.lastOutputTextMs ?? r.generationCompleteMs), w = rs.map((r) => r.words);
    console.log(`${g} | ${rs.length} | ${f(q(ft, 0.5))} / ${f(q(ft, 0.9))} / ${f(Math.max(...ft))} | ${f(q(lt, 0.5))} / ${f(q(lt, 0.9))} | ${q(w, 0.5)} / ${Math.max(...w)}`);
}
console.log(`no text: ${missing.length} ${missing.join(',')}; early (text before question end): ${rows.filter((r) => r.early).length}`);
