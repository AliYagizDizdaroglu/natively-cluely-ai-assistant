# Final whole-branch review: cue mode v2 ("small cues") on feat/whole-turn-answers

Reviewer: Opus (claude-opus-5-5), 2026-09-30. **Part 1: `279103b..87877ee`.** Part 2 is appended when its range arrives.

Read-only. HEAD was `87877ee` at the start and at the end of Part 1; `git status --short` showed only the user's
`electron/test/golden/interview60.report.md`. Line numbers are at `87877ee`; each one below was re-read before this
file was written.

Not run in Part 1 (br1 was flying): no test, no build, no type check. Everything below comes from reading: the diff,
the code around it, the spec and the plan (revision 3), the ledger, the controller's scripts, and the timing lines of
three finished run folders (Appendix B). Nothing here claims that a test passes.

`SP` is the session scratchpad, as in the plan.

---

### Strengths

- **The diff is as small as the change.** Three app files (`prompts.ts`, `verbalStreamFilter.ts`,
  `IntelligenceEngine.ts`) and two harness files (the metrics, the flight's twins). The parser, `WhatToAnswerLLM`,
  `LLMHelper`, `main.ts`, preload and `src/` are untouched, as the plan says.
- **The prompt and the cap cannot drift.** `CUE_SHAPE_RULE` interpolates `CUE_MAX_LINES` / `CUE_MAX_WORDS`, the pin is
  verbatim, and the metrics literal has a drift test built from the real constants (the ledger records it red on the
  constants alone, then green on the mirror).
- **`trimCues` is right, and its tests say why.** Cleanup before the cut, kept lines only, dropped lines verbatim, the
  trim pinned on both sides. I traced the tests' `$O(\log n)$` and `\frac` lines through `cleanNotation` by hand; the
  expectations are correct.
- **Every display edit is logged, in its own field, before the block it explains.** One engine case per condition
  (dropped, cut, cleaned) plus the combined one, so a version that logs on only two of the three fails a case.
- **The hedge x cue seam is pinned with the real classes.** `WhatToAnswerLLM.hedgeCues.test.ts` runs the real
  `WhatToAnswerLLM` over the real `LLMHelper` with only the SDK stubbed (A, A0, B, C, D, E). The engine's third case
  pins the order production delivers: the re-announce arrives after `onCues` and must not consume the cues.
- **The new log line cannot be taken for the old one.** I checked every reader (Appendix A, item 4): none does.
- **The forward references are now true** (Appendix A, item 3), apart from the three that ride in Task 4.
- **Pre-registration was kept honest.** The wording rule was written before its data, the deciding script was
  calibrated on one case per branch, the smoke check refuses to excuse an absent block, and the ledger gives a reason
  for every parked Minor.

---

### Issues

#### Critical (Must Fix)

None in Part 1.

#### Important (Should Fix)

**I1. The measures that chose the wording, and the probe that will check it, count a cue block with no answer under it
as a success.**

- Where:
  - the wording: `electron/llm/prompts.ts:217` (asked "Tabs or spaces?", "the whole block is 1| Spaces");
  - the instruments: `SP\cue-group\decide-spike6.mjs:29` (with `:14`, `:20`), `SP\cue-group\spike6.mjs:90`,
    `SP\cue-group\probe-shipped.mjs:72, 136`, `SP\check-smoke-cues.mjs:34-36, 65`;
  - the engine: `electron/IntelligenceEngine.ts:417-423`, `:450-452` and `:458-460`, `:470-472`, `:485`.
- What is already known. The merge review's P2b, parked in the ledger as a residual risk: an answer that is only a
  block logs its cues, never sends them (they ride a prose token, and there is none), and the candidate sees "Could you
  repeat that? I want to make sure I address your question properly." The 09-20 design lists the state (section 7,
  "cues delivered, prose empty"). At the renderer the cues are not delivered.
