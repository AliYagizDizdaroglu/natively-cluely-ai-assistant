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
    /** Fail-safe: waits no longer than this past the LATEST of the turn's detection, last final, and last VAD off-transition (R14) — 8 s: the longest pause-free, final-free span across the 116 golden questions (s50a 40 + after9 76) is 7.1 s (s50a S1Q03), plus a margin of about 1 s (R16). */
    maxHoldMs: number;
    /** After an answer, a voice stop that no transcript words follow within this carried no words — a chime, a notification, another participant's noise on the meeting audio — and must not count as the interviewer resuming. Golden runs 2026-09-08/09: the last final follows the last voice stop by p50 708 ms, p99 1029 ms, max 1041 ms on 116/116 questions; 3 s is ~3× the max. */
    wordlessGraceMs: number;
}

export const DEFAULT_TURN_CONSTANTS: TurnConstants = { gateMs: 1200, settleMs: 400, unfinishedHoldMs: 2500, continuationMs: 8000, maxHoldMs: 8000, wordlessGraceMs: 3000 };

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
        wordlessGraceMs: num('NATIVELY_TURN_WORDLESS_GRACE_MS', DEFAULT_TURN_CONSTANTS.wordlessGraceMs),
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
    | { kind: 'classify'; text: string; finals: number; turn: number }
    | { kind: 'dispatch'; text: string; live: string[]; finished: boolean; gateMs: number; finals: number; fromLive: boolean }
    | { kind: 'supersede'; text: string; live: string[]; replaces: string; finals: number }
    | { kind: 'close'; reason: 'candidate' | 'continuation-expired' | 'not-a-question' | 'nothing-heard' };

export interface FinalProvenance { onsetAt?: number; textSinceAt?: number }

export interface InterviewerTurn {
    speech(active: boolean, at: number): void;
    final(text: string, at: number, prov?: FinalProvenance): 'absorbed' | 'joined';
    answered(turnId: number, at: number): void;
    voiceHeard(at: number): void;
    liveClaim(text: string, at: number): void;
    /**
     * `forTurn`, when given, is the id a `classify` decision carried (R20): a verdict
     * for any turn other than the one currently open — including no turn open at all,
     * e.g. it closed while the classification was in flight — is ignored outright: it
     * neither marks nor (re)opens a turn. Omit it for a live/whisper detector's own
     * fresh detection, which always applies to whatever turn is open.
     */
    detected(source: 'live' | 'whisper', at: number, verdict?: 'question' | 'not-a-question', forTurn?: number): void;
    candidateSpoke(at: number): void;
    tick(now: number): TurnDecision;
    nextTimerAt(now: number): number | null;
    reset(): void;
    /** When the open turn's voice last stopped; src 'vad' iff VAD was seen on the turn, else the last final stood in. null: no turn open, or no stop yet. */
    speechEnd(): { at: number; src: 'vad' | 'final' } | null;
    snapshot(): { open: boolean; finals: number; live: number; detected: boolean; dispatched: boolean; speaking: boolean; id: number | null };
}

interface OpenTurn {
    id: number;
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
    /** D2: when main committed an answer for this turn (dispatchDetection's answer branch); null: dropped, held, or not dispatched. */
    answeredAt: number | null;
    /** D2: every voice-on (VAD speech(true) or Deepgram speech-started) seen on this turn after its dispatch. */
    voiceOnsAfterDispatch: number[];
}

/** What the machine remembers of the turn it closed last (D2): only what the late-final absorb rule reads. */
interface ClosedTurn {
    id: number;
    closedAt: number;
    answeredAt: number | null;
    /** A voice-on in (dispatch, closedAt], snapshotted AT the close: a voice-on after the close never counts (N1). */
    voiceAfterDispatch: boolean;
}

