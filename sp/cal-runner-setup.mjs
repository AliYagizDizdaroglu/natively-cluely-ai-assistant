// Throwaway (scratchpad-only) setup for calibrating run-smoke-hedge-checks.mjs against a
// synthetic segment set. Builds three repo-shaped trees under C:\Users\sotka\cal-runner\:
//   repo-pass  - all four segments clean, expect OVERALL PASS
//   repo-fail  - repo-pass with default's second window's won-by line removed (NEW-C1 rule b),
//                expect default=FAIL, others still PASS, OVERALL FAIL
//   repo-error - repo-pass with smoke-hedge-off.log deleted entirely, expect off=ERROR,
//                others still PASS, OVERALL FAIL
import fs from 'fs';
import path from 'path';

const ROOT = 'C:\\Users\\sotka\\cal-runner';
fs.rmSync(ROOT, { recursive: true, force: true });

function write(base, runsRelPath, content) {
    const p = path.join(base, 'electron', 'test', 'golden', 'interview60.runs', runsRelPath);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
}

const FORCED_DEBUG = `=== Natively session started 2026-09-26T10:00:00.000Z ===
2026-09-26T10:00:00.100Z [LOG] [Main] verbal hedge: on trigger=1ms
2026-09-26T10:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T10:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T10:00:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T10:00:10.035Z [LOG] [LLMHelper] verbal hedge: back started at 5ms reason=trigger
2026-09-26T10:00:10.240Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 210ms; other=aborted
2026-09-26T10:00:10.245Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)
2026-09-26T10:00:10.800Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=210 in=180
2026-09-26T10:02:10.000Z [LOG] [Main] dispatch: answer source=live anchor="q2" verdict=match question="q2"
2026-09-26T10:02:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T10:02:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T10:02:10.033Z [LOG] [LLMHelper] verbal hedge: back started at 3ms reason=trigger
2026-09-26T10:02:10.210Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 180ms; other=failed
2026-09-26T10:02:10.215Z [LOG] [Main] answer source: gemini-3.5-flash-lite (hedge)
2026-09-26T10:02:10.700Z [LOG] [LLMHelper] gemini-3.5-flash-lite usage: thinking=HIGH thoughts=5 out=300 in=200
2026-09-26T10:04:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q3" verdict=match question="q3"
2026-09-26T10:04:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T10:04:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms
2026-09-26T10:04:10.035Z [LOG] [LLMHelper] verbal hedge: back started at 5ms reason=trigger
2026-09-26T10:04:10.240Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 210ms; other=aborted
2026-09-26T10:04:10.245Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)
2026-09-26T10:04:10.800Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=210 in=180
`;

const DEFAULT_DEBUG = `=== Natively session started 2026-09-26T11:00:00.000Z ===
2026-09-26T11:00:00.100Z [LOG] [Main] verbal hedge: on trigger=5000ms
2026-09-26T11:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T11:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T11:00:10.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms
2026-09-26T11:00:10.650Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 620ms; other=not-started
2026-09-26T11:00:10.655Z [LOG] [Main] answer source: gemini-3.5-flash-lite (hedge)
2026-09-26T11:00:11.200Z [LOG] [LLMHelper] gemini-3.5-flash-lite usage: thinking=HIGH thoughts=8 out=280 in=190
2026-09-26T11:03:00.000Z [LOG] [Main] dispatch: answer source=live anchor="q2" verdict=match question="q2"
2026-09-26T11:03:00.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T11:03:00.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms
2026-09-26T11:03:05.030Z [LOG] [LLMHelper] verbal hedge: back started at 5000ms reason=trigger
2026-09-26T11:03:05.400Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 5370ms; other=aborted
2026-09-26T11:03:05.405Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)
2026-09-26T11:03:05.900Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=190 in=170
2026-09-26T11:06:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q3" verdict=match question="q3"
2026-09-26T11:06:00.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T11:06:00.030Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms
2026-09-26T11:06:00.650Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 620ms; other=not-started
2026-09-26T11:06:00.655Z [LOG] [Main] answer source: gemini-3.5-flash-lite (hedge)
2026-09-26T11:06:01.200Z [LOG] [LLMHelper] gemini-3.5-flash-lite usage: thinking=HIGH thoughts=8 out=280 in=190
`;
// repo-fail mutation: drop the second window's won-by + answer-source(hedge) + usage lines,
// leaving 1 front line and 0 won-by with no later window's surplus - NEW-C1 rule (b), FAIL.
const DEFAULT_DEBUG_MUTATED = DEFAULT_DEBUG
    .replace('2026-09-26T11:03:05.400Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 5370ms; other=aborted\n', '')
    .replace('2026-09-26T11:03:05.405Z [LOG] [Main] answer source: gemini-3.1-flash-lite (hedge)\n', '')
    .replace('2026-09-26T11:03:05.900Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=190 in=170\n', '');

