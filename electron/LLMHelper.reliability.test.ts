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

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContentStream } })),
}));

import { LLMHelper } from './LLMHelper';

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

        await vi.advanceTimersByTimeAsync(10);
        await p.catch(() => { /* hanging gemma leg is abandoned by design */ });
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

    it('pings warmups immediately and then on the interval, and stops cleanly', () => {
        vi.useFakeTimers();
        const helper = new LLMHelper('fake-gemini-key');
        const gemmaSpy = vi.spyOn(helper, 'warmupGemma').mockResolvedValue(undefined);
        const flashSpy = vi.spyOn(helper, 'warmupGeminiFlash').mockResolvedValue(undefined);

        helper.startWarmthHeartbeat(1000);

        // Immediate warm so the meeting's first coding answer hits a hot model.
        expect(gemmaSpy).toHaveBeenCalledTimes(1);
        expect(flashSpy).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(3000);
        expect(gemmaSpy).toHaveBeenCalledTimes(4); // immediate + 3 intervals
        expect(flashSpy).toHaveBeenCalledTimes(4);

        helper.stopWarmthHeartbeat();
        vi.advanceTimersByTime(5000);
        expect(gemmaSpy).toHaveBeenCalledTimes(4); // no further pings after stop
        expect(flashSpy).toHaveBeenCalledTimes(4);
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
