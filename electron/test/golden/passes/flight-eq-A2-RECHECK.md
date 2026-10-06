VERDICT: APPROVE WITH FIXES

# Re-check of AMENDMENT-A2.md (pre-data), against PREREGISTER-flight-eq.md, AMENDMENT-A1.md, REVIEW-1.md, PLAN-REREVIEW.md N3/n4, task-6/7 reviews

Re-checker: a fresh Opus, separate from the A2 author and from REVIEW-1. Written 2026-10-05. I edited no file except this one. I read no captured prompt, log content or key.

What I read or ran besides the six documents (all read-only):
- MAIN source: `IntelligenceEngine.ts:356` (the pinned-question line), `questionReconcile.ts:30` (`sameAnchor`), `main.ts:2185-2193` (the K1 path), `interview60.flight.mjs` (`PAIRED_ARMS`), `interview60.run.mjs:437-447` (`startedAt`/`endedAt`), `interview60.answers.mjs:125`, `interview60.prompts.mjs:19`.
- c2's builder (`passes/2026-09-26-followup-replay/scripts/followup-replay-build.mjs`, and the identical one in L) and plan l. 1875-1895.
- `F\R\launch-grader.mjs`, `VH\h40d-precheck.ps1`, `VH\guard-h40d.mjs` + `guard-h40d-git.mjs`.
- The run folders listed (cuesmoke, s50m, `VH\2026-10-01-prestart-h40d`). For these I looked at file names only.
- `powercfg /a` and the System log's Kernel-Power IDs.

Counts: **1 Critical, 5 Important, 14 Minor.**

## Holds (checked, no finding)

