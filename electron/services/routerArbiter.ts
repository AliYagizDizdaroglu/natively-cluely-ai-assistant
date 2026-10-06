/**
 * Spec 4.3, 4.5 (main side), 4.6, 5, 6. The arbiter's pure core: pairing, the decision rows, holding, Live synthesis,
 * append, supersede, history, capture and decision lines. No clock, no I/O of its own: everything arrives through ArbiterDeps.
 */
import { completeFirstWord, routeFirstWord, isHardWord, checkCompleted, decisionRoute, showablePrefix, tokensOf } from './routeReader';
import { createUnknownMarkerStripper } from '../llm/unknownMarkerFilter';

export type QSrc = 'vad' | 'final';
export type Origin = 'live' | 'pipeline';
export type RouterEndKind = 'generationComplete' | 'turnComplete' | 'interrupted' | 'closed' | 'cap';
export interface RouterTurnIn { seq: number; text: string; firstTextAt: number; completed: boolean; endKind?: RouterEndKind; endedAt?: number; afterComplete?: boolean }
export interface TokenPayload { token: string; question: string; confidence: number; replace: boolean; cues?: string[]; turnId?: number; origin?: Origin; append?: true; label?: '(full answer)' }
export interface FinalPayload { answer: string; question: string; confidence: number; replace: boolean; turnId?: number; origin?: Origin; append?: true }
export type Outbound = { ch: 'token'; p: TokenPayload } | { ch: 'final'; p: FinalPayload } | { ch: 'source'; label: string; turnId?: number };
export type PipelineIn =
  | Outbound
  | { ch: 'end'; turnId: number; kind: 'completed' | 'aborted' | 'failed' }
  | { ch: 'history'; turnId: number; text: string; question?: string };
export interface ArbiterDeps {
  enabled: boolean;
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(h: unknown): void;
  send(o: Outbound): void;                         // to the renderer
  addHistory(text: string, question?: string): void;
  diag(line: string): void;                        // [Router] decision/dispatch lines
  capture(line: string): void;                     // [RouterAnswer] lines
}
export const LIVE_LABEL = 'gemini-3.8-live';

const PAIR_WINDOW_MS = 2000;   // spec 4.3: pairing window after a turn closes
const DECIDE_MS = 2000;        // spec 4.3: decision deadline, Q + 2000
const CAP_MS = 10_000;         // spec 4.3: the Live cap, Q + 10 000
const KEEP_TURNS = 50;         // linear scans below are fine at ~50 turns per run

type Mode = 'pending' | 'pipeline' | 'live' | 'appended';

interface RT {
  seq: number; firstTextAt: number; arrivedAt: number; text: string; completed: boolean;
  ended: boolean; endKind?: RouterEndKind; endedAt?: number;
  firstWordAt: number | null;       // W: now() at the first update where the first word was complete
  turn: Turn | null; role: 'pending' | 'decider' | 'dup' | 'unpaired';
  lineWritten: boolean; capped: boolean;
  frozen: boolean;                  // the Live display is over: later text no longer changes what the line reads
}
interface Decision { row: 1 | 2 | 3 | 4 | 5; shown: 'pipeline' | 'live'; reason: string }
interface Turn {
  id: number; openedAt: number | null; closedAt: number | null; dispatchedAt: number | null;
  q: number; qSrc: QSrc; routerUpAtQ: boolean; earAtQ: '3.1' | '2.5';
  rts: RT[]; decider: RT | null; decision: Decision | null;
  deadlineTimer: unknown; mode: Mode;
  held: Outbound[]; pipeSource: string | null; pipeText: string; finalText: string | null;
  pipeFirstAt: number | null; pipeEnded: boolean; pipeEndAt: number | null; pipeEndKind: string | null; historyText: string | null; historyQuestion?: string; historyAdded: boolean;
  pQuestion: string | null; pConf: number | null;
  live: { phase: 'idle' | 'streaming' | 'done'; stripper: ReturnType<typeof createUnknownMarkerStripper>; shownRaw: number; shownText: string; V: number | null; capTimer: unknown };
  appended: boolean; appendReason: string | null; superseded: boolean; lineWritten: boolean;
  replacedAt: number | null; staleEnds: number; replaceSeen: boolean;
  liveCaptured: boolean; shadowCaptured: boolean; appendedCaptured: boolean;
  appendLabelPending: boolean;      // the first pipeline token sent after an append carries the "(full answer)" label
  sent: number;
  visible: boolean;                 // fix4: this turn has already sent visible text (a token or a final)
}

