import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';
import { EARLIER_QUESTION_ENV, formatBlock } from './llm/earlierQuestion';

const stubHelper = () => ({} as any);
/** Captures EVERY argument of each generateStream call; the block is args[8]. */
function captureCalls() {
    const calls: any[][] = [];
    vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* (...args: any[]) { calls.push(args); yield 'A stubbed answer.'; });
    return calls;
}
// Invented sentences (the reference's); none is a roster or holdout sentence.
const PARENT = 'Describe how you would shard the telemetry store by tenant.';
const FOLLOWUP = 'How would you rebalance those shards after a tenant doubles in size?';   // pronoun cue
const OTHER = 'Explain how you would audit access to the telemetry store.';            // no cue
const AUTO = { intentOverride: 'verbal' as const, bypassCooldown: true };
const T0 = new Date('2026-10-04T10:00:00Z');

/** The parent is dispatched on the auto path (turn 1) at T; the follow-up's final lands gapMs later. SessionTracker evicts context older than 120 s on every add. */
async function sessionAfterGap(gapMs: number, parentTurnId: number | null = 1): Promise<{ session: SessionTracker; calls: any[][] }> {
    const session = new SessionTracker();
    const calls = captureCalls();
    const T = T0.getTime();
    session.handleTranscript({ speaker: 'interviewer', text: PARENT, timestamp: T, final: true, confidence: 1 });
    await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(PARENT, 1.0, undefined, { ...AUTO, ...(parentTurnId === null ? {} : { turnId: parentTurnId }) });
    vi.setSystemTime(T + gapMs);
    session.handleTranscript({ speaker: 'interviewer', text: FOLLOWUP, timestamp: T + gapMs, final: true, confidence: 1 });
    vi.setSystemTime(T + gapMs + 1_000);
    return { session, calls };
}
const diagLines = (logSpy: ReturnType<typeof vi.spyOn>) => logSpy.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('[IntelligenceEngine] earlier question:'));

