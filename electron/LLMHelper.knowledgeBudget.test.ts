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

// The Context toggle's knowledge engine, reduced to what streamChat's intercept reads.
const KNOWLEDGE_PROMPT = 'You generate interview-ready speech for the candidate.\n<knowledge_engine_rules>\n- speak in first person\n</knowledge_engine_rules>';
const fakeOrchestrator = () => ({
    isKnowledgeMode: () => true,
    feedForDepthScoring: () => { /* no-op */ },
    processQuestion: async () => ({ systemPromptInjection: KNOWLEDGE_PROMPT, identityHeader: 'You generate interview-ready speech for Ada, who works as an MLOps engineer.', contextBlock: '<candidate_skills>Python, Airflow</candidate_skills>', isIntroQuestion: false }),
});

describe('Context toggle on: the verbal path keeps its own prompt; the résumé arrives as context', () => {
    beforeEach(() => {
        generateContentStream.mockClear();
    });

    it('verbal answer → the verbal prompt itself + the custom notes; the knowledge rules stay out, the résumé block goes in the message', async () => {
        const helper = new LLMHelper('fake-gemini-key');
        helper.setKnowledgeOrchestrator(fakeOrchestrator());
        helper.setCustomNotes('Interviewing for a staff MLOps role.');
        await drain(helper.streamChat('how do you shrink an 8 GB training image', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false, 'gemma-4-31b-it'));
        expect(generateContentStream).toHaveBeenCalledTimes(1);
        const { config, contents } = generateContentStream.mock.calls[0][0];
        const system = config?.systemInstruction ?? '';
        expect(system).toContain('INTERVIEW FRAMING');
        expect(system).toContain('[SPOKEN LENGTH + OPTIONAL DEPTH]');
        expect(system).toContain('<user_context>');
        expect(system).not.toContain('<knowledge_engine_rules>');
        expect(system).toContain('interview-ready speech for Ada, who works as an MLOps engineer');
        expect(JSON.stringify(contents)).toContain('<candidate_skills>Python, Airflow</candidate_skills>');
    });

    it('typed chat (no verbal override) → knowledge prompt without the spoken budget block', async () => {
        // Plain Gemini branch (no model override): the system prompt is inlined into the
        // request, so check everything that was sent. (The Gemma branch is not used here —
        // without a caller override it always takes INTERVIEW_COPILOT_PROMPT.)
        const helper = new LLMHelper('fake-gemini-key');
        helper.setKnowledgeOrchestrator(fakeOrchestrator());
        await drain(helper.streamChat('how do you shrink an 8 GB training image'));
        expect(generateContentStream).toHaveBeenCalled();
        const sent = generateContentStream.mock.calls.map((c) => JSON.stringify(c[0])).join('\n');
        expect(sent).toContain('knowledge_engine_rules');
        expect(sent).not.toContain('[SPOKEN LENGTH + OPTIONAL DEPTH]');
    });
});
