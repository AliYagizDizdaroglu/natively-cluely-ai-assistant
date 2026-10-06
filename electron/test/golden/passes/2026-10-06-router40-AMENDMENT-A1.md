# Amendment A1 to PREREGISTER-router40.md: the review's fixes, the rulings, the day split (pre-data)

Written **2026-10-05, begun 17:44 TST by `date`** (Opus, the registration's author). **No router40 model call has been
made; no datum exists.** The registration is unedited. Precedence: **A1 > the registration**; everything A1 does not
name stands. Names as in the registration (`SP`, `R40`, `L40`, `MAIN`, `FR`).

**Read as (sha256):**
- `R40\PREREGISTER-router40.md`: whole file `5b7daaee1ed6ce6661f1b2be4b00b581e8862d72ece6a463dc6d4f919b446057`;
  its seal (every byte above the seal line) `2d38dd89a1bc0fd4e97943cbda07291939afd555db85c31472462bd51860c16f`.
- `R40\PREREG-REVIEW.md` (APPROVE WITH FIXES): `5eed93a224f7946038c0622a827505bc3fce6ed084b1cde610131194f56c0457`.
- `R40\USER-RULINGS.txt` (17:32): `6dfc40f6feda627e6b7c7199888df5410ad01c3567b0fc394379b2f2dc1928b8`.

**Inputs besides the review:**
- **U1, the user (USER-RULINGS.txt, 17:32):** D1 = B; D3 = run L today under the cap; D2 and D4 left to the controller.
- **K1, the controller's ruling (relayed ~17:44, resolves C2 and I5):** L (3.1-lite) runs **tomorrow, 2026-10-06, after
  the 10:00 reset**, not today. R's Live sessions (no lite quota) may run tonight only if they finish ≥ 30 min before
  the flight's start T, read from the scheduled task `Natively-flight-eq`'s NextRunTime **before every chain**, and
  are refused otherwise; else R runs tomorrow too. R is assembled after L exists; grading is one blind batch after
  both.
- **Observed 17:4x (names and states only):** `Natively-smoke-eq` is **Running**; no task named `Natively-flight-eq`
  exists yet. By A1.6's guard, R cannot start while this holds.

## 0. Resolutions

| item | resolution | where |
|---|---|---|
| **C1** variant A pre-judges reading 4; wrong justification | ADOPTED with U1: **B is the routing block**; the sentence is corrected; B's expectation added | A1.1 |
| **C2** quota unit at arming | RESOLVED by K1: **no router40 lite call on the 2026-10-05 quota day**, so tonight's arming read is untouched in any unit. Tomorrow's cap is in A1.3 | A1.2, A1.3 |
| **I1** builder check mis-aimed; PREVIOUS RESPONSES branch never exercised | ADOPTED: a multi-entry builder; the check removes ONLY the intent element; verified 17:4x (below) | A1.4 |
| **I2** cut / early / late "hard" | ADOPTED as worded (two new classes, `malformed` extended, 17 synthetic cases) | A1.5 |
| **I3** a real known answer for the reader | ADOPTED as worded | A1.5, P3 |
| **I4** counter refuses at 60, not CAP' | ADOPTED as worded (`--cap` required, ≤ 60, recorded, never raised) | A1.3, P4 |
| **I5** guards only at piece start; T can land early | ADOPTED with K1: deadline and machine checks before every L item and every R chain | A1.6 |
| **I6** price of row 2's wrong clause | ADOPTED as worded | A1.7 |
| **m1** clock sentence | ADOPTED as worded | A1.7 |
| **m2** L TTFT expectation | ADOPTED | A1.7 |
| **m3** third-in-chain context; composed-R parents | ADOPTED: the first is fixed by A1.4's chain history (RH11, RH14 now carry the turn between); the second is named in "not covered" | A1.4, A1.9 |
| **m4** P4 seams | ADOPTED as worded (modelVersion STOP, fake-fetch refusal, O_EXCL lock, resume) | A1.3, P4 |
| **m5** definition of U | ADOPTED as worded | A1.3 |
| **m6** `--classify` uncalibrated | ADOPTED: dry-run known answer + P7 audit on its three paths; built after the flight | P6, P7 |
| **m7** separate slot lock | ADOPTED: P6 refuses while any FR grader slot holds a live pid | P6 |
| **m8** "start by 20:15" | ADOPTED as "finish by 20:30"; moot tonight, since grading waits for L (tomorrow) | A1.6 |
| **m9** divergence from SET-draft §7 | ADOPTED: one sentence | A1.7 |
| **m10** source of the "20 margin" | RULED: the controller's brief of 2026-10-05 (~17:1x), which relayed the user's request ("≥ 372 + 20 margin after the flight's smoke"); A1.3 keeps a 20 margin tomorrow as the author's | A1.3 |
| **D1** | **B** (U1, 17:32) | A1.1 |
| **D2** | **8 sessions** (4 whole-item files × g1/g2), the controller's default (U1) | registration §6.1 stands |
| **D3** | U1 said "yes, today"; **superseded by K1** (L tomorrow, safer for the flight). **The user is to be told.** Consequence: A2.2 of flight-eq stays true for 2026-10-05 (router40 spends 0 lite there) and nothing goes into tonight's arming record from router40 | A1.2 |
| **D4** | deadline follows T: per-chain read of `Natively-flight-eq` tonight, of every `Natively-*` task tomorrow (K1 + I5) | A1.6 |

## A1.1 The routing block is B (C1, U1)

- Registration §3.1 is read with **"BLOCK, variant B (registered default)"** and **"BLOCK, variant A (only if the user
  picks it before any Live call)"**; §11 D1 likewise. The runner runs with `--variant B`; its guard requires
  R_SYSTEM sha256 **`4571f563321f6d9cf738c04b05933016bca9521df5e712142c3472d6009041c5`** (BLOCK_B
  `e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8`). §3.3's too-long gate is **`w` > 80**.
