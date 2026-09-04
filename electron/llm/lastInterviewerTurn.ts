/**
 * The question to classify is the interviewer's last turn — never the composed
 * prompt. The prompt carries prior assistant suggestions (which can contain
 * coaching vocabulary) and framing text, and classifying it kept every
 * technical question in the negotiation path on 2026-09-02.
 */
export function lastInterviewerTurn(transcript: string): string {
    const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean);
    let sawOtherSpeakerLabel = false;
    for (let i = lines.length - 1; i >= 0; i--) {
        const m = lines[i].match(/^\[INTERVIEWER\]:\s*(.*)$/);
        if (m) return m[1].trim();
        if (/^\[[A-Z0-9 ()]+\]:/.test(lines[i])) sawOtherSpeakerLabel = true;
    }
    // Speaker labels are in use (e.g. [ME]:, [ASSISTANT (PREVIOUS SUGGESTION)]:)
    // but none is [INTERVIEWER] — there is no interviewer turn yet. Falling
    // back to whatever the last labelled line was handed a [ME]/[ASSISTANT]
    // line to the classifier as if it were the interviewer's question.
    if (sawOtherSpeakerLabel) return '';
    return lines.length ? lines[lines.length - 1] : '';
}

import { sameAnchor } from '../services/questionReconcile';

const INTERVIEWER_LINE = /^\[INTERVIEWER\]:\s*(.*)$/;

/**
 * Rewrite a prepared transcript so its last interviewer line is `question`.
 *
 * runWhatShouldISay never showed the model the question it was dispatched
 * with: the prompt ended with whatever STT line was last, and on 2026-09-04
 * that line was "Cross many model services." / "Serving." / "What do you do?"
 * — four wrong answers from correctly dispatched questions (spec §1).
 *
 * The trailing run of [INTERVIEWER] lines is the current utterance as STT
 * heard it. Every line in that run that is the same utterance as `question`
 * (sameAnchor: containment either way, or ≥ 50 % content-word overlap) is
 * absorbed; a trailing line that is a different utterance — an earlier,
 * unanswered question — stays in place. The settled question is appended as
 * the last line, so lastInterviewerTurn() and the knowledge lookup both read
 * it back.
 */
export function pinSettledQuestion(transcript: string, question: string): string {
    const q = question.trim();
    const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean);
    let start = lines.length;
    while (start > 0 && INTERVIEWER_LINE.test(lines[start - 1])) start--;
    const kept = lines.slice(0, start);
    for (const line of lines.slice(start)) {
        const text = (line.match(INTERVIEWER_LINE)?.[1] ?? '').trim();
        if (!sameAnchor(text, q)) kept.push(line);
    }
    kept.push(`[INTERVIEWER]: ${q}`);
    return kept.join('\n');
}
