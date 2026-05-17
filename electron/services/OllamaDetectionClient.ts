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
 *
 * Tracks consecutive parse/schema failures across calls; logs a louder warning
 * at 5+ in a row so prompt-drift regressions are surfaced.
 */
export class OllamaDetectionClient {
    private readonly model: string;
    private readonly ollamaUrl: string;
    private readonly timeoutMs: number;
    private parseErrorStreak = 0;

    constructor(opts: OllamaDetectionClientOptions) {
        this.model = opts.model;
        this.ollamaUrl = opts.ollamaUrl ?? 'http://127.0.0.1:11434';
        // keep_alive: '10m' below keeps llama loaded in Ollama for 10 minutes after
        // the last call, avoiding cold-start latency for the polling loop in
        // QuestionDetector (Task 5).
        this.timeoutMs = opts.timeoutMs ?? 3000;
    }

    async detect(input: DetectionInput): Promise<DetectionResponse | null> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        // Latency breakdown: t0 = issued, t1 = headers back, t2 = body parsed.
        // Lets us tell cold-load (long t0→t1) from JSON-mode slow generation
        // (also long t0→t1) from body/parse overhead (long t1→t2).
        const t0 = Date.now();
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

            const t1 = Date.now();
            if (!response.ok) {
                console.warn(`[OllamaDetectionClient] HTTP ${response.status} after ${t1 - t0}ms`);
                return null;
            }

            // response.json() can throw (truncated body, proxy corruption). Treat
            // as a parse failure so it increments the streak AND surfaces the
            // correct failure mode in logs.
            let data: any;
            try {
                data = await response.json();
            } catch (e: any) {
                this.recordParseFailure('http-body-parse', e?.message);
                return null;
            }
            const t2 = Date.now();
            console.log(`[OllamaDetectionClient] detect ok: gen=${t1 - t0}ms body=${t2 - t1}ms total=${t2 - t0}ms`);

            const content = data?.message?.content;
            if (typeof content !== 'string') {
                this.recordParseFailure('missing-content', 'message.content not a string');
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
                console.warn(`[OllamaDetectionClient] Detection timed out after ${this.timeoutMs}ms`);
            } else {
                console.warn(`[OllamaDetectionClient] Request failed: ${e?.message ?? String(e)}`);
            }
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Single failure-recording path so all parse/schema failures contribute to
     * the streak counter and trigger the same threshold log.
     */
    private recordParseFailure(mode: string, detail: string): void {
        this.parseErrorStreak++;
        if (this.parseErrorStreak >= 5) {
            console.warn(
                `[OllamaDetectionClient] 5+ consecutive parse/schema failures (mode=${mode}) — prompt or model may be drifting. ${detail}`
            );
        }
    }
}
