/**
 * The verbal hedge (NATIVELY_VERBAL_HEDGE): gemini-3.5-flash-lite (HIGH) starts first; with no
 * first token by the trigger, or a failure before its first token, gemini-3.1-flash-lite (LOW)
 * is started beside it and the first token wins — see
 * docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md and LLMHelper.streamGeminiWithHedge.
 *
 * The shipped default since flight h40c (2026-09-29, holdout40): first token median 4.1 s, p90
 * 6.5 s, 0 failures, 35 of 45 acceptable — it passed the rules pre-registered in
 * electron/test/golden/passes/PREREGISTER-h40c.md (rule 1 not void, rules 2-3 PASS; result:
 * passes/2026-09-29-h40c-result.md), which licensed this default and nothing else.
 * NATIVELY_VERBAL_HEDGE=0 restores the previous policy, the stall race: gemini-3.1-flash-lite
 * (LOW) first, gemini-3.5-flash-lite raced in when its first token is late (10 s at the shipped LOW).
 *
 * Same shape as geminiThinkingLevelFromEnv/firstTokenTimeoutMs: unset/empty/'1' is on, '0' is
 * off, anything else throws — a typo must not fly silently, on or off.
 */
export const VERBAL_HEDGE_ENV = 'NATIVELY_VERBAL_HEDGE';
export const VERBAL_HEDGE_TRIGGER_ENV = 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS';
// The value probed 2026-09-25 (H1-H3), fixed before any counted window.
export const DEFAULT_HEDGE_TRIGGER_MS = 5000;

// Unset means ON; only an explicit '0' opts out.
// NATIVELY_VERBAL_PRIMARY_MODEL (the two Flash Lites only) matters only with '0': the hedge takes either alike.
export function verbalHedgeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env[VERBAL_HEDGE_ENV]?.trim();
    if (!raw || raw === '1') return true;
    if (raw === '0') return false;
    throw new Error(`${VERBAL_HEDGE_ENV}="${raw}" is not "1" (or unset) for on, or "0" for off; a typo must not fly silently on or off`);
}

/**
 * How long the front gets before the back is started beside it. NATIVELY_VERBAL_HEDGE_TRIGGER_MS
 * overrides the default, in firstTokenTimeoutMs's shape: a positive whole number of
 * milliseconds, or refused.
 */
export function verbalHedgeTriggerMs(env: NodeJS.ProcessEnv = process.env): number {
    const raw = env[VERBAL_HEDGE_TRIGGER_ENV]?.trim();
    if (raw) {
        if (!/^\d+$/.test(raw) || Number(raw) < 1) {
            throw new Error(`${VERBAL_HEDGE_TRIGGER_ENV}="${raw}" is not a positive whole number of milliseconds; unset it for the default`);
        }
        return Number(raw);
    }
    return DEFAULT_HEDGE_TRIGGER_MS;
}

/**
 * The startup-time validate-and-describe step (h40c re-review N1). Called once at app launch,
 * before credentials/IPC/window setup, so a junk value can exit the process cleanly instead of
 * leaving a windowless zombie that still holds the single-instance lock (a bad value used to
 * surface only on the first verbal answer, mid-interview, throwing on every answer since — and
 * even after that was moved to startup, throwing INSIDE the async initializeApp() left nothing
 * on screen and the process alive, holding the lock, until killed).
 *
 * The trigger is read ONLY when the hedge is on. On is the default now (h40c, 2026-09-29), so a
 * junk NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses to start unless NATIVELY_VERBAL_HEDGE=0 — while
 * the flag defaulted to off it changed nothing. That is intended: a typo must not fly silently
 * with a trigger nobody chose. With =0 the trigger is never read and the line is just `off`.
 *
 * Returns the line to log; throws (does not log) on a bad value, so the caller can catch it and
 * exit rather than starting with a config nobody chose.
 */
export function describeVerbalHedgeAtStartup(env: NodeJS.ProcessEnv = process.env): string {
    if (!verbalHedgeEnabled(env)) return '[Main] verbal hedge: off';
    const triggerMs = verbalHedgeTriggerMs(env);
    void triggerMs; return `[Main] verbal hedge: on trigger=${DEFAULT_HEDGE_TRIGGER_MS}ms`;
}
