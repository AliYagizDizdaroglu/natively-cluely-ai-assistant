/**
 * The ANSWER SHAPE for an "extend" answer (main.ts dispatch: extend): the head of
 * the question was already answered aloud and the fuller sentence adds a clause.
 * after8 (2026-09-07): with the default shape the six extensions re-answered the
 * whole question, four of them restating the head almost verbatim (104–114 words
 * combined). Spike on those six (gemini-3.1-flash-lite, 3 reps each): default shape
 * p50 58 words; this shape p50 27 words, every extension on the added clause.
 */
export function extensionAnswerShape(head: string): string {
    return `You have ALREADY answered the first part of this question aloud ("${head}"). Say only what the added part of the fuller question asks, in at most two sentences and under 30 words. Do not repeat, summarise or reintroduce your earlier answer; start directly with the new point.`;
}
