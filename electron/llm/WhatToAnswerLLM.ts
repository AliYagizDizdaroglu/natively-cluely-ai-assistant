import { LLMHelper } from "../LLMHelper";
import { UNIVERSAL_WHAT_TO_ANSWER_PROMPT, VERBAL_WHAT_TO_ANSWER_PROMPT } from "./prompts";
import { TemporalContext } from "./TemporalContextBuilder";
import { IntentResult } from "./IntentClassifier";

export class WhatToAnswerLLM {
    private llmHelper: LLMHelper;

    constructor(llmHelper: LLMHelper) {
        this.llmHelper = llmHelper;
    }

    /**
     * Drop lines that are coding-format artifacts leaking through on the verbal path.
     * Operates on complete lines only — accumulates until newline, then decides.
     * Patterns: Time:/Space:/Why: complexity bullets, bare language tags (```python etc).
     */
    private async *filterVerbalLines(
        source: AsyncGenerator<string>
    ): AsyncGenerator<string> {
        const DROP_PREFIXES = [
            'Time:', 'Space:', 'Why:', 'Time complexity', 'Space complexity',
            // Implementation-framing openers that must not appear in verbal answers
            "I'll implement", "I will implement", "Let me implement",
            "I'll show", "I will show", "Let me show",
            "I'll demonstrate", "I will demonstrate", "Let me demonstrate",
            "I'll code", "I will code",
            // Meta-preamble openers — describe the upcoming answer instead of giving it
            "I'll explain", "I will explain", "Let me explain",
            "I'll walk", "I will walk", "Let me walk",
            "I'll break", "I will break", "Let me break",
            "I'll describe", "I will describe", "Let me describe",
            "I'll go through", "I will go through", "Let me go through",
            "I'll start by", "I will start by", "Let me start",
            "I'll cover", "I will cover", "Let me cover",
            "I'll outline", "I will outline", "Let me outline",
            // Clarifying-back openers — never appropriate in interview responses
            "Are you looking for", "Are you asking about", "Are you more interested in",
            "Would you like me", "Would you prefer", "Would you rather",
            "Do you want me to", "Do you want a", "Do you want me",
            "Should I focus on", "Should I go", "Should I start",
            "Which would you", "Which one would",
        ];
        let lineBuffer = '';

        const shouldDrop = (line: string) => {
            const trimmed = line.trimStart();
            return DROP_PREFIXES.some(p => trimmed.startsWith(p));
        };

        let chunkCount = 0;
        for await (const chunk of source) {
            chunkCount++;
            if (chunkCount <= 5 || chunkCount % 20 === 0) {
                console.log(`[filterVerbalLines] chunk #${chunkCount}: ${JSON.stringify(chunk.slice(0, 80))} (lineBuffer pre: ${JSON.stringify(lineBuffer.slice(0, 80))})`);
            }
            const combined = lineBuffer + chunk;
            const lines = combined.split('\n');
            // Last element may be an incomplete line — hold in buffer
            lineBuffer = lines.pop()!;

            for (let i = 0; i < lines.length; i++) {
                const drop = shouldDrop(lines[i]);
                console.log(`[filterVerbalLines] line: drop=${drop} → ${JSON.stringify(lines[i].slice(0, 80))}`);
                if (!drop) {
                    yield lines[i] + (i < lines.length - 1 || lineBuffer !== '' ? '\n' : '');
                } else {
                    console.warn(`[WhatToAnswerLLM] filterVerbalLines: dropped coding line: "${lines[i].trimStart().slice(0, 40)}"`);
                }
            }
        }

        // Flush remaining buffer
        const finalDrop = shouldDrop(lineBuffer);
        console.log(`[filterVerbalLines] flush: lineBuffer=${JSON.stringify(lineBuffer.slice(0, 80))} drop=${finalDrop}`);
        if (lineBuffer && !finalDrop) yield lineBuffer;
    }