- What is new with v2.
  - All three spike-6 arms tell the model that a block can be one line of one or two words. `one-first` and `strict-ex`
    add an example whose whole block is one word. The v1 rule had nothing like it.
  - Spike 6's primary measure is `simple.filter((r) => r.n === 1 && firstCarries(r))`. The probe's is the same with
    `hasText`, and `hasText` is `raw.trim().length > 0`. Neither looks at the prose. `spike6.mjs:90` stores
    `proseWords` in every row; nothing reads it.
  - So a response of `__CUES__` + `1| Boosting` and nothing else is a one-line answer for the rule and for the probe.
  - The smoke check reads it CLEAN (the full line carries the engine's substitute, so it is a "failed answer"). The
    row reads it present and well-formed.
  - The bench would catch it, but on its own roster, which is mostly long questions. Simple questions are where the
    example applies, and only the spike and the probe look at those.
- Why it matters.
  - The decision was 15 of 24 against 11 (`one-first` against `strict-ex`, 3.5-lite HIGH). The rule's tie band is 2.
    Two block-only rows among the 15, and none among the 11, make it a tie. With the table's other numbers as they
    are (empties 0 and 0, answer-first 48 and 48, words p50 4 and 4), the tie-break chain ends at `strict-ex`.
  - I expect the count to be zero: the rule also says "The spoken answer follows on the next line", and all 22
    answers at 05:00 had prose (old wording). But it is unmeasured, the data to measure it is already on disk, and the
    probe is about to repeat the blind spot.
  - If it does happen live, it happens on the simplest questions, and the candidate reads "Could you repeat that?"
    instead of a correct one-word cue.
- How to fix. Measure first; no code yet.
  1. Now, with no model call: per arm and model, count rows with `n >= 1 && proseWords === 0` in the two spike-6 row
     files (Appendix B has the names). Print counts only. I did not open the row files; the brief forbids it.
  2. Before the probe's first call: add the same count to `probe-shipped.mjs`
     (`F.extractCues(raw).prose.trim() === ''` with at least one cue line), per model and set, and add one line to
     `PREREGISTER-cueprobe.md`.
  3. Report the recount beside the spike-6 result. The rule as written stands. A non-zero count for `one-first` is a
     finding about the wording that the user should see before the merge.
  4. If any count is non-zero: decide what the engine shows before the merge. At the least it should not drop the
     block.
  5. If every count is zero: one line in spec section 9, with the counts.
  6. In the re-smoke's result note, name the shape. A non-empty `[Answer] cues:` line followed by a "Could you repeat
     that?" full line is a block-only answer, not a transport failure (that one logs `cues: []`).

**I2. The cues and the first paragraph wait until the first prose LINE ends. In 14 of 22 answers at 05:00 that was the
end of the stream.** (Cue mode v1: `577d13a`, wired in by `6b7817f`. Not in this diff; it merges with it.)

- Where: `electron/llm/verbalStreamFilter.ts:406-424`. Inside the block only complete lines are examined, so a
  partial line is held whatever it contains. `:432-438`: an answer of one paragraph is therefore released at stream
  end, and `onCues` fires there too. The doc at `:374-376` says "at most one partial line". That line is the first
  prose line, whole.
- What is wrong. The parser does what the approved data flow says: "The first non-empty line that is not a cue line
  closes the block" (09-20 design, section 6). The same design's cost sentence does not follow from it: "cues become
  visible with the first prose word, roughly a third of a second after the block finishes" (section 4). As built, they
  become visible with the LAST word of the first paragraph, and a spoken answer is usually one paragraph. Nothing in
  the specs, the plan or the ledger records that consequence.
- Evidence.
  - The code above. `stripCueBlock` has not changed since `577d13a` (`git diff 577d13a..87877ee` touches no line of
    it), so the 05:00 build ran these bytes.
  - 05:00 cue smoke, 22 answers. The `[Answer] cues:` line and the `[Answer] budget:` line (stream end) are 3 to 13 ms
    apart in **14 of 22**. The other 8 are 46 to 1231 ms apart: their prose had a line break. The diag `first token`
    line is within 11 ms of `word budget` in the same 14.
  - The same gap in two hours without cues (`first token` to `word budget`, 47 answers each):

    | hour | model | median | p90 | max | under 15 ms |
    |---|---|---|---|---|---|
    | h40a | 3.1-lite LOW | 227 ms | 491 ms | 856 ms | 1 of 47 |
    | h40c | hedge (3.5-lite HIGH first) | 156 ms | 313 ms | 690 ms | 3 of 47 |

  - So answers do not normally arrive in one piece. The hold is what makes 14 of 22 do so.
  - On the two lites the hold costs what the prose takes to stream: about 0.2 s typically, up to about 0.9 s.
- Why it matters.
  - It is the "fast" half of "small and fast". The block is complete before it is drawn, and the answer no longer
    streams: it appears whole.
  - On a slow selection the overlay stays empty for the whole first paragraph. The technical route honours the
    dropdown (`LLMHelper.ts:2573-2645`: Ollama, custom, OpenAI, Claude, Groq). At 30 tokens a second that is several
    seconds, where the build without cues streamed from the first word. (Gemma is already line-buffered at its source,
    `LLMHelper.ts:3070-3085`, so nothing changes there.)
  - The written record understates it. Spec 09-30 section 9.7 and `PREREGISTER-cuesmoke.md` say the `first token`
    line "fires on the first PROSE token, after the cue block". It fires when the first prose line ends. The number is
    honest about the screen; it now includes the block and the first paragraph. The gate row "Answer TTFT p90" (limit
    10 s, `interview60.metrics.mjs:490`) and Friday's latency read inherit that.
  - The candidate can see it. The bar under each answer divides tokens by the time since the first token
    (`src/hooks/useStreamMetrics.ts:65-66`). With the first token a few milliseconds before the end, it shows a TTFT
    about equal to the total and a rate in the thousands.
  - Two side effects nobody wrote down, both benign. `withVerbalFallback`'s first-content guard
    (`WhatToAnswerLLM.ts:69-76`) now treats a failure anywhere in the first paragraph as pre-token, so more failures
    become a clean redirect. And a superseded stream is not cancelled until its first paragraph completes, because the
    engine checks the generation only when a token arrives (`IntelligenceEngine.ts:432-440`).
- How to fix. Close the block as soon as the pending partial line can no longer become a cue line. After the
  complete-line loop, still inside the `for await`:

  ```ts
  const head = pending.trimStart();
  if (phase === 'block' && head && !/^\d+\s*(\|.*)?$/.test(head)) { phase = 'prose'; report(); yield pending; pending = ''; }
  ```

  - `extractCues` is unchanged, so "the result on a whole string equals extractCues" keeps its meaning
    (`verbalStreamFilter.test.ts:560-568` runs five chunk sizes).
  - Test first. Appendix B has the case; it fails today. Add the chunk-size matrix on a prose with no newline.
  - The report then fires a few chunks before the first prose chunk clears the line filter (it can hold up to 48
    characters). Case D's window becomes "a failure in those few chunks" instead of "a dropped first line". The
    once-guard covers both, and test D passes unchanged.
- The decision is the user's, because speed is the stated intent. Two honest options:
  - (a) Accept for Thursday. Write the measured cost into spec section 9, correct the two sentences (09-20 section 4,
    09-30 section 9.7), and make the early close the first follow-up, with its own smoke.
  - (b) Do it now as its own task, before the build, so the re-smoke, the bench, the probe and Friday's hour all
    measure the timing that ships.
  - I do not recommend slipping it into v2's build unasked: the parser is on the plan's do-not-touch list. Given the
    measured cost on the shipped default, (a) does not block the merge.

#### Minor (Nice to Have)

**M1. An empty displayed cue draws a bare numeral** (the brief's item 2).
- Where: `src/components/CueBlock.tsx:15-23`; `src/components/NativelyInterface.tsx:2623-2625`.
- What: `['', 'Parquet']` renders "1" beside nothing, then "2 Parquet". `['']` renders a lone "1" over the divider,
  because `cues.length > 0`.
- My answer: **the renderer should skip an empty item; the log and the row keep flagging it.** Why:
  - The flag's readers are the operator's instruments, and they all read the engine's log line, which is written
    before the renderer: the `cleaned` entry, `[Answer] cues: ["",...]`, the row's well-formed count, the smoke
    check's `malformed`. Skipping in the renderer hides nothing from any of them.
  - On screen the reader is the candidate, mid-answer. The numeral sits where the eye lands first, in the largest type
    of the card. It carries nothing, and a missing first line reads as "something failed to load".
  - Spec section 3.3's "neither dropped nor repaired" protects what the harness measures. The renderer is not measured
    (the smoke reads logs; the user looks once). `trimCues`, the engine and the log stay as they are.
- How: in `CueBlock`, filter `cue.trim() !== ''` before the map and return `null` when nothing is left. The numerals
  then run 1..k over what is shown; they are positions, not references. One test (`['', 'Parquet']` gives one item
  numbered 1; `['']` gives nothing). Keep the engine case the fix round adds: it pins that the log equals the token,
  which this does not change.
- It breaks the plan's "nothing in `src/` changes" and spec 3.3's "No code for it", so it needs a ruling. The state
  has never been observed; it need not precede the build.
- One thing for the user's single look at the overlay: a one-line block draws "1" beside the cue. v2 makes one-line
  blocks common on simple questions.

**M2. Two knowledge short-circuits log an absent block for a stream that never saw the cue rule.**
- Where: `electron/LLMHelper.ts:2449-2458` (the negotiation card and the intro shortcut return before any model gets
  the verbal prompt). They pass through `WhatToAnswerLLM.ts:386-392`; `stripCueBlock` reports `[]`
  (`verbalStreamFilter.ts:398-404`); `IntelligenceEngine.ts:421` logs `[Answer] cues: []`.
- What: the coding route avoids exactly this on purpose (`WhatToAnswerLLM.ts:291-293`). These two do not.
- Why: the row (`present === n`) and the smoke check (`malformed: []`) read it as an absent block beside a real
  answer. By the pre-registered rule that is a cue failure, and the fix goes back to a wording that never ran. Neither
  shape is among the pipeline events of spec 3.5.2 and 9.2.
- Exposure.
  - The re-smoke: none expected. `scenario50.questions.mjs` has no intro phrase, and at 05:00 all 22 blocks were
    present.
  - Friday: holdout40 carries both triggers as distractors (`holdout40.questions.mjs:101-103` R09, the h40a
    negotiation misfire, since fixed; `:115-121` R11, the false intro). If either misfires, the cue row fails on top
    of the real defect, and the rule misnames it.
  - Real use: both fire only on the technical route (the behavioral route never enters `streamChat`,
    `LLMHelper.ts:3356`). A genuine "tell me about yourself" that is routed there with Context on shows the generated
    intro with no cues. That is the shortcut's design; it is also the one answer the row's label ("Cue block above
    every spoken answer") does not cover.
- How: no code now. Name the two shapes in Friday's pre-registration beside the four of section 9.2. Both can be read
  off the log: `[LLMHelper] Knowledge mode (stream): returning generated intro response`, and a full line that is
  `{"__negotiationCoaching":...}`.

**M3. A reused answer bubble keeps the previous answer's cues.**
- Where: `src/lib/answerMessages.ts:65-68` and `:88-93`.
- What:
  - `:65-68`. A token with no cues, appended to a bubble still marked streaming, keeps the bubble's cues. Right for
    the next token of the same stream. Wrong when the bubble belongs to an aborted generation and a new,
    non-replacing stream appends to it. That needs three things: the old answer aborted mid-stream (nothing resets
    `isStreaming` on an abort); the stale bubble still last in the list (a manual "What should I say" with no
    screenshot adds no question bubble, `NativelyInterface.tsx:1186-1211`); and a new answer with no block (an absent
    block, the failure text, a short-circuit of M2). The final event keeps the old cues
    (`NativelyInterface.tsx:903-912` spreads the streaming message).
  - `:88-93`. A replacing answer that ends with no prose token (an empty stream, or a block-only one) finalizes the
    old bubble by spreading it, old cues included: the old cues over "Could you repeat that?".
- Why Minor: each needs rare events together. v1's `1ddb738` fixed this class for the coaching card only.
- How, when `src/` is next touched: let the first token of every stream say so (the engine already tracks
  `firstReplaceToken`; it could always send `cues` on that token, `[]` when there are none, and the renderer would
  treat a defined `cues` as "new stream"). In the replace branch of `applyFinalAnswer`, drop `cues`.

**M4. Plan Task 6 Step 4 cannot work as written: `auto` does not write the probe's input.**
- Where: plan line 1034 (and spec 3.5.3); `SP\cue-group\probe-shipped.mjs:105`.
- What: the probe reads `<run>/interview60.prompts.json`. `auto` sets the capture on and snapshots
  `verbal-prompts.log` into the run folder (`interview60.run.mjs:280, 573`), but only the flight builds the JSON
  (`interview60.flight.mjs:327-328`), and the re-smoke runs `auto`. The 05:00 folder has the file because it was built
  by hand for the spikes. As written, the probe dies on ENOENT: an uncaught throw, not its `REFUSED` line.
- How: add, before the probe, from the worktree: `node electron/test/golden/interview60.prompts.mjs <run-dir>` (it
  loads the rebuilt dist's `promptCapture.js`). Then confirm the base id (`S1Q08F`) is among the captured ids. Only
  technical-route answers are captured (`LLMHelper.ts:2728` is the only call), so a base that went the behavioral
  route this time is refused by name and needs `--base`.

**M5. On screen, the likeliest loss from the cleanup is a currency sign, and the comment names only the star.**
- Where: `electron/llm/verbalStreamFilter.ts:563`, applied to cue lines at `:591`; doc `:575-576`; spec 3.3 ("money
  keeps its sign as it does in prose").
- What: a `$` after any non-space character is removed, and so is one before a number followed by a spaced slash.
  Traced by hand: `~$40k/month` becomes `~40k/month`; `($5M)` becomes `(5M)`; `<$0.10/GB` becomes `<0.10/GB`;
  `$0.30 / hour` becomes `0.30 / hour`. A plain `$5M` or `about $40k` keeps its sign. In speech nobody hears the
  difference. In a cue, the number is what the line carries.
- Same class as Task 2's parked M4 and the spec's stated caveat (star, backslash); this is the member most likely in
  this domain (cost trade-offs).
- How: no code. Add it to the comment's example and to the result note's reading of `cleaned` lines. If one shows up
  live, the cue-side fix is to skip the `$` rules for cue lines.

**M6. Comments that are, or will become, untrue** (none is among F1 to F5). Task 4's fold could carry them if it has
not been dispatched; otherwise one comment-only commit.
- `electron/llm/prompts.ts:194-196`: "the cue block every verbal answer now begins with". Untrue for typed answers
  once Task 4 lands. Say "every hands-free verbal answer".
- `electron/llm/verbalStreamFilter.ts:374-376`: "inside the block, at most one partial line". True to the letter; the
  line is the first prose line (I2).
- `electron/llm/WhatToAnswerLLM.ts:196-198`: "called exactly once per verbal stream". It is at most once: zero when
  both streams fail before the block is decided. The smoke check's count rule already allows for it.
- `electron/test/golden/interview60.metrics.test.ts:805`: "today's literal 5/8". The literal is 3/5.
- `electron/test/golden/interview60.flight.mjs:155`: "~155 lite calls". Stale. Since `721c6fa` a cue hour puts eight
  arms on 3.5-lite (six captured, two bare): up to 360 calls for a 45-item hour, on top of the hour's own front-leg
  calls, against 500 a day. Worth one line in Friday's quota budget.
- v1's "one line per part" is still the description in `electron/llm/verbalStreamFilter.ts:334-335`,
  `src/components/CueBlock.tsx:9-10` and `electron/test/golden/problems.verbal.mjs:92`.

**M7. Two parser edges from v1, never observed; no action before the merge.**
- `electron/llm/verbalStreamFilter.ts:329`: the quote strip removes a quote character at either end independently.
  `"60%" precision` displays as `60%" precision`.
- `:328, :360-362, :411-417`: a cue line with nothing after the bar (`1| `) is not a cue line. It closes the block,
  and the cue lines after it go out as prose (the line filter lets `N| ...` lines through, `:57-59`). `1| "` is
  skipped instead and keeps the block open.

---

### Recommendations

1. **Before the build:** run I1's recount (no model call) and get a ruling on I2. Both bear on what flies.
2. **Before the probe's first call:** the prose-empty count and its pre-registration line (I1), and the missing
   command in Task 6 Step 4 (M4).
3. **In the re-smoke's read**, two one-line checks:
   - Count the answers whose `[Answer] cues:` and `[Answer] budget:` lines are under 15 ms apart. That is I2 on the v2
     build, measured.
   - Tell the user what to look at when he looks at the overlay once: the bar under the answer. A TTFT about equal to
     the total, on a one-paragraph answer, is I2.
4. **Friday's pre-registration** should say three more things: the two knowledge short-circuits are pipeline events
   (M2); in a cue build `first token` is the end of the first prose line (I2); 3.5-lite carries eight arms since
   `721c6fa` (M6).
5. **What rides into MAIN with the fast-forward, as of `87877ee`** (to restate after Part 2): 33 commits that are not
   on MAIN's tip `0ef42a0`; the net diff is 33 files, +1475 / -50. It is cue mode v1 and v2 with their harness, and
   one change that is not cue mode: `fd57512`, where `interview60.run.mjs` reads `GEMINI_API_KEY` from the environment
   first (`resolveEnvKey` in `interview60.lib.mjs`).
6. **A heads-up for the next feature.** The follow-up design appends a trailing `earlierQuestionsBlock?: string` to
   `generateStream` (`passes/2026-09-28-followup-question-context-design.md:82, 224`). It was written against MAIN,
   where that is the eighth slot. After this merge the eighth is `onCues`, and the block becomes the ninth. `tsc`
   catches a swap.
7. **M1** can ride with the next `src/` change. It is not a gate.
8. **Seen in passing, outside the range, read only, not checked further.** The negotiation card's JSON
   (`LLMHelper.ts:2450`) travels through the spoken filters like prose (`WhatToAnswerLLM.ts:386-392`, then the
   200-word guard). `cleanNotation` would drop a `$` that follows a quote and the backslash of a `\n` escape. It is in
   MAIN today and has nothing to do with cues. Worth one look at a real card.

---

### Assessment

**Part 1 (provisional):** The production logic of the cue block in `279103b..87877ee` is correct against spec revision
3 and the plan, and nothing in that diff has to change before the build. What stands: the constants and the benched
bullet, `trimCues`, the engine's trim-then-log-then-send, the metrics row, the re-pointed twins, the seam tests. What
must happen first is not a code change in this range: (1) before the build, the block-only recount of I1, because it
bears on the wording decision, and a recorded ruling on I2, the v1 parser's hold of the first paragraph; (2) before
the probe, its prose-empty count and the missing command in Task 6 Step 4. Tasks 4 and 5, as described, touch none of
the findings here. The test results, both type-check counts and the build markers are unverified by me (no runs were
allowed in Part 1).

**Ready to merge?** With fixes   **Reasoning:** Nothing in `279103b..e3fae5f` has to change: no Critical or Important
finding is open in its code, the suite is green at the head by the controller's run (1004 passed), and the build
carries all six markers. The merge waits for one fix outside this range, the early close of the cue block that the
user decided on (I2); it must land as its own reviewed task and pass its own re-smoke, beside today's re-smoke and the
bench. Part 2, at the end of this file, says what must be true of it.

---

## Appendix A: the brief's seven items, answered

**1. The seam as a whole.**
- Shown raw: no. `generateStream` has one caller that passes `onCues` (`IntelligenceEngine.ts:424`). The engine sends
  `t.cues` only. The renderer takes cues only from the token event; the final event has none. The block's text cannot
  reach the prose through the engine either: at most one head sentinel precedes it on any route
  (`LLMHelper.ts:3185, 3226, 3432, 3499`), and `stripModelSentinel` takes it.
- Shown twice: no. The once-guard lets one report through per `generateStream` (`WhatToAnswerLLM.ts:380-385`);
  `pendingCues` is consumed once; a restart replaces the bubble.
- Lost: yes, in known or rare states. A block-only answer (I1; the ledger's P2b). Case D, known and kept: the dead
  stream's block wins over the redirect's. By my reading D needs the first complete prose line to be swallowed by the
  line filter before the failure, as the test builds it (a `Time:` line), so it is rarer than spec 3.2's sentence
  suggests.
- Attached to the wrong answer: case D, and the two renderer states of M3.
- Supersede: correct. The new stream's first prose token carries `replace` and its own cues; the restart builds the
  bubble fresh (`answerMessages.ts:50-60`). The old generation's closure can still log a block, but it never emits:
  the generation check runs before every emit.
- Hedge back-leg win: correct. One stream, one head sentinel (stripped), the winner's block parsed once, the
  re-announce yielded just before the first filtered chunk, and the engine `continue`s on it before it reads
  `pendingCues` (`IntelligenceEngine.ts:443-447`).
- Fallback redirect: a primary that died before its block was decided leaves the report to the fallback
  (`verbalFallback.test.ts:137-148`, hedge case C). A primary that closed its block is case D.
- An answer that is only a block: I1.

**2. An empty displayed cue.** M1: the renderer should skip it.

**3. Forward references.** All true at the head: `prompts.ts:203, 207`; `verbalStreamFilter.ts:344-346, 578-585`;
the test titles at `prompts.test.ts:243`, `verbalStreamFilter.test.ts:543, 604, 648, 656`; the engine's and the
metrics' comments. Task 1's parked M1 is confirmed: `trimCues` lands in `onCues` under that name
(`IntelligenceEngine.ts:419`). Beyond F1 to F3, one comment becomes untrue with Task 4 (M6, first bullet).

**4. Every reader of the `[Answer] cues` lines.** None misreads the trimmed line. In the repository only the metrics
module reads these lines at all.
- `interview60.metrics.mjs:124`: `cues: (\[.*\])$` cannot match `cues trimmed: {...}`. `:129` counts the trimmed
  lines. Limits 3/5 at `:130`.
- `interview60.judge.mjs:92`: reads only `[Answer] full:`.
- `interview60.pass-record.mjs:72-73, 155, 207`, `interview60.report-html.mjs:313-314`,
  `interview60.run.mjs:483, 506`: no parse of their own. They print the row's value from `evaluateGate`, and every
  `m` is recomputed from the logs, so `trimmed` is always defined.
- `interview60.answers.mjs:338`, `run.mjs:209`: limits from the dist. After the rebuild they judge RAW blocks at 3/5,
  by design.
- `problems.verbal.mjs:96-103` is parametrized. `problems.verbal.cues.test.ts:9, 19` passes 5/8 as its own parameters
  (known, left alone).
- Scratchpad: `check-smoke-cues.mjs:31-32` uses `includes('[Answer] cues:')`, which the trimmed line does not
  contain; its own 3/5 is at `:37`. `smoke-shape.mjs:9` has the metrics' regex and no limits, but its run path is
  hard-wired to the 05:00 folder (`:4`). `probe-shipped.mjs` reads no log.
- Old 5/8: none left in code; one stale comment (M6).
- One note: the smoke check does not test `?` or "you"; the row does. A run can print `CUE SMOKE CLEAN` and still fail
  the PASS rule through the row. The rule is an AND, so the verdict is unambiguous.

**5. The typed path.** Part 2.

**6. Task 6 against the code as built.**
- Markers 1 to 4 will match a rebuilt dist. The v1 dist shows that esbuild's per-file output keeps `const`
  declarations and template literals verbatim (`dist-electron/electron/llm/prompts.js:208-218`,
  `IntelligenceEngine.js:285`). So `CUE_MAX_LINES = 3`, `function trimCues`, `[Answer] cues trimmed:` and the
  one-first fragment (plain text between two interpolations) appear literally. The old dist has none of the four. Not
  verified by a build.
- The five log lines exist with the exact text: `IntelligenceEngine.ts:420, 421, 434`; `SessionTracker.ts:244`;
  `LLMHelper.ts:3513, 3540` (the check's `won by (\S+) at ` matches both).
- The five exports exist: `prompts.ts:205, 208, 217`; `verbalStreamFilter.ts:348, 587`. The probe's calls match the
  signatures.
- Cannot work as written: Step 4's input (M4).
- Wording: Step 3 says the run folder is on "the check's first line". Malformed lines print before the summary line
  (`check-smoke-cues.mjs:40-50`), so it is first only on a clean run.
- The two `ipcHandlers.js` markers: Part 2.

**7. What is missing.** I1's blind measure, I2 (the hold), M2 (the short-circuits), M3 (the reused bubble).

**What Tasks 4 and 5, as described, will not fix.** Every finding above: none is in their scope. Inside their own
subject I found nothing in Part 1's reading that they leave open. The routes that keep the cue rule by design are the
engine's (`generate-what-to-say`, `answer-detected-question`, `answer-now-fast`, `ipcHandlers.ts:2370-2442`), where
the block is stripped and shown. The only non-test caller of `streamVerbalWithGeminiFlash` besides `WhatToAnswerLLM`
is the typed handler (`ipcHandlers.ts:574`).

---

## Appendix B: evidence, tests to run, notes for Part 2

**What I read outside the diff.**
- The worktree's 05:00 run folder: the timestamps of the `[Answer] cues:` and `[Answer] budget:` lines in
  `natively_debug.log`; the `first token` / `word budget` lines of `verbal-diag.log`; four rows of
  `interview60.report.md`; counts of `cues: []` lines and of failed full lines (0 and 0). Earlier, one 20-line window
  of the diag log, which includes answer heads; nothing from it is reproduced here.
- Two finished run folders in MAIN, read-only, timing lines only: h40a and h40c `verbal-diag.log`.
- The controller's scripts and records: `check-smoke-cues.mjs`, `probe-shipped.mjs`, `smoke-shape.mjs`, `spike6.mjs`,
  `decide-spike6.mjs`, `PREREGISTER-cueprobe.md`, `PREREGISTER-cuesmoke.md`, `merge-review.md` (P2).
- Not opened: any `interview60.prompts.json`, `verbal-prompts.log`, any spike or probe row file, `.env`.

**The 05:00 numbers behind I2.**
- Cue line to budget line, ms, in log order: 13, 5, 7, 6, 369, 5, 46, 3, 283, 4, 5, 4, 3, 157, 1231, 129, 12, 3, 5, 92,
  3, 127.
- `first token` to `word budget` in the diag log agrees within 4 ms on every answer.
- `first token` for the 22: median 5.0 s. The report's row reads "Answer TTFT p90 6.4 s". These are not comparable
  with another hour's (h40a's median was 5.8 s without cues); they are here because this is the number the row
  reports.

**Tests I want run (the controller runs them; none was run by me).**
1. After 14:50, the files this range touches or leans on:
   ```powershell
   $WT = 'C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn'
   Set-Location $env:TEMP
   cmd /c "npx --prefix ""$WT"" vitest run --root ""$WT"" electron/IntelligenceEngine.cues.test.ts electron/llm/WhatToAnswerLLM.hedgeCues.test.ts electron/llm/WhatToAnswerLLM.cues.test.ts electron/llm/verbalFallback.test.ts electron/llm/verbalStreamFilter.test.ts electron/llm/prompts.test.ts electron/test/golden/interview60.metrics.test.ts electron/test/golden/interview60.flight.test.ts electron/test/golden/cueArm.test.ts electron/test/golden/problems.verbal.cues.test.ts electron/test/golden/interview60.pass-record.test.ts src/lib/answerMessages.test.ts src/components/CueBlock.test.tsx"
   ```
   Then the full suite and both type-check counts (expected 6 and 0), as the plan says.
2. I1's recount: per arm and model, `rows.filter((r) => r.n >= 1 && r.proseWords === 0).length` over
   `spike6-2026-09-30T07-04-03-320Z.json` and `spike6-2026-09-30T07-04-05-912Z.json`. Counts only.
3. I2's reproduction, as the RED step of the follow-up (it FAILS at the head; do not commit it red):
   ```ts
   it('reports the cues and releases the prose as soon as a partial line cannot be a cue line', async () => {
       const seen: string[] = [];
       let reportedAfter = -1;
       async function* source() { for (const c of ['__CUES__\n1| a\n', 'Ten ', 'million ', 'vectors.']) { seen.push(c); yield c; } }
       const out: string[] = [];
       for await (const p of stripCueBlock(source(), () => { reportedAfter = seen.length; })) out.push(p);
       expect(reportedAfter).toBe(2);                           // today 4: at stream end
       expect(out).toEqual(['Ten ', 'million ', 'vectors.']);   // today ['Ten million vectors.']
   });
   ```

**Notes for Part 2 (to check when the range arrives).**
- Task 3 fix round (tests only): the fixture's two pairs are ones the engine can log; `trimmed: 2`; the empty-cue
  engine case; the "no trimmed line" assertion in the no-block case.
- Task 4: the split (`VERBAL_TYPED_PROMPT`, the derived hands-free prompt); F1 to F5; the pin's N8 guard;
  `ipcHandlers.ts:16, 544, 557, 574`. The typed answer enters the session history (`ipcHandlers.ts:622`; also look at
  `:435`), so before Task 4 a raw block reached it; confirm Task 4 closes that. Byte-equality of the typed prompt with
  MAIN's (`git show 0ef42a0:electron/llm/prompts.ts`). `cueArm.test.ts:13`'s pre-cue prompt against the new constant.
- Other routes: `generate-what-to-say`, `answer-detected-question`, `answer-now-fast` all go through the engine, so
  they carry a cue block, stripped and shown. Confirm that is intended ("typed chat answers carry no cue block" does
  not cover them).
- Task 5: the composition string and the pin; the flight moves the chains store aside
  (`interview60.flight.mjs:319`), so every flight does call the model.
- The two `ipcHandlers.js` markers; M6's first bullet after Task 4; the full suite and both type-check counts;
  `git status` and the new range's `git log`.

---
---

# Part 2: `87877ee..e3fae5f`

Added 2026-09-30, about 16:00. Part 1 above is as it was, except that its "Ready to merge?" line now carries the
verdict.

**What I did.** I read the package (`review-87877ee..e3fae5f.diff`), the four commits and their messages, the Task 5
brief and additions, the Task 3 fix-round brief, the Task 4 additions, both implementers' reports, the ledger from
15:15 on, the controller's changed scripts and pre-registrations, and the touched files at the head. Git was read-only.

**I ran no test, no type check and no build.** The numbers below are the controller's (ledger 15:43 and 15:44). I read
the saved suite output (`SP\cue-group\fullsuite-e3fae5f.txt`) and the built dist myself.

Line numbers in Part 2 are at `e3fae5f`. The edited files moved by a line or two against Part 1's numbers.

HEAD is now `416d4de`, a docs-only commit on top (six files under `electron/test/golden/passes/`). It is outside this
range.

---

## Verdicts for the commits without a task review

### Task 3 fix round, `a7e9a79` (two test files)

The four items from my notes, against `task-3-fix1-brief.md`:
- **The fixture's two pairs are ones the engine can log.** A raw block of 4 lines shows 3 and drops 1, as the first
  pair now has it. I traced `trimCues(['**', 'Parquet'], 3, 5)`: it gives the second pair exactly (`rawLines: 2`,
  `cleaned: ["**"]`, shown `["", "Parquet"]`).
- **`trimmed: 2`** and the row value `2/3 present, 1 well-formed, 2 trimmed`: correct for that fixture (three cue
  lines, one absent, one with an empty cue).
- **The empty-cue engine case** is the brief's text, and its expectation follows from the trace above.
- **The no-block case** now also asserts that no trimmed line is logged.
- Also in: the `3/5` comment (my M6).

Nothing else changed. In the saved suite output the two files pass at the head: engine cues 8 tests, metrics 42 (2
skipped).

### Task 5, `4b051a9`: spec COMPLIANT, quality APPROVED

Spec, against `task-5-brief.md`:
- Exactly the two files the brief names.
- Step 3(a): `stripCueBlock` joins the destructuring (`interview60.chains.mjs:28`). The implementer replaced one line
  where the brief shows two; the resulting bytes are the brief's.
- Step 3(b): the two comment lines and the wrap, verbatim (`:87-89`).
- Step 1: the test file is the brief's text, verbatim.
- The commit message says "innermost as WhatToAnswerLLM places it" where the brief's draft said "as answers.mjs
  composes it". That is the correction the ledger asked for (answers.mjs has `filterCodeFences` in between).
- Reported by the implementer: RED 2 of 2, GREEN, `node --check` clean, type-check count 6. In the saved suite output
  the pin passes at the head (2 tests).

Quality:
- The order is the app's, for the filters chains has. The module calls the API directly, so no model-source sentinel
  precedes `__CUES__`, and `stripCueBlock` on the raw text is the right innermost stage. It feeds single characters;
  the parser is tested at chunk size 1.
- What the answer feeds is now prose: the stored `contextual` and `standalone` texts, the anchor proxy, and the
  history pushed into the next turn (`:119`).
- The pin also forbids the old composition anywhere in the file. The implementer showed each of its three assertions
  failing on its own.
- Known ceiling, already recorded: the pin is text. The module has never run with the wrap; its first run is in MAIN
  on Thursday. A stale dist fails loudly there (`stripCueBlock is not a function`).
- One nit, no action: the second test's title calls the composition "the wrap of interview60.answers.mjs". That wrap
  has `filterCodeFences` in between (`interview60.answers.mjs:188`). The title is the brief's text.

### The comment commit, `e3fae5f`: spec COMPLIANT, quality APPROVED

- Against `task-5-additions.md`: C1, C2 and C3 are verbatim. Three files, 9 insertions and 7 deletions, every changed
  line a comment.
- Each sentence is true of the code:
  - C1: `onCues` has one call site, inside the once-guard (`WhatToAnswerLLM.ts:381-386`). A stream that throws before
    its block is decided never reports.
  - C2: it restates `CUE_SHAPE_RULE`.
  - C3: `cues_present` is `cues.length > 0`.

---

## The brief's item 5: the typed path

**Is there another route by which a typed or manual answer carries the cue rule, or shows a cue block? No.**

- **Who sends the rule.** In the app, the hands-free prompt is passed to a model only in `WhatToAnswerLLM.ts`
  (`:322, :333, :344, :415`). All four calls feed the chain that strips the block (`:387-393`). `CUE_RULE` is named
  only in `prompts.ts`. Outside the app, three harness scripts send the prompt (`interview60.answers.mjs:123`,
  `interview60.chains.mjs:73`, `run.mjs:193`). Each strips the block; chains does since Task 5.
- **The typed handler.** `gemini-chat-stream` sends `VERBAL_TYPED_PROMPT` on both verbal branches
  (`ipcHandlers.ts:546, :559`, passed on at `:576`). Its other branch calls `streamChat` with no prompt of its own
  (`:597`). `gemini-chat` (`:408`) never used the verbal prompt.
- **Every renderer caller of that handler:** `Queue.tsx:154, 259`, `GlobalChatOverlay.tsx:336`,
  `MeetingChatOverlay.tsx:435, 494`, `NativelyInterface.tsx:1604, 1690`.
- **Callers of `streamVerbalWithGeminiFlash`:** `WhatToAnswerLLM` and that handler. No other.
- **The engine's routes keep the rule, by the spec's table (section 3.6):** the hands-free dispatch (`main.ts:2194`),
  `generate-what-to-say`, `answer-detected-question` and `answer-now-fast` (`ipcHandlers.ts:2372, 2386, 2420`). They
  all go through `runWhatShouldISay`, so the block is stripped and shown. A manual "What should I say" therefore shows
  cues. "Typed chat answers carry no cue block" does not cover it, and I read that as intended.
- **Refine, recap, clarify, code hint, brainstorm:** their own LLM classes and prompts. No rule.
- **Showing a block.** Only `applyAnswerToken` puts cues on a bubble, from the engine's token event
  (`NativelyInterface.tsx:862`). The two other sites that touch the field clear it (`:845`, `:900`). The typed
  stream's handlers never set it.
- **History.** The typed answer still enters the session history (`ipcHandlers.ts:624`) and the phone mirror. With no
  rule in the prompt there is no block to enter them. Hands-free answers are stored as prose, so the typed model sees
  no block to imitate.
- **Byte equality with MAIN.** `git diff 0ef42a0 e3fae5f -- electron/llm/prompts.ts` has three hunks: the cue
  constants, the renamed export with its comment, and the derived constant. No hunk touches the template body, and
  `prompts.ts` imports one type and no value, so nothing outside the file can change the template. The typed prompt
  is therefore MAIN's verbal prompt byte for byte. `ipcHandlers.ts` differs from MAIN's by the identifier and two
  comment lines. After the merge the typed path sends what MAIN sends today.

**Is the source-text pin enough for a change of two identifiers? Yes, as one of three layers.**
- The pin proves the handler's text: the import, both uses, and no mention of the hands-free prompt or of anything
  cue-related. The derivation test proves the typed prompt has no rule. Each of the pin's five assertions has been
  seen failing: two in RED, the other three under the implementer's two mutants. (The report counts six; the file
  has five.)
- The negative build marker proves the built handler. The user's two typed questions prove the running app.
- What the pin cannot see: a rule added inside `streamVerbalWithGeminiFlash`, or reaching the handler under a new
  name from another module. Neither is a plausible slip for this change.
- A behavioural test would mean mocking the whole Electron registration for two identifiers. I agree with the pin.

---

## The brief's item 6: the `ipcHandlers.js` markers

The controller built `e3fae5f` at 15:44:09 (ledger). I read the six markers in that dist:

| marker | where in the dist | reads |
|---|---|---|
| `CUE_MAX_LINES = 3` | `llm/prompts.js:210` | present |
| `function trimCues` | `llm/verbalStreamFilter.js:385` | present |
| `[Answer] cues trimmed:` | `IntelligenceEngine.js:290` | present |
| the one-first fragment | `llm/prompts.js:212` | present |
| `VERBAL_TYPED_PROMPT` in `ipcHandlers.js` | `:444, :456` | present |
| `VERBAL_WHAT_TO_ANSWER_PROMPT` in `ipcHandlers.js` | nowhere | absent, as required |

`main.js` and the four files above carry 15:44:09 or 15:44:10 as their write time.

---

## My notes for Part 2, item by item

1. **Task 3 fix round:** done, see above.
2. **Task 4:** the split, the derived constant, F1 to F6 and the N8 guard are all in the diff as written. The history
   point and the byte equality are answered under item 5. `cueArm.test.ts:13`'s pre-cue prompt equals the new constant
   by construction (`split(CUE_RULE).join('')`). Task 4's own review came back Approved with three Minor findings,
   parked (the coordinator's report).
3. **Other routes:** answered under item 5.
4. **Task 5:** the composition string and the pin, above. The flight still moves the chains store aside
   (`interview60.flight.mjs:319`), so each flight calls the model.
5. **Markers:** above. **M6's first bullet:** done by F6 (`prompts.ts:193-198`).
6. **The suite and the type checks (the controller's run at `e3fae5f`, from a temp cwd):** 102 files, 1004 passed, 8
   skipped, 0 failed. One file does not load from a temp cwd: `interviewerTurn.replay.test.ts` opens its fixture by a
   cwd-relative path (ENOENT under `%TEMP%` in the saved output). It is not in this range, and the ledger has it
   passing 12 of 12 from the worktree root. Type checks: 6 (the same six) and 0.
7. **`git status`:** the user's `interview60.report.md`. Since the live hour began it also lists
   `natively_debug.log.1`, a tracked debug log (by its name, the running app's rotated log; I did not open it).
   Neither belongs in a commit. **`git log`:** the four commits, each touching only the files its task names.

---

## Part 1's findings at `e3fae5f`

| finding | status |
|---|---|
| I1 | **Closed by measurement and by the instruments.** The recount found 0 block-only rows of 216; the smallest prose is 27 words, which also rules out a block followed only by offers. The smoke check is v4: a non-empty block directly before the substitute is NOT CLEAN. The probe counts block-only answers. Both pre-registrations were amended at 15:25 and 15:26, before the build existed (15:44). The engine still drops such a block (the ledger's P2b); that state is now gated. One small gap is left in the probe (P2-M1 below). |
| I2 | **Open, by the user's decision.** The early close is built before the merge, as its own reviewed task, with its own re-smoke at 05:00. It is not in this range. For today's run the pre-registration's sentence is corrected and the hold is measured. |
| M1 | Parked, with the next `src/` change. |
| M2 | In the re-smoke's pre-registration as pipeline events. Still to carry into Friday's. |
| M3 | Parked with M1. |
| M4 | Done: the probe refuses by name (`probe-shipped.mjs:109`), and the command is an operator step. |
| M5 | No code. The result note reads every `cleaned` line for it. |
| M6 | Done: `prompts.ts` (F6), `WhatToAnswerLLM.ts:196-200`, the `extractCues` doc, `problems.verbal.mjs:92`, `interview60.metrics.test.ts:807`. Left: `verbalStreamFilter.ts:375-377` (with I2), `CueBlock.tsx:9-10` (with M1), `interview60.flight.mjs:155`. |
| M7 | Parked. |

On the two changes I was invited to judge:
- **Check v4** is right on the four sequences that matter: a block then the substitute (NOT CLEAN); a block then the
  abort line (superseded); a block then `[No answer ...]` (transport); `[]` then the substitute (the R1 hint). It also
  flags a spoken answer under five characters, because the engine substitutes for that too
  (`IntelligenceEngine.ts:470`). The candidate sees the same thing, so the verdict is right even where the label is
  not.
- **The amended pre-registration** says what the code does: the corrected `first token` sentence, the two hold
  reads, the two knowledge short-circuits, and the block-only rule with its one exception.

---

## Issues new in Part 2

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

**P2-M1. The probe's block-only count still takes an offers block for a spoken answer.**
- Where: `SP\cue-group\probe-shipped.mjs:84, 142`.
- What: `proseWords` counts every word after the cue block, the `__MORE__` offers included. A reply of a block plus
  offers and no spoken answer is not counted. The app strips the offers and shows the substitute.
- Why Minor: never seen (spike 6's smallest prose is 27 words); the probe is reported, not gating; check v4 catches
  the live shape whatever its cause.
- How, either of two:
  - count only the words before the offers sentinel: `words(parsed.prose.split('__MORE__')[0])` at `:142`, checked
    once on a made-up reply of a block plus offers;
  - or leave the count and print the smallest prose word count per model and set beside it, as
    `recount-blockonly.mjs` does.
  - Either way: one line in the 15:25 note, before the probe's first call.

**P2-M2. The two source pins locate their file through `import.meta.url`.**
- Where: `electron/ipcHandlers.typedPrompt.test.ts:13-14`, `electron/test/golden/interview60.chains.test.ts:14-15`.
- What: the electron build transpiles every `.ts` to CommonJS, tests included. `import.meta` is empty there, so
  esbuild warns once per file (the ledger saw it at 15:44), the dist holds a dead copy of each pin, and each pin needs
  a `@ts-ignore`.
- Why Minor: nothing loads a test from the dist. It is noise in the build log that a reader must learn to skip.
- How: `__dirname`. It works under vitest and in CommonJS, as `interview60.turns-finals.test.ts:43-46` already does,
  and the `@ts-ignore` goes. The controller has parked it for the next touch of the pins. I agree.

---

## Assessment

**Ready to merge? With fixes.**

**This range needs none.** `279103b..e3fae5f` is correct against the spec and the plan. No Critical or Important
finding is open in its code. The suite is green at the head by the controller's run. The build carries all six
markers.

**The one fix is outside it: the early close (I2).** The user decided it comes before the merge. For the merge, these
must be true of it:

1. **One behaviour changes and nothing else.** `stripCueBlock` closes the block as soon as the pending partial line
   can no longer become a cue line. `extractCues`, `trimCues`, the engine, the renderer and every prompt byte stay as
   they are. Then today's bench and probe results stand: check that the `CUE_RULE` hash the bench prints is unchanged.
2. **Test first.** The RED case of Appendix B fails before and passes after. The chunk-size equality with
   `extractCues` also holds on a prose with no newline. The partial lines that must still hold are pinned (`1`, `1 `,
   `1|`, `1| x`), and so are ones that must release (`Ten`, `10 m`, `1. `).
3. **The seam holds.** Hedge cases A to E, the fallback's cue case and the engine cases pass unchanged. Case D
   changes shape. Today it needs the first prose line to be swallowed by the line filter before the stream dies.
   After the fix, a death in the few chunks between the report and the first prose chunk clearing the line filter is
   enough. Pin that with one case, or state it in the spec delta.
4. **The gates at the new head:** the full suite, both type-check counts, a build with a marker of its own.
5. **The symptom is measured before and after, by the same read,** written into that run's pre-registration before
   arming:
   - the count of answers whose cues line and budget line are under 15 ms apart. It was 14 of 22 at 05:00. Today's
     re-smoke gives the v2 number. After the fix it should sit near the no-cue hours (1 and 3 of 47);
   - the time from `won by` to `first token`.
6. **The 05:00 re-smoke on that build passes its pre-registered rule:** check v4, the health rows, the cue row.
7. **The records say what is then true:** the comment at `verbalStreamFilter.ts:375-377`, the 09-20 cost sentence,
   spec 9.7, and Friday's pre-registration (`first token` is then the first prose chunk after the block).
8. **Its own Opus review.** This verdict covers `279103b..e3fae5f` only.

**The other gates stay as the plan has them:** today's re-smoke, the bench, and the user's two typed questions.

**What rides into MAIN, restated at `e3fae5f`:**
- 37 commits that are not on `0ef42a0`; 37 files, +1583 / -55. With the docs commit `416d4de`: 38 commits, 41 files.
- It is cue mode v1 and v2 with their harness, and one change that is not cue mode: `fd57512` (the flight runner
  reads its Gemini key from the environment first; `interview60.lib.mjs`, its test, `interview60.run.mjs`).
- MAIN's tip is now `e3db5cb`: ten files under `passes/`, docs only, on top of `0ef42a0`. It must be merged into the
  cue branch before the fast-forward. The two tips touch disjoint files (MAIN's ten include `INDEX.md`; the cue
  branch's six under `passes/` are none of them), so the merge has nothing to resolve.
- The early-close commits will ride too, once reviewed.

**What nothing has exercised yet:**
- the v2 build live (today's re-smoke);
- the typed path in the running app (the user's two typed questions);
- the chains wrap in a real run (MAIN, Thursday);
- a live trim or cleanup, unless the model overruns during the hour;
- the early close (not built).

**Tests I want run after the live hour:** none. Nothing in this verdict rests on a test I could not read.
