#!/usr/bin/env node
/**
 * h40c-hedge-stats.mjs <run-dir>
 *
 * Reads one flight run folder (natively_debug.log, verbal-diag.log,
 * interview60.timeline.json — the same three files interview60.metrics.mjs reads, sliced to
 * the run's own window with logSince) and reports the hedge mechanics the h40c
 * pre-registration's rule needs: the startup flag (read from BEFORE the window, fix round 1
 * I2), per-window won-by/3.5-lite share (I3), a VOID(c) outage share measured against hedge RUNS
 * (front= line count), not back-starts (fix round 2 N1), answer failures defined per window as a
 * failure line with no won-by in the same window (fix round 2 N5, replacing round 1's
 * supersede-adjacency heuristic). A window with BOTH a failure line and a won-by line is resolved
 * using that window's OWN `[Answer] full:` text, never assumed either way (fix round 3 R2): it is
 * charged as a failure when that text is itself one of the app's own failure messages, left
 * uncharged when it is a real delivered answer, and — if no `[Answer] full:` line exists in the
 * window at all — left UNRESOLVED, which makes rule 2 report INCOMPLETE rather than a PASS it did
 * not earn (fix round 3 R2). Rule 2 also reports INCOMPLETE when the first-token sample covers
 * too little of the hour to trust a median/p90 against it (fix round 3 R6). Also: redirects,
 * back-start reasons, winner split, first-token median/p90 (h40b's own p90 compared at its exact
 * 13.608s, N4), and the rule's mechanical VOID conditions plus the latency numbers read against
 * h40b (C1) — see PREREGISTER-h40c.md rules 1-3.
 *
 * logSince() and pct() are copied from electron/test/golden/interview60.lib.mjs and
 * interview60.metrics.mjs (not imported): this script is invoked against scratchpad run-folder
 * copies as well as the live checkout, and MAIN's path is not fixed (accented "Masaüstü",
 * resolved by wildcard elsewhere) — a relative import would tie this script to being run from
 * inside MAIN's tree, which the calibration copies are not.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Bytes [from, to) of a file as utf8; '' when the range is empty or the file is missing. */
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

// The rule's own three latency numbers, read against h40b (PREREGISTER-h40c.md rule 2; h40b's
// TTFT row in passes/2026-09-26-h40b-result.md prints "5.0 s" / "13.6 s" rounded to 0.1s, but
// this script's own median/p90 computation over the SAME run reproduces 5.026s / 13.608s exactly
// (fix round 1 calibration on the h40b copy, re-verified fix round 3) — fix round 2 finding N4:
// comparing THIS script's p90 output against the rounded 13.6 made its own reproduction of h40b's
// own p90 read as a FAIL against itself. Fix round 3 R5: the median ceiling had stayed at the
// rounded 5.0 while p90 had already moved to the exact value — one precision for both now.
export const H40B_RULE = { medianCeilingS: 5.026 + 1.0, p90CeilingS: 13.608, answerFailuresCeiling: 0 };
// M5: the front model's name, compared with === everywhere a "was it 3.5-lite" question is asked
// — a loose `.includes('3.5')` would also match a future 'gemini-3.5-flash' (no "-lite").
const FRONT_MODEL = 'gemini-3.5-flash-lite';
// C1: the exact startup line the hedge must log for rule 1 to be even mechanically eligible.
const EXPECTED_STARTUP_FLAG = 'on trigger=5000ms';

