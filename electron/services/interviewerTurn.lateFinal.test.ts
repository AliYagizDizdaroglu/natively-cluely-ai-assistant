import { describe, it, expect } from 'vitest';
import { createInterviewerTurn, type TurnDecision } from './interviewerTurn';

/**
 * D2 (spec bundle-1/fixes/D2-SPEC.md rev 2): a Deepgram final that was already showing as an
 * interim before an ANSWERED turn closed belongs to that turn's speech and is absorbed, not
 * joined to the next turn. Synthetic stand-ins with the b1-final word counts (6 / 3 / 12);
 * T0 = the dispatch of the answered turn (RH02's Live dispatch in the run).
 */

const T0 = 1_000_000;
const s = (sec: number): number => T0 + Math.round(sec * 1000);
type Machine = ReturnType<typeof createInterviewerTurn>;

const LIVE_6W = 'Why did you choose that approach?';          // 6 words, reads finished
const LATE_3W = 'And your reason?';                           // 3 words
const NEXT_12W = 'Could you walk me through how you would shard that service again?'; // 12 words
const wc = (t: string): number => t.trim().split(/\s+/).length;

/** Runs the machine's timers up to `until` (same shape as interviewerTurn.test.ts) and returns the non-idle/hold decisions. */
function drain(m: Machine, from: number, until: number): { at: number; d: TurnDecision }[] {
    const out: { at: number; d: TurnDecision }[] = [];
    let clock = from;
    for (let guard = 0; guard < 60; guard++) {
        let d = m.tick(clock);
        while (d.kind !== 'idle' && d.kind !== 'hold') { out.push({ at: clock, d }); d = m.tick(clock); }
        const next = m.nextTimerAt(clock);
        if (next === null || next > until) break;
        clock = next;
    }
    return out;
}

/** RH02 as in b1-final: voice, a Live claim, a Live-only dispatch at T0; then (optionally) answered. Returns the turn id. */
function dispatched(m: Machine, opts: { answer: boolean }): number {
    m.speech(true, s(-4.2));
    m.speech(false, s(-3.7));
    m.liveClaim(LIVE_6W, s(-0.5));
    m.detected('live', s(-0.5));
    const first = m.tick(s(0));
    expect(first.kind).toBe('dispatch');
    const id = m.snapshot().id!;
    if (opts.answer) m.answered(id, s(0));
    return id;
}

/** ...and closed by continuation-expired at T0 + 8 s. */
function closedAfterDispatch(m: Machine, opts: { answer: boolean }): number {
    const id = dispatched(m, opts);
    expect(m.tick(s(8.0))).toEqual({ kind: 'close', reason: 'continuation-expired' });
    return id;
}

const dispatches = (ds: { at: number; d: TurnDecision }[]) => ds.filter((x) => x.d.kind === 'dispatch').map((x) => x.d as Extract<TurnDecision, { kind: 'dispatch' }>);

describe('D2 R1: the b1-final sequence, with D1 (RH02 answered)', () => {
    it('the late 3-word final is absorbed; the next turn dispatches only its own 12 words, once', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: true });
        m.speech(true, s(17.4));                                               // RE15 starts
        m.final(LATE_3W, s(18.4), { onsetAt: s(1.5), textSinceAt: s(1.5) });   // the stalled interim finally finalizes
        // (19.1: the whisper chip on the late text is dropped by main's helper, so no detected() here)
        m.final(NEXT_12W, s(20.7), { onsetAt: s(19.5), textSinceAt: s(19.5) });
        m.detected('whisper', s(21.1));
        m.speech(false, s(21.2));
        const ds = dispatches(drain(m, s(21.2), s(40)));
        expect(ds).toHaveLength(1);
        expect(wc(ds[0].text)).toBe(12);
        expect(ds[0].text).toBe(NEXT_12W);
        expect(ds[0].finals).toBe(1);
    });
});

