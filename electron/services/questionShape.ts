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
