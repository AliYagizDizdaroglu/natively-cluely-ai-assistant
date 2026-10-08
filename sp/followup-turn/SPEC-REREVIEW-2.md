# Scoped re-review 2: turn-based follow-up context, revision 3 (17:38)

Reviewer: Opus 5.5, read-only, 2026-10-03. Scope: whether N1, N2 and n1–n5 of `SPEC-REREVIEW.md` are fixed, and
whether revision 3 introduced a new error or contradiction. No model calls, no subagents, .env not read, no question
or prompt text printed. Code is cited from the whole-turn worktree. Its `electron/` files are sha1-identical to
MAIN's for IntelligenceEngine.ts, main.ts, ipcHandlers.ts, llm/WhatToAnswerLLM.ts and SessionTracker.ts (rechecked
today). "spec N" means a line of the revision-3 file.

**VERDICT: APPROVE WITH FIXES.** Critical 0, Important 1, Minor 3.

All seven findings are fixed: N1, N2 and n1–n5. Each fix is a text edit, and none of them changes the design. The
one Important finding is a number the user is asked to accept (§9.2): the false-FAIL price of the per-leg clause 1
is understated. The understatement started with my own re-review, whose 25–35 % was a POOLED figure.

---

## 1. Were N1, N2 and n1–n5 fixed?

| Finding | Fixed? | Where (spec) | Code / arithmetic check |
|---|---|---|---|
| N1: block in suggest/off mode reads clicked chips | YES | 63-70; the §3.3 parent rule (121); the sketch (175: '' when turnId null); rows 208-209; §5 240; §7 326-327; §8.5 347-350; §9.1 357-359 | In auto mode, every detection that is not a turn dispatch only marks the turn and returns (main.ts:2097-2110). `turnDispatchInput` sets `turnDispatch: true, resolving: true` (turnDispatch.ts:15), so a turn dispatch skips liveHold and fragmentHold. It reaches the answer branch (main.ts:2161-2166) in the same tick as `actOnTurn` (:1005, :1017, :1030). `decideDispatch` never returns `chip` in auto and never `answer` in suggest or off (detectionDispatch.ts:12-16, main.ts:2139). So `turnId != null` ⇔ the auto turn path, as the spec says. |
| N2: back-leg count; clause 1 contradiction | YES (but see R1) | 270-275, 281-285, 297-298, 352, 360-363, 378-379 | 4 × 2 × 5 = 40, plus 3 × 2 × 5 = 30, gives 70 pairs = 140 calls on 3.5-lite. 4 × 2 × 3 = 24 pairs = 48 calls on 3.1-lite. Total 188. Each model is under its own 500/day cap. Rule (a) is applied consistently: clause 1 is read per leg, and clause 7 keeps the back leg descriptive. No 164 is left. |
| n1: echo after R | YES (but see r1) | 212, 322-325 | The 76 s row asserts the wrong-referent outcome and names the cure. |
| n2: m10 reason; remove-and-push | YES | 75, 96-98, 206, 239, 375-377 | Depth 3 is now an audit buffer only. Remove-and-push is applied to the example: [P, Q₇, Q_null] + supersede of turn 7 → [P, Q_null, Q₇+tail], so the merged text is newest. Turn ids are unique per machine turn, so no other turn's entry can match. |
| n3: write order | YES | 53-61, 177, 181-182 | Verified: there is no `await` in `runWhatShouldISay` from its entry (:261) to :353 on the `whatToAnswerLLM` branch. The only earlier `await` is :290, inside the no-`whatToAnswerLLM` early return. `withParentExchange` (followUpParent.ts:40), `prepareTranscriptForWhatToAnswer` (transcriptCleaner.ts:149) and `pinSettledQuestion` (lastInterviewerTurn.ts:43) are plain synchronous functions. The first await after :353 is `classifyIntent` at :395. Block and write are adjacent and synchronous, so the ledger order is the order in which calls enter. The `turnId` is captured on the `DetectionInput` before `answerDetection`'s screenshot await (main.ts:2187). |
| n4: R21 mechanism | YES (but see r2) | 76, 205 | Restated as a PUSH with no `replaceAnswer`. Its test asserts the block. |
| n5: dedup sentence scoped | YES | 87-90 | The chip, answer-now and manual paths are named as bypassing the deduper. |

