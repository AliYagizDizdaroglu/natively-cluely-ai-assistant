# Design: earlier-question context for dependent questions (questions only, gated)

Written 2026-09-28, evening. Design only; no production code. MAIN (`fix/coding-style-suffix-all-gemini`,
HEAD 0e1e8b2) was read, never written. Its companion is `PREREGISTER-followup-questions.md` (same folder).
Reference implementation, text only: `earlierQuestions.ref.mjs`; gate report: `gate-report.mjs` →
`gate-report.out.txt`; recorded arm-B material: `s50m-gated.json`. Nothing here reads holdout40's texts.

## 1. Problem and evidence

**Mechanism (read in the code).**
- `SessionTracker.contextWindowDuration = 120` (SessionTracker.ts:41). `evictOldEntries()` runs on every
  `addTranscript` and every `addAssistantMessage`, so `getContext(180)` in `runWhatShouldISay`
  (IntelligenceEngine.ts:297) never returns anything older than 120 s: the transcript window the answer
  prompt is built from is at most 120 s deep.
- The only other link to the previous exchange is `TemporalContextBuilder.formatPreviousResponses`: the last
  three answers of the last 180 s, each cut at 200 chars plus `...` (203 chars), rendered as
  `PREVIOUS RESPONSES (Avoid Repetition):` in `WhatToAnswerLLM.generateStream` (lines 214-219). It carries the
  previous ANSWER's first 200 characters, never the previous QUESTION, and it is absent when the previous answer
  is older than 180 s (s50m S2Q06F: 0 previous responses — codingHeavy gap 180 s).
- On scenario50 and holdout40 a follow-up plays 150-180 s after a coding/SQL/design main. On s50m
  (`interview60.runs/2026-09-22T08-22-50-s50m`, 39 captured prompts) the 10 follow-ups S1Q04F-S1Q08F and
  S2Q04F-S2Q08F carry exactly one `[INTERVIEWER]` line — their own sentence; the other 10 follow-ups (60-90 s
  gaps) still hold their parent.

**Cost (flights).** h40b (`passes/2026-09-26-h40b-result.md`): R09F ("Now without a subquery. Can you do it
with a window function?") wrong — filtered rank one; R11F ("How does it behave when there are ten instances
of the service?") wrong — generic scaling, 0 of 8 arms acceptable; R02F ("What changes if it has to be safe
across multiple threads?") weak. The same five follow-ups arrive parentless on every holdout hour (R02F R04F
R09F R11F R13F). The user quoted these three sentences in the brief; holdout40's file was not opened. Those
three holdout sentences were seen during design, so a later holdout reading of these follow-ups carries that
bias and must say so; they appear in no calibration set and in no test.

**The restore that failed (6c50ec3).** `withParentExchange` (electron/llm/followUpParent.ts) prepends the
previous answered exchange — the pinned question AND the full previous answer (400-760 chars) — whenever the
window lost it and it is under 300 s old. It fires on ANY question in that state, follow-up or not, and its
effect on ordinary questions was never measured. Its pre-registered replay
(`passes/PREREGISTER-followup-replay.md`, `2026-09-26-followup-replay-result.md`): s50m's 10 parentless
follow-ups × 3 reps, arm A captured bytes, arm B with the exchange restored, gemini-3.1-flash-lite LOW:
acceptable 16 → 22 of 30, wrong 0 → 1 (S2Q07F rep 2), S1Q04F wYY → www and S2Q05F YYY → Yww. FAIL by its
rule (wrong first). Three items went www → YYY (S1Q06F, S2Q06F, S2Q08F): the diagnosis is right, the payload
was too big and untargeted.

**Other evidence that extra prompt content costs.** Injected prep notes were harmful (quality-ceiling
memory); app answers run ~55 % longer than the bare question because of prior turns and résumé sections; the
previous replay's arm B answered +9 words at the paired median (measured today from its six answer files,
see §11). The grading bench's noise floor is about ±4 acceptable on 38 items between two samples of the
identical prompt.

## 2. Goals and non-goals

Goals
1. A dependent question — one that cannot stand alone — gets the earlier QUESTION(S) it leans on, as short
   labelled lines, and nothing else.
2. Every other question gets today's prompt byte for byte. Flag off: every prompt byte for byte.
3. Small: label plus one parent line in the common case; a hard cap on the block.
4. Fail-safe: a gate miss is today's prompt; a false fire adds only short question lines.
5. No regression in wrong answers, off-topic answers, first-token latency or answer length — tested before
   it is built (the pre-registration), then in its own flight.

