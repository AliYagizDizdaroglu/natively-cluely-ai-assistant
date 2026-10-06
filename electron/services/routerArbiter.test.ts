import { describe, it, expect } from 'vitest';
import { RouterArbiter, LIVE_LABEL, type ArbiterDeps, type Outbound, type PipelineIn, type RouterTurnIn } from './routerArbiter';

const Q = 10_000;

/** Fake clock with timers (no vitest fake timers, so no afterEach reset is needed: M6). */
function harness(enabled = true) {
  let now = 0;
  let n = 0;
  const timers: { at: number; n: number; fn: () => void; dead: boolean }[] = [];
  const sent: Outbound[] = [];
  const sentAt: number[] = [];
  const history: { text: string; question?: string }[] = [];
  const diag: string[] = [];
  const capture: string[] = [];
  const deps: ArbiterDeps = {
    enabled,
    now: () => now,
    setTimer: (fn, ms) => { const h = { at: now + ms, n: n++, fn, dead: false }; timers.push(h); return h; },
    clearTimer: (h) => { (h as { dead: boolean }).dead = true; },
    send: (o) => { sent.push(o); sentAt.push(now); },
    addHistory: (text, question) => { history.push({ text, question }); },
    diag: (l) => { diag.push(l); },
    capture: (l) => { capture.push(l); },
  };
  const a = new RouterArbiter(deps);
  /** Move the clock to an absolute time, running due timers in order. */
  const go = (to: number) => {
    for (;;) {
      const due = timers.filter((h) => !h.dead && h.at <= to).sort((x, y) => x.at - y.at || x.n - y.n)[0];
      if (!due) break;
      due.dead = true; now = Math.max(now, due.at); due.fn();
    }
    now = to;
  };
  return { a, go, sent, sentAt, history, diag, capture };
}
type H = ReturnType<typeof harness>;

/** Router up, turn 1 open from Q-4000, clock at Q-4000. Dispatch is done by the test (at Q unless stated). */
function boot(): H {
  const h = harness();
  h.go(Q - 4000);
  h.a.setRouterUp(true, 0);
  h.a.turnOpened(1, Q - 4000);
  return h;
}
const dispatch = (h: H, at = Q, id = 1, q = Q) => { h.go(at); h.a.turnDispatched(id, at, q, 'vad'); };

const tok = (turnId: number, token: string, extra: Record<string, unknown> = {}): PipelineIn =>
  ({ ch: 'token', p: { token, question: 'Q?', confidence: 0.9, replace: false, turnId, ...extra } }) as PipelineIn;
const fin = (turnId: number, answer: string, extra: Record<string, unknown> = {}): PipelineIn =>
  ({ ch: 'final', p: { answer, question: 'Q?', confidence: 0.9, replace: false, turnId, ...extra } }) as PipelineIn;
const src = (turnId: number, label: string): PipelineIn => ({ ch: 'source', label, turnId });
const end = (turnId: number, kind: 'completed' | 'aborted' | 'failed' = 'completed'): PipelineIn => ({ ch: 'end', turnId, kind });
const hist = (turnId: number, text: string): PipelineIn => ({ ch: 'history', turnId, text, question: 'Q?' });
const rt = (seq: number, text: string, F: number, extra: Partial<RouterTurnIn> = {}): RouterTurnIn => ({ seq, text, firstTextAt: F, completed: false, ...extra });
const done = (endedAt: number, kind: RouterTurnIn['endKind'] = 'generationComplete'): Partial<RouterTurnIn> => ({ completed: kind === 'generationComplete' || kind === 'turnComplete', endKind: kind, endedAt });
const words = (n: number, p = 'w'): string => Array.from({ length: n }, (_, i) => `${p}${i + 1}`).join(' ');

const sig = (o: Outbound): string => {
  if (o.ch === 'source') return `src:${o.label}@${o.turnId}`;
  const p = o.p as unknown as Record<string, unknown>;
  const tag = `${p.origin ?? '-'}${p.append ? '|append' : ''}${p.label ? `|${p.label}` : ''}${p.replace ? '|replace' : ''}@${p.turnId}`;
  return o.ch === 'token' ? `tok:${p.token}|${tag}` : `fin:${p.answer}|${tag}`;
};
const sigs = (h: H) => h.sent.map(sig);
const lines = (h: H) => h.diag.filter((l) => l.startsWith('[Router] turn='));
const kv = (l: string): Record<string, string> => Object.fromEntries([...l.matchAll(/(\w+)=(\S+)/g)].map((m) => [m[1], m[2]]));
const one = (h: H): Record<string, string> => { const ls = lines(h); expect(ls).toHaveLength(1); return kv(ls[0]); };
const caps = (h: H) => h.capture.map((l) => { expect(l.startsWith('[RouterAnswer] ')).toBe(true); return JSON.parse(l.slice('[RouterAnswer] '.length)); });

