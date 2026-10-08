import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import {
  LiveRouterSession,
  ROUTER_MODEL,
  ROUTER_SHAS_OK,
  INSTRUCTION_SHA256,
  BLOCK_B_SHA256,
  buildRouterSystem,
  type RouterTurnEvent,
} from './LiveRouterSession';
import { ROUTER_INSTRUCTION, ROUTER_BLOCK_B } from './routerInstruction';
import type { LiveConnectFn } from './GeminiLiveRouter';

const sha12 = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12);

interface Conn { params: any; sent: any[]; closed: number }

function harness(o: { context?: string; getContext?: () => string; connectFn?: LiveConnectFn; model?: string; shasOk?: boolean } = {}) {
  const logs: string[] = [];
  const conns: Conn[] = [];
  const clock = { t: 1000 };
  const connectFn: LiveConnectFn =
    o.connectFn ??
    (async (params: any) => {
      const rec: Conn = { params, sent: [], closed: 0 };
      conns.push(rec);
      return { sendRealtimeInput: (i: any) => rec.sent.push(i), sendToolResponse: () => {}, close: () => { rec.closed++; } };
    });
  const getContext = vi.fn(o.getContext ?? (() => (o.context ?? 'CTX')));
  const s = new LiveRouterSession({
    getApiKey: () => 'test-key',
    getContext,
    connectFn,
    model: o.model,
    log: (l) => logs.push(l),
    now: () => clock.t,
    shasOk: o.shasOk,
  });
  const turns: RouterTurnEvent[] = [];
  const states: { up: boolean; at: number }[] = [];
  const failed: { reason: string }[] = [];
  s.on('turn', (e) => turns.push(e));
  s.on('state', (e) => states.push(e));
  s.on('failed', (e) => failed.push(e));
  const cb = (i: number) => conns[i].params.callbacks;
  const up = (i: number) => cb(i).onmessage({ setupComplete: {} });
  const text = (i: number, t: string) => cb(i).onmessage({ serverContent: { outputTranscription: { text: t } } });
  return { s, logs, conns, clock, getContext, turns, states, failed, cb, up, text, connectFn };
}

const PCM = Buffer.alloc(3200);

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('constants', () => {
  it('the generated instruction constants match the registered sha256 values', () => {
    expect(createHash('sha256').update(ROUTER_INSTRUCTION).digest('hex')).toBe('79ad0f464d95ca7e977cdcda829e5e853389c8ea84dcae9253e0127a91bc9a91');
    expect(createHash('sha256').update(ROUTER_BLOCK_B).digest('hex')).toBe('3a1da134e4c7f9ad00a948d4e487eaf38e35b8def8f110b4a055387d1be9364c');
    expect(INSTRUCTION_SHA256).toBe('79ad0f464d95ca7e977cdcda829e5e853389c8ea84dcae9253e0127a91bc9a91');
    expect(BLOCK_B_SHA256).toBe('3a1da134e4c7f9ad00a948d4e487eaf38e35b8def8f110b4a055387d1be9364c');
    expect(ROUTER_SHAS_OK).toBe(true);
    expect(ROUTER_MODEL).toBe('gemini-3.8-live');
  });

  it('bundle-1: BLOCK_B is hard-first and the INSTRUCTION carries the short-answer clause', () => {
    expect(ROUTER_BLOCK_B).toContain('Say the single word hard if ANY');
    expect(ROUTER_BLOCK_B.indexOf('Say the single word hard if ANY')).toBeLessThan(ROUTER_BLOCK_B.indexOf('Only if none of these is true'));
    expect(ROUTER_BLOCK_B.split('Say the single word hard if ANY').length - 1).toBe(1);
    const clause = 'If the question can be answered in one or two words — yes or no, a choice, a name or a number — say that first, then one supporting sentence, about 15 to 25 words in all.';
    expect(ROUTER_INSTRUCTION.split(clause).length - 1).toBe(1);
    // in the length paragraph: right after its last sentence
    expect(ROUTER_INSTRUCTION).toContain('Open with substance, not with a restatement of the question. ' + clause);
  });
});

