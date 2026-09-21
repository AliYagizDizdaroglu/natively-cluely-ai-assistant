import { describe, it, expect, vi } from 'vitest';
import { applyAnswerToken, applyFinalAnswer, applyLiveQuestion, type AnswerMessage } from './answerMessages';

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
