/**
 * Reads a launch-smoke-hedge.cmd segment's OWN copy of natively_debug.log (per-segment since
 * fix round 1) and checks the verbal hedge (NATIVELY_VERBAL_HEDGE) did what that segment
 * expects. Four modes, one per launcher segment:
 *
 *   forced   NATIVELY_VERBAL_HEDGE_TRIGGER_MS=1 - every answer must race both legs and
 *            abort the loser.
 *   default  the flight's trigger (5000ms) - every answer must have raced, whichever leg
 *            answered.
 *   off      the flag unset (control) - today's stall race must fire, no hedge line at all.
 *   refuse   a bad flag value - the app must log a startup refusal naming
 *            NATIVELY_VERBAL_HEDGE and the process observed to actually exit, not hang.
 *
 * FIX ROUND 2 (task-7-rereview.md, all Critical/Important/Minor findings accepted):
 *   NEW-C1  Fix round 1's AMBIGUOUS classification was too generous: an answer that never
 *           raced at all (0 front lines) or a race that never resolved (1 front, 0 won-by)
 *           both read as AMBIGUOUS, and one clean window elsewhere let the whole segment PASS
 *           regardless. AMBIGUOUS is now reserved for actual evidence of overlap (2+ front or
 *           won-by lines in one window, or a 0/1 shortfall a NEIGHBOURING window's surplus
 *           explains - a supersede's race can straddle a window boundary). Everything else
 *           definite is FAIL:
 *             (a) any "verbal hedge: no answer" line in the window (both legs failed/emptied);
 *             (b) exactly 1 front line, 0 won-by, and no LATER window holds a surplus won-by;
 *             (c) 0 front lines (off: 0 stall-race lines), the window's route is not confirmed
 *                 CODING (unknown routes are NOT exempt), and no EARLIER window holds a
 *                 surplus front/stall-race line.
 *           `--clips` is now required; PASS needs (scored windows + CODING windows) to equal
 *           the clip count, otherwise INCONCLUSIVE even with zero FAILs - partial accounting
 *           is not a clean pass.
 *   NEW-I1  `--diag-log` and `--clips` are both now required for forced/default/off (refuse
 *           mode uses neither) - route detection (needed for rule (c) above) and the clip
 *           count were both silently skippable before. See the new SP\run-smoke-hedge-checks.mjs
 *           for the runner that supplies all of this without the controller re-deriving every
 *           since/until/path by hand.
 *   NEW-M4  The unhandled-rejection/uncaught-exception match was case-insensitive and
 *           unanchored, so it fired on ANSWER TEXT that happened to mention "uncaught
 *           exception" (a real interview answer can). The debug-log check now requires
 *           level===CRITICAL AND the message starting with "Unhandled Rejection" or
 *           "Uncaught Exception". The extra-log check (unstructured) anchors on three crash
 *           shapes at the START of a line: "UnhandledPromiseRejectionWarning",
 *           "Uncaught Exception:", "A JavaScript error occurred in the main process".
 *   NEW-M5  Off mode's global "no hedge line anywhere" check now runs BEFORE the
 *           zero-windows-is-INCONCLUSIVE branch, not after - a segment with no dispatch at all
 *           but a stray hedge line must FAIL, not read INCONCLUSIVE.
 *
 * FIX ROUND 3 (task-7-rereview2.md):
 *   NEW2-M1  A segment whose every window took the CODING route (which never hedges by design)
 *           used to PASS - CODING was exempt from FAIL but nothing required at least one window
 *           to be genuinely SCORED, so a segment that never exercised the hedge at all still
 *           read PASS. Now INCONCLUSIVE unless scoredCount >= 1. Also: `routeFor` used to search
 *           up to dispatch+60s even when the window's own end was sooner (the NEXT dispatch
 *           arrived first) - a window with no route line of its own could borrow the next
 *           window's route, including a false CODING exemption. Now bounded by the window's own
 *           `end`.
 *   NEW2-M2  (a) Clips are counted against `answer` windows only now - a supersede window still
 *           has to be scored or CODING (an unresolved or never-raced supersede window still
 *           FAILs exactly as before), it just no longer inflates the denominator a `--clips`
 *           count (which only ever counted played CLIPS, not answers) is compared against.
 *           (b) A pre-token redirect - WhatToAnswerLLM.ts's primary model failing before its
 *           first token, caught and retried on a fallback model (WhatToAnswerLLM.ts:74) - used
 *           to read as overlap: off mode logs two "verbal stall race: trying" lines for one
 *           answer, forced/default mode logs two "front=" lines for one answer. Both are now
 *           recognised as ONE answer, scored on the first stall-race line (off) or the last
 *           won-by line (forced/default), specifically when a
 *           "[WhatToAnswerLLM] verbal primary failed before first token" line sits between the
 *           two - never as a blanket allowance for 2 of either line.
 *
 * (Fix round 1's C1-C5/I1-I4/M1-M7 and fix round 2's NEW-C1/I1/M4/M5/M8 are unchanged apart from
 * the above; see the file history / task-7-report.md for those rounds' reasoning.)
 *
 * Log line shapes this depends on (electron/main.ts, electron/LLMHelper.ts,
 * electron/llm/verbalHedge.ts, electron/llm/WhatToAnswerLLM.ts, electron/IntelligenceEngine.ts -
 * read in full for h40c task 7 and its two review rounds, 2026-09-26):
 *   natively_debug.log   "<ISO> [LOG|WARN|ERROR|CRITICAL] <message>", one line per console
 *                         call (main.ts's console.log/warn/error override, logToFile) or per
 *                         direct logToFile call (the uncaughtException/unhandledRejection
 *                         handlers, which log at [CRITICAL] and do not go through console).
 *   verbal-diag.log      "[<ISO>] <message>" (WhatToAnswerLLM.ts diagLog). Shared by every
 *                         segment (append-only) - always pass --until in a long-lived file.
 *   "[Main] verbal hedge: on trigger=<ms>ms" / "[Main] verbal hedge: off"
 *                         startup validation, logged once per process (describeVerbalHedgeAtStartup).
 *   "[Main] <msg> \u2014 refusing to start"     startup refusal on a bad env value, then app.exit(1).
 *   "[Main] Another instance is already running. Exiting this instance."
 *                         NOT a refusal - a second instance hitting the single-instance lock.
 *   "[LLMHelper] verbal hedge: front=<model> back=<model> trigger=<ms>ms"
 *   "[LLMHelper] verbal hedge: back started at <ms>ms reason=<trigger|front-error|front-empty>"
 *   "[LLMHelper] verbal hedge: won by <model> at <ms>ms; other=<aborted|failed|empty|not-started>"
 *   "[LLMHelper] verbal hedge: no answer - front <k>, back <k>"     both legs failed/emptied.
 *   "[LLMHelper] verbal stall race: trying <model> (fallback=<model> after <ms>ms)"
 *                         the OLD (non-hedge) race - must be what fires in `off` mode.
 *   "[LLMHelper] <model> stalled after <ms>ms \u2014 falling back to <model>"
 *   "[LLMHelper] Warming up <model> (verbal cold-start prevention)..."
 *   "[LLMHelper] <model> usage: thinking=... thoughts=... out=... in=..."
 *                         logged on EVERY streamed chunk that carries usage metadata (M1) -
 *                         not only the last one.
 *   "[Main] answer source: <label>"
 *                         one per __model_source__ sentinel the stream yields - the head
 *                         label (named before any request, e.g. the shipped primary) fires
 *                         first; the hedge's own sentinel ("<model> (hedge)") re-announces
 *                         the real winner once known. The LAST line per answer is the one
 *                         the renderer actually showed.
 *   "[Main] dispatch: answer ..." / "[Main] dispatch: supersede ... replaces=..."
 *                         a supersede starts a NEW race (I2) - both split a window.
 *   "route: <name>"       verbal-diag.log only; CODING route never hedges by design - a name
 *                         starting "CODING" exempts a 0-front/0-stall-race window (NEW-C1).
 *   "REFUSE exited code=<c> after <ms>ms" / "REFUSE STILL RUNNING after <ms>ms"
 *                         refuse-probe.mjs's own outcome line, appended to the segment log
 *                         directly (fs.appendFileSync) - read from --segment-log, not from
 *                         natively_debug.log.
 *
 * Usage:
 *   node check-smoke-hedge.mjs <forced|default|off|refuse> <since-iso> --debug-log PATH
 *       [--diag-log PATH] --clips N [--extra-log PATH] [--segment-log PATH] [--until ISO]
 *       [--no-startup-line]
 *   (--diag-log and --clips are required for forced/default/off; refuse mode ignores both.)
 *
 * <since-iso> is the segment's own start instant (the ISO line launch-smoke-hedge.cmd writes
 * as the SECOND line of each segment log, after its "=== HEDGE SMOKE n ===" header) - only
 * lines timestamped at or after it are read.
 *
 * --debug-log is REQUIRED: the segment's own natively_debug.log COPY (C1/M7) - never the live
 * file, which the next app start resets. --extra-log is optional (the segment's app-start.log
 * copy, or refuse mode's child.log) and is scanned unstructured for a crash that never reached
 * the app's own logger (C5/NEW-M4). --segment-log is required for `refuse` mode.
 * --no-startup-line is for calibration ONLY, against a log that predates the startup line
 * (h40b): the startup-line requirement is downgraded from a FAIL to an informational note
 * instead of failing the whole run on a gap the log could never have had.
 *
 * Exit codes: 0 PASS, 1 FAIL, 2 usage/argument error, 3 INCONCLUSIVE (the clip count was not
 * fully accounted for by scored + CODING windows, with no FAIL found).
 */
