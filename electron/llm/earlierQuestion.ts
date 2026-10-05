// Turn-based follow-up context (spec docs/superpowers/specs/2026-10-03-turn-based-followup-context-design.md
// §3.1–3.6): the question ledger's rules, the gate-and-select, the clip and the one-line block. Pure, no
// I/O, no model call. Ported function for function from the replay's reference (scratchpad
// followup-turn/earlierQuestion.ref.mjs); the app must reproduce its outputs byte for byte on the same
// inputs (earlierQuestion.parity.test.ts; the pre-registration's build gate c1). Off unless
// NATIVELY_EARLIER_QUESTION=1: flag off, every prompt is today's bytes and the ledger is never written.
import { gate, type Cue } from './earlierQuestionGate';
import { sameAnchor } from '../services/questionReconcile';

export const EARLIER_QUESTION_ENV = 'NATIVELY_EARLIER_QUESTION';
/** Spec §3.1: v1 reads only the newest entry; 3 is an audit buffer for the diag line and a flight read (1 would select identically). */
export const LEDGER_DEPTH = 3;
/** Spec §3.4: the longest scenario50 question is 407 chars; the cut keeps the head (the task) and the tail (the referent). */
export const PARENT_MAX_CHARS = 450;
export const CLIP_HEAD = 150;
export const CLIP_TAIL = 299;   // 150 + 1 ('…') + 299 = 450
/** Spec §3.4, 125 chars: names the three facts — asked earlier, context only, do not re-answer. "asked", not "answered": the ledger holds parents whose answer was aborted. */
export const LABEL = 'EARLIER QUESTION (asked earlier; context only, do not answer it again; answer only the question under INTERVIEWER JUST SAID):';

export interface AskedQuestion { text: string; turnId: number | null; seq: number }
export type EarlierWhy = '' | 'off' | 'no-question' | 'no-turn' | 'supersede' | 'no-cue' | 'no-parent' | 'parent-in-pinned' | 'parent-in-prompt' | 'error';
export interface EarlierQuestion { block: string; cue: Cue; why: EarlierWhy; parent: string | null }

export function earlierQuestionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env[EARLIER_QUESTION_ENV]?.trim();
    if (!raw || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(`${EARLIER_QUESTION_ENV}="${raw}" is not 1, 0 or unset`);
}

/**
 * The startup validate-and-describe step, the shape of describeFollowUpParentAtStartup: returns the
 * line WITHOUT the "[Main] " prefix (main.ts adds it); throws on a junk value, and when both this
 * flag and NATIVELY_FOLLOWUP_PARENT are 1 (spec §3.5: the two designs never run together), so the
 * caller exits rather than starting with a config nobody chose.
 */
export function describeEarlierQuestionAtStartup(env: NodeJS.ProcessEnv = process.env): string {
    const on = earlierQuestionEnabled(env);
    if (on && env.NATIVELY_FOLLOWUP_PARENT?.trim() === '1') throw new Error(`${EARLIER_QUESTION_ENV}=1 and NATIVELY_FOLLOWUP_PARENT=1 cannot both be set`);
    return on ? 'earlier question: on' : 'earlier question: off';
}

/** Whitespace-collapsed parent text, cut to head 150 + '…' + tail 299 when over 450. Exact slices: no word-boundary logic. */
export function clip(text: string): string {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t.length <= PARENT_MAX_CHARS) return t;
    return `${t.slice(0, CLIP_HEAD)}…${t.slice(t.length - CLIP_TAIL)}`;
}

export function formatBlock(parent: string): string {
    return `${LABEL}\n- ${clip(parent)}`;
}

const norm = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Spec §3.1 ledger write, pure. ledger: newest last.
 *  - flag off, or no pinned text (settled null / blank): the ledger is returned unchanged (same reference);
 *  - a turnId the ledger holds (the 8 s supersede, head + tail): REMOVE that entry, PUSH the new text newest;
 *  - anything else (new turn id, null, R21 re-entry): PUSH. No text dedup (review C1).
 * Capped at LEDGER_DEPTH, oldest dropped. Never mutates its input.
 */
export function recordAsked(
    ledger: readonly AskedQuestion[],
    { text, turnId = null, seq, enabled = true }: { text: string | null | undefined; turnId?: number | null; seq: number; enabled?: boolean },
): readonly AskedQuestion[] {
    if (!enabled || typeof text !== 'string' || !text.trim()) return ledger;
    const rest = turnId != null ? ledger.filter((e) => e.turnId !== turnId) : ledger;
    return [...rest, { text, turnId, seq }].slice(-LEDGER_DEPTH);
}

const INTERVIEWER_LINE = /^\[INTERVIEWER\]:\s*(.*)$/;

/**
 * The [INTERVIEWER] texts of the prepared transcript BEFORE the pinned one. pinSettledQuestion
 * appends the pinned question as the LAST line, so the last interviewer line is dropped. Checked
 * on the prepared transcript, not on getContext: sparsifyTranscript keeps 6 interviewer turns past
 * 12, so "in the window" and "in the prompt" differ (spec §3.2). The same derivation as the
 * replay's interviewerLines (gate-report-turn.mjs:128–132): lines trimmed, blank lines and empty
 * captures dropped — the parity fixtures' promptLines were made that way.
 */
export function interviewerLinesBefore(preparedTranscript: string): string[] {
    const texts: string[] = [];
    for (const raw of preparedTranscript.split('\n')) {
        const m = raw.trim().match(INTERVIEWER_LINE);
        if (m && m[1]) texts.push(m[1]);   // the line is trimmed and \s* eats the leading space, so m[1] has no edge whitespace
    }
    return texts.slice(0, -1);
}

/**
 * Spec §3.5 buildEarlierQuestion. question = the pinned text (`settled`); turnId = the machine turn's id
 * on the auto turn path, null elsewhere; supersede = replaceAnswer; ledger = BEFORE this call's own
 * write; promptLines = interviewerLinesBefore(preparedTranscript). Returns at most ONE parent line.
 * `why` is '' when a block is returned, else the reason. Any exception is caught: block '', why 'error'.
 */
export function buildEarlierQuestion(input: {
    enabled?: boolean; question: string | null | undefined; turnId?: number | null; supersede?: boolean;
    ledger?: readonly AskedQuestion[]; promptLines?: readonly string[];
}): EarlierQuestion {
    const silent = (why: EarlierWhy, cue: Cue = 'none'): EarlierQuestion => ({ block: '', cue, why, parent: null });
    try {
        const { enabled = true, question, turnId = null, supersede = false, ledger = [], promptLines = [] } = input;
        if (!enabled) return silent('off');
        if (typeof question !== 'string' || !question.trim()) return silent('no-question');
        const cue = gate(question).cue;
        if (turnId == null) return silent('no-turn', cue);                 // spec §3.1: the block is built only on the auto turn path
        if (supersede) return silent('supersede', cue);                    // spec §3.3: the newest entry is this turn's own head
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
