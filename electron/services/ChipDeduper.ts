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

    const match = this.findSimilar(text, candidate.anchor);
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

  private findSimilar(text: string, anchor?: string): CacheEntry | null {
    const normNew = normalizeForContainment(text);
    for (const entry of this.cache) {
      if (anchor && entry.anchor && sameAnchor(anchor, entry.anchor)) return entry;
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
