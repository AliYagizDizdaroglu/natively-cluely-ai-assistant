// Throwaway: token usage recorded by past answer arms (answers files carry per-answer usage). For each model file
// in the s50i..s50m run folders + the golden root: which usage keys exist, and mean/median of each numeric one.
import fs from 'node:fs';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const files = [
    ...['2026-09-18T08-22-57-s50i', '2026-09-19T08-22-41-s50j', '2026-09-20T11-22-43-s50k', '2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m']
        .flatMap((d) => ['gemini-3.8-flash', 'gemini-3.1-flash-lite_captured-low'].map((m) => `${G}/interview60.runs/${d}/interview60.answers.${m}.json`)),
];
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pool = {};
for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const A = JSON.parse(fs.readFileSync(f, 'utf8'));
    const recs = Object.values(A).filter((r) => r && typeof r === 'object' && r.spoken);
    const model = f.match(/answers\.(.+)\.json$/)[1];
    const keys = new Set();
    for (const r of recs) for (const [k, v] of Object.entries(r)) if (typeof v === 'number' && /token|thought|prompt|cand|usage|in$|out$/i.test(k)) keys.add(k);
    for (const r of recs) if (r.usage && typeof r.usage === 'object') for (const [k, v] of Object.entries(r.usage)) if (typeof v === 'number') keys.add(`usage.${k}`);
    const get = (r, k) => (k.startsWith('usage.') ? r.usage?.[k.slice(6)] : r[k]);
    const line = [...keys].map((k) => { const v = recs.map((r) => get(r, k)).filter((x) => typeof x === 'number'); (pool[`${model} ${k}`] ??= []).push(...v); return `${k} mean ${mean(v).toFixed(0)} med ${med(v)} (n=${v.length})`; });
    const words = recs.map((r) => r.words).filter((x) => typeof x === 'number');
    (pool[`${model} words`] ??= []).push(...words);
    console.log(`${f.split('/').slice(-2).join('/')}: ${recs.length} answers; words mean ${mean(words).toFixed(0)}; ${line.join('; ') || 'no usage keys'}`);
}
console.log('\npooled:');
for (const [k, v] of Object.entries(pool)) console.log(`  ${k}: mean ${mean(v).toFixed(0)}, median ${med(v)}, n=${v.length}`);
