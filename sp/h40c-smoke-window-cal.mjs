// Rule-8 calibration for h40c-smoke-window.mjs (fix round 3, R3): builds a synthetic copy of what
// launch-smoke-hedge.cmd actually produces (per-segment natively_debug.log snapshots, the
// launcher's own progress logs whose 2nd line is a bare ISO timestamp, and ONE cumulative,
// never-reset verbal-diag.log spanning several segments), then proves buildSmokeWindow():
//  1. succeeds on a correctly-shaped default segment, with byte/timestamp offsets matching hand
//     computation exactly, and hands hedgeStats() a run-folder it can read end to end;
//  2. refuses the FORCED segment's debug log (on trigger=1ms) fed in as "default", instead of
//     silently mistiming everything downstream;
//  3. refuses a segment with a startup line but no dispatch: answer line after it;
//  4. throws, naming the problem, when the diag lines carry no parseable timestamp - fix round 4,
//     N-M2 dropped the earlier pooled-fallback behavior (it could never actually pool a wider
//     first-token sample either way, since the stats script's own first-token regex needs that
//     same timestamp prefix; it would just silently read n=0 downstream of an unwatched warning).
import fs from 'node:fs';
import path from 'node:path';
import { buildSmokeWindow } from './h40c-smoke-window.mjs';
import { hedgeStats } from './h40c-hedge-stats.mjs';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/h40c-smoke-window-cal';

