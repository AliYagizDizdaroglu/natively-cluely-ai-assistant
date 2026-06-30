import {
    QUESTION_DETECTION_SYSTEM_PROMPT,
    buildDetectionUserMessage,
    validateDetectionResponse,
    DetectionResponse,
} from '../llm/prompts/questionDetection';
import { DetectionClient, DetectionInput } from './DetectionClient';

interface GroqDetectionClientOptions {
    model: string;
    apiKey: string;
    apiUrl?: string;
    timeoutMs?: number;
}

const DEFAULT_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqDetectionClient implements DetectionClient {
    private readonly model: string;
    private readonly apiKey: string;
    private readonly apiUrl: string;
    private readonly timeoutMs: number;
    private parseErrorStreak = 0;

    constructor(opts: GroqDetectionClientOptions) {
        this.model = opts.model;
        this.apiKey = opts.apiKey;
        this.apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
        // 8s default: gpt-oss-20b is a 20B MoE (3.6B active) — ~1000 TPS on Groq's
        // LPU so detection itself completes in <1s, but the timeout includes
        // network jitter + cold-LPU allocation. 8s gives defensive headroom.
        this.timeoutMs = opts.timeoutMs ?? 8000;
    }

    async detect(input: DetectionInput): Promise<DetectionResponse | null> {
        if (!this.apiKey) return null;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    response_format: { type: 'json_object' },
                    temperature: 0.1,
                    top_p: 0.9,
                    stream: false,
                    messages: [
                        { role: 'system', content: QUESTION_DETECTION_SYSTEM_PROMPT },
                        { role: 'user', content: buildDetectionUserMessage(input) },
                    ],
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = response.headers.get('retry-after');
                    // Free-tier gpt-oss-20b: 30 RPM / 1K RPD / 8K TPM / 200K TPD.
                    // RPD ceiling is the most common heavy-user hit — surface it
                    // explicitly so users can swap to a different model via
                    // NATIVELY_QUESTION_DETECTION_MODEL or upgrade Groq tier.
                    console.warn(
                        `[GroqDetectionClient] Rate limited (429${retryAfter ? `, retry-after=${retryAfter}s` : ''}). ` +
                        `Free-tier daily/per-minute quota likely exhausted for model="${this.model}". ` +
                        `Detector will silently skip until the quota resets.`,
                    );
                } else {
                    console.warn(`[GroqDetectionClient] HTTP ${response.status}`);
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
                `[GroqDetectionClient] 5+ consecutive parse/schema failures (mode=${mode}) — prompt or model may be drifting. ${detail}`,
            );
        }
    }
}
