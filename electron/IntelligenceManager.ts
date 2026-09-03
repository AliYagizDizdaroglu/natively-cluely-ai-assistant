// IntelligenceManager.ts
// Thin facade that delegates to focused sub-modules.
// Maintains full backward compatibility — all existing callers continue to work unchanged.
//
// Sub-modules:
//   SessionTracker     — state, transcript arrays, context management, epoch compaction
//   IntelligenceEngine — LLM mode routing (6 modes), event emission
//   MeetingPersistence — meeting stop/save/recovery

import { EventEmitter } from 'events';
import { LLMHelper } from './LLMHelper';
import { SessionTracker } from './SessionTracker';
import { IntelligenceEngine } from './IntelligenceEngine';
import { MeetingPersistence } from './MeetingPersistence';
import { QuestionDetector, DetectedQuestionChip } from './services/QuestionDetector';
import { GroqDetectionClient } from './services/GroqDetectionClient';
import { CredentialsManager } from './services/CredentialsManager';
import { DETECTOR_CALIBRATION_CASES, judgeDetection } from './services/detectorCalibration';

// Re-export types for backward compatibility
export type { TranscriptSegment, SuggestionTrigger, ContextItem } from './SessionTracker';
export type { IntelligenceMode, IntelligenceModeEvents } from './IntelligenceEngine';

export const GEMINI_FLASH_MODEL = "gemini-3.1-flash-lite";

/**
 * IntelligenceManager - Facade for the intelligence layer.
 * 
 * Delegates to:
 * - SessionTracker:     context, transcripts, epoch summaries
 * - IntelligenceEngine: LLM modes (assist, whatToSay, followUp, recap, clarify, manual, followUpQuestions)
 * - MeetingPersistence: meeting stop/save/recovery
 */
export class IntelligenceManager extends EventEmitter {
    private session: SessionTracker;
    private engine: IntelligenceEngine;
    private persistence: MeetingPersistence;
    private questionDetector: QuestionDetector;
    private recentInterviewerSpeech: import('./services/questionReconcile').RecentSpeech[] = [];

