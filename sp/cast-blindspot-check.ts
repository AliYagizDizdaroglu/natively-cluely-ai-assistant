// Does the shipped `as AnswerMessage[]` / `as Message[]` cast pattern let a
// typo'd extra field through silently? Uses the REAL answerMessages.ts from
// the worktree (read-only import), plus a local stand-in for Message (same
// shape as src/components/NativelyInterface.tsx's Message interface).
import { applyFinalAnswer, type AnswerMessage } from "./answerMessages-copy";

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

declare const prev: Message[];
const finalMetrics = { totalMs: 1 };

// Deliberate typo: "metrixs" instead of "metrics" (the real code's plain-answer
// branch sets `metrics: finalMetrics`). Shipped call-site pattern: cast prev in,
// cast the result back out to Message[].
const result = applyFinalAnswer(prev as AnswerMessage[], false, (streaming) => (streaming
    ? { ...streaming, text: 'x', isStreaming: false, metrixs: finalMetrics }
    : { id: 'a', role: 'system', text: 'x', intent: 'what_to_answer', metrixs: finalMetrics }
)) as Message[];

console.log(result);
