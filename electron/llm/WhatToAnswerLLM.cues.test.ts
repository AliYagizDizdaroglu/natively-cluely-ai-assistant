import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/**
 * Cue mode (spec 2026-09-20 §4): the cue block is stripped innermost, right after the
 * model-source strip, so only prose reaches the word counter, the output and the log.
 * Prose words are chosen with no digits or notation so the later filters are inert.
 */
const PROSE = 'Ten million vectors take about thirty gigabytes. Quantizing to int eight cuts that to about seven and a half.';
const RAW = `__CUES__\n1| thirty gigabytes in float32\n2| int8, then shard\n${PROSE}`;
const words = (s: string) => (s.match(/\S+/g) ?? []).length;

function makeHelper(text: string, size = 5) {
    async function* stream(): AsyncGenerator<string> { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); }
    return { streamChat: vi.fn(() => stream()), streamVerbalWithGeminiFlash: vi.fn(() => stream()), getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite') } as any;
}
async function drain(gen: AsyncGenerator<string>): Promise<string> {
    let out = '';
    for await (const c of gen) out += c;
    return out.replace(/__model_source:[^_]*__/g, '');
}
const VERBAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
const CODING = { intent: 'coding', confidence: 0.9, answerShape: '' } as any;
const run = (helper: any, intent: any, onCues: any) =>
    new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: How much memory?', undefined, intent, undefined, undefined, undefined, undefined, onCues);

describe('WhatToAnswerLLM cue block', () => {
    afterEach(() => vi.restoreAllMocks());

    it('verbal: the block never reaches the output, the cues arrive once, the budget line counts prose only', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const onCues = vi.fn();
        const out = await drain(run(makeHelper(RAW), VERBAL, onCues));
        expect(out).not.toContain('__CUES__');
        expect(out).not.toContain('1|');
        expect(out.trim()).toBe(PROSE);
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith(['thirty gigabytes in float32', 'int8, then shard']);
        expect(logs).toContain(`[Answer] budget: words=${words(PROSE)} cut=no allowance=no`);
    });

    it('verbal, no block: the answer is unchanged and the callback still fires once, empty', async () => {
        const onCues = vi.fn();
        const out = await drain(run(makeHelper(PROSE), VERBAL, onCues));
        expect(out.trim()).toBe(PROSE);
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith([]);
    });

    it('coding: no filter chain and no cue callback — the engine never waits on it', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const onCues = vi.fn();
        await drain(run(makeHelper('def f():\n    return 1\n'), CODING, onCues));
        expect(onCues).not.toHaveBeenCalled();
    });

    it('offers block BEFORE the spoken answer (spec 2026-09-30 offers-before-answer): the cues once, the answer shown, the offers once, neither block in the output', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});   // the guard's one line per leading block
        const onCues = vi.fn(), onSuggestions = vi.fn();
        // invented text of the saved shape: the cue block, the offers block, a blank line, one paragraph
        const helper = makeHelper(`__CUES__\n1| thirty gigabytes in float32\n__MORE__\n1| int8 quantization trade-offs\n2| sharding across nodes\n\n${PROSE}`);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: How much memory?', undefined, VERBAL, undefined, undefined, onSuggestions, undefined, onCues));
        expect(out.trim()).toBe(PROSE);                                   // today '': the whole answer was thrown away as "the block"
        expect(out).not.toContain('__MORE__');
        expect(out).not.toContain('1|');
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith(['thirty gigabytes in float32']);
        expect(onSuggestions).toHaveBeenCalledTimes(1);
        expect(onSuggestions).toHaveBeenCalledWith([{ n: 1, label: 'int8 quantization trade-offs' }, { n: 2, label: 'sharding across nodes' }]);
    });
});
