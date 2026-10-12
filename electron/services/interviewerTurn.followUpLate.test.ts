import { describe, it, expect } from 'vitest';
import { createInterviewerTurn, type TurnDecision } from './interviewerTurn';

/**
 * F2a guard (st25-smoke 2026-10-12, SF02): once the Live ear's short follow-up is kept and ANSWERED
 * ("Why that one?", Live-only), Deepgram's late final of the same words must not answer it a second time.
 * D2 absorbs it: the answered turn is the one it belongs to. Times are seconds from the voice stop.
 */
const T0 = 2_000_000;
const s = (sec: number): number => T0 + Math.round(sec * 1000);

function drain(m: ReturnType<typeof createInterviewerTurn>, from: number, until: number): TurnDecision[] {
    const out: TurnDecision[] = [];
    let clock = from;
    for (let guard = 0; guard < 60; guard++) {
        let d = m.tick(clock);
        while (d.kind !== 'idle' && d.kind !== 'hold') { out.push(d); d = m.tick(clock); }
        const next = m.nextTimerAt(clock);
        if (next === null || next > until) break;
        clock = next;
    }
    return out;
}

/** Voice 0..1.6 s, the ear's claim at 4.2 s (SF02: 3.8 s after the voice stop), Live-only dispatch on the unfinished hold. */
function answeredLiveOnly(m: ReturnType<typeof createInterviewerTurn>): number {
    m.speech(true, s(0));
    m.speech(false, s(1.6));
    m.liveClaim('Why that one?', s(4.2));
    m.detected('live', s(4.2));
    const ds = drain(m, s(4.2), s(10)).filter((d) => d.kind === 'dispatch');
    expect(ds).toHaveLength(1);
    const id = m.snapshot().id!;
    m.answered(id, s(5));
    return id;
}

describe('a kept Live follow-up and the late Deepgram final of the same words', () => {
    it('is absorbed by D2: no second dispatch', () => {
        const m = createInterviewerTurn();
        answeredLiveOnly(m);
        // the turn closes by continuation-expired 8 s after the dispatch; Deepgram's interim of the same words
        // had shown at 6.3 s (before the close), and its final lands later
        expect(drain(m, s(10), s(20)).map((d) => d.kind === 'close' ? d.reason : d.kind)).toContain('continuation-expired');
        const r = m.final('Why that one?', s(24), { onsetAt: s(6.3), textSinceAt: s(6.3) });
        expect(r).toBe('absorbed');
        expect(drain(m, s(24), s(40)).filter((d) => d.kind === 'dispatch')).toHaveLength(0);
    });

    it('SF03 order: Deepgram answered first, the kept Live claim of the same words 1.4 s later marks the open turn and dispatches nothing more', () => {
        const m = createInterviewerTurn();
        m.speech(true, s(0));
        m.final('And what would you do differently?', s(1.9), { onsetAt: s(1.0), textSinceAt: s(1.0) });
        m.speech(false, s(2.0));
        m.detected('whisper', s(2.1));
        const first = drain(m, s(2.1), s(6)).filter((d) => d.kind === 'dispatch');
        expect(first).toHaveLength(1);
        m.answered(m.snapshot().id!, s(3.3));
        m.liveClaim('And what would you do differently?', s(4.7));   // the ear's report, 1.4 s after the answer
        m.detected('live', s(4.7));
        expect(drain(m, s(4.7), s(14)).filter((d) => d.kind === 'dispatch' || d.kind === 'supersede')).toHaveLength(0);
    });

    it('calibration: with no provenance the same late final JOINS (so the absorption above is the guard, not an accident)', () => {
        const m = createInterviewerTurn();
        answeredLiveOnly(m);
        drain(m, s(10), s(20));
        expect(m.final('Why that one?', s(24))).toBe('joined');
    });
});
