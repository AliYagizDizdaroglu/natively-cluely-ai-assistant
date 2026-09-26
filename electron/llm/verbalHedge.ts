/**
 * The verbal hedge (NATIVELY_VERBAL_HEDGE): gemini-3.5-flash-lite (HIGH) starts first; with no
 * first token by the trigger, or a failure before its first token, gemini-3.1-flash-lite (LOW)
 * is started beside it and the first token wins. Default OFF so a flight can compare the two —
 * see docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md and LLMHelper.streamGeminiWithHedge.
 *
 * Same shape as geminiThinkingLevelFromEnv/firstTokenTimeoutMs: unset/empty/'0' is off, '1' is
 * on, anything else throws — a typo must not fly silently OFF.
 */
export const VERBAL_HEDGE_ENV = 'NATIVELY_VERBAL_HEDGE';
export const VERBAL_HEDGE_TRIGGER_ENV = 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS';
// The value probed 2026-09-25 (H1-H3), fixed before any counted window.
export const DEFAULT_HEDGE_TRIGGER_MS = 5000;

export function verbalHedgeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env[VERBAL_HEDGE_ENV]?.trim();
    if (!raw || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(`${VERBAL_HEDGE_ENV}="${raw}" is not "1" or "0"/unset; a typo must not fly silently off`);
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
 * The trigger is read ONLY when the hedge is on: a junk NATIVELY_VERBAL_HEDGE_TRIGGER_MS changed
 * nothing while the flag was unset before this function existed, and must still change nothing —
 * an unset flag is exactly today's behaviour apart from the one `off` log line.
 *
 * Returns the line to log; throws (does not log) on a bad value, so the caller can catch it and
 * exit rather than starting with a config nobody chose.
 */
export function describeVerbalHedgeAtStartup(env: NodeJS.ProcessEnv = process.env): string {
    if (!verbalHedgeEnabled(env)) return '[Main] verbal hedge: off';
    const triggerMs = verbalHedgeTriggerMs(env);
    return `[Main] verbal hedge: on trigger=${triggerMs}ms`;
}
