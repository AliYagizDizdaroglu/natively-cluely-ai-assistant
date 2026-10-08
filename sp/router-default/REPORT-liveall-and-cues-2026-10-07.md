# router-default-r1 follow-ups: full 3.8 Live, and the cue grading (2026-10-07)

Both are REPORTED ONLY: neither changes the flight verdict (INCONCLUSIVE, MAIN 22929bc).
All graders: `claude-opus-5-5`, pinned, `--setting-sources project,local`, memory ABSENT on every session.
Acceptable = both graders correctness 2 and on-topic 2; wrong = either grader correctness 0.

## 1. Full 3.8 Live (answers all 47 questions from the flight's own audio, no router, no pipeline)

**Verdict: nearly as good as the app on this roster (39 vs 41 of 45, 0 wrong both), 2x faster, less reliable.**

| | 3.8 Live alone | App this flight (router + pipeline) |
|---|---|---|
| All (acceptable / weak / wrong) | **39 / 6 / 0** | **41 / 4 / 0** |
| Easy mains | 17 / 3 / 0 | 19 / 1 / 0 |
| Hard mains | **10 / 1 / 0** | 9 / 2 / 0 |
| Follow-ups | 12 / 2 / 0 | 13 / 1 / 0 |
| Answered | 45 of 47 | 47 of 47 |
| First word | p50 0.81 s, p90 1.97 s | Live 1.57 s; pipeline ~4-5 s |
| Words per answer | p50 38, max 118 | |

- Both acceptable on 36 of 45.
- **Live's weak 6:** thin/generic (RE06 misses later-layer invalidation; RH18 generic Docker tips; RH10 vague), off-topic opener (RE12, an unrelated monitoring sentence), evasive on a personal follow-up (EF02), command flags written as code (RE18).
- **App's weak 4:** RH08 (Live, wrong term), RE06 (Live, thin), RH19 (pipeline, cold-start overclaim), RH12 (pipeline, over 85 words).
- **Reliability:** EF01 answered before its clip ended (filtered), RH14 no answer; the session closed 1011 at ~13 min and the resumption also closed 1011; a fresh session finished the run.
- **Meaning:** on this short-question roster, Live handles hard questions too, so the router's 4 misroutes cost little here (RH08 only). On the harder scenario50, L20d measured Live 0.568 vs the app 0.696, so do not generalise. The pipeline's value is reliability (47/47, no session dependency) and depth on harder questions.

## 2. Cue grading (the cues themselves, first time ever)

**Verdict: the app's cues are good: 22 of 26 good, 4 weak, 0 wrong; no cue made an answer worse.**

Calibration first (48 planted blocks from scenario50, never holdout): both graders caught 24/24 bad, 12/12 must-be-wrong, every failure kind 4/4, rated 16/16 good blocks good with 0 wrong; agreement 47/48. Thresholds confirmed by the user and frozen by hash before any real export (spec 8e34328f2765, rubric fce7ac5bb1e3).

| Source | Graders | Good | Weak | Wrong | Empty |
|---|---|---|---|---|---|
| **App in-app cues** (pipeline-shown turns) | 2 (agreement 96%) | **22** | 4 | **0** | 0 |
| 3.5-lite HIGH bare arm | 1 | 30 | 1 | 0 | 0 |
| 3.1-lite LOW bare arm | 1 | 30 | 1 | 0 | 0 |

- Joined to the answer grades: a cue added an error 0 times; a good cue over a wrong answer 0 times.
- Axis means (0-2): relevant 1.96, correct 1.98, usable at a glance 1.79, covers the parts 1.90, agrees with the answer 2.00.
- **Why the 4 in-app cues were weak:**
  - RH03: first line cut mid-phrase (both graders).
  - RH12: the failover part has no cue (both graders) - the coverage gap the cue rule was meant to close.
  - EF02: no explicit yes to a yes/no follow-up; generic heading lines.
  - EF07: contested - one grader good, one says the "why" is missing.
- Arms: 3.5-lite RE07 third line cut mid-phrase; 3.1-lite RH12 lines only restate the asked parts as headings.
- Cues appear only on pipeline-shown turns (27 of 49); Live-shown turns carry none.
- **Reading:** row 0 (no reading) by the spec: the keep/redesign decision needs h40d too (deferred to after the weekly reset). Informational only: on this flight's numbers the rows would read "keep ON".

## What this means for the plan

1. Cues: content is good; the open cost is the +161 thinking tokens (~0.5 s) measured at h40d. Grade h40d's cues after the weekly reset to get the decision.
2. Two concrete cue defects to fix in code/prompt: a cue line cut mid-phrase (trim cuts at 5 words) and a missing part on many-part questions (RH12).
3. Live as answerer: strong on short questions, unreliable over a long session (1011 closes). The router design (Live first, pipeline backup) is supported.

## Not shown

- One Live sample, one evening's free-tier load; graders saw 90 answers per session (the flight's saw ~10); a small formatting tell between arms (stray whitespace in in-app text).
- Grader noise is visible: RH12 / RH09 swapped weak/acceptable between this grading and the flight's.
- Cue n = 26 is small; bare-arm cue grades have one grader and no agreement check.
- Whether the cues help the candidate speak (never measured; deliberately out of scope).
