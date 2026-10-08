// Throwaway: one row per in-app question of s50i — verdict + axes, words, TTFT (from the diag
// log's "first token" lines inside the run window, mapped to the question by dispatch time),
// supersede / stall-fallback / word-guard flags, and the same question's verdict in each arm.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-18T08-22-57-s50i');
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const { verdictOf } = await import(`file:///${path.join(PROJ, 'electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);
const ONLY = process.argv[2] === 'mains' ? 'mains' : process.argv[2] === 'followups' ? 'followups' : 'all';

const tl = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.timeline.json'), 'utf8'));
const items = tl.items.filter((i) => ONLY === 'all' || (ONLY === 'mains') === !i.id.endsWith('F'));
const pairs = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.judge.pairs.json'), 'utf8')).items;
const byId = Object.fromEntries(pairs.map((p) => [p.id, p]));
const V = (tag) => JSON.parse(fs.readFileSync(path.join(HERE, `s50i-verdicts-${tag}.json`), 'utf8'));
const vin = V('inapp');
const arms = { 'cap-min': V('captured-minimal'), 'cap-low': V('captured-low'), 'cap-high': V('captured-high'), 'bare-low': V('low'), 'bare-high': V('high') };
const mark = { acceptable: 'R', weak: 'w', wrong: 'X' };
const ax = (s) => `${s.correctness}${s.on_topic}${s.delivery}`;
const words = (t) => (String(t ?? '').trim().match(/\S+/g) || []).length;

// first tokens inside the run window, mapped to the item played last before the dispatch
const t0 = tl.startedMs, t1 = tl.endedMs;
const diag = fs.readFileSync(path.join(RUN, 'verbal-diag.log'), 'utf8');
const ft = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((m) => ({ at: Date.parse(m[1]), ms: Number(m[2]) })).filter((f) => f.at >= t0 && f.at <= t1 + 60000);
const ttftOf = {};
for (const f of ft) {
    const dispatch = f.at - f.ms;
    const item = [...tl.items].filter((i) => i.playedAt <= dispatch).sort((a, b) => b.playedAt - a.playedAt)[0];
    if (item) (ttftOf[item.id] ??= []).push(f.ms);
}
// stall fallbacks by time → item
const dbg = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8');
const stalls = [...dbg.matchAll(/^(\S+) \[WARN\] \[LLMHelper\] gemini-3\.1-flash-lite stalled after/gm)].map((m) => Date.parse(m[1]));
const stalled = new Set(stalls.map((t) => [...tl.items].filter((i) => i.playedAt <= t).sort((a, b) => b.playedAt - a.playedAt)[0]?.id));

console.log('id      lvl        verdict c/t/d  words  ttft ms (last)   flags              cap-min cap-low cap-high bare-low bare-high');
const tot = { R: 0, w: 0, X: 0 };
for (const it of items) {
    const p = byId[it.id], s = vin[it.id];
    if (!p || !s) { console.log(`${it.id.padEnd(7)} ${String(it.level).padEnd(10)} (no in-app answer / verdict)`); continue; }
    const v = verdictOf(s); tot[mark[v]]++;
    const w = words(p.answer);
    const tt = ttftOf[it.id] ?? [];
    const flags = [p.superseded ? 'superseded' : '', stalled.has(it.id) ? 'FALLBACK-3.5' : '', w >= 200 ? 'GUARD-CUT' : '', p.source ? p.source : ''].filter(Boolean).join(',');
    const armCells = Object.values(arms).map((a) => (a[it.id] ? mark[verdictOf(a[it.id])] : '-'));
    console.log(`${it.id.padEnd(7)} ${String(it.level).padEnd(10)} ${mark[v].padEnd(7)} ${ax(s)}    ${String(w).padStart(4)}   ${String(tt.at(-1) ?? '—').padStart(6)}${tt.length > 1 ? ` (${tt.length} gens)` : '        '}  ${flags.padEnd(18)} ${armCells.map((c) => c.padEnd(8)).join('')}`);
}
console.log(`\n${ONLY}: right ${tot.R}  weak ${tot.w}  wrong ${tot.X}   (c/t/d = correctness / on_topic / delivery; R right, w weak, X wrong, - not answered by that arm)`);
