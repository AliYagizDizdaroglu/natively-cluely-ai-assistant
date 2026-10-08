# REVIEW-1 of SPEC-bundle-1.md (fresh Opus reviewer, 2026-10-07)

**Verdict: CHANGES.** The design holds. These must be fixed in the spec before the build: 4 blocking items (B1–B4) and 7 required items (R1–R7). No question or answer text is quoted here.

How it was checked: I read the spec, the evidence outputs in bundle-1, the plan, the r1 report, and the source at MAIN. I wrote no code, made no model calls and used no git.
Note: MAIN's branch ref is now **dcefca0**, not 22929bc. The build must use dcefca0 as its base, and it must re-take the vitest baseline (§9 cites the router-default baseline). All of my citation spot-checks below were made against the current tree, and they still match.

---

## Blocking

**B1. §3.2 :141-142 contradicts §2.** §3.2 says "Both prompts stay byte-identical to today's. The precue identity (sha 4495445db0c2) still holds."
- §2 inserts a paragraph into `SPOKEN_LENGTH_AND_DEPTH` (prompts.ts:280). That constant is inside `VERBAL_TYPED_PROMPT` (prompts.ts:2392), so both prompts change.
- `4495445db0c2` is the pre-cue `VERBAL_TYPED_PROMPT` bytes (cue-flag/SPEC-BRIEF.md:21-24). That pin will break.
- Fix: restate the invariant as `VERBAL_WHAT_TO_ANSWER_PROMPT === VERBAL_TYPED_PROMPT + CUE_RULE`. Record the new typed-prompt sha. List every test and harness file that pins the old sha.

**B2. The cue gate is measured on roster text, but the app gates on heard text.**
- `rule-split.out.txt` applies the gate to the roster `q`. The app applies it to `lastInterviewerTurn(cleanedTranscript)` (WhatToAnswerLLM.ts:252), which is Deepgram text.
- Deepgram's punctuation adds commas after lead-ins ("so, …", "okay, …"). Spoken fillers push the word count past 12. Either can flip easy-short items back to "cue sent". The 13/20 EASY split is therefore unproven for the app.
- The spec already uses r1 heard text for the guard (§1.4). Fix: recompute the split on `interview60.judge.pairs.json` `heard`, counts only, and freeze the result.
- §8 C1 says "12 of 12" no-cue ids, but rule-split implies about 21 captured no-cue ids (22 minus EF02). The C1 count has to come from that heard-text computation, frozen before the bench runs.
- Small fix in the same section: §3.1 and §11 say 8 of 27 HARD items lose cues. rule-split gives 9, including EF02.

**B3. The fault drill can arm during a real interview.**
- Dev builds load `.env` (main.ts:5-6). The user runs dev builds.
- So a `NATIVELY_FAULT_DRILL` left in `.env`, with the router flag on, drops the router and mutes the ear in a real meeting. Only the final flight's guard checks for it.
- Fix: also require `NATIVELY_AUTOSTART_MEETING === '1'`, the harness-only gate at main.ts:3633. Add the refusal reason `not-harness`.

**B4. The routing replay ignores the app's decision deadline.**
- The arbiter routes to the pipeline (row 2) when the first word arrives after Q+2000 ms (routerArbiter.ts:32, :208-209).
- §1.3 classifies each item only as hard, easy or none. A slower B1 would therefore pass R2 offline and still lose EASY items in the app.
- Fix: count EASY only when the first word arrives within 2000 ms of the clip end. Report first-word p50 and p90 for B0 vs B1.

## Required

**R1. Silent-ear evidence is overstated (§5.1-5.2).**
- `ear-gap3.out.txt` has utterance data for only **24 of 33 runs**: every run before s50b shows `utts 0`. So the healthy evidence is **22 runs**, not 31.
- A run of 3 uncaptioned utterances occurs in 4 of those 22 runs (18%). Misses therefore cluster, and a run of 4 per hour is plausible at a few percent.
- K=5 still fires in both real episodes (7 and 10 consecutive), with a margin of 2 above the healthy maximum. Fix: use K=5 or justify K=4.
- Also state when counting starts. The evidence counts from the first caption, but `createEarSilenceWatch` has no arming rule. Arm it on the ear's `connected` status.
- Add tests:
  - two `speech-started` events before one `utterance-end` → use the FIRST start;
  - a start with no end → expires and is not counted.
- The 2026-09-04 after5 run shows a 7-final no-caption run on the old metric: name it healthy or episode.

**R2. What happens when 2.5 is silent or the drill misfires.**
- When the watch fires on 2.5, log once, `[Router] ear silent model=2.5 no-failover-left`, and take no other action. Today that case is invisible.
- `ear-mute` skips writes. A Live session that gets no input may close on its own, which would give a non-silent-listener failover and void D2. The real episodes stayed connected with no captions. Fix: send zero PCM of the same length instead.
- D2 assumes 2.5 emits `[LiveCaption]`. Confirm that from an earlier 2.5 log before the smoke.

**R3. Smoke and flight bars are missing.**
- §7 says "clean-smoke bars" but never defines them. Pre-register:
  - app routing on the smoke, with R1/R2 equivalents;
  - 0 `reason=silent-listener` outside the drill window;
  - check-smoke-cues with the `skipped` accounting.
