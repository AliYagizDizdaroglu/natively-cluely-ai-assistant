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