    constructor(llmHelper: LLMHelper) {
        super();
        this.session = new SessionTracker();
        this.engine = new IntelligenceEngine(llmHelper, this.session);
        this.persistence = new MeetingPersistence(this.session, llmHelper);

        // Forward all engine events through the facade
        this.forwardEngineEvents();

        // Initialize passive question detector.
        // Uses Groq cloud (openai/gpt-oss-20b by default; override via
        // NATIVELY_QUESTION_DETECTION_MODEL). gpt-oss-20b must be enabled once
        // per Groq project (console.groq.com/settings/project/limits) — the
        // startup self-test logs PASS/FAIL so misconfig is obvious.
        const detectionClient = new GroqDetectionClient({
            getApiKey: () => CredentialsManager.getInstance().getGroqSttApiKey(),
        });
        this.questionDetector = new QuestionDetector({
            client: detectionClient,
            snapshotProvider: {
                getRecentInterviewerTranscript: () => this.getFormattedContext(30),
                getContextSnapshot: () => this.getFormattedContext(60),
            },
            onChip: chip => {
                console.log(`[QuestionDetector] chip emitted: intent=${chip.intent} confidence=${chip.confidence.toFixed(2)} q="${chip.question.slice(0, 60)}"`);
                this.emit('question-detected', chip);
            },
            onChipUpdate: chip => {
                console.log(`[QuestionDetector] chip updated: id=${chip.id.slice(0, 8)} q="${chip.question.slice(0, 60)}"`);
                this.emit('question-detected-update', chip);
            },
        });

        // Wire engine events to detector
        this.engine.on('transcript-segment-final', segment => {
            this.questionDetector.onTranscriptFinal(segment);
        });
        this.engine.on('speaker-change', (prev, next) => {
            this.questionDetector.onSpeakerChange(prev, next);
        });

        const detectorModel = process.env.NATIVELY_QUESTION_DETECTION_MODEL ?? 'openai/gpt-oss-20b';
        console.log(`[IntelligenceManager] QuestionDetector wired (model=groq/${detectorModel}, debounce=1.5s, dedup=0.7, conf≥0.6, max=5)`);

        // Startup self-test: fires ONE synthetic detection ~2.5s after boot to
        // verify the detection model + Groq key + JSON parsing work end-to-end.
        // Logs a clear PASS/FAIL so "chips don't appear" can be diagnosed as a
        // model/key problem vs an audio/transcript-delivery problem. Delayed so
        // credentials are fully loaded first.
        setTimeout(() => {
            const key = CredentialsManager.getInstance().getGroqSttApiKey();
            if (!key) {
                console.warn('[QuestionDetector] SELF-TEST SKIPPED: no Groq STT API key found (set it in Settings → STT → Groq). Detector cannot run without it.');
                return;
            }
            void detectionClient.detect({
                recentInterviewerTranscript: 'INTERVIEWER: Can you implement an LRU cache in Python?',
                fullConversationContext: 'INTERVIEWER: Can you implement an LRU cache in Python?',
            }).then(r => {
                if (r) {
                    console.log(`[QuestionDetector] SELF-TEST PASS: model=${detectorModel} detected=${r.detected} intent=${r.intent} conf=${r.confidence}`);
                } else {
                    console.warn(`[QuestionDetector] SELF-TEST FAIL: detect() returned null for model=${detectorModel} — see [GroqDetectionClient] log above for the HTTP/parse cause.`);
                }
            }).catch(e => console.warn('[QuestionDetector] SELF-TEST threw:', e?.message));
        }, 2500);

        // Full-chain test (env-gated, NATIVELY_DETECTOR_CHAIN_TEST=1): injects a
        // synthetic INTERVIEWER question through the REAL pipeline
        // (session → engine → transcript-segment-final → detector → debounce →
        // detect → chip → question-detected → main.ts → webContents.send) so the
        // whole path is verifiable without live interviewer audio. Watch the log
        // for: [Engine-timing] segment-final → detect ok → chip emitted →
        // [Main] forwarding detected-question.
        if (process.env.NATIVELY_DETECTOR_CHAIN_TEST === '1') {
            setTimeout(() => {
                console.log('[ChainTest] injecting synthetic interviewer transcript (final, ends with "?") into the real pipeline...');
                this.addTranscript({
                    speaker: 'interviewer',
                    text: 'Can you implement an LRU cache in Python?',
                    timestamp: Date.now(),
                    final: true,
                    confidence: 1,
                }, false);
                // Ends with '?' → detector takes the fast path (no debounce).
            }, 6000);
            // Second injection: no '?', but stamped with a speech-end 900ms in the
            // past (typical VAD hangover + upload) → detector should schedule only
            // the remaining ~600ms of its 1.5s debounce (crediting path).
            setTimeout(() => {
                console.log('[ChainTest] injecting credited transcript (no "?", speechEndedAt=-900ms)...');
                this.addTranscript({
                    speaker: 'interviewer',
                    text: 'Walk me through the tradeoffs between LFU and FIFO eviction policies.',
                    timestamp: Date.now(),
                    final: true,
                    confidence: 1,
                    speechEndedAt: Date.now() - 900,
                }, false);
            }, 14000);
        }

        // Env-gated calibration of the detection prompt + deterministic merge, on the
        // REAL model with the app's own key (NATIVELY_DETECTOR_CALIBRATE=1): the
        // harness reads these lines. Goes through a real QuestionDetector per case
        // (not detectionClient directly) so the gate exercises the merge in
        // mergeScenarioSentence.ts, not just the prompt — the prompt alone is not
        // reliable for this (see questionDetection.ts). Delayed so credentials are
        // loaded first. Never set in production — also gated on !app.isPackaged so a
        // packaged build can't be made to run this by an environment variable.
        if (!require('electron').app.isPackaged && process.env.NATIVELY_DETECTOR_CALIBRATE === '1') {
            setTimeout(async () => {
                let pass = 0;
                for (const c of DETECTOR_CALIBRATION_CASES) {
                    const lines = c.statement ? [`[INTERVIEWER]: ${c.statement}`, `[INTERVIEWER]: ${c.question}`] : [`[INTERVIEWER]: ${c.question}`];
                    const transcript = lines.join('\n');
                    const chip = await new Promise<DetectedQuestionChip | null>((resolve) => {
                        const ceiling = setTimeout(() => resolve(null), 15000);
                        const det = new QuestionDetector({
                            client: detectionClient,
                            snapshotProvider: {
                                getRecentInterviewerTranscript: () => transcript,
                                getContextSnapshot: () => transcript,
                            },
                            onChip: (ch) => { clearTimeout(ceiling); resolve(ch); },
                        });
                        const t0 = Date.now();
                        if (c.statement) {
                            det.onTranscriptFinal({ speaker: 'interviewer', text: c.statement, timestamp: t0 - 3000, final: true });
                        }
                        det.onTranscriptFinal({ speaker: 'interviewer', text: c.question, timestamp: t0, final: true });
                    });
                    const result: { detected: boolean; question: string } | null = chip ? { detected: true, question: chip.question } : null;
                    const j = judgeDetection(result, c.mustContain);
                    if (j.ok) pass++;
                    console.log(`[DetectorCalibration] ${j.ok ? 'PASS' : 'FAIL'} ${c.id} detected=${result !== null} q=${JSON.stringify(result?.question ?? '')}${j.missing.length ? ` missing=${j.missing.join(',')}` : ''}`);
                }
                console.log(`[DetectorCalibration] ${pass}/${DETECTOR_CALIBRATION_CASES.length} pass`);
            }, 3000);
        }
    }