describe('RouterArbiter: flag off (item 1, 2)', () => {
  it('passes every Outbound through unchanged, in order; history passes; end ignored; nothing logged', () => {
    const h = harness(false);
    h.a.turnOpened(1, 0); h.a.setRouterUp(true, 0); h.a.turnDispatched(1, 5, 5, 'vad');
    h.a.routerTurn(rt(1, 'hello there', 10));
    for (const ev of [src(1, 'gemini'), tok(1, 'A '), tok(1, 'B'), fin(1, 'A B'), hist(1, 'A B'), end(1)]) h.a.forward(ev);
    expect(sigs(h)).toEqual(['src:gemini@1', 'tok:A |-@1', 'tok:B|-@1', 'fin:A B|-@1']);
    expect(h.history).toEqual([{ text: 'A B', question: 'Q?' }]);
    expect(h.diag).toEqual([]); expect(h.capture).toEqual([]); expect(h.a.dispatchCount()).toBe(0);
  });
  it('events with no turnId pass straight through even when enabled', () => {
    const h = boot();
    h.a.forward({ ch: 'source', label: 'typed' }); h.a.forward({ ch: 'token', p: { token: 'x', question: 'q', confidence: 1, replace: false } });
    h.a.forward({ ch: 'final', p: { answer: 'x', question: 'q', confidence: 1, replace: false } });
    expect(sigs(h)).toEqual(['src:typed@undefined', 'tok:x|-@undefined', 'fin:x|-@undefined']);
  });
});

describe('RouterArbiter: pipeline decisions, rows 1-4 (case A)', () => {
  it('row 1: router down at Q releases the held events at once', () => {
    const h = boot();
    h.a.setRouterUp(false, Q - 3000);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Hello ', { cues: ['c1'] }));
    expect(h.sent).toEqual([]);
    dispatch(h);
    expect(sigs(h)).toEqual(['src:gemini@1', 'tok:Hello |pipeline@1']);
    h.a.forward(fin(1, 'Hello')); h.a.forward(hist(1, 'Hello')); h.a.forward(end(1)); h.a.turnClosed(1, Q + 3000);
    const l = one(h);
    expect(l).toMatchObject({ turn: '1', route: 'invalid', reason: 'router-down', shown: 'pipeline', router: 'down', ear: '3.1', q_src: 'vad', q_at: String(Q), sent: '3' });
    expect(h.history).toEqual([{ text: 'Hello', question: 'Q?' }]);
  });

  it('row 2 no-router-turn: nothing at Q+1999, release at Q+2000, line reason=no-router-turn live_first_ms=-', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Hello '));
    h.go(Q + 1999); expect(h.sent).toEqual([]);
    h.go(Q + 2000); expect(sigs(h)).toEqual(['src:gemini@1', 'tok:Hello |pipeline@1']);
    h.a.forward(fin(1, 'Hello')); h.a.forward(end(1)); h.a.turnClosed(1, Q + 4000);
    expect(one(h)).toMatchObject({ route: 'invalid', reason: 'no-router-turn', live_first_ms: '-', live_words: '-', shown: 'pipeline' });
  });

  it('row 2 late: first word complete at Q+2173 reads reason=late live_first_ms=2173 (RH07 shape)', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Hello '));
    h.go(Q + 2173);
    h.a.routerTurn(rt(1, 'Docker is a runtime for containers', Q + 2173));
    expect(sigs(h)).toEqual(['src:gemini@1', 'tok:Hello |pipeline@1']);
    h.a.routerTurn(rt(1, 'Docker is a runtime for containers', Q + 2173, done(Q + 2600)));
    h.a.forward(fin(1, 'Hello')); h.a.forward(end(1));
    expect(sigs(h).some((s) => s.includes('|live@'))).toBe(false);
    expect(one(h)).toMatchObject({ route: 'invalid', reason: 'late', live_first_ms: '2173', shown: 'pipeline' });
  });

  it('row 3: "hard" ended at Q+600 releases the pipeline with the first token\'s cues; route=hard reason=-', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Answer ', { cues: ['c1', 'c2'] })); h.a.forward(fin(1, 'Answer')); h.a.forward(hist(1, 'Answer')); h.a.forward(end(1));
    expect(h.sent).toEqual([]);
    h.go(Q + 600); h.a.routerTurn(rt(1, 'hard', Q + 600, done(Q + 600)));
    expect(sigs(h)).toEqual(['src:gemini@1', 'tok:Answer |pipeline@1', 'fin:Answer|pipeline@1']);
    expect((h.sent[1] as { p: { cues?: string[] } }).p.cues).toEqual(['c1', 'c2']);
    expect(h.history).toEqual([{ text: 'Answer', question: 'Q?' }]);
    expect(one(h)).toMatchObject({ route: 'hard', reason: '-', shown: 'pipeline', live_first_ms: '600', live_words: '1' });
  });

  it('row 3: hard".hard".hard reads reason=garbled-hard', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(tok(1, 'Answer ')); h.a.forward(end(1));
    h.go(Q + 600); h.a.routerTurn(rt(1, 'hard".hard".hard', Q + 600, done(Q + 600)));
    expect(sigs(h)).toEqual(['tok:Answer |pipeline@1']);
    expect(one(h)).toMatchObject({ route: 'hard', reason: 'garbled-hard' });
  });

  it.each([
    ['too-short', 'Heart.', done(Q + 500), 'invalid'],
    ['marker', `<b> ${words(10)}`, {}, 'invalid'],
    ['too-long', words(81), {}, 'invalid'],
    ['incomplete', words(20), done(Q + 500, 'interrupted'), 'invalid'],
  ] as const)('row 4 %s: pipeline shown, no live event ever sent', (reason, text, extra, route) => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Hello ', { cues: ['c'] })); h.a.forward(fin(1, 'Hello')); h.a.forward(end(1));
    h.go(Q + 500); h.a.routerTurn(rt(1, text, Q + 500, extra));
    h.a.routerTurn(rt(1, text + ' more', Q + 500, { ...extra }));
    expect(sigs(h)).toEqual(['src:gemini@1', 'tok:Hello |pipeline@1', 'fin:Hello|pipeline@1']);
    expect(h.sent.some((o) => o.ch !== 'source' && o.p.origin === 'live')).toBe(false);
    h.a.routerTurn(rt(1, text + ' more', Q + 500, done(Q + 3000)));
    expect(one(h)).toMatchObject({ route, reason, shown: 'pipeline' });
  });
});

