import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same import-time shims as LLMHelper.knowledgeBudget.test.ts (electron surface + Gemini SDK).
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

const generateContentStream = vi.fn(async (_params: { model: string; contents: unknown; config?: { systemInstruction?: string } }) => {
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
import { VERBAL_WHAT_TO_ANSWER_PROMPT } from './llm/prompts';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

/**
 * Flight s50b (2026-09-11): on the default gemini-3.1-flash-lite the verbal prompt was pasted
 * INTO the user turn ahead of the résumé context and the question, with no systemInstruction —
 * only the Gemma branch used one. The model then treated the rules as context: 5 of 20
 * answers came back as code blocks with numbered walkthroughs. Every offline arm, which
 * sends the same prompt as systemInstruction, produced none.
 */
describe('non-Gemma Gemini models get the system prompt as systemInstruction, like Gemma does', () => {
    beforeEach(() => {
        generateContentStream.mockClear();
    });

    it('verbal answer on gemini-3.1-flash-lite → systemInstruction carries the prompt, the user turn carries only the question', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        await drain(helper.streamChat('how do you shrink an 8 GB training image', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false, 'gemini-3.1-flash-lite'));
        expect(generateContentStream).toHaveBeenCalledTimes(1);
        const { config, contents } = generateContentStream.mock.calls[0][0];
        const system = config?.systemInstruction ?? '';
        expect(system).toContain('INTERVIEW FRAMING');
        expect(system).toContain('[SPOKEN LENGTH + OPTIONAL DEPTH]');
        const userTurn = JSON.stringify(contents);
        expect(userTurn).toContain('how do you shrink an 8 GB training image');
        expect(userTurn).not.toContain('INTERVIEW FRAMING');
    });

    it('typed chat (no verbal override) keeps the inlined form it was measured with', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        await drain(helper.streamChat('hello there', undefined, undefined, undefined, false, 'gemini-3.1-flash-lite'));
        const { config, contents } = generateContentStream.mock.calls[0][0];
        expect(config?.systemInstruction).toBeUndefined();
        expect(JSON.stringify(contents)).toContain('hello there');
    });
});
