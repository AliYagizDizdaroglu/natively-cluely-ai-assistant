// electron/services/jaccardSimilarity.ts
function jaccardSimilarity(a, b) {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 && tokensB.size === 0) return 0;
  let intersectionSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectionSize++;
  }
  const unionSize = tokensA.size + tokensB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}
function tokenize(text) {
  return new Set(
    text.toLowerCase().split(/\W+/).filter((t) => t.length > 0)
  );
}

// electron/services/questionReconcile.ts
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

// electron/services/containment.ts
function normalizeForContainment(text) {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").replace(/\b([a-z]{1,3}) (\d+)\b/g, "$1$2").trim();
}

// electron/services/ChipDeduper.ts
function contentWords(text) {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(tokens.filter((w) => w.length > 3));
}
function contentWordSimilar(a, b) {
  const A = contentWords(a), B = contentWords(b);
  const [S, L] = A.size <= B.size ? [A, B] : [B, A];
  if (S.size < 4) return false;
  let hit = 0;
  for (const w of S) if (L.has(w)) hit++;
  return hit / S.size >= 0.6;
}
var CROSS_DETECTOR_MS = 5e3;
var TAIL_MIN_CONTENT_WORDS = 4;
var ChipDeduper = class {
  cache = [];
  nextId = 1;
  windowMs;
  answeredWindowMs;
  threshold;
  cacheSize;
  now;
  constructor(opts = {}) {
    this.windowMs = opts.windowMs ?? 2e4;
    this.answeredWindowMs = opts.answeredWindowMs ?? 6e4;
    this.threshold = opts.threshold ?? 0.7;
    this.cacheSize = opts.cacheSize ?? 10;
    this.now = opts.now ?? Date.now;
  }
  /**
   * Decide whether this chip should reach the renderer. First one through for a
   * given question wins; later near-duplicates from either pipeline are
   * suppressed. Blank questions are passed through untouched and never cached —
   * caching an empty string would make everything look like a duplicate of it.
   */
  admit(candidate) {
    const text = (candidate.question ?? "").trim();
    if (!text) return { admitted: true };
    const now = this.now();
    this.cache = this.cache.filter((e) => now - e.at < (e.answered ? this.answeredWindowMs : this.windowMs));
    const match = this.findSimilar(text, candidate.anchor, candidate.source, now);
    if (match) {
      return {
        admitted: false,
        id: match.id,
        duplicateOfSource: match.source,
        duplicateOfQuestion: match.text,
        alreadyAnswered: match.answered,
        duplicateAgeMs: now - match.at
      };
    }
    const entry = { id: this.nextId++, text, source: candidate.source, at: now, anchor: candidate.anchor, answered: false };
    this.cache.push(entry);
    if (this.cache.length > this.cacheSize) this.cache.shift();
    return { admitted: true, id: entry.id };
  }
  reset() {
    this.cache = [];
  }
  /** Record that the cache entry identified by admit()'s returned id has been answered. */
  markAnswered(id) {
    if (id === void 0) return;
    const entry = this.cache.find((e) => e.id === id);
    if (entry) entry.answered = true;
  }
  /**
   * The answered entry now stands for the fuller sentence it was extended to
   * (main.ts extend dispatch): a later re-fire of that sentence is a plain
   * duplicate with nothing added, not a second extension.
   */
  extend(id, question) {
    if (id === void 0) return;
    const entry = this.cache.find((e) => e.id === id);
    if (entry) entry.text = question.trim();
  }
  findSimilar(text, anchor, source, now) {
    const normNew = normalizeForContainment(text);
    const newContentWords = contentWords(text).size;
    for (const entry of this.cache) {
      if (anchor && entry.anchor && now - entry.at < this.windowMs && sameAnchor(anchor, entry.anchor)) {
        const a = anchor.toLowerCase().trim();
        const b = entry.anchor.toLowerCase().trim();
        const contained = a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a));
        const shortAnchor = Math.min(contentWords(anchor).size, contentWords(entry.anchor).size) < TAIL_MIN_CONTENT_WORDS;
        if (contained || !shortAnchor || now - entry.at <= CROSS_DETECTOR_MS) return entry;
      }
      if (now - entry.at >= this.windowMs && Math.min(newContentWords, contentWords(entry.text).size) < TAIL_MIN_CONTENT_WORDS) continue;
      if (entry.source !== source && now - entry.at <= CROSS_DETECTOR_MS && contentWordSimilar(text, entry.text)) {
        return entry;
      }
      const normExisting = normalizeForContainment(entry.text);
      if (normNew.length >= 3 && (normExisting.includes(normNew) || normNew.includes(normExisting))) {
        return entry;
      }
      if (jaccardSimilarity(text, entry.text) >= this.threshold) return entry;
    }
    return null;
  }
};
export {
  ChipDeduper
};
