import { EventEmitter } from 'events';

/**
 * GeminiLiveRouter — optional "Live Mode" pipeline (ear + router, never the mouth).
 *
 * Holds a Gemini Live API WebSocket session (gemini-3.1-flash-live-preview) that
 * continuously hears the interviewer channel (same system-audio PCM the STT
 * pipeline receives). The live model NEVER answers: a silent-listener system
 * prompt restricts it to firing the handle_question(question, category) tool
 * when it hears the interviewer ask something. The category maps 1:1 onto the
 * existing chip intents, and main feeds the question straight into
 * IntelligenceManager.runWhatShouldISay — so answers come from the same models
 * as always (Gemma 4 31B for coding, Flash for verbal/behavioral), with all the
 * prompt/warmth/retry work intact.
 *
 * Why not let the live model answer? Empirically (2026-07-24 smoke test): every
 * live-capable model on the Developer API is AUDIO-output-only — TEXT modality
 * is rejected. Text for the overlay would have to ride the output transcription
 * at speech pace, ~7s/turn, with thought-summary noise. Routing to the existing
 * warmed REST streaming models is both faster and consistent.
 *
 * Failure policy: HARD-FAIL VISIBLE (user's explicit choice) + meeting-length
 * self-healing. After QUICK_RECONNECT_ATTEMPTS consecutive failures the router
 * emits {state:'failed', reason} (red chip) — never a silent fallback — but
 * keeps retrying every SLOW_RETRY_INTERVAL_MS for as long as the meeting runs,
 * resurrecting to 'connected' when the API/network recovers. The whisper →
 * detector → chip chain keeps running underneath regardless, so the app still
 * works; the UI just shows Live as down while it is.
 *
 * Session limits: the Live API caps audio-only sessions at 15 min (lifted by
 * contextWindowCompression) and single connections at ~10 min. The server
 * sends `goAway` before dropping; we reconnect with the session-resumption
 * handle so context carries over. Audio that arrives while disconnected is
 * ring-buffered (20s) and replayed on reconnect, so questions spoken during a
 * reconnect gap are still heard. Context loss on a failed resume is harmless
 * here: each question routes independently, so the listener needs no history.
 */

export type LiveRouterState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'stopped';

export type LiveCategory = 'behavioral' | 'verbal_technical' | 'coding_heavy';
export type ChipIntent = 'verbal' | 'coding' | 'behavioral';

export interface LiveQuestionEvent {
  question: string;
  category: LiveCategory;
  intent: ChipIntent;
}

export interface LiveStatusEvent {
  state: LiveRouterState;
  reason?: string;
}

export const LIVE_ROUTER_MODEL =
  process.env.NATIVELY_LIVE_MODEL || 'gemini-3.1-flash-live-preview';

/**
 * Validated live (2026-07-24): 4/4 turns routed correctly, toolCall in
 * 139-498ms, non-questions correctly ignored. Wording changes here should be
 * re-verified against the real model (scratchpad live-route-test.mjs).
 */
export const LIVE_LISTENER_PROMPT = `You are a silent meeting listener embedded in an interview-assistant app. You NEVER speak or answer out loud.
Your ONLY job: when the interviewer asks the candidate a question (or gives a task), call handle_question with:
- question: the question as asked, cleaned up. When it depends on what the interviewer said just before it — a scenario, numbers, constraints, a system being described — include those sentences too, so the question stands on its own; otherwise one clear sentence. Do not call the tool while the interviewer is still setting up a scenario: wait for the actual question, then report the whole thing once
- category: "coding_heavy" if answering well requires writing code, implementing an algorithm/data structure, complexity analysis, or detailed system design; otherwise "behavioral" for experience/situational/personal questions; otherwise "verbal_technical" for conceptual technical questions answerable in speech.
Never produce audio. Never answer the question yourself. If speech is not a question for the candidate, do nothing.`;

export const HANDLE_QUESTION_TOOL = {
  functionDeclarations: [
    {
      name: 'handle_question',
      description:
        'Report a question the interviewer just asked, with routing category.',
      parameters: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          category: {
            type: 'STRING',
            enum: ['behavioral', 'verbal_technical', 'coding_heavy'],
          },
        },
        required: ['question', 'category'],
      },
    },
  ],
};

/**
 * Function words — carry no subject matter on their own. Used to tell a real
 * question from a fragment the model emitted mid-turn.
 */
