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

/** Resolves after `ms`, or rejects the moment `signal` aborts, as fetch and its body reads do. */
const lateUnlessAborted = (signal: AbortSignal, ms: number, order: string[]) =>
    new Promise<void>((resolve, reject) => {
        const late = setTimeout(() => { order.push('late response'); resolve(); }, ms);
        signal.addEventListener('abort', () => { order.push('abort'); clearTimeout(late); reject(signal.reason); }, { once: true });
    });

async function* fallbackAnswer() { yield { text: () => 'fallback\n' }; }

/**
 * A first-token stall as the SDK sees it: the FIRST request's response headers are due only
 * after `respondAfterMs`. `order` records whether the late response or the abort came first.
 * Every later request is the fallback, which answers at once. The chunks end a line, for
 * Gemma's line-buffered route.
 */
const lateFirstResponse = (respondAfterMs: number, order: string[]) => async (params: any) => {
    if (generateContentStream.mock.calls.length > 1) return fallbackAnswer();
    await lateUnlessAborted(params.config.abortSignal, respondAfterMs, order);
    async function* s() { yield { text: () => 'late\n' }; }
    return s();
};

/**
 * The same stall once the response has started: the SDK call resolves at once, the stream
 * yields `head` (a partial line, which Gemma's line buffer holds back), and the rest is due
 * only after `respondAfterMs`.
 */
