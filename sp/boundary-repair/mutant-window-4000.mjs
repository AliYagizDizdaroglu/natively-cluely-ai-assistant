// Calibration mutant (2026-09-29, re-review M-c): rule-v4's body with ONE change — the repair window is 4000 ms
// instead of 5000. check-v4-built.mjs --calibrate must report it NOT EQUIVALENT (the 5000 ms window probe).
// rule-v4.mjs itself is not touched; this file carries its own copy of the logic.
import { tok, respelling, NON_ASCII_LETTER } from './rule-v4.mjs';
const WINDOW_MS = 4000;   // MUTANT (the reference: 5000)
const norm = (s) => String(s).replace(/(\d),(\d)/g, '$1$2');
const rawTok = (s) => norm(s).match(/[A-Za-z0-9']+/g) ?? [];
export function createBoundaryRepair() {
    let lastInterim = null, cut = null;
    return {
        clear() { cut = null; lastInterim = null; },
        onTranscript(text, isFinal, atMs, speechFinal = false) {
            if (!isFinal) { lastInterim = text; return { text, restored: null }; }
            let out = text, restored = null;
            if (cut && atMs - cut.atMs <= WINDOW_MS) {
                const T = cut.T, f = tok(text);
                if (f.length && f[0] !== T[0]) {
                    for (let k = 1; k <= 2 && k < T.length && !restored; k++) {
                        const m = Math.min(2, T.length - k);
                        if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = cut.Traw.slice(0, k);
                    }
                }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim && !speechFinal && !NON_ASCII_LETTER.test(lastInterim)) {
                const iw = tok(lastInterim), fw = tok(text), raw = rawTok(lastInterim);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]) && respelling(fw[fw.length - 1], iw[fw.length - 1]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: raw.slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
