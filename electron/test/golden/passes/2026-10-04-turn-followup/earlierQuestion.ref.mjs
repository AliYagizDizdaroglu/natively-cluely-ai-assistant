// REFERENCE IMPLEMENTATION (pure, no I/O, no model calls) of the turn-based follow-up context block:
// MAIN docs/superpowers/specs/2026-10-03-turn-based-followup-context-design.md sections 3.1-3.6, as pinned by
// PREREGISTER-turn-followup.md section 1. The app implementation must reproduce these functions' outputs byte for
// byte on the same inputs (the parity fixture, build gate c1).
//
// The gate (design 2's calibrated surface cue set), sameAnchor and insertBlock are IMPORTED from the hashed design-2
// reference (earlierQuestions.ref.mjs, sha256 0459f578...): nothing about them is re-implemented here.
// Designed on scenario50 texts and general language. Never on holdout40.
import { gate, sameAnchor, insertBlock, BEFORE_MARKER } from '../followup-context/earlierQuestions.ref.mjs';

export { gate, sameAnchor, insertBlock, BEFORE_MARKER };

// Spec 3.1: v1 reads only the newest entry; 3 is an audit buffer (diag line, flight read), 1 would select identically.
export const LEDGER_DEPTH = 3;
// Spec 3.4: longest scenario50 question is 407 chars; the cut keeps the head (the task) and the tail (the referent).
export const PARENT_MAX_CHARS = 450;
export const CLIP_HEAD = 150;
export const CLIP_TAIL = 299;   // 150 + 1 ('…') + 299 = 450
// Spec 3.4, 125 chars: names the three facts, asked earlier / context only / do not re-answer.
export const LABEL = 'EARLIER QUESTION (asked earlier; context only, do not answer it again; answer only the question under INTERVIEWER JUST SAID):';

/** Whitespace-collapsed parent text, cut to head 150 + '…' + tail 299 when over 450. Exact slices: no word-boundary logic. */
export function clip(text) {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t.length <= PARENT_MAX_CHARS) return t;
    return `${t.slice(0, CLIP_HEAD)}…${t.slice(t.length - CLIP_TAIL)}`;
}

export function formatBlock(parent) {
    return `${LABEL}\n- ${clip(parent)}`;
}

const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Spec 3.1 ledger write, pure. ledger: [{ text, turnId: number|null, seq }], newest last.
 *  - flag off, or no pinned text (settled null / blank): the ledger is returned unchanged;
 *  - a turnId the ledger holds (the 8 s supersede, head + tail): REMOVE that entry, PUSH the new text newest;
 *  - anything else (new turn id, null, R21 re-entry): PUSH. No text dedup.
 * Capped at LEDGER_DEPTH, oldest dropped.
 */
export function recordAsked(ledger, { text, turnId = null, seq, enabled = true }) {
    if (!enabled || typeof text !== 'string' || !text.trim()) return ledger;
    const rest = turnId != null ? ledger.filter((e) => e.turnId !== turnId) : ledger;
    return [...rest, { text, turnId, seq }].slice(-LEDGER_DEPTH);
}

/**
 * Spec 3.5 buildEarlierQuestion. Inputs: enabled, question (the pinned text, `settled`), turnId (null off the auto
 * turn path), supersede (replaceAnswer), ledger (BEFORE this call's own write), promptLines (the [INTERVIEWER] lines of
 * the prepared transcript BEFORE the pinned one). Returns { block, cue, why, parent }:
 *   cue   the gate's cue for the pinned text ('none' when the flag is off or there is no pinned text);
 *   why   the reason for '' ('' itself when a block is returned): off | no-question | no-turn | supersede | no-cue |
 *         no-parent | parent-in-pinned | parent-in-prompt | error;
 *   block '' or label + '\n- ' + the parent line (at most ONE line).
 * Any exception is caught: block '', why 'error' (spec 3.6, "gate=error").
 */
export function buildEarlierQuestion({ enabled = true, question, turnId = null, supersede = false, ledger = [], promptLines = [] }) {
    const silent = (why, cue = 'none') => ({ block: '', cue, why, parent: null });
    try {
        if (!enabled) return silent('off');
        if (typeof question !== 'string' || !question.trim()) return silent('no-question');
        const cue = gate(question).cue;
        if (turnId == null) return silent('no-turn', cue);                 // spec 3.1: the block is built only on the auto turn path
        if (supersede) return silent('supersede', cue);                    // spec 3.3: the newest entry is this turn's own head
        if (cue === 'none') return silent('no-cue', cue);
        const parent = ledger.length ? ledger[ledger.length - 1].text : null;
        if (typeof parent !== 'string' || !parent.trim()) return silent('no-parent', cue);
        const np = norm(parent), nq = norm(question);
        if (np.length >= 3 && nq.includes(np)) return silent('parent-in-pinned', cue);   // Live merge, re-ask: the text is already there
        if (promptLines.some((l) => sameAnchor(l, parent))) return silent('parent-in-prompt', cue);
        return { block: formatBlock(parent), cue, why: '', parent };
    } catch {
        return silent('error');
    }
}
