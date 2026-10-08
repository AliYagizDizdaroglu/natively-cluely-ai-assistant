VERDICT: APPROVE WITH FIXES

# Plan re-review: 2026-10-04-turn-followup-build.md, revision 2026-10-04 15:56 (Opus, 2026-10-05)

Scope: the closures of PLAN-REVIEW.md (C1, I1-I7, m1-m12), the new Task 7b against MAIN
`electron/test/golden/interview60.answers.mjs` at HEAD 89c8f53 (working tree clean for that file, checked) and
`L\flight-eq\PREREGISTER-flight-eq.md` §7 b4, and an URGENT check of Task 1's text. Read-only except this file;
throwaway scripts in the session scratchpad only.

Counts: 0 Critical, 3 Important (2 in the plan, 1 in the flight registration), 7 Minor. **Task 1: no defect (not URGENT).**

## Task 1 (already implemented) — holds

- A script compared Task 1's code block with `L\followup-context\earlierQuestions.ref.mjs` (sha256 0459f578…, matches
  the plan's citation): all 10 constants (INTERJECTION … CONSTRAINT_MAX_WORDS) identical, `gate` body (18 lines) and
  `firstSegment` identical, `wordsOf` identical bar the TS annotation.
- Every expectation of Task 1's test run on the REFERENCE gate: 19/19 must-fire with the stated cue, 10/10 must-not,
  the interjection, relative-`that`, constraint/27-word and `firstSegment` rows, null/blank: 0 mismatches.
  `SCENARIO50` items carry `id`/`q`; the static `.mjs` import has precedent (`roster.test.ts`, `interview60.flight.test.ts`
  import the same module; `allowJs: true`).
- The worktree already holds it: `eq-build` at 89c8f53 → 5c6394b (Task 1) → d32cc75 (Task 2);
  `earlierQuestionGate.ts` and `.test.ts` are byte-equal to the plan's blocks; `F\build\task-1-{red,green,mutant}.txt`
  show the planned FAIL → 7 passed → 1 failed on the mutant; root tsc 0 lines; the electron baseline file holds the six.
- Nit only (not a defect): the committed source comments (Task 1 line 230, Task 2 line 522) still say "scratchpad
  followup-…/…ref.mjs"; the sha pins identity. Optional wording fix in a later commit.

## Closures

