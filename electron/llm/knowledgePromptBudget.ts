import { SPOKEN_LENGTH_AND_DEPTH } from './prompts';

/**
 * When the Context toggle's knowledge engine replaces the caller's system prompt, keep the
 * caller's counted word budget.
 *
 * Why: the verbal answer prompt ends with SPOKEN_LENGTH_AND_DEPTH ("AT MOST 60 words"), the
 * knowledge prompt only says "~20-30 seconds", which a model cannot count (see the comment on
 * SPOKEN_LENGTH_AND_DEPTH). Measured 2026-09-06 (52 questions, gemini-3.1-flash-lite, uncut):
 * knowledge prompt alone p50 100 words, 48 of 52 over 80; knowledge prompt + this block p50 57,
 * none over 80, 51 of 52 acceptable. In the app the overflow was the flat 87/89/90-word hour
 * (after7) and the tail sentences lost to the 80-word cut.
 *
 * Only callers that carried the block get it back — typed chat and code hints never had one.
 */
export function keepSpokenBudget(callerOverride: string | undefined, injected: string): string {
    if (!callerOverride || !callerOverride.includes(SPOKEN_LENGTH_AND_DEPTH)) return injected;
    return `${injected}\n${SPOKEN_LENGTH_AND_DEPTH}`;
}
