import { describe, it, expect } from 'vitest';
import { resolveSttProvider, STT_PROVIDERS } from './sttProviderOverride';

describe('resolveSttProvider', () => {
    it('unset → the saved provider, not overridden', () => {
        expect(resolveSttProvider('groq', undefined, false)).toEqual({ provider: 'groq', overridden: false });
        expect(resolveSttProvider('groq', '', false)).toEqual({ provider: 'groq', overridden: false });
    });
    it('a known name → that provider, overridden when it differs from the saved one', () => {
        expect(resolveSttProvider('groq', 'deepgram', false)).toEqual({ provider: 'deepgram', overridden: true });
        expect(resolveSttProvider('deepgram', 'deepgram', false)).toEqual({ provider: 'deepgram', overridden: false });
    });
    it('an unknown name refuses loudly, naming the value', () => {
        expect(() => resolveSttProvider('groq', 'whisper', false)).toThrow(/NATIVELY_STT_PROVIDER="whisper"/);
    });
    it('a packaged build ignores the variable', () => {
        expect(resolveSttProvider('groq', 'deepgram', true)).toEqual({ provider: 'groq', overridden: false });
    });
    it('the known names are the ten the credential store accepts', () => {
        expect([...STT_PROVIDERS]).toEqual(['none', 'google', 'groq', 'openai', 'deepgram', 'elevenlabs', 'azure', 'ibmwatson', 'soniox', 'natively']);
    });
});
