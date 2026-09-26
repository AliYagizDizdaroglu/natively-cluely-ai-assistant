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

/**
 * The SDK stream per call, in call order — the vocabulary of
 * WhatToAnswerLLM.answeringModel.test.ts, extended per the h40c review (fix round 1, M4):
 * 'silent': the request is accepted and the first chunk never arrives — and, like the real
 *   SDK's pending fetch/body read, its abort signal firing rejects it with an AbortError,
 *   instead of hanging forever unconditionally (the review: "the fake 'silent' ignores
 *   abortSignal", so no unit test ever exercised an aborted loser's own rejection).
 * { error: string }: a failure before any token, with per-step text — a bare 'error' string
 *   made cases 4-6 indistinguishable (the review, M4: "both legs fail with the same text, so
 *   throwing b.err first would also pass").
 * string[]: the chunks stream immediately.
 * { after, chunks }: the chunks stream once `after` ms have passed — the hedge's front can
 *   answer AFTER the trigger has already started the back, so "silent" alone can't model it.
 * { after, error }: a failure once `after` ms have passed (both legs failing on the trigger
 *   path, after both have been raced in — distinct from a pre-token error, which never reaches
 *   the trigger at all).
 * { gate, chunks }: the chunks stream once the shared `gate` promise resolves — lets a test put
 *   two legs' first tokens in the same tick (M1's repro), which no fixed delay can guarantee.
 */
type ErrorStep = { error: string };
type DelayedStep = { after: number; chunks: string[] } | { after: number; error: string };
type GatedStep = { gate: Promise<void>; chunks: string[] };
const plan: Array<'silent' | ErrorStep | string[] | DelayedStep | GatedStep> = [];
/** The abort signal each SDK call was given, in call order. */
const signals: Array<AbortSignal | null> = [];
const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
const generateContentStream = vi.fn(async (params: { model: string; contents: unknown; config?: Record<string, unknown> }) => {
    const step = plan[generateContentStream.mock.calls.length - 1] ?? ['unplanned call'];
    const signal = (params.config?.abortSignal as AbortSignal | undefined) ?? null;
    signals.push(signal);
    if (typeof step === 'object' && !Array.isArray(step) && 'error' in step && !('after' in step)) {
        throw new Error(step.error);
    }
    const streamed = step;   // typed without the pre-token ErrorStep, which the closure below would otherwise forget
    async function* stream() {
        if (streamed === 'silent') {
            await new Promise<never>((_resolve, reject) => {
                if (!signal) return;   // no signal: the wait never completes
                if (signal.aborted) { reject(abortError()); return; }
                signal.addEventListener('abort', () => reject(abortError()), { once: true });
            });
            return;
        }
        if (typeof streamed === 'object' && !Array.isArray(streamed) && 'gate' in streamed) {
            await streamed.gate;
            for (const text of streamed.chunks) yield { text: () => text };
            return;
        }
        if (typeof streamed === 'object' && !Array.isArray(streamed) && 'after' in streamed) {
            const delayed = streamed as DelayedStep;
            await new Promise<void>((resolve) => setTimeout(resolve, delayed.after));
            if ('error' in delayed) throw new Error(delayed.error);
            for (const text of delayed.chunks) yield { text: () => text };
            return;
        }
        for (const text of streamed as string[]) yield { text: () => text };
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
import { VERBAL_HEDGE_ENV, VERBAL_HEDGE_TRIGGER_ENV } from './llm/verbalHedge';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

/** The technical route's exact call (WhatToAnswerLLM → streamChat with the verbal prompt). */
const technical = (helper: LLMHelper) =>
    helper.streamChat('how do you make ingestion idempotent', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false, 'gemini-3.1-flash-lite');

/** The models the SDK was actually asked, in order. */
const asked = () => generateContentStream.mock.calls.map((c) => c[0].model);

/**
 * The verbal hedge (NATIVELY_VERBAL_HEDGE=1): gemini-3.5-flash-lite starts first; with no first
 * token by the trigger (default 5000 ms), or a pre-token failure, gemini-3.1-flash-lite starts
 * beside it and the first token wins — the other request is aborted through its own signal
 * (never AbortSignal.any: it leaks under Electron 33). Off unless the flag is set, so a flight
 * can compare the shipped stall race against the hedge — see verbalHedge.ts and
 * docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md.
 */
describe('the verbal hedge races gemini-3.5-flash-lite against gemini-3.1-flash-lite', () => {
    const savedHedge = process.env[VERBAL_HEDGE_ENV];
    const savedTrigger = process.env[VERBAL_HEDGE_TRIGGER_ENV];
    const savedLevel = process.env.NATIVELY_GEMINI_THINKING_LEVEL;

    beforeEach(() => {
        vi.useFakeTimers();
        generateContentStream.mockClear();
        plan.length = 0;
        signals.length = 0;
        process.env[VERBAL_HEDGE_ENV] = '1';
        delete process.env[VERBAL_HEDGE_TRIGGER_ENV];
        delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    });
    afterEach(() => {
        vi.useRealTimers();
        if (savedHedge === undefined) delete process.env[VERBAL_HEDGE_ENV]; else process.env[VERBAL_HEDGE_ENV] = savedHedge;
        if (savedTrigger === undefined) delete process.env[VERBAL_HEDGE_TRIGGER_ENV]; else process.env[VERBAL_HEDGE_TRIGGER_ENV] = savedTrigger;
        if (savedLevel === undefined) delete process.env.NATIVELY_GEMINI_THINKING_LEVEL; else process.env.NATIVELY_GEMINI_THINKING_LEVEL = savedLevel;
    });

    it('front speaks at once: one call, the hedge sentinel, and the back never starts', async () => {
        plan.push(['I would key every message ', 'by document id.']);
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            await vi.advanceTimersByTimeAsync(10_000);
            const chunks = await out;
            expect(generateContentStream).toHaveBeenCalledTimes(1);
            expect(asked()).toEqual(['gemini-3.5-flash-lite']);
            expect(chunks).toEqual([
                '__model_source:gemini-3.5-flash-lite (hedge)__',
                'I would key every message ',
                'by document id.',
            ]);
            const line = log.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('won by'));
            expect(line).toMatch(/won by gemini-3\.5-flash-lite at \d+ms; other=not-started/);
        } finally {
            log.mockRestore();
        }
    });

    it('front silent past the trigger: the back starts beside it and wins', async () => {
        plan.push('silent', ['The back answered.']);
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            await vi.advanceTimersByTimeAsync(4999);
            expect(generateContentStream).toHaveBeenCalledTimes(1);
            await vi.advanceTimersByTimeAsync(1);
            expect(generateContentStream).toHaveBeenCalledTimes(2);
            expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
            const chunks = await out;
            expect(chunks[0]).toBe('__model_source:gemini-3.1-flash-lite (hedge)__');
            expect(chunks.join('')).toContain('The back answered.');
            expect(signals[0]?.aborted).toBe(true);
            const lines = log.mock.calls.map((c) => c.join(' '));
            expect(lines.find((l) => l.includes('back started'))).toMatch(/back started at 5000ms reason=trigger/);
            expect(lines.find((l) => l.includes('won by'))).toMatch(/won by gemini-3\.1-flash-lite at \d+ms; other=aborted/);
        } finally {
            log.mockRestore();
        }
    });

    it('front answers slowly, past the trigger, but before the back: front wins, back is aborted', async () => {
        plan.push({ after: 6000, chunks: ['Front answered late.'] }, 'silent');
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(technical(helper));
        await vi.advanceTimersByTimeAsync(6000);
        const chunks = await out;
        expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
        expect(chunks[0]).toBe('__model_source:gemini-3.5-flash-lite (hedge)__');
        expect(chunks.join('')).toContain('Front answered late.');
        expect(signals[1]?.aborted).toBe(true);
    });

    it('front fails before its first token: the back starts at once and wins', async () => {
        plan.push({ error: '503 front' }, ['Back answered after the front failed.']);
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            await vi.advanceTimersByTimeAsync(1);
            expect(generateContentStream).toHaveBeenCalledTimes(2);
            const chunks = await out;
            expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
            expect(chunks[0]).toBe('__model_source:gemini-3.1-flash-lite (hedge)__');
            // The front already failed on its own — nothing aborts a leg that is already settled.
            expect(signals[0]?.aborted).toBe(false);
            const lines = log.mock.calls.map((c) => c.join(' '));
            expect(lines.find((l) => l.includes('back started'))).toMatch(/back started at \d+ms reason=front-error/);
            expect(lines.find((l) => l.includes('won by'))).toMatch(/won by gemini-3\.1-flash-lite at \d+ms; other=failed/);
        } finally {
            log.mockRestore();
            warn.mockRestore();
        }
    });

    it('front is slow, back fails before its first token: front still wins once it answers', async () => {
        plan.push({ after: 7000, chunks: ['Front answered late.'] }, { error: '503 back' });
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            await vi.advanceTimersByTimeAsync(7000);
            const chunks = await out;
            expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
            expect(chunks[0]).toBe('__model_source:gemini-3.5-flash-lite (hedge)__');
            expect(signals[0]?.aborted).toBe(false);
            const line = log.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('won by'));
            expect(line).toMatch(/won by gemini-3\.5-flash-lite at \d+ms; other=failed/);
        } finally {
            log.mockRestore();
        }
    });

    it('both legs fail before a first token: the fronts error propagates, as the shipped race does', async () => {
        // Distinct text per leg (h40c review M4): a bare 'error' step on both legs made this
        // pass even if the code threw the BACK's error first — the assertion below pins which
        // one it must be.
        plan.push({ error: '503 front' }, { error: '503 back' });
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            // Attach the rejection handler in the same tick `out` is created — both legs fail fast
            // enough (no timer needed) that an `await` in between would leave `out` briefly
            // unhandled and print a transient (if harmless) unhandled-rejection warning.
            const rejected = expect(out).rejects.toThrow(/503 front/);
            await vi.advanceTimersByTimeAsync(1);
            await rejected;
            expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
            const line = warn.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('no answer'));
            expect(line).toMatch(/no answer - front error, back error/);
        } finally {
            warn.mockRestore();
        }
    });

    it('the front carries the level 3.5-lite honours (LOW mapped to HIGH); the back keeps LOW; same system bytes', async () => {
        plan.push('silent', ['Back answered.']);
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(technical(helper));
        await vi.advanceTimersByTimeAsync(5000);
        await out;
        const [front, back] = generateContentStream.mock.calls.map((c) => c[0]);
        expect((front.config as any)?.thinkingConfig).toEqual({ thinkingLevel: 'HIGH' });
        expect((back.config as any)?.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
        expect((back.config as any)?.systemInstruction).toBe((front.config as any)?.systemInstruction);
    });

    it('NATIVELY_VERBAL_HEDGE_TRIGGER_MS overrides the trigger', async () => {
        process.env[VERBAL_HEDGE_TRIGGER_ENV] = '300';
        plan.push('silent', ['Back answered.']);
        const helper = new LLMHelper('fake-gemini-key');
        const out = drain(technical(helper));
        await vi.advanceTimersByTimeAsync(299);
        expect(generateContentStream).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(generateContentStream).toHaveBeenCalledTimes(2);
        await out;
    });

    it('closing on the winners sentinel aborts the winners request', async () => {
        plan.push(['Front answered.']);
        const helper = new LLMHelper('fake-gemini-key');
        for await (const c of technical(helper)) { void c; break; }
        // The abortOnClose pattern (LLMHelper.abortOnClose.test.ts): nothing orders the
        // un-awaited close's teardown before the loop's end, so read the signal a macrotask later.
        await vi.advanceTimersByTimeAsync(0);
        expect(asked()).toEqual(['gemini-3.5-flash-lite']);
        expect(signals[0]?.aborted).toBe(true);
    });

    it('trigger path, closing on the winners sentinel: both legs end up aborted (the loser by the winner-selection abort, the winner by the close)', async () => {
        plan.push('silent', ['Back answered.']);
        const helper = new LLMHelper('fake-gemini-key');
        const gen = technical(helper);
        const firstChunk = gen.next();   // starts the generator; registers the trigger timer
        await vi.advanceTimersByTimeAsync(5000);   // trigger fires; the back starts and answers at once
        const { value, done } = await firstChunk;
        expect(done).toBe(false);
        expect(value).toBe('__model_source:gemini-3.1-flash-lite (hedge)__');
        expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
        await gen.return(undefined);
        await vi.advanceTimersByTimeAsync(0);
        expect(signals[0]?.aborted).toBe(true);   // front — the loser, aborted when the back won
        expect(signals[1]?.aborted).toBe(true);   // back — the winner, aborted by the close on its sentinel
    });

    it('both legs fail on the trigger path (the front never answers by the trigger, then both fail): the fronts error propagates', async () => {
        // Distinct from "both legs fail before a first token" above: there, the front's OWN
        // pre-token failure decides the race before the trigger ever fires and only the back is
        // raced in; here BOTH legs are raced in at the trigger (front hasn't answered OR failed
        // yet) and both later fail — the `alive` countdown starts at 2, not 1.
        plan.push({ after: 6000, error: '503 front late' }, { after: 2000, error: '503 back late' });
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            const rejected = expect(out).rejects.toThrow(/503 front late/);
            await vi.advanceTimersByTimeAsync(7000);
            await rejected;
            expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
            const line = warn.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('no answer'));
            expect(line).toMatch(/no answer - front error, back error/);
        } finally {
            warn.mockRestore();
        }
    });

    it('M1 (h40c review): both legs first tokens land in the same tick after the trigger — the loser is still aborted, and labelled aborted, not empty', async () => {
        // Repro G (task-4-review.md, SD\rev4\hedge-repro.mjs): before the fix, `other` fell
        // through to 'empty' and the loser's `stop.abort()` was skipped whenever its `.settled`
        // was already `{kind:'token'}` by the time the winner was picked — a spoken answer
        // nobody reads, mislabelled as if nothing had been said. A shared gate promise, resolved
        // once both legs are parked awaiting it, reliably lands both `leg.first` resolutions in
        // the same microtask turn.
        let resolveGate!: () => void;
        const gate = new Promise<void>((r) => { resolveGate = r; });
        plan.push({ gate, chunks: ['Front answered.'] }, { gate, chunks: ['Back answered.'] });
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            await vi.advanceTimersByTimeAsync(5000);   // trigger: the back starts, both now await the same gate
            resolveGate();
            await vi.advanceTimersByTimeAsync(0);
            const chunks = await out;
            expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
            const winnerIsFront = chunks[0] === '__model_source:gemini-3.5-flash-lite (hedge)__';
            const loserIdx = winnerIsFront ? 1 : 0;
            // The critical assertion: the loser — whichever it is — is aborted, never left
            // running unaborted just because it also happened to produce a token.
            expect(signals[loserIdx]?.aborted).toBe(true);
            const line = log.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('won by'));
            expect(line).toMatch(/other=aborted/);
        } finally {
            log.mockRestore();
        }
    });

    it('default-off pin: the flag unset behaves exactly like today, and logs no hedge line', async () => {
        delete process.env[VERBAL_HEDGE_ENV];
        plan.push('silent', ['fallback answer']);
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const out = drain(technical(helper));
            await vi.advanceTimersByTimeAsync(9_999);
            expect(generateContentStream).toHaveBeenCalledTimes(1);
            await vi.advanceTimersByTimeAsync(1);
            expect(generateContentStream).toHaveBeenCalledTimes(2);
            const chunks = await out;
            expect(asked()).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
            expect(chunks[0]).toBe('__model_source:gemini-3.5-flash-lite (fallback)__');
            expect(log.mock.calls.some((c) => c.join(' ').includes('verbal hedge'))).toBe(false);
        } finally {
            log.mockRestore();
        }
    });

    it('default-off pin: an invalid flag value throws, naming the variable, instead of flying silently off', async () => {
        process.env[VERBAL_HEDGE_ENV] = 'yes';
        plan.push(['unused']);
        const helper = new LLMHelper('fake-gemini-key');
        await expect(drain(technical(helper))).rejects.toThrow(/NATIVELY_VERBAL_HEDGE/);
    });

    it('the behavioral route takes the same hedge (one implementation): front 3.5-lite first', async () => {
        plan.push(['Behavioral answer.']);
        const helper = new LLMHelper('fake-gemini-key');
        const chunks = await drain(helper.streamVerbalWithGeminiFlash('tell me about a conflict', VERBAL_WHAT_TO_ANSWER_PROMPT));
        expect(asked()).toEqual(['gemini-3.5-flash-lite']);
        expect(chunks[0]).toBe('__model_source:gemini-3.5-flash-lite (hedge)__');
    });

    it('a non-lite primary is not hedged: it keeps the ordinary stall race', async () => {
        plan.push(['Answered directly.']);
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const helper = new LLMHelper('fake-gemini-key');
            const chunks = await drain(helper.streamVerbalWithGeminiFlash('tell me about a conflict', VERBAL_WHAT_TO_ANSWER_PROMPT, undefined, 'gemini-3.5-flash'));
            expect(asked()[0]).toBe('gemini-3.5-flash');
            expect(chunks.join('')).not.toContain('(hedge)');
            expect(log.mock.calls.some((c) => c.join(' ').includes('verbal hedge'))).toBe(false);
        } finally {
            log.mockRestore();
        }
    });
});
