import { describe, it, expect, vi } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/**
 * Covers naming the answering model on EVERY verbal stream (2026-09-02), not
 * only on a fallback redirect — the bar under the answer used to guess the
 * label from intent; now the stream itself announces it as the first chunk.
 */

async function* fromChunks(chunks: string[]): AsyncGenerator<string> {
    for (const c of chunks) yield c;
}

/** Minimal LLMHelper stand-in — only what the verbal path calls. */
function makeHelper(opts: {
    streamChat?: () => AsyncGenerator<string>;
    streamVerbalWithGeminiFlash?: () => AsyncGenerator<string>;
    getCurrentModelId?: () => string;
}) {
    return {
        streamChat: vi.fn(opts.streamChat ?? (() => fromChunks(['Answer text.']))),
        streamVerbalWithGeminiFlash: vi.fn(opts.streamVerbalWithGeminiFlash ?? (() => fromChunks(['Answer text.']))),
        getCurrentModelId: vi.fn(opts.getCurrentModelId ?? (() => 'fake-deep-model-9')),
    } as any;
}

async function drain(gen: AsyncGenerator<string>): Promise<string[]> {
    const out: string[] = [];
    for await (const c of gen) out.push(c);
    return out;
}

describe('verbal stream model sentinel', () => {
    it('announces the primary model at the head of the general (verbal-technical) route', async () => {
        const helper = makeHelper({
            streamChat: () => fromChunks(['Answer text.']),
            getCurrentModelId: () => 'fake-deep-model-9',
        });
        const llm = new WhatToAnswerLLM(helper);
        const intentResult = { intent: 'general', confidence: 0.9, answerShape: '' } as any;

        const out = await drain(llm.generateStream('Explain Docker layers.', undefined, intentResult));

        expect(out[0]).toBe('__model_source:fake-deep-model-9__');
        expect(out.join('')).toContain('Answer text.');
    });

    it('announces the fixed fast model at the head of the behavioral route', async () => {
        const helper = makeHelper({
            streamVerbalWithGeminiFlash: () => fromChunks(['Answer text.']),
        });
        const llm = new WhatToAnswerLLM(helper);
        const intentResult = { intent: 'behavioral', confidence: 0.9, answerShape: '' } as any;

        const out = await drain(llm.generateStream('Tell me about a time you disagreed with a teammate.', undefined, intentResult));

        expect(out[0]).toBe('__model_source:gemini-3.1-flash-lite__');
        expect(out.join('')).toContain('Answer text.');
    });
});
