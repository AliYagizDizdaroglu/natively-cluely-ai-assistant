var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var stdin_exports = {};
__export(stdin_exports, {
  createBoundaryRepair: () => createBoundaryRepair
});
module.exports = __toCommonJS(stdin_exports);
const REPAIR_WINDOW_MS = 5e3;
const MAX_SKIPPED_WORDS = 2;
const RESUME_MATCH_WORDS = 2;
const stripThousands = (s) => s.replace(/(\d),(\d)/g, "$1$2");
const tok = (s) => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];
const NON_ASCII_LETTER = /(?![\x00-\x7F])[\p{L}\p{M}]/u;
const isRespelling = (finalTok, interimTok) => finalTok[0] === interimTok[0] && !/\d/.test(finalTok) && finalTok.length < interimTok.length;
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
      if (lastInterim && !speechFinal && !NON_ASCII_LETTER.test(lastInterim)) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBoundaryRepair
});
