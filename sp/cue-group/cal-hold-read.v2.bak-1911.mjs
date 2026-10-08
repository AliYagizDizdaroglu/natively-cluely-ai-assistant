// Rule-8 calibration of hold-read.mjs: fixtures with known answers, then three real hours whose numbers the final
// reviewer counted independently (final-review.md, finding I2 and Appendix B): the 05:00 cue smoke (R2: the 22 gaps in
// log order, 14 under 15 ms, median 6.5 by hand, p90 283, none unpaired, no hedge lines so no R1) and two hours with no cue
// block (B: h40a 1 of 47 under 15 ms, median 227, p90 491, max 856; h40c 3 of 47, median 156, p90 313, max 690).
// Prints counts and times only.
import fs from 'node:fs';
import path from 'node:path';
import { parseDebug, parseDiag, pairs, stats, read, holdGone, realPairs } from './hold-read.mjs';

let ok = true;
const check = (name, got, want) => {
    const good = JSON.stringify(got) === JSON.stringify(want);
    if (!good) ok = false;
    console.log(`${good ? 'OK ' : 'BAD'} ${name}: ${JSON.stringify(got)}${good ? '' : ` (want ${JSON.stringify(want)})`}`);
};

const T = (ms) => new Date(Date.UTC(2026, 8, 30, 12, 0, 0, 0) + ms).toISOString();
const dbg = (ms, rest) => `${T(ms)} [LOG] ${rest}`;
const dia = (ms, rest) => `[${T(ms)}] ${rest}`;
const debugText = [
    '=== Natively session started ===',                              // no timestamp: ignored
    dbg(0, '[Main] verbal hedge: on trigger=5000ms'),                // not an event, but it opens the window
    dbg(1000, '[LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms'),
    dbg(3000, '[LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 2000ms; other=not-started'),
    dbg(3399, '[Answer] cues trimmed: {"rawLines":4,"dropped":["d"],"cut":[],"cleaned":[]}'),   // not a cues line
    dbg(3400, '[Answer] cues: ["Boosting"]'),                        // R1 400
    dbg(3405, '[Answer] budget: words=40 cut=no allowance=no'),      // R2 5: under
    dbg(9000, '[LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 6100ms; other=aborted'),
    dbg(9100, '[Answer] cues: ["Parquet","Columnar reads"]'),        // R1 100
    dbg(9500, '[Answer] budget: words=60 cut=no allowance=no'),      // R2 400: not under
    dbg(12000, '[LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 1500ms; other=not-started'),
    dbg(12100, '[Answer] cues: ["Superseded block"]'),               // R1 100; no budget line: superseded
    dbg(15000, '[LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 1800ms; other=not-started'),
    dbg(15200, '[Answer] cues: []'),                                 // R1 200; an empty block still pairs, counted as empty
    dbg(15215, '[Answer] budget: words=12 cut=no allowance=no'),     // R2 15: NOT under (the limit is strict)
    dbg(17000, '[LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started'),
    dbg(17050, '[Answer] cues: ["Block only"]'),                     // R1 50
    dbg(17052, '[Answer] budget: words=0 cut=no allowance=no'),      // R2 2, but words=0: no prose to time
    dbg(20000, '[Microphone] stopped'),                              // closes the window
].join('\n');
const diagText = [
    dia(-5000, 'first token 900ms'),                                 // before the window: ignored
    dia(1000, '=== generateStream invoked ==='),
    dia(3230, 'first token 2230ms'),                                 // C: 3230 - 3000 = 230
    dia(3406, 'word budget: words=40 cut=no allowance=no'),          // B: 176
    dia(7000, '=== generateStream invoked ==='),
    dia(9101, 'first token 2101ms'),                                 // C: 101
    dia(9501, 'word budget: words=60 cut=no allowance=no'),          // B: 400
    dia(11000, '=== generateStream invoked ==='),                    // superseded: no first token, no word budget
    dia(13000, '=== generateStream invoked ==='),
    dia(15210, 'first token 2210ms'),                                // C: 210 (the 12000 won-by stays unpaired)
    dia(15216, 'word budget: words=12 cut=no allowance=no'),         // B: 6
    dia(25000, 'first token 100ms'),                                 // after the window: ignored
].join('\n');