const LVL = '\\[(?:LOG|WARN|ERROR)\\]';
const reFront = new RegExp(`^\\S+ ${LVL} \\[LLMHelper\\] verbal hedge: front=(\\S+) back=(\\S+) trigger=(\\d+)ms`, 'gm');
const reWonBy = new RegExp(`^\\S+ ${LVL} \\[LLMHelper\\] verbal hedge: won by (\\S+) at (\\d+)ms; other=(\\S+)`, 'gm');
const reBackStarted = new RegExp(`^\\S+ ${LVL} \\[LLMHelper\\] verbal hedge: back started at (\\d+)ms reason=(\\S+)`, 'gm');
const reNoAnswer = new RegExp(`^\\S+ ${LVL} \\[LLMHelper\\] verbal hedge: no answer - front (\\S+), back (\\S+)`, 'gm');
// I4: the exact "both legs ended with nothing" case counts as a failure; a case where one leg
// errored is reported by reNoAnswer above but is not, by the pre-registration's I4 definition,
// one of the two failure patterns (Stream failed only fires on the classic race's redirect path).
const reNoAnswerEmptyEmpty = new RegExp(`^\\S+ ${LVL} \\[LLMHelper\\] verbal hedge: no answer - front empty, back empty`, 'gm');
// I4: WhatToAnswerLLM logs this with console.error (real dist: `[ERROR]`), not console.warn —
// LVL already covers ERROR, so this is unaffected, but the level is named here for the record
// (review M-finding on an earlier synthetic fixture that guessed [WARN]).
const reStreamFailed = new RegExp(`^\\S+ ${LVL} \\[WhatToAnswerLLM\\] Stream failed`, 'gm');
// I8/I3: a dispatch or a supersede both start a fresh hedge cycle (main.ts's 'supersede' case
// calls answerDetection exactly like a fresh 'dispatch' does) — both open a new window. Only
// these two ever start a NEW generation; chip/drop/extend/hold/mark do not.
const reDispatchStart = /^\S+ \[LOG\] \[Main\] dispatch: (answer|supersede) /gm;
const reStartupFlag = new RegExp(`^\\S+ \\[LOG\\] \\[Main\\] verbal hedge: (on trigger=\\d+ms|off)`, 'gm');
const reFirstToken = /^\[(\S+)\] first token (\d+)ms/gm;
// R2: SessionTracker.addAssistantMessage logs the whole delivered answer as one JSON-encoded
// line, `console.log(\`[Answer] full: ${JSON.stringify(text)}\`)`, whenever text is non-empty —
// including the app's own failure text, which is itself delivered to the user as "the answer".
// This is the one place a window's OWN outcome can be read directly, instead of inferred from
// which other lines happen to share its byte range.
const reAnswerFull = new RegExp(`^\\S+ ${LVL} \\[Answer\\] full: (.+)$`, 'gm');
// R2: the two texts the app itself delivers as "an answer" when nothing real was produced —
// WhatToAnswerLLM's own generateStream catch block (a thrown error, e.g. the hedge's Stream
// failed path: `[No answer — the answer model failed: ...]` / `[No answer — both the primary
// model and the <fallback> fallback failed: ...]`), and IntelligenceEngine's separate generic
// fallback for the quiet "both legs ended empty" case. Checked as a plain substring of the raw
// `[Answer] full:` capture (JSON.stringify never escapes an em dash, a space, or a question mark,
// so the marker text survives JSON-encoding unchanged) — no JSON.parse needed or wanted here.
const FAILURE_TEXT_MARKERS = ['[No answer —', 'Could you repeat that? I want to make sure I address your question properly.'];
// R6: rule 2's median/p90 need enough of the hour's own first-token lines to be trustworthy. A
// diag slice that is missing or mis-windowed would otherwise silently report "n/a" and the
// failure-count clause alone would read PASS — the exact gap this ceiling closes.
const FIRST_TOKEN_COVERAGE_FLOOR = 0.9;