    /** Mute/unmute the whisper→chip detection pipeline (independent of Live Mode). */
    setDetectionEnabled(enabled: boolean): void {
        this.questionDetector.setEnabled(enabled);
    }

    getDetectionEnabled(): boolean {
        return this.questionDetector.isEnabled();
    }

    /** Clear detector state — call on meeting boundary. */
    clearDetectedQuestions(): void {
        this.questionDetector.clear();
    }

    /**
     * Forward all events from IntelligenceEngine through this facade
     * so existing listeners on IntelligenceManager continue to work.
     */
    private forwardEngineEvents(): void {
        const events = [
            'assist_update', 'suggested_answer', 'suggested_answer_token',
            'suggested_answer_source',
            'refined_answer', 'refined_answer_token',
            'recap', 'recap_token', 'clarify', 'clarify_token',
            'follow_up_questions_update', 'follow_up_questions_token',
            'manual_answer_started', 'manual_answer_result',
            'mode_changed', 'error'
        ];

        for (const event of events) {
            this.engine.on(event, (...args: any[]) => {
                this.emit(event, ...args);
            });
        }
    }

    // ============================================
    // LLM Initialization (delegates to engine)
    // ============================================

    initializeLLMs(): void {
        // Cancel any in-flight streams before swapping LLM clients
        this.engine.reset();
        this.engine.initializeLLMs();
    }

    reinitializeLLMs(): void {
        this.engine.reset();
        this.engine.reinitializeLLMs();
    }

    // ============================================
    // Context Management (delegates to session)
    // ============================================

    setMeetingMetadata(metadata: any): void {
        this.session.setMeetingMetadata(metadata);
    }

    addTranscript(segment: import('./SessionTracker').TranscriptSegment, skipRefinementCheck: boolean = false): void {
        if (skipRefinementCheck) {
            // Direct add without refinement detection
            this.session.addTranscript(segment);
        } else {
            // Let the engine handle transcript + refinement detection
            this.engine.handleTranscript(segment, false);
        }
    }

    addAssistantMessage(text: string): void {
        this.session.addAssistantMessage(text);
    }

    getContext(lastSeconds: number = 120) {
        return this.session.getContext(lastSeconds);
    }

    getLastAssistantMessage(): string | null {
        return this.session.getLastAssistantMessage();
    }

    getFormattedContext(lastSeconds: number = 120, options?: { excludeAssistant?: boolean }): string {
        return this.session.getFormattedContext(lastSeconds, options);
    }

    getLastInterviewerTurn(): string | null {
        return this.session.getLastInterviewerTurn();
    }

    logUsage(type: string, question: string, answer: string): void {
        this.session.logUsage(type, question, answer);
    }

