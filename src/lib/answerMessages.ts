/**
 * Pure helpers for applying streamed/finalized answers and the 🎙 question
 * bubble to the message list. A continuation of the same interviewer turn
 * can SUPERSEDE the answer already shown (main process sends `replace:
 * true`) — the regenerated answer, and the question bubble it belongs to,
 * are rewritten in place instead of appending a second one.
 *
 * No React, no IPC — NativelyInterface wires these to the three
 * `onIntelligenceSuggestedAnswer(Token)` / `onLiveQuestion` handlers.
 *
 * Router-default (spec §4.5): bubbles may also be KEYED by `turnId` / `origin` / `append`. The keyed path
 * runs only where `usesKeyedPath` says so (a Live event, an append event, or a turn that already has a Live
 * bubble); every other event runs today's code, and a `turnId` on it is only stored on the bubble.
 */

export interface AnswerMessage {
    id: string;
    role: string;
    text: string;
    intent?: string;
    isStreaming?: boolean;
    /** Cue mode: the key phrases the answer opened with, rendered above the text. */
    cues?: string[];
    /** The interviewer turn this answer belongs to (engine `turnId`). */
    turnId?: number;
    origin?: 'live' | 'pipeline';
    /** True on the "(full answer)" bubble appended below a Live answer. */
    append?: boolean;
    /** A small header line rendered above the text (the "(full answer)" label). */
    label?: string;
    /** The source label in force when the bubble was created; a later source event never relabels it. */
    sourceLabel?: string;
    [k: string]: unknown;
}

export interface BubbleMeta { turnId?: number; origin?: 'live' | 'pipeline'; append?: boolean; label?: string; sourceLabel?: string }

export const LIVE_SOURCE_LABEL = 'gemini-3.8-live';

/** The gate itself, given whether the turn already has a Live bubble. */
function keyedGate(hasLiveBubble: boolean, meta?: BubbleMeta): boolean {
    if (!meta || meta.turnId == null) return false;
    return meta.origin === 'live' || meta.append === true || hasLiveBubble;
}

function hasLiveBubble(prev: AnswerMessage[], turnId: number | undefined): boolean {
    return turnId != null && prev.some((m) => m.turnId === turnId && m.origin === 'live');
}

/**
 * B2 gate: does this token/final event take the keyed path (rules 1–4)? Only when it is a Live event, an
 * append event, or its turn already has a Live bubble. Everything else — every flag-off event — is today's code.
 */
export function usesKeyedPath(prev: AnswerMessage[], meta?: BubbleMeta): boolean {
    return keyedGate(hasLiveBubble(prev, meta?.turnId), meta);
}

/** Same gate for a caller that mirrors "which turns hold a Live bubble" synchronously (NativelyInterface). */
export function usesKeyedPathFor(liveTurnIds: ReadonlySet<number>, meta?: BubbleMeta): boolean {
    return keyedGate(meta?.turnId != null && liveTurnIds.has(meta.turnId), meta);
}

/** The gate for a source event (label, turnId): the Live label, or a turn that already has a Live bubble. */
export function usesKeyedSource(prev: AnswerMessage[], label: string, turnId?: number): boolean {
    return turnId != null && (label === LIVE_SOURCE_LABEL || hasLiveBubble(prev, turnId));
}

export function usesKeyedSourceFor(liveTurnIds: ReadonlySet<number>, label: string, turnId?: number): boolean {
    return turnId != null && (label === LIVE_SOURCE_LABEL || liveTurnIds.has(turnId));
}

/** Index of the last item matching `predicate`, or -1. */
function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
    for (let i = items.length - 1; i >= 0; i--) {
        if (predicate(items[i])) return i;
    }
    return -1;
}

/** What today's (non-keyed) path stores from the meta: the turnId and origin, nothing else. */
function storedTag(meta?: BubbleMeta): Partial<AnswerMessage> {
    if (!meta || meta.turnId == null) return {};
    return meta.origin ? { turnId: meta.turnId, origin: meta.origin } : { turnId: meta.turnId };
}

/** The meta fields a keyed bubble carries. */
function keyedFields(meta: BubbleMeta): Partial<AnswerMessage> {
    return {
        turnId: meta.turnId,
        ...(meta.origin ? { origin: meta.origin } : {}),
        ...(meta.append ? { append: true } : {}),
        ...(meta.label !== undefined ? { label: meta.label } : {}),
        ...(meta.sourceLabel !== undefined ? { sourceLabel: meta.sourceLabel } : {}),
    };
}

/** The streaming what_to_answer bubble that a keyed token/final addresses: same turnId, origin and append. */
function lastStreamingMatch(prev: AnswerMessage[], meta: BubbleMeta): number {
    return lastIndexWhere(prev, (m) =>
        m.intent === 'what_to_answer' && m.isStreaming === true && m.turnId === meta.turnId
        && m.origin === meta.origin && (m.append === true) === (meta.append === true));
}

/** `prev` with the bubble at `first` replaced by `replacement` and every other bubble of `turnId` removed. */
function replaceFirstOfTurn(prev: AnswerMessage[], first: number, turnId: number | undefined, replacement: AnswerMessage): AnswerMessage[] {
    const out: AnswerMessage[] = [];
    prev.forEach((m, i) => {
        if (i === first) out.push(replacement);
        else if (m.turnId !== turnId) out.push(m);
    });
    return out;
}

