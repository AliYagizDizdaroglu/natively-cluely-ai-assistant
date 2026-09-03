import { jaccardSimilarity } from './jaccardSimilarity';

/**
 * The gap (ms) within which two consecutive interviewer finals are treated as
 * one turn split by STT segmentation: the two sentences of one scenario
 * question ("A SageMaker endpoint... has p99 latency creeping up. How do you
 * diagnose and fix it?") arrive within a few seconds of each other. A
 * question after a longer pause is its own, unrelated turn.
 */
const MERGE_MAX_GAP_MS = 6000;

/** Lowercase, collapse whitespace, strip trailing punctuation. */
function norm(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.,!?;:]+$/, '');
}

/** Same shape as isCompleteQuestionText's ending check (QuestionDetector.ts):
 *  a '?'/'？' optionally followed by closing quotes/brackets. */
function endsAsQuestion(text: string): boolean {
    return /[?？]["'”’)\]]*$/.test(text.trim());
}

interface Final { text: string; refTime: number }

/**
 * The STT detection prompt asks the model to return a two-clause question
 * complete with the scenario sentence it depends on, but the model is not
 * reliable at that (calibrated live: some shapes never merge). This makes the
 * merge deterministic in code: if `question` is (or came from) the most
 * recent interviewer final `cur`, and the final just before it (`prev`) reads
 * like the scenario statement the question depends on, prefix it in.
 *
 * Returns `question` unchanged unless EVERY one of the following holds:
 *  - both `prev` and `cur` are present;
 *  - `question` came from `cur` (near-verbatim or highly similar) — otherwise
 *    we cannot be sure the model is even talking about this turn;
 *  - `prev` is a statement, not a question, and substantive (>=4 words) —
 *    filters out "Great, thanks." / "Next question." style filler;
 *  - `cur` followed `prev` within MERGE_MAX_GAP_MS — otherwise they are not
 *    one interviewer turn;
 *  - `question` does not already include `prev`'s text — the model sometimes
 *    already returns both sentences (H03/W01 shape) and must not be doubled;
 *  - `question` is at most 12 words — a long question is already complete;
 *    prefixing would risk attaching an unrelated sentence.
 */
export function mergeScenarioSentence(question: string, prev: Final | undefined, cur: Final | undefined): string {
    if (!prev || !cur) return question;

    const normQuestion = norm(question);
    const normCur = norm(cur.text);
    const normPrev = norm(prev.text);

    const questionIsFromCur = normCur.includes(normQuestion) || jaccardSimilarity(cur.text, question) >= 0.5;
    if (!questionIsFromCur) return question;

    if (endsAsQuestion(prev.text)) return question;
    if (prev.text.trim().split(/\s+/).length < 4) return question;

    if (cur.refTime - prev.refTime > MERGE_MAX_GAP_MS) return question;

    const questionAlreadyHasStatement = normQuestion.includes(normPrev) || jaccardSimilarity(prev.text, question) >= 0.5;
    if (questionAlreadyHasStatement) return question;

    if (question.trim().split(/\s+/).length > 12) return question;

    return `${prev.text.trim()} ${question.trim()}`;
}
