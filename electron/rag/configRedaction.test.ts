import { describe, it, expect } from 'vitest';
import { describeConfig } from './configRedaction';

// Regression guard for a real leak: EmbeddingPipeline.initialize() used to call
//   console.log('[EmbeddingPipeline] Initializing with config:', config)
// which wrote the FULL Gemini API key in plaintext into natively_debug.log on
// every app start. describeConfig() is what that log site must use instead.

const SECRET_GEMINI = 'AQ.Ab8RN6JnotarealkeyJustForTheTest0000';
const SECRET_OPENAI = 'sk-proj-notarealkey000000000000000000';

describe('describeConfig', () => {
    it('never emits the key values', () => {
        const out = describeConfig({
            geminiKey: SECRET_GEMINI,
            openaiKey: SECRET_OPENAI,
            ollamaUrl: 'http://localhost:11434',
        });
        expect(out).not.toContain(SECRET_GEMINI);
        expect(out).not.toContain(SECRET_OPENAI);
    });

    it('does not leak even a prefix of a key', () => {
        // Partial keys are still secrets — an 8-char prefix is enough to
        // correlate a key across logs, and is what ElevenLabsStreamingSTT
        // used to print.
        const out = describeConfig({ geminiKey: SECRET_GEMINI, openaiKey: SECRET_OPENAI });
        for (const secret of [SECRET_GEMINI, SECRET_OPENAI]) {
            for (let n = 4; n <= secret.length; n++) {
                expect(out).not.toContain(secret.slice(0, n));
            }
        }
    });

    it('still reports which credentials are present', () => {
        const out = describeConfig({ geminiKey: SECRET_GEMINI });
        expect(out).toMatch(/geminiKey=set/);
        expect(out).toMatch(/openaiKey=unset/);
    });

    it('reports absence for an empty config', () => {
        const out = describeConfig({});
        expect(out).toMatch(/geminiKey=unset/);
        expect(out).toMatch(/openaiKey=unset/);
    });

    it('keeps the ollama URL readable — it is not a secret', () => {
        const out = describeConfig({ ollamaUrl: 'http://localhost:11434' });
        expect(out).toContain('http://localhost:11434');
    });

    it('treats an empty-string key as unset rather than printing it', () => {
        const out = describeConfig({ geminiKey: '', openaiKey: undefined });
        expect(out).toMatch(/geminiKey=unset/);
    });
});
