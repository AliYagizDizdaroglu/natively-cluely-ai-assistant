# Amendment A4 to PREREGISTER-flight-eq.md: A3-RECHECK's fixes, the b10 contract, the power gate, choosing T (pre-data)

Written **2026-10-05, begun 17:25 TST by `date`** (Opus, amendment author; a separate fresh Opus re-checks it). Built on
the registration (`9ca3149b…`), A1 (`3e3f0ddd…`), A2 (`0bd449be…`) and A3 (`36aa8000…`), all unedited; full hashes are
at the end. **The hour has not flown and no datum exists.** Precedence: **A4 > A3 > A2 > A1 > the registration.** Every
bar, clause, arm and count not named here stands. A2's binding user constraints and U1 (4c, +1 margin) stand.

**Controller inputs folded in:**
- **(1) Cue grading rev 6.** `L\cue-grading\PREREGISTER-cue-grading-rev6.md`, sha256 `ab13dc2e…94af3`, read in full in
  its "Input contract: b10's export" section; its re-check is still running.
- **(2) Tools 3, 6 and 7 are BUILT.** See `E\tools-367-report.md`; my reading of it is in A4.3. Their Opus review
  (`E\tools-367-review.md`) **was not out at 17:27** (checked with `ls`). Everything A4 says about these tools is
  therefore my own reading, and the assumptions are named. If that review rules otherwise on a point A4 settles, its
  ruling goes into a dated note before arming, and the stricter of the two holds.
