// Calibration driver for check-smoke-hedge.mjs (h40c task 7, fix rounds 1 and 2). Throwaway,
// scratchpad. Writes each fixture's files, runs the checker as a real subprocess, compares the
// exit code + the printed overall-verdict line against expectation, prints a PASS/FAIL table
// for the calibration itself (rule 8).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const SP = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp';
const CHECKER = path.join(SP, 'check-smoke-hedge.mjs');
const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const CAL = path.join(SP, 'cal-h40c', 'fixround2');
fs.mkdirSync(CAL, { recursive: true });

// ---- base fixtures ----

const FORCED_PASS = `=== Natively session started 2026-09-26T20:00:00.000Z ===
2026-09-26T20:00:00.100Z [LOG] [Main] verbal hedge: on trigger=1ms
2026-09-26T20:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="test question one" verdict=match question="test question one"
2026-09-26T20:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T20:00:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T20:00:10.035Z [LOG] [LLMHelper] verbal hedge: back started at 5ms reason=trigger
2026-09-26T20:00:10.240Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 210ms; other=aborted
2026-09-26T20:00:10.245Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)
2026-09-26T20:00:10.800Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=210 in=180
2026-09-26T20:02:10.000Z [LOG] [Main] dispatch: answer source=live anchor="test question two" verdict=match question="test question two"
2026-09-26T20:02:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T20:02:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T20:02:10.033Z [LOG] [LLMHelper] verbal hedge: back started at 3ms reason=trigger
2026-09-26T20:02:10.210Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 180ms; other=failed
2026-09-26T20:02:10.215Z [LOG] [Main] answer source: gemini-3.5-flash-lite (hedge)
2026-09-26T20:02:10.700Z [LOG] [LLMHelper] gemini-3.5-flash-lite usage: thinking=HIGH thoughts=5 out=300 in=200
`;
const FORCED_PASS_DIAG = `[2026-09-26T20:00:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T20:02:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
`;

const DEFAULT_PASS = `=== Natively session started 2026-09-26T21:00:00.000Z ===
2026-09-26T21:00:00.100Z [LOG] [Main] verbal hedge: on trigger=5000ms
2026-09-26T21:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T21:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T21:00:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms
2026-09-26T21:00:10.650Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 620ms; other=not-started
2026-09-26T21:00:10.655Z [LOG] [Main] answer source: gemini-3.5-flash-lite (hedge)
2026-09-26T21:00:11.200Z [LOG] [LLMHelper] gemini-3.5-flash-lite usage: thinking=HIGH thoughts=8 out=280 in=190
2026-09-26T21:03:00.000Z [LOG] [Main] dispatch: answer source=live anchor="q2" verdict=match question="q2"
2026-09-26T21:03:00.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T21:03:00.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms
2026-09-26T21:03:05.030Z [LOG] [LLMHelper] verbal hedge: back started at 5000ms reason=trigger
2026-09-26T21:03:05.400Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 5370ms; other=aborted
2026-09-26T21:03:05.405Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)
2026-09-26T21:03:05.900Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=190 in=170
`;
const DEFAULT_PASS_DIAG = `[2026-09-26T21:00:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T21:03:00.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
`;

const OFF_REAL = fs.readFileSync(path.join(SP, 'rv7', 'off-real', 'natively_debug.log'), 'utf8');
const UNHANDLED = fs.readFileSync(path.join(SP, 'rv7', 'unhandled', 'natively_debug.log'), 'utf8');
const SUPERSEDE = fs.readFileSync(path.join(SP, 'rv7', 'supersede', 'natively_debug.log'), 'utf8');
const NOABORT = fs.readFileSync(path.join(SP, 'rv7', 'noabort', 'natively_debug.log'), 'utf8');
const OFF_DIAG = `[2026-09-26T20:00:10.100Z] route: BEHAVIORAL (Flash Lite, filtered)\n`;

