// THROWAWAY (merge check, 2026-09-30) — copied into electron/llm/ for one run, then deleted; never committed.
// Question: after merging MAIN's hedge into the cue branch, does a hedge-won answer still (1) lose its cue
// block from the spoken text, (2) report its cues to onCues exactly once, (3) name the hedge winner?
// The real WhatToAnswerLLM runs over the real LLMHelper (hedge ON, MAIN's default); only the SDK is a stub.
// A mutant copy of WhatToAnswerLLM (once-guard removed) calibrates scenario D: the check must FAIL on it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

type Step = 'silent' | 'error' | string[] | { thenFail: string[] };
const plan: Step[] = [];
const signals: Array<AbortSignal | null> = [];
const generateContentStream = vi.fn(async (params: { model: string; contents: unknown; config?: Record<string, unknown> }) => {
    const step = plan[generateContentStream.mock.calls.length - 1] ?? ['unplanned call'];
    signals.push((params.config?.abortSignal as AbortSignal | undefined) ?? null);
    if (step === 'error') throw new Error('got status: 503 Service Unavailable');
    const streamed = step;
    async function* stream() {
        if (streamed === 'silent') { await new Promise<never>(() => {}); return; }
        if ('thenFail' in streamed) {
            for (const text of streamed.thenFail) yield { text: () => text };
            throw new Error('socket hang up');
        }
        for (const text of streamed) yield { text: () => text };
    }
    return stream();
});
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContentStream } })),
}));

import { LLMHelper } from '../LLMHelper';
import { WhatToAnswerLLM as Real } from './WhatToAnswerLLM';
import { WhatToAnswerLLM as Mutant } from './WhatToAnswerLLM.mutant';
import { VERBAL_PRIMARY_MODEL_ENV } from './verbalPrimaryModel';

const TECHNICAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
const PROSE = 'Ten million vectors take about thirty gigabytes. Quantizing to int eight cuts that to about seven and a half.';
// The block split at awkward chunk boundaries: inside the sentinel, inside a cue line, between block and prose.
const CHUNKED = ['__CU', 'ES__\n1| thirty giga', 'bytes in float32\n2| int8, then shard\nTen million vectors take about ', 'thirty gigabytes. Quantizing to int eight cuts that ', 'to about seven and a half.'];
const CUES = ['thirty gigabytes in float32', 'int8, then shard'];

async function drain(gen: AsyncGenerator<string>): Promise<string[]> {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}
const named = (chunks: string[]) => chunks.flatMap((c) => [...c.matchAll(/__model_source:([^_]+)__/g)].map((m) => m[1]));
const spoken = (chunks: string[]) => chunks.join('').replace(/__model_source:[^_]*__/g, '').trim();
const asked = () => generateContentStream.mock.calls.map((c) => c[0].model);

const saved = { hedge: process.env.NATIVELY_VERBAL_HEDGE, trigger: process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS, primary: process.env[VERBAL_PRIMARY_MODEL_ENV], level: process.env.NATIVELY_GEMINI_THINKING_LEVEL };
beforeEach(() => {
    generateContentStream.mockClear();
    plan.length = 0;
    signals.length = 0;
    delete process.env.NATIVELY_VERBAL_HEDGE;              // unset = ON, the shipped default
    delete process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS;
    delete process.env[VERBAL_PRIMARY_MODEL_ENV];
    delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
});
afterEach(() => {
    vi.useRealTimers();
    const back = (k: string, v: string | undefined) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };
    back('NATIVELY_VERBAL_HEDGE', saved.hedge); back('NATIVELY_VERBAL_HEDGE_TRIGGER_MS', saved.trigger);
    back(VERBAL_PRIMARY_MODEL_ENV, saved.primary); back('NATIVELY_GEMINI_THINKING_LEVEL', saved.level);
});

