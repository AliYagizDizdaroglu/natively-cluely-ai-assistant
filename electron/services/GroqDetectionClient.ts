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
 * Uses openai/gpt-oss-20b via Groq's OpenAI-compatible chat completions API —
 * Groq's sanctioned replacement for llama-3.1-8b-instant (decommissioned
 * 2026-08-16). 20B MoE (3.6B active) on Groq's LPU, ~1s total latency,
 * MMLU 85% vs 68% for the 8B Llama. Override via NATIVELY_QUESTION_DETECTION_MODEL.
 *
 * NOTE (2026-07-02): gpt-oss-20b is blocked by default at the Groq PROJECT
 * level (403 "model_permission_blocked_project"). It must be enabled once at
 * console.groq.com/settings/project/limits for the project the API key belongs
 * to. If a key can't reach it, the startup self-test logs a clear FAIL — fall
 * back via the env override to a reachable model (e.g. llama-3.1-8b-instant
 * until Aug-16, or llama-3.3-70b-versatile after).
 *
 * Free tier (gpt-oss-20b): 30 RPM / 1K RPD / 8K TPM / 200K TPD.
 * Returns null on any error (HTTP, timeout, parse failure). Never throws.
 */
/**
 * Strict response schema for Groq structured outputs (constrained decoding).
 * Supported on openai/gpt-oss-* models — guarantees parseable, shape-valid JSON,
 * eliminating the json-parse/schema-validate failure paths entirely.
 */
const DETECTION_JSON_SCHEMA = {
    name: 'question_detection',
    strict: true,
    schema: {
        type: 'object',
        properties: {
            detected: { type: 'boolean' },
            question: { type: 'string' },
            intent: { type: 'string', enum: ['verbal', 'coding', 'behavioral'] },
            confidence: { type: 'number' },
        },
        required: ['detected', 'question', 'intent', 'confidence'],
        additionalProperties: false,
    },
} as const;

export class GroqDetectionClient implements IDetectionClient {
    private readonly getApiKey: () => string | undefined;
    private readonly timeoutMs: number;
    private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    private readonly model = process.env.NATIVELY_QUESTION_DETECTION_MODEL ?? 'openai/gpt-oss-20b';
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
                    // gpt-oss models: strict json_schema (guaranteed-valid JSON) and
                    // reasoning_effort "low" — the classification doesn't need medium
                    // reasoning, and reasoning tokens dominate decode latency
                    // (measured: 161→84 completion tokens, tail spikes halved).
                    // Other models (env-override fallbacks) may reject those params,
                    // so they keep plain json_object mode.
                    ...(this.model.startsWith('openai/gpt-oss')
                        ? {
                            response_format: { type: 'json_schema', json_schema: DETECTION_JSON_SCHEMA },
                            reasoning_effort: 'low',
                        }
                        : { response_format: { type: 'json_object' } }),
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
                // Log the response body — Groq's error message names the exact
                // cause (bad model id, terms-not-accepted, tier, key scope, etc.).
                let errBody = '';
                try { errBody = (await response.text()).slice(0, 400); } catch { /* ignore */ }
                console.warn(`[GroqDetectionClient] HTTP ${response.status} after ${t1 - t0}ms model="${this.model}" body=${errBody}`);
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
