import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createInterviewerTurn, DEFAULT_TURN_CONSTANTS, type TurnDecision } from './interviewerTurn';
import { ChipDeduper } from './ChipDeduper';

const FIXTURES = path.resolve(process.cwd(), 'electron/test/golden/fixtures');
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'be', 'that', 'this', 'it', 'as', 'at', 'by', 'from', 'your', 'you', 'we', 'our', 'my', 'i', 'would', 'how', 'what', 'which', 'when', 'where', 'why', 'do', 'does', 'can', 'could', 'should']);
const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
const content = (s: string): Set<string> => new Set(words(s).filter((w) => w.length >= 3 && !STOP.has(w)));
const coverage = (script: string, text: string): number => { const a = content(script), b = content(text); let hit = 0; for (const w of a) if (b.has(w)) hit++; return a.size ? hit / a.size : 1; };

interface Fixture { run: string; offsetMs: number; items: { id: string; level: string; kind: string; long?: boolean; q: string; playedAt: number; clipSecs: number; voice: [number, number][] }[]; finals: { at: number; text: string }[]; detections: { at: number; source: 'live' | 'whisper'; text: string; action: string }[] }
type Ev = { at: number; order: number; type: 'speech'; on: boolean } | { at: number; order: number; type: 'final'; text: string } | { at: number; order: number; type: 'detected'; source: 'live' | 'whisper'; text: string };

/** The [from, to) window score() attributes item k's own decisions to — spans to the NEXT roster
 * item overall (not the next *spoken* one: after9 interleaves 3 screenshot-kind items between
 * spoken ones, and a next-*spoken* boundary would skip past a screenshot's own playedAt). */
function windowOf(f: Fixture, k: number): [number, number] {
    const it = f.items[k];
    const from = it.playedAt - 2000;
    const to = (f.items[k + 1]?.playedAt ?? it.playedAt + it.clipSecs * 1000 + 90_000) - 2000;
    return [from, to];
}

/** Feeds the run's events through the tracker, models the app's dispatch tail with the real
 * ChipDeduper (R12) driven by the same clock as tick(), and returns every app-visible decision
 * plus how many dispatches the deduper dropped as duplicates. */
function replay(f: Fixture): { decisions: { at: number; d: TurnDecision }[]; drops: number } {
    const c = DEFAULT_TURN_CONSTANTS;
    const turn = createInterviewerTurn(c);
    const events: Ev[] = [];
    for (const it of f.items) for (const [on, off] of it.voice) { events.push({ at: on, order: 0, type: 'speech', on: true }); events.push({ at: off, order: 0, type: 'speech', on: false }); }
    for (const x of f.finals) events.push({ at: x.at, order: 1, type: 'final', text: x.text });
    // R12: every detector fire is fed at its recorded timestamp, unmodified, regardless of its
    // action — the dispatch tail below (the real ChipDeduper) is what decides whether the app
    // would actually have answered it.
    for (const x of f.detections) events.push({ at: x.at, order: 2, type: 'detected', source: x.source, text: x.text });
    events.sort((a, b) => a.at - b.at || a.order - b.order);
    const out: { at: number; d: TurnDecision }[] = [];
    let clock = events[0]?.at ?? 0;
    // R12: one deduper per replayed run, clocked off the same `clock` that drives tick() —
    // mirrors main.ts's dispatch tail (admit() at dispatch, markAnswered() when the answer
    // starts, extend() on a supersede).
    const dedup = new ChipDeduper({ now: () => clock });
    let answeredId: number | undefined;
    let drops = 0;
    const runTimers = (until: number) => {
        for (let guard = 0; guard < 200; guard++) {
            const t = turn.nextTimerAt(clock);
            if (t === null || t > until) return;
            clock = t;
            settle();
        }
    };
    const settle = () => {
        for (let g = 0; g < 8; g++) {
            const d = turn.tick(clock);
            if (d.kind === 'idle' || d.kind === 'hold') break;
            if (d.kind === 'dispatch') {
                // main.ts: this.chipDeduper.admit({ question: d.question, source: d.source, anchor: d.anchor })
                // — the machine has no anchor concept and DedupCandidate.anchor is optional, so it is omitted.
                const r = dedup.admit({ question: d.text, source: d.fromLive ? 'live' : 'whisper' });
                if (r.admitted) {
                    dedup.markAnswered(r.id);
                    answeredId = r.id;
                    out.push({ at: clock, d });
                } else {
                    answeredId = undefined; // the app would not have answered — not a double, not a supersede target
                    drops++;
                }
                continue;
            }
            if (d.kind === 'supersede') {
                dedup.extend(answeredId, d.text); // the answered entry now stands for the fuller sentence
                out.push({ at: clock, d });
                continue;
            }
            out.push({ at: clock, d });
        }
    };
    for (const e of events) {
        runTimers(e.at);
        clock = e.at;
        if (e.type === 'speech') turn.speech(e.on, e.at);
        else if (e.type === 'final') turn.final(e.text, e.at);
        else {
            // C2/R13: fed regardless of action, in the order main.ts uses — a Live claim first, then the detection.
            if (e.source === 'live') turn.liveClaim(e.text, e.at);
            turn.detected(e.source, e.at);
        }
        settle();
    }
    runTimers(clock + 60_000);
    return { decisions: out, drops };
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
        const { decisions, drops } = replay(f);
        const rows = score(f, decisions);
        // C5: what the deduper did, alongside the scored numbers — answered/doubles/early/long-whole/median/drops/supersedes.
        const onceCount = rows.filter((r) => r.dispatches === 1).length;
        const doubles = rows.filter((r) => r.dispatches > 1).length;
        const neverAnswered = rows.filter((r) => r.dispatches === 0).length;
        const earlyCount = rows.filter((r) => r.early).length;
        const supersedesTotal = rows.reduce((s, r) => s + r.supersedes, 0);
        const longRows = rows.filter((r) => r.long);
        const longWholeOk = longRows.filter((r) => r.coverage >= 0.8).length;
        const summaryLat = rows.map((r) => r.latency!).filter((x) => x !== null).sort((a, b) => a - b);
        const summaryMedian = summaryLat.length ? summaryLat[Math.floor(summaryLat.length / 2)] : null;
        console.log(`${name}: ${onceCount}/${rows.length} once, ${doubles} doubles, ${neverAnswered} never, ${supersedesTotal} supersedes, ${earlyCount} early, ${longWholeOk}/${longRows.length} long-whole, median ${summaryMedian} ms (n=${rows.length}), ${drops} drops`);
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