describe('LiveRouterSession', () => {
  it('1. refuses a model that is not gemini-3.8-live', async () => {
    const h = harness({ model: 'gemini-3.1-flash-live-preview' });
    await h.s.start();
    expect(h.conns.length).toBe(0);
    expect(h.logs).toContain('[Router] session refused reason=model-mismatch');
  });

  it('2. refuses when the sha check failed', async () => {
    const h = harness({ shasOk: false });
    await h.s.start();
    expect(h.conns.length).toBe(0);
    expect(h.logs).toContain('[Router] session refused reason=sha-mismatch');
  });

  it('3. logs the connect line and sends the router40 config', async () => {
    const h = harness({ context: 'Candidate: Ada.' });
    await h.s.start();
    expect(h.conns.length).toBe(1);
    expect(h.logs).toContain(
      `[Router] session connect model=gemini-3.8-live block_sha12=3a1da134e4c7 instruction_sha12=79ad0f464d95 context_sha12=${sha12('Candidate: Ada.')} context_chars=15`
    );
    const p = h.conns[0].params;
    expect(p.model).toBe('gemini-3.8-live');
    expect(p.config.responseModalities).toEqual(['AUDIO']);
    expect(p.config.inputAudioTranscription).toEqual({});
    expect(p.config.outputAudioTranscription).toEqual({});
    expect(p.config.contextWindowCompression).toEqual({ slidingWindow: {} });
    expect(p.config.systemInstruction.parts[0].text).toBe(buildRouterSystem('Candidate: Ada.'));
    expect('sessionResumption' in p.config).toBe(false);
    expect(h.s.contextInfo()).toEqual({ sha12: sha12('Candidate: Ada.'), chars: 15 });
  });

  it('4. is up only on setupComplete, not on open', async () => {
    const h = harness();
    await h.s.start();
    h.cb(0).onopen();
    expect(h.s.isUp()).toBe(false);
    expect(h.states.length).toBe(0);
    h.clock.t = 1250;
    h.up(0);
    expect(h.s.isUp()).toBe(true);
    expect(h.states).toEqual([{ up: true, at: 1250 }]);
    expect(h.logs).toContain('[Router] session up setup_ms=250');
  });

  it('5. streams a turn: same seq, growing text, then generationComplete, then late text, then the next seq', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    h.text(0, 'Mut');
    h.text(0, 'able is');
    expect(h.turns.length).toBe(2);
    expect(h.turns[0]).toMatchObject({ seq: 1, text: 'Mut', completed: false });
    expect(h.turns[1]).toMatchObject({ seq: 1, text: 'Mutable is', completed: false });
    expect(h.turns[1].endKind).toBeUndefined();
    h.clock.t = 2000;
    h.cb(0).onmessage({ serverContent: { generationComplete: true } });
    expect(h.turns.length).toBe(3);
    expect(h.turns[2]).toMatchObject({ seq: 1, text: 'Mutable is', completed: true, endKind: 'generationComplete', endedAt: 2000, firstTextAt: 1000 });
    h.text(0, ' mutable');
    expect(h.turns.length).toBe(4);
    expect(h.turns[3]).toMatchObject({ seq: 1, text: 'Mutable is mutable', afterComplete: true, firstTextAt: 1000, completed: true, endKind: 'generationComplete', endedAt: 2000 });
    h.cb(0).onmessage({ serverContent: { turnComplete: true } });
    expect(h.turns.length).toBe(4);
    h.text(0, 'Next');
    expect(h.turns[4]).toMatchObject({ seq: 2, text: 'Next', completed: false });
    expect(h.turns[4].afterComplete).toBeUndefined();
  });

  it('6. interrupted ends the turn as not completed', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    h.text(0, 'Half');
    h.cb(0).onmessage({ serverContent: { interrupted: true } });
    expect(h.turns[h.turns.length - 1]).toMatchObject({ seq: 1, text: 'Half', completed: false, endKind: 'interrupted' });
    expect(typeof h.turns[h.turns.length - 1].endedAt).toBe('number');
  });

  it('7. a close mid-turn ends the turn as closed and the state goes down', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    h.text(0, 'Half');
    h.cb(0).onclose({ code: 1006, reason: 'boom' });
    expect(h.turns[h.turns.length - 1]).toMatchObject({ seq: 1, completed: false, endKind: 'closed' });
    expect(h.states[h.states.length - 1].up).toBe(false);
    h.s.stop();
  });

  it('8. audio out is counted and emits nothing', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    h.cb(0).onmessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAAA' } }] } } });
    expect(h.turns.length).toBe(0);
  });

  it('9. generation guard: goAway reconnects once; stale callbacks do nothing', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    h.cb(0).onmessage({ goAway: {} });
    expect(h.s.isUp()).toBe(false);
    // the goAway'd session's own close arrives, and a late message too: both stale
    h.cb(0).onclose({ code: 1000, reason: 'goaway close' });
    h.cb(0).onmessage({ serverContent: { outputTranscription: { text: 'zz' } } });
    expect(h.turns.length).toBe(0);
    await vi.advanceTimersByTimeAsync(300);
    expect(h.conns.length).toBe(2); // exactly 1 reconnect
    h.up(1);
    expect(h.s.isUp()).toBe(true);
    // a stale close of gen 1 after gen 2 is up: no reconnect, state and write target unchanged
    h.cb(0).onclose({ code: 1006, reason: 'late' });
    await vi.advanceTimersByTimeAsync(20000);
    expect(h.conns.length).toBe(2);
    expect(h.s.isUp()).toBe(true);
    h.s.write(PCM, 16000);
    expect(h.conns[1].sent.length).toBe(1);
    expect(h.conns[0].sent.length).toBe(0);
    expect(h.logs).toContain('[Router] session close gen=1 code=1000 reason=goaway close stale=yes quota=no');
    expect(h.logs).toContain('[Router] session close gen=1 code=1006 reason=late stale=yes quota=no');
    h.cb(1).onclose({ code: 1011, reason: 'You exceeded your current quota' });
    expect(h.logs).toContain('[Router] session close gen=3 code=1011 reason=You exceeded your current quota stale=no quota=yes');
    h.s.stop();
  });

  it('10a. four consecutive connect throws give one failed event, then a slow retry at 15 s', async () => {
    let n = 0;
    const h = harness({ connectFn: async () => { n++; throw new Error('down'); } });
    await h.s.start(); // throw 1 -> attempt 1
    await vi.advanceTimersByTimeAsync(300); // throw 2
    await vi.advanceTimersByTimeAsync(600); // throw 3
    expect(h.failed.length).toBe(0);
    await vi.advanceTimersByTimeAsync(900); // throw 4 -> transition
    expect(n).toBe(4);
    expect(h.failed).toEqual([{ reason: 'down' }]);
    await vi.advanceTimersByTimeAsync(14999);
    expect(n).toBe(4);
    await vi.advanceTimersByTimeAsync(1); // slow retry throws again
    expect(n).toBe(5);
    await vi.advanceTimersByTimeAsync(15000);
    expect(n).toBe(6);
    expect(h.failed.length).toBe(1); // not on every slow retry
    h.s.stop();
  });

  it('10b. quota closes never emit failed and back off 5 s, 10 s, 20 s', async () => {
    const h = harness();
    await h.s.start();
    const quota = { code: 1011, reason: 'You exceeded your current quota' };
    h.cb(0).onclose(quota);
    await vi.advanceTimersByTimeAsync(4999);
    expect(h.conns.length).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.conns.length).toBe(2);
    h.cb(1).onclose(quota);
    await vi.advanceTimersByTimeAsync(9999);
    expect(h.conns.length).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.conns.length).toBe(3);
    h.cb(2).onclose(quota);
    await vi.advanceTimersByTimeAsync(19999);
    expect(h.conns.length).toBe(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.conns.length).toBe(4);
    expect(h.failed.length).toBe(0);
    h.s.stop();
  });

  it('11. the context is read once per meeting, across reconnects; stop() then start() rereads', async () => {
    let n = 0;
    const h = harness({ getContext: () => `ctx-${++n}` });
    await h.s.start(); h.up(0);
    h.cb(0).onmessage({ goAway: {} });
    await vi.advanceTimersByTimeAsync(300);
    h.up(1);
    h.cb(1).onmessage({ goAway: {} });
    await vi.advanceTimersByTimeAsync(300);
    expect(h.conns.length).toBe(3);
    expect(h.getContext).toHaveBeenCalledTimes(1);
    const connectLines = h.logs.filter((l) => l.startsWith('[Router] session connect'));
    expect(connectLines.length).toBe(3);
    expect(new Set(connectLines.map((l) => /context_sha12=(\w+)/.exec(l)![1])).size).toBe(1);
    h.s.stop();
    expect(h.s.contextInfo()).toBeNull();
    await h.s.start();
    expect(h.getContext).toHaveBeenCalledTimes(2);
    expect(h.logs.filter((l) => l.startsWith('[Router] session connect')).pop()).toContain(`context_sha12=${sha12('ctx-2')}`);
    h.s.stop();
  });

  it('12. write() sends nothing while the session is not up (no gap buffer)', async () => {
    const h = harness();
    await h.s.start();
    h.s.write(PCM, 16000);
    expect(h.conns[0].sent.length).toBe(0);
    h.up(0);
    h.s.write(PCM, 16000); // control: the same call sends once it is up
    expect(h.conns[0].sent.length).toBe(1);
    expect(h.conns[0].sent[0].audio.mimeType).toBe('audio/pcm;rate=16000');
  });

  it('13. an empty context at start is retried 1 s apart, then the third read is used', async () => {
    let n = 0;
    const h = harness({ getContext: () => (++n < 3 ? '' : 'X') });
    const p = h.s.start();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await p;
    expect(h.logs.filter((l) => l.startsWith('[Router] context empty at start'))).toEqual([
      '[Router] context empty at start attempt=1',
      '[Router] context empty at start attempt=2',
    ]);
    expect(h.conns.length).toBe(1);
    expect(h.logs.find((l) => l.startsWith('[Router] session connect'))).toContain('context_chars=1');
    h.s.stop();
  });

  it('14. stop(): the open turn gets its closed end; a late setupComplete, text and close from the old session do nothing', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    h.text(0, 'Half');
    const old = h.cb(0);
    const before = h.turns.length;
    h.s.stop();
    expect(h.turns.length).toBe(before + 1);
    expect(h.turns[before]).toMatchObject({ seq: 1, text: 'Half', completed: false, endKind: 'closed' });
    expect(h.states[h.states.length - 1].up).toBe(false);
    expect(h.conns[0].closed).toBe(1);
    const nTurns = h.turns.length, nStates = h.states.length;
    old.onmessage({ setupComplete: {} });
    expect(h.s.isUp()).toBe(false);
    old.onmessage({ serverContent: { outputTranscription: { text: 'late' } } });
    old.onclose({ code: 1006, reason: 'late' });
    await vi.advanceTimersByTimeAsync(20000);
    expect(h.turns.length).toBe(nTurns);
    expect(h.states.length).toBe(nStates);
    expect(h.conns.length).toBe(1);
  });

  it('15. a setupComplete between quota closes does not reset the backoff: it still doubles', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    const quota = { code: 1011, reason: 'You exceeded your current quota' };
    h.cb(0).onclose(quota);
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.conns.length).toBe(2);
    h.up(1);
    h.cb(1).onclose(quota);
    await vi.advanceTimersByTimeAsync(9999);
    expect(h.conns.length).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.conns.length).toBe(3);
    h.s.stop();
  });

  it('16a. spec 5 lines: ws error in the log, a stale=no close on goAway, attempt=<n> on a quota reconnect', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    h.cb(0).onerror({ message: 'sock' });
    expect(h.logs).toContain('[Router] ws error: sock');
    h.cb(0).onmessage({ goAway: {} });
    expect(h.logs).toContain('[Router] session close gen=1 code=- reason=goAway stale=no quota=no');
    await vi.advanceTimersByTimeAsync(300);
    h.cb(1).onclose({ code: 1011, reason: 'You exceeded your current quota' });
    expect(h.logs.some((l) => /^\[Router\] session reconnect attempt=1 reason=quota/.test(l))).toBe(true);
    h.s.stop();
  });

  it('16b. spec 5 lines: every retry, slow ones included, logs attempt=<n>', async () => {
    let n = 0;
    const h = harness({ connectFn: async () => { n++; throw new Error('down'); } });
    await h.s.start();
    await vi.advanceTimersByTimeAsync(300 + 600 + 900);
    expect(n).toBe(4);
    await vi.advanceTimersByTimeAsync(15000);
    expect(n).toBe(5);
    expect(h.logs.filter((l) => l.startsWith('[Router] session reconnect attempt='))).toEqual([
      '[Router] session reconnect attempt=1 reason=down',
      '[Router] session reconnect attempt=2 reason=down',
      '[Router] session reconnect attempt=3 reason=down',
      '[Router] session reconnect attempt=4 reason=down',
      '[Router] session reconnect attempt=5 reason=down',
    ]);
    h.s.stop();
  });

  it('16c. a write failure goes to the log', async () => {
    let cbs: any;
    const h = harness({ connectFn: async (params: any) => { cbs = params.callbacks; return { sendRealtimeInput: () => { throw new Error('send boom'); }, sendToolResponse: () => {}, close: () => {} }; } });
    await h.s.start();
    cbs.onmessage({ setupComplete: {} });
    h.s.write(PCM, 16000);
    expect(h.logs).toContain('[Router] write failed: send boom');
    h.s.stop();
  });
});

