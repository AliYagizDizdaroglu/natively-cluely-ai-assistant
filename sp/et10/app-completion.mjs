// ET10, reported outside the rule: when was the app's WHOLE answer on screen? For each item, the first
// "[Answer] budget:" line (logged once per completed spoken answer) after its first token, minus the question's
// end — the app's counterpart of ET's "last word". s50k, read-only.
//   node app-completion.mjs
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k`;
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/et10';
const { computeRun } = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.metrics.mjs`).href);
const m = computeRun(RUN);
const base = JSON.parse(fs.readFileSync(`${HERE}/app-baseline.json`, 'utf8'));
const dbg = fs.readFileSync(`${RUN}/natively_debug.log`, 'utf8');
const done = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] budget: words=(\d+)/gm)].map((x) => ({ at: Date.parse(x[1]), words: Number(x[2]) }));
const rows = [];
for (const id of Object.keys(base.items)) {
    const it = m.items.find((i) => i.id === id);
    const firstAt = it.spokeEnd + base.items[id].e2eMs;
    const d = done.find((x) => x.at >= firstAt && x.at <= firstAt + 60000);
    rows.push({ id, firstS: base.items[id].e2eMs / 1000, completeS: d ? (d.at - it.spokeEnd) / 1000 : null, words: d?.words ?? null });
}
for (const r of rows) console.log(`${r.id.padEnd(7)} first word ${r.firstS.toFixed(1)} s  whole answer ${r.completeS == null ? '—' : r.completeS.toFixed(1) + ' s'}  words ${r.words ?? '—'}`);
const c = rows.map((r) => r.completeS).filter((x) => x != null).sort((a, b) => a - b);
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
console.log(`app whole answer on screen: n=${c.length} p50 ${pct(c, 0.5).toFixed(1)} s p90 ${pct(c, 0.9).toFixed(1)} s`);
