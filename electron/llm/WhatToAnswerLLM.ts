import { LLMHelper, GEMINI_FLASH_FALLBACK_MODEL, GEMINI_FLASH_MODEL, VERBAL_PRIMARY_MODELS } from "../LLMHelper";
import { UNIVERSAL_WHAT_TO_ANSWER_PROMPT, VERBAL_WHAT_TO_ANSWER_PROMPT } from "./prompts";
import { TemporalContext } from "./TemporalContextBuilder";
import { IntentResult } from "./IntentClassifier";
import { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, cutAtWordBudget, filterCodeFences, SPOKEN_WORD_GUARD, type Suggestion } from "./verbalStreamFilter";
import { lastInterviewerTurn } from "./lastInterviewerTurn";
import { tapFirstToken } from "./streamTaps";
import { verbalPrimaryModel } from "./verbalPrimaryModel";
import * as fs from "fs";
import * as path from "path";

// Diagnostic file logger — writes to project root so we can read it from outside electron
const DIAG_LOG = path.join(process.cwd(), "verbal-diag.log");
function diagLog(msg: string) {
    // Only from the app's Electron main process. The file is the LIVE app's diagnostic
    // log (cwd of the checkout), and any other process started there appends look-alike
    // lines: a unit test's synthetic "boom"/"socket hang up" landed in the middle of a real
    // measurement on 2026-09-02, and the flight's offline arms (plain node, through the
    // filter's copy) add ~440 per flight. process.type, not versions.electron: Electron
    // run as node keeps the version.
    if (process.type !== "browser") return;
    try {
        fs.appendFileSync(DIAG_LOG, `[${new Date().toISOString()}] ${msg}\n`);
    } catch { /* swallow — never break the stream on log failure */ }
}

// Spoken word guard: see verbalStreamFilter.SPOKEN_WORD_GUARD — a 200-word
// clamp, never a cut under it (flight s50c, 2026-09-12). Coding is exempt.

