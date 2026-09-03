import { jaccardSimilarity } from './jaccardSimilarity';
import { sameAnchor } from './questionReconcile';

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
}

interface CacheEntry {
  id: number;
  text: string;
  source: ChipSource;
  at: number;
  anchor?: string;
  answered: boolean;
}

/** Lower-case, collapse whitespace, strip trailing ?.!,;: — containment only. */
function normalizeForContainment(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[?.!,;:]+$/, '');
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
  /** Jaccard threshold — same 0.7 the whisper detector already uses. */
  threshold?: number;
  cacheSize?: number;
}

export class ChipDeduper {
  private cache: CacheEntry[] = [];
  private nextId = 1;
  private readonly windowMs: number;
  private readonly threshold: number;
  private readonly cacheSize: number;

  constructor(opts: ChipDeduperOptions = {}) {
    this.windowMs = opts.windowMs ?? 20_000;
    this.threshold = opts.threshold ?? 0.7;
    this.cacheSize = opts.cacheSize ?? 10;
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

    const now = Date.now();
    this.cache = this.cache.filter((e) => now - e.at < this.windowMs);

    const match = this.findSimilar(text, candidate.anchor, candidate.source, now);
    if (match) {
      return {
        admitted: false,
        id: match.id,
        duplicateOfSource: match.source,
        duplicateOfQuestion: match.text,
        alreadyAnswered: match.answered,
      };
    }

    const entry: CacheEntry = { id: this.nextId++, text, source: candidate.source, at: now, anchor: candidate.anchor, answered: false };
    this.cache.push(entry);
    if (this.cache.length > this.cacheSize) this.cache.shift();
    return { admitted: true, id: entry.id };
  }

  reset(): void {
    this.cache = [];
  }

  /** Record that the cache entry identified by admit()'s returned id has been answered. */
  markAnswered(id: number | undefined): void {
    if (id === undefined) return;
    const entry = this.cache.find((e) => e.id === id);
    if (entry) entry.answered = true;
  }

  private findSimilar(text: string, anchor: string | undefined, source: ChipSource, now: number): CacheEntry | null {
    const normNew = normalizeForContainment(text);
    for (const entry of this.cache) {
      if (anchor && entry.anchor && sameAnchor(anchor, entry.anchor)) return entry;
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
