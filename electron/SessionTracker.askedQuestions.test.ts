import { describe, it, expect, vi, afterEach } from 'vitest';
import { SessionTracker } from './SessionTracker';

afterEach(() => vi.restoreAllMocks());

describe('SessionTracker question ledger (spec 2026-10-03 §3.1)', () => {
    it('starts empty, records newest last with increasing seq, keyed by turn id', () => {
        const s = new SessionTracker();
        expect(s.getAskedQuestions()).toEqual([]);
        s.recordAskedQuestion('How would you shard the store?', 1);
        s.recordAskedQuestion('And the hot tenants?', 2);
        expect(s.getAskedQuestions()).toEqual([{ text: 'How would you shard the store?', turnId: 1, seq: 1 }, { text: 'And the hot tenants?', turnId: 2, seq: 2 }]);
    });
    it('a held turn id is removed and the new text pushed newest with a fresh seq (the 8 s supersede)', () => {
        const s = new SessionTracker();
        s.recordAskedQuestion('head', 1); s.recordAskedQuestion('other', 2); s.recordAskedQuestion('head tail', 1);
        expect(s.getAskedQuestions()).toEqual([{ text: 'other', turnId: 2, seq: 2 }, { text: 'head tail', turnId: 1, seq: 3 }]);
    });
    it('keeps at most three, oldest dropped', () => {
        const s = new SessionTracker();
        for (let i = 1; i <= 5; i++) s.recordAskedQuestion(`q${i}`, i);
        expect(s.getAskedQuestions().map((e) => e.text)).toEqual(['q3', 'q4', 'q5']);
    });
    it('reset() (new meeting) clears the ledger and restarts seq at 1', () => {
        const s = new SessionTracker();
        s.recordAskedQuestion('q1', 1); s.recordAskedQuestion('q2', null);
        s.reset();
        expect(s.getAskedQuestions()).toEqual([]);
        s.recordAskedQuestion('q3', 7);
        expect(s.getAskedQuestions()).toEqual([{ text: 'q3', turnId: 7, seq: 1 }]);
    });
    it('a snapshot taken before a write keeps its length (recordAsked builds a new array; nothing mutates the one a caller holds)', () => {
        const s = new SessionTracker();
        s.recordAskedQuestion('q1', 1);
        const before = s.getAskedQuestions();
        s.recordAskedQuestion('q2', 2);
        expect(before).toHaveLength(1);               // a snapshot taken before a write keeps its length (recordAsked builds a new array)
        expect(s.getAskedQuestions()).toHaveLength(2);
    });
});