// THROWAWAY: for the s50a hour, (1) every main that received two or more ANSWER dispatches
// — which source fired first, how long before the clip ended, and what the second one was —
// and (2) the answer first-token times, with the slow ones placed against the stall/fallback
// lines. Read-only over the run snapshot; same line formats as interview60.metrics.mjs.
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = process.argv[2] ?? path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a');
const read = (f) => fs.readFileSync(path.join(RUN, f), 'utf8');
const tl = JSON.parse(read('interview60.timeline.json'));
const dbg = read('natively_debug.log');
const diagName = fs.readdirSync(RUN).find((f) => /diag/i.test(f));
const diag = diagName ? read(diagName) : '';
const ts = (s) => Date.parse(s);
const local = (ms) => new Date(ms).toTimeString().slice(0, 8);

const RE = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?/gm;
const disp = [...dbg.matchAll(RE)].map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: m[4], verdict: m[5], dup: m[6] }));
console.log(`dispatch lines: ${disp.length}  (answer ${disp.filter((d) => d.action === 'answer').length}, extend ${disp.filter((d) => d.action === 'extend').length}, chip ${disp.filter((d) => d.action === 'chip').length}, drop ${disp.filter((d) => d.action === 'drop').length})`);

const items = tl.items.map((i) => ({ ...i, playedAt: tl.startedMs + i.startSec * 1000, spokeEnd: tl.startedMs + (i.startSec + i.clipSecs) * 1000 }));
const doubled = [];
const pattern = new Map();
for (const it of items) {
    const w = disp.filter((d) => d.at >= it.playedAt - 2000 && d.at <= it.spokeEnd + 60000);
    const answers = w.filter((d) => d.action === 'answer');
    if (answers.length < 2) continue;
    doubled.push(it.id);
    const key = answers.map((a) => `${a.source}@${a.at < it.spokeEnd ? 'early' : 'after'}`).join(' → ');
    pattern.set(key, (pattern.get(key) ?? 0) + 1);
    console.log(`\n${it.id} ${it.level} clip ${it.clipSecs.toFixed(1)}s${it.long ? ' LONG' : ''}  words ${(it.q.match(/[A-Za-z0-9']+/g) ?? []).length}`);
    for (const d of w) {
        const off = ((d.at - it.spokeEnd) / 1000).toFixed(1);
        console.log(`   ${off.padStart(6)}s  ${d.action.padEnd(6)} ${d.source.padEnd(7)} ${d.verdict.padEnd(11)}${d.dup ? 'dup=' + d.dup + ' ' : ''} "${d.anchor.slice(0, 72)}"`);
    }
}
console.log(`\ndoubled items: ${doubled.length}  ${doubled.join(' ')}`);
console.log('patterns (source@when of each answer):');
for (const [k, n] of [...pattern].sort((a, b) => b[1] - a[1])) console.log(`  ${n}×  ${k}`);

// ── first-token times ────────────────────────────────────────────────────
const ft = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((m) => ({ at: ts(m[1]), ms: Number(m[2]) })).filter((f) => f.at >= tl.startedMs);
const stalls = [...dbg.matchAll(/^(\S+) \[WARN\] \[LLMHelper\] (\S+) stalled after (\d+)ms/gm)].map((m) => ({ at: ts(m[1]), model: m[2] }));
const sorted = ft.map((f) => f.ms).sort((a, b) => a - b);
const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
console.log(`\nfirst-token (${diagName ?? 'no diag log'}): n=${ft.length}  p50 ${pct(.5)}ms  p90 ${pct(.9)}ms  max ${sorted.at(-1)}ms   stalls logged: ${stalls.length}`);
const itemAt = (t) => items.find((i) => t >= i.playedAt - 2000 && t <= i.spokeEnd + 90000)?.id ?? '?';
for (const f of ft.filter((f) => f.ms > 5000).sort((a, b) => a.at - b.at)) {
    const stallBefore = stalls.find((s) => s.at <= f.at && f.at - s.at <= 20000);
    console.log(`  ${local(f.at)}  ${String(f.ms).padStart(6)}ms  ${itemAt(f.at).padEnd(7)} ${stallBefore ? 'after a 4 s stall on ' + stallBefore.model : ''}`);
}
console.log(`\nunder 5 s: ${sorted.filter((x) => x <= 5000).length} of ${sorted.length};  buckets  <2s ${sorted.filter((x) => x < 2000).length}  2-5s ${sorted.filter((x) => x >= 2000 && x <= 5000).length}  5-10s ${sorted.filter((x) => x > 5000 && x <= 10000).length}  >10s ${sorted.filter((x) => x > 10000).length}`);
