import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// IntelligenceEngine transitively imports 'electron' (IntentClassifier,
// CredentialsManager) — stub the surface those modules touch at import time.
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

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';

// Bare stub: runWhatShouldISay's verbal path calls streamVerbalWithGeminiFlash,
// which throws on the stub — WhatToAnswerLLM catches it and yields its fallback
// string, so the run completes without network and returns non-null.
const stubHelper = () => ({} as any);

describe('IntelligenceEngine trigger cooldown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('chip clicks (contextOverride) bypass the 3s trigger cooldown', async () => {
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());

        const first = await engine.runWhatShouldISay('Q1', 1.0, undefined, {
            contextOverride: 'INTERVIEWER: q1', intentOverride: 'verbal',
        });
        expect(first).not.toBeNull();

        // Second chip click 1s later — an explicit user action must not be swallowed
        vi.advanceTimersByTime(1000);
        const second = await engine.runWhatShouldISay('Q2', 1.0, undefined, {
            contextOverride: 'INTERVIEWER: q2', intentOverride: 'verbal',
        });
        expect(second).not.toBeNull();
    });

    it('auto-triggers (no overrides) still respect the cooldown', async () => {
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());

        const first = await engine.runWhatShouldISay('Q1');
        expect(first).not.toBeNull();

        vi.advanceTimersByTime(1000);
        const second = await engine.runWhatShouldISay('Q2');
        expect(second).toBeNull();
    });
});