/**
 * A token of a what_to_answer stream. `replace` is true only on the FIRST token of a
 * replacing stream (IntelligenceEngine emits it that way — R30): that token restarts the
 * last what_to_answer bubble in place, whether or not it is still marked streaming (the
 * head's generation is aborted synchronously before this token can arrive, so its message
 * is never actually being written to concurrently — there is no live stream to tear down).
 * Every following token of the same replacing stream carries replace=false and appends
 * normally, same as an ordinary (non-replacing) stream.
 *
 * On the keyed path (see `usesKeyedPath`) the bubble is addressed by turnId/origin/append instead:
 * a replace rewrites the turn's FIRST bubble and drops its later ones; a plain token appends only to the
 * streaming bubble whose turnId, origin and append all match, else opens a new one.
 */
export function applyAnswerToken(
    prev: AnswerMessage[],
    token: string,
    replace: boolean,
    newId: () => string,
    cues?: string[],
    meta?: BubbleMeta
): AnswerMessage[] {
    // `cues` rides the first prose token of a stream that opened with a cue block (cue mode);
    // a restart takes the new stream's cues and never inherits the old ones.
    const withCues = cues && cues.length ? { cues } : {};

    if (meta && usesKeyedPath(prev, meta)) {
        const fields = keyedFields(meta);
        if (replace) {
            const first = prev.findIndex((m) => m.turnId === meta.turnId);
            if (first !== -1) {
                // A fresh object under the same id: the turn's first bubble becomes the replacing answer.
                return replaceFirstOfTurn(prev, first, meta.turnId, {
                    id: prev[first].id, role: prev[first].role, intent: 'what_to_answer', text: token, isStreaming: true, ...fields, ...withCues,
                });
            }
        } else {
            const i = lastStreamingMatch(prev, meta);
            if (i !== -1) {
                const updated = [...prev];
                updated[i] = { ...prev[i], text: prev[i].text + token, ...withCues };
                return updated;
            }
        }
        return [...prev, { id: newId(), role: 'system', text: token, intent: 'what_to_answer', isStreaming: true, ...fields, ...withCues }];
    }

    const tag = storedTag(meta);
    if (replace) {
        const i = lastIndexWhere(prev, (m) => m.intent === 'what_to_answer');
        if (i !== -1) {
            const updated = [...prev];
            // A restart is a NEW answer under the same id (R23) — build it fresh
            // rather than spreading the old message, so a finished coaching
            // answer's card fields and metrics never survive onto the restart.
            updated[i] = { id: prev[i].id, role: prev[i].role, intent: 'what_to_answer', text: token, isStreaming: true, ...tag, ...withCues };
            return updated;
        }
    }

    const lastMsg = prev[prev.length - 1];

    // Already streaming and not a restart: this token belongs to that bubble.
    if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...lastMsg, text: lastMsg.text + token, ...withCues };
        return updated;
    }

    return [...prev, { id: newId(), role: 'system', text: token, intent: 'what_to_answer', isStreaming: true, ...tag, ...withCues }];
}

/**
 * The finished answer. `finalize(msg)` builds the finished message from the streaming one (metrics, coaching card…).
 * On the keyed path it closes the streaming bubble with the same turnId, origin and append (and only that one); else,
 * on a replace, the turn's first bubble (dropping the later ones); else it appends `finalize(null)` with the meta.
 */
export function applyFinalAnswer(
    prev: AnswerMessage[],
    replace: boolean,
    finalize: (streaming: AnswerMessage | null) => AnswerMessage,
    meta?: BubbleMeta
): AnswerMessage[] {
    if (meta && usesKeyedPath(prev, meta)) {
        const i = lastStreamingMatch(prev, meta);
        if (i !== -1) {
            const updated = [...prev];
            updated[i] = finalize(prev[i]);
            return updated;
        }
        if (replace) {
            const first = prev.findIndex((m) => m.turnId === meta.turnId);
            if (first !== -1) return replaceFirstOfTurn(prev, first, meta.turnId, finalize(prev[first]));
        }
        return [...prev, { ...finalize(null), ...keyedFields(meta) }];
    }

    const lastMsg = prev[prev.length - 1];

    if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
        const updated = [...prev];
        updated[updated.length - 1] = finalize(lastMsg);
        return updated;
    }

    if (replace) {
        const i = lastIndexWhere(prev, (m) => m.intent === 'what_to_answer');
        if (i !== -1) {
            const updated = [...prev];
            updated[i] = finalize(prev[i]);
            return updated;
        }
    }

    return [...prev, { ...finalize(null), ...storedTag(meta) }];
}

/** The 🎙 question bubble. replace=true rewrites the last 🎙 bubble's text. */
export function applyLiveQuestion(
    prev: AnswerMessage[],
    question: string,
    replace: boolean,
    newId: () => string
): AnswerMessage[] {
    if (replace) {
        const i = lastIndexWhere(prev, (m) => m.role === 'user' && m.text.startsWith('🎙 '));
        if (i !== -1) {
            const updated = [...prev];
            updated[i] = { ...prev[i], text: `🎙 ${question}` };
            return updated;
        }
    }

    return [...prev, { id: newId(), role: 'user', text: `🎙 ${question}` }];
}