/** The stall race's switch, as LLMHelper.streamGeminiWithStallFallback announces it: one whole chunk. */
const STALL_SWITCH = /^__model_source:(\S+) \(fallback\)__$/;
/** A Gemma selection's handover to Flash, as LLMHelper.streamWithGemmaGuarded announces it: one whole chunk. */
const GEMMA_HANDOVER = /^__model_source:(Gemini Flash)__$/;
/** The hedge's winner, as LLMHelper.streamGeminiWithHedge announces it: one whole chunk. */
const HEDGE_WINNER = /^__model_source:(\S+) \(hedge\)__$/;

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
     * Both streams arrive ALREADY FILTERED, so the __model_source__ sentinel
     * yielded here sits outside both filter chains: stripModelSentinel would
     * otherwise eat it and the redirection would be silent again.
     *
     * Note this is not an independent leg — the fallback is another Gemini model
     * on the same key, so a quota or auth fault takes out both. It covers a
     * per-model stall, block or capacity error, not a credential outage.
     *
     * The fallback model is picked at the moment of failure, from the model that
     * failed: a constant here sent a 3.5-lite primary straight back to 3.5-lite.
     */
    private async *withVerbalFallback(
        primary: AsyncGenerator<string>,
        pickFallback: () => string,
        makeFallback: (model: string) => AsyncGenerator<string>,
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
            const model = pickFallback();
            console.warn(`[WhatToAnswerLLM] verbal primary failed before first token (${msg}) — redirecting to ${model}`);
            diagLog(`verbal primary FAILED pre-token: ${msg} -> redirect ${model}`);
            // Label carries no "_" — consumers match /__model_source:([^_]+)__/.
            yield `__model_source:${model} (fallback)__`;
            yield* makeFallback(model);
        }
    }

    /**
     * Filter a raw verbal stream, and name the stall race's switch outside the filter chain.
     *
     * When the primary stalls, LLMHelper hands back the other Flash Lite's stream headed by
     * `__model_source:<model> (fallback)__` — and stripModelSentinel, the chain's innermost
     * stage, strips head sentinels, so the switch never reached the bar under the answer
     * (flight s50m's verbal-diag.log: all four of the hour's switches stripped within 2 ms).
     * So the switch is read off the RAW stream, before the chain, and named again after it,
     * just ahead of the first words the other model wrote — never earlier, so a switched-to
     * model that fails before its first token still counts as a pre-token failure. A Gemma
     * selection's handover to Flash (streamWithGemmaGuarded's `__model_source:Gemini Flash__`)
     * is stripped the same way, so it is named the same way. The hedge's winner
     * (LLMHelper.streamGeminiWithHedge's `__model_source:<model> (hedge)__`) is re-announced
     * verbatim, for the same reason.
     * `onSwitch` learns which model is now writing the answer.
     */
    private async *nameStallSwitch(
        raw: AsyncGenerator<string>,
        filter: (raw: AsyncGenerator<string>) => AsyncGenerator<string>,
        onSwitch: (model: string) => void,
    ): AsyncGenerator<string> {
        let announce = null as string | null;
        async function* watch() {
            for await (const chunk of raw) {
                const h = HEDGE_WINNER.exec(chunk);
                const m = h ?? STALL_SWITCH.exec(chunk) ?? GEMMA_HANDOVER.exec(chunk);
                if (m) {
                    // The hedge's winner is re-announced verbatim; a stall switch or a Gemma handover as `(fallback)`, as before.
                    announce = h ? chunk : `__model_source:${m[1]} (fallback)__`;
                    onSwitch(m[1]);
                }
                yield chunk;
            }
        }
        for await (const chunk of filter(watch())) {
            if (announce) { yield announce; announce = null; }
            yield chunk;
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

    // filterCodeFences moved to verbalStreamFilter.ts on 2026-09-20 so the offline flight
    // arms run the same suppression the app does — see the note on the function there.

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
        // The model the verbal error fallback went to, for the last-resort message below —
        // unset when none ran: a failure after the first words, the coding path, a refused override.
        let fallbackModel: string | undefined;
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
                // The flight override replaces the model wherever the answer goes to Gemini
                // proper — the fast route always, the technical route on a Gemini selection —
                // so a Gemini name goes through the same resolver the call does; a Gemma or
                // other-provider name is kept. Naming the selection alone labelled s50l's and
                // s50m's answers gemini-3.1-flash-lite while 3.5-lite wrote them. (Ollama, custom
                // providers and Groq fast-text answer before streamChat's Gemini branch and keep
                // whatever id the selection holds, as they always have.)
                const selected = useDeepModel ? this.llmHelper.getCurrentModelId() : GEMINI_FLASH_MODEL;
                const primaryModel = /^(gemini-|models\/)/.test(selected) ? verbalPrimaryModel(selected, VERBAL_PRIMARY_MODELS) : selected;
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
                            filterVerbalLines(filterCodeFences(this.stripModelSentinel(raw))),
                            onSuggestionsOnce,
                        ),
                    );

                // Which model is writing the answer: the primary, until a switch is announced — the
                // stall race's model id, or 'Gemini Flash' after a Gemma handover (a label, but
                // pickFallback never sees it: streamWithGemmaGuarded swallows Flash's own errors).
                let answering = primaryModel;
                const filteredAndNamed = (raw: AsyncGenerator<string>) =>
                    this.nameStallSwitch(raw, filtered, (model) => { answering = model; });

                yield* tapFirstToken(
                    cutAtWordBudget(
                        this.withVerbalFallback(
                            filteredAndNamed(rawStream),
                            // The Flash Lite that did NOT just fail, paired the way the stall race
                            // pairs them (LLMHelper.streamGeminiWithStallFallback).
                            () => {
                                fallbackModel = answering === GEMINI_FLASH_FALLBACK_MODEL ? GEMINI_FLASH_MODEL : GEMINI_FLASH_FALLBACK_MODEL;
                                return fallbackModel;
                            },
                            (model) => filteredAndNamed(
                                this.llmHelper.streamVerbalWithGeminiFlash(
                                    fullMessage,
                                    VERBAL_WHAT_TO_ANSWER_PROMPT,
                                    undefined,
                                    model,
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
            yield fallbackModel
                ? `[No answer — both the primary model and the ${fallbackModel} fallback failed: ${msg.slice(0, 160)}]`
                : `[No answer — the answer model failed: ${msg.slice(0, 160)}]`;
        }
    }
}
