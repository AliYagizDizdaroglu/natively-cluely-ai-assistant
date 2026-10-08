# L20d result, 2026-10-03: STOP — the short Live instruction did not close the gap

Registration: `passes/PREREGISTER-l20d.md` (commit c5d69f4, before any L20d audio; amendments 1-12 before the first
Live call; amendment 1 = the user's "A, keep both"). The user reopened L20c on 2026-10-02 ("start with this now").

- **Verdict: STOP** (clauses 1 and 2 fail). New Live 0.568 against the app's 0.696 (bar 0.646); new Live's worst
  rep 0.539 against the app's worst sample 0.553. Safety (0 consensus-wrong), reliability (111/114) and speed
  (first word p50 1.0 s, p90 1.7 s) pass. The answerer is closed again; reopening is the user's decision.
- **The instruction did not help:** within this batch new Live − 29 Sep's Live (long prompt) = −0.036.
- **What changed instead:** thought tokens per answer p50 20 (L20c: 91–952), first word 1.0 s (L20c: 1.8 s), words
  per answer still short (58–65 against the app's 76–83). The short prompt cut Live's thinking and did not lengthen
  its answers; this test cannot separate the instruction's wording from the thinking it no longer triggers.
- **Where Live still beats the app on these items:** S1Q04F (new Live 3/3 reps acceptable, app 0/4: the follow-up
  whose parent the app evicts) and S2Q02; where it loses: S1Q02, S1Q05, S1Q05F, S1Q07, S1Q10, S2Q01.

Run: pre-flight 5/5, no abnormal close (21:45Z); r1 21:45Z, r2 22:13Z, r3 22:43Z (UTC), 0 abnormal sessions of 57,
0 retries, 0 quota closes, 0 slow feed. Extraction filter sha256 42d9bc42dbd17870 (the registered one). Grading:
373 answers in 4 packets, eight claude-opus-5-5 graders (model read from every transcript; 0 mentions of another
grader's verdicts or of the key), agreement on acceptable 333/373. score.out.txt sha256 5349a7a3b79eb13d…; the
verdict files are in the scratchpad `l20d/blind/` with the key in `l20d-key/`.

Not shown: one instruction variant only (by design); 38 items detect only large effects (a true ±0.05 can pass or
fail clause 1 by sampling); no candidate speech, TTS voice, one night's free-tier load; the app's comparator is the
2026-09-22 build. Deviation: amendment 12 asked for a `passes/INDEX.md` row; INDEX is tool-generated and holds no
row for L20c or ET38 either, so none was hand-added (the user decides).

## score.mjs output, verbatim

