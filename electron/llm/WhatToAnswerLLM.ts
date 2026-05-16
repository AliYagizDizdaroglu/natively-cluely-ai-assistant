import { LLMHelper } from "../LLMHelper";
import { UNIVERSAL_WHAT_TO_ANSWER_PROMPT, VERBAL_WHAT_TO_ANSWER_PROMPT } from "./prompts";
import { TemporalContext } from "./TemporalContextBuilder";
import { IntentResult } from "./IntentClassifier";
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
     * Two-mode filter for the verbal path:
     *   HARD_DROP — pure coding artifacts with no substantive content (Time:/Space:/Why:
     *               complexity bullets, clarifying-back questions).
     *   REWRITE   — meta-preamble openers that DO carry substance after the verb phrase
     *               (e.g. "I will explain the Transformer as X" → "The Transformer as X").
     *               Strip the preamble, keep the substance, capitalize result.
     */
    private async *filterVerbalLines(
        source: AsyncGenerator<string>
    ): AsyncGenerator<string> {
        const HARD_DROP = [
            'Time:', 'Space:', 'Why:', 'Time complexity', 'Space complexity',
            // Clarifying-back openers — never appropriate in interview responses
            "Are you looking for", "Are you asking about", "Are you more interested in",
            "Would you like me", "Would you prefer", "Would you rather",
            "Do you want me to", "Do you want a", "Do you want me",
            "Should I focus on", "Should I go", "Should I start",
            "Which would you", "Which one would",
        ];

        // Each pattern strips its match, keeping what follows.
        // Order matters — longer/more-specific patterns first.
        const REWRITE_PATTERNS: RegExp[] = [
            /^(I'll|I will|I am|I'm|Let me|Let's|I am going to|I'm going to)\s+(explain|show|demonstrate|walk|break|describe|cover|outline|implement|illustrate|present|discuss|talk about|go through|go over|start by|run through)(\s+(you|us))?(\s+(through|how|that|this|the|a|an|why|what|by|down))*\s+/i,
            // Present-continuous variants like "I'm explaining the..."
            /^(I'm|I am)\s+(explaining|showing|demonstrating|walking|breaking|describing|covering|outlining|implementing|illustrating|presenting|discussing|using|going through)(\s+(you|us))?(\s+(through|how|that|this|the|a|an|why|what|by|down))*\s+/i,
        ];

        let lineBuffer = '';

        const shouldHardDrop = (line: string) => {
            const trimmed = line.trimStart();
            return HARD_DROP.some(p => trimmed.startsWith(p));
        };

        // Returns rewritten line if a preamble matched, otherwise null.
        const rewritePreamble = (line: string): string | null => {
            const trimmed = line.trimStart();
            const leading = line.slice(0, line.length - trimmed.length);
            for (const pattern of REWRITE_PATTERNS) {
                if (pattern.test(trimmed)) {
                    const stripped = trimmed.replace(pattern, '');
                    if (stripped.trim().length < 8) return ''; // substance too small — effectively drop
                    // Capitalize first char
                    const capitalized = stripped[0].toUpperCase() + stripped.slice(1);
                    diagLog(`rewrite: ${JSON.stringify(trimmed.slice(0, 60))} → ${JSON.stringify(capitalized.slice(0, 60))}`);
                    return leading + capitalized;
                }
            }
            return null;
        };

        diagLog(`>>> filterVerbalLines started`);
        let chunkCount = 0;
        for await (const chunk of source) {
            chunkCount++;
            diagLog(`  chunk #${chunkCount}: ${JSON.stringify(chunk)} (lineBuffer pre: ${JSON.stringify(lineBuffer.slice(0, 120))})`);
            const combined = lineBuffer + chunk;
            const lines = combined.split('\n');
            // Last element may be an incomplete line — hold in buffer
            lineBuffer = lines.pop()!;

            for (let i = 0; i < lines.length; i++) {
                if (shouldHardDrop(lines[i])) {
                    diagLog(`    HARD_DROP: ${JSON.stringify(lines[i].slice(0, 80))}`);
                    continue;
                }
                const rewritten = rewritePreamble(lines[i]);
                if (rewritten !== null) {
                    if (rewritten === '') continue; // substance too small after strip
                    yield rewritten + (i < lines.length - 1 || lineBuffer !== '' ? '\n' : '');
                    continue;
                }
                yield lines[i] + (i < lines.length - 1 || lineBuffer !== '' ? '\n' : '');
            }
        }

        // Flush remaining buffer
        if (lineBuffer) {
            if (shouldHardDrop(lineBuffer)) {
                diagLog(`<<< flush HARD_DROP: ${JSON.stringify(lineBuffer.slice(0, 80))}`);
            } else {
                const rewritten = rewritePreamble(lineBuffer);
                if (rewritten !== null) {
                    if (rewritten !== '') yield rewritten;
                    diagLog(`<<< flush rewritten: ${JSON.stringify(rewritten.slice(0, 80))}`);
                } else {
                    yield lineBuffer;
                    diagLog(`<<< flush yielded: ${JSON.stringify(lineBuffer.slice(0, 80))}`);
                }
            }
        }
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
                // Verbal path: speech-only prompt, no images (reduces prefill latency),
                // wrapped with fence filter as safety net for classifier misses.
                // imagePaths stripped intentionally — visual context is less critical for verbal answers.
                const rawStream = this.llmHelper.streamChat(
                    fullMessage,
                    undefined,
                    undefined,
                    VERBAL_WHAT_TO_ANSWER_PROMPT
                );
                // Compose: sentinel strip → fence filter → line filter (outer-to-inner order)
                // stripModelSentinel removes __model_source:X__ that LLMHelper prepends —
                //   otherwise the first content line is "__model_source:Gemma 4__I'll explain..."
                //   and DROP_PREFIXES can't match against the sentinel-prefixed line.
                // filterCodeFences suppresses any ``` blocks that slip through.
                // filterVerbalLines drops coding-format prose (Time:/Space:/Why: bullets, preambles).
                yield* this.filterVerbalLines(this.filterCodeFences(this.stripModelSentinel(rawStream)));
            }
            // ────────────────────────────────────────────────────────────────────────

        } catch (error) {
            console.error("[WhatToAnswerLLM] Stream failed:", error);
            yield "Could you repeat that? I want to make sure I address your question properly.";
        }
    }
}
