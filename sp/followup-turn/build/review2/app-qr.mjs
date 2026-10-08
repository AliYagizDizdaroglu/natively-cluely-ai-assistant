// ../../../../../natively-cluely-ai-assistant/.claude/worktrees/eq-build/electron/services/questionShape.ts
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
var TERMINAL_PUNCTUATION = /[.!?？…]["'”’)\]]*$/;
var TRAILING_FUNCTION_WORDS = /* @__PURE__ */ new Set([
  "that",
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "into",
  "on",
  "at",
  "with",
  "without",
  "from",
  "by",
  "as",
  "like",
  "than",
  "because",
  "if",
  "while",
  "your",
  "our",
  "their",
  "its",
  "my",
  "his",
  "her"
]);
function looksFragmentary(text) {
  const trimmed = text.trim();
  const words2 = trimmed.split(/\s+/).filter(Boolean);
  if (words2.length < 4) return true;
  if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
  if (!TERMINAL_PUNCTUATION.test(trimmed)) {
    if (words2.length <= 6) return true;
    const last = words2[words2.length - 1].toLowerCase().replace(/[^a-z']+/g, "");
    if (TRAILING_FUNCTION_WORDS.has(last)) return true;
  }
  if (words2.length > 6) return false;
  if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
  const first = words2[0].toLowerCase().replace(/^[^a-z]+/, "").replace(/[^a-z].*$/, "");
  return !FRAGMENT_OPENERS.has(first);
}

// ../../../../../natively-cluely-ai-assistant/.claude/worktrees/eq-build/electron/services/questionReconcile.ts
var words = (s) => {
  const tokens = s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(tokens.filter((w) => w.length > 3));
};
function overlap(a, b) {
  const A = words(a), B = words(b);
  if (!A.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / A.size;
}
function sameAnchor(a, b) {
  const na = a.toLowerCase().trim(), nb = b.toLowerCase().trim();
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
  return overlap(a, b) >= 0.5 || overlap(b, a) >= 0.5;
}
var WORDS_PER_SEC = 1.6;
var LAG_MS = 8e3;
var MIN_WINDOW_MS = 15e3;
var RECONCILE_MAX_WINDOW_MS = 6e4;
function reconcileWindowMs(liveText) {
  const spoken = (liveText.match(/[A-Za-z0-9']+/g) ?? []).length / WORDS_PER_SEC * 1e3;
  return Math.min(RECONCILE_MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, Math.round(spoken + LAG_MS)));
}
var MATCH = 0.5;
var PARAPHRASE = 0.25;
function reconcileLiveQuestion(liveText, recent) {
  const spoken = recent.filter((r) => r.text.trim().length > 0);
  if (!spoken.length) return { text: liveText, anchor: null, verdict: "unverifiable", score: 0 };
  let best = spoken[0], bestScore = -1;
  for (const r of spoken) {
    const s = overlap(liveText, r.text);
    if (s > bestScore) {
      best = r;
      bestScore = s;
    }
  }
  if (bestScore >= MATCH) return { text: liveText, anchor: best.text, verdict: "match", score: bestScore };
  const joinScore = overlap(liveText, spoken.map((r) => r.text).join(" "));
  if (joinScore >= MATCH) return { text: liveText, anchor: best.text, verdict: "match", score: joinScore };
  if (bestScore >= PARAPHRASE) return { text: liveText, anchor: best.text, verdict: "paraphrase", score: bestScore };
  const latest = spoken.reduce((a, b) => b.at > a.at ? b : a);
  if (looksFragmentary(latest.text)) return { text: liveText, anchor: null, verdict: "unverifiable", score: bestScore };
  return { text: latest.text, anchor: latest.text, verdict: "replaced", score: bestScore };
}
export {
  RECONCILE_MAX_WINDOW_MS,
  overlap,
  reconcileLiveQuestion,
  reconcileWindowMs,
  sameAnchor
};