describe('RouterArbiter: Live shown (case B) and the appends (case C)', () => {
  const body = words(40);
  const liveFull = `Docker is ${body}`;
  it('case B: source, complete tokens only, one Live final, shadow hidden, history = Live only', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 300); h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Shadow ')); // held before the decision
    h.go(Q + 800); h.a.routerTurn(rt(1, 'Docker is ', Q + 800));
    expect(sigs(h)).toEqual([`src:${LIVE_LABEL}@1`, 'tok:Docker is |live@1']);
    expect((h.sent[1] as { p: { question: string; confidence: number; replace: boolean; cues?: string[] } }).p).toMatchObject({ question: 'Q?', confidence: 0.9, replace: false });
    expect((h.sent[1] as { p: { cues?: string[] } }).p.cues).toBeUndefined();
    h.go(Q + 1500); h.a.routerTurn(rt(1, liveFull, Q + 800));
    h.go(Q + 2500); h.a.routerTurn(rt(1, liveFull, Q + 800, done(Q + 2500)));
    h.go(Q + 3000); h.a.forward(tok(1, 'more shadow')); h.a.forward(fin(1, 'Shadow more shadow')); h.a.forward(hist(1, 'Shadow more shadow')); h.a.forward(end(1));
    const toks = h.sent.filter((o) => o.ch === 'token').map((o) => (o as { p: { token: string } }).p.token);
    const finals = h.sent.filter((o) => o.ch === 'final') as { p: { answer: string; origin: string } }[];
    expect(finals).toHaveLength(1);
    expect(finals[0].p.origin).toBe('live');
    expect(finals[0].p.answer).toBe(liveFull);
    expect(toks.join('')).toBe(liveFull);
    expect(toks[toks.length - 1]).toBe('w40'); // the last word shows only once the turn has ended
    expect(h.sent.every((o) => o.ch === 'source' ? o.label === LIVE_LABEL : o.p.origin === 'live')).toBe(true);
    expect(h.history.map((x) => x.text)).toEqual([liveFull]);
    expect(caps(h).map((c) => c.kind)).toEqual(['live', 'shadow']);
    expect(caps(h)[0]).toMatchObject({ turn: 1, text: liveFull, words: 42, firstMs: 800, endMs: 2500, q_src: 'vad' });
    expect(caps(h)[1]).toMatchObject({ turn: 1, text: 'Shadow more shadow', words: 3, q_src: 'vad' });
    h.a.turnClosed(1, Q + 4000);
    expect(one(h)).toMatchObject({ turn: '1', route: 'easy-answer', reason: '-', shown: 'live', live_first_ms: '800', live_words: '42', shadow: '300', ear: '3.1', router: 'up' });
  });

  it('M4: Live tokens sent before any pipeline token carry question "" and confidence 1', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 800); h.a.routerTurn(rt(1, 'Docker is a thing ', Q + 800));
    expect((h.sent[1] as { p: { question: string; confidence: number } }).p).toMatchObject({ question: '', confidence: 1 });
  });

  it('no display before dispatch: first Live token at Q+1200, live_first_ms=1200', () => {
    const h = boot();
    h.go(Q + 300); h.a.routerTurn(rt(1, `Docker is ${words(12)} `, Q + 300));
    h.go(Q + 1199); expect(h.sent).toEqual([]);
    dispatch(h, Q + 1200);
    expect(h.sentAt[0]).toBe(Q + 1200);
    expect(sigs(h)[0]).toBe(`src:${LIVE_LABEL}@1`);
    expect(h.sent.filter((o) => o.ch === 'token')).toHaveLength(1);
    h.a.routerTurn(rt(1, `Docker is ${words(12)} `, Q + 300, done(Q + 1500)));
    h.a.forward(end(1)); h.a.turnClosed(1, Q + 2000);
    expect(one(h)).toMatchObject({ shown: 'live', live_first_ms: '1200' });
  });

  it('partial token never displayed (Review Focus 3): "alpha beta __fo" shows "alpha beta " then stops at the marker and appends', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'P1 ')); h.a.forward(fin(1, 'P1')); h.a.forward(end(1));
    h.go(Q + 500); h.a.routerTurn(rt(1, 'alpha beta __fo', Q + 500));
    expect(sigs(h)).toEqual([`src:${LIVE_LABEL}@1`, 'tok:alpha beta |live@1']);
    h.go(Q + 700); h.a.routerTurn(rt(1, 'alpha beta __foo__ gamma', Q + 500));
    expect(sigs(h)).toEqual([
      `src:${LIVE_LABEL}@1`, 'tok:alpha beta |live@1', 'fin:alpha beta |live@1',
      'src:gemini@1', 'tok:P1 |pipeline|append|(full answer)@1', 'fin:P1|pipeline|append@1',
    ]);
  });

  it('append, marker after V: Live tokens, Live final, pipeline source, held tokens (first labelled), final; history [Live, pipeline]', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'P1 ', { cues: ['c'] })); h.a.forward(tok(1, 'P2')); h.a.forward(fin(1, 'P1 P2'));
    h.go(Q + 500); h.a.routerTurn(rt(1, 'one two three four ', Q + 500));
    h.go(Q + 900); h.a.routerTurn(rt(1, 'one two three four five six <b> seven', Q + 500));
    expect(sigs(h)).toEqual([
      `src:${LIVE_LABEL}@1`, 'tok:one two three four |live@1', 'tok:five six |live@1', 'fin:one two three four five six |live@1',
      'src:gemini@1', 'tok:P1 |pipeline|append|(full answer)@1', 'tok:P2|pipeline|append@1', 'fin:P1 P2|pipeline|append@1',
    ]);
    expect((h.sent[5] as { p: { cues?: string[] } }).p.cues).toEqual(['c']);
    expect(h.history.map((x) => x.text)).toEqual(['one two three four five six ']);
    h.go(Q + 3000); h.a.forward(hist(1, 'P1 P2')); h.a.forward(end(1));
    expect(h.history.map((x) => x.text)).toEqual(['one two three four five six ', 'P1 P2']);
    h.a.routerTurn(rt(1, 'one two three four five six <b> seven', Q + 500, done(Q + 3200)));
    expect(caps(h).map((c) => c.kind)).toEqual(['live', 'appended']);
    expect(caps(h)[1]).toMatchObject({ text: 'P1 P2', turn: 1 });
    expect(one(h)).toMatchObject({ shown: 'live', route: 'invalid', reason: 'marker' });
  });

  it('append, too-long: the stop is at the 81st word, shown = exactly 80 words', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(tok(1, 'P1')); h.a.forward(end(1));
    h.go(Q + 500); h.a.routerTurn(rt(1, `${words(5)} `, Q + 500));
    h.go(Q + 800); h.a.routerTurn(rt(1, words(85), Q + 500));
    const f = h.sent.find((o) => o.ch === 'final' && o.p.origin === 'live') as { p: { answer: string } };
    expect(f.p.answer.trim().split(/\s+/)).toHaveLength(80);
    expect(h.sent.filter((o) => o.ch === 'token' && o.p.origin === 'pipeline').every((o) => o.ch === 'token' && o.p.append === true)).toBe(true);
    h.a.routerTurn(rt(1, words(85), Q + 500, done(Q + 1500)));
    expect(one(h)).toMatchObject({ shown: 'live', reason: 'too-long', route: 'invalid' });
  });

  it('append, too-short after show: 5 words then generationComplete', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(tok(1, 'P1')); h.a.forward(end(1));
    h.go(Q + 500); h.a.routerTurn(rt(1, 'alpha beta gamma delta epsilon', Q + 500));
    h.go(Q + 900); h.a.routerTurn(rt(1, 'alpha beta gamma delta epsilon', Q + 500, done(Q + 900)));
    expect(sigs(h)).toEqual([
      `src:${LIVE_LABEL}@1`, 'tok:alpha beta gamma delta |live@1', 'tok:epsilon|live@1', 'fin:alpha beta gamma delta epsilon|live@1',
      'tok:P1|pipeline|append|(full answer)@1',
    ]);
    expect(one(h)).toMatchObject({ shown: 'live', reason: 'too-short' });
  });

  it('append, incomplete-after-show: the turn ends interrupted after V', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(tok(1, 'P1')); h.a.forward(end(1));
    h.go(Q + 500); h.a.routerTurn(rt(1, `${words(12)} `, Q + 500));
    h.go(Q + 900); h.a.routerTurn(rt(1, `${words(12)} `, Q + 500, done(Q + 900, 'interrupted')));
    expect(sigs(h).filter((s) => s.startsWith('fin:'))).toEqual([`fin:${words(12)} |live@1`]);
    expect(sigs(h).at(-1)).toBe('tok:P1|pipeline|append|(full answer)@1');
    expect(one(h)).toMatchObject({ shown: 'live', reason: 'incomplete-after-show', route: 'invalid' });
  });

  it('the 10 s cap: at Q+10000 the undone decider is cut and the pipeline answer appended; later text is ignored', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(tok(1, 'P1')); h.a.forward(end(1));
    h.go(Q + 500); h.a.routerTurn(rt(1, `${words(12)} `, Q + 500));
    h.go(Q + 9999); expect(h.sent.some((o) => o.ch === 'final')).toBe(false);
    h.go(Q + 10_000);
    expect(sigs(h).slice(-2)).toEqual([`fin:${words(12)} |live@1`, 'tok:P1|pipeline|append|(full answer)@1']);
    const n = h.sent.length;
    h.go(Q + 10_500); h.a.routerTurn(rt(1, `${words(30)} `, Q + 500)); h.a.routerTurn(rt(1, `${words(30)} `, Q + 500, done(Q + 11_000)));
    expect(h.sent.length).toBe(n);
    expect(one(h)).toMatchObject({ shown: 'live', reason: 'incomplete-after-show', route: 'invalid' });
  });
});