describe('D2 guards', () => {
    it('G1: provenance is the only thing that absorbs; an onset after the close joins (15 words)', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: true });
        m.speech(true, s(17.4));
        m.final(LATE_3W, s(18.4), { onsetAt: s(17.5), textSinceAt: s(17.5) });
        m.final(NEXT_12W, s(20.7), { onsetAt: s(19.5), textSinceAt: s(19.5) });
        m.detected('whisper', s(21.1));
        m.speech(false, s(21.2));
        const ds = dispatches(drain(m, s(21.2), s(40)));
        expect(ds).toHaveLength(1);
        expect(wc(ds[0].text)).toBe(15);
        expect(ds[0].finals).toBe(2);
    });

    it('G2: a real repeat of the answered question (word-identical, onset after the close) joins and dispatches; no text matching', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: true });
        m.speech(true, s(17.4));
        m.final(LIVE_6W, s(18.4), { onsetAt: s(17.6), textSinceAt: s(17.6) });
        m.detected('whisper', s(18.6));
        m.speech(false, s(18.7));
        const ds = dispatches(drain(m, s(18.7), s(40)));
        expect(ds).toHaveLength(1);
        expect(ds[0].text).toBe(LIVE_6W);
    });

    it.each(['not-a-question', 'nothing-heard'] as const)('G3: a predecessor closed %s (never dispatched) never absorbs; the early-onset final joins', (reason) => {
        const m = createInterviewerTurn();
        if (reason === 'not-a-question') {
            m.speech(true, s(-4));
            m.final('Okay so that was my last thought on it.', s(-3.5));
            m.speech(false, s(-3.4));
            m.detected('whisper', s(-3.0), 'not-a-question');
            expect(m.tick(s(-3.0))).toEqual({ kind: 'close', reason: 'not-a-question' });
        } else {
            m.speech(true, s(-9));
            m.detected('whisper', s(-9));
            m.speech(false, s(-8.9));
            expect(m.tick(s(0))).toEqual({ kind: 'close', reason: 'nothing-heard' });
        }
        m.final(LATE_3W, s(1), { onsetAt: s(-5), textSinceAt: s(-5) });
        expect(m.snapshot()).toMatchObject({ open: true, finals: 1 });
    });

    it('G4: no provenance (no interim, or an STT without it) joins', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: true });
        m.final(LATE_3W, s(18.4));
        expect(m.snapshot()).toMatchObject({ open: true, finals: 1 });
        const m2 = createInterviewerTurn();
        closedAfterDispatch(m2, { answer: true });
        m2.final(LATE_3W, s(18.4), {});
        expect(m2.snapshot()).toMatchObject({ open: true, finals: 1 });
    });

    it('G5: onset == closedAt joins; closedAt - 1 ms is absorbed', () => {
        const at = createInterviewerTurn();
        closedAfterDispatch(at, { answer: true });
        // textSinceAt is below the onset here (impossible from the real client, where it is >= onset): it isolates the onset clause, which textSinceAt < closedAt otherwise implies
        at.final(LATE_3W, s(18.4), { onsetAt: s(8.0), textSinceAt: s(8.0) - 1 });
        expect(at.snapshot()).toMatchObject({ open: true, finals: 1 });
        const before = createInterviewerTurn();
        closedAfterDispatch(before, { answer: true });
        before.final(LATE_3W, s(18.4), { onsetAt: s(8.0) - 1, textSinceAt: s(8.0) - 1 });
        expect(before.snapshot().open).toBe(false);
    });

    it('G6: a reopenIfStale replacement (no tick ever closed the turn) records lastClosed too; a voice-on after the expiry does not count (N1)', () => {
        const m = createInterviewerTurn();
        dispatched(m, { answer: true });
        m.speech(true, s(17.4));                                               // after the turn went stale at 8.0
        m.final(LATE_3W, s(18.4), { onsetAt: s(1.5), textSinceAt: s(1.5) });
        expect(m.snapshot()).toMatchObject({ open: false, finals: 0 });
    });

    it('G7: an absorbed final opens nothing and nothing dispatches or classifies (a statement turn, no question of its own)', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: true });
        m.final('That is a great point, thank you.', s(18.4), { onsetAt: s(1.5), textSinceAt: s(1.5) });
        expect(drain(m, s(18.4), s(60))).toEqual([]);
        expect(m.snapshot().open).toBe(false);
    });

    it('G8: a follow-up barge-in behind a stalled interim (voice-on after the dispatch) is never eaten; it dispatches as its own turn', () => {
        const m = createInterviewerTurn();
        dispatched(m, { answer: true });
        m.speech(true, s(5));
        m.speech(false, s(6.5));                                               // the interim's onset is s(6)
        const closes = drain(m, s(6.5), s(12));
        expect(closes.map((x) => x.d)).toEqual([{ kind: 'close', reason: 'continuation-expired' }]);
        expect(closes[0].at).toBe(s(9.5));
        m.final(NEXT_12W, s(10), { onsetAt: s(6), textSinceAt: s(6) });        // onset < close, the turn was answered
        m.detected('whisper', s(10.3));
        const ds = dispatches(drain(m, s(10.3), s(30)));
        expect(ds).toHaveLength(1);
        expect(ds[0].text).toBe(NEXT_12W);
    });

    it('G8b: Deepgram speech-started counts as voice too (voiceHeard)', () => {
        const m = createInterviewerTurn();
        dispatched(m, { answer: true });
        m.voiceHeard(s(5));
        expect(m.tick(s(8.0))).toEqual({ kind: 'close', reason: 'continuation-expired' });
        m.final(LATE_3W, s(10), { onsetAt: s(6), textSinceAt: s(6) });
        expect(m.snapshot()).toMatchObject({ open: true, finals: 1 });
    });

    it('G9: a dispatched turn nobody answered (dropped, or held and never answered) does not absorb; the question is not lost', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: false });
        m.final(NEXT_12W, s(18.4), { onsetAt: s(1.5), textSinceAt: s(1.5) });
        m.detected('whisper', s(18.6));
        m.speech(false, s(18.7));
        const ds = dispatches(drain(m, s(18.7), s(40)));
        expect(ds).toHaveLength(1);
        expect(ds[0].text).toBe(NEXT_12W);
    });

    it('G9b: a held answer that lands AFTER the close (id-matched) counts; a foreign id is ignored', () => {
        const m = createInterviewerTurn();
        const id = closedAfterDispatch(m, { answer: false });
        m.answered(id + 99, s(9));                                             // not the closed turn
        m.answered(id, s(12));                                                 // the held dispatch finally answered
        m.final(LATE_3W, s(18.4), { onsetAt: s(1.5), textSinceAt: s(1.5) });
        expect(m.snapshot().open).toBe(false);
        const m2 = createInterviewerTurn();
        const id2 = closedAfterDispatch(m2, { answer: false });
        m2.answered(id2 + 99, s(12));
        m2.final(LATE_3W, s(18.4), { onsetAt: s(1.5), textSinceAt: s(1.5) });
        expect(m2.snapshot()).toMatchObject({ open: true, finals: 1 });
    });

    it('G10: the final text changed after the close (new speech merged into the stalled interim) joins', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: true });
        m.final(LATE_3W, s(18.4), { onsetAt: s(1.5), textSinceAt: s(17.9) });
        expect(m.snapshot()).toMatchObject({ open: true, finals: 1 });
    });

    it('reset() forgets the closed turn', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: true });
        m.reset();
        m.final(LATE_3W, s(18.4), { onsetAt: s(1.5), textSinceAt: s(1.5) });
        expect(m.snapshot()).toMatchObject({ open: true, finals: 1 });
    });

    it('final() reports what it did', () => {
        const m = createInterviewerTurn();
        closedAfterDispatch(m, { answer: true });
        expect(m.final(LATE_3W, s(18.4), { onsetAt: s(1.5), textSinceAt: s(1.5) })).toBe('absorbed');
        expect(m.final(NEXT_12W, s(20.7), { onsetAt: s(19.5), textSinceAt: s(19.5) })).toBe('joined');
    });
});