const RV8_UNRACED = fs.readFileSync(path.join(SP, 'rv8', 'unraced', 'natively_debug.log'), 'utf8');
const RV8_UNRACED_DIAG = fs.readFileSync(path.join(SP, 'rv8', 'unraced', 'verbal-diag.log'), 'utf8');
const RV8_BOTHFAIL = fs.readFileSync(path.join(SP, 'rv8', 'bothfail', 'natively_debug.log'), 'utf8');
const RV8_OFF_NOWIN = fs.readFileSync(path.join(SP, 'rv8', 'off-nowin', 'natively_debug.log'), 'utf8');
const RV8_ANSWERTEXT = fs.readFileSync(path.join(SP, 'rv8', 'answertext', 'natively_debug.log'), 'utf8');
const RV8_ANSWERTEXT_DIAG = `[2026-09-26T20:00:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)\n`;
const BOTHFAIL_DIAG = `[2026-09-26T20:00:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T20:00:40.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
`;

const REFUSE_BASE = `=== Natively session started 2026-09-26T22:00:00.000Z ===
2026-09-26T22:00:00.500Z [ERROR] [Main] NATIVELY_VERBAL_HEDGE="yes" is not "1" or "0"/unset; a typo must not fly silently off \u2014 refusing to start
`;

// ---- test cases ----
const cases = [];
let n = 0;
function addCase({ name, mode, since, debug, diag, extra, segment, flags = [], clips, until, expect }) {
    n += 1;
    const dir = path.join(CAL, String(n).padStart(2, '0') + '-' + name.replace(/[^a-z0-9-]+/gi, '_'));
    fs.mkdirSync(dir, { recursive: true });
    const debugPath = path.join(dir, 'natively_debug.log');
    fs.writeFileSync(debugPath, debug ?? '');
    const args = [mode, since, '--debug-log', debugPath];
    if (mode !== 'refuse') {
        // NEW-I1: both are required now - always supply them so a forgotten value is loud in
        // THIS script (a thrown error), not a silent pass-through to the checker's own exit 2.
        if (diag === undefined) throw new Error(`case ${name}: diag is required for mode ${mode}`);
        if (!Number.isFinite(clips)) throw new Error(`case ${name}: clips is required for mode ${mode}`);
        const p = path.join(dir, 'verbal-diag.log');
        fs.writeFileSync(p, diag);
        args.push('--diag-log', p, '--clips', String(clips));
    }
    if (extra !== undefined) { const p = path.join(dir, 'extra.log'); fs.writeFileSync(p, extra); args.push('--extra-log', p); }
    if (segment !== undefined) { const p = path.join(dir, 'segment.log'); fs.writeFileSync(p, segment); args.push('--segment-log', p); }
    if (until !== undefined) args.push('--until', until);
    args.push(...flags);
    cases.push({ name, dir, args, expect });
}

// === C2 + M3 (off mode) ===
addCase({ name: 'off-real-PASS', mode: 'off', since: '2026-09-26T19:59:00.000Z', debug: OFF_REAL, diag: OFF_DIAG, clips: 1, expect: 'PASS' });
addCase({ name: 'off-real-plus-hedge-line-FAIL', mode: 'off', since: '2026-09-26T19:59:00.000Z',
    debug: OFF_REAL + '2026-09-26T20:00:12.000Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms\n',
    diag: OFF_DIAG, clips: 1, expect: 'FAIL' });
addCase({ name: 'off-wrong-model-FAIL', mode: 'off', since: '2026-09-26T19:59:00.000Z',
    debug: OFF_REAL.replace('trying gemini-3.1-flash-lite', 'trying gemini-3.5-flash-lite'), diag: OFF_DIAG, clips: 1, expect: 'FAIL' });
