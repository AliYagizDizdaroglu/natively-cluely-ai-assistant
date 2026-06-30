import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GroqDetectionClient } from './GroqDetectionClient';

const VALID_PAYLOAD = {
    detected: true,
    question: 'Tell me about your background',
    intent: 'behavioral' as const,
    confidence: 0.9,
};

function mockResponse(body: any, ok = true, status = 200, headers: Record<string, string> = {}) {
    return {
        ok,
        status,
        headers: {
            get: (k: string) => headers[k.toLowerCase()] ?? null,
        },
        json: async () => body,
    } as any;
}

describe('GroqDetectionClient', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        fetchSpy = vi.spyOn(global, 'fetch' as any);
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { /* silence */ });
    });
    afterEach(() => {
        fetchSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    it('returns null when no apiKey is configured', async () => {
        const client = new GroqDetectionClient({ model: 'openai/gpt-oss-20b', apiKey: '' });
        const result = await client.detect({
            recentInterviewerTranscript: 'whatever',
            fullConversationContext: 'whatever',
        });
        expect(result).toBeNull();
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('hits the Groq /chat/completions endpoint with the configured model + JSON mode', async () => {
        fetchSpy.mockResolvedValueOnce(mockResponse({
            choices: [{ message: { content: JSON.stringify(VALID_PAYLOAD) } }],
        }));

        const client = new GroqDetectionClient({ model: 'openai/gpt-oss-20b', apiKey: 'k' });
        const result = await client.detect({
            recentInterviewerTranscript: 'Tell me about your background',
            fullConversationContext: 'INTERVIEWER: Tell me about your background',
        });

        expect(result).toEqual(VALID_PAYLOAD);
        expect(fetchSpy).toHaveBeenCalledOnce();
        const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
        expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer k');
        const body = JSON.parse(opts.body as string);
        expect(body.model).toBe('openai/gpt-oss-20b');
        expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('surfaces a 429 rate-limit warning with retry-after and returns null', async () => {
        fetchSpy.mockResolvedValueOnce(mockResponse(null, false, 429, { 'retry-after': '42' }));

        const client = new GroqDetectionClient({ model: 'openai/gpt-oss-20b', apiKey: 'k' });
        const result = await client.detect({
            recentInterviewerTranscript: '',
            fullConversationContext: '',
        });

        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledOnce();
        const msg = consoleWarnSpy.mock.calls[0][0] as string;
        expect(msg).toContain('Rate limited (429');
        expect(msg).toContain('retry-after=42s');
        expect(msg).toContain('openai/gpt-oss-20b');
    });

    it('returns null on non-429 HTTP error without the rate-limit warning text', async () => {
        fetchSpy.mockResolvedValueOnce(mockResponse(null, false, 500));

        const client = new GroqDetectionClient({ model: 'openai/gpt-oss-20b', apiKey: 'k' });
        const result = await client.detect({
            recentInterviewerTranscript: '',
            fullConversationContext: '',
        });

        expect(result).toBeNull();
        const msg = consoleWarnSpy.mock.calls[0][0] as string;
        expect(msg).toContain('HTTP 500');
        expect(msg).not.toContain('Rate limited');
    });

    it('returns null when the response content is not valid JSON', async () => {
        fetchSpy.mockResolvedValueOnce(mockResponse({
            choices: [{ message: { content: 'not-json' } }],
        }));

        const client = new GroqDetectionClient({ model: 'openai/gpt-oss-20b', apiKey: 'k' });
        const result = await client.detect({
            recentInterviewerTranscript: '',
            fullConversationContext: '',
        });

        expect(result).toBeNull();
    });

    it('returns null when the schema validator rejects the payload', async () => {
        fetchSpy.mockResolvedValueOnce(mockResponse({
            choices: [{ message: { content: JSON.stringify({ detected: 'yes' }) } }],
        }));

        const client = new GroqDetectionClient({ model: 'openai/gpt-oss-20b', apiKey: 'k' });
        const result = await client.detect({
            recentInterviewerTranscript: '',
            fullConversationContext: '',
        });

        expect(result).toBeNull();
    });

    it('returns null on AbortError (timeout)', async () => {
        fetchSpy.mockImplementationOnce((_url: string, init: RequestInit) => {
            return new Promise((_resolve, reject) => {
                init.signal?.addEventListener('abort', () => {
                    const e = new Error('aborted');
                    (e as any).name = 'AbortError';
                    reject(e);
                });
            });
        });

        const client = new GroqDetectionClient({
            model: 'openai/gpt-oss-20b',
            apiKey: 'k',
            timeoutMs: 30,
        });
        const result = await client.detect({
            recentInterviewerTranscript: '',
            fullConversationContext: '',
        });

        expect(result).toBeNull();
        const msg = consoleWarnSpy.mock.calls[0][0] as string;
        expect(msg).toContain('Detection timed out after 30ms');
    });
});
