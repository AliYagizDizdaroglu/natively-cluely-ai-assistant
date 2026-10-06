# Amendment A2 to PREREGISTER-router40.md: A1-RECHECK's fixes and the one-day ruling (pre-data)

Written **2026-10-05, begun 17:55 TST by `date`** (Opus, the registration's author). **No router40 model call has
been made; no datum exists.** The registration and A1 are unedited. Precedence: **A2 > A1 > the registration**;
everything A2 does not name stands. Names as before (`SP`, `R40`, `L40`, `MAIN`, `FR`; `E` = `SP\flight-eq`).

**Read as (sha256, whole file):**
- `PREREGISTER-router40.md` `5b7daaee1ed6ce6661f1b2be4b00b581e8862d72ece6a463dc6d4f919b446057` (seal `2d38dd89…c16f`)
- `AMENDMENT-A1.md` `132739e6e85f657cf9526a30e2e3fb10a241fcaf5c4aa83c3089d8cd1a11f8aa` (seal `483c56cc…3265`)
- `A1-RECHECK.md` (APPROVE WITH FIXES) `559ab9273b2f3ee237acad669f9047c206cd40a869191dd2827d48787b8d6b81`
- `USER-RULINGS.txt` `6dfc40f6feda627e6b7c7199888df5410ad01c3567b0fc394379b2f2dc1928b8`

**K2, the controller's ruling (relayed ~17:55, replaces A1's K1 for timing):** router40 runs **entirely on
2026-10-06**: R (3.8 Live) and L (3.1-lite) both after 10:00, R first or interleaved as the author rules, never
overlapping the flight's post-hour G sitting or any `Natively-*` task. **Nothing of router40 runs tonight.**

**K3, recorded as relayed:** the user was told at **~17:45** that the lite arm moved to tomorrow (A1's D3
supersession). K2 also moves R; telling the user that is the controller's (named in "not covered").

## 0. Resolutions

| item | resolution | where |
|---|---|---|
| **K2** one day | ADOPTED. Order ruled: **R first, then L, sequential, never interleaved**; grading after both | A2.1 |
| **I1** no date gate | ADOPTED as worded, extended to **every arm** (R, L, classifiers, graders): refuse before 2026-10-06 10:00:00 local; U's window must be the 2026-10-06T07:00:00Z day | A2.2 |
| **I2** CAP' not fail-closed | ADOPTED, with the F line's format fixed as ONE line that also carries I4's G-sitting state | A2.3 |
| **I3** per-chain/per-item guards uncalibrated | ADOPTED as worded (P2 and P4 (m)) | A2.7 |
| **I4** G sitting invisible to the guard | ADOPTED as worded, for R, L and grading | A2.4 |
| **I5** reader cases miss two rules; written for A | ADOPTED: **20 cases = 19 + the 80-word boundary**, run with `--variant B` | A2.5 |
| **m1** tonight's deadline ignores other tasks | MOOT by K2 (no tonight rules exist); its process cases (electron.exe, tail.exe) ADOPTED into P9 | A2.4, P9 |
| **m2** expectation text | ADOPTED as worded | A2.6 |
| **m3** F's scope; N to the flight | ADOPTED as worded | A2.3 |
| **m4** which R is graded | ADOPTED as worded | A2.1 |
| **m5** model-id scope | ADOPTED as worded (P4 (f), P2) | A2.7 |
| **m6** timing details | ADOPTED as worded | A2.4 |
| **m7** overnight hash drift | ADOPTED as worded | A2.4 |
| **m8** D3's supersession recorded | ADOPTED: K3 recorded here; before R, `USER-RULINGS.txt` must also hold a dated controller line that the user was told (P9 checks it) | A2.3, P9 |

## A2.1 The day (K2, m4)

- **Withdrawn:** every "tonight" rule — the registration's 20:30 deadline and latest starts (§8), A1.2's tonight
  column and A1.6's tonight bullet, A1's per-chain read of `Natively-flight-eq`. A1.2's table reads: **R, L, R
  assembled and grading all on 2026-10-06, after 10:00.**
- **Order:** R (the 31 chains, after its C02 smoke), then L, then the §6.2 classifiers and the 8 grader sessions.
  Sequential: no piece starts while another router40 piece runs. Why R first: R needs no quota gate, so a slow F line
  (A2.3) does not block it; L follows close in time, which keeps `lead`'s two arms on the same morning.
