import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Same import-time shims as LLMHelper.geminiThinking.test.ts (electron surface + Gemini SDK).
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
 * The SDK stream per call, in call order. A "silent" stream is what a Google-side stall
 * looks like from the app: the request is accepted and the first chunk never arrives
 * (s50h 2026-09-16: 44 s and 60 s to the first token on two technical answers).
 */
const plan: Array<'silent' | string[]> = [];
const generateContentStream = vi.fn(async (_params: { model: string; contents: unknown; config?: Record<string, unknown> }) => {
    const step = plan[generateContentStream.mock.calls.length - 1] ?? ['unplanned call'];
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

import { LLMHelper } from './LLMHelper';
import { VERBAL_WHAT_TO_ANSWER_PROMPT } from './llm/prompts';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

/** The technical route's exact call (WhatToAnswerLLM → streamChat with the verbal prompt). */
const technical = (helper: LLMHelper) =>
    helper.streamChat('how do you make ingestion idempotent', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false, 'gemini-3.1-flash-lite');

/**
 * Flight s50h (2026-09-16): two technical answers waited 44 s and 60 s for a first token and
 * the 4 s fallback never fired — it existed only on the behavioral route
 * (streamVerbalWithGeminiFlash); the 40 technical answers of every hour go through streamChat,
 * which raced nothing. Both routes now share one stall race.
 */
describe('a stalled primary on the technical verbal route falls back to the other Flash Lite', () => {
    const savedLevel = process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    const savedTimeout = process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS;
    // This file exercises the stall race, so it pins the hedge off with NATIVELY_VERBAL_HEDGE='0'.
    // The hedge is the shipped default since h40c (2026-09-29): left unset it takes these cases
    // through the hedge instead (h40c review M5 saw the same from a flight or smoke shell that
    // exported the flag, or a throw on a junk value).
    const savedHedge = process.env.NATIVELY_VERBAL_HEDGE;
    beforeEach(() => {
        vi.useFakeTimers();
        generateContentStream.mockClear();
        plan.length = 0;
        delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
        delete process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS;
        process.env.NATIVELY_VERBAL_HEDGE = '0';
    });
    afterEach(() => {
        vi.useRealTimers();
        if (savedLevel === undefined) delete process.env.NATIVELY_GEMINI_THINKING_LEVEL; else process.env.NATIVELY_GEMINI_THINKING_LEVEL = savedLevel;
        if (savedTimeout === undefined) delete process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS; else process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS = savedTimeout;
        if (savedHedge === undefined) delete process.env.NATIVELY_VERBAL_HEDGE; else process.env.NATIVELY_VERBAL_HEDGE = savedHedge;
    });

    it('at MINIMAL, primary silent for 4 s → the answer streams from gemini-3.5-flash-lite, announced by the fallback sentinel', async () => {
        process.env.NATIVELY_GEMINI_THINKING_LEVEL = 'MINIMAL';
        plan.push('silent', ['I would key every message ', 'by document id.']);
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(technical(helper));
        await vi.advanceTimersByTimeAsync(3999);
        expect(generateContentStream).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        const chunks = await out;
        expect(generateContentStream).toHaveBeenCalledTimes(2);
        expect(generateContentStream.mock.calls[0][0].model).toBe('gemini-3.1-flash-lite');
        expect(generateContentStream.mock.calls[1][0].model).toBe('gemini-3.5-flash-lite');
        // Same bytes to the fallback: the verbal prompt as systemInstruction, the question alone.
        expect(generateContentStream.mock.calls[1][0].config?.systemInstruction).toBe(generateContentStream.mock.calls[0][0].config?.systemInstruction);
        const text = chunks.join('');
        expect(text).toContain('__model_source:gemini-3.5-flash-lite (fallback)__');
        expect(text).toContain('I would key every message by document id.');
    });

    it('with LOW shipped, the fallback leg is sent HIGH — the level 3.5-flash-lite actually spends', async () => {
        // Flight s50j's one stall (2026-09-19 07:50) handed the answer to 3.5-flash-lite
        // carrying the shipped LOW, and the request logged `thinking=LOW thoughts=0`: that
        // model does not reliably honour LOW (two reps 2026-09-20: 0 and 146 thoughts, against
        // 1142/1430 at HIGH). So every stall was answered with no thinking at all — the primary
        // must keep LOW and the fallback must be raised, in the same request pair.
        plan.push('silent', ['fallback answer']);
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(technical(helper));
        await vi.advanceTimersByTimeAsync(10_000);
        await out;
        expect(generateContentStream).toHaveBeenCalledTimes(2);
        const [primary, fallback] = generateContentStream.mock.calls.map((c) => c[0]);
        expect(primary.model).toBe('gemini-3.1-flash-lite');
        expect((primary.config as any)?.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
        expect(fallback.model).toBe('gemini-3.5-flash-lite');
        expect((fallback.config as any)?.thinkingConfig).toEqual({ thinkingLevel: 'HIGH' });
    });

    it('an explicit MINIMAL stays MINIMAL on both legs — it is the opt-out, not a level to raise', async () => {
        process.env.NATIVELY_GEMINI_THINKING_LEVEL = 'MINIMAL';
        plan.push('silent', ['fallback answer']);
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(technical(helper));
        await vi.advanceTimersByTimeAsync(4000);
        await out;
        const [primary, fallback] = generateContentStream.mock.calls.map((c) => c[0]);
        expect((primary.config as any)?.thinkingConfig).toEqual({ thinkingLevel: 'MINIMAL' });
        expect((fallback.config as any)?.thinkingConfig).toEqual({ thinkingLevel: 'MINIMAL' });
    });

    it('primary answers in time → one call, no fallback', async () => {
        plan.push(['I would key every message by document id.']);
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(technical(helper));
        await vi.advanceTimersByTimeAsync(10_000);
        const chunks = await out;
        expect(generateContentStream).toHaveBeenCalledTimes(1);
        expect(chunks.join('')).toContain('I would key every message by document id.');
        expect(chunks.join('')).not.toContain('(fallback)');
    });

    it('with nothing set (LOW ships) the stall budget is 10 s: 4 s of silence is thinking, 10 s is a stall', async () => {
        // s50g (LOW): first token p50 5.1 s, p90 7.8 s — a 4 s race would have replaced most of
        // the hour's thinking answers with the fallback's default-level ones.
        plan.push('silent', ['fallback answer']);
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(technical(helper));
        await vi.advanceTimersByTimeAsync(9_999);
        expect(generateContentStream).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        await out;
        expect(generateContentStream).toHaveBeenCalledTimes(2);
    });

    it('NATIVELY_FIRST_TOKEN_TIMEOUT_MS overrides the budget (the live smoke forces the race with 300)', async () => {
        process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS = '300';
        plan.push('silent', ['fallback answer']);
        const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            await vi.advanceTimersByTimeAsync(300);
            await out;
            expect(generateContentStream).toHaveBeenCalledTimes(2);
            const line = log.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('stalled'));
            expect(line).toMatch(/\[LLMHelper\] gemini-3\.1-flash-lite stalled after 300ms — falling back to gemini-3\.5-flash-lite/);
        } finally {
            log.mockRestore();
        }
    });

    it('the behavioral route runs the same race with the same budget (one implementation): 4 s at MINIMAL', async () => {
        process.env.NATIVELY_GEMINI_THINKING_LEVEL = 'MINIMAL';
        plan.push('silent', ['tell me about a time']);
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(helper.streamVerbalWithGeminiFlash('tell me about a conflict', VERBAL_WHAT_TO_ANSWER_PROMPT));
        await vi.advanceTimersByTimeAsync(4000);
        const chunks = await out;
        expect(generateContentStream).toHaveBeenCalledTimes(2);
        expect(generateContentStream.mock.calls[1][0].model).toBe('gemini-3.5-flash-lite');
        expect(chunks.join('')).toContain('tell me about a time');
    });
});
