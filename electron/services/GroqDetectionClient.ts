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
        this.timeoutMs = opts.timeoutMs ?? 5000;
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
                console.warn(`[GroqDetectionClient] HTTP ${response.status}`);
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
