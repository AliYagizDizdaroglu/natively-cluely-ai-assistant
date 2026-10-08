# Review: eq-gsitting.ps1 (c05c0be3b55c) + eq-gsitting.cal.mjs (601d1180112e), 2026-10-06 01:12 TST

Reviewer: Opus subagent. Read-only apart from this file. The cal was re-run (stubs only): `TOTAL 58 PASS 0 FAIL (mutants killed 15 of 15)`, 136 s.
No model was called. eq-gsitting.ps1 was not run for real. No scheduled task was touched; one read-only `Get-ScheduledTask -TaskName 'Natively-*'` listing showed that the wildcard works and that every task is Ready.

## Verdict: NOT READY. One BLOCKING finding (B1). After B1 is fixed, the runner is READY WITH FIXES (I1 to I4 before the sitting).

## Checked and correct

- **Order, tags, models, thinking levels, `--no-block`.** All match A2.2 and the A3.4 counterbalancing exactly.
  - Front 3.5-lite HIGH: reps 1, 3, 5 run block first; reps 2 and 4 run no-block first.
  - Back 3.1-lite LOW: reps 1 and 3 run block first; rep 2 runs no-block first.
  - The args equal `PAIRED_ARMS`' captured-high and captured-low (`--thinking HIGH|LOW`, `--captured`, `--only`): interview60.flight.mjs l. 189–200 and 367, with `ANSWER_MODELS` = [3.1, 3.5] at l. 59.
  - The tags equal eq-twins' `BASE_TAG` and `tagOf` (`-rK` for rep > 1).
- **Log format against eq-twins.** I generated a log in the runner's exact line shapes, in its plan order, with GSITTING lines interleaved, and fed it to eq-twins' `parseSitting` and `sittingCheck`.
  - Clean log: problems [], gates true.
  - Step 5 lasting 16 min: bad = ["r3 (16.0 min)"], so 2c is reported.
  - Rep 2 swapped: refused (order and step-number problems).
  - So the parser agrees with the runner, and the check responds to a known-bad input.
- **Holes.** A transient hole makes answers.mjs store `transientError` and exit 0, so a hole does not stop the sitting. That is correct.
- **Cue state.** The sitting replays the captured bytes, so the cue rule rides in the bytes exactly as the hour sent them. No cue flag reaches answers.mjs; it only reads the keys from the environment. Nothing is stripped other than the block.
- **Refusals present and calibrated.** Each has a killed mutant:
  - the A7 I3 cutoff;
  - a Natively-* task Running;
  - electron.exe running;
  - the ledger unreadable;
  - G_twin unreadable, a count mismatch, a duplicate id, or fewer than 3 ids;
  - b4cal TRANSCRIPT DIFF, or BLOCK FAIL other than marker-first;
  - the m6 bars;
  - stale outputs;
  - an existing STEP log.
- **Running past 10:00.** A sitting that runs past 10:00 is allowed to complete. That is consistent with the controller ruling R4 in ARMING-flight-eq.md l. 21.

## Findings

### B1 BLOCKING: the child does not get the launcher's NON-empty variables, so step 1 exits 2 and the sitting dies

- **The cause.**
  - Lines 182–187 only CLEAR the names that launch-eq.cmd leaves empty.
  - The launcher also SETS `NATIVELY_ROSTER=scenario50` and `NATIVELY_SCENARIOS=S1,S2`, among other names.
  - answers.mjs takes its roster from roster.mjs, which reads `process.env.NATIVELY_ROSTER || 'interview60'`.
- **Measured** by importing roster.mjs read-only (scratchpad rp.mjs):
  - unset: `interview60 76 … S1Q04F:false S1Q06F:false S2Q05F:false S2Q08F:false`;
  - with `scenario50`: `scenario50 40 … all true`.
- **What follows.**
  - Unless the controller's shell happens to carry NATIVELY_ROSTER, step 1 exits 2 with `--only names questions not in roster interview60`.
  - The runner then stops, and gsitting.log holds STEP lines, so every re-run refuses (see I2).
  - No quota is spent, but there is no sitting.