Non-goals
- Restoring previous ANSWERS (that is 6c50ec3, measured harmful on two items). Today's 203-char answer
  preview stays exactly as it is.
- Changing the eviction window, the transcript cleaner, the pinning, the knowledge lookup, the intent
  classifier, the hedge, or any prompt outside the one inserted block.
- Coding, screenshot, code-hint, brainstorm, refine, recap, clarify and negotiation paths (§8).
- A semantic model of "dependency". The gate is a fixed, testable set of surface cues (§4).

## 3. Architecture

Small units, one purpose each. All pure except the two integration points.

| Unit | Where | One purpose |
|---|---|---|
| Flag | `electron/llm/earlierQuestions.ts`: `EARLIER_QUESTIONS_ENV = 'NATIVELY_EARLIER_QUESTIONS'`, `earlierQuestionsEnabled(env)` | unset/''/'0' off, '1' on, anything else throws (verbalHedge.ts shape) |
| Startup validation | same file: `describeEarlierQuestionsAtStartup(env)` | returns `earlier questions: on|off`; throws on a junk value; throws when BOTH `NATIVELY_EARLIER_QUESTIONS=1` and `NATIVELY_FOLLOWUP_PARENT=1` ("two restores would both edit the prompt"). Logged from main.ts inside the existing try/catch that exits on a bad flag (main.ts:3445-3452), as `[Main] earlier questions: …` |
| Gate | `gateEarlierQuestions(question): { fires, cue }` | surface cues only (§4); no state |
| Question source | `SessionTracker`: `answeredQuestions: { text, timestamp }[]`, cap 60; `recordAnsweredQuestion(text)` called from `addAssistantMessage(text, questionContext)` ONLY when a pinned question was passed; `getAnsweredQuestions()`; cleared in `reset()` | the pinned questions the app actually answered, in delivery order |
| Selector | `selectEarlierQuestions(current, cue, answered, windowLines, now): { lines, skipped, parent, callbacks }` | parent, grandparent (reference cue) or key-term callbacks (callback cue); dedup; age; caps (§5) |
| Formatter | `formatEarlierQuestionsBlock(lines): string` | the exact block bytes or '' (§6) |
| Composer | `buildEarlierQuestions({ enabled, question, answered, windowLines, now }): { block, diag }` | gate → select → format; '' whenever anything is missing; `diag` is null when the flag is off (nothing is logged), otherwise one diag object |
| Integration 1 | `IntelligenceEngine.runWhatShouldISay`, after `preparedTranscript` is final on BOTH branches (contextOverride or not) and before `generateStream` | compute the block from `settled`, log one line, pass the block as a new optional argument |
| Integration 2 | `WhatToAnswerLLM.generateStream(..., earlierQuestionsBlock?: string)` | `if (!isCodingForFraming && earlierQuestionsBlock) contextParts.push(earlierQuestionsBlock)` — after the PREVIOUS RESPONSES part, so it is the last context part, immediately before `INTERVIEWER JUST SAID:` |
| Diagnostic | one `console.log` per answer on the verbal path (natively_debug.log), ONLY when the flag is on | `[IntelligenceEngine] earlier questions: gate=on cue=pronoun lines=1 chars=556 skipped=0 parent=yes callbacks=0 ms=0` / `gate=off cue=none ms=0` / `gate=off reason=no-pinned-question` / `gate=error …`. With the flag off nothing is logged per answer: the flag-off log differs from today's only by the startup line |

Why the block is NOT put into the transcript turns (as 6c50ec3 did): `preparedTranscript` is also what
`classifyIntent` reads (IntelligenceEngine.ts:393-397) and what `lastInterviewerTurn(cleanedTranscript)`
feeds the knowledge lookup (WhatToAnswerLLM.ts:234 → LLMHelper.ts:2446, the path that once sent a "salary"
question to the negotiation card). A separate argument leaves both byte-identical. The block travels only into
`fullMessage`.

Where the block lands in the bytes the model sees (LLMHelper.ts:2534-2538 wraps `fullMessage` as
`CONTEXT:\n<résumé context>\n\nUSER QUESTION:\n<fullMessage>`; `capturePrompt` records exactly that as `user`):

```
USER QUESTION:
<intent_and_shape>…</intent_and_shape>

PREVIOUS RESPONSES (Avoid Repetition):
1. "…203 chars…"

EARLIER QUESTIONS (already answered; use them only to resolve references such as "it", "that" or "those" in the current question; answer only the current question):
- <parent question>

INTERVIEWER JUST SAID:
[INTERVIEWER]: <current pinned question>

YOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):
```

