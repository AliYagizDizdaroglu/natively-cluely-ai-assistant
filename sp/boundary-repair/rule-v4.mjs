// Reference (2026-09-29, v4; revised after the Opus review of DESIGN-v4): boundary-repair rule v4 = v3 plus
// the fixes of the two spec reviews (DESIGN-v4.md). Everything not named below is exactly rule-v3.mjs.
//   1. The tolerant cut only accepts a RE-SPELLING of the interim's token at the cut ("RAC" -> "Rag"):
//      F1's last token must share its first letter with the interim token at that position, hold no digit
//      (smart_format writes "ninety two percent" as "92%": one final token over three interim words), and
//      be no longer than that token. A longer final token absorbed more audio than the interim's word — a
//      merge of several interim words ("all right" -> "Alright", "fifteen percent" -> "15%"), which shifts
//      T and restores the wrong words (the review's probe: "two percent For each of those metrics, ...").
//      Measured on the NON-HOLDOUT logs + seam recordings (check-v4.out.txt): 42 tolerant cuts, 34 kept
//      (every kept last token is no longer than the interim's: "xgboost" -> "xg", "dashboard" -> "dash",
//      "rac" -> "rag"), 7 refused as longer ("break" -> "breaks"), 1 for a digit ("ninety" -> "92"), 0 for
//      the first letter — that rule rests only on the synthetic "put" for "cut" case. The controller's
//      "starts with the interim token and is longer" test is a special case of the length test and does NOT
//      refuse "Alright" (the spelling drops an "l"). KNOWN RECALL COST (review M1): an inflection is longer
//      too, and the 7 "breaks" cuts are aligned (F2 resumed at T[0], nothing lost); a loss right after an
//      inflected cut ("scale" -> "scales", then "horizontally" lost) was restored by v3 and is not by v4.
//   2. v2's alignment guard is back: no cut when rawTok(I) and tok(I) differ in length (a letter whose
//      lowercase is more than one ASCII run, "İzmir" -> "i" + "zmir", shifts Traw against T). And (review
//      M2) no cut when the INTERIM holds any non-ASCII letter: accented English stays aligned ("résumé" ->
//      "r" + "sum") and would be restored as fragments ("r sum and your last role"). 0 such interims in the
//      28 English logs and the seam recordings; the guard also covers es/ru text if the adapter's English
//      gate were ever bypassed.
//   3. A pause forgets the cut: clear() (the adapter calls it on an empty final and on UtteranceEnd), and a
//      final with speechFinal = true (Deepgram heard the utterance end there) leaves no cut. The repair of
//      F2 itself does not depend on F2's speechFinal.
// Language gating (English only) is the adapter's, not the rule's.
//
// CUT (on a final F1, against the last interim I before it): F1's tokens equal I's first |F1| tokens
// (strict), or all but F1's last token, which must be a re-spelling (tolerant), and I is longer, ASCII-
// lettered and aligned. T = I's tokens after |F1|, Traw = the same words in I's original spelling.
// REPAIR (on the next final F2, arriving within WINDOW_MS of F1, no clear() between):
//   F2 starts with T[0]                                             -> nothing lost
//   skip k = 1..2: F2's first m tokens == T[k .. k+m), m = min(2, |T|-k)   -> restore Traw[0..k)
export const WINDOW_MS = 5000;
const norm = (s) => String(s).replace(/(\d),(\d)/g, '$1$2');
export const tok = (s) => norm(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => norm(s).match(/[A-Za-z0-9']+/g) ?? [];
/** A letter (or combining mark) outside ASCII: the tokenisers split such a word into fragments. */
export const NON_ASCII_LETTER = /(?![\x00-\x7F])[\p{L}\p{M}]/u;
/** F1's last token may only be a re-spelling of the interim's token at that position: same first letter, no digit, no longer. */
export const respelling = (finalTok, interimTok) =>
    finalTok[0] === interimTok[0] && !/\d/.test(finalTok) && finalTok.length <= interimTok.length;

export function createRepair() {
    let lastInterim = null, cut = null;
    return {
        clear() { cut = null; lastInterim = null; },
        onTranscript(text, isFinal, atMs, speechFinal = false) {
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
            if (lastInterim && !speechFinal && !NON_ASCII_LETTER.test(lastInterim)) {
                const iw = tok(lastInterim), fw = tok(text), raw = rawTok(lastInterim);
                if (fw.length > 0 && fw.length < iw.length && raw.length === iw.length) {
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