- **Why the cal missed it.** The stub ignores the environment, and `-WhatIf` cannot see it. The env seam is never crossed.
- **Fix.**
  - Apply every `set (NATIVELY|I60)_X=value` line of launch-eq.cmd as well, not only the empty ones. That is "the launcher's env block" (A2.10).
  - Or set at least NATIVELY_ROSTER and NATIVELY_SCENARIOS from the launcher.
  - Refuse if launch-eq.cmd is missing or yields 0 names. Today that case is a silent `cleared-env=0`.
  - Add a cal case whose stub exits 2 unless `NATIVELY_ROSTER=scenario50` reaches it, with a mutant.

### I1 IMPORTANT: the inputs are not tied to `-Run`, and the b4cal `LABEL OUTSIDE --g` line is ignored

- **No run check.**
  - Neither the reader's `READER <run>:` line nor b4cal's `B4CAL run=<run>` is compared with `Split-Path -Leaf $Run`.
  - A reader file or b4cal file from the smoke would be accepted. The smoke has the same four ids as the cal stub, so this is a realistic mix-up.
- **The LABEL OUTSIDE line.**
  - Under A5.5 B-I1 and A5-RECHECK m4 (adopted by A6), a non-empty post-hour `LABEL OUTSIDE --g` line means `--g` was built wrong: rebuild and re-run b4cal.
  - The runner never reads that line, so it starts on a b4cal read that the registration says to redo.
- **Fix.**
  - Require exactly one `LABEL OUTSIDE --g NONE` line.
  - Require the run names to match `-Run`.
  - Optionally, require G_twin ⊆ the b4cal `[ids]`.

### I2 IMPORTANT: there is no recovery path after a failed step

- A3.1b T1 says: "an exit 2 from `--no-block --only <G_twin>` is a tool defect … found, fixed, … re-run and named".
- After any non-zero step:
  - the STEP-log refusal blocks every re-run;
  - the stale-output refusal blocks the canonical tags for steps that wrote files;
  - eq-twins accepts only the canonical tags (or the `-b` tags) with STEP lines in that same log.
- So the only recovery is hand-moving the log and the outputs, which nothing defines or records.
- **Fix.** Define the path: for example a `-Restart` that requires the old log to be renamed aside and records the rename. Note that a step which exited before writing its output file drew no answers, so its canonical tag is still clean.

### I3 IMPORTANT: no tool writes the `-b` hole re-run

- A3.4 m5 and A4.4 m11 call for `…-rk-b` pairs run back to back under the 15-min condition.
- eq-twins' `sittingCheck` requires start and end STEP lines for the substituted `-b` tags in gsitting.log. It refuses the whole `--eval` otherwise, not only 2c.
- The runner has no `-b` mode and refuses to write to a log that holds STEP lines. A hand-run re-run therefore makes `--eval` refuse; the alternative is hand-written STEP lines, which would be fabricated evidence.
- **Lower urgency.** Per NOTE (b), hole pairs are excluded and only 3a goes INCOMPLETE, at ≥ 2 incomplete pairs per rep. Measured hole rate on captured arms: 1 in 528 (h40c and h40d, 12 files).
- **Fix.** Add a `-HoleRerun <leg> <rep>` mode before it is needed:
  - append steps n > 16 with the `-b` tags, both steps back to back;
  - keep `--only <G_twin>` (eq-twins M3);
  - apply the same cutoff and m6 refusals.

### I4 IMPORTANT (the projection, question 4): 48 min is justified at |G_twin| ≤ 6 for normal provider latency, with one unbounded tail

- **Measured** from the captured arms of h40c and h40d: per call = total + 1.5 s sleep, worst 4 consecutive calls per file.
  - 3.5-lite HIGH: p50 3.4–4.2 s in 5 of 6 files; worst-4 = 22–50 s.
  - The exception is h40d `captured-high`: p50 11.1 s, max 46.4 s, worst-4 = 120 s.
  - 3.1-lite LOW: worst-4 = 24–36 s.
