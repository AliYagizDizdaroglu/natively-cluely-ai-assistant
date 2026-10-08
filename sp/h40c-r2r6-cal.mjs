// Rule-8 calibration for h40c-hedge-stats.mjs's fix round 3 and fix round 4 changes:
// R2 — a window with BOTH a failure line and a won-by line is resolved via that window's own
//      [Answer] full: text into one of three outcomes (resolved-as-failure, resolved-as-delivered,
//      unresolved), never assumed.
// R6 — rule 2 reads INCOMPLETE, not a silent PASS, when the first-token sample covers too little
//      of the hour's own won-by windows.
// N-I1 (fix round 4) — rule 2's verdict is three-valued (PASS/FAIL/INCOMPLETE): a decided FAIL
//      (charged failures, or a latency breach measured at adequate coverage) always outranks an
//      unresolved window elsewhere in the hour; INCOMPLETE only ever replaces a would-be PASS.
// R4-M3(a) (fix round 5) — the daytime window check (12:00-15:00 local, fixed UTC+3 offset)
//      computed from timeline.startedAt, independent of rule2Verdict (a gate on the HOUR, not on
//      rule 2's own sub-clauses).
// Same build()/check() shape as h40c-void-cal.mjs; builds tiny synthetic run-dirs in the
// scratchpad only, never touches MAIN.
import fs from 'node:fs';
import path from 'node:path';
import { hedgeStats } from './h40c-hedge-stats.mjs';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';

function build(name, preLines, windowLines, diagLines = [], startedAt = '2026-09-26T18:00:00.000Z') {
    const dir = path.join(ROOT, name);
    fs.mkdirSync(dir, { recursive: true });
    const pre = preLines.join('\n') + (preLines.length ? '\n' : '');
    const win = windowLines.join('\n') + '\n';
    const full = pre + win;
    const startDebug = Buffer.byteLength(pre, 'utf8');
    const endDebug = Buffer.byteLength(full, 'utf8');
    const diag = diagLines.join('\n') + (diagLines.length ? '\n' : '');
    fs.writeFileSync(path.join(dir, 'natively_debug.log'), full);
    fs.writeFileSync(path.join(dir, 'verbal-diag.log'), diag);
    fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify({
        startedAt, startedMs: 0, clock: 'playsync',
        startDebug, startDiag: 0, items: [],
        endedAt: '2026-09-26T18:05:00.000Z', endedMs: 0, endDebug, endDiag: Buffer.byteLength(diag, 'utf8'),
    }));
    return dir;
}

