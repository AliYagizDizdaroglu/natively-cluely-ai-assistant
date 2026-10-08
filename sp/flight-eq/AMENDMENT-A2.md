# Amendment A2 to PREREGISTER-flight-eq.md: REVIEW-1, the plan re-check's N3/n4, the controller's code facts (pre-data)

Written **2026-10-05 16:53 TST by `date`** (Opus, amendment author; a separate fresh Opus re-checks it). Built on the
registration as read (sha256 `9ca3149b…2d14f44`) and A1 as read (sha256 `3e3f0ddd…1d863c8`); both unedited. **The hour
has not flown; no datum exists.** Precedence: A2 > A1 > the registration where they conflict; every bar, clause, arm,
roster item and count not named here stands as written (nothing below lowers a bar; where an option was open, the
stricter one was taken unless it made tonight impossible, and the reason is given).

**Binding user constraints (not changed here):** fly TONIGHT, task time T in 19:30–01:00 local, unattended allowed; cues
ON as shipped (no-cue twins run and graded); every flight grades the bare arms; grade everything incl. cues (cue lines
exported, b10); holdout40 never used to tune (A2 also removes it from every calibration it named, below); **20 graders,
Opus `claude-opus-5-5`, fresh cwds outside the project, no Bash, no `--add-dir`.**

**Controller facts folded in** (Task 6 review `F\build\task-6-review.md`, Task 7 review `F\build\task-7-review.md`):
K1 `IntelligenceEngine.ts:381` logs `gate=block chars=N` for a block that `WhatToAnswerLLM.ts:234` then drops on coding
framing; on the auto path the only coding case is a question mentioning the screen with a successful screenshot
(`main.ts` answerDetection sets intent `coding` + image). K2 two `gate=error` shapes: the catch branch appends
` error="<message>"` after `ms=0`; the other has no suffix. K3 the startup line `[Main] earlier question: on|off`
contains the substring `earlier question:`. K4 manual, chip-click and answer-now handlers pass no turn id by design (the
block never fires there).

## 0. Resolutions

| item | resolution | binds at |
|---|---|---|
| **C1** 3a FAIL has no verdict | ADOPTED: new §5 item **2a FAIL (no gain)**; closing line "any outcome not named = INCONCLUSIVE" | §5 (A2.1) |
| **I1** grey zones / bars without FAIL | ADOPTED: 2a, 2b, 2c-stall breach = FAIL; 2c median and 2d between lines = INCONCLUSIVE; 2c p90 breach = INCONCLUSIVE; 2b's coverage fallback FAIL = 2c median > +1000 ms | §4 rule 2, §5 items 1, 4 (A2.1) |
| **I2** quota margin 47 | ADOPTED, stricter form: arming bar **≥ 475 on 3.5-lite, ≥ 372 on 3.1-lite** (A2's estimates incl. pings + 100); slim-prompt A/B named as not run | A1.1, §6 (A2.2) |
| **I3** 2c not same-hour | RULED OTHERWISE (stricter than both proposals): **all G twins, block and no-block, both legs, run in ONE alternating post-hour "G sitting"**; 2c (and 2b, 2d, 3a, 4b, 4c) read only on it; +12 calls per lite model | §2 arms, §4 rules 2–4, §6 (A2.2) |
| **I4** window instrument daytime-only | ADOPTED: absolute instants, `E\window-eq.mjs` (pre-hour), calibrated incl. midnight | §6 "Start", A1.1 (A2.3, A2.10) |
| **I5** contamination cannot fire | ADOPTED with one refinement: STRAY = run-window pinned question with ≥ 3 words of ≥ 4 letters matching no S1+S2 text by `sameAnchor`; ≥ 1 = **VOID, rule 1(i)**; shorter non-roster = `short`, named | rule 1, A1.2 (A2.4) |
| **I6** built-not-inserted / doubles | ADOPTED + K1: **G_twin**; 1(e) recast; coding-framing block = "built, not inserted", out of G, a G\* miss in 1(c); unexplained one = VOID 1(e); \|G_twin\| < 3 = INCOMPLETE | §3, rules 1(c)(e), 2–4 (A2.4) |
| **I7** post-hour instruments, no blindness rule | ADOPTED: sha + cal + Opus review recorded in `E\instruments.sha256.txt` before first touch; run folder closed until then; §7 header and §11 l. 519 re-worded | §7, §11, A1.4/A1.5 (A2.5) |
| **I8** night safety reads only | ADOPTED as gates inside the guard (`E\night-gates.ps1`), plus AC power; interruption outcomes stated (1(k) VOID / arms INCOMPLETE); `E\power-events.ps1` detects | A1.2, rule 1, §5 (A2.6) |
| **I9** precheck has no mechanism | ADOPTED, stricter mechanism: precheck is a **scheduled task** at T−6 (not a session sleeper), disables the flight task on any FAIL; the real guard refuses without a fresh `PRECHECK OK`; rule 1(j) VOID as backstop | A1.1, §2 guard (A2.6) |
| **I10** 11 vs 14 rows | ADOPTED: fourteen per-arm rows + blind rows; `eq-merge.cmd` same 14 | b8 (A2.7) |
| **m1** 3a FAIL line formula | ADOPTED in part: FAIL ≤ max(floor(0.05·pairs), ceil(pairs/21)); PASS stays ceil(0.20·pairs) (the proposed ceil(4·pairs/21) lowers PASS at 21 pairs: 4 vs 5) | rule 3a (A2.1) |
| **m2** 578, WHY | ADOPTED: 200..578; b3 expects WHY; b5 cal reads WHY as `short` non-roster | §3, b3, b5 (A2.8, A2.10) |
| **m3** 4c unpriced | ADOPTED: priced **34.5 / 39.3 / 42.1 %** at off-topic 5 / 10 / 20 % per pair (front 20); bar unchanged | rule 4c (A2.11) |
| **m4** self-referential sha | ADOPTED: §11's "as committed" = sha before §11 is filled; the launcher prints the committed shas | §11 (A2.8) |
| **m5** amendment placement | ADOPTED: A1, A2 are separate dated files committed beside the registration; §11 cites their shas | §11 (A2.8) |
| **m6** G re-read bars fixed | ADOPTED as formulas on the G sitting: ≥ 10·\|G_twin\| + 12 (3.5-lite), ≥ 6·\|G_twin\| + 8 (3.1-lite) | §6 (A2.2) |
| **m7** blind counts at \|G\|=4 only | ADOPTED with the user's 20 held: blind files fixed at 2 front + 1 back for \|G_twin\| ≤ 7 (≤ 44 answers each, h40d's per-file size) | §2, b6, b8 (A2.7) |
| **m8** "no-parent once" doubtful | ADOPTED: reworded, reported only | rule 5c (A2.4) |
| **m9** SP = Temp | ADOPTED: SP = L = `natively-lab\sp`; no Temp path except the launcher's `%TEMP%` error log | header (A2.8) |
| **m10** 1 vs 2 probes | RULED: **two** probes (`cwdprobe-1`, `cwdprobe-2`), both must read `claude-opus-5-5` | §2, §6, b8 (A2.7) |
| **m11** 3b price | ADOPTED: 17.9 % INCONCLUSIVE at the replay's 0.6 per item; 3.2 % two in a row | rule 3b (A2.11) |
| **N3** b4's last clause unowned | ADOPTED: `E\eq-b4-cal.mjs`, run on the hour's own G_twin captures BEFORE the G sitting; tool calibrated pre-hour on a cue-era non-holdout folder; live DIFF with the builder proven = feature-attributable FAIL (5d) | b4, rule 5, §5 (A2.9) |
| **n4** four stale strings | ADOPTED: PARITY DIST line, 578, WHY line, `--no-block` inside LANDED | b1, b3, §1, §11 (A2.8) |
| K1–K4 | folded: K1 → A2.4; K2 → 5a + reader; K3 → reader anchored regex; K4 → out of scope, stated | A2.4, A2.10, A2.12 |

