import { describe, it, expect, vi } from 'vitest';
import { applyAnswerToken, applyFinalAnswer, applyLiveQuestion, usesKeyedPath, usesKeyedSource, type AnswerMessage, type BubbleMeta } from './answerMessages';

/**
 * A superseding continuation of the same interviewer turn regenerates the
 * answer from the whole turn and must replace what's already on screen
 * (question bubble and answer bubble alike) instead of appending a second
 * one. These pure helpers carry that `replace` semantics; NativelyInterface
 * just wires them to the three IPC handlers.
 */

function makeNewId(prefix = 'id'): () => string {
    let n = 0;
    return () => `${prefix}-${n++}`;
}

describe('applyAnswerToken', () => {
    it('appends a new streaming message when nothing is streaming', () => {
        const question: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 tell me about yourself' };
        const prev: AnswerMessage[] = [question];

        const result = applyAnswerToken(prev, 'I ', false, makeNewId());

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(question);
        expect(result[1]).toMatchObject({ id: 'id-0', role: 'system', text: 'I ', intent: 'what_to_answer', isStreaming: true });
    });

    it('without replace, an existing non-streaming what_to_answer message is left alone and a fresh one is appended', () => {
        const oldAnswer: AnswerMessage = { id: 'a1', role: 'system', text: 'Old answer.', intent: 'what_to_answer', isStreaming: false };
        const prev: AnswerMessage[] = [oldAnswer];

        const result = applyAnswerToken(prev, 'New ', false, makeNewId());

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(oldAnswer);
        expect(result[1]).toMatchObject({ id: 'id-0', role: 'system', text: 'New ', intent: 'what_to_answer', isStreaming: true });
    });

    it('appends the token onto the currently-streaming message', () => {
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'I ', intent: 'what_to_answer', isStreaming: true };
        const prev: AnswerMessage[] = [streaming];

        const result = applyAnswerToken(prev, 'have ', false, makeNewId());

        expect(result).toHaveLength(1);
        expect(result[0]).not.toBe(streaming);
        expect(result[0]).toEqual({ ...streaming, text: 'I have ' });
    });

    // R30 (final review I2): the head's generation is aborted synchronously before the
    // supersede's first token can arrive, so a message still marked isStreaming here is
    // never actually being concurrently written to — there is no live stream to tear
    // down, and the flag means "restart", not "append".
    it('a supersede\'s first token restarts an answer that is still streaming', () => {
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'I have partial', intent: 'what_to_answer', isStreaming: true };
        const prev: AnswerMessage[] = [streaming];

        const result = applyAnswerToken(prev, 'New', true, makeNewId());

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 'a1', text: 'New', isStreaming: true });
    });

    it('the rest of a replacing stream appends, same as any other stream', () => {
        const restarted: AnswerMessage = { id: 'a1', role: 'system', text: 'New', intent: 'what_to_answer', isStreaming: true };
        const prev: AnswerMessage[] = [restarted];

        const result = applyAnswerToken(prev, ' answer', false, makeNewId());

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 'a1', text: 'New answer', isStreaming: true });
    });

    it('replace restarts the last what_to_answer message in place, leaving other messages untouched', () => {
        const question: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 what is your greatest weakness' };
        const finishedAnswer: AnswerMessage = {
            id: 'a1', role: 'system', text: 'Old answer.', intent: 'what_to_answer', isStreaming: false, metrics: { totalMs: 900 },
        };
        const prev: AnswerMessage[] = [question, finishedAnswer];

        const result = applyAnswerToken(prev, 'New ', true, makeNewId());

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(question);
        expect(result[1]).toMatchObject({ id: 'a1', role: 'system', text: 'New ', intent: 'what_to_answer', isStreaming: true });
        expect(result[1].metrics).toBeUndefined();
    });

    it('replace with no earlier answer appends a new message', () => {
        const question: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 walk me through your resume' };
        const prev: AnswerMessage[] = [question];

        const result = applyAnswerToken(prev, 'Sure, ', true, makeNewId());

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(question);
        expect(result[1]).toMatchObject({ id: 'id-0', role: 'system', text: 'Sure, ', intent: 'what_to_answer', isStreaming: true });
    });

    // R23: a restart is a NEW answer under the same id — it must not inherit
    // the coaching card or stream metrics of the finished answer it replaces.
    it('a replace restart over a finished coaching answer carries no coaching fields or metrics', () => {
        const question: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 tell me about a time you led' };
        const coachingAnswer: AnswerMessage = {
            id: 'a1',
            role: 'system',
            intent: 'what_to_answer',
            text: '',
            isStreaming: false,
            isNegotiationCoaching: true,
            negotiationCoachingData: { any: 'thing' },
            metrics: { ttftMs: 1 },
        };
        const prev: AnswerMessage[] = [question, coachingAnswer];

        const result = applyAnswerToken(prev, 'First', true, makeNewId());

        expect(result[0]).toBe(question);
        expect(result[1]).toEqual({ id: 'a1', role: 'system', intent: 'what_to_answer', text: 'First', isStreaming: true });
    });
});

