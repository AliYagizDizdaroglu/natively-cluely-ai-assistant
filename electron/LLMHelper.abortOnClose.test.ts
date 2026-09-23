import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

    it('aborts the request when the consumer closes on the first token', async () => {
        // The close the test above steps around: a superseding generation's .return(),
        // or any exit right after the first words, lands on the token the first-token
        // race hand-yields OUTSIDE `yield* primaryStream`.
        generateContentStream.mockImplementation(heldOpenUntilAbort);
        const helper = new LLMHelper('fake-gemini-key');

        const seen: string[] = [];
        let timer: NodeJS.Timeout | undefined;
        const loop = (async () => {
            for await (const token of helper.streamVerbalWithGeminiFlash('q', 'sys')) {
                seen.push(token);
                break;
            }
            return 'loop' as const;
        })();

        const raced = await Promise.race([
            loop,
            new Promise<'timeout'>(resolve => { timer = setTimeout(() => resolve('timeout'), 500); }),
        ]);
        clearTimeout(timer!);

        expect(raced).toBe('loop');
        expect(seen).toEqual(['first ']);
        // The close does not wait for primaryStream's teardown, so nothing orders the abort
        // before the loop's end; let the teardown's microtasks run before reading the signal.
        await new Promise(resolve => setTimeout(resolve, 0));
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

/** The signal the Gemma request was given. The Flash fallback's call leaves it alone. */
let gemmaSignal: AbortSignal | null = null;

/**
 * heldOpenUntilAbort for Gemma's guarded path, which buffers by line
 * (filterPlainTextLeaks), so every chunk ends a line. `respondAfterMs` holds the
 * response back to model a first-token stall. Any other model is the Flash
 * fallback and answers at once.
 */
const gemmaHeldOpenUntilAbort = (respondAfterMs = 0) => async (params: any) => {
    if (!String(params.model).startsWith('gemma-')) {
        async function* flash() { yield { text: () => 'flash\n' }; }
        return flash();
    }
    gemmaSignal = params.config?.abortSignal ?? null;
    const signal = gemmaSignal;
    if (respondAfterMs) await new Promise(resolve => setTimeout(resolve, respondAfterMs));
    async function* s() {
        try {
            yield { text: () => 'first\n' };
            yield { text: () => 'second\n' };
            yield { text: () => 'never\n' };
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

/** Two lines and a natural end — nothing to abort. */
const gemmaCompletesNaturally = async (params: any) => {
    gemmaSignal = params.config?.abortSignal ?? null;
    async function* s() {
        yield { text: () => 'first\n' };
        yield { text: () => 'second\n' };
    }
    return s();
};

/**
 * streamWithGemmaGuarded races Gemma's first content chunk, then hand-yields the
 * model-source sentinel and that chunk OUTSIDE `yield* gemmaGen`, and its stall
 * branch answers from Flash while gemmaGen is still blocked in next(). The abort
 * lives in streamWithGeminiModel's yield-level finally, so only a close that
 * reaches gemmaGen aborts the request. Reached by any gemma-* selection and by
 * every screenshot question from the chat IPC, which pins gemma-4-31b-it.
 */
describe('Gemma guarded stream aborts on early close', () => {
    const savedTtft = process.env.NATIVELY_GEMMA_TTFT_MS;

    beforeEach(() => {
        gemmaSignal = null;
        generateContentStream.mockReset();
        generateContentStream.mockImplementation(defaultImpl);
    });

    afterEach(() => {
        if (savedTtft === undefined) delete process.env.NATIVELY_GEMMA_TTFT_MS; else process.env.NATIVELY_GEMMA_TTFT_MS = savedTtft;
    });

    const gemmaRoute = (helper: LLMHelper) =>
        helper.streamChat('q', undefined, undefined, undefined, false, 'gemma-4-31b-it');

    /** Reads `n` tokens, then closes; the close races 500 ms of real time. */
    async function closeAfter(n: number) {
        const helper = new LLMHelper('fake-gemini-key');
        const seen: string[] = [];
        let timer: NodeJS.Timeout | undefined;
        const loop = (async () => {
            for await (const token of gemmaRoute(helper)) {
                seen.push(token);
                if (seen.length === n) break;
            }
            return 'loop' as const;
        })();
        const raced = await Promise.race([
            loop,
            new Promise<'timeout'>(resolve => { timer = setTimeout(() => resolve('timeout'), 500); }),
        ]);
        clearTimeout(timer!);
        return { raced, seen };
    }

    it('aborts the request when the consumer closes on the model-source sentinel', async () => {
        // The chat IPC's supersede check runs on every token, this sentinel included.
        generateContentStream.mockImplementation(gemmaHeldOpenUntilAbort());

        const { raced, seen } = await closeAfter(1);

        expect(raced).toBe('loop');
        expect(seen).toEqual(['__model_source:Gemma 4__']);
        // Nothing orders an un-awaited close before the loop's end; let its microtasks run.
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(gemmaSignal?.aborted).toBe(true);
    }, { timeout: 5000 });

    it('aborts the request when the consumer closes on the first chunk', async () => {
        generateContentStream.mockImplementation(gemmaHeldOpenUntilAbort());

        const { raced, seen } = await closeAfter(2);

        expect(raced).toBe('loop');
        expect(seen).toEqual(['__model_source:Gemma 4__', 'first\n']);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(gemmaSignal?.aborted).toBe(true);
    }, { timeout: 5000 });

    it('aborts a stalled attempt whose first chunk arrives after the fallback', async () => {
        // The TTFT race gives up at 50 ms and Flash answers. The Gemma request is still in
        // flight, blocked before its first yield, so a close can only land when that chunk
        // arrives at 150 ms.
        process.env.NATIVELY_GEMMA_TTFT_MS = '50';
        generateContentStream.mockImplementation(gemmaHeldOpenUntilAbort(150));
        const helper = new LLMHelper('fake-gemini-key');

        const chunks: string[] = [];
        for await (const token of gemmaRoute(helper)) chunks.push(token);

        expect(chunks).toEqual(['__model_source:Gemini Flash__', 'flash\n']);
        // Past the late chunk at 150 ms; the close's teardown is microtasks after it.
        await new Promise(resolve => setTimeout(resolve, 300));
        expect(gemmaSignal?.aborted).toBe(true);
    }, { timeout: 5000 });

    it('does not abort the request when it completes naturally', async () => {
        // Calibration: the close must fire on an early exit and nowhere else.
        generateContentStream.mockImplementation(gemmaCompletesNaturally);
        const helper = new LLMHelper('fake-gemini-key');

        const chunks: string[] = [];
        for await (const token of gemmaRoute(helper)) chunks.push(token);

        expect(chunks).toEqual(['__model_source:Gemma 4__', 'first\n', 'second\n']);
        expect(gemmaSignal?.aborted).toBe(false);
    });
});