- §3.1's sentence "The routing criterion … is L38R's, unchanged — the class the user named (one part, one fact, stands
  alone)" is replaced by: **"Variant A keeps L38R's class (one fact, a ≤ 5-word answer). The user's 2026-10-03
  definition (SET-draft §1, approved 18:35; AGENDA l.661) widens it to one concept answered in 30–60 words, which
  variant B states."** (My original attribution was wrong.)
- §7 expectations, added: **"Under B, RE18 contains 'your' (B's own hard token) and RE03 names no concept, so
  `EASY_caught` ≤ 18. RE06 (why), RE09/RE20 (when would you) and RE14 (X or Y) are outside B's literal 'what it is /
  does / differs' and may go hard. Expected 13–17."** The variant-A expectation (≈ 6) no longer applies.

## A1.2 The day split (K1) and its consequences

| | tonight, 2026-10-05 | tomorrow, 2026-10-06 (quota day from 10:00) |
|---|---|---|
| **R** (Live, no lite quota) | allowed only under A1.6's per-chain guard (finish ≥ 30 min before `Natively-flight-eq`'s NextRunTime, no `Natively-*` Running, before 20:30); with `Natively-smoke-eq` Running and no flight task registered at 17:4x, it cannot start now | otherwise here, under A1.6's guard |
| **L** (3.1-lite LOW) | **never** (0 lite requests on this quota day) | after 10:00, under A1.3's cap and A1.6's guard |
| **R assembled** | — | after L exists (R's non-`answer` items show L's text) |
| **Grading** (one blind batch, 8 + classifiers) | — | after both arms; never during a flight piece or interleaved with flight graders (P6 lock check) |

Consequences, named:
- **Flight quota:** router40 spends 0 of tonight's 3.1-lite and 3.5-lite; the flight's arming read needs no router40
  term. C2's unit question does not arise tonight.
- **Different days:** A (2026-10-03), R (tonight or tomorrow) and L (tomorrow) are measured on different days and
  times. Live's day-to-day variance and lite's load differ between them; `lead` (L TTFT − R Live first text) mixes two
  days as well as two clocks. Named in "not covered"; no reading changes.
- **The 20:30 deadline** binds only a tonight R run; tomorrow's deadline is A1.6's.
- **If R cannot run tonight** it runs tomorrow under the same files, name `router40-R`; a tonight run stopped by a
  guard is kept as `router40-R-<hhmm>`, never graded, and R is re-run whole.
- **Tomorrow's flight pieces:** the flight's G sitting may move to the 2026-10-06 quota day (flight-eq A2.2 m6), so
  the cap counts the flight's need (A1.3) and the guard refuses while any `Natively-*` task runs (A1.6).

