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

interface OllamaDetectionClientOptions {
    model: string;
    ollamaUrl?: string;       // default 'http://127.0.0.1:11434'
    timeoutMs?: number;       // default 3000
}

/**
 * Single-purpose Ollama HTTP wrapper for the question-detection prompt.
 * Returns the parsed DetectionResponse, or null on any error (HTTP, timeout,
 * parse failure, schema mismatch). Never throws.
 */
export class OllamaDetectionClient {
    private readonly model: string;
    private readonly ollamaUrl: string;
    private readonly timeoutMs: number;
    private parseErrorStreak = 0;

    constructor(opts: OllamaDetectionClientOptions) {
        this.model = opts.model;
        this.ollamaUrl = opts.ollamaUrl ?? 'http://127.0.0.1:11434';
        this.timeoutMs = opts.timeoutMs ?? 3000;
    }

    async detect(input: DetectionInput): Promise<DetectionResponse | null> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(`${this.ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    format: 'json',
                    stream: false,
                    options: { temperature: 0.1, top_p: 0.9 },
                    keep_alive: '10m',
                    messages: [
                        { role: 'system', content: QUESTION_DETECTION_SYSTEM_PROMPT },
                        { role: 'user', content: buildDetectionUserMessage(input) },
                    ],
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                console.warn(`[OllamaDetectionClient] HTTP ${response.status}`);
                return null;
            }

            const data = await response.json();
            const content = data?.message?.content;
            if (typeof content !== 'string') {
                console.warn('[OllamaDetectionClient] Missing message.content in response');
                return null;
            }

            let parsed: unknown;
            try {
                parsed = JSON.parse(content);
            } catch (e) {
                this.parseErrorStreak++;
                if (this.parseErrorStreak >= 5) {
                    console.warn(`[OllamaDetectionClient] 5+ consecutive JSON parse failures — prompt may be broken. Raw: ${content.slice(0, 200)}`);
                }
                return null;
            }

            const validated = validateDetectionResponse(parsed);
            if (!validated) {
                this.parseErrorStreak++;
                return null;
            }

            this.parseErrorStreak = 0;
            return validated;
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.log(`[OllamaDetectionClient] Detection timed out after ${this.timeoutMs}ms`);
            } else {
                console.warn(`[OllamaDetectionClient] Request failed: ${e.message}`);
            }
            return null;
        } finally {
            clearTimeout(timer);
        }
    }
}
