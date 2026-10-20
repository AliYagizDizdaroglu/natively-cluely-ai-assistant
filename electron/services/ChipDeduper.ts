import { jaccardSimilarity } from './jaccardSimilarity';
import { sameAnchor } from './questionReconcile';
import { normalizeForContainment } from './containment';

/**
 * Cross-pipeline chip dedup.
 *
 * Two independent detectors can hear the same spoken question: the whisper →
 * Groq QuestionDetector, and the Gemini Live listener. Each had its own dedup
 * (Jaccard 0.7 + containment in the detector, exact-match-within-10s in the
 * router) but neither could see the other's output, so with Live in Suggest
 * mode and detection left on, one question produced two chips.
 *
 * This is the single dedup authority both paths consult immediately before a
 * chip is broadcast. Matching mirrors QuestionDetector.findSimilarChip so the
 * two pipelines stop disagreeing about what "the same question" means.
 */

export type ChipSource = 'live' | 'whisper';

export interface DedupCandidate {
  question: string;
  source: ChipSource;
  /** Transcript sentence this detection came from (Task 5 reconcile); anchors match anchors. */
  anchor?: string;
}

export interface AdmitResult {
  admitted: boolean;
  /**
   * Identity of the cache entry this result concerns: the entry just created
   * (admitted: true) or the entry it duplicates (admitted: false). Pass this
   * straight to markAnswered() — undefined only for the blank-question no-op,
   * where nothing was cached.
   */
  id?: number;
  /** Which pipeline already surfaced this question — set only when suppressed. */
  duplicateOfSource?: ChipSource;
  duplicateOfQuestion?: string;
  /** Set only when suppressed: whether the original detection has already been answered. */
  alreadyAnswered?: boolean;
  /** Set only when suppressed: how long ago the original detection was admitted. */
  duplicateAgeMs?: number;
}

interface CacheEntry {
  id: number;
  text: string;
  source: ChipSource;
  at: number;
  anchor?: string;
  answered: boolean;
  /** Order in which entries were answered (markAnswered); 0 = not answered. */
  answeredSeq: number;
}

/** Lower-cased words longer than 3 letters — same definition questionReconcile's overlap() uses. */
function contentWords(text: string): Set<string> {
  const tokens: string[] = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(tokens.filter((w) => w.length > 3));
}

/**
 * Content-word overlap on the TEXTS, independent of anchor (Ruling R45): an
 * STT split can send two detections of the same question to different
 * anchors — one final each, worded differently enough that containment and
 * Jaccard both miss (run 2's W10: "...bucket layout for a trail?" vs
 * "...bucket layout for a training dataset that gets versioned weekly?",
 * Jaccard 0.5). S = the text with fewer content words, L = the other;
 * similar iff S has at least 4 content words and 60% of them appear in L.
 * The real field pair (both sides say "organize") measures 4/5 = 0.80; the
 * unit test's fixture text deliberately sits right on the 0.60 boundary
 * instead (its Live side says "organise", so it and "trail"/"training" both
 * miss, landing exactly at 3/5) to prove the threshold itself, not just
 * this one field pair with margin to spare. The 4-word floor alone is not
 * enough: two DIFFERENT questions sharing a template ("What is the
 * difference between X and Y?") can clear 60% on the template words alone
 * (Ruling R45 round-5 finding, 0.75 for "pod and a deployment" vs "data
 * drift and concept drift"). findSimilar only calls this across detectors
 * within CROSS_DETECTOR_MS, which is what actually keeps two different
 * template questions apart — see there.
 */
function contentWordSimilar(a: string, b: string): boolean {
  const A = contentWords(a), B = contentWords(b);
  const [S, L] = A.size <= B.size ? [A, B] : [B, A];
  if (S.size < 4) return false;
  let hit = 0;
  for (const w of S) if (L.has(w)) hit++;
  return hit / S.size >= 0.6;
}

