import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { resampleTo16kMono, type LiveConnectFn, type LiveSessionLike } from './GeminiLiveRouter';
import { ROUTER_INSTRUCTION, ROUTER_BLOCK_B } from './routerInstruction';

export const ROUTER_MODEL = 'gemini-3.8-live';
export const INSTRUCTION_SHA256 = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
export const BLOCK_B_SHA256 = 'e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8';
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
/** Checked once at module load (spec 4.1); a mismatch makes start() refuse, so the flag has no effect. */
export const ROUTER_SHAS_OK = sha256(ROUTER_INSTRUCTION) === INSTRUCTION_SHA256 && sha256(ROUTER_BLOCK_B) === BLOCK_B_SHA256;
export const buildRouterSystem = (context: string): string => `${ROUTER_INSTRUCTION}\n\n${context}\n\n${ROUTER_BLOCK_B}`;

export type RouterEndKind = 'generationComplete' | 'turnComplete' | 'interrupted' | 'closed';
export interface RouterTurnEvent { seq: number; text: string; firstTextAt: number; completed: boolean; endKind?: RouterEndKind; endedAt?: number; afterComplete?: boolean }
export interface RouterSessionOpts { getApiKey: () => string | undefined; getContext: () => string; connectFn?: LiveConnectFn; model?: string; log?: (line: string) => void; now?: () => number; shasOk?: boolean }

// The ear's constants (GeminiLiveRouter.ts 197-210), spec 4.1.
const QUICK_RECONNECT_ATTEMPTS = 3, RECONNECT_BASE_DELAY_MS = 300, SLOW_RETRY_INTERVAL_MS = 15_000;
const QUOTA_BACKOFF_BASE_MS = 5_000, QUOTA_BACKOFF_MAX_MS = 60_000;

const defaultConnect: LiveConnectFn = async ({ apiKey, model, config, callbacks }) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleGenAI } = require('@google/genai');
  return new GoogleGenAI({ apiKey, apiVersion: 'v1beta' }).live.connect({ model, config, callbacks });
};

export class LiveRouterSession extends EventEmitter {
  private generation = 0;
  private session: LiveSessionLike | null = null;
  private up = false;
  private stopping = true;
  private reconnectAttempts = 0;
  private inSlowRetry = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private quotaCloses = 0;
  private context: string | null = null;
  private connectStartedAt = 0;
  private seq = 0;
  private cur: { seq: number; text: string; firstTextAt: number; ended: boolean; completed: boolean; endKind?: RouterEndKind; endedAt?: number } | null = null;
  private audioChunksOut = 0;
  private readonly connectFn: LiveConnectFn;
  private readonly model: string;
  private readonly log: (line: string) => void;
  private readonly now: () => number;
  private readonly shasOk: boolean;

  constructor(private readonly opts: RouterSessionOpts) {
    super();
    this.connectFn = opts.connectFn ?? defaultConnect;
    this.model = opts.model ?? ROUTER_MODEL;
    this.log = opts.log ?? ((l) => console.log(l));
    this.now = opts.now ?? Date.now;
    this.shasOk = opts.shasOk ?? ROUTER_SHAS_OK;
  }

  isUp(): boolean { return this.up; }
  contextInfo(): { sha12: string; chars: number } | null { return this.context === null ? null : { sha12: sha256(this.context).slice(0, 12), chars: this.context.length }; }

  async start(): Promise<void> {
    if (this.model !== ROUTER_MODEL) { this.log('[Router] session refused reason=model-mismatch'); return; }
    if (!this.shasOk) { this.log('[Router] session refused reason=sha-mismatch'); return; }
    this.stopping = false; this.reconnectAttempts = 0; this.inSlowRetry = false; this.quotaCloses = 0;
    // I7: the summary is read ONCE per meeting, before the first connect. The knowledge cache may not be filled yet at
    // meeting start, so an empty read is retried up to 3 times, 1 s apart, BEFORE connecting. The sha then stays fixed
    // for the meeting (spec 4.1a). Still empty after that: connect with '' (the spec's empty case), logged.
    for (let attempt = 1; attempt <= 3; attempt++) {
      let c = ''; try { c = this.opts.getContext() ?? ''; } catch { c = ''; }
      if (c || attempt === 3) { this.context = c; if (!c) this.log(`[Router] context empty at start attempt=${attempt}`); break; }
      this.log(`[Router] context empty at start attempt=${attempt}`);
      await new Promise((r) => setTimeout(r, 1000));
      if (this.stopping) return;
    }
    await this.connect();
  }

  stop(): void {
    this.stopping = true; this.generation++;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    const s = this.session; this.session = null;
    try { s?.close(); } catch { /* already closed */ }
    this.endTurn('closed', false); this.cur = null;
    this.setUp(false);
    this.context = null; // cached once per meeting (spec 4.1a); the next meeting rebuilds it
  }

