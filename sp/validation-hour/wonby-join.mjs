// h40d: which model won each roster item's answer. Reads the hour's `verbal hedge: won by` lines from MAIN's
// natively_debug.log (2026-10-02 10:00-11:59Z) and joins each in-app pair to the LAST won-by line at or before
// ~25 s after its dispatchedAt (the line is written when the first token lands). Prints ids, models and counts only.
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const R = `${MAIN}/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d`;
const log = fs.readFileSync(`${MAIN}/natively_debug.log`, 'utf8').split('\n');
const wins = [];
for (const l of log) {
    const m = l.match(/(2026-10-02T1[01]:\d\d:\d\d(?:\.\d+)?Z?).*verbal hedge: won by (\S+)/);
    if (m) wins.push({ t: Date.parse(m[1].endsWith('Z') ? m[1] : m[1] + 'Z'), model: m[2] });
}
const split = {}; for (const w of wins) split[w.model] = (split[w.model] ?? 0) + 1;
console.log(`won-by lines in the hour: ${wins.length}`, split);
const pairs = JSON.parse(fs.readFileSync(`${R}/interview60.judge.pairs.json`, 'utf8')).items;
const IDS = process.argv.slice(2);
const per = {};
for (const p of pairs) {
    const d = Date.parse(p.dispatchedAt);
    if (!Number.isFinite(d)) continue;
    const w = wins.filter((x) => x.t >= d - 1000 && x.t <= d + 25000);
    (per[w[0]?.model ?? 'none'] ??= []).push(p.id);
    if (!IDS.length || IDS.includes(p.id)) if (IDS.length) console.log(`  ${p.id.padEnd(6)} dispatched ${p.dispatchedAt}  won-by lines in [d-1s, d+25s]: ${w.map((x) => `${x.model}@+${((x.t - d) / 1000).toFixed(1)}s`).join(', ') || 'none'}`);
}
for (const [m, ids] of Object.entries(per)) console.log(`pairs whose first won-by line is ${m}: ${ids.length}${m.includes('3.1') || m === 'none' ? ' -> ' + ids.join(' ') : ''}`);
