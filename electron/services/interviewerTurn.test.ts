import { describe, it, expect } from 'vitest';
import { createInterviewerTurn, readsFinished, turnConstantsFromEnv, DEFAULT_TURN_CONSTANTS, type TurnDecision } from './interviewerTurn';

const T = 1_000_000;
const C = DEFAULT_TURN_CONSTANTS;

/** Runs the machine's own timers up to `until` and returns every non-idle/hold decision. */
function drain(turn: ReturnType<typeof createInterviewerTurn>, from: number, until: number): { at: number; d: TurnDecision }[] {
    const out: { at: number; d: TurnDecision }[] = [];
    let clock = from;
    for (let guard = 0; guard < 50; guard++) {
        let d = turn.tick(clock);
        while (d.kind !== 'idle' && d.kind !== 'hold') { out.push({ at: clock, d }); d = turn.tick(clock); }
        const next = turn.nextTimerAt(clock);
        if (next === null || next > until) break;
        clock = next;
    }
    return out;
}

describe('turnConstantsFromEnv', () => {
    it('defaults to the spec table and takes positive numeric overrides only', () => {
        expect(turnConstantsFromEnv({})).toEqual({ gateMs: 1200, settleMs: 400, unfinishedHoldMs: 2500, continuationMs: 8000, maxHoldMs: 6000 });
        expect(turnConstantsFromEnv({ NATIVELY_TURN_GATE_MS: '1500', NATIVELY_TURN_MAX_HOLD_MS: 'x' })).toMatchObject({ gateMs: 1500, maxHoldMs: 6000 });
    });
});

describe('readsFinished — the rules the s50a/after9 replay validated', () => {
    it.each([
        'Can you reconcile the metrics on your CV?',
        'When would you reach for a service mesh in an ML serving stack, and when would you not?',
        'Tell me about a time you disagreed with a product manager about a launch.',
        'And when would you not?',
        'Assuming the same population and observation period, use 100,000 to estimate true positives, precision, and recall. Are those figures consistent within rounding?',
    ])('finished: %s', (t) => expect(readsFinished(t)).toBe(true));
    it.each([
        "Let's do some code.",
        'Now a SQL one.',
        'Which of those stages can',
        'Your CV reports a 9.5% churn rate,',
        'Walk me through your approach and.',
        'Okay so',
        'Tell me about the trade-offs of',
    ])('unfinished: %s', (t) => expect(readsFinished(t)).toBe(false));
});

describe('interviewerTurn — one dispatch at the gate', () => {
    it('holds through the gate and dispatches the joined finals once the voice has been quiet for GATE_MS', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('Can you reconcile the metrics on your CV?', T + 2000);
        turn.detected('whisper', T + 2600);
        turn.speech(false, T + 3000);
        expect(turn.tick(T + 3000)).toEqual({ kind: 'hold', reason: 'gate' });
        expect(turn.tick(T + 4199)).toEqual({ kind: 'hold', reason: 'gate' });
        expect(turn.nextTimerAt(T + 3000)).toBe(T + 4200);
        const d = turn.tick(T + 4200);
        expect(d).toMatchObject({ kind: 'dispatch', text: 'Can you reconcile the metrics on your CV?', finished: true, gateMs: 1200, finals: 1, live: [], fromLive: false });
        expect(turn.tick(T + 4200)).toEqual({ kind: 'idle' });
    });

    it('joins every final of the turn and carries the Live texts as ears', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('Your CV reports a 9.5% churn rate,', T + 5000);
        turn.liveClaim('Your CV reports a nine point five percent churn rate, a top five percent risk band.', T + 5200);
        turn.detected('live', T + 5200);
        turn.final('a top 5% risk band capturing 30% of churners, and 60% precision.', T + 9000);
        turn.speech(false, T + 9500);
        const d = turn.tick(T + 10700);
        expect(d).toMatchObject({ kind: 'dispatch', text: 'Your CV reports a 9.5% churn rate, a top 5% risk band capturing 30% of churners, and 60% precision.', finals: 2 });
        expect((d as any).live).toEqual(['Your CV reports a nine point five percent churn rate, a top five percent risk band.']);
    });

    it('waits SETTLE_MS after a final that lands late in the gate', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.detected('live', T + 500);
        turn.speech(false, T + 1000);
        turn.final('What is the difference between a process and a thread?', T + 2100);
        expect(turn.tick(T + 2200)).toEqual({ kind: 'hold', reason: 'settle' });
        expect(turn.nextTimerAt(T + 2200)).toBe(T + 2500);
        expect(turn.tick(T + 2500).kind).toBe('dispatch');
    });

    it('never dispatches while the voice is active, however old the finals are', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('What is a DAG?', T + 1000);
        turn.detected('whisper', T + 1200);
        expect(turn.tick(T + 4000)).toEqual({ kind: 'hold', reason: 'speaking' });
        expect(turn.nextTimerAt(T + 4000)).toBe(T + 1200 + C.maxHoldMs);
    });
});