describe('RouterArbiter: ordering and holding (Review Focus 2)', () => {
  it('pipeline ends before the decision, router first word at Q+1900: nothing of it sent; history only at the Live final', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 1500);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Fast ')); h.a.forward(fin(1, 'Fast')); h.a.forward(hist(1, 'Fast')); h.a.forward(end(1));
    expect(h.sent).toEqual([]);
    h.go(Q + 1900); h.a.routerTurn(rt(1, `Docker is ${words(10)} `, Q + 1900));
    expect(h.sent.some((o) => o.ch !== 'source' && o.p.origin === 'pipeline')).toBe(false);
    expect(h.history).toEqual([]);
    h.go(Q + 2400); h.a.routerTurn(rt(1, `Docker is ${words(10)} `, Q + 1900, done(Q + 2400)));
    expect(h.history.map((x) => x.text)).toEqual([`Docker is ${words(10)} `]);
    expect(caps(h).map((c) => c.kind)).toEqual(['live', 'shadow']);
    expect(caps(h)[1].text).toBe('Fast');
  });

  it('the same with a hard first word at Q+1900: held tokens and final released in order; history = [pipeline] once', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 1500);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Fast ')); h.a.forward(tok(1, 'one')); h.a.forward(fin(1, 'Fast one')); h.a.forward(hist(1, 'Fast one')); h.a.forward(end(1));
    expect(h.history).toEqual([]);
    h.go(Q + 1900); h.a.routerTurn(rt(1, 'hard', Q + 1900, done(Q + 1900)));
    expect(sigs(h)).toEqual(['src:gemini@1', 'tok:Fast |pipeline@1', 'tok:one|pipeline@1', 'fin:Fast one|pipeline@1']);
    expect(h.history).toEqual([{ text: 'Fast one', question: 'Q?' }]);
  });
});

