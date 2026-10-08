# Task 6 review: IntelligenceEngine builds the block, logs the diag line, writes the ledger (c94cdb5)

Reviewer: Opus, 2026-10-05. Package: BASE 3e79152 .. HEAD c94cdb5 (`task-6-package.diff`). Plan: Global Constraints, Review Focus, Task 6.

SPEC: PASS
QUALITY: APPROVE

The code matches the plan's Step 3 text exactly (import, option type in both files, the try block after the pinned-question log, the 9th argument). The test file matches Step 1 exactly. One Important item remains, but the fix belongs in the flight registration, not in this code (see I1).

## Verification (mine, independent of the report)

- **Isolated copy.** `git archive c94cdb5` was extracted to `SP\eq-tmp\rev6`, with a junction to MAIN's `node_modules`. The worktree was never edited: another implementer was mid-Task-7/7b there, and HEAD moved to a338e65 during the review. The three Task 6 files are unchanged between c94cdb5 and a338e65. The copy was removed afterwards and MAIN's `node_modules` is intact.
- **Tests:** `IntelligenceEngine.earlierQuestion.test.ts` 12/12 and `WhatToAnswerLLM.earlierQuestion.test.ts` 7/7. Neighbours (`IntelligenceEngine*`, `IntelligenceManager*`, `WhatToAnswerLLM*`, `SessionTracker*`): 17 files, 97/97.
- **tsc -p electron/tsconfig.json:** exactly the six baseline errors, none in a touched file.
- **Mutants** (`SP\eq-tmp\rev6-mut.mjs`, run on the copy):

| Mutant | Result |
|---|---|
| M1 write before build (plan 1) | 4 FAIL: evicted, short gap, two calls, coding main |
| M2 log before write (plan 2) | 1 FAIL: write throws |
| M3 ledger read hoisted above the flag (plan 3) | 1 FAIL: never read |
| M4 catch rethrows (fail-safe removed) | 2 FAIL: write throws, junk flag |
| M5 block assigned before the write | survives. Equivalent mutant: the catch resets the block to '' (:384). Not a gap. |
| M6 '' passed instead of the block | 2 FAIL |
| M7 diag line carries `q=${settled}` | 2 FAIL: never-text, plus the end-anchored block regex |
| M8 flag ignored (`if (true)`) | 3 FAIL: both flag-unset tests, junk flag |
| M9 supersede forced false | 1 FAIL |
| M10 `options.turnId ?? null` → `\|\| null` | **survives 12/12** (see m2) |
| M11 write skipped when turnId is null | 1 FAIL: chip test |

The copy was restored after every mutant (`restored: true`).

## Checked against the request

- **Flag OFF.** With the flag off, `earlierQuestionEnabled()` returns false before any read, build, log or write (M3 and M8 killed). The 9th argument is `''`, which `WhatToAnswerLLM.ts:234` treats as absent, so the prompt is byte-identical (Task 5's characterization test covers this). The first eight arguments are pinned (test.ts:70–75).
- **Fail-safe.** Any throw (junk flag, a throwing write) lands in the local catch with the block set to `''`. The answer, the history and the stream are untouched (M4 killed).
  - A throw inside `buildEarlierQuestion` is caught by that function itself (earlierQuestion.ts:116) and returns `why='error'`.
- **Ordering.** Build → write → log, all synchronous, with no `await` before IntelligenceEngine.ts:370 on the `whatToAnswerLLM` path. Overlapping calls therefore keep call order. M1 and M2 are killed; the two-calls test reads `parent-in-prompt`, not `no-parent`.
- **One line per call.** Exactly one diag line per call that reaches the step, and no text in it: the success line holds gate, cue, chars, turn and ms only.
- **Supersede and turnId null.** A supersede returns `''` (M9 killed). A null turnId gives `gate=no-turn turn=none`, the ledger is still written with `turnId: null` (M11 killed), and `if (settled)` guards the write (the no-question test).
- **Where a block can be built.** A block can only be built when `turnId != null`, which today means only main.ts `answerDetection`. There, `intentOverride` is always set (`DetectionInput.intent` is required).

## Critical

None.

## Important

- **I1 (cross-artifact; no code change asked): the diag line can claim a block that never reached the prompt.** IntelligenceEngine.ts:381 logs `gate=block chars=N` before the framing is applied. WhatToAnswerLLM.ts:234 then drops the block on coding framing.
  - **When it happens:** on the auto path, exactly one case. A question that `mentionsScreen`, where the capture succeeds, gets intent `'coding'` plus an image (main.ts `answerDetection`). The engine maps that to `coding` at :412–416. Every other path has turnId null and logs `no-turn`, so it never claims a block.
  - **Status:** this is plan-sanctioned (m3), and the code comment at :367–369 says so.
  - **Open precondition:** REVIEW-1 I6's fix is **not yet in** `PREREGISTER-flight-eq.md` or `AMENDMENT-A1.md` (a grep for `G_twin` or "built, not inserted" gives 0 hits). The fix is: G_twin, the recast rule 1(e), and "built, not inserted" excluded from G and counted as a G\* miss.
  - **Risk until it lands:** one screen-referenced follow-up with a cue gives a false 1(e) VOID, and `--no-block --only <G>` exits 2 on the whole run.
  - **Optional code-side alternative, if the controller prefers:** every path that can build a block has the override set, so the engine could know the framing synchronously. That would change the plan's m3 ruling and the spec's `why` set, so I do not recommend it inside Task 6.

## Minor

- **m1: two `gate=error` shapes, and one extends the "exact shape".**
  - The local catch (IntelligenceEngine.ts:385) appends ` error="<message>"` after `ms=0`. This is the plan's own Step 3 code, but the Global Constraints shape ends at `ms=<n>`.
  - An error inside `buildEarlierQuestion` logs `gate=error cue=none chars=0 turn=N ms=N` with no suffix, and the ledger IS written.
  - A smoke or flight reader that end-anchors on `ms=\d+$` would miss the catch-branch lines and read rule 5a (`gate=error = 0`) as a vacuous PASS. The reader's §7 synthetic `gate=error` case must carry the suffix.
  - Message content is safe: messages come only from our code. The junk-flag message embeds the env value, never interview text.
- **m2: turnId 0 is not covered at the engine seam.** M10 (`?? null` → `|| null` at :374) survives 12/12. Review Focus 1 pins turnId 0 in Task 2's pure core, but the engine's `??` is its own seam. Fix: one test with `turnId: 0`, expecting `turn=0` and the block built.
- **m3: the never-text test can pass vacuously.** test.ts:94–99 loops over the diag lines without asserting there are any; the report notes it passed at red. M7 is still killed, by this test and by test 2's anchored regex. Fix: add `expect(lines.length).toBeGreaterThan(0)` and, optionally, a check on a `gate=error` line.
- **m4: some calls log no diag line.** The cooldown return (:274) and the keyless `answerLLM` fallback (:287–300) return before the step, so "exactly one per call" holds per call that reaches the verbal path. This is harmless: the auto path sets `bypassCooldown`, and a keyless app would correctly fail flight rule 1(b).

## Not checked

- main.ts turnId plumbing (Task 7).
- The real SDK and the built dist.
- Whether any roster follow-up actually `mentionsScreen` (this decides whether I1 can occur in the flight).
- The full suite.
