// Throwaway (2026-09-29): calibration spy for seam-analyze.mjs --v4. Passes text through unchanged and, on
// exit, prints how often the wiring called clear() and passed speechFinal = true, so those counts can be held
// against the recording's own utterance-end + empty-final count and its speech_final finals.
const n = { clear: 0, sf: 0, calls: 0 };
process.on('exit', () => console.log(`SPY clear() ${n.clear}; onTranscript ${n.calls}; speechFinal=true ${n.sf}`));
export function createBoundaryRepair() {
    return {
        clear() { n.clear++; },
        onTranscript(text, isFinal, atMs, speechFinal) { n.calls++; if (speechFinal === true) n.sf++; return { text, restored: null }; },
    };
}