## A1.3 Tomorrow's cap and the counter (C2, I4, m4, m5, m10)

- **CAP' = min(60, 500 − U − F − 20)**, computed by P9 at L's start on 2026-10-06:
  - `U` = the 3.1-lite count since 2026-10-06 07:00Z: `quota-ledger-today.mjs`'s 3.1-lite mentions in the app logs
    (an upper bound on requests) + for every listed answers file outside R40 the entries whose model is 3.1-lite;
    **any other listed file outside R40 → P9 FAILs and asks** (m5). Router40's own `lite-quota.answers.jsonl` is
    excluded from U (it is the counter itself).
  - `F` = the flight's 3.1-lite need still pending on that quota day, **named in writing by the controller** in
    `R40\USER-RULINGS.txt` before L (`6·|G_twin| + 8` if the G sitting moved to this day, plus any hole re-run; 0 if
    nothing is pending). No F line → no L.
  - 20 = the author's margin (m10).
  - L starts only if **CAP' ≥ 52** (47 + 5).
- **`lite-l.mjs --cap <CAP'>` is required** (I4): a missing cap or a cap > 60 → exit 2; the cap is recorded in
  `router40-L.answers.json`; the script refuses at counter lines ≥ that cap; a restart reuses the recorded cap and
  never raises it.
- **Seams (m4):** each response's `modelVersion` is recorded; anything not starting `gemini-3.1-flash-lite` → STOP
  (L INCOMPLETE). A real run refuses when `R40_FAKE_FETCH` or a counter-path override is set. An O_EXCL lock file
  (`runs\lite-l.lock`) stops two processes passing the cap check. A restart is a resume: items with a stored answer
  are skipped, never re-asked.
- The write-ahead counter, its file and the 3-attempt retry rule stand (registration §3.4, §4).

## A1.4 L's prompt builder: multi-entry, with chain history (I1, m3)

- **What S1Q02's 817 chars are** (offsets, measured by me 17:4x, no text printed): `USER QUESTION:\n` ends at
  3562; the **intent element** `<intent_and_shape>\n … </intent_and_shape>\n\n` spans 3562 → 3712 (150 chars; the
  review's 131 is the same element without its 19-char opening-tag line; its inner text is 109 chars); then a
  **3-entry PREVIOUS RESPONSES block** 3712 → 4379 (667 chars; each entry `n. "` + 200 chars + `..."` = 208).
  Registration §3.4's "(DETECTED INTENT + ANSWER SHAPE, 817 chars)" is corrected to this.
- **The builder takes a list:** `build({ previews, lines })` =
  `CONTEXT + "\n\nUSER QUESTION:\n" + [ "PREVIOUS RESPONSES (Avoid Repetition):\n" + previews.map((p, i) => `${i+1}. "${p}"`).join("\n") + "\n\n" ] + "INTERVIEWER JUST SAID:\n" + lines.join("\n") + TRAILER`
  (the bracket only when `previews` is non-empty), each preview = the answer cut to 200 chars + `...` if longer.
- **Known answer, run 17:4x (booleans only):** S1Q02 with ONLY the 150-char intent element removed, its three
  captured previews fed back in captured order and its captured transcript as `lines` → **`true`**; one added space →
  **`false`**; the whole 817 chars removed with no previews → **`true`**. P4 calibration (a) is exactly these three.
- **Follow-ups use the chain's history** (replaces registration §3.4's one-level shape W): for a turn at position
  j > 1 of its chain, `previews` = L's answers to turns 1..j−1 in order, and `lines` = for each earlier turn
  `[INTERVIEWER]: <text>` then `[ASSISTANT]: <L answer, lowercased>`, then `[INTERVIEWER]: <this turn>`. For the 12
  two-turn chains (and RH10, RH13) this equals shape W; RH11 (C13) and RH14 (C18) now also carry the turn between
  (RH10, RH13), as Live heard it (m3). Mains: no previews, one line (as live40, which had no cross-chain memory). An earlier turn with
  no L answer contributes its interviewer line only and no preview; the item is flagged `orphan`.

## A1.5 R's reader (I2, I3)

Registration §3.3, rows in this order (first match wins): `missing`, `silent`, `hard`, `apology`, **`malformed`
(extended)**, **`cut`**, **`early`**, `too-long` (> 80, B), `answer`.
- **`malformed`**, added: "OR the word 'hard' among the last 3 words of T, OR more than one completed turn of which a
  later one starts with 'hard'".