describe('applyFinalAnswer', () => {
    it('finalizes the currently-streaming message in place', () => {
        const other: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 question' };
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'Partial', intent: 'what_to_answer', isStreaming: true };
        const prev: AnswerMessage[] = [other, streaming];
        const finalize = vi.fn((msg: AnswerMessage | null) => ({ ...msg!, text: 'Final answer.', isStreaming: false }));

        const result = applyFinalAnswer(prev, false, finalize);

        expect(finalize).toHaveBeenCalledWith(streaming);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(other);
        expect(result[1]).toEqual({ id: 'a1', role: 'system', text: 'Final answer.', intent: 'what_to_answer', isStreaming: false });
    });

    it('replace finalizes the last what_to_answer message in place even when it is not the last message, leaving surrounding messages untouched', () => {
        const question: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 old question' };
        const answer: AnswerMessage = { id: 'a1', role: 'system', text: 'Old answer.', intent: 'what_to_answer', isStreaming: false };
        const followUp: AnswerMessage = { id: 'q2', role: 'user', text: '🎙 old question, continued' };
        const prev: AnswerMessage[] = [question, answer, followUp];
        const finalize = vi.fn((msg: AnswerMessage | null) => ({ ...msg!, text: 'New answer.', isStreaming: false }));

        const result = applyFinalAnswer(prev, true, finalize);

        expect(finalize).toHaveBeenCalledWith(answer);
        expect(result).toHaveLength(3);
        expect(result[0]).toBe(question);
        expect(result[1]).toEqual({ id: 'a1', role: 'system', text: 'New answer.', intent: 'what_to_answer', isStreaming: false });
        expect(result[2]).toBe(followUp);
    });

    it('replace with no what_to_answer message appends a fresh one via finalize(null)', () => {
        const question: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 question' };
        const prev: AnswerMessage[] = [question];
        const finalize = vi.fn((_msg: AnswerMessage | null) => ({ id: 'a1', role: 'system', text: 'Answer.', intent: 'what_to_answer' }));

        const result = applyFinalAnswer(prev, true, finalize);

        expect(finalize).toHaveBeenCalledWith(null);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(question);
        expect(result[1]).toEqual({ id: 'a1', role: 'system', text: 'Answer.', intent: 'what_to_answer' });
    });

    it('without replace, an existing non-streaming what_to_answer message is left alone and a fresh one is appended', () => {
        const answer: AnswerMessage = { id: 'a1', role: 'system', text: 'Old answer.', intent: 'what_to_answer', isStreaming: false };
        const prev: AnswerMessage[] = [answer];
        const finalize = vi.fn((_msg: AnswerMessage | null) => ({ id: 'a2', role: 'system', text: 'New answer.', intent: 'what_to_answer' }));

        const result = applyFinalAnswer(prev, false, finalize);

        expect(finalize).toHaveBeenCalledWith(null);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(answer);
        expect(result[1]).toEqual({ id: 'a2', role: 'system', text: 'New answer.', intent: 'what_to_answer' });
    });
});

