/**
 * Pure helpers for applying streamed/finalized answers and the 🎙 question
 * bubble to the message list. A continuation of the same interviewer turn
 * can SUPERSEDE the answer already shown (main process sends `replace:
 * true`) — the regenerated answer, and the question bubble it belongs to,
 * are rewritten in place instead of appending a second one.
 *
 * No React, no IPC — NativelyInterface wires these to the three
 * `onIntelligenceSuggestedAnswer(Token)` / `onLiveQuestion` handlers.
 */

export interface AnswerMessage {
    id: string;
    role: string;
    text: string;
    intent?: string;
    isStreaming?: boolean;
    [k: string]: unknown;
}

/** Index of the last item matching `predicate`, or -1. */
function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
    for (let i = items.length - 1; i >= 0; i--) {
        if (predicate(items[i])) return i;
    }
    return -1;
}

/**
 * A token of a what_to_answer stream. `replace` is true only on the FIRST token of a
 * replacing stream (IntelligenceEngine emits it that way — R30): that token restarts the
 * last what_to_answer bubble in place, whether or not it is still marked streaming (the
 * head's generation is aborted synchronously before this token can arrive, so its message
 * is never actually being written to concurrently — there is no live stream to tear down).
 * Every following token of the same replacing stream carries replace=false and appends
 * normally, same as an ordinary (non-replacing) stream.
 */
export function applyAnswerToken(
    prev: AnswerMessage[],
    token: string,
    replace: boolean,
    newId: () => string
): AnswerMessage[] {
    if (replace) {
        const i = lastIndexWhere(prev, (m) => m.intent === 'what_to_answer');
        if (i !== -1) {
            const updated = [...prev];
            // A restart is a NEW answer under the same id (R23) — build it fresh
            // rather than spreading the old message, so a finished coaching
            // answer's card fields and metrics never survive onto the restart.
            updated[i] = { id: prev[i].id, role: prev[i].role, intent: 'what_to_answer', text: token, isStreaming: true };
            return updated;
        }
    }

    const lastMsg = prev[prev.length - 1];

    // Already streaming and not a restart: this token belongs to that bubble.
    if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...lastMsg, text: lastMsg.text + token };
        return updated;
    }

    return [...prev, { id: newId(), role: 'system', text: token, intent: 'what_to_answer', isStreaming: true }];
}

/** The finished answer. `finalize(msg)` builds the finished message from the streaming one (metrics, coaching card…). */
export function applyFinalAnswer(
    prev: AnswerMessage[],
    replace: boolean,
    finalize: (streaming: AnswerMessage | null) => AnswerMessage
): AnswerMessage[] {
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

    return [...prev, finalize(null)];
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
