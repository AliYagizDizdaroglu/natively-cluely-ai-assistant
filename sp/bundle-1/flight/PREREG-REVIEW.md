# Review: PREREGISTER-b1-final.md (sha256 b04afd51…db640, re-hashed: match)

- **Reviewer:** a fresh Opus, not the author. 2026-10-11. Read only; no code, no model calls, no git.
- **Verdict: CHANGES.** 4 required, 7 minor. The bars, numbers and verdict order are sound; the gaps are where a human answer or a missing deadline can decide the verdict after data, and where the registration cuts SPEC requirements without the user.

## Checked and OK

- **r1 numbers quoted correctly** (r1 result note): in-app 44/47, 0 wrong, mains 28/31, follow-ups 16/16; bare HIGH 28/31 0 wrong, LOW 28/31 1 wrong (RH19); captured-high UNUSABLE; shadow first token p50 3903 / p90 4914 (n 47); Live first p50 1572; HARD misrouted 4/27 (RH04 RH05 RH07 RH08); EASY 17/20; router down 0.01 min.
- **Grader noise** ±2 matches bench C (round 1 [38,40,40], round 2 and r3 [39,39,40]); L3 tolerance 200 ms matches A1 §2.2.
- **Hashes verified:** launcher `045dceac…`, `guard-b1.mjs` `8678a534…`, `b1-proofs.mjs` `7624761e…`, `check-smoke-cues.mjs` `c4b6a970…`, `launch-grader-rd.mjs` `edfef2aa…`, `rd-grader-dispatch.txt` `ad35cdef…`. The launcher sets arms `high,low,captured-high`, clears the drill and starts `observe-session.ps1`.
- **Instruments exist:** `router-hour-read.mjs` prints `SPEED shadow_first_token q_src=all` and both `SAFETY` lines; `check-smoke-cues` v5; `cuecheck.mjs`; `read-smoke-b1.mjs` OBS row; `ear-gap3.cjs`. Two are still to be built (`launch-grader-b1.mjs`, `score-b1.mjs`). Both are specified, and must be calibrated by breaking each bar and Opus-reviewed before any grader runs. Acceptable.
- **Verdict logic:** the order VOID → FAIL → PASS → INCONCLUSIVE ("anything else") makes the four verdicts mutually exclusive and covers every case, except for R4 below.
- **"Grade the bare arms":** honoured. `high` and `low` are graded and reported, and a deferred arm is still graded after the reset.
- **Latency cannot FAIL on its own:** justified (a free-tier day effect).

## Required

**R1. L14, L35: the user's confirmation can decide the verdict after data.** Three VOID lines turn on what the user says in chat: OBS, "not quiet" and "typed/clicked". The file does not say *when* they are asked, *what* is asked, or *what counts*. If the user is asked after a reader, scorer or grade has been seen, a bad result can become a VOID. The fix:
- **When:** the controller asks a fixed question set right after playback ends, **before opening any run output** (reader, scorer, grades).
- **What:**
  - did the overlay show answers on your desktop for the whole playback (yes / no / from–to times)?
  - was the machine quiet from T−15 to the end (yes / no, and what)?
  - did you type into or click the app (yes / no)?
- **What counts:** "showed answers" = the overlay was visible and updating for every question. A gap with clock times counts as not met.
- **Recording:** the answers are quoted verbatim in the result note. No later report changes the verdict.
- **No answer:** if the user does not answer within N h (name N), the run is VOID.

**R2. L62–66, L113: SPEC requirements are cut without the user's sign-off.**
- These four are cut:
  - SPEC §10 requires the per-id twins and grading of the in-app cue blocks.
  - A1 §4 item 1 also requires the twins.
  - A1 §4 item 3 requires the cue blocks graded.
  - The user's rule "grade a feature's own output" (2026-10-02) asks for the cue grading.
- The blind L/S export is also cut. It was r1's Live-safety instrument.
- Stating these cuts before data is necessary, but it is not enough: the user approved the SPEC (ruling 5), and a registration cannot waive the SPEC by itself.
- **Fix:** get the user's explicit yes in chat to all three cuts before arming, and record it as USER-RULINGS item 9 (one line each).

