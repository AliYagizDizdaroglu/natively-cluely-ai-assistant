/**
 * The question to classify is the interviewer's last turn — never the composed
 * prompt. The prompt carries prior assistant suggestions (which can contain
 * coaching vocabulary) and framing text, and classifying it kept every
 * technical question in the negotiation path on 2026-09-02.
 */
export function lastInterviewerTurn(transcript: string): string {
    const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
        const m = lines[i].match(/^\[INTERVIEWER\]:\s*(.*)$/);
        if (m) return m[1].trim();
    }
    return lines.length ? lines[lines.length - 1] : '';
}
