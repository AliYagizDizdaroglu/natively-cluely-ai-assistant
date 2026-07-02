import { LLMHelper } from "../LLMHelper";
import { UNIVERSAL_WHAT_TO_ANSWER_PROMPT, VERBAL_WHAT_TO_ANSWER_PROMPT } from "./prompts";
import { TemporalContext } from "./TemporalContextBuilder";
import { IntentResult } from "./IntentClassifier";
import { filterVerbalLines } from "./verbalStreamFilter";
import * as fs from "fs";
import * as path from "path";

// Diagnostic file logger — writes to project root so we can read it from outside electron
const DIAG_LOG = path.join(process.cwd(), "verbal-diag.log");
function diagLog(msg: string) {
    try {
        fs.appendFileSync(DIAG_LOG, `[${new Date().toISOString()}] ${msg}\n`);
    } catch { /* swallow — never break the stream on log failure */ }
}

export class WhatToAnswerLLM {
    private llmHelper: LLMHelper;

    constructor(llmHelper: LLMHelper) {
        this.llmHelper = llmHelper;
    }

    /**
     * Strip the __model_source:X__ sentinel that LLMHelper emits as the first token.
     * Must run BEFORE filterVerbalLines because the sentinel concatenates with the
     * first content token and prevents DROP_PREFIXES from matching the actual opener.
     * Uses a small buffer to handle the sentinel being split across chunk boundaries.
     */
    private async *stripModelSentinel(
        source: AsyncGenerator<string>
    ): AsyncGenerator<string> {
        let buffer = '';
        let stripped = false;

        for await (const chunk of source) {
            if (stripped) {
                yield chunk;
                continue;
            }
            buffer += chunk;
            // Wait until we have enough to detect either the sentinel or non-sentinel start
            if (!buffer.startsWith('__model_source:') && !'__model_source:'.startsWith(buffer)) {
                // Definitely not a sentinel — flush and pass through
                stripped = true;
                yield buffer;
                buffer = '';
                continue;
            }
            // We might have a sentinel — look for the closing __
            const match = buffer.match(/^__model_source:[^_]*__/);
            if (match) {
                stripped = true;
                const rest = buffer.slice(match[0].length);
                diagLog(`stripModelSentinel: stripped ${JSON.stringify(match[0])}, yielding rest ${JSON.stringify(rest.slice(0, 80))}`);
                if (rest) yield rest;
                buffer = '';
            }
            // else: keep buffering, sentinel not yet complete
        }
        // Flush whatever is left if we never found the sentinel
        if (!stripped && buffer) yield buffer;
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

            diagLog(`=== generateStream invoked ===`);
            diagLog(`intentResult: ${JSON.stringify(intentResult)}`);
            diagLog(`isCoding: ${isCoding} → path: ${isCoding ? 'CODING (no filter)' : 'VERBAL (filter applied)'}`);
            diagLog(`transcript preview: ${JSON.stringify(cleanedTranscript.slice(0, 200))}`);

            if (isCoding) {
                // Coding path: full prompt with SHARED_CODING_RULES, images passed through.
                yield* this.llmHelper.streamChat(
                    fullMessage,
                    imagePaths,
                    undefined,
                    UNIVERSAL_WHAT_TO_ANSWER_PROMPT
                );
            } else {
                // Verbal path: route to Gemini Flash 3.1 (not Gemma) for conversational
                // depth. Gemma 4 produces shallow coding-shaped output for technical
                // questions even with VERBAL_WHAT_TO_ANSWER_PROMPT; Gemini Flash handles
                // verbal interview answers far better at similar TTFT.
                // Falls back to default streamChat (Gemma) if Gemini client isn't ready.
                let rawStream: AsyncGenerator<string>;
                try {
                    rawStream = this.llmHelper.streamVerbalWithGeminiFlash(
                        fullMessage,
                        VERBAL_WHAT_TO_ANSWER_PROMPT,
                        undefined // no images on verbal path — reduces prefill latency
                    );
                    diagLog(`verbal path: routed to Gemini Flash 3.1`);
                } catch (e) {
                    console.warn(`[WhatToAnswerLLM] Gemini Flash routing failed, falling back to default streamChat:`, (e as Error).message);
                    diagLog(`verbal path: Flash failed (${(e as Error).message}), falling back to streamChat`);
                    rawStream = this.llmHelper.streamChat(
                        fullMessage,
                        undefined,
                        undefined,
                        VERBAL_WHAT_TO_ANSWER_PROMPT
                    );
                }
                // Compose: sentinel strip → fence filter → line filter (outer-to-inner order)
                // stripModelSentinel removes __model_source:X__ that LLMHelper prepends —
                //   otherwise the first content line is "__model_source:Gemma 4__I'll explain..."
                //   and DROP_PREFIXES can't match against the sentinel-prefixed line.
                // filterCodeFences suppresses any ``` blocks that slip through.
                // filterVerbalLines (streaming — see verbalStreamFilter.ts) drops
                //   coding-format prose (Time:/Space:/Why: bullets, preambles) while
                //   passing tokens through as soon as each line's prefix is disambiguated.
                yield* filterVerbalLines(this.filterCodeFences(this.stripModelSentinel(rawStream)));
            }
            // ────────────────────────────────────────────────────────────────────────

        } catch (error) {
            console.error("[WhatToAnswerLLM] Stream failed:", error);
            yield "Could you repeat that? I want to make sure I address your question properly.";
        }
    }
}