- **`cut`**: the item's last output turn has no turnComplete/generationComplete before itemDone (the cap, or a close
  after post-clip output) → L.
- **`early`**: ≥ 1 word of output transcription before clipEnd → L (a premature answer; live40: 0 of 46).
- **P3 calibration (a)**: the synthetic file grows to **17 cases** (+ a capped turn, an abnormal close after 12 words,
  an early start), each with its expected class; one flipped expectation must be reported.
- **P3 calibration (b), real known answer (I3)**: `read-r.mjs` on `L40\runs\live40-r1.json`'s events with these rules
  and live40's own itemDone → **46 `answer` + RH14 `silent`, 0 malformed, 0 cut, 0 early, max 79 words, and every T
  byte-equal to `live40-r1.answers.json`'s text, 46/46** (prints counts and booleans only).

## A1.6 Guards before every item and chain (I5, K1, m8)

Before every L item and every R chain, the harness re-runs P9's machine checks and refuses (saves, exits, the arm
INCOMPLETE as at a deadline) unless all hold:
- no `Natively-*` scheduled task is Running; no electron.exe or tail.exe;
- `now + est < deadline`, where `est` = for an R chain, its clips' seconds + 90 s per turn + 10 s per gap + 10 s; for
  an L item, 120 s;
- **tonight (2026-10-05, R only):** `deadline = min(20:30, T_flight − 30 min)`, `T_flight` = `Natively-flight-eq`'s
  NextRunTime; **no such task, or no NextRunTime → refuse** (T unknown);
- **tomorrow:** `deadline = T_any − 30 min`, `T_any` = the earliest NextRunTime of any `Natively-*` task (none → no
  time bound from tasks), and L additionally needs A1.3's F line.
Task data is read as names, states and times only (`Get-ScheduledTask` / `Get-ScheduledTaskInfo`).
m8: any grading tonight would have to *finish* by 20:30; moot, since grading waits for L (A1.2).

## A1.7 Readings text (I6, m1, m2, m9)

- **I6**, appended to §7's noise caveat: **"Price of row 2's wrong clause at equal quality: ≈ 12–20 % (k ≈ 15,
  per-item wrong 1–2 %), accepted as the cost of holding wrong strictly; the bar does not move."**
- **m1**, §5's clock sentence becomes: **"the Live clock omits the ≈ 0.69 s tail (favours Live); the lite clock omits
  the gate (≈ 0.6 s) and the whole-turn hold (VAD 1.2 s + hold), which favour the pipeline by more; net, the measured
  lead is close to a lower bound of the in-app lead (not measured)."**
- **m2**, §7's L expectation becomes: **"L TTFT p50 3–9 s (the last 48 measured 3.1-lite LOW TTFTs, fturn arms with
  long captured prompts, had p50 8.6 s; main items here carry shorter prompts). So `lead ≥ 1 s` is likely and the
  coverage clause is the binding one in row 4."**
- **m9**, added to §7: **"SET-draft §7 made false EASY on the 27 HARD turns the primary reading; here only AF answered
  gates directly, because a false EASY on an H or QF item costs only through wrong/acceptable, which rows 2–3 hold.
  False EASY counts are reported per class (§5)."**
- The readings table, its thresholds and its order are unchanged.

## A1.8 Harness pieces (replaces registration §9's table; same files under `R40\`)

Critical path for a tonight R run: P9, P2, P3. For tomorrow: P4. Built later, no Gemini: P5–P8, P1.