Byte rule: `fullMessage_on = fullMessage_off` with `${block}\n\n` inserted immediately before
`INTERVIEWER JUST SAID:\n`, and nothing else moved (`contextParts.join('\n\n')` produces exactly that). The
replay's `insertBlock()` does the same to a captured `user` string, which is why the replay tests what ships.

## 4. The gate

Designed on scenario50 texts (`electron/test/golden/scenario50.questions.mjs`) and general language; calibrated
on 19 sentences that must fire and 10 that must not (`gate-report.mjs` §0, all correct) — scenario50 texts and
invented sentences only. The three holdout sentences quoted in the brief are in no calibration set and no
test; having seen them during design is a bias any later holdout reading must declare. Every cue below names
the scenario50 item or the plain-language reason that justifies it; two openers that existed only as
duplicates of the pronoun cue ("how would you change it", "can you do it with …") were dropped.

Preprocessing: strip leading interjections/connectives (`yes|no|ok|okay|alright|right|sure|great|good|fine|well|hmm|mm|yeah|so`, with punctuation). Cue families, checked in this order; the first hit names the cue:

| Cue | Rule (case-insensitive) | Fires on (roster) | Why it is general |
|---|---|---|---|
| `callback` | explicit reference to something said earlier, anywhere: `going back to`, `go back to`, `back to the/your/that/what`, `coming back to`, `returning to`, `you mentioned/said/described/talked about/proposed/suggested/outlined/brought up/discussed`, `as you/we said/discussed/mentioned`, `we discussed/talked about/covered`, `earlier you/question/answer/design/approach/solution`, `… earlier`, `previously`, `a moment/minute/few minutes/while ago`, `from earlier`, `earlier on` | none in the roster (it has no callbacks); the six written callbacks | the only cue that licenses a search beyond the parent |
| `reference` | a determiner/possessive on a thing the candidate produced or was asked about: `(your|that|the previous|the earlier|the last|the first|the original) (answer|approach|design|solution|function|query|queries|code|implementation|pipeline|service|limiter|cache|schema|architecture|system|plan|example|gateway|endpoint|adapter|batcher|runner|manifest(s)|response|strategy|recommendation|estimate|configuration|policy|migration|rollout|contract|budget|index|table(s)|job|test(s)|version|number(s)|figure(s)|calculation|logic|setup|design task)` — `this` excluded ("in this scenario" names the current setup); `your CV/churn project/AWS experience/RAG pipeline` do not match (the noun must follow the determiner directly) | S1Q08 S2Q08 S3Q08 S4Q08 ("extend that design/service/gateway"), S2Q09F, S3Q02F, S4Q10F | "that gateway" cannot be resolved without the earlier question |
| `leading` | continuation/comparative openers, by group with its justification: `and|but|so|then|also` (plain language; the same openers `looksFragmentary` treats as a continuation); `what about`, `how about`, `what if`, `and if`, `but if`, `if instead` (plain language; S5Q08F carries "and what if …" mid-sentence); `now without`, `now with`, `now that`, `without the/a/using`, `instead of the/that` (a comparative re-ask that states only the changed condition — plain language, no roster example); `same question`, `in that case`, `otherwise`, `one more`, `follow-up` (plain language); `what breaks/fails/goes wrong`, `what would break/could go wrong` (S3Q04F); `what changes`, `what would change` (S1Q06F's second clause); `what else/more`, `anything else`, `what would you add/change/do differently/remove/drop/keep` (S4Q09F) | S3Q04F S4Q09F | a question that opens with "and", "without", "what breaks" continues something |
| `constraint` | ≤ 25 words AND `(while|still|and still|but still|yet still|without losing/breaking/violating) (preserv|keep|maintain|retain|respect|honou?r|satisfy|meet)… (the|that|those|its|their|our|my) … (rule(s)|constraint(s)|requirement(s)|guarantee(s)|invariant(s)|property|properties|semantics|ordering|order|behaviou?r|contract|budget|limit(s)|tie(s)|target(s)|sla|slo(s)|deadline|latency)` | S1Q04F ("while preserving the tie rule") | a short question that keeps a rule it does not state took the rule from an earlier one; long mains (S2Q06, S4Q07) state their constraints themselves, hence ≤ 25 words |
| `pronoun` | in the FIRST comma-free segment only (text before the first `. : ; ? ! ,` or em dash): `it`, `they`, `them`, `those`, `these`; `this` unless followed by `case|scenario|situation|question|problem|example|interview|role|company|context|setup|task|exercise|round`; `that` only after an auxiliary/preposition/verb from a fixed list (`is|was|does|would|could|should|if|when|with|for|to|of|extend|change|make|handle|…`) or as the segment's first word, never inside `so|such|given|now|provided|assuming|except|in|the fact|means|ensure(s)|assume|note|say(s)|know|think|require(s)|argue that`; also `the same`, `such a(n)` | S1Q06F S2Q01F S2Q05F S2Q06F S2Q08F S5Q10F | a dependent pronoun before the first comma has no antecedent in the question; after a comma or colon it usually refers to the question's own subject (STT renders "platform: it has to" as "platform, it has to" — S1Q07 on s50m, not fired) |
| `short` | ≤ 3 words | none in the roster | "Why?", "And why?" (a 4-6 word standalone like "Explain the CAP theorem." must not fire) |

**Confusion table on scenario50 (100 items, roster text; "needs parent" is a hand label recorded in
`gate-report.mjs`):**

| | fires | does not fire |
|---|---|---|
| follow-ups that need their parent (12) | 11: S1Q04F S1Q06F S2Q01F S2Q05F S2Q06F S2Q08F S2Q09F S3Q02F S3Q04F S4Q09F S5Q10F | 1 miss: S5Q04F ("validate your choice" — answerable generically; a borderline label) |
| follow-ups answerable alone (38) | 1 false fire: S4Q10F ("your response") | 37 |
| mains that lean on an earlier main (4: "extend that design/service/gateway") | 4: S1Q08 S2Q08 S3Q08 S4Q08 | 0 |
| standalone mains (46) | 0 | 46 |

On s50m's captured pinned questions (STT text, 39 ids) the gate fires on 8: S1Q04F S1Q06F S1Q08 S2Q01F
S2Q05F S2Q08 S2Q08F S2Q09F; S2Q01F has nothing to add (parent still in the window) and stays byte-identical;
31 do not fire. Known STT-caused miss: S2Q06F was heard as "Extended to retry…" ("Extend it" lost its
pronoun), so today's prompt is sent — the fail-safe direction. The full 100-row table is in
`gate-report.out.txt` §1.

## 5. The selector

Inputs: `current` (the pinned `settled` question), `cue`, `answered` (the session's answered-question list,
oldest first), `windowLines` (the `[INTERVIEWER]:` texts already in `preparedTranscript`, the last — pinned —
line excluded), `now`.

1. **Parent** = the LAST entry of `answered` (the pinned question the previous delivered answer was generated
   for), if it is ≤ 300 s old (`PARENT_MAX_AGE_MS`, the 6c50ec3 figure: longest roster gap 180 s + answer +
   clip). Skipped when the window already holds it — `sameAnchor` (questionReconcile.ts: containment either
   way, or ≥ 50 % content-word overlap) against any window line, which also catches a parent the STT split
   across several lines — or when it IS the current question (normalised equality or containment only; the
   50 % rule is not used here because a callback shares half its content words with its own referent).
2. **Grandparent** (cue `reference` only) = the entry before the parent, if ≤ 600 s old (main → 60 s
   follow-up → main puts the referenced main 250-300 s back) and not in the window, not the parent, not the
   current question. "Extend that design" refers to the question two back; a key-term search found it for
   S1Q08 but not for S4Q08 (its shared terms are common words), so the position rule is used instead.
3. **Callbacks** (cue `callback` only): every earlier entry except the parent that shares a RARE key term with
   the current question. Terms: lower-case tokens of ≥ 5 letters/digits not in a fixed stop list of function
   words (154 entries, in `earlierQuestions.ref.mjs`), plus
   acronyms (2-4 upper-case letters/digits in the original casing: SQL, RAG, AKS, LRU, TTL, F1). Rare = the
   term occurs in at most 2 answered questions of THIS session (no hand-tuned topic list; "model", "service",
   "customer" drop out on their own after the third question that uses them). Ranked by number of shared rare
   terms, then recency; at most 2; deduplicated against the window, the parent and each other; output oldest
   first.
4. Ordering: chronological, parent LAST — the most likely referent sits directly above
   `INTERVIEWER JUST SAID`, and the block reads in interview order like the transcript.
5. Caps: parent line ≤ 450 chars (every scenario50 question, max 407 chars, fits whole with STT filler — the
   reference can sit at its very end: S1Q04's tie rule is at char 300, S1Q06's "zero calls" at 350);
   grandparent/callback lines ≤ 200 chars (they identify a topic and its main constraint); at most 3 lines;
   whole block ≤ 1000 chars, the OLDEST line dropped first. Cuts are at a word boundary with `…`.

## 6. The block: exact wording and placement

Label (one line, 164 chars), then one `- ` line per selected question, joined by `\n`, no trailing newline:

```
EARLIER QUESTIONS (already answered; use them only to resolve references such as "it", "that" or "those" in the current question; answer only the current question):
- <oldest callback or grandparent, ≤ 200 chars>
- <parent, ≤ 450 chars>
```

Placement: the last context part before `INTERVIEWER JUST SAID:` (§3). The instruction does two things the
6c50ec3 replay showed are needed: it says these were ALREADY answered (so the model does not answer them
again — the "answering an older question" risk the decision rule counts against), and it says what they are
for (resolving references). It does not restate the answer, so nothing pulls the new answer toward repeating
the old one.

Size: label 164 chars (≈ 40 tokens at 4 chars/token). On s50m's gated items the block is 284-576 chars (≈ 70-145
tokens; mean added 488 chars over the 16 recorded items: 7 roster, 6 callbacks, 3 dropped-parent); the six callbacks 363-908
chars (≈ 90-230 tokens). Worst case by construction: 1000 chars ≈ 250 tokens. The user's ~30-100-token target
holds for the label plus a short parent; a long coding/SQL parent (400+ chars) alone is ≈ 100 tokens, and
cutting it would drop the constraint the follow-up refers to. This is a deliberate choice, named in the final
report.

