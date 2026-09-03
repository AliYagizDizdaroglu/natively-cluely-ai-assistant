/**
 * Is a Live-claimed detection too short to be anything at all?
 *
 * Run 2 (2026-09-03) originally looked like Live firing on the STATEMENT
 * half of a two-sentence scenario question and answering it outright. That
 * diagnosis (R42) turned out to be a misread: the short strings it cited were
 * the dispatch log's `anchor=` field — the matched STT sentence — not the
 * Live-claimed `question` text, which was the full question and was answered
 * in full (verified against the real log's "Live question" lines, which log
 * `question`, separately from the dispatch line's `anchor`). A companion
 * question-shape hold (isQuestionShaped) built on that misdiagnosis was
 * withdrawn (R44) — on run 2's actual Live question texts it never held
 * anything real, and it opened a new silent-discard path on resolve. Only
 * the one check that measures something real is kept:
 *   isFragment — too short to be anything (never admitted, never answered).
 */

export function isFragment(text: string): boolean {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length < 4;
}

/**
 * Collapse STT ellipsis/period runs into a single space, then collapse
 * whitespace. Run 3's degraded-detection join (QuestionDetector.ts, Ruling:
 * heuristic chip when the detector is unavailable) concatenates two
 * interviewer finals that each trail off with "..."/"…." at a sentence
 * break — e.g. "...actually..." + " solve...." — and this is the shared
 * cleanup both looksLikeQuestion and that join apply, so the two never
 * silently diverge on what "the text" is.
 */
export function normalizeQuestionText(text: string): string {
    return text.replace(/[.…]+/g, ' ').replace(/\s+/g, ' ').trim();
}

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

/**
 * A last-resort filter for the Groq-detector-unavailable fallback (run 3:
 * the free-tier daily token limit hit mid-interview, detect() returned null
 * on 64 of 85 calls): true iff the normalized text ends with "?"/"？"
 * (closing quotes/brackets allowed after it) or its first word is a
 * question word. The same shape check R44 withdrew as isQuestionShaped —
 * revived here for a narrower purpose (filtering a heuristically-joined
 * final before it becomes a chip, not gating a hold).
 */
export function looksLikeQuestion(text: string): boolean {
    const trimmed = normalizeQuestionText(text);
    if (!trimmed) return false;
    if (/[?？]$/.test(trimmed.replace(TRAILING_CLOSERS, ''))) return true;
    const firstToken = trimmed.split(/\s+/)[0] ?? '';
    const firstWord = firstToken.toLowerCase().replace(/[^a-z]/g, '');
    return QUESTION_WORDS.has(firstWord);
}
