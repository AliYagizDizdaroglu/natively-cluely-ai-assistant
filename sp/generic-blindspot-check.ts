// Would the GENERIC form catch the same "metrixs" typo that the shipped
// cast-based design let through silently? Reuses the generic helper body
// already proven to type-check (generic-proto.ts).
type Base = { id: string; role: string; text: string; intent?: string; isStreaming?: boolean };

function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
    for (let i = items.length - 1; i >= 0; i--) {
        if (predicate(items[i])) return i;
    }
    return -1;
}

function applyFinalAnswerGeneric<M extends Base>(
    prev: M[],
    replace: boolean,
    finalize: (streaming: M | null) => M
): M[] {
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

interface Message {
    id: string;
    role: 'user' | 'system' | 'interviewer';
    text: string;
    isStreaming?: boolean;
    metrics?: { totalMs: number };
    intent?: string;
}

declare const prev: Message[];
const finalMetrics = { totalMs: 1 };

const result: Message[] = applyFinalAnswerGeneric(prev, false, (streaming) => (streaming
    ? { ...streaming, text: 'x', isStreaming: false, metrixs: finalMetrics }
    : { id: 'a', role: 'system', text: 'x', intent: 'what_to_answer', metrixs: finalMetrics }
));

console.log(result);