describe('applyLiveQuestion', () => {
    it('replace with no earlier 🎙 bubble appends a new one', () => {
        const answer: AnswerMessage = { id: 'a1', role: 'system', text: 'hello', intent: 'what_to_answer' };
        const prev: AnswerMessage[] = [answer];

        const result = applyLiveQuestion(prev, 'What is your greatest strength?', true, makeNewId());

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(answer);
        expect(result[1]).toEqual({ id: 'id-0', role: 'user', text: '🎙 What is your greatest strength?' });
    });

    it('replace rewrites the existing 🎙 bubble text in place', () => {
        const question: AnswerMessage = { id: 'live-1', role: 'user', text: '🎙 What is your greatest' };
        const prev: AnswerMessage[] = [question];

        const result = applyLiveQuestion(prev, 'What is your greatest strength?', true, makeNewId());

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ id: 'live-1', role: 'user', text: '🎙 What is your greatest strength?' });
    });

    it('replace rewrites only the last 🎙 bubble, leaving an earlier one untouched', () => {
        const firstQuestion: AnswerMessage = { id: 'live-1', role: 'user', text: '🎙 Tell me about a challenge' };
        const answer: AnswerMessage = { id: 'a1', role: 'system', text: 'Sure...', intent: 'what_to_answer' };
        const secondQuestion: AnswerMessage = { id: 'live-2', role: 'user', text: '🎙 What is your' };
        const prev: AnswerMessage[] = [firstQuestion, answer, secondQuestion];

        const result = applyLiveQuestion(prev, 'What is your greatest weakness?', true, makeNewId());

        expect(result).toHaveLength(3);
        expect(result[0]).toBe(firstQuestion);
        expect(result[1]).toBe(answer);
        expect(result[2]).toEqual({ id: 'live-2', role: 'user', text: '🎙 What is your greatest weakness?' });
    });

    it('replace does not mistake a plain user message for a 🎙 bubble', () => {
        const plainUser: AnswerMessage = { id: 'u1', role: 'user', text: 'my own typed note' };
        const prev: AnswerMessage[] = [plainUser];

        const result = applyLiveQuestion(prev, 'a live question', true, makeNewId());

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(plainUser);
        expect(result[1]).toEqual({ id: 'id-0', role: 'user', text: '🎙 a live question' });
    });

    it('without replace, a new 🎙 bubble is appended even if one already exists', () => {
        const question: AnswerMessage = { id: 'live-1', role: 'user', text: '🎙 first question' };
        const prev: AnswerMessage[] = [question];

        const result = applyLiveQuestion(prev, 'second question', false, makeNewId());

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(question);
        expect(result[1]).toEqual({ id: 'id-0', role: 'user', text: '🎙 second question' });
    });
});

describe('replace targets the LAST what_to_answer message, not an earlier one', () => {
    it('applyAnswerToken restarts the last answer and leaves an earlier one untouched', () => {
        const answerA: AnswerMessage = { id: 'a1', role: 'system', intent: 'what_to_answer', text: 'Answer A.', isStreaming: false };
        const question: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 second question' };
        const answerB: AnswerMessage = { id: 'a2', role: 'system', intent: 'what_to_answer', text: 'Answer B.', isStreaming: false };
        const prev: AnswerMessage[] = [answerA, question, answerB];

        const result = applyAnswerToken(prev, 'x', true, makeNewId());

        expect(result).toHaveLength(3);
        expect(result[0]).toBe(answerA);
        expect(result[1]).toBe(question);
        expect(result[2]).toMatchObject({ id: 'a2', text: 'x', isStreaming: true });
    });

    it('applyFinalAnswer replaces the last answer and leaves an earlier one untouched', () => {
        const answerA: AnswerMessage = { id: 'a1', role: 'system', intent: 'what_to_answer', text: 'Answer A.', isStreaming: false };
        const question: AnswerMessage = { id: 'q1', role: 'user', text: '🎙 second question' };
        const answerB: AnswerMessage = { id: 'a2', role: 'system', intent: 'what_to_answer', text: 'Answer B.', isStreaming: false };
        const prev: AnswerMessage[] = [answerA, question, answerB];
        const finalize = vi.fn((msg: AnswerMessage | null) => ({ ...msg!, text: 'New B.', isStreaming: false }));

        const result = applyFinalAnswer(prev, true, finalize);

        expect(finalize).toHaveBeenCalledWith(answerB);
        expect(result).toHaveLength(3);
        expect(result[0]).toBe(answerA);
        expect(result[1]).toBe(question);
        expect(result[2]).toEqual({ id: 'a2', role: 'system', intent: 'what_to_answer', text: 'New B.', isStreaming: false });
    });
});