  write(chunk: Buffer, sampleRate: number, numChannels = 1): void {
    if (!this.up || !this.session) return; // no gap buffer, no replay (spec 4.1)
    try {
      const pcm = resampleTo16kMono(chunk, sampleRate, numChannels);
      if (pcm.length) this.session.sendRealtimeInput({ audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
    } catch (err: any) { console.warn('[Router] write failed:', err?.message ?? err); }
  }

  private setUp(up: boolean): void {
    if (this.up === up) return;
    this.up = up; this.emit('state', { up, at: this.now() });
  }

  private async connect(): Promise<void> {
    if (this.stopping) return;
    const gen = ++this.generation;
    const apiKey = this.opts.getApiKey();
    if (!apiKey) { this.handleClose({ reason: 'no Gemini API key' }, gen); return; }
    if (this.context === null) { try { this.context = this.opts.getContext() ?? ''; } catch { this.context = ''; } }
    const ctx = this.context;
    this.log(`[Router] session connect model=${this.model} block_sha12=${BLOCK_B_SHA256.slice(0, 12)} instruction_sha12=${INSTRUCTION_SHA256.slice(0, 12)} context_sha12=${sha256(ctx).slice(0, 12)} context_chars=${ctx.length}`);
    this.connectStartedAt = this.now();
    try {
      const session = await this.connectFn({
        apiKey, model: this.model,
        config: {
          responseModalities: ['AUDIO'],
          systemInstruction: { parts: [{ text: buildRouterSystem(ctx) }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
          onopen: () => { /* up comes at setupComplete only */ },
          onmessage: (msg) => { if (gen === this.generation) this.handleMessage(msg); },
          onerror: (e: any) => { console.warn('[Router] ws error:', e?.message ?? e); },
          onclose: (e: any) => this.handleClose(e, gen),
        },
      });
      if (this.stopping || gen !== this.generation) { try { session.close(); } catch { /* noop */ } return; }
      this.session = session;
    } catch (err: any) {
      this.handleClose({ reason: err?.message ?? String(err) }, gen);
    }
  }

  private handleMessage(msg: any): void {
    const sc = msg?.serverContent;
    if (this.quotaCloses && (sc || msg?.setupComplete)) this.quotaCloses = 0;
    if (msg?.setupComplete) {
      this.reconnectAttempts = 0; this.inSlowRetry = false;
      this.log(`[Router] session up setup_ms=${this.now() - this.connectStartedAt}`);
      this.setUp(true);
    }
    if (msg?.goAway) {
      const s = this.session; this.session = null; this.generation++; // its own onclose is now stale
      try { s?.close(); } catch { /* noop */ }
      this.endTurn('closed', false); this.cur = null; this.setUp(false);
      this.scheduleReconnect('goAway');
      return;
    }
    const text = sc?.outputTranscription?.text;
    if (text) this.onText(String(text));
    for (const p of sc?.modelTurn?.parts ?? []) if (p?.inlineData) this.audioChunksOut++; // counted, discarded
    if (sc?.generationComplete) this.endTurn('generationComplete', true);
    if (sc?.turnComplete) { this.endTurn('turnComplete', true); this.cur = null; }
    if (sc?.interrupted) { this.endTurn('interrupted', false); this.cur = null; }
  }

  private onText(t: string): void {
    if (!this.cur) this.cur = { seq: ++this.seq, text: '', firstTextAt: this.now(), ended: false, completed: false };
    const c = this.cur; c.text += t;
    if (c.ended) this.emit('turn', { seq: c.seq, text: c.text, firstTextAt: c.firstTextAt, completed: c.completed, endKind: c.endKind, endedAt: c.endedAt, afterComplete: true } as RouterTurnEvent);
    else this.emit('turn', { seq: c.seq, text: c.text, firstTextAt: c.firstTextAt, completed: false } as RouterTurnEvent);
  }

  private endTurn(kind: RouterEndKind, completed: boolean): void {
    const c = this.cur; if (!c || c.ended) return;
    c.ended = true; c.completed = completed; c.endKind = kind; c.endedAt = this.now();
    this.emit('turn', { seq: c.seq, text: c.text, firstTextAt: c.firstTextAt, completed, endKind: kind, endedAt: c.endedAt } as RouterTurnEvent);
  }

  private handleClose(e: any, gen: number): void {
    const stale = gen !== this.generation;
    const reason = e?.reason ? String(e.reason) : 'connection closed';
    const quota = /quota|resource_exhausted/i.test(reason);
    this.log(`[Router] session close gen=${gen} code=${e?.code ?? '-'} reason=${reason} stale=${stale ? 'yes' : 'no'} quota=${quota ? 'yes' : 'no'}`);
    if (stale) return;
    this.session = null; this.endTurn('closed', false); this.cur = null; this.setUp(false);
    if (this.stopping) return;
    if (quota) {
      this.quotaCloses++;
      const delay = Math.min(QUOTA_BACKOFF_MAX_MS, QUOTA_BACKOFF_BASE_MS * 2 ** (this.quotaCloses - 1));
      this.log(`[Router] session reconnect attempt=quota-${this.quotaCloses} reason=quota backoff ${delay}ms`);
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; void this.connect(); }, delay);
      this.reconnectTimer.unref?.();
      return;
    }
    this.scheduleReconnect(reason);
  }

  private scheduleReconnect(reason: string): void {
    if (this.stopping || this.reconnectTimer) return;
    if (this.reconnectAttempts >= QUICK_RECONNECT_ATTEMPTS) {
      if (!this.inSlowRetry) { this.inSlowRetry = true; this.emit('failed', { reason }); } // once, on the transition
      this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; void this.connect(); }, SLOW_RETRY_INTERVAL_MS);
      this.reconnectTimer.unref?.();
      return;
    }
    this.reconnectAttempts++;
    this.log(`[Router] session reconnect attempt=${this.reconnectAttempts} reason=${reason}`);
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; void this.connect(); }, RECONNECT_BASE_DELAY_MS * this.reconnectAttempts);
    this.reconnectTimer.unref?.();
  }
}