## A2.1 The verdict ladder (C1, I1, m1)

- **Rule 2, after its clauses:** "2a (p90 > 50 ms), 2b (paired median > +150) and the 2c stall bar (block > no-block +
  ceil(2·pairs/39)) — a breach = feature-attributable FAIL. 2c median: ≤ +500 PASS, > +1000 FAIL, between =
  INCONCLUSIVE. 2d: ≤ +5 PASS, > +10 FAIL, between = INCONCLUSIVE. 2c p90 (block > no-block + 2000 ms) = INCONCLUSIVE
  (replay 3b's form)." 2b's coverage fallback (reg. l. 185) now reads: "**2b's FAIL line becomes 2c's median > +1000 ms**"
  (§9 still says a sub-second model-side cost could not be read).
- **Rule 3a:** PASS ≥ ceil(0.20·pairs) (unchanged); **FAIL ≤ max(floor(0.05·pairs), ceil(pairs/21))**; between =
  INCONCLUSIVE. At 20 pairs: PASS ≥ 4, FAIL ≤ 1 (unchanged); at 19: FAIL ≤ 1 (was 0).
- **§5, inserted after item 2:** "**2a. FAIL (no gain)** — 3a at or below its FAIL line. The flag stays OFF; the
  feature-attributable FAIL consequences paragraph applies (understood on the hour's captured bytes before any change;
  any change is a new spec and registration); holdout40 is not flown."
- **§5 item 1** now lists: 4a, 4b, 4c, 4d (a wrong main with a block), 2a, 2b, 2c stall, 2c median > +1000, 2d > +10,
  5a, 5b (a wrong referent with a wrong answer), **5d (A2.9)**.
- **§5 item 4** adds: "2c median or 2d between their lines; 2c p90 breached".
- **§5, last line of the ladder:** "**Any clause outcome not named above (a breached bar without its own FAIL line) =
  INCONCLUSIVE.**"

## A2.2 Quota and the G sitting (I2, I3, m6)

**I3 ruling — the G sitting replaces the split block/no-block schedule.** Reg. §2's G rows (block r1–r3 = the chain's
`captured-high*`, r4–r5 and all no-block reps later) are replaced, for the rules that compare them, by ONE post-hour
sitting on G_twin (A2.4), in this order, each step an `interview60.answers.mjs` arm with `--captured <run>\interview60.prompts.json
--only <G_twin>` and the SAME model/thinking args as `PAIRED_ARMS`' `captured-high` / `captured-low`:

