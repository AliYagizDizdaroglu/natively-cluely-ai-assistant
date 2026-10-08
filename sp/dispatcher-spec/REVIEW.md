# Review: `2026-10-01-turn-memory-design.md`

Reviewer: Opus, 2026-10-01. The review was read-only against the whole-turn worktree `8a13abb`
(WT). No vitest, tsc, build, npm, model or API call was run. The throwaway scripts are in
`dispatcher-spec/review-scratch/` (RS).

**Verdict: NOT READY. 3 Critical, 10 Important, 11 Minor.**

The direction is right, and the spec's headline claims hold. The problems are in the
pre-registered rule, the replace branch and the echo guard. Two pre-registered rows cannot pass
as written. The replace branch creates a new way to lose a question. The echo guard's
showcase example was computed wrong. The spec needs another revision before the user
approves it.

## How the claims were checked

`RS/proto.ts` is the spec's flag-on machine as I read it. It is built on a verbatim copy of
`interviewerTurn.ts`. Where the spec is silent, it counts and labels the branch it takes.
`RS/replay-proto.mjs` feeds it the eight DS fixtures in the spec's modes:
- calib: memory off, recorded verdicts;
- fixdet: recorded verdicts plus detector substitution;
- fixunk: recorded verdicts plus `unknown` substitution;
- control: `{revive: true, echo: false}`.

**Calibration of the prototype (rule 8).** In calib mode it reproduces DS's replay exactly:
- br1 S1Q08: 65 350 ms, with closes at 45.960 and 55.374 and the Live dispatch at 49.718;
- cue smoke S1Q08: dispatches at 15.956 and 32.425;
- s50d: all 10 `not-a-question` closes.

Its fix-mode results depend on my reading of the spec. Every place where that reading matters
is named below.

### Confirmed (the spec is right here)

- br1 S1Q08 works as Appendix A says. The turn is declined at 45.960 and revived by the chip at
  47.374 (score 1.00). It dispatches at 47.374 with 5 finals and `fromLive=false`, 3 006 ms after
  voice-off against a budget of 3 106 ms. The echo at 11:02:46 is absorbed (0.92 against an open
  score of 0). Exactly one dispatch.
- Cue smoke S1Q08: one dispatch, and the echo is absorbed at 1.00.
- Control: br1 S1Q08 dispatches twice (R5 behaves as designed).
- Rows R8, R9, R10 and R12 read as the spec claims:
  - s50d S2Q09 gets 0 dispatches and closes `no-verdict`;
  - no other item changes;
  - no doubles;
  - br1 S2Q01 and s50i S2Q07F both have `live=[]`.
- Across the fixtures there are 16 revives and 17 absorptions. Fifteen revives score ≥ 0.92; one
  scores 0.56 (see I7). The 17 absorptions are the spec's expected 15, plus br1 S1Q08 and the
  s50i contamination claim.
- R2 holds. The committed s50a and after9 fixtures read the same with memory on:
  - s50a: 40/40, 15/15 long, median 1200 ms;
  - after9: 76/76, 6/6 long, median 1200 ms;
  - both: 0 supersedes, 0 early.
  (RS `legacy-r2.mjs`.)
- The code references are accurate, apart from the `metrics.mjs` claim in I4.
- The junk-flag refusal works. The startup check (`main.ts:3446-3453`) runs before AppState is
  built (`main.ts:3474`), so a junk value exits before `turnMemoryFromEnv()` could throw.
- Teardown (R32) is safe. `resetTurn()` runs at meeting start (1951), at meeting end (2296) and
  when leaving Auto (2059). A classify verdict that arrives during the 250 ms grace hits no turn
  and is ignored as `stale-turn`.

---

## Critical

### C1. R1 (calibration) cannot pass as written, and the spec says DS already showed it passes

**Where:** §6.2 calibration bullets; §7 R1 and the decision paragraph.

**Evidence:** `RS/calib-check.mjs --anchor` runs today's machine against the logs:

| fixture | recorded classify never matched | replay classify unmatched (E8) | first dispatch > 100 ms from the log |
|---|---|---|---|
| br1 | 2: 10:36:15.524 is a pre-roll question; 11:00:27.204 is a race, the Live mark landed 4 ms after the ask | 0 | S1Q02 −600, S1Q02F −4136 (the log's `gate=3705`), S1Q03F −7648 (`gate=53218`: the app's VAD never reported a stop, so the fail-safe fired), S1Q08 +3698 (the 11:02:37 blip, DS §4.3) |
| cue smoke | 1 | 0 | S1Q08F −1987 (`gate=3207`) |
| s50c | 2 | 0 | 13 items at +521 to +716 ms (the bimodal offset, which the spec already plans for) |
| s50f, s50i | 1, 2 | 0 | 0 |
| s50j | 1 | **1**, at 07:47:37.977: the replay's timer fires 2 ms before the log's Live mark at .979; the app's setTimeout fired after the mark | S2Q09 −1038 (`gate=3205`) |
| s50b, s50d | 0 | 0 | 0 |

Only s50b and s50d pass all four bullets. The mismatches come from things a WAV-span fixture
cannot represent:
- the app's energy-VAD behaviour, which is not logged per transition;
- pre-roll audio;
- millisecond timer races.

The builder cannot fix any of these.

The spec's "DS §4.3 has shown this for all eight fixtures" is contradicted by DS §4.3 itself,
which reports br1's Live-only dispatch landing 3.7 s late. The tolerance's provenance, "three
times the largest delta, 31 ms", ignores that same 3.7 s.

The rule also contradicts itself on what an R1 failure means:
- R1's own "reads" column says: fix the builder, re-run R1 only.
- The decision paragraph says: any FAIL means no build, a new spec revision and a new
  pre-registration.

**Why it matters:** as registered, the first run FAILs. Either the build is blocked, or the
thresholds are renegotiated after seeing the data, which the pre-registration forbids.

**Fix (pre-register all of it before any data):**
- Replace "every recorded classify is matched" with two conditions:
  - every replay classify is matched;
  - every recorded classify that was never matched is listed, and each is a pre-roll ask or a
    turn the replay marked before its gate.
- Tolerate timer races: at equal times, process a recorded detection before a timer due within
  a stated jitter. The jitter needs its own provenance.
- Exclude, and list, items where the app's VAD disagreed with the WAV. Candidate signals:
  - a log `gate=` above 4 000 ms;
  - a log dispatch on the unfinished hold where the replay dispatched at the gate;
  - `deepgram speech-started vad=true` lines after the WAV voice-off.
- Say whether an inadmissible fixture blocks the whole rule or only its own rows.

### C2. R6 fails on s50d S2Q05F by construction: the budget ignores the unfinished hold

**Where:** §6.4 row 3, §7 R6, §6.1.6 (the budget).

**Evidence:**
- S2Q05F's finals end "…multi hop dependence" with no terminal punctuation, so `readsFinished`
  is false.
- The Live claim at 08:03:24.734 revives the turn (quote 1.00).
- The machine then waits out the unfinished hold, exactly as §3.3 prescribes ("else the
  unfinished hold"). It dispatches at +3.70 s from the finals, with `fromLive=false` and
  finals=2.
- The budget is max(voice-off + 1.6 s, first mark) + 0.1 s = +2.372 s.
- R6 therefore FAILs in both substitution modes, on a dispatch that is 2.3 s faster than today's
  +5.97 s rescue. (RS `rows-check.mjs`; this is the only FAIL among R3–R14 in my run.)

**Why it matters:** the pre-registered rule blocks the build on correct behaviour.

**Fix:** decide this before registering. Either:
- make the budget "max(voice-off + gate + (unfinished hold when the dispatched text does not
  read finished), first positive) + 100"; or
- assert only `fromLive=false`, the finals count and `latency < today's latency` for R6.

### C3. The replace branch throws away finals that rejoined the declined turn, so a short real question after a statement is lost

**Where:** §3.3, the "a positive that does not quote it → replace" row; Appendix B.1; the
content-word floor in §3.2.

**Evidence** (`RS/crafted.mjs` case C, flag-on prototype):
1. "Okay, that makes sense, thanks for that." is classified "no" and the turn is declined at
   24.1 s.
