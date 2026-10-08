# Final report draft (fill run-5 numbers; keep to the writing rules)

## Lead (outcome)
- Gate verdict for run 5: <PASSED | FAILED on rows>. Before/after table: <8 rows>.
- Comparability caveats stated first: STT provider (Deepgram before vs Groq REST after); run 5's detection model override (gpt-oss-120b) because gpt-oss-20b's 200k tokens/day was spent by the day's runs; the app measured = HEAD + the user's uncommitted verbal work.

## What shipped (34 commits on fix/coding-style-suffix-all-gemini, f0f98f5..47d959f)
Enablers: Live mode persisted + restored (c97eb85, ae62861); harness relaunches the app, probe, gate, snapshots (ba9ebff, db71544, 8dc1e6f); socket summary line (32e3a37).
App fixes: Auto answers the first detection once, cross-detector dedup with anchors + answered mark (746894f, 26ddbc9); Live reconcile vs transcript; hold for unverifiable Live detections, exactly once (b1b3f81, 818a70f); fragment guard + degraded-mode detection when Groq is unavailable (99d296f→a7bcb26, 47d959f); deduper content-word rule across detectors within 5 s (bda63da); classifier on the interviewer's turn, whole words (705f806, 427253c); provider cooldown (c904d8f); scenario merge (9d0bdd7, 1fd115c); coding advisory (a5ae834); model sentinel + first-token/head taps (ccf7da6, 821d7c2); 60-word target (d6ede4d).
Harness/metrics: metrics module, claim-once, delivered, caught, cue answers, heuristic chips, synthetic tests (19ed1c8…812a4b8); iteration docs (dd2858b, 3e8ff85).

## Runs
- before 2026-09-02 15:47 UTC (Deepgram): 26/52 answered, 51 heard, 12 doubles, 25 coaching, 4 CODING, 299 socket closes.
- run 1 04:10 UTC: Gemini free tier walled (34/36 streams failed) — detection rows valid.
- run 2 07:36 UTC: 52/52 delivered; 1 double (STT split W10); 3 cue answers; TTFT p90 5.0 s.
- run 3 09:07 UTC: 50/52 heard (Groq detector 75 % 429-blind + Live reconnect gaps); everything else PASS; TTFT p90 3.3 s.
- run 4 aborted (detector 100 % blind).
- run 5 10:44 UTC: <numbers>.

## Findings that changed the plan (short)
- Gemini free tier: 500 req/model/day, resets 07:00 UTC; one 200 after idle is not headroom.
- Groq detection: 200k tokens/day ≈ 3 hands-free hours; NATIVELY_QUESTION_DETECTION_MODEL switches buckets.
- Deepgram socket flap unmeasured (user on Groq REST); Task 3 Step 6/Task 4 deferred.
- The anchor field is the STT sentence, not the Live text (my misread → R42 withdrawn).
- Screenshot cues get verbal answers (product follow-up: a take-a-screenshot chip).
- Answer label shows "…" on HEAD alone until the user's subscription lands (R22).

## Residual risks / deferred
- Template questions from two detectors within 5 s merge; heuristic chips during detector outages; six pre-existing electron type errors; 16 minors from the final review (list the important ones).

## User actions
- Rotate the Gemini key in ce9ff83/479375a; commit or discard the uncommitted work (list files) incl. the two-line patch to verbalFallback.test.ts; decide Deepgram vs Groq; decide the cue behaviour; consider billing tiers if hands-free hours/day matter.

## Links
- Artifact "Natively Flight Test" (republished); report page path; iteration docs; rulings doc (to be committed).
