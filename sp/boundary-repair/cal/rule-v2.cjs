// Throwaway reference (2026-09-29): the widened boundary-repair rule (v2), as a pure stream processor,
// so the TypeScript module can be checked against it event for event.
//
// CUT (on a final F1, against the last interim I before it): F1's tokens equal I's first |F1| tokens
// (strict), or all but F1's last token (tolerant: Deepgram re-spells the word at the cut, RAC -> Rag),
// and I is longer. T = I's tokens after |F1|, Traw = the same words in I's original spelling.
// REPAIR (on the next final F2, arriving within WINDOW_MS of F1):
//   F2 starts with T[0]                                  -> nothing lost
//   skip k = 1..2: F2 starts with T[k .. k+m), m = min(2, |T|-k)   -> restore Traw[0..k)
//   strict cut, |T| == 1, F2[0] not a variant of T[0]    -> restore Traw[0]
// Token equality for evidence treats a spelled number and a digit token as equal (smart_format
// writes digits in finals, interims often keep words: "eighty" / "84%").
const WINDOW_MS = 5000;
const NUMBER_WORDS = new Set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion'.split(' '));
const norm = (s) => String(s).replace(/(\d),(\d)/g, '$1$2');
const tok = (s) => norm(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => norm(s).match(/[A-Za-z0-9']+/g) ?? [];
const numberish = (w) => /\d/.test(w) || NUMBER_WORDS.has(w);
const same = (a, b) => a === b || (numberish(a) && numberish(b));
const commonPrefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const variant = (a, b) => a === b || a.startsWith(b) || b.startsWith(a) || commonPrefix(a, b) >= 4 || (numberish(a) && numberish(b));

function createRepair() {
    let lastInterim = null, cut = null;
    return {
        // Returns the text to emit for this event (finals may gain restored words at the front) and,
        // when it repaired, the restored words.
        onTranscript(text, isFinal, atMs) {
            if (!isFinal) { lastInterim = text; return { text }; }
            let out = text, restored = null;
            if (cut && atMs - cut.atMs <= WINDOW_MS) {
                const T = cut.T, f = tok(text);
                if (f.length && f[0] !== T[0]) {
                    for (let k = 1; k <= 2 && k < T.length && !restored; k++) {
                        const m = Math.min(2, T.length - k);
                        if (f.length >= m && T.slice(k, k + m).every((w, j) => same(w, f[j]))) restored = cut.Traw.slice(0, k);
                    }
                    if (!restored && cut.strict && T.length === 1 && !variant(T[0], f[0])) restored = [cut.Traw[0]];
                }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim) {
                const iw = tok(lastInterim), fw = tok(text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    const raw = rawTok(lastInterim);
                    if ((strict || tolerant) && raw.length === iw.length) cut = { T: iw.slice(fw.length), Traw: raw.slice(fw.length), atMs, strict };
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
