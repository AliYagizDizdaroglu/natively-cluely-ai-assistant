import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same import-time shims as LLMHelper.streamChat.test.ts (electron surface + Gemini SDK).
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

// Everything the model was sent, whichever field carried the system prompt.
const sentText = () => generateContentStream.mock.calls.map((c) => JSON.stringify(c[0])).join('\n');

const NOTES = 'Led the payments migration at Acme; interviewing for a staff role.';

describe('custom notes reach the hands-free answer paths', () => {
    beforeEach(() => {
        generateContentStream.mockClear();
    });

    it('streamChat with the verbal override (technical path) carries the <user_context> block', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        helper.setCustomNotes(NOTES);
        await drain(helper.streamChat('how does an index speed up a query', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false, 'gemma-4-31b-it'));
        expect(generateContentStream).toHaveBeenCalledTimes(1);
        const { config } = generateContentStream.mock.calls[0][0];
        expect(config?.systemInstruction).toContain('<user_context>');
        expect(config?.systemInstruction).toContain(NOTES);
        expect(config?.systemInstruction).toContain('Never quote it verbatim');
    });

    it('streamVerbalWithGeminiFlash (behavioral / fast path) carries the <user_context> block', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        helper.setCustomNotes(NOTES);
        await drain(helper.streamVerbalWithGeminiFlash('tell me about a time you disagreed', VERBAL_WHAT_TO_ANSWER_PROMPT));
        expect(generateContentStream).toHaveBeenCalled();
        expect(sentText()).toContain('<user_context>');
        expect(sentText()).toContain(NOTES);
    });

    it('no notes → no block on either path', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        await drain(helper.streamChat('how does an index speed up a query', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false, 'gemma-4-31b-it'));
        await drain(helper.streamVerbalWithGeminiFlash('tell me about a time you disagreed', VERBAL_WHAT_TO_ANSWER_PROMPT));
        expect(sentText()).not.toContain('<user_context>');
    });
});