    private async *filterCodeFences(
        source: AsyncGenerator<string>
    ): AsyncGenerator<string> {
        const CARRY_LEN = 3; // ``` is 3 chars — minimum fence marker
        let carry = '';
        let suppressing = false;

        for await (const chunk of source) {
            const combined = carry + chunk;
            let output = '';
            let i = 0;

            while (i < combined.length - CARRY_LEN) {
                if (!suppressing && combined.startsWith('```', i)) {
                    suppressing = true;
                    i += 3;
                    // Skip optional language tag on the same line
                    while (i < combined.length && combined[i] !== '\n') i++;
                    continue;
                }
                if (suppressing && combined.startsWith('```', i)) {
                    suppressing = false;
                    i += 3;
                    console.warn('[WhatToAnswerLLM] filterCodeFences: code fence suppressed on verbal path — check intent classifier');
                    continue;
                }
                // Strip any stray backticks even when not suppressing — verbal answers
                // never legitimately contain backticks, and the 3-char carry buffer
                // can leak 1-2 backticks across chunk boundaries after a fence transition.
                if (!suppressing && combined[i] !== '`') output += combined[i];
                i++;
            }

            carry = combined.slice(combined.length - CARRY_LEN);
            if (output) yield output;
        }

        // Flush carry buffer — strip any backticks (fence detection artifact)
        if (carry && !suppressing) {
            const cleaned = carry.replace(/`/g, '');
            if (cleaned) yield cleaned;
        }
    }

    // Deprecated non-streaming method (redirect to streaming or implement if needed)
    async generate(cleanedTranscript: string): Promise<string> {
        // Simple wrapper around stream
        const stream = this.generateStream(cleanedTranscript);
        let full = "";
        for await (const chunk of stream) full += chunk;
        return full;
    }

    async *generateStream(
        cleanedTranscript: string,
        temporalContext?: TemporalContext,
        intentResult?: IntentResult,
        imagePaths?: string[]
    ): AsyncGenerator<string> {
        try {
            // Build a rich message context
            // Note: We can't easily inject the complex temporal/intent logic into universal prompt *variables* 
            // but we can prepend it to the message.

            let contextParts: string[] = [];

            if (intentResult) {
                contextParts.push(`<intent_and_shape>
DETECTED INTENT: ${intentResult.intent}
ANSWER SHAPE: ${intentResult.answerShape}
</intent_and_shape>`);
            }

            if (temporalContext && temporalContext.hasRecentResponses) {
                // ... simplify temporal context injection for universal prompt ...
                // Just dump it in context if possible
                const history = temporalContext.previousResponses.map((r, i) => `${i + 1}. "${r}"`).join('\n');
                contextParts.push(`PREVIOUS RESPONSES (Avoid Repetition):\n${history}`);
            }

            const extraContext = contextParts.join('\n\n');
            // Coding path uses generic "CONVERSATION" framing; verbal path frames the
            // transcript explicitly as interviewer speech so the model treats it as a
            // question to answer rather than a user request to clarify.
            const isCodingForFraming = intentResult?.intent === 'coding';
            const transcriptLabel = isCodingForFraming ? 'CONVERSATION' : 'INTERVIEWER JUST SAID';
            const trailer = isCodingForFraming ? '' : '\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):';
            const fullMessage = extraContext
                ? `${extraContext}\n\n${transcriptLabel}:\n${cleanedTranscript}${trailer}`
                : `${transcriptLabel}:\n${cleanedTranscript}${trailer}`;

            // Use Universal Prompt
            // Note: WhatToAnswer has a very specific prompt. 
            // We should use UNIVERSAL_WHAT_TO_ANSWER_PROMPT as override

            // ── Hard binary router ───────────────────────────────────────────────────
            // Decision in TypeScript using already-computed intentResult — 0ms overhead.
            // intentResult is computed before generateStream() is called by IntelligenceEngine.
            const isCoding = intentResult?.intent === 'coding';

            if (isCoding) {
                // Coding path: full prompt with SHARED_CODING_RULES, images passed through.
                yield* this.llmHelper.streamChat(
                    fullMessage,
                    imagePaths,
                    undefined,
                    UNIVERSAL_WHAT_TO_ANSWER_PROMPT
                );
            } else {
                // Verbal path: speech-only prompt, no images (reduces prefill latency),
                // wrapped with fence filter as safety net for classifier misses.
                // imagePaths stripped intentionally — visual context is less critical for verbal answers.
                const rawStream = this.llmHelper.streamChat(
                    fullMessage,
                    undefined,
                    undefined,
                    VERBAL_WHAT_TO_ANSWER_PROMPT
                );
                // Compose: fence filter → line filter (outer-to-inner order)
                // filterVerbalLines drops coding-format prose (Time:/Space:/Why: bullets)
                // filterCodeFences suppresses any ``` blocks that slip through
                yield* this.filterVerbalLines(this.filterCodeFences(rawStream));
            }
            // ────────────────────────────────────────────────────────────────────────

        } catch (error) {
            console.error("[WhatToAnswerLLM] Stream failed:", error);
            yield "Could you repeat that? I want to make sure I address your question properly.";
        }
    }
}