**R3. L47, L61–62, L67, L71: the grading budget is counted in sessions, with no measured cost.**
- There is no measured %-of-weekly-usage per `claude -p` session. AGENDA and the cue-grader review give none.
- The same ~8% must also pay for:
  - deriving and calibrating `launch-grader-b1` and `score-b1`;
  - their Opus reviews (L71);
  - this review.
- So "≤ 8 sessions" is not shown to fit. The fix:
  - (a) read the usage % before and after the first gating grader, and use that as the measured per-session cost;
  - (b) add a stop rule: launch a reported arm only if the remaining usage is at least 2 × that cost; otherwise defer it to after the Mon 16:00 reset;
  - (c) if the flight lands before the reset, say so outright: the reported arms are graded after the reset by default.

**R4. L17 vs L62: "gating grading incomplete" has no deadline.** L62 says the verdict "waits for both gating graders". L17 calls incomplete gating grading INCONCLUSIVE. Nothing says when waiting stops, so the verdict can stay undefined, or the end of the wait can be chosen after data. Fix: name a cut-off. For example, "both gating graders complete, pinned and memory ABSENT within 2 attempts each, and by <date/time>; otherwise INCONCLUSIVE".

## Minor

- **M1 (L20, L28):**
  - The ±2 band is **grader-only** noise: the same answers re-graded. A live re-fly also re-generates the answers, so sampling noise is not in the band.
  - A score of ≤ 39, or a single wrong answer, can therefore come from sampling alone. On r1, bare LOW had 1 wrong where in-app had 0.
  - Change the FAIL meaning from "the bundle regressed" to "below r1 beyond grader noise".
  - Require the FAIL report to set the same-day bare arms beside it, as §5 already reports them.
- **M2 (L30):** A1 §4 item 2 says "pipeline-shown answers" and "first-word / TTFT". Bar 3 uses every in-hour decision, shown and shadow, and TTFT only. That is defensible (n 47, and the same quantity as r1), but it should be stated as a deviation.
- **M3 (L31, L70):** name the instrument that recomputes the gate: `B1\gate-heard.mjs`, with its sha. Also name where the counts "47/47 on first dispatch", "doubles" and "failed answers" come from: the reader or the `read-smoke-b1` S-H row form.
- **M4 (L77):** the registration call is `register-b1.ps1 -Kind flight -Which all -T 'yyyy-MM-dd HH:mm'` (register-b1.ps1:7), not `-Which flight`.
- **M5 (L34):** r1's harness gate counted "1 doubles (46 answered of 47 heard)" (r1 result:147). Confirm that r1 itself meets bar 5's "47/47, a shown answer on the first dispatch", or the reference is stricter than the baseline.
- **M6 (L79, L43):** HEAD is pinned at 9d5bd9e, and peer sessions commit to MAIN. Tell the user to freeze MAIN for the window: any commit before T makes the guard refuse, and the window becomes a retry.
- **M7 (the user will watch; nothing in the file prepares them).** Add a short watch sheet:
  - **Timing:** playback starts at about T + preflight; ~19.3 min; 47 questions at 20 s gaps.
  - **What normal looks like:**
    - Live answers are short and appear in ~1.6 s, on about 21 turns;
    - pipeline answers appear in ~4 s;
    - about 24 answers carry a cue block and about 23 carry none (that is by design).
  - **Hands off:** do not touch the app even if the overlay vanishes; write down the clock time instead.
  - **Aborting:** say how to abort if needed, and that an abort is a VOID retry.
  - **Status of the user's notes:** they are reported. They gate only through the R1 questions.

## Not shown

- The derived scorer and grader launcher do not exist yet, so their calibration was not checked.
- The `score-b1` bar logic was not compared to `score-rd` line by line.
- `observe-session.ps1` and `gate-heard.mjs` were not run.
- The quota-headroom figure (`NATIVELY_B1_EXTRA_REQUESTS=150`) was not re-derived.
