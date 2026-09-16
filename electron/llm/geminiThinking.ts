/**
 * Thinking level for the verbal Gemini request, from the environment.
 *
 * Every flight through s50f sent no thinkingConfig, which on gemini-3.1-flash-lite is
 * MINIMAL: probes on the app's own captured call (2026-09-15) reported no thought tokens
 * and the CV-numbers question wrong 10 of 10 times, while thinkingLevel LOW spent 143–782
 * thought tokens and derived the numbers both times. The level is a flight variable now,
 * like the turn constants: the launcher sets NATIVELY_GEMINI_THINKING_LEVEL, the request
 * carries it, and the usage line logged per answer shows what the model actually spent.
 *
 * Unset means "send nothing" (the provider default), so a build without the variable
 * behaves exactly as before. A value outside the four documented levels is refused at
 * startup rather than sent, because the API would otherwise fail every answer of the hour.
 */
export const GEMINI_THINKING_LEVELS = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'] as const;
export type GeminiThinkingLevel = (typeof GEMINI_THINKING_LEVELS)[number];

export function geminiThinkingLevelFromEnv(env: NodeJS.ProcessEnv = process.env): GeminiThinkingLevel | undefined {
    const raw = env.NATIVELY_GEMINI_THINKING_LEVEL?.trim();
    if (!raw) return undefined;
    const level = raw.toUpperCase();
    if (!(GEMINI_THINKING_LEVELS as readonly string[]).includes(level)) {
        throw new Error(`NATIVELY_GEMINI_THINKING_LEVEL="${raw}" is not a Gemini thinking level; use one of ${GEMINI_THINKING_LEVELS.join(', ')} or leave it unset`);
    }
    return level as GeminiThinkingLevel;
}

/**
 * How long the verbal answer's stall race gives the primary model to produce its first
 * token before the answer is taken from the other Flash Lite.
 *
 * 4000 ms was tuned on default-level hours (first token p90 1.6 s on s50e, 3.4 s on s50f).
 * A thinking level moves the whole distribution — s50g at LOW: p50 5.1 s, p90 7.8 s — so
 * the same 4 s would have replaced most thinking answers with the fallback's default-level
 * ones, the opposite of what the level was set for; 10000 ms sits above that p90 with room.
 * NATIVELY_FIRST_TOKEN_TIMEOUT_MS overrides both (a smoke forces the race with a value
 * below any real first-token time); anything but a positive whole number is refused.
 */
export function firstTokenTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
    const raw = env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS?.trim();
    if (raw) {
        if (!/^\d+$/.test(raw) || Number(raw) < 1) {
            throw new Error(`NATIVELY_FIRST_TOKEN_TIMEOUT_MS="${raw}" is not a positive whole number of milliseconds; unset it for the default`);
        }
        return Number(raw);
    }
    const level = geminiThinkingLevelFromEnv(env);
    return level && level !== 'MINIMAL' ? 10000 : 4000;
}