## 7. Data flow

```
dispatch (main.ts: turn dispatch / Live / supersede / chip)  question = d.question (the pinned text)
  └─ runWhatShouldISay(question, …)
       settled = question.trim()                        (unchanged)
       contextItems = session.getContext(180)           (≤ 120 s in practice, unchanged)
       preparedTranscript = pinSettledQuestion(prepareTranscriptForWhatToAnswer(withParentExchange(turns, history), 12), settled)   (unchanged; withParentExchange is a no-op with its flag off)
       ── NEW ──
       earlier = buildEarlierQuestions({
           enabled: earlierQuestionsEnabled(),
           question: settled,                           // null → block '' (reason=no-pinned-question)
           answered: session.getAnsweredQuestions(),    // [{text,timestamp}], oldest first, ≤ 60
           windowLines: interviewerLinesBefore(preparedTranscript),   // [INTERVIEWER] lines except the last
           now: Date.now() })
       console.log(`[IntelligenceEngine] earlier questions: ${earlier.diag}`)
       ── unchanged ──
       temporalContext = buildTemporalContext(contextItems, history, 180)
       intentResult = override ?? classifyIntent(lastInterviewerTurn, preparedTranscript, …)   // block NOT visible
       stream = whatToAnswerLLM.generateStream(preparedTranscript, temporalContext, intentResult, imagePaths, forceFast, undefined, liveTexts, earlier.block)
            └─ contextParts = [intent_and_shape, PREVIOUS RESPONSES?, earlierQuestionsBlock? (verbal framing only)]
               fullMessage = `${contextParts.join('\n\n')}\n\nINTERVIEWER JUST SAID:\n${preparedTranscript}${liveBlock}${trailer}`
               knowledgeQuestion = lastInterviewerTurn(preparedTranscript)                        // unchanged
               llmHelper.streamChat(fullMessage, …, VERBAL_WHAT_TO_ANSWER_PROMPT, …, knowledgeQuestion)
                    └─ processQuestion(knowledgeQuestion) (unchanged) · feedForDepthScoring(fullMessage) (a stub: TechnicalDepthScorer returns 'balanced' and '' always)
                       userContent = CONTEXT + USER QUESTION + fullMessage → capturePrompt → hedge/stall race (same bytes to every leg)
       … stream completes (not aborted) …
       session.addAssistantMessage(fullAnswer, settled)  → history (unchanged) + NEW answeredQuestions.push({ text: settled, timestamp: now }) when settled is set
```