import fs from 'fs';

const MODES = ['forced', 'default', 'off', 'refuse'];
// electron/llm/verbalHedge.ts DEFAULT_HEDGE_TRIGGER_MS - the trigger `default` mode expects
// when NATIVELY_VERBAL_HEDGE_TRIGGER_MS is left unset.
const DEFAULT_TRIGGER_MS = 5000;
const WINDOW_MS = 60_000; // how far past a dispatch this reads for that answer's own lines
const BACK_MODEL = 'gemini-3.1-flash-lite';  // LLMHelper.ts BACK (GEMINI_FLASH_MODEL) - also
// the model `off` mode's stall race must name (M3): it is the user's default selected model.

function usageAndExit(code) {
    console.error('usage: node check-smoke-hedge.mjs <forced|default|off|refuse> <since-iso> '
        + '--debug-log PATH [--diag-log PATH] --clips N [--extra-log PATH] [--segment-log PATH] '
        + '[--until ISO] [--no-startup-line]  (--diag-log/--clips required except in refuse mode)');
    process.exit(code);
}

function parseArgs(argv) {
    const out = { flags: {}, pos: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--no-startup-line') { out.flags.noStartupLine = true; }
        else if (a === '--debug-log') { out.debugLog = argv[++i]; }
        else if (a === '--diag-log') { out.diagLog = argv[++i]; }
        else if (a === '--extra-log') { out.extraLog = argv[++i]; }
        else if (a === '--segment-log') { out.segmentLog = argv[++i]; }
        else if (a === '--until') { out.until = argv[++i]; }
        else if (a === '--clips') { out.clips = Number(argv[++i]); }
        else if (a === '--help' || a === '-h') { usageAndExit(0); }
        else { out.pos.push(a); }
    }
    return out;
}

