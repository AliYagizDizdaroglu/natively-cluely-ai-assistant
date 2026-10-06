# Amendment A3 to PREREGISTER-router40.md: A2-RECHECK's fixes, adopted verbatim (pre-data)

Written **2026-10-05, begun 18:02 TST by `date`** (Opus, the registration's author). **No router40 model call has
been made; no datum exists.** The registration, A1 and A2 are unedited. Precedence: **A3 > A2 > A1 > the
registration**; everything A3 does not name stands. Every fix below is A2-RECHECK's wording, adopted as worded; no
other change is made, and no item needed a ruling.

**Read as (sha256, whole file):**
- `PREREGISTER-router40.md` `5b7daaee1ed6ce6661f1b2be4b00b581e8862d72ece6a463dc6d4f919b446057`
- `AMENDMENT-A1.md` `132739e6e85f657cf9526a30e2e3fb10a241fcaf5c4aa83c3089d8cd1a11f8aa`
- `AMENDMENT-A2.md` `10d0ea591d7b7983fcface37d8f42a735bc2e3baa55c263c452c9fa1c3ccc821` (seal `f207c975…136f`)
- `A2-RECHECK.md` (APPROVE WITH FIXES) `598ae5efbd998468da24895e40e367baea4cd0cea010214c8f84798dec2bfda7`
- `USER-RULINGS.txt` `8e5e3b40c42919f0054f164d5fccb597ce91ba5ab0b0ac742e04f1aee68e487f` (its line 5, the 17:58
  controller line, was appended after A2 was written)

## 0. Resolutions

| item | resolution | where |
|---|---|---|
| **I1** P2's per-chain case contradicts guard 5; I3 cases undefined in time | ADOPTED as worded | A3.1, P2, P4 |
| **I2** reader cases 8 and 9 do not isolate their rules | ADOPTED as worded | A3.2, P3 |
| **I3** a malformed F line is silently ignored | ADOPTED as worded | A3.3, P9 |
| **I4** stub inputs not refused in a real run | ADOPTED as worded (guard 7) | A3.4, P9, P2, P4, P6 |
| **m1** A2.1's F-line sentence contradicts A2.3/A2.4 | ADOPTED as worded | A3.5, P9 |
| **m2** the "user told" line has no pattern | ADOPTED as worded; "not covered"'s stale clause dropped | A3.5, P9 |
| **m3** LEDGER-OK matching | ADOPTED as worded | A3.3, P9 |
| **m4** guard 3 cases one-sided | ADOPTED as worded | A3.4, P9 |
| **m5** drift guard misses R | ADOPTED as worded | A3.4 |
| **m6** "sequential" has no tool | ADOPTED as worded | A3.4 |
| **m7** writing the F/LEDGER-OK lines | ADOPTED as worded | A3.3 |
| **m8** USER-RULINGS is append-only, not a §0 input | ADOPTED as worded | A3.3 |
| **m9** R has no upper date bound | ADOPTED as worded | A3.5, P9 |

## A3.1 Guards recomputed before every chain and item (I1)

Replaces both I3 deadline cases of A2.7 (P2 and P4 (m)):
> "P2 (I3): Σ-est fits at start; a stub task list that, after chain 1 completes, gains a `Natively-*` task whose
> NextRunTime puts chain 2's `now + est` past the recomputed deadline → exactly 1 chain runs, the run saves, exits, R
> INCOMPLETE (flips if the deadline is computed once at start). P4 (m): the same with a task appearing after item 2 →
> exactly 2 items asked, saved, exited INCOMPLETE. The deadline is recomputed from a fresh task read before every
> chain attempt and every item."

## A3.2 Reader cases 8 and 9 (I2)

Replaces A2.5 rows 8 and 9:

| # | case | expected |
|---|---|---|
| 8 | a single turn of ≥ 16 words whose word 13+ is the first `hard`, `hard` among its last 3 words (e.g. 14 neutral words + `so it is hard`) | malformed (last-3 rule only) |
| 9 | two completed turns, the first ≥ 13 words with no `hard`, the second `hard, because it needs a full design` | malformed (later-turn rule only: `hard` not in the first 12, not in the last 3) |

## A3.3 USER-RULINGS.txt lines (I3, m3, m7, m8)

- **I3**, added to A2.3: "Every line of `USER-RULINGS.txt` whose trimmed text begins `F ` must match the regex; any
  that does not → P9 FAIL. Lines are split on `/\r?\n/` and read as UTF-8."
- **m3**, added to A2.3's LEDGER-OK rule: "exact string equality after one normalisation (backslashes, case);
  LEDGER-OK never exempts an answers file, whose entries are always counted".
- **m7:** the F and LEDGER-OK lines are written with node or `-Encoding utf8`, never `Set-Content` (the ANSI codepage
  breaks U+2014 → no match). This fails closed but blocks L.
- **m8:** `USER-RULINGS.txt` is append-only and is not a §0 input, so later lines are not drift.

## A3.4 Guards (I4, m4, m5, m6)

- **I4**, A2.4 new item 7: "In a real (non-`--dry`, non-calibration) run, P9, `run-r.mjs`, `lite-l.mjs` and
  `launch-grader-r40.mjs` exit 2 before any network or launch when any stub input is set (`--now`, a stub clock, stub
  task/process list, stub ledger, stub `gsitting.log` path, stub deadline, or their env vars)."
- **m4**, A2.4 guard 3: the argv check extends to powershell.exe/pwsh.exe for `eq-gsitting` (the .ps1 runs between its
  node steps).
- **m5**, A2.4 guard 6: "and R's start (smoke and full), for R's §0 inputs".
- **m6**, added to A2.4 guard 2: "no other router40 harness process (node argv containing `run-r.mjs`, `lite-l.mjs` or
  `launch-grader-r40.mjs`, own pid excluded)".