- **So 3 min per step at |G_twin| = 4:**
  - about 4–7× typical;
  - 1.5× the worst window observed;
  - at |G_twin| = 7 (the m7 maximum), h40d's slow window gives about 210 s per step, which is over the budget.
- **The unbounded tail.**
  - answers.mjs has no fetch or stream timeout, so a hung stream blocks without limit.
  - The runner has no step timeout, so one hang can break the 15-min condition and run past 10:00.
- **What the spec allows.** The registration fixes "3 min × 16 steps", and R4 allows running past 10:00, so this is not a spec breach.
- **Fix.** At minimum, log a GSITTING note when a step exceeds about 10 min. Consider a per-step watchdog that stops the sitting (exit 1) rather than letting it hang.

### m1 MINOR: the 15-minute note measures the wrong interval and is wrongly worded

- Lines 208–210 compute `now − start(first step)` AFTER the second step ends. That is first start → second END, which overstates the start gap by the second step's duration.
- It also fires for back-leg reps and says "2c is reported", but 2c reads front reps only.
- eq-twins computes the gap correctly from the log, so only the note can mislead the result note.
- **Fix.** Measure at the second step's start, and restrict the "2c" wording to the front leg.

### m2 MINOR: the m6 cross-check counts only app-log lines

- `500 − ledger mentions` counts only app-log lines. quota-ledger-today.mjs lists the harness answer files but does not count their calls, and the harness calls are the bulk (≈ 300 on 3.5-lite).
- So the check cannot catch a controller headroom figure that omitted harness calls.
- The A2.2 estimates leave about 165 (3.5-lite) and 255 (3.1-lite) of headroom against bars of 52 and 32, so the practical risk is low.
- The result note should say that the headroom figure is the controller's count, and the runner only bounds it from above by app calls.

### m3 MINOR: outputs are COPIED, not moved

- Outputs are copied into the run folder, while A2.10 says "moved".
- This matches the harness's own `copyFileSync` behaviour, but the 16 files stay in MAIN's golden folder.
- Name it as a departure in the result note, or move the files.

### m4 MINOR: the runner refuses itself if launched from a Natively-* task

- The runner refuses if any Natively-* task is Running, including the task that launches it, should the post-hour chain ever run inside a Natively-* task.
- Today the post-hour chain is run by the controller, so this does not fire. Document it.

### m5 MINOR: A2.5 is not enforced

- A2.5 requires the runner's own sha line in `E\instruments.sha256.txt` before its first run. The file does not exist yet.
- That is a controller step; the runner could refuse without it.

## Not covered

- No real answers.mjs call, so the following are unverified live:
  - the Gemini key reaching the child;
  - `--no-block` loading earlierQuestion.js from the flown dist;
  - Start-Process quoting with a real prompts path.
- The other non-empty launcher names (NATIVELY_EARLIER_QUESTION=1, STT, FOCUSED, EQ_T): answers.mjs reads none of them today. That was checked by grepping answers.mjs for `process.env`. The modules it imports were not traced.

## Re-review (scoped, 2026-10-06 05:25–05:40 TST): eq-gsitting.ps1 23822d03ba6e, cal 124b9f7f35c5, eq-twins 592d8cad52f7

All three shas were recomputed and match.

**Calibration.** I re-ran the cal with stubs only: `TOTAL 119 PASS 0 FAIL (real-script checks failing: 0; mutants killed 31 of 31)`, 521 s.

**Reviewer end-to-end test** (stubs, temp root, deleted afterwards):
- It used the REAL launch-eq.cmd text and the REAL eq-twins functions.
- The parent environment carried wrong values on purpose: ROSTER=interview60 and THINKING_LEVEL=HIGH.
- The sequence was:
  1. Normal run. Step 6 (the second step of front rep 3) fails with exit 3 and leaves a partial file. The runner exits 1.
  2. `-Resume`. Exit 0, 11 steps run.
  3. `-Holes "3:S1Q04F;b2:S1Q06F"`. Exit 0, 4 steps run, numbered 17–20.