export class RouterArbiter {
  private turns: Turn[] = [];
  private rts = new Map<number, RT>();
  private dispatched = new Set<number>();
  // Spec 4.1: down until setupComplete, so a router that never connects reads router-down (row 1) at once.
  private routerStates: { at: number; up: boolean }[] = [];
  private earStates: { at: number; model: '3.1' | '2.5' }[] = [];

  constructor(private deps: ArbiterDeps) {}

  // ---------------------------------------------------------------- turn machine inputs

  turnOpened(id: number, at: number): void {
    if (!this.deps.enabled) return;
    this.turn(id).openedAt = at;
  }

  turnClosed(id: number, at: number): void {
    if (!this.deps.enabled) return;
    const t = this.turn(id);
    t.closedAt = at;
    if (t.dispatchedAt === null) {            // closes without a dispatch: its router turns are unpaired (item 4)
      for (const r of t.rts) this.unpair(r);
      t.rts = [];
      return;
    }
    this.maybeWriteLine(t);
  }

  turnDispatched(id: number, at: number, q: number, qSrc: QSrc): void {
    if (!this.deps.enabled || this.dispatched.has(id)) return;     // item 19: idempotent per id
    this.dispatched.add(id);
    const t = this.turn(id);
    t.dispatchedAt = at; t.q = q; t.qSrc = qSrc;
    t.routerUpAtQ = this.routerUpAt(q); t.earAtQ = this.earAt(q);
    this.deps.diag(`[Router] dispatch turn=${id} at=${at} q_at=${q} q_src=${qSrc} router=${t.routerUpAtQ ? 'up' : 'down'} ear=${t.earAtQ}`);
    this.chooseDecider(t);
    this.tryDecide(t);
    if (!t.decision) t.deadlineTimer = this.deps.setTimer(() => this.tryDecide(t), Math.max(0, q + DECIDE_MS - this.deps.now()));
    this.maybeWriteLine(t);
  }

  setRouterUp(up: boolean, at: number): void {
    if (!this.deps.enabled) return;
    this.routerStates.push({ at, up });
  }

  setEar(model: '3.1' | '2.5'): void {
    if (!this.deps.enabled) return;
    this.earStates.push({ at: this.deps.now(), model });
  }

  dispatchCount(): number { return this.dispatched.size; }

  // ---------------------------------------------------------------- router turns

  routerTurn(ev: RouterTurnIn): void {
    if (!this.deps.enabled) return;
    const now = this.deps.now();
    let r = this.rts.get(ev.seq);
    if (r && r.firstTextAt !== ev.firstTextAt) r = undefined;   // a restarted router session reuses seq: a new first-text time is a new router turn
    if (r?.capped) return;                    // item 10(c): a capped decider's later events are ignored
    if (!r) {
      r = { seq: ev.seq, firstTextAt: ev.firstTextAt, arrivedAt: now, text: '', completed: false, ended: false, firstWordAt: null, turn: null, role: 'pending', lineWritten: false, capped: false, frozen: false };
      this.rts.set(ev.seq, r);
    }
    if (!r.frozen) { r.text = ev.text; r.completed = ev.completed; }
    if (ev.endKind !== undefined && !r.ended) { r.ended = true; r.endKind = ev.endKind; r.endedAt = ev.endedAt ?? now; }
    if (r.firstWordAt === null && completeFirstWord(r.text, r.ended) !== null) r.firstWordAt = now;   // item 6
    if (r.turn === null && r.role === 'pending') this.pair(r);

    if (r.role === 'unpaired' || r.role === 'dup') { if (r.ended) this.writeRtLine(r, r.role === 'dup' ? 'dup' : 'unpaired'); return; }
    const t = r.turn!;
    if (r.role === 'decider') {
      if (!t.decision) this.tryDecide(t); else this.pumpLive(t);
    }
    this.maybeWriteLine(t);
  }