describe('RouterArbiter: supersede (case E, Review Focus 4)', () => {
  it('during Live: no further Live token or final, replacing stream forwarded with origin pipeline and replace flags, history = replacing only', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Old '));
    h.go(Q + 500); h.a.routerTurn(rt(1, `${words(10)} `, Q + 500));
    expect(sigs(h)).toEqual([`src:${LIVE_LABEL}@1`, `tok:${words(10)} |live@1`]);
    h.go(Q + 1500);
    h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(tok(1, 'answer'));
    h.a.routerTurn(rt(1, `${words(30)} `, Q + 500)); h.a.routerTurn(rt(1, words(30), Q + 500, done(Q + 2000)));
    h.a.forward(fin(1, 'New answer', { replace: true })); h.a.forward(hist(1, 'New answer')); h.a.forward(end(1));
    expect(sigs(h)).toEqual([
      `src:${LIVE_LABEL}@1`, `tok:${words(10)} |live@1`,
      'tok:New |pipeline|replace@1', 'tok:answer|pipeline@1', 'fin:New answer|pipeline|replace@1',
    ]);
    expect(h.history.map((x) => x.text)).toEqual(['New answer']);
  });

  it('while the decision is pending: only the replacing stream is released, its first token keeping replace:true', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Old ')); h.a.forward(tok(1, 'stream')); h.a.forward(fin(1, 'Old stream'));
    h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(tok(1, 'one')); h.a.forward(fin(1, 'New one', { replace: true }));
    h.go(Q + 600); h.a.routerTurn(rt(1, 'hard', Q + 600, done(Q + 600)));
    expect(sigs(h)).toEqual(['src:gemini@1', 'tok:New |pipeline|replace@1', 'tok:one|pipeline@1', 'fin:New one|pipeline|replace@1']);
  });

  it('I1: a stale aborted end after a supersede is dropped; one decision line, written after the completed end; capture holds the new text only', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Old '));
    h.go(Q + 500); h.a.routerTurn(rt(1, `${words(10)} `, Q + 500));
    h.a.routerTurn(rt(1, words(10), Q + 500, done(Q + 900)));
    h.go(Q + 1500);
    h.a.forward(tok(1, 'New ', { replace: true }));
    h.a.forward(end(1, 'aborted'));
    expect(h.diag.filter((l) => l.startsWith('[Router] end dropped'))).toEqual(['[Router] end dropped turn=1 kind=aborted reason=superseded']);
    h.a.forward(tok(1, 'text')); h.a.forward(fin(1, 'New text', { replace: true })); h.a.forward(hist(1, 'New text'));
    h.a.turnClosed(1, Q + 3000);
    expect(lines(h)).toHaveLength(0);
    h.a.forward(end(1, 'completed'));
    expect(lines(h)).toHaveLength(1);
    expect(caps(h).filter((c) => c.kind === 'shadow').map((c) => c.text)).toEqual(['New text']);
  });
});

