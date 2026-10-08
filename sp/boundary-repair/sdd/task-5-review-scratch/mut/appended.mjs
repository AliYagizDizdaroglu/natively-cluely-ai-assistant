// interview60.turns-finals.mjs — the interviewer finals of a run log, as the turn tracker saw them
// (interview60.turns-fixture.mjs builds its `finals` from this; interviewerTurn.replay.test.ts feeds
// them to turn.final()).
//
// The `Transcript event` line keeps Deepgram's RAW text (the offline scans parse it), but since the
// boundary repair (deepgramBoundaryRepair.ts, 2026-09-29) the app emits the REPAIRED final; the
// restore is logged on the very next line by the same synchronous handler:
//   [DeepgramStreaming] boundary repair: restored "<words>" before "<first 40 chars of the raw final>"
// so a final directly followed by that line replays as `<words> <raw>`. A repair line anywhere else
// (no final right above it, or under a final its `before` text does not name) refuses: that log is not
// what the app saw. Logs from before the repair hold no such line and parse exactly as they always did.
const FINAL = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/;
const REPAIR = /^\S+ \[LOG\] \[DeepgramStreaming\] boundary repair: restored "((?:[^"\\]|\\.)*)" before "/;
const unq = (s) => JSON.parse(`"${s}"`);
/** @returns {{ at: number, text: string }[]} non-empty finals at or after sinceMs, in log order */
export function finalsFrom(dbg, sinceMs) {
    const lines = dbg.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(FINAL);
        if (!m) {
            if (REPAIR.test(lines[i]) && !FINAL.test(lines[i - 1] ?? '')) throw new Error(`finalsFrom: line ${i + 1} is a boundary repair with no final directly above it`);
            continue;
        }
        const rep = lines[i + 1]?.match(REPAIR);
        if (rep && !lines[i + 1].includes(`before "${m[2].slice(0, 40)}"`)) throw new Error(`finalsFrom: line ${i + 2} is a boundary repair for another final than line ${i + 1}`);
        const text = (rep ? `${unq(m[2])} ${unq(rep[1])}` : unq(m[2])).trim();
        const at = Date.parse(m[1]);
        if (text && at >= sinceMs) out.push({ at, text });
    }
    return out;
}
