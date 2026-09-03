import { describe, it, expect, vi } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';
import { GEMINI_FLASH_FALLBACK_MODEL } from '../LLMHelper';

/**
 * Covers the verbal fallback redirect added 2026-09-01.
 *
 * The states that matter are not "does it fall back" but the ones nobody
 * exercises: failure AFTER tokens have shipped (must NOT restart), the
 * one-callback-per-stream contract when two streams run, and whether the
 * redirect is actually announced rather than silently swapped.
 */

async function* fromChunks(chunks: string[]): AsyncGenerator<string> {
    for (const c of chunks) yield c;
}
async function* failsImmediately(msg: string): AsyncGenerator<string> {
    throw new Error(msg);
    // eslint-disable-next-line no-unreachable
    yield '';
}
async function* failsAfter(chunks: string[], msg: string): AsyncGenerator<string> {
    for (const c of chunks) yield c;
    throw new Error(msg);
}

/** Minimal LLMHelper stand-in — only the methods the verbal path calls. */
function makeHelper(opts: {
    streamChat: () => AsyncGenerator<string>;
    verbal?: () => AsyncGenerator<string>;
}) {
    const verbalCalls: any[] = [];
    return {
        helper: {
            streamChat: vi.fn(opts.streamChat),
            streamVerbalWithGeminiFlash: vi.fn((...args: any[]) => {
                verbalCalls.push(args);
                return (opts.verbal ?? (() => fromChunks(['fallback answer.'])))();
            }),
            // generateStream names the model at the head of every verbal stream now
            // (2026-09-02), not only on redirect — every case here goes through the
            // deep-model branch, which reads this unconditionally.
            getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite'),
        } as any,
        verbalCalls,
    };
}

async function drain(gen: AsyncGenerator<string>): Promise<string> {
    let out = '';
    for await (const c of gen) out += c;
    return out;
}

const VERBAL_INTENT = { intent: 'general', confidence: 0.9, answerShape: '' } as any;

describe('verbal fallback redirect', () => {
    it('falls back when the primary fails before any content', async () => {
        const { helper, verbalCalls } = makeHelper({
            streamChat: () => failsImmediately('HTTP 429 rate limit'),
        });
        const llm = new WhatToAnswerLLM(helper);
        const out = await drain(llm.generateStream('Explain Docker layers.', undefined, VERBAL_INTENT));

        expect(out).toContain('fallback answer');
        expect(verbalCalls.length).toBe(1);
        // 4th arg is the primaryModel override — the fallback must be the 3.5 model.
        expect(verbalCalls[0][3]).toBe(GEMINI_FLASH_FALLBACK_MODEL);
    });

    it('announces the redirect instead of swapping models silently', async () => {
        const { helper } = makeHelper({
            streamChat: () => failsImmediately('boom'),
        });
        const llm = new WhatToAnswerLLM(helper);
        const out = await drain(llm.generateStream('Explain Docker layers.', undefined, VERBAL_INTENT));

        // The sentinel must survive to the consumer; if the filter chain ate it,
        // the UI would keep showing the primary and the redirect would be silent.
        expect(out).toContain(`__model_source:${GEMINI_FLASH_FALLBACK_MODEL} (fallback)__`);
    });

    it('does NOT restart after content has already shipped', async () => {
        const { helper, verbalCalls } = makeHelper({
            streamChat: () => failsAfter(['A container is a running instance'], 'socket hang up'),
        });
        const llm = new WhatToAnswerLLM(helper);
        const out = await drain(llm.generateStream('Explain Docker layers.', undefined, VERBAL_INTENT));

        // Restarting here would make the reader watch the answer begin twice.
        expect(verbalCalls.length).toBe(0);
        expect(out).not.toContain('fallback answer');
        expect(out).toContain('socket hang up');
    });

    it('surfaces the real cause when the fallback ALSO fails', async () => {
        const { helper } = makeHelper({
            streamChat: () => failsImmediately('primary died'),
            verbal: () => failsImmediately('fallback died too'),
        });
        const llm = new WhatToAnswerLLM(helper);
        const out = await drain(llm.generateStream('Explain Docker layers.', undefined, VERBAL_INTENT));

        expect(out).toContain('fallback died too');
        // The old blanket message read as a genuine request to repeat.
        expect(out).not.toContain('Could you repeat that');
    });

    it('emits onSuggestions exactly once even though two streams ran', async () => {
        const { helper } = makeHelper({
            streamChat: () => failsImmediately('boom'),
        });
        const llm = new WhatToAnswerLLM(helper);
        const onSuggestions = vi.fn();
        // arity matters: (transcript, temporalContext, intentResult, imagePaths,
        // forceFastModel, onSuggestions) — passing the callback one slot early
        // lands it in forceFastModel and silently routes to the fast path.
        await drain(llm.generateStream('Explain Docker layers.', undefined, VERBAL_INTENT, undefined, false, onSuggestions));

        expect(onSuggestions).toHaveBeenCalledTimes(1);
    });

    it('leaves the healthy path untouched — no fallback redirect', async () => {
        const { helper, verbalCalls } = makeHelper({
            streamChat: () => fromChunks(['A container is a running instance of an image.']),
        });
        const llm = new WhatToAnswerLLM(helper);
        const out = await drain(llm.generateStream('Explain Docker layers.', undefined, VERBAL_INTENT));

        expect(verbalCalls.length).toBe(0);
        expect(out).toContain('running instance');
        // The primary model IS now announced (every verbal stream does that);
        // only a fallback-tagged sentinel would mean a redirect happened.
        expect(out).not.toContain('(fallback)');
    });
});