describe('RouterArbiter: pairing (item 4)', () => {
  it('a router turn first heard 1999 ms after the turn closed pairs with it; at 2001 ms it is unpaired (line turn=-)', () => {
    const h = boot();
    dispatch(h); h.a.turnClosed(1, Q);
    h.go(Q + 1999); h.a.routerTurn(rt(1, `Docker is ${words(10)} `, Q + 1999));
    expect(sigs(h)[0]).toBe(`src:${LIVE_LABEL}@1`);
    h.go(Q + 2001); h.a.routerTurn(rt(2, 'two words', Q + 2001, done(Q + 2001)));
    expect(h.diag.filter((l) => l.startsWith('[Router] turn=-'))).toEqual([
      '[Router] turn=- route=invalid reason=unpaired live_first_ms=- live_words=2 shown=- shadow=- ear=3.1 router=up q_src=- q_at=-',
    ]);
    expect(sigs(h)).toHaveLength(2); // only the first one was shown
  });

  it('a router turn paired to a turn that closes without a dispatch becomes unpaired and is never shown', () => {
    const h = boot();
    h.go(Q); h.a.routerTurn(rt(1, `Docker is ${words(10)} `, Q));
    h.a.turnClosed(1, Q + 300);
    expect(h.diag.filter((l) => l.startsWith('[Router] turn=-'))).toEqual([]); // still streaming: the line comes when it ends
    h.go(Q + 600); h.a.routerTurn(rt(1, `Docker is ${words(10)}`, Q, done(Q + 600)));
    expect(h.diag.filter((l) => l.startsWith('[Router] turn=-'))).toHaveLength(1);
    expect(kv(h.diag.filter((l) => l.startsWith('[Router] turn=-'))[0])).toMatchObject({ reason: 'unpaired', live_words: '12' });
    expect(h.sent).toEqual([]);
  });
});

