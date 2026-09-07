import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';

const stubHelper = () => ({} as any);

// after8 (2026-09-07): the six extend answers re-answered the whole question — four of
// six restated the head answer almost verbatim, 104-114 words combined. The extension
// must say only what the fuller sentence adds (spike: p50 27 words vs 58, and every
// extension addressed the added clause).
describe('runWhatShouldISay with extendOf', () => {
    afterEach(() => vi.restoreAllMocks());

    it('hands WhatToAnswerLLM an answer shape that names the answered head and asks only for the added part', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const spy = vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* () {} as any);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const head = 'When would you reach for a service mesh in an ML serving stack?';
        await engine.runWhatShouldISay(`${head.slice(0, -1)}, and when would you not?`, 1.0, undefined, {
            contextOverride: `[INTERVIEWER]: ${head}`, intentOverride: 'verbal', bypassCooldown: true, extendOf: head,
        });
        expect(spy).toHaveBeenCalledTimes(1);
        const intentResult = spy.mock.calls[0][2] as { intent: string; answerShape: string };
        expect(intentResult.intent).toBe('general');
        expect(intentResult.answerShape).toContain(head);
        expect(intentResult.answerShape).toMatch(/only what the added part/i);
        expect(intentResult.answerShape).toMatch(/do not repeat/i);
    });

    it('keeps the ordinary answer shape when extendOf is absent', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const spy = vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* () {} as any);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        await engine.runWhatShouldISay('What is a DAG?', 1.0, undefined, {
            contextOverride: '[INTERVIEWER]: What is a DAG?', intentOverride: 'verbal', bypassCooldown: true,
        });
        const intentResult = spy.mock.calls[0][2] as { answerShape: string };
        expect(intentResult.answerShape).not.toMatch(/only what the added part/i);
    });
});