2. The question "So why would you use Kafka here?" has its final at 28.1 s. It rejoins the
   declined turn.
3. At 29.6 s the detector's chip "Why would you use Kafka here?" arrives. It has 3 content words
   ("would", "kafka", "here"), fewer than the floor of 4, so it scores 0 against the joined
   finals.
4. The result is `replaced-declined`. The declined turn closes, and the question's final goes
   with it.
5. A fresh turn opens with no text and closes `nothing-heard` at 37.6 s.
6. **Nothing is answered.**

Today the statement closes at its verdict, the question opens its own turn, and the chip gets it
answered.

The same branch discards a declined real question's finals whenever any non-quoting positive
arrives while it waits. That includes a stale re-fire of the previous question, which the
detector routes through the mark block as a chip update (`main.ts:2543-2553`). That is the C5
loss the spec sets out to remove, reached by a new trigger.

Appendix B.1 says replacing "keeps today's meaning for every existing path". That is true only
when the declined turn holds nothing but the statement.

The 4-content-word floor comes from the deduper's echo side (after5's "I'm going to go."). On the
revive side it turns "too short to score" into "does not quote". Short questions ("Why not
Redis?", "What about cost?") are routine in interviews.

**Fix:**
- A whisper positive that does not quote a declined turn is ignored (`why=no-quote`); the
  re-armed classify decides. A whisper positive carries no text into the turn, so replacing adds
  nothing.
- Only a Live positive, which carries text, replaces. When it does, finals that arrived after
  the decline move to the fresh turn.
- Evidence under the content-word floor counts as "unscorable" (not revive, not replace), not as
  a score of 0.
- Add crafted fixture S-6 for this exact shape.

---

## Important

### I1. The echo guard absorbs an open follow-up's own, on-time Live claim. The spec's s50e example is wrong.

**Where:** §3.4, the table row for s50e S2Q01F; Appendix B.3; §9.

**Evidence** (`RS/s50e-followup.mjs`):
- The s50e claim "Which of those stages (ingestion, parsing, chunking, embedding, retrieval,
  reranking, context assembly, or generation) can cause…" scores **0.53 against S2Q01F's own
  text and 0.58 against the parent S2Q01**. The parent wins.
- So the claim is absorbed as the parent's echo, and the spec's counterfactual is false: "had it
  arrived while S2Q01F's finals were open, the open turn would have won". The open-turn score
  would be 0.53, below the parent's 0.58.
- s50g shows this counterfactual actually happening (`RS/claim-timing.mjs`,
  `RS/ontime-echo.mjs`):
  - S2Q01F's own claim arrived 1.7 s after its clip ended, while its turn was open with 2
    finals;
  - it scored open 0.47 against remembered 0.63, so the spec's rule absorbs it as S2Q01's echo.

**Base rate on non-holdout data:**
- Of 505 on-time Live claims in 15 whole-turn hours, 1 is absorbed this way. One more is within
  0.08 (br1 S2Q04F: own 0.58, remembered 0.50). The p5 margin is 0.51.
- With the interviewer STT switched off (open score always 0), 3 of 689 attributed claims score
  ≥ 0.5 against a different recent question: after9 W08 against W07 at 0.50, br1 S2Q04F at
  0.50, and s50e. This estimate is indicative only: the remembered texts there would be Live
  paraphrases.

In s50g the harm was nil, because whisper had already dispatched S2Q01F. The same claim is the
only rescue when the follow-up was declined or the detector was out, as with s50d's nine Live
rescues. Then the follow-up is lost.