- **(3) How T is chosen** (the re-check's m8).

## 0. Resolutions

| item | resolution | binds at |
|---|---|---|
| **I1** TRANSCRIPT is a renderer fixed point | ADOPTED as worded. The built cal already flips (c) and (e) by upper-casing a window (non-final) letter. Case (c′) is added (lowercase swap → OK, the blind spot printed). §9 names the limit | A3.1a (A4.1) |
| **I2** 5d vs 1(e) collision; 1(e) narrowed; BLOCK vacuous | ADOPTED with one clarification. 5d reads on every LABEL capture; inside a `gate=block` window it satisfies 1(e). A LABEL capture in a non-block window = 1(e) VOID (the pairing is broken), with its 5d reading reported. 1(e)'s second half is restored. Post-hour `--g` = the ids whose kept entry includes the LABEL | A3.1a, A3.1b (A4.1) |
| **m1** misquote; BLOCK clauses | ADOPTED | A3.1a (A4.1) |
| **m2** `main.ts:2192` | ADOPTED | A3.1b (A4.2) |
| **m3** "immediately before" too strict | ADOPTED: same dispatch window, no other pinned line between | A3.1b (A4.2) |
| **m4** verbal-diag cumulative | ADOPTED: the fast-route signature is the verbal-diag `route:` line, run window only; the real-shape case is restated | A3.1b (A4.2) |
| **m5** stale A2 text | ADOPTED: (a) b6 span → A3.4 rule; (b) `eq-b4-cal` output line; (c) gsitting refuses on BLOCK FAIL; (d) A2.9's first sentence reworded | A2.9, A2.10 (A4.4) |
| **m6** third probe cannot run | ADOPTED: `cwdprobe-3` (regex extended), no `--model-id`, reported only | A3.5 (A4.5) |
| **m7** dummy commit on MAIN | ADOPTED: HEAD-moved calibrated by `NATIVELY_FLIGHT_COMMIT` = parent sha; never a commit on MAIN to test | final list 8 (A4.7) |
| **m8 / input (3)** T circular | ADOPTED and specified: T chosen at step 10 as now + 45 min, rounded up; regenerate on overrun | A1.1 (A4.6) |
| **m9** ARMING sha before the file exists | ADOPTED: the launcher prints `ARMING absent` and continues; the precheck gates on presence | P7, P8 (A4.6) |
| **m10** fast-route referent | ADOPTED: "referent UNREAD (fast-route)", reported only; 4a still reads | rule 5b (A4.2) |
| **m11** `-b` pair replaces | ADOPTED | A3.4 (A4.4) |
| **m12** dry-run duration; n5 file path | ADOPTED | final list 5, 11 (A4.7) |
| **input (1)** b10 contract | ADOPTED **by reference, verbatim**: rev 6's "Input contract" is b10's output contract. The cue-effect report becomes **counts-only** | reg. §7.b10, §4 cue-effect paragraph, §8 (A4.3a) |
| **input (2)** power gate | RULED: OK iff no battery, OR (AC line online AND BatteryStatus ∈ {2, 3, 6, 7, 8, 9, 11}). **Status 2 now also requires the AC line online** (stricter than the built tool), so no battery-only state passes. One case is added | P5 (A4.3b) |

## A4.1 `eq-b4-cal` and the 5d / 1(e) boundary (I1, I2, m1)

**I1. Added to A3.1a:** TRANSCRIPT checks only that each transcript part is a fixed point of the app's renderer
(`prepareTranscriptForWhatToAnswer` + `pinSettledQuestion`). It is not compared with the log, so a renderer-producible
change is invisible to it. **§9 names this** beside the before-marker limit.

Cal cases, replacing A3's (c) and (e):
- **(c)** As (b), with one NON-final line of X's transcript part (X chosen with ≥ 2 transcript lines) given an uppercase
  letter in place of a lowercase one → `TRANSCRIPT DIFF X`.
- **(c′)** As (b), with a lowercase-for-lowercase swap in that same line → `TRANSCRIPT OK`. The driver prints this as
  "documented blind spot".
- **(e)** The same uppercase change in one non-G id's non-final line → `TRANSCRIPT UNCALIBRATED 1`.

The built driver already makes (c) and (e) exactly this way: `eq-b4-cal.cal.mjs:34–44` upper-cases a window turn, not
the pinned line, and both cases passed (`eq-b4-cal.cal.txt`). Only (c′) is new. If a driver change is needed for (c′),
the tool's sha is re-recorded.

**m1:**
- The module has `removed = user.slice(first, mi)` and `block = removed.slice(0, -2)`. A3's quote `removed = block +
  '\n\n'` is withdrawn; the arithmetic (+ 2) stands. The A3 re-check verified it against `WhatToAnswerLLM.ts:234-250`,
  and the built tool's +3 mutant flipped.
- The length clause cannot fail when the split is non-null. It is kept as a consistency assertion, so named.
- The round-trip clause is the real check. It would false-FAIL only if `INTERVIEWER JUST SAID:\n` occurred before the
  LABEL, since `withEarlierQuestion` uses the first marker. That case is named, and a BLOCK FAIL on it is read by hand
  from ids before 5d is applied.

**I2. Replacing A3.1b's 5d / 1(e) bullets:**
- **5d is read first, on every capture that carries the LABEL**: the per-dispatch captures and the
  `interview60.prompts.json` entries, whatever the window's signature or gate. LABEL present and `splitEarlierQuestion`
  null = malformed.
- **A malformed capture in a `gate=block` window = 5d**, a feature-attributable FAIL. It satisfies 1(e)'s first half
  and is never UNEXPLAINED.
- **1(e) (final form):**
  - (first half) "every `gate=block` window that carries none of the screenshot, `knowledge-short-circuit` and
    `fast-route` signatures has a capture carrying the LABEL";
  - (second half, A2's restored) "every capture carrying the LABEL, well-formed or not, has a `gate=block` window".
- **A LABEL capture in a non-block window = VOID 1(e).** The diag/capture pairing itself is broken, so no FAIL can be
  attributed. The capture's 5d reading is reported beside it, and the id is named.
- **After the hour, `eq-b4-cal` runs with `--g {id : prompts[id].user includes LABEL}`**, not G_twin, so BLOCK FAIL can
  fire on a malformed kept entry. The built tool already reads a `--g` id without a well-formed block as `BLOCK FAIL`
  (report case (g)).
- **Reader cal case added:** a synthetic non-block window whose capture carries a malformed LABEL → 1(e) VOID, id
  named, its 5d reading printed.

## A4.2 Reader signatures (m2, m3, m4, m10)

- **m2.** `[Main] screen reference: captured ` is at `main.ts:2192` at 355ad0a; the `capture failed` warn is at
  `:2194`.
- **m3.** A signature line belongs to a window if it lies **in the same dispatch window, before that window's
  pinned-question line, with no other pinned-question line between them**. This applies to the screenshot and override
  lines.
- **m4, fast-route.** The signature is a **`verbal-diag.log` line `route: FAST-OVERRIDE` or `route: BEHAVIORAL`**
  (`WhatToAnswerLLM.ts:285`, logged on every call) **with its timestamp inside that dispatch window**. The debug-log
  `intent override → behavioral` line is optional corroboration and is printed when present. `verbal-diag.log` is
  cumulative: lines outside the run window are counted and ignored.
- **m4, calibration cases (replacing A3's real-shape case):**
  - Run window only, on s50m and on s50l: each gives 1 debug-log override line and 1 verbal-diag `BEHAVIORAL` line,
    both at S1Q01. Out-of-window verbal-diag route lines are counted and printed as ignored (s50m: 23).
  - Plus a synthetic window carrying only a verbal-diag `route: BEHAVIORAL` line → `fast-route`.
- **m10.** For a `fast-route` G item, rule 5b reads "**referent UNREAD (fast-route)**", reported only; 4a still reads its
  answer.

## A4.3 The b10 contract and the power gate (inputs 1, 2)

**A4.3a b10 = rev 6's input contract, by reference.**
- The exporter `E\eq-cues-export.mjs` writes exactly what `PREREGISTER-cue-grading-rev6.md` (sha256
  `ab13dc2eeb3404bc2d927e5e12eb8bedaec0938a63e5e1a555a4c53bba494af3`), section "Input contract: b10's export", requires.
  This covers:
  - the files, at E-relative paths `cues-export-eq.json` and `cues-export-eq.completeness.txt`, the latter carrying
    `LOG <basename> <sha256>` and a last line `EXPORT COMPLETE` | `EXPORT INCOMPLETE: <ids>`;
  - schema `"cues-export-eq/1"`, with top-level keys `schema`, `runDir`, `registeredHead`, `window`, `entries`;
  - in-app entry keys `id, arm, rep, dispatchedAt, cues, empty, logLine`;
  - twin entry keys `id, arm, rep, src, cues, empty, dispatchedAt, logLine`, taken from the six `captured-high{,-r2,-r3}`
    and `captured-low{,-r2,-r3}` files;
  - the forbidden fields (`answer`, `spoken`, `question`, `prompt`, `reason`, any score), ids outside the 40, and
    duplicate pairs or triples.
- Where the registration's b10 text (§7.b10) differs, **rev 6 wins**.
- **Rev 6's re-check is still running.** If it changes the contract, the change reaches b10 only through a dated
  flight-eq note, before the exporter's first run on the run folder (A2.5).
- b10's registered calibrations (h40d's folder 47 → 45 + 2, the 05:00 re-smoke 20/20, an empty block named, a missing
  line → INCOMPLETE) stand. Added: a synthetic entry carrying a forbidden field → the exporter refuses, and a twin entry
  whose `cues` differs from its record → the exporter's self-check refuses.

**Counts-only cue reporting.** This hour's cue-effect report (reg. §4, the "Reported: the cue effect" paragraph) and the
b10 completeness lines print **counts, ids and classes only**:
- **Never** a cue's text, a quoted trim, or a `check-smoke-cues` line that carries cue text.
- `check-smoke-cues` is reported as `CLEAN` or `NOT CLEAN` with counts per class and ids. The registration's "trims
  quoted" is withdrawn.
- Each re-pointed cue instrument (`check-smoke-cues` v4, `smoke-facts`, the twins and thoughts scripts) writes its full
  output to `E\cue-report\` (never printed, never committed). Only a counts-only summary line set is quoted.
- **Calibration:** a leak checker reads the export's cue strings and the summary, and prints only `leak 0` or
  `leak <n>` (no text). Run on the summary produced from the h40d folder's re-point, it must print `leak 0`. A mutant
  summary with one cue string inserted must print `leak 1`.
- The controller therefore sees no cue text before cue grading.

**A4.3b The power gate (P5).**
- **Rule: OK iff no battery is present, OR (`GetSystemPowerStatus` AC line = online (1) AND `Win32_Battery`
  BatteryStatus ∈ {2, 3, 6, 7, 8, 9, 11}).**
- **Anything else = FAIL**: line offline, line unknown (255), and statuses 1, 4, 5 or 10.
- Intent: "on AC power". The AC line is the primary signal, and the battery status may not contradict it.
- **Departure from the built tool:** it keeps A2's literal "status 2 → OK" even with the line offline. A4 requires the
  line online for status 2 too, so a battery-only state can never pass.
- **Cal case added:** status 2 + line offline → FAIL power. This flips the current build. Its existing cases stand
  (6/3 online OK; 6 offline FAIL; 1/5 online FAIL; no battery OK) and its seven mutants stand.
- Today's real reading is status 2 with the line online, which is OK under both rules.
- **Assumed** (the tool review not being out): the other reported departures are accepted as within A2/A3 —
  - the pause is judged on its expiry only;
  - the registry, not the effective policy, is read (named in "not covered");
  - `window-eq`'s stricter ISO parsing.

## A4.4 Stale A2 text (m5, m11)

- **(a)** A2.10's b6 "span (≤ 90 min) for 2c" and cal "span 120 min → 2c REPORTED" are replaced by A3.4's rule.
  - Cal: one front rep's two steps starting 16 min apart → 2c REPORTED, naming the rep.
  - Cal: every rep ≤ 15 min, inside a 120-min sitting → 2c gates.
- **(b)** A2.10's `B4CAL non-G n/n …` output line is replaced by the built tool's lines: `B4CAL run=… ids=N g=K`, then
  a TRANSCRIPT line and a BLOCK line. Exit codes: 0 = OK, 1 = DIFF or BLOCK FAIL, 3 = UNCALIBRATED only, 2 = refusal.
- **(c)** `eq-gsitting.ps1` also refuses on `BLOCK FAIL`. Cal: `-WhatIf` with a fake b4cal file reading BLOCK FAIL →
  refuses.
- **(d)** A2.9's kept first sentence now reads: "`eq-b4-cal` checks the stripped bytes as A3.1a/A4.1 define (renderer
  fixed point + block round trip)". It no longer claims to prove the twins send flag-off bytes.
- **m11.** A hole re-run's `-b` pair **replaces that rep's original pair on both sides**; the two are never mixed. b6
  reads the `-b` tags in place of the originals and prints the substitution.

## A4.5 Graders (m6)

- The alias read is `cwdprobe-3 --probe`, **without `--model-id`**, in a fresh cwd, after the two pinned probes.
- `launch-grader.mjs:211`'s probe regex is extended to `cwdprobe-[123]` in the same edit as `--model-id`.
- Cal: `cwdprobe-3 --probe --dry-run` is accepted, and its argv shows `opus`.
- The probe's model is reported only.

## A4.6 Choosing T, and the arming record's sha (m8, m9, input 3)

**T is chosen at final-list step 10** (launcher generation): **T = the first quarter-hour ≥ now + 45 min, and never
earlier than 19:30.** The 45 min covers steps 11–14, estimated at about 15–25 min (dry run ≤ 5, precheck cal ≈ 6,
registration ≈ 1, arming ≈ 5), plus a margin of ≥ 20 min. **If T > 01:00, there is no flight tonight.**

**Overrun:** if step 14 ends later than **T − 10 min**, regenerate from step 10 with a new T computed the same way, then
re-run step 11 (the dry run, under the new `NATIVELY_EQ_T`), step 13 (re-register both tasks) and step 14 (the arming
record names the new T). Step 12 does not depend on T and is not re-run. The superseded T and the reason are written in
the arming record.

**m9:**
- The launcher prints `ARMING sha256=<…>` if `E\ARMING-flight-eq.md` exists, else `ARMING absent`, and continues either
  way (the dry run at step 11 precedes the file).
- **The precheck (P8) gains a gate line `arming-record`:** the file exists, was written after step 13, and names this
  T. Absent, or a different T → FAIL, and the flight task is disabled.
- Cal (added to P8's): with the file absent → `FAILED (1): arming-record`.

## A4.7 FINAL pre-hour pieces, in dependency order (supersedes A3's list)

Every piece needs its Opus review READY. Each known-answer case must flip, or the piece has not passed.

1. **Build and land** (plan Tasks 6, 7, 7b, 8 → Task 9).
   - `EQ_DIST_BREAK=1` → ≥ 21 MISMATCH lines, exit 1.
   - A missing fixture → `PARITY DIST: FAIL`.
   - `REPLAY_BREAK=1` → c2 fails.
   - Step 5b (s50m holds `S1Q04F`; scenario50 env set) → exit 2 with T3's text.
2. **P2, the focused-off edit** (separate MAIN commit). The vitest fails with the branch reverted.
3. **`eq-b4-cal.mjs`: BUILT** (sha `ab5c37ec…`).
   - Cuesmoke cases: (a) OK 19/19; (b) OK + BLOCK OK; (c) DIFF (uppercase on a non-final line); **(c′) lowercase swap
     → OK, new**; (d) BLOCK FAIL; (e) UNCALIBRATED 1.
   - The +3 mutant → BLOCK FAIL.
   - Pending: (c′) and the review.
4. **The smoke (Task 10), then the smoke run dir, built once** (`F\smoke\smoke-rundir.mjs` → `E\smoke-run-tmp\`).
   - `check-smoke-eq`'s synthetic flips.
   - The dir's keys = the five played ids = Step 6's five `OK` ids (cal f).
   - Both segments `CHECK CLEAN`, and the WHY line.
5. **Two readings on that dir, then delete it.**
   - (i) `eq-b4-cal.mjs E\smoke-run-tmp --g S1Q04F,S1Q06F` → `TRANSCRIPT OK` + `BLOCK OK`, else no flight.
   - (ii) The n5 call (scenario50 env set; `--captured E\smoke-run-tmp\interview60.prompts.json --tag nb-accept-probe
     --no-block --only S1Q04F --limit 1`) → header `block=stripped from the captured prompt` and one answer.
   - The refusal side: `--only S1Q04` → exit 2 with T3's text and no request.
   - Then delete `electron\test\golden\interview60.answers.<model>_nb-accept-probe.json` (`answers.mjs:138`; the step
     prints the exact path it deletes), the dir, and the two env names.
6. **`window-eq.mjs`: BUILT** (sha `e93cb89a…`). 22:30:00.000Z → in, 22:30:00.001Z → out, 16:29:59.999Z → out;
   identical under `TZ=UTC` (24 × 2); the three bound mutants flipped. Pending: the review.
7. **`night-gates.ps1`: BUILT** (sha `88750f8a…`).
   - **The A4.3b change, with status 2 + line offline → FAIL** (flips the current build).
   - Existing cases: standby 0x384 → FAIL; RebootRequired only → FAIL; active 18→5 at 01:00 → FAIL; the pause → OK;
     the seven mutants.
   - The new sha is recorded. Pending: the review.
8. **`guard-eq.mjs`** (registration + g1–g5 + m12 + the precheck acceptance).
   - Each premise broken once → `GUARD FAILED`.
   - The old parity line → g1 FAILED.
   - `--now` = T+11 → FAILED.
   - **HEAD moved: `NATIVELY_FLIGHT_COMMIT` = the registered HEAD's parent sha → FAILED** (no commit on MAIN).
   - The true environment → `GUARD OK`.
9. **The `passes/` commit**: the registration with §11 unfilled, plus A1, A2, A3, A4. This is the registered HEAD. Step
   8's guard is re-run here: `GUARD OK` at this HEAD.
10. **The launchers**, with T chosen as A4.6.
    - The sha lines are printed, including `ARMING absent`.
    - The guards-only chain prints `GUARDS_ALL_PASSED`.
    - The mangled-marker copy exits with its code and writes the error-log line.
11. **The dry task registered and run.** Its log holds `GUARD OK` and `NIGHT GATES OK`; **its duration is recorded**
    against P8's 240 s wait; the `%TEMP%` error log is absent.
12. **`eq-precheck.ps1`, calibrated on the dummy task** (trigger = At + 6, At = now + 2).
    - Clean → OK.
    - `-FakeFail port` → FAILED, and the dummy is Disabled.
    - `-At '00:09'` → exit 2.
    - **ARMING record absent → FAILED (1): arming-record.**
13. **Register the flight at T and the precheck at T − 6.** StartWhenAvailable False; both next run times read back.
14. **Arming, which must end by T − 10** (else A4.6's regeneration). `E\ARMING-flight-eq.md` holds:
    - the ledger, ≥ 475 / ≥ 372;
    - falsefail DONE;
    - U1 verbatim;
    - the smoke's b4 reading;
    - the night-gate lines and T, plus any superseded T;
    - the shas of the registration and A1–A4.

    And: nothing Running, no Electron or tail.exe, no error log.

**Recommended pre-hour** (allowed post-hour under A2.5):
- **b5** with A2's, A3's and A4.1/A4.2's cases: the malformed LABEL in a non-block window; the verbal-diag-only
  fast-route; run-window-only signatures on s50m and s50l.
- **`launch-grader.mjs --model-id`** with `cwdprobe-3`: I1's three cases plus A4.5's.
- **b10 and the leak checker** (A4.3a).

## Hashes as read (sha256, node `crypto`)

- `PREREGISTER-flight-eq.md` `9ca3149bfb5ed44bff9f7d7c81e6203c15d9fe1b6442b47210ccfb59e2d14f44`
- `AMENDMENT-A1.md` `3e3f0ddd2ace1586bc4137394ee5c27868bf7ae121b73f1605519b8cd1d863c8`
- `AMENDMENT-A2.md` `0bd449be9b3bc68c80b3711308b1b4916f21e479fa36adac57a27eea0089f68e`
- `AMENDMENT-A3.md` `36aa80002a6b36d41a5c0ac613e4e7f705f81faa46b559566e9edaad79e31d6e`
- (input) `PREREGISTER-cue-grading-rev6.md` `ab13dc2eeb3404bc2d927e5e12eb8bedaec0938a63e5e1a555a4c53bba494af3`

**Not covered:**
- The tools review (`tools-367-review.md`) was not out when this was written. A4.3b's other departures are accepted on
  my reading, and a conflicting ruling from it will need a dated note.
- Rev 6's re-check may still change the b10 contract.
- (c′), the power-gate change, b5, b10, the leak checker and the grader edits are not built.
- The `updates` gate reads the registry, not the effective Windows Update policy.
- T's 45-minute estimate for steps 11–14 is unmeasured until step 11's duration is recorded.
- The `__negotiationCoaching` signature has been checked on its code path only, not in a live log.