  /** Item 4. Sets r.turn / r.role; a later dispatch (or none) settles the role. */
  private pair(r: RT): void {
    const F = r.firstTextAt;
    let best: Turn | null = null;
    for (const t of this.turns) {
      if (t.openedAt !== null && t.openedAt <= F && (t.closedAt === null || t.closedAt > F) && (!best || t.openedAt > best.openedAt!)) best = t;
    }
    if (!best) {
      for (const t of this.turns) {
        if (t.closedAt !== null && t.closedAt <= F && F - t.closedAt <= PAIR_WINDOW_MS && (!best || t.closedAt > best.closedAt!)) best = t;
      }
    }
    if (best && best.closedAt !== null && best.dispatchedAt === null) best = null;   // its turn closed without a dispatch
    if (!best) { r.role = 'unpaired'; return; }
    r.turn = best;
    if (best.lineWritten) { r.role = 'dup'; return; }          // the turn's line is out already: this one can only be a dup
    best.rts.push(r);
    if (best.dispatchedAt !== null) {                           // item 5, after the dispatch: the first to arrive decides
      if (best.decider === null) { best.decider = r; r.role = 'decider'; } else this.markDup(r);
    }
  }

  /** Item 5, at the dispatch. */
  private chooseDecider(t: Turn): void {
    const at = t.dispatchedAt!;
    const rest: RT[] = [];
    for (const r of t.rts) {
      if (r.endKind === 'interrupted' && r.endedAt !== undefined && r.endedAt < at) this.markDup(r); else rest.push(r);
    }
    let pick: RT | undefined;
    const before = rest.filter((r) => r.firstTextAt <= at);
    if (before.length) pick = before.reduce((a, b) => (b.firstTextAt >= a.firstTextAt ? b : a));
    else if (rest.length) pick = rest.reduce((a, b) => (b.firstTextAt < a.firstTextAt ? b : a));
    for (const r of rest) { if (r === pick) { r.role = 'decider'; t.decider = r; } else this.markDup(r); }
  }

  private markDup(r: RT): void {
    r.role = 'dup';
    if (r.ended) this.writeRtLine(r, 'dup');
  }

  private unpair(r: RT): void {
    r.role = 'unpaired'; r.turn = null;
    if (r.ended) this.writeRtLine(r, 'unpaired');
  }

  /** One line for a dup or unpaired router turn, written when it ends (item 4, 5). */
  private writeRtLine(r: RT, reason: 'dup' | 'unpaired'): void {
    if (r.lineWritten) return;
    r.lineWritten = true;
    const t = r.turn;
    const route = decisionRoute(r.text, r.completed, r.ended);
    const ear = t ? t.earAtQ : this.earAt(r.firstTextAt);
    const up = t ? t.routerUpAtQ : this.routerUpAt(r.firstTextAt);
    this.deps.diag(`[Router] turn=${t ? t.id : '-'} route=${route} reason=${reason} live_first_ms=- live_words=${tokensOf(r.text).length} shown=- shadow=- ear=${ear} router=${up ? 'up' : 'down'} q_src=${t ? t.qSrc : '-'} q_at=${t ? t.q : '-'}`);
  }

  // ---------------------------------------------------------------- the decision (item 7)

  private tryDecide(t: Turn): void {
    if (t.decision || t.dispatchedAt === null) return;
    const now = this.deps.now();
    if (!t.routerUpAtQ) return this.decide(t, 1, 'pipeline', 'router-down');
    const d = t.decider; const deadline = t.q + DECIDE_MS;
    if (!d || d.firstWordAt === null || d.firstWordAt > deadline) {
      if (now >= deadline) this.decide(t, 2, 'pipeline', '');       // reason resolved at line time: late / no-router-turn
      return;
    }
    const fw = completeFirstWord(d.text, d.ended)!;
    if (isHardWord(fw)) return this.decide(t, 3, 'pipeline', routeFirstWord(fw).reason);
    const c = checkCompleted(d.text, d.completed, d.ended, false);
    if (!c.ok) return this.decide(t, 4, 'pipeline', c.reason);       // I1, "Heart." included
    t.live.V = Math.max(d.firstWordAt, t.dispatchedAt);
    this.decide(t, 5, 'live', '-');
  }

  private decide(t: Turn, row: Decision['row'], shown: Decision['shown'], reason: string): void {
    t.decision = { row, shown, reason };
    if (t.deadlineTimer !== undefined) { this.deps.clearTimer(t.deadlineTimer); t.deadlineTimer = undefined; }
    if (shown === 'pipeline') this.release(t); else this.startLive(t);
    this.settle(t);
    this.maybeWriteLine(t);
  }

  /** Item 8: rows 1-4. */
  private release(t: Turn): void {
    t.mode = 'pipeline';
    const held = t.held; t.held = [];
    for (const o of held) this.sendPipeline(t, o);
    if (t.historyText !== null && !t.historyAdded) { t.historyAdded = true; this.deps.addHistory(t.historyText, t.historyQuestion); }
  }

  // ---------------------------------------------------------------- Live display (items 9, 10)

  private startLive(t: Turn): void {
    t.mode = 'live'; t.live.phase = 'streaming';
    this.emit(t, { ch: 'source', label: LIVE_LABEL, turnId: t.id });
    t.live.capTimer = this.deps.setTimer(() => this.onCap(t), Math.max(0, t.q + CAP_MS - this.deps.now()));
    this.pumpLive(t);
  }

  /** Show what may be shown of the decider's text; end the display at a stop or at the decider's end. */
  private pumpLive(t: Turn): void {
    const L = t.live; const d = t.decider;
    if (L.phase !== 'streaming' || !d) return;
    const { prefix, stop } = showablePrefix(d.text, d.ended);
    if (prefix.length > L.shownRaw) {
      const delta = prefix.slice(L.shownRaw); L.shownRaw = prefix.length;
      this.sendLiveToken(t, L.stripper.push(delta));    // push() returns '' while it holds a partial
    }
    if (stop !== null) return this.append(t, stop);     // 10(a)
    if (d.ended) {                                      // 10(b)
      const c = checkCompleted(d.text, d.completed, true, true);
      if (c.ok) this.finishLive(t); else this.append(t, c.reason);
    }
  }

  private sendLiveToken(t: Turn, out: string): void {
    if (!out) return;
    t.live.shownText += out;
    this.emit(t, { ch: 'token', p: { token: out, question: t.pQuestion ?? '', confidence: t.pConf ?? 1, replace: false, turnId: t.id, origin: 'live' } });
  }

  /** Flush the stripper (its held partial is part of the shown text), then the Live final. */
  private closeLive(t: Turn): void {
    const L = t.live;
    this.sendLiveToken(t, L.stripper.flush());
    L.phase = 'done'; if (t.decider) t.decider.frozen = true;
    if (L.capTimer !== undefined) { this.deps.clearTimer(L.capTimer); L.capTimer = undefined; }
    this.emit(t, { ch: 'final', p: { answer: L.shownText, question: t.pQuestion ?? '', confidence: t.pConf ?? 1, replace: false, turnId: t.id, origin: 'live' } });
  }

  private finishLive(t: Turn): void {
    this.closeLive(t);
    this.deps.addHistory(t.live.shownText, t.pQuestion ?? undefined);
    this.writeLiveCapture(t);
    this.settle(t);
  }

  private onCap(t: Turn): void {
    const d = t.decider;
    if (t.live.phase !== 'streaming' || !d || d.ended) return;
    d.ended = true; d.endKind = 'cap'; d.endedAt = this.deps.now(); d.capped = true;    // 10(c)
    this.append(t, 'incomplete-after-show');
    this.maybeWriteLine(t);
  }

