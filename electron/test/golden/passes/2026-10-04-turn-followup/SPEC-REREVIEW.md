# Scoped re-review: turn-based follow-up context, revision 2 (17:30)

Reviewer: Opus 5.5, read-only, 2026-10-03. Scope: (1) whether C1 and I1–I5 are fixed, (2) whether the three §10
departures are acceptable, (3) new errors or contradictions. No model calls, no subagents, .env not read, no
question or prompt text printed. Code is cited from the whole-turn worktree, whose `electron/` is sha1-identical to
MAIN for these files (first review, `cmp.mjs`). Line numbers marked "spec" refer to the revision-2 file.

**VERDICT: APPROVE WITH FIXES.** Critical 0, Important 2, Minor 5.

C1, I2, I3 and I4 are fixed. I1 is fixed as I asked, but my fix opened a new hole in suggest and off mode (N1).
I5 is fixed, except that the back-leg arithmetic is wrong and contradicts clause 1 (N2). The arithmetic error was
mine first: my review said "24 more calls". All three departures are acceptable. m10's stated reason is wrong, but
its value is harmless (n2).

---

## 1. Were C1 and I1–I5 fixed?

| Finding | Fixed? | Where | Note |
|---|---|---|---|
| C1 `sameAnchor` 60 s dedup | YES | spec 73-78 (no text dedup, with the reason), 183 (test row plus its 90 s control), 221 (§5 "text dedup: none") | No "60 s" dedup is left in §3 or §5. One stated reason is narrower than written (n5). |
| I1 write paths | YES in mechanism; opens N1 | spec 51-57, 68-71, 160. Code: the chip path (ipcHandlers.ts:2387-2415), answer-now (:2421-2444) and manual (:2373-2385) all call `runWhatShouldISay` with `question`, so `settled` (IntelligenceEngine.ts:306) is set. Typed chat is listed as a non-goal (spec 43-45). | The suggest-mode ledger records CLICKED questions, not ASKED ones (N1). |
| I2 two questions in one turn | YES | spec 105-110 (`replaceAnswer === true` → ''), 184-185. Code: a real supersede passes `{ replace: true }` → `replaceAnswer: true` (main.ts:1030, :2187). | The R21 re-entry sets no `replaceAnswer` (main.ts:1016-1018 → :2165). It is still safe, because that turn's head never reached `runWhatShouldISay` (n4). |
| I3 replay blind to new states | YES | spec 28-30, 229-234, 280. §3.6 now has rows for C1 plus its control, I2, re-ask, echo at 61 s and 76 s, never-dispatched/not-a-question, aborted parent, chip, suggest, R21. | The echo row's "harmless" outcome is not established (n1). |
| I4 cost provenance | YES | spec 143-147: the 4-item prior (+74.5 thinking, +261.5 ms, +3 words) with stated margins; clauses 3-5 on 40 roster pairs with the 70-pair figure reported beside (spec 262-266) | 74.5/150 and 261.5/500 are both about one half. Correct. |
| I5 gain on two items | YES, but see N2 | spec 247-251 (back leg), 272-273 (reported per item), 294-296 (§7) | The call count is wrong, and the back leg's counting contradicts clause 1 (N2). |

The minor findings were also applied: m1 (spec 92-93, 237), m2 (205-207), m3 (182), m4 (201-202), m5 (133-134,
162), m6 (105-106), m8 (125-126), m9 (166-168, 186), m11 (218), m12 (267-270), and m13 (252-253, 35/64/178,
209-211, 101/193, 345-346).

## 2. The three departures

- **m7, head 150 + `…` + tail 299: ACCEPTABLE.**
  - 150 + 1 + 299 = 450, which matches the cap.
  - The reason is sound: the task is named in the first clause and the constraint in the tail. A tail-only cut
    would drop what the constraint applies to.
  - The cut is reachable only above 450 chars. The captured maximum is 409, so the cut is a test state, as the spec
    says (spec 128-130, 192).
  - I did not recheck the positions of the two referents (chars 300 and 350). Both are under 450, so neither is cut.
