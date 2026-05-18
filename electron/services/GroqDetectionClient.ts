import {
    QUESTION_DETECTION_SYSTEM_PROMPT,
    buildDetectionUserMessage,
    validateDetectionResponse,
    DetectionResponse,
} from '../llm/prompts/questionDetection';

interface DetectionInput {
    recentInterviewerTranscript: string;
    fullConversationContext: string;
}

export interface IDetectionClient {
    detect(input: DetectionInput): Promise<DetectionResponse | null>;
}

interface GroqDetectionClientOptions {
    /** Groq API key provider — read at call time so key changes take effect immediately. */
    getApiKey: () => string | undefined;
    timeoutMs?: number;  // default 5000ms — Groq first token < 100ms, full response < 1s
}

/**
 * Groq cloud replacement for OllamaDetectionClient.
 * Uses llama-3.1-8b-instant via Groq's OpenAI-compatible chat completions API.
 * Zero cold-start (model always hot), ~300ms total latency vs ~2100ms warm Ollama.
 *
 * Free tier: 30 RPM / 14.4K RPD / 6K TPM / 500K TPD.
 * Each detect call ≈ 300-500 tokens → ~12-20 calls/min within TPM ceiling.
 * Real interview cadence (1-2 questions/min) is well under that.
 *
 * Returns null on any error (HTTP, timeout, parse failure). Never throws.
 */
export class GroqDetectionClient implements IDetectionClient {
    private readonly getApiKey: () => string | undefined;
    private readonly timeoutMs: number;
    private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    private readonly model = 'llama-3.1-8b-instant';
    private parseErrorStreak = 0;

    constructor(opts: GroqDetectionClientOptions) {
        this.getApiKey = opts.getApiKey;
        this.timeoutMs = opts.timeoutMs ?? 5000;
    }

    async detect(input: DetectionInput): Promise<DetectionResponse | null> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            console.warn('[GroqDetectionClient] No API key — detection skipped');
            return null;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        const t0 = Date.now();
        console.log(`[GroqDetectionClient] detect issued at wall=${t0}`);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    response_format: { type: 'json_object' },
                    stream: false,
                    temperature: 0.1,
                    top_p: 0.9,
                    messages: [
                        { role: 'system', content: QUESTION_DETECTION_SYSTEM_PROMPT },
                        { role: 'user', content: buildDetectionUserMessage(input) },
                    ],
                }),
                signal: controller.signal,
            });

            const t1 = Date.now();
            if (!response.ok) {
                console.warn(`[GroqDetectionClient] HTTP ${response.status} after ${t1 - t0}ms`);
                if (response.status === 429) {
                    console.warn('[GroqDetectionClient] Rate limited — check TPM/RPM usage');
                }
                return null;
            }

            let data: any;
            try {
                data = await response.json();
            } catch (e: any) {
                this.recordParseFailure('http-body-parse', e?.message);
                return null;
            }

            const t2 = Date.now();
            const tokens = data?.usage?.total_tokens ?? '?';
            console.log(`[GroqDetectionClient] detect ok: gen=${t1 - t0}ms body=${t2 - t1}ms total=${t2 - t0}ms tokens=${tokens}`);

            const content = data?.choices?.[0]?.message?.content;
            if (typeof content !== 'string') {
                this.recordParseFailure('missing-content', 'choices[0].message.content not a string');
                return null;
            }

            let parsed: unknown;
            try {
                parsed = JSON.parse(content);
            } catch (e: any) {
                this.recordParseFailure('json-parse', `raw=${content.slice(0, 200)}`);
                return null;
            }

            const validated = validateDetectionResponse(parsed);
            if (!validated) {
                this.recordParseFailure('schema-validate', `raw=${content.slice(0, 200)}`);
                return null;
            }

            this.parseErrorStreak = 0;
            return validated;
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                console.warn(`[GroqDetectionClient] Detection timed out after ${this.timeoutMs}ms`);
            } else {
                console.warn(`[GroqDetectionClient] Request failed: ${e?.message ?? String(e)}`);
            }
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    private recordParseFailure(mode: string, detail: string): void {
        this.parseErrorStreak++;
        if (this.parseErrorStreak >= 5) {
            console.warn(
                `[GroqDetectionClient] 5+ consecutive parse/schema failures (mode=${mode}) — ${detail}`
            );
        }
    }
}
