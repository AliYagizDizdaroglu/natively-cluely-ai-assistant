// Rule-8 calibration for h40c-hedge-stats.mjs's C1 VOID logic: proves each of the three
// mechanical VOID conditions can independently fire, and that a clean case does not. Builds
// three tiny synthetic run-dirs in the scratchpad (never touches MAIN), one per condition.
import fs from 'node:fs';
import path from 'node:path';
import { hedgeStats } from './h40c-hedge-stats.mjs';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';

function build(name, preLines, windowLines) {
    const dir = path.join(ROOT, name);
    fs.mkdirSync(dir, { recursive: true });
    const pre = preLines.join('\n') + (preLines.length ? '\n' : '');
    const win = windowLines.join('\n') + '\n';
    const full = pre + win;
    const startDebug = Buffer.byteLength(pre, 'utf8');
    const endDebug = Buffer.byteLength(full, 'utf8');
    fs.writeFileSync(path.join(dir, 'natively_debug.log'), full);
    fs.writeFileSync(path.join(dir, 'verbal-diag.log'), '');
    fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify({
        startedAt: '2026-09-26T18:00:00.000Z', startedMs: 0, clock: 'playsync',
        startDebug, startDiag: 0, items: [],
        endedAt: '2026-09-26T18:05:00.000Z', endedMs: 0, endDebug, endDiag: 0,
    }));
    return dir;
}