const d = parseDebug(debugText);
check('parseDebug: kinds in order (the `cues trimmed` line is not a cues line)', d.ev.map((e) => e.kind).join(' '), 'front wonBy cues budget wonBy cues budget wonBy cues wonBy cues budget wonBy cues budget');
check('parseDebug: window is the first and last timestamped line', [d.first, d.last], [Date.parse(T(0)), Date.parse(T(20000))]);
check('parseDebug: won-by model and its own ms', d.ev.filter((e) => e.kind === 'wonBy').map((e) => `${e.model}@${e.at}`), ['gemini-3.5-flash-lite@2000', 'gemini-3.1-flash-lite@6100', 'gemini-3.5-flash-lite@1500', 'gemini-3.5-flash-lite@1800', 'gemini-3.5-flash-lite@900']);
check('parseDebug: only `[]` is an empty block', d.ev.filter((e) => e.kind === 'cues').map((e) => e.empty), [false, false, false, true, false]);
check('parseDebug: the budget line carries its word count', d.ev.filter((e) => e.kind === 'budget').map((e) => e.words), [40, 60, 12, 0]);
const g = parseDiag(diagText, d.first, d.last);
check('parseDiag: lines outside the window are ignored', g.map((e) => e.kind).join(' '), 'invoked firstToken wordBudget invoked firstToken wordBudget invoked invoked firstToken wordBudget');
check('parseDiag: the ttft number', g.filter((e) => e.kind === 'firstToken').map((e) => e.ttft), [2230, 2101, 2210]);