describe('runWhatShouldISay and the EARLIER QUESTION block (spec 2026-10-03 §3.5–3.6)', () => {
    const saved = { eq: process.env[EARLIER_QUESTION_ENV], parent: process.env.NATIVELY_FOLLOWUP_PARENT };
    let logSpy: ReturnType<typeof vi.spyOn>;
    // m11: a shell value of NATIVELY_FOLLOWUP_PARENT would rewrite the transcript under every assertion below.
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); delete process.env.NATIVELY_FOLLOWUP_PARENT; logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); });
    afterEach(() => {
        vi.useRealTimers(); vi.restoreAllMocks();
        const back = (k: string, v: string | undefined) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };
        back(EARLIER_QUESTION_ENV, saved.eq); back('NATIVELY_FOLLOWUP_PARENT', saved.parent);
    });

    it('flag unset (shipped): no block, no diag line, no ledger write, the call is today\'s shape (review I4)', async () => {
        delete process.env[EARLIER_QUESTION_ENV];
        const { session, calls } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        // The first eight arguments are what the pre-change engine passes (IntelligenceEngine.ts:424 at 89c8f53):
        // transcript, temporal context, intent, no images, no forceFastModel, no onSuggestions, no liveTexts, onCues.
        expect(calls[1].slice(0, 8)).toEqual([
            `[INTERVIEWER]: ${FOLLOWUP}`,
            expect.objectContaining({ hasRecentResponses: expect.any(Boolean) }),
            expect.objectContaining({ intent: expect.any(String) }),
            undefined, undefined, undefined, undefined, expect.any(Function),
        ]);
        expect(calls[1][8] ?? '').toBe('');
        expect(diagLines(logSpy)).toEqual([]);
        expect(session.getAskedQuestions()).toEqual([]);
    });
    it('flag on, auto path, parent evicted (156 s): the block is the parent line, the transcript is byte-identical to flag off, the diag line names the turn', async () => {
        delete process.env[EARLIER_QUESTION_ENV];
        const off = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), off.session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        vi.setSystemTime(T0);
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(calls[1][8]).toBe(formatBlock(PARENT));
        expect(calls[1][0]).toBe(off.calls[1][0]);
        expect(session.getAskedQuestions()).toEqual([{ text: PARENT, turnId: 1, seq: 1 }, { text: FOLLOWUP, turnId: 2, seq: 2 }]);
        const lines = diagLines(logSpy);
        expect(lines.at(-1)).toMatch(/^\[IntelligenceEngine\] earlier question: gate=block cue=pronoun chars=\d+ turn=2 ms=\d+$/);
    });
    it('the diag line carries counts, never text (Review Focus 4)', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        for (const l of diagLines(logSpy)) { expect(l).not.toContain('shard'); expect(l).not.toContain('rebalance'); }
    });
    it('flag on, short gap (60 s): the parent is in the prompt -> "" and gate=parent-in-prompt', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(60_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(calls[1][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=parent-in-prompt cue=pronoun chars=0 turn=2');
    });
    it('flag on, chip click (contextOverride, no turnId): ledger written with turnId null, block "" (gate=no-turn)', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { intentOverride: 'verbal', contextOverride: `[INTERVIEWER]: ${FOLLOWUP}` });
        expect(calls[1][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=no-turn cue=pronoun chars=0 turn=none');
        expect(session.getAskedQuestions().at(-1)).toEqual({ text: FOLLOWUP, turnId: null, seq: 2 });
    });
    it('flag on, supersede (replaceAnswer, same turn id as the head): "" and the ledger removes the head, pushes the merged text newest', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(10_000, 1);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(`${PARENT} ${FOLLOWUP}`, 1.0, undefined, { ...AUTO, turnId: 1, replaceAnswer: true });
        expect(calls[1][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=supersede');
        expect(session.getAskedQuestions()).toEqual([{ text: `${PARENT} ${FOLLOWUP}`, turnId: 1, seq: 2 }]);
    });
    it('flag on, the ledger write throws: "" , ONE diag line (gate=error, no gate=block before it), the answer is still delivered and the history untouched', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(156_000);
        const linesBefore = diagLines(logSpy).length;
        vi.spyOn(session, 'recordAskedQuestion').mockImplementation(() => { throw new Error('boom'); });
        const historyBefore = session.getAssistantResponseHistory().length;
        const answer = await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(answer).toBe('A stubbed answer.');
        expect(calls[1][8]).toBe('');
        const lines = diagLines(logSpy).slice(linesBefore);
        expect(lines).toHaveLength(1);                                   // m1: build -> write -> log once
        expect(lines[0]).toMatch(/^\[IntelligenceEngine\] earlier question: gate=error cue=none chars=0 turn=2 ms=\d+/);
        expect(session.getAssistantResponseHistory().length).toBe(historyBefore + 1);
    });
    it('flag unset: the ledger is never read (m2: flag off returns before anything is read, built, logged or written)', async () => {
        delete process.env[EARLIER_QUESTION_ENV];
        const { session } = await sessionAfterGap(156_000);
        const ledgerRead = vi.spyOn(session, 'getAskedQuestions');
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(ledgerRead).not.toHaveBeenCalled();
        expect(diagLines(logSpy)).toEqual([]);
    });
    it('junk flag at call time (belt and braces; startup refuses first): gate=error, "" , the answer still delivered', async () => {
        process.env[EARLIER_QUESTION_ENV] = 'yes';
        const session = new SessionTracker();
        const calls = captureCalls();
        session.handleTranscript({ speaker: 'interviewer', text: FOLLOWUP, timestamp: T0.getTime(), final: true, confidence: 1 });
        const answer = await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(answer).toBe('A stubbed answer.');
        expect(calls[0][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=error');
    });
    it('flag on, no pinned question (settled null): nothing written, gate=no-question', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay('', 1.0, undefined, { ...AUTO, turnId: 5 });
        expect(calls[1][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=no-question cue=none chars=0 turn=5');
        expect(session.getAskedQuestions()).toEqual([{ text: PARENT, turnId: 1, seq: 1 }]);
    });
    it('two calls started without awaiting (Review Focus 3): ledger order = call order, and the second call\'s build already sees the first\'s write', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const session = new SessionTracker();
        captureCalls();
        const T = T0.getTime();
        session.handleTranscript({ speaker: 'interviewer', text: PARENT, timestamp: T, final: true, confidence: 1 });
        session.handleTranscript({ speaker: 'interviewer', text: FOLLOWUP, timestamp: T + 1_000, final: true, confidence: 1 });
        const engine = new IntelligenceEngine(stubHelper(), session);
        const a = engine.runWhatShouldISay(PARENT, 1.0, undefined, { ...AUTO, turnId: 1 });
        const b = engine.runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        await Promise.all([a, b]);
        expect(session.getAskedQuestions().map((e) => [e.text, e.turnId])).toEqual([[PARENT, 1], [FOLLOWUP, 2]]);
        const lines = diagLines(logSpy);
        expect(lines[0]).toContain('turn=1'); expect(lines[0]).toContain('gate=no-cue');
        expect(lines[1]).toContain('turn=2'); expect(lines[1]).toContain('gate=parent-in-prompt');   // not no-parent: call A's write landed before call B built
    });
    it('a coding main is recorded, so a verbal follow-up to it gets it (S1Q04F\'s case)', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const session = new SessionTracker();
        const calls = captureCalls();
        const T = T0.getTime();
        session.handleTranscript({ speaker: 'interviewer', text: OTHER, timestamp: T, final: true, confidence: 1 });
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(OTHER, 1.0, ['C:/tmp/shot.png'], { intentOverride: 'coding', bypassCooldown: true, turnId: 1 });
        expect(calls[0][2].intent).toBe('coding');
        vi.setSystemTime(T + 156_000);
        session.handleTranscript({ speaker: 'interviewer', text: FOLLOWUP, timestamp: T + 156_000, final: true, confidence: 1 });
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(calls[1][8]).toBe(formatBlock(OTHER));
    });
});