describe('RouterArbiter: which router turn decides (I2, item 5)', () => {
  it('interrupted before dispatch is discarded as dup; the later turn decides', () => {
    const h = boot();
    h.go(Q - 3000); h.a.routerTurn(rt(1, 'alpha beta', Q - 3000));
    h.go(Q - 2500); h.a.routerTurn(rt(1, 'alpha beta', Q - 3000, done(Q - 2500, 'interrupted')));
    dispatch(h);
    expect(h.sent).toEqual([]);
    expect(lines(h).map(kv)).toMatchObject([{ turn: '1', reason: 'dup', shown: '-', route: 'invalid' }]);
    h.go(Q + 700); h.a.routerTurn(rt(2, `Docker is ${words(12)} `, Q + 700));
    expect(sigs(h)[0]).toBe(`src:${LIVE_LABEL}@1`);
    h.a.routerTurn(rt(2, `Docker is ${words(12)}`, Q + 700, done(Q + 1200)));
    h.a.forward(end(1)); h.a.turnClosed(1, Q + 2000);
    expect(lines(h).map(kv).map((l) => l.reason)).toEqual(['dup', '-']);
  });

  it('completed early: the LAST router turn that started before dispatch decides; the other is dup', () => {
    const h = boot();
    h.go(Q - 3000); h.a.routerTurn(rt(1, `One ${words(10)}`, Q - 3000, done(Q - 2000)));
    h.go(Q - 1000); h.a.routerTurn(rt(2, `Two ${words(10)} `, Q - 1000));
    dispatch(h);
    expect(sigs(h)[1]).toBe(`tok:Two ${words(10)} |live@1`);
    expect(lines(h).map(kv)).toMatchObject([{ turn: '1', reason: 'dup', shown: '-', route: 'easy-answer' }]);
  });

  it('none before dispatch: the first router turn after dispatch decides; a second is dup', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 500); h.a.routerTurn(rt(1, `First ${words(10)} `, Q + 500));
    h.go(Q + 900); h.a.routerTurn(rt(2, `Second ${words(10)} `, Q + 900));
    expect(sigs(h)).toEqual([`src:${LIVE_LABEL}@1`, `tok:First ${words(10)} |live@1`]);
    h.a.routerTurn(rt(2, `Second ${words(10)}`, Q + 900, done(Q + 1000)));
    expect(lines(h).map(kv)).toMatchObject([{ turn: '1', reason: 'dup', shown: '-' }]);
  });

  it('ear 2.5 with the router up (I5=B): Live is shown and the line says ear=2.5', () => {
    const h = boot();
    h.a.setEar('2.5');
    dispatch(h);
    h.go(Q + 500); h.a.routerTurn(rt(1, `Docker is ${words(12)}`, Q + 500, done(Q + 900)));
    h.a.forward(end(1)); h.a.turnClosed(1, Q + 2000);
    expect(sigs(h)[0]).toBe(`src:${LIVE_LABEL}@1`);
    expect(one(h)).toMatchObject({ shown: 'live', ear: '2.5', route: 'easy-answer' });
  });
});

describe('RouterArbiter: interleaved turns and aborted pipelines (Review Focus 1)', () => {
  it('B3 interleave: turn 1 live, turn 2 hard; each is held, hidden or released under its own turnId', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 300); h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'a '));
    h.go(Q + 800); h.a.routerTurn(rt(1, `Docker is ${words(12)} `, Q + 800));
    h.go(Q + 4000); h.a.turnClosed(1, Q + 4000); h.a.turnOpened(2, Q + 4000);
    const Q2 = Q + 6000;
    h.go(Q2); h.a.turnDispatched(2, Q2, Q2, 'vad');
    h.a.forward(src(2, 'gemini')); h.a.forward(tok(1, 'b ')); h.a.forward(tok(2, 'x ')); h.a.forward(end(1, 'aborted')); h.a.forward(tok(2, 'y '));
    h.go(Q2 + 400); h.a.routerTurn(rt(1, `Docker is ${words(12)} `, Q + 800, done(Q + 3000)));
    h.a.routerTurn(rt(2, 'hard', Q2 + 400, done(Q2 + 400)));
    h.a.forward(fin(2, 'x y')); h.a.forward(hist(2, 'x y')); h.a.forward(end(2));
    const t1 = h.sent.filter((o) => (o.ch === 'source' ? o.turnId : o.p.turnId) === 1);
    expect(t1.every((o) => o.ch === 'source' ? o.label === LIVE_LABEL : o.p.origin === 'live')).toBe(true);
    const t2 = h.sent.filter((o) => (o.ch === 'source' ? o.turnId : o.p.turnId) === 2).map(sig);
    expect(t2).toEqual(['src:gemini@2', 'tok:x |pipeline@2', 'tok:y |pipeline@2', 'fin:x y|pipeline@2']);
    const shadow = caps(h).find((c) => c.kind === 'shadow');
    expect(shadow).toMatchObject({ turn: 1, text: 'a b ' });
    expect(h.history.map((x) => x.text)).toEqual([`Docker is ${words(12)} `, 'x y']);
  });

  it('aborted pipeline with no final: shadow capture carries the text streamed so far; the line waits for the router turn to end', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(tok(1, 'partial ')); h.a.forward(tok(1, 'words'));
    h.go(Q + 500); h.a.routerTurn(rt(1, `Docker is ${words(12)} `, Q + 500));
    h.go(Q + 900); h.a.forward(end(1, 'aborted'));
    h.a.turnClosed(1, Q + 900);
    expect(lines(h)).toHaveLength(0); // the Live display is still streaming
    h.go(Q + 1500); h.a.routerTurn(rt(1, `Docker is ${words(12)}`, Q + 500, done(Q + 1500)));
    expect(caps(h).map((c) => c.kind)).toEqual(['live', 'shadow']);
    expect(caps(h)[1]).toMatchObject({ text: 'partial words', turn: 1 });
    expect(one(h)).toMatchObject({ shown: 'live', shadow: '0' });
  });

  it('the line waits for the pipeline end, and for every paired router turn unless the turn is closed', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 600); h.a.routerTurn(rt(1, 'hard and more', Q + 600));
    expect(lines(h)).toHaveLength(0);
    h.a.forward(fin(1, 'x')); h.a.forward(end(1));
    expect(lines(h)).toHaveLength(0); // the router turn is still streaming and the turn is open
    h.a.turnClosed(1, Q + 900);
    expect(lines(h)).toHaveLength(1);
  });

  it('no line before the pipeline end even when everything else is done', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 600); h.a.routerTurn(rt(1, 'hard', Q + 600, done(Q + 600)));
    h.a.turnClosed(1, Q + 900);
    expect(lines(h)).toHaveLength(0);
    h.a.forward(end(1, 'failed'));
    expect(lines(h)).toHaveLength(1);
  });
});

