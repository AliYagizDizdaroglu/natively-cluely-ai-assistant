// interview60.turns-finals.mjs — the interviewer finals of a run log, as the turn tracker saw them
// (interview60.turns-fixture.mjs builds its `finals` from this; interviewerTurn.replay.test.ts feeds
// them to turn.final()).
const unq = (s) => JSON.parse(`"${s}"`);
/** @returns {{ at: number, text: string }[]} non-empty finals at or after sinceMs, in log order */
export function finalsFrom(dbg, sinceMs) {
    return [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)]
        .map((m) => ({ at: Date.parse(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= sinceMs);
}