## 8. Relation to 6c50ec3, and which paths get it

**Replace, not extend.** 6c50ec3's `withParentExchange` stays in the tree, flag off, until this design has
passed its replay AND its scenario50 flight; the commit that makes this design the default also removes
`withParentExchange`, `NATIVELY_FOLLOWUP_PARENT` and their tests, in one reviewed change. Until then the two
coexist: `describeEarlierQuestionsAtStartup` refuses to start when both flags are `1` (9107a93's pattern —
a junk or contradictory configuration is refused at launch, never discovered mid-interview). The new module
does not import `followUpParent.ts`; its call site at IntelligenceEngine.ts:333 is left exactly as it is.
`SessionTracker.addAssistantMessage`'s `questionContext` (the C1 fix) is reused as the trigger for
`recordAnsweredQuestion`.

**Paths.** Verbal only, first: every `runWhatShouldISay` call whose framing is verbal — hands-free turn
dispatch, Live dispatch, supersede (`replaceAnswer`), chip click (`contextOverride`), typed question with a
pinned text — on both Flash Lites and under the hedge (same bytes to both legs). Not the coding framing
(`intentResult.intent === 'coding'`: the `CONVERSATION` label, screenshots attached, a different system
prompt; the failure was measured on the verbal path and a screenshot carries its own problem), not
`runCodeHint`, `runBrainstorm`, `runFollowUp` (refine), `runRecap`, `runClarify`, `runManualAnswer`, not
the `answerLLM` fallback branch (no `whatToAnswerLLM`), not the negotiation card (a knowledge-orchestrator
short-circuit on `knowledgeQuestion`, untouched). A spoken coding question with no screenshot is routed
`general` (advisoryCoding, IntelligenceEngine.ts:380-384) and therefore DOES get the block — that is S1Q04F's
case, the one that matters.