describe('RouterArbiter: a second end for one turn (controller addition)', () => {
  it('completed, then a late aborted: one decision line, one capture, kind stays completed', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(tok(1, 'P1')); h.a.forward(fin(1, 'P1'));
    h.go(Q + 500); h.a.routerTurn(rt(1, `Docker is ${words(12)} `, Q + 500, done(Q + 900)));
    h.a.forward(end(1, 'completed')); h.a.turnClosed(1, Q + 2000);
    expect(lines(h)).toHaveLength(1); expect(caps(h).map((c) => c.kind)).toEqual(['live', 'shadow']);
    const endMs = caps(h)[1].endMs;
    h.go(Q + 3000); h.a.forward(end(1, 'aborted'));
    expect(lines(h)).toHaveLength(1); expect(caps(h)).toHaveLength(2); expect(caps(h)[1].endMs).toBe(endMs);
    expect(h.diag.filter((l) => l.includes('end dropped'))).toEqual([]);
  });
  it('the late end does not move the end time the shadow capture will carry', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(tok(1, 'P1'));
    h.go(Q + 500); h.a.routerTurn(rt(1, `Docker is ${words(12)} `, Q + 500));
    h.go(Q + 1000); h.a.forward(end(1, 'completed'));
    h.go(Q + 1500); h.a.forward(end(1, 'aborted'));
    h.go(Q + 2000); h.a.routerTurn(rt(1, `Docker is ${words(12)} `, Q + 500, done(Q + 2000)));
    expect(caps(h).find((c) => c.kind === 'shadow')!.endMs).toBe(1000);
  });
});

describe('RouterArbiter: dispatch line, count, idempotence (items 17-19)', () => {
  it('writes one dispatch line per distinct turn and counts distinct ids', () => {
    const h = boot();
    dispatch(h);
    h.a.setEar('2.5'); h.a.turnOpened(2, Q); h.go(Q + 7000); h.a.turnDispatched(2, Q + 7000, Q + 6000, 'final');
    expect(h.diag.filter((l) => l.startsWith('[Router] dispatch'))).toEqual([
      `[Router] dispatch turn=1 at=${Q} q_at=${Q} q_src=vad router=up ear=3.1`,
      `[Router] dispatch turn=2 at=${Q + 7000} q_at=${Q + 6000} q_src=final router=up ear=2.5`,
    ]);
    expect(h.a.dispatchCount()).toBe(2);
  });
  it('I3: turnDispatched twice for one id gives one dispatch line and one count', () => {
    const h = boot();
    h.go(Q); h.a.turnDispatched(1, Q, Q, 'vad'); h.a.turnDispatched(1, Q + 50, Q + 40, 'final');
    expect(h.diag.filter((l) => l.startsWith('[Router] dispatch'))).toHaveLength(1);
    expect(h.a.dispatchCount()).toBe(1);
  });
});

describe('RouterArbiter: sent= (M3)', () => {
  it('a pipeline turn whose tokens were all empty strings counts only the source and the final', () => {
    const h = boot();
    h.a.setRouterUp(false, Q - 3000);
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, '')); h.a.forward(tok(1, '')); h.a.forward(fin(1, 'x')); h.a.forward(end(1)); h.a.turnClosed(1, Q + 100);
    expect(sigs(h)).toEqual(['src:gemini@1', 'fin:x|pipeline@1']);
    expect(one(h).sent).toBe('2');
  });
  it('a dispatched turn with nothing sent at all reads sent=0', () => {
    const h = boot();
    h.a.setRouterUp(false, Q - 3000);
    dispatch(h);
    h.a.forward(end(1, 'failed')); h.a.turnClosed(1, Q + 100);
    expect(one(h).sent).toBe('0');
  });
});
