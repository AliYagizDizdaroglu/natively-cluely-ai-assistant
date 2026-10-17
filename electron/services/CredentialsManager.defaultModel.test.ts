import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
}));

import { CredentialsManager } from './CredentialsManager';

// User ruling 2026-10-18: Gemini 3.5 Flash Lite is the dropdown default - first launch and whenever no model is saved.
describe('CredentialsManager.getDefaultModel', () => {
    it('is gemini-3.5-flash-lite when nothing is saved', () => {
        const cm = CredentialsManager.getInstance() as any;
        cm.credentials = {};
        expect(cm.getDefaultModel()).toBe('gemini-3.5-flash-lite');
    });
    it('keeps a saved choice', () => {
        const cm = CredentialsManager.getInstance() as any;
        cm.credentials = { defaultModel: 'gemini-3.8-flash' };
        expect(cm.getDefaultModel()).toBe('gemini-3.8-flash');
        cm.credentials = { defaultModel: 'gemini-3.1-flash-lite' };
        expect(cm.getDefaultModel()).toBe('gemini-3.1-flash-lite');
    });
});
