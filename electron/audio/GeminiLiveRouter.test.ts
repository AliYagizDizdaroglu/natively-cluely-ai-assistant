import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  GeminiLiveRouter,
  liveCategoryToIntent,
  resampleTo16kMono,
  LIVE_LISTENER_PROMPT,
  HANDLE_QUESTION_TOOL,
  type LiveConnectFn,
  type LiveSessionLike,
} from './GeminiLiveRouter';

function makeHarness(opts?: { apiKey?: string | undefined; connectFn?: LiveConnectFn }) {
  const sentAudio: any[] = [];
  const toolResponses: any[] = [];
  let closeCount = 0;
  const session: LiveSessionLike = {
    sendRealtimeInput: (i) => sentAudio.push(i),
    sendToolResponse: (p) => toolResponses.push(p),
    close: () => {
      closeCount++;
    },
  };
  const connectCalls: any[] = [];
  let cbs: any = null;
  const connectFn: LiveConnectFn =
    opts?.connectFn ??
    (vi.fn(async (params: any) => {
      connectCalls.push(params);
      cbs = params.callbacks;
      return session;
    }) as any);
  const hasKey = !opts || !('apiKey' in opts) || opts.apiKey !== undefined;
  const router = new GeminiLiveRouter(
    () => (hasKey ? (opts?.apiKey ?? 'test-key') : undefined),
    connectFn
  );
  const statuses: any[] = [];
  const questions: any[] = [];
  const captions: any[] = [];
  router.on('status', (s) => statuses.push(s));
  router.on('question', (q) => questions.push(q));
  router.on('caption', (c) => captions.push(c));
  return {
    router,
    session,
    connectFn,
    connectCalls,
    statuses,
    questions,
    captions,
    sentAudio,
    toolResponses,
    getCbs: () => cbs,
    getCloseCount: () => closeCount,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('liveCategoryToIntent', () => {
  it('maps live categories onto the chip intent union', () => {
    expect(liveCategoryToIntent('coding_heavy')).toBe('coding');
    expect(liveCategoryToIntent('behavioral')).toBe('behavioral');
    expect(liveCategoryToIntent('verbal_technical')).toBe('verbal');
    expect(liveCategoryToIntent('anything-else')).toBe('verbal');
  });
});

describe('resampleTo16kMono', () => {
  it('passes 16kHz mono through unchanged', () => {
    const raw = Buffer.alloc(8);
    raw.writeInt16LE(100, 0);
    raw.writeInt16LE(-200, 2);
    raw.writeInt16LE(300, 4);
    raw.writeInt16LE(-400, 6);
    const out = resampleTo16kMono(raw, 16_000, 1);
    expect(out.length).toBe(8);
    expect(out.readInt16LE(0)).toBe(100);
    expect(out.readInt16LE(6)).toBe(-400);
  });

  it('decimates 48kHz mono to one third the samples', () => {
    const samples = 48; // 48 samples of int16
    const raw = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) raw.writeInt16LE(i, i * 2);
    const out = resampleTo16kMono(raw, 48_000, 1);
    expect(out.length / 2).toBe(16);
    // Every 3rd input sample survives
    expect(out.readInt16LE(0)).toBe(0);
    expect(out.readInt16LE(2)).toBe(3);
    expect(out.readInt16LE(4)).toBe(6);
  });

  it('mixes stereo down to mono before decimating', () => {
    // 2 stereo frames at 16kHz: (100,300) and (-50,-150) → mono 200, -100
    const raw = Buffer.alloc(8);
    raw.writeInt16LE(100, 0);
    raw.writeInt16LE(300, 2);
    raw.writeInt16LE(-50, 4);
    raw.writeInt16LE(-150, 6);
    const out = resampleTo16kMono(raw, 16_000, 2);
    expect(out.length / 2).toBe(2);
    expect(out.readInt16LE(0)).toBe(200);
    expect(out.readInt16LE(2)).toBe(-100);
  });
});

describe('GeminiLiveRouter connection lifecycle', () => {
  it('goes connecting → connected on start + onopen', async () => {
    const h = makeHarness();
    await h.router.start();
    expect(h.statuses.map((s) => s.state)).toEqual(['connecting']);
    h.getCbs().onopen();
    expect(h.statuses.map((s) => s.state)).toEqual(['connecting', 'connected']);
    expect(h.router.getState()).toBe('connected');
  });

  it('hard-fails immediately (visible) when no API key is configured', async () => {
    const h = makeHarness({ apiKey: undefined });
    await h.router.start();
    expect(h.statuses).toEqual([
      { state: 'failed', reason: 'No Gemini API key configured' },
    ]);
    expect((h.connectFn as any).mock?.calls?.length ?? 0).toBe(0);
  });

  it('sends the silent-listener prompt and handle_question tool in config', async () => {
    const h = makeHarness();
    await h.router.start();
    const cfg = h.connectCalls[0].config;
    expect(cfg.systemInstruction.parts[0].text).toBe(LIVE_LISTENER_PROMPT);
    expect(cfg.tools).toEqual([HANDLE_QUESTION_TOOL]);
    expect(cfg.responseModalities).toEqual(['AUDIO']);
    expect(cfg.inputAudioTranscription).toEqual({});
  });

  it('retries with backoff and hard-fails VISIBLY after exhausting quick attempts', async () => {
    vi.useFakeTimers();
    const failingConnect: LiveConnectFn = vi.fn(async () => {
      throw new Error('boom 503');
    }) as any;
    const h = makeHarness({ connectFn: failingConnect });
    await h.router.start();
    // initial attempt + 3 scheduled retries, then visible 'failed'
    await vi.advanceTimersByTimeAsync(300);
    await vi.advanceTimersByTimeAsync(600);
    await vi.advanceTimersByTimeAsync(900);
    const states = h.statuses.map((s) => s.state);
    expect(states.filter((s) => s === 'reconnecting').length).toBe(3);
    expect(states[states.length - 1]).toBe('failed');
    expect(h.statuses[h.statuses.length - 1].reason).toContain('boom 503');
    expect(h.router.getState()).toBe('failed');
  });

  it('keeps retrying slowly after visible failure and resurrects on success', async () => {
    vi.useFakeTimers();
    let failCount = 0;
    let cbs: any = null;
    const session = {
      sendRealtimeInput: () => {},
      sendToolResponse: () => {},
      close: () => {},
    };
    const connectFn: LiveConnectFn = vi.fn(async (params: any) => {
      if (failCount < 5) {
        failCount++;
        throw new Error('offline');
      }
      cbs = params.callbacks;
      return session as any;
    }) as any;
    const h = makeHarness({ connectFn });
    await h.router.start();
    await vi.advanceTimersByTimeAsync(300);
    await vi.advanceTimersByTimeAsync(600);
    await vi.advanceTimersByTimeAsync(900); // quick attempts exhausted (4 fails)
    expect(h.router.getState()).toBe('failed');
    await vi.advanceTimersByTimeAsync(15_000); // slow retry #1 → fails (5th)
    expect(h.router.getState()).toBe('failed');
    // 'failed' emitted exactly once — no status flapping during slow retries
    expect(h.statuses.filter((s) => s.state === 'failed').length).toBe(1);
    await vi.advanceTimersByTimeAsync(15_000); // slow retry #2 → succeeds
    cbs.onopen();
    expect(h.router.getState()).toBe('connected');
  });

  it('reconnects on unexpected close and reuses the stored resumption handle', async () => {
    vi.useFakeTimers();
    const h = makeHarness();
    await h.router.start();
    h.getCbs().onopen();
    // Server hands us a resumption handle mid-session
    h.getCbs().onmessage({
      sessionResumptionUpdate: { resumable: true, newHandle: 'handle-abc' },
    });
    // Connection drops unexpectedly
    h.getCbs().onclose({ reason: 'network reset' });
    await vi.advanceTimersByTimeAsync(300);
    expect(h.connectCalls.length).toBe(2);
    expect(h.connectCalls[1].config.sessionResumption).toEqual({
      handle: 'handle-abc',
    });
    // Second connect succeeds → attempts reset, state connected again
    h.getCbs().onopen();
    expect(h.router.getState()).toBe('connected');
  });

  it('handles goAway by closing and reconnecting proactively', async () => {
    vi.useFakeTimers();
    const h = makeHarness();
    await h.router.start();
    h.getCbs().onopen();
    h.getCbs().onmessage({ goAway: { timeLeft: '5s' } });
    expect(h.getCloseCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(300);
    expect(h.connectCalls.length).toBe(2);
  });

  it('stop() closes the session, reports stopped, and never reconnects', async () => {
    vi.useFakeTimers();
    const h = makeHarness();
    await h.router.start();
    h.getCbs().onopen();
    h.router.stop();
    expect(h.getCloseCount()).toBe(1);
    expect(h.router.getState()).toBe('stopped');
    // The close callback that follows stop() must not trigger a reconnect
    h.getCbs().onclose({ reason: 'client closed' });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(h.connectCalls.length).toBe(1);
  });
});

describe('GeminiLiveRouter question routing', () => {
  async function connected() {
    const h = makeHarness();
    await h.router.start();
    h.getCbs().onopen();
    return h;
  }

  it('emits question with mapped intent and acks the tool call', async () => {
    const h = await connected();
    h.getCbs().onmessage({
      toolCall: {
        functionCalls: [
          {
            id: 'fc-1',
            name: 'handle_question',
            args: { question: 'Implement an LRU cache.', category: 'coding_heavy' },
          },
        ],
      },
    });
    expect(h.questions).toEqual([
      {
        question: 'Implement an LRU cache.',
        category: 'coding_heavy',
        intent: 'coding',
      },
    ]);
    expect(h.toolResponses.length).toBe(1);
    expect(h.toolResponses[0].functionResponses[0].name).toBe('handle_question');
  });

  it('suppresses duplicate questions inside the dedupe window', async () => {
    const h = await connected();
    const msg = {
      toolCall: {
        functionCalls: [
          {
            id: 'fc-1',
            name: 'handle_question',
            args: { question: 'Implement an LRU cache.', category: 'coding_heavy' },
          },
        ],
      },
    };
    h.getCbs().onmessage(msg);
    h.getCbs().onmessage(msg);
    expect(h.questions.length).toBe(1);
    // Both tool calls still get acked so the model's turns complete
    expect(h.toolResponses.length).toBe(2);
  });

  it('defaults unknown categories to verbal_technical / verbal', async () => {
    const h = await connected();
    h.getCbs().onmessage({
      toolCall: {
        functionCalls: [
          {
            id: 'fc-2',
            name: 'handle_question',
            args: { question: 'What is your favorite color?', category: 'weird' },
          },
        ],
      },
    });
    expect(h.questions[0].category).toBe('verbal_technical');
    expect(h.questions[0].intent).toBe('verbal');
  });

  it('ignores empty questions and unrelated tool names', async () => {
    const h = await connected();
    h.getCbs().onmessage({
      toolCall: {
        functionCalls: [
          { id: 'a', name: 'handle_question', args: { question: '  ', category: 'behavioral' } },
          { id: 'b', name: 'other_tool', args: { question: 'hi', category: 'behavioral' } },
        ],
      },
    });
    expect(h.questions.length).toBe(0);
  });

  it('forwards input transcription as captions', async () => {
    const h = await connected();
    h.getCbs().onmessage({
      serverContent: { inputTranscription: { text: 'tell me about ' } },
    });
    expect(h.captions).toEqual([{ text: 'tell me about ' }]);
  });
});

describe('GeminiLiveRouter audio write path', () => {
  it('buffers audio while disconnected and replays it on open', async () => {
    // Delayed connect so the disconnected window is observable
    let resolveConnect: ((s: any) => void) | null = null;
    let cbs: any = null;
    const sentAudio: any[] = [];
    const session = {
      sendRealtimeInput: (i: any) => sentAudio.push(i),
      sendToolResponse: () => {},
      close: () => {},
    };
    const connectFn: LiveConnectFn = vi.fn((params: any) => {
      cbs = params.callbacks;
      return new Promise((res) => {
        resolveConnect = () => res(session);
      });
    }) as any;
    const h = makeHarness({ connectFn });
    const startP = h.router.start(); // connect pending
    const raw = Buffer.alloc(320); // 10ms @ 16kHz
    raw.writeInt16LE(1234, 0);
    h.router.write(raw, 16_000); // no session yet → buffered
    expect(sentAudio.length).toBe(0);
    cbs.onopen(); // connected, session still unassigned → flush deferred
    resolveConnect!(session);
    await startP; // session assigned → buffered audio replayed
    expect(sentAudio.length).toBe(1);
    expect(Buffer.from(sentAudio[0].audio.data, 'base64').readInt16LE(0)).toBe(1234);
    // Live audio flows directly from here
    h.router.write(raw, 16_000);
    expect(sentAudio.length).toBe(2);
  });

  it('replays audio spoken during a goAway reconnect gap', async () => {
    vi.useFakeTimers();
    const h = makeHarness();
    await h.router.start();
    h.getCbs().onopen();
    h.getCbs().onmessage({ goAway: {} }); // session dropped, reconnect pending
    const raw = Buffer.alloc(320);
    raw.writeInt16LE(-77, 0);
    h.router.write(raw, 16_000); // during the gap → buffered
    expect(h.sentAudio.length).toBe(0);
    await vi.advanceTimersByTimeAsync(300); // reconnect fires
    h.getCbs().onopen(); // → flush
    expect(h.sentAudio.length).toBe(1);
    expect(Buffer.from(h.sentAudio[0].audio.data, 'base64').readInt16LE(0)).toBe(-77);
  });

  it('caps the gap buffer at 20s, dropping the oldest audio', async () => {
    const h = makeHarness();
    await h.router.start(); // connecting — everything buffers
    for (let i = 0; i < 25; i++) {
      const chunk = Buffer.alloc(16_000 * 2); // 1s of 16kHz PCM16
      chunk.writeInt16LE(i, 0); // tag each second
      h.router.write(chunk, 16_000);
    }
    h.getCbs().onopen(); // → flush what survived
    const total = h.sentAudio.reduce(
      (n: number, s: any) => n + Buffer.from(s.audio.data, 'base64').length,
      0
    );
    expect(total).toBe(16_000 * 2 * 20); // exactly 20s kept
    // seconds 0-4 were dropped — the first surviving chunk is tagged 5
    expect(Buffer.from(h.sentAudio[0].audio.data, 'base64').readInt16LE(0)).toBe(5);
  });

  it('resamples and forwards PCM as base64 16kHz once connected', async () => {
    const h = makeHarness();
    await h.router.start();
    h.getCbs().onopen();
    const samples = 480; // 10ms at 48kHz
    const raw = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) raw.writeInt16LE(i % 100, i * 2);
    h.router.write(raw, 48_000);
    expect(h.sentAudio.length).toBe(1);
    const sent = h.sentAudio[0].audio;
    expect(sent.mimeType).toBe('audio/pcm;rate=16000');
    const decoded = Buffer.from(sent.data, 'base64');
    expect(decoded.length / 2).toBe(160); // 480 / 3
  });
});
