// Rule-8 calibration of hold-read.mjs: fixtures with known answers, then three real hours whose numbers the final
// reviewer counted independently (final-review.md, finding I2): the 05:00 cue smoke (A: 14 of 22 under 15 ms, those 14
// between 3 and 13 ms, the other 8 between 46 and 1231 ms) and two hours with no cue block (B: h40a 1 of 47, max 856;
// h40c 3 of 47, max 690). Prints counts and times only.
import fs from 'node:fs';
import path from 'node:path';
import { parseDebug, parseDiag, pairs, stats, read } from './hold-read.mjs';

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
    dbg(3400, '[Answer] cues: ["Boosting"]'),
    dbg(3405, '[Answer] budget: words=40 cut=no allowance=no'),      // A gap 5: under
    dbg(9000, '[LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 6100ms; other=aborted'),
    dbg(9100, '[Answer] cues: ["Parquet","Columnar reads"]'),
    dbg(9500, '[Answer] budget: words=60 cut=no allowance=no'),      // A gap 400: not under
    dbg(12000, '[LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 1500ms; other=not-started'),
    dbg(12100, '[Answer] cues: ["Superseded block"]'),               // no budget line: superseded
    dbg(15000, '[LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 1800ms; other=not-started'),
    dbg(15200, '[Answer] cues: []'),                                 // an empty block still pairs; it is counted as empty
    dbg(15215, '[Answer] budget: words=12 cut=no allowance=no'),     // A gap 15: NOT under (the limit is strict)
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
check('parseDebug: kinds in order', d.ev.map((e) => e.kind).join(' '), 'front wonBy cues budget wonBy cues budget wonBy cues wonBy cues budget');
check('parseDebug: window is the first and last timestamped line', [d.first, d.last], [Date.parse(T(0)), Date.parse(T(20000))]);
check('parseDebug: won-by model and its own ms', d.ev.filter((e) => e.kind === 'wonBy').map((e) => `${e.model}@${e.at}`), ['gemini-3.5-flash-lite@2000', 'gemini-3.1-flash-lite@6100', 'gemini-3.5-flash-lite@1500', 'gemini-3.5-flash-lite@1800']);
check('parseDebug: only `[]` is an empty block', d.ev.filter((e) => e.kind === 'cues').map((e) => e.empty), [false, false, false, true]);
const g = parseDiag(diagText, d.first, d.last);
check('parseDiag: lines outside the window are ignored', g.map((e) => e.kind).join(' '), 'invoked firstToken wordBudget invoked firstToken wordBudget invoked invoked firstToken wordBudget');
check('parseDiag: the ttft number', g.filter((e) => e.kind === 'firstToken').map((e) => e.ttft), [2230, 2101, 2210]);

const r = read(debugText, diagText);
check('A cues -> budget: gaps, the superseded block unpaired', [r.A.gaps.map((p) => p.ms), r.A.unpaired], [[5, 400, 15], 1]);
check('A under 15 ms is strict: 5 counts, 15 does not', stats(r.A.gaps.map((p) => p.ms)).under, 1);
check('B first token -> word budget', [r.B.gaps.map((p) => p.ms), r.B.unpaired], [[176, 400, 6], 0]);
check('C won by -> first token: the won-by with no first token is unpaired', [r.C.gaps.map((p) => p.ms), r.C.unpaired], [[230, 101, 210], 1]);
check('counts', r.counts, { cues: 4, emptyCues: 1, budget: 3, wonBy: 4, invoked: 4, firstToken: 3, wordBudget: 3 });
check('pairs: a `b` with no open `a` is ignored', pairs([{ t: 1, kind: 'budget' }, { t: 2, kind: 'cues' }, { t: 9, kind: 'budget' }], 'cues', 'budget').gaps.map((p) => p.ms), [7]);
check('stats 1..10 with the limit at 10: 9 under (strict), median 5, p90 9, min 1, max 10', stats([10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 10), { n: 10, under: 9, median: 5, p90: 9, min: 1, max: 10 });
check('stats of nothing', stats([]), { n: 0, under: 0, median: null, p90: null, min: null, max: null });
let threw = false; try { read('no timestamps here', diagText); } catch { threw = true; }
check('read refuses a debug log with no timestamped line', threw, true);

// The real hours. The reviewer's counts are the known answers; median and p90 are printed beside the reviewer's
// (227 / 491 and 156 / 313), not asserted, because a percentile's definition can differ by one rank.
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const real = (dir) => read(fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8'), fs.readFileSync(path.join(dir, 'verbal-diag.log'), 'utf8'));
const s5 = real(`${MAIN}/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T02-38-22-cuesmoke`);
const a5 = s5.A.gaps.map((p) => p.ms).sort((x, y) => x - y);
check('05:00 cue smoke, A: 22 answers, 14 under 15 ms', [a5.length, stats(a5).under], [22, 14]);
check('05:00 cue smoke, A: the 14 lie in 3..13 ms, the other 8 in 46..1231 ms', [a5[0], a5[13], a5[14], a5[21]], [3, 13, 46, 1231]);
const b5 = s5.B.gaps.map((p) => p.ms);
console.log(`    05:00 cue smoke, B (reported): n ${b5.length}, under 15 ms ${stats(b5).under}  (the reviewer: first token within 11 ms of word budget in the same 14)`);
for (const [name, dir, under, max, revMedian, revP90] of [['h40a', '2026-09-24T08-20-12-h40a', 1, 856, 227, 491], ['h40c', '2026-09-29T11-42-00-h40c', 3, 690, 156, 313]]) {
    const x = real(`${MAIN}/electron/test/golden/interview60.runs/${dir}`);
    const st = stats(x.B.gaps.map((p) => p.ms));
    check(`${name} (no cue block), B: 47 answers, ${under} under 15 ms, max ${max}`, [st.n, st.under, st.max], [47, under, max]);
    console.log(`    ${name} B median ${st.median} ms (reviewer ${revMedian}), p90 ${st.p90} ms (reviewer ${revP90}); A pairs ${x.A.gaps.length}; C pairs ${x.C.gaps.length}${x.C.gaps.length ? `, C median ${stats(x.C.gaps.map((p) => p.ms)).median} ms` : ''}`);
}
console.log(ok ? 'HOLD-READ CALIBRATION OK' : 'HOLD-READ CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