const OFF_DEBUG = `=== Natively session started 2026-09-26T12:00:00.000Z ===
2026-09-26T12:00:00.100Z [LOG] [Main] verbal hedge: off
2026-09-26T12:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"
2026-09-26T12:00:10.020Z [LOG] [Main] answer source: gemini-3.1-flash-lite
2026-09-26T12:00:10.030Z [LOG] [LLMHelper] verbal stall race: trying gemini-3.1-flash-lite (fallback=gemini-3.5-flash-lite after 8000ms)
2026-09-26T12:00:10.700Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=default thoughts=0 out=200 in=150
`;

const REFUSE_DEBUG = `=== Natively session started 2026-09-26T13:00:00.000Z ===
2026-09-26T13:00:00.500Z [ERROR] [Main] NATIVELY_VERBAL_HEDGE="yes" is not "1" or "0"/unset; a typo must not fly silently off \u2014 refusing to start
`;

const DIAG = `[2026-09-26T10:00:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T10:02:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T10:04:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T11:00:10.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T11:03:00.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T11:06:00.100Z] route: VERBAL-TECHNICAL (selected model, filtered)
[2026-09-26T12:00:10.100Z] route: BEHAVIORAL (Flash Lite, filtered)
`;

function buildPassTree(base) {
    write(base, 'smoke-hedge-forced.log', '=== HEDGE SMOKE 1: forced race, trigger=1ms ===\n2026-09-26T10:00:00.000Z\nSMOKE1 EXIT 0\n');
    write(base, 'smoke-hedge-forced.natively_debug.log', FORCED_DEBUG);
    write(base, 'smoke-hedge-forced.app-start.log', 'app started (calibration fixture)\n');

    write(base, 'smoke-hedge-default.log', '=== HEDGE SMOKE 2: default trigger, 5000ms ===\n2026-09-26T11:00:00.000Z\nSMOKE2 EXIT 0\n');
    write(base, 'smoke-hedge-default.natively_debug.log', DEFAULT_DEBUG);
    // app-start.log deliberately omitted for default - exercises the "extra log not found" note.

    write(base, 'smoke-hedge-off.log', '=== HEDGE SMOKE 3: control, flag unset ===\n2026-09-26T12:00:00.000Z\nSMOKE3 EXIT 0\n');
    write(base, 'smoke-hedge-off.natively_debug.log', OFF_DEBUG);
    // app-start.log deliberately omitted for off too - same note, second occurrence.

    write(base, 'smoke-hedge-refuse.log', '=== HEDGE SMOKE 4: startup refusal, bad value ===\n2026-09-26T13:00:00.000Z\nREFUSE exited code=1 after 850ms\nSMOKE4 EXIT 0\n');
    write(base, 'smoke-hedge-refuse.natively_debug.log', REFUSE_DEBUG);
    write(base, 'smoke-hedge-refuse.child.log', '(no output before refusal)\n');

    fs.writeFileSync(path.join(base, 'verbal-diag.log'), DIAG);
    fs.mkdirSync(path.join(base, 'electron', 'test', 'golden'), { recursive: true });
    fs.writeFileSync(path.join(base, 'electron', 'test', 'golden', 'interview60.run.mjs'), '// placeholder so a human sees this is a fixture tree, not touched by run-smoke-hedge-checks.mjs\n');
}

buildPassTree(path.join(ROOT, 'repo-pass'));

buildPassTree(path.join(ROOT, 'repo-fail'));
write(path.join(ROOT, 'repo-fail'), 'smoke-hedge-default.natively_debug.log', DEFAULT_DEBUG_MUTATED);

buildPassTree(path.join(ROOT, 'repo-error'));
fs.unlinkSync(path.join(ROOT, 'repo-error', 'electron', 'test', 'golden', 'interview60.runs', 'smoke-hedge-off.log'));

// NEW2-I1 (task-7-rereview2.md): the copy EXISTS (the runner's own pre-check passes) but is not
// a readable file - check-smoke-hedge.mjs's readTextOrNull throws EISDIR, caught, returns null,
// and it exits 2. A directory in the file's place reproduces this without touching permissions.
buildPassTree(path.join(ROOT, 'repo-unreadable'));
const unreadablePath = path.join(ROOT, 'repo-unreadable', 'electron', 'test', 'golden', 'interview60.runs', 'smoke-hedge-forced.natively_debug.log');
fs.unlinkSync(unreadablePath);
fs.mkdirSync(unreadablePath);

console.log('built repo-pass, repo-fail, repo-error, repo-unreadable under', ROOT);
