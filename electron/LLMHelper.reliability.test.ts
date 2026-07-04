import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Same electron + @google/genai shims as LLMHelper.streamChat.test.ts.
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: {
        isEncryptionAvailable: () => false,
        encryptString: (s: string) => Buffer.from(s),
        decryptString: (b: Buffer) => b.toString(),
    },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

// Default: any model answers 'ok'. Individual tests override via mockImplementation.
const defaultImpl = async (_params: { model: string }) => {
    async function* s() { yield { text: () => 'ok' }; }
    return s();
};
const generateContentStream = vi.fn(defaultImpl);
// warmups use the non-streaming generateContent, not the stream.
const generateContent = vi.fn(async (_params?: any) => ({ text: () => 'ok' }));

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContentStream, generateContent } })),
}));

import { LLMHelper, getGemmaTtftMs, getGemmaVisionTtftMs } from './LLMHelper';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

describe('LLMHelper Gemma TTFT watchdog', () => {
    beforeEach(() => {
        generateContentStream.mockReset();
        generateContentStream.mockImplementation(defaultImpl);
    });

    afterEach(() => {
        vi.useRealTimers();
        delete process.env.NATIVELY_GEMMA_TTFT_MS;
    });

    it('honors NATIVELY_GEMMA_TTFT_MS and falls back to a Gemini model when Gemma stalls past it', async () => {
        vi.useFakeTimers();
        process.env.NATIVELY_GEMMA_TTFT_MS = '50';

        // Gemma hangs on first token; any Gemini fallback answers.
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                async function* hang() { await new Promise<void>(() => { /* never */ }); yield { text: () => 'gemma' }; }
                return hang();
            }
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        const p = drain(helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it'));

        // Advance just past the 50ms watchdog — the Flash fallback call must have been issued.
        await vi.advanceTimersByTimeAsync(70);

        const models = generateContentStream.mock.calls.map(c => String((c[0] as any).model));
        expect(models[0]).toMatch(/^gemma-/);
        expect(models.some(m => m.startsWith('gemini-'))).toBe(true);
        // A genuine stall must NOT be retried — only one Gemma attempt before Flash.
        expect(models.filter(m => m.startsWith('gemma-')).length).toBe(1);

        await vi.advanceTimersByTimeAsync(10);
        await p.catch(() => { /* hanging gemma leg is abandoned by design */ });
    });

    it('retries Gemma on a transient 500 within the budget and keeps the answer on Gemma when a retry succeeds', async () => {
        process.env.NATIVELY_GEMMA_TTFT_MS = '5000';
        let gemmaAttempts = 0;
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                gemmaAttempts++;
                if (gemmaAttempts === 1) {
                    async function* boom() { throw new Error('{"error":{"code":500,"status":"INTERNAL","message":"Internal error encountered."}}'); }
                    return boom();
                }
                async function* ok() { yield { text: () => 'gemma-answer' }; }
                return ok();
            }
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        const out = (await drain(helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it'))).join('');

        expect(gemmaAttempts).toBe(2);          // failed once, retried, succeeded
        expect(out).toContain('gemma-answer');   // stayed on Gemma
        expect(out).not.toContain('flash-answer'); // did NOT fall back
    });

    it('does NOT retry a non-retryable error (bad key) — falls straight to Flash', async () => {
        process.env.NATIVELY_GEMMA_TTFT_MS = '5000';
        let gemmaAttempts = 0;
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                gemmaAttempts++;
                async function* bad() { throw new Error('{"error":{"code":400,"status":"INVALID_ARGUMENT","message":"API key not valid. API_KEY_INVALID"}}'); }
                return bad();
            }
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        const out = (await drain(helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it'))).join('');

        expect(gemmaAttempts).toBe(1);          // bailed immediately, no wasted retries
        expect(out).toContain('flash-answer');
    });

    it('caps Gemma retries at NATIVELY_GEMMA_MAX_ATTEMPTS then falls back to Flash', async () => {
        process.env.NATIVELY_GEMMA_TTFT_MS = '5000';
        process.env.NATIVELY_GEMMA_MAX_ATTEMPTS = '3';
        let gemmaAttempts = 0;
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                gemmaAttempts++;
                async function* boom() { throw new Error('{"error":{"code":503,"status":"UNAVAILABLE","message":"overloaded"}}'); }
                return boom();
            }
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        const out = (await drain(helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it'))).join('');

        expect(gemmaAttempts).toBe(3);          // exactly the cap
        expect(out).toContain('flash-answer');
        delete process.env.NATIVELY_GEMMA_MAX_ATTEMPTS;
    });

    it('gives image/vision requests a larger budget than text (a text-sized budget cannot fit a vision retry)', () => {
        // Structural check on the exported knobs rather than a full stream: the
        // vision budget must exceed the text budget so a post-500 vision retry
        // (each vision attempt ~6-7s) has room to complete.
        const text = getGemmaTtftMs();
        const vision = getGemmaVisionTtftMs();
        expect(vision).toBeGreaterThan(text);
        expect(text).toBe(6_000);       // the value the user asked for
        expect(vision).toBeGreaterThanOrEqual(12_000);
    });
});

describe('LLMHelper keep-warm heartbeat', () => {
    beforeEach(() => {
        generateContentStream.mockReset();
        generateContentStream.mockImplementation(defaultImpl);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('pings warmups (text, vision, flash) immediately and then on the interval, and stops cleanly', () => {
        vi.useFakeTimers();
        const helper = new LLMHelper('fake-gemini-key');
        const gemmaSpy = vi.spyOn(helper, 'warmupGemma').mockResolvedValue(undefined);
        const visionSpy = vi.spyOn(helper, 'warmupGemmaVision').mockResolvedValue(undefined);
        const flashSpy = vi.spyOn(helper, 'warmupGeminiFlash').mockResolvedValue(undefined);

        helper.startWarmthHeartbeat(1000);

        // Immediate warm so the meeting's first coding/screenshot answer hits a hot model.
        expect(gemmaSpy).toHaveBeenCalledTimes(1);
        expect(visionSpy).toHaveBeenCalledTimes(1);
        expect(flashSpy).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(3000);
        expect(gemmaSpy).toHaveBeenCalledTimes(4); // immediate + 3 intervals
        expect(visionSpy).toHaveBeenCalledTimes(4);
        expect(flashSpy).toHaveBeenCalledTimes(4);

        helper.stopWarmthHeartbeat();
        vi.advanceTimersByTime(5000);
        expect(gemmaSpy).toHaveBeenCalledTimes(4); // no further pings after stop
        expect(visionSpy).toHaveBeenCalledTimes(4);
        expect(flashSpy).toHaveBeenCalledTimes(4);
    });

    it('warmupGemmaVision pings gemma-4-31b-it with an inline PNG image part (exercises the vision prefill)', async () => {
        generateContent.mockClear();
        const helper = new LLMHelper('fake-gemini-key');

        await helper.warmupGemmaVision();

        expect(generateContent).toHaveBeenCalled();
        const params = generateContent.mock.calls.at(-1)![0] as any;
        // Screenshot path force-uses gemma-4-31b-it regardless of dropdown, so the
        // vision warmup must target that exact model, not currentModelId.
        expect(params.model).toBe('gemma-4-31b-it');
        const parts = params.contents[0].parts;
        const hasImage = parts.some((p: any) =>
            p.inlineData?.mimeType === 'image/png' && typeof p.inlineData?.data === 'string' && p.inlineData.data.length > 0);
        expect(hasImage).toBe(true);
        expect(params.config.maxOutputTokens).toBe(1);
    });

    it('startWarmthHeartbeat is idempotent — a second call does not double the interval', () => {
        vi.useFakeTimers();
        const helper = new LLMHelper('fake-gemini-key');
        const gemmaSpy = vi.spyOn(helper, 'warmupGemma').mockResolvedValue(undefined);
        vi.spyOn(helper, 'warmupGeminiFlash').mockResolvedValue(undefined);

        helper.startWarmthHeartbeat(1000);
        helper.startWarmthHeartbeat(1000); // restart, must not stack two intervals
        gemmaSpy.mockClear();

        vi.advanceTimersByTime(1000);
        expect(gemmaSpy).toHaveBeenCalledTimes(1); // one interval tick, not two

        helper.stopWarmthHeartbeat();
    });
});
