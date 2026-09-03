import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChipDeduper } from './ChipDeduper';

afterEach(() => {
  vi.useRealTimers();
});

describe('ChipDeduper', () => {
  it('admits the first chip for a question', () => {
    const d = new ChipDeduper();
    expect(d.admit({ question: 'How would you scale Postgres?', source: 'live' }).admitted).toBe(true);
  });

  it('rejects the same question arriving from the OTHER pipeline', () => {
    // The bug this exists to fix: whisper→Groq and the Live listener both hear
    // one spoken question and each broadcast their own chip.
    const d = new ChipDeduper();
    d.admit({ question: 'How would you scale out the database?', source: 'live' });
    const second = d.admit({
      question: 'How would you scale out the database?',
      source: 'whisper',
    });
    expect(second.admitted).toBe(false);
    expect(second.duplicateOfSource).toBe('live');
  });

  it('rejects a reworded near-duplicate above the similarity threshold', () => {
    const d = new ChipDeduper();
    d.admit({ question: 'Tell me about a time you failed at something.', source: 'whisper' });
    expect(
      d.admit({ question: 'Tell me about a time you failed at something?', source: 'live' }).admitted
    ).toBe(false);
  });

  it('rejects an STT fragment contained in an admitted chip', () => {
    const d = new ChipDeduper();
    d.admit({
      question: 'Can you explain Transformers? architecture.',
      source: 'whisper',
    });
    expect(d.admit({ question: 'architecture.', source: 'live' }).admitted).toBe(false);
  });

  it('admits a genuinely different question', () => {
    const d = new ChipDeduper();
    d.admit({ question: 'How would you scale Postgres?', source: 'live' });
    expect(
      d.admit({ question: 'Tell me about a conflict with a manager.', source: 'whisper' }).admitted
    ).toBe(true);
  });

  it('admits the same question again once the window has passed', () => {
    // Interviewers do re-ask. Suppressing forever would lose a real second ask.
    vi.useFakeTimers();
    const d = new ChipDeduper({ windowMs: 20_000 });
    d.admit({ question: 'How would you scale Postgres?', source: 'live' });
    vi.advanceTimersByTime(20_001);
    expect(
      d.admit({ question: 'How would you scale Postgres?', source: 'whisper' }).admitted
    ).toBe(true);
  });

  it('keeps the cache bounded', () => {
    const d = new ChipDeduper({ cacheSize: 3 });
    for (let i = 0; i < 5; i++) d.admit({ question: `question number ${i}`, source: 'live' });
    // The oldest entry fell out, so it is admissible again.
    expect(d.admit({ question: 'question number 0', source: 'live' }).admitted).toBe(true);
  });

  it('ignores blank questions rather than caching them', () => {
    const d = new ChipDeduper();
    expect(d.admit({ question: '   ', source: 'live' }).admitted).toBe(true);
    expect(d.admit({ question: 'a real question here', source: 'live' }).admitted).toBe(true);
  });

  it('reset clears history', () => {
    const d = new ChipDeduper();
    d.admit({ question: 'How would you scale Postgres?', source: 'live' });
    d.reset();
    expect(
      d.admit({ question: 'How would you scale Postgres?', source: 'whisper' }).admitted
    ).toBe(true);
  });
});

describe('ChipDeduper — answered mark and anchors (2026-09-02)', () => {
  it('a suppressed duplicate says whether the original was already answered', () => {
    const d = new ChipDeduper();
    const first = d.admit({ question: 'What is a Pod?', source: 'whisper' });
    expect(d.admit({ question: 'What is a Pod?', source: 'live' }).alreadyAnswered).toBe(false);
    d.markAnswered(first.id);
    expect(d.admit({ question: 'What is a Pod?', source: 'live' }).alreadyAnswered).toBe(true);
  });

  it('two detections anchored to the same transcript sentence are one question even when their texts differ', () => {
    const d = new ChipDeduper();
    const anchor = 'How would you handle a dataset that must be deleted on request for compliance?';
    d.admit({ question: anchor, source: 'whisper', anchor });
    const live = d.admit({
      question: 'How do you design a system where customer data must be deleted on request for co',
      source: 'live',
      anchor,
    });
    expect(live.admitted).toBe(false);
    expect(live.duplicateOfSource).toBe('whisper');
  });

  it('anchors only compare against anchors — an unrelated question with no anchor is still admitted', () => {
    const d = new ChipDeduper();
    d.admit({ question: 'What is a Pod?', source: 'whisper', anchor: 'What is a Pod?' });
    expect(d.admit({ question: 'How do you keep base images patched?', source: 'live' }).admitted).toBe(true);
  });
});

describe('ChipDeduper — markAnswered by identity, not a text re-search (R36 fix wave)', () => {
  it('admit() returns the id of the entry it created; markAnswered(id) targets exactly that entry', () => {
    const d = new ChipDeduper();
    const first = d.admit({ question: 'What is a Pod in Kubernetes?', source: 'whisper' });
    const second = d.admit({ question: 'How do Deployments handle a rollback?', source: 'live' });
    expect(first.id).toBeDefined();
    expect(second.id).toBeDefined();
    expect(second.id).not.toBe(first.id);

    // Mark the SECOND (more recently admitted) entry. The old implementation
    // re-searched the cache by text and returned the first entry in insertion
    // order that looked similar — i.e. it could mark the WRONG (earlier) one.
    // Identity removes the re-search entirely.
    d.markAnswered(second.id);

    expect(d.admit({ question: 'What is a Pod in Kubernetes?', source: 'whisper' }).alreadyAnswered).toBe(false);
    expect(d.admit({ question: 'How do Deployments handle a rollback?', source: 'live' }).alreadyAnswered).toBe(true);
  });

  it('a suppressed duplicate carries the id of the entry it duplicates, so markAnswered(verdict.id) marks the original', () => {
    const d = new ChipDeduper();
    const first = d.admit({ question: 'What is a Pod?', source: 'whisper' });
    const dup = d.admit({ question: 'What is a Pod?', source: 'live' });
    expect(dup.admitted).toBe(false);
    expect(dup.id).toBe(first.id);
    d.markAnswered(dup.id);
    expect(d.admit({ question: 'What is a Pod?', source: 'whisper' }).alreadyAnswered).toBe(true);
  });

  it('markAnswered(undefined) — the blank-question no-op case — does nothing', () => {
    const d = new ChipDeduper();
    const blank = d.admit({ question: '   ', source: 'whisper' });
    expect(blank.id).toBeUndefined();
    expect(() => d.markAnswered(blank.id)).not.toThrow();
  });
});

describe('ChipDeduper — containment ignores trailing punctuation (R36 fix wave)', () => {
  it('a trailing "?" vs "," mismatch no longer escapes containment (Run 1: SageMaker endpoint pair)', () => {
    // Run 1 evidence: "What is a SageMaker endpoint?" vs "What is a SageMaker
    // Endpoint, and what d…" escaped containment only because of the "?" —
    // the second question is extended here (vs. the brief's truncated example)
    // so Jaccard (0.33) stays well under the 0.7 threshold and cannot also
    // catch it — this test isolates the containment fix specifically.
    const d = new ChipDeduper();
    d.admit({ question: 'What is a SageMaker endpoint?', source: 'whisper' });
    expect(
      d.admit({
        question: 'What is a SageMaker Endpoint, and what does it do differently from a plain REST API deployment',
        source: 'live',
      }).admitted
    ).toBe(false);
  });
});
