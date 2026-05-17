import { randomUUID } from 'crypto';
import { OllamaDetectionClient } from './OllamaDetectionClient';
import { jaccardSimilarity } from './jaccardSimilarity';
import { DetectionResponse } from '../llm/prompts/questionDetection';

/**
 * Subset of TranscriptSegment used by the detector. Defined inline to avoid
 * coupling to the wider SessionTracker types.
 */
export interface TranscriptSegmentLite {
    speaker: 'interviewer' | 'user' | 'assistant';
    text: string;
    timestamp: number;
    final: boolean;
}

export interface DetectedQuestionChip {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
}

export interface SnapshotProvider {
    /** Last 30s of interviewer-focused conversation (formatted with speaker labels). */
    getRecentInterviewerTranscript: () => string;
    /** Last 60s of full conversation for context snapshot. */
    getContextSnapshot: () => string;
}

export interface QuestionDetectorOptions {
    client: OllamaDetectionClient;
    snapshotProvider: SnapshotProvider;
    onChip: (chip: DetectedQuestionChip) => void;
    onChipUpdate?: (chip: DetectedQuestionChip) => void;
    confidenceThreshold?: number;        // default 0.6
    silenceDebounceMs?: number;          // default 1500
    similarityThreshold?: number;        // default 0.7
    dedupCacheSize?: number;             // default 10
}

const DEFAULTS = {
    confidenceThreshold: 0.6,
    silenceDebounceMs: 1500,
    similarityThreshold: 0.7,
    dedupCacheSize: 10,
};

/**
 * Detection orchestrator. Subscribes to transcript-final + speaker-change events,
 * debounces with silence or fires immediately on speaker change, dedups via Jaccard
 * similarity, and emits chip / chip-update events through callbacks.
 *
 * Single-flight: at most 1 in-flight request, queue at most 1 next.
 */
export class QuestionDetector {
    private readonly opts: Required<QuestionDetectorOptions>;
    private silenceTimer: NodeJS.Timeout | null = null;
    private inflightDetection: Promise<void> | null = null;
    private queuedTrigger = false;
    private dedupCache: { id: string; text: string }[] = [];
    /**
     * Bumped on every clear() call. Captured at the start of each runDetection
     * and re-checked after the await; if changed, the result belongs to a
     * cancelled session and is dropped silently.
     */
    private generation = 0;

    constructor(opts: QuestionDetectorOptions) {
        this.opts = {
            ...DEFAULTS,
            ...opts,
            // Default onChipUpdate to onChip. Compute AFTER spread so an explicit
            // `onChipUpdate: undefined` from the caller still falls back to onChip.
            onChipUpdate: opts.onChipUpdate ?? opts.onChip,
        } as Required<QuestionDetectorOptions>;
    }

    onTranscriptFinal(segment: TranscriptSegmentLite): void {
        if (segment.speaker !== 'interviewer' || !segment.final) return;
        this.resetSilenceTimer();
    }

    onSpeakerChange(prevSpeaker: string, newSpeaker: string): void {
        // Interviewer handed off (silence or user starting): fire immediately
        if (prevSpeaker === 'interviewer' && newSpeaker !== 'interviewer') {
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            this.triggerDetection();
        }
    }

    /** Reset all state — call on meeting boundary. */
    clear(): void {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        this.queuedTrigger = false;
        this.dedupCache = [];
        this.generation++;
    }

    private resetSilenceTimer(): void {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
            this.silenceTimer = null;
            this.triggerDetection();
        }, this.opts.silenceDebounceMs);
    }

    private triggerDetection(): void {
        if (this.inflightDetection) {
            // Already running — queue at most 1
            this.queuedTrigger = true;
            return;
        }
        this.inflightDetection = this.runDetection().finally(() => {
            this.inflightDetection = null;
            if (this.queuedTrigger) {
                this.queuedTrigger = false;
                this.triggerDetection();
            }
        });
    }

    private async runDetection(): Promise<void> {
        const myGeneration = this.generation;
        const recentInterviewerTranscript = this.opts.snapshotProvider.getRecentInterviewerTranscript();
        const fullContext = this.opts.snapshotProvider.getContextSnapshot();
        const detectedAt = Date.now();

        let result: DetectionResponse | null;
        try {
            result = await this.opts.client.detect({
                recentInterviewerTranscript,
                fullConversationContext: fullContext,
            });
        } catch (e) {
            // OllamaDetectionClient never throws, but defensive
            console.warn('[QuestionDetector] detect() threw unexpectedly', e);
            return;
        }

        // Generation guard: clear() was called while we were awaiting detect().
        // Drop the result — it belongs to a previous session.
        if (myGeneration !== this.generation) return;

        if (!result || !result.detected) return;
        if (result.confidence < this.opts.confidenceThreshold) return;
        if (result.question.trim().length === 0) return;
        // Reject fragments that aren't substantive enough to be standalone questions.
        // STT often chunks interviewer speech into pieces; llama can mark a 1-2 word
        // fragment as "detected: true" even though it's just the tail of a real question.
        // Real interview questions are at least ~3 words ("explain transformers please",
        // "what is the time complexity", "tell me about a time you debugged").
        const wordCount = result.question.trim().split(/\s+/).length;
        if (wordCount < 3) {
            console.log(`[QuestionDetector] dropping fragment (${wordCount} words): ${JSON.stringify(result.question)}`);
            return;
        }

        // Dedup check
        const match = this.findSimilarChip(result.question);
        if (match) {
            const updated: DetectedQuestionChip = {
                id: match.id,
                question: result.question,
                intent: result.intent,
                confidence: result.confidence,
                contextSnapshot: fullContext,
                detectedAt,
            };
            // refresh dedup cache entry text
            const cacheEntry = this.dedupCache.find(e => e.id === match.id);
            if (cacheEntry) cacheEntry.text = result.question;
            this.opts.onChipUpdate(updated);
            return;
        }

        const chip: DetectedQuestionChip = {
            id: randomUUID(),
            question: result.question,
            intent: result.intent,
            confidence: result.confidence,
            contextSnapshot: fullContext,
            detectedAt,
        };

        this.dedupCache.push({ id: chip.id, text: chip.question });
        if (this.dedupCache.length > this.opts.dedupCacheSize) {
            this.dedupCache.shift();
        }
        this.opts.onChip(chip);
    }

    private findSimilarChip(text: string): { id: string; text: string } | null {
        const normNew = text.toLowerCase().trim();
        for (const entry of this.dedupCache) {
            const normExisting = entry.text.toLowerCase().trim();
            // Substring / containment check — catches the common STT fragmentation case:
            // chip A: "architecture." and chip B: "Can you explain Transformers? architecture."
            // are clearly the same turn split by STT chunking, but Jaccard sees them as
            // 0.2 similar. Containment is the stronger signal here.
            if (normNew.length >= 3 && (normExisting.includes(normNew) || normNew.includes(normExisting))) {
                return entry;
            }
            if (jaccardSimilarity(text, entry.text) >= this.opts.similarityThreshold) {
                return entry;
            }
        }
        return null;
    }
}
