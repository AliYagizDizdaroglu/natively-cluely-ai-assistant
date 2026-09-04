import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';

/**
 * The seam behind the 2026-09-04 flight's four wrong answers: the answer prompt
 * ended with whatever STT line was last, never with the dispatched question
 * (spec 2026-09-04 §1–2). generateStream is stubbed so the transcript it is
 * handed can be read back; streamChat never runs.
 */
const SETTLED = 'How do you keep feature engineering consistent between training and serving?';
const stubHelper = () => ({} as any);

function captureTranscript() {
    const calls: string[] = [];
    vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* (transcript: string) {
        calls.push(transcript);
        yield 'A pinned answer from the stub.';
    });
    return calls;
}
function captureLogs() {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
    return logs;
}
function sessionWithFragmentAndInterim(): SessionTracker {
    const session = new SessionTracker();
    const now = Date.now();
    session.handleTranscript({ speaker: 'interviewer', text: 'Serving.', timestamp: now - 5000, final: true, confidence: 1 });
    // an interim that never became a final — the M28 shape
    session.handleTranscript({ speaker: 'interviewer', text: 'How do you keep feature engineering consistent', timestamp: now, final: false, confidence: 1 });
    return session;
}

describe('runWhatShouldISay pins the settled question', () => {
    afterEach(() => vi.restoreAllMocks());

    it('transcript path (Auto dispatch): the prompt ends with the settled question, the fragment is absorbed, no interim is injected', async () => {
        const logs = captureLogs();
        const calls = captureTranscript();
        const engine = new IntelligenceEngine(stubHelper(), sessionWithFragmentAndInterim());
        await engine.runWhatShouldISay(SETTLED, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(calls).toHaveLength(1);
        expect(calls[0]).toBe(`[INTERVIEWER]: ${SETTLED}`);
        expect(logs.some((l) => l.includes('Injecting interim transcript'))).toBe(false);
        expect(logs).toContain(`[IntelligenceEngine] runWhatShouldISay: pinned question ${JSON.stringify(SETTLED)}`);
    });

    it('contextOverride path (chip click): the snapshot tail is rewritten to the chip question', async () => {
        captureLogs();
        const calls = captureTranscript();
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        await engine.runWhatShouldISay(SETTLED, 1.0, undefined, {
            intentOverride: 'verbal',
            contextOverride: '[INTERVIEWER]: how do you handle deletes across services?\n[ASSISTANT (PREVIOUS SUGGESTION)]: i would publish a deletion event.\n[INTERVIEWER]: serving.',
        });
        expect(calls[0]).toBe(`[INTERVIEWER]: how do you handle deletes across services?\n[ASSISTANT (PREVIOUS SUGGESTION)]: i would publish a deletion event.\n[INTERVIEWER]: ${SETTLED}`);
    });

    it('without a question nothing changes: transcript as before, interim injected, no pinned line', async () => {
        const logs = captureLogs();
        const calls = captureTranscript();
        const engine = new IntelligenceEngine(stubHelper(), sessionWithFragmentAndInterim());
        // intentOverride keeps classifyIntent (regex → SLM → heuristic) out of the test.
        await engine.runWhatShouldISay(undefined, 0.8, undefined, { intentOverride: 'verbal' });
        expect(calls[0]).toBe('[INTERVIEWER]: serving.\n[INTERVIEWER]: how do you keep feature engineering consistent');
        expect(logs.some((l) => l.includes('Injecting interim transcript'))).toBe(true);
        expect(logs.some((l) => l.includes('pinned question'))).toBe(false);
    });
});