export function createInterviewerTurn(c: TurnConstants = DEFAULT_TURN_CONSTANTS, finished: (text: string) => boolean = readsFinished): InterviewerTurn {
    let turn: OpenTurn | null = null;
    // R20: every turn gets its own id, scoped to this machine instance, so a classify
    // verdict that resolves after its turn closed (a candidate interjection, a stale
    // classification racing a fresh turn) can be told apart from the turn that replaced it.
    let nextTurnId = 1;
    // D2: the last closed turn, replaced at every close, cleared by reset(). Without it a Deepgram
    // final that was already showing as an interim before an answered turn closed joins the NEXT turn.
    let lastClosed: ClosedTurn | null = null;

    /** Closes the open turn `t` at `closedAt` and remembers it (D2). Every close goes through here, tick's and reopenIfStale's. */
    const close = (t: OpenTurn, closedAt: number): void => {
        lastClosed = {
            id: t.id,
            closedAt,
            answeredAt: t.dispatched ? t.answeredAt : null,
            voiceAfterDispatch: t.voiceOnsAfterDispatch.some((v) => v <= closedAt),
        };
        turn = null;
    };

    /** Ensures a turn is open, opening a fresh one (no VAD seen yet) if none is. */
    const open = (at: number): OpenTurn => {
        if (!turn) {
            turn = {
                id: nextTurnId++,
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
                answeredAt: null,
                voiceOnsAfterDispatch: [],
            };
        }
        return turn;
    };

    /**
     * The last voice stop as the continuation clocks see it after an answer: itself while its
     * words could still be on the way, nothing at all once the grace has passed with none —
     * that stop was not speech. Only consulted on a dispatched turn with nothing pending, and
     * a worded final after the dispatch flips pendingAfterDispatch, so every stop seen here
     * is, so far, a stop nobody's words followed. 2026-09-13 smoke: loopback energy between
     * questions kept restarting the 8 s clock from each blip's stop; the next question then
     * joined the answered turn and went out as a supersede of it.
     */
    const effectiveStopAt = (t: OpenTurn, now: number): number => now - t.lastSpeechAt < c.wordlessGraceMs ? t.lastSpeechAt : -Infinity;

    /** R15: text on a dispatched turn is stale — and starts a new turn silently — only once it arrives CONTINUATION_MS past the LATEST of the dispatch, the last final, and the last VAD off-transition that words followed (the same staleness rule the continuation close uses). */
    const reopenIfStale = (at: number): void => {
        if (turn && turn.dispatched) {
            const staleSince = Math.max(turn.dispatched.at, turn.lastFinalAt, effectiveStopAt(turn, at));
            // D2: the turn closed when it BECAME stale, not when this call noticed.
            if (at - staleSince >= c.continuationMs) close(turn, staleSince + c.continuationMs);
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

    /** R14: the fail-safe clock runs from the LATEST of the turn's last detection, its last transcript final, and its last VAD off-transition — a VAD that produced an off-transition within maxHoldMs is working, and a working VAD reporting speech means the interviewer is still talking, however slowly the transcript finalizes; only a VAD with no transition for maxHoldMs is stuck. */
    const failSafeAt = (t: OpenTurn): number | null => t.detectedAt === null ? null : Math.max(t.detectedAt, t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs;

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
            else if (t.dispatched && at > t.dispatched.at) t.voiceOnsAfterDispatch.push(at);
        },

        final(text: string, at: number, prov?: FinalProvenance): 'absorbed' | 'joined' {
            reopenIfStale(at);
            // D2: a final whose words were already showing as an interim before an ANSWERED turn closed,
            // with no new voice since that turn's dispatch and no new words merged in after the close,
            // is the tail of that turn's speech, not the start of the next. Absorbed: nothing is pushed,
            // nothing is opened. No provenance (no interim, GoogleSTT) never absorbs.
            const lc = lastClosed;
            if (lc && prov && prov.onsetAt !== undefined && prov.textSinceAt !== undefined
                && prov.onsetAt < lc.closedAt && lc.answeredAt !== null && !lc.voiceAfterDispatch && prov.textSinceAt < lc.closedAt) {
                return 'absorbed';
            }
            const t = open(at);
            t.finals.push({ text: text.trim(), at });
            t.lastFinalAt = at;
            if (!t.vadSeen) t.lastSpeechAt = at; // no VAD on this turn yet: the transcript is the best evidence of when speech ended
            if (t.dispatched) t.pendingAfterDispatch = true;
            return 'joined';
        },

        answered(turnId: number, at: number): void {
            if (turn && turn.id === turnId) turn.answeredAt = at;
            else if (lastClosed && lastClosed.id === turnId) lastClosed.answeredAt = at; // a held answer can land after the close
        },

        voiceHeard(at: number): void {
            if (turn && turn.dispatched && at > turn.dispatched.at) turn.voiceOnsAfterDispatch.push(at);
        },

        liveClaim(text: string, at: number): void {
            reopenIfStale(at);
            const t = open(at);
            t.live.push(text.trim());
            if (!t.vadSeen) t.lastSpeechAt = at;
        },

        detected(_source: 'live' | 'whisper', at: number, verdict?: 'question' | 'not-a-question', forTurn?: number): void {
            // R20: a verdict scoped to a specific turn (forTurn given) that isn't the
            // currently open one is stale — ignore it before reopenIfStale/open, so it
            // can neither mark the turn that replaced it nor silently open a new one.
            if (forTurn !== undefined && (!turn || turn.id !== forTurn)) return;
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
                close(t, now);
                return { kind: 'close', reason: 'candidate' };
            }
            if (t.notAQuestion) {
                close(t, now);
                return { kind: 'close', reason: 'not-a-question' };
            }

            if (t.dispatched) {
                if (t.pendingAfterDispatch) {
                    // R14: a pending supersede never waits on a stuck VAD either — it goes out once
                    // maxHoldMs has passed since the LATER of the last final and the last VAD
                    // off-transition, same as the plain fail-safe above.
                    if (quiet(t, now) || now >= Math.max(t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs) {
                        const { text } = textOf(t);
                        const replaces = t.dispatched.text;
                        t.dispatched = { at: now, text }; // the dispatch time moves to now
                        t.pendingAfterDispatch = false;
                        return { kind: 'supersede', text, live: [...t.live], replaces, finals: t.finals.length };
                    }
                    return { kind: 'hold', reason: holdReason(t, now) };
                }
                if (!t.speaking && now - Math.max(effectiveStopAt(t, now), t.dispatched.at) >= c.continuationMs) {
                    close(t, now);
                    return { kind: 'close', reason: 'continuation-expired' };
                }
                return { kind: 'idle' };
            }

            const hasText = t.finals.length > 0 || t.live.length > 0;
            if (!hasText) {
                const fs = failSafeAt(t);
                if (fs !== null && now >= fs) {
                    close(t, now);
                    return { kind: 'close', reason: 'nothing-heard' };
                }
                return { kind: 'hold', reason: t.speaking ? 'speaking' : 'undetected' };
            }

            if (!t.detected) {
                if (quiet(t, now) && !t.classifyAsked) {
                    t.classifyAsked = true;
                    const { text } = textOf(t);
                    return { kind: 'classify', text, finals: t.finals.length, turn: t.id };
                }
                return { kind: 'hold', reason: 'undetected' };
            }

            const { text, fromLive } = textOf(t);
            const isFinished = finished(text);
            // A Live-only text (no finals) never dispatches at the plain gate — only on the unfinished-hold or fail-safe branches below.
            const atGate = t.finals.length > 0 && quiet(t, now) && isFinished;
            const unfinishedHoldElapsed = !t.speaking && silenceMs(t, now) >= c.gateMs + c.unfinishedHoldMs && settled(t, now);
            const fs = failSafeAt(t);
            const failSafe = fs !== null && now >= fs;
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
            if (!t.dispatched) { const fs = failSafeAt(t); if (fs !== null) candidates.push(fs); }
            if (t.dispatched && t.pendingAfterDispatch) candidates.push(Math.max(t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs);
            if (t.dispatched && !t.pendingAfterDispatch) {
                // The close comes 8 s after the dispatch, or when the last stop's grace runs out
                // with no words having followed it, whichever is later; tick() decides which.
                candidates.push(t.dispatched.at + c.continuationMs);
                if (t.lastSpeechAt > t.dispatched.at) candidates.push(t.lastSpeechAt + c.wordlessGraceMs);
            }

            const future = candidates.filter((at) => at > now);
            return future.length > 0 ? Math.min(...future) : null;
        },

        reset(): void {
            turn = null;
            lastClosed = null;
        },

        speechEnd() {
            if (!turn || turn.lastSpeechAt === -Infinity) return null;
            return { at: turn.lastSpeechAt, src: turn.vadSeen ? 'vad' : 'final' };
        },

        snapshot() {
            if (!turn) return { open: false, finals: 0, live: 0, detected: false, dispatched: false, speaking: false, id: null };
            return {
                open: true,
                finals: turn.finals.length,
                live: turn.live.length,
                detected: turn.detected,
                dispatched: turn.dispatched !== null,
                speaking: turn.speaking,
                id: turn.id,
            };
        },
    };
}