const args = parseArgs(process.argv.slice(2));
const mode = args.pos[0];
const since = args.pos[1];
if (!MODES.includes(mode)) usageAndExit(2);
const sinceMs = Date.parse(since ?? '');
if (!Number.isFinite(sinceMs)) { console.error(`bad since-iso: ${since}`); usageAndExit(2); }
if (!args.debugLog) { console.error('--debug-log is required (C1/M7: point it at the segment\'s own natively_debug.log copy, not the live file)'); usageAndExit(2); }
if (mode !== 'refuse') {
    // NEW-I1: route detection (rule (c)) needs the diag log, and PASS needs a clip count -
    // both used to be silently skippable.
    if (!args.diagLog) { console.error('--diag-log is required (NEW-I1) for forced/default/off mode'); usageAndExit(2); }
    if (!Number.isFinite(args.clips)) { console.error('--clips is required (NEW-C1/I1) for forced/default/off mode'); usageAndExit(2); }
}
let untilMs = Infinity;
if (args.until) {
    untilMs = Date.parse(args.until);
    if (!Number.isFinite(untilMs)) { console.error(`bad --until: ${args.until}`); usageAndExit(2); }
}
if (mode === 'refuse' && !args.segmentLog) { console.error('--segment-log is required for refuse mode'); usageAndExit(2); }

const debugLogPath = args.debugLog;
const diagLogPath = args.diagLog;

// natively_debug.log: "<ISO> [LOG|WARN|ERROR|CRITICAL] <rest>" (main.ts logToFile).
const DEBUG_LINE = /^(\S+) \[(LOG|WARN|ERROR|CRITICAL)\] (.*)$/;
// verbal-diag.log: "[<ISO>] <rest>" (WhatToAnswerLLM.ts diagLog).
const DIAG_LINE = /^\[(\S+)\] (.*)$/;