/**
 * How close together two detections from DIFFERENT pipelines must land for
 * content-word overlap to treat them as one STT-split question (Ruling
 * R45). Provenance: run 2's W10 gap was 4s (07:43:55 whisper to 07:43:59
 * live); 5000 gives that a margin. A spoken interview question takes
 * longer than 5s to ask, so two genuinely different questions cannot both
 * fall inside this window from two detectors — only one utterance can.
 */
const CROSS_DETECTOR_MS = 5000;

export interface ChipDeduperOptions {
  /**
   * How long an admitted question suppresses near-duplicates. Long enough to
   * cover the gap between the two pipelines detecting the same turn (~1-3s),
   * short enough that a genuine re-ask later still surfaces.
   */
  windowMs?: number;
  /**
   * How long an ANSWERED question stays authoritative. Live 3.1 re-fires a
   * question it already had answered 20-26 s later (after7, 2026-09-06: M04 at
   * 20.0 s, M27 at 26 s), past windowMs, so the hour got two answers. Replayed
   * over after5-7 with 60 s: exactly those two doubles removed, and the one
   * false suppression (after5 W02→W03 at 48 s, by an answered one-content-word
   * fragment) is what the content-word floor in findSimilar guards against.
   */
  answeredWindowMs?: number;
  /** Jaccard threshold — same 0.7 the whisper detector already uses. */
  threshold?: number;
  cacheSize?: number;
  /** Clock for the windows; tests and the golden replay inject the fixture's epoch. */
  now?: () => number;
}

/**
 * Past windowMs only answered entries remain, and there a short text must not
 * suppress by containment/Jaccard: after5's answered "I'm going to go." (one
 * content word) would have swallowed the next real question at +48 s. Four is
 * contentWordSimilar's floor for the same reason.
 */
const TAIL_MIN_CONTENT_WORDS = 4;

interface RingEntry extends CacheEntry {
  /** now() when markAnswered ran; the age of a late echo is counted from here. */
  answeredAt: number;
}

/** Question-frame words longer than 3 letters: contentWords keeps them, but they say nothing about the topic. */
const FRAME_WORDS = new Set(['would', 'could', 'should', 'what', 'when', 'where', 'which', 'why', 'whose', 'your', 'this', 'that', 'have', 'does', 'about', 'design', 'describe', 'explain', 'walk', 'through', 'tell', 'give', 'between', 'difference', 'like']);

/** Jaccard over topic words (content words minus FRAME_WORDS); 0 when nothing is shared. */
function contentJaccard(a: Set<string>, b: Set<string>): number {
  const ta = [...a].filter((w) => !FRAME_WORDS.has(w));
  const tb = new Set([...b].filter((w) => !FRAME_WORDS.has(w)));
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  if (shared === 0) return 0;
  return shared / (ta.length + tb.size - shared);
}

/** Answered ring: how many answered questions a Live echo is checked against, with no age limit (S3). */
const ANSWERED_RING_SIZE = 3;

export class ChipDeduper {
  private cache: CacheEntry[] = [];
  /** The last ANSWERED_RING_SIZE answered entries, outliving answeredWindowMs and cacheSize; copies, so extend() updates them by id. */
  private ring: RingEntry[] = [];
  private nextId = 1;
  private answerSeq = 0;
  private readonly windowMs: number;
  private readonly answeredWindowMs: number;
  private readonly threshold: number;
  private readonly cacheSize: number;
  private readonly now: () => number;

  constructor(opts: ChipDeduperOptions = {}) {
    this.windowMs = opts.windowMs ?? 20_000;
    this.answeredWindowMs = opts.answeredWindowMs ?? 60_000;
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
  admit(candidate: DedupCandidate): AdmitResult {
    const text = (candidate.question ?? '').trim();
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
        duplicateAgeMs: now - match.at,
      };
    }

