import type { TurnDecision } from './interviewerTurn';

/** The subset of main.ts's DetectionInput a turn keeps from the detections that marked it. */
export interface MarkedDetection { question: string; intent: 'verbal' | 'coding' | 'behavioral'; source: 'live' | 'whisper'; anchor?: string; verdict: 'match' | 'paraphrase' | 'replaced' | 'unverifiable' }

/** A verified transcript match beats an unverifiable Live claim; otherwise the first detection stands. */
export function pickTurnDetection<T extends MarkedDetection>(current: T | null, incoming: T): T {
    if (!current) return incoming;
    const verified = (v: MarkedDetection['verdict']) => v === 'match' || v === 'paraphrase';
    return !verified(current.verdict) && verified(incoming.verdict) ? incoming : current;
}

/** The DetectionInput the turn's dispatch/supersede sends through dispatchDetection. `turnId` is the machine turn's id, captured here at dispatch (spec 2026-10-03 §3.1): the answer call's ledger key and the only path that gets an EARLIER QUESTION block. */
export function turnDispatchInput<T extends MarkedDetection>(base: T, d: Extract<TurnDecision, { kind: 'dispatch' | 'supersede' }>, turnId: number | null): T & { anchor: string; liveTexts: string[]; turnDispatch: true; resolving: true; turnId?: number } {
    return { ...base, question: d.text, anchor: d.text, liveTexts: d.live, turnDispatch: true, resolving: true, ...(turnId != null ? { turnId } : {}) };
}

/** D2: how long after an absorbed final its own whisper chip may still arrive: detect latency over 4826 calls p50 561 ms, p99 1926, p99.9 3274, max 8016; a 1.5 s debounce + 3.3 s fits, a detection slower than ~3.5 s still marks (M4: tag the chip with its final's id to remove the window). */
export const LATE_FINAL_CHIP_MS = 5000;

const wordsOf = (s: string): string => (s.toLowerCase().match(/[a-z0-9']+/g) ?? []).join(' ');

/** D2: true iff `question` (normalized to words) lies inside an absorbed final no older than LATE_FINAL_CHIP_MS: that chip is the absorbed words' own detection and must not mark the next turn. */
export function isLateFinalChip(question: string, absorbed: readonly { text: string; at: number }[], now: number): boolean {
    const q = wordsOf(question);
    if (!q) return false;
    return absorbed.some((a) => now - a.at <= LATE_FINAL_CHIP_MS && ` ${wordsOf(a.text)} `.includes(` ${q} `));
}
