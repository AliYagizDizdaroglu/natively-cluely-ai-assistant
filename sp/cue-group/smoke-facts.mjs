// Facts for a cue smoke's result note, from the run folder: every cue block with the item that was playing, the
// shape counts, the first-token numbers, the report's gate rows, and the rule the dist carries. Prints cue lines,
// question ids, counts and times only: never an answer, never a prompt.
//   node smoke-facts.mjs <run dir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const RUN = process.argv[2];
if (!RUN || !fs.existsSync(path.join(RUN, 'natively_debug.log'))) { console.log('usage: node smoke-facts.mjs <run dir with natively_debug.log>'); process.exit(2); }
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const lines = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8').split(/\r?\n/);
const ts = (l) => Date.parse(l.slice(0, 24));
const after = (l, tag) => l.slice(l.indexOf(tag) + tag.length).trim();
const words = (s) => (String(s).trim().match(/\S+/g) ?? []).length;
const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const p90 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.max(0, Math.ceil(0.9 * s.length) - 1)] : null; };

let items = [], off = 0;
try {
    const tl = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.timeline.json'), 'utf8'));
    off = tl.clock === 'playsync' ? 0 : 1150;   // the timeline's startedMs is ~1.15 s early unless the clock is the player's
    items = (tl.items ?? []).filter((i) => i.playedAt != null).sort((x, y) => x.playedAt - y.playedAt);
} catch { console.log('WARN: no timeline, items unknown'); }
const playing = (t) => [...items].reverse().find((i) => i.playedAt + off <= t)?.id ?? '?';

console.log(`run ${path.basename(RUN)}`);
const first = lines.find((l) => !Number.isNaN(ts(l))), last = [...lines].reverse().find((l) => !Number.isNaN(ts(l)));
console.log(`log window ${first?.slice(0, 24)} .. ${last?.slice(0, 24)}; timeline items ${items.length}`);

// --- the cue blocks, in log order, with the item that had started playing ---
const cueLines = lines.filter((l) => l.includes('[Answer] cues:'));
const blocks = cueLines.map((l) => { let arr = null; try { arr = JSON.parse(after(l, '[Answer] cues:')); } catch { /* unparsable: shown raw */ } return { t: ts(l), id: playing(ts(l)), arr, raw: after(l, '[Answer] cues:') }; });
console.log(`\ncue blocks: ${blocks.length}`);
for (const b of blocks) console.log(`  ${new Date(b.t).toISOString().slice(11, 19)}Z  ${String(b.id).padEnd(7)} ${b.arr ? `${b.arr.length} line(s), words ${b.arr.map(words).join('/') || '-'}:  ${JSON.stringify(b.arr)}` : `UNPARSABLE ${b.raw.slice(0, 200)}`}`);
const ok = blocks.filter((b) => Array.isArray(b.arr));
const by = (n) => ok.filter((b) => b.arr.length === n).length;
const allLines = ok.flatMap((b) => b.arr);
console.log(`\nshape: empty ${by(0)}, one line ${by(1)}, two lines ${by(2)}, three lines ${by(3)}, more than three ${ok.filter((b) => b.arr.length > 3).length}`);
console.log(`words per cue line: n ${allLines.length}, median ${med(allLines.map(words))}, max ${allLines.length ? Math.max(...allLines.map(words)) : '-'}, lines over 5 words ${allLines.filter((c) => words(c) > 5).length}; words per block: median ${med(ok.map((b) => b.arr.reduce((a, c) => a + words(c), 0)))}`);
const seenIds = new Map();
for (const b of blocks) seenIds.set(b.id, (seenIds.get(b.id) ?? 0) + 1);
const multi = [...seenIds].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
const none = items.map((i) => i.id).filter((id) => !seenIds.has(id));
console.log(`items with more than one block: ${multi.join(', ') || 'none'}; items with no block: ${none.join(', ') || 'none'}`);

