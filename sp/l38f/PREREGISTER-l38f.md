# Pre-registration: L38F, the Live router probe on follow-ups (a spike: reported, never a ship decision)

Written 2026-10-01, 15:41 local, before any Live call and before any clip was rendered. The user asked (15:3x)
whether an easy follow-up is a problem for 3.8 Live, then asked to run "the continuous-session router probe now".

## The question

When bare `gemini-3.8-live` hears a follow-up in the SAME session as its parent question, does it
(a) answer, in one correct line, an easy follow-up that needs only the earlier QUESTION, and
(b) say "hard" for a short follow-up that depends on the candidate's ANSWER, which Live never hears?

(b) is the safety question: in the app Live hears only the interviewer's audio and takes no text, so it cannot know
what the candidate or the pipeline said.

## Method

- **Harness:** `run.mjs` = `l38r/run.mjs` with only these changes: one Live session per CHAIN of two clips (parent,
  then follow-up), the follow-up played after the parent's turn has gone quiet (the same wait rule as L38R: 6 s
  quiet after a completed turn, 30 s with no output = nothing, cap 90 s); one retry per chain on an abnormal close
  before the follow-up's `generationComplete` (the failed attempt kept as `<id>~a1`); the live-mode block below;
  all clips from `l38f\clips`. Model bare (no thinking), AUDIO output with output transcription, as L38R/L20c.
- **System prompt:** as L38R: the app's captured s50k system prompt for S1Q08 + that pair's CONTEXT block + the
  live-mode block. The block differs from L38R's only in the follow-up sentence, which now draws the line under test:
  answer a follow-up in one line when it needs only the earlier question you heard; say "hard" when it is about the
  candidate's own answer, approach, experience or choice, because you never hear the candidate. The exact text is
  `LIVE_MODE` in `run.mjs` and is saved in every run file.
- **Items (24 clips, 12 chains, `items.json`), new text, rendered with scenario50's local voice and settings
  (`make-clips.mjs`, Windows SAPI Microsoft David Desktop, 24 kHz mono) into `l38f\clips`:**
  - Q chains (6): an easy one-line parent, then an elliptical follow-up answerable from the parent question alone
    (QP1–QP6, QF1–QF6). Each Q item has a fixed answer term (`read.mjs` TERMS).
  - A chains (6): a hard open parent, then a short follow-up about the candidate's answer or experience
    (AP1–AP6, AF1–AF6). The expected reply to both is "hard".
  - Interleaved Q1, A1, Q2, A2, … .
- **Reps:** 2, back to back, the same afternoon.
- **Extraction:** `et10/et-extract.mjs` unchanged; `ttftMs` = first output transcription after the clip's end.
- **Reader:** `read.mjs`, calibrated before any real reading on a made-up answers file with known counts
  (`cal-read.mjs`). Classes as L38R: routed (≤ 12 words, not "hard", not an apology), hard, nothing, apology, long
  (> 12 words), not played.

## Read in advance (bars for "let the design answer question-based follow-ups"; none is a ship gate)

All of these, in EACH rep:
1. QF routed with a line carrying the answer term: at least 5 of 6;
2. AF answered (routed or long) instead of "hard" or nothing: at most 1 of 6;
3. holes (nothing or apology) on QF: at most 1;
4. first word p50 over routed QF answers ≤ 2.5 s (pooled over both reps).

Reported, not bars: the parents' routing (QP expected routed, AP expected "hard"), every QF/AF line, abnormal closes.
An AF answered after its AP was itself answered is reported as such (Live then has its own answer in context).

All bars met: the design spec (after Friday's validation hour) may let Live answer question-based follow-ups.
Any bar missed: follow-ups stay on the pipeline in the design; the answer-dependent risk is recorded.

## Not covered

- Long gaps: the follow-up comes seconds after the parent, not the 150–160 s of the rosters; other questions in
  between; a session reset by a quota close (the app starts a fresh session then); the ear and routing roles in one
  prompt; the in-app path and latency; noise; Live's other hours; real roster follow-ups; how often real interviews
  ask easy follow-ups. holdout40 is never read.

## Day and constraints

- Live quota is separate from the lite models'; the next scheduled task is `Natively-probe-live38` at 20:00; these
  calls end well before it. No build, test or type check runs beside the calls. Nothing in MAIN or the worktree is
  written.

## Amendment, 2026-10-01 15:42, before any Live call (runs/ empty)

The user asked why the existing question sets are not used. All 20 scenario50 follow-ups are multi-part explanation questions, none easy, so the Q and A chains stay. Added as a REPORTED control, not a bar: four real scenario50 pairs with their existing clips (S1Q03/F, S2Q04/F, S1Q10/F, S2Q09/F; scenario50-tts-local), interleaved after every third chain (16 chains). Expected: both the parent and the follow-up get "hard". Bars 1-4 unchanged.

## Amendment, 2026-10-01 15:45, during rep 1, before any reading through read.mjs

Live's output transcript spells big-O in words ("Order of one", "Order of n", seen on the QP1/QF1 console lines while watching progress). The registered answer terms accept "O(1)", "O of one" and "constant", but not "order of". read.mjs TERMS now also accept "order of one/1" (QP1) and "order of n" not followed by "log" (QF1, QF4). ORIGINAL_TERMS keeps the registered ones, and the reader prints both counts; bar 1 is read on the amended terms, the registered-terms count reported beside it. Calibrated (cal-read.mjs: an "order of n log n" line does not carry).

## Amendment, 2026-10-01 16:00, after rep 1 (unread) and part of rep 2 (unread)

Rep 2 died at chain 7 (AP3, AF3): the first attempt closed with 1006 during AF3 (no output in 16.8 s), the retry's connect rejected (1006, no setup), and the harness had no handling for a failed connect, so the process exited (code 13, an unsettled await). l38f-r2.json holds chains 1-6 complete. Fix: a connect that rejects or does not settle in 15 s is recorded as an abnormal close (connectFailed). Rep 2 resumes in a fresh process from chain 7 (run.mjs --rep 2 --from 7 -> l38f-r2-from7.json); since every chain is its own session, this changes nothing a chain sees. Chain 7 in the resume counts as its retry (the failed connect gave it no session). Rep 2's answers = chains 1-6 from l38f-r2.json + chains 7-16 from the resume. No reading of either rep before this amendment.

Note, 2026-10-01 16:05: the user confirmed a local internet disconnect around 15:58. The 1006 close at 15:58:28 (AF3) and the failed reconnect at 15:58:52 are attributed to it, not to Live. The 1011 at 16:02:20 (AP4, resumed run) is Google's internal error.
