# Pre-registration: L38H, 3.8 Live as router with 3.8 Flash on the hard path (a spike; never a ship decision)

Written 2026-10-01 ~17:35 local, before any call. The user asked (17:3x) to test "3.8 Live on the route mode: it
answers easy questions itself and passes the harder ones to Flash 3.8", monitoring correctness and latency, using
today's unused 3.8 Flash free quota. This moves part of the agenda's "3.8 Flash bench only after cue mode is
confirmed" ahead by the user's decision; it changes nothing that flies Friday.

## The question

In one window: (a) does bare 3.8 Live still route as L38R did (one-liners right, "hard" otherwise); (b) on the
questions it passes on, how does `gemini-3.8-flash` answer, against `gemini-3.5-flash-lite` HIGH (the app's hedge
front) on the SAME captured prompt, seconds apart, for correctness and for time to first token?

## Method

- **Router:** `l38r/run.mjs --rep 3` unchanged (L38R's routing block, 22 items, one Live session per item, clips as
  L38R), read by `l38r/read.mjs` (calibrated). It runs AFTER the hard-path calls.
- **Hard path, 10 ids** (L38R's hard set: S1Q02, S1Q02F, S1Q04, S1Q04F, S1Q05, S1Q05F, S1Q07, S1Q07F, S2Q02, S2Q02F):
  each asked of BOTH models with s50m's captured prompt (`interview60.prompts.json`, system + user, the app's bytes
  for the hour that flew 3.5-lite HIGH), back to back, the order alternating by id (3.8 Flash first on even index).
  3.8 Flash at its default thinking (no thinkingConfig, as every earlier Flash arm); 3.5-lite at thinkingLevel HIGH.
  Request and filter chain: `followup-questions-run.mjs`'s `answerStreamedGemini` (streaming, the shipped filters
  from MAIN's dist). **One try per call, no retries** (free tier: 20 per day for 3.8 Flash); an error is a hole,
  reported. Every hard id gets both calls whatever Live routes, so the quality comparison is complete.
- **Simple items Live marks "hard":** each also gets one 3.8 Flash call (its plain question text as the user turn
  under the same system prompt), reported only. Budget: 10 + at most 10 = 20.
- **Grading:** the 20 hard-path answers in one blind file (model labels hidden, shuffled, seeded), graded by two
  Opus agents (`claude-opus-5-5`, verified from transcripts) with the frozen rubric `interview60.grader-prompt.md`,
  acceptable = correctness 2, on_topic 2, delivery ≥ 1; consensus = both graders.
- **Latency:** Live first word after clip end (as L38R); each model's TTFT from request (offline; the app adds its
  gate, about 0.6 s, to both equally).

## Reported (descriptive; read in advance, nothing ships)

- Router: routed / hard / misroutes, first line carries the answer, first word p50 (as L38R).
- Hard path per model: consensus acceptable of 10, wrong, holes; TTFT p50 / p90 and thoughts; words p50.
- Paired: ids where one model is acceptable and the other not.
- The composed system: per item the shown answer is Live's line if Live routed it, else the hard-path model's
  answer; acceptable counts for "Live + 3.8 Flash" and "Live + 3.5-lite HIGH", and time to first text.
- Read in advance: 3.8 Flash is worth a proper bench on the hard path only if its consensus acceptable is at least
  2 above 3.5-lite HIGH's on these 10 AND its TTFT p50 is within 3 s of 3.5-lite's; otherwise the hard path stays on
  3.5-lite HIGH. n = 10 is a spike: a difference under 2 is noise.

## Not covered

One rep; 10 hard items; free-tier latency (paid-tier queueing differs); the in-app path; holdout40 never read.

## Day and constraints

Free 3.8 Flash quota (20/day, unused today); 3.5-lite today ~150 of 500 used, +10 here; Live quota separate; ends
well before the 20:00 scheduled Live probe; no build or test beside the calls; nothing in MAIN or the worktree is
written.

## Amendment, 2026-10-01 17:37, after window 1, before any reading or grading

Window 1 (17:3x): all 10 gemini-3.8-flash calls returned HTTP 503 (one try each, no retry); all 10 3.5-lite HIGH calls answered. Nothing can be compared. The hard path re-runs ONCE in a later window (after the 21:00 prestart, outside the 20:00-20:20 scheduled probe), BOTH models again so pairs stay seconds apart; window 1's file is kept as runs/hard.window1-1738.json and is not graded (its 3.5-lite answers are reported as availability only). The Live router rep runs right after that window. If window 2 also returns 503 on 3.8 Flash, the spike ends there as 'not measurable on the free tier today'. Up to 10 further 3.8-flash calls are possible if 503s counted against the 20/day cap; unknown.
Note 17:59: the user asked to re-run now; window 2 starts now instead of after 21:00 (timing only, before any data of window 2).