let failures = 0;
function check(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failures++;
    console.log(`${ok ? 'ok' : 'FAIL'}   ${name} :: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}
function checkFails(name, fn, msgIncludes) {
    try {
        fn();
        failures++;
        console.log(`FAIL   ${name} :: did not throw`);
    } catch (e) {
        const ok = e.message.includes(msgIncludes);
        if (!ok) failures++;
        console.log(`${ok ? 'ok' : 'FAIL'}   ${name} :: threw "${e.message}" (want it to include "${msgIncludes}")`);
    }
}

function freshRuns(caseName) {
    const runs = path.join(ROOT, `runs-${caseName}`);
    fs.rmSync(runs, { recursive: true, force: true });
    fs.mkdirSync(runs, { recursive: true });
    return runs;
}
function progressLog(dir, name, startIso) {
    fs.writeFileSync(path.join(dir, name), [`=== HEDGE SMOKE: ${name} ===`, startIso, 'app started, playing clip...'].join('\n') + '\n');
}

const DEFAULT_DEBUG = [
    '2026-09-26T13:05:00.000Z [LOG] [Main] Gemini API Key updated.',
    '2026-09-26T13:05:00.100Z [LOG] [Main] verbal hedge: on trigger=5000ms',
    '2026-09-26T13:05:00.200Z [LOG] [Main] Default Model set to: gemini-3.1-flash-lite',
    '2026-09-26T13:05:05.000Z [LOG] [Main] Starting Meeting',
    '2026-09-26T13:05:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="x" verdict=match question="x"',
    '2026-09-26T13:05:10.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T13:05:11.300Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 1200ms; other=not-started',
    '2026-09-26T13:05:11.350Z [LOG] [Answer] full: "smoke answer text"',
].join('\n') + '\n';

// A cumulative diag log spanning three segments: one line before the default segment's own
// start (belongs to an earlier segment, e.g. forced), two lines inside the default segment's
// window, one line after the off segment's start (belongs to the NEXT segment).
const REAL_DIAG = [
    '[2026-09-26T13:03:00.000Z] first token 900ms',
    '[2026-09-26T13:05:11.300Z] first token 1200ms',
    '[2026-09-26T13:05:45.000Z] first token 1500ms',
    '[2026-09-26T13:07:30.000Z] first token 2000ms',
].join('\n') + '\n';

// --- Case 1: the correctly-shaped default segment -> succeeds; offsets match hand computation;
// hedgeStats() can read the built run-folder end to end. ---
{
    const runs = freshRuns('case1');
    fs.writeFileSync(path.join(runs, 'smoke-hedge-default.natively_debug.log'), DEFAULT_DEBUG);
    progressLog(runs, 'smoke-hedge-default.log', '2026-09-26T13:05:08.000Z');
    progressLog(runs, 'smoke-hedge-off.log', '2026-09-26T13:07:00.000Z');
    const diagLog = path.join(ROOT, 'verbal-diag-case1.log');
    fs.writeFileSync(diagLog, REAL_DIAG);
    const out = path.join(ROOT, 'out-case1');

    const r = buildSmokeWindow(runs, diagLog, out);
    const lines = DEFAULT_DEBUG.split('\n');
    const expectedStartDebug = Buffer.byteLength(lines.slice(0, 4).join('\n') + '\n', 'utf8'); // byte offset of the "dispatch: answer" line
    check('case1 startDebug = the dispatch: answer line offset', r.startDebug, expectedStartDebug);
    check('case1 endDebug = whole file size', r.endDebug, Buffer.byteLength(DEFAULT_DEBUG, 'utf8'));

    const s = hedgeStats(out);
    check('case1 hedgeStats reads the built folder: 1 dispatch window', s.dispatches, 1);
    check('case1 startup flag read as the default trigger', s.startupFlag, 'on trigger=5000ms');
    // REAL_DIAG has 2 lines inside [defaultStart 13:05:08, offStart 13:07:00) - 13:05:11.300 and
    // 13:05:45.000 - and one line on each side of the window (13:03:00 before, 13:07:30 after),
    // both correctly excluded.
    check('case1 first-token n=2 (only the in-window diag lines; forced/off lines excluded)', s.firstTokenN, 2);
}

// --- Case 2: the FORCED segment's own debug log (trigger=1ms) fed in as if it were "default" ->
// must refuse by name, not silently mistime everything downstream. ---
{
    const runs = freshRuns('case2');
    const forcedDebug = DEFAULT_DEBUG.replace('trigger=5000ms', 'trigger=1ms').replace('trigger=5000ms', 'trigger=1ms');
    fs.writeFileSync(path.join(runs, 'smoke-hedge-default.natively_debug.log'), forcedDebug);
    progressLog(runs, 'smoke-hedge-default.log', '2026-09-26T13:05:08.000Z');
    progressLog(runs, 'smoke-hedge-off.log', '2026-09-26T13:07:00.000Z');
    const diagLog = path.join(ROOT, 'verbal-diag-case2.log');
    fs.writeFileSync(diagLog, REAL_DIAG);
    checkFails('case2 refuses a forced-trigger debug log', () => buildSmokeWindow(runs, diagLog, path.join(ROOT, 'out-case2')), 'not the default segment');
}

// --- Case 3: a startup line but no dispatch: answer line after it -> refuses by name. ---
{
    const runs = freshRuns('case3');
    const noDispatch = [
        '2026-09-26T13:05:00.000Z [LOG] [Main] Gemini API Key updated.',
        '2026-09-26T13:05:00.100Z [LOG] [Main] verbal hedge: on trigger=5000ms',
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(runs, 'smoke-hedge-default.natively_debug.log'), noDispatch);
    progressLog(runs, 'smoke-hedge-default.log', '2026-09-26T13:05:08.000Z');
    progressLog(runs, 'smoke-hedge-off.log', '2026-09-26T13:07:00.000Z');
    const diagLog = path.join(ROOT, 'verbal-diag-case3.log');
    fs.writeFileSync(diagLog, REAL_DIAG);
    checkFails('case3 refuses a segment with no dispatch: answer line', () => buildSmokeWindow(runs, diagLog, path.join(ROOT, 'out-case3')), 'never answered anything');
}

// --- Case 4 (fix round 4, N-M2): diag lines with no parseable timestamp -> throws, naming the
// problem, instead of silently pooling the whole file into a folder that would only ever read
// first-token n=0 anyway (the stats script's own regex needs that same timestamp prefix). ---
{
    const runs = freshRuns('case4');
    fs.writeFileSync(path.join(runs, 'smoke-hedge-default.natively_debug.log'), DEFAULT_DEBUG);
    progressLog(runs, 'smoke-hedge-default.log', '2026-09-26T13:05:08.000Z');
    progressLog(runs, 'smoke-hedge-off.log', '2026-09-26T13:07:00.000Z');
    const diagLog = path.join(ROOT, 'verbal-diag-case4.log');
    const untimestamped = 'first token 1200ms\nfirst token 1500ms\n'; // no leading [ISO] at all
    fs.writeFileSync(diagLog, untimestamped);
    checkFails('case4 refuses a diag log with no parseable timestamp', () => buildSmokeWindow(runs, diagLog, path.join(ROOT, 'out-case4')), 'no line with a parseable');
}

console.log(failures === 0 ? 'SMOKE-WINDOW CALIBRATION OK' : `SMOKE-WINDOW CALIBRATION FAILED ${failures}`);
process.exit(failures === 0 ? 0 : 1);
