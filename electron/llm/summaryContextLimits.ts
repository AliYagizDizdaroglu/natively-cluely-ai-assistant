// electron/llm/summaryContextLimits.ts
// How much transcript the end-of-meeting title/summary calls may send.
//
// WHY THESE EXIST: MeetingPersistence used context.substring(0, 10000) for the
// summary and substring(0, 5000) for the title. Measured against a transcript
// built at 150 wpm, 10k chars is ~the first 10.2 minutes of speech REGARDLESS of
// how long the meeting ran — so a 90-minute interview was summarized from 11.4%
// of itself, and every later topic was discarded before the model saw it.
//
// That was never a model-capacity limit. Measured with the countTokens API:
//   60 min  ->  58,708 chars ->  13,448 tokens
//   90 min  ->  88,012 chars ->  20,159 tokens
//  120 min  -> 117,313 chars ->  26,870 tokens
// against Gemini Flash's 1,048,576-token window. LLMHelper.generateMeetingSummary
// ALREADY routes by size (Groq below ~100k estimated tokens, Gemini Flash above),
// so the caller only needs a sane upper bound, not a 10k truncation.
//
// Deliberately dependency-free so it can be unit-tested without pulling in
// LLMHelper or better-sqlite3.

/**
 * Upper bound on summary context, in characters.
 *
 * Derived, not arbitrary: generateMeetingSummary estimates tokens as ceil(len/4)
 * and prefers Groq while that estimate stays under 100,000. 400,000 chars is
 * exactly that threshold, so the cap keeps the preferred provider reachable while
 * still covering a ~6.8-hour meeting (at the ~980 chars/min measured above).
 */
export const SUMMARY_CONTEXT_CHAR_CAP = 400_000;

/**
 * Upper bound on title context, in characters (~20 minutes of speech).
 *
 * Smaller than the summary cap on purpose: a title is 3-6 words, so sending a
 * full multi-hour transcript to produce one is waste. 5,000 chars was too little
 * to name a 90-minute meeting — 20,000 covers enough of the opening arc to be
 * representative without paying for the whole session.
 */
export const TITLE_CONTEXT_CHAR_CAP = 20_000;

/** Clamp transcript context to `cap` characters. */
export function clampSummaryContext(context: string, cap: number): string {
    if (!context) return '';
    return context.length <= cap ? context : context.substring(0, cap);
}
