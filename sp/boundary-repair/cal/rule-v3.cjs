// Throwaway reference (2026-09-29): boundary-repair rule v3 = v2 without its two branches that failed
// validation on holdout (v2: non-holdout 34 TRUE / 0 FALSE, holdout 4 TRUE / 4 FALSE):
//   - the "interim ended at the cut" branch (|T| == 1): text cannot tell a lost word from Deepgram
//     re-hearing the same audio at the start of F2 ("two" -> "to", "fee" -> "feature");
//   - spelled-number == digit evidence ("one" matched "4" and restored "four point" before "4.1%").
// What remains needs F2 to visibly resume the interim AFTER the lost word(s), with exact tokens.
//
// CUT (on a final F1, against the last interim I before it): F1's tokens equal I's first |F1| tokens
// (strict), or all but F1's last token (tolerant: Deepgram re-spells the word at the cut, RAC -> Rag),
// and I is longer. T = I's tokens after |F1|, Traw = the same words in I's original spelling.
// REPAIR (on the next final F2, arriving within WINDOW_MS of F1):
//   F2 starts with T[0]                                             -> nothing lost
//   skip k = 1..2: F2's first m tokens == T[k .. k+m), m = min(2, |T|-k)   -> restore Traw[0..k)
const WINDOW_MS = 5000;
const norm = (s) => String(s).replace(/(\d),(\d)/g, '$1$2');
const tok = (s) => norm(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => norm(s).match(/[A-Za-z0-9']+/g) ?? [];

function createRepair() {
    let lastInterim = null, cut = null;
    return {
        onTranscript(text, isFinal, atMs) {
            if (!isFinal) { lastInterim = text; return { text }; }
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
            if (lastInterim) {
                const iw = tok(lastInterim), fw = tok(text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: rawTok(lastInterim).slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}

function createBoundaryRepair() {
    const r = createRepair();
    return { onTranscript(t, f, a) { const o = r.onTranscript(t, f, a); return { text: o.text, restored: o.restored ?? null }; } };
}
module.exports = { createBoundaryRepair };