| piece | built from | known-answer cases (all must pass before use) |
|---|---|---|
| **P9** `pre-run-r40.mjs` | new | `--now` past the deadline → FAIL; stub tasks with `Natively-x` next run 20:15 → deadline 19:45; stub with no `Natively-flight-eq` (tonight mode) → FAIL; stub with one task Running → FAIL; stub ledger U = 40, F = 0 → CAP' 60 PASS; U = 400, F = 0 → 80, capped to CAP' 60 PASS; U = 420, F = 10 → CAP' 50 FAIL; no F line → FAIL; a listed non-answers file outside R40 → FAIL; a changed §0 hash (temp copy) → FAIL |
| **P2** `run-r.mjs` (+ `mock-session-r.mjs`, `dry-check-r.mjs`) | `L40\run.mjs`, `mock-session.mjs`, `dry-check.mjs` | `--dry --variant B --dry-fail C05`: 47 turns in §5 order, 16 gaps of 10 s, C05 retried once, "hard" items end 6 s after their turn, silent items at 30 s; `--variant A` with B's expected sha (or any mismatch) → exit 2; the per-chain guard: a stub deadline inside the next chain's `est` → no chain starts; 3 consecutive abnormal mock chains → health STOP |
| **P3** `read-r.mjs` (+ `cal-read-r.mjs`) | `l38r\read.mjs` | (a) 17 synthetic cases → 17/17, one flipped expectation reported; (b) live40-r1 real → 46 `answer` + RH14 `silent`, 0 malformed/cut/early, max 79, T byte-equal 46/46 |
| **P4** `lite-l.mjs` | `l38m\pipeline.mjs` `ask()` + `interview60.answers.mjs` filter chain | (a) S1Q02 intent-only removal + 3 previews → `true`; +1 space → `false`; 817 removed, no previews → `true`; (b) stub fetch, `--cap 3`, temp dir → 3 counter lines then `CAP REACHED` exit 3; (c) stub 503, 503, OK → 3 attempts counted, answer kept; (d) stub stream with no finishReason → retried; (e) `--model gemini-3.5-flash-lite` → exit 2, key never read; (f) the file contains no `3.5` (grep 0); (g) `--cap 61` → exit 2; no `--cap` → exit 2; (h) a recorded cap 55 then a restart with `--cap 60` → runs at 55; (i) stub `modelVersion` `gemini-3.5-flash-lite` → STOP; (j) `R40_FAKE_FETCH` set without `--dry`/stub mode → refuse; (k) a held lock file → second process refuses; (l) `--dry`: 16 follow-ups carry PREVIOUS RESPONSES with 1 entry, except RH11 and RH14 with 2; 31 mains carry none |
| **P5** `grade\build-blind-r40.mjs` | `L40\grade\build-blind.mjs` | A's 46 questions equal live40 `pairs.blind-1.json`'s via its key, 46/46; counts per arm equal the run files; no id, arm or class string in any blind file (grep) |
| **P6** `grade\launch-grader-r40.mjs` | FR `launch-grader.mjs` helpers | `--dry-run blind-1.g1`: argv has `--model claude-opus-5-5`, `--tools Read,Write,Edit`, zero `--add-dir`, a fresh cwd outside MAIN/worktree; an existing cwd → REFUSED; a stub FR slot holding a live pid → REFUSED (m7); `--classify c3 --dry-run`: rules = Read TURNS, Read CAL, Edit OUT only, `claude-opus-5-5`, no Bash, no `--add-dir` (m6) |
| **P7** `grade\audit-r40.mjs` | `L40\grade\audit-tools.mjs` + FR `scan` + `h40d-grader-models.mjs` | live40 g1 (`9856e006…`, Bash ×1) → NOT CLEAN; an FR grader session listed clean in `FR\audit-graders.out.txt` → CLEAN; c3/c4 audited against their own three paths |
| **P8** `grade\score-r40.mjs` (+ `cal-score-r40.mjs`) | `L40\grade\score.mjs` | synthetic inputs hitting each §7 row once (INCOMPLETE; NOT SAFE by AF; NOT SAFE by wrong; COSTS QUALITY; BUYS NOTHING by coverage, by lead, by M; CANDIDATE) → each prints its reading |
| **P1** `l38base-dispatch.txt` | registration Appendix B | its 22 cal items, 22/22 per classifier |

## A1.9 "Not covered", added

A, R and L ran on different days (A1.2), so Live variance and lite load differ between arms and inside `lead`; in
composed R, up to 9 follow-ups whose parent Live answered are built on L's parent answer, not the one shown (no
reading depends on it: R and L share those texts); the flight's G sitting may share tomorrow's quota day (F covers it
only as the controller names it).

**Not covered by this amendment:** no piece exists yet, so no calibration in A1.8 has run (only A1.4's builder check
ran, in my scratch script); whether R can run tonight depends on the flight's registration time and its smoke, unknown
at 17:4x; the user has not yet been told that K1 supersedes U1's D3.
sha256 (of every byte above this line): 483c56ccb7758b88104dd406abf6c52f40f85e795d24488c2a3e0e28a7fe3265
