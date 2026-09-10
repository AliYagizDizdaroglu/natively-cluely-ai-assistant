import { randomUUID } from 'crypto';
import { IDetectionClient } from './GroqDetectionClient';
import { jaccardSimilarity } from './jaccardSimilarity';
import { mergeScenarioSentence } from './mergeScenarioSentence';
import { DetectionResponse } from '../llm/prompts/questionDetection';
import { isFragment, looksLikeQuestion, normalizeQuestionText } from './questionShape';

/**
 * Subset of TranscriptSegment used by the detector. Defined inline to avoid
 * coupling to the wider SessionTracker types.
 */
export interface TranscriptSegmentLite {
    speaker: 'interviewer' | 'user' | 'assistant';
    text: string;
    timestamp: number;
    final: boolean;
    /**
     * Wall-clock when the audio for this segment actually ended (VAD speech-end),
     * set by REST STT providers where upload time passes between speech end and
     * transcript arrival. When present, that already-elapsed real silence is
     * credited against the silence debounce so we don't count it twice.
     */
    speechEndedAt?: number;
}

export interface DetectedQuestionChip {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    /** From the detector model when it reports one (Groq); logged, never routed on (2026-09-08). */
    difficulty?: 'easy' | 'medium' | 'hard';
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
    client: IDetectionClient;
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
    private inflightDetection: Promise<unknown> | null = null;
    private queuedTrigger = false;
    private dedupCache: { id: string; text: string }[] = [];
    // Last TWO interviewer finals, for the deterministic scenario-sentence merge
    // (mergeScenarioSentence.ts) — the detection prompt asks the model to return
    // the question complete with the sentence it depends on, but the model is
    // not reliable at that, so this makes it deterministic in code instead.
    // refTime = speechEndedAt when known (real elapsed silence), else timestamp.
    private recentFinals: { text: string; refTime: number }[] = [];
    // Last TWO interviewer finals, unconditionally — mirrors recentFinals's own
    // last-2 tracking but WITHOUT its >= 3-word gate (which exists only to
    // protect mergeScenarioSentence from filler evictions like "Um."). The
    // degraded-detection path needs this because its own completion final can
    // be a single word ("solve...." — run 3's W09) that recentFinals would
    // never record, leaving it with nothing to join the real question to.
    private recentFinalsUnfiltered: { text: string; refTime: number }[] = [];
    // Phase 1 latency instrumentation only — wall-clock of last resetSilenceTimer()
    // so each `[QD-timing] reset` log can report how long the *previous* debounce
    // window was actually allowed to run before being interrupted by a fresh
    // transcript-final segment.
    private lastResetAtMs: number | null = null;
    /**
     * Bumped on every clear() call. Captured at the start of each runDetection
     * and re-checked after the await; if changed, the result belongs to a
     * cancelled session and is dropped silently.
     */
    private generation = 0;

    /**
     * When false, the whisper→chip detection pipeline is muted: transcript /
     * speaker events are ignored and no detect() calls fire. Lets the user run
     * Live-only (or neither) without tearing down audio. Default on.
     */
    private enabled = true;

    constructor(opts: QuestionDetectorOptions) {
        this.opts = {
            ...DEFAULTS,
            ...opts,
            // Default onChipUpdate to onChip. Compute AFTER spread so an explicit
            // `onChipUpdate: undefined` from the caller still falls back to onChip.
            onChipUpdate: opts.onChipUpdate ?? opts.onChip,
        } as Required<QuestionDetectorOptions>;
    }