- If B0 fails calibration, the routing claim rests on that smoke, and the smoke runs on live40, the tuning set. State that it is not validation, and that no length guard ships in that case (today §1.4 is undefined there).

**R4. The bench cannot see a per-item quality loss.**
- Q1 is aggregate (−2 of 42). Q2 counts only new wrongs. An item that drops from acceptable to weak (for example a HARD yes/no item shortened by S2's 10–35 words: RH16, RH13) passes both.
- Fix: add a bar for new weak items. No id acceptable in all 3 C reps may be acceptable in 0 T reps, with a tolerance of at most 1.
- L1b is a pooled median, which can hide one multi-part id being cut. Add a per-id floor of T ≥ 0.75×C.
- L1a's "non-short items" is undefined. Define it as the ids where cueRuleApplies is true on heard text.

**R5. Matching captures to ids by content fails on short items.**
- A short follow-up's roster question is contained in many captures, so the "unique ≥ 0.8" rule refuses exactly the no-cue items the gate targets.
- Fix: break ties by roster order and capture time. Or use dcefca0's `--check` file, since it is now committed. Pre-state the expected id set.

**R6. The flight would break the user's bare-arm rule.**
- `hasCueRule` (interview60.flight.mjs:184-187) fails closed on a mixed hour, so the captured-no-cues twins SKIP. The user's rule says every flight grades the twins.
- Fix: make `hasCueRule` per-id, or get an explicit user waiver.
- The plan's final flight also requires grading the cue blocks. Put the flight registration in §10 with an owner and a deadline (Sat).

**R7. Plan deviations that need the user's sign-off.**
- "Bold the first words" was dropped (§3.4).
- The plan's seconds-based silent rule became an utterance count.
- The plan's replay "on smoke + r1 recordings" became per-item TTS clips.
- Typed chat also gets the short-answer rule (VERBAL_TYPED_PROMPT), and nothing benches that path. State it as a residual.

## (1) Which bar catches each quality or latency risk

| Risk | Caught by |
|---|---|
| New BLOCK_B sends EASY items to the pipeline (latency) | R2 (offline; only after B4) |
| B1's first word is slower (more row-2 decisions) | **none** → B4 |
| HARD misroutes | R1, R3, calibration gate |
| Short rule shortens multi-part answers | L1b (pooled) → R4 per-id |
| Short rule thins HARD yes/no items | **none** → R4 |
| Short rule on the 3.1-lite back leg, typed chat, Live answers | **none** (residual) |
| Cue gate thinking tokens / TTFT | L2, L3 |
| Cue gate misses a short HARD design question ("design X", 4 words) | **none**; impact is about one cue line (the rule writes one line per named part) |
| Silent-ear false failover | D2 only implicitly (a pre-drill fire voids it) → R3 |
| trimCues `a`/`in`/`on` removal | unit tests only (cue content not graded) |

## (2) Cue gate vs the user's intent
- Short questions with many parts are mostly caught by `and`, `,` and a second `?`. These markers depend on ASR punctuation (B2).
- Long easy questions still get cues: 7 of 20 live40 EASY. That costs latency, but the user's intent excluded only easy-*short* questions, so it complies.
- Short HARD single-clause questions get no cue. CUE_SHAPE_RULE writes one line per named part, so the loss there is about one line. The cost is acceptable.

## (3) Short-answer rule vs multi-part answers
- The prompt carries an explicit exemption, and the structure rule still OVERRIDES the length rule.
- The test checks only presence and order. L1b is pooled over 9 ids. Add the per-id floor (R4).

## (8) Citations spot-checked (all match the current tree)
- routerInstruction.ts:3, :4
- LiveRouterSession.ts:7-8, :11, :12, :227-261
- routerArbiter.ts:94, :203
- routerWiring.ts:34
- earFailover.ts:9-24
- main.ts:1264-1265, :1394/:1512/:1555, :2190, :2223, :2240-2254, :2265, :3633
- prompts.ts:219, :280-300, :295, :2392, :2444
- WhatToAnswerLLM.ts:252, :334, :345, :356, :431
- knowledgePromptBudget.ts:23-24
- IntelligenceEngine.ts:473-474
- interview60.flight.mjs:184-187
- verbalStreamFilter.ts@6e3a310 :700-712

One harmless oddity: §9 says main.ts edits must not shift GeminiLiveRouter.ts:125, but that is a different file.

## (9) Scope
- No creep. `failOverEar` extraction, `drillDrop`, the conditional guard and the trimCues follow-ups all trace to the plan or a prior review.

## Open questions: recommendations
1. **Utterances vs seconds:** use **utterances**. Healthy wall-clock gaps reach 237 s, so a seconds rule cannot be safe. Use K=5 (R1).
2. **Length guard conditional:** **keep it conditional**. Add: no guard if B0 fails calibration. Evaluate it on heard text with B4 timing.
3. **Short hard follow-ups lose cues:** **accept**. It costs about one cue line each (the rule writes one line per named part) and saves about +161 thinking tokens per item. Report the count from the flight.

## Not shown
I did not compute the gate split on heard text, and I did not verify that 2.5 emits captions. The false-fire rate under K=4 is an estimate from clustering, not a measurement.
