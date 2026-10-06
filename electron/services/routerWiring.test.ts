import { describe, it, expect } from 'vitest';
import { createRouterWiring } from './routerWiring';
import { RouterArbiter, type Outbound } from './routerArbiter';

/** A recording fake arbiter: every call is one entry, in order. */
function fake(count = 0) {
  const calls: any[][] = [];
  const rec = (name: string) => (...a: any[]) => { calls.push([name, ...a]); };
  const arbiter: any = {
    turnOpened: rec('turnOpened'), turnClosed: rec('turnClosed'), turnDispatched: rec('turnDispatched'),
    forward: rec('forward'), setRouterUp: rec('setRouterUp'), routerTurn: rec('routerTurn'), setEar: rec('setEar'),
    dispatchCount: () => count,
  };
  return { calls, arbiter };
}
function setup(opts: { speechEnd?: { at: number; src: 'vad' | 'final' } | null; now?: number; dispatches?: number } = {}) {
  const f = fake(opts.dispatches ?? 0);
  const lines: string[] = [];
  const w = createRouterWiring({
    arbiter: f.arbiter, now: () => opts.now ?? 1000,
    speechEnd: () => (opts.speechEnd === undefined ? null : opts.speechEnd), diag: (l) => lines.push(l),
  });
  return { w, calls: f.calls, lines };
}

describe('turnIdentity: open / close / stale-replace order', () => {
  it('null -> 1 opens 1', () => {
    const { w, calls } = setup({ now: 500 });
    w.turnIdentity(null, 1);
    expect(calls).toEqual([['turnOpened', 1, 500]]);
  });
  it('1 -> 2 (a stale replacement) closes 1 then opens 2', () => {
    const { w, calls } = setup({ now: 700 });
    w.turnIdentity(1, 2);
    expect(calls).toEqual([['turnClosed', 1, 700], ['turnOpened', 2, 700]]);
  });
  it('2 -> null closes 2', () => {
    const { w, calls } = setup({ now: 800 });
    w.turnIdentity(2, null);
    expect(calls).toEqual([['turnClosed', 2, 800]]);
  });
  it('same id and null -> null give nothing', () => {
    const { w, calls } = setup();
    w.turnIdentity(3, 3); w.turnIdentity(null, null);
    expect(calls).toEqual([]);
  });
});

describe('answered: the dispatch feed', () => {
  it('uses the turn machine speechEnd when there is one', () => {
    const { w, calls } = setup({ now: 5000, speechEnd: { at: 900, src: 'vad' } });
    w.answered(3);
    expect(calls).toEqual([['turnDispatched', 3, 5000, 900, 'vad']]);
  });
  it('falls back to (now, now, final) when speechEnd is null', () => {
    const { w, calls } = setup({ now: 5000, speechEnd: null });
    w.answered(3);
    expect(calls).toEqual([['turnDispatched', 3, 5000, 5000, 'final']]);
  });
  it('is idempotent per turn id (the wiring\'s own guard)', () => {
    const { w, calls } = setup();
    w.answered(3); w.answered(3);
    expect(calls.filter((c) => c[0] === 'turnDispatched')).toHaveLength(1);
  });
  it('a different id dispatches again', () => {
    const { w, calls } = setup();
    w.answered(3); w.answered(4);
    expect(calls.filter((c) => c[0] === 'turnDispatched').map((c) => c[1])).toEqual([3, 4]);
  });
  it('answered(undefined) (typed, manual, chip) gives nothing', () => {
    const { w, calls } = setup({ speechEnd: { at: 1, src: 'vad' } });
    w.answered(undefined);
    expect(calls).toEqual([]);
  });
  it('the supersede path never dispatches: a replacing token only forwards', () => {
    const { w, calls } = setup();
    w.onToken('x', 'q', 1, true, undefined, 3);
    expect(calls.map((c) => c[0])).toEqual(['forward']);
  });
});

describe('engine listeners build today\'s payloads plus turnId/origin', () => {
  it('onToken: with a turnId and cues', () => {
    const { w, calls } = setup();
    w.onToken('hi', 'q?', 0.9, true, ['a', 'b'], 7);
    expect(calls).toEqual([['forward', { ch: 'token', p: { token: 'hi', question: 'q?', confidence: 0.9, replace: true, cues: ['a', 'b'], turnId: 7, origin: 'pipeline' } }]]);
  });
  it('onToken: no turnId -> no turnId/origin keys; replace undefined -> false; no cues key', () => {
    const { w, calls } = setup();
    w.onToken('hi', 'q?', 0.9);
    const p = calls[0][1].p;
    expect(p).toEqual({ token: 'hi', question: 'q?', confidence: 0.9, replace: false });
    expect(Object.keys(p)).toEqual(['token', 'question', 'confidence', 'replace']);
  });
  it('onFinal: with and without a turnId', () => {
    const { w, calls } = setup();
    w.onFinal('ans', 'q', 1, undefined, 2);
    w.onFinal('ans', 'q', 1, true);
    expect(calls[0]).toEqual(['forward', { ch: 'final', p: { answer: 'ans', question: 'q', confidence: 1, replace: false, turnId: 2, origin: 'pipeline' } }]);
    expect(calls[1]).toEqual(['forward', { ch: 'final', p: { answer: 'ans', question: 'q', confidence: 1, replace: true } }]);
  });
  it('onSource carries the turnId (undefined when none)', () => {
    const { w, calls } = setup();
    w.onSource('Gemini Flash', 4); w.onSource('Gemini Flash');
    expect(calls).toEqual([['forward', { ch: 'source', label: 'Gemini Flash', turnId: 4 }], ['forward', { ch: 'source', label: 'Gemini Flash', turnId: undefined }]]);
  });
  it('onEnd forwards only with a turnId', () => {
    const { w, calls } = setup();
    w.onEnd(5, 'completed'); w.onEnd(null, 'aborted');
    expect(calls).toEqual([['forward', { ch: 'end', turnId: 5, kind: 'completed' }]]);
  });
});

