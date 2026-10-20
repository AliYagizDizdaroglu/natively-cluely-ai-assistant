import { describe, it, expect } from 'vitest';
import { ChipDeduper } from './ChipDeduper';

// S3 (overnight-1020): the Live ear re-announced an answered question 62-76 s later. The 60 s answered window and the
// latest-only rule let it through, so it opened a Live-only turn and was answered twice. An answered ring (last 3,
// 4+ content words, Live claims only) remembers them past both limits.
const Q1 = 'How would you design a rate limiter for a public API?';
const Q1_ECHO = 'How would you design a rate limiter for a public API';
const Q2 = 'What is the difference between precision and recall in classification?';
const Q3 = 'Explain how gradient boosting handles overfitting on small datasets.';
const cand = (q: string, source: 'whisper' | 'live') => ({ question: q, source, anchor: q });

function run() {
  let t = 0;
  const d = new ChipDeduper({ now: () => t });
  const answer = (q: string, at: number) => { t = at; const id = d.admit(cand(q, 'whisper')).id; d.markAnswered(id); return id; };
  return { d, answer, at: (ms: number) => { t = ms; } };
}

describe('late Live echo of an answered question', () => {
  it('a Live echo 90 s after the answer is stale', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    at(90_000);
    expect(d.isAnsweredDuplicate(cand(Q1_ECHO, 'live'))).toBe(true);
  });
  it('a Live echo of the second-to-last answered question is stale', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    answer(Q2, 25_000);
    at(52_000);
    expect(d.isAnsweredDuplicate(cand(Q1_ECHO, 'live'))).toBe(true);
    at(200_000);
    expect(d.isAnsweredDuplicate(cand(Q1_ECHO, 'live'))).toBe(true);
  });
  it('the ring holds the last 3 answers only', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    answer(Q2, 20_000);
    answer(Q3, 40_000);
    answer('Why does batch normalization speed up convergence during training?', 60_000);
    at(300_000);
    expect(d.isAnsweredDuplicate(cand(Q1_ECHO, 'live'))).toBe(false);
    expect(d.isAnsweredDuplicate(cand(Q2, 'live'))).toBe(true);
  });
  it('a re-ask after a FAILED answer is still dispatched', () => {
    const { d, answer, at } = run();
    const id = answer(Q1, 0);
    d.unmarkAnswered(id);
    at(90_000);
    expect(d.isAnsweredDuplicate(cand(Q1_ECHO, 'live'))).toBe(false);
  });
  it('a different question sharing words is dispatched', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    at(90_000);
    expect(d.isAnsweredDuplicate(cand('How would you design a cache for a public API?', 'live'))).toBe(false);
  });
  it('a short follow-up after an answer is not an echo', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    answer(Q2, 25_000);
    at(90_000);
    expect(d.isAnsweredDuplicate(cand('Why that one?', 'live'))).toBe(false);
  });
  it('whisper behaviour is unchanged: an old, non-latest answer still marks', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    answer(Q2, 25_000);
    at(52_000);
    expect(d.isAnsweredDuplicate(cand(Q1_ECHO, 'whisper'))).toBe(false);
    at(90_000);
    expect(d.isAnsweredDuplicate(cand(Q2, 'whisper'))).toBe(false);
  });
  it('reset clears the ring', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    d.reset();
    at(90_000);
    expect(d.isAnsweredDuplicate(cand(Q1_ECHO, 'live'))).toBe(false);
  });
});
