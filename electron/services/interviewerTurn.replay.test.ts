import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createInterviewerTurn, DEFAULT_TURN_CONSTANTS, type TurnDecision } from './interviewerTurn';

const FIXTURES = path.resolve(process.cwd(), 'electron/test/golden/fixtures');
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'be', 'that', 'this', 'it', 'as', 'at', 'by', 'from', 'your', 'you', 'we', 'our', 'my', 'i', 'would', 'how', 'what', 'which', 'when', 'where', 'why', 'do', 'does', 'can', 'could', 'should']);
const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
const content = (s: string): Set<string> => new Set(words(s).filter((w) => w.length >= 3 && !STOP.has(w)));
const coverage = (script: string, text: string): number => { const a = content(script), b = content(text); let hit = 0; for (const w of a) if (b.has(w)) hit++; return a.size ? hit / a.size : 1; };

interface Fixture { run: string; offsetMs: number; items: { id: string; level: string; kind: string; long?: boolean; q: string; playedAt: number; clipSecs: number; voice: [number, number][] }[]; finals: { at: number; text: string }[]; detections: { at: number; source: 'live' | 'whisper'; text: string; action: string }[] }
type Ev = { at: number; order: number; type: 'speech'; on: boolean } | { at: number; order: number; type: 'final'; text: string } | { at: number; order: number; type: 'detected'; source: 'live' | 'whisper'; text: string; fresh: boolean };

/** The [from, to) window score() attributes item k's own decisions to — spans to the NEXT roster
 * item overall (not the next *spoken* one: after9 interleaves 3 screenshot-kind items between
 * spoken ones, and a next-*spoken* boundary would skip past a screenshot's own playedAt). */
function windowOf(f: Fixture, k: number): [number, number] {
    const it = f.items[k];
    const from = it.playedAt - 2000;
    const to = (f.items[k + 1]?.playedAt ?? it.playedAt + it.clipSecs * 1000 + 90_000) - 2000;
    return [from, to];
}

/** The voice-off of whichever item's window contains `at` (−Infinity, i.e. no clamping, outside every window). */
function voiceOffAt(f: Fixture, at: number): number {
    for (let k = 0; k < f.items.length; k++) {
        const [from, to] = windowOf(f, k);
        if (at >= from && at < to) {
            const it = f.items[k];
            return it.voice.length ? it.voice[it.voice.length - 1][1] : it.playedAt + it.clipSecs * 1000;
        }
    }
    return -Infinity;
}

/** Feeds the run's events through the tracker and returns every decision, timers included. */
function replay(f: Fixture): { at: number; d: TurnDecision }[] {
    const c = DEFAULT_TURN_CONSTANTS;
    const turn = createInterviewerTurn(c);
    const events: Ev[] = [];
    for (const it of f.items) for (const [on, off] of it.voice) { events.push({ at: on, order: 0, type: 'speech', on: true }); events.push({ at: off, order: 0, type: 'speech', on: false }); }
    for (const x of f.finals) events.push({ at: x.at, order: 1, type: 'final', text: x.text });
    for (const x of f.detections) {
        // The old pipeline classified per-final, immediately, while the interviewer could still be
        // mid-utterance — the OLD log shows this directly: "dispatch: answer ... anchor=\"Why did
        // you choose XGBoost?\"" fires 3 s into a 12 s clip, 8 s before the rest of the question is
        // even spoken. The new machine only ever asks to classify once quiet() holds (no dispatch
        // path bypasses that except the detectedAt+maxHoldMs fail-safe, which exists for a VAD stuck
        // "speaking", not for feeding it a detection timestamp from a different, ungated old
        // architecture). Replaying the OLD timestamp verbatim starts that fail-safe clock 6-9 s
        // early and forces a mid-question dispatch on a lead-in fragment — reproducing the exact
        // premature-answer defect this turn design exists to fix (see project memory: "Long-question
        // defect", "Answer what was asked"). Clamp a detector fire forward to when the containing
        // item's own clip actually stopped producing voice; every other real characteristic of the
        // recording (which detector, the text, how many separate fires, their relative order) is
        // unchanged.
        const at = Math.max(x.at, voiceOffAt(f, x.at));
        // 'extend'/'drop' are the old pipeline's own bookkeeping on content it had already
        // attributed to a turn it already handled — never an independent fresh detection (see the
        // extractor's comment on `detections`). Only an 'answer' is always fed as fresh; see the
        // feeding loop below for what a non-fresh fire does when no turn is open.
        events.push({ at, order: 2, type: 'detected', source: x.source, text: x.text, fresh: x.action === 'answer' });
    }
    events.sort((a, b) => a.at - b.at || a.order - b.order);
    const out: { at: number; d: TurnDecision }[] = [];
    const runTimers = (until: number) => {
        for (let guard = 0; guard < 200; guard++) {
            const t = turn.nextTimerAt(clock);
            if (t === null || t > until) return;
            clock = t;
            settle();
        }
    };
    let clock = events[0]?.at ?? 0;
    const settle = () => { for (let g = 0; g < 8; g++) { const d = turn.tick(clock); if (d.kind === 'idle' || d.kind === 'hold') break; out.push({ at: clock, d }); } };
    for (const e of events) {
        runTimers(e.at);
        clock = e.at;
        if (e.type === 'speech') turn.speech(e.on, e.at);
        else if (e.type === 'final') turn.final(e.text, e.at);
        else {
            // Snapshot openness BEFORE liveClaim — liveClaim() itself opens a turn if none is open,
            // so checking after it would always see "open" and the guard below would never fire.
            const wasOpen = turn.snapshot().open;
            if (e.source === 'live') turn.liveClaim(e.text, e.at);
            // A non-fresh (extend/drop) fire that finds no turn open is a late cross-ear echo of an
            // already-answered, already-closed turn — a genuinely new question would have been
            // logged "answer". Don't let an echo spin up a phantom second turn; the live text above
            // is still recorded in case a genuinely open turn wants it. Cross-ear de-duplication
            // itself (ChipDeduper) is out of scope for this state machine (Ruling R3).
            if (e.fresh || wasOpen) turn.detected(e.source, e.at);
        }
        // A `classify` decision the machine emits from settle() below gets no reply here — the
        // fixture's own detector fires (this branch) are replayed as `detected` events on their
        // own recorded timing, independent of any classify request.
        settle();
    }
    runTimers(clock + 60_000);
    return out;
}