const r = read(debugText, diagText);
check('R2 cues -> budget: gaps in log order, the superseded block unpaired', [r.R2.gaps.map((p) => p.ms), r.R2.unpaired], [[5, 400, 15, 2], 1]);
check('R2 under 15 ms is strict: 5 and 2 count, 15 does not', stats(r.R2.gaps.map((p) => p.ms)).under, 2);
check('R2: the words=0 pair is named and left out of the pairs with prose', [r.noProse, realPairs(r.R2).map((p) => p.ms)], [1, [5, 400, 15]]);
check('R1 won by -> cues: every block pairs, the superseded one too', [r.R1.gaps.map((p) => p.ms), r.R1.unpaired], [[400, 100, 100, 200, 50], 0]);
check('T won by -> budget: the whole stream; the superseded won-by is unpaired', [r.T.gaps.map((p) => p.ms), r.T.unpaired], [[405, 500, 215, 52], 1]);
check('rows: one per finished answer, with the LAST won-by and cues line before its budget line', r.rows.map((x) => [x.r1, x.r2, x.t, x.words]), [[400, 5, 405, 40], [100, 400, 500, 60], [200, 15, 215, 12], [50, 2, 52, 0]]);
check('rows: R1 + R2 = T on every row', r.rows.every((x) => x.r1 + x.r2 === x.t), true);
check('C won by -> first token: a won-by with no first token is unpaired', [r.C.gaps.map((p) => p.ms), r.C.unpaired], [[230, 101, 210], 2]);
check('B first token -> word budget', [r.B.gaps.map((p) => p.ms), r.B.unpaired], [[176, 400, 6], 0]);
check('counts', r.counts, { cues: 5, emptyCues: 1, budget: 4, wonBy: 5, invoked: 4, firstToken: 3, wordBudget: 3 });
check('pairs: a `b` with no open `a` is ignored', pairs([{ t: 1, kind: 'budget' }, { t: 2, kind: 'cues' }, { t: 9, kind: 'budget' }], 'cues', 'budget').gaps.map((p) => p.ms), [7]);
check('stats 1..10 with the limit at 10: 9 under (strict), median 5.5, p90 9, min 1, max 10', stats([10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 10), { n: 10, under: 9, median: 5.5, p90: 9, min: 1, max: 10 });
check('stats, odd n: the middle value', stats([30, 10, 20]).median, 20);
check('stats of nothing', stats([]), { n: 0, under: 0, median: null, p90: null, min: null, max: null });
let threw = false; try { read('no timestamps here', diagText); } catch { threw = true; }
check('read refuses a debug log with no timestamped line', threw, true);

// The expectation, on made-up R2 lists (words > 0 everywhere unless said).
const R2of = (list, words = 40) => ({ gaps: list.map((ms) => ({ ms, b: { words } })), unpaired: 0 });
check('holdGone: 3 under 15 ms and a median of 60 -> yes', holdGone(R2of([5, 6, 7, 60, 60, 200, 300])), true);
check('holdGone: 4 under 15 ms -> no, whatever the median', holdGone(R2of([5, 6, 7, 8, 200, 300, 400, 500, 600])), false);
check('holdGone: nothing under 15 ms but a median of 49 -> no', holdGone(R2of([40, 45, 49, 49, 120])), false);
check('holdGone: a median of exactly 50 -> yes', holdGone(R2of([20, 50, 90])), true);
check('holdGone: words=0 pairs are left out (four 2 ms pairs with no prose do not fail a healthy run)', holdGone({ gaps: [...R2of([2, 2, 2, 2], 0).gaps, ...R2of([150, 200, 250]).gaps], unpaired: 0 }), true);
check('holdGone: no pair with prose -> null, never a yes', holdGone(R2of([2, 3], 0)), null);

// The real hours. Every number below was counted by the final reviewer without this script.
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const real = (dir) => read(fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8'), fs.readFileSync(path.join(dir, 'verbal-diag.log'), 'utf8'));
const s5 = real(`${MAIN}/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T02-38-22-cuesmoke`);
const a5 = s5.R2.gaps.map((p) => p.ms);
check('05:00 cue smoke, R2 in log order (the review\'s Appendix B)', a5, [13, 5, 7, 6, 369, 5, 46, 3, 283, 4, 5, 4, 3, 157, 1231, 129, 12, 3, 5, 92, 3, 127]);
// The median, by hand from the list above: sorted it is 3 3 3 3 4 4 5 5 5 5 6 7 12 13 46 92 127 129 157 283 369 1231;
// the 11th and 12th values are 6 and 7, so 6.5. (The early-close spec's first draft said 9.5; this case caught it.)
check('05:00 cue smoke, R2: 22 pairs, 14 under 15 ms, median 6.5, p90 283, none unpaired, none without prose', [stats(a5).n, stats(a5).under, stats(a5).median, stats(a5).p90, s5.R2.unpaired, s5.noProse], [22, 14, 6.5, 283, 0, 0]);
check('05:00 cue smoke: no hedge lines, so no R1 and no C', [s5.R1.gaps.length, s5.C.gaps.length], [0, 0]);
check('05:00 cue smoke: the hold is NOT gone (the build that had it)', holdGone(s5.R2), false);
const b5 = s5.B.gaps.map((p) => p.ms);
console.log(`    05:00 cue smoke, B (reported): n ${b5.length}, under 15 ms ${stats(b5).under}  (the reviewer: first token within 11 ms of word budget in the same 14)`);
for (const [name, dir, under, median, p90, max] of [['h40a', '2026-09-24T08-20-12-h40a', 1, 227, 491, 856], ['h40c', '2026-09-29T11-42-00-h40c', 3, 156, 313, 690]]) {
    const x = real(`${MAIN}/electron/test/golden/interview60.runs/${dir}`);
    const st = stats(x.B.gaps.map((p) => p.ms));
    check(`${name} (no cue block), B: 47 answers, ${under} under 15 ms, median ${median}, p90 ${p90}, max ${max}`, [st.n, st.under, st.median, st.p90, st.max], [47, under, median, p90, max]);
    check(`${name}: no cue lines, so no R2 and no verdict on the hold`, [x.R2.gaps.length, holdGone(x.R2)], [0, null]);
    console.log(`    ${name} C pairs ${x.C.gaps.length}${x.C.gaps.length ? `, C median ${stats(x.C.gaps.map((p) => p.ms)).median} ms, max ${stats(x.C.gaps.map((p) => p.ms)).max} ms` : ''}`);
}
console.log(ok ? 'HOLD-READ CALIBRATION OK' : 'HOLD-READ CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
