import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaDetectionClient } from './OllamaDetectionClient';

describe('OllamaDetectionClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        // @ts-ignore — assign global fetch mock
        globalThis.fetch = fetchMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns parsed response on valid JSON', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: {
                    content: JSON.stringify({
                        detected: true,
                        question: 'What is your favorite language?',
                        intent: 'verbal',
                        confidence: 0.92,
                    }),
                },
            }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: '[interviewer]: What is your favorite language?',
            fullConversationContext: '...',
        });

        expect(result).toEqual({
            detected: true,
            question: 'What is your favorite language?',
            intent: 'verbal',
            confidence: 0.92,
        });
    });

    it('returns null on invalid JSON', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: { content: 'not valid json {' } }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('returns null on schema mismatch', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: { content: JSON.stringify({ foo: 'bar' }) },
            }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('returns null on HTTP error', async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
        fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('returns null on timeout (>3s) via AbortError path', async () => {
        // Mock fetch that honors AbortSignal — resolves slowly OR rejects with AbortError on abort.
        // This ensures we exercise the catch (e.name === 'AbortError') branch, not the
        // content-undefined fallthrough.
        fetchMock.mockImplementationOnce((_url: string, opts: RequestInit) => {
            return new Promise((resolve, reject) => {
                const slowTimer = setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000);
                const signal = opts.signal as AbortSignal | undefined;
                if (signal) {
                    if (signal.aborted) {
                        clearTimeout(slowTimer);
                        const err: any = new Error('aborted');
                        err.name = 'AbortError';
                        reject(err);
                        return;
                    }
                    signal.addEventListener('abort', () => {
                        clearTimeout(slowTimer);
                        const err: any = new Error('aborted');
                        err.name = 'AbortError';
                        reject(err);
                    }, { once: true });
                }
            });
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b', timeoutMs: 50 });
        const start = Date.now();
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        const elapsed = Date.now() - start;

        expect(result).toBeNull();
        // Should resolve well under 1s (50ms timeout + abort propagation), not wait 5s
        expect(elapsed).toBeLessThan(500);
    });

    it('posts to /api/chat with correct payload', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: { content: JSON.stringify({ detected: false, question: '', intent: 'verbal', confidence: 0.1 }) },
            }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        await client.detect({
            recentInterviewerTranscript: 'recent',
            fullConversationContext: 'full',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, opts] = fetchMock.mock.calls[0];
        expect(url).toBe('http://127.0.0.1:11434/api/chat');
        expect(opts.method).toBe('POST');
        const body = JSON.parse(opts.body);
        expect(body.model).toBe('llama3.1:8b');
        expect(body.format).toBe('json');
        expect(body.stream).toBe(false);
        expect(body.messages).toHaveLength(2);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[1].role).toBe('user');
        expect(body.messages[1].content).toContain('recent');
        expect(body.messages[1].content).toContain('full');
    });

    it('logs warning after 5+ consecutive parse/schema failures, resets on success', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Helper to mock one failing response (schema mismatch — wrong shape but valid JSON)
        const mockSchemaFail = () => fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: { content: JSON.stringify({ foo: 'bar' }) } }),
        });
        // Helper to mock one successful response
        const mockSuccess = () => fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: { content: JSON.stringify({ detected: true, question: 'Q', intent: 'verbal', confidence: 0.9 }) },
            }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });

        // 4 failures: no threshold log yet
        for (let i = 0; i < 4; i++) {
            mockSchemaFail();
            const r = await client.detect({ recentInterviewerTranscript: 'x', fullConversationContext: 'y' });
            expect(r).toBeNull();
        }
        expect(warnSpy.mock.calls.some(call => String(call[0]).includes('5+ consecutive'))).toBe(false);

        // 5th failure: threshold log fires
        mockSchemaFail();
        await client.detect({ recentInterviewerTranscript: 'x', fullConversationContext: 'y' });
        expect(warnSpy.mock.calls.some(call => String(call[0]).includes('5+ consecutive'))).toBe(true);

        // Success resets streak
        warnSpy.mockClear();
        mockSuccess();
        const ok = await client.detect({ recentInterviewerTranscript: 'x', fullConversationContext: 'y' });
        expect(ok).not.toBeNull();

        // One more failure after success: streak is 1, no threshold log
        mockSchemaFail();
        await client.detect({ recentInterviewerTranscript: 'x', fullConversationContext: 'y' });
        expect(warnSpy.mock.calls.some(call => String(call[0]).includes('5+ consecutive'))).toBe(false);

        warnSpy.mockRestore();
    });
});
