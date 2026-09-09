/**
 * The interviewer's turn: WHEN to answer, when to wait, when to replace.
 * Pure — no timers, no I/O, never reads the clock. main.ts feeds the events and
 * calls tick(now) at the moments nextTimerAt() names.
 * Spec: docs/superpowers/specs/2026-09-09-whole-turn-structured-answers-design.md §3.1.
 * Replayed against the s50a and after9 runs (interviewerTurn.replay.test.ts):
 * 116/116 questions answered once, 0 before the voice stopped, 0 supersedes.
 */

export interface TurnConstants {
    /** Silence after the voice stops before the turn may dispatch (sentence pauses max 1.02 s synthetic, human p90 1.24 s). */
    gateMs: number;
    /** A transcript final younger than this may still be followed by its continuation segment. */
    settleMs: number;
    /** Extra wait when the text does not read finished (the old fragment-hold timer). */
    unfinishedHoldMs: number;
    /** Speech resuming within this after a dispatch continues the same turn — human pauses over 3 s: 2 of 544. */
    continuationMs: number;
    /** Fail-safe: a detected question never waits on the VAD longer than this. */
    maxHoldMs: number;
}

export const DEFAULT_TURN_CONSTANTS: TurnConstants = { gateMs: 1200, settleMs: 400, unfinishedHoldMs: 2500, continuationMs: 8000, maxHoldMs: 6000 };

export function turnConstantsFromEnv(env: Record<string, string | undefined> = process.env): TurnConstants {
    const num = (name: string, fallback: number): number => {
        const v = Number(env[name]);
        return Number.isFinite(v) && v > 0 ? v : fallback;
    };
    return {
        gateMs: num('NATIVELY_TURN_GATE_MS', DEFAULT_TURN_CONSTANTS.gateMs),
        settleMs: num('NATIVELY_TURN_SETTLE_MS', DEFAULT_TURN_CONSTANTS.settleMs),
        unfinishedHoldMs: num('NATIVELY_TURN_UNFINISHED_HOLD_MS', DEFAULT_TURN_CONSTANTS.unfinishedHoldMs),
        continuationMs: num('NATIVELY_TURN_CONTINUATION_MS', DEFAULT_TURN_CONSTANTS.continuationMs),
        maxHoldMs: num('NATIVELY_TURN_MAX_HOLD_MS', DEFAULT_TURN_CONSTANTS.maxHoldMs),
    };
}

const TRAILING_CONNECTIVE = /\b(and|or|so|but|because|with|for|to|of|the|a|an|then|also|plus|versus|vs|including|like|such as|as)\s*$/i;
const TERMINATOR = /[.?!]["'”’)\]]*$/;
const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];

export function readsFinished(text: string): boolean {
    const t = text.trim();
    const w = words(t);
    if (w.length < 4) return false;
    if (!TERMINATOR.test(t)) return false;
    const body = t.replace(TERMINATOR, '');
    if (/,$/.test(body) || TRAILING_CONNECTIVE.test(body)) return false;
    const sentences = t.split(/(?<=[.?!])\s+/).filter(Boolean);
    if (sentences.length === 1 && /\.$/.test(t) && w.length <= 6) return false; // a lead-in: "Let's do some code."
    return true;
}

export type TurnDecision =
    | { kind: 'idle' }
    | { kind: 'hold'; reason: 'speaking' | 'gate' | 'settle' | 'unfinished' | 'undetected' }
    | { kind: 'classify'; text: string; finals: number }
    | { kind: 'dispatch'; text: string; live: string[]; finished: boolean; gateMs: number; finals: number; fromLive: boolean }
    | { kind: 'supersede'; text: string; live: string[]; replaces: string; finals: number }
    | { kind: 'close'; reason: 'candidate' | 'continuation-expired' | 'not-a-question' | 'nothing-heard' };

export interface InterviewerTurn {
    speech(active: boolean, at: number): void;
    final(text: string, at: number): void;
    liveClaim(text: string, at: number): void;
    detected(source: 'live' | 'whisper', at: number, verdict?: 'question' | 'not-a-question'): void;
    candidateSpoke(at: number): void;
    tick(now: number): TurnDecision;
    nextTimerAt(now: number): number | null;
    reset(): void;
    snapshot(): { open: boolean; finals: number; live: number; detected: boolean; dispatched: boolean; speaking: boolean };
}

