# REVIEW-CODE bundle-1 (Opus, 2026-10-08)

Branch feat/bundle-1 @ b53ff0c, base dcefca0 (incl. merge 1db323c of fix/cue-cutline 6e3a310). Reviewed `git diff dcefca0..HEAD` (23 files, +847/-68) against SPEC-bundle-1.md rev 2 + USER-RULINGS.md (D1-D8 approved). No edits, no model/network calls, no app start.

## Verdict: APPROVE (no Critical, no Important; 5 Minor, residuals listed)

## Gates run (this review)
- Touched tests, serial from a temp cwd with `--root`: 12 files, **429 passed, 2 skipped, 0 failed**.
- Adjacent: ipcHandlers.typedPrompt, cueArm, interview60.chains, routerArbiter, routerWiring: **96 passed, 0 failed**.
- `tsc -p electron/tsconfig.json`: **exactly the 6 baseline errors**: GeminiLiveRouter.ts(125); ipcHandlers.ts(3436) x2, (3439); KnowledgeOrchestrator.ts(349), (351). None of them are in touched files.
- Root `tsc --noEmit`: exit 0.
- Not run: the full vitest suite and the build/dist proof. Both are controller gates (§9).

## Spec item by item
| # | Spec | Status |
|---|---|---|
| 1.2 | BLOCK_B hard-first, text as specified | OK. routerInstruction.ts; new shas pinned in LiveRouterSession.ts:7-8, its test, routerCapture.mjs:9-10, routerHarness fixture. guard-rd.mjs untouched |
| 1.4 | Length guard NOT built | OK. No routerArbiter/routerWiring/main dispatch change. It stays pending until the §1.4 replay decides |
| 2 | Short-answer rule in SPOKEN_LENGTH_AND_DEPTH (after the "read aloud" line) + Live clause | OK. Text is verbatim. It ends with "A question with several parts follows the structure rule below instead", and the structure override is still pinned. Whether multi-part answers stay long is a model claim that only bench L1b can settle |
| 3 | `cueRuleApplies` / `verbalPromptFor`; gate on `lastInterviewerTurn` (heard text); computed once; used at all four call sites incl. fallback; one `[Answer] cue rule: sent\|skipped words=n` line; coding untouched | OK. WhatToAnswerLLM.ts:321-325, :340, :351, :362, :437. The behavioural test with a stub helper covers short, long, the fast route, the fallback and coding |
| 3.2 R6 | `cueRuleIds` per id; twins `--only` those ids; skip when empty | OK. interview60.flight.mjs:184-185, :204-206, :300 |
| 3.2 | metrics cueBlocks accepts an expected-empty block after `skipped` | OK. metrics.mjs:124-138, :516 |
| 5 | earSilence pure module, K=5, grace 10 s, lead 2 s, arm on `connected`, fresh watch per ear instance, flag ON only, tick at U+grace, shouldFailOver(reason silent-listener), shared failOverEar, logs once `ear silent model=… no-failover-left` | OK. main.ts:2252-2276, :2288-2318. The once-only log holds because the watch answers 'silent' once per instance |
| 6 | trimCues: comment moved, a/in/on removed, `&` and `w/` matched on the raw token | OK. verbalStreamFilter.ts:681-699, :729-731 |
| 7 | Drill gate order packaged → not-harness → router-off; parse refusal names the token; zero PCM at all 3 ear write sites for the muted instance only; drillDrop goes through the real onclose | OK. faultDrill.ts, main.ts:2321-2359, LiveRouterSession.ts:80-83 |

**Drill cannot arm in a normal or dev run.**
- `parseDrill` needs `NATIVELY_AUTOSTART_MEETING === '1'`.
- The harness sets that variable only in interview60.run.mjs:292.
- A grep of MAIN `.env`, MAIN `.env.example` and the worktree `.env.example` finds 0 lines that set NATIVELY_FAULT_DRILL, NATIVELY_AUTOSTART_MEETING or NATIVELY_LIVE_ROUTER (names only; no values were read).
- Packaged builds are refused first, and they never load `.env` (main.ts:5-7).
- Remaining hole: if someone puts AUTOSTART=1 into `.env`, every dev run starts a meeting by itself. That is visible, and the spec accepts it.