  /** Item 11, case C. */
  private append(t: Turn, reason: string): void {
    if (t.live.phase !== 'streaming') return;
    this.closeLive(t);
    t.appended = true; t.appendReason = reason; t.mode = 'appended';
    this.deps.addHistory(t.live.shownText);
    this.writeLiveCapture(t);
    if (t.pipeSource !== null) this.emit(t, { ch: 'source', label: t.pipeSource, turnId: t.id });
    const held = t.held; t.held = [];
    for (const o of held) if (o.ch !== 'source') this.sendPipeline(t, o, o.ch === 'token' && t.appendLabelPending);
    if (t.historyText !== null && !t.historyAdded) { t.historyAdded = true; this.deps.addHistory(t.historyText); }
    this.settle(t);
    this.maybeWriteLine(t);
  }

  // ---------------------------------------------------------------- pipeline events

  forward(ev: PipelineIn): void {
    if (!this.deps.enabled) {
      if (ev.ch === 'history') this.deps.addHistory(ev.text, ev.question);
      else if (ev.ch !== 'end') this.deps.send(ev);
      return;
    }
    const turnId = ev.ch === 'source' ? ev.turnId : ev.ch === 'token' || ev.ch === 'final' ? ev.p.turnId : ev.turnId;
    if (turnId === undefined) { if (ev.ch !== 'end' && ev.ch !== 'history') this.deps.send(ev); return; }   // item 2
    const t = this.turn(turnId);
    switch (ev.ch) {
      case 'source': t.pipeSource = ev.label; this.route(t, ev); break;
      case 'token': {
        if (ev.p.replace) this.onSupersede(t);
        if (ev.p.token === '' && !ev.p.replace && !ev.p.cues?.length) break;   // filtered away; cues must survive                 // filtered away: nothing to hold or show
        if (ev.p.token !== '') {
          t.pipeText += ev.p.token;
          if (t.pipeFirstAt === null) t.pipeFirstAt = this.deps.now();
          if (t.pQuestion === null) { t.pQuestion = ev.p.question; t.pConf = ev.p.confidence; }
        }
        this.route(t, ev);
        break;
      }
      case 'final': if (ev.p.replace && !t.replaceSeen) this.onSupersede(t);   // a replacing stream with no tokens
        t.finalText = ev.p.answer; this.route(t, ev); break;
      case 'history': {
        t.historyText = ev.text; t.historyQuestion = ev.question;
        if (t.mode === 'pipeline') { t.historyAdded = true; this.deps.addHistory(ev.text, ev.question); }
        else if (t.mode === 'appended') { t.historyAdded = true; this.deps.addHistory(ev.text); }
        break;
      }
      case 'end': this.onEnd(t, ev.kind); break;
    }
  }

  /** Hold, hide or send one pipeline Outbound according to the turn's mode. */
  private route(t: Turn, o: Outbound): void {
    if (t.mode === 'pending' || t.mode === 'live') { t.held.push(o); return; }
    this.sendPipeline(t, o, t.mode === 'appended' && o.ch === 'token' && t.appendLabelPending);
  }

  private sendPipeline(t: Turn, o: Outbound, label = false): void {
    const app = t.mode === 'appended' ? ({ append: true, replace: false } as const) : {};   // an append never replaces the Live bubble
    // fix4 (R2): replace:true overwrites the previous bubble, so it is kept only when this turn already has visible text
    if (!t.visible && (o.ch === 'token' || o.ch === 'final') && o.p.replace) o = { ...o, p: { ...o.p, replace: false } } as Outbound;
    if (o.ch === 'source') this.emit(t, { ch: 'source', label: o.label, turnId: t.id });
    else if (o.ch === 'token') {
      if (label) t.appendLabelPending = false;
      this.emit(t, { ch: 'token', p: { ...o.p, turnId: t.id, origin: 'pipeline', ...app, ...(label ? { label: '(full answer)' as const } : {}) } });
    } else this.emit(t, { ch: 'final', p: { ...o.p, turnId: t.id, origin: 'pipeline', ...app } });
  }