- **m4, which R is graded:** exactly one complete R run may exist. It is named `router40-R`, is graded, and is never
  re-run. Every stopped run is named `router40-R-<hhmm>` (replacing the registration's "under a new name") and is
  never graded. If a stop leaves no complete run on 2026-10-06, R moves whole to a later day by a dated amendment.

## A2.2 The date gate (I1)

Every arm — R (smoke and full), L, the classifiers (P6 `--classify`) and the graders (P6) — refuses at its start and,
for R and L, before every chain attempt / item, unless **now ≥ 2026-10-06 10:00:00 local**. For L, U's window is
[the latest 07:00Z ≤ now, now], and **P9 FAILs if that instant is not 2026-10-06T07:00:00Z** (so a slip to another
quota day needs a dated amendment). P9 takes `--arm R|L|grade` and decides its mode from now's local date: any arm
before 2026-10-06 10:00 = FAIL.

## A2.3 CAP', the F line, fail-closed (I2, m3, m8)

- **The F line (controller-written, in `R40\USER-RULINGS.txt`), exactly one line matching**
  `^F 2026-10-06: (\d+) — G sitting: (done|none today|pending from ([01]\d|2[0-3]):[0-5]\d) — (.+)$`
  (the dashes are U+2014), with 0 ≤ F ≤ 500. Zero lines, two lines, another date, a non-integer or out-of-range F →
  P9 FAIL (for R as well: R also needs the G-sitting state, A2.4).
- **F includes** any flight piece that slipped onto the 2026-10-06 quota day: the G sitting, any post-hour arm still
  unrun, hole re-runs, or a postponed flight (its 372 bar) (m3).
- **P9 FAILs** when `quota-ledger-today.mjs` exits ≠ 0, or its 3.1-lite count line is absent or not an integer; when
  a listed answers file outside R40 has no model at entry or file level (it counts by the file-level model if only
  that exists); and when the ledger lists any other file outside R40 (a `.mjs`, `.ts`, `.txt`, `.log`, or a `.json`
  that is not an answers file: A1.3's "FAILs and asks"), unless `USER-RULINGS.txt` holds a controller line
  `LEDGER-OK 2026-10-06 <path> — <reason>` for that exact path (e.g. a code file the flight's build touched). Today's
  17:22 listing would have needed four such lines (all code). The answers-file part of U counts entries, a lower
  bound on requests (retries are invisible); the 20 margin covers it.
- **Restart:** `lite-l.mjs` runs at **min(recorded cap, the new `--cap`)**; it never raises, and a lower fresh CAP'
  lowers it.
- **If L runs on a quota day the flight also uses,** `router40 3.1-lite requests sent: N` goes to the flight's
  controller before the G sitting's m6 re-read and is added to it (m3).
- **m8:** before R's start P9 also requires one dated controller line in `USER-RULINGS.txt` recording that the user
  was told the router40 arms moved to 2026-10-06 (K3 is the relayed fact for the lite arm).

## A2.4 Guards before every chain attempt and every item (I4, m1, m6, m7)

Replaces A1.6's lists. Before **every R chain attempt (retries included), every L item, and every grader/classifier
launch**, the harness (P9's checks, in-process) refuses — saves, exits, the arm INCOMPLETE — unless all hold:
1. the date gate (A2.2);
2. no `Natively-*` scheduled task Running; no electron.exe; no tail.exe (process names only);
3. **the G sitting is not running:** `E\gsitting.log` has no `STEP … start` line without its matching `end`; no
   node.exe command line contains `interview60.answers.mjs` or `eq-gsitting` (a boolean per process, argv never
   printed); and the F line's state is `done` or `none today`, or `pending from HH:MM` with the deadline below;
4. `now + est < deadline`, **deadline = min(T_any, T_G) − 30 min**: `T_any` = the earliest NextRunTime of any
   `Natively-*` task (none → no bound), `T_G` = the F line's `pending from` time (else no bound); `est` = for an R
   chain its clips' seconds + 90 s per turn + 10 s per gap + 10 s; for an L item 120 s (`lite-l` aborts an attempt at
   90 s, a failed attempt, so 120 s holds); for a grader 25 min (FR's timeout);
5. **R starts (the full run) only if now + Σ of all 31 chains' est < deadline** (m6; replaces "by 19:50");
6. **no input drift:** every registration §0 hash, the filter (`28d6c47b9da4fba6`) and the judge instrument
   (`8564ba96369a`) equal their registered values at L's start and grading's start; a mismatch is a FAIL, and that arm
   waits for a dated amendment naming the new hash (m7).

## A2.5 The reader's synthetic cases (I5)

Replaces A1.5's P3 (a). Run with `--variant B`; 20 cases, each with its expected class; one flipped expectation must
be reported as a mismatch:

| # | case | expected |
|---|---|---|
| 1 | `hard` | hard |
| 2 | `Hard.` | hard |
| 3 | `HARD! A Docker image is …` | hard (+tail) |
| 4 | `<system> hard </system>` | malformed |
| 5 | `This is hard to say …` (hard in the first 12, not first) | malformed |
| 6 | 8 consecutive words of BLOCK_B (a recital) | malformed |
| 7 | a Spanish sentence of ≥ 8 words | malformed |
| 8 | `Redis is an in-memory store, so this one is hard` | malformed (hard in the last 3) |
| 9 | two completed turns, the second `hard` | malformed |
| 10 | 151 words | too-long |
| 11 | 150 words | too-long |
| 12 | 81 words | too-long |
| 13 | **80 words** | **answer** (the boundary) |
| 14 | 40 words | answer |
| 15 | played, no output | silent |
| 16 | `system error` | apology |
| 17 | not played | missing |
| 18 | a turn still open at the 90 s cap (no turnComplete/generationComplete) | cut |
| 19 | 12 words then an abnormal close | cut |
| 20 | 3 words before clipEnd, then a complete 40-word turn | early |

P3 (b), the live40-r1 real known answer (A1.5), stands.

## A2.6 Expectation text (m2)

A1.1's "Expected 13–17" replaces §7's "Under B: `EASY_caught` 14–19"; §7's "false EASY 1–3" stands. §5's "the seven
classes" reads "the nine classes".

## A2.7 Final harness pieces (replaces A1.8)

All under `R40\`, built from the sources named in A1.8; every case must pass before use. Order of need: P9, P2, P3
(for R), then P4 (for L), then P5–P8, P1 (no Gemini).

| piece | known-answer cases |
|---|---|
| **P9** `pre-run-r40.mjs` | **Date (I1):** `--arm L --now 2026-10-06T09:59` → FAIL; `--arm L --now 2026-10-05T19:00` → FAIL; `--arm R --now 2026-10-05T19:00` → FAIL; `--arm grade --now 2026-10-06T09:59` → FAIL; `--arm L --now 2026-10-06T10:01`, stub U = 0, F = 0 → CAP' 60 PASS; a stub clock at 2026-10-07T10:01 → FAIL (U window not 2026-10-06T07:00Z). **CAP' (I2):** U = 40, F = 0 → 60 PASS; U = 400, F = 0 → 80 capped to 60 PASS; U = 420, F = 10 → 50 FAIL; stub ledger exit 1 → FAIL; ledger text without the count line → FAIL; an answers file with no model at entry or file level → FAIL; a file-level-only model → counted by it; a listed non-answers file outside R40 → FAIL; the same with a matching `LEDGER-OK 2026-10-06 <path> — …` line → PASS; a `LEDGER-OK` line for another path → still FAIL. **F line:** none → FAIL; `F 2026-10-05: 0 — …` → FAIL; two F lines → FAIL; `F 2026-10-06: -5 — …` → FAIL; F 501 → FAIL; a valid line → PASS. **m8:** no "user told" line → R FAIL. **Guards (I4, m1):** stub `gsitting.log` with an open STEP → FAIL; a stub process list with a node argv containing `eq-gsitting` → FAIL; `pending from 11:00` with now 10:40 → FAIL; stub tasks with next runs 11:30 and 12:00 → deadline 11:00; a stub task Running → FAIL; a stub process list with electron.exe → FAIL; with tail.exe → FAIL. **Drift (m7):** a changed §0 hash (temp copy) → FAIL; a changed filter hash → FAIL |
| **P2** `run-r.mjs` (+ `mock-session-r.mjs`, `dry-check-r.mjs`) | `--dry --variant B --dry-fail C05`: 47 turns in §5 order, 16 gaps of 10 s, C05 retried once, "hard" items end 6 s after their turn, silent items at 30 s; a wrong variant/sha → exit 2; the session model asserted `gemini-3.8-live` before connect (a stub `gemini-3.1-flash-live-preview` → exit 2) (m5); **(I3)** a stub deadline admitting chain 1's est but not chain 2's → exactly 1 chain runs, the run saves, exits, R INCOMPLETE; a stub task list turning a `Natively-*` task Running after chain 1 → exactly 1 chain runs; the guard also runs before C05's retry (a stub that turns Running before the retry → no retry); Σ-est above the deadline at start → no chain starts; 3 consecutive abnormal mock chains → health STOP; a stub clock before 2026-10-06 10:00 → no chain starts |
| **P3** `read-r.mjs` (+ `cal-read-r.mjs`) | (a) the 20 cases of A2.5 → 20/20, one flipped expectation reported; (b) live40-r1 real → 46 `answer` + RH14 `silent`, 0 malformed/cut/early, max 79 words, T byte-equal to live40's text 46/46 |
| **P4** `lite-l.mjs` | (a) S1Q02, intent element only removed + its 3 previews → `true`; +1 space → `false`; 817 removed, no previews → `true`; (b) stub fetch, `--cap 3`, temp dir → 3 counter lines then `CAP REACHED` exit 3; (c) stub 503, 503, OK → 3 attempts counted, answer kept; (d) stub stream with no finishReason → retried; (e) `--model gemini-3.5-flash-lite` → exit 2, key never read; **(f, m5)** the file contains exactly one `gemini-` id string, `gemini-3.1-flash-lite`, and before each fetch the URL's model segment is asserted equal to it (a stub URL builder returning another id → exit 2 before fetch); (g) `--cap 61` → exit 2; no `--cap` → exit 2; (h) recorded cap 55, restart `--cap 60` → runs at 55; **(h', I2)** recorded cap 55, restart `--cap 50` → runs at 50; (i) stub `modelVersion` `gemini-3.5-flash-lite` → STOP; (j) `R40_FAKE_FETCH` set in a real run → refuse; (k) a held lock file → second process refuses; (l) `--dry`: 16 follow-ups carry PREVIOUS RESPONSES (1 entry; RH11 and RH14: 2), 31 mains none; **(m, I3)** stub fetch, a stub deadline admitting 2 items' est → exactly 2 items asked, then saved and exited INCOMPLETE; a stub task turning Running after item 1 → exactly 1 item asked; an attempt stalled past 90 s → aborted and counted as a failed attempt; a stub clock before 2026-10-06 10:00 → no item asked |
| **P5** `grade\build-blind-r40.mjs` | A's 46 questions equal live40's `pairs.blind-1.json` via its key, 46/46; per-arm counts equal the run files; only the graded `router40-R` run is accepted (a `router40-R-<hhmm>` input → refuse); no id, arm or class string in any blind file |
| **P6** `grade\launch-grader-r40.mjs` | `--dry-run blind-1.g1`: argv has `--model claude-opus-5-5`, `--tools Read,Write,Edit`, zero `--add-dir`, a fresh cwd outside MAIN/worktree; an existing cwd → REFUSED; a stub FR slot holding a live pid → REFUSED; `--classify c3 --dry-run`: rules = Read TURNS, Read CAL, Edit OUT only, no Bash, no `--add-dir`; a stub clock before 2026-10-06 10:00 → REFUSED; the A2.4 guard (stub open gsitting STEP) → REFUSED |
| **P7** `grade\audit-r40.mjs` | live40 g1 (`9856e006…`, Bash ×1) → NOT CLEAN; an FR grader session listed clean in `FR\audit-graders.out.txt` → CLEAN; c3/c4 audited against their own three paths |
| **P8** `grade\score-r40.mjs` (+ `cal-score-r40.mjs`) | synthetic inputs hitting each §7 row once (INCOMPLETE; NOT SAFE by AF; NOT SAFE by wrong; COSTS QUALITY; BUYS NOTHING by coverage, by lead, by M; CANDIDATE) → each prints its reading; the confusion table has nine class columns |
| **P1** `l38base-dispatch.txt` | its 22 calibration items, 22/22 per classifier |

**Not covered:** no piece exists yet, so none of these cases has run; the user has been told only that the lite arm
moved (K3), not yet that R moved too (m8's line closes this before R); whether the flight's G sitting lands on
2026-10-06 is unknown tonight (the F line decides); R and L on one morning still carry two clocks, and A is from
2026-10-03.
sha256 (of every byte above this line): f207c9755a34d45a936c4e4d7b8469475b7aba36bcfe2410ad40f634dacb136f
