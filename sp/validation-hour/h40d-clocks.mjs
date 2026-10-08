#!/usr/bin/env node
// h40d-clocks.mjs <run-dir> [--list] [--whole-log]
//
// The clocks PREREGISTER-h40d.md names, read from one flight run folder the way h40c-hedge-stats.mjs
// reads it (natively_debug.log and verbal-diag.log sliced to the run's own window by
// interview60.timeline.json; answer-dispatch windows = a `dispatch: answer` or `dispatch: supersede`
// line to the next one). Prints numbers, ids and timestamps only: never an answer, never a prompt.
//
//   screen clock  the diag `first token N ms` value (h40c's registered rule-2 method; in a cue build
//                 it includes the cue block's streaming and the line filter's decision)
//   model clock   the `verbal hedge: won by <model> at N ms` value of the window's LAST won-by line
//                 (the winner's first raw chunk, before the cue block: like-for-like across hours
//                 with and without cue mode; the same hedge code and the same t0 in both)
//   gap G         hedge t0 - screen-clock t0, per window (revision 2, review I1): the screen clock's
//                 t0 is WhatToAnswerLLM's, a few ms after the dispatch line; the hedge's t0 is
//                 LLMHelper's, after streamChat's knowledge step (an embedding round trip). Recovered
//                 as (won-by line time - its N ms) - (first-token line time - its N ms). By
//                 construction screen = G + model + C exactly, per window.
//   cue cost C    the `won by` line's timestamp -> the next diag `first token` line's timestamp
//                 (one process, two files; 2 ms at the median in hours with no cue block)
// plus dispatch line -> won-by line and dispatch line -> screen-clock t0 (cross-checks), and, on a
// cue run, the `[Answer] cues:` line -> `first token` line gap. Percentile method: the element at
// index min(n-1, floor(n*p)) of the ascending list, the method that reproduces h40c's 4.1 s / 6.498 s.
//
// Rule 2d (revision 2, review M4), per window, both terms and their union:
//   term 1  h40c's definition: a failure line (`[WhatToAnswerLLM] Stream failed`, or the exact
//           `verbal hedge: no answer - front empty, back empty`) with NO won-by line = charged; with a
//           won-by line = resolved by the window's own last `[Answer] full:` text (failure text =
//           charged; a real answer = not charged; no full line = UNRESOLVED);
//   term 2  the window's last `[Answer] full:` is the app's own failure text (`[No answer —` or the
//           "Could you repeat that? …" substitute), whether or not a failure line exists: a block-only
//           answer has a won-by line, no failure line, and the substitute;
//   UNRESOLVED (M4)  a won-by line, no `[Answer] full:` line, and the window was NOT superseded (the
//           next dispatch line is not `dispatch: supersede`): never delivered, so undecided -> INCOMPLETE
//           unless something is already charged.
// The union is the 2d count; each charged or unresolved window is named by its dispatch timestamp.
// --whole-log applies rule 2d to the WHOLE debug log (readiness probe included, no timeline slice) and
// prints nothing else: the diag log is cumulative across runs, so the clocks are not read that way.
//
// Calibration (run before any h40d data exists; outputs in CALIBRATION-NOTES.md): on h40c's folder the
// screen clock must print median 4.1 s and p90 6.498 s over 45 windows with a won-by line, G about
// 0.5 s; on the 16:12 cue re-smoke the cue cost C must sit near hold-read.mjs's 218.5 ms median; the 2d
// fixtures h40c-stats-cal-r2-failure / -delivered / -unresolved must print charged 1 / 0 / 0 with
// UNRESOLVED 0 / 0 / 1; --whole-log on the 16:12 run must find exactly one charged window (the
// readiness probe's block-only answer, a won-by line and no failure line) and on h40c none.
import fs from 'node:fs';
import path from 'node:path';

function logSince(file, from, to) {
    if (!fs.existsSync(file)) return '';
    const size = fs.statSync(file).size;
    const end = Math.min(to ?? size, size);
    if (end <= from) return '';
    const fd = fs.openSync(file, 'r');
    try {
        const buf = Buffer.alloc(end - from);
        fs.readSync(fd, buf, 0, buf.length, from);
        return buf.toString('utf8');
    } finally { fs.closeSync(fd); }
}
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const sorted = (a) => [...a].sort((x, y) => x - y);
const s = (ms) => (ms == null ? 'n/a' : `${(Math.round(ms) / 1000).toFixed(3)}s`);
const stats = (a) => { const z = sorted(a); return `n=${z.length} median=${s(pct(z, .5))} p90=${s(pct(z, .9))} max=${s(z.length ? z[z.length - 1] : null)}`; };

const dir = process.argv[2];
const list = process.argv.includes('--list');
const wholeLog = process.argv.includes('--whole-log');
if (!dir) { console.log('usage: h40d-clocks.mjs <run-dir> [--list] [--whole-log]'); process.exit(2); }
let dbg, diag;
if (wholeLog) {
    dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    diag = '';
} else {
    const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
    dbg = logSince(path.join(dir, 'natively_debug.log'), timeline.startDebug, timeline.endDebug);
    diag = logSince(path.join(dir, 'verbal-diag.log'), timeline.startDiag, timeline.endDiag);
}

const LVL = '\\[(?:LOG|WARN|ERROR)\\]';
const reDispatchStart = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|supersede) /gm;
const reWonBy = new RegExp(`^(\\S+) ${LVL} \\[LLMHelper\\] verbal hedge: won by (\\S+) at (\\d+)ms; other=(\\S+)`, 'gm');
const reCues = new RegExp(`^(\\S+) ${LVL} \\[Answer\\] cues: (\\[.*\\])$`, 'gm');
const reFirstToken = /^\[(\S+)\] first token (\d+)ms/gm;
const reAnswerFull = new RegExp(`^(\\S+) ${LVL} \\[Answer\\] full: (.+)$`, 'gm');
// h40c-hedge-stats.mjs's two failure-line patterns, verbatim in shape (term 1).
const reFailLine = new RegExp(`^(\\S+) ${LVL} (?:\\[WhatToAnswerLLM\\] Stream failed|\\[LLMHelper\\] verbal hedge: no answer - front empty, back empty)`, 'gm');
// The failure texts are read as substrings of the raw JSON line, as h40c-hedge-stats.mjs reads them; the
// text itself is never printed.
const FAILURE_TEXT_MARKERS = ['[No answer —', 'Could you repeat that? I want to make sure I address your question properly.'];

const dispatches = [...dbg.matchAll(reDispatchStart)].map((m) => ({ index: m.index, iso: m[1], t: Date.parse(m[1]), action: m[2] }));
const wonBy = [...dbg.matchAll(reWonBy)].map((m) => ({ index: m.index, iso: m[1], t: Date.parse(m[1]), model: m[2], at: Number(m[3]) }));
const cues = [...dbg.matchAll(reCues)].map((m) => ({ index: m.index, t: Date.parse(m[1]), empty: m[2].trim() === '[]' }));
const firstTokens = [...diag.matchAll(reFirstToken)].map((m) => ({ t: Date.parse(m[1]), ms: Number(m[2]) })).sort((a, b) => a.t - b.t);
const answerFull = [...dbg.matchAll(reAnswerFull)].map((m) => ({ index: m.index, failed: FAILURE_TEXT_MARKERS.some((k) => m[2].includes(k)) }));
const failLines = [...dbg.matchAll(reFailLine)].map((m) => ({ index: m.index }));

const rows = [];
for (let i = 0; i < dispatches.length; i++) {
    const start = dispatches[i].index, end = i + 1 < dispatches.length ? dispatches[i + 1].index : dbg.length;
    const superseded = i + 1 < dispatches.length && dispatches[i + 1].action === 'supersede';
    const af = answerFull.filter((a) => a.index >= start && a.index < end);
    const noFull = af.length === 0;
    const lastFullFailed = !noFull && af[af.length - 1].failed;
    const fails = failLines.filter((f) => f.index >= start && f.index < end).length;
    const wb = wonBy.filter((w) => w.index >= start && w.index < end);
    const last = wb.length ? wb[wb.length - 1] : null;
    const cu = cues.filter((c) => c.index >= start && c.index < end && !c.empty);
    const lastCue = cu.length ? cu[cu.length - 1] : null;
    // the first diag first-token line at or after the won-by line, and before the next window's own won-by
    const nextWonByT = (() => { for (let j = i + 1; j < dispatches.length; j++) { const w = wonBy.filter((x) => x.index >= dispatches[j].index); if (w.length) return w[0].t; } return Infinity; })();
    const ft = last && !wholeLog ? firstTokens.find((f) => f.t >= last.t && f.t < nextWonByT) : null;
    // rule 2d
    let term1 = 'none', term1Charged = false;
    if (fails && !last) { term1 = 'charged (failure line, no won-by)'; term1Charged = true; }
    else if (fails && last) { if (noFull) term1 = 'unresolved (failure line, won-by, no full line)'; else if (lastFullFailed) { term1 = 'charged (failure line, won-by, failure text)'; term1Charged = true; } else term1 = 'not charged (failure line, won-by, real answer)'; }
    const term2 = lastFullFailed;
    const charged = term1Charged || term2;
    const unresolved = !!last && noFull && !superseded;
    rows.push({ i: i + 1, action: dispatches[i].action, dispatchIso: dispatches[i].iso, wonByIso: last?.iso ?? null, model: last?.model ?? 'none', at: last?.at ?? null,
        dispatchToWonBy: last ? last.t - dispatches[i].t : null,
        G: last && ft ? (last.t - last.at) - (ft.t - ft.ms) : null,
        dispatchToScreenT0: last && ft ? (ft.t - ft.ms) - dispatches[i].t : null,
        C: last && ft ? ft.t - last.t : null,
        cuesToFirstToken: lastCue && ft ? ft.t - lastCue.t : null,
        firstTokenMs: ft?.ms ?? null,
        fails, noFull, superseded, term1, term1Charged, term2, charged, unresolved });
}
const withWonBy = rows.filter((r) => r.at != null);
const chargedRows = rows.filter((r) => r.charged), unresolvedRows = rows.filter((r) => r.unresolved);
const twoD = () => {
    console.log(`rule 2d: charged windows ${chargedRows.length} = union of term 1 (h40c's definition) ${rows.filter((r) => r.term1Charged).length} and term 2 (last [Answer] full: is failure text) ${rows.filter((r) => r.term2).length}; UNRESOLVED windows ${unresolvedRows.length} (a won-by line, no [Answer] full: line, not superseded); windows with no [Answer] full: line at all ${rows.filter((r) => r.noFull).length}, of which superseded ${rows.filter((r) => r.noFull && r.superseded).length}`);
    for (const r of chargedRows) console.log(`  2d charged:    window #${r.i} dispatched ${r.dispatchIso} (${r.action}); term 1: ${r.term1}; term 2: ${r.term2 ? 'failure text' : 'no'}; won-by lines in the window: ${r.at != null ? 1 : 0}+, failure lines: ${r.fails}`);
    for (const r of unresolvedRows) console.log(`  2d UNRESOLVED: window #${r.i} dispatched ${r.dispatchIso} (${r.action}); won by ${r.model} at ${r.at} ms; no [Answer] full: line; failure lines: ${r.fails}`);
    console.log(`rule 2d reading: ${chargedRows.length ? 'FAIL (charged >= 1)' : unresolvedRows.length ? 'INCOMPLETE (an unresolved window, nothing charged)' : 'PASS (0 charged, 0 unresolved)'}`);
};

console.log(`run: ${path.basename(dir)}${wholeLog ? ' (WHOLE LOG, readiness probe included; rule 2d only)' : ''}`);
console.log(`answer-dispatch windows: ${rows.length}; with a won-by line: ${withWonBy.length}; winners: ${JSON.stringify(withWonBy.reduce((o, r) => (o[r.model] = (o[r.model] || 0) + 1, o), {}))}`);
if (wholeLog) { twoD(); process.exit(0); }
twoD();
console.log(`screen clock (diag first token N ms, all lines in the window, h40c's method): ${stats(firstTokens.map((f) => f.ms))}`);
console.log(`model clock (won-by at N ms, last won-by per window): ${stats(withWonBy.map((r) => r.at))}`);
const gRows = withWonBy.filter((r) => r.G != null);
console.log(`gap G (hedge t0 - screen-clock t0: the knowledge step before the hedge starts): ${stats(gRows.map((r) => r.G))}`);
console.log(`dispatch line -> screen-clock t0: ${stats(gRows.map((r) => r.dispatchToScreenT0))}`);
console.log(`dispatch line -> won-by line: ${stats(withWonBy.map((r) => r.dispatchToWonBy))}`);
const cRows = withWonBy.filter((r) => r.C != null);
console.log(`cue cost C (won-by line -> first token line): ${stats(cRows.map((r) => r.C))}  (windows with no first-token line after their won-by: ${withWonBy.length - cRows.length})`);
console.log(`identity check, per window: screen N - (G + model N + C) = ${gRows.length ? Math.max(...gRows.map((r) => Math.abs(r.firstTokenMs - (r.G + r.at + r.C)))) : 'n/a'} ms at most (0 by construction)`);
const cf = rows.filter((r) => r.cuesToFirstToken != null);
console.log(`cues line -> first token line: ${cf.length ? stats(cf.map((r) => r.cuesToFirstToken)) : 'n/a (no non-empty cues line)'}`);
if (list) for (const r of rows) console.log(`  #${String(r.i).padStart(2)} ${r.action.padEnd(9)} dispatched=${r.dispatchIso} won-by=${r.wonByIso ?? '-'} ${r.model.padEnd(22)} at=${r.at ?? '-'} disp->won=${r.dispatchToWonBy ?? '-'} G=${r.G ?? '-'} C=${r.C ?? '-'} cues->ft=${r.cuesToFirstToken ?? '-'} ft=${r.firstTokenMs ?? '-'} 2d=${r.charged ? 'CHARGED' : r.unresolved ? 'UNRESOLVED' : r.superseded ? 'superseded' : '-'}`);
