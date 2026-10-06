import { describe, it, expect } from 'vitest';
import fixtures from './fixtures/router40-answers.json';
import { completeFirstWord, routeFirstWord, checkCompleted, isHardWord, decisionRoute, showablePrefix } from './routeReader';

describe('routeReader on router40\'s 47 real outputs (spec 9.1, binding counts)', () => {
  const read = fixtures.map((f: any) => ({ ...f, fw: completeFirstWord(f.text, true)!, r: routeFirstWord(completeFirstWord(f.text, true)!) }));
  it('27 hard, all one-token; 25 clean, 2 garbled (RH08, RH10)', () => {
    const hard = read.filter((x) => x.r.route === 'hard');
    expect(hard).toHaveLength(27);
    expect(hard.every((x) => x.text.trim().split(/\s+/).length === 1)).toBe(true);
    expect(hard.filter((x) => x.r.reason === 'garbled-hard').map((x) => x.id).sort()).toEqual(['RH08', 'RH10']);
  });
  it('20 live: the 19 EASY answers (RE18 included) plus RH05, all checkCompleted ok, 30-71 words', () => {
    const live = read.filter((x) => x.r.route === 'live');
    expect(live).toHaveLength(20);
    expect(live.filter((x) => x.route === 'EASY')).toHaveLength(19);
    expect(live.map((x) => x.id)).toContain('RE18');
    expect(live.map((x) => x.id)).toContain('RH05');
    for (const x of live) { const c = checkCompleted(x.text, true, true); expect(c.ok, x.id).toBe(true); expect(c.words).toBeGreaterThanOrEqual(30); expect(c.words).toBeLessThanOrEqual(71); }
  });
});

describe('routeReader edge cases (spec 9.1)', () => {
  it.each(['hard.hard', '"hard"', 'Hard.', 'hardhard', 'hard".hard".hard', 'hard'])('%s is a hard word', (w) => expect(isHardWord(w)).toBe(true));
  it('hardware is not a hard word', () => expect(isHardWord('hardware')).toBe(false));
  it('"hard" as the 36th word does not route hard', () => {
    const t = Array.from({ length: 35 }, (_, i) => `w${i}`).join(' ') + ' hard and more words here';
    expect(routeFirstWord(completeFirstWord(t, true)!).route).toBe('live');
  });
  it('a first word split across chunks is not complete until whitespace or end', () => {
    expect(completeFirstWord('Mut', false)).toBeNull();
    expect(completeFirstWord('Mutable is', false)).toBe('Mutable');
    expect(completeFirstWord('hard', false)).toBeNull();
    expect(completeFirstWord('hard', true)).toBe('hard');
    expect(completeFirstWord('', true)).toBeNull();
  });
  it('markers', () => {
    for (const t of ['a <b> c d e f g h', 'x [y] z a b c d e', 'one __CUES__ two three four five six seven']) expect(checkCompleted(t, true, true).reason).toBe('marker');
  });
  it('7/8/80/81 words', () => {
    const w = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
    expect(checkCompleted(w(7), true, true).reason).toBe('too-short');
    expect(checkCompleted(w(8), true, true).ok).toBe(true);
    expect(checkCompleted(w(80), true, true).ok).toBe(true);
    expect(checkCompleted(w(81), true, true).reason).toBe('too-long');
    expect(checkCompleted(w(81), false, false).reason).toBe('too-long');  // decidable while streaming
    expect(checkCompleted(w(7), false, false).ok).toBe(true);             // too-short only once ended
  });
  it('cut text', () => {
    const t = Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ');
    expect(checkCompleted(t, false, true).reason).toBe('incomplete');
    expect(checkCompleted(t, false, true, true).reason).toBe('incomplete-after-show');
  });
  it('Heart. is row 4 too-short and routes live, never hard', () => {
    expect(isHardWord('Heart.')).toBe(false);
    expect(checkCompleted('Heart.', true, true).reason).toBe('too-short');
    expect(decisionRoute('Heart.', true, true)).toBe('invalid');
  });
  it('decisionRoute', () => {
    expect(decisionRoute('hard', true, true)).toBe('hard');
    expect(decisionRoute('', true, true)).toBe('invalid');
  });
  it('showablePrefix stops before the marker token and at the 81st word; streaming shows complete tokens only (Review Focus 3)', () => {
    expect(showablePrefix('alpha beta __fo', false)).toEqual({ prefix: 'alpha beta ', stop: null });
    expect(showablePrefix('alpha beta __foo__ gamma', false)).toEqual({ prefix: 'alpha beta ', stop: 'marker' });
    const w81 = Array.from({ length: 81 }, (_, i) => `w${i}`).join(' ');
    expect(showablePrefix(w81, true).prefix.trim().split(/\s+/)).toHaveLength(80);
    expect(showablePrefix(w81, true).stop).toBe('too-long');
    expect(showablePrefix('alpha beta', true)).toEqual({ prefix: 'alpha beta', stop: null });
  });
});
