import { describe, it, expect } from 'vitest';
import { AnswerOutcomeTracker, isAnswerFailure } from './answerOutcome';

// Which ended answers un-mark their question in the deduper (S2). Only a FAILURE of the turn's last
// outstanding answer, with nothing delivered for the turn, un-marks; a supersede is not a failure.
describe('isAnswerFailure', () => {
  it.each([
    ['failed', 3, true],
    ['failed', null, true],
    ['completed', 3, false],
    ['aborted', 3, false],        // aborted by a newer generation (a supersede): not a failure
    ['aborted', null, true],      // never reached a stream (no key / cooldown): nothing was ever going to be said
  ] as const)('kind=%s generation=%s -> %s', (kind, gen, want) => {
    expect(isAnswerFailure(kind, gen)).toBe(want);
  });
});

describe('AnswerOutcomeTracker', () => {
  const mk = () => new AnswerOutcomeTracker();

  it('a failed answer returns its dedup id to un-mark', () => {
    const t = mk();
    t.dispatched(7, 41);
    expect(t.ended(7, 'failed', 1, false)).toBe(41);
  });

  it('a completed answer keeps the mark', () => {
    const t = mk();
    t.dispatched(7, 41);
    expect(t.ended(7, 'completed', 1, false)).toBeUndefined();
  });

  it('supersede: the aborted first answer does not un-mark, whatever order the ends arrive in', () => {
    const t = mk();
    t.dispatched(7, 41); t.dispatched(7, 41);          // head + supersede
    expect(t.ended(7, 'completed', 2, false)).toBeUndefined();
    expect(t.ended(7, 'aborted', 1, false)).toBeUndefined();
    const u = mk();
    u.dispatched(7, 41); u.dispatched(7, 41);
    expect(u.ended(7, 'aborted', 1, false)).toBeUndefined();
    expect(u.ended(7, 'completed', 2, false)).toBeUndefined();
  });

  it('supersede whose replacement then fails un-marks once, at the last end', () => {
    const t = mk();
    t.dispatched(7, 41); t.dispatched(7, 41);
    expect(t.ended(7, 'aborted', 1, false)).toBeUndefined();   // replacement still outstanding
    expect(t.ended(7, 'failed', 2, false)).toBe(41);
  });

  it('a failed head whose replacement is still in flight does not un-mark; the delivered replacement keeps it', () => {
    const t = mk();
    t.dispatched(7, 41); t.dispatched(7, 41);
    expect(t.ended(7, 'failed', 1, false)).toBeUndefined();
    expect(t.ended(7, 'completed', 2, false)).toBeUndefined();
  });

  it('a Live answer shown for the turn keeps the mark', () => {
    const t = mk();
    t.dispatched(7, 41);
    expect(t.ended(7, 'failed', 1, true)).toBeUndefined();
  });

  it('retry cap: a second failure for the same dedup entry does not un-mark again', () => {
    const t = mk();
    t.dispatched(7, 41);
    expect(t.ended(7, 'failed', 1, false)).toBe(41);
    t.dispatched(8, 41);                                  // the re-dispatch matched the same entry
    expect(t.ended(8, 'failed', 2, false)).toBeUndefined();
    t.dispatched(9, 42);                                  // a fresh entry is a new question
    expect(t.ended(9, 'failed', 3, false)).toBe(42);
  });

  it('a delivered answer is remembered across idle: dispatch, complete, a later supersede that fails does not un-mark', () => {
    const t = mk();
    t.dispatched(7, 41);
    expect(t.ended(7, 'completed', 1, false)).toBeUndefined();
    t.dispatched(7, 41);                                  // a later supersede of the same turn
    expect(t.ended(7, 'failed', 2, false)).toBeUndefined();
  });

  it('an end for a turn that was never dispatched through here is ignored', () => {
    const t = mk();
    expect(t.ended(5, 'failed', 1, false)).toBeUndefined();
    expect(t.ended(null, 'failed', 1, false)).toBeUndefined();
  });

  it('no dedup id (undefined) means nothing to un-mark', () => {
    const t = mk();
    t.dispatched(7, undefined);
    expect(t.ended(7, 'failed', 1, false)).toBeUndefined();
  });
});