    /** Mute/unmute the whisper→chip pipeline. Muting also cancels any pending debounce. */
    setEnabled(enabled: boolean): void {
        this.enabled = !!enabled;
        if (!this.enabled && this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        console.log(`[QuestionDetector] detection ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    onTranscriptFinal(segment: TranscriptSegmentLite): void {
        if (!this.enabled) return;
        if (segment.speaker !== 'interviewer' || !segment.final) return;
        const refTime = segment.speechEndedAt ?? segment.timestamp;
        // Unconditional — see the field's own doc for why this exists
        // alongside the gated recentFinals below.
        this.recentFinalsUnfiltered.push({ text: segment.text, refTime });
        if (this.recentFinalsUnfiltered.length > 2) this.recentFinalsUnfiltered.shift();
        // Record before the fast-path check so a '?' final that triggers detection
        // immediately below is already in the list when runDetection() reads it.
        // Skip sub-3-word fragments ("Um.") — recentFinals holds only the last
        // two, so a filler fragment would evict the real scenario statement
        // mergeScenarioSentence needs (before-run bug: prev="Um." < 4 words, so
        // the merge that depended on the statement never fired).
        if (segment.text.trim().split(/\s+/).filter(Boolean).length >= 3) {
            this.recentFinals.push({ text: segment.text, refTime });
            if (this.recentFinals.length > 2) this.recentFinals.shift();
        }
        // Fast path: a final segment ending in '?' is a strong end-of-question
        // signal (Whisper punctuates reliably) — skip the silence debounce.
        // Guard against sub-3-word fragments ("ok?") that would waste a detect
        // call; those keep the normal debounce. If more speech follows a fast-
        // path fire, the containment dedup converts the result to a chip update.
        if (this.isCompleteQuestionText(segment.text)) {
            console.log(`[QD-timing] fast-path: final ends with '?' → triggering detect immediately`);
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            this.lastResetAtMs = Date.now();
            this.triggerDetection();
            return;
        }
        this.resetSilenceTimer(segment.speechEndedAt);
    }

    private isCompleteQuestionText(text: string): boolean {
        const trimmed = text.trim();
        // Allow closing quotes/brackets after the question mark (incl. full-width '？')
        if (!/[?？]["'”’)\]]*$/.test(trimmed)) return false;
        return trimmed.split(/\s+/).length >= 3;
    }

    onSpeakerChange(prevSpeaker: string, newSpeaker: string): void {
        if (!this.enabled) return;
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
        this.recentFinals = [];
        this.recentFinalsUnfiltered = [];
        this.generation++;
    }

    /**
     * Classify caller-supplied text now — the interviewer turn asks this at its
     * gate (spec 2026-09-09 §3.3) instead of waiting for the silence debounce.
     * Same detection as the debounce path, on `text` alone; resolves 'question'
     * when a chip was emitted or updated. Never rejects. The dedup cache is
     * shared with the debounce path on purpose — a question the turn classified
     * must not chip again when the debounce path sees the same finals.
     */
    async detectNow(text: string): Promise<'question' | 'not-a-question'> {
        if (!this.enabled) return 'not-a-question';
        // Wait out whatever is in flight — including a queued detection the drain
        // just started — so ours is THE in-flight one when it starts.
        while (this.inflightDetection) { try { await this.inflightDetection; } catch { /* its own logs */ } }
        try { return (await this.startDetection(text)) ? 'question' : 'not-a-question'; } catch { return 'not-a-question'; }
    }

    private resetSilenceTimer(speechEndedAt?: number): void {
        const now = Date.now();
        const sincePrev = this.lastResetAtMs === null ? null : now - this.lastResetAtMs;
        const interrupted = this.silenceTimer !== null;
        // Real-world silence already elapsed between VAD speech-end and this
        // transcript arriving (hangover + upload). Credit it so the debounce
        // measures "silence since speech ended", not "silence since transcript".
        const credited = speechEndedAt !== undefined ? Math.max(0, now - speechEndedAt) : 0;
        const remaining = Math.max(0, this.opts.silenceDebounceMs - credited);
        console.log(`[QD-timing] reset sincePrev=${sincePrev === null ? 'first' : `${sincePrev}ms`} interruptedTimer=${interrupted} credited=${credited}ms remaining=${remaining}ms`);
        this.lastResetAtMs = now;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        const scheduledAt = now;
        this.silenceTimer = setTimeout(() => {
            this.silenceTimer = null;
            const elapsed = Date.now() - scheduledAt;
            console.log(`[QD-timing] debounce elapsed=${elapsed}ms → triggering detect`);
            this.triggerDetection();
        }, remaining);
    }

    private triggerDetection(): void {
        if (this.inflightDetection) {
            // Already running — queue at most 1
            console.log(`[QD-timing] coalesced (one in-flight; setting queuedTrigger=true)`);
            this.queuedTrigger = true;
            return;
        }
        void this.startDetection();
    }

    /**
     * Starts one detection as THE in-flight one. Its settle clears the slot only
     * if the slot still holds this detection (detectNow and the debounce path
     * share it), then drains the trigger queued behind it — the single-flight
     * rule both paths rely on.
     */
    private startDetection(override?: string): Promise<boolean> {
        const run = this.runDetection(override);
        const slot: Promise<unknown> = run.finally(() => {
            if (this.inflightDetection === slot) this.inflightDetection = null;
            if (this.queuedTrigger) {
                this.queuedTrigger = false;
                this.triggerDetection();
            }
        });
        this.inflightDetection = slot;
        return run;
    }

    private async runDetection(override?: string): Promise<boolean> {
        const myGeneration = this.generation;
        // detectNow's override: caller-supplied text classified alone, right
        // now, with no debounce. It is not a new interviewer final — never
        // pushed into recentFinals/recentFinalsUnfiltered below — so it
        // stands in as `cur` with no `prev` to merge against.
        const overrideFinal = override !== undefined ? { text: override, refTime: Date.now() } : undefined;
        // Captured before the await below so a final arriving during the detect()
        // call cannot shift which two finals this detection's merge is based on.
        const [prev, cur] = overrideFinal ? [undefined, overrideFinal] : this.recentFinals.slice(-2);
        // NOT the same `slice(-2)` destructuring as above: with exactly one
        // entry, `[a, b] = [x].slice(-2)` puts x in `a` (prev) and leaves `b`
        // (cur) undefined — harmless above, since mergeScenarioSentence
        // treats a missing cur/prev as "nothing to merge" either way, but
        // wrong here, where a single final must still become `cur` (the
        // thing to build a degraded chip from), not silently vanish.
        const unfilteredLen = this.recentFinalsUnfiltered.length;
        const degradedCur = overrideFinal ?? (unfilteredLen >= 1 ? this.recentFinalsUnfiltered[unfilteredLen - 1] : undefined);
        const degradedPrev = overrideFinal ? undefined : (unfilteredLen >= 2 ? this.recentFinalsUnfiltered[unfilteredLen - 2] : undefined);
        const recentInterviewerTranscript = overrideFinal ? overrideFinal.text : this.opts.snapshotProvider.getRecentInterviewerTranscript();
        const fullContext = this.opts.snapshotProvider.getContextSnapshot();
        const detectedAt = Date.now();

        let result: DetectionResponse | null;
        const detectIssuedAt = Date.now();
        console.log(`[QD-timing] detect issued`);
        try {
            result = await this.opts.client.detect({
                recentInterviewerTranscript,
                fullConversationContext: fullContext,
            });
        } catch (e) {
            // OllamaDetectionClient never throws, but defensive
            console.warn('[QuestionDetector] detect() threw unexpectedly', e);
            return false;
        }
        const detectElapsed = Date.now() - detectIssuedAt;
        const resultShape = result === null
            ? 'null'
            : `detected=${result.detected} conf=${result.confidence.toFixed(2)} q.len=${result.question?.length ?? 0}${result.difficulty ? ` difficulty=${result.difficulty}` : ''}`;
        console.log(`[QD-timing] detect returned +${detectElapsed}ms result=${resultShape}`);

        // Generation guard: clear() was called while we were awaiting detect().
        // Drop the result — it belongs to a previous session.
        if (myGeneration !== this.generation) return false;

        // null = rate-limited/unavailable/timeout (GroqDetectionClient never
        // throws for this — see the catch above, which is for other clients).
        // Run 3: the free-tier daily token limit hit mid-interview, 64 of 85
        // detect() calls returned null. Falls back to a text-shape heuristic
        // on the finals themselves rather than surfacing nothing at all.
        if (result === null) {
            return this.runDegradedDetection(degradedPrev, degradedCur, fullContext, detectedAt);
        }
        if (!result.detected) return false;
        if (result.confidence < this.opts.confidenceThreshold) return false;
        if (result.question.trim().length === 0) return false;
        // Reject fragments that aren't substantive enough to be standalone questions.
        // STT often chunks interviewer speech into pieces; llama can mark a 1-2 word
        // fragment as "detected: true" even though it's just the tail of a real question.
        // Real interview questions are at least ~3 words ("explain transformers please",
        // "what is the time complexity", "tell me about a time you debugged").
        const wordCount = result.question.trim().split(/\s+/).length;
        if (wordCount < 3) {
            console.log(`[QuestionDetector] dropping fragment (${wordCount} words): ${JSON.stringify(result.question)}`);
            return false;
        }

        // Deterministic scenario-sentence merge (mergeScenarioSentence.ts): the
        // prompt asks the model to return the question complete with the sentence
        // it depends on, but the model is not reliable at that — this guarantees
        // it in code instead, using the last two interviewer finals captured above.
        const mergedQuestion = mergeScenarioSentence(result.question, prev, cur);
        if (mergedQuestion !== result.question) {
            console.log(`[QuestionDetector] merged scenario sentence into question: ${JSON.stringify(mergedQuestion)}`);
        }

        // Dedup check
        const match = this.findSimilarChip(mergedQuestion);
        if (match) {
            const updated: DetectedQuestionChip = {
                id: match.id,
                question: mergedQuestion,
                intent: result.intent,
                confidence: result.confidence,
                ...(result.difficulty ? { difficulty: result.difficulty } : {}),
                contextSnapshot: fullContext,
                detectedAt,
            };
            // refresh dedup cache entry text
            const cacheEntry = this.dedupCache.find(e => e.id === match.id);
            if (cacheEntry) cacheEntry.text = mergedQuestion;
            this.opts.onChipUpdate(updated);
            return true;
        }

        const chip: DetectedQuestionChip = {
            id: randomUUID(),
            question: mergedQuestion,
            intent: result.intent,
            confidence: result.confidence,
            ...(result.difficulty ? { difficulty: result.difficulty } : {}),
            contextSnapshot: fullContext,
            detectedAt,
        };

        this.dedupCache.push({ id: chip.id, text: chip.question });
        if (this.dedupCache.length > this.opts.dedupCacheSize) {
            this.dedupCache.shift();
        }
        this.opts.onChip(chip);
        return true;
    }

    /**
     * Ruling: heuristic chip when the detector is unavailable (run 3, 2026-09-03).
     * client.detect() returned null — a Groq free-tier daily-token-limit outage,
     * not "not a question". Rather than surface nothing, fall back to a
     * text-shape check on the finals themselves: join the last interviewer
     * final to the one before it (if close enough to plausibly be its
     * continuation — e.g. W09's "...actually..." + " solve...." split across
     * two STT finals 810ms apart), normalize, and only emit a chip if that
     * joined text still looks like a question. No scenario merge here — the
     * join above already covers the two-final case mergeScenarioSentence
     * exists for on the normal path.
     */
    private runDegradedDetection(
        prev: { text: string; refTime: number } | undefined,
        cur: { text: string; refTime: number } | undefined,
        fullContext: string,
        detectedAt: number,
    ): boolean {
        if (!cur) return false;
        const usePrev = prev !== undefined && cur.refTime - prev.refTime <= 6000;
        const joined = (usePrev ? prev!.text + ' ' : '') + cur.text;
        const text = normalizeQuestionText(joined);

        if (isFragment(text) || !looksLikeQuestion(text)) {
            console.log(`[QuestionDetector] degraded: no chip (not question-shaped): ${JSON.stringify(text)}`);
            return false;
        }

        console.log(`[QuestionDetector] degraded: chip from heuristic (detector unavailable): ${JSON.stringify(text)}`);

        const match = this.findSimilarChip(text);
        if (match) {
            const updated: DetectedQuestionChip = {
                id: match.id,
                question: text,
                intent: 'verbal',
                confidence: this.opts.confidenceThreshold,
                contextSnapshot: fullContext,
                detectedAt,
            };
            const cacheEntry = this.dedupCache.find(e => e.id === match.id);
            if (cacheEntry) cacheEntry.text = text;
            this.opts.onChipUpdate(updated);
            return true;
        }

        const chip: DetectedQuestionChip = {
            id: randomUUID(),
            question: text,
            intent: 'verbal',
            confidence: this.opts.confidenceThreshold,
            contextSnapshot: fullContext,
            detectedAt,
        };
        this.dedupCache.push({ id: chip.id, text: chip.question });
        if (this.dedupCache.length > this.opts.dedupCacheSize) {
            this.dedupCache.shift();
        }
        this.opts.onChip(chip);
        return true;
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