function score(f: Fixture, out: { at: number; d: TurnDecision }[]) {
    const spoken = f.items.filter((i) => (i.kind ?? 'spoken') === 'spoken');
    const rows = spoken.map((it) => {
        const [from, to] = windowOf(f, f.items.indexOf(it));
        const mine = out.filter((o) => o.at >= from && o.at < to);
        const dispatches = mine.filter((o) => o.d.kind === 'dispatch');
        const supersedes = mine.filter((o) => o.d.kind === 'supersede');
        const voiceOff = it.voice.length ? it.voice[it.voice.length - 1][1] : it.playedAt + it.clipSecs * 1000;
        const firstDetection = f.detections.filter((x) => x.at >= from && x.at < to).map((x) => x.at).sort((a, b) => a - b)[0] ?? null;
        const last = [...mine].reverse().find((o) => o.d.kind === 'dispatch' || o.d.kind === 'supersede');
        const text = last && 'text' in last.d ? last.d.text : '';
        return { id: it.id, long: !!it.long || it.level === 'long', dispatches: dispatches.length, supersedes: supersedes.length, early: dispatches.some((o) => o.at < voiceOff), latency: dispatches.length ? dispatches[0].at - voiceOff : null, budget: Math.max(voiceOff + DEFAULT_TURN_CONSTANTS.gateMs + DEFAULT_TURN_CONSTANTS.settleMs, firstDetection ?? 0) + 100 - voiceOff, coverage: coverage(it.q, text) };
    });
    return rows;
}

for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
    const file = path.join(FIXTURES, `${name}-turns.json`);
    describe(`replay of ${name}`, () => {
        const f: Fixture = JSON.parse(fs.readFileSync(file, 'utf8'));
        const rows = score(f, replay(f));
        it('answers every spoken question exactly once', () => {
            expect(rows.filter((r) => r.dispatches !== 1).map((r) => `${r.id}:${r.dispatches}`)).toEqual([]);
        });
        it('never supersedes on these runs (the transcript settles before the gate)', () => {
            expect(rows.reduce((s, r) => s + r.supersedes, 0)).toBe(0);
        });
        it('never dispatches before the voice stops', () => {
            expect(rows.filter((r) => r.early).map((r) => r.id)).toEqual([]);
        });
        it('answers every long question whole (coverage ≥ 0.8 of the script)', () => {
            expect(rows.filter((r) => r.long && r.coverage < 0.8).map((r) => `${r.id}:${r.coverage.toFixed(2)}`)).toEqual([]);
        });
        it('dispatches at the gate, or as soon as the detector spoke, never later', () => {
            expect(rows.filter((r) => r.latency !== null && r.latency > r.budget).map((r) => `${r.id}:${r.latency}>${r.budget}`)).toEqual([]);
        });
        it('median first dispatch is within 1.4 s of the voice stopping', () => {
            const lat = rows.map((r) => r.latency!).filter((x) => x !== null).sort((a, b) => a - b);
            expect(lat[Math.floor(lat.length / 2)]).toBeLessThanOrEqual(1400);
        });
    });
}
