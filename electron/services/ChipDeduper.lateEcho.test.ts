import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  it('names its own reason and age; a recent re-emission stays stale-mark', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    at(5_000);
    expect(d.answeredDuplicate(cand(Q1_ECHO, 'live'))).toEqual({ reason: 'stale-mark' });
    answer(Q2, 25_000);
    at(90_000);
    expect(d.answeredDuplicate(cand(Q1_ECHO, 'live'))).toEqual({ reason: 'late-echo', ageMs: 90_000 });
    expect(d.answeredDuplicate(cand(Q3, 'live'))).toBeNull();
  });
  it('main.ts logs the reason the deduper returns, not a fixed stale-mark', () => {
    const src = readFileSync(join(__dirname, '..', 'main.ts'), 'utf8');
    const i = src.indexOf('this.chipDeduper.answeredDuplicate(');
    expect(i).toBeGreaterThan(0);
    const block = src.slice(i, src.indexOf('return;', i));
    expect(block).toContain('reason=${dup.reason}');
    expect(block).toContain('age=');
  });
  // Pinned: question-frame words (how, would, design, ...) do not count toward the match, only topic words do.
  // Only the LIVE claim is dropped; the same text from STT still dispatches.
  it('frame words do not carry the match: a different topic under the same frame is dispatched', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    at(90_000);
    expect(d.isAnsweredDuplicate(cand('How would you design a message queue for a public API?', 'live'))).toBe(false);
  });
  it('one extra topic word still matches (3 of 4 topic words, 0.75); STT is unaffected', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    at(90_000);
    const longer = 'How would you design a rate limiter for a public API for scale?';
    expect(d.isAnsweredDuplicate(cand(longer, 'live'))).toBe(true);
    expect(d.isAnsweredDuplicate(cand(longer, 'whisper'))).toBe(false);
  });
  it('reset clears the ring', () => {
    const { d, answer, at } = run();
    answer(Q1, 0);
    d.reset();
    at(90_000);
    expect(d.isAnsweredDuplicate(cand(Q1_ECHO, 'live'))).toBe(false);
  });
});