  /** Item 13, case E: runs when a token with replace:true arrives, before the token itself is routed. */
  private onSupersede(t: Turn): void {
    t.replacedAt = this.deps.now(); t.replaceSeen = true;
    if (!t.pipeEnded) t.staleEnds++;           // the old stream's aborted end may still be on its way (item 20); one per unfinished stream
    t.pipeText = ''; t.finalText = null; t.historyText = null; t.historyAdded = false;
    t.pipeEnded = false; t.pipeEndAt = null; t.pipeEndKind = null; t.pipeFirstAt = null;   // fix3: shadow= and the capture's firstMs describe the replacing stream
    if (t.decision?.shown === 'live') {         // fix3 (review I-1): the authoritative record, whatever the Live phase; set before any capture is written
      t.superseded = true;
      this.deps.diag(`[Router] superseded turn=${t.id} phase=${t.live.phase === 'streaming' ? 'streaming' : 'done'} line_written=${t.lineWritten ? 'yes' : 'no'}`);
    }
    if (t.mode === 'pending') {
      const last = t.held[t.held.length - 1];   // fix3 (review I-2): the replacing stream's announce directly precedes its replace token; an earlier source is the old stream's
      t.held = last && last.ch === 'source' ? [last] : [];
      return;
    }
    if (t.mode === 'live' || t.mode === 'appended') {
      if (t.live.phase === 'streaming') {      // stop the Live display: no more Live tokens, no Live final, no history
        t.superseded = true;                   // fix2: the live capture written here must already read superseded
        this.writeLiveCapture(t);              // I-1: what the user saw is still captured, as shown so far
        t.live.phase = 'done'; if (t.decider) t.decider.frozen = true;
        if (t.live.capTimer !== undefined) { this.deps.clearTimer(t.live.capTimer); t.live.capTimer = undefined; }
      }
      const last = t.held[t.held.length - 1];   // fix2 (Task 8 I2) + fix3: forward the held source only if it is the last held item
      t.held = []; t.mode = 'pipeline';
      if (last && last.ch === 'source') this.sendPipeline(t, last);
    }
  }

  private onEnd(t: Turn, kind: 'completed' | 'aborted' | 'failed'): void {
    if ((kind === 'aborted' || kind === 'failed') && t.staleEnds > 0) {     // item 20: one stale end per superseded stream
      t.staleEnds--;
      this.deps.diag(`[Router] end dropped turn=${t.id} kind=${kind} reason=superseded`);
      return;
    }
    t.staleEnds = 0; t.replaceSeen = false;
    if (t.pipeEnded) return;                    // a second end for the same stream is idempotent: kind and capture stay
    t.pipeEnded = true; t.pipeEndAt = this.deps.now(); t.pipeEndKind = kind;
    this.settle(t);
    this.maybeWriteLine(t);
  }

  // ---------------------------------------------------------------- capture (item 15) and the decision line (item 16)

  private writeCapture(t: Turn, kind: 'live' | 'shadow' | 'appended', text: string, firstMs: number | null, endMs: number | null): void {
    this.deps.capture('[RouterAnswer] ' + JSON.stringify({ turn: t.id, kind, text, words: tokensOf(text).length, firstMs, endMs, q_src: t.qSrc, superseded: t.superseded }));
  }

  private writeLiveCapture(t: Turn): void {
    if (t.liveCaptured) return;
    t.liveCaptured = true;
    this.writeCapture(t, 'live', t.live.shownText, t.live.V! - t.q, this.deps.now() - t.q);
  }

  /** shadow / appended captures, each once, when the pipeline has ended and (for the shadow) the Live display is over. */
  private settle(t: Turn): void {
    if (!t.pipeEnded) return;
    const text = t.historyText ?? (t.pipeText || t.finalText || '');
    const firstMs = t.pipeFirstAt === null ? null : t.pipeFirstAt - t.q;
    const endMs = t.pipeEndAt! - t.q;
    if (t.appended) {
      if (!t.appendedCaptured) { t.appendedCaptured = true; this.writeCapture(t, 'appended', text, firstMs, endMs); }
    } else if (t.decision?.shown === 'live' && t.live.phase === 'done' && !t.shadowCaptured) {
      t.shadowCaptured = true; this.writeCapture(t, 'shadow', text, firstMs, endMs);
    }
  }