- The tags came out as `captured-g-high-r3-b`, `captured-no-block-high-r3-b`, `captured-no-block-low-r2-b` and `captured-g-low-r2-b`.
- The order was counterbalanced: front rep 3 ran block first, back rep 2 ran no-block first.
- The log reported `env-set=7 env-cleared=29` and the stub's environment check passed.
- The failed attempt's lines became `GSITTING failed-attempt STEP 6 …`. The folder `failed-6-<stamp>` holds the pre-resume log, the partial answers file and the step-6 out/err files.
- What eq-twins read from the result:
  - `resolveSteps`: substituted `front r3, back r2`.
  - `sittingCheck(parseSitting(log))`: problems [], gates true.
  - `loadStores`: "front r3: -b fills S1Q04F; 3 complete original pair(s) kept", "back r2: -b fills S1Q06F; 3 … kept". Both sides of each filled pair come from `-b`.

| item | state | evidence |
|---|---|---|
| B1 | CLOSED | Full env block applied: set 7, cleared 29 on the real launcher. Refuses on a missing file, 0 names or no ROSTER. Env-crossing cal stub plus 3 mutants. My end-to-end run crossed the seam against wrong parent values. |
| I1 | CLOSED | The reader's first `READER <run>:` line and `B4CAL run=` must equal `-Run`. In eq-flight-read the run line comes first: `say` buffers, and the run line is printed before `r.out`. A `READER REFUSED/UNREADABLE` line fails closed. `LABEL OUTSIDE --g NONE` must appear exactly once. |
| I2 | CLOSED | `-Resume` as above. The STEP rewrite and the copy-not-move departure are recorded in NOTE addendum 2 §3. |
| I3 | CLOSED | `-Holes`: tags equal eq-twins' `tagOf(…, true)`; rep 1 is `-r1-b`, which resolveSteps accepts. `--only` = the hole ids (addendum 2 §4 N2). Numbering continues from the log's maximum. A second run on the same rep refuses. An id that is not a hole refuses. eq-twins accepts the result end to end. |
| I4 | CLOSED as asked (minimum) | Slow-step note after 10 min. There is still no watchdog: a hung stream still blocks, as named in the build report. |
| m1 | CLOSED | The gap is measured start to start, front leg only. |
| m2, m4, m5 | open, MINOR, unchanged | m2 is recorded in addendum 2 §3.3; m4 and m5 are named in the build report. |
| m3 | CLOSED as a departure | Recorded in addendum 2 §3.1. |

**New findings (both MINOR, neither blocks):**
- **n1 MINOR: resuming the SECOND step of a front pair writes no gap note.**
  - The first step's start lies in the earlier call, so `$vStartAt` lacks it and the runner writes no note.
  - If fixing the cause takes more than 15 min, the rep breaks the 15-min condition.
  - eq-twins still computes it from the log and reports 2c for that rep. Nothing is lost, but the result note should name a resume that lands mid-pair.
- **n2 MINOR (environment, not the runner): long paths.**
  - Windows PowerShell 5.1 `Test-Path` returns False on paths over about 260 characters. My first end-to-end attempt under the deep scratchpad falsely refused with "step 1 is clean in the log but its output file is missing".
  - The real paths (MAIN golden, E) are about 120 characters, so this does not apply on the day.
- **Recorded, not a finding: a resume re-draws answers under the canonical tag.** If a failed step had drawn answers before it failed, those answers are discarded (kept in `failed-<n>-<stamp>`) and drawn again under the same tag. Addendum 2 §3.2 records the move. The result note should say whether the moved file held any answers.

**Not covered:**
- No real answers.mjs call: the key reaching the child, `--no-block` against the flown dist, and real quoting are unverified.
- The hole check's `ConvertFrom-Json` was tested on stub-sized stores only.
- A runner killed mid-step was tested only through the cal's start-only log case.

**Verdict: READY.** B1 and I1–I4 are closed. Open: m2, m4, m5 (unchanged MINOR) and the new MINORs n1 and n2. None blocks.
