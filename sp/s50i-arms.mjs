// Throwaway: per-arm proof and shape for the s50i run — thought tokens (does the arm's own file
// prove the level it claims?), time to first token, and words. The in-app hour is read from the
// timeline instead, since its answers live in the run's own store.
import fs from 'node:fs';
import path from 'node:path';
const RUN = process.argv[2];
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : null; };
const files = fs.readdirSync(RUN).filter((f) => /^interview60\.answers(\..+)?\.json$/.test(f)).sort();
console.log('arm                                        n   thoughts p50 (zero)   ttft p50/p90/max ms      words p50/max  >150w');
for (const f of files) {
    const store = JSON.parse(fs.readFileSync(path.join(RUN, f), 'utf8'));
    const rows = Object.values(store).filter((v) => v && v.spoken);
    if (!rows.length) { console.log(`${f.padEnd(42)} no answers`); continue; }
    const th = rows.map((r) => r.thoughts).filter((t) => t != null);
    const ts = rows.map((r) => r.ttft).filter((t) => t != null);
    const ws = rows.map((r) => r.words);
    const arm = (f.replace(/^interview60\.answers\.?/, '').replace(/\.json$/, '') || 'gemini-3.1-flash-lite (plain)');
    console.log(`${arm.padEnd(42)} ${String(rows.length).padStart(2)}   ` +
        `${th.length ? `${String(pct(th, .5)).padStart(5)} (${th.filter((t) => t === 0).length}/${th.length})` : '    — (not recorded)'}   ` +
        `${String(pct(ts, .5)).padStart(6)}/${String(pct(ts, .9)).padStart(6)}/${String(Math.max(...ts)).padStart(6)}   ` +
        `${String(pct(ws, .5)).padStart(6)}/${String(Math.max(...ws)).padStart(4)}  ${String(ws.filter((w) => w > 150).length).padStart(4)}`);
}
