import { describe, it, expect, vi, beforeEach } from 'vitest';

// LLMHelper transitively imports 'electron' via CredentialsManager/ModelVersionManager.
// Stub the surface those modules touch at import/construction time (same shim as
// IntelligenceEngine.cooldown.test.ts).
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

// streamChat() also does `require('./services/ModesManager')` unconditionally on
// every turn (SQLite-backed, for active-mode injection). That require() runs
// through Node's resolver rather than Vite's module graph, so vi.mock can't
// intercept it here — it throws MODULE_NOT_FOUND in this test environment, which
// streamChat's own try/catch already swallows as "non-fatal" (by design, so a
// broken/absent mode store never blocks a chat response). No active mode is what
// this scenario wants anyway, so that's left as-is rather than worked around.
const generateContentStream = vi.fn(async (_params: { model: string; contents: unknown; config: { systemInstruction?: string } }) => {
    async function* stream() {
        yield { text: () => 'ok' };
    }
    return stream();
});

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: { generateContentStream },
    })),
}));

import { LLMHelper } from './LLMHelper';
import { CODE_HINT_PROMPT } from './llm/prompts';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

describe('LLMHelper.streamChat — Gemma branch must honor caller system prompt overrides', () => {
    beforeEach(() => {
        generateContentStream.mockClear();
    });

    it('sends CODE_HINT_PROMPT (not INTERVIEW_COPILOT_PROMPT) when CodeHintLLM calls streamChat on Gemma', async () => {
        const helper = new LLMHelper('fake-gemini-key');

        // Mirrors CodeHintLLM.generateStream's exact call shape, with an explicit
        // modelOverride forcing the Gemma branch regardless of the dropdown default.
        await drain(helper.streamChat('review my code', undefined, undefined, CODE_HINT_PROMPT, false, 'gemma-4-31b-it'));

        expect(generateContentStream).toHaveBeenCalledTimes(1);
        const { config } = generateContentStream.mock.calls[0][0];
        expect(config.systemInstruction).toContain('DO NOT WRITE THE FULL SOLUTION');
        expect(config.systemInstruction).not.toContain('You are the candidate in a live coding interview');
    });

    it('still defaults to INTERVIEW_COPILOT_PROMPT on Gemma when the caller passes no override', async () => {
        const helper = new LLMHelper('fake-gemini-key');

        await drain(helper.streamChat('what should I say next', undefined, undefined, undefined, false, 'gemma-4-31b-it'));

        expect(generateContentStream).toHaveBeenCalledTimes(1);
        const { config } = generateContentStream.mock.calls[0][0];
        expect(config.systemInstruction).toContain('You are the candidate in a live coding interview');
    });
});
