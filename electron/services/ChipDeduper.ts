import { jaccardSimilarity } from './jaccardSimilarity';

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
}

export interface AdmitResult {
  admitted: boolean;
  /** Which pipeline already surfaced this question — set only when suppressed. */
  duplicateOfSource?: ChipSource;
  duplicateOfQuestion?: string;
}

interface CacheEntry {
  text: string;
  source: ChipSource;
  at: number;
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

    const match = this.findSimilar(text);
    if (match) {
      return {
        admitted: false,
        duplicateOfSource: match.source,
        duplicateOfQuestion: match.text,
      };
    }

    this.cache.push({ text, source: candidate.source, at: now });
    if (this.cache.length > this.cacheSize) this.cache.shift();
    return { admitted: true };
  }

  reset(): void {
    this.cache = [];
  }

  private findSimilar(text: string): CacheEntry | null {
    const normNew = text.toLowerCase().trim();
    for (const entry of this.cache) {
      const normExisting = entry.text.toLowerCase().trim();
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
