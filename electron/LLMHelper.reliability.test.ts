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

import { LLMHelper, getGemmaTtftMs, getGemmaVisionTtftMs, getGemmaMaxAttempts } from './LLMHelper';

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

    it('never gives image/vision requests LESS budget than text', () => {
        // Text budget is 30s (2026-07-28): hard questions — open-ended system design
        // especially — legitimately take Gemma 5-12s+ to first token, and the old 6s
        // budget bailed to Flash mid-think. The user can cut the wait short with the
        // "Answer now with Flash Lite" button, so patience is cheap.
        // A screenshot coding problem is at least as hard as a spoken one, so the
        // vision budget is floored at the text budget.
        const text = getGemmaTtftMs();
        expect(text).toBe(30_000);
        expect(getGemmaVisionTtftMs(1)).toBeGreaterThanOrEqual(text);
        expect(getGemmaVisionTtftMs(10)).toBeGreaterThanOrEqual(text);
    });

    it('scales the vision budget mildly with image count once above the text floor', () => {
        // Measured warm TTFT (2026-07-05, real screenshots): 1 img 3.9s, 3 img 18.9s,
        // 5 img 4.9s, 8 img 7.9s, 10 img 7.3s — count is a weak driver, server variance
        // dominates. Formula = base 14s + 2s/image, floored at the 30s text budget.
        // With the default 30s floor, counts 1-8 clamp to 30s and only 9+ exceed it;
        // lower the floor here to assert the underlying per-image curve still holds.
        delete process.env.NATIVELY_GEMMA_VISION_TTFT_MS;
        process.env.NATIVELY_GEMMA_TTFT_MS = '6000';    // temporarily restore a low floor
        expect(getGemmaVisionTtftMs(1)).toBe(16_000);
        expect(getGemmaVisionTtftMs(3)).toBe(20_000);   // covers the 18.9s slow case
        expect(getGemmaVisionTtftMs(5)).toBe(24_000);
        expect(getGemmaVisionTtftMs(10)).toBe(34_000);  // 10-image cap — 7.3s observed, huge margin
        expect(getGemmaVisionTtftMs(3)).toBeGreaterThan(getGemmaVisionTtftMs(1));
        delete process.env.NATIVELY_GEMMA_TTFT_MS;
        // Back at the real 30s floor, low image counts clamp up rather than down.
        expect(getGemmaVisionTtftMs(1)).toBe(30_000);
        expect(getGemmaVisionTtftMs(10)).toBe(34_000);
    });

    it('flat NATIVELY_GEMMA_VISION_TTFT_MS override wins over per-image scaling', () => {
        process.env.NATIVELY_GEMMA_VISION_TTFT_MS = '9000';
        expect(getGemmaVisionTtftMs(3)).toBe(9000);
        delete process.env.NATIVELY_GEMMA_VISION_TTFT_MS;
    });

    it('caps multi-image attempts below text/single-image (bounds per-retry re-upload cost)', () => {
        delete process.env.NATIVELY_GEMMA_MAX_ATTEMPTS;
        delete process.env.NATIVELY_GEMMA_VISION_MAX_ATTEMPTS;
        expect(getGemmaMaxAttempts(0)).toBe(3);  // text
        expect(getGemmaMaxAttempts(1)).toBe(3);  // single image — one re-upload is cheap
        expect(getGemmaMaxAttempts(2)).toBe(2);  // multi-image — capped
        expect(getGemmaMaxAttempts(3)).toBe(2);
    });

    it('a multi-image request caps Gemma attempts at 2 then falls back to Flash', async () => {
        let gemmaAttempts = 0;
        generateContentStream.mockImplementation(async (params: { model: string }) => {
            if (String(params.model).startsWith('gemma-')) {
                gemmaAttempts++;
                async function* boom() { throw new Error('{"error":{"code":500,"status":"INTERNAL"}}'); }
                return boom();
            }
            async function* flash() { yield { text: () => 'flash-answer' }; }
            return flash();
        });

        const helper = new LLMHelper('fake-gemini-key');
        // 2 attached screenshots → attempt cap 2 (vs 3 for text). Fast errors, so
        // the (large) vision budget doesn't bind — the attempt cap does.
        const out = (await drain(helper.streamChat('q', ['a.png', 'b.png'], undefined, undefined, false, 'gemma-4-31b-it'))).join('');

        expect(gemmaAttempts).toBe(2);
        expect(out).toContain('flash-answer');
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