## Every state
- **Router flag OFF.**
  - No watch is created (`silence` is null).
  - The drill is refused with `router-off`, and only if its variable is set.
  - The ear tee is unchanged: `earPcm` is the identity when `drillMutedEar` is null.
  - **What does change with the flag OFF** (intended, D1/D5, §3.3): the short-answer rule in both verbal prompts and in typed chat, and the cue gate. So flag OFF ≠ today's app on prompts.
- **Empty or fragment question.** `cueRuleApplies('') === false`, so no cue rule is sent and the line reads `skipped words=0`. Short fragments also go no-cue. This is by design (heard shape).
- **Typed chat** (ipcHandlers → VERBAL_TYPED_PROMPT). It gets the short-answer rule. It has no cue rule and no gate line. It is not benched (D5 residual).
- **Failover chain.**
  - A silent 3.1 ear fails over to 2.5 through failOverEar. setImmediate re-checks that the failed ear is still current.
  - The new 2.5 ear gets a fresh watch. If 2.5 then goes silent, the result is one `no-failover-left` line and nothing else.
  - A tick from the old instance's timer that lands on the new watch is harmless: it judges only utterances that are due.
- **endMeeting.** It clears the drill timers and the mute, and nulls the watch through stopLiveRouter. The pending tick timers find a null watch and do nothing.

## Hot path (before the first token)
Per verbal answer, this adds:
- 2× `cueRuleApplies` (two regexes plus a split, microseconds);
- 1 `console.log`;
- 1 `appendFileSync` to verbal-diag.log. It is one more beside the ~5 that generateStream already writes there. Estimate: < 1 ms, not measured.

Per audio chunk, it adds one pointer comparison (`earPcm`). It allocates only while the ear is muted. The silence watch runs off the hot path, in a timer at utterance end + 10.25 s.

## Tests vs mocks
- earSilence, faultDrill, shouldFailOver, the cue gate (stub helper, read off the real call arguments) and drillDrop (fake session whose close fires onclose) are behavioural.
- main.ts is pinned by source text only (main.bundle1Wiring.test.ts). What could break at runtime and is not covered:
  - (a) whether the @google/genai `session.close()` actually fires `onclose` on a client-side close (D1 smoke bar);
  - (b) whether Deepgram emits `speech-started`/`utterance-end` on the interviewer channel in this build (the watch is inert without them; non-Deepgram STT providers never feed it);
  - (c) whether captions stop under zero PCM (D2 smoke bar);
  - (d) timer ordering at failover.

  All four are smoke-only, which §7.4 already plans.

## Findings
**Minor**
1. **interview60.metrics.mjs:128-134.** `lastCueRule` pairs a `cues:` line with the most recent rule line.
   - Supersede case: answer A (`skipped`) logs its `cues: []` after answer B logged `sent`. A's empty block then counts as unexpected, and the cueBlocks row FAILS falsely.
   - check-smoke-cues.mjs pairs the same way (`ruleBefore`).
   - Before blaming the app on a FAIL, read the log.
2. **LiveRouterSession.ts:80-83.** `drillDrop` logs `[Drill] router-drop` even when `this.session` is null (router already down). The D1 reader would then see a drop with no `session close`.
   - main.ts:2347 only checks that `routerSession` exists.
   - Fix: log `skipped: session down` instead.
3. **faultDrill.ts:30.** `split(',')` without a trim: `"router-drop@600, ear-mute@1500"` is refused as `parse  ear-mute@1500`. This fails safe, but the smoke launcher must not put a space after the comma.
4. **The bare arms always send the cue rule.** That is interview60.answers.mjs:136, chains.mjs:73 and run.mjs:193, untouched per §3.2. On the ~23/47 live40 ids the gate skips, in-app vs bare now also differ by the cue rule. The final-flight registration should state this when it compares in-app against bare.
5. **main.ts:2253.** The comment says "counting from this ear's first `connected`". `arm()` runs on every `connected`, which is fine because it is idempotent and never resets. Wording only.

## Not shown / residual
- No full suite, no build, no dist proof.
- No live exercise of the watch, the drill or the gate: that is the §7.4 smoke.
- The guard decision is still pending the §1.3 replay.
- Prompt quality and length effects (multi-part not shortened, short-answer opening): only bench L1b/S1/S2 can show them.
- The cue-gate cutoffs were fitted on live40 synthetic TTS.
