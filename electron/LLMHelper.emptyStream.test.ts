import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Same electron + @google/genai shims as LLMHelper.reliability.test.ts.
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: {
        isEncryptionAvailable: () => false,
        encryptString: (s: string) => Buffer.from(s),
        decryptString: (b: Buffer) => b.toString(),
    },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

const defaultImpl = async (_params: { model: string }) => {
    async function* s() { yield { text: () => 'ok' }; }
    return s();
};
const generateContentStream = vi.fn(defaultImpl);
const generateContent = vi.fn(async (_params?: any) => ({ text: () => 'ok' }));

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContentStream, generateContent } })),
}));

import { LLMHelper } from './LLMHelper';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

/**
 * MEASURED DEFECT (2026-08-25).
 *
 * Asking Gemma for the pythonic stdlib version of an LRU cache, as the second
 * turn of a conversation already about LRU caches, returns finishReason
 * RECITATION with an EMPTY body — reproducible 6/6 across conversation shapes,
 * with and without screenshots. Gemini's recitation filter is refusing to emit
 * the canonical collections.OrderedDict snippet.
 *
 * An empty stream makes the guard's `gemmaGen.next()` resolve to
 * `{ value: undefined, done: true }` — which is neither an error nor a timeout,
 * so it satisfied the SUCCESS branch. The guard then yielded the model-source
 * sentinel and returned, producing an answer bubble with an attribution badge
 * and no text: a silent blank, with no fallback and no error.
 *
 * gemini-3.1-flash-lite answers the identical request correctly (1160 chars,
 * uses OrderedDict), so falling through is a real fix, not a consolation prize.
 *
 * This generalises past recitation: ANY zero-content Gemma response — safety
 * block, empty candidate, malformed stream — must fall through rather than
 * present an empty answer as success.
 */
describe('Gemma empty-stream fallback', () => {
    // h40c review M5: an un-cleared NATIVELY_VERBAL_HEDGE from the shell could make a case here
    // fail spuriously (or throw on a junk value) the moment it falls back to Gemini Flash.
    const savedHedge = process.env.NATIVELY_VERBAL_HEDGE;

    beforeEach(() => {
        generateContentStream.mockReset();
        generateContentStream.mockImplementation(defaultImpl);
        delete process.env.NATIVELY_VERBAL_HEDGE;
    });

    afterEach(() => {
        if (savedHedge === undefined) delete process.env.NATIVELY_VERBAL_HEDGE; else process.env.NATIVELY_VERBAL_HEDGE = savedHedge;
    });

    it('falls back to Flash when Gemma yields ZERO chunks (RECITATION / safety block)', async () => {
        let gemmaCalls = 0;
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                gemmaCalls++;
                // Exactly what a RECITATION-blocked response looks like on the wire:
                // the stream completes without ever yielding a chunk.
                async function* empty() { /* yields nothing */ }
                return empty();
            }
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        const out = (await drain(
            helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it')
        )).join('');

        expect(gemmaCalls).toBeGreaterThanOrEqual(1);
        // The whole point: the user must get an answer, not a bare sentinel.
        expect(out).toContain('flash-answer');
    });

    it('does not present a bare model-source sentinel as the answer', async () => {
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                async function* empty() { /* yields nothing */ }
                return empty();
            }
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        const out = (await drain(
            helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it')
        )).join('');

        // Strip any __model_source:X__ sentinel; what remains must be real content.
        const visible = out.replace(/__model_source:[^_]*__/g, '').trim();
        expect(visible.length).toBeGreaterThan(0);
    });

    it('still streams normally when Gemma DOES produce content (no over-correction)', async () => {
        // Calibration: the fix must not make healthy Gemma responses fall through.
        let flashCalls = 0;
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                async function* good() { yield { text: () => 'gemma-answer' }; }
                return good();
            }
            flashCalls++;
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        const out = (await drain(
            helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it')
        )).join('');

        expect(out).toContain('gemma-answer');
        expect(out).not.toContain('flash-answer');
        expect(flashCalls).toBe(0);
    });

    it('treats a stream of only empty-string chunks as empty too', async () => {
        // A stream that yields '' is content-free in every way that matters to the
        // user, and must not be presented as an answer either.
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                async function* blanks() { yield { text: () => '' }; yield { text: () => '' }; }
                return blanks();
            }
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        const out = (await drain(
            helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it')
        )).join('');
        const visible = out.replace(/__model_source:[^_]*__/g, '').trim();
        expect(visible.length).toBeGreaterThan(0);
    });
});
