import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Same import-time shims as LLMHelper.stallFallback.test.ts (electron surface + Gemini SDK).
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => 'C:/tmp'),
        getName: vi.fn(() => 'test'),
        on: vi.fn(),
    },
    safeStorage: {
        isEncryptionAvailable: () => false,
        encryptString: (s: string) => Buffer.from(s),
        decryptString: (b: Buffer) => b.toString(),
    },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

/**
 * The SDK per call, in call order. 'silent' is a Google-side stall: the request is accepted and
 * the first chunk never arrives. 'error' is a 503 before any token: the request itself rejects,
 * as the SDK's does. { thenFail } streams its chunks and then drops the connection. { heldOpen }
 * streams its chunks but, like the real SDK response (LLMHelper.abortOnClose.test.ts, measured
 * 2026-09-05), only lets a close complete once the request's signal aborts. Anything else is the
 * chunks to stream.
 */
const plan: Array<'silent' | 'error' | string[] | { thenFail: string[] } | { heldOpen: string[] }> = [];
/** The abort signal each SDK call was given, in call order. */
const signals: Array<AbortSignal | null> = [];
const generateContentStream = vi.fn(async (params: { model: string; contents: unknown; config?: Record<string, unknown> }) => {
    const step = plan[generateContentStream.mock.calls.length - 1] ?? ['unplanned call'];
    const signal = (params.config?.abortSignal as AbortSignal | undefined) ?? null;
    signals.push(signal);
    if (step === 'error') throw new Error('got status: 503 Service Unavailable');
    const streamed = step;   // typed without 'error', which the closure below would otherwise forget
    async function* stream() {
        if (streamed === 'silent') { await new Promise<never>(() => {}); return; }
        if ('thenFail' in streamed) {
            for (const text of streamed.thenFail) yield { text: () => text };
            throw new Error('socket hang up');
        }
        if ('heldOpen' in streamed) {
            try {
                for (const text of streamed.heldOpen) yield { text: () => text };
            } finally {
                await new Promise<void>((resolve) => {
                    if (!signal) return;   // no signal: the close never completes
                    if (signal.aborted) { resolve(); return; }
                    signal.addEventListener('abort', () => resolve(), { once: true });
                });
            }
            return;
        }
        for (const text of streamed) yield { text: () => text };
    }
    return stream();
});

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: { generateContentStream },
    })),
}));

import { LLMHelper } from '../LLMHelper';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';
import { VERBAL_PRIMARY_MODEL_ENV } from './verbalPrimaryModel';

const TECHNICAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
const BEHAVIORAL = { intent: 'behavioral', confidence: 0.9, answerShape: '' } as any;