describe('cues on the answer bubble (cue mode, spec 2026-09-20 §6.8)', () => {
    it('the first token of a new answer carries the cues onto the bubble it creates', () => {
        const result = applyAnswerToken([], 'Ten ', false, makeNewId(), ['thirty gigabytes', 'int8, then shard']);
        expect(result[0]).toMatchObject({ text: 'Ten ', intent: 'what_to_answer', isStreaming: true, cues: ['thirty gigabytes', 'int8, then shard'] });
    });

    it('a following token without cues keeps the cues already on the bubble', () => {
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'Ten ', intent: 'what_to_answer', isStreaming: true, cues: ['thirty gigabytes'] };
        const result = applyAnswerToken([streaming], 'million', false, makeNewId());
        expect(result[0]).toEqual({ ...streaming, text: 'Ten million' });
    });

    it('a supersede restart takes the new stream\'s cues, or drops the old ones when it has none', () => {
        const old: AnswerMessage = { id: 'a1', role: 'system', text: 'Old.', intent: 'what_to_answer', isStreaming: false, cues: ['old cue'] };
        expect(applyAnswerToken([old], 'New', true, makeNewId(), ['new cue'])[0]).toEqual({ id: 'a1', role: 'system', intent: 'what_to_answer', text: 'New', isStreaming: true, cues: ['new cue'] });
        expect(applyAnswerToken([old], 'New', true, makeNewId())[0]).toEqual({ id: 'a1', role: 'system', intent: 'what_to_answer', text: 'New', isStreaming: true });
    });

    it('applyFinalAnswer keeps the cues when finalize spreads the streaming message', () => {
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'Ten million.', intent: 'what_to_answer', isStreaming: true, cues: ['thirty gigabytes'] };
        const result = applyFinalAnswer([streaming], false, (s) => ({ ...(s as AnswerMessage), isStreaming: false }));
        expect(result[0].cues).toEqual(['thirty gigabytes']);
    });
});

// ---- Task 8 (spec §4.5): bubbles keyed by turnId / origin / append -------------------------------------

const LIVE: BubbleMeta = { origin: 'live' };
const live = (turnId: number): BubbleMeta => ({ turnId, origin: 'live' });
const pipe = (turnId: number): BubbleMeta => ({ turnId, origin: 'pipeline' });
const appendMeta = (turnId: number): BubbleMeta => ({ turnId, origin: 'pipeline', append: true, label: '(full answer)' });
const fin = (text: string) => (s: AnswerMessage | null): AnswerMessage =>
    s ? { ...s, text, isStreaming: false } : { id: 'fin-null', role: 'system', text, intent: 'what_to_answer', isStreaming: false };

describe('usesKeyedPath (the B2 gate)', () => {
    const liveBubble: AnswerMessage = { id: 'L', role: 'system', intent: 'what_to_answer', text: 'x', isStreaming: false, turnId: 4, origin: 'live' };
    it('is true for origin live, for append, and for a turn that already has a live bubble', () => {
        expect(usesKeyedPath([], live(4))).toBe(true);
        expect(usesKeyedPath([], appendMeta(4))).toBe(true);
        expect(usesKeyedPath([liveBubble], pipe(4))).toBe(true);
    });
    it('is false for a pipeline event of a turn with no live bubble, for another turn, and without a turnId', () => {
        expect(usesKeyedPath([], pipe(4))).toBe(false);
        expect(usesKeyedPath([liveBubble], pipe(5))).toBe(false);
        expect(usesKeyedPath([liveBubble], { origin: 'live' })).toBe(false);
        expect(usesKeyedPath([liveBubble], LIVE)).toBe(false);
        expect(usesKeyedPath([liveBubble], undefined)).toBe(false);
        expect(usesKeyedPath([liveBubble], { append: true })).toBe(false);
    });
    it('a pipeline bubble of the same turn does not open the gate', () => {
        const pb: AnswerMessage = { ...liveBubble, origin: 'pipeline' };
        expect(usesKeyedPath([pb], pipe(4))).toBe(false);
    });
});

describe('usesKeyedSource', () => {
    const liveBubble: AnswerMessage = { id: 'L', role: 'system', intent: 'what_to_answer', text: 'x', turnId: 4, origin: 'live' };
    it('the Live label opens it; another label only when the turn has a live bubble', () => {
        expect(usesKeyedSource([], 'gemini-3.8-live', 4)).toBe(true);
        expect(usesKeyedSource([], 'Gemini Flash 3.1', 4)).toBe(false);
        expect(usesKeyedSource([liveBubble], 'Gemini Flash 3.1', 4)).toBe(true);
        expect(usesKeyedSource([liveBubble], 'Gemini Flash 3.1', 5)).toBe(false);
    });
    it('no turnId is never keyed', () => {
        expect(usesKeyedSource([liveBubble], 'gemini-3.8-live', undefined)).toBe(false);
    });
});