## 9. Error handling

| Situation | What happens | Prompt |
|---|---|---|
| Flag unset / '' / '0' | `buildEarlierQuestions` returns `{ block: '', diag: null }` before anything runs; nothing is logged per answer, so the flag-off log differs from today's only by the startup line | byte-identical to today |
| Junk flag value, or both `NATIVELY_EARLIER_QUESTIONS=1` and `NATIVELY_FOLLOWUP_PARENT=1` | `describeEarlierQuestionsAtStartup` throws; main.ts logs `… — refusing to start` and `app.exit(1)` | none: the app does not start |
| No history / first question of the session | `answered` empty → '' ; log `gate=on lines=0` | byte-identical |
| No pinned question (`settled` null: manual "what should I say" with nothing dispatched) | '' ; log `gate=off reason=no-pinned-question` | byte-identical |
| Parent stored as 'unknown' or an STT fragment | cannot happen for the new list: it stores only the `settled` text passed at the verbal/coding call site, never `getLastInterviewerTurn()` nor 'unknown'. A pinned text that was itself a fragment (a fragment the dispatcher chose to answer) is stored as asked; it is a short line, and `looksFragmentary` at dispatch already keeps most fragments out | parent line = what was asked |
| Parent already inside the window (short gap) | `sameAnchor` against the window lines (split STT lines included) → skipped; if nothing else qualifies, '' | byte-identical (s50m S2Q01F, S1Q08's parent) |
| Parent is the current question (a re-ask, or the same text stored twice) | containment guard → skipped | no self-reference |
| Superseded generation | the aborted stream returns before `addAssistantMessage` (IntelligenceEngine.ts:442-446), so only the superseding answer's pinned text is recorded — "the pinned question actually answered". A head that completed before its supersede is recorded too; the two texts dedupe against each other (containment / sameAnchor) | one line |
| Re-answered question (duplicate dispatch answered twice) | two entries with near-identical text; the later is the parent, the earlier is deduped | one line |
| Question the app never answered (dropped, held, lost by both ears — h40b R05) | absent from the list. A follow-up to it gets the PREVIOUS answered question as its parent, which is the wrong referent. The label limits the damage to what it says: the lines are "already answered", are "only to resolve references", and the model must "answer only the current question" — so a wrong parent can at most mis-resolve a pronoun; it cannot make the model answer the parent, and it never carries an answer to copy. The age cap (300 s) limits how stale a wrong parent can be. Today's prompt has a related defect through the answer preview. Measured: the replay's three dropped-parent cases (D1-D3, pre-registration §3b) count in its wrong and off-topic clauses | possibly one misleading line |
| `recordAnsweredQuestion` throws (a malformed argument, a full or corrupted array) | wrapped in its own try/catch inside `addAssistantMessage`, after the history push; logs `[SessionTracker] recordAnsweredQuestion failed: <message>`; nothing is recorded; `addAssistantMessage` completes as today — the answer, the history and the UI are never affected by the new list | a later parent may be missing (fail-safe) |
| "Could you repeat that?" fallback answer (empty stream) | `addAssistantMessage` records it (≥ 10 chars, not a filtered phrase), so the question enters the list — correct: the interviewer did ask it | parent line as asked |
| Answers `addAssistantMessage` filters out (< 10 chars, "I'm not sure", "I can't answer") | the question is not recorded (the record call sits after the filters) | that question is never a parent |
| Coding / screenshot / negotiation-card / refine / recap / clarify / brainstorm / manual paths | no block (§8). A CODING answer's pinned question IS recorded (same `addAssistantMessage` call), so a spoken coding main can be the parent of a verbal follow-up | — |
| New meeting / session reset | `reset()` clears `answeredQuestions` with everything else | first question of the new session has no history |
| Very long current question | the gate reads the first segment and fixed phrases; length only matters for `constraint` (≤ 25 words) and `short` (≤ 3) | — |
| Very long stored question | clipped at 450 (parent) / 200 (others) at a word boundary with `…`; block ≤ 1000 chars, oldest line dropped first | bounded |
| Garbled STT words in the key-term match ("axe" for AKS) | terms are ≥ 5 chars or acronyms, stop-listed, and must be rare in the session; a garbled token simply fails to match — the callback is missed, the parent line still goes in | fail-safe |
| Live-ear paraphrase pinned (verdict match/paraphrase keeps Live's text) | the stored parent is Live's rendering — the text that was answered. Its `sameAnchor` against the STT window lines can miss (paraphrase vs STT), so the parent may appear both as STT lines in the window and as a paraphrase line in the block: a duplicate, ≤ 450 chars, named | harmless duplicate |
| Live-ear paraphrase as the CURRENT question ("Regarding the rate limiter discussed previously, …") | `callback` cue fires on "previously"; the rare-term search finds "limiter" | intended |
| Ordering / timestamps | the list is append-only in delivery order; selection uses list position, never sorts; timestamps serve only the age caps (`now - ts`); a backwards clock jump makes an entry look fresh, nothing worse | — |
| The 60-entry cap | ~90 minutes at one question per 90 s; the oldest entries fall off; a callback older than that is missed (fail-safe) | — |
| Prompt capture timing | `capturePrompt` runs after the knowledge lookup, seconds after the dispatch line; the replay builder therefore cuts the answered list at the dispatch whose text equals the pinned line, not by a time margin (bug found and fixed while building `gate-report.mjs`) | replay only |
| Depth scorer sees the block (`feedForDepthScoring(fullMessage)`) | `TechnicalDepthScorer` is a stub (always 'balanced', empty XML), so nothing downstream changes; if it ever scores, feed it the message without the block | none today |
| Hedge / stall race / first-token abort | the same `userContent` goes to every leg; no change to timing logic | — |
| Any exception inside gate/select/format | caught in `buildEarlierQuestions`, logged `gate=error`, returns '' — never breaks an answer (the same rule as `capturePrompt`) | byte-identical |

## 10. No-regression guarantees (testable) and the tests written first

Guarantees, each a test:
- G1. Flag off: for every captured s50m prompt (39 ids) the rebuilt `user` equals the captured bytes
  (`--calibrate` of the replay builder, reused from `followup-replay-build.mjs`), and in the app tests
  `generateStream` receives a transcript identical to today's and an undefined block.
- G2. Flag on, gate not firing: identical to G1 on the same inputs (31 of s50m's 39 ids).
- G3. Flag on, gate firing, nothing to add (parent in window, or no history): identical (S2Q01F).
- G4. Flag on, gate firing with lines: `fullMessage` equals today's message with `${block}\n\n` inserted at
  `INTERVIEWER JUST SAID:\n` and no other byte moved; `preparedTranscript`, `lastInterviewerTurn`,
  `classifyIntent`'s inputs and `temporalContext` are unchanged.
- G5. Coding framing: the block argument is ignored; the message is byte-identical to today's.
- G6. Parity, silence included: `parity-fixture.json` holds, for ALL 39 s50m ids plus the 6 callbacks and the
  3 dropped-parent cases (48 entries), the inputs (current, answered list, window lines, now) and the
  expected cue and block — the recorded block for the 16 that get one, '' for the 32 that do not (S2Q01F
  among them). The built module must reproduce every entry: the same block bytes where the reference
  produced one, and '' where it stayed silent. The fixture's sha256 is in the pre-registration, and
  `stamp.mjs` re-derives every entry from its inputs (and fails on a corrupted one) before it is asked of
  the app.
- G7. With the flag off, the startup line `[Main] earlier questions: off` is the only observable change: no
  per-answer log line, no prompt byte, no state read.

Unit tests, TDD order (each fails before the code exists):
1. `electron/llm/earlierQuestions.test.ts` — flag parsing (unset/''/'0'/'1'/junk); `describe…AtStartup`
   (off/on/junk throws/both-flags throws with the flag names in the message); gate: the 19 must-fire and 10
   must-not-fire sentences of `gate-report.mjs` §0 (scenario50 texts and invented sentences; no holdout
   sentence, now or later), the interjection strip, the first-segment rule
   (STT comma: "Design the next version of the churn platform, it has to…" does not fire; "a batch that
   fails" does not; "extend it" does), `short` = 3 words; selector: parent chosen; parent skipped when a
   window line contains it (split STT); parent skipped when it is the current question by containment but NOT
   by 50 % overlap (the C5 case); parent older than 300 s dropped; grandparent only on `reference`; search
   only on `callback`; a term present in three answered questions is ignored; ranking by count then recency;
   cap 2; clip at 450/200 with `…` at a word boundary; block cap drops the oldest line first; formatter bytes;
   empty → ''; the parity fixture (G6): all 48 entries, block and silence alike.
2. `electron/SessionTracker.test.ts` — `recordAnsweredQuestion` through `addAssistantMessage(text, q)`;
   nothing recorded without `q`; the fallback text still records `q`; filtered answers do not; cap 60; `reset()`;
   a throwing record (a stubbed push) leaves `addAssistantMessage`'s history, `lastAssistantMessage` and return
   unchanged and logs the failure.
3. `electron/IntelligenceEngine.earlierQuestions.test.ts` (the shape of `IntelligenceEngine.followUpParent.test.ts`,
   with a spied `generateStream` and `console.log`): G1-G3, the contextOverride branch, the block argument on a
   156 s gap, the diag line exactly once per answer with `cue=`/`lines=`/`chars=` when the flag is on, NO
   `earlier questions:` line at all when the flag is off (G7), `classifyIntent` spied to receive the unchanged
   transcript.
4. `electron/llm/WhatToAnswerLLM.earlierQuestions.test.ts` (the shape of `WhatToAnswerLLM.liveEars.test.ts`):
   G4 by byte diff, G5, `knowledgeQuestion` unchanged.
5. `electron/llm/followUpParent.test.ts` unchanged and still green.

## 11. Latency

Why small: the gate is a handful of regexes over one sentence; the selector scans ≤ 60 strings with
`sameAnchor` and a term-frequency count (≤ 60 × 60 set lookups); no I/O, no await, nothing new before the
dispatch. On the model side the block adds ≤ 250 tokens to a ~5,500-token request (s50m `user` 4-6 k chars +
`system` 16 k chars); prefill is a small part of first-token time on the lites, whose TTFT is dominated by
thinking and queueing (the 2026-09-26 replay's arm A, s50m follow-up prompts on 3.1-lite LOW: 4.3-6.1 s at
p50 across its three reps of identical prompts).

How it is measured, not assumed:
- The diag line carries `ms=` (wall time of gate+select+format); expected 0-1 ms, read from the flight log.
- The replay's rule 3: A and B interleaved per item and rep, paired first-token differences (pre-registration).
  Noise floor measured today from the previous replay's six answer files: on IDENTICAL prompts the paired
  median TTFT difference between reps was −1.7 to +2.0 s and the absolute paired median 0.65-2.9 s; the
  previous arm B (+~600 chars and a whole answer) ran +389 ms at the pooled paired median. Words: rep-to-rep
  paired medians 0 to −8 words on identical prompts; the previous arm B +9 words.
- The scenario50 flight after a PASS: the TTFT and words rows of the gate, and the diag `ms=`.

## 12. Sequencing, and residual risks named

Sequencing (one variable per flight):
- The replay runs BEFORE cue mode is merged into MAIN (planned Thu 2026-10-01), or re-passes its calibration
  precondition after the merge: the calibration builder imports MAIN's `dist-electron` (the cleaner and the
  pinning), and the merged build may no longer reproduce the pre-cue s50m prompts byte for byte. Arm B's own
  bytes do not depend on `dist-electron` (a marker insertion into captured bytes), so a post-merge calibration
  failure is resolved by running the calibration against a dist compiled at 0e1e8b2, never by skipping it.
- This design's scenario50 flight comes after cue mode's validation hour, so that flight's twins will carry
  cues while the replay here is on pre-cue s50m prompts. The replay therefore tests the block on the prompt
  shape of 0e1e8b2; the flight tests it on the shipped shape. Named under the pre-registration's "not covered".

Residual risks:
- The gate is surface cues; a dependent question with none of them (S5Q04F-like "validate your choice",
  STT-mangled "Extended to") gets today's prompt — the same as now.
- A dropped parent makes the previous answered question the "parent" line; the label confines it to
  reference resolution and the age cap bounds it; the replay's three dropped-parent cases measure it under
  the wrong and off-topic clauses.
- The three holdout sentences quoted in the brief were seen during design; a later holdout reading of R02F,
  R09F and R11F carries that bias and must say so.
- Key-term callbacks are new behaviour with no roster examples; six written callbacks measure it
  descriptively and their wrong answers count in the no-new-wrong clause.
- `reference`-cue grandparent lines are a guess two questions back (right for the four "extend that" mains;
  a 117-char noise line for S2Q09F). Fail-safe by size; measured in the replay.