let failures = 0;
function check(name, got, want) {
    const ok = got === want;
    if (!ok) failures++;
    console.log(`${ok ? 'ok' : 'FAIL'}   ${name} :: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

const HEDGE_STARTUP = '2026-09-26T18:00:00.000Z [LOG] [Main] verbal hedge: on trigger=5000ms';

// R2 case 1: resolved-as-failure. This window's OWN race wins a first token (won by), then ITS
// OWN stream errors afterward (the WhatToAnswerLLM.generateStream catch block, real code: throws
// are only caught there, never inside a clean win) — the window has both a won-by AND a failure
// line, but they are the SAME generation, not a stale straggler. Its own [Answer] full: line
// carries the app's own "[No answer — ..." text, because that IS what got delivered.
{
    const dir = build('h40c-stats-cal-r2-failure', [HEDGE_STARTUP], [
        '2026-09-26T18:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="x" verdict=match question="x"',
        '2026-09-26T18:00:10.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
        '2026-09-26T18:00:11.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started',
        '2026-09-26T18:00:12.500Z [ERROR] [WhatToAnswerLLM] Stream failed: socket hang up',
        '2026-09-26T18:00:12.550Z [LOG] [Answer] full: "[No answer — the answer model failed: socket hang up]"',
    ], ['[2026-09-26T18:00:11.000Z] first token 900ms']);
    const s = hedgeStats(dir);
    check('R2 failure: resolvedAsFailure=1', s.resolvedAsFailure, 1);
    check('R2 failure: resolvedDelivered=0', s.resolvedDelivered, 0);
    check('R2 failure: unresolvedAmbiguous=0', s.unresolvedAmbiguous, 0);
    check('R2 failure: cleanFailures=0', s.cleanFailures, 0);
    check('R2 failure: answerFailures=1 (folded in, I4/N5+R2)', s.answerFailures, 1);
    check('R2 failure: rule2Verdict=FAIL (a decided failure, N-I1)', s.rule2Verdict, 'FAIL');
}

// R2 case 2: resolved-as-delivered. A stale "front empty, back empty" line from an earlier,
// superseded generation lands inside this window (its own front= is logged in the PRIOR,
// superseded window, so it never appears here — exactly the N5 shape), but THIS window's own
// fresh race wins normally and its own [Answer] full: line carries the real delivered text.
{
    const dir = build('h40c-stats-cal-r2-delivered', [HEDGE_STARTUP], [
        '2026-09-26T18:01:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q" verdict=match question="What is a queue?"',
        '2026-09-26T18:01:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
        '2026-09-26T18:01:00.400Z [LOG] [Main] turn: gate=400 finals=1 live=0 finished=true',
        '2026-09-26T18:01:00.450Z [LOG] [Main] dispatch: supersede source=whisper anchor="q2" verdict=match replaces="q" question="What is a queue and how is it used?"',
        '2026-09-26T18:01:00.500Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.1-flash-lite back=gemini-3.5-flash-lite trigger=5000ms',
        '2026-09-26T18:01:01.900Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
        '2026-09-26T18:01:02.600Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 2100ms; other=not-started',
        '2026-09-26T18:01:02.650Z [LOG] [Answer] full: "A queue is a FIFO data structure: elements are added at the back and removed from the front."',
    ], ['[2026-09-26T18:01:02.600Z] first token 2100ms']);
    const s = hedgeStats(dir);
    check('R2 delivered: resolvedAsFailure=0', s.resolvedAsFailure, 0);
    check('R2 delivered: resolvedDelivered=1', s.resolvedDelivered, 1);
    check('R2 delivered: unresolvedAmbiguous=0', s.unresolvedAmbiguous, 0);
    check('R2 delivered: cleanFailures=0', s.cleanFailures, 0);
    check('R2 delivered: answerFailures=0 (not charged)', s.answerFailures, 0);
    check('R2 delivered: rule2Verdict=PASS', s.rule2Verdict, 'PASS');
}

// R2 case 3: unresolved. Identical shape to case 2 (a stale empty-empty line plus this window's
// own real won-by), but no [Answer] full: line at all lands in the window - there is nothing to
// resolve the ambiguity with. Must NOT default to "not charged"; must read INCOMPLETE.
{
    const dir = build('h40c-stats-cal-r2-unresolved', [HEDGE_STARTUP], [
        '2026-09-26T18:02:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="r" verdict=match question="What is recursion?"',
        '2026-09-26T18:02:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
        '2026-09-26T18:02:00.400Z [LOG] [Main] turn: gate=400 finals=1 live=0 finished=true',
        '2026-09-26T18:02:00.450Z [LOG] [Main] dispatch: supersede source=whisper anchor="r2" verdict=match replaces="r" question="What is recursion and why use it?"',
        '2026-09-26T18:02:00.500Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.1-flash-lite back=gemini-3.5-flash-lite trigger=5000ms',
        '2026-09-26T18:02:01.900Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
        '2026-09-26T18:02:02.600Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 2100ms; other=not-started',
    ], ['[2026-09-26T18:02:02.600Z] first token 2100ms']);
    const s = hedgeStats(dir);
    check('R2 unresolved: resolvedAsFailure=0', s.resolvedAsFailure, 0);
    check('R2 unresolved: resolvedDelivered=0', s.resolvedDelivered, 0);
    check('R2 unresolved: unresolvedAmbiguous=1', s.unresolvedAmbiguous, 1);
    check('R2 unresolved: cleanFailures=0', s.cleanFailures, 0);
    check('R2 unresolved: answerFailures=0 (an unresolved window is never silently charged either)', s.answerFailures, 0);
    // N-I1 case B: unresolved alone, with everything else passing (0 failures, latency within
    // ceiling, coverage adequate) -> INCOMPLETE, never a silent PASS.
    check('R2 unresolved: rule2Verdict=INCOMPLETE (N-I1 case B)', s.rule2Verdict, 'INCOMPLETE');
    check('R2 unresolved: reason names it', s.incompleteReasons.some((r) => r.includes('no [Answer] full: line')), true);
}

// R6 case: 3 windows all won by, but only 1 first-token diag line survived the window (a
// mis-sliced or uncopied verbal-diag.log). Coverage 1/3 = 33% < 90% floor -> INCOMPLETE.
{
    const winLines = [];
    for (let i = 0; i < 3; i++) {
        const t = 10 + i * 30;
        winLines.push(`2026-09-26T18:00:${String(t).padStart(2, '0')}.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q${i}" verdict=match question="q${i}"`);
        winLines.push(`2026-09-26T18:00:${String(t).padStart(2, '0')}.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms`);
        winLines.push(`2026-09-26T18:00:${String(t + 1).padStart(2, '0')}.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started`);
    }
    const dir = build('h40c-stats-cal-r6-sparse', [HEDGE_STARTUP], winLines, [
        '[2026-09-26T18:00:11.000Z] first token 900ms',
    ]);
    const s = hedgeStats(dir);
    check('R6 sparse: windowsWithWonBy=3', s.windowsWithWonBy, 3);
    check('R6 sparse: firstTokenN=1', s.firstTokenN, 1);
    check('R6 sparse: firstTokenCoverageOk=false', s.firstTokenCoverageOk, false);
    check('R6 sparse: rule2Verdict=INCOMPLETE', s.rule2Verdict, 'INCOMPLETE');
    check('R6 sparse: reason names the coverage gap', s.incompleteReasons.some((r) => r.includes('first-token n=1') && r.includes('90%')), true);
}

// R6 control: same 3-won-by shape, but all 3 first-token lines present -> coverage 100%, NOT
// incomplete on the coverage clause (proves the check can both fire and stay quiet).
{
    const winLines = [];
    const diagLines = [];
    for (let i = 0; i < 3; i++) {
        const t = 10 + i * 30;
        winLines.push(`2026-09-26T18:01:${String(t).padStart(2, '0')}.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q${i}" verdict=match question="q${i}"`);
        winLines.push(`2026-09-26T18:01:${String(t).padStart(2, '0')}.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms`);
        winLines.push(`2026-09-26T18:01:${String(t + 1).padStart(2, '0')}.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started`);
        diagLines.push(`[2026-09-26T18:01:${String(t + 1).padStart(2, '0')}.000Z] first token 900ms`);
    }
    const dir = build('h40c-stats-cal-r6-full', [HEDGE_STARTUP], winLines, diagLines);
    const s = hedgeStats(dir);
    check('R6 full: windowsWithWonBy=3', s.windowsWithWonBy, 3);
    check('R6 full: firstTokenN=3', s.firstTokenN, 3);
    check('R6 full: firstTokenCoverageOk=true', s.firstTokenCoverageOk, true);
    check('R6 full: rule2Verdict=PASS', s.rule2Verdict, 'PASS');
}

// N-I1 case A (fix round 4): 2 charged failures (both clean - no won-by at all, so no resolution
// question) PLUS a separate unresolved window elsewhere in the same hour. A decided failure count
// >= 1 must fail rule 2 regardless of what else is still undecided - an unresolved window can only
// ADD to the failure count later, never remove from one already charged.
{
    const winLines = [
        // Window 1: a clean charged failure (terminal front-empty/back-empty, no won-by).
        '2026-09-26T18:03:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="a" verdict=match question="a"',
        '2026-09-26T18:03:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
        '2026-09-26T18:03:05.100Z [LOG] [LLMHelper] verbal hedge: back started at 5000ms reason=trigger',
        '2026-09-26T18:03:10.200Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
        // Window 2: a second, independent clean charged failure.
        '2026-09-26T18:04:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="b" verdict=match question="b"',
        '2026-09-26T18:04:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
        '2026-09-26T18:04:05.100Z [LOG] [LLMHelper] verbal hedge: back started at 5000ms reason=trigger',
        '2026-09-26T18:04:10.200Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
        // Window 3 (superseded) / 3-super: the unresolved shape (stale empty-empty + a real
        // won-by, no [Answer] full: line at all) - elsewhere in the same hour, unrelated to the
        // two charged failures above.
        '2026-09-26T18:05:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="c" verdict=match question="c"',
        '2026-09-26T18:05:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
        '2026-09-26T18:05:00.400Z [LOG] [Main] turn: gate=400 finals=1 live=0 finished=true',
        '2026-09-26T18:05:00.450Z [LOG] [Main] dispatch: supersede source=whisper anchor="c2" verdict=match replaces="c" question="c2"',
        '2026-09-26T18:05:00.500Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.1-flash-lite back=gemini-3.5-flash-lite trigger=5000ms',
        '2026-09-26T18:05:01.900Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
        '2026-09-26T18:05:02.600Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 900ms; other=not-started',
    ];
    const dir = build('h40c-stats-cal-ni1-failplus', [HEDGE_STARTUP], winLines, [
        '[2026-09-26T18:05:02.600Z] first token 900ms',
    ]);
    const s = hedgeStats(dir);
    check('N-I1 case A: cleanFailures=2', s.cleanFailures, 2);
    check('N-I1 case A: unresolvedAmbiguous=1', s.unresolvedAmbiguous, 1);
    check('N-I1 case A: answerFailures=2', s.answerFailures, 2);
    check('N-I1 case A: rule2Verdict=FAIL (decided failures outrank the unresolved window)', s.rule2Verdict, 'FAIL');
}

