// hedge-live.decide.mjs — applies passes/PREREGISTER-hedge-probe.md to the hedge probe's windows.
//   node electron/test/golden/hedge-live.decide.mjs <window.json> [<window.json> ...]
// A no-answer counts as the 45 s cap in the median and p90, as the 09-23 latency rule counted it.
import fs from 'node:fs';
import path from 'node:path';

const CAP_MS = 45000;
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: hedge-live.decide.mjs <window.json> ...'); process.exit(2); }
const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).map((r) => ({ ...r, file: path.basename(f) })));
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const s = (ms) => (ms >= CAP_MS ? 'cap' : `${(ms / 1000).toFixed(1)} s`);
const short = (m) => m.replace('gemini-', '').replace('-flash-lite', '-lite');
function summarize(rs) {
    const waits = rs.map((r) => r.wait ?? CAP_MS);
    return { n: rs.length, median: pct(waits, 0.5), p90: pct(waits, 0.9), none: rs.filter((r) => r.wait == null).length,
        extra: rs.filter((r) => r.extra).length, by: rs.reduce((a, r) => (a[r.by] = (a[r.by] ?? 0) + 1, a), {}) };
}
const line = (label, x) => `${label.padEnd(8)} n=${String(x.n).padStart(3)}  median ${s(x.median).padEnd(7)} p90 ${s(x.p90).padEnd(7)} none ${String(x.none).padStart(2)}  extra ${String(x.extra).padStart(3)}  by ${Object.entries(x.by).map(([k, v]) => `${short(k)} ${v}`).join(', ')}`;
for (const f of files) {
    console.log(path.basename(f));
    for (const p of ['today', 'hedge']) console.log('  ' + line(p, summarize(rows.filter((r) => r.file === path.basename(f) && r.policy === p))));
}
const T = summarize(rows.filter((r) => r.policy === 'today')), H = summarize(rows.filter((r) => r.policy === 'hedge'));
console.log(`pooled (${files.length} windows)`);
console.log('  ' + line('today', T));
console.log('  ' + line('hedge', H));

// Independence: a model's failure rate (errors over requests that were not aborted) when it is the
// hedge's second request, against the same model as today's first request — the replay assumed equal.
const legs = (policy, model, pick) => rows.filter((r) => r.policy === policy).flatMap((r) => r.legs).filter((l) => l.model === model && !l.aborted && pick(l));
const rate = (ls) => (ls.length ? `${ls.filter((l) => l.error).length}/${ls.length} failed` : 'no requests');
console.log('independence (failures over non-aborted requests):');
console.log(`  3.1-lite as today's first request ${rate(legs('today', 'gemini-3.1-flash-lite', (l) => l.startedAt === 0))}   vs as the hedge's second ${rate(legs('hedge', 'gemini-3.1-flash-lite', (l) => l.startedAt > 0))}`);
console.log(`  3.5-lite as the hedge's first request ${rate(legs('hedge', 'gemini-3.5-flash-lite', (l) => l.startedAt === 0))}   vs as today's second ${rate(legs('today', 'gemini-3.5-flash-lite', (l) => l.startedAt > 0))}`);

const c1 = H.none <= T.none, c2 = H.p90 <= T.p90, c3 = H.median <= T.median + 1000;
console.log(`RULE: hedge none <= today none (${H.none} <= ${T.none}: ${c1}); hedge p90 <= today p90 (${s(H.p90)} <= ${s(T.p90)}: ${c2}); hedge median <= today median + 1 s (${s(H.median)} <= ${s(T.median + 1000)}: ${c3})`);
console.log(`VERDICT: ${c1 && c2 && c3 ? 'PROCEED to the env-flagged build' : 'DO NOT BUILD — the hedge did not beat today live'}`);
