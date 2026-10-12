import { describe, it, expect } from 'vitest';
import { ChipDeduper } from './ChipDeduper';

// F3 (st25-smoke 2026-10-12): the detector re-emits ("chip updated") a question that was already
// answered; in auto mode that re-emission marked the open turn and made the NEXT small-talk
// statement dispatchable. isAnsweredDuplicate is the read-only check main.ts consults before marking.
function setup(question: string, answeredAt = 1_000_000) {
  let t = answeredAt;
  const d = new ChipDeduper({ now: () => t });
  const v = d.admit({ question, source: 'whisper', anchor: question });
  d.markAnswered(v.id);
  return { d, at: (ms: number) => { t = answeredAt + ms; } };
}
const cand = (q: string, source: 'whisper' | 'live' = 'whisper') => ({ question: q, source, anchor: q });

describe('ChipDeduper.isAnsweredDuplicate (stale-mark guard)', () => {
  it('ST11 evidence: "Why that one?" re-emitted 20.3 s after it was answered is stale', () => {
    const { d, at } = setup('Why that one?');
    at(20_300);
    expect(d.isAnsweredDuplicate(cand('Why that one?'))).toBe(true);
    at(22_100);
    expect(d.isAnsweredDuplicate(cand('Why that one?'))).toBe(true);
  });
  it('ST14 evidence: "Do you have any questions for us?" re-emitted 23.5 s after the answer is stale', () => {
    const { d, at } = setup('Do you have any questions for us?');
    at(23_500);
    expect(d.isAnsweredDuplicate(cand('Do you have any questions for us?'))).toBe(true);
  });
  it('a genuinely new question is not stale', () => {
    const { d, at } = setup('Why that one?');
    at(20_300);
    expect(d.isAnsweredDuplicate(cand('How would you shard the orders table?'))).toBe(false);
  });
  it('the same text after the answered window (60 s) is a re-ask, not stale', () => {
    const { d, at } = setup('Why that one?');
    at(60_100);
    expect(d.isAnsweredDuplicate(cand('Why that one?'))).toBe(false);
  });
  it('an admitted-but-unanswered question is not stale', () => {
    let t = 0;
    const d = new ChipDeduper({ now: () => t });
    d.admit({ question: 'Why that one?', source: 'whisper', anchor: 'Why that one?' });
    t = 3_000;
    expect(d.isAnsweredDuplicate(cand('Why that one?'))).toBe(false);
  });
  it('D1: a short follow-up sharing a key noun with its answered parent is not stale (anchor rule kept)', () => {
    const { d, at } = setup('How does the cache invalidation work?');
    at(19_000);
    expect(d.isAnsweredDuplicate(cand('And the cache?'))).toBe(false);
  });
  it('is read-only: it caches nothing and a later admit is unaffected', () => {
    const { d, at } = setup('Why that one?');
    at(70_000);
    expect(d.isAnsweredDuplicate(cand('What is a DAG?'))).toBe(false);
    expect(d.admit({ question: 'What is a DAG?', source: 'whisper' }).admitted).toBe(true);
  });
});