// N-I1 case C: a slow median (over the 6.026s ceiling) at FULL first-token coverage, plus a
// separate unresolved window. The latency breach is decided (coverage is adequate), so it must
// fail rule 2 outright - not read INCOMPLETE just because something else is also unresolved.
{
    const winLines = [
        // Window 1: a plain, clean, SLOW win (8000ms, well over the 6.026s ceiling).
        '2026-09-26T18:06:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="d" verdict=match question="d"',
        '2026-09-26T18:06:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
        '2026-09-26T18:06:08.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 8000ms; other=not-started',
        // Window 2 (superseded) / 2-super: the unresolved shape again, its own first-token also
        // slow (9000ms) so first-token coverage stays FULL (both won-by windows have a diag line).
        '2026-09-26T18:07:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="e" verdict=match question="e"',
        '2026-09-26T18:07:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
        '2026-09-26T18:07:00.400Z [LOG] [Main] turn: gate=400 finals=1 live=0 finished=true',
        '2026-09-26T18:07:00.450Z [LOG] [Main] dispatch: supersede source=whisper anchor="e2" verdict=match replaces="e" question="e2"',
        '2026-09-26T18:07:00.500Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.1-flash-lite back=gemini-3.5-flash-lite trigger=5000ms',
        '2026-09-26T18:07:01.900Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
        '2026-09-26T18:07:09.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 9000ms; other=not-started',
    ];
    const dir = build('h40c-stats-cal-ni1-slowplus', [HEDGE_STARTUP], winLines, [
        '[2026-09-26T18:06:08.000Z] first token 8000ms',
        '[2026-09-26T18:07:09.000Z] first token 9000ms',
    ]);
    const s = hedgeStats(dir);
    check('N-I1 case C: windowsWithWonBy=2', s.windowsWithWonBy, 2);
    check('N-I1 case C: firstTokenCoverageOk=true (full coverage)', s.firstTokenCoverageOk, true);
    check('N-I1 case C: medianS > 6.026 (slow)', s.medianS > 6.026, true);
    check('N-I1 case C: unresolvedAmbiguous=1', s.unresolvedAmbiguous, 1);
    check('N-I1 case C: rule2Verdict=FAIL (decided latency breach outranks the unresolved window)', s.rule2Verdict, 'FAIL');
}

// R4-M3(a) (fix round 5): the daytime window check (12:00-15:00 local, fixed UTC+3 offset). No
// dispatch windows are needed - only startedAt matters for this check.
{
    // In-window: 10:30 UTC + 3:00 = 13:30 local (h40b's own documented start time).
    const dir = build('h40c-stats-cal-window-in', [HEDGE_STARTUP], [], [], '2026-09-26T10:30:00.000Z');
    const s = hedgeStats(dir);
    check('window in: playbackStartLocal=13:30', s.playbackStartLocal, '13:30');
    check('window in: inDaytimeWindow=true', s.inDaytimeWindow, true);
}
{
    // Out-of-window: 17:00 UTC + 3:00 = 20:00 local.
    const dir = build('h40c-stats-cal-window-out', [HEDGE_STARTUP], [], [], '2026-09-26T17:00:00.000Z');
    const s = hedgeStats(dir);
    check('window out: playbackStartLocal=20:00', s.playbackStartLocal, '20:00');
    check('window out: inDaytimeWindow=false', s.inDaytimeWindow, false);
}
{
    // Boundary sanity: exactly 12:00 and exactly 15:00 local are both IN (a closed interval) -
    // 09:00 UTC and 12:00 UTC respectively.
    const s12 = hedgeStats(build('h40c-stats-cal-window-boundary-open', [HEDGE_STARTUP], [], [], '2026-09-26T09:00:00.000Z'));
    check('window boundary: 12:00 local is IN', s12.inDaytimeWindow, true);
    const s15 = hedgeStats(build('h40c-stats-cal-window-boundary-close', [HEDGE_STARTUP], [], [], '2026-09-26T12:00:00.000Z'));
    check('window boundary: 15:00 local is IN', s15.inDaytimeWindow, true);
    const s1501 = hedgeStats(build('h40c-stats-cal-window-boundary-over', [HEDGE_STARTUP], [], [], '2026-09-26T12:01:00.000Z'));
    check('window boundary: 15:01 local is OUT', s1501.inDaytimeWindow, false);
}

console.log(failures === 0 ? 'R2/R6 CALIBRATION OK' : `R2/R6 CALIBRATION FAILED ${failures}`);
process.exit(failures === 0 ? 0 : 1);