- **(6) Quota arithmetic adds up.**
  - 3.5-lite: 45 + 120 + 120 + 20 + 20 + 40 + 10 = **375**. It was 353, minus the old G reps (8 + 20 = 28), plus the sitting (40), plus pings (10).
  - 3.1-lite: 10 + 10 + 120 + 40 + 20 + 20 + 25 + 24 = 269. It is taken as 272 (the registration's 260 + 12). +100 gives **475 / 372**.
  - The sitting adds exactly 12 per lite: 3 block reps × 4 ids on each leg.
  - 500 − 10 (smoke) − 1 (n5) = 489. One smoke re-run leaves 479 ≥ 475; a second leaves 469 < 475.
  - The m6 bars, 10·|G_twin| + 12 and 6·|G_twin| + 8, equal the sitting's calls plus the old margins of 12 and 8.
  - The expected headroom when the sitting starts (≈ 140 / ≈ 124) clears 52 / 32.
- **Prices.**
  - 4c: 34.5 % at p = 5 % is (1 − Σb²)/2 for Bin(20, .05), and I recomputed it.
  - 3b: 17.9 % and 3.2 % are exact for Bin(4, .6).
- **m1.** FAIL ≤ max(floor(.05p), ceil(p/21)) never meets PASS ≥ ceil(.2p) at a reachable pair count. The minimum is 10, at |G_twin| = 3 with one hole per rep, and the maximum is 35. Refusing ceil(4p/21) is right: at 21 pairs it gives 4, against the registration's 5.
- **n4.** All four strings match the plan. Line 1879 has `EARLIER-QUESTION REF TESTS: 47/47 passed` and `… + 117 captured prompt-line rows; mismatches 0`; 578 = 125 + 3 + 450.
- **K1–K3 are real.**
  - K1: `main.ts:2185-2189` sets `intent = 'coding'` after a successful screenshot.
  - K3: the startup line contains `earlier question:`.
  - The reader's anchored regex plus the two `gate=error` cal shapes would flip if the check were absent. A bare-substring reader counts the startup line, and an end-anchored `ms=\d+$` misses the suffix.
- **The G-sitting arms can be built.**
  - `PAIRED_ARMS` `captured-high`/`captured-low` pass only `--thinking`, so `--no-block` meets no `--cues`/`--no-cues` exclusivity.
  - The launcher env carries `NATIVELY_ROSTER=scenario50`, so `--only` passes N2's roster check.
  - The cuesmoke folders hold `interview60.prompts.json`, `natively_debug.log` and the timeline that c2's builder requires.
  - `sameAnchor(a, b)` exists in dist `questionReconcile.js`.
  - `timeline.startedAt`/`endedAt` exist (`run.mjs:437,447`).
- **Night gates.** The machine sleeps by S3 (no S0 Low Power Idle), so Kernel-Power 42/107 are the right sleep IDs.

## (1) Resolution status per item

| item | status |
|---|---|
| C1, I1, I2, I4, I7, I8, I10, m2–m6, m8, m9, m11, n4 | resolved. Wording issues are in Minor below. |
| I3 | resolved by the G sitting. The departure is sound; see m4 and m5. |
| I5 | resolved. The `short` refinement leaves one gap (m8). |
| I6 | resolved. The K1 signature is unnamed (m7). |
| I9 | resolved. The mechanism is sound, but its calibration contradicts itself (I4a). |
| m1 | resolved (sound departure). |
| m7 | resolved. Needs a whole-item split (m10). |
| m10 | resolved in count. The model pin has no tool contract (I1). |
| **N3** | **not resolved**: the tool cannot see the block (C1). |

## (2) Bars weakened

- **One weakening, inside C1.** Registration b4 (§7, l. 379-381) was a *pre-arming blocking* clause: "Calibrated on the smoke's capture: the two gated ids strip to bytes whose sha equals the flag-off reproduction of c2's builder". A2.9 moves it post-hour, and adds an UNCALIBRATED reading under which "2b–2d, 3a, 4b, 4c still gate". The fix restores the pre-arming run.
- **Not a weakening in practice, but new text.**
  - 2c is now ungated when the sitting span exceeds 90 min. It replaces the registration's next-day ungating (§6 l. 353); see m4.
  - The window now runs to 01:30:59 against A1's 01:30 (m14).
- **Stricter than the registration.** m1 FAIL, the arming bar, the pinned grader, 1(i)–(k) and |G_twin| < 3 → INCOMPLETE.

## (3) Is the verdict map total?

I walked the ladder: 1 → 2 → 2a → 2b → 3 → 4 → 5 → 6, then the closing line. Overlaps are impossible by first-match. Gaps:
- I3: whether item 1 is read under 1(j) and 1(k).
- m2: an unreadable `startedAt`.
- m3: the 2c FAILs when 2c is ungated.
- m9: a built-not-inserted main.

Everything else maps:
- 3a FAIL → 2a.
- 3a INCOMPLETE or |G_twin| < 3 → 3.
- 2b coverage short with 2c ungated → "2b undecided" → 3.
- 2c/2d grey zones and the 2c p90 breach → 4.
- An unnamed breach → INCONCLUSIVE.
- 5d DIFF → 1. 5d UNCALIBRATED → report only.
- A STRAY → 2, with item 1 still read.
- A precheck FAIL → no hour, not a verdict.

## Critical

**C1. `eq-b4-cal.mjs` (A2.9, the N3 fix) cannot see the EARLIER QUESTION block, so its known case (b) cannot pass and rule 5d does not measure what it is named for.**

Why:
- c2's builder `splitUser` keeps everything up to and including `INTERVIEWER JUST SAID:\n` as `before`.
- `rebuildUser` returns `before + rebuiltBlock + after` (builder l. 62, 95).
- Plan l. 1895 says c2 "does not run the block".
- The block is the last context part *before* that marker, so it lives in `before`, which is copied verbatim.

Consequences:
- (i) Cal (b), "one id given a synthetic block via `withEarlierQuestion` → that id fails", will reproduce. It will not fail.
- (ii) Stripping is never compared with an independent flag-off build: the stripped `before` is simply carried through.
- (iii) DIFF (→ 5d, a feature-attributable FAIL called "byte rule broken live") fires only when a G_twin id's *transcript part* differs.
- (iv) Registration b4's last clause has the same blind spot, and A2 also moved it post-hour (§2 above).

*Fix.* Replace A2.9's body after its first sentence with:

> `E\eq-b4-cal.mjs <run-dir> --g <ids>` (G_twin from the reader's output; `--g ''` = none) prints two readings, ids and counts only:
>
> (1) **TRANSCRIPT**: c2's builder, `--calibrate`, on a copy whose G ids' `user` is `splitEarlierQuestion(user, LABEL).user`. Outcomes:
> - all ids reproduce → OK;
> - only G ids fail → DIFF <ids>;
> - non-G ids fail → UNCALIBRATED.
>
> (2) **BLOCK**: for each G id, s = `splitEarlierQuestion(user, LABEL)` is non-null, `s.user` holds no LABEL, `withEarlierQuestion(s.user, s.block) === user`, and `user.length − s.user.length === s.block.length + 3`. Any failure → BLOCK FAIL <ids>.
>
> **Rule 5d** = TRANSCRIPT DIFF or BLOCK FAIL on any G_twin id (feature-attributable FAIL: "the block changed bytes it must not touch, live").
>
> The flag-off identity of the part *before* the marker is not checked live. It rests on c3 + Task 5's characterization test + `parity-dist`; §9 names it.
>
> Calibration, on the cuesmoke folder:
> - (a) unmodified, `--g ''` → TRANSCRIPT OK n/n;
> - (b) id X given a synthetic block via `withEarlierQuestion`, `--g X` → OK + BLOCK OK;
> - (c) as (b), with one character changed in X's transcript part → DIFF X;
> - (d) as (b), with the block's trailing `\n\n` reduced to `\n` → BLOCK FAIL X;
> - (e) one non-G id's transcript part changed → UNCALIBRATED.
>
> **Pre-hour, also run it on the smoke's segment-1 run folder with `--g S1Q04F,S1Q06F`** (registration b4's clause restored). DIFF or BLOCK FAIL there means no flight. If that folder lacks the builder's three files, §11 says so before arming.

## Important

**I1. The pinned grader id has no tool contract.**
- `F\R\launch-grader.mjs:87` hard-codes `'--model', 'opus'`.
- A2.7 requires every grader, and implicitly the probes, to run `claude-opus-5-5`. It also has `audit-graders.mjs` "assert no `--add-dir`".
- A transcript does not carry argv, and neither edit appears in A2.10 or in the build list.

*Fix.* Add to A2.10 post-hour:
> "`launch-grader.mjs --model-id <id>` (default `opus`, unchanged for other users). This hour passes `claude-opus-5-5`, and the argv line it already prints shows it. The `--add-dir` assertion is a source check, not a transcript check: `grep -c add-dir` over the launcher's `FLAGS` = 0, recorded in `instruments.sha256.txt`. Calibration:
> - `--dry-run --model-id claude-opus-5-5` → argv shows the id;
> - `cwdprobe-1 --probe --model-id claude-opus-5-5` → transcript model `claude-opus-5-5`;
> - `--model-id` absent → argv shows `opus`.
> Both probes run with the pinned id. The alias's resolution is read once, by a third dry probe, and reported."

**I2. §11 cannot be filled at arming in the order A2 gives.**
- `passes/` sits under `electron/`. `GIT_PATHSPEC` includes `electron`, and `passes/` is not on `guard-h40d-git.mjs`'s allowlist.
- An uncommitted §11 fill (step 13) therefore makes the guard refuse (10b, dirty tree).
- Committing it moves HEAD after step 9 pinned it in the launchers and after step 10's dry `GUARD OK`.
- §11's "Registered HEAD: <sha>" also cannot name the commit that contains it.

*Fix.* Add to A2.8:
> "The arming fill (§11 'Filled at arming') is written to `E\ARMING-flight-eq.md`, outside MAIN. Its sha256 is printed by the launcher after the three `passes/` shas and by the precheck. It is committed to `passes/` as `flight-eq-ARMING.md` with the result note. The registered HEAD is step 8's commit, and the registration file in it keeps §11 unfilled (m4's 'sha before §11 is filled' is then simply the committed sha)."

**I3. §5 item 1 is silent under the new VOIDs 1(j) and 1(k), and under 1(e)'s new UNEXPLAINED branch.**
- The registration reads item 1's FAILs "VOID on 1(a)–(c), (f)–(h) included".
- A2 states this for 1(i) only.

*Fix.* In A2.1, add:
> "§5 item 1's FAILs are read under 1(i) (except a 5b wrong referent whose parent is a STRAY text), 1(j) and 1(k) too. They are not read under 1(d) or 1(e), as before."

**I4. Five contracts have a calibration that cannot run as written, or that would not flip if the check were absent.**
- (a) **P8 contradicts itself.** The dummy task's trigger is "2026-10-07 03:00", but the gate requires "next run = At + 6 min". The clean case can therefore never read OK.
  *Fix:* "the dummy trigger = At + 6 min, with At = now + 2 min; action `cmd /c exit 0`; deleted after."
  Also state that the precheck *starts* the dry twin itself (`Start-ScheduledTask`, as `h40d-precheck.ps1:62`) and writes its stamp only after the dry run ends.
- (b) **P6 g5 needs an injectable clock.** g4 confines `NATIVELY_EQ_T` to tonight, so "fresh `PRECHECK OK` → accepted" can only be produced between T−10 and T+10. "now ≤ T+10" is never tested.
  *Fix:* "`--now <iso>` (calibration only; the launcher never passes it). Cases: stamp T−7 with now T+1 → accepted; now T+11 → FAILED; T 19:29 and 01:01 → FAILED (g4's bounds)."
- (c) **P6 g1 has neither content nor a cal case.**
  *Fix:* "g1 = parity-dist's child output contains both exact lines (REF TESTS 47/47; PARITY DIST … 117 captured prompt-line rows; mismatches 0), and `RESULT-smoke-eq.md` holds the WHY line and two block lines with chars in 200..578. Cal: a parity stub printing the old line without `117 …`, exit 0 → `GUARD FAILED g1`."
- (d) **P4's fixed +03:00 offset is untested.** Every case passes on this machine with a machine-TZ implementation.
  *Fix:* "run the cal file once more with `TZ=UTC` in the environment; the same lines."
- (e) **The power-events cal has no sleep case, and its "known quiet hour" is unnamed.**
  *Fix:* "2026-09-23 03:25–04:05 local → ≥ 1 (Kernel-Power 42/107 present in the System log); the quiet case = h40d's run window 2026-10-02 (start→end from its timeline) → 0."
- (f) **The `eq-gsitting.ps1` refusals are uncalibrated.**
  *Fix:* "`-WhatIf` with a fake b4cal DIFF file → refuses; with a ledger stub below m6 → refuses."

**I5. The 4c price is flagged as decision-changing but has no decision point.** A2.11 says 34.5–42.1 % "may change the user's decision; a margin can only be ruled by the user in a dated A3 before data". Nothing stops arming before the user has seen it, which invites a post-data argument.

*Fix.* Add to build-list step 13:
> "The user's answer on 4c's price (keep the bar, or rule A3) is quoted in the arming record (I2). No arming without it."

Quote beside it the union with 4b, labelled as an estimate:
> "if independent, about 43–56 % at the priced rates; they overlap, since on_topic 0 counts in both".

## Minor

- **m1.** The ladder's "2a. FAIL (no gain)" and the registration's "2b. other FAIL" collide with rules 2a and 2b, and A2.1 item 1 lists "2a, 2b" as rules. Rename the ladder items "§5 item 2-NG" and "§5 item 2-OF" wherever they are cited.
- **m2.** An unreadable `startedAt` (A2.3) maps to no ladder item. Add: "= §5 item 5 (NO LATENCY VERDICT)".
- **m3.** §5 item 1's "2c stall, 2c median > +1000" should read "… when 2c gates (A2.2 span rule)".
- **m4.** The span rule (≤ 90 min) is the wrong condition. Under the alternation each pair's sides are adjacent, so the span does not confound a pair, and a long gap inside one pair does. Replace it with: "2c gates iff, for every rep, its two steps start ≤ 15 min apart". Counterbalance the order at no cost: block first on odd reps, no-block first on even reps. This removes a fixed second-position (implicit-cache) advantage for no-block.
- **m5.** The registration's hole ruling says "(of 4)": read "(of |G_twin|)". A rep's hole re-run re-runs **both** of its steps back to back, under the m4 condition.
- **m6.** A1.1's "else §6's named next-day departure (2c reported)" and A1.4's "by 10:00 … else §6's departure" now contradict A2.2. Add to A2.12: "both replaced by A2.2 (the sitting moves whole; every clause still gates)".
- **m7.** Name K1's signature for the reader: `[Main] screen reference: captured ` (main.ts:2189). A `capture failed` warn means the intent stays verbal. Recast 1(e)'s "whose own capture is verbal framing" as "whose window carries no `[Main] screen reference: captured` line", so 1(e) and A2.4 use one test.
- **m8.** A `short` non-roster window can fire the cue: WHY-shaped text is cue `short`. Add: "a `short` window reading `gate=block` is excluded from G, named, and its answer read under 4a".
- **m9.** 4d's FAIL ("a wrong main with a block") should require an *inserted* block. A built-not-inserted main with a wrong answer is 4e's other FAIL.
- **m10.** m7's two front files must split by whole items, so that each file holds both arms of its items (the premise of registration §6). For example, 7 ids → 40 + 30.
- **m11.** A2.7: "both transcripts must read `claude-opus-5-5`" holds only if the probes use the pinned id (I1). Say so.
- **m12.** The guard's `.env` name scan should add `NATIVELY_FLIGHT_FOCUSED` and `NATIVELY_EQ_T`.
- **m13.** P5: missing ActiveHours values → `updates` FAIL unless the pause covers. Add a `RebootRequired`-only fake case.
- **m14.** A2.3's `< 22:31:00.000Z` extends A1's 01:30 by 59 s. Either write `≤ 22:30:00.000Z` or state that A1's "01:30" is read as the whole minute.

## (4) Departures from the reviewer

- **I3, the G sitting.** Sound and stricter: one same-sitting comparison for every twin clause. m4 and m5 tighten it.
- **I9, the scheduled precheck.** Sound. A task survives the session, and session crons do not fire under agents or Monitors. Its calibration needs I4a.
- **m1, the FAIL formula.** Sound (see Holds).
- **m7 / m10, blind counts and the pinned grader.** Sound in substance. They need m10 (whole-item split) and I1 (a tool contract for the pin).

## (7) Contradictions left standing

The I2 HEAD and §11 order, plus m6, m7 and m9 above. No other conflict found: A2's precedence line covers the rest. That covers registration §2's G rows, the §6 order of consumption, ruling 5, A1.5's "Unchanged" (corrected in A2.5), and §7's header.

## Not checked

- I ran no instrument and no calibration; none of A2's tools exist yet.
- Whether the smoke's segment-1 folder holds the builder's three files: the smoke has not run.
- `sameAnchor`'s false-STRAY rate on a clean hour: s50m's calibration decides it.
- How long the dry twin takes inside the T−6 window. h40d's 6 min worked, but this guard adds `night-gates` and `parity-dist`.
- The 4c union figure is an independence estimate, not a computation.