## 2. New errors or contradictions in revision 3

### Important

**R1. The false-FAIL price of clause 1, read per leg, is understated: it is about 30–43 %, not 25–35 % (spec 283-285 and
§9.2 362-363).**
- The model (spec 283) is a consensus-wrong rate of 0.5–1 % per pair per arm, with A and B independent and no real
  effect. A per-leg FAIL happens when B > A on a leg. The run fails if either leg fails.
- Computed exactly with binomials (`falsefail.mjs`, calibrated: n = 1, p = 0.5 gives 0.25; p = 0 gives 0):

  | p per pair | 42 pairs (design 2) | 70 front | 24 back | either leg (70 + 24), the rule chosen | pooled 94 |
  |---|---|---|---|---|---|
  | 0.5 % | 15.7 % | 22.1 % | 10.1 % | **29.9 %** | 25.9 % |
  | 0.75 % | 20.7 % | 27.4 % | 14.0 % | **37.5 %** | 30.9 % |
  | 1 % | 24.5 % | 30.9 % | 17.3 % | **42.8 %** | 34.0 % |

- The spec's "25–35 % over the 94 pairs" is the POOLED column. That figure came from my re-review (N2: "clause 1 runs
  over 94 … roughly 25-35 %"), which priced pooling. Rule (a), which the spec chose correctly, is stricter, so it costs
  more.
- The 42-pair figure, "15–20 %", is low at the top. It is about 16–25 %. That error is my first review's
  (SPEC-REVIEW 241), carried forward.
- The front-leg "20–30 %" is close to the computed 22–31 %.
- *Fix:* state the price as "about 30–43 % (either leg), front leg alone 22–31 %, 16–25 % at design 2's 42" in §6
  clause 1 and in §9.2. Name the model (independent binomials per leg). The user is accepting this number, so it must
  be the number for the rule actually chosen. Pooling instead of reading per leg is not a fix: it would hide a back-leg
  wrong behind the front leg.

### Minor

- **r1. Row 211 (the 61 s echo) reads "R's follow-up gets Q's text". Row 212 uses the same phrase for something else.**
  - When the echo lands before R, the ledger at R's own dispatch is [Q, Q-echo]. So R (when R is Q's follow-up)
    gets Q's text, which is a harmless duplicate. R's follow-up S reads R.
  - Row 212 uses "R's follow-up" to mean S. The two adjacent rows therefore mean different calls by the same words.
  - Reword row 211 as "R, a follow-up of Q, gets Q's text (from the echo): a harmless duplicate".
- **r2. Rows 76 and 205 explain the R21 path by one cause only. Main.ts names two (:1010-1013: "dropped … as a
  duplicate … or it never got that far").**
  - The second cause: the turn's base detection is Live-sourced, and the head's joined text has fewer than 4 words. The
    head is then dropped by `isFragment` at main.ts:2089, before the deduper.
  - In that case the R21 continuation is not '' "in practice". It gets the normal gated block, whose parent is the
    previous turn's question. That is the correct referent, so nothing is wrong.
  - Scope the "'' in practice" wording to the deduper-drop cause. Either add the fragment-drop cause to the test, or
    name it.
- **r3. Two leftovers.**
  - §4 (spec 222) still says "the 8 s supersede replaces it". Under revision 3 it is "removes it and pushes the merged
    text newest".
  - Goal (1) (spec 34-35) is not scoped to the auto turn path, while §3.1 and §7 are. Add "(auto mode)".

## 3. Outside the scope, not counted

The §6 smoke's invented follow-ups "Why?" and "Why that one?" are shorter than 4 words. Live claims under 4 words
never mark the turn (main.ts:2089 runs before the auto mark block). A turn whose base detection is Live-sourced and
whose joined text is under 4 words is dropped there.

The smoke is meant to exercise C1 and I2. It does so only if each follow-up reaches `runWhatShouldISay`. Its
registration should require a `pinned question` log line for each scripted follow-up, and should count a missing line
as "not exercised", not as a pass.

## 4. Scripts

Added `falsefail.mjs` (exact binomial P(B > A), calibrated on two known cases) in this folder. It is throwaway and can
be deleted with the first review's scripts.
