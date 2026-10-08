// Prototype: would a generic <M extends {...}> signature let the three
// answerMessages.ts call sites in NativelyInterface.tsx drop the `as` casts,
// AND would the helper body itself type-check WITHOUT internal casts?
// Mirrors the real Message interface (src/components/NativelyInterface.tsx)
// and the real applyAnswerToken/applyFinalAnswer/applyLiveQuestion bodies
// (src/lib/answerMessages.ts), under this repo's strict:true, skipLibCheck:true.

interface Message {
    id: string;
    role: 'user' | 'system' | 'interviewer';
    text: string;
    isStreaming?: boolean;
    metrics?: { totalMs: number };
    hasScreenshot?: boolean;
    screenshotPreview?: string;
    isCode?: boolean;
    intent?: string;
    isNegotiationCoaching?: boolean;
    negotiationCoachingData?: { tacticalNote: string };
}

type Base = { id: string; role: string; text: string; intent?: string; isStreaming?: boolean };

function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
    for (let i = items.length - 1; i >= 0; i--) {
        if (predicate(items[i])) return i;
    }
    return -1;
}

// --- Generic version of applyAnswerToken, body copied verbatim from
// src/lib/answerMessages.ts but with AnswerMessage -> M ---
function applyAnswerTokenGeneric<M extends Base>(
    prev: M[],
    token: string,
    replace: boolean,
    newId: () => string
): M[] {
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

    return [...prev, { id: newId(), role: 'system', text: token, intent: 'what_to_answer', isStreaming: true } as M];
}

// --- Generic version of applyFinalAnswer ---
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

// --- Generic version of applyLiveQuestion ---
function applyLiveQuestionGeneric<M extends Base>(
    prev: M[],
    question: string,
    replace: boolean,
    newId: () => string
): M[] {
    if (replace) {
        const i = lastIndexWhere(prev, (m) => m.role === 'user' && m.text.startsWith('🎙 '));
        if (i !== -1) {
            const updated = [...prev];
            updated[i] = { ...prev[i], text: `🎙 ${question}` };
            return updated;
        }
    }

    return [...prev, { id: newId(), role: 'user', text: `🎙 ${question}` } as M];
}

// --- Call sites, exactly like NativelyInterface.tsx but with NO `as` casts ---
declare const prevMsgs: Message[];

const r1: Message[] = applyAnswerTokenGeneric(prevMsgs, 'tok', false, () => Date.now().toString());

const r2: Message[] = applyFinalAnswerGeneric(prevMsgs, false, (streaming) =>
    streaming ? { ...streaming, isStreaming: false } : { id: 'x', role: 'system', text: 'a', intent: 'what_to_answer' }
);

const r3: Message[] = applyLiveQuestionGeneric(prevMsgs, 'q', true, () => `live-${Date.now()}`);

console.log(r1, r2, r3);
