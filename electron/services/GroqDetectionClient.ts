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
 * Zero cold-start (model always hot), ~700ms total latency.
 *
 * NOTE (2026-07-02): we tried defaulting to openai/gpt-oss-20b (Groq's stated
 * replacement, since llama-3.1-8b-instant is slated for decommission 2026-08-16)
 * but this account's key gets HTTP 403 on gpt-oss-20b — that model needs
 * explicit access/terms-acceptance on the Groq console that this key lacks.
 * llama-3.1-8b-instant works today, so it's the default. Before the Aug-16
 * cutoff, either enable gpt-oss-20b on the Groq console, or point at another
 * model the key CAN reach (e.g. llama-3.3-70b-versatile) via
 * NATIVELY_QUESTION_DETECTION_MODEL.
 *
 * Free tier (llama-3.1-8b-instant): 30 RPM / 14.4K RPD / 6K TPM / 500K TPD.
 * Returns null on any error (HTTP, timeout, parse failure). Never throws.
 */
export class GroqDetectionClient implements IDetectionClient {
    private readonly getApiKey: () => string | undefined;
    private readonly timeoutMs: number;
    private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    private readonly model = process.env.NATIVELY_QUESTION_DETECTION_MODEL ?? 'llama-3.1-8b-instant';
    private parseErrorStreak = 0;

    constructor(opts: GroqDetectionClientOptions) {
        this.getApiKey = opts.getApiKey;
        // 8s default: gpt-oss-20b is larger than the old 8B — sub-second in
        // practice, but the timeout absorbs network jitter + cold-LPU allocation.
        this.timeoutMs = opts.timeoutMs ?? 8000;
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
                    const retryAfter = response.headers.get('retry-after');
                    console.warn(
                        `[GroqDetectionClient] Rate limited (429${retryAfter ? `, retry-after=${retryAfter}s` : ''}) ` +
                        `for model="${this.model}" — free-tier daily/per-minute quota likely exhausted. ` +
                        `Detector will skip until it resets (or set NATIVELY_QUESTION_DETECTION_MODEL to another model).`,
                    );
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
