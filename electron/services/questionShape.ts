/**
 * Is a Live-claimed detection worth treating as a question at all?
 *
 * Run 2 (2026-09-03) showed Live firing on the STATEMENT half of a
 * two-sentence scenario question — e.g. "…a resource by hand and now your
 * stack will not update." — before the interviewer ever asked anything. The
 * STT window already contained that sentence, so reconcileLiveQuestion
 * happily returned verdict=match, and the app answered a sentence fragment
 * instead of the question that followed it (13 of 52 Live answers in run 2;
 * one 3-word fragment, "training jobs are", got answered outright).
 *
 * Two independent checks, both text-shape only — neither needs the STT
 * window or any reconcile machinery:
 *   isFragment       — too short to be anything (never held, never answered).
 *   isQuestionShaped — ends with "?" or opens with a question word. A
 *     statement that fails this is held the same way an unverifiable
 *     detection is (R37) — giving the STT a chance to catch up to the real
 *     question — rather than answered on the spot.
 */

const QUESTION_WORDS = new Set([
    'what', 'why', 'how', 'when', 'where', 'which', 'who', 'whom', 'whose',
    'would', 'could', 'should', 'can', 'do', 'does', 'did',
    'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will',
    'tell', 'describe', 'explain', 'walk', 'compare', 'discuss', 'talk',
    'name', 'list', 'give', 'share', 'imagine', 'suppose', 'say', 'let',
    'show', 'define', 'outline', 'summarize', 'summarise', 'contrast', 'justify',
]);

/** Trailing closing quotes/brackets a "?" may sit behind, e.g. `she asked "why?"`. */
const TRAILING_CLOSERS = /[")\]'’”»›]+$/;

export function isFragment(text: string): boolean {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length < 4;
}

export function isQuestionShaped(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (/[?？]$/.test(trimmed.replace(TRAILING_CLOSERS, ''))) return true;
    const firstToken = trimmed.split(/\s+/)[0] ?? '';
    const firstWord = firstToken.toLowerCase().replace(/[^a-z]/g, '');
    return QUESTION_WORDS.has(firstWord);
}