- **m10, `LEDGER_DEPTH = 3`: ACCEPTABLE on the value, not on the stated reason** (n2).
- **m13, 5 reps kept: ACCEPTABLE.**
  - The extra reps buy precision on clauses 3-5, given a per-pair thinking spread of −341…+348.
  - The quota cost is small.
  - The unsupported "3 reps too few" claim has been removed (spec 345-346).

## 3. New errors or contradictions

### Important

**N1. In suggest mode and off mode, the ledger holds only the chips the user clicked. Every skipped chip shifts the
parent to an older question. This is the S2Q09F shape, on a path no test material covers.**
- *Evidence.*
  - Chips are emitted in suggest mode (detectionDispatch.ts:14) and in off mode for whisper detections
    (main.ts:2135). A question reaches `runWhatShouldISay` only when its chip is clicked
    (ipcHandlers.ts:2387-2415).
  - Under spec 51-57 and 105, parent = the newest entry = the last CLICKED question.
  - Example: the user clicks Q1, skips Q2 and Q3, then clicks a chip for "Why that one?" (about Q3).
    - The cue fires (`short`, `pronoun`). The parent is Q1.
    - The chip's context is a 60 s snapshot (main.ts:2148), so Q1 is usually absent from it. The block inserts Q1.
    - Meanwhile the real parent Q3 is in the snapshot.
    - This is the C1 wrong, reached through a different route.
  - Spec row 188 says "the block is then the previous asked question, as designed". In these modes that is false:
    it is the previous clicked question.
  - §8 alternative 5 rejects scoping to auto mode because the other paths "would silently get nothing". But
    "nothing" means today's prompt, which is safe. A wrong referent is not.
- *Fix (simplest).*
  - The block requires `options.turnId != null`, i.e. the auto turn path. Every admitted question is dispatched
    there, so "newest entry" really is the previous asked question.
  - Keep writing on every `settled` call (answer-now and a manual pinned question in auto mode are real asked
    questions; a duplicate is harmless).
  - Fix row 188 and §8.5, and add a §3.6 test: "suggest mode, skipped chip, then a clicked follow-up → ''".
  - If chip paths should get the block later, the ledger has to record emitted chips (`dispatch: chip`) as asked.
    That is a v2 item with its own current-question identity, because the clicked chip would already be in the
    ledger.

**N2. The back-leg call count is wrong, and whether the back leg counts toward clause 1 contradicts itself.**
- *Arithmetic.*
  - Spec 248-251 says "4 roster ids at 3 reps = 24 more calls … 164 calls".
  - The front leg defines "4 ids" as per hour (spec 247: 4 ids × 2 hours × 5 reps = 40 pairs).
  - The back leg on the same footing is 4 × 2 × 3 = 24 PAIRS = **48 calls**, so the total is **188**.
  - If one hour only was meant, it is 12 pairs = 24 calls, and the spec must say which hour.
  - I made this error first in SPEC-REVIEW I5 ("at 3 reps (24 more calls)"). Either way the quota is fine: 3.1-lite
    has its own 500/day, and 3.5-lite stays at 140.
- *Contradiction.*
  - Clause 1 (spec 258) counts wrongs "over all 70 FRONT-LEG pairs".
  - Clause 7 (spec 273) says the back leg's "wrong answers count in clause 1".
  - If they count, clause 1 runs over 94 (or 82) pairs, and the stated false-FAIL price (20-30 % at 70) is too low.
    Extrapolating the same per-pair rate gives roughly 25-35 %.
- *Fix.*
  - State the back-leg pairs and calls exactly and correct 164.
  - Pick one rule: (a) clause 1 covers both legs, kept per leg (B ≤ A on the front leg AND B ≤ A on the back leg),
    with the price restated; or (b) back-leg wrongs are descriptive only. The hedge sends the same bytes to both
    legs, so (a) is the stricter and more honest choice.

