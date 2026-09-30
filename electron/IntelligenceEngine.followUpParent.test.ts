import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';
import { FOLLOWUP_PARENT_ENV } from './llm/followUpParent';

const stubHelper = () => ({} as any);

function captureTranscript() {
    const calls: string[] = [];
    vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* (transcript: string) {
        calls.push(transcript);
        yield 'A stubbed answer.';
    });
    return calls;
}

const PARENT = 'Give me the SQL for the second highest salary in each department.';
const ANSWER = 'I would rank salaries per department with dense rank and keep rank two.';
const FOLLOWUP = 'Now without a subquery. Can you do it with a window function?';
/** h40b's R09 → R09F on the app's own clock: the parent's final at T, its answer at T+6 s, the follow-up's final at T+156 s. SessionTracker evicts context older than 120 s on every add, so by then the window holds only the follow-up. */
function sessionAfterHoldoutGap(gapMs = 156_000): SessionTracker {
    const session = new SessionTracker();
    const T = Date.now();
    session.handleTranscript({ speaker: 'interviewer', text: PARENT, timestamp: T, final: true, confidence: 1 });
    vi.setSystemTime(T + 6_000);
    session.addAssistantMessage(ANSWER);
    vi.setSystemTime(T + gapMs);
    session.handleTranscript({ speaker: 'interviewer', text: 'Can you do it with a window function?', timestamp: T + gapMs, final: true, confidence: 1 });
    vi.setSystemTime(T + gapMs + 1_000);
    return session;
}

/**
 * Fix round 1, C1: the parent arrives as TWO STT finals, like h40b's R09
 * ("Give me the SQL for the second highest salary in each department." then,
 * 2 s later, "Say it out loud."). The parent's answer is produced through a
 * REAL runWhatShouldISay call — not session.addAssistantMessage(text) directly
 * — so the call site under test (IntelligenceEngine.ts ~452) is the one that
 * records questionContext, exactly as it does in the app.
 */
async function sessionAfterSplitParent(): Promise<SessionTracker> {
    const session = new SessionTracker();
    const T = Date.now();
    session.handleTranscript({ speaker: 'interviewer', text: PARENT, timestamp: T, final: true, confidence: 1 });
    vi.setSystemTime(T + 2_000);
    session.handleTranscript({ speaker: 'interviewer', text: 'Say it out loud.', timestamp: T + 2_000, final: true, confidence: 1 });
    vi.setSystemTime(T + 6_000);
    await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(
        `${PARENT} Say it out loud.`,
        1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true },
    );
    vi.setSystemTime(T + 156_000);
    session.handleTranscript({ speaker: 'interviewer', text: 'Can you do it with a window function?', timestamp: T + 156_000, final: true, confidence: 1 });
    vi.setSystemTime(T + 157_000);
    return session;
}

describe('runWhatShouldISay and the follow-up parent (NATIVELY_FOLLOWUP_PARENT)', () => {
    const saved = process.env[FOLLOWUP_PARENT_ENV];
    let logSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-26T10:49:50Z')); logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); });
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); if (saved === undefined) delete process.env[FOLLOWUP_PARENT_ENV]; else process.env[FOLLOWUP_PARENT_ENV] = saved; });
    const run = async (session: SessionTracker) => {
        const calls = captureTranscript();
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        return calls[0];
    };
    it('flag unset (shipped): the prompt carries only the follow-up — the h40a/h40b shape, because the 120 s eviction dropped the parent', async () => {
        delete process.env[FOLLOWUP_PARENT_ENV];
        expect(await run(sessionAfterHoldoutGap())).toBe(`[INTERVIEWER]: ${FOLLOWUP}`);
        // M5: the restoration log line must not fire when nothing was restored.
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('previous exchange restored'));
    });
    it('flag on: the parent question and its answer come back ahead of the follow-up', async () => {
        process.env[FOLLOWUP_PARENT_ENV] = '1';
        expect(await run(sessionAfterHoldoutGap())).toBe(`[INTERVIEWER]: ${PARENT.toLowerCase()}\n[ASSISTANT]: ${ANSWER.toLowerCase()}\n[INTERVIEWER]: ${FOLLOWUP}`);
        // M5: the flight reads this line to count restorations — prove it actually fires.
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('previous exchange restored'));
    });
    it('flag on, short gap (R07F, 81 s): the prompt already holds the exchange and is identical to the flag-off prompt', async () => {
        process.env[FOLLOWUP_PARENT_ENV] = '1';
        const on = await run(sessionAfterHoldoutGap(81_000));
        const onLogged = logSpy.mock.calls.some((c) => String(c[0]).includes('previous exchange restored'));
        delete process.env[FOLLOWUP_PARENT_ENV];
        vi.setSystemTime(new Date('2026-09-26T10:49:50Z'));
        const off = await run(sessionAfterHoldoutGap(81_000));
        expect(on).toBe(off);
        expect(on).toBe(`[INTERVIEWER]: ${PARENT.toLowerCase()}\n[ASSISTANT]: ${ANSWER.toLowerCase()}\n[INTERVIEWER]: ${FOLLOWUP}`);
        // M5: the window already held the exchange, so withParentExchange did not restore anything.
        expect(onLogged).toBe(false);
    });

    it('flag on, a two-fragment parent (R09 shape: two STT finals before the answer): the restored line is the full parent question, not its last final', async () => {
        process.env[FOLLOWUP_PARENT_ENV] = '1';
        // captureTranscript() must be in place before sessionAfterSplitParent() runs —
        // it makes its own real runWhatShouldISay call to record the parent's answer.
        const calls = captureTranscript();
        const session = await sessionAfterSplitParent();
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        const followUpPrompt = calls[calls.length - 1];
        const firstLine = followUpPrompt.split('\n')[0];
        expect(firstLine).toContain('second highest salary');
        expect(firstLine).not.toBe('[INTERVIEWER]: say it out loud.');
    });
    it('flag off, the same two-fragment parent: the prompt stays the follow-up alone', async () => {
        delete process.env[FOLLOWUP_PARENT_ENV];
        const calls = captureTranscript();
        const session = await sessionAfterSplitParent();
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(calls[calls.length - 1]).toBe(`[INTERVIEWER]: ${FOLLOWUP}`);
    });

    it('the verbal call site pins the settled question as addAssistantMessage\'s second argument (C1 fix)', async () => {
        const session = new SessionTracker();
        const spy = vi.spyOn(session, 'addAssistantMessage');
        captureTranscript();
        const splitQuestion = `${PARENT} Say it out loud.`;
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(splitQuestion, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(spy).toHaveBeenCalledWith(expect.any(String), splitQuestion);
    });
});
