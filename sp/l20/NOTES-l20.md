# L20 — result on the conditions that need no grades (recorded 2026-09-28 before any grading)

**Verdict under PREREGISTER-l20.md: NOT REPLICATED.** Three of the five conditions fail on arithmetic alone, so grades cannot change the verdict.
- **Condition 4, safety: FAIL.** 25 of 60 live38 items have no answer after their one retry.
  - r1: 4 missing (S2Q01, S2Q01F, S2Q08, S2Q08F).
  - r2: 3 missing (S2Q08, S2Q08F, S2Q09F).
  - r3: 18 missing (every item except S1Q02 and S1Q02F).
- **Condition 5, speed: FAIL.** Pooled over the 60 answers, a missing answer counts as no first word.
  - p50 16.8 s, against a 6.8 s bar.
  - p90: no answer, against a 9.4 s bar.
- **Condition 3, band: FAIL.**
  - r3 answered 2 items, so its score is at most 2.
  - Every app sample scored 4.0–5.0 on the hard 10 alone, in both earlier independent batches.
- **Conditions 1–2 (quality)** were not evaluated. The answers are ungraded, because the verdict no longer depends on them.

## What happened: Google-side failures that escalated during the test

Every abnormal close is code 1011, "Internal error encountered.", except one "The service is currently unavailable." (r2 S2Q09, at setup).

| Run | Window | Abnormal sessions | Answered | First word, answered items | Unanswered |
|---|---|---|---|---|---|
| r1 | 16:34 local | 4 of 12 | 16/20 | p50 1.7 s, max 4.6 s | 4 |
| r2 | 16:50 local | 4 of 12, plus a late retry | 17/20 | p50 9.8 s, max 45.3 s | 3 |
| r3 | 17:10 local | 18 of 19 | 2/20 | 37.2 s | 18 |

- Latency degraded with the failures: r1 looks like ET10b's clean run the evening before (p50 1.9 s). r2 and r3 took 10–45 s.
- **S2Q08 failed on all 6 attempts**, including in r1 and r2 when the other items were fine. It never produced a single word. This is probably content-triggered, not only the outage.
  - The question: "Migrate the embedding model without an outage … versioning, backfill, synchronization, quality comparison, cutover, rollback".
- S2Q01 failed 2 of 3 attempts in r1, was answered in r2, and failed in r3.
- No failure produced partial wrong content. Every failure is a dropped connection with no answer or with part of one.

## Harness notes (see amendment 1)

- The runner did not retry a failed setup; that is fixed, and the owed r2 S2Q09 retry was run late.
- r3 was restarted with the fixed runner.
- A missing answer is never sent to the graders.

## What it means for the product question

- The two runs so far disagree:
  - ET10b's single clean run (2026-09-27 19:07 local) showed a quality tie and a 4× faster start.
  - Today, within one hour, the same model lost 42% of its answers and slowed to 10–45 s.
- A live answerer with no always-on text fallback would have left the candidate with nothing on 25 of 60 questions.
- Reliability, not quality or speed, is now the gating question. Answering it needs repeated clean windows, not one more run.
