import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Same import-time shims as LLMHelper.geminiSystemInstruction.test.ts (electron surface + Gemini SDK).
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
    async function* stream() {
        yield { text: () => 'With 100,000 subscribers ' };
        // The SDK delivers usage on the last chunk; thoughtsTokenCount is present only when
        // the model actually thought (probe 2026-09-15: absent at MINIMAL, 143/782 at LOW).
        yield { text: () => 'we have 9,500 churners.', usageMetadata: { promptTokenCount: 5157, candidatesTokenCount: 160, thoughtsTokenCount: 143, totalTokenCount: 5460 } };
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

/**
 * Flights s50b–s50f all ran the verbal answer at the provider's default thinking level
 * (MINIMAL on gemini-3.1-flash-lite: zero thought tokens). Flights s50g/s50h fly the same
 * hour at LOW and MEDIUM. The level rides on the environment so the launcher sets it, the
 * request carries it, and every answer's usage line in the log proves the model honoured it.
 */
describe('verbal Gemini call carries the thinking level from NATIVELY_GEMINI_THINKING_LEVEL', () => {
    const saved = process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    beforeEach(() => { generateContentStream.mockClear(); delete process.env.NATIVELY_GEMINI_THINKING_LEVEL; });
    afterEach(() => { if (saved === undefined) delete process.env.NATIVELY_GEMINI_THINKING_LEVEL; else process.env.NATIVELY_GEMINI_THINKING_LEVEL = saved; });

    it('unset → no thinkingConfig on the request (what every flight so far sent)', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        await drain(helper.streamVerbalWithGeminiFlash('reconcile the metrics on your CV', VERBAL_WHAT_TO_ANSWER_PROMPT));
        expect(generateContentStream).toHaveBeenCalledTimes(1);
        const { config } = generateContentStream.mock.calls[0][0];
        expect(config?.thinkingConfig).toBeUndefined();
    });

    it('LOW → thinkingConfig.thinkingLevel LOW on the request, temperature and token cap unchanged', async () => {
        process.env.NATIVELY_GEMINI_THINKING_LEVEL = 'LOW';
        const helper = new LLMHelper('fake-gemini-key');
        await drain(helper.streamVerbalWithGeminiFlash('reconcile the metrics on your CV', VERBAL_WHAT_TO_ANSWER_PROMPT));
        const { config } = generateContentStream.mock.calls[0][0];
        expect(config?.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
        expect(config?.temperature).toBe(0.4);
        expect(config?.maxOutputTokens).toBeGreaterThan(0);
    });

    it('logs the usage line with the level sent and the thought tokens the model reported', async () => {
        process.env.NATIVELY_GEMINI_THINKING_LEVEL = 'LOW';
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            await drain(helper.streamVerbalWithGeminiFlash('reconcile the metrics on your CV', VERBAL_WHAT_TO_ANSWER_PROMPT));
            const line = log.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('thoughts='));
            expect(line).toMatch(/\[LLMHelper\] gemini-3\.1-flash-lite usage: thinking=LOW thoughts=143 out=160 in=5157/);
        } finally {
            log.mockRestore();
        }
    });
});