// NEW-M5: a segment with a stray hedge line but NO dispatch at all (so zero windows) must
// still FAIL from the global check, not read INCONCLUSIVE from the empty-windows branch.
addCase({ name: 'rv8-off-nowin-FAIL', mode: 'off', since: '2026-09-26T19:59:00.000Z', debug: RV8_OFF_NOWIN, diag: '', clips: 1, expect: 'FAIL' });
// NEW-M8: off, the "(hedge)" label appearing with the flag unset (the stall-race line itself
// is untouched, so the window still classifies as cleanly scored - checkOffWindow's own
// hedgeLabelled rule must be what catches this).
addCase({ name: 'off-hedge-label-FAIL', mode: 'off', since: '2026-09-26T19:59:00.000Z',
    debug: OFF_REAL.replace(
        '2026-09-26T20:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite\n',
        '2026-09-26T20:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite\n2026-09-26T20:00:10.025Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)\n'),
    diag: OFF_DIAG, clips: 1, expect: 'FAIL' });
// NEW-M8: off, startup line absent (flag unset expected to log "[Main] verbal hedge: off").
addCase({ name: 'off-startup-absent-FAIL', mode: 'off', since: '2026-09-26T19:59:00.000Z',
    debug: OFF_REAL.replace('2026-09-26T20:00:00.100Z [LOG] [Main] verbal hedge: off\n', ''), diag: OFF_DIAG, clips: 1, expect: 'FAIL' });

