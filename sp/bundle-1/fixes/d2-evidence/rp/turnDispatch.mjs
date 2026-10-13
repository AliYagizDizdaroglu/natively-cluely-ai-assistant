// electron/services/turnDispatch.ts
function pickTurnDetection(current, incoming) {
  if (!current) return incoming;
  const verified = (v) => v === "match" || v === "paraphrase";
  return !verified(current.verdict) && verified(incoming.verdict) ? incoming : current;
}
function turnDispatchInput(base, d, turnId) {
  return { ...base, question: d.text, anchor: d.text, liveTexts: d.live, turnDispatch: true, resolving: true, ...turnId != null ? { turnId } : {} };
}
var LATE_FINAL_CHIP_MS = 5e3;
var wordsOf = (s) => (s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).join(" ");
function isLateFinalChip(question, absorbed, now) {
  const q = wordsOf(question);
  if (!q) return false;
  return absorbed.some((a) => now - a.at <= LATE_FINAL_CHIP_MS && ` ${wordsOf(a.text)} `.includes(` ${q} `));
}
export {
  LATE_FINAL_CHIP_MS,
  isLateFinalChip,
  pickTurnDetection,
  turnDispatchInput
};