## A3.5 Date and lines (m1, m2, m9)

- **m1:** A2.1's "R needs no quota gate, so a slow F line (A2.3) does not block it" is replaced by "R needs no quota
  gate; it does need the F line (A2.4 guard 3)".
- **m2:** the m8 "user told" line "matches `^\d{4}-\d{2}-\d{2} \d{2}:\d{2} TST CONTROLLER: the user was told
  .*2026-10-06`". USER-RULINGS line 5 (17:58) satisfies it (checked at sealing, below), so A2's "not covered" clause
  "not yet that R moved too" is stale and dropped.
- **m9:** "R refuses unless now's local date is 2026-10-06".

## A3.6 Final harness pieces (supersedes A2.7)

All under `R40\`, built from the sources named in A1.8; every case must pass before use. Order of need: P9, P2, P3
(for R), then P4 (for L), then P5–P8, P1 (no Gemini). Cases changed or added by A3 are marked **[A3]**.

| piece | known-answer cases |
|---|---|
| **P9** `pre-run-r40.mjs` | **Date:** `--arm L --now 2026-10-06T09:59` → FAIL; `--arm L --now 2026-10-05T19:00` → FAIL; `--arm R --now 2026-10-05T19:00` → FAIL; `--arm grade --now 2026-10-06T09:59` → FAIL; `--arm L --now 2026-10-06T10:01`, stub U = 0, F = 0 → CAP' 60 PASS; a stub clock at 2026-10-07T10:01 → FAIL; **[A3] `--arm R --now 2026-10-07T10:01` → FAIL**. **CAP':** U = 40, F = 0 → 60 PASS; U = 400, F = 0 → 80 capped to 60 PASS; U = 420, F = 10 → 50 FAIL; stub ledger exit 1 → FAIL; ledger text without the count line → FAIL; an answers file with no model at entry or file level → FAIL; a file-level-only model → counted by it; a listed non-answers file outside R40 → FAIL; the same with a matching `LEDGER-OK 2026-10-06 <path> — …` line → PASS; a `LEDGER-OK` line for another path → still FAIL; **[A3] a LEDGER-OK for the listed file's parent folder → FAIL; an answers file with 3.1-lite entries plus a LEDGER-OK line → still counted**. **F line:** none → FAIL; `F 2026-10-05: 0 — …` → FAIL; two F lines → FAIL; `F 2026-10-06: -5 — …` → FAIL; F 501 → FAIL; a valid line → PASS; **[A3] one valid line + `F 2026-10-06: 120 - G sitting: pending from 11:00 - x` (ASCII hyphens) → FAIL; a valid line ending in CRLF → PASS; `--arm R`, no F line → FAIL**. **User told:** **[A3] the 17:58 line → PASS; the file without it → R FAIL**. **Guards:** stub `gsitting.log` with an open STEP → FAIL; a stub process list with a node argv containing `eq-gsitting` → FAIL; **[A3] a node argv containing `interview60.answers.mjs` → FAIL; `gsitting.log` missing/unreadable while F says `done` or `pending` → FAIL**; `pending from 11:00` with now 10:40 → FAIL; stub tasks with next runs 11:30 and 12:00 → deadline 11:00; a stub task Running → FAIL; electron.exe → FAIL; tail.exe → FAIL. **Drift:** a changed §0 hash (temp copy) → FAIL; a changed filter hash → FAIL. **[A3] Real mode with `--now 2026-10-06T10:01` → exit 2** |
| **P2** `run-r.mjs` (+ `mock-session-r.mjs`, `dry-check-r.mjs`) | `--dry --variant B --dry-fail C05`: 47 turns in §5 order, 16 gaps of 10 s, C05 retried once, "hard" items end 6 s after their turn, silent items at 30 s; a wrong variant/sha → exit 2; the session model asserted `gemini-3.8-live` before connect (a stub `gemini-3.1-flash-live-preview` → exit 2); **[A3] Σ-est fits at start; a stub task list that, after chain 1 completes, gains a `Natively-*` task whose NextRunTime puts chain 2's `now + est` past the recomputed deadline → exactly 1 chain runs, the run saves, exits, R INCOMPLETE**; a stub task list turning a `Natively-*` task Running after chain 1 → exactly 1 chain runs; a stub that turns Running before C05's retry → no retry; Σ-est above the deadline at start → no chain starts; 3 consecutive abnormal mock chains → health STOP; a stub clock before 2026-10-06 10:00 → no chain starts; **[A3] real mode with `--now 2026-10-06T10:01` → exit 2** |
| **P3** `read-r.mjs` (+ `cal-read-r.mjs`) | (a) the 20 cases of A2.5, **[A3] rows 8 and 9 as in A3.2** → 20/20, one flipped expectation reported; (b) live40-r1 real → 46 `answer` + RH14 `silent`, 0 malformed/cut/early, max 79 words, T byte-equal to live40's text 46/46 |
| **P4** `lite-l.mjs` | (a) S1Q02, intent element only removed + its 3 previews → `true`; +1 space → `false`; 817 removed, no previews → `true`; (b) stub fetch, `--cap 3`, temp dir → 3 counter lines then `CAP REACHED` exit 3; (c) stub 503, 503, OK → 3 attempts counted, answer kept; (d) stub stream with no finishReason → retried; (e) `--model gemini-3.5-flash-lite` → exit 2, key never read; (f) exactly one `gemini-` id string, `gemini-3.1-flash-lite`, and the URL's model segment asserted equal before each fetch (a stub URL builder returning another id → exit 2 before fetch); (g) `--cap 61` → exit 2; no `--cap` → exit 2; (h) recorded cap 55, restart `--cap 60` → runs at 55; (h') recorded cap 55, restart `--cap 50` → runs at 50; (i) stub `modelVersion` `gemini-3.5-flash-lite` → STOP; (j) `R40_FAKE_FETCH` set in a real run → refuse; (k) a held lock file → second process refuses; (l) `--dry`: 16 follow-ups carry PREVIOUS RESPONSES (1 entry; RH11 and RH14: 2), 31 mains none; **[A3] (m) stub fetch, Σ-est fits at start, a stub task list that gains a `Natively-*` task after item 2 whose NextRunTime puts item 3's `now + est` past the recomputed deadline → exactly 2 items asked, saved, exited INCOMPLETE**; a stub task turning Running after item 1 → exactly 1 item asked; an attempt stalled past 90 s → aborted and counted as a failed attempt; a stub clock before 2026-10-06 10:00 → no item asked; **[A3] (n) real mode with `--now 2026-10-06T10:01` → exit 2** |
| **P5** `grade\build-blind-r40.mjs` | A's 46 questions equal live40's `pairs.blind-1.json` via its key, 46/46; per-arm counts equal the run files; a `router40-R-<hhmm>` input → refuse; no id, arm or class string in any blind file |
| **P6** `grade\launch-grader-r40.mjs` | `--dry-run blind-1.g1`: argv has `--model claude-opus-5-5`, `--tools Read,Write,Edit`, zero `--add-dir`, a fresh cwd outside MAIN/worktree; an existing cwd → REFUSED; a stub FR slot holding a live pid → REFUSED; `--classify c3 --dry-run`: rules = Read TURNS, Read CAL, Edit OUT only, no Bash, no `--add-dir`; a stub clock before 2026-10-06 10:00 → REFUSED; a stub open gsitting STEP → REFUSED; **[A3] real mode with `--now 2026-10-06T10:01` → exit 2** |
| **P7** `grade\audit-r40.mjs` | live40 g1 (`9856e006…`, Bash ×1) → NOT CLEAN; an FR grader session listed clean in `FR\audit-graders.out.txt` → CLEAN; c3/c4 audited against their own three paths |
| **P8** `grade\score-r40.mjs` (+ `cal-score-r40.mjs`) | synthetic inputs hitting each §7 row once (INCOMPLETE; NOT SAFE by AF; NOT SAFE by wrong; COSTS QUALITY; BUYS NOTHING by coverage, by lead, by M; CANDIDATE) → each prints its reading; nine class columns |
| **P1** `l38base-dispatch.txt` | its 22 calibration items, 22/22 per classifier |

**Not covered:** no piece exists yet, so none of these cases has run; the G sitting's real timing and
`eq-gsitting.ps1`'s STEP format were not read (P9's open-STEP check is written against A2-RECHECK's description);
whether 3.8 Live draws on any quota the flight uses was not re-checked (the registration's "not covered").
sha256 (of every byte above this line): b92db547e75ffc17c935202f05bba72a79e0d10d3344d36c064f24bbb5b7f9ef