// === C5 / NEW-M4 (unhandled) ===
addCase({ name: 'unhandled-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: UNHANDLED, diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });
// NEW-M4: answer text mentioning "uncaught exception" in conversation must NOT fail - only a
// real CRITICAL-level crash line does.
addCase({ name: 'rv8-answertext-now-PASSes', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: RV8_ANSWERTEXT, diag: RV8_ANSWERTEXT_DIAG, clips: 1, expect: 'PASS' });

// === I2 / NEW-C1 / NEW2-M2(a) (supersede family) ===
// Race 1 (10.000-13.241) fully resolves before the supersede at 20.000: two cleanly SCORED
// windows from what the launcher played as ONE clip. Fix round 2's NEW-C1 required
// scored+coding == clips for PASS across ALL windows, so 2 scored against 1 clip read
// INCONCLUSIVE there. Fix round 3's NEW2-M2(a) narrows the denominator to `answer` windows only
// (a supersede answers the SAME clip again, it does not play a second one): this fixture's
// first window is `answer` (counts, =1) and its second is `supersede` (still has to be scored -
// it is - but does not count), so accountedFor (1) == clips (1) and both windows being clean
// now PASSes. See task-7-report.md's Fix round 3 section for the full reasoning.
addCase({ name: 'supersede-one-clip-both-clean-PASS', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: SUPERSEDE, diag: '', clips: 1, expect: 'PASS' });
// A genuinely OVERLAPPING pair (second dispatch before the first race resolves) - both windows
// read AMBIGUOUS (evidence of overlap), so 0 scored/coding against 1 clip: still INCONCLUSIVE,
// for the more fundamental reason (real overlap, not just an accounting mismatch).
const OVERLAP = `=== Natively session started 2026-09-26T20:00:00.000Z ===
2026-09-26T20:00:00.100Z [LOG] [Main] verbal hedge: on trigger=1ms
2026-09-26T20:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1 head" verdict=match question="q1 head"
2026-09-26T20:00:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T20:00:10.035Z [LOG] [LLMHelper] verbal hedge: back started at 5ms reason=trigger
2026-09-26T20:00:12.000Z [LOG] [Main] dispatch: supersede source=whisper anchor="q1 head and tail" verdict=match replaces="q1 head" question="q1 head and tail"
2026-09-26T20:00:12.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T20:00:12.035Z [LOG] [LLMHelper] verbal hedge: back started at 5ms reason=trigger
2026-09-26T20:00:13.241Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 3210ms; other=aborted
2026-09-26T20:00:14.101Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 2071ms; other=aborted
`;
addCase({ name: 'overlapping-supersede-INCONCLUSIVE', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: OVERLAP, diag: '', clips: 1, expect: 'INCONCLUSIVE' });
// A CODING-route window (0 front lines, by design) must NOT fail - it is exempt and counts
// toward the clip total as itself, not as a scored race. Fix round 3's NEW2-M1 changes this
// case's own expectation, though: a segment with only ONE window, which is CODING, has
// scoredCount=0 - the hedge never ran once, so it is now INCONCLUSIVE rather than a free PASS
// (renamed from fix round 2's coding-route-window-not-scored-not-failed-PASS; the "not failed"
// half of that name still holds - zero problems - the "PASS" half does not).
const CODING_ONLY = `=== Natively session started 2026-09-26T20:00:00.000Z ===
2026-09-26T20:00:00.100Z [LOG] [Main] verbal hedge: on trigger=1ms
2026-09-26T20:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="fix this bug in the screenshot" verdict=match question="fix this bug in the screenshot"
2026-09-26T20:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T20:00:12.000Z [LOG] [Answer] full: "Here is the fix..."
`;
const CODING_ONLY_DIAG = `[2026-09-26T20:00:10.100Z] route: CODING (selected model, no filter)\n`;
addCase({ name: 'coding-route-window-not-scored-not-failed-INCONCLUSIVE', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: CODING_ONLY, diag: CODING_ONLY_DIAG, clips: 1, expect: 'INCONCLUSIVE' });

addCase({ name: 'noabort-still-FAILs', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: NOABORT, diag: FORCED_PASS_DIAG, clips: 1, expect: 'FAIL' });
const beforeWonBy = FORCED_PASS.replace(
    '2026-09-26T20:00:10.240Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 210ms; other=aborted\n',
    '2026-09-26T20:00:10.200Z [LOG] [LLMHelper] gemini-3.5-flash-lite usage: thinking=HIGH thoughts=1 out=8 in=180\n'
    + '2026-09-26T20:00:10.240Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 210ms; other=aborted\n'
);
addCase({ name: 'loser-usage-before-wonby-PASS', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: beforeWonBy, diag: FORCED_PASS_DIAG, clips: 2, expect: 'PASS' });

// === NEW-C1 required reproductions (rv8) ===
addCase({ name: 'rv8-unraced-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: RV8_UNRACED, diag: RV8_UNRACED_DIAG, clips: 3, expect: 'FAIL' });
addCase({ name: 'rv8-bothfail-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: RV8_BOTHFAIL, diag: BOTHFAIL_DIAG, clips: 2, expect: 'FAIL' });

// === baseline + I4/NEW-M8 mutations ===
addCase({ name: 'forced-baseline-PASS', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: FORCED_PASS, diag: FORCED_PASS_DIAG, clips: 2, expect: 'PASS' });
addCase({ name: 'forced-other-empty-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: FORCED_PASS.replace('other=aborted', 'other=empty'), diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });
addCase({ name: 'forced-back-reason-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: FORCED_PASS.replace('back started at 5ms reason=trigger', 'back started at 5ms reason=front-error'), diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });
addCase({ name: 'forced-back-late-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: FORCED_PASS.replace('back started at 5ms reason=trigger', 'back started at 150ms reason=trigger'), diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });
addCase({ name: 'forced-label-mismatch-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: FORCED_PASS.replace('[Main] answer source: gemini-3.1-flash-lite (hedge)', '[Main] answer source: gemini-3.5-flash-lite (hedge)'),
    diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });
addCase({ name: 'forced-startup-absent-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: FORCED_PASS.replace('2026-09-26T20:00:00.100Z [LOG] [Main] verbal hedge: on trigger=1ms\n', ''), diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });
addCase({ name: 'forced-startup-mismatch-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: FORCED_PASS.replace('verbal hedge: on trigger=1ms', 'verbal hedge: on trigger=999ms'), diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });
// NEW-M8: forced, "no back started" line (front/won-by untouched, so the window still
// classifies as cleanly scored - the DETAIL rule must be what catches this).
addCase({ name: 'forced-no-backstarted-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: FORCED_PASS.replace('2026-09-26T20:00:10.035Z [LOG] [LLMHelper] verbal hedge: back started at 5ms reason=trigger\n', ''),
    diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });
// NEW-M8: forced and default, "no answer source" line (both the head label and the hedge
// re-announce removed for one answer, front/won-by untouched).
addCase({ name: 'forced-no-answersource-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z',
    debug: FORCED_PASS.replace('2026-09-26T20:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite\n', '')
        .replace('2026-09-26T20:00:10.245Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)\n', ''),
    diag: FORCED_PASS_DIAG, clips: 2, expect: 'FAIL' });

addCase({ name: 'default-baseline-PASS', mode: 'default', since: '2026-09-26T20:59:00.000Z', debug: DEFAULT_PASS, diag: DEFAULT_PASS_DIAG, clips: 2, expect: 'PASS' });
addCase({ name: 'default-label-mismatch-FAIL', mode: 'default', since: '2026-09-26T20:59:00.000Z',
    debug: DEFAULT_PASS.replace('[Main] answer source: gemini-3.5-flash-lite (hedge)', '[Main] answer source: gemini-3.1-flash-lite (hedge)'),
    diag: DEFAULT_PASS_DIAG, clips: 2, expect: 'FAIL' });
addCase({ name: 'default-startup-absent-FAIL', mode: 'default', since: '2026-09-26T20:59:00.000Z',
    debug: DEFAULT_PASS.replace('2026-09-26T21:00:00.100Z [LOG] [Main] verbal hedge: on trigger=5000ms\n', ''), diag: DEFAULT_PASS_DIAG, clips: 2, expect: 'FAIL' });
addCase({ name: 'default-no-answersource-FAIL', mode: 'default', since: '2026-09-26T20:59:00.000Z',
    debug: DEFAULT_PASS.replace('2026-09-26T21:00:10.655Z [LOG] [Main] answer source: gemini-3.5-flash-lite (hedge)\n', ''),
    diag: DEFAULT_PASS_DIAG, clips: 2, expect: 'FAIL' });
// NEW-C1: a race that never resolved (won-by deleted, no later surplus explains it) is now a
// definite FAIL, renamed from fix round 1's (now-superseded) PASS expectation.
addCase({ name: 'default-race-never-resolved-FAIL', mode: 'default', since: '2026-09-26T20:59:00.000Z',
    debug: DEFAULT_PASS.replace('2026-09-26T21:00:10.650Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 620ms; other=not-started\n', ''),
    diag: DEFAULT_PASS_DIAG, clips: 2, expect: 'FAIL' });
// The single-answer case: also FAIL now (no later window can possibly exist to explain it).
const DEFAULT_SINGLE_NO_WONBY = `=== Natively session started 2026-09-26T21:00:00.000Z ===
2026-09-26T21:00:00.100Z [LOG] [Main] verbal hedge: on trigger=5000ms
2026-09-26T21:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T21:00:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms
`;
addCase({ name: 'default-only-answer-no-wonby-FAIL', mode: 'default', since: '2026-09-26T20:59:00.000Z',
    debug: DEFAULT_SINGLE_NO_WONBY, diag: '', clips: 1, expect: 'FAIL' });

// === C5/NEW-M4: --extra-log ===
addCase({ name: 'extra-log-unhandled-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: FORCED_PASS, diag: FORCED_PASS_DIAG, clips: 2,
    extra: 'esbuild transpile complete\nUnhandledPromiseRejectionWarning: AbortError: aborted\n', expect: 'FAIL' });
addCase({ name: 'extra-log-clean-PASS', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: FORCED_PASS, diag: FORCED_PASS_DIAG, clips: 2,
    extra: 'esbuild transpile complete\nelectron started fine\n', expect: 'PASS' });
// NEW-M4: the extra-log crash shapes are anchored at line start now too.
addCase({ name: 'extra-log-anchored-crash-shape-FAIL', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: FORCED_PASS, diag: FORCED_PASS_DIAG, clips: 2,
    extra: 'A JavaScript error occurred in the main process\nStack: ...\n', expect: 'FAIL' });

// === M4: --until / --clips flags exercised together (both required now, this just checks the
// combination still works end to end) ===
addCase({ name: 'until-and-clips-flags-PASS', mode: 'forced', since: '2026-09-26T19:59:00.000Z', debug: FORCED_PASS, diag: FORCED_PASS_DIAG, clips: 2,
    until: '2026-09-26T20:30:00.000Z', expect: 'PASS' });

// === C1/M7: required-arg errors ===
n += 1;
cases.push({ name: 'missing-debug-log-is-usage-error', dir: CAL, args: ['forced', '2026-09-26T19:59:00.000Z'], expect: 'EXIT2' });
n += 1;
{
    const dir = path.join(CAL, String(n).padStart(2, '0') + '-missing_diag_log_is_usage_error');
    fs.mkdirSync(dir, { recursive: true });
    const debugPath = path.join(dir, 'natively_debug.log');
    fs.writeFileSync(debugPath, FORCED_PASS);
    cases.push({ name: 'missing-diag-log-is-usage-error', dir, args: ['forced', '2026-09-26T19:59:00.000Z', '--debug-log', debugPath, '--clips', '2'], expect: 'EXIT2' });
}
n += 1;
{
    const dir = path.join(CAL, String(n).padStart(2, '0') + '-missing_clips_is_usage_error');
    fs.mkdirSync(dir, { recursive: true });
    const debugPath = path.join(dir, 'natively_debug.log');
    const diagPath = path.join(dir, 'verbal-diag.log');
    fs.writeFileSync(debugPath, FORCED_PASS);
    fs.writeFileSync(diagPath, FORCED_PASS_DIAG);
    cases.push({ name: 'missing-clips-is-usage-error', dir, args: ['forced', '2026-09-26T19:59:00.000Z', '--debug-log', debugPath, '--diag-log', diagPath], expect: 'EXIT2' });
}

// === refuse mode ===
addCase({ name: 'refuse-PASS', mode: 'refuse', since: '2026-09-26T22:00:00.000Z', debug: REFUSE_BASE,
    segment: 'REFUSE exited code=1 after 1234ms\n', expect: 'PASS' });
addCase({ name: 'refuse-exit0-FAIL', mode: 'refuse', since: '2026-09-26T22:00:00.000Z', debug: REFUSE_BASE,
    segment: 'REFUSE exited code=0 after 1234ms\n', expect: 'FAIL' });
addCase({ name: 'refuse-still-running-FAIL', mode: 'refuse', since: '2026-09-26T22:00:00.000Z', debug: REFUSE_BASE,
    segment: 'REFUSE STILL RUNNING after 180000ms\n', expect: 'FAIL' });
addCase({ name: 'refuse-line-after-refusal-FAIL', mode: 'refuse', since: '2026-09-26T22:00:00.000Z',
    debug: REFUSE_BASE + '2026-09-26T22:00:01.000Z [LOG] [Main] Starting Meeting\n',
    segment: 'REFUSE exited code=1 after 1234ms\n', expect: 'FAIL' });
addCase({ name: 'refuse-no-refusal-line-FAIL', mode: 'refuse', since: '2026-09-26T22:00:00.000Z',
    debug: '=== Natively session started 2026-09-26T22:10:00.000Z ===\n2026-09-26T22:10:00.500Z [LOG] [Main] Starting Meeting\n',
    segment: 'REFUSE exited code=1 after 1234ms\n', expect: 'FAIL' });
// NEW-M8: refuse, a segment log with NEITHER outcome line (the refusal line in the debug log
// is correct, but refuse-probe.mjs's own segment-log line is missing/malformed).
addCase({ name: 'refuse-segment-log-neither-line-FAIL', mode: 'refuse', since: '2026-09-26T22:00:00.000Z', debug: REFUSE_BASE,
    segment: '=== HEDGE SMOKE 4: startup refusal, bad value ===\n2026-09-26T22:00:00.000Z\n', expect: 'FAIL' });

// === NEW2-M1 (fix round 3): a segment must score at least one window, and routeFor must not
// borrow a route line from past the window's own end ===
const ALL_CODING = `=== Natively session started 2026-09-26T14:00:00.000Z ===
2026-09-26T14:00:00.100Z [LOG] [Main] verbal hedge: on trigger=1ms
2026-09-26T14:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T14:02:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q2" verdict=match question="q2"
`;
const ALL_CODING_DIAG = `[2026-09-26T14:00:10.100Z] route: CODING (selected model, no filter)
[2026-09-26T14:02:10.100Z] route: CODING (selected model, no filter)
`;
// Every window is CODING (0 front lines, confirmed CODING route) - accountedFor (2) == clips
// (2) and zero FAILs, but scoredCount is 0: the hedge never ran once, so this must read
// INCONCLUSIVE, not a free PASS.
addCase({ name: 'all-coding-INCONCLUSIVE', mode: 'forced', since: '2026-09-26T14:00:00.000Z',
    debug: ALL_CODING, diag: ALL_CODING_DIAG, clips: 2, expect: 'INCONCLUSIVE' });

// routeFor used to search dispatch+60s flat, not the window's real end. Window 1 (0.5s) has 0
// front lines and its real end is window 2's dispatch (10s), not 60.5s. A route line at 10.1s
// belongs to window 2 but falls inside window 1's OLD (buggy) 60s search range - the old code
// would have wrongly read it as window 1's own CODING exemption. Window 2 is a clean scored
// race and does not need its own route line at all.
const ROUTE_BOUNDARY = `=== Natively session started 2026-09-26T15:00:00.000Z ===
2026-09-26T15:00:00.050Z [LOG] [Main] verbal hedge: on trigger=1ms
2026-09-26T15:00:00.500Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T15:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q2" verdict=match question="q2"
2026-09-26T15:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T15:00:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T15:00:10.035Z [LOG] [LLMHelper] verbal hedge: back started at 5ms reason=trigger
2026-09-26T15:00:10.240Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 210ms; other=aborted
2026-09-26T15:00:10.245Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)
2026-09-26T15:00:10.800Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=210 in=180
`;
const ROUTE_BOUNDARY_DIAG = `[2026-09-26T15:00:10.100Z] route: CODING (selected model, no filter)\n`;
addCase({ name: 'routefor-bounded-by-window-end-FAIL', mode: 'forced', since: '2026-09-26T15:00:00.000Z',
    debug: ROUTE_BOUNDARY, diag: ROUTE_BOUNDARY_DIAG, clips: 2, expect: 'FAIL' });

// === NEW2-M2 (fix round 3): pre-token redirect is one answer, not overlap ===
// (a) is covered by the renamed supersede-one-clip-both-clean-PASS case above.
// (b) off mode's redirect - h40b's own shape, from the rereview's SP\rv9\off-redirect fixture.
const OFF_REDIRECT = fs.readFileSync(path.join(SP, 'rv9', 'off-redirect', 'natively_debug.log'), 'utf8');
const OFF_REDIRECT_DIAG = fs.readFileSync(path.join(SP, 'rv9', 'off-redirect', 'verbal-diag.log'), 'utf8');
addCase({ name: 'off-redirect-PASS', mode: 'off', since: '2026-09-26T20:00:00.000Z',
    debug: OFF_REDIRECT, diag: OFF_REDIRECT_DIAG, clips: 1, expect: 'PASS' });

// The negative control: 2 stall-race lines with NO redirect line between them is genuine
// overlap, not a retried answer - must stay ambiguous/INCONCLUSIVE, proving the fix is gated on
// the redirect line and is not a blanket allowance for 2 stall-race lines.
const OFF_OVERLAP_NO_REDIRECT = `=== Natively session started 2026-09-26T16:00:00.000Z ===
2026-09-26T16:00:00.100Z [LOG] [Main] verbal hedge: off
2026-09-26T16:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T16:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T16:00:10.030Z [LOG] [LLMHelper] verbal stall race: trying gemini-3.1-flash-lite (fallback=gemini-3.5-flash-lite after 8000ms)
2026-09-26T16:00:12.000Z [LOG] [LLMHelper] verbal stall race: trying gemini-3.5-flash-lite (fallback=gemini-3.1-flash-lite after 8000ms)
2026-09-26T16:00:15.000Z [LOG] [LLMHelper] gemini-3.5-flash-lite usage: thinking=default thoughts=0 out=200 in=150
`;
addCase({ name: 'off-overlap-no-redirect-INCONCLUSIVE', mode: 'off', since: '2026-09-26T16:00:00.000Z',
    debug: OFF_OVERLAP_NO_REDIRECT, diag: '', clips: 1, expect: 'INCONCLUSIVE' });

// (b) forced/default mode's redirect - synthetic (no rv9 fixture covers the hedge side): the
// front leg fails pre-token, WhatToAnswerLLM redirects, the retry races again and resolves
// cleanly. Scored on the LAST front/won-by line per the ruling.
const HEDGE_REDIRECT = `=== Natively session started 2026-09-26T17:00:00.000Z ===
2026-09-26T17:00:00.100Z [LOG] [Main] verbal hedge: on trigger=1ms
2026-09-26T17:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T17:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T17:00:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T17:00:10.035Z [LOG] [LLMHelper] verbal hedge: back started at 5ms reason=trigger
2026-09-26T17:00:10.150Z [WARN] [WhatToAnswerLLM] verbal primary failed before first token (got status: 503 Service Unavailable) — redirecting to gemini-3.1-flash-lite
2026-09-26T17:00:10.160Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T17:00:10.165Z [LOG] [LLMHelper] verbal hedge: back started at 3ms reason=trigger
2026-09-26T17:00:10.360Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 200ms; other=aborted
2026-09-26T17:00:10.365Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)
2026-09-26T17:00:10.900Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=200 in=150
`;
const HEDGE_REDIRECT_DIAG = `[2026-09-26T17:00:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)\n`;
addCase({ name: 'hedge-redirect-PASS', mode: 'forced', since: '2026-09-26T17:00:00.000Z',
    debug: HEDGE_REDIRECT, diag: HEDGE_REDIRECT_DIAG, clips: 1, expect: 'PASS' });

// ---- run ----
let pass = 0, fail = 0;
for (const c of cases) {
    let out = '', code = 0;
    try {
        out = execFileSync(NODE, [CHECKER, ...c.args], { encoding: 'utf8' });
    } catch (e) {
        out = (e.stdout ?? '') + (e.stderr ?? '');
        code = e.status ?? -1;
    }
    let ok;
    if (c.expect === 'EXIT2') {
        ok = code === 2;
    } else {
        const wantCode = { PASS: 0, FAIL: 1, INCONCLUSIVE: 3 }[c.expect];
        const verdictLine = out.split('\n').find((l) => / overall \(mode=/.test(l)) || '';
        ok = code === wantCode && verdictLine.startsWith(c.expect + ' overall');
    }
    console.log(`${ok ? 'PASS' : 'FAIL'}  calibration ${c.name}  (want ${c.expect}, got exit=${code})`);
    if (!ok) {
        console.log('  --- checker output ---');
        console.log(out.split('\n').map((l) => '  ' + l).join('\n'));
    }
    if (ok) pass += 1; else fail += 1;
}
console.log(`\n${pass}/${pass + fail} calibration cases behaved as expected.`);
process.exit(fail === 0 ? 0 : 1);