describe('keyed applyAnswerToken', () => {
    it('an append bubble opens under "(full answer)" and never joins the Live bubble, even while that is streaming', () => {
        const liveB: AnswerMessage = { id: 'L', role: 'system', intent: 'what_to_answer', text: 'Live text', isStreaming: true, turnId: 7, origin: 'live', sourceLabel: 'gemini-3.8-live' };
        const r1 = applyAnswerToken([liveB], 'Full ', false, makeNewId('a'), undefined, { ...appendMeta(7), sourceLabel: 'Gemini Flash 3.1' });
        expect(r1).toHaveLength(2);
        expect(r1[0]).toBe(liveB);
        expect(r1[1]).toMatchObject({ id: 'a-0', text: 'Full ', isStreaming: true, turnId: 7, origin: 'pipeline', append: true, label: '(full answer)', sourceLabel: 'Gemini Flash 3.1' });
        const r2 = applyAnswerToken(r1, 'answer', false, makeNewId('a'), undefined, { turnId: 7, origin: 'pipeline', append: true });
        expect(r2).toHaveLength(2);
        expect(r2[1]).toMatchObject({ text: 'Full answer', label: '(full answer)' });
        expect(r2[0]).toBe(liveB);
    });

    it('a live token appends to the last streaming bubble matching turnId, origin and append, not to another turn', () => {
        const t1: AnswerMessage = { id: 'b1', role: 'system', intent: 'what_to_answer', text: 'one ', isStreaming: true, turnId: 1, origin: 'live' };
        const t2: AnswerMessage = { id: 'b2', role: 'system', intent: 'what_to_answer', text: 'two ', isStreaming: true, turnId: 2, origin: 'live' };
        const r = applyAnswerToken([t1, t2], 'more', false, makeNewId(), undefined, live(1));
        expect(r[0]).toMatchObject({ id: 'b1', text: 'one more' });
        expect(r[1]).toBe(t2);
    });

    it('a live token for a turn with no streaming bubble opens a new one carrying the meta', () => {
        const done: AnswerMessage = { id: 'b1', role: 'system', intent: 'what_to_answer', text: 'one.', isStreaming: false, turnId: 1, origin: 'live' };
        const r = applyAnswerToken([done], 'next ', false, makeNewId('n'), undefined, { ...live(1), sourceLabel: 'gemini-3.8-live' });
        expect(r).toHaveLength(2);
        expect(r[1]).toMatchObject({ id: 'n-0', role: 'system', intent: 'what_to_answer', text: 'next ', isStreaming: true, turnId: 1, origin: 'live', sourceLabel: 'gemini-3.8-live' });
    });

    it('replace with a turnId rewrites the turn\'s FIRST bubble and removes its later ones (Review Focus 4)', () => {
        const liveB: AnswerMessage = { id: 'L', role: 'system', intent: 'what_to_answer', text: 'Live.', isStreaming: false, turnId: 3, origin: 'live', cues: ['old'], metrics: { x: 1 } };
        const app: AnswerMessage = { id: 'A', role: 'system', intent: 'what_to_answer', text: 'Full.', isStreaming: false, turnId: 3, origin: 'pipeline', append: true, label: '(full answer)' };
        const other: AnswerMessage = { id: 'O', role: 'system', intent: 'what_to_answer', text: 'Turn 4.', isStreaming: true, turnId: 4, origin: 'live' };
        const r = applyAnswerToken([liveB, app, other], 'Fresh ', true, makeNewId(), ['new cue'], { ...pipe(3), sourceLabel: 'Gemini Flash 3.1' });
        expect(r).toHaveLength(2);
        expect(r[0]).toEqual({ id: 'L', role: 'system', intent: 'what_to_answer', text: 'Fresh ', isStreaming: true, turnId: 3, origin: 'pipeline', sourceLabel: 'Gemini Flash 3.1', cues: ['new cue'] });
        expect(r[1]).toBe(other);
    });

    it('replace with a turnId and no bubble of that turn appends a new one', () => {
        const other: AnswerMessage = { id: 'O', role: 'system', intent: 'what_to_answer', text: 'Turn 4.', isStreaming: false, turnId: 4, origin: 'live' };
        const r = applyAnswerToken([other], 'Fresh ', true, makeNewId('n'), undefined, live(3));
        expect(r).toHaveLength(2);
        expect(r[0]).toBe(other);
        expect(r[1]).toMatchObject({ id: 'n-0', text: 'Fresh ', isStreaming: true, turnId: 3, origin: 'live' });
    });
});

