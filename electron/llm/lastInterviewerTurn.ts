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