| item | status | evidence |
|---|---|---|
| C1 paths → L | CLOSED | `SP` = L; no Temp path left (grep: only the launcher's `%TEMP%` error log, the stated convention); `commit-main-paths.ps1` starts EF BB BF (read: `239 187 191`), `ParseFile` 0 errors; Task 9 Step 3 re-checks both; guard chain run from the launcher's real folder (Task 10 Step 3). |
| I1 base / precondition | CLOSED | worktree base is 89c8f53 (its log); Step 1 diffs/statuses the 19 landed paths, `turnDispatch.test.ts` and the harness files included. |
| I2 nested `-File` | CLOSED | in-process `& … -Paths @(…)` array; the helper's `exit` returns from the script only; POST lines exist as the plan expects. |
| I3 TS2554 | CLOSED | the two 2-argument calls (test :56, :76, verified) become `…, null`; parameter stays required. |
| I4 flag-off vs today | CLOSED | the three characterization literals match `WhatToAnswerLLM.ts:211-239` at HEAD (read); green-before-change rule stated; Task 6 pins `calls[1].slice(0,8)`. |
| I5 seam parity | CLOSED | `interviewerLinesBefore` equals the replay's `interviewerLines` (`gate-report-turn.mjs:104,128-132`: trim, drop blank, drop empty capture, drop last); source (Task 3), dist (`parity-dist.mjs`, 117 rows, missing = FAIL) and smoke (Task 10 Step 6) checks; `gate-report-turn.mjs`'s CLI is behind its entry guard (:201). |
| I6 quick follow-up | CLOSED | `WHY` = "Why that one?" → `short` on the reference gate (run); played 30 s after S1Q06F; `NOT EXERCISED` is a FAIL. Residual named by the plan: if STT/turn machine does not pin a 3-word turn, the smoke blocks the flight until explained. |
| I7 tsc | CLOSED | MAIN's compiler by path; Setup Step 3 FAILS on any list but the six (the recorded file holds exactly them). |
| m1-m12 | CLOSED | each applied as the revision log says (m1 build→write→log with the throw test; m2 early return + "never called" test; m5 578; m8 mutants; m10 test E; m11 `beforeEach`). See n2 below for m10's name. |

## Task 7b — checked against `interview60.answers.mjs` @ 89c8f53 and b4

Correct: the module (`splitEarlierQuestion`, `withEarlierQuestion`) run from the plan's text passes all three invented
tests and the four refusals, and on all 21 gated entries of `R\s50{k,l,m}-gated-turn.json` (7 each; fields
`userA`/`userB`/`block` present): strip → `userA`, re-insert → `userB`, `userA` refused, 0 failures; `withEarlierQuestion`
equals the reference's `insertBlock` on the invented shapes. Harness edits are placed where the names they use exist
(`CAPTURED` :91, `TAG` :63, `CUES_*` :100-101, `IS_GROQ` :52, `require`/`PROJ` :31-32; precheck inside `if (CAPTURED)`
after the uncaptured check, so `CAPTURED[id]` exists; call :318; `sentSystem` :336 untouched). b4 is met on: needs
`--captured` + `--tag`; strips exactly `${LABEL}\n- <one line>\n\n` before the marker; exit 2 on a prompt without one;
never prints a prompt (refusal names the id; the store keeps no prompt); vitest byte rule in reverse on `userB` + `userA`
refused. Exclusivity with `--cues/--no-cues` costs the flight nothing (no arm needs both); `--thinking LOW` still combines
for `captured-no-block-low`.

### Important

**N1 — Task 7b Step 7 cannot run as written, and its fallback is unsafe.** `interview60.answers.mjs:33-35` require
`dist-electron/…/prompts.js` and `verbalStreamFilter.js` at module top, before ANY option check, and `PROJ` is derived
from the script's own path (:30-31), not the cwd. The worktree has no `dist-electron` (checked), so both probes die with
MODULE_NOT_FOUND (exit 1). The fallback "run both from `<MAIN>`" does not help with the WT script (cwd is irrelevant),
and with MAIN's script (pre-landing, no `--no-block`) probe 1 runs a plain tagged arm with the dummy key (four retries
per item, writes `interview60.answers.gemini-3.1-flash-lite_x.json` into MAIN's golden folder) and probe 2 exits 2 for
the WRONG reason (`--captured has no prompt for …`: the parity fixture is keyed `<hour>:<id>`) — a false pass on an
exit-code-only check. Fix: replace Step 7's text with: "First `Set-Location <WT>; node scripts\build-electron.js --force`
(Task 8 Step 4 deletes the WT dist). Then, with `$env:GEMINI_API_KEY='not-a-key'`, run the WT script three times and
require exit 2 AND the stderr text: `--no-block --tag x` → `needs --captured`; `--no-block --captured <F>\R\turn-parity-s50m.json`
→ `needs --tag`; `--no-block --captured <same> --tag x --no-cues` → `are exclusive`. Then run Task 9 Step 5b's refusal
probe here too, against the WT script (with N2's env). Delete the 'run from MAIN' sentence."

**N2 — Task 9 Step 5b exits 2 for the wrong reason.** `roster.mjs:36` defaults to `interview60`; `S1Q04F` is not in
it (0 hits in `interview60.questions.mjs`), so `--only S1Q04F` stops at `:290-292` (`--only names questions not in roster
interview60`) before the `--no-block` precheck. Fix: prefix the command with
`$env:NATIVELY_ROSTER='scenario50'; $env:NATIVELY_SCENARIOS='S1,S2';` (remove both after), and make the expected
result "exit 2 AND stderr contains `--no-block: the captured prompt for S1Q04F carries no EARLIER QUESTION block`"
(an exit code alone is uncalibrated: three other refusals also exit 2).

**N3 (flight registration, not the plan) — b4's last clause has no owner.** b4 lists "calibrated on the smoke's
capture: the two gated ids strip to bytes whose sha equals the flag-off reproduction of c2's builder" as part of the
gate; the plan (Task 10 Step 6, last paragraph) hands exactly that comparison to "the flight's controller", and no step
or script in the registration performs it. Fix: add to PREREGISTER-flight-eq §7 b4 one line naming the step and its
script (e.g. `E\eq-b4-cal.mjs`: builder flag-off reproduction for S1Q04F/S1Q06F of the smoke run vs the stripped sha12s
in `RESULT-smoke-eq.md`, printed as hashes, quoted in §11) — or record a waiver in §11 before arming.

### Minor

- **n1 (Task 7b Step 5, mutant 2)** `removed.slice(0, -1)` makes `splitEarlierQuestion` return `null` (the one-line
  check sees the trailing `\n`; run), so the tests fail on non-null, not because "the stripped user keeps one `\n`"
  (`user` is built from `slice(0, first) + slice(mi)`, independent of `block`). Use instead `user.slice(mi)` →
  `user.slice(mi - 1)`: the round-trip `s.user === off` assertions then fail for the stated reason.
- **n2 (Task 5 Step 4b)** `WhatToAnswerLLM.hedgeCues.test.ts` already has an `it('E. hedge OFF …')` (:191); name the new
  case `F. every leg …` (and in Task 9's commit list nothing else changes).
- **n3 (Task 7b Step 4)** "Without `NATIVELY_EQ_PARITY_DIR`: 3 passed, 3 skipped" — with `GATED` empty the `for` loop
  registers no test, so vitest shows 3 passed and 0 skipped tests; write "3 passed (the fixture describe holds no test)".
- **n4 (registration text now stale against the plan)** §7 b1 quotes `PARITY DIST: … + 29 invented cases; mismatches 0`
  — the script now prints `+ 117 captured prompt-line rows` too; §3 and b3 say `200..577` (plan: 578, m5) and b3 omits
  `WHY: gate=parent-in-prompt cue=short`; §1/§11 count a separate "`--no-block` commit" while Task 9 lands it inside the
  one LANDED commit. Amend those four strings before arming so the guard/readers compare against what is printed.
- **n5 (residual, Task 7b)** the CLI's accept path (`blockVariant` feeding the request, the header clause) is never run
  before the flight's G arms: Step 7/5b exercise refusals only, Task 10 Step 6 calls the module, not the CLI. State it in
  STATES.md; optionally the flight controller runs one `--no-block --only S1Q04F --limit 1` call on the smoke's capture
  (1 request) before arming.
- **n6 (outside this plan)** `F\build\progress.md` records the user's 2026-10-05 ~16:20 ruling "fly TONIGHT"; the
  registration's §2 window (playback start 12:00-15:00, "outside the window the hour cannot PASS") and §6 (13:30, 10:45
  ledger read) then need a dated amendment before arming.
- **n7 (nit)** the source comments' "scratchpad" wording (above); no action needed for parity.

## Not shown

- No vitest, tsc, build or CLI run here (read-only): the 7b vitest file, the harness edit and the WT build were not
  executed; the module was run from the plan's text in plain node only.
- Tasks 2-7 code was re-checked only where a C/I/m closure touches it (I3-I5, m1, m2, m10, m11); Task 2 is already
  committed in the worktree (d32cc75) and was not diffed against the plan.
- Whether the turn machine/STT pins the 3-word `WHY` turn live (I6's residual) and whether test E's two legs carry
  identical `contents` in LLMHelper (m10) are unproven until those steps run.
