/**
 * The wait between probe() ready and appPass() (live-router plan Task 13, I8).
 *
 * The probe wav is a real interview-shaped clip: the app answers it. An answer still streaming
 * when the hour's first clip plays corrupts that item, so the hour does not start until the
 * probe's own answers are finished. Pure functions over a log slice, so they are unit-tested on
 * synthetic logs; auto() supplies the slice (bytes from the LAST preflight's probe play).
 */

/** The byte offset preflight prints right before it plays the probe wav (`PROBE_LOG_OFFSET <n>`); the LAST one wins, null when absent. */
export function parseProbeOffset(text) {
    const all = [...String(text).matchAll(/PROBE_LOG_OFFSET (\d+)/g)];
    return all.length ? Number(all[all.length - 1][1]) : null;
}

/**
 * Settled iff no dispatched answer is outstanding AND no interviewer turn is open.
 *  - flag on (I8): every `[Router] dispatch turn=N` has its decision line `[Router] turn=N … shown=live|pipeline`.
 *    That line is written only after the pipeline and every paired router turn ended (or the turn closed), so an
 *    `answer end` alone is not enough, and a dup/unpaired line (shown=-) is not the decision.
 *  - flag off: every `[Main] dispatch: answer` has an `[IntelligenceEngine] answer end` after it.
 *  - the last `[Main] turn:` line is `turn: close`.
 * `flagOn` defaults to "the slice has a [Router] dispatch line"; auto() passes it explicitly from the environment.
 */
export function probeSettled(logSinceProbe, { flagOn } = {}) {
    const log = String(logSinceProbe);
    const on = flagOn ?? /\[Router\] dispatch turn=\d+/.test(log);
    let open = 0;
    let what = '';
    let dispatches = 0;
    if (on) {
        const dispatched = new Set([...log.matchAll(/\[Router\] dispatch turn=(\d+)\b/g)].map((m) => m[1]));
        const decided = new Set([...log.matchAll(/\[Router\] turn=(\d+) [^\n]*?\bshown=(?:live|pipeline)\b/g)].map((m) => m[1]));
        const missing = [...dispatched].filter((t) => !decided.has(t));
        dispatches = dispatched.size;
        open = missing.length;
        what = missing.map((t) => `turn=${t}`).join(', ');
    } else {
        let pending = 0;
        // A supersede aborts stream 1 (an `answer end kind=aborted`) and starts stream 2, so it is a dispatch too:
        // counting only `answer` would reach 0 while the replacing stream is still running.
        for (const m of log.matchAll(/\[Main\] dispatch: (?:answer|supersede)\b|\[IntelligenceEngine\] answer end\b/g)) {
            if (m[0].startsWith('[Main]')) { pending++; dispatches++; }
            else if (pending > 0) pending--;
        }
        open = pending;
        what = `${pending} dispatch: answer without an answer end`;
    }
    const turnLines = [...log.matchAll(/\[Main\] turn: (\S+)/g)];
    const last = turnLines.length ? turnLines[turnLines.length - 1][1] : null;
    const turnOpen = last !== null && last !== 'close';
    // Nothing dispatched yet is not settled: the probe's first question may not have reached its gate (review I1).
    if (dispatches === 0) return { settled: false, open: 0, why: 'no dispatch in the log yet' };
    if (open > 0) return { settled: false, open, why: `${on ? 'no decision line for' : 'unfinished:'} ${what}` };
    if (turnOpen) return { settled: false, open, why: `an interviewer turn is open (last [Main] turn: ${last})` };
    return { settled: true, open: 0, why: 'all dispatched answers finished and no turn open' };
}

// The flight-eq probe clip holds two questions with a gap of 1.2 s or more: after question 1 closes, question 2's
// gate line comes ~1.2 s after its speech ends (VAD gate) plus the time for the finals, and the wait starts only
// 1-2 s after the clip. So "settled" must also hold, with no new `[Main] turn:`, gate or dispatch line, for this
// long before it is believed. 6 s is the reviewer's figure (> gate + finals); fails closed at the 120 s cap.
export const PROBE_QUIET_MS = 6000;

/** How many turn, gate and dispatch lines the slice holds: a change means the probe is still being heard or answered. */
const activity = (log) => (String(log).match(/\[Main\] turn: |\[Main\] dispatch: |\[Router\] dispatch turn=/g) ?? []).length;

/**
 * Polls `readLog()` (the log slice from the probe offset) until it has been settled, with no new turn, gate or
 * dispatch line, for `quietMs`. False after `capMs` of waiting (the caller exits 1: the hour is not spent). Time is
 * counted in slept milliseconds, so a fake `sleep` gives a deterministic clock in tests. `log(why)` receives the
 * last reason on a timeout.
 */
export async function waitProbeSettled({ readLog, sleep, capMs = 120000, pollMs = 2000, quietMs = PROBE_QUIET_MS, flagOn, log = () => {} }) {
    let waited = 0, quiet = 0, seen = null;
    for (;;) {
        const text = readLog();
        const r = probeSettled(text, { flagOn });
        const a = activity(text);
        if (r.settled && a === seen) quiet += pollMs; else quiet = 0;
        seen = a;
        if (r.settled && quiet >= quietMs) return true;
        if (waited >= capMs) { log(r.settled ? `settled but not quiet for ${quietMs} ms` : r.why); return false; }
        await sleep(pollMs);
        waited += pollMs;
    }
}