  private maybeWriteLine(t: Turn): void {
    const dec = t.decision;
    if (t.lineWritten || !dec || !t.pipeEnded) return;
    const paired = t.rts.filter((r) => r.role !== 'unpaired');
    if (!(t.closedAt !== null || paired.every((r) => r.ended))) return;
    if (dec.shown === 'live' && t.live.phase !== 'done') return;     // the Live display must be over (the cap guarantees it ends)
    t.lineWritten = true;

    let route: string; let reason = dec.reason;
    if (dec.row === 1) route = paired.length ? decisionRoute(paired[0].text, paired[0].completed, paired[0].ended) : 'invalid';
    else if (dec.row === 2) {
      route = 'invalid';
      const deadline = t.q + DECIDE_MS;
      reason = paired.some((r) => (r.firstWordAt !== null && r.firstWordAt > deadline) || r.arrivedAt > deadline) ? 'late' : 'no-router-turn';
    } else if (dec.row === 3) route = 'hard';
    else if (dec.row === 4) route = 'invalid';
    else if (t.appended) { route = 'invalid'; reason = t.appendReason!; } else { route = 'easy-answer'; reason = '-'; }

    const d = t.decider;
    const liveFirst = dec.shown === 'live' ? String(t.live.V! - t.q) : d && d.firstWordAt !== null ? String(d.firstWordAt - t.q) : '-';
    const liveWords = d ? String(tokensOf(d.text).length) : '-';
    const shadow = t.pipeFirstAt !== null ? String(t.pipeFirstAt - t.dispatchedAt!) : '-';
    this.deps.diag(`[Router] turn=${t.id} route=${route} reason=${reason} live_first_ms=${liveFirst} live_words=${liveWords} shown=${dec.shown} shadow=${shadow} ear=${t.earAtQ} router=${t.routerUpAtQ ? 'up' : 'down'} q_src=${t.qSrc} q_at=${t.q} sent=${t.sent} superseded=${t.superseded ? 'yes' : 'no'}`);
    this.evict();
  }

  // ---------------------------------------------------------------- records

  private emit(t: Turn, o: Outbound): void {
    if ((o.ch === 'token' && o.p.token !== '') || (o.ch === 'final' && o.p.answer !== '')) t.visible = true;
    t.sent++; this.deps.send(o);
  }

  private turn(id: number): Turn {
    let t = this.turns.find((x) => x.id === id);
    if (t) return t;
    t = {
      id, openedAt: null, closedAt: null, dispatchedAt: null, q: 0, qSrc: 'final', routerUpAtQ: true, earAtQ: '3.1',
      rts: [], decider: null, decision: null, deadlineTimer: undefined, mode: 'pending',
      held: [], pipeSource: null, pipeText: '', finalText: null, pipeFirstAt: null, pipeEnded: false, pipeEndAt: null, pipeEndKind: null,
      historyText: null, historyAdded: false, pQuestion: null, pConf: null,
      live: { phase: 'idle', stripper: createUnknownMarkerStripper(), shownRaw: 0, shownText: '', V: null, capTimer: undefined },
      appended: false, appendReason: null, superseded: false, lineWritten: false, replacedAt: null, staleEnds: 0, replaceSeen: false,
      liveCaptured: false, shadowCaptured: false, appendedCaptured: false, appendLabelPending: true, sent: 0, visible: false,
    };
    this.turns.push(t);
    return t;
  }

  /** Drop the oldest turns whose line is written, beyond KEEP_TURNS. */
  private evict(): void {
    while (this.turns.length > KEEP_TURNS) {
      const i = this.turns.findIndex((x) => x.lineWritten);
      if (i < 0) break;
      this.turns.splice(i, 1);
    }
  }

  private routerUpAt(time: number): boolean {
    let up = false;
    for (const s of this.routerStates) if (s.at <= time) up = s.up;
    return up;
  }

  private earAt(time: number): '3.1' | '2.5' {
    let m: '3.1' | '2.5' = '3.1';
    for (const s of this.earStates) if (s.at <= time) m = s.model;
    return m;
  }
}