const lateFirstChunk = (respondAfterMs: number, order: string[], head: string) => async (params: any) => {
    if (generateContentStream.mock.calls.length > 1) return fallbackAnswer();
    const signal: AbortSignal = params.config.abortSignal;
    async function* s() {
        if (head) yield { text: () => head };
        await lateUnlessAborted(signal, respondAfterMs, order);
        yield { text: () => 'late\n' };
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
    const savedTimeout = process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS;
    // This file exercises today's race (the hedge off) — h40c review M5: an un-cleared
    // NATIVELY_VERBAL_HEDGE from the shell made every case here fail spuriously, or throw on a
    // junk value.
    const savedHedge = process.env.NATIVELY_VERBAL_HEDGE;

    beforeEach(() => {
        lastSignal = null;
        generateContentStream.mockReset();
        generateContentStream.mockImplementation(defaultImpl);
        delete process.env.NATIVELY_VERBAL_HEDGE;
    });

    afterEach(() => {
        if (savedTimeout === undefined) delete process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS; else process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS = savedTimeout;
        if (savedHedge === undefined) delete process.env.NATIVELY_VERBAL_HEDGE; else process.env.NATIVELY_VERBAL_HEDGE = savedHedge;
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

    it.each([
        ['before its response headers', (order: string[]) => lateFirstResponse(150, order)],
        ['after its headers, before its first token', (order: string[]) => lateFirstChunk(150, order, '')],
    ])('aborts a primary stalled %s at its deadline, before its late response', async (_stage, fake) => {
        // The first-token race gives up at 50 ms and the fallback answers. The primary's request
        // is still in flight, its response due at 150 ms. A close would queue behind the pending
        // next() and land only when that response yields; the abort must not wait for it.
        process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS = '50';
        const order: string[] = [];
        generateContentStream.mockImplementation(fake(order));
        const helper = new LLMHelper('fake-gemini-key');

        const chunks: string[] = [];
        for await (const token of helper.streamVerbalWithGeminiFlash('q', 'sys')) chunks.push(token);

        expect(chunks).toEqual(['__model_source:gemini-3.5-flash-lite (fallback)__', 'fallback\n']);
        // Past the response's due time: the abort came first, and the response never arrived.
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(order).toEqual(['abort']);
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
 * (filterPlainTextLeaks), so every chunk ends a line. Any other model is the
 * Flash fallback and answers at once.
 */
const gemmaHeldOpenUntilAbort = () => async (params: any) => {
    if (!String(params.model).startsWith('gemma-')) {
        async function* flash() { yield { text: () => 'flash\n' }; }
        return flash();
    }
    gemmaSignal = params.config?.abortSignal ?? null;
    const signal = gemmaSignal;
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
 * model-source sentinel and that chunk OUTSIDE `yield* gemmaGen`: a consumer that
 * stops on either must close gemmaGen to reach the abort in streamWithGeminiModel's
 * yield-level finally. Its stall branch answers from Flash while gemmaGen is still
 * blocked in next(), with no yield to close at, so it aborts the request through its
 * stop signal at the deadline. Reached by any gemma-* selection and by every
 * screenshot question from the chat IPC, which pins gemma-4-31b-it.
 */
describe('Gemma guarded stream aborts on early close', () => {
    const savedTtft = process.env.NATIVELY_GEMMA_TTFT_MS;
    const savedVisionTtft = process.env.NATIVELY_GEMMA_VISION_TTFT_MS;
    // See the note on the same lines in the describe block above (h40c review M5).
    const savedHedge = process.env.NATIVELY_VERBAL_HEDGE;

    beforeEach(() => {
        gemmaSignal = null;
        generateContentStream.mockReset();
        generateContentStream.mockImplementation(defaultImpl);
        delete process.env.NATIVELY_VERBAL_HEDGE;
    });

    afterEach(() => {
        if (savedTtft === undefined) delete process.env.NATIVELY_GEMMA_TTFT_MS; else process.env.NATIVELY_GEMMA_TTFT_MS = savedTtft;
        if (savedVisionTtft === undefined) delete process.env.NATIVELY_GEMMA_VISION_TTFT_MS; else process.env.NATIVELY_GEMMA_VISION_TTFT_MS = savedVisionTtft;
        if (savedHedge === undefined) delete process.env.NATIVELY_VERBAL_HEDGE; else process.env.NATIVELY_VERBAL_HEDGE = savedHedge;
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

    it.each([
        ['before its response headers', (order: string[]) => lateFirstResponse(150, order)],
        ['inside its first line', (order: string[]) => lateFirstChunk(150, order, 'a first line, not yet ended')],
    ])('aborts an attempt stalled %s at its deadline, before its late response', async (_stage, fake) => {
        // The TTFT race gives up at 50 ms and Flash answers. The Gemma request is still in
        // flight, its response due at 150 ms. A close would queue behind the pending next()
        // and land only at that response's first whole line; the abort must not wait for it.
        process.env.NATIVELY_GEMMA_TTFT_MS = '50';
        const order: string[] = [];
        generateContentStream.mockImplementation(fake(order));
        const helper = new LLMHelper('fake-gemini-key');

        const chunks: string[] = [];
        for await (const token of gemmaRoute(helper)) chunks.push(token);

        expect(chunks).toEqual(['__model_source:Gemini Flash__', 'fallback\n']);
        // Past the response's due time: the abort came first, and the response never arrived.
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(order).toEqual(['abort']);
    }, { timeout: 5000 });

    it('sends no request when its deadline passes while the screenshot is prepared', async () => {
        // A retry can start with little budget left, and the screenshot is prepared before the
        // request exists. An abort listener never runs for a signal that already fired, so a
        // deadline that passed before the request exists has to keep it from being sent.
        process.env.NATIVELY_GEMMA_VISION_TTFT_MS = '50';
        const prepare = vi.spyOn(LLMHelper.prototype as any, 'processImageForVision').mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ mimeType: 'image/jpeg', data: '' }), 100)));
        generateContentStream.mockImplementation(async () => fallbackAnswer());
        try {
            const helper = new LLMHelper('fake-gemini-key');
            // Any existing file: the spy stands in for the image work.
            const screenshot = process.execPath;

            const chunks: string[] = [];
            for await (const token of helper.streamChat('q', [screenshot], undefined, undefined, false, 'gemma-4-31b-it')) chunks.push(token);

            expect(chunks).toEqual(['__model_source:Gemini Flash__', 'fallback\n']);
            // Gemma's preparation ended at 100 ms, before Flash's at 150 ms: it sent nothing.
            expect(generateContentStream.mock.calls.map(c => c[0].model)).toEqual(['gemini-3.1-flash-lite']);
        } finally {
            prepare.mockRestore();
        }
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
