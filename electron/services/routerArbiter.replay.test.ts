import { describe, it, expect } from 'vitest';
import { RouterArbiter, type ArbiterDeps, type Outbound, type PipelineIn } from './routerArbiter';
import replay from './fixtures/router40-replay.json';

// Spec 9.2: router40's recorded router turns replayed through the arbiter. Offline, no model call, no clock of its own.
interface Item { id: string; route: string; text: string; chunks: { atMs: number; text: string }[]; generationCompleteMs: number; turnCompleteMs: number }
const items = replay as Item[];

type Ev = { at: number; ord: number; run: () => void };

/** One fresh arbiter per item; Q = clip end = 0, dispatch at Q. Returns the item's decision lines and what was sent. */
function runItem(it: Item) {
  let now = -5000;
  let n = 0;
  const timers: { at: number; n: number; fn: () => void; dead: boolean }[] = [];
  const sent: Outbound[] = [];
  const diag: string[] = [];
  const capture: string[] = [];
  const deps: ArbiterDeps = {
    enabled: true,
    now: () => now,
    setTimer: (fn, ms) => { const h = { at: now + ms, n: n++, fn, dead: false }; timers.push(h); return h; },
    clearTimer: (h) => { (h as { dead: boolean }).dead = true; },
    send: (o) => { sent.push(o); },
    addHistory: () => {},
    diag: (l) => { diag.push(l); },
    capture: (l) => { capture.push(l); },
  };
  const a = new RouterArbiter(deps);
  const go = (to: number) => {
    for (;;) {
      const due = timers.filter((h) => !h.dead && h.at <= to).sort((x, y) => x.at - y.at || x.n - y.n)[0];
      if (!due) break;
      due.dead = true; now = Math.max(now, due.at); due.fn();
    }
    now = Math.max(now, to);
  };

  a.setRouterUp(true, -5000);        // Task 5 fix: the router defaults to down
  a.turnOpened(1, -5000);
  const F = it.chunks[0].atMs;
  const evs: Ev[] = [];
  let ord = 0;
  let cum = '';
  let prevAt = F;
  for (const c of it.chunks) {
    cum += c.text;                    // the fixture stores deltas; the arbiter wants the cumulative text
    const text = cum;
    prevAt = Math.max(prevAt, c.atMs);  // chunks arrive in order: a later chunk is never earlier than the first (keeps a shifted first chunk honest)
    evs.push({ at: prevAt, ord: ord++, run: () => a.routerTurn({ seq: 1, text, firstTextAt: F, completed: false }) });
  }
  const full = cum;
  evs.push({ at: it.generationCompleteMs, ord: ord++, run: () => a.routerTurn({ seq: 1, text: full, firstTextAt: F, completed: true, endKind: 'generationComplete', endedAt: it.generationCompleteMs }) });
  evs.push({ at: 4000, ord: ord++, run: () => a.forward({ ch: 'token', p: { token: 'p', question: 'Q?', confidence: 0.9, replace: false, turnId: 1 } } as PipelineIn) });
  evs.push({ at: 6000, ord: ord++, run: () => { a.forward({ ch: 'final', p: { answer: 'p', question: 'Q?', confidence: 0.9, replace: false, turnId: 1 } } as PipelineIn); a.forward({ ch: 'end', turnId: 1, kind: 'completed' }); } });
  evs.sort((x, y) => x.at - y.at || x.ord - y.ord);

  go(0);
  a.turnDispatched(1, 0, 0, 'vad');
  for (const e of evs) { go(e.at); e.run(); }
  go(30_000);
  a.turnClosed(1, 30_000);
  go(40_000);

  const lines = diag.filter((l) => l.startsWith('[Router] turn='));
  return { lines, sent, capture };
}
const kv = (l: string): Record<string, string> => Object.fromEntries([...l.matchAll(/(\w+)=(\S+)/g)].map((m) => [m[1], m[2]]));

describe('router40 offline replay (spec 9.2)', () => {
  const counts = { shownLive: 0, shownPipeline: 0, appends: 0, row4: 0, hardRows: 0 };
  const lateIds: string[] = [];
  const liveFirstMs: number[] = [];
  const routeById: Record<string, string> = {};
  const lineCounts: Record<string, number> = {};
  for (const it of items) {
    const { lines, sent, capture } = runItem(it);
    lineCounts[it.id] = lines.length;
    if (lines.length !== 1) continue;
    const l = kv(lines[0]);
    routeById[it.id] = l.route;
    if (l.shown === 'live') { counts.shownLive++; liveFirstMs.push(Number(l.live_first_ms)); }
    if (l.shown === 'pipeline') counts.shownPipeline++;
    if (l.route === 'hard') counts.hardRows++;
    if (l.route === 'invalid' && l.reason === 'late') lateIds.push(it.id);
    if (l.route === 'invalid' && l.shown === 'pipeline' && l.reason !== 'late' && l.reason !== 'no-router-turn') counts.row4++;
    // an append shows in all three records: an invalid-after-show line, an appended capture, an append-flagged event
    if (l.shown === 'live' && l.route === 'invalid') counts.appends++;
    counts.appends += capture.filter((c) => c.includes('"kind":"appended"')).length;
    counts.appends += sent.filter((o) => (o.ch === 'token' || o.ch === 'final') && (o.p as { append?: boolean }).append === true).length;
  }

  it('fixture has 47 items (20 EASY, 27 HARD) and each reads exactly one decision line', () => {
    expect(items).toHaveLength(47);
    expect(items.filter((i) => i.route === 'EASY')).toHaveLength(20);
    expect(Object.values(lineCounts).every((c) => c === 1)).toBe(true);
  });

  it('counts', () => {
    // ids and counts only: never text
    console.log(`[replay] ${JSON.stringify(counts)} late=${[...lateIds].sort().join(',')} liveFirstMax=${Math.max(...liveFirstMs)}`);
    expect(counts.shownLive).toBe(20);
    expect(counts.shownPipeline).toBe(27);
    expect(counts.appends).toBe(0);
    expect(counts.row4).toBe(0);
    // The explained difference (plan-time computation from router40-R.json): RH07 and RH17's single "hard" token is complete
    // only at generationComplete (2173 ms, 2258 ms), after Q + 2000, so they read route=invalid reason=late, still pipeline-shown.
    expect([...lateIds].sort()).toEqual(['RH07', 'RH17']);
    expect(counts.hardRows).toBe(25);
    expect(liveFirstMs.every((ms) => ms <= 2000)).toBe(true);   // "all on time"
  });

  it('per-item identities: the fixture labels and the arbiter agree except for RH05 and RE09', () => {
    // NOT in the plan: the 20/27 totals hold only because two items cross. RH05 (labelled HARD, class H) has a 71-word router
    // answer, so it reads easy-answer and is shown live; RE09 (labelled EASY) is a single hard token, so it reads hard and
    // goes to the pipeline. Pinned so a change in either is seen; reported to the controller.
    const wrong = items.filter((i) => (i.route === 'EASY') !== (routeById[i.id] === 'easy-answer')).map((i) => i.id);
    expect(wrong.sort()).toEqual(['RE09', 'RH05']);
    const notHard = items.filter((i) => i.route === 'HARD' && routeById[i.id] !== 'hard').map((i) => i.id);
    expect(notHard.sort()).toEqual(['RH05', 'RH07', 'RH17']);
  });
});