describe('keyed applyFinalAnswer', () => {
    it('a final with a turnId closes only its own bubble and overwrites only its text, with two turns interleaved (Review Focus 1)', () => {
        const a1: AnswerMessage = { id: 'a1', role: 'system', intent: 'what_to_answer', text: 'k part', isStreaming: true, turnId: 1, origin: 'live', sourceLabel: 'S1', cues: ['c'] };
        const a2: AnswerMessage = { id: 'a2', role: 'system', intent: 'what_to_answer', text: 'k+1 part', isStreaming: true, turnId: 2, origin: 'live', sourceLabel: 'S2' };
        // turn 2's final arrives while turn 1's bubble is the OLDER streaming one
        const r = applyFinalAnswer([a1, a2], false, fin('k+1 final'), live(2));
        expect(r[0]).toBe(a1);
        expect(r[1]).toEqual({ ...a2, text: 'k+1 final', isStreaming: false });
        const r2 = applyFinalAnswer(r, false, fin('k final'), live(1));
        expect(r2[0]).toEqual({ ...a1, text: 'k final', isStreaming: false });
        expect(r2[1]).toBe(r[1]);
    });

    it('a final does not close a streaming bubble of the same turn with a different origin or append', () => {
        const liveB: AnswerMessage = { id: 'L', role: 'system', intent: 'what_to_answer', text: 'live', isStreaming: false, turnId: 5, origin: 'live' };
        const appB: AnswerMessage = { id: 'A', role: 'system', intent: 'what_to_answer', text: 'full', isStreaming: true, turnId: 5, origin: 'pipeline', append: true };
        const r = applyFinalAnswer([liveB, appB], false, fin('live done'), live(5));
        // no streaming live bubble: a new finalized bubble is appended, the append bubble stays streaming
        expect(r[1]).toBe(appB);
        expect(r).toHaveLength(3);
        expect(r[2]).toMatchObject({ text: 'live done', isStreaming: false, turnId: 5, origin: 'live' });
        const r2 = applyFinalAnswer([liveB, appB], false, fin('full done'), { turnId: 5, origin: 'pipeline', append: true });
        expect(r2[0]).toBe(liveB);
        expect(r2[1]).toMatchObject({ id: 'A', text: 'full done', isStreaming: false });
    });

    it('a replace final finalizes the turn\'s first bubble and removes the later ones', () => {
        const first: AnswerMessage = { id: 'F', role: 'system', intent: 'what_to_answer', text: 'rewritten', isStreaming: false, turnId: 6, origin: 'live' };
        const app: AnswerMessage = { id: 'A', role: 'system', intent: 'what_to_answer', text: 'full', isStreaming: false, turnId: 6, origin: 'pipeline', append: true };
        const r = applyFinalAnswer([first, app], true, fin('final'), pipe(6));
        // fix1 I2: the rewritten bubble takes the replacing stream's origin (it is no longer a Live bubble)
        expect(r).toEqual([{ ...first, origin: 'pipeline', text: 'final', isStreaming: false }]);
    });

    it('with no streaming match and no replace, appends finalize(null) with the meta stored', () => {
        const r = applyFinalAnswer([], false, fin('only'), { ...live(9), sourceLabel: 'gemini-3.8-live' });
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({ text: 'only', turnId: 9, origin: 'live', sourceLabel: 'gemini-3.8-live' });
    });
});

describe('no turnId: exactly today\'s results with meta undefined', () => {
    it('token: appends onto the streaming bubble; replace restarts the last what_to_answer', () => {
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'Ten ', intent: 'what_to_answer', isStreaming: true };
        expect(applyAnswerToken([streaming], 'million', false, makeNewId(), undefined, undefined)).toEqual(applyAnswerToken([streaming], 'million', false, makeNewId()));
        expect(applyAnswerToken([streaming], 'million', false, makeNewId(), undefined, { origin: 'live' })).toEqual([{ ...streaming, text: 'Ten million' }]);
        const old: AnswerMessage = { id: 'a1', role: 'system', text: 'Old.', intent: 'what_to_answer', isStreaming: false };
        expect(applyAnswerToken([old], 'New', true, makeNewId(), undefined, {})).toEqual([{ id: 'a1', role: 'system', intent: 'what_to_answer', text: 'New', isStreaming: true }]);
    });
    it('final: finalizes the streaming bubble; replace rewrites the last answer', () => {
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'Ten', intent: 'what_to_answer', isStreaming: true };
        expect(applyFinalAnswer([streaming], false, fin('Done'), {})).toEqual([{ ...streaming, text: 'Done', isStreaming: false }]);
        const old: AnswerMessage = { id: 'a1', role: 'system', text: 'Old.', intent: 'what_to_answer', isStreaming: false };
        expect(applyFinalAnswer([old], true, fin('New'), undefined)).toEqual([{ ...old, text: 'New', isStreaming: false }]);
    });
});