describe('interviewerTurn — unfinished text, classification, fail-safe', () => {
    it('holds a lead-in for UNFINISHED_HOLD_MS more, then dispatches whatever it has', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final("Let's do some code.", T + 1000);
        turn.detected('whisper', T + 1300);
        turn.speech(false, T + 1500);
        expect(turn.tick(T + 2700)).toEqual({ kind: 'hold', reason: 'unfinished' });
        expect(turn.nextTimerAt(T + 2700)).toBe(T + 1500 + C.gateMs + C.unfinishedHoldMs);
        expect(turn.tick(T + 5200)).toMatchObject({ kind: 'dispatch', finished: false, text: "Let's do some code." });
    });

    it('a tail final arriving during the unfinished hold completes the text and dispatches at the gate', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('Which of those stages can', T + 1000);
        turn.detected('whisper', T + 1200);
        turn.speech(false, T + 1500);
        expect(turn.tick(T + 2700)).toEqual({ kind: 'hold', reason: 'unfinished' });
        turn.speech(true, T + 2800);
        turn.final('cause a correct source document to produce an incorrect answer?', T + 4300);
        turn.speech(false, T + 4000);
        expect(turn.tick(T + 5200)).toMatchObject({ kind: 'dispatch', finished: true, text: 'Which of those stages can cause a correct source document to produce an incorrect answer?' });
    });

    it('asks for a classification once at the gate when no detector has fired, and dispatches when the answer is a question', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('How would you shard a Postgres table by tenant?', T + 1000);
        turn.speech(false, T + 1500);
        expect(turn.tick(T + 2000)).toEqual({ kind: 'hold', reason: 'undetected' });
        expect(turn.tick(T + 2700)).toEqual({ kind: 'classify', text: 'How would you shard a Postgres table by tenant?', finals: 1 });
        expect(turn.tick(T + 2700)).toEqual({ kind: 'hold', reason: 'undetected' });
        turn.detected('whisper', T + 3200, 'question');
        expect(turn.tick(T + 3200).kind).toBe('dispatch');
    });

    it('closes the turn when the classification says it was not a question', () => {
        const turn = createInterviewerTurn();
        turn.final('Great, thanks for walking me through that.', T);
        expect(turn.tick(T + 1200)).toMatchObject({ kind: 'classify' });
        turn.detected('whisper', T + 1700, 'not-a-question');
        expect(turn.tick(T + 1700)).toEqual({ kind: 'close', reason: 'not-a-question' });
        expect(turn.tick(T + 1700)).toEqual({ kind: 'idle' });
        expect(turn.nextTimerAt(T + 1700)).toBeNull();
    });

    it('fail-safe: a detected question never waits on a VAD that never goes quiet for more than MAX_HOLD_MS', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('What is the CAP theorem?', T + 800);
        turn.detected('whisper', T + 1000);
        expect(turn.tick(T + 6999)).toEqual({ kind: 'hold', reason: 'speaking' });
        expect(turn.tick(T + 7000)).toMatchObject({ kind: 'dispatch', text: 'What is the CAP theorem?' });
    });

    it('fail-safe restarts on every transcript final: a long question with the VAD never quiet dispatches 6 s after the LAST final, not after the first detection', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('Tell me about a time', T + 3000);
        turn.detected('whisper', T + 3100);
        turn.final('you had to choose between two designs', T + 6000);
        turn.final('and how you decided?', T + 9000);
        expect(turn.tick(T + 9100)).toEqual({ kind: 'hold', reason: 'speaking' });
        expect(turn.nextTimerAt(T + 9500)).toBe(T + 15000);
        expect(turn.tick(T + 14999)).toEqual({ kind: 'hold', reason: 'speaking' });
        const d = turn.tick(T + 15000);
        expect(d).toMatchObject({ kind: 'dispatch', finals: 3, text: 'Tell me about a time you had to choose between two designs and how you decided?', fromLive: false });
    });

    it('without a VAD, the finals themselves clock the gate', () => {
        const turn = createInterviewerTurn();
        turn.final('What is the CAP theorem?', T);
        turn.detected('whisper', T + 300);
        expect(turn.tick(T + 1199)).toEqual({ kind: 'hold', reason: 'gate' });
        expect(turn.tick(T + 1200).kind).toBe('dispatch');
    });

    it('a Live-only turn (the transcript lost the utterance) answers the Live text on the unfinished hold', () => {
        const turn = createInterviewerTurn();
        turn.liveClaim('What is the CAP theorem?', T);
        turn.detected('live', T);
        expect(turn.tick(T + 1200)).toEqual({ kind: 'hold', reason: 'unfinished' });
        expect(turn.tick(T + 3700)).toMatchObject({ kind: 'dispatch', text: 'What is the CAP theorem?', fromLive: true, finals: 0 });
    });

    it('closes a turn that has a detection but never any text after MAX_HOLD_MS', () => {
        const turn = createInterviewerTurn();
        turn.detected('live', T);
        expect(turn.tick(T + 5999)).toEqual({ kind: 'hold', reason: 'undetected' });
        expect(turn.tick(T + 6000)).toEqual({ kind: 'close', reason: 'nothing-heard' });
    });
});