**Fix:**
- Decide which error to accept, and pre-register the choice with these numbers.
- Option (a): absorb only when the open turn has no finals, or is itself the stale dispatched
  turn (DS's first clause). This accepts s50i's `live[]` contamination.
- Option (b): absorb against an open turn with finals only when the open score is under a low
  bar. The contaminating claim scored 0.14, but this own claim scored 0.47, so a bar needs its
  own non-holdout provenance.
- Correct §3.4 and Appendix B.3.
- Add s50g (and s50e) to the fixtures, or make them crafted pins.

### I2. A statement that restates the previous question is revived by a stale re-fire

**Where:** §3.4 ("Whisper detections are not echo-tested"); the tie rule (line 171); §6.7 S-1.

**Evidence** (`RS/crafted-e.mjs`):
- Q0 "How would you shard a Postgres table by tenant?" is answered.
- The interviewer then says "Okay, so you would shard the Postgres table by tenant, got it.",
  which is declined.
- A stale **whisper** re-fire of Q0 quotes the statement at 1.00. The statement is revived and
  **answered**.
- A stale **Live** re-fire of Q0 ties: 1.00 against the remembered Q0 and 1.00 against the open
  statement. Ties go to the open turn, so it joins and revives.

S-1 uses a statement that shares no words with Q0, so it cannot show this. More broadly, the
design now answers a statement whenever a second framing or Live says "question". Today that
case ends in `nothing-heard` (br1's shape). No crafted fixture pins that change.

**Fix:**
- Echo-test every positive, whisper included, against the remembered turns before the
  declined-turn quote test.
- On a declined turn, break ties in favour of the remembered turn.
- Add S-7 (a restating statement plus a stale re-fire) and S-8 (the detector says yes on the
  statement itself, so it is answered: pin the behaviour change honestly).

### I3. Ignoring stale-finals verdicts without re-arming leaves a turn that no classify, fail-safe or expiry will ever resolve

**Where:** §3.3 (the stale-finals row: "the re-armed classify decides"), E2, Appendix B.2, C.2.

**Evidence:**
- The spec re-arms the classify only on a rejoin to a **declined** turn. Take a turn whose first
  classify is in flight when a final lands (11 of 184 verdicts, DS §5).
- Its verdict is ignored as `stale-finals`. The turn is left undetected with
  `classifyAsked=true`.
- It has no fail-safe (`detectedAt` is null) and no expiry (it is not declined).
- In `RS/crafted.mjs` case A it waits until the next question's finals join it, and they are
  dispatched together at 25.7 s.
- In the fixtures, s50j S1Q07F and S1Q08F survive only because the detector's own call on the
  grown text said yes.

Appendix B.2's symmetry is also illusory in production. On a "yes", `runDetection` emits the chip
synchronously (`QuestionDetector.ts:375`). That runs through `question-detected` into the mark
block (`main.ts:2531-2541`), which marks the turn before the verdict's `.then`. So stale-finals
never blocks a positive. It only blocks negatives.

**Fix:**
- With the flag on, any final landing on an undetected turn after its classify was asked sets
  `classifyAsked=false`.
- Add the missing unit test.
- Correct B.2's cost statement: the ignore costs no call on positives and one call on
  negatives.
- (With the re-arm my rows read the same: `rows-check.mjs --rearm`.)

### I4. The new mark-line field order breaks `interview60.metrics.mjs`, in the flag-off build too

**Where:** §3.8 (`outcome=` placed before `question=`) and its claim that "metrics reads Live
question and pinned lines only (lines 64, 102)".

**Evidence:**
- `metrics.mjs:67` parses every `dispatch:` line, mark lines included, with a strict chain of
  optional fields ending in `question=`.
- On the proposed line, its `question` capture becomes `null`. The builder's looser regex still
  parses it (`RS/regex-check.mjs`).
- The mark lines' `question` is used for claim scoring of `verdict=paraphrase` marks (line 231).
  That scoring feeds `claimOf`, `heardBy`, `detectMs` and `raceLoss`.
- The fixtures hold 5 paraphrase Live marks.

**Why it matters:** the spec's "only log lines differ" and "none of the above changes a flight
number" are false for the flag-off default.

**Fix:**
- Append `outcome=` and `score=` after `question=`. Both regexes pass that way.
- Grep every consumer of `dispatch:` and `turn:` lines, including `metrics.test.ts:301`.

### I5. The harness must pass the dedup anchor, or the spec's own R21 change makes br1 S2Q01 a double

**Where:** §6.1.3.

**Evidence:**
- `main.ts` passes `anchor = d.text` for every turn dispatch (`turnDispatchInput`). The
  committed replay omits the anchor on purpose (test line 62).
- With R21 routing modelled and no anchor, calibration gives br1 39/40, with S2Q01 dispatched
  twice.
- With the anchor, it gives 40/40, and S2Q01's R21 dispatch lands at 11:11:38.645 against the
  log's .629.
- The log's own drop at 11:11:54 was the `sameAnchor` rule acting inside the 20 s window.

**Fix:** have the harness pass the anchor. Re-check s50a and after9 with it (my run: unchanged).

### I6. R11 cannot detect the failure it exists to catch

**Where:** §7 R11 (it uses `livelag.mjs`'s attribution).

**Evidence:**
- Text-coverage attribution assigns s50e's inlined S2Q01F claim to **S2Q01** (the
  `followup-echo.mjs` output).
- So a parent-absorption of this shape reads as "same-item" and R11 PASSes.
- DS §10 already warns that attribution by text is fooled by Live's paraphrase.

**Fix:**
- Attribute by time: the claim's lag from each candidate clip's end, against Live lag p90 4.1 s.
- Use text only to break ties.
- Calibrate the check on s50e and s50g before trusting it (rule 8).

### I7. `QUOTE_MIN`'s provenance rests partly on holdout data and on one side of the distribution only

**Where:** §3.2 (the provenance cell; "Why not Jaccard or containment"); Appendix B.3; §9 ("0 of
20").

**Evidence:**

*Holdout use.* The metric is chosen over Jaccard and containment partly because both "missed
h40c R18", and the provenance table carries h40c's 0.67. The project's rule is that holdout40 is
never used to tune **or choose**. Line 14 of the spec claims it complies. §9's "0 of 20 Live-only
turns" also includes 4 holdout items (h40a R05, h40b R07F, h40b R15, h40c R18).

*The known cases sit close to 0.5 on both sides:*
- **positives:** br1 S2Q01's echo at 0.57, s50i S2Q09's revive at 0.56;
- **negatives:** non-matching non-holdout pairs at 0.50 (after9 W08 against W07, br1 S2Q04F
  against S2Q04), 0.58 (s50e) and 0.63 (s50g).

The threshold does not separate the two classes; the guards around it carry the weight (I1).

**Fix:**
- Drop the h40c argument. Rest the metric choice on the directionality argument, and compare the
  three metrics on the non-holdout pairs from `RS/followup-echo.mjs` and `RS/ontime-echo.mjs`.
- State the negative-side scores next to the positive ones.
- Restrict the "0 of N" base to non-holdout data.

### I8. Part 3 misses the client-throw path, and the detectNow test file already exists

**Where:** §3.5 (the "`startDetection` rejects" row), §4.3 ("'unknown' only from the null/stale
paths"), E7, §10.

**Evidence:**
- A throwing client never makes `startDetection` reject. `runDetection` catches the throw and
  returns `false` (`QuestionDetector.ts:296-300`).
- So under §4.3 a throwing client stays `not-a-question`. That is the rule-11 violation part 3
  exists to fix, and it contradicts E7's "never 'no'".
- `QuestionDetector.detectNow.test.ts` already exists (§10 lists it as new). It pins today's
  behaviour: `not-a-question` for a disabled detector (line 39) and a throwing client (line 44),
  plus string results in T-F1 and T-F2.

**Fix:**
- Map `runDetection`'s catch to `unknown/threw`.
- List the file as changed, not new.
- Watch lines 39 and 44 turn red on the new expectations before implementing.

### I9. A negative verdict on a turn that a positive has already marked is unspecified, and the case happens in the fixtures

**Where:** §3.3, the "declined" row ("`t.detected` stays false").

**Evidence:**
- In s50i S2Q09 under `recorded+unknown`, the Live claim revives the turn at 08:17:30.745.
- The substituted `unknown` for the re-armed classify then arrives at 31.039.
- Today's code would close the marked turn. The spec says nothing about this case.
- My prototype ignores the verdict. The alternative reading, re-declining the turn, delays the
  dispatch from 31.329 to 32.388. It happens not to flip R7 here, but the behaviour is left to
  whoever implements it.

**Fix:** state that `not-a-question` or `unknown` on a turn that is already `detected` is
ignored (`why=marked`), consistent with "answered as soon as any ear says question". Add a unit
test for it.

### I10. The change pushes against the parked small-talk concern, and the rollout gate that would catch it is missing

**Where:** §3.7, §6.7, §8.

**Evidence:**
- The design turns a classify "no" into an answer whenever another ear says yes. For a question
  like "How's your day going?", that is the opposite of what the user parked. §8 names only the
  shared recording.
- §6.7 says "the flag stays off" until the statement recording exists. But the §3.7 path (smoke,
  then flight, then flip) does not include that recording as a gate.
- The cue-smoke roster had 0 `not-a-question` closes, so a flag-on smoke will probably exercise
  no revive at all. Outside the s50d outage, scenario50 hours average about 0.6 declines per hour
  (7 in 11 hours, `out-count.txt`).

**Fix:**
- Name the directional interaction explicitly.
- Put the statement and small-talk recording in §3.7 as a gate before the default flip.
- Give the smoke a deterministic exercise of part 1. Options: a recorded item known to be
  declined, or a detector outage induced by an env hook rather than by touching keys.

---

## Minor

1. **Pairing and builder edge cases** (§6.1.1, E10, E11). `RS/pairing.mjs` checked the 73
   classify calls in the eight logs:
   - The "previous line is not `debounce elapsed`" rule picks a **queued** trigger's call at
     cue smoke 13:23:16.446 (the chosen call is the queued fast-path one).
   - A classify that waited more than 3 s behind a slow call (s50j 08:17:12.511) would be
     labelled `no-call`.
   - E10 has no exemption for a meeting ending with a classify in flight (the `.then` returns
     early, so no line is written) or for pre-roll asks.
   - Fix: count `coalesced` lines between the ask and the call. Better, log a `detectNow issued`
     line in post-fix builds.
2. **The window margin mixes reference frames** (§3.3). "+7.7 s" is an answer time measured from
   the clip end. "+9.6 s" is the window end measured from the voice stop. In the verdict frame,
   every revive in the fixtures came within about 3.1 s of the first verdict, so the margin is
   about 5 s, not 2 s. Also state that the window follows `NATIVELY_TURN_CONTINUATION_MS`.
3. **A revive dispatches at once once the holds have elapsed**, even with a final still in
   flight, and a supersede follows 0.5 to 1.5 s later (s50j S1Q10F; s50i S2Q09). No row counts
   supersedes on the new fixtures. Add a report-only count.
4. **E5's throw surfaces in the wrong place.** It is raised inside `runDetection`, because
   `onChip` is synchronous, or inside the Live router's emitter. It therefore shows up as
   `unknown/threw` or as an unhandled rejection, not loudly. E5 and U10 also need to say
   "a fresh detection (no `forTurn`)", since U9's verdict revive carries no text.
5. **`ignored why=dispatched` is the common outcome** for classify "yes", because its own chip
   dispatches first. It was 33 of 67 verdicts in my fixdet run. Say so in E3 and §3.8.
6. **Ties among remembered turns are undefined.** This decides the `echoOf` identity, and so
   R11. Define it (most recent wins).
7. **U12 and U14 are red today only on the missing return value**; their behaviour is already
   green. Add a positive twin to U12 (a claim three turns back **is** absorbed) so the count
   bound is actually tested (rule 8).
8. **The echo test runs before R15.** Under a stuck VAD the stale dispatched turn still counts as
   "open", so its own echo joins it and R15 then opens a Live-only turn. Run `reopenIfStale`
   (and remember the turn) first (`--echoAfterR15`: rows unchanged).
9. **Several §6.4 descriptions and R2 details are inaccurate:**
   - s50j S1Q07F and S1Q08F are not declined in the new machine (stale-finals), and s50d S2Q08
     is revived by a whisper chip, not Live;
   - R2 says "median 1200 ms" where the committed test asserts ≤ 1400;
   - on legacy logs, which have no `mark` lines, the "first mark" in the budget must mean "first
     detection".
10. **The replay feeds a different quote input from production for `replaced` Live claims.**
    The fixture's `question=` is the STT line, while main.ts quotes `d.liveText`. The fixtures
    hold 3 such marks, and pre-fix logs carry only 80 characters of the raw text. Pick one
    input, log the full raw text on the mark line, and feed the same input in the replay.
11. **Two design fragilities are unnamed:**
    - A Live claim that quotes a declined lead-in (where the STT missed the question) revives the
      turn and pins the **lead-in**, leaving the question only in the both-ears block.
    - A re-classify's own chip on a declined turn that fails the quote test replaces the turn
      before its own "question" verdict arrives, which then hits `stale-turn`.

---

## The seven open questions

1. **Substitution policy:** yes, with three additions.
   - Read **every** row (R3–R12) under both policies; a FAIL in either counts. R14 currently
     covers only R3, R6 and R7.
   - Pre-register the expected substitution counts. My run: 3 in total (s50i 2, s50j 1), 2 of
     them re-armed. More than twice that means INCONCLUSIVE.
   - Print which rows rest on a substituted verdict.

   The policy cannot hide a statement regression, because the fixtures contain no statements.
   That gap belongs to the crafted fixtures and the new recording.
2. **Positive verdict on stale finals:** keep ignoring stale verdicts of both signs, but the
   question as posed is moot. The classify's own chip marks the turn before its verdict arrives
   (I3). What matters is the re-arm on undeclined turns (I3) and the negative-on-marked case
   (I9).
3. **The declined window:** reuse `continuationMs`, and correct the margin to about 5 s in the
   verdict frame (Minor 2).
4. **`REMEMBERED_TURNS` = 3:** fine. The count is not the binding risk: s50g needs only one
   remembered turn. The open-turn guard is (I1).
5. **Flag and flip:** flag default off, yes. Add a flag-off live exercise before the flag-on
   smoke (rule 7: the default ships the new detectNow shape and the new lines). Make the
   statement and small-talk recording a gate before the flip (I10).
6. **New recording:** yes, and gate the flip on it. Include these shapes:
   - a short question within 8 s of a statement (C3);
   - a statement that restates the previous question (I2);
   - a follow-up whose paraphrase inlines its parent (I1);
   - a small-talk question;
   - an STT-gap segment.
7. **`close reason=no-verdict`:** yes.

## Open questions the spec missed

8. What does a whisper, and what does a Live, non-quoting positive do to a declined turn that
   holds finals which rejoined after its verdict? (C3)
9. Does `not-a-question` or `unknown` on a turn that a positive has already marked get ignored?
   (I9)
10. When a turn with finals is open, which echo error is accepted: absorbing a follow-up's own
    claim (s50g), or `live[]` contamination (s50i)? (I1)
11. Should whisper positives be echo-tested, and which way do ties break on a declined turn?
    (I2)
12. Which text does the quote test use for a `replaced` Live claim, and how does the replay get
    it? (Minor 10)
13. Which calibration mismatches are tolerated, by what pre-registered rule, and does an
    inadmissible fixture block the whole rule? (C1)
14. Does R6's budget include the unfinished hold? (C2)
15. Which ChipDeduper inputs does the harness pass (anchor, source)? (I5)

## What I did not check

- No vitest, tsc, build or npm was run, and no model or API call was made. The prototype's fix
  mode is my reading of the spec, not the implementation. Its today mode is calibrated only
  against DS's `replay.mjs`, not against the vitest harness.
- s50c used DS's single-offset fixture; per-item offsets were not rebuilt. Its 13 timing misses
  are expected to go with the per-item offsets.
- The app's energy-VAD transitions are not in the logs. The br1, cue-smoke and s50j timing misses
  are attributed to them from the `gate=` values, not proven transition by transition. I did not
  verify that the builder's boundary repair (`finalsFrom`) gives the machine the same text the
  app saw. A difference there could explain some of the unfinished-hold misses.
- Answer quality after a revive (statement-prefixed pinned text) was not assessed. Answers were
  not read.
- Not read: captured prompts, keys, `.env`, `spike*`/`probe*`/`repro*` json.
- Holdout hours were not used beyond what DS already cited.
- Not checked:
  - the renderer's replace-in-place path;
  - the earlier-questions implementation (it is not built);
  - Live lag tails beyond 76 s;
  - main.ts behaviour under `setLiveMode` switches in the middle of a declined window.