describe('flag-off identity (B2, the binding test)', () => {
    type Ev = { kind: 'token'; token: string; replace: boolean; turnId: number } | { kind: 'final'; replace: boolean; turnId: number };
    const events: Ev[] = [
        // 1. a head stream (turn 4)
        { kind: 'token', token: 'He', replace: false, turnId: 4 },
        { kind: 'token', token: 'ad ', replace: false, turnId: 4 },
        { kind: 'token', token: 'one', replace: false, turnId: 4 },
        // 2. a supersede
        { kind: 'token', token: 'Super', replace: true, turnId: 4 },
        { kind: 'token', token: 'seded ', replace: false, turnId: 4 },
        { kind: 'token', token: 'text', replace: false, turnId: 4 },
        // 3. its final
        { kind: 'final', replace: true, turnId: 4 },
        // 4. turn 5
        { kind: 'token', token: 'Two ', replace: false, turnId: 5 },
        { kind: 'token', token: 'parts', replace: false, turnId: 5 },
        { kind: 'final', replace: false, turnId: 5 },
    ];
    const question: AnswerMessage = { id: 'q', role: 'user', text: '🎙 a question' };
    const run = (withMeta: boolean) => {
        let state: AnswerMessage[] = [question];
        const gates: boolean[] = [];
        let n = 0;
        for (const e of events) {
            const meta: BubbleMeta | undefined = withMeta ? { turnId: e.turnId, origin: 'pipeline' } : undefined;
            gates.push(usesKeyedPath(state, meta));
            state = e.kind === 'token'
                ? applyAnswerToken(state, e.token, e.replace, () => `id-${n++}`, undefined, meta)
                : applyFinalAnswer(state, e.replace, (s) => (s ? { ...s, text: 'FINAL', isStreaming: false } : { id: `id-${n++}`, role: 'system', text: 'FINAL', intent: 'what_to_answer' }), meta);
        }
        return { state, gates };
    };
    const strip = (m: AnswerMessage) => { const { turnId: _t, origin: _o, ...rest } = m; return rest; };

    it('the keyed fold deep-equals the meta-undefined fold once turnId/origin are stripped', () => {
        const withMeta = run(true).state;
        const without = run(false).state;
        expect(without).toHaveLength(3);
        expect(withMeta.map(strip)).toEqual(without);
        expect(withMeta.filter((m) => m.intent === 'what_to_answer').map((m) => [m.turnId, m.origin])).toEqual([[4, 'pipeline'], [5, 'pipeline']]);
    });

    it('usesKeyedPath is false for every event of that sequence', () => {
        expect(run(true).gates).toEqual(events.map(() => false));
    });
});

describe('source labels at bubble creation', () => {
    it('a later event\'s sourceLabel never relabels an existing bubble', () => {
        const b: AnswerMessage = { id: 'b', role: 'system', intent: 'what_to_answer', text: 'x', isStreaming: true, turnId: 2, origin: 'live', sourceLabel: 'gemini-3.8-live' };
        const r = applyAnswerToken([b], 'y', false, makeNewId(), undefined, { ...live(2), sourceLabel: 'Gemini Flash 3.1' });
        expect(r[0]).toMatchObject({ text: 'xy', sourceLabel: 'gemini-3.8-live' });
        const f = applyFinalAnswer(r, false, fin('xy.'), { ...live(2), sourceLabel: 'Gemini Flash 3.1' });
        expect(f[0]).toMatchObject({ text: 'xy.', sourceLabel: 'gemini-3.8-live' });
    });
});

// ---- fix1 (review of 95ed5a6) -------------------------------------------------------------------------