// Smoke fix (checkpoint 3): the native capture thins its stream during silence (one zero-filled 20 ms keepalive frame per 100 ms), and Gemini
// Live counts silence in AUDIO time. The router input must carry real-time audio, so the session pads the deficit.
describe('LiveRouterSession real-time padding', () => {
  const ms = (sent: any[]) => sent.reduce((a, i) => a + Buffer.from(i.audio.data, 'base64').length / 32, 0);
  const chunk = (n: number) => Buffer.alloc(n * 32); // n ms of 16 kHz mono int16
  const loud = (n: number) => Buffer.alloc(n * 32, 1);
  // advance the injected clock and the fake timers together, in 100 ms steps (the timer's own cadence)
  async function step(h: ReturnType<typeof harness>, total: number, each?: () => void) {
    for (let t = 0; t < total; t += 100) { h.clock.t += 100; await vi.advanceTimersByTimeAsync(100); each?.(); }
  }

  it('P1. a suppressed-shaped stream (speech, then one zero 20 ms frame per 100 ms for 2 s) sends audio equal to wall-clock time', async () => {
    const h = harness();
    await h.s.start(); h.up(0); // t = 1000
    await step(h, 1000, () => h.s.write(loud(100), 16000));
    await step(h, 2000, () => h.s.write(chunk(20), 16000));
    const total = ms(h.conns[0].sent);
    expect(Math.abs(total - 3000)).toBeLessThanOrEqual(100);
  });

  it('P2. a continuous real-time stream gets no padding, exact or jittered', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    await step(h, 3000, () => h.s.write(loud(100), 16000));
    expect(h.conns[0].sent.length).toBe(30);
    expect(ms(h.conns[0].sent)).toBe(3000);
    const j = harness();
    await j.s.start(); j.up(0);
    for (let i = 0; i < 30; i++) { j.clock.t += i % 2 ? 110 : 90; j.s.write(loud(100), 16000); }
    expect(ms(j.conns[0].sent)).toBe(3000); // 10 ms of jitter is below the pad floor
  });

  it('P3. the timer fills silence when writes stop, and what it sends is zeros', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    await step(h, 100, () => h.s.write(chunk(100), 16000)); // silence: the timer only fills silence
    const before = h.conns[0].sent.length;
    await step(h, 2000);
    const total = ms(h.conns[0].sent);
    expect(total).toBeGreaterThanOrEqual(2100 - 200);
    expect(total).toBeLessThanOrEqual(2100);
    for (const i of h.conns[0].sent.slice(before)) expect(Buffer.from(i.audio.data, 'base64').every((b) => b === 0)).toBe(true);
    expect(h.conns[0].sent[0].audio.mimeType).toBe('audio/pcm;rate=16000');
  });

  it('P4. a pad never exceeds 1000 ms, however long the pause (a long pause or a resumed session)', async () => {
    const h = harness();
    await h.s.start(); h.up(0);
    await step(h, 100, () => h.s.write(loud(100), 16000));
    h.clock.t += 10_000; // no timer tick: a stalled event loop, or the first write of a resumed session
    h.s.write(chunk(100), 16000);
    const sizes = h.conns[0].sent.map((i: any) => Buffer.from(i.audio.data, 'base64').length / 32);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(1100); // 1000 ms pad + the 100 ms chunk
    expect(sizes[sizes.length - 1]).toBeGreaterThan(1000);
  });

  it('P5. nothing is sent before up, after stop(), or by an old generation', async () => {
    const h = harness();
    await h.s.start();
    await step(h, 1000); // not up yet
    h.s.write(loud(100), 16000);
    expect(h.conns[0].sent.length).toBe(0);
    h.up(0);
    await step(h, 500);
    const n0 = h.conns[0].sent.length;
    expect(n0).toBeGreaterThan(0); // control: the timer does send while up
    h.cb(0).onmessage({ goAway: {} }); // generation changes; the session is down
    await step(h, 200);
    expect(h.conns[0].sent.length).toBe(n0);
    await vi.advanceTimersByTimeAsync(300); // reconnect
    h.up(1);
    await step(h, 500);
    expect(h.conns[0].sent.length).toBe(n0);
    expect(h.conns[1].sent.length).toBeGreaterThan(0);
    const n1 = h.conns[1].sent.length;
    h.s.stop();
    await step(h, 1000);
    h.s.write(loud(100), 16000);
    expect(h.conns[1].sent.length).toBe(n1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('P6. a failing send from the timer goes to the log and does not throw', async () => {
    let cbs: any;
    const h = harness({ connectFn: async (params: any) => { cbs = params.callbacks; return { sendRealtimeInput: () => { throw new Error('send boom'); }, sendToolResponse: () => {}, close: () => {} }; } });
    await h.s.start();
    cbs.onmessage({ setupComplete: {} });
    await step(h, 500);
    expect(h.logs).toContain('[Router] write failed: send boom');
    h.s.stop();
  });

  it('I1. a stall during speech inserts no silence, with or without timer ticks', async () => {
    const allLoud = (sent: any[]) => sent.every((i) => Buffer.from(i.audio.data, 'base64').every((b) => b !== 0));
    // no timer ticks: the clock jumps, then the queued speech arrives late
    const a = harness();
    await a.s.start(); a.up(0);
    await step(a, 500, () => a.s.write(loud(100), 16000));
    a.clock.t += 600;
    for (let i = 0; i < 6; i++) a.s.write(loud(100), 16000);
    expect(allLoud(a.conns[0].sent)).toBe(true);
    expect(a.conns[0].sent.length).toBe(11);
    // timer ticking through the stall, last chunk loud
    const b = harness();
    await b.s.start(); b.up(0);
    await step(b, 500, () => b.s.write(loud(100), 16000));
    const n = b.conns[0].sent.length;
    await step(b, 600);
    expect(b.conns[0].sent.length).toBe(n);
    for (let i = 0; i < 6; i++) b.s.write(loud(100), 16000);
    expect(allLoud(b.conns[0].sent)).toBe(true);
    // control: the same stall after a SILENCE chunk is padded
    const c = harness();
    await c.s.start(); c.up(0);
    await step(c, 500, () => c.s.write(loud(100), 16000));
    c.s.write(chunk(20), 16000);
    await step(c, 600);
    expect(c.conns[0].sent.length).toBeGreaterThan(6);
  });
});

describe('bundle-1 drillDrop (fault drill router-drop)', () => {
  it('closes the live session through the real onclose path: one close line, exactly one reconnect scheduled, then a new connect', async () => {
    const conns: any[] = [];
    const connectFn: LiveConnectFn = async (params: any) => {
      const rec: any = { params, closed: 0 };
      conns.push(rec);
      // like the SDK: close() ends in the onclose callback
      return { sendRealtimeInput: () => {}, sendToolResponse: () => {}, close: () => { rec.closed++; params.callbacks.onclose({ code: 1000, reason: 'client close' }); } } as any;
    };
    const h = harness({ connectFn });
    await h.s.start();
    conns[0].params.callbacks.onmessage({ setupComplete: {} });
    expect(h.s.isUp()).toBe(true);
    h.s.drillDrop();
    expect(conns[0].closed).toBe(1);
    expect(h.s.isUp()).toBe(false);
    expect(h.logs).toContain('[Drill] router-drop');
    expect(h.logs).toContain('[Router] session close gen=1 code=1000 reason=client close stale=no quota=no');
    expect(h.logs.filter((l) => l.startsWith('[Router] session reconnect attempt='))).toEqual(['[Router] session reconnect attempt=1 reason=client close']);
    await vi.advanceTimersByTimeAsync(300);
    expect(conns.length).toBe(2);
    conns[1].params.callbacks.onmessage({ setupComplete: {} });
    expect(h.s.isUp()).toBe(true);
    expect(h.logs.filter((l) => l.includes('session failed'))).toEqual([]);
  });
  it('review fix: with no live session (router already down) it logs a distinct line and NOT "[Drill] router-drop"', async () => {
    const h = harness();
    expect(() => h.s.drillDrop()).not.toThrow();
    expect(h.logs).toContain('[Drill] router-drop skipped: router already down');
    expect(h.logs).not.toContain('[Drill] router-drop');
    expect(h.logs.some((l) => l.includes('session close'))).toBe(false);
  });
});