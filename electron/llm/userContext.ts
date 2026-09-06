/**
 * The Profile Intelligence custom notes ("context the AI should know about you") as a system
 * prompt block. One builder for every path that speaks for the user: generateSuggestion used
 * this exact text; the hands-free answer paths (streamChat with the verbal prompt, the fast
 * Flash path) now append it too — before, notes never reached a hands-free answer at all.
 *
 * Measured 2026-09-06 (spike, 52 questions, gemini-3.1-flash-lite): a page of prep notes in
 * this block lifted the uncut answer arm from 46 to 51 of 52 acceptable and fixed the three
 * recurrent knowledge gaps; the placeholder-style notes (numbers, solved problems, salary
 * floor) and a pasted job description both belong here.
 */
export function userContextBlock(notes: string | null | undefined): string {
    const trimmed = (notes ?? '').trim();
    if (!trimmed) return '';
    return `\n\n<user_context>\n${trimmed}\n</user_context>\nUse this context naturally if relevant. Never quote it verbatim.`;
}