const run = (Cls: typeof Real, onCues: (c: string[]) => void, intent: unknown = TECHNICAL) =>
    drain(new Cls(new LLMHelper('fake-gemini-key')).generateStream('How much memory does it take?', undefined, intent as any, undefined, undefined, undefined, undefined, onCues));

describe('hedge x cue mode, on the merged tree', () => {
    it('A. the front wins with a chunked cue block: cues once, block gone, prose intact, winner named (hedge)', async () => {
        plan.push(CHUNKED);
        const onCues = vi.fn();
        const chunks = await run(Real, onCues);
        expect(asked()).toEqual(['gemini-3.5-flash-lite']);
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith(CUES);
        expect(spoken(chunks)).toBe(PROSE);
        expect(chunks.join('')).not.toContain('__CUES__');
        expect(named(chunks).at(-1)).toBe('gemini-3.5-flash-lite (hedge)');
    });

    it('A0. control: the same answer with NO block reports [] once, so the assertion above is not vacuous', async () => {
        plan.push([PROSE]);
        const onCues = vi.fn();
        const chunks = await run(Real, onCues);
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith([]);
        expect(spoken(chunks)).toBe(PROSE);
    });

    it('B. the back wins after the trigger: cues once, the front is aborted, winner named 3.1-lite (hedge)', async () => {
        vi.useFakeTimers();
        plan.push('silent', CHUNKED);
        const onCues = vi.fn();
        const out = run(Real, onCues);
        await vi.advanceTimersByTimeAsync(5000);
        const chunks = await out;
        expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith(CUES);
        expect(spoken(chunks)).toBe(PROSE);
        expect(named(chunks).at(-1)).toBe('gemini-3.1-flash-lite (hedge)');
        expect(signals[0]?.aborted).toBe(true);
    });

    it('C. both legs 503, the redirect re-enters the hedge and its answer carries the block: cues once', async () => {
        plan.push('error', 'error', CHUNKED);
        const onCues = vi.fn();
        const chunks = await run(Real, onCues);
        expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith(CUES);
        expect(spoken(chunks)).toBe(PROSE);
    });

    // The once-guard: a stream that CLOSES its cue block (reports) and then dies before any prose reaches the
    // reader is a pre-token failure, so the redirect runs a second stream that opens with a block too. The
    // reader must get one report, not two. 'Time:' is a HARD_DROP line: the filter swallows it, so no prose escapes.
    const DIES_AFTER_BLOCK = { thenFail: ['__CUES__\n1| first stream cue a\n2| first stream cue b\nTime: O(n)\n'] };

    it('D. the once-guard holds across the fallback: the first stream reports, dies with no prose, the redirect must not report again', async () => {
        plan.push(DIES_AFTER_BLOCK, CHUNKED);
        const onCues = vi.fn();
        const chunks = await run(Real, onCues);
        expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite']);
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith(['first stream cue a', 'first stream cue b']);
        expect(spoken(chunks).replace(/\[No answer[^\]]*\]/, '').trim()).toContain('Ten million vectors take about thirty gigabytes.');
    });

    it('D-mutant (calibration): with the once-guard removed the same scenario reports TWICE, so D can tell', async () => {
        plan.push(DIES_AFTER_BLOCK, CHUNKED);
        const onCues = vi.fn();
        await run(Mutant as any, onCues);
        expect(onCues).toHaveBeenCalledTimes(2);
    });

    it('E. hedge OFF (NATIVELY_VERBAL_HEDGE=0), the old stall race: cues once, so both policies feed the same chain', async () => {
        process.env.NATIVELY_VERBAL_HEDGE = '0';
        plan.push(CHUNKED);
        const onCues = vi.fn();
        const chunks = await run(Real, onCues);
        expect(asked()).toEqual(['gemini-3.1-flash-lite']);
        expect(onCues).toHaveBeenCalledTimes(1);
        expect(onCues).toHaveBeenCalledWith(CUES);
        expect(spoken(chunks)).toBe(PROSE);
    });
});
