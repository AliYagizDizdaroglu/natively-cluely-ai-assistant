# Amendment A7 to PREREGISTER-router40.md: A5-RECHECK's m1, m4, m5, m7 (pre-data)

Written **2026-10-05, begun 21:50 TST by `date`** (Opus, the registration's author). **No router40 model call has
been made; no datum exists.** Earlier files are unedited. Precedence: **A7 > A6 > A5 > … > the registration**.
Read as: `A5-RECHECK.md` (APPROVE, 7 Minor) `5640ec5563dfac88c9593ebff7cd42f85b3ace0de1e501eb26cc883b60a9a620`;
`AMENDMENT-A6.md` `c744a23591045763f643acbf668b72a6725f39ba2776e07dca1ddf3082bc8d8c` (seal `fb32a0a0…da4e`).

| item | ruling |
|---|---|
| **m1** | L's **current-item** estimate in A5.2 becomes **290 s** (3 attempts × 90 s abort + 2 × 8 s backoff ≈ 286 s), replacing 120 s; later items stay 40 s each. P9/P4 cases that pass `est 120 s` for L read 290 s (e.g. "`--arm L --now 2026-10-05T23:14`, est 290 s → FAIL"; L's start check at 22:00 needs 290 + 46 × 40 = 2,130 s ≈ 35.5 min) |
| **m4** | **Sequential, never concurrent:** R smoke (C02) → R full → L. A5.1's concurrency and its narrowed same-piece guard are withdrawn; A3.4 m6's guard (no other router40 harness process, own pid excluded) is in force again for R, L and grading, and A5.6's "m6 narrowed" P9 cases are replaced by A3's (`--arm R` with a `lite-l.mjs` process → FAIL; `--arm L` with a `run-r.mjs` process → FAIL). Reason: neither arm's latency (R's Live first text, L's TTFT, the two terms of `lead`) is measured during the other's traffic. **Time budget at LOW:** smoke ≈ 4 min; R full realistic ≈ 26.9 min (worst-case first chain + realistic rest is the start check); L's start check ≈ 35.5 min (m1), its realistic run ≈ 10 min. From a 22:00 start: smoke to ≈ 22:04, R to ≈ 22:31, L's start check passes until ≈ 22:39 and L ends ≈ 22:41–22:45, before 23:15. If R runs long, the guard stops it: L does not start once now + 35.5 min ≥ min(23:15, T_any − 30 min), and that arm is INCOMPLETE (registration §7 row 1); nothing resumes without a dated amendment |
| **m5** | **Grading is all-or-nothing per night:** it runs tonight only if, before the first launch, now + 10 × 25 min (8 graders + 2 classifiers, serial under the same-harness guard) < min(23:15, T_any − 30 min); otherwise **all 10 launches run tomorrow from 2026-10-06 10:00** under A2/A3's `grade` rules. The blind batch is never split across days. (At the times above it cannot fit tonight, so grading is expected tomorrow.) P9 case: `--arm grade --now 2026-10-05T22:30`, both arms complete → FAIL (needs 250 min); A5.6's "22:30 … → PASS" grade case is replaced by this one |
| **m7** | A line that contains `TONIGHT` but does not begin (trimmed) with `TONIGHT ` is neither the tonight line nor a near miss. P9 cases: the exact tonight line + a ruling line with `TONIGHT` mid-line → **PASS** (one tonight line counted); a file with only a mid-line `TONIGHT` and no exact tonight line → **FAIL** (not counted) |
| m2, m3, m6 | **recorded, not adopted:** m2 (a Running task is caught only between items/chains; no mid-item abort); m3 (`readTasks()` can fail open if the cmdlet errors silently, or on an on-demand task with no NextRunTime; observed working, 43 tasks, at 21:48); m6 (ruling times: U2 21:41, U3 21:43, U4 21:47 in `USER-RULINGS.txt`, against "~21:45" / "~21:50" in A5/A6; content matches) |

**Not covered:** the A5.6/A6/A7 harness changes and cases must be built and pass before the first call; L's 40 s per
later item and R's 25 s per turn remain unmeasured estimates.
sha256 (of every byte above this line): d4b55a66681dd622081763bb3bb2aa0ee0078a886d1cdd1812435a537ce6e13c