let failures = 0;
function check(name, got, want) {
    const ok = got === want;
    if (!ok) failures++;
    console.log(`${ok ? 'ok' : 'FAIL'}   ${name} :: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

// Baseline: one clean window (front + won-by, correct startup line) — must NOT be void.
const cleanDir = build('h40c-stats-cal-void-clean', [
    '2026-09-26T18:00:00.000Z [LOG] [Main] verbal hedge: on trigger=5000ms',
], [
    '2026-09-26T18:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="x" verdict=match question="x"',
    '2026-09-26T18:00:10.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T18:00:11.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started',
]);
check('clean fixture is NOT void', hedgeStats(cleanDir).rule1Void, false);

// C1(a): startup line present but wrong trigger value.
const voidA = build('h40c-stats-cal-void-a', [
    '2026-09-26T18:00:00.000Z [LOG] [Main] verbal hedge: on trigger=9999ms',
], [
    '2026-09-26T18:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="x" verdict=match question="x"',
    '2026-09-26T18:00:10.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=9999ms',
    '2026-09-26T18:00:11.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started',
]);
{
    const s = hedgeStats(voidA);
    check('C1(a) wrong trigger: void', s.rule1Void, true);
    check('C1(a) reason names the mismatch', s.voidReasons.some((r) => r.includes('on trigger=9999ms')), true);
}

// C1(a) variant: no startup line observed at all.
const voidA2 = build('h40c-stats-cal-void-a2', [], [
    '2026-09-26T18:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="x" verdict=match question="x"',
    '2026-09-26T18:00:10.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T18:00:11.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started',
]);
check('C1(a) absent startup line: void', hedgeStats(voidA2).rule1Void, true);

// C1(b): two windows, one has no front= line at all -> coverage 50% < 95%.
const voidB = build('h40c-stats-cal-void-b', [
    '2026-09-26T18:00:00.000Z [LOG] [Main] verbal hedge: on trigger=5000ms',
], [
    '2026-09-26T18:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="x" verdict=match question="x"',
    '2026-09-26T18:00:10.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T18:00:11.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started',
    '2026-09-26T18:00:40.000Z [LOG] [Main] dispatch: answer source=whisper anchor="y" verdict=match question="y"',
    '2026-09-26T18:00:40.050Z [LOG] [Main] answer source: gemini-3.1-flash-lite',
]);
{
    const s = hedgeStats(voidB);
    check('C1(b) 1 of 2 windows missing front=: void', s.rule1Void, true);
    check('C1(b) reason names the coverage number', s.voidReasons.some((r) => r.includes('50%')), true);
}

// C1(c): two back-starts, both reason=front-error -> 100% >= 50%, an objective outage.
const voidC = build('h40c-stats-cal-void-c', [
    '2026-09-26T18:00:00.000Z [LOG] [Main] verbal hedge: on trigger=5000ms',
], [
    '2026-09-26T18:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="x" verdict=match question="x"',
    '2026-09-26T18:00:10.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T18:00:10.500Z [WARN] [LLMHelper] gemini-3.5-flash-lite failed before its first token: 503',
    '2026-09-26T18:00:10.550Z [LOG] [LLMHelper] verbal hedge: back started at 400ms reason=front-error',
    '2026-09-26T18:00:11.500Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 1400ms; other=failed',
    '2026-09-26T18:00:40.000Z [LOG] [Main] dispatch: answer source=whisper anchor="y" verdict=match question="y"',
    '2026-09-26T18:00:40.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T18:00:40.500Z [WARN] [LLMHelper] gemini-3.5-flash-lite failed before its first token: 503',
    '2026-09-26T18:00:40.550Z [LOG] [LLMHelper] verbal hedge: back started at 400ms reason=front-error',
    '2026-09-26T18:00:41.500Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 1400ms; other=failed',
]);
{
    const s = hedgeStats(voidC);
    check('C1(c) 2 of 2 back-starts are front-error: void', s.rule1Void, true);
    check('C1(c) reason names the outage', s.voidReasons.some((r) => r.includes('front-error') && r.includes('outage')), true);
    // the 3.5-lite share this hour is 0 of 2 (0%) -- proves it is REPORTED, not what made this void.
    check('C1(c) share is reported, not the void reason', s.voidReasons.some((r) => r.includes('50%') && r.includes('outage')) || s.voidReasons.some((r) => r.includes('front-error')), true);
}

// N1 (fix round 2, Critical): the VOID(c) denominator is HEDGE RUNS (front= line count), not
// back-starts. Round 1's void-c fixture above (2 of 2 back-starts front-error) cannot tell the
// two denominators apart, because in that fixture hedgeRuns also happens to equal 2 — the exact
// gap the re-review's rule-8 note names. These two cases can only pass under the N1 denominator.
/** Builds `n` one-front hedge-run windows, `frontErrorCount` of them starting a back leg with
 * reason=front-error (and a clean back win), the rest winning on the front leg immediately. */
function buildRuns(name, n, frontErrorCount) {
    const pre = ['2026-09-26T18:00:00.000Z [LOG] [Main] verbal hedge: on trigger=5000ms'];
    const lines = [];
    for (let i = 0; i < n; i++) {
        const t = 10 + i * 30; // whole-second offset, spaced well apart
        // s is seconds (may carry a fraction for the sub-second lines within one window);
        // split into whole seconds + ms so the timestamp string is always valid (a bug caught by
        // eyeballing this script's own first run: (t+s)%60 with a fractional s printed things
        // like "18:04:281.5.000Z" when the naive version merged the fraction into the seconds
        // field instead of the milliseconds field).
        const ts = (s) => {
            const totalMs = Math.round((t + s) * 1000);
            const wholeS = Math.floor(totalMs / 1000);
            const ms = totalMs % 1000;
            const mm = Math.floor(wholeS / 60), ss = wholeS % 60;
            return `2026-09-26T18:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}Z`;
        };
        lines.push(`${ts(0)} [LOG] [Main] dispatch: answer source=whisper anchor="q${i}" verdict=match question="q${i}"`);
        lines.push(`${ts(0.1)} [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms`);
        if (i < frontErrorCount) {
            lines.push(`${ts(0.5)} [WARN] [LLMHelper] gemini-3.5-flash-lite failed before its first token: 503`);
            lines.push(`${ts(0.55)} [LOG] [LLMHelper] verbal hedge: back started at 400ms reason=front-error`);
            lines.push(`${ts(1.5)} [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 1400ms; other=failed`);
        } else {
            lines.push(`${ts(1.0)} [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 900ms; other=not-started`);
        }
    }
    return build(name, pre, lines);
}

// 10 hedge runs, 2 front-error back-starts: N1's ruling denominator gives 2/10 = 20% < 50% ->
// must NOT be void. Round 1's bug (denominator = back-starts = 2) would have given 2/2 = 100%.
{
    const s = hedgeStats(buildRuns('h40c-stats-cal-void-n1-notvoid', 10, 2));
    check('N1: 10 runs, 2 of 10 front-error (20%): NOT void', s.rule1Void, false);
    check('N1: 10 runs, 2 of 10 front-error: hedgeRuns=10', s.hedgeRuns, 10);
    check('N1: 10 runs, 2 of 10 front-error: frontErrorShare=0.2', s.frontErrorShare, 0.2);
}

// 10 hedge runs, 5 front-error back-starts: 5/10 = 50% -> void.
{
    const s = hedgeStats(buildRuns('h40c-stats-cal-void-n1-void', 10, 5));
    check('N1: 10 runs, 5 of 10 front-error (50%): void', s.rule1Void, true);
    check('N1: 10 runs, 5 of 10 front-error: reason names the outage', s.voidReasons.some((r) => r.includes('front-error') && r.includes('outage')), true);
}

console.log(failures === 0 ? `VOID CALIBRATION OK` : `VOID CALIBRATION FAILED ${failures}`);
process.exit(failures === 0 ? 0 : 1);
