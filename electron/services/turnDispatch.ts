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
