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

const generateContentStream = vi.fn(async (_params: { model: string; contents: unknown; config?: Record<string, unknown> }) => {
    async function* stream() { yield { text: () => 'an answer.' }; }
    return stream();
});

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: { generateContentStream },
    })),
}));

import { LLMHelper } from './LLMHelper';
import { VERBAL_WHAT_TO_ANSWER_PROMPT } from './llm/prompts';
import { VERBAL_PRIMARY_MODEL_ENV } from './llm/verbalPrimaryModel';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    for await (const _ of gen) { /* consume */ }
}

/** The technical route's exact call — 39 of an hour's 40 answers take it. */
const technical = (helper: LLMHelper) =>
    helper.streamChat('how do you make ingestion idempotent', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false, 'gemini-3.1-flash-lite');

/**
 * Flight s50l measures gemini-3.5-flash-lite at HIGH as the PRIMARY answer model, which
 * s50k's band-vs-band read earned as a candidate (3.1 LOW 26/28/31 against 3.5 HIGH
 * 34/29/34 on the same captured bytes, a pass at exactly both thresholds with the bands
 * still overlapping). The swap rides an environment variable so the shipped default is
 * untouched until a proof flight earns it — the same route the thinking level took.
 */
describe('NATIVELY_VERBAL_PRIMARY_MODEL overrides the verbal answer model only', () => {
    const saved = process.env[VERBAL_PRIMARY_MODEL_ENV];
    const savedLevel = process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    beforeEach(() => {
        generateContentStream.mockClear();
        delete process.env[VERBAL_PRIMARY_MODEL_ENV];
        delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    });
    afterEach(() => {
        if (saved === undefined) delete process.env[VERBAL_PRIMARY_MODEL_ENV];
        else process.env[VERBAL_PRIMARY_MODEL_ENV] = saved;
        if (savedLevel === undefined) delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
        else process.env.NATIVELY_GEMINI_THINKING_LEVEL = savedLevel;
    });

    it('unset: the technical route answers on the selected model, exactly as today', async () => {
        const helper = new LLMHelper('AIzaTESTKEY');
        await drain(technical(helper));
        expect(generateContentStream.mock.calls[0][0].model).toBe('gemini-3.1-flash-lite');
    });

    it('set: the technical route answers on the override', async () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        const helper = new LLMHelper('AIzaTESTKEY');
        await drain(technical(helper));
        expect(generateContentStream.mock.calls[0][0].model).toBe('gemini-3.5-flash-lite');
    });

    it('set: the behavioral route answers on the override too', async () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        const helper = new LLMHelper('AIzaTESTKEY');
        await drain(helper.streamVerbalWithGeminiFlash('tell me about a time', VERBAL_WHAT_TO_ANSWER_PROMPT));
        expect(generateContentStream.mock.calls[0][0].model).toBe('gemini-3.5-flash-lite');
    });

    it('the overridden primary carries the level that model honours, not the raw LOW', async () => {
        // 3.5-lite ignores LOW (s50j caught it live: thoughts=0 on the one stall), so the
        // per-model table maps LOW to HIGH. If the override and that table ever disagree,
        // the flight measures an unthought model and reads it as a model difference.
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        const helper = new LLMHelper('AIzaTESTKEY');
        await drain(technical(helper));
        const cfg = generateContentStream.mock.calls[0][0].config as { thinkingConfig?: { thinkingLevel?: string } };
        expect(cfg?.thinkingConfig?.thinkingLevel).toBe('HIGH');
    });

    it('refuses a model it will not answer with rather than silently using the selected one', async () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lit';
        const helper = new LLMHelper('AIzaTESTKEY');
        await expect(drain(technical(helper))).rejects.toThrow(/NATIVELY_VERBAL_PRIMARY_MODEL/);
    });
});
