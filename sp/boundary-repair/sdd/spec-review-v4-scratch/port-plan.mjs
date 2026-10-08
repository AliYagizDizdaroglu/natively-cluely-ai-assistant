const REPAIR_WINDOW_MS = 5e3;
const MAX_SKIPPED_WORDS = 2;
const RESUME_MATCH_WORDS = 2;
const stripThousands = (s) => s.replace(/(\d),(\d)/g, "$1$2");
const tok = (s) => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];
const isRespelling = (finalTok, interimTok) => finalTok[0] === interimTok[0] && !/\d/.test(finalTok) && finalTok.length <= interimTok.length;
function createBoundaryRepair() {
  let lastInterim = null;
  let cut = null;
  return {
    clear() {
      cut = null;
      lastInterim = null;
    },
    onTranscript(text, isFinal, atMs, speechFinal = false) {
      if (!isFinal) {
        lastInterim = text;
        return { text, restored: null };
      }
      let out = text;
      let restored = null;
      const remembered = cut;
      if (remembered && atMs - remembered.atMs <= REPAIR_WINDOW_MS) {
        const T = remembered.T, f = tok(text);
        if (f.length && f[0] !== T[0]) {
          for (let k = 1; k <= MAX_SKIPPED_WORDS && k < T.length && !restored; k++) {
            const m = Math.min(RESUME_MATCH_WORDS, T.length - k);
            if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = remembered.Traw.slice(0, k);
          }
        }
        if (restored) out = `${restored.join(" ")} ${text}`;
      }
      cut = null;
      if (lastInterim && !speechFinal) {
        const iw = tok(lastInterim), fw = tok(text), raw = rawTok(lastInterim);
        if (fw.length > 0 && fw.length < iw.length && raw.length === iw.length) {
          const strict = fw.every((w, i) => w === iw[i]);
          const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]) && isRespelling(fw[fw.length - 1], iw[fw.length - 1]);
          if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: raw.slice(fw.length), atMs };
        }
      }
      lastInterim = null;
      return { text: out, restored };
    }
  };
}
export {
  createBoundaryRepair
};