const FUNCTION_WORDS = new Set([
  'a', 'about', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but',
  'by', 'can', 'could', 'did', 'do', 'does', 'for', 'from', 'had', 'has',
  'have', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'just', 'like', 'may',
  'me', 'might', 'much', 'my', 'of', 'on', 'or', 'our', 'out', 'should', 'so',
  'some', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they',
  'this', 'to', 'um', 'up', 'us', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
]);

/**
 * Minimum topic words for a report to be treated as a real question.
 *
 * Measured 2026-07-28: on a mid-question pause the listener sometimes emits the
 * partial turn as a question — "What is?" — which then gets answered, producing
 * a junk card (realistic-paths V5). Every genuine reported question in a 35-fire
 * corpus carried >= 2 content words; the fragments carried 0. Two is chosen over
 * a word-count floor so a terse-but-real prompt ("Reverse a linked list.")
 * still passes.
 */
const MIN_CONTENT_WORDS = 2;

/** Topic-bearing words in a question, deduped. */
export function questionContentWords(question: string): string[] {
  const words = question.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
  return [...new Set(words.filter((w) => w.length > 1 && !FUNCTION_WORDS.has(w)))];
}

/**
 * Does this look like a question at all, as opposed to a fragment the model
 * emitted before the interviewer finished speaking?
 */
export function hasQuestionSubstance(question: string): boolean {
  return questionContentWords(question).length >= MIN_CONTENT_WORDS;
}

/** Map the live model's routing category onto the existing chip intent union. */
export function liveCategoryToIntent(category: string): ChipIntent {
  if (category === 'coding_heavy') return 'coding';
  if (category === 'behavioral') return 'behavioral';
  return 'verbal';
}

/**
 * Resample Int16LE PCM from inputRate/numChannels → 16kHz mono.
 * Integer decimation — same approach as RestSTT/Rust DSP/OpenAIStreamingSTT.
 */
export function resampleTo16kMono(
  raw: Buffer,
  inputRate: number,
  numChannels = 1
): Buffer {
  const TARGET_RATE = 16_000;
  const numSamples = Math.floor(raw.length / 2);
  const inputS16 = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    inputS16[i] = raw.readInt16LE(i * 2);
  }

  if (inputRate === TARGET_RATE && numChannels === 1) {
    return Buffer.from(inputS16.buffer, inputS16.byteOffset, inputS16.byteLength);
  }

  let monoS16: Int16Array;
  if (numChannels > 1) {
    const monoLen = Math.floor(inputS16.length / numChannels);
    monoS16 = new Int16Array(monoLen);
    for (let i = 0; i < monoLen; i++) {
      let sum = 0;
      for (let c = 0; c < numChannels; c++) {
        sum += inputS16[i * numChannels + c];
      }
      monoS16[i] = Math.round(sum / numChannels);
    }
  } else {
    monoS16 = inputS16;
  }

  if (inputRate === TARGET_RATE) {
    return Buffer.from(monoS16.buffer, monoS16.byteOffset, monoS16.byteLength);
  }

  const factor = inputRate / TARGET_RATE;
  const outLen = Math.floor(monoS16.length / factor);
  const outS16 = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    outS16[i] = monoS16[Math.floor(i * factor)];
  }
  return Buffer.from(outS16.buffer, outS16.byteOffset, outS16.byteLength);
}

/**
 * Meeting-length persistence: quick retries handle transient blips; after they
 * are exhausted the router goes 'failed' (VISIBLE — red chip) but keeps trying
 * on a slow cadence for the rest of the meeting, resurrecting to 'connected'
 * if the API/network recovers. Only stop() (toggle off / meeting end) ends it.
 */
const QUICK_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 300;
const SLOW_RETRY_INTERVAL_MS = 15_000;
/**
 * Quota closes (code 1011 "You exceeded your current quota") back off instead of
 * quick-retrying. 2026-09-03 13:45–13:54 UTC on gemini-2.5-flash-native-audio-latest:
 * a goAway reconnect was quota-closed, the 300 ms retry resumed the ~10K-token
 * session and was closed again, and — each attempt briefly reaching connected —
 * the loop never escalated: 311 closes in nine minutes (65–78/min at the peak),
 * four questions lost. 5 s doubling to 60 s, and the reconnect starts a fresh
 * session so the old context is not re-billed on every attempt.
 */
