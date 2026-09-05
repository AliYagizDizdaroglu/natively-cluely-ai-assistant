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
    'would', 'could', 'should', 'can',
    'tell', 'describe', 'explain', 'walk', 'compare',
]);

/** Trailing closing quotes/brackets a "?" may sit behind, e.g. `she asked "why?"`. */
const TRAILING_CLOSERS = /[")\]'’”»›]+$/;

/**
 * A last-resort filter for the Groq-detector-unavailable fallback (run 3:
 * the free-tier daily token limit hit mid-interview, detect() returned null
 * on 64 of 85 calls): true iff the normalized text ends with "?"/"？"
 * (closing quotes/brackets allowed after it) or its first word is one of a
 * small set of interview-opener words. This is an outage-only heuristic: a
 * false positive here does not just show a stray chip, it gets answered
 * hands-free (round 8) — so the word list is deliberately narrow, kept to
 * words that plausibly open an interview question and excluding ones (is,
 * do, will, let, give, ...) that just as commonly open a plain statement
 * ("Let me tell you...", "Is that clear.", "Give it a minute."). Round 4
 * withdrew a broader version of this same shape check as isQuestionShaped;
 * revived here, narrower, for a different purpose (filtering a
 * heuristically-joined final before it becomes a chip, not gating a hold).
 */
export function looksLikeQuestion(text: string): boolean {
    const trimmed = normalizeQuestionText(text);
    if (!trimmed) return false;
    if (/[?？]$/.test(trimmed.replace(TRAILING_CLOSERS, ''))) return true;
    const firstToken = trimmed.split(/\s+/)[0] ?? '';
    const firstWord = firstToken.toLowerCase().replace(/[^a-z]/g, '');
    return QUESTION_WORDS.has(firstWord);
}

const FRAGMENT_CONJUNCTIONS = /^(and|so|but|or|then|because)\b/i;

/**
 * First words that make a short, unpunctuated text a plausible whole question
 * or request. Wider than QUESTION_WORDS above on purpose: that list gates
 * an outage-only chip (a false positive there gets answered), this one only
 * decides whether to wait ≤ 2.5 s for the other ear (a false negative here
 * costs nothing).
 */
const FRAGMENT_OPENERS = new Set([
    'what', 'why', 'how', 'when', 'where', 'which', 'who', 'whom', 'whose',
    'can', 'could', 'would', 'should', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'will', 'have', 'has',
    'tell', 'walk', 'describe', 'explain', 'give', 'compare', 'imagine', 'suppose', 'say', 'let',
]);

/** Terminal punctuation a whole sentence ends on (closing quotes/brackets allowed after it). */
const TERMINAL_PUNCTUATION = /[.!?？…]["'”’)\]]*$/;

/**
 * Last words no English sentence ends on — determiners, prepositions,
 * conjunctions, possessives — plus "that", which the corpus shows ending
 * Whisper heads six times ("…a pipeline that", "…a model that") and whole
 * questions never. A text with no terminal punctuation that ends on one of
 * these was cut mid-clause: Groq REST's six-second chunks did that to seven
 * of the 2026-09-04 after5 hour's questions. Verbs and pronouns that can end
 * a question (do, is, not, …) are deliberately absent, so a degraded-detector
 * chip that only lost its punctuation ("…will not update What do you do")
 * is not held (spec 2026-09-05 §3).
 */
const TRAILING_FUNCTION_WORDS = new Set([
    'that', 'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'into', 'on', 'at', 'with', 'without',
    'from', 'by', 'as', 'like', 'than', 'because', 'if', 'while', 'your', 'our', 'their', 'its', 'my', 'his', 'her',
]);

/**
 * Is this detection text not a whole question — an STT tail or head the other
 * ear may still complete? True when it has fewer than 4 words, opens with a
 * coordinating conjunction ("And when would you not?", 2026-09-04 M27), has no
 * terminal punctuation and is either at most 6 words ("What problem does
 * infrastructure", after5 W09) or ends on a word no sentence ends on ("How
 * would you design a pipeline that", after5 H03), or is at most 6 words with
 * no terminal '?' and no question/imperative opener ("Cross many model
 * services."). Measured: 317 chip and Live texts from four Deepgram hours → 2
 * flagged, both real fragments (parent spec §3.1); the after5 Groq REST hour's
 * 58 full chip texts → 6 more flagged, all six real heads, 0 of the 55 scripted
 * questions (spec 2026-09-05 §1). A whole question that lost its punctuation
 * and ends on one of those words waits at most 2.5 s for the other ear.
 */
export function looksFragmentary(text: string): boolean {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (!TERMINAL_PUNCTUATION.test(trimmed)) {
        if (words.length <= 6) return true;
        const last = words[words.length - 1].toLowerCase().replace(/[^a-z']+/g, '');
        if (TRAILING_FUNCTION_WORDS.has(last)) return true;
    }
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, '');
    return !FRAGMENT_OPENERS.has(first);
}
