import { describe, it, expect } from 'vitest';
import { stripSpokenNotation } from './verbalStreamFilter';

/**
 * MEASURED DEFECT: notation reaches the spoken answer, where a TTS layer reads
 * it out literally. Three independent sightings, always on the most technical
 * answers, because that is where notation lives:
 *   2026-08-24  "$O(\log n)$"        -> "dollar sign O of backslash log n"
 *   2026-08-25  "**fastest**"        -> markdown bold in speech
 *   2026-08-25  "`ModelLatency`"     -> "backtick ModelLatency backtick"
 *
 * The last one landed in the single best answer of a 13-question MLOps run —
 * the SageMaker p99 answer that correctly named ModelLatency vs OverheadLatency.
 *
 * This runs AFTER stripSuggestionBlock so it can never damage the __MORE__
 * sentinel, and it must survive chunk boundaries: a lone '*' or '$' at the end
 * of a chunk needs the next chunk before it can be judged.
 */
async function* chunks(...cs: string[]) { for (const c of cs) yield c; }
async function drain(src: AsyncGenerator<string>) {
    let out = ''; for await (const c of src) out += c; return out;
}
const strip = (...cs: string[]) => drain(stripSpokenNotation(chunks(...cs)));

describe('stripSpokenNotation', () => {
    it('removes backticks around identifiers', async () => {
        expect(await strip('isolate `ModelLatency` from `OverheadLatency`'))
            .toBe('isolate ModelLatency from OverheadLatency');
    });

    it('unwraps LaTeX math into speakable text', async () => {
        expect(await strip('This runs in $O(\\log n)$ time.'))
            .toBe('This runs in O(log n) time.');
    });

    it('removes markdown bold and italic markers', async () => {
        expect(await strip('Use the **fastest** path here.'))
            .toBe('Use the fastest path here.');
    });

    it('KEEPS currency — $5 is spoken correctly and must survive', async () => {
        expect(await strip('It costs about $5 per million tokens.'))
            .toBe('It costs about $5 per million tokens.');
    });

    it('leaves clean prose untouched', async () => {
        const s = 'An index lets the engine jump straight to the rows it needs.';
        expect(await strip(s)).toBe(s);
    });

    it('survives a chunk boundary inside a bold marker', async () => {
        expect(await strip('Use the *', '*fastest** path.')).toBe('Use the fastest path.');
    });

    it('survives a chunk boundary immediately before a LaTeX open', async () => {
        expect(await strip('Runs in $', 'O(n)$ time.')).toBe('Runs in O(n) time.');
    });

    it('survives a chunk boundary inside a backslash command', async () => {
        expect(await strip('in $O(\\', 'log n)$ time.')).toBe('in O(log n) time.');
    });

    it('emits a trailing held-back character rather than swallowing it', async () => {
        // A stream ending on a lone '$' must still surface it, not drop it.
        expect(await strip('costs $')).toBe('costs $');
    });

    it('never touches the suggestions sentinel (it runs after the block is stripped)', async () => {
        // Defensive: even if a sentinel remnant reached this stage, underscores
        // are not part of the notation set.
        expect(await strip('__MORE__')).toBe('__MORE__');
    });
});

/**
 * MEASURED DEFECT, flight s50k (2026-09-20): gemini-3.5-flash-lite at HIGH typeset every
 * number in the arithmetic answer as LaTeX, and two of three reps reached the spoken text
 * still carrying dollar signs:
 *
 *   model wrote   "a population of $100,000$ and a $9.5\%$ churn rate"
 *   filter gave   "a population of $100,000 and a 9.5% churn rate"
 *   spoken as     "a population of DOLLAR one hundred thousand"
 *
 * Root cause: the opening "$" of a wrapped number is indistinguishable from money by
 * lookahead alone ("$100,000" is exactly how money looks), so the rule kept it while
 * "(?<=\S)\$" removed the closing one. The pair is the signal money never has: real
 * money carries no closing delimiter. The hold must therefore span the whole number —
 * commas included — so both delimiters are judged in one span.
 *
 * 3.1-lite leaked nothing in 117 answers; this is the hazard that comes with the model,
 * which is why it is fixed before 3.5 answers a flight as primary.
 */
describe('stripSpokenNotation — LaTeX-typeset numbers (flight s50k)', () => {
    it('strips BOTH delimiters from a wrapped number', async () => {
        expect(await strip('a population of $100,000$ and more'))
            .toBe('a population of 100,000 and more');
    });

    it('strips them when the text arrives one character at a time', async () => {
        // The offline arm feeds the filter char by char because that is the
        // adversarial chunking the live stream can produce.
        const src = 'a population of $100,000$ and more';
        expect(await strip(...src.split(''))).toBe('a population of 100,000 and more');
    });

    it('speaks a wrapped fraction instead of leaking "frac"', async () => {
        expect(await strip('a recall of $\\frac{3,000}{9,500}$, or 31.5%'))
            .toBe('a recall of 3,000 over 9,500, or 31.5%');
    });

    it('clears the real s50k answer of every notation artifact', async () => {
        const raw = 'With a population of $100,000$ and a $9.5\\%$ churn rate, there are '
            + '$9,500$ actual churners. That gives a recall of $\\frac{3,000}{9,500}$, '
            + 'or about $31.5\\%$.';
        const out = await strip(...raw.split(''));
        expect(out).not.toMatch(/[$\\]/);
        expect(out).not.toContain('frac');
        expect(out).toContain('population of 100,000');
        expect(out).toContain('9.5% churn rate');
        expect(out).toContain('3,000 over 9,500');
    });

    it('KEEPS money that has no closing delimiter, commas and all', async () => {
        // The calibration case: without a closing "$" this is currency, and the
        // rule must not touch it. If this ever fails, the fix has gone too far.
        expect(await strip('that saves about $100,000 a year'))
            .toBe('that saves about $100,000 a year');
        expect(await strip('it costs $1,250.50 per month'))
            .toBe('it costs $1,250.50 per month');
    });
});
