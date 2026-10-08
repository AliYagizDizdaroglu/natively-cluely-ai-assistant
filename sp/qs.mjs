// electron/services/questionShape.ts
function isFragment(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length < 4;
}
function normalizeQuestionText(text) {
  return text.replace(/[.…]+/g, " ").replace(/\s+/g, " ").trim();
}
var QUESTION_WORDS = /* @__PURE__ */ new Set([
  "what",
  "why",
  "how",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "whose",
  "would",
  "could",
  "should",
  "can",
  "tell",
  "describe",
  "explain",
  "walk",
  "compare"
]);
var TRAILING_CLOSERS = /[")\]'’”»›]+$/;
function looksLikeQuestion(text) {
  const trimmed = normalizeQuestionText(text);
  if (!trimmed) return false;
  if (/[?？]$/.test(trimmed.replace(TRAILING_CLOSERS, ""))) return true;
  const firstToken = trimmed.split(/\s+/)[0] ?? "";
  const firstWord = firstToken.toLowerCase().replace(/[^a-z]/g, "");
  return QUESTION_WORDS.has(firstWord);
}
var FRAGMENT_CONJUNCTIONS = /^(and|so|but|or|then|because)\b/i;
var FRAGMENT_OPENERS = /* @__PURE__ */ new Set([
  "what",
  "why",
  "how",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "whose",
  "can",
  "could",
  "would",
  "should",
  "do",
  "does",
  "did",
  "is",
  "are",
  "was",
  "were",
  "will",
  "have",
  "has",
  "tell",
  "walk",
  "describe",
  "explain",
  "give",
  "compare",
  "imagine",
  "suppose",
  "say",
  "let"
]);
function looksFragmentary(text) {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;
  if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
  if (words.length > 6) return false;
  if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
  const first = words[0].toLowerCase().replace(/^[^a-z]+/, "").replace(/[^a-z].*$/, "");
  return !FRAGMENT_OPENERS.has(first);
}
export {
  isFragment,
  looksFragmentary,
  looksLikeQuestion,
  normalizeQuestionText
};