    // ============================================
    // Transcript Handling (delegates to engine)
    // ============================================

    handleTranscript(segment: import('./SessionTracker').TranscriptSegment): void {
        if (segment.speaker === 'interviewer' && segment.text.trim()) {
            // Interims included: on 2026-09-02 the only record of a question the
            // STT socket dropped mid-sentence was its last interim.
            this.recentInterviewerSpeech.push({ text: segment.text, at: segment.timestamp, final: segment.final });
            if (this.recentInterviewerSpeech.length > 40) this.recentInterviewerSpeech.shift();
        }
        this.engine.handleTranscript(segment);
    }

    /** Interviewer finals and interims from the last windowMs, oldest first. */
    getRecentInterviewerSpeech(windowMs: number = 15_000): import('./services/questionReconcile').RecentSpeech[] {
        const cutoff = Date.now() - windowMs;
        return this.recentInterviewerSpeech.filter((s) => s.at >= cutoff);
    }

    async handleSuggestionTrigger(trigger: import('./SessionTracker').SuggestionTrigger): Promise<void> {
        return this.engine.handleSuggestionTrigger(trigger);
    }

    // ============================================
    // Mode Executors (delegates to engine)
    // ============================================

    async runAssistMode(): Promise<string | null> {
        return this.engine.runAssistMode();
    }

    async runWhatShouldISay(
        question?: string,
        confidence: number = 0.8,
        imagePaths?: string[],
        options: {
            intentOverride?: 'verbal' | 'coding' | 'behavioral';
            contextOverride?: string;
            bypassCooldown?: boolean;
            forceFastModel?: boolean;
        } = {}
    ): Promise<string | null> {
        return this.engine.runWhatShouldISay(question, confidence, imagePaths, options);
    }

    async runFollowUp(intent: string, userRequest?: string): Promise<string | null> {
        return this.engine.runFollowUp(intent, userRequest);
    }

    async runRecap(): Promise<string | null> {
        return this.engine.runRecap();
    }

    async runClarify(): Promise<string | null> {
        return this.engine.runClarify();
    }

    async runFollowUpQuestions(): Promise<string | null> {
        return this.engine.runFollowUpQuestions();
    }

    async runManualAnswer(question: string): Promise<string | null> {
        return this.engine.runManualAnswer(question);
    }

    async runCodeHint(imagePaths?: string[], problemStatement?: string): Promise<string | null> {
        return this.engine.runCodeHint(imagePaths, problemStatement);
    }

    setCodingQuestion(question: string, source: 'screenshot' | 'transcript'): void {
        this.session.setCodingQuestion(question, source);
    }

    getDetectedCodingQuestion(): { question: string | null; source: 'screenshot' | 'transcript' | null } {
        return this.session.getDetectedCodingQuestion();
    }

    clearCodingQuestion(): void {
        this.session.clearCodingQuestion();
    }

    async runBrainstorm(imagePaths?: string[], problemStatement?: string): Promise<string | null> {
        return this.engine.runBrainstorm(imagePaths, problemStatement);
    }

    // ============================================
    // State Management
    // ============================================

    getActiveMode() {
        return this.engine.getActiveMode();
    }

    setMode(mode: import('./IntelligenceEngine').IntelligenceMode): void {
        // This was private in the original, but kept for compatibility
        (this.engine as any).setMode(mode);
    }

    // ============================================
    // Meeting Lifecycle (delegates to persistence)
    // ============================================

    async stopMeeting(): Promise<string | null> {
        this.clearDetectedQuestions();
        return this.persistence.stopMeeting();
    }

    async recoverUnprocessedMeetings(): Promise<void> {
        return this.persistence.recoverUnprocessedMeetings();
    }

    // ============================================
    // Reset (resets all sub-modules)
    // ============================================

    /**
     * resetEngine: Cancel in-flight LLM streams WITHOUT touching session state.
     * Use this when swapping API keys or providers mid-session so the transcript
     * is not wiped. (full reset() also clears the session — only use that at
     * end of meeting or explicit session teardown.)
     */
    resetEngine(): void {
        this.engine.reset();
    }

    reset(): void {
        this.session.reset();
        this.engine.reset();
    }
}