function readTextOrNull(p) {
    try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function parseDebugLines(p, sinceMs, untilMs) {
    const text = readTextOrNull(p);
    if (text === null) { console.error(`cannot read debug log: ${p}`); process.exit(2); }
    const out = [];
    for (const line of text.split('\n')) {
        const m = line.match(DEBUG_LINE);
        if (!m) continue;
        const at = Date.parse(m[1]);
        if (!Number.isFinite(at) || at < sinceMs || at > untilMs) continue;
        out.push({ at, level: m[2], text: m[3], raw: line });
    }
    return out;
}

function parseDiagLines(p, sinceMs, untilMs) {
    const text = readTextOrNull(p);
    if (text === null) return []; // optional for refuse mode - unused there
    const out = [];
    for (const line of text.split('\n')) {
        const m = line.match(DIAG_LINE);
        if (!m) continue;
        const at = Date.parse(m[1]);
        if (!Number.isFinite(at) || at < sinceMs || at > untilMs) continue;
        out.push({ at, text: m[2], raw: line });
    }
    return out;
}

const DISPATCH = /^\[Main\] dispatch: (answer|supersede) /;
const STARTUP_ON = /^\[Main\] verbal hedge: on trigger=(\d+)ms$/;
const STARTUP_OFF = /^\[Main\] verbal hedge: off$/;
const REFUSE_LINE = /^\[Main\] (.*NATIVELY_VERBAL_HEDGE.*) \u2014 refusing to start$/;
const HEDGE_FRONT = /^\[LLMHelper\] verbal hedge: front=(\S+) back=(\S+) trigger=(\d+)ms$/;
const HEDGE_BACK = /^\[LLMHelper\] verbal hedge: back started at (\d+)ms reason=(\S+)$/;
const HEDGE_WON = /^\[LLMHelper\] verbal hedge: won by (\S+) at (\d+)ms; other=(\S+)$/;
// NEW-C1 rule (a): both legs failed or ended empty - a definite FAIL, never ambiguous.
const HEDGE_NOANSWER = /^\[LLMHelper\] verbal hedge: no answer/;
// C2: anchored to the per-answer LLMHelper lines only - the startup line
// "[Main] verbal hedge: on/off" must never trip this.
const HEDGE_ANY = /^\[LLMHelper\] verbal hedge:/;
const STALL_RACE = /^\[LLMHelper\] verbal stall race: trying (\S+)/;
const STALLED = /^\[LLMHelper\] (\S+) stalled after \d+ms/;
// NEW2-M2(b): WhatToAnswerLLM.ts:74 - the primary model failed before producing a first token
// and the call was retried on a fallback model. Verified against the real source, not assumed:
// `console.warn(\`[WhatToAnswerLLM] verbal primary failed before first token (${msg}) \u2014 redirecting to ${model}\`)`.
// Anchored on the fixed prefix only - msg/model vary.
const REDIRECT_LINE = /^\[WhatToAnswerLLM\] verbal primary failed before first token/;
const WARMUP = /^\[LLMHelper\] Warming up (\S+)/;
const ANSWER_SOURCE = /^\[Main\] answer source: (.+)$/;
const USAGE = /^\[LLMHelper\] (\S+) usage:/;
// NEW-M4: debug-log crash lines are CRITICAL-level and start with one of these two phrases
// (main.ts:14-19) - checked against `level` separately, not folded into this regex.
const CRASH_DEBUG = /^(Unhandled Rejection|Uncaught Exception)/;
// NEW-M4: extra-log (unstructured child stdio) crash shapes, anchored at the START of a line -
// a loose, unanchored, case-insensitive match used to fire on ANSWER TEXT that happened to say
// "uncaught exception" in conversation (rv8\answertext).
const CRASH_EXTRA = /^(UnhandledPromiseRejectionWarning|Uncaught Exception:|A JavaScript error occurred in the main process)/;
const FIRST_TOKEN = /^first token (\d+)ms$/;
const ROUTE = /^route: (.+)$/;
const REFUSE_EXIT = /^REFUSE exited code=(-?\d+) after (\d+)ms$/m;
const REFUSE_HANG = /^REFUSE STILL RUNNING after (\d+)ms$/m;

/** I2: split on EITHER a dispatch or a supersede - a supersede starts a brand new race. */
function answerWindows(debugLines) {
    const dispatches = debugLines.filter((l) => DISPATCH.test(l.text))
        .map((l) => ({ ...l, kind: l.text.match(DISPATCH)[1] }));
    return dispatches.map((d, i) => {
        const next = dispatches[i + 1];
        const end = Math.min(d.at + WINDOW_MS, next ? next.at : Infinity);
        return { at: d.at, end, kind: d.kind, lines: debugLines.filter((l) => l.at >= d.at && l.at < end) };
    });
}

// NEW2-M1: bounded by the window's own `end`, not a flat dispatch+60s - a window whose real end
// is sooner (the next dispatch arrived first) must never borrow a route line that actually
// belongs to that next window, including a false CODING exemption.
function routeFor(diagLines, win) {
    const hit = diagLines.filter((d) => d.at >= win.at && d.at < win.end && ROUTE.test(d.text))[0];
    return hit ? hit.text.match(ROUTE)[1] : null;
}

// NEW2-M2(b): true when a WhatToAnswerLLM pre-token redirect line sits strictly between two
// timestamps in this window - the signature of ONE answer that got retried, not two overlapping
// ones.
function hasRedirectBetween(win, afterAt, beforeAt) {
    return win.lines.some((l) => l.at > afterAt && l.at < beforeAt && REDIRECT_LINE.test(l.text));
}

function nearestFirstToken(diagLines, at) {
    // The diag line closest AFTER the dispatch, within the same 60s window.
    const hit = diagLines.filter((d) => d.at >= at && d.at < at + WINDOW_MS && FIRST_TOKEN.test(d.text))[0];
    return hit ? hit.text.match(FIRST_TOKEN)[1] + 'ms' : null;
}

/** CODING routes never hedge by design (LLMHelper.ts's isCoding branch) - the only route name
 *  that exempts a 0-front/0-stall-race window from FAIL. An unknown route (no diag line found)
 *  is explicitly NOT exempt (rule (c): "is not CODING or is unknown"). */
function isCodingRoute(route) {
    return typeof route === 'string' && route.startsWith('CODING');
}

function lastAnswerSourceLabel(win) {
    const sourceLines = win.lines.filter((l) => ANSWER_SOURCE.test(l.text));
    if (sourceLines.length === 0) return { count: 0, label: null };
    const m = sourceLines[sourceLines.length - 1].text.match(ANSWER_SOURCE);
    return { count: sourceLines.length, label: m[1] };
}

/**
 * NEW-C1: classify every window in the segment together (not one at a time) - "a later/earlier
 * window holds a surplus" needs the whole set. Returns one verdict per window:
 *   'scored'   exactly the lines one clean race produces - goes on to the detailed rule checks.
 *   'coding'   0 front/stall-race lines, but the route is confirmed CODING - exempt by design,
 *              counted toward the clip total but never rule-checked.
 *   'ambiguous' genuine evidence of overlap (2+ lines) or a shortfall a neighbour's surplus
 *              explains - reported, counted toward neither scored nor fail.
 *   'fail'     a definite violation (rules (a)/(b)/(c)) - counted as a hard FAIL immediately.
 */
function classifySegment(windows, diagAll, mode) {
    const info = windows.map((win) => ({
        win,
        frontLines: win.lines.filter((l) => HEDGE_FRONT.test(l.text)),
        wonLines: win.lines.filter((l) => HEDGE_WON.test(l.text)),
        stallLines: win.lines.filter((l) => STALL_RACE.test(l.text)),
        noAnswerLines: win.lines.filter((l) => HEDGE_NOANSWER.test(l.text)),
        route: routeFor(diagAll, win),
    }));

    return info.map((cur, i) => {
        const tag = `${new Date(cur.win.at).toISOString()} [${cur.win.kind}]${cur.route ? ` route=${cur.route}` : ''}`;
        if (mode === 'off') {
            const n = cur.stallLines.length;
            if (n === 1) return { verdict: 'scored', tag, route: cur.route, stallLine: cur.stallLines[0] };
            // NEW2-M2(b): 2 stall-race lines are one retried answer, not overlap, specifically
            // when a pre-token redirect line sits between them.
            if (n === 2 && hasRedirectBetween(cur.win, cur.stallLines[0].at, cur.stallLines[1].at)) {
                return { verdict: 'scored', tag, route: cur.route, stallLine: cur.stallLines[0] };
            }
            if (n >= 2) return { verdict: 'ambiguous', tag, reason: `${n} "verbal stall race: trying" line(s) (overlap)` };
            if (isCodingRoute(cur.route)) return { verdict: 'coding', tag, route: cur.route };
            const earlierSurplus = info.slice(0, i).some((o) => o.stallLines.length >= 2);
            if (earlierSurplus) return { verdict: 'ambiguous', tag, reason: '0 "verbal stall race: trying" lines, explained by an earlier window\'s surplus' };
            return { verdict: 'fail', tag, reason: `no "verbal stall race: trying" line (route=${cur.route ?? 'unknown'}) - this answer never raced` };
        }
        // forced / default
        if (cur.noAnswerLines.length > 0) {
            return { verdict: 'fail', tag, reason: `"${cur.noAnswerLines[0].text}" - both legs failed or ended empty` };
        }
        const f = cur.frontLines.length, w = cur.wonLines.length;
        // NEW2-M2(b): 2 "front=" lines are one retried answer, not overlap, specifically when a
        // pre-token redirect line sits between them - scored on the LAST front/won-by line (the
        // retry that actually raced and resolved), never a blanket allowance for 2 of either.
        if (f === 2 && w === 1 && hasRedirectBetween(cur.win, cur.frontLines[0].at, cur.frontLines[1].at)) {
            return { verdict: 'scored', tag, route: cur.route, frontLine: cur.frontLines[1], wonLine: cur.wonLines[0] };
        }
        if (f >= 2 || w >= 2) {
            return { verdict: 'ambiguous', tag, reason: `${f} "front=" line(s), ${w} "won by" line(s) (overlap)` };
        }
        if (f === 1 && w === 0) {
            const laterSurplus = info.slice(i + 1).some((o) => o.wonLines.length >= 2);
            if (laterSurplus) return { verdict: 'ambiguous', tag, reason: '1 "front=" line, 0 "won by" lines, explained by a later window\'s surplus won-by' };
            return { verdict: 'fail', tag, reason: 'no "won by" line and no later window holds a surplus won-by - the race never resolved' };
        }
        if (f === 0) {
            if (isCodingRoute(cur.route)) return { verdict: 'coding', tag, route: cur.route };
            const earlierSurplus = info.slice(0, i).some((o) => o.frontLines.length >= 2);
            if (earlierSurplus) return { verdict: 'ambiguous', tag, reason: '0 "front=" lines, explained by an earlier window\'s surplus front' };
            return { verdict: 'fail', tag, reason: `no "front=" line (route=${cur.route ?? 'unknown'}, not confirmed CODING) - this answer never raced` };
        }
        // f === 1 && w === 1: exactly what a single clean race produces.
        return { verdict: 'scored', tag, route: cur.route, frontLine: cur.frontLines[0], wonLine: cur.wonLines[0] };
    });
}

function checkForced(win, cls) {
    const problems = [];
    const [, front, back] = cls.frontLine.text.match(HEDGE_FRONT);
    const backLine = win.lines.find((l) => HEDGE_BACK.test(l.text));
    if (!backLine) {
        problems.push('no "back started" line (want reason=trigger at <=100ms)');
    } else {
        const [, ms, reason] = backLine.text.match(HEDGE_BACK);
        if (reason !== 'trigger') problems.push(`back started reason=${reason}, want reason=trigger`);
        if (Number(ms) > 100) problems.push(`back started at ${ms}ms, want <=100ms`);
    }
    const [, winnerModel, , other] = cls.wonLine.text.match(HEDGE_WON);
    // M2/M3: reworded per review - LLMHelper.ts labels a loser that settled empty before the
    // winner's first token this way too (the same-tick case), so it is rare, not impossible.
    if (other !== 'aborted' && other !== 'failed') problems.push(`other=${other} (rare; investigate) - want aborted or failed, since a forced race always starts both legs`);
    const { count: sourceCount, label } = lastAnswerSourceLabel(win);
    if (sourceCount === 0) problems.push('no "answer source:" line');
    else if (label !== `${winnerModel} (hedge)`) problems.push(`last answer-source label "${label}" != "${winnerModel} (hedge)"`);
    const loserModel = winnerModel === front ? back : winnerModel === back ? front : null;
    if (loserModel) {
        // M1: usage is logged on EVERY streamed chunk, not only the last one - a loser that
        // produced a chunk BEFORE it was told to abort is normal (it was still pending when
        // the winner's first token arrived); only a chunk timestamped AFTER the won-by line
        // is a real violation (the abort did not actually stop it).
        const wonAt = cls.wonLine.at;
        const loserUsageAfter = win.lines.some((l) => {
            if (l.at <= wonAt) return false;
            const m = l.text.match(USAGE);
            return m && m[1] === loserModel;
        });
        if (loserUsageAfter) problems.push(`loser ${loserModel} logged a usage line AFTER the won-by line (at ${new Date(wonAt).toISOString()}) - it should have been aborted before producing another chunk`);
    }
    return { problems, sourceCount, winnerModel };
}

function checkDefault(win, cls) {
    const problems = [];
    const [, winnerModel] = cls.wonLine.text.match(HEDGE_WON);
    const backLine = win.lines.find((l) => HEDGE_BACK.test(l.text));
    const { count: sourceCount, label } = lastAnswerSourceLabel(win);
    if (sourceCount === 0) problems.push('no "answer source:" line');
    else if (label !== `${winnerModel} (hedge)`) problems.push(`last answer-source label "${label}" != "${winnerModel} (hedge)"`);
    return { problems, backFired: !!backLine, backReason: backLine ? backLine.text.match(HEDGE_BACK)[2] : null, sourceCount, winnerModel };
}

function checkOffWindow(win, cls) {
    const problems = [];
    const model = cls.stallLine.text.match(STALL_RACE)[1];
    // M3: the brief's own expectation is this exact model (the user's default selection);
    // STALL_RACE captured it but nothing compared it until this fix.
    if (model !== BACK_MODEL) problems.push(`stall race tried ${model}, want ${BACK_MODEL}`);
    const hedgeLabelled = win.lines.some((l) => { const m = l.text.match(ANSWER_SOURCE); return m && / \(hedge\)$/.test(m[1]); });
    if (hedgeLabelled) problems.push('an "answer source:" label carries "(hedge)" with the flag unset');
    return { problems, model };
}

/** C3/C4 fix: reads refuse-probe.mjs's own outcome line and the debug-log copy directly -
 *  no more inferring a clean exit from app:stop's "killed 0" (which a hang, force-killed by
 *  app:stop, also produces). */
function checkRefuse(debugAll, segmentLogPath) {
    const problems = [];
    const idx = debugAll.findIndex((l) => REFUSE_LINE.test(l.text));
    if (idx === -1) {
        problems.push('no "<message> \u2014 refusing to start" line naming NATIVELY_VERBAL_HEDGE found at or after since');
    } else {
        const after = debugAll.slice(idx + 1);
        if (after.length > 0) problems.push(`natively_debug.log has ${after.length} line(s) after the refusal line (a process that exited did nothing else) - first: "${after[0].raw}"`);
    }
    const segText = readTextOrNull(segmentLogPath);
    if (segText === null) {
        problems.push(`cannot read segment log: ${segmentLogPath}`);
        return problems;
    }
    const hang = segText.match(REFUSE_HANG);
    const exited = segText.match(REFUSE_EXIT);
    if (hang) {
        problems.push(`refuse-probe.mjs reported STILL RUNNING after ${hang[1]}ms - the app did not exit on its own`);
    } else if (!exited) {
        problems.push('segment log has neither "REFUSE exited code=" nor "REFUSE STILL RUNNING" - refuse-probe.mjs may not have run to completion');
    } else if (exited[1] !== '1') {
        problems.push(`REFUSE exited code=${exited[1]}, want code=1`);
    }
    return problems;
}

function checkStartupLine(debugLines, mode, flags) {
    if (mode === 'refuse') return { problems: [], infos: [] };
    const line = debugLines.find((l) => STARTUP_ON.test(l.text) || STARTUP_OFF.test(l.text));
    const want = mode === 'off' ? '[Main] verbal hedge: off' : `[Main] verbal hedge: on trigger=${mode === 'forced' ? '1' : DEFAULT_TRIGGER_MS}ms`;
    if (!line) {
        if (flags.noStartupLine) return { problems: [], infos: ['startup line absent (pre-dates the build)'] };
        return { problems: [`no startup line found, want "${want}"`], infos: [] };
    }
    if (line.text !== want) return { problems: [`startup line was "${line.text}", want "${want}"`], infos: [] };
    return { problems: [], infos: [] };
}

/** NEW-M4: debug-log crash lines are matched only at CRITICAL level, anchored at the start of
 *  the message (not a loose case-insensitive substring, which used to fire on answer text that
 *  happened to mention "uncaught exception" in conversation - rv8\answertext). The extra log
 *  (unstructured child stdio) is anchored on three specific crash shapes instead. */
function checkUnhandled(debugLines, extraLogPath) {
    const problems = [];
    const hit = debugLines.find((l) => l.level === 'CRITICAL' && CRASH_DEBUG.test(l.text));
    if (hit) problems.push(`unhandled-rejection/uncaught-exception text found in the debug log: ${hit.raw}`);
    if (extraLogPath) {
        const text = readTextOrNull(extraLogPath);
        if (text === null) {
            problems.push(`cannot read --extra-log: ${extraLogPath}`);
        } else {
            const extraHit = text.split('\n').find((l) => CRASH_EXTRA.test(l));
            if (extraHit) problems.push(`unhandled-rejection/uncaught-exception text found in --extra-log (${extraLogPath}): ${extraHit.trim()}`);
        }
    }
    return problems;
}

/** M4: per-model request counts from the lines that fire once per REQUEST, not once per
 *  CHUNK (usage lines overcount by about 5x - LLMHelper.ts logs usage on every streamed
 *  chunk that carries usage metadata). FRONT/BACK are constants in the current build
 *  (streamGeminiWithHedge), so "back started" - which does not itself name a model - is
 *  attributed to whichever model the front= line(s) name as back=. */
function requestCounts(debugLines) {
    const counts = {};
    const bump = (model, key) => { (counts[model] ??= { warmup: 0, front: 0, backStarted: 0, stallRace: 0, stalled: 0 })[key] += 1; };
    let backModel = null;
    for (const l of debugLines) {
        let m;
        if ((m = l.text.match(WARMUP))) bump(m[1], 'warmup');
        else if ((m = l.text.match(HEDGE_FRONT))) { bump(m[1], 'front'); backModel = m[2]; }
        else if (HEDGE_BACK.test(l.text) && backModel) bump(backModel, 'backStarted');
        else if ((m = l.text.match(STALL_RACE))) bump(m[1], 'stallRace');
        else if ((m = l.text.match(STALLED))) bump(m[1], 'stalled');
    }
    return counts;
}

/** NEW-M5: off mode's "no hedge line anywhere" check, global across the segment - unaffected
 *  by whether any dispatch window exists at all (a segment with a stray hedge line but zero
 *  dispatches must still FAIL, not read INCONCLUSIVE from the empty-windows branch). Called
 *  once, before the window-count decision. */
function globalOffHedgeCheck(debugAll) {
    const hit = debugAll.find((l) => HEDGE_ANY.test(l.text));
    return hit ? [`found a "${hit.text}" line with the flag unset (anywhere in the segment, not just inside an answer window)`] : [];
}

function main() {
    const debugAll = parseDebugLines(debugLogPath, sinceMs, untilMs);
    const diagAll = parseDiagLines(diagLogPath, sinceMs, untilMs);

    console.log(`check-smoke-hedge  mode=${mode}  since=${since}${args.until ? `  until=${args.until}` : ''}`);
    console.log(`debug-log=${debugLogPath} (${debugAll.length} lines in window)  diag-log=${diagLogPath} (${diagAll.length} lines in window)`);
    if (args.extraLog) console.log(`extra-log=${args.extraLog}`);
    if (args.segmentLog) console.log(`segment-log=${args.segmentLog}`);
    if (Number.isFinite(args.clips)) console.log(`clips=${args.clips}`);

    const sections = [];
    const record = (name, verdict, problems, infos = []) => sections.push({ name, verdict, problems, infos });

    const { problems: startupProblems, infos: startupInfos } = checkStartupLine(debugAll, mode, args.flags);
    record('startup line', startupProblems.length === 0 ? 'PASS' : 'FAIL', startupProblems, startupInfos);
    const unhandledProblems = checkUnhandled(debugAll, args.extraLog);
    record('no unhandled rejection / uncaught exception', unhandledProblems.length === 0 ? 'PASS' : 'FAIL', unhandledProblems);

    if (mode === 'refuse') {
        const problems = checkRefuse(debugAll, args.segmentLog);
        record('startup refusal', problems.length === 0 ? 'PASS' : 'FAIL', problems);
    } else {
        // NEW-M5: the global check runs unconditionally, before deciding whether there are any
        // dispatch windows at all.
        const globalProblems = mode === 'off' ? globalOffHedgeCheck(debugAll) : [];

        const windows = answerWindows(debugAll);
        console.log(`\nwindows found: ${windows.length} (clips played: ${args.clips})`);
        if (windows.length === 0) {
            const verdict = globalProblems.length > 0 ? 'FAIL' : 'INCONCLUSIVE';
            const infos = globalProblems.length > 0 ? [] : [`no "dispatch: answer" or "dispatch: supersede" lines found at or after ${since} - nothing to score`];
            record(`${mode}-mode per-answer rules`, verdict, globalProblems, infos);
        } else {
            const classified = classifySegment(windows, diagAll, mode);
            const allProblems = [...globalProblems];
            const allInfos = [];
            let scoredCount = 0, codingCount = 0;
            // NEW2-M2(a): clips are played CLIPS, not answers - a supersede answers the SAME
            // clip again, so it must still be scored or CODING (an unresolved/never-raced
            // supersede window still FAILs via classifySegment, same as any answer window) but
            // must not inflate the count `--clips` is compared against.
            let answerScoredCount = 0, answerCodingCount = 0;
            let backFiredCount = 0;
            console.log('\nper-window:');
            for (let i = 0; i < windows.length; i++) {
                const win = windows[i];
                const cls = classified[i];
                if (cls.verdict === 'ambiguous') {
                    console.log(`  ${cls.tag}  AMBIGUOUS - ${cls.reason}`);
                    allInfos.push(`${cls.tag}: AMBIGUOUS - ${cls.reason}`);
                    continue;
                }
                if (cls.verdict === 'fail') {
                    console.log(`  ${cls.tag}  FAIL - ${cls.reason}`);
                    allProblems.push(`${cls.tag}: ${cls.reason}`);
                    continue;
                }
                if (cls.verdict === 'coding') {
                    console.log(`  ${cls.tag}  CODING route - exempt, not scored`);
                    codingCount += 1;
                    if (win.kind === 'answer') answerCodingCount += 1;
                    continue;
                }
                // 'scored'
                scoredCount += 1;
                if (win.kind === 'answer') answerScoredCount += 1;
                if (mode === 'forced') {
                    const { problems, sourceCount, winnerModel } = checkForced(win, cls);
                    const ft = nearestFirstToken(diagAll, win.at);
                    console.log(`  ${cls.tag}  winner=${winnerModel}  answer-source lines=${sourceCount}  first-token=${ft ?? 'n/a'}  ${problems.length === 0 ? 'ok' : `${problems.length} problem(s)`}`);
                    for (const p of problems) allProblems.push(`${cls.tag}: ${p}`);
                } else if (mode === 'default') {
                    const { problems, backFired, backReason, sourceCount, winnerModel } = checkDefault(win, cls);
                    if (backFired) backFiredCount += 1;
                    const ft = nearestFirstToken(diagAll, win.at);
                    console.log(`  ${cls.tag}  winner=${winnerModel}  answer-source lines=${sourceCount}  back-fired=${backFired}${backReason ? ` (${backReason})` : ''}  first-token=${ft ?? 'n/a'}  ${problems.length === 0 ? 'ok' : `${problems.length} problem(s)`}`);
                    for (const p of problems) allProblems.push(`${cls.tag}: ${p}`);
                } else if (mode === 'off') {
                    const { problems, model } = checkOffWindow(win, cls);
                    console.log(`  ${cls.tag}  stall-race model=${model}  ${problems.length === 0 ? 'ok' : `${problems.length} problem(s)`}`);
                    for (const p of problems) allProblems.push(`${cls.tag}: ${p}`);
                }
            }
            if (mode === 'default') allInfos.push(`back leg fired on ${backFiredCount}/${scoredCount} scored answers (0 expected on a healthy evening; a real stall is reported here, not a failure)`);

            // NEW-C1/NEW2-M2(a): PASS needs every played CLIP accounted for by a scored or
            // CODING ANSWER window (supersede windows are not clips of their own - they still
            // have to be scored/CODING, they just do not count against this total), on top of
            // zero FAILs - partial accounting (ambiguity ate some of the clips) is INCONCLUSIVE,
            // not a free pass.
            const accountedFor = answerScoredCount + answerCodingCount;
            allInfos.push(`accounted for: ${accountedFor} (scored=${answerScoredCount} coding=${answerCodingCount}) of ${args.clips} clips played`
                + (scoredCount !== answerScoredCount || codingCount !== answerCodingCount
                    ? ` [${scoredCount - answerScoredCount} scored + ${codingCount - answerCodingCount} coding from supersede windows, not counted here]`
                    : ''));
            let verdict;
            if (allProblems.length > 0) verdict = 'FAIL';
            // NEW2-M1: a segment that never scored a single window - every answer took the
            // CODING route, which never hedges by design - proves nothing about the hedge and
            // must not read as a free PASS just because every clip was "accounted for" by CODING.
            else if (scoredCount === 0) verdict = 'INCONCLUSIVE';
            else if (accountedFor !== args.clips) verdict = 'INCONCLUSIVE';
            else verdict = 'PASS';
            record(`${mode}-mode per-answer rules`, verdict, allProblems, allInfos);
        }

        // M4: per-model request-count summary (diagnostic only, not a pass/fail gate).
        const counts = requestCounts(debugAll);
        console.log('\nrequest counts (warm-up/front/back-started/stall-race/stalled - NOT usage lines, which overcount ~5x):');
        for (const [model, c] of Object.entries(counts)) {
            console.log(`  ${model}: warmup=${c.warmup} front=${c.front} backStarted=${c.backStarted} stallRace=${c.stallRace} stalled=${c.stalled}`);
        }
    }

    // FAIL beats INCONCLUSIVE beats PASS.
    const rank = { FAIL: 2, INCONCLUSIVE: 1, PASS: 0 };
    let overall = 'PASS';
    console.log('');
    for (const s of sections) {
        if (rank[s.verdict] > rank[overall]) overall = s.verdict;
        console.log(`[${s.verdict}] ${s.name}`);
        for (const p of s.problems) console.log(`  - ${p}`);
        for (const i of s.infos) console.log(`  (info) ${i}`);
    }
    console.log(`\n${overall} overall (mode=${mode})`);
    const exitCode = overall === 'PASS' ? 0 : overall === 'FAIL' ? 1 : 3;
    process.exit(exitCode);
}

main();
