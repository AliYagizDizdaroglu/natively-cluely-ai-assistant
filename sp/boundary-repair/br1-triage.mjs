// Throwaway (2026-09-30): which br1 answers sit behind the three failing gate rows? Reads one run folder.
// Per answer dispatch: the item playing (the last item whose play start is at or before the dispatch), how much of
// the item's question the dispatched text covers (share of the item's word tokens found in the dispatch), the
// answer's first-token time after the dispatch, and the hedge winner. Prints question texts and timings only.
//   node br1-triage.mjs <run folder>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const lines = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split('\n');
const items = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8')).items ?? [];
const tok = (s) => (String(s).toLowerCase().match(/[a-z0-9']+/g) ?? []);
const itemAt = (at) => [...items].reverse().find((i) => i.playedAt <= at + 500);
const rows = [];
let cur = null;
for (const l of lines) {
    const at = Date.parse(l.slice(0, 24));
    let m = l.match(/\[Main\] dispatch: (\w+) source=(\S+) .*?(?:verdict=(\S+))?.*?question="(.*)"$/);
    if (m && m[1] === 'answer') { cur = { at, source: m[2], q: m[4], firstToken: null, won: null, full: null }; rows.push(cur); continue; }
    if (!cur) continue;
    m = l.match(/verbal hedge: won by (\S+) at (\d+)ms/);
    if (m && !cur.won) { cur.won = `${m[1].replace('gemini-', '')}@${m[2]}ms`; continue; }
    if (l.includes('[Answer] full:') && cur.full == null) { cur.full = at; continue; }
}
// first token per answer from the diag log, if present: lines carry "first token" with a ms figure
const diagPath = path.join(dir, 'verbal-diag.log');
const diag = fs.existsSync(diagPath) ? fs.readFileSync(diagPath, 'utf8').split('\n') : [];
const firsts = diag.map((l) => ({ at: Date.parse(l.slice(0, 24)), ms: Number(l.match(/first token[^0-9]*(\d+)\s*ms/)?.[1] ?? NaN) })).filter((x) => !Number.isNaN(x.at) && !Number.isNaN(x.ms));
console.log(`items ${items.length}; answer dispatches ${rows.length}; diag first-token lines ${firsts.length}`);
const seen = new Map();
for (const r of rows) {
    const it = itemAt(r.at);
    const want = it ? tok(it.q) : [];
    const have = new Set(tok(r.q));
    const cover = want.length ? want.filter((w) => have.has(w)).length / want.length : null;
    const ft = firsts.find((f) => f.at >= r.at && f.at - r.at < 60000);
    const late = it ? ((r.at - (it.playedAt + (it.clipSecs ?? 0) * 1000)) / 1000).toFixed(1) : '-';
    const n = it ? (seen.get(it.id) ?? 0) + 1 : 0;
    if (it) seen.set(it.id, n);
    console.log(`${new Date(r.at).toISOString().slice(11, 19)} ${(it?.id ?? '(none)').padEnd(7)}${n > 1 ? `#${n}` : '  '} words ${String(want.length).padStart(3)} cover ${cover == null ? ' - ' : `${Math.round(cover * 100)}%`.padStart(4)} ${cover != null && cover < 0.8 ? 'LOW ' : '    '} after-clip ${String(late).padStart(6)}s  first-token ${ft ? `${String(ft.ms).padStart(6)}ms` : '    n/a '}  ${r.won ?? ''}  src=${r.source}  | ${r.q.slice(0, 90)}`);
}
const answered = new Set(seen.keys());
const missing = items.filter((i) => !answered.has(i.id));
console.log(`\nitems with no answer dispatch attributed: ${missing.map((i) => i.id).join(', ') || 'none'}`);
console.log(`items with more than one: ${[...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`).join(', ') || 'none'}`);
