import { describe, it, expect } from 'vitest';
import { ChipDeduper } from './ChipDeduper';
import { decideDispatch } from './detectionDispatch';

// S2 (overnight 2026-10-20): an answer is marked at dispatch and nothing un-marked it when the answer FAILED, so the
// interviewer's repeat of the question was dropped at both sites (main.ts stale-mark guard = isAnsweredDuplicate,
// and the dispatch tail = admit + decideDispatch). unmarkAnswered is the inverse of markAnswered.
const Q = 'How would you shard the orders table across regions?';
const cand = (q: string) => ({ question: q, source: 'whisper' as const, anchor: q });

function dispatched(q: string) {
  let t = 0;
  const d = new ChipDeduper({ now: () => t });
  const id = d.admit(cand(q)).id;
  d.markAnswered(id);
  return { d, id, at: (ms: number) => { t = ms; } };
}

describe('unmarkAnswered', () => {
  it('control: a marked (answered) question is dropped at both sites, today\'s behaviour', () => {
    const { d, at } = dispatched(Q);
    at(25_000);
    expect(d.isAnsweredDuplicate(cand(Q))).toBe(true);
    const v = d.admit(cand(Q));
    expect(v.admitted).toBe(false);
    expect(v.alreadyAnswered).toBe(true);
    expect(decideDispatch('auto', v)).toBe('drop');
  });

  it('drop site A (stale-mark guard): after an unmark, the repeat at +25 s is no longer a stale duplicate', () => {
    const { d, id, at } = dispatched(Q);
    d.unmarkAnswered(id);
    at(25_000);
    expect(d.isAnsweredDuplicate(cand(Q))).toBe(false);
  });

  it('drop site B (dispatch tail): after an unmark, the repeat at +5 s is answered (matches the unanswered entry)', () => {
    const { d, id, at } = dispatched(Q);
    d.unmarkAnswered(id);
    at(5_000);
    const v = d.admit(cand(Q));
    expect(v.admitted).toBe(false);
    expect(v.alreadyAnswered).toBe(false);
    expect(decideDispatch('auto', v)).toBe('answer');
  });

  it('drop site B: after an unmark, the repeat at +25 s is admitted fresh (the entry aged out at the base window)', () => {
    const { d, id, at } = dispatched(Q);
    d.unmarkAnswered(id);
    at(25_000);
    const v = d.admit(cand(Q));
    expect(v.admitted).toBe(true);
    expect(decideDispatch('auto', v)).toBe('answer');
  });

  it('an unknown or undefined id is a no-op', () => {
    const { d, at } = dispatched(Q);
    d.unmarkAnswered(undefined);
    d.unmarkAnswered(999);
    at(25_000);
    expect(d.isAnsweredDuplicate(cand(Q))).toBe(true);
  });

  it('F3 interplay: with P1 then P2 answered and P2 unmarked, P1 becomes the latest answered, so its re-emission is stale again', () => {
    let t = 0;
    const d = new ChipDeduper({ now: () => t });
    const P1 = 'Tell me about yourself.';
    const P2 = 'How would you shard the orders table across regions?';
    d.markAnswered(d.admit(cand(P1)).id);
    t = 10_000;
    const id2 = d.admit(cand(P2)).id;
    d.markAnswered(id2);
    d.unmarkAnswered(id2);
    t = 20_000;
    expect(d.isAnsweredDuplicate(cand(P1))).toBe(true);
    expect(d.isAnsweredDuplicate(cand(P2))).toBe(false);
  });
});
