import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

// A switch the throw-before-stream test flips; everything else gets the real classifier.
const classifyControl = vi.hoisted(() => ({ throwNext: false }));
vi.mock('./llm/IntentClassifier', async (importOriginal) => {
    const orig = await importOriginal<typeof import('./llm/IntentClassifier')>();
    return {
        ...orig,
        classifyIntent: (...a: Parameters<typeof orig.classifyIntent>) => {
            if (classifyControl.throwNext) { classifyControl.throwNext = false; throw new Error('classify boom'); }
            return orig.classifyIntent(...a);
        },
    };
});

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';

/**
 * Plan rev 2 Task 7: the turnId rides the suggested_answer* events as their LAST argument, an
 * answer-end event fires from a finally on every exit (I2), carries the stream's generation (I1),
 * and a turn's answer goes to the history sink, not the session (I3 / Review Focus 2).
 */
const stubHelper = () => ({} as any);
const QUESTION = 'How much memory for ten million embeddings?';
const PROSE = 'Ten million vectors take thirty gigabytes.';
const BASE = { intentOverride: 'verbal' as const, bypassCooldown: true };

function stubStream(tokens: string[]) {
    vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* () { for (const t of tokens) yield t; });
}
function captureLogs() {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
    return logs;
}
function record(engine: IntelligenceEngine) {
    const ev: { tok: any[][]; fin: any[][]; src: any[][]; end: any[][] } = { tok: [], fin: [], src: [], end: [] };
    engine.on('suggested_answer_token', (...a: any[]) => { ev.tok.push(a); });
    engine.on('suggested_answer', (...a: any[]) => { ev.fin.push(a); });
    engine.on('suggested_answer_source', (...a: any[]) => { ev.src.push(a); });
    engine.on('suggested_answer_end', (...a: any[]) => { ev.end.push(a); });
    return ev;
}
const endLines = (logs: string[]) => logs.filter((l) => l.startsWith('[IntelligenceEngine] answer end '));
const plainAnswerLLM = (engine: IntelligenceEngine) => {
    (engine as any).whatToAnswerLLM = null;
    (engine as any).answerLLM = { generate: async () => 'A plain answer.' };
};

