import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same import-time shims as LLMHelper.knowledgeBudget.test.ts (electron surface + Gemini SDK),
// plus the Groq SDK reduced to the one call streamChat's Groq branch makes.
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

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContentStream: vi.fn() } })),
}));

const create = vi.fn(async (_params: { model: string; messages: Array<{ role: string; content: string }> }) => {
    async function* stream() {
        yield { choices: [{ delta: { content: 'ok' } }] };
    }
    return stream();
});

vi.mock('groq-sdk', () => ({
    default: vi.fn().mockImplementation(() => ({ chat: { completions: { create } } })),
}));

import { LLMHelper } from './LLMHelper';
import { VERBAL_WHAT_TO_ANSWER_PROMPT } from './llm/prompts';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

/** The Groq branch, like the Gemini one: the verbal prompt is the system message, the question the user turn. */
describe('Groq models get the verbal prompt as a system message', () => {
    beforeEach(() => {
        create.mockClear();
    });

    it('verbal answer on a Groq model → system + user messages', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        helper.setGroqApiKey('fake-groq-key');
        helper.setModel('qwen/qwen3.8-27b');
        await drain(helper.streamChat('how do you shrink an 8 GB training image', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false));
        expect(create).toHaveBeenCalledTimes(1);
        const { messages } = create.mock.calls[0][0];
        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe('system');
        expect(messages[0].content).toContain('INTERVIEW FRAMING');
        expect(messages[1].role).toBe('user');
        expect(messages[1].content).toContain('how do you shrink an 8 GB training image');
        expect(messages[1].content).not.toContain('INTERVIEW FRAMING');
    });

    it('typed chat (no verbal override) keeps the single inlined user message it was measured with', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        helper.setGroqApiKey('fake-groq-key');
        helper.setModel('qwen/qwen3.8-27b');
        await drain(helper.streamChat('hello there', undefined, undefined, undefined, false));
        const { messages } = create.mock.calls[0][0];
        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe('user');
        expect(messages[0].content).toContain('hello there');
    });
});