const QUOTA_BACKOFF_BASE_MS = 5_000;
const QUOTA_BACKOFF_MAX_MS = 60_000;
/** Suppress re-detections of the same question (model may re-fire after a tool response). */
const DUPLICATE_WINDOW_MS = 10_000;
/**
 * Ring buffer for audio that arrives while disconnected (initial connect,
 * goAway reconnects every ~10 min, network blips). Flushed on reconnect so a
 * question spoken during the gap is still heard. 20s of 16kHz mono PCM16.
 */
const GAP_BUFFER_MAX_BYTES = 16_000 * 2 * 20;

/** Minimal surface of the @google/genai live session we use — injectable for tests. */
export interface LiveSessionLike {
  sendRealtimeInput(input: { audio: { data: string; mimeType: string } }): void;
  sendToolResponse(payload: {
    functionResponses: Array<{ id?: string; name: string; response: Record<string, unknown> }>;
  }): void;
  close(): void;
}

export type LiveConnectFn = (params: {
  apiKey: string;
  model: string;
  config: Record<string, unknown>;
  callbacks: {
    onopen: () => void;
    onmessage: (msg: any) => void;
    onerror: (e: any) => void;
    onclose: (e: any) => void;
  };
}) => Promise<LiveSessionLike>;

/** Default connect via @google/genai — required lazily so tests never load the SDK. */
const defaultConnect: LiveConnectFn = async ({ apiKey, model, config, callbacks }) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  return ai.live.connect({ model, config, callbacks });
};

export class GeminiLiveRouter extends EventEmitter {
  private session: LiveSessionLike | null = null;
  private state: LiveRouterState = 'idle';
  private resumptionHandle: string | null = null;
  private reconnectAttempts = 0;
  private stopping = false;
  private inSlowRetry = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  /** Consecutive quota closes; reset once a session carries real traffic. */
  private quotaCloses = 0;
  private recentQuestions: Array<{ text: string; at: number }> = [];
  private gapBuffer: Buffer[] = [];
  private gapBufferBytes = 0;
  /** Bumped on every connect, goAway and stop; a callback from an older generation is stale (DIAG Q1). */
  private generation = 0;

  constructor(
    private readonly getApiKey: () => string | undefined,
    private readonly connectFn: LiveConnectFn = defaultConnect,
    private readonly model: string = LIVE_ROUTER_MODEL
  ) {
    super();
  }

  public getModel(): string {
    return this.model;
  }

  public getState(): LiveRouterState {
    return this.state;
  }

  public async start(): Promise<void> {
    this.stopping = false;
    this.reconnectAttempts = 0;
    await this.connect();
  }

  public stop(): void {
    this.stopping = true;
    this.generation++;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.gapBuffer = [];
    this.gapBufferBytes = 0;
    const session = this.session;
    this.session = null;
    try {
      session?.close();
    } catch {
      /* already closed */
    }
    this.setState('stopped');
  }

  /**
   * Tee point for interviewer-channel PCM (called next to googleSTT.write).
   * Resamples to the Live API's required 16kHz mono PCM16 and streams it.
   * While disconnected (initial connect, goAway reconnect, network blip) the
   * audio is ring-buffered and replayed on reconnect so no question is lost.
   * Callers never need to guard — idle/stopped states drop silently.
   */
  public write(chunk: Buffer, sampleRate: number, numChannels = 1): void {
    if (this.state === 'idle' || this.state === 'stopped' || this.stopping) return;
    try {
      const pcm = resampleTo16kMono(chunk, sampleRate, numChannels);
      if (pcm.length === 0) return;
      if (this.state === 'connected' && this.session) {
        this.session.sendRealtimeInput({
          audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' },
        });
      } else {
        this.bufferGapAudio(pcm);
      }
    } catch (err: any) {
      console.warn('[LiveRouter] write failed:', err?.message ?? err);
    }
  }

  private bufferGapAudio(pcm16k: Buffer): void {
    this.gapBuffer.push(pcm16k);
    this.gapBufferBytes += pcm16k.length;
    while (this.gapBufferBytes > GAP_BUFFER_MAX_BYTES && this.gapBuffer.length > 0) {
      const dropped = this.gapBuffer.shift()!;
      this.gapBufferBytes -= dropped.length;
    }
  }

