import { describe, it, expect } from 'vitest';
import { pickTurnDetection, turnDispatchInput, isLateFinalChip, type MarkedDetection } from './turnDispatch';
import type { TurnDecision } from './interviewerTurn';

const detection = (over: Partial<MarkedDetection> = {}): MarkedDetection => ({
    question: 'What is a DAG?',
    intent: 'verbal',
    source: 'whisper',
    verdict: 'match',
    ...over,
});

describe('pickTurnDetection — which of the turn\'s marking detections wins', () => {
    it('with nothing current, the incoming detection stands', () => {
        const x = detection();
        expect(pickTurnDetection(null, x)).toBe(x);
    });

    it('an unverifiable Live claim followed by a whisper match → the match wins', () => {
        const unverifiable = detection({ source: 'live', verdict: 'unverifiable' });
        const match = detection({ source: 'whisper', verdict: 'match' });
        expect(pickTurnDetection(unverifiable, match)).toBe(match);
    });

    it('a match followed by an unverifiable claim → the match still stands', () => {
        const match = detection({ source: 'whisper', verdict: 'match' });
        const unverifiable = detection({ source: 'live', verdict: 'unverifiable' });
        expect(pickTurnDetection(match, unverifiable)).toBe(match);
    });

    it('two unverified detections in a row: the first (current) stands', () => {
        const first = detection({ source: 'live', verdict: 'unverifiable' });
        const second = detection({ source: 'live', verdict: 'unverifiable' });
        expect(pickTurnDetection(first, second)).toBe(first);
    });

    it('two verified detections in a row: the first (current) stands', () => {
        const first = detection({ source: 'whisper', verdict: 'match' });
        const second = detection({ source: 'live', verdict: 'paraphrase' });
        expect(pickTurnDetection(first, second)).toBe(first);
    });
});

describe('turnDispatchInput — the DetectionInput a turn dispatch/supersede sends through dispatchDetection', () => {
    it('copies intent/source/verdict and sets question/anchor to the decision text', () => {
        const base = detection({ question: 'stale text', intent: 'coding', source: 'live', verdict: 'paraphrase' });
        const decision: Extract<TurnDecision, { kind: 'dispatch' }> = {
            kind: 'dispatch',
            text: 'What is a DAG, and why does Airflow use that structure?',
            live: ['What is a DAG'],
            finished: true,
            gateMs: 1200,
            finals: 2,
            fromLive: false,
        };
        const input = turnDispatchInput(base, decision, null);
        expect(input.intent).toBe('coding');
        expect(input.source).toBe('live');
        expect(input.verdict).toBe('paraphrase');
        expect(input.question).toBe(decision.text);
        expect(input.anchor).toBe(decision.text);
        expect(input.liveTexts).toEqual(['What is a DAG']);
        expect(input.turnDispatch).toBe(true);
        expect(input.resolving).toBe(true);
    });

    it('also works on a supersede decision', () => {
        const base = detection();
        const decision: Extract<TurnDecision, { kind: 'supersede' }> = {
            kind: 'supersede',
            text: 'the fuller joined transcript',
            live: [],
            replaces: 'What is a DAG?',
            finals: 3,
        };
        const input = turnDispatchInput(base, decision, null);
        expect(input.question).toBe('the fuller joined transcript');
        expect(input.anchor).toBe('the fuller joined transcript');
        expect(input.liveTexts).toEqual([]);
    });
});

describe('turnDispatchInput — the machine turn id rides the DetectionInput (spec 2026-10-03 §3.1)', () => {
    const dispatch = { kind: 'dispatch', text: 'What is a DAG?', live: [], finished: true, gateMs: 1200, finals: 1, fromLive: false } as Extract<TurnDecision, { kind: 'dispatch' }>;
    it('carries the turn id when the machine has one', () => {
        expect(turnDispatchInput(detection(), dispatch, 7).turnId).toBe(7);
        expect(turnDispatchInput(detection(), dispatch, 0).turnId).toBe(0);
    });
    it('carries no turnId key at all when the id is null', () => {
        expect('turnId' in turnDispatchInput(detection(), dispatch, null)).toBe(false);
    });
});

describe('isLateFinalChip (D2): a whisper detection of an absorbed final marks nothing', () => {
    const absorbed = [{ text: 'And, your reason?', at: 10_000 }];
    it('the chip text contained in an absorbed final no older than 5 s -> drop (4.9 s)', () => {
        expect(isLateFinalChip('and your reason', absorbed, 14_900)).toBe(true);
    });
    it('5.1 s old -> mark', () => {
        expect(isLateFinalChip('and your reason', absorbed, 15_100)).toBe(false);
    });
    it('a different chip at 1 s -> mark', () => {
        expect(isLateFinalChip('How would you shard that service?', absorbed, 11_000)).toBe(false);
    });
    it('no absorbed finals, or an empty question -> mark', () => {
        expect(isLateFinalChip('and your reason', [], 11_000)).toBe(false);
        expect(isLateFinalChip('  ', absorbed, 11_000)).toBe(false);
    });
    it('non-Latin words are compared, not erased', () => {
        const ru = [{ text: 'А ваши причины?', at: 10_000 }];
        expect(isLateFinalChip('ваши причины', ru, 11_000)).toBe(true);
        expect(isLateFinalChip('другой вопрос', ru, 11_000)).toBe(false);
    });
    it('a partial-word overlap is not containment', () => {
        expect(isLateFinalChip('your rea', absorbed, 11_000)).toBe(false);
    });
});
