// The app's routing classification of ONE item's Live output, offline (spec 1.3 "Classification = the app's rules"). PURE: no clock, no I/O.
// Time base: milliseconds from Q = the end of the clip (the app's Q is the later VAD speech end, so this deadline is the stricter side).
// The words are read with the BUILT dist's completeFirstWord / isHardWord / isCleanHard / checkCompleted (injected as `R`, so a test can supply the same functions or a broken copy).
//
//   events: [{ t, kind: 'outputTx', text } | { t, kind: 'generationComplete' | 'turnComplete' | 'interrupted' | 'close' }]  in arrival order, t relative to Q (may be negative)
//   Turns follow LiveRouterSession: text opens a turn; generationComplete marks it ENDED but later text still appends to it; turnComplete / interrupted / close end it and close it.
//   The DECIDER is the first turn that yields a complete first word (arbiter item 6: firstWordAt is set when completeFirstWord(text, ended) first becomes non-null).
import { DEADLINE_MS } from './common.mjs';

export const CLOSING = ['turnComplete', 'interrupted', 'close'];

/** Turns with a snapshot (t, text so far, ended) after every event that touched them. */
export function turnsOf(events) {
    const turns = []; let cur = null;
    const snap = (t) => cur.snaps.push({ t, text: cur.text, ended: cur.ended });
    for (const e of events) {
        if (e.kind === 'outputTx') { if (!cur) { cur = { text: '', ended: false, snaps: [] }; turns.push(cur); } cur.text += e.text; snap(e.t); }
        else if (e.kind === 'generationComplete') { if (cur) { cur.ended = true; snap(e.t); } }
        else if (CLOSING.includes(e.kind)) { if (cur) { cur.ended = true; snap(e.t); cur = null; } }
    }
    return turns;
}

/** { fw, fwAt, textAtFw, endedAtFw, decider } of the first complete first word, or null. */
export function firstWordOf(events, R) {
    for (const turn of turnsOf(events)) for (const s of turn.snaps) {
        const fw = R.completeFirstWord(s.text, s.ended);
        if (fw !== null) return { fw, fwAt: s.t, textAtFw: s.text, endedAtFw: s.ended, decider: turn };
    }
    return null;
}

/**
 * cls: NONE (no complete first word) | LATE (first word after Q + deadline; the app answers from the pipeline) | HARD (clean or garbled `hard`) | EASY (any other first word, on time).
 * garbled: the first word normalises to `hard` (isHardWord) but is not exactly `hard` (isCleanHard false).
 * row4: for an on-time EASY, checkCompleted on the text AS IT STOOD at the first word (the arbiter's row 4); a failure means the app would still use the pipeline. Reported, never used by a bar.
 * words: tokens of the decider turn's full text (the answer length of an EASY).
 */
export function classifyItem(events, R, deadline = DEADLINE_MS) {
    const f = firstWordOf(events, R);
    if (!f) return { cls: 'NONE', fw: null, fwAt: null, garbled: false, row4: null, lateRoute: null, words: 0 };
    const hard = R.isHardWord(f.fw), garbled = hard && !R.isCleanHard(f.fw), words = R.tokensOf(f.decider.text).length;
    if (f.fwAt > deadline) return { cls: 'LATE', fw: f.fw, fwAt: f.fwAt, garbled, row4: null, lateRoute: hard ? 'HARD' : 'EASY', words };
    if (hard) return { cls: 'HARD', fw: f.fw, fwAt: f.fwAt, garbled, row4: null, lateRoute: null, words };
    const c = R.checkCompleted(f.textAtFw, false, f.endedAtFw, false);
    return { cls: 'EASY', fw: f.fw, fwAt: f.fwAt, garbled: false, row4: c.ok ? 'ok' : c.reason, lateRoute: null, words };
}

/** Text of the decider turn (for the short-answer opening report only; never printed). '' when none. */
export const deciderText = (events, R) => firstWordOf(events, R)?.decider.text ?? '';

/** { id: classification } for every item of a run file. Items that were not played are NONE with played:false. */
export function classifyRun(run, R, deadline = DEADLINE_MS) {
    const out = {};
    for (const it of run.items) out[it.id] = { ...classifyItem(it.events ?? [], R, deadline), played: it.played !== false };
    return out;
}