  /** Replay audio captured while disconnected. Server accepts faster-than-realtime input. */
  private maybeFlushGapBuffer(): void {
    if (this.state !== 'connected' || !this.session || this.gapBuffer.length === 0) return;
    const chunks = this.gapBuffer;
    this.gapBuffer = [];
    this.gapBufferBytes = 0;
    console.log(`[LiveRouter] replaying ${chunks.length} buffered gap chunk(s)`);
    for (const pcm of chunks) {
      try {
        this.session.sendRealtimeInput({
          audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' },
        });
      } catch (err: any) {
        console.warn('[LiveRouter] gap replay failed:', err?.message ?? err);
        return;
      }
    }
  }

  private setState(state: LiveRouterState, reason?: string): void {
    this.state = state;
    const payload: LiveStatusEvent = reason ? { state, reason } : { state };
    this.emit('status', payload);
  }

  private async connect(): Promise<void> {
    const gen = ++this.generation;
    const apiKey = this.getApiKey();
    if (!apiKey) {
      // Visible failure, but keep the slow retry alive — the user may paste a
      // key into Settings mid-meeting and Live Mode should self-heal.
      if (!this.inSlowRetry) {
        this.setState('failed', 'No Gemini API key configured');
        this.inSlowRetry = true;
      }
      this.scheduleSlowRetry();
      return;
    }
    // During slow retry the chip stays 'failed' (visible) — no amber flapping
    // every 15s; the next successful open flips it straight back to green.
    if (!this.inSlowRetry) {
      this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
    }
    try {
      const session = await this.connectFn({
        apiKey,
        model: this.model,
        config: {
          // AUDIO is the only modality live models accept; the listener prompt
          // keeps the model silent, so no audio is actually generated.
          responseModalities: ['AUDIO'],
          systemInstruction: { parts: [{ text: LIVE_LISTENER_PROMPT }] },
          tools: [HANDLE_QUESTION_TOOL],
          inputAudioTranscription: {},
          sessionResumption: this.resumptionHandle
            ? { handle: this.resumptionHandle }
            : {},
          contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
          onopen: () => {
            if (gen !== this.generation) return;
            this.reconnectAttempts = 0;
            this.inSlowRetry = false;
            this.setState('connected');
            // Replay anything spoken while we were disconnected.
            this.maybeFlushGapBuffer();
          },
          onmessage: (msg) => {
            if (gen !== this.generation) return;
            this.handleMessage(msg);
          },
          onerror: (e: any) => {
            console.warn('[LiveRouter] ws error:', e?.message ?? e);
          },
          onclose: (e: any) => this.handleClose(e, gen),
        },
      });
      if (this.stopping || gen !== this.generation) {
        // stop() or a newer connect raced the async connect — close the late session immediately.
        try {
          session.close();
        } catch {
          /* noop */
        }
        return;
      }
      this.session = session;
      // onopen may have fired before the session handle was assigned — flush
      // now that both conditions (connected + session) can hold.
      this.maybeFlushGapBuffer();
    } catch (err: any) {
      this.handleClose({ reason: err?.message ?? String(err) }, gen);
    }
  }

  private handleMessage(msg: any): void {
    // Real traffic proves the quota is back: the next quota close starts the backoff over.
    if (this.quotaCloses && (msg?.serverContent || msg?.toolCall)) this.quotaCloses = 0;
    // Session resumption handles — store the newest so reconnects keep context.
    const update = msg?.sessionResumptionUpdate;
    if (update?.resumable && update?.newHandle) {
      this.resumptionHandle = update.newHandle;
    }

    // Server is about to drop the connection (10-min cap) — reconnect proactively.
    if (msg?.goAway) {
      const session = this.session;
      this.session = null;
      this.generation++; // the closing session's onclose is now stale: one reconnect, not two
      try {
        session?.close();
      } catch {
        /* noop */
      }
      this.scheduleReconnect('server goAway (connection time limit)');
      return;
    }

    const calls = msg?.toolCall?.functionCalls;
    if (Array.isArray(calls)) {
      for (const fc of calls) {
        if (fc?.name !== 'handle_question') continue;
        // Always ack the tool call so the model's turn can complete.
        try {
          this.session?.sendToolResponse({
            functionResponses: [
              { id: fc.id, name: fc.name, response: { result: 'ok' } },
            ],
          });
        } catch {
          /* session mid-close */
        }
        const question = String(fc?.args?.question ?? '').trim();
        const rawCategory = String(fc?.args?.category ?? 'verbal_technical');
        const category: LiveCategory = (
          ['behavioral', 'verbal_technical', 'coding_heavy'] as const
        ).includes(rawCategory as LiveCategory)
          ? (rawCategory as LiveCategory)
          : 'verbal_technical';
        if (!question) continue;
        if (!hasQuestionSubstance(question)) {
          console.log(`[LiveRouter] ignored fragment (no subject matter): "${question}"`);
          continue;
        }
        if (this.isDuplicate(question)) continue;
        const event: LiveQuestionEvent = {
          question,
          category,
          intent: liveCategoryToIntent(category),
        };
        this.emit('question', event);
      }
    }

    // Streaming transcription of what the model hears (interviewer channel).
    const captionText = msg?.serverContent?.inputTranscription?.text;
    if (captionText) {
      this.emit('caption', { text: captionText });
    }
  }

