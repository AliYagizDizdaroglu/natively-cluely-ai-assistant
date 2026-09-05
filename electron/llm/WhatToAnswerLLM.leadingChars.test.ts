import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/**
 * Gemini's opening chunk is regularly two characters ("I’", "So", "To" — measured on the
 * raw stream 2026-09-05). filterCodeFences kept a 3-character carry with a negative
 * slice, which dropped the first character of a shorter first chunk: 14 of 57 delivered
 * after6 answers began "’d start by…" (spec 2026-09-05 §4).
 */
function helperFor(chunks: string[]) {
    async function* stream(): AsyncGenerator<string> { for (const c of chunks) yield c; }
    return {
        streamChat: vi.fn(() => stream()),
        streamVerbalWithGeminiFlash: vi.fn(() => stream()),
        getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite'),
    } as any;
}
const VERBAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
async function spoken(chunks: string[]): Promise<string> {
    let out = '';
    for await (const c of new WhatToAnswerLLM(helperFor(chunks)).generateStream('[INTERVIEWER]: Walk me through it.', undefined, VERBAL)) out += c;
    return out.replace(/__model_source:[^_]*__/g, '');
}

describe('WhatToAnswerLLM keeps the first characters of a short opening chunk', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
        [['I’', 'd start by checking the metrics. Then I look at the logs.'], 'I’d start by checking the metrics. Then I look at the logs.'],
        [['So', ', my initial thought is to break this down. Then I test it.'], 'So, my initial thought is to break this down. Then I test it.'],
        [['To', ' manage the drift I treat infrastructure as code. Then I deploy.'], 'To manage the drift I treat infrastructure as code. Then I deploy.'],
        [['I', ' structure my pipelines carefully. Then I deploy them.'], 'I structure my pipelines carefully. Then I deploy them.'],
        [['I’d start by checking the metrics. Then I look at the logs.'], 'I’d start by checking the metrics. Then I look at the logs.'],
    ])('%j', async (chunks, expected) => {
        vi.spyOn(console, 'log').mockImplementation(() => { });
        expect(await spoken(chunks)).toBe(expected);
    });

    it('still suppresses a code fence and strips stray backticks', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        const out = await spoken(['I’', 'd do this first.\n', '```python\nprint(1)\n```\n', 'Then I would deploy it.']);
        expect(out.startsWith('I’d do this first.')).toBe(true);
        expect(out).not.toContain('`');
        expect(out).not.toContain('print(1)');
        expect(out).toContain('Then I would deploy it.');
    });
});
