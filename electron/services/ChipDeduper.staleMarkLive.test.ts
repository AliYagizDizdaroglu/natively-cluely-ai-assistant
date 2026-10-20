import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ChipDeduper } from './ChipDeduper';

// F3b (st25-smoke 2026-10-12T21-26-53, ST09): SQ01 "Tell me about yourself." was answered; +2.9 s a whisper
// re-emission was dropped (stale-mark), but +4.5 s a Live re-announcement of the same text (verdict=unverifiable)
// marked the open turn and SQ01 was answered a second time. F3's guard in main.ts was whisper-only.
const SQ01 = 'Tell me about yourself.';
const cand = (q: string, source: 'whisper' | 'live', anchor = q) => ({ question: q, source, anchor });

function answered(q: string) {
  let t = 0;
  const d = new ChipDeduper({ now: () => t });
  d.markAnswered(d.admit({ question: q, source: 'whisper', anchor: q }).id);
  return { d, at: (ms: number) => { t = ms; } };
}

describe('stale-mark guard applies to Live marks too', () => {
  it('main.ts guard has no source condition (the F3 defect: a whisper-only check) and logs the real source', () => {
    const src = readFileSync(join(__dirname, '..', 'main.ts'), 'utf8');
    const i = src.indexOf('this.chipDeduper.answeredDuplicate(');
    expect(i).toBeGreaterThan(0);
    const guardLine = src.slice(src.lastIndexOf('\n', i) + 1, src.indexOf('\n', i));
    expect(guardLine).not.toMatch(/source === 'whisper'/);
    const logLine = src.slice(i, src.indexOf('reason=${dup.reason}', i));
    expect(logLine).toContain('dispatch: drop source=${d.source}');
  });
  it('ST09: the Live re-announcement of SQ01 at +4.5 s is stale', () => {
    const { d, at } = answered(SQ01);
    at(4_480);
    expect(d.isAnsweredDuplicate(cand(SQ01, 'live'))).toBe(true);
  });
  it('a Live mark of a NEW question is not stale', () => {
    const { d, at } = answered(SQ01);
    at(4_480);
    expect(d.isAnsweredDuplicate(cand('How would you shard the orders table?', 'live'))).toBe(false);
  });
  it('F2a guard: a short Live follow-up after an answer is not stale', () => {
    const { d, at } = answered('How would you shard the orders table across regions?');
    at(6_000);
    expect(d.isAnsweredDuplicate(cand('Why that one?', 'live'))).toBe(false);
  });
  it('a Live re-announcement of an OLDER (not latest) answered question still marks', () => {
    let t = 0;
    const d = new ChipDeduper({ now: () => t });
    const ans = (q: string, at: number) => { t = at; d.markAnswered(d.admit({ question: q, source: 'whisper', anchor: q }).id); };
    ans(SQ01, 0);
    ans('How would you shard the orders table across regions?', 10_000);
    t = 20_000;
    expect(d.isAnsweredDuplicate(cand(SQ01, 'live'))).toBe(false);
  });
});