describe('interviewerTurn — continuation, supersede, close', () => {
    function dispatched(): ReturnType<typeof createInterviewerTurn> {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('When would you reach for a service mesh in an ML serving stack?', T + 3000);
        turn.detected('whisper', T + 3400);
        turn.speech(false, T + 3200);
        expect(turn.tick(T + 4400).kind).toBe('dispatch');
        return turn;
    }

    it('speech resuming within CONTINUATION_MS supersedes in place with the joined text once quiet again', () => {
        const turn = dispatched();
        turn.speech(true, T + 5000);
        turn.final('And when would you not?', T + 7000);
        turn.speech(false, T + 6500);
        expect(turn.tick(T + 7200)).toEqual({ kind: 'hold', reason: 'gate' });
        const d = turn.tick(T + 7700);
        expect(d).toMatchObject({ kind: 'supersede', text: 'When would you reach for a service mesh in an ML serving stack? And when would you not?', replaces: 'When would you reach for a service mesh in an ML serving stack?', finals: 2 });
        expect(turn.tick(T + 7700)).toEqual({ kind: 'idle' });
    });

    it('closes after CONTINUATION_MS of silence following the dispatch', () => {
        const turn = dispatched();
        expect(turn.tick(T + 11399)).toEqual({ kind: 'idle' });
        expect(turn.nextTimerAt(T + 4400)).toBe(T + 4400 + C.continuationMs);
        expect(turn.tick(T + 12400)).toEqual({ kind: 'close', reason: 'continuation-expired' });
        expect(turn.nextTimerAt(T + 12400)).toBeNull();
    });

    it('a final arriving CONTINUATION_MS after the dispatch is a new turn, not a supersede', () => {
        const turn = dispatched();
        turn.final('What is a DAG?', T + 4400 + C.continuationMs + 100);
        turn.detected('whisper', T + 4400 + C.continuationMs + 300);
        const out = drain(turn, T + 4400 + C.continuationMs + 300, T + 20000);
        expect(out.map((o) => o.d.kind)).toEqual(['dispatch']);
        expect((out[0].d as any).text).toBe('What is a DAG?');
    });

    it('a Live claim arriving CONTINUATION_MS after both the dispatch and the last final starts a new turn that keeps the claim (stuck VAD)', () => {
        const turn = createInterviewerTurn();
        turn.speech(true, T);
        turn.final('What is a pod?', T + 500);
        turn.detected('whisper', T + 600);
        turn.speech(false, T + 700);
        expect(turn.tick(T + 1900).kind).toBe('dispatch'); // gate 1200 ms after the voice stopped; the text reads finished
        turn.speech(true, T + 2000); // the VAD sticks on — no more finals, so the continuation close cannot fire
        turn.liveClaim('How does a deployment differ from a pod?', T + 25000);
        turn.detected('live', T + 25000);
        expect(turn.snapshot()).toMatchObject({ open: true, live: 1, dispatched: false });
        // the new turn has seen no VAD, so its lastSpeechAt is the claim time
        const d = turn.tick(T + 28700);
        expect(d).toMatchObject({ kind: 'dispatch', fromLive: true, text: 'How does a deployment differ from a pod?', finals: 0 });
    });

    it('the candidate speaking closes the turn, before or after a dispatch', () => {
        const turn = dispatched();
        turn.candidateSpoke(T + 6000);
        expect(turn.tick(T + 6000)).toEqual({ kind: 'close', reason: 'candidate' });
        const fresh = createInterviewerTurn();
        fresh.final('Tell me about yourself.', T);
        fresh.candidateSpoke(T + 500);
        expect(fresh.tick(T + 500)).toEqual({ kind: 'close', reason: 'candidate' });
        expect(fresh.snapshot().open).toBe(false);
    });

    it('reset drops the open turn', () => {
        const turn = dispatched();
        turn.reset();
        expect(turn.tick(T + 5000)).toEqual({ kind: 'idle' });
        expect(turn.snapshot()).toMatchObject({ open: false });
    });
});