export function hedgeStats(dir) {
    const debugLog = path.join(dir, 'natively_debug.log');
    const diagLog = path.join(dir, 'verbal-diag.log');
    const timelinePath = path.join(dir, 'interview60.timeline.json');
    if (!fs.existsSync(debugLog)) throw new Error(`missing ${debugLog}`);
    if (!fs.existsSync(diagLog)) throw new Error(`missing ${diagLog}`);
    if (!fs.existsSync(timelinePath)) throw new Error(`missing ${timelinePath}`);
    const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
    const dbg = logSince(debugLog, timeline.startDebug, timeline.endDebug);
    const diag = logSince(diagLog, timeline.startDiag, timeline.endDiag);

    // I2: the startup line (describeVerbalHedgeAtStartup) is logged in initializeApp, BEFORE
    // credentials load — it sits at the top of the file, not inside [startDebug, endDebug). Read
    // it from the bytes BEFORE the window instead, and take the LAST match (a restart mid-prep
    // would log it again; the most recent one before the window is the one that governed the run).
    const preDbg = logSince(debugLog, 0, timeline.startDebug);
    const startupMatches = [...preDbg.matchAll(reStartupFlag)];
    const startupFlag = startupMatches.length ? startupMatches[startupMatches.length - 1][1] : null;

    const dispatchStarts = [...dbg.matchAll(reDispatchStart)].map((m) => ({ index: m.index, action: m[1] }));
    const front = [...dbg.matchAll(reFront)];
    const wonBy = [...dbg.matchAll(reWonBy)];
    const backStarted = [...dbg.matchAll(reBackStarted)];
    const noAnswer = [...dbg.matchAll(reNoAnswer)];
    const noAnswerEmptyEmpty = [...dbg.matchAll(reNoAnswerEmptyEmpty)];
    const streamFailed = [...dbg.matchAll(reStreamFailed)];
    const answerFull = [...dbg.matchAll(reAnswerFull)];
    const firstTokenMs = [...diag.matchAll(reFirstToken)].map((m) => Number(m[2])).sort((a, b) => a - b);

    const winnerByModel = {};
    for (const m of wonBy) winnerByModel[m[1]] = (winnerByModel[m[1]] || 0) + 1;
    const otherCounts = {};
    for (const m of wonBy) otherCounts[m[3]] = (otherCounts[m[3]] || 0) + 1;
    const backReasons = {};
    for (const m of backStarted) backReasons[m[2]] = (backReasons[m[2]] || 0) + 1;

    // Per-window pass (M7 + I3 + I4/N5). A window is [this dispatch-or-supersede start, the next
    // one) — the shape a superseded generation's belated legs land in (N5: a superseded
    // generation is ended by the CONSUMER calling .return() on its OWN read of the stream, not by
    // an error inside LLMHelper — the hedge race keeps running regardless and its eventual
    // won-by/no-answer/Stream-failed line is logged AFTER the `dispatch: supersede` line, i.e.
    // inside the NEXT window, not its own).
    //
    // N5's failure rule replaces round 1's "exclude a window followed by a supersede" heuristic
    // with a more precise one: a window counts as a real answer failure only when it has a
    // failure-shaped line (Stream failed, or the exact "front empty, back empty" no-answer) AND
    // NO won-by line at all. A window with BOTH is NOT assumed either way — round 2 called this
    // "ambiguous" and left it uncharged on the theory that the failure line must be a STALE
    // straggler from an earlier, superseded generation; round 3 finding R2 points out the window's
    // OWN fresh race can just as well win a first token and then fail on its OWN stream, which is
    // a real, chargeable failure that looks identical from line adjacency alone. Resolved below
    // using the window's own `[Answer] full:` text instead of guessing from shape.
    const sourceLabels = {};
    let redirects = 0;
    let answersWithRedirect = 0;
    let windowsWithFront = 0;
    let windowsWithWonBy = 0;
    let windowsWonBy35 = 0;
    let cleanFailures = 0;       // R2: a failure line with no won-by at all in the window - unambiguous
    let resolvedAsFailure = 0;   // R2: failure line + won-by, resolved to a failure via [Answer] full:
    let resolvedDelivered = 0;   // R2: failure line + won-by, resolved to a real delivered answer
    let unresolvedAmbiguous = 0; // R2: failure line + won-by, no [Answer] full: line to resolve it
    for (let i = 0; i < dispatchStarts.length; i++) {
        const start = dispatchStarts[i].index;
        const end = i + 1 < dispatchStarts.length ? dispatchStarts[i + 1].index : dbg.length;

        const frontInWindow = front.filter((m) => m.index >= start && m.index < end);
        if (frontInWindow.length > 0) windowsWithFront++;
        if (frontInWindow.length > 1) {
            redirects += frontInWindow.length - 1;
            answersWithRedirect++;
        }

        const wonByInWindow = wonBy.filter((m) => m.index >= start && m.index < end);
        let label = 'none'; // N10: a window with no won-by prints "none", never the stale head label
        if (wonByInWindow.length > 0) {
            windowsWithWonBy++;
            // I3: the LAST won-by in the window is the one that actually answered (a redirect's
            // earlier, discarded attempt could also have a won-by if it then failed to deliver —
            // not on this roster today, but the "last" rule is correct either way).
            const lastWinner = wonByInWindow[wonByInWindow.length - 1][1];
            if (lastWinner === FRONT_MODEL) windowsWonBy35++;
            label = lastWinner;
        }
        sourceLabels[label] = (sourceLabels[label] || 0) + 1;

        const failureLinesInWindow = streamFailed.filter((m) => m.index >= start && m.index < end).length
            + noAnswerEmptyEmpty.filter((m) => m.index >= start && m.index < end).length;
        if (failureLinesInWindow > 0) {
            if (wonByInWindow.length === 0) {
                cleanFailures++;
            } else {
                // R2: resolve using THIS window's own [Answer] full: text - the last one, if the
                // window somehow logged more than one (a redirect's own recovery answer would be
                // the one that matters, same "last wins" rule I3 already uses for the winner).
                const answerFullInWindow = answerFull.filter((m) => m.index >= start && m.index < end);
                if (answerFullInWindow.length === 0) {
                    unresolvedAmbiguous++;
                } else {
                    const deliveredText = answerFullInWindow[answerFullInWindow.length - 1][1];
                    if (FAILURE_TEXT_MARKERS.some((marker) => deliveredText.includes(marker))) resolvedAsFailure++;
                    else resolvedDelivered++;
                }
            }
        }
    }
    const answerFailures = cleanFailures + resolvedAsFailure;

    const medianMs = pct(firstTokenMs, .5);
    const p90Ms = pct(firstTokenMs, .9);
    const medianS = medianMs == null ? null : Math.round(medianMs) / 1000;
    const p90S = p90Ms == null ? null : Math.round(p90Ms) / 1000;

    // C1: VOID is mechanical only — never a low 3.5-lite share by itself (that is what the hedge
    // does under load, the exact daytime case this pre-registration must not throw away).
    const frontCoverage = dispatchStarts.length ? windowsWithFront / dispatchStarts.length : null;
    const frontErrorCount = backReasons['front-error'] || 0;
    // N1 (fix round 2, Critical): the denominator is HEDGE RUNS — the count of `verbal hedge:
    // front=` lines in the hour, i.e. `front.length` — NOT back-starts. Dividing by back-starts
    // (round 1's bug) made a hurried 2-of-4-back-starts hour VOID at 50% when the true share
    // against the hour's ~44 hedge runs was under 5%: a fast, healthy hour with a couple of slow
    // 3.5-lite answers would have been thrown away, and a real rule-3 FAIL on that same hour would
    // have been excused by the VOID rather than reported (exactly C1's original class of bug).
    const hedgeRuns = front.length;
    const frontErrorShare = hedgeRuns ? frontErrorCount / hedgeRuns : 0;
    const voidReasons = [];
    if (startupFlag !== EXPECTED_STARTUP_FLAG) voidReasons.push(`startup line is ${startupFlag === null ? 'absent' : `"${startupFlag}"`}, not exactly "${EXPECTED_STARTUP_FLAG}"`);
    if (frontCoverage === null) voidReasons.push('no answer-dispatch windows in this run');
    else if (frontCoverage < 0.95) voidReasons.push(`only ${(frontCoverage * 100).toFixed(0)}% of answer-dispatch windows have a front= line (need >=95%)`);
    if (hedgeRuns > 0 && frontErrorShare >= 0.5) voidReasons.push(`${(frontErrorShare * 100).toFixed(0)}% of hedge runs are front-error (an objective 3.5-lite outage, need <50% of ${hedgeRuns} runs)`);

    // R6: rule 2's median/p90 need enough of the hour's own first-token lines to be trustworthy -
    // a missing or mis-windowed diag slice must not silently read "n/a" and let the failure-count
    // clause alone carry rule 2 to PASS. Only evaluated when there is anything to cover at all
    // (windowsWithWonBy === 0 means rule 2 has nothing to measure regardless of the diag slice).
    const firstTokenCoverageOk = windowsWithWonBy === 0 || firstTokenMs.length >= FIRST_TOKEN_COVERAGE_FLOOR * windowsWithWonBy;
    const incompleteReasons = [];
    if (unresolvedAmbiguous > 0) incompleteReasons.push(`${unresolvedAmbiguous} window(s) had both a failure line and a won-by line but no [Answer] full: line to resolve which one is real`);
    if (!firstTokenCoverageOk) incompleteReasons.push(`first-token n=${firstTokenMs.length} covers less than ${(FIRST_TOKEN_COVERAGE_FLOOR * 100).toFixed(0)}% of the ${windowsWithWonBy} window(s) with a won-by line`);

    // N-I1 (fix round 4, Important): INCOMPLETE must only ever replace a would-be PASS, never mask
    // a FAIL that is already decided. An unresolved window can only ADD to the failure count, never
    // remove from one already charged, so >=1 charged failure fails rule 2 however the unresolved
    // windows eventually resolve; and a median/p90 breach measured against an ADEQUATE first-token
    // sample (coverage >= 90%) is decided regardless of what any unresolved window later turns out
    // to be. The old design set a separate `rule2Incomplete` boolean whenever anything was
    // undecided at all, which could print "failures FAIL -- INCOMPLETE, cannot read PASS" on an
    // hour that had already, decidedly, failed - the exact C1 class of bug (a VOID/INCOMPLETE
    // excusing a result that should have been reported). A decided fail now wins outright.
    const medianDecidedFail = medianS != null && medianS > H40B_RULE.medianCeilingS && firstTokenCoverageOk;
    const p90DecidedFail = p90S != null && p90S > H40B_RULE.p90CeilingS && firstTokenCoverageOk;
    const failuresDecidedFail = answerFailures > H40B_RULE.answerFailuresCeiling;
    const rule2Verdict = (failuresDecidedFail || medianDecidedFail || p90DecidedFail)
        ? 'FAIL'
        : (incompleteReasons.length > 0 ? 'INCOMPLETE' : 'PASS');

    // R4-M3(a) (fix round 5): the daytime window (12:00-15:00 local) rule 2's own numbers are read
    // against, per PREREGISTER-h40c.md's "flight window" paragraph. A FIXED UTC+3 offset
    // (Europe/Istanbul does not observe DST) - no calendar-aware timezone lookup needed or wanted
    // for a single hard-coded region. This is a gate on whether the HOUR can PASS, separate from
    // rule2Verdict itself: rule 2's own three sub-clauses stay exactly what they were ("reported
    // but not gated" by the window, per the pre-registration's own text) - report() states the
    // combined effect.
    const LOCAL_OFFSET_MIN = 3 * 60;
    const DAY_WINDOW_START_MIN = 12 * 60, DAY_WINDOW_END_MIN = 15 * 60;
    let playbackStartLocal = null, inDaytimeWindow = null;
    const startedAtMs = timeline.startedAt ? Date.parse(timeline.startedAt) : NaN;
    if (Number.isFinite(startedAtMs)) {
        const localMinutesOfDay = (Math.floor(startedAtMs / 60000) + LOCAL_OFFSET_MIN) % 1440;
        const hh = Math.floor(localMinutesOfDay / 60), mm = localMinutesOfDay % 60;
        playbackStartLocal = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        inDaytimeWindow = localMinutesOfDay >= DAY_WINDOW_START_MIN && localMinutesOfDay <= DAY_WINDOW_END_MIN;
    }

    return {
        dir,
        dispatches: dispatchStarts.length,
        hedgeDispatches: front.length,
        redirects,
        answersWithRedirect,
        wonBy: wonBy.length,
        backStarted: backStarted.length,
        backReasons,
        noAnswer: noAnswer.length,
        noAnswerEmptyEmpty: noAnswerEmptyEmpty.length,
        winnerByModel,
        otherCounts,
        sourceLabels,
        answerFailures,
        cleanFailures,
        resolvedAsFailure,
        resolvedDelivered,
        unresolvedAmbiguous,
        streamFailedTotal: streamFailed.length,
        firstTokenN: firstTokenMs.length,
        firstTokenCoverageOk,
        medianS,
        p90S,
        startupFlag,
        frontCoverage,
        hedgeRuns,
        frontErrorShare,
        windowsWithWonBy,
        windowsWonBy35,
        rule1Void: voidReasons.length > 0,
        voidReasons,
        rule2Verdict,
        incompleteReasons,
        playbackStartLocal,
        inDaytimeWindow,
    };
}

