import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same electron + @google/genai shims as LLMHelper.emptyStream.test.ts.
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

/** The signal the last generateContentStream call was given, if any. */
let lastSignal: AbortSignal | null = null;

/**
 * Models the SDK response measured on 2026-09-05: closing the iterator
 * (IteratorClose) does NOT release the request — the response stayed open ~4
 * minutes after the consumer stopped reading — while aborting the signal
 * released it in 170 ms. So this fake's close only completes once the recorded
 * signal fires; with no signal it never completes at all.
 */
const heldOpenUntilAbort = async (params: any) => {
    lastSignal = params.config?.abortSignal ?? null;
    const signal = lastSignal;
    async function* s() {
        try {
            yield { text: () => 'first ' };
            yield { text: () => 'second ' };
            yield { text: () => 'never' };
        } finally {
            await new Promise<void>(resolve => {
                if (!signal) return;                        // no signal: the close never completes
                if (signal.aborted) { resolve(); return; }
                signal.addEventListener('abort', () => resolve(), { once: true });
            });
        }
    }
    return s();
};

/** Two tokens and a natural end — nothing to abort. */
const completesNaturally = async (params: any) => {
    lastSignal = params.config?.abortSignal ?? null;
    async function* s() {
        yield { text: () => 'first ' };
        yield { text: () => 'second ' };
    }
    return s();
};

/**
 * MEASURED DEFECT (2026-09-05, scratchpad probe against gemini-3.1-flash-lite
 * with the real @google/genai SDK).
 *
 * | drain the whole stream            | loop 5.8 s | event loop drained 5.8 s   |
 * | break after 3 chunks              | loop 3.8 s | event loop drained 247.7 s |
 * | break after 3 chunks + abort()    | loop 2.8 s | event loop drained 3.0 s   |
 *
 * IteratorClose does not stop the request: the SDK's response stays open about
 * four minutes after the consumer stops reading. The spoken word budget closes
 * the answer stream early on ~44 of 52 answers an hour, so without an abort
 * every cut leaves a request open for minutes.
 */
describe('Gemini stream aborts on early close', () => {
    beforeEach(() => {
        lastSignal = null;
        generateContentStream.mockReset();
        generateContentStream.mockImplementation(defaultImpl);
    });

    it('aborts the request when the consumer closes the stream early', async () => {
        generateContentStream.mockImplementation(heldOpenUntilAbort);
        const helper = new LLMHelper('fake-gemini-key');

        let timer: NodeJS.Timeout | undefined;
        const loop = (async () => {
            let seen = 0;
            for await (const token of helper.streamVerbalWithGeminiFlash('q', 'sys')) {
                void token;
                // The first token is hand-yielded by streamVerbalWithGeminiFlash's
                // first-token race, OUTSIDE `yield* primaryStream`; the cut the word
                // budget makes lands inside that delegation, so break on the second.
                if (++seen === 2) break;
            }
            return 'loop' as const;
        })();

        // Real timers: the assertion is that the break completes at all, promptly.
        // A close that waits on the un-released response loses this race.
        const raced = await Promise.race([
            loop,
            new Promise<'timeout'>(resolve => { timer = setTimeout(() => resolve('timeout'), 500); }),
        ]);
        clearTimeout(timer!);

        expect(raced).toBe('loop');
        expect(lastSignal?.aborted).toBe(true);
    }, { timeout: 5000 });

    it('does not abort when the stream completes naturally', async () => {
        // Calibration: the abort must fire on an early close and nowhere else.
        generateContentStream.mockImplementation(completesNaturally);
        const helper = new LLMHelper('fake-gemini-key');

        const chunks: string[] = [];
        for await (const token of helper.streamVerbalWithGeminiFlash('q', 'sys')) chunks.push(token);

        const out = chunks.join('').replace(/__model_source:[^_]*__/g, '');
        expect(out).toBe('first second ');
        expect(lastSignal?.aborted).toBe(false);
    });

    it('passes an AbortSignal to the SDK', async () => {
        generateContentStream.mockImplementation(completesNaturally);
        const helper = new LLMHelper('fake-gemini-key');

        for await (const token of helper.streamVerbalWithGeminiFlash('q', 'sys')) void token;

        const config = (generateContentStream.mock.calls[0][0] as any).config;
        expect(config.abortSignal).toBeInstanceOf(AbortSignal);
    });
});
