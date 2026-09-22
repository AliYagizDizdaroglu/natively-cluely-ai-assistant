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
 * as the SDK's does. Anything else is the chunks to stream.
 */
const plan: Array<'silent' | 'error' | string[]> = [];
const generateContentStream = vi.fn(async (_params: { model: string; contents: unknown; config?: Record<string, unknown> }) => {
    const step = plan[generateContentStream.mock.calls.length - 1] ?? ['unplanned call'];
    if (step === 'error') throw new Error('got status: 503 Service Unavailable');
    async function* stream() {
        if (step === 'silent') { await new Promise<never>(() => {}); return; }
        for (const text of step) yield { text: () => text };
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

    it('override off: a 503 on 3.1-lite still goes to 3.5-lite — the shipped pairing is unchanged', async () => {
        plan.push('error', ['Recovered.']);
        const chunks = await answer(TECHNICAL);
        expect(asked()).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
        expect(named(chunks)).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite (fallback)']);
    });
});