| step | tag | model, level | extra |
|---|---|---|---|
| 1, 3, 5, 7, 9 | `captured-g-high`, `-r2` … `-r5` | 3.5-lite HIGH | (block, as captured) |
| 2, 4, 6, 8, 10 | `captured-no-block-high`, `-r2` … `-r5` | 3.5-lite HIGH | `--no-block` |
| 11, 13, 15 | `captured-g-low`, `-r2`, `-r3` | 3.1-lite LOW | (block) |
| 12, 14, 16 | `captured-no-block-low`, `-r2`, `-r3` | 3.1-lite LOW | `--no-block` |

Pairs: (id, rep k) = `captured-g-high-rk` × `captured-no-block-high-rk` (front, 5 reps), and the same for low (back, 3).
Rules 2b, 2c, 2d, 3a, 4b, 4c compute on the sitting only. **2c gates iff the sitting's span (first step start → last
step end, per the runner's log) ≤ 90 min; else 2c is reported, named.** Because both sides share one sitting, §6's
next-day departure no longer ungates 2c: if the sitting runs on 2026-10-06's quota day it still gates every clause
(the run window's captured prompts do not change). The chain's `captured-high` r1–r3 and `captured-low` r1–r3 stay as
they are, run and graded per arm on all 40 ids (reported). Why not the reviewer's "≤ 2 h after r3" rule: an unattended
night flight ends ~02:00–06:00 and the G arms need the post-hour reader (I7), so that rule would ungate 2c almost
surely; and the alternative (+20 block reps for 2c only) leaves 3a/4b/4c on cross-time pairs.

**Estimates (counts, not measurements), recomputed:** 3.5-lite = in-app front ~45 + `captured-high`×3 120 + no-cue×3 120
+ `high` 20 + bare 20 + G sitting 10·|G_twin| (40 at 4) + pings ~10 = **375**; 3.1-lite = pings ~10 + back legs ~10 +
`captured-low`×3 120 + `captured-minimal` 40 + `low` 20 + bare 20 + chains ~25 + G sitting 6·|G_twin| (24) = **≈ 269,
taken as 272**. **Arming bar (replaces A1.1's ≥ 400): ≥ 475 headroom on 3.5-lite and ≥ 372 on 3.1-lite; less = no
flight tonight, §6's fallback, no rule change.** Stricter of I2's options (the 47-margin option was rejected). Feasible:
my read of `quota-ledger-today.mjs 2026-10-05T07:00:00.000Z` at 16:44 TST: 0 app-log lines and 0 model-call files since
the 10:00 reset; the smoke (≈ 10 per model) + the plan's n5 call (1) leave ≈ 489; **one smoke re-run still fits (≈ 479),
a second does not**. The arming read counts requests by A1's tool (b9); A2 changes only the bar. **Named:** the
slim-prompt A/B (agenda, Mon 5 Oct) did not run and will not run on this quota day; no other lite replay or flight runs
on it besides the smoke(s), n5's call and this flight.

**m6 — before the G sitting** the ledger is re-read and must show **≥ 10·|G_twin| + 12 on 3.5-lite and ≥ 6·|G_twin| + 8
on 3.1-lite** (40/20 at the old schedule; 52/32 at |G_twin| = 4); short = the sitting moves whole to the next quota day
(never split across days).

## A2.3 The window (I4)

"Start" (reg. §6, A1.1) is judged on absolute instants: **in ⇔ 2026-10-05T16:30:00.000Z ≤ startedAt <
2026-10-05T22:31:00.000Z** (19:30:00 → 01:30:59 local). Read first, by `E\window-eq.mjs` (A2.10); the
`h40c-hedge-stats.mjs` window line is ignored for this hour (its other outputs are used as registered). Out = §5 item 5
(NO LATENCY VERDICT, cannot PASS); unreadable `startedAt` = cannot PASS, named.

## A2.4 What the reader computes: contamination, G, G_twin (I5, I6, m8, K1–K4)

- **Diag lines (K3, K2):** a diag line is a line matching `\[IntelligenceEngine\] earlier question: gate=` with
  `turn=` and `ms=` fields; trailing text after `ms=<n>` is allowed. The startup line `[Main] earlier question: …` is
  never a diag line. Rule 1(b) and every count use this definition. **5a counts `gate=error` regardless of trailing
  text** (both shapes); each is named with its window and the error message (≤ 120 chars).
- **STRAY (I5):** for each run-window `runWhatShouldISay: pinned question "…"` line: `roster:<id>` if `sameAnchor`
  (MAIN dist `questionReconcile.js`) holds with any of the 40 S1+S2 texts; else `short` if it has < 3 words of ≥ 4
  letters; else **STRAY**. Ids, times and counts only, never text. **Rule 1(i): ≥ 1 STRAY = VOID** (re-fly). §5 item 1's
  FAILs are still read, except a 5b wrong referent whose parent is a STRAY text. `short` windows are named and reported
  (a 1–2-word STT artifact such as "Thank you." is a pipeline artifact, not other audio; if it becomes a parent, 5b
  catches it). This replaces A1.2's "the user rules on the hour" (a rule chosen after data).
- **Built, not inserted (I6, K1):** a `gate=block` window whose own capture (`verbal-prompts.log`, paired to the
  dispatch by `pairCapturesToDispatches`) lacks the LABEL. Cause read from the window's log: the screenshot/`coding`
  intent signature of K1 → `coding` (excluded from G; if the id is in G\*, a G\* miss in 1(c)); no such signature →
  `UNEXPLAINED` = **VOID 1(e)** (a block dropped for no known reason is a mechanical defect).
- **G** = ids with a run-window `gate=block` window that was inserted (capture carries the LABEL). 3b and 4a read G.
- **G_twin = {id ∈ G : `interview60.prompts.json[id].user` carries the LABEL}.** 2b–2d, 3a, 4b, 4c and the G sitting's
  `--only` use G_twin. G \ G_twin is named with cause `double` (≥ 2 run-window dispatches of the id) or `other`.
  **|G_twin| < 3 → 2b–2d, 3a, 4b, 4c INCOMPLETE** (named; re-fly), mirroring 1(c)'s 3-of-4 floor.
- **1(e) recast:** "every `gate=block` window whose own capture is verbal framing carries the LABEL, and every LABEL
  capture in the run window has a `gate=block` window"; any mismatch = VOID.
- **turn=none (K4):** the flight is hands-free auto; manual, chip and answer-now paths pass no turn id by design and are
  out of scope. A `turn=none` diag line is named (expected 0) and counts against 1(b)'s 95%.
- **m8, rule 5c reworded:** "`no-parent`: expected 0 or 1 — the readiness probe dispatches before the run window and
  writes the ledger, so S1Q01 most likely reads `no-cue`; reported only."

## A2.5 Instruments after the hour: blindness (I7)

Added to A1.4: "Each post-hour instrument (b5, b6, b8's pieces, b10, `eq-b4-cal.mjs`, `power-events.ps1`, the G sitting
runner, the cue re-points, clocks) is written, calibrated on its known cases and Opus-reviewed READY; its sha256, its
cal file's sha256 and the review file name are appended to `E\instruments.sha256.txt` **before its first run on the run
folder**. Until then the run folder is opened only for the launcher log's proof lines and `window-eq.mjs` (pre-hour).
An instrument edited after its first run on the hour's data re-runs its full calibration, and the edit is named in the
result note." **§7's header** now reads "Blocking checklist: b1–b4, b7, b9 and A2's pre-hour pieces before arming; b5,
b6, b8, b10 per A1.4 + A2.5". **§11 l. 519** "b1–b10 outputs quoted" now reads "b1–b4, b7, b9 and A2's pre-hour outputs
quoted at arming; b5, b6, b8, b10 in the result note with their `instruments.sha256.txt` lines". A1.5's "Unchanged" is
corrected accordingly. b5 MAY be built pre-hour (all its known cases exist after the smoke) — recommended, since it gates
the G sitting's start.

## A2.6 Night safety and the precheck (I8, I9)

- **Gates, not reads (I8):** `guard-eq.mjs` runs `E\night-gates.ps1 -At <T>` as a child (dry and real launcher); any
  FAIL = `GUARD FAILED` = no hour (and at arming = no flight tonight). Gates: AC standby timeout 0 and AC hibernate
  timeout 0 (`powercfg /q`); on AC power; no pending reboot (CBS `RebootPending`, WU `RebootRequired`); Windows Update
  active hours covering [T−30 min, T+5 h] OR updates paused past T+5 h. Changing any of these is the user's own action;
  the controller changes no system setting. *Read at ~16:50 TST today (informative only, not the gate):* AC standby 0, AC
  hibernate 0, on AC, no reboot pending, active hours 15→06, updates paused to 2026-10-14 — would pass.
- **Interruptions (I8):** a sleep, hibernate or restart between T and `timeline.endedAt` (`E\power-events.ps1`) =
  **VOID, rule 1(k)**; between `endedAt` and the chain's last launcher line = the arms whose answer files are missing or
  short are **INCOMPLETE**: re-run whole by tag the same quota day (never a bare resume), ledger permitting, else §5
  item 3. A1.3 stands (before T: no hour, not VOID).
- **Precheck (I9), mechanism ruled otherwise than "a background sleeper":** a one-shot scheduled task
  `Natively-flight-eq-precheck` at **T − 6 min** runs `E\eq-precheck.ps1` (A2.10). Reason: a session sleeper dies with
  the session and session crons do not fire while agents or Monitors run (memory `tooling_session_crons_restart`); a
  task is independent of the Claude session. **Any FAIL line: the precheck runs `Disable-ScheduledTask
  Natively-flight-eq` and writes `PRECHECK FAILED …`** → no hour, re-fly under §6. **The real launcher's guard
  (`--require-precheck`) refuses unless `E\eq-precheck.out.txt` ends with a `PRECHECK OK` stamped within [T−10 min,
  now] and now ≤ T+10 min**, and prints `PRECHECK ACCEPTED <stamp>`. **Rule 1(j) (backstop): a launcher log without
  that line = VOID.**

## A2.7 Graders (I10, m7, m10, the user's pin)

- **I10:** `E\eq-grader-dispatch.txt` has **fourteen** per-arm rows — `inapp`; `captured-high`, `-r2`, `-r3`;
  `captured-no-cues-high`, `-r2`, `-r3`; `captured-low`, `-r2`, `-r3`; `high`; `low`; bare `gemini-3.5-flash-lite`;
  bare `gemini-3.1-flash-lite` — plus the blind-file rows; `eq-merge.cmd` merges the same 14 (b8's `SKIPPED-MISSING`
  and exit-13 calibrations unchanged, plus: a 14-row run on a folder holding all 14 judge-pair files → 14 merged lines).
- **m7:** blind files are fixed at **2 front + 1 back for |G_twin| ≤ 7** (front 10·|G_twin| answers split in two,
  back 6·|G_twin|; ≤ 44 answers per file = h40d's per-arm file size), ×2 graders = 6 → **20 graders**, as the user
  set. |G_twin| ≥ 8 (not expected: G\* is 4) splits files at ≤ 44 and the count rises; named.
- **m10 + the user's pin:** two probes, `cwdprobe-1` and `cwdprobe-2`, fresh cwds, both transcripts must read
  `claude-opus-5-5`. Every grader is launched with the pinned id `claude-opus-5-5` (not the alias), tools Read/Write/Edit,
  `--strict-mcp-config`, **no `--add-dir`** (the launcher prints its argv per launch; `audit-graders.mjs` asserts no
  `--add-dir` and no Bash tool use). A transcript reading any other model = that file re-graded once by a fresh grader.
  **Ruling 5 (grade with whatever the alias resolves to) is superseded by the user's pin:** if `claude-opus-5-5` is
  refused, grading waits; no other model grades this hour. Counts: 20 graders + 2 probes + 1 pilot.

## A2.8 Bookkeeping (m4, m5, m9, n4)

- **m9:** SP = L = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp`; VH = `L\validation-hour`. No chain or post-hour
  instrument references a Temp path, except the launcher's `%TEMP%\natively-eq-launcher-error.log` (the convention).
- **m5:** A1 and A2 are the registration's dated amendments, kept as separate files so the registration stays at the
  reviewed sha; committed to MAIN `passes/` beside it as `flight-eq-AMENDMENT-A1.md`, `flight-eq-AMENDMENT-A2.md`;
  §11 cites both shas.
- **m4:** §11's "this file's sha256 as committed" means the sha before §11 is filled (`9ca3149b…2d14f44`); the launcher
  prints the sha256 of the three committed `passes/` files (registration with §11 filled, A1, A2) as its first lines,
  and the result note quotes them.
- **n4, the four strings, as now printed:** (1) b1's c1 line = `EARLIER-QUESTION REF TESTS: 47/47 passed` then `PARITY
  DIST: 126 fixture entries (21 with a block) + 29 invented cases + 117 captured prompt-line rows; mismatches 0`, exit 0
  (plan Task 9 Step 5); (2) block chars **200..578** in §3, b3 and A1.4's b3 (125 + 3 + 450); (3) b3 also requires
  `WHY: gate=parent-in-prompt cue=short chars=0 turn=<n>`, turn ids increasing, `5/5 exercised` (a WHY `NOT EXERCISED`
  is never a pass); (4) §1/§11: `--no-block` lands **inside** the one LANDED commit (Task 9's 20 paths); the
  focused-five-off edit (ruling 3) is a **separate** MAIN commit (A2.10, P2). Registered HEAD = 89c8f53 + LANDED + the
  focused-off commit + the `passes/` commit (registration, A1, A2). Task 9 Step 5b runs with
  `NATIVELY_ROSTER=scenario50 NATIVELY_SCENARIOS=S1,S2` and requires exit 2 AND its refusal text (plan re-check N2).

## A2.9 b4's last clause, owned (N3)

`E\eq-b4-cal.mjs <run-dir>` (contract A2.10, post-hour, before the G sitting) proves the no-block twins send flag-off
bytes: copy the run folder's debug log, timeline and `interview60.prompts.json` into `E\b4cal-tmp\` (never committed;
deleted after), replace each G_twin entry's `user` by `splitEarlierQuestion(user, LABEL).user`, run c2's builder
(`followup-replay-build.mjs <tmp> <tmp-out> --calibrate`) on it. Readings: **non-G ids all reproduce AND every G_twin id
reproduces → b4 OK**; non-G all reproduce but a G_twin id does not → the live prompt differs from flag-off by more than
the block = **rule 5d, feature-attributable FAIL ("byte rule broken live")**; non-G ids do not all reproduce → the
clause is UNCALIBRATED ON THE HOUR, named; b4 then rests on its other proofs (vitest byte rule in reverse; plan Task 10
Step 6's live strip/re-insert on the smoke's real blocks) and 2b–2d, 3a, 4b, 4c still gate. **Pre-hour, the tool is
calibrated on a cue-era non-holdout run folder** (`interview60.runs\2026-10-01T02-37-41-cuesmoke` or the latest
cuesmoke; holdout folders are not used): (a) unmodified → `CALIBRATION OK n/n`; (b) one id given a synthetic block via
`withEarlierQuestion` → that id fails; (c) stripped back → n/n. If (a) is not n/n, a waiver is written in §11 before
arming (b4 rests on its other proofs) — decided now, not after data.

## A2.10 Tool contracts

**Pre-hour** (must exist, calibrated and Opus-reviewed READY, before arming):

- **P2 focused-off harness edit (ruling 3):** `interview60.flight.mjs`: an exported pure `focusedFor(roster, env)`;
  `NATIVELY_FLIGHT_FOCUSED === 'off'` → `null` and the log line `FOCUSED  off by NATIVELY_FLIGHT_FOCUSED=off - skipping
  the 4 focused arms`; unset/empty → today's behaviour; any other value → exit 2 naming it. Vitest: scenario50 + `off` →
  null; scenario50 + `''` → the five ids; `yes` → throws. Calibration: the test fails with the branch reverted. Committed
  to MAIN after LANDED by the shared-index recipe; `launch-eq-src.txt` sets `NATIVELY_FLIGHT_FOCUSED=off`; proof after
  the hour = the off line present and no `3.x-flash` arm line in the launcher log.
- **P4 `E\window-eq.mjs`:** `node window-eq.mjs <run-dir>` (reads `interview60.timeline.json` `startedAt`) or `--at
  <ISO>`. Local time by a fixed +03:00 offset (not the machine's TZ). Prints one line: `WINDOW-EQ startedAt=<iso>
  local=<YYYY-MM-DD HH:MM:SS>+03 IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30` (exit 0) | `… OUT OF WINDOW (cannot
  PASS; NO LATENCY VERDICT)` (exit 3) | `WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS` (exit 4);
  usage exit 2. **Calibration `E\window-eq.cal.txt`:** 16:29:59.999Z out; 16:30:00.000Z in; 20:59Z (23:59) in; 21:00Z
  (00:00 on the 6th) in; 22:30:59.999Z in; 22:31:00.000Z out; 2026-10-04T21:30:00Z (00:30 on the 5th) out; s50m's run
  folder → out; a copy of its timeline without `startedAt` → unreadable.
- **P5 `E\night-gates.ps1 -At 'yyyy-MM-dd HH:mm' [-FakeJson <file>]`** (UTF-8 with BOM, `ParseFile` 0 errors): one line
  per gate `NIGHT <name>: OK|FAIL <reading>` for `standby-ac`, `hibernate-ac`, `power` (no battery, or BatteryStatus 2),
  `reboot` (CBS RebootPending or WU RebootRequired present = FAIL; PendingFileRenameOperations printed, not gated),
  `updates` (ActiveHoursStart/End under `HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings`, wrap-aware, cover
  [At−30 min, At+5 h] inclusive, OR PauseUpdatesExpiryTime > At+5 h); last line `NIGHT GATES OK` exit 0 | `NIGHT GATES
  FAILED (<n>): <names>` exit 1; a bad `-At` exit 2. `-FakeJson` overrides readings (calibration only; the guard never
  passes it). **Calibration `E\night-gates-cal.txt`:** all-good fake → OK; standby 0x384 → FAIL standby-ac; hibernate
  nonzero → FAIL; BatteryStatus 1 → FAIL power; RebootPending → FAIL; active 8→17, no pause, At 21:00 → FAIL updates;
  same + pause to 2026-10-07 → OK; active 18→6, At 2026-10-06 01:00 → OK (06:00 inclusive); active 18→5, same At → FAIL;
  the real machine's reading printed.
- **P6 `E\guard-eq.mjs` additions** (on top of reg. §2/b7): (g1) the n4 strings; (g2) `night-gates.ps1 -At
  %NATIVELY_EQ_T%` as a child, exit 0, its lines echoed (`--night-gates-script <path>` exists for calibration only; the
  guard prints the path used); (g3) `NATIVELY_FLIGHT_FOCUSED` exactly `off` and P2's marker string in the harness source;
  (g4) `NATIVELY_EQ_T` parses as `yyyy-MM-dd HH:mm` within 2026-10-05 19:30 .. 2026-10-06 01:00; (g5) `--require-precheck`
  (real launcher only) as A2.6, printing `PRECHECK ACCEPTED <stamp>`. **`guard-eq-cal.txt` adds:** a night-gates stub
  exiting 1 → `GUARD FAILED` naming it; `FOCUSED` unset / `on` → FAILED; `NATIVELY_EQ_T` 18:00 → FAILED; precheck file
  missing / stamped 2 h earlier / ending `PRECHECK FAILED` → three FAILED; fresh `PRECHECK OK` → accepted; the true
  environment → `GUARD OK`.
- **P7 launchers:** `launch-eq-src.txt` → `launch-eq.cmd` / `launch-eq-dry.cmd` (gen-launchers, ASCII, CRLF) with the
  A2 env (`NATIVELY_FLIGHT_FOCUSED=off`, `NATIVELY_EQ_T=<T>`), the m4 sha lines first, guard with `--require-precheck`
  only in the real one; b7's guards-only chain and mangled-marker calibration unchanged.
- **P8 `E\eq-precheck.ps1 -At 'yyyy-MM-dd HH:mm' [-Label eq] [-DryTask <name>] [-FakeFail <gate>]`** (UTF-8 BOM;
  h40d-precheck re-pointed; **a full date-time, because a bare `HH:mm` resolves to today and a post-midnight precheck
  armed in the evening would run at once**): waits until `-At`; gate lines `PRECHECK <name>: OK|FAIL`: the flight task
  Ready with next run = At + 6 min; other `Natively-*` Running = 0 (itself excluded); electron.exe 0; port 5180 free;
  tail.exe 0; the `%TEMP%` error log absent; the dry twin's result 0x0 and its new log bytes holding `GUARD OK` and
  `NIGHT GATES OK`; audio-state printed, not gated (A1.2). Writes `E\<Label>-precheck.out.txt` ending `PRECHECK OK
  <yyyy-MM-ddTHH:mm:ss+03>` or `PRECHECK FAILED (<n>): <names>` and, on FAILED, `Disable-ScheduledTask
  Natively-flight-<Label>` and prints its State. **Calibration `E\eq-precheck-cal.txt`** with `-Label eqcal` against a
  dummy task `Natively-flight-eqcal` (action `cmd /c exit 0`, trigger 2026-10-07 03:00; deleted after): clean → OK,
  eqcal Ready; `-FakeFail port` → FAILED (1): port, eqcal Disabled; `-At '00:09'` → usage exit 2; `-At` 2 min ahead →
  first line stamped ≥ At.
- **P9 `register-eq.ps1`:** registers `Natively-flight-eq` (T), `Natively-flight-eq-dry` (no trigger) and
  `Natively-flight-eq-precheck` (T − 6, limit 15 min), interactive, StartWhenAvailable False; prints both next run times.

**Post-hour** (A2.5 applies; built earlier where possible):

- **b5 `E\eq-flight-read.mjs`** — reg. b5 + A2.4: anchored diag regex; `gate=error` any suffix; STRAY/short/roster;
  built-not-inserted with cause; G, G_twin with causes; 1(e) recast; `--played <json>` for the smoke. **Calibration adds
  (A2's known cases):** a log holding only `[Main] earlier question: on` → 0 diag lines; `gate=error … ms=0 error="x"`
  and `gate=error … ms=3` → both counted, 5a FAIL named; smoke seg 1 → G = {S1Q04F, S1Q06F}, WHY `short`, STRAY 0; smoke
  seg 2 → NOT EXERCISED (flag off); **s50m's run log replaces h40d's** (no holdout bytes in this hour's tools) → NOT
  EXERCISED and **STRAY 0** (the clean case; ≥ 1 = the matcher is wrong and is fixed before the hour's data is touched;
  if s50m has no pinned-question lines, the `dispatch: answer` anchor is used and the cal says so); the 2026-10-01 21:00
  log `VH\2026-10-01-prestart-h40d\natively_debug.run5.log` against its probe clip texts → **STRAY ≥ 1**; synthetic: a
  gate=block whose capture lacks the LABEL with K1's signature → built-not-inserted `coding`; without → `UNEXPLAINED`
  (VOID 1(e)); two dispatches of S1Q04F with the kept prompts entry LABEL-less → G_twin excludes it, cause `double`;
  "Thank you." → `short`; an invented 8-word sentence → STRAY 1.
- **`E\eq-b4-cal.mjs <run-dir>`** — A2.9; prints `B4CAL non-G n/n, G_twin k/k: OK|DIFF <ids>|UNCALIBRATED`, ids and
  counts only.
- **`E\power-events.ps1 -From <iso> -To <iso>`** — counts System-log events Kernel-Power 41/42/107,
  Power-Troubleshooter 1, Kernel-General 12/13, EventLog 6005/6006/6008 in the span; `POWER EVENTS <n>` exit 0 if 0, 1
  otherwise. Calibration: ±10 min around `Win32_OperatingSystem.LastBootUpTime` → ≥ 1; a known quiet hour → 0.
- **`E\eq-gsitting.ps1 -Run <dir> -G <ids>`** — A2.2's 16 steps in order, from MAIN, with the launcher's env block,
  never printing a prompt; per step a `STEP <n> <tag> start/end <iso> EXIT <code>` line to `E\gsitting.log`; refuses to
  start unless `eq-b4-cal` read OK or UNCALIBRATED (not DIFF) and m6's ledger bars hold; output files moved into the run
  folder after the last step, named. Calibration: `-WhatIf` on the smoke's ids prints the 16 command lines (checked
  against `PAIRED_ARMS`' args) and makes no call.
- **b6 `E\eq-twins.mjs`** — reg. b6 on A2's tags and G_twin; the A2.1 mapping; the span check (≤ 90 min) for 2c. Cal
  adds: pairs 19, Δ +1 → FAIL (m1); 2c median +700 → INCONCLUSIVE; stall breach → FAIL; p90 breach → INCONCLUSIVE;
  2b coverage < 90 % with 2c median +1100 → FAIL via the fallback; span 120 min → 2c REPORTED.
- **b8, b10, the cue re-points, clocks** — as registered, with A2.7.

## A2.11 Prices (m3, m11), computed by a throwaway script on `falsefail-eq.mjs`'s model (it reproduces the replay's 30.9 %)

- **4c** (front, 20 pairs, no effect, off-topic rate p per pair per arm): **34.5 % at p = 5 %, 39.3 % at 10 %, 42.1 % at
  20 %** (16 pairs: 32.3 / 37.9 / 41.2 %). The bar stays (no margin: a margin would weaken it). **This is a large
  false-FAIL price and may change the user's decision; a margin can only be ruled by the user in a dated A3 before
  data.**
- **4b** unchanged at |G_twin| = 4 (13.7 / 19.1 / 23.8 %).
- **3b:** at the replay's B rate 24/40 = 0.6 per item, P(< 2 of 4) = **17.9 %** (INCONCLUSIVE → one re-fly); two in a
  row **3.2 %** (→ FAIL by §5 item 4).

## A2.12 Unchanged, and out of scope

Every bar of §4 not named in A2.1; the roster, arms (bar the G sitting's tags and order), grader rules beyond A2.7, §8,
§9 (plus: typed, manual, chip and answer-now paths are out of scope, K4). A1.1's T and window, A1.2's no audio guard
(contamination is now caught by 1(i), not a guard), A1.3, A1.4's pre/post split as corrected by A2.5.

## Hashes as read (sha256, node `crypto`)

- `PREREGISTER-flight-eq.md` `9ca3149bfb5ed44bff9f7d7c81e6203c15d9fe1b6442b47210ccfb59e2d14f44`
- `AMENDMENT-A1.md` `3e3f0ddd2ace1586bc4137394ee5c27868bf7ae121b73f1605519b8cd1d863c8`
- (inputs) `REVIEW-1.md` `6edf125fda2c06bee379c99573f5ceebede453a3f6e6cb67db32956a90367778`; `PLAN-REREVIEW.md`
  `50936b86b39ca15a30391b03ad4cce0b7294ddfb9312483edf3c8f0b6e41f958`

## Pre-hour build pieces, in dependency order

1. Plan Tasks 6, 7, 7b, 8 (each Opus-reviewed) → Task 9: LANDED (incl. `--no-block`), guarded dist build, four markers,
   c1 (n4 string), c2 39/39 + break, Step 5b with N2's env and text [b1, b2, b4].
2. P2 focused-off harness edit, its vitest + revert calibration, separate MAIN commit [ruling 3].
3. Task 10 smoke on MAIN's build: both segments CLEAN, WHY line, Step 6 hashes, `RESULT-smoke-eq.md`; the plan's n5
   accept-path call (1 request) [b3].
4. `eq-b4-cal.mjs` built and calibrated on the cuesmoke folder (or the §11 waiver) [N3].
5. P4 `window-eq.mjs` + cal [I4].
6. P5 `night-gates.ps1` + cal [I8].
7. P6 `guard-eq.mjs` (reg. + g1–g5) + `guard-eq-cal.txt` [b7, I8, I9].
8. Commit registration + A1 + A2 to MAIN `passes/` → registered HEAD [m5].
9. P7 launchers generated (HEAD, T known), guards-only chain, mangled marker, sha lines [b7, m4].
10. P9 part 1: register the dry task; run it → `GUARD OK` + `NIGHT GATES OK` in its log [b7].
11. P8 `eq-precheck.ps1` + cal with the dummy task (needs the dry task of step 10) [I9].
12. P9 part 2: register the flight at T and the precheck at T − 6; next run times printed [I9].
13. Arming (b9): ledger ≥ 475 / ≥ 372, falsefail DONE, nothing Running, no Electron/tail, no error log, §11 filled.
(Recommended, not required: b5 built and calibrated pre-hour, A2.5.)

**Not covered:** no tool above exists yet, so no calibration was run (my only runs: the price script, the ledger read and
the night-state read); the 4c price assumes independent arms; whether the cuesmoke folder calibrates the c2 builder n/n
is unknown (A2.9 decides both ways); the sameAnchor STRAY matcher's false-VOID rate on a clean hour is known only after
s50m's calibration; the ledger's request count after the smoke is estimated (~10 per model), not measured; whether K1's
screenshot path can fire on roster audio is unmeasured (expected never); 2c's 90-min span bar and the ≤ 44 per blind
file are judgement, not measurement.