// --- the display cap at work ---
const trimmed = lines.filter((l) => l.includes('[Answer] cues trimmed:'));
console.log(`\ncues trimmed lines: ${trimmed.length}`);
for (const l of trimmed) {
    const j = after(l, '[Answer] cues trimmed:');
    let kind = '?';
    try { const o = JSON.parse(j); kind = [o.dropped?.length ? `dropped ${o.dropped.length}` : '', o.cut?.length ? `cut ${o.cut.length}` : '', o.cleaned?.length ? `cleaned ${o.cleaned.length}` : ''].filter(Boolean).join(', '); } catch { /* shown raw */ }
    console.log(`  ${l.slice(11, 19)}Z  ${playing(ts(l)).padEnd(7)} [${kind}]  ${j}`);
}

// --- answers: failed, superseded, the hedge split ---
const FAILURE = /^\[No answer|^Could you repeat that\? I want to make sure I address your question properly\./;
const full = lines.filter((l) => l.includes('[Answer] full:'));
const failed = full.filter((l) => { try { return FAILURE.test(String(JSON.parse(after(l, '[Answer] full:')))); } catch { return false; } });
const aborted = lines.filter((l) => l.includes('_what_to_say stream aborted by new generation'));
console.log(`\nanswers: full lines ${full.length} (failed ${failed.length}), superseded streams ${aborted.length}`);
for (const l of failed) console.log(`  failed at ${l.slice(11, 19)}Z  ${playing(ts(l))}:  ${after(l, '[Answer] full:').slice(0, 120)}`);
for (const l of aborted) console.log(`  superseded at ${l.slice(11, 19)}Z  ${playing(ts(l))}`);
const won = {};
for (const l of lines) { const m = l.match(/verbal hedge: won by (\S+) at (\d+)ms/); if (m) (won[m[1]] ??= []).push(Number(m[2])); }
console.log(`hedge: ${Object.entries(won).map(([k, v]) => `${k} won ${v.length} (at median ${med(v)} ms, max ${Math.max(...v)} ms)`).join('; ') || 'no won-by line'}`);
for (const needle of ['Knowledge mode (stream): returning generated intro response', '__negotiationCoaching', 'turn: close reason=not-a-question', 'boundary repair: restored'])
    console.log(`lines with "${needle}": ${lines.filter((l) => l.includes(needle)).length}`);

// --- first token, from the diag log inside the run's window ---
if (fs.existsSync(path.join(RUN, 'verbal-diag.log')) && first && last) {
    const ft = [...fs.readFileSync(path.join(RUN, 'verbal-diag.log'), 'utf8').matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].filter((m) => Date.parse(m[1]) >= ts(first) && Date.parse(m[1]) <= ts(last)).map((m) => Number(m[2]));
    console.log(`\nfirst token (diag, this run): n ${ft.length}, median ${med(ft)} ms, p90 ${p90(ft)} ms, max ${ft.length ? Math.max(...ft) : '-'} ms`);
}

// --- the report's rows that the PASS rule reads ---
const rep = path.join(RUN, 'interview60.report.md');
if (fs.existsSync(rep)) {
    console.log('\nreport rows:');
    for (const l of fs.readFileSync(rep, 'utf8').split(/\r?\n/)) if (/Answered hands-free|Long questions answered whole|Cue block above every spoken answer|Answer TTFT p90|Heard by either detector|Surfaced detections per question|GATE (PASSED|FAILED)/.test(l)) console.log(`  ${l.trim().slice(0, 230)}`);
} else console.log('\nno interview60.report.md in the run folder');

// --- what the dist carries (the build that is on disk NOW, which is the run's build only if nothing was rebuilt since) ---
try {
    const P = createRequire(`${WT}/package.json`)(`${WT}/dist-electron/electron/llm/prompts.js`);
    console.log(`\ndist now: main.js written ${fs.statSync(`${WT}/dist-electron/electron/main.js`).mtime.toISOString()}; limits ${P.CUE_MAX_LINES} x ${P.CUE_MAX_WORDS}; CUE_RULE sha256/12 ${crypto.createHash('sha256').update(P.CUE_RULE).digest('hex').slice(0, 12)}`);
    console.log(`dist CUE_SHAPE_RULE: ${P.CUE_SHAPE_RULE}`);
} catch (e) { console.log(`\ndist not readable: ${e.message}`); }