function fmtPct(x) { return x == null ? 'n/a' : `${(x * 100).toFixed(0)}%`; }

export function report(dir) {
    const s = hedgeStats(dir);
    const lines = [];
    lines.push(`h40c hedge stats: ${s.dir}`);
    lines.push(`verbal hedge flag at startup (read before the run's own window, I2): ${s.startupFlag ?? 'not observed'}`);
    lines.push(`answer-dispatch windows (dispatch + supersede starts): ${s.dispatches}`);
    if (s.hedgeDispatches === 0) {
        // The rule-1 VOID phrasing this line exists for: PREREGISTER-h40c.md's calibration case
        // (a run flown without NATIVELY_VERBAL_HEDGE, e.g. h40b) must read as "not exercised",
        // not as "0% pass" — the two are the same number but a different finding.
        lines.push(`hedge not in effect: 0 of ${s.dispatches}`);
    } else {
        lines.push(`hedge lines: front=${s.hedgeDispatches} won-by=${s.wonBy} back-started=${s.backStarted} no-answer=${s.noAnswer} (of which front-empty/back-empty: ${s.noAnswerEmptyEmpty})`);
        lines.push(`redirects (a second front= line inside one window, both legs having failed): ${s.redirects} (${s.answersWithRedirect} of ${s.dispatches} windows)`);
        lines.push(`back-start reasons: ${JSON.stringify(s.backReasons)}`);
        lines.push(`winner split by model (won-by lines, global count, descriptive only): ${JSON.stringify(s.winnerByModel)}`);
        lines.push(`other= counts: ${JSON.stringify(s.otherCounts)}`);
    }
    lines.push(`answering model per window, won-by line or "none" (N10 — never the stale head label): ${JSON.stringify(s.sourceLabels)}`);
    lines.push(`answer failures (I4/N5, R2 resolutions folded in): ${s.answerFailures} = ${s.cleanFailures} clean (a failure line with no won-by at all) + ${s.resolvedAsFailure} resolved-ambiguous (raw Stream-failed lines: ${s.streamFailedTotal})`);
    lines.push(`windows with BOTH a failure line and a won-by line, resolved via that window's own [Answer] full: text, never assumed (R2): ${s.resolvedAsFailure + s.resolvedDelivered + s.unresolvedAmbiguous} total — ${s.resolvedAsFailure} a real failure (charged above), ${s.resolvedDelivered} a real delivered answer (not charged), ${s.unresolvedAmbiguous} UNRESOLVED (no [Answer] full: line in the window)`);
    lines.push(`first token n=${s.firstTokenN} median=${s.medianS ?? 'n/a'}s p90=${s.p90S ?? 'n/a'}s (covers ${s.windowsWithWonBy ? `${s.firstTokenN} of ${s.windowsWithWonBy} won-by windows` : 'no won-by windows'}, floor ${(FIRST_TOKEN_COVERAGE_FLOOR * 100).toFixed(0)}%, R6)`);
    // N-I1: the verdict is three-valued (PASS/FAIL/INCOMPLETE, s.rule2Verdict) rather than a
    // PASS/FAIL string plus a bolted-on INCOMPLETE flag - a decided FAIL is reported as FAIL even
    // when something else is also still undecided, never masked as INCOMPLETE.
    let verdictNote;
    if (s.rule2Verdict === 'INCOMPLETE') verdictNote = `INCOMPLETE, cannot read PASS (${s.incompleteReasons.join('; ')})`;
    else if (s.incompleteReasons.length > 0) verdictNote = `${s.rule2Verdict} (also undecided: ${s.incompleteReasons.join('; ')})`;
    else verdictNote = s.rule2Verdict;
    lines.push(
        `rule 2 vs h40b, ALWAYS computed and reported, VOID included (C1) (median<=${H40B_RULE.medianCeilingS}s, p90<=${H40B_RULE.p90CeilingS}s, failures<=${H40B_RULE.answerFailuresCeiling}): ` +
        `median ${s.medianS == null ? 'n/a' : s.medianS <= H40B_RULE.medianCeilingS ? 'PASS' : 'FAIL'}, ` +
        `p90 ${s.p90S == null ? 'n/a' : s.p90S <= H40B_RULE.p90CeilingS ? 'PASS' : 'FAIL'}, ` +
        `failures ${s.answerFailures <= H40B_RULE.answerFailuresCeiling ? 'PASS' : 'FAIL'}; ` +
        `verdict: ${verdictNote}`,
    );
    // R4-M3(a): the daytime window rule 2's own numbers are read against - reported here,
    // separate from rule2Verdict, because the window governs whether the HOUR can PASS, not
    // whether rule 2's own three sub-clauses hold.
    if (s.playbackStartLocal == null) {
        lines.push(`playback start: not available (timeline.startedAt missing or unparseable) - the daytime window cannot be checked`);
    } else {
        lines.push(`playback start ${s.playbackStartLocal} local — ${s.inDaytimeWindow ? 'IN WINDOW 12:00-15:00' : 'OUT OF WINDOW (cannot PASS)'}`);
        if (s.inDaytimeWindow === false) {
            lines.push(`rule 2 above is reported but NOT GATED this hour: out of window, so there is no latency verdict this hour regardless of rule 2's own read; re-fly inside 12:00-15:00 local before this counts toward a ship decision`);
        }
    }
    // I3: numerator/denominator are windows, not a global line count; M5: exact model compare.
    const share35 = s.windowsWithWonBy ? s.windowsWonBy35 / s.windowsWithWonBy : null;
    lines.push(`hedge runs (front= line count, the VOID(c) and front-coverage denominator, N1): ${s.hedgeRuns}; front-error share of them: ${fmtPct(s.frontErrorShare)}`);
    lines.push(
        `rule 1 — mechanical eligibility (C1, VOID not FAIL): ${s.rule1Void ? `VOID (${s.voidReasons.join('; ')})` : 'not void'}`,
    );
    lines.push(
        `rule 1 — 3.5-lite share, REPORTED ONLY, never gating (I3: numerator = windows whose last won-by is exactly ${FRONT_MODEL}; denominator = windows with a won-by line): ` +
        `${s.windowsWonBy35} of ${s.windowsWithWonBy} (${fmtPct(share35)})`,
    );
    const text = lines.join('\n');
    console.log(text);
    return text;
}

// R4-M2 (fix round 5): blocking item 1's pass criterion needs the dispatch-window, won-by and
// per-model winner counts compared against Task 7's smoke checker's own independent count for the
// same segment (check-smoke-hedge.mjs default mode: its "windows found:" line and its per-window
// "winner=<model>" labels, tallied by hand). One line, the three numbers only, so the comparison
// does not require reading the whole report.
export function compareLine(dir) {
    const s = hedgeStats(dir);
    return `COMPARE dispatch-windows=${s.dispatches} won-by=${s.wonBy} winners=${JSON.stringify(s.winnerByModel)}`;
}

// M4: fileURLToPath, not a hand-rolled percent-decode of the URL pathname — the earlier version
// would report nothing and exit 0 if this script were ever copied under an accented path
// (Masaüstü) because the percent-encoded URL pathname would never equal process.argv[1].
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
    const runDir = process.argv[2];
    if (!runDir) { console.error('usage: node h40c-hedge-stats.mjs <run-dir> [--compare]'); process.exit(1); }
    if (process.argv.includes('--compare')) console.log(compareLine(runDir));
    else report(runDir);
}
