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
import { CODE_HINT_PROMPT, UNIVERSAL_WHAT_TO_ANSWER_PROMPT, CODING_STYLE_SUFFIX, BRAINSTORM_MODE_PROMPT } from './llm/prompts';

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

describe('LLMHelper.streamChat — the coding style suffix must reach NON-Gemma Gemini models too', () => {
    // Regression guard for the bug this file's Gemma tests hid: resolveGemmaSystemPrompt
    // was only called inside `activeModelId.startsWith('gemma-')`, so the shipped
    // default (CredentialsManager defaults AND migrates everyone to
    // gemini-3.1-flash-lite) answered coding questions with no framing rule and no
    // Pythonic rule. Measured on 16 executed problems: 0/4 framing and 13/15 correct
    // without the suffix, 4/4 and 15/15 with it.
    //
    // The plain-Gemini branch has no systemInstruction — the prompt is inlined into
    // the user message — so these assert on the message text, not on config.
    const userText = (call: { contents: any }) => call.contents[0].parts[0].text as string;

    beforeEach(() => {
        generateContentStream.mockClear();
    });

    it('appends the coding suffix for the coding caller on Flash Lite', async () => {
        const helper = new LLMHelper('fake-gemini-key');

        await drain(helper.streamChat('implement an LRU cache', undefined, undefined, UNIVERSAL_WHAT_TO_ANSWER_PROMPT, false, 'gemini-3.1-flash-lite'));

        expect(generateContentStream).toHaveBeenCalledTimes(1);
        const call = generateContentStream.mock.calls[0][0];
        expect(call.model).toBe('gemini-3.1-flash-lite');
        expect(userText(call)).toContain(CODING_STYLE_SUFFIX);
        // The caller's own prompt must survive alongside it, not be replaced.
        expect(userText(call)).toContain('implement an LRU cache');
    });

    it('does NOT append it for non-coding callers on Flash Lite', async () => {
        const helper = new LLMHelper('fake-gemini-key');

        await drain(helper.streamChat('how do I open this up', undefined, undefined, BRAINSTORM_MODE_PROMPT, false, 'gemini-3.1-flash-lite'));

        expect(generateContentStream).toHaveBeenCalledTimes(1);
        expect(userText(generateContentStream.mock.calls[0][0])).not.toContain(CODING_STYLE_SUFFIX);
    });

    it('carries the LFU guard and the must-run rule through to what Flash Lite actually receives', async () => {
        // End-to-end version of the prompts.test.ts unit checks: the two guards added
        // after the hard-set run have to survive composition into the real message.
        const helper = new LLMHelper('fake-gemini-key');

        await drain(helper.streamChat('implement an LFU cache', undefined, undefined, UNIVERSAL_WHAT_TO_ANSWER_PROMPT, false, 'gemini-3.1-flash-lite'));

        const sent = userText(generateContentStream.mock.calls[0][0]);
        expect(sent).toMatch(/LFU/);
        expect(sent).toMatch(/NameError/);
    });
});