interface OpenTurn {
    startedAt: number;
    finals: { text: string; at: number }[];
    live: string[];
    speaking: boolean;
    vadSeen: boolean;
    lastSpeechAt: number;
    lastFinalAt: number;
    detected: boolean;
    detectedAt: number | null;
    classifyAsked: boolean;
    notAQuestion: boolean;
    candidateAt: number | null;
    dispatched: { at: number; text: string } | null;
    pendingAfterDispatch: boolean;
}

export function createInterviewerTurn(c: TurnConstants = DEFAULT_TURN_CONSTANTS, finished: (text: string) => boolean = readsFinished): InterviewerTurn {
    let turn: OpenTurn | null = null;

    /** Ensures a turn is open, opening a fresh one (no VAD seen yet) if none is. */
    const open = (at: number): OpenTurn => {
        if (!turn) {
            turn = {
                startedAt: at,
                finals: [],
                live: [],
                speaking: false,
                vadSeen: false,
                lastSpeechAt: -Infinity,
                lastFinalAt: -Infinity,
                detected: false,
                detectedAt: null,
                classifyAsked: false,
                notAQuestion: false,
                candidateAt: null,
                dispatched: null,
                pendingAfterDispatch: false,
            };
        }
        return turn;
    };

    /** A stuck VAD must not glue two questions together: a final/detected long after both the dispatch and the last final starts a new turn silently. */
    const reopenIfStale = (at: number): void => {
        if (turn && turn.dispatched && at - turn.dispatched.at >= c.continuationMs && at - turn.lastFinalAt >= c.continuationMs) {
            turn = null;
        }
    };

    /** finals joined verbatim; falls back to the Live texts when the transcript never finalized anything. */
    const textOf = (t: OpenTurn): { text: string; fromLive: boolean } => {
        if (t.finals.length > 0) return { text: t.finals.map((f) => f.text).join(' '), fromLive: false };
        if (t.live.length > 0) return { text: t.live.join(' '), fromLive: true };
        return { text: '', fromLive: false };
    };

    const silenceMs = (t: OpenTurn, now: number): number => now - t.lastSpeechAt;

    /** No final yet, or the last one is old enough that it won't be followed by a continuation segment. */
    const settled = (t: OpenTurn, now: number): boolean => t.finals.length === 0 || now - t.lastFinalAt >= c.settleMs;

    const quiet = (t: OpenTurn, now: number): boolean => !t.speaking && silenceMs(t, now) >= c.gateMs && settled(t, now);

    /** Why quiet() is false right now, in the same order quiet() checks — the catch-all is reached only when quiet() would otherwise be true. */
    const holdReason = (t: OpenTurn, now: number): 'speaking' | 'gate' | 'settle' | 'unfinished' => {
        if (t.speaking) return 'speaking';
        if (silenceMs(t, now) < c.gateMs) return 'gate';
        if (!settled(t, now)) return 'settle';
        return 'unfinished';
    };

    return {
        speech(active: boolean, at: number): void {
            if (!turn && !active) return; // a stray speech(false) with nothing open yet starts no turn
            const t = open(at);
            t.vadSeen = true;
            t.speaking = active;
            if (!active) t.lastSpeechAt = at; // lastSpeechAt is the moment the voice last STOPPED
        },

        final(text: string, at: number): void {
            reopenIfStale(at);
            const t = open(at);
            t.finals.push({ text: text.trim(), at });
            t.lastFinalAt = at;
            if (!t.vadSeen) t.lastSpeechAt = at; // no VAD on this turn yet: the transcript is the best evidence of when speech ended
            if (t.dispatched) t.pendingAfterDispatch = true;
        },

        liveClaim(text: string, at: number): void {
            const t = open(at);
            t.live.push(text.trim());
            if (!t.vadSeen) t.lastSpeechAt = at;
        },

        detected(_source: 'live' | 'whisper', at: number, verdict?: 'question' | 'not-a-question'): void {
            reopenIfStale(at);
            const t = open(at);
            t.detected = true;
            t.detectedAt = at;
            if (verdict === 'not-a-question') t.notAQuestion = true;
        },

        candidateSpoke(at: number): void {
            if (!turn) return; // nothing open to close
            turn.candidateAt = at;
        },

        tick(now: number): TurnDecision {
            if (!turn) return { kind: 'idle' };
            const t = turn;

            if (t.candidateAt !== null) {
                turn = null;
                return { kind: 'close', reason: 'candidate' };
            }
            if (t.notAQuestion) {
                turn = null;
                return { kind: 'close', reason: 'not-a-question' };
            }

            if (t.dispatched) {
                if (t.pendingAfterDispatch) {
                    if (quiet(t, now)) {
                        const { text } = textOf(t);
                        const replaces = t.dispatched.text;
                        t.dispatched = { at: now, text }; // the dispatch time moves to now
                        t.pendingAfterDispatch = false;
                        return { kind: 'supersede', text, live: [...t.live], replaces, finals: t.finals.length };
                    }
                    return { kind: 'hold', reason: holdReason(t, now) };
                }
                if (!t.speaking && now - Math.max(t.lastSpeechAt, t.dispatched.at) >= c.continuationMs) {
                    turn = null;
                    return { kind: 'close', reason: 'continuation-expired' };
                }
                return { kind: 'idle' };
            }

            const hasText = t.finals.length > 0 || t.live.length > 0;
            if (!hasText) {
                if (t.detectedAt !== null && now - t.detectedAt >= c.maxHoldMs) {
                    turn = null;
                    return { kind: 'close', reason: 'nothing-heard' };
                }
                return { kind: 'hold', reason: t.speaking ? 'speaking' : 'undetected' };
            }

            if (!t.detected) {
                if (quiet(t, now) && !t.classifyAsked) {
                    t.classifyAsked = true;
                    const { text } = textOf(t);
                    return { kind: 'classify', text, finals: t.finals.length };
                }
                return { kind: 'hold', reason: 'undetected' };
            }

            const { text, fromLive } = textOf(t);
            const isFinished = finished(text);
            // A Live-only text (no finals) never dispatches at the plain gate — only on the unfinished-hold or fail-safe branches below.
            const atGate = t.finals.length > 0 && quiet(t, now) && isFinished;
            const unfinishedHoldElapsed = !t.speaking && silenceMs(t, now) >= c.gateMs + c.unfinishedHoldMs && settled(t, now);
            const failSafe = t.detectedAt !== null && now - t.detectedAt >= c.maxHoldMs;
            if (atGate || unfinishedHoldElapsed || failSafe) {
                t.dispatched = { at: now, text };
                return { kind: 'dispatch', text, live: [...t.live], finished: isFinished, gateMs: c.gateMs, finals: t.finals.length, fromLive };
            }
            return { kind: 'hold', reason: holdReason(t, now) };
        },

        nextTimerAt(now: number): number | null {
            if (!turn) return null;
            const t = turn;
            if (t.candidateAt !== null || t.notAQuestion) return now; // a close is pending

            const candidates: number[] = [];
            if (!t.speaking && (!t.dispatched || t.pendingAfterDispatch)) {
                candidates.push(t.lastSpeechAt + c.gateMs);
                candidates.push(t.lastSpeechAt + c.gateMs + c.unfinishedHoldMs);
            }
            if (t.finals.length > 0) candidates.push(t.lastFinalAt + c.settleMs);
            if (!t.dispatched && t.detectedAt !== null) candidates.push(t.detectedAt + c.maxHoldMs);
            if (t.dispatched && !t.pendingAfterDispatch) candidates.push(Math.max(t.lastSpeechAt, t.dispatched.at) + c.continuationMs);

            const future = candidates.filter((at) => at > now);
            return future.length > 0 ? Math.min(...future) : null;
        },

        reset(): void {
            turn = null;
        },

        snapshot() {
            if (!turn) return { open: false, finals: 0, live: 0, detected: false, dispatched: false, speaking: false };
            return {
                open: true,
                finals: turn.finals.length,
                live: turn.live.length,
                detected: turn.detected,
                dispatched: turn.dispatched !== null,
                speaking: turn.speaking,
            };
        },
    };
}
