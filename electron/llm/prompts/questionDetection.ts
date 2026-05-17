// electron/llm/prompts/questionDetection.ts

/**
 * System prompt for the passive question detector.
 * Kept intentionally short — every token costs detection latency.
 * The prompt biases towards detection of the MOST RECENT interviewer prompt
 * and classifies into verbal | coding | behavioral.
 */
export const QUESTION_DETECTION_SYSTEM_PROMPT = `You are detecting questions asked by an interviewer to a candidate in a live interview.
Identify the MOST RECENT question or prompt that requires the candidate to respond.
Return ONLY a JSON object: {"detected": bool, "question": string, "intent": "verbal" | "coding" | "behavioral", "confidence": float}.
intent="coding" if the answer requires writing code, "behavioral" if it asks for a personal experience or story (e.g. "Tell me about a time..."), otherwise "verbal".
Only set detected=true if the interviewer just asked something the candidate should answer. Set detected=false for filler, acknowledgements, or interviewer thinking aloud.`;

/**
 * Build the user message for the detection request.
 * Includes recent conversation context so llama can see what speaker is saying what.
 */
export function buildDetectionUserMessage(opts: {
    recentInterviewerTranscript: string;
    fullConversationContext: string;
}): string {
    return `Recent conversation (last 60s):
${opts.fullConversationContext}

Most recent interviewer turn (last 30s):
${opts.recentInterviewerTranscript}

Detect the most recent question/prompt requiring a response. Return JSON only.`;
}

/**
 * Expected JSON shape from llama. Validated at runtime in OllamaDetectionClient.
 */
export interface DetectionResponse {
    detected: boolean;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
}

/**
 * Runtime validator — returns the response if it matches the schema, else null.
 * Defensive against llama returning malformed/partial JSON.
 */
export function validateDetectionResponse(raw: unknown): DetectionResponse | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;

    if (typeof r.detected !== 'boolean') return null;
    if (typeof r.question !== 'string') return null;
    if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 1) return null;

    const validIntents = ['verbal', 'coding', 'behavioral'] as const;
    if (typeof r.intent !== 'string' || !validIntents.includes(r.intent as any)) {
        // Spec section 9: invalid intent → default to 'verbal'
        return {
            detected: r.detected,
            question: r.question,
            intent: 'verbal',
            confidence: r.confidence,
        };
    }

    // Empty question with detected=true is treated as detected=false per spec
    if (r.detected && r.question.trim().length === 0) {
        return { detected: false, question: '', intent: 'verbal', confidence: r.confidence };
    }

    return {
        detected: r.detected,
        question: r.question,
        intent: r.intent as 'verbal' | 'coding' | 'behavioral',
        confidence: r.confidence,
    };
}