describe('flag-off identity: a disabled arbiter gives exactly today\'s IPC payloads', () => {
  function flagOff() {
    const sent: Outbound[] = []; const history: any[] = [];
    const arbiter = new RouterArbiter({
      enabled: false, now: () => 0, setTimer: () => 0, clearTimer: () => {},
      send: (o) => sent.push(o), addHistory: (t, q) => history.push([t, q]), diag: () => {}, capture: () => {},
    });
    const w = createRouterWiring({ arbiter, now: () => 0, speechEnd: () => null, diag: () => {} });
    return { w, sent, arbiter };
  }
  it('token / final / source without a turnId equal main.ts 2419-2445 payloads', () => {
    const { w, sent } = flagOff();
    w.onToken('t', 'q', 1);                       // today: { token, question, confidence, replace: false }
    w.onToken('t2', 'q', 1, true, ['c']);         // today: replace true + cues
    w.onFinal('a', 'q', 1);                       // today: { answer, question, confidence, replace: false }
    w.onSource('Flash');                          // today: send(channel, label)
    expect(sent).toEqual([
      { ch: 'token', p: { token: 't', question: 'q', confidence: 1, replace: false } },
      { ch: 'token', p: { token: 't2', question: 'q', confidence: 1, replace: true, cues: ['c'] } },
      { ch: 'final', p: { answer: 'a', question: 'q', confidence: 1, replace: false } },
      { ch: 'source', label: 'Flash', turnId: undefined },
    ]);
    expect(Object.keys((sent[0] as any).p)).toEqual(['token', 'question', 'confidence', 'replace']);
  });
  it('with a turnId the payloads gain turnId + origin only', () => {
    const { w, sent } = flagOff();
    w.onToken('t', 'q', 1, false, undefined, 9);
    w.onFinal('a', 'q', 1, false, 9);
    w.onSource('Flash', 9);
    expect(sent).toEqual([
      { ch: 'token', p: { token: 't', question: 'q', confidence: 1, replace: false, turnId: 9, origin: 'pipeline' } },
      { ch: 'final', p: { answer: 'a', question: 'q', confidence: 1, replace: false, turnId: 9, origin: 'pipeline' } },
      { ch: 'source', label: 'Flash', turnId: 9 },
    ]);
  });
  it('end events and the whole turn feed send nothing', () => {
    const { w, sent, arbiter } = flagOff();
    w.turnIdentity(null, 1); w.answered(1); w.onEnd(1, 'completed'); w.turnIdentity(1, null);
    w.onRouterState(true, 1); w.onRouterTurn({ seq: 1, text: 'x', firstTextAt: 1, completed: false });
    expect(sent).toEqual([]);
    expect(arbiter.dispatchCount()).toBe(0);
  });
});

describe('router session events and the log lines', () => {
  it('onRouterState / onRouterTurn pass straight through', () => {
    const { w, calls } = setup();
    const ev = { seq: 2, text: 'Yes', firstTextAt: 10, completed: false };
    w.onRouterState(true, 42); w.onRouterTurn(ev);
    expect(calls).toEqual([['setRouterUp', true, 42], ['routerTurn', ev]]);
  });
  it('the failed line carries dispatches_before=<dispatchCount()>', () => {
    const { w, lines } = setup({ dispatches: 7 });
    w.onRouterFailed('connection closed');
    expect(lines).toEqual(['[Router] session failed reason=connection closed dispatches_before=7']);
  });
  it('onEarModel(2.5 id) gives setEar("2.5") and an ear model line', () => {
    const { w, calls, lines } = setup();
    w.onEarModel('gemini-2.5-flash-native-audio-latest');
    expect(calls).toEqual([['setEar', '2.5']]);
    expect(lines).toEqual(['[Router] ear model=gemini-2.5-flash-native-audio-latest']);
  });
  it('onEarModel(3.1 id) gives setEar("3.1")', () => {
    const { w, calls, lines } = setup();
    w.onEarModel('gemini-3.1-flash-live-preview');
    expect(calls).toEqual([['setEar', '3.1']]);
    expect(lines).toEqual(['[Router] ear model=gemini-3.1-flash-live-preview']);
  });
  it('an unrecognised ear model id is logged loudly and does not guess', () => {
    const { w, calls, lines } = setup();
    w.onEarModel('gemini-9-mystery');
    expect(calls).toEqual([]);
    expect(lines).toEqual(['[Router] ear model=gemini-9-mystery', '[Router] ear model id not recognised (neither 3.1 nor 2.5): the arbiter keeps its previous ear']);
  });
});
