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
