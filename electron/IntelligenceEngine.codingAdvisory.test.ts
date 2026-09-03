import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';

// Stub helper that records what generateStream was routed with by capturing the
// intent the engine logs. streamChat/streamVerbal throw, so the run completes
// on WhatToAnswerLLM's failure path without network.
const stubHelper = () => ({} as any);

describe('coding intent from a detector without a screenshot', () => {
    afterEach(() => vi.restoreAllMocks());

    it('is mapped to general so the spoken answer goes through the verbal filters', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.join(' ')); });
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        await engine.runWhatShouldISay('How would you handle a task in Airflow that intermittently fails?', 1.0, undefined, {
            contextOverride: '[INTERVIEWER]: How would you handle a task in Airflow that intermittently fails?', intentOverride: 'coding',
        });
        expect(logs.some((l) => l.includes('intent override coding → general (spoken question, no screenshot)'))).toBe(true);
        expect(logs.some((l) => l.includes('intent override → coding'))).toBe(false);
    });

    it('stays coding when a screenshot is attached', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.join(' ')); });
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        await engine.runWhatShouldISay('Solve this', 1.0, ['C:/tmp/shot.png'], {
            contextOverride: '[INTERVIEWER]: Solve this', intentOverride: 'coding',
        });
        expect(logs.some((l) => l.includes('intent override → coding'))).toBe(true);
    });
});