    const entry: CacheEntry = { id: this.nextId++, text, source: candidate.source, at: now, anchor: candidate.anchor, answered: false, answeredSeq: 0 };
    this.cache.push(entry);
    if (this.cache.length > this.cacheSize) this.cache.shift();
    return { admitted: true, id: entry.id };
  }

  /**
   * Read-only: is this detection a re-emission of a question that was already ANSWERED and is
   * still inside answeredWindowMs? Caches nothing, admits nothing. main.ts asks it before an
   * auto-mode detection marks the open turn (F3, st25-smoke 2026-10-12: the detector re-emitted
   * "Why that one?" 20.3 s and "Do you have any questions for us?" 23.5 s after their answers,
   * and each stale mark made the small-talk statement that followed dispatchable).
   * Same rules as admit() (findSimilar, so D1's short-anchor rule applies), plus one: identical
   * text matches past windowMs even when it is short, which findSimilar's tail floor
   * (TAIL_MIN_CONTENT_WORDS) refuses for both evidence questions (1 and 2 content words).
   */
  isAnsweredDuplicate(candidate: DedupCandidate): boolean {
    return this.answeredDuplicate(candidate) !== null;
  }

  /**
   * isAnsweredDuplicate with the reason: 'stale-mark' (inside answeredWindowMs, the latest answer) or 'late-echo'
   * (S3: a Live claim matching one of the answered ring, with the age since that answer).
   * Only the Live claim is dropped for a late echo; the same text from STT still dispatches.
   */
  answeredDuplicate(candidate: DedupCandidate): { reason: 'stale-mark' } | { reason: 'late-echo'; ageMs: number } | null {
    const text = (candidate.question ?? '').trim();
    if (!text) return null;
    const now = this.now();
    // Only the MOST RECENTLY answered question can be stale: both evidence cases re-emit the latest answer. A repeat of an
    // earlier answered question (P1, "Why that one?", P2, "Why that one?") is a new follow-up and must mark.
    const latest = this.cache.filter((e) => e.answered).sort((a, b) => b.answeredSeq - a.answeredSeq)[0];
    const answered = latest && now - latest.at < this.answeredWindowMs ? [latest] : [];
    if (this.findSimilar(text, candidate.anchor, candidate.source, now, answered)) return { reason: 'stale-mark' };
    const norm = normalizeForContainment(text);
    if (norm.length >= 3 && answered.some((e) => normalizeForContainment(e.text) === norm)) return { reason: 'stale-mark' };
    const echo = candidate.source === 'live' ? this.lateEcho(text) : undefined;
    return echo ? { reason: 'late-echo', ageMs: now - echo.answeredAt } : null;
  }

  /**
   * S3: the Live ear re-announces an answered question 62-76 s later (past answeredWindowMs), or one that is not the latest
   * answer. Live claims only; 4+ content words on both sides; near-exact (equal text, or Jaccard over topic words >= threshold: FRAME_WORDS do not count, so a shared frame does not match), no age limit,
   * checked against the last ANSWERED_RING_SIZE answers. A re-ask after a FAILED answer is not in the ring (unmarkAnswered).
   */
  private lateEcho(text: string): RingEntry | undefined {
    const words = contentWords(text);
    if (words.size < TAIL_MIN_CONTENT_WORDS) return undefined;
    const norm = normalizeForContainment(text);
    return this.ring.find((e) => contentWords(e.text).size >= TAIL_MIN_CONTENT_WORDS
      && (normalizeForContainment(e.text) === norm || contentJaccard(words, contentWords(e.text)) >= this.threshold));
  }

  reset(): void {
    this.cache = [];
    this.ring = [];
  }

  /** Record that the cache entry identified by admit()'s returned id has been answered. */
  markAnswered(id: number | undefined): void {
    if (id === undefined) return;
    const entry = this.cache.find((e) => e.id === id);
    if (entry) {
      entry.answered = true; entry.answeredSeq = ++this.answerSeq;
      this.ring = this.ring.filter((e) => e.id !== entry.id);
      this.ring.push({ ...entry, answeredAt: this.now() });
      if (this.ring.length > ANSWERED_RING_SIZE) this.ring.shift();
    }
  }

  /**
   * The inverse of markAnswered, for an answer that FAILED (S2): the entry goes back to unanswered, so it ages out at
   * windowMs and a repeat of the question inside it is answered instead of dropped as already answered.
   */
  unmarkAnswered(id: number | undefined): void {
    if (id === undefined) return;
    const entry = this.cache.find((e) => e.id === id);
    if (entry) { entry.answered = false; entry.answeredSeq = 0; }
    this.ring = this.ring.filter((e) => e.id !== id);
  }

  /**
   * The answered entry now stands for the fuller sentence it was extended to
   * (main.ts extend dispatch): a later re-fire of that sentence is a plain
   * duplicate with nothing added, not a second extension.
   */
  extend(id: number | undefined, question: string): void {
    if (id === undefined) return;
    const entry = this.cache.find((e) => e.id === id);
    if (entry) entry.text = question.trim();
    const ringed = this.ring.find((e) => e.id === id);
    if (ringed) ringed.text = question.trim();
  }

  private findSimilar(text: string, anchor: string | undefined, source: ChipSource, now: number, entries: CacheEntry[] = this.cache): CacheEntry | null {
    const normNew = normalizeForContainment(text);
    const newContentWords = contentWords(text).size;
    for (const entry of entries) {
      // Anchors identify one utterance heard twice, so they only speak inside the
      // base window. Past it only answered entries survive, and two DIFFERENT
      // questions sharing a frame clear sameAnchor on the frame words alone
      // (after8 W08 at +49 s: "what is the difference between a pod and a
      // deployment" vs "…between data drift and concept drift", overlap 0.75 —
      // W08 was never answered).
      if (anchor && entry.anchor && now - entry.at < this.windowMs && sameAnchor(anchor, entry.anchor)) {
        // sameAnchor's content-word OVERLAP half is a "one utterance heard by two
        // ears" signature, so on a SHORT anchor (< TAIL_MIN_CONTENT_WORDS content
        // words on the shorter side) it only counts within CROSS_DETECTOR_MS.
        // A real follow-up reuses its parent's key noun: b1-final 2026-10-11,
        // RH02 was dropped as a duplicate of its answered parent at +19.0 s on
        // overlap 0.50 over 2 content words. Substring containment, and anchors
        // with 4+ content words on both sides, keep matching across the window.
        const a = anchor.toLowerCase().trim();
        const b = entry.anchor.toLowerCase().trim();
        const contained = a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a));
        const shortAnchor = Math.min(contentWords(anchor).size, contentWords(entry.anchor).size) < TAIL_MIN_CONTENT_WORDS;
        if (contained || !shortAnchor || now - entry.at <= CROSS_DETECTOR_MS) return entry;
      }
      // Past windowMs only answered entries survive (answeredWindowMs); there a
      // short text on either side must not match by containment/Jaccard.
      if (now - entry.at >= this.windowMs && Math.min(newContentWords, contentWords(entry.text).size) < TAIL_MIN_CONTENT_WORDS) continue;
      // Content-word overlap only ever applies across the two detectors,
      // within CROSS_DETECTOR_MS of each other (Ruling R45): it exists to
      // catch one question the STT split into two finals that whisper and
      // Live each anchored to separately — a signature only cross-pipeline,
      // close-together detections can have. A spoken interview question
      // takes longer than that to ask, so nothing genuinely different can
      // land inside the same window from two detectors; two SAME-source
      // detections, or two detections further apart, fall back to
      // containment/Jaccard below, same as before this rule existed.
      if (
        entry.source !== source &&
        now - entry.at <= CROSS_DETECTOR_MS &&
        contentWordSimilar(text, entry.text)
      ) {
        return entry;
      }
      const normExisting = normalizeForContainment(entry.text);
      // Containment catches STT fragmentation, where Jaccard is misleadingly
      // low: "architecture." vs "Can you explain Transformers? architecture."
      if (
        normNew.length >= 3 &&
        (normExisting.includes(normNew) || normNew.includes(normExisting))
      ) {
        return entry;
      }
      if (jaccardSimilarity(text, entry.text) >= this.threshold) return entry;
    }
    return null;
  }
}
