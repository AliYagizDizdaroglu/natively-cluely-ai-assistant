import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqDetectionClient } from './GroqDetectionClient';

const validContent = JSON.stringify({
    detected: true,
    question: 'How do Transformers work?',
    intent: 'verbal',
    confidence: 0.9,
});

function mockFetchOk() {
    return vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: (): string | null => null },
        text: async () => '',
        json: async () => ({
            choices: [{ message: { content: validContent } }],
            usage: { total_tokens: 100 },
        }),
    }));
}

const input = {
    recentInterviewerTranscript: 'INTERVIEWER: How do Transformers work?',
    fullConversationContext: 'INTERVIEWER: How do Transformers work?',
};

describe('GroqDetectionClient request shape', () => {
    let fetchMock: ReturnType<typeof mockFetchOk>;

    beforeEach(() => {
        fetchMock = mockFetchOk();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.NATIVELY_QUESTION_DETECTION_MODEL;
    });

    it('gpt-oss default model: sends reasoning_effort=low and strict json_schema', async () => {
        const client = new GroqDetectionClient({ getApiKey: () => 'k' });
        const result = await client.detect(input);

        expect(result?.detected).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);

        expect(body.model).toBe('openai/gpt-oss-20b');
        expect(body.reasoning_effort).toBe('low');
        expect(body.temperature).toBe(0);
        expect(body.response_format.type).toBe('json_schema');
        expect(body.response_format.json_schema.strict).toBe(true);
        const schema = body.response_format.json_schema.schema;
        expect(schema.required).toEqual(['detected', 'question', 'intent', 'confidence', 'difficulty']);
        expect(schema.additionalProperties).toBe(false);
        expect(schema.properties.intent.enum).toEqual(['verbal', 'coding', 'behavioral']);
        // 2026-09-08: difficulty is asked for and logged (per-question routing evidence
        // for after9); nothing routes on it yet.
        expect(schema.properties.difficulty.enum).toEqual(['easy', 'medium', 'hard']);
    });

    it('non-gpt-oss override model: keeps json_object and omits reasoning_effort', async () => {
        process.env.NATIVELY_QUESTION_DETECTION_MODEL = 'llama-3.1-8b-instant';
        const client = new GroqDetectionClient({ getApiKey: () => 'k' });
        const result = await client.detect(input);

        expect(result?.detected).toBe(true);
        const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);

        expect(body.model).toBe('llama-3.1-8b-instant');
        expect(body.reasoning_effort).toBeUndefined();
        expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('passes the model\'s difficulty through on the validated response', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true, status: 200, headers: { get: (): string | null => null }, text: async () => '',
            json: async () => ({ choices: [{ message: { content: JSON.stringify({ detected: true, question: 'Design the training pipeline.', intent: 'verbal', confidence: 0.9, difficulty: 'hard' }) } }], usage: { total_tokens: 100 } }),
        })));
        const client = new GroqDetectionClient({ getApiKey: () => 'k' });
        const result = await client.detect(input);
        expect(result?.difficulty).toBe('hard');
    });
});