describe('fix1 I1: today\'s path never joins or finalizes a keyed (append / live) bubble', () => {
    const mk = (o: Partial<AnswerMessage>): AnswerMessage => ({ id: 'x', role: 'system', intent: 'what_to_answer', text: '', ...o });
    // turn k's Live bubble, then turn k+1's 🎙 and its streaming pipeline bubble, then k's orphaned "(full answer)" opens last
    const state = (): AnswerMessage[] => {
        let s: AnswerMessage[] = [
            { id: 'qk', role: 'user', text: '🎙 k' },
            mk({ id: 'Lk', text: 'Live k.', isStreaming: false, turnId: 1, origin: 'live' }),
            { id: 'qk1', role: 'user', text: '🎙 k+1' },
            mk({ id: 'P', text: 'P1 ', isStreaming: true, turnId: 2, origin: 'pipeline' }),
        ];
        s = applyAnswerToken(s, 'FULL k ', false, makeNewId('n'), undefined, appendMeta(1));
        return s;
    };

    it('k+1\'s tokens and final land in k+1\'s own bubble; k\'s "(full answer)" bubble keeps its text', () => {
        let s = state();
        expect(s[s.length - 1]).toMatchObject({ append: true, text: 'FULL k ', isStreaming: true });
        s = applyAnswerToken(s, 'P2', false, makeNewId('n'), undefined, pipe(2));
        s = applyFinalAnswer(s, false, fin('P1 P2.'), pipe(2));
        expect(s.find((m) => m.id === 'P')).toMatchObject({ text: 'P1 P2.', isStreaming: false, turnId: 2 });
        expect(s.filter((m) => m.append)).toEqual([expect.objectContaining({ text: 'FULL k ', isStreaming: true, label: '(full answer)', turnId: 1 })]);
        expect(s).toHaveLength(5);
    });

    it('with no unkeyed streaming bubble to join, a token opens a new bubble and a final appends finalize(null)', () => {
        const s0 = state().filter((m) => m.id !== 'P');
        const s1 = applyAnswerToken(s0, 'Q1', false, makeNewId('n'), undefined, pipe(2));
        expect(s1[s1.length - 1]).toMatchObject({ text: 'Q1', turnId: 2, isStreaming: true });
        expect(s1.find((m) => m.append)).toMatchObject({ text: 'FULL k ' });
        const s2 = applyFinalAnswer(s0, false, fin('Done.'), pipe(2));
        expect(s2.find((m) => m.append)).toMatchObject({ text: 'FULL k ', isStreaming: true });
        expect(s2[s2.length - 1]).toMatchObject({ text: 'Done.', turnId: 2 });
    });

    it('a streaming Live bubble is not joined or finalized by an unkeyed event either', () => {
        const s0: AnswerMessage[] = [mk({ id: 'L', text: 'live ', isStreaming: true, turnId: 1, origin: 'live' })];
        const s1 = applyAnswerToken(s0, 'pipe', false, makeNewId('n'), undefined, undefined);
        expect(s1[0]).toBe(s0[0]);
        expect(s1).toHaveLength(2);
        const s2 = applyFinalAnswer(s0, false, fin('x'), undefined);
        expect(s2[0]).toBe(s0[0]);
    });
});

describe('fix1 I2: a replace final applies the replacing stream\'s origin and source', () => {
    const liveB = (): AnswerMessage => ({ id: 'L', role: 'system', intent: 'what_to_answer', text: 'Live.', isStreaming: false, turnId: 8, origin: 'live', sourceLabel: 'gemini-3.8-live', label: undefined });
    const appB = (): AnswerMessage => ({ id: 'A', role: 'system', intent: 'what_to_answer', text: 'Full.', isStreaming: false, turnId: 8, origin: 'pipeline', append: true, label: '(full answer)', sourceLabel: 'S' });

    it('with no source event the rewritten bubble carries no Live label and the append is gone', () => {
        const r = applyFinalAnswer([liveB(), appB()], true, fin('Replacement.'), pipe(8));
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({ id: 'L', text: 'Replacement.', origin: 'pipeline', isStreaming: false });
        expect(r[0].sourceLabel).toBeUndefined();
        expect(r[0].label).toBeUndefined();
    });

    it('with a source it carries that label', () => {
        const r = applyFinalAnswer([liveB()], true, fin('Replacement.'), { ...pipe(8), sourceLabel: 'Gemini Flash 3.1' });
        expect(r[0]).toMatchObject({ origin: 'pipeline', sourceLabel: 'Gemini Flash 3.1' });
    });
});

describe('fix1 M3: an append final with no append token still gets the header', () => {
    it('finalize(null) of an append event carries "(full answer)"', () => {
        const live1: AnswerMessage = { id: 'L', role: 'system', intent: 'what_to_answer', text: 'Live.', isStreaming: false, turnId: 3, origin: 'live' };
        const r = applyFinalAnswer([live1], false, fin('Full.'), { turnId: 3, origin: 'pipeline', append: true });
        expect(r).toHaveLength(2);
        expect(r[1]).toMatchObject({ text: 'Full.', append: true, label: '(full answer)' });
    });
    it('a non-append final gets no label', () => {
        const r = applyFinalAnswer([], false, fin('x'), live(3));
        expect(r[0].label).toBeUndefined();
    });
});