### Minor

- **n1. Echo row (spec 190) and §7 (298-299): "harmless duplicate" holds only if the echo arrives before the next
  question.**
  - Roster gaps start at 65.3 s, and the echoes came 61 s and 76 s late. A 76 s echo of Q therefore lands after R.
    The ledger becomes [Q, R, Q-echo].
  - R's follow-up then gets parent Q, absent from the prompt, while R is present: a wrong referent.
  - Restate the row as "wrong referent when the echo follows the next question; bounded by the label; cured by the
    dispatcher fix". Make the 76 s test assert that outcome, not "harmless".
- **n2. The m10 reason is wrong.**
  - In v1 only the newest entry is ever read, and a supersede returns '' without reading.
  - A double dispatch of the parent leaves the newest entry equal to the parent at any depth. So "depth 1 would
    make a double dispatch hide the parent" (spec 343-344) does not happen.
  - Depth 3 is harmless. Cite it as a buffer for the diag audit, or use 1.
  - Related: "REPLACE that entry's text" (spec 62) keeps the entry's position. If a `turnId: null` entry is newer
    (answer-now re-running the turn's head), the superseded head + tail sits under a stale newest head. Make the
    replace "remove and push newest", and add one test.
- **n3. Write order: pin the position.**
  - Spec 52-53 says "after the block … and before `generateStream`". But `classifyIntent` is awaited in between
    (IntelligenceEngine.ts:395) on every call without `intentOverride` (manual, and answer-now without an intent).
  - Two overlapping calls could then build and write out of order.
  - Pin block + write synchronously, right after `preparedTranscript` is final (:353). There is no await from :298
    to :353, so each call's block-then-write is atomic and the ledger order is the call order. §3.5's sketch
    already shows this order; the prose should say it.
  - Likewise, `turnId` should be captured at dispatch (on the `DetectionInput`), not read inside `answerDetection`
    after its `await this.takeScreenshot` (main.ts:2181-2187).
- **n4. R21 row (spec 62, 186): the outcome is right, the mechanism is wrong.**
  - R21 fires only when `turnDedupId` is undefined, meaning the head never reached the answer branch (main.ts:1010-1018).
    So no entry with that turn id exists, and the write is a PUSH, not a replace.
  - That re-entry carries no `replaceAnswer`, so the I2 '' rule does not cover it. The block is '' in practice
    because the head duplicated an answered question still in the prompt.
  - Reword the row and assert that path's block in its test.
- **n5. Spec 73-74: "a re-fire within 60 s is dropped before it reaches `runWhatShouldISay`" is true only on the
  dispatch path.**
  - Chip, answer-now and manual calls bypass the deduper.
  - The conclusion still holds: a duplicate entry is harmless, and answer-now's re-run gets '' through containment
    in the pinned line.
  - Scope the sentence.

## 4. Numbers checked

| Item | Spec | Recomputed | Status |
|---|---|---|---|
| Label length | 125 | 125 chars, 125 bytes (node `length`) | OK |
| Block worst case | ~580 chars | 125 + `\n- ` 3 + 450 = 578 | OK |
| Head + tail | 150 + `…` + 299 | = 450 | OK |
| Front leg | 40 + 30 pairs → 140 calls | 70 × 2 = 140 | OK |
| Back leg | +24 calls, 164 total | 24 pairs = 48 calls → 188, or 12 pairs on one hour | **N2** |
| Stall allowance | +3 on 40 | 2/39 × 40 = 2.05 → 3 | OK |
| Gain bars | +8 / +2 on 40 | 4/21 × 40 = 7.6 → 8; 1/21 × 40 = 1.9 → 2 | OK |
| Thinking / TTFT margins | ~half | 74.5/150 = 0.50; 261.5/500 = 0.52 | OK |
| Gated blocks to freeze | 8 | 4 ids × 2 hours | OK |

This re-review added no scripts. The first review's scripts can still be deleted.