## Outcome, 2026-10-01 18:04: ENDED, not measurable on the free tier today (per the 17:37 amendment)

Window 2 (17:59-18:0x): gemini-3.8-flash answered 2 of 10 (S1Q02F first token 55.1 s, S1Q05 9.8 s), 8 HTTP 503. gemini-3.5-flash-lite HIGH answered 10 of 10, first token 4.2-26.3 s (median ~10 s; window 1 at 17:3x was 3.5-5.3 s): Google was overloaded. Two 3.8 Flash answers compare nothing; nothing graded; the Live router rep not run. 3.8 Flash requests today: 20 sent (18 refused). Next: the paid-key 3.8 Flash bench as the agenda has it, or a free-tier retry early on a quieter quota day.

## Variant B, 2026-10-01 18:19, the user's request after the 3.8 Flash outcome: Live router + 3.5-lite HIGH

The composed system is measured with gemini-3.5-flash-lite HIGH on the hard path (the app's hedge front). Order, all in one window: (1) the Live router rep (l38r/run.mjs --rep 3, read by l38r/read.mjs); (2) 3.5-lite HIGH on the 10 hard ids with s50m's captured prompts (hard.mjs with --lite-only, one try per call) and on any simple id Live marked hard or left unanswered (its question under s50m S1Q08's system, as --extra); (3) two Opus graders (claude-opus-5-5, verified) grade the 3.5-lite answers blind with the frozen rubric. Reported: router counts and first line correctness (as L38R); hard-path consensus acceptable of 10, wrong, holes, TTFT p50/p90; the composed system per item (Live line if routed, else the 3.5-lite answer): correct count and time to first text (Live first word after the question; 3.5-lite TTFT + the app gate ~0.6 s). Descriptive; nothing ships. Windows 1-2's 3.5-lite answers are not graded (an overloaded window).

## Variant B result, 2026-10-01 18:33
Router (l38r rep 3, 18:19-18:27): simple 10/12 routed, 10/10 carry the answer, first word p50 0.8 s p90 1.2 s; X3 and F4 NOTHING; hard 10/10 'hard', 0 misroutes. 3.5-lite HIGH (18:29-18:31): hard 10/10 answered, TTFT p50 4.4 s p90 16.1 s; X3 and F4 answered correctly (3.2 s, 3.0 s). Graders (2 Opus, frozen rubric): acceptable g1 5/10, g2 6/10, consensus 4/10 (S1Q05, S1Q07, S1Q07F, S2Q02F), wrong 0; split S1Q02, S1Q04F, S1Q05F. Composed system: simple 12/12 right (10 by Live at ~0.8 s, 2 by 3.5-lite at ~3 s + gate); hard 4-6/10 acceptable, 0 wrong, at ~4.4 s p50 + gate. Hard-path quality is 3.5-lite HIGH's own (the router adds nothing on hard items); this hour's 4-6 of 10 sits below L20c's 3.5 samples on these ten (0.60-0.75), a separate grading session and n=10.

## Variant C, 2026-10-01 18:45, the user's request: gemini-3.7-flash on the hard path
gemini-3.7-flash (default thinking, as every earlier Flash arm) on the 10 hard ids with s50m's captured prompts, one try per call (free tier 20/day; none used today). Graded in ONE fresh blind batch with variant B's 3.5-lite HIGH answers (20 answers, model hidden, shuffled), by two new Opus graders with the frozen grader prompt; variant B's first grading stays recorded. Reported: consensus acceptable of 10 per model, wrong, holes, TTFT p50/p90, paired ids. Read in advance as before: 3.7 Flash merits a bench only if consensus acceptable >= 3.5-lite + 2 of 10 AND TTFT p50 within 3 s; n = 10 is a spike.

## Variant C result, 2026-10-01 18:47: NOT MEASURABLE on the free tier
gemini-3.7-flash answered 3 of 10 (S1Q02 first token 10.1 s, S1Q04 24.1 s, S1Q05F 4.7 s); 5 HTTP 503, 2 HTTP 429 (S1Q07F, S2Q02F... order: S1Q07F and S2Q02). With 7 holes no comparison with 3.5-lite HIGH (10 of 10) can be read; the blind batch was not graded (3 against 3 compares nothing). 3.7-flash requests today: 10.