  private isDuplicate(question: string): boolean {
    const now = Date.now();
    const norm = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    this.recentQuestions = this.recentQuestions.filter(
      (q) => now - q.at < DUPLICATE_WINDOW_MS
    );
    if (this.recentQuestions.some((q) => q.text === norm)) return true;
    this.recentQuestions.push({ text: norm, at: now });
    return false;
  }

  private handleClose(e: any, gen: number): void {
    const stale = gen !== this.generation;
    const reason = e?.reason ? String(e.reason) : 'connection closed';
    console.log(`[LiveRouter] close gen=${gen} code=${e?.code ?? '-'} reason=${reason} stale=${stale ? 'yes' : 'no'}`);
    if (stale) return;
    this.session = null;
    if (this.stopping) return; // stop() already set the terminal state
    if (/quota|resource_exhausted/i.test(reason)) {
      this.quotaCloses++;
      this.resumptionHandle = null;
      const delay = Math.min(QUOTA_BACKOFF_MAX_MS, QUOTA_BACKOFF_BASE_MS * 2 ** (this.quotaCloses - 1));
      console.warn(`[LiveRouter] quota close #${this.quotaCloses} — backing off ${delay}ms, reconnecting fresh`);
      if (!this.inSlowRetry) this.setState('reconnecting', 'quota backoff');
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (!this.stopping) void this.connect();
      }, delay);
      this.reconnectTimer.unref?.();
      return;
    }
    // A resumption handle that has ITSELF expired can never succeed: every
    // reconnect resumes the dead session, is closed again with the same
    // "session expired", and — because each attempt does briefly reach
    // 'connected' — resets reconnectAttempts, so the loop never escalates to
    // slow-retry. Observed in the wild as ~1 reconnect/second, indefinitely,
    // with no questions detected. Drop the handle and connect fresh; this
    // class already treats context loss on a failed resume as harmless.
    if (this.resumptionHandle && /expired/i.test(reason)) {
      console.warn('[LiveRouter] resumption handle expired — reconnecting without it');
      this.resumptionHandle = null;
    }
    this.scheduleReconnect(reason);
  }

  private scheduleReconnect(reason: string): void {
    if (this.stopping) return;
    if (this.reconnectTimer) return; // a reconnect is already pending
    if (this.reconnectAttempts >= QUICK_RECONNECT_ATTEMPTS) {
      // Hard-fail VISIBLE (red chip + reason) — but stay alive for the whole
      // meeting: keep retrying on a slow cadence and resurrect on success.
      // Emit 'failed' only on the transition so the UI doesn't flap.
      if (!this.inSlowRetry) {
        console.error(
          `[LiveRouter] ${QUICK_RECONNECT_ATTEMPTS} quick attempts failed (${reason}) — visible-failed, retrying every ${SLOW_RETRY_INTERVAL_MS / 1000}s`
        );
        this.setState('failed', reason);
        this.inSlowRetry = true;
      } else {
        console.warn(`[LiveRouter] slow retry failed (${reason}) — next in ${SLOW_RETRY_INTERVAL_MS / 1000}s`);
      }
      this.scheduleSlowRetry();
      return;
    }
    this.reconnectAttempts++;
    const delay = RECONNECT_BASE_DELAY_MS * this.reconnectAttempts;
    console.warn(
      `[LiveRouter] reconnecting (attempt ${this.reconnectAttempts}/${QUICK_RECONNECT_ATTEMPTS}) in ${delay}ms — ${reason}`
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.stopping) void this.connect();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private scheduleSlowRetry(): void {
    if (this.stopping || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.stopping) void this.connect();
    }, SLOW_RETRY_INTERVAL_MS);
    this.reconnectTimer.unref?.();
  }
}