async function drain(gen: AsyncGenerator<string>): Promise<string[]> {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

/** The real WhatToAnswerLLM over the real LLMHelper — only the SDK is stood in for. */
const answer = (intent: unknown) =>
    drain(new WhatToAnswerLLM(new LLMHelper('fake-gemini-key')).generateStream('How do you make ingestion idempotent?', undefined, intent as any));

/** The models the SDK was actually asked, in order. */
const asked = () => generateContentStream.mock.calls.map((c) => c[0].model);
/** Every name the bar under the answer was given, in order — it shows the last one. */
const named = (chunks: string[]) => chunks.flatMap((c) => [...c.matchAll(/__model_source:([^_]+)__/g)].map((m) => m[1]));

/**
 * Flights s50l and s50m answered on gemini-3.5-flash-lite through NATIVELY_VERBAL_PRIMARY_MODEL,
 * and three things about that model's name were wrong, all of them silently:
 *  - the bar under every answer said gemini-3.1-flash-lite, because generateStream named the
 *    selected model while LLMHelper answered on the override;
 *  - the stall race's switch never reached the bar: LLMHelper announces it as the head sentinel
 *    of the stream it hands back, and stripModelSentinel strips head sentinels. s50m's
 *    verbal-diag.log shows all four of the hour's switches stripped within 2 ms of the stall;
 *  - a 503 before the first token was "redirected" to 3.5-lite again, because the error fallback
 *    named a constant and streamVerbalWithGeminiFlash re-resolved it through the override, which
 *    ignores what it is given. A second 503 meant no answer at all.
 */
describe('the answer is named after, and falls back from, the model that actually answered', () => {
    const savedModel = process.env[VERBAL_PRIMARY_MODEL_ENV];
    const savedLevel = process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    beforeEach(() => {
        generateContentStream.mockClear();
        plan.length = 0;
        signals.length = 0;
        delete process.env[VERBAL_PRIMARY_MODEL_ENV];
        // The shipped LOW, so the stall budget is the shipped 10 s.
        delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    });
    afterEach(() => {
        vi.useRealTimers();
        if (savedModel === undefined) delete process.env[VERBAL_PRIMARY_MODEL_ENV]; else process.env[VERBAL_PRIMARY_MODEL_ENV] = savedModel;
        if (savedLevel === undefined) delete process.env.NATIVELY_GEMINI_THINKING_LEVEL; else process.env.NATIVELY_GEMINI_THINKING_LEVEL = savedLevel;
    });

    it('override on: the technical route names the model it calls', async () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        plan.push(['Key every write by document id.']);
        const chunks = await answer(TECHNICAL);
        expect(asked()).toEqual(['gemini-3.5-flash-lite']);
        expect(named(chunks)).toEqual(['gemini-3.5-flash-lite']);
    });

    it('override on: the behavioral route names the model it calls', async () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        plan.push(['I asked for the data first.']);
        const chunks = await answer(BEHAVIORAL);
        expect(asked()).toEqual(['gemini-3.5-flash-lite']);
        expect(named(chunks)).toEqual(['gemini-3.5-flash-lite']);
    });

    it('a stall switch reaches the bar, ahead of the words the other model wrote', async () => {
        vi.useFakeTimers();
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        plan.push('silent', ['The other model answered.']);
        const out = answer(TECHNICAL);
        await vi.advanceTimersByTimeAsync(10_000);
        const chunks = await out;
        expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
        expect(named(chunks)).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite (fallback)']);
        const switched = chunks.indexOf('__model_source:gemini-3.1-flash-lite (fallback)__');
        expect(switched).toBeGreaterThan(-1);
        expect(switched).toBeLessThan(chunks.findIndex((c) => c.includes('other model')));
    });

    it('override on: a 503 on 3.5-lite is answered by 3.1-lite, and the bar says so', async () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        plan.push('error', ['Recovered on the other model.']);
        const chunks = await answer(TECHNICAL);
        expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
        expect(named(chunks)).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite (fallback)']);
        expect(chunks.join('')).toContain('Recovered on the other model.');
    });

    it('override on: when the fallback fails too, the message names the fallback that was tried', async () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        plan.push('error', 'error');
        const text = (await answer(TECHNICAL)).join('');
        expect(text).toContain('both the primary model and the gemini-3.1-flash-lite fallback failed');
    });

    it('a failure after the first words names no fallback — none ran', async () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        plan.push({ thenFail: ['The first words reached the screen. '] });
        const text = (await answer(TECHNICAL)).join('');
        expect(asked()).toEqual(['gemini-3.5-flash-lite']);
        expect(text).toContain('socket hang up');
        expect(text).not.toContain('fallback failed');
    });

    it('when the model the stall race switched to fails too, the error fallback goes back to the other one', async () => {
        vi.useFakeTimers();
        plan.push('silent', 'error', ['Third request, first answer.']);
        const out = answer(TECHNICAL);
        await vi.advanceTimersByTimeAsync(10_000);
        const chunks = await out;
        expect(asked()).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
        expect(named(chunks).at(-1)).toBe('gemini-3.1-flash-lite (fallback)');
        expect(chunks.join('')).toContain('Third request, first answer.');
    });

    it('override on, Gemma selected: the label keeps the Gemma name — the override never reaches that route', async () => {
        // streamChat answers a Gemma selection before its Gemini branch reads the override, so
        // only a Gemini name may pass through the resolver. A stand-in helper, because the real
        // setModel('gemma-…') fires warm-up requests that would muddle the SDK's call order.
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        async function* gemmaAnswer() { yield 'A Gemma answer.'; }
        const helper = { streamChat: vi.fn(gemmaAnswer), streamVerbalWithGeminiFlash: vi.fn(), getCurrentModelId: () => 'gemma-4-31b-it' } as any;
        const chunks = await drain(new WhatToAnswerLLM(helper).generateStream('How do you make ingestion idempotent?', undefined, TECHNICAL));
        expect(named(chunks)).toEqual(['gemma-4-31b-it']);
    });

    it('closing the answer early still aborts the request, through the stall-switch layer', async () => {
        // The word budget's cut and a superseding generation both close the stream early, and
        // the SDK releases a request only when its signal aborts. nameStallSwitch and its watch()
        // now sit on that path, so the close has to travel through both. Closed on the second
        // words: the first is hand-yielded by the stall race outside its delegation, a known gap.
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        plan.push({ heldOpen: ['I ', 'would ', 'key ', 'every ', 'write ', 'by ', 'document ', 'id ', 'and ', 'skip it.'] });
        const answerStream = new WhatToAnswerLLM(new LLMHelper('fake-gemini-key')).generateStream('How do you make ingestion idempotent?', undefined, TECHNICAL);
        let timer: NodeJS.Timeout | undefined;
        const loop = (async () => {
            let words = 0;
            for await (const chunk of answerStream) if (!/^__model_source:/.test(chunk) && ++words === 2) break;
            return 'closed' as const;
        })();
        // Real timers: a close waiting on an un-aborted request loses this race.
        const raced = await Promise.race([loop, new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), 500); })]);
        clearTimeout(timer!);
        expect(raced).toBe('closed');
        expect(signals[0]?.aborted).toBe(true);
    });

    it('override off: a 503 on 3.1-lite still goes to 3.5-lite — the shipped pairing is unchanged', async () => {
        plan.push('error', ['Recovered.']);
        const chunks = await answer(TECHNICAL);
        expect(asked()).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
        expect(named(chunks)).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite (fallback)']);
    });
});
