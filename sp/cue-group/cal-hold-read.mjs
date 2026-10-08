// Rule-8 calibration of hold-read.mjs: fixtures with known answers, then three real hours whose numbers the final
// reviewer counted independently (final-review.md, finding I2 and Appendix B): the 05:00 cue smoke (R2: the 22 gaps in
// log order, 14 under 15 ms, median 6.5 by hand, p90 283, none unpaired, no hedge lines so no R1) and two hours with no cue
// block (B: h40a 1 of 47 under 15 ms, median 227, p90 491, max 856; h40c 3 of 47, median 156, p90 313, max 690).
// Prints counts and times only.
import fs from 'node:fs';
import path from 'node:path';
import { parseDebug, parseDiag, pairs, stats, read, holdVerdict, realPairs } from './hold-read.mjs';

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
// The diag side of each row (this fixture's first-token times are arbitrary: only the arithmetic is checked). Row 1:
// word budget 3406 - first token 3230 = 176; 3230 - won-by 3000 = 230; 3230 - cues 3400 = -170. Row 4 (words=0) has no
// word-budget line within 100 ms, so nothing to read.
check('rows: B (first token -> word budget), C (won-by -> first token), the cues line -> first token', r.rows.map((x) => [x.b, x.c, x.ft]), [[176, 230, -170], [400, 101, 1], [6, 210, 10], [null, null, null]]);
check('rows: only `[]` is an empty block', r.rows.map((x) => x.emptyBlock), [false, false, true, false]);
const late = read([dbg(0, 'x'), dbg(1000, '[Answer] cues: ["dead stream"]'), dbg(3000, '[LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 900ms; other=failed'), dbg(3400, '[Answer] budget: words=50 cut=no allowance=no'), dbg(5000, 'y')].join('\n'), '');
check('rows: a cues line before the last won-by (a redirect after a dead stream\'s report) gives a negative R1', late.rows.map((x) => [x.r1, x.r2, x.t]), [[-2000, 2400, 400]]);
check('C won by -> first token: a won-by with no first token is unpaired', [r.C.gaps.map((p) => p.ms), r.C.unpaired], [[230, 101, 210], 2]);
check('B first token -> word budget', [r.B.gaps.map((p) => p.ms), r.B.unpaired], [[176, 400, 6], 0]);
check('counts', r.counts, { cues: 5, emptyCues: 1, budget: 4, wonBy: 5, invoked: 4, firstToken: 3, wordBudget: 3 });
check('pairs: a `b` with no open `a` is ignored', pairs([{ t: 1, kind: 'budget' }, { t: 2, kind: 'cues' }, { t: 9, kind: 'budget' }], 'cues', 'budget').gaps.map((p) => p.ms), [7]);
check('stats 1..10 with the limit at 10: 9 under (strict), median 5.5, p90 9, min 1, max 10', stats([10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 10), { n: 10, under: 9, median: 5.5, p90: 9, min: 1, max: 10 });
check('stats, odd n: the middle value', stats([30, 10, 20]).median, 20);
check('stats of nothing', stats([]), { n: 0, under: 0, median: null, p90: null, min: null, max: null });
let threw = false; try { read('no timestamps here', diagText); } catch { threw = true; }
check('read refuses a debug log with no timestamped line', threw, true);

// The expectation, on made-up rows. `row` is a counted answer unless a field says otherwise: a won-by line, a
// non-empty block, 60 words, a stream of 300 ms, R2 and B of 200 ms.
const row = (o = {}) => ({ model: 'gemini-3.5-flash-lite', words: 60, emptyBlock: false, r1: 100, r2: 200, t: 300, b: 200, ...o });
const many = (n, o) => Array.from({ length: n }, () => row(o));
const V = (rows) => { const v = holdVerdict(rows); return [v.n, v.hR2, v.hB, v.verdict]; };
check('holdVerdict: 11 counted answers -> no verdict, however clean', V(many(11)), [11, 0, 0, 'NO VERDICT']);
check('holdVerdict: 12 counted, none together -> GONE', V(many(12)), [12, 0, 0, 'GONE']);
check('holdVerdict: 3 of 12 on both reads (exactly a quarter) -> GONE', V([...many(9), ...many(3, { r2: 5, b: 5 })]), [12, 3, 3, 'GONE']);
check('holdVerdict: 4 of 12 on R2 (over a quarter, under a half) -> no verdict', V([...many(8), ...many(4, { r2: 5 })]), [12, 4, 0, 'NO VERDICT']);
check('holdVerdict: 6 of 12 on R2 (exactly half) -> NOT GONE', V([...many(6), ...many(6, { r2: 5 })]), [12, 6, 0, 'NOT GONE']);
check('holdVerdict: R2 clean but 6 of 12 on B (reports early, releases late) -> NOT GONE, and it names B', [...V([...many(6), ...many(6, { b: 5 })]), holdVerdict([...many(6), ...many(6, { b: 5 })]).why], [12, 0, 6, 'NOT GONE', 'B at least half']);
check('holdVerdict: R2 clean and 4 of 12 on B -> no verdict (GONE needs both)', V([...many(8), ...many(4, { b: 5 })]), [12, 0, 4, 'NO VERDICT']);
check('holdVerdict: the limits are strict: R2 and B of exactly 15 ms are not "together"', V(many(12, { r2: 15, b: 15 })), [12, 0, 0, 'GONE']);
check('holdVerdict: a stream of exactly 50 ms counts, 49 ms does not', V([...many(12, { t: 50 }), ...many(5, { t: 49, r2: 5, b: 5 })]), [12, 0, 0, 'GONE']);
check('holdVerdict: left out: an empty block, no words, no won-by line, no cues line, a redirect (negative R1)', V([...many(12), row({ emptyBlock: true, r2: 5, b: 5 }), row({ words: 0, r2: 5, b: null }), row({ model: null, r2: 5, b: 5 }), row({ r2: null, r1: null, b: 5 }), row({ r1: -2000, r2: 5, b: 5 })]), [12, 0, 0, 'GONE']);
check('holdVerdict: ...and it says how many of each', holdVerdict([...many(12), row({ emptyBlock: true }), row({ words: 0 }), row({ model: null }), row({ t: 20 })]).left, { noWonBy: 1, emptyOrNoBlockOrRedirect: 1, noWords: 1, shortStream: 1 });
check('holdVerdict: a counted answer with no first-token line -> no verdict, never GONE', V([...many(11), row({ b: null })]), [12, 0, 0, 'NO VERDICT']);
check('holdVerdict: no rows -> no verdict', V([]), [0, 0, 0, 'NO VERDICT']);

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
check('05:00 cue smoke: no won-by lines (the hedge was off), so no counted answer and no verdict', [holdVerdict(s5.rows).n, holdVerdict(s5.rows).verdict], [0, 'NO VERDICT']);
// The rule's one known NOT GONE case: this afternoon's re-smoke on the v2 build, which has the hold. The counts are
// the Opus reviewer's, made without this script (early-close-spec-review.md, I2's table, the whole-log column).
const s16 = real(`${MAIN}/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T13-46-52-cuesmoke`);
const v16 = holdVerdict(s16.rows);
check('16:12 re-smoke (v2, the hold): 21 counted answers, 15 with R2 under 15 ms, 16 with B under 15 ms -> NOT GONE', [v16.n, v16.hR2, v16.hB, v16.verdict], [21, 15, 16, 'NOT GONE']);
check('16:12 re-smoke: left out: the block-only answer (no words) and the one 17 ms stream', [v16.left.noWords, v16.left.shortStream], [1, 1]);
const b5 = s5.B.gaps.map((p) => p.ms);
console.log(`    05:00 cue smoke, B (reported): n ${b5.length}, under 15 ms ${stats(b5).under}  (the reviewer: first token within 11 ms of word budget in the same 14)`);
for (const [name, dir, under, median, p90, max] of [['h40a', '2026-09-24T08-20-12-h40a', 1, 227, 491, 856], ['h40c', '2026-09-29T11-42-00-h40c', 3, 156, 313, 690]]) {
    const x = real(`${MAIN}/electron/test/golden/interview60.runs/${dir}`);
    const st = stats(x.B.gaps.map((p) => p.ms));
    check(`${name} (no cue block), B: 47 answers, ${under} under 15 ms, median ${median}, p90 ${p90}, max ${max}`, [st.n, st.under, st.median, st.p90, st.max], [47, under, median, p90, max]);
    check(`${name}: no cue lines, so no R2 and no verdict on the hold`, [x.R2.gaps.length, holdVerdict(x.rows).n, holdVerdict(x.rows).verdict], [0, 0, 'NO VERDICT']);
    console.log(`    ${name} C pairs ${x.C.gaps.length}${x.C.gaps.length ? `, C median ${stats(x.C.gaps.map((p) => p.ms)).median} ms, max ${stats(x.C.gaps.map((p) => p.ms)).max} ms` : ''}`);
}
console.log(ok ? 'HOLD-READ CALIBRATION OK' : 'HOLD-READ CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
