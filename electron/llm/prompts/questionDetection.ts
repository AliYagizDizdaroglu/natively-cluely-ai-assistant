// electron/llm/prompts/questionDetection.ts

/**
 * System prompt for the passive question detector.
 * Kept intentionally short — every token costs detection latency.
 * The prompt ASKS the model to return the most recent question complete with
 * the scenario sentence it depends on — but the model is not reliable at that
 * for the statement+question shape: calibrated live against Groq on
 * 2026-09-02/03, the "...in the cluster. How do you track that down?" shape
 * never merged in 3/3 runs, and the "...creeping up. How do you diagnose and
 * fix it?" shape merged in only 1/3. `QuestionDetector` (see
 * mergeScenarioSentence.ts) guarantees the merge deterministically in code,
 * regardless of what the model returns. Also classifies into verbal | coding
 * | behavioral.
 */
export const QUESTION_DETECTION_SYSTEM_PROMPT = `You are detecting questions asked by an interviewer to a candidate in a live interview.
Identify the most recent question or prompt that requires the candidate to respond, and return it COMPLETE as asked: when the question depends on the interviewer's sentence just before it — the question starts with "and" or "so", or "it"/"that"/"this" appears anywhere in it referring back to that sentence, even inside a phrase like "fix it" or "track that down" — include that earlier sentence too, so the question stands on its own. Quote the interviewer's own words; do not shorten or rephrase.
Return ONLY a JSON object: {"detected": bool, "question": string, "intent": "verbal" | "coding" | "behavioral", "confidence": float, "difficulty": "easy" | "medium" | "hard"}.
intent="coding" if the answer requires writing code, "behavioral" if it asks for a personal experience or story (e.g. "Tell me about a time..."), otherwise "verbal".
difficulty="easy" for a definition or a one-fact recall, "medium" for explaining a mechanism or a trade-off, difficulty="hard" for designing a system, reasoning across several constraints, or a multi-part question.
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
    /** 2026-09-08: logged per detection and carried on the chip; nothing routes on it yet. Absent from clients that do not ask for it. */
    difficulty?: 'easy' | 'medium' | 'hard';
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
    if (typeof r.confidence !== 'number' || !Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1) return null;

    // Normalize intent: invalid value → default to 'verbal'
    const validIntents = ['verbal', 'coding', 'behavioral'] as const;
    const intent: DetectionResponse['intent'] = (typeof r.intent === 'string' && (validIntents as readonly string[]).includes(r.intent))
        ? r.intent as DetectionResponse['intent']
        : 'verbal';

    // Normalize detection: empty question + detected=true → forced to detected=false (drop)
    const hasQuestionText = r.question.trim().length > 0;
    const detected = r.detected && hasQuestionText;

    // difficulty: optional (only the Groq client asks for it); a value outside the
    // enum is dropped loudly rather than passed on as if it were one of the three.
    const validDifficulty = ['easy', 'medium', 'hard'] as const;
    let difficulty: DetectionResponse['difficulty'];
    if (r.difficulty !== undefined) {
        if (typeof r.difficulty === 'string' && (validDifficulty as readonly string[]).includes(r.difficulty)) difficulty = r.difficulty as DetectionResponse['difficulty'];
        else console.warn(`[questionDetection] ignoring difficulty=${JSON.stringify(r.difficulty)} (not easy|medium|hard)`);
    }

    return {
        detected,
        question: detected ? r.question : '',
        intent,
        confidence: r.confidence,
        ...(difficulty ? { difficulty } : {}),
    };
}