describe('turnId on the suggested_answer* events', () => {
    afterEach(() => { vi.restoreAllMocks(); classifyControl.throwNext = false; });

    it('with turnId 7, every token, the final and the source carry 7 as their last argument', async () => {
        stubStream(['__model_source:gemini-x__Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const ev = record(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7 });
        expect(ev.tok.length).toBe(2);
        for (const a of ev.tok) { expect(a.length).toBe(6); expect(a[5]).toBe(7); }
        expect(ev.fin).toHaveLength(1);
        expect(ev.fin[0].length).toBe(5);
        expect(ev.fin[0][4]).toBe(7);
        expect(ev.src).toEqual([['gemini-x', 7]]);
    });

    it('without a turnId the last argument is undefined and the argument positions are unchanged', async () => {
        stubStream(['__model_source:gemini-x__Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const ev = record(engine);
        await engine.runWhatShouldISay(QUESTION, 0.9, undefined, BASE);
        expect(ev.tok[0].slice(0, 5)).toEqual(['Ten million ', QUESTION, 0.9, false, undefined]);
        expect(ev.tok[0][5]).toBeUndefined();
        expect(ev.fin[0].slice(0, 4)).toEqual([PROSE, QUESTION, 0.9, false]);
        expect(ev.fin[0][4]).toBeUndefined();
        expect(ev.src).toEqual([['gemini-x', undefined]]);
    });
});

describe('suggested_answer_end', () => {
    afterEach(() => { vi.restoreAllMocks(); classifyControl.throwNext = false; });

    it('completed after the final, logged once, carrying the turn id and a generation id', async () => {
        const logs = captureLogs();
        stubStream(['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const order: string[] = [];
        engine.on('suggested_answer', () => order.push('final'));
        engine.on('suggested_answer_end', () => order.push('end'));
        const ev = record(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7 });
        expect(order).toEqual(['final', 'end']);
        expect(ev.end).toHaveLength(1);
        expect(ev.end[0].slice(0, 2)).toEqual([7, 'completed']);
        expect(typeof ev.end[0][2]).toBe('number');
        expect(endLines(logs)).toEqual(['[IntelligenceEngine] answer end turn=7 kind=completed']);
    });

    it('aborted when a second runWhatShouldISay replaces the first; each end logged once and the two generations differ (I1)', async () => {
        const logs = captureLogs();
        let release!: () => void;
        const gate = new Promise<void>((r) => { release = r; });
        let call = 0;
        vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* () {
            const mine = ++call;
            if (mine === 1) { yield 'Old '; await gate; yield 'stale tail'; } else { yield 'New answer text here.'; }
        });
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const ev = record(engine);
        const first = engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7 });
        await vi.waitFor(() => expect(ev.tok.length).toBe(1));
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7, replaceAnswer: true });
        // the replacing stream has finished (and ended) BEFORE the old one notices it was replaced
        expect(ev.end.map((e) => e[1])).toEqual(['completed']);
        release();
        await first;
        expect(ev.end.map((e) => [e[0], e[1]])).toEqual([[7, 'completed'], [7, 'aborted']]);
        const [newGen, oldGen] = [ev.end[0][2], ev.end[1][2]];
        expect(typeof newGen).toBe('number');
        expect(typeof oldGen).toBe('number');
        expect(oldGen).not.toBe(newGen);
        expect(endLines(logs)).toEqual([
            '[IntelligenceEngine] answer end turn=7 kind=completed',
            '[IntelligenceEngine] answer end turn=7 kind=aborted',
        ]);
        expect(ev.fin).toHaveLength(1);
    });

    it('failed when the stream throws; logged once', async () => {
        const logs = captureLogs();
        vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* () { yield 'Ten '; throw new Error('stream boom'); });
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        engine.on('error', () => { /* the engine emits 'error' on a throw; EventEmitter would throw without a listener */ });
        const ev = record(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7 });
        expect(ev.end).toHaveLength(1);
        expect(ev.end[0].slice(0, 2)).toEqual([7, 'failed']);
        expect(endLines(logs)).toEqual(['[IntelligenceEngine] answer end turn=7 kind=failed']);
    });

    describe('rev 2 (I2): every exit emits exactly one end event, only when a turnId is given', () => {
        it('the cooldown return', async () => {
            const logs = captureLogs();
            stubStream([PROSE]);
            const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
            const ev = record(engine);
            await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal' });
            expect(ev.end).toHaveLength(0);
            const r = await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', turnId: 7 });
            expect(r).toBeNull();
            expect(ev.end).toHaveLength(1);
            expect(ev.end[0].slice(0, 2)).toEqual([7, 'aborted']);
            expect(endLines(logs)).toEqual(['[IntelligenceEngine] answer end turn=7 kind=aborted']);
        });

        it('the cooldown return without a turnId emits no end', async () => {
            const logs = captureLogs();
            stubStream([PROSE]);
            const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
            const ev = record(engine);
            await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal' });
            const r = await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal' });
            expect(r).toBeNull();
            expect(ev.end).toHaveLength(0);
            expect(endLines(logs)).toHaveLength(0);
        });

        it('the answerLLM branch (whatToAnswerLLM null)', async () => {
            const logs = captureLogs();
            const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
            plainAnswerLLM(engine);
            const ev = record(engine);
            await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7 });
            expect(ev.fin).toHaveLength(1);
            expect(ev.fin[0][4]).toBe(7);
            expect(ev.end).toHaveLength(1);
            expect(ev.end[0].slice(0, 2)).toEqual([7, 'completed']);
            expect(endLines(logs)).toEqual(['[IntelligenceEngine] answer end turn=7 kind=completed']);
        });

        it('the answerLLM branch without a turnId emits no end event and no end line', async () => {
            const logs = captureLogs();
            const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
            plainAnswerLLM(engine);
            const ev = record(engine);
            await engine.runWhatShouldISay(QUESTION, 1.0, undefined, BASE);
            expect(ev.fin).toHaveLength(1);
            expect(ev.end).toHaveLength(0);
            expect(endLines(logs)).toHaveLength(0);
        });

        it('the no-key return (no answerLLM either)', async () => {
            const logs = captureLogs();
            const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
            (engine as any).whatToAnswerLLM = null;
            (engine as any).answerLLM = null;
            const ev = record(engine);
            await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7 });
            expect(ev.end).toHaveLength(1);
            expect(ev.end[0].slice(0, 2)).toEqual([7, 'aborted']);
            expect(endLines(logs)).toEqual(['[IntelligenceEngine] answer end turn=7 kind=aborted']);
        });

        it('a throw from classifyIntent before the stream', async () => {
            const logs = captureLogs();
            stubStream([PROSE]);
            const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
            engine.on('error', () => { /* swallowed, as main.ts does */ });
            const ev = record(engine);
            classifyControl.throwNext = true;
            await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { bypassCooldown: true, turnId: 7 });
            expect(ev.end).toHaveLength(1);
            expect(ev.end[0].slice(0, 2)).toEqual([7, 'failed']);
            expect(endLines(logs)).toEqual(['[IntelligenceEngine] answer end turn=7 kind=failed']);
        });

        it('a throw from classifyIntent without a turnId emits no end', async () => {
            captureLogs();
            stubStream([PROSE]);
            const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
            engine.on('error', () => { /* swallowed */ });
            const ev = record(engine);
            classifyControl.throwNext = true;
            await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { bypassCooldown: true });
            expect(ev.end).toHaveLength(0);
        });
    });
});

describe('history sink instead of session (Review Focus 2 / I3)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('with a sink and a turnId, the session is NOT called and the sink gets (turnId, fullAnswer, settled)', async () => {
        stubStream(['Ten million ', 'vectors take thirty gigabytes.']);
        const session = new SessionTracker();
        const add = vi.spyOn(session, 'addAssistantMessage');
        const engine = new IntelligenceEngine(stubHelper(), session);
        const sink = vi.fn();
        engine.setTurnHistorySink(sink);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7 });
        expect(add).not.toHaveBeenCalled();
        expect(sink).toHaveBeenCalledTimes(1);
        expect(sink).toHaveBeenCalledWith(7, PROSE, QUESTION);
    });

    it('without a turnId the session is called as today, even with a sink set', async () => {
        stubStream(['Ten million ', 'vectors take thirty gigabytes.']);
        const session = new SessionTracker();
        const add = vi.spyOn(session, 'addAssistantMessage');
        const engine = new IntelligenceEngine(stubHelper(), session);
        const sink = vi.fn();
        engine.setTurnHistorySink(sink);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, BASE);
        expect(sink).not.toHaveBeenCalled();
        expect(add).toHaveBeenCalledWith(PROSE, QUESTION);
    });

    it('a null sink restores the session path even with a turnId', async () => {
        stubStream([PROSE]);
        const session = new SessionTracker();
        const add = vi.spyOn(session, 'addAssistantMessage');
        const engine = new IntelligenceEngine(stubHelper(), session);
        engine.setTurnHistorySink(vi.fn());
        engine.setTurnHistorySink(null);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { ...BASE, turnId: 7 });
        expect(add).toHaveBeenCalledTimes(1);
    });
});
