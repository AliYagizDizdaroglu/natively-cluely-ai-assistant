import { describe, it, expect } from 'vitest';
import { RouterArbiter, type ArbiterDeps, type RouterTurnIn } from './routerArbiter';

// S2: main.ts un-marks a failed answer's question only when no Live answer can be on screen for the turn, i.e. the
// arbiter has no record of the turn (flag off, evicted) or has DECIDED the pipeline. A pending decision (up to
// DECIDE_MS after the question) may still go to Live, so it keeps the mark.
const Q = 10_000;
function make(enabled = true) {
  let now = 0;
  const timers: { at: number; fn: () => void; dead: boolean }[] = [];
  const deps: ArbiterDeps = {
    enabled, now: () => now,
    setTimer: (fn, ms) => { const h = { at: now + ms, fn, dead: false }; timers.push(h); return h; },
    clearTimer: (h) => { (h as { dead: boolean }).dead = true; },
    send: () => {}, addHistory: () => {}, diag: () => {}, capture: () => {},
  };
  const a = new RouterArbiter(deps);
  const go = (to: number) => {
    for (;;) {
      const due = timers.filter((h) => !h.dead && h.at <= to).sort((x, y) => x.at - y.at)[0];
      if (!due) break;
      due.dead = true; now = Math.max(now, due.at); due.fn();
    }
    now = to;
  };
  return { a, go };
}
const rt = (seq: number, text: string, F: number, extra: Partial<RouterTurnIn> = {}): RouterTurnIn => ({ seq, text, firstTextAt: F, completed: false, ...extra });
const boot = () => { const h = make(); h.go(Q - 4000); h.a.setRouterUp(true, 0); h.a.turnOpened(1, Q - 4000); h.go(Q); h.a.turnDispatched(1, Q, Q, 'vad'); return h; };

describe('RouterArbiter.pipelineDecided', () => {
  it('a turn the arbiter never saw: decided (nothing can be shown by Live)', () => {
    expect(make().a.pipelineDecided(99)).toBe(true);
  });
  it('flag off (arbiter disabled): decided', () => {
    const h = make(false);
    h.a.turnDispatched(1, Q, Q, 'vad');
    expect(h.a.pipelineDecided(1)).toBe(true);
  });
  it('dispatched, no decision yet (before Q + 2000): not decided', () => {
    const h = boot();
    h.go(Q + 1000);
    expect(h.a.pipelineDecided(1)).toBe(false);
  });
  it('decided pipeline (row 3 "hard"): decided', () => {
    const h = boot();
    h.go(Q + 600); h.a.routerTurn(rt(1, 'hard', Q + 600, { completed: true, endKind: 'generationComplete', endedAt: Q + 600 }));
    expect(h.a.pipelineDecided(1)).toBe(true);
  });
  it('decided pipeline by the deadline (no router turn): decided', () => {
    const h = boot();
    h.go(Q + 2000);
    expect(h.a.pipelineDecided(1)).toBe(true);
  });
  it('decided live (easy answer): not decided', () => {
    const h = boot();
    h.go(Q + 800); h.a.routerTurn(rt(1, 'Docker is ', Q + 800));
    expect(h.a.pipelineDecided(1)).toBe(false);
  });
});
