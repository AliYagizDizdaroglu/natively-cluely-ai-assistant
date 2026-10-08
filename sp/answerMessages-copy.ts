// Verbatim copy of src/lib/answerMessages.ts (as reviewed at commit 3293352)
// for a local, self-contained tsc prototype. Not a worktree file.

export interface AnswerMessage {
    id: string;
    role: string;
    text: string;
    intent?: string;
    isStreaming?: boolean;
    [k: string]: unknown;
}

function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
    for (let i = items.length - 1; i >= 0; i--) {
        if (predicate(items[i])) return i;
    }
    return -1;
}

export function applyAnswerToken(
    prev: AnswerMessage[],
    token: string,
    replace: boolean,
    newId: () => string
): AnswerMessage[] {
    const lastMsg = prev[prev.length - 1];

    if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...lastMsg, text: lastMsg.text + token };
        return updated;
    }

    if (replace) {
        const i = lastIndexWhere(prev, (m) => m.intent === 'what_to_answer');
        if (i !== -1) {
            const updated = [...prev];
            updated[i] = { ...prev[i], text: token, isStreaming: true, metrics: undefined };
            return updated;
        }
    }

    return [...prev, { id: newId(), role: 'system', text: token, intent: 'what_to_answer', isStreaming: true }];
}

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
