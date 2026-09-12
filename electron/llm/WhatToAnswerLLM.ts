import { LLMHelper, GEMINI_FLASH_FALLBACK_MODEL, GEMINI_FLASH_MODEL } from "../LLMHelper";
import { UNIVERSAL_WHAT_TO_ANSWER_PROMPT, VERBAL_WHAT_TO_ANSWER_PROMPT } from "./prompts";
import { TemporalContext } from "./TemporalContextBuilder";
import { IntentResult } from "./IntentClassifier";
import { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, cutAtWordBudget, SPOKEN_WORD_GUARD, type Suggestion } from "./verbalStreamFilter";
import { lastInterviewerTurn } from "./lastInterviewerTurn";
import { tapFirstToken } from "./streamTaps";
import * as fs from "fs";
import * as path from "path";

// Diagnostic file logger — writes to project root so we can read it from outside electron
const DIAG_LOG = path.join(process.cwd(), "verbal-diag.log");
function diagLog(msg: string) {
    // Never from a test run: the file is the LIVE app's diagnostic log (cwd of
    // the checkout), and a unit test's synthetic "boom"/"socket hang up" lines
    // landed in the middle of a real measurement on 2026-09-02.
    if (process.env.VITEST) return;
    try {
        fs.appendFileSync(DIAG_LOG, `[${new Date().toISOString()}] ${msg}\n`);
    } catch { /* swallow — never break the stream on log failure */ }
}

// Spoken word guard: see verbalStreamFilter.SPOKEN_WORD_GUARD — a 200-word
// clamp, never a cut under it (flight s50c, 2026-09-12). Coding is exempt.

export class WhatToAnswerLLM {
    private llmHelper: LLMHelper;

    constructor(llmHelper: LLMHelper) {
        this.llmHelper = llmHelper;
    }

    /**
     * Run the primary verbal stream; if it fails BEFORE producing any content,
     * answer the same question on the fallback model instead.
     *
     * The first-content guard is the whole point. Once a token has reached the
     * bubble we cannot restart — the reader would watch the answer begin twice,
     * mid-interview. So a mid-stream failure is re-thrown and surfaces as an
     * error; only a clean pre-token failure is recoverable.
     *
     * Both arguments arrive ALREADY FILTERED, so the __model_source__ sentinel
     * yielded here sits outside both filter chains: stripModelSentinel would
     * otherwise eat it and the redirection would be silent again.
     *
     * Note this is not an independent leg — the fallback is another Gemini model
     * on the same key, so a quota or auth fault takes out both. It covers a
     * per-model stall, block or capacity error, not a credential outage.
     */
    private async *withVerbalFallback(
        primary: AsyncGenerator<string>,
        makeFallback: () => AsyncGenerator<string>,
    ): AsyncGenerator<string> {
        let started = false;
        try {
            for await (const chunk of primary) {
                if (chunk) started = true;
                yield chunk;
            }
        } catch (err) {
            if (started) throw err;
            const msg = (err as Error)?.message ?? String(err);
            console.warn(`[WhatToAnswerLLM] verbal primary failed before first token (${msg}) — redirecting to ${GEMINI_FLASH_FALLBACK_MODEL}`);
            diagLog(`verbal primary FAILED pre-token: ${msg} -> redirect ${GEMINI_FLASH_FALLBACK_MODEL}`);
            // Label carries no "_" — consumers match /__model_source:([^_]+)__/.
            yield `__model_source:${GEMINI_FLASH_FALLBACK_MODEL} (fallback)__`;
            yield* makeFallback();
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

            // A chunk shorter than the carry is carried whole. Slicing from a
            // negative index dropped the first character of a two-character opening
            // chunk — Gemini opens with "I’", "So", "To" routinely, so 14 of 57
            // delivered after6 answers began "’d start by…" (spec 2026-09-05 §4).
            carry = combined.slice(Math.max(0, combined.length - CARRY_LEN));
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
        imagePaths?: string[],
        // Escape hatch for the "Answer now with Flash Lite" button: skip the
        // deeper (slower) model entirely and answer on the fast verbal path,
        // whatever the intent. Used when the candidate can't wait any longer.
        forceFastModel?: boolean,
        // Called exactly once per stream with the expansion offers the model
        // attached to a verbal answer — an empty array when it correctly offered
        // none, and always empty on the coding path. The spoken text yielded by
        // this generator never contains the block — see stripSuggestionBlock.
        onSuggestions?: (suggestions: Suggestion[]) => void,
        // The Live ear's texts for the same turn — appended to the verbal message, spec 2026-09-09 §3.4.
        liveTexts?: string[],
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
            const liveBlock = !isCodingForFraming && liveTexts?.length
                ? `\n\nTHE LIVE LISTENER HEARD THE SAME QUESTION AS (use both; where they differ, the transcript's numbers and names are the ones spoken):\n${liveTexts.join('\n')}`
                : '';
            const fullMessage = extraContext
                ? `${extraContext}\n\n${transcriptLabel}:\n${cleanedTranscript}${liveBlock}${trailer}`
                : `${transcriptLabel}:\n${cleanedTranscript}${liveBlock}${trailer}`;
            const knowledgeQuestion = lastInterviewerTurn(cleanedTranscript);

            // Use Universal Prompt
            // Note: WhatToAnswer has a very specific prompt. 
            // We should use UNIVERSAL_WHAT_TO_ANSWER_PROMPT as override

            // ── Router ───────────────────────────────────────────────────────────────
            // Decision in TypeScript using already-computed intentResult — 0ms overhead.
            // intentResult is computed before generateStream() is called by IntelligenceEngine.
            //
            // Three routes:
            //   coding            → Gemma, coding prompt (code + walkthrough + complexity)
            //   general/technical → Gemma, VERBAL prompt (deep prose, filters applied)
            //   behavioral        → Flash Lite, VERBAL prompt (fast, conversational)
            //
            // Verbal-TECHNICAL moved onto Gemma 2026-07-28 after measuring it against
            // flash-lite on 6 hard technical questions: same TTFT (1.1s vs 0.9s), better
            // tradeoff articulation (2/6 vs 1/6), and it led with the CORRECT mechanism
            // where flash-lite drifted off-question. The old comment here claimed Gemma
            // emits "coding-shaped output" on verbal questions — re-tested and false:
            // 0/6 code fences, 0/6 Time:/Space:, 0/6 bullets with the VERBAL prompt.
            // Behavioral stays on Flash Lite: it already scores 7/7 and is ~2.3s faster
            // to finish, and depth buys nothing on "tell me about a time…".
            const isCoding = intentResult?.intent === 'coding';
            const isBehavioral = intentResult?.intent === 'behavioral';
            // forceFastModel (Answer-now button) collapses everything to the fast path.
            const useDeepModel = !forceFastModel && (isCoding || !isBehavioral);

            diagLog(`=== generateStream invoked ===`);
            diagLog(`intentResult: ${JSON.stringify(intentResult)} forceFastModel=${!!forceFastModel}`);
            // NB: "CODING"/"VERBAL-TECHNICAL" do NOT pin a model — streamChat routes on
            // the user's dropdown selection, which CredentialsManager defaults (and
            // migrates) to gemini-3.1-flash-lite. This log used to claim "Gemma" for
            // both and sent me looking in the wrong place; it names the path, not the model.
            diagLog(`route: ${forceFastModel ? 'FAST-OVERRIDE (Flash Lite)' : isCoding ? 'CODING (selected model, no filter)' : isBehavioral ? 'BEHAVIORAL (Flash Lite, filtered)' : 'VERBAL-TECHNICAL (selected model, filtered)'}`);
            diagLog(`transcript preview: ${JSON.stringify(cleanedTranscript.slice(0, 200))}`);

            if (isCoding && !forceFastModel) {
                // Coding path: full prompt with SHARED_CODING_RULES, images passed through.
                yield* this.llmHelper.streamChat(
                    fullMessage,
                    imagePaths,
                    undefined,
                    UNIVERSAL_WHAT_TO_ANSWER_PROMPT,
                    undefined,
                    undefined,
                    knowledgeQuestion
                );
                // Coding answers carry no expansion offers (code is exempt from the
                // spoken word budget). Still notify, so a caller always gets exactly
                // one callback per stream and never waits on one that cannot arrive.
                onSuggestions?.([]);
            } else {
                // Verbal paths — both use VERBAL_WHAT_TO_ANSWER_PROMPT and the same
                // output filters; they differ only in which model generates.
                // Name the model that will answer, outside the filter chain (which
                // strips sentinels), so the bar under the answer stops guessing.
                const primaryModel = useDeepModel ? this.llmHelper.getCurrentModelId() : GEMINI_FLASH_MODEL;
                yield `__model_source:${primaryModel}__`;
                const t0 = Date.now();
                let rawStream: AsyncGenerator<string>;
                if (useDeepModel) {
                    // VERBAL-TECHNICAL → deep model (Gemma via streamChat, which honors
                    // the user's selected model). resolveGemmaSystemPrompt passes the
                    // VERBAL prompt through untouched (it only augments the coding and
                    // code-hint prompts), so no coding scaffolding leaks in.
                    diagLog(`verbal-technical path: routed to deep model via streamChat`);
                    rawStream = this.llmHelper.streamChat(
                        fullMessage,
                        undefined, // no images on verbal path — reduces prefill latency
                        undefined,
                        VERBAL_WHAT_TO_ANSWER_PROMPT,
                        undefined,
                        undefined,
                        knowledgeQuestion
                    );
                } else {
                    // BEHAVIORAL (or forced-fast) → Gemini Flash Lite for speed.
                    // Falls back to default streamChat if the Gemini client isn't ready.
                    try {
                        rawStream = this.llmHelper.streamVerbalWithGeminiFlash(
                            fullMessage,
                            VERBAL_WHAT_TO_ANSWER_PROMPT,
                            undefined
                        );
                        diagLog(`fast verbal path: routed to Gemini Flash Lite`);
                    } catch (e) {
                        console.warn(`[WhatToAnswerLLM] Gemini Flash routing failed, falling back to default streamChat:`, (e as Error).message);
                        diagLog(`fast verbal path: Flash failed (${(e as Error).message}), falling back to streamChat`);
                        rawStream = this.llmHelper.streamChat(
                            fullMessage,
                            undefined,
                            undefined,
                            VERBAL_WHAT_TO_ANSWER_PROMPT,
                            undefined,
                            undefined,
                            knowledgeQuestion
                        );
                    }
                }
                // Compose: sentinel strip → fence filter → line filter → offers strip
                // stripModelSentinel removes __model_source:X__ that LLMHelper prepends —
                //   otherwise the first content line is "__model_source:Gemma 4__I'll explain..."
                //   and DROP_PREFIXES can't match against the sentinel-prefixed line.
                // filterCodeFences suppresses any ``` blocks that slip through.
                // filterVerbalLines (streaming — see verbalStreamFilter.ts) drops
                //   coding-format prose (Time:/Space:/Why: bullets, preambles) while
                //   passing tokens through as soon as each line's prefix is disambiguated.
                // stripSuggestionBlock is OUTERMOST so the __MORE__ block never reaches
                //   the bubble even for a token-boundary split; the labels it captures are
                //   handed to onSuggestions for the UI to render as chips.
                // stripSpokenNotation is OUTERMOST: it runs after the suggestion
                // block is consumed, so it can never damage the __MORE__ sentinel.
                // This answer is read aloud — "`ModelLatency`" would otherwise be
                // spoken as "backtick ModelLatency backtick".
                // stripSuggestionBlock fires onSuggestions once per stream, and the
                // contract upstream is exactly one callback per generateStream — so
                // when the fallback runs a SECOND filtered stream, only the first
                // callback may escape.
                let suggestionsSent = false;
                const onSuggestionsOnce = (s: Suggestion[]) => {
                    if (suggestionsSent) return;
                    suggestionsSent = true;
                    onSuggestions?.(s);
                };
                const filtered = (raw: AsyncGenerator<string>) =>
                    stripSpokenNotation(
                        stripSuggestionBlock(
                            filterVerbalLines(this.filterCodeFences(this.stripModelSentinel(raw))),
                            onSuggestionsOnce,
                        ),
                    );

                yield* tapFirstToken(
                    cutAtWordBudget(
                        this.withVerbalFallback(
                            filtered(rawStream),
                            () => filtered(
                                this.llmHelper.streamVerbalWithGeminiFlash(
                                    fullMessage,
                                    VERBAL_WHAT_TO_ANSWER_PROMPT,
                                    undefined,
                                    GEMINI_FLASH_FALLBACK_MODEL,
                                ),
                            ),
                        ),
                        {
                            ...SPOKEN_WORD_GUARD,
                            onDone: (r) => {
                                // One line per completed spoken answer — the flight
                                // harness's "budget" gate row reads it.
                                const line = `words=${r.words} cut=${r.cut ? 'yes' : 'no'} allowance=${r.allowance ? 'yes' : 'no'}`;
                                console.log(`[Answer] budget: ${line}`);
                                diagLog(`word budget: ${line}`);
                            },
                        },
                    ),
                    (ms) => diagLog(`first token ${ms}ms`),
                    (head) => diagLog(`answer head: ${JSON.stringify(head)}`),
                    t0,
                );
            }
            // ────────────────────────────────────────────────────────────────────────

        } catch (error) {
            // Name the failure. The old blanket "Could you repeat that?" was
            // indistinguishable from a genuine request to repeat, so an outage
            // looked like the app politely stalling — on EVERY question, with the
            // real cause only in a console nobody has open mid-interview.
            const msg = (error as Error)?.message ?? String(error);
            console.error("[WhatToAnswerLLM] Stream failed:", error);
            diagLog(`generateStream FAILED (fallback exhausted or unavailable): ${msg}`);
            yield `[No answer — both the primary model and the ${GEMINI_FLASH_FALLBACK_MODEL} fallback failed: ${msg.slice(0, 160)}]`;
        }
    }
}
