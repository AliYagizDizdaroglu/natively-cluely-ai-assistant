VERDICT: APPROVE WITH FIXES

# Re-check of AMENDMENT-A2.md (fresh Opus, 2026-10-05 ~18:0x TST, before any router40 call)

**Hashes (node `crypto`, LF files):** A2's seal (every byte above its seal line) = `f207c9755a34d45a936c4e4d7b8469475b7aba36bcfe2410ad40f634dacb136f` **equal**; whole file `10d0ea59…c821`, 15,404 bytes. A2's "Read as": registration `5b7daaee…6057`, A1 `132739e6…f8aa`, A1-RECHECK `559ab927…6b81` **equal**. USER-RULINGS is now `8e5e3b40…487f` (the 17:58 controller line was appended after A2's 17:57 write); its first four lines hash to `6dfc40f6…28b8` = A2's read-as, so nothing A2 read changed.

**Read:** A1-RECHECK, USER-RULINGS, A2; the registration's §0, §3.3–§4, §6–§9 and A1's A1.2–A1.8 (only where A2 changes them). No prompts, answer texts, keys, model calls or subagents.

**Result:** I1, I2 and I4 resolved in substance; I3 and I5 adopted but their cases do not do what they claim (Important 1, 2). The readings table stays total (nine classes, all non-`answer` routes to L; m4 is tool-enforced by P5). Nothing can spend 3.5-lite or full Flash: L's id is pinned four ways (constant, URL assert, `--model` refusal, `modelVersion` STOP), R asserts `gemini-3.8-live` before connect, graders/classifiers are Claude, P9 only reads the ledger.

**Not shown:** no harness exists, so no case ran; the G sitting's real timing and `eq-gsitting.ps1`'s STEP format were not read; whether 3.8 Live draws on any quota the flight uses was not re-checked (registration's "not covered").

## Important

**I1. P2's per-chain case contradicts guard 5, and both I3 cases are undefined in time.** With a static deadline that admits chain 1's est but not chain 2's, guard 5 (Σ of 31 chains' est at start) refuses the start, so "exactly 1 chain runs" can only pass if guard 5 is removed. P4 (m)'s "a stub deadline admitting 2 items' est" with an instant stub fetch admits ~all items (now barely moves), so its "exactly 2" is not a known answer either. Fix, replace both I3 deadline cases:
> "P2 (I3): Σ-est fits at start; a stub task list that, after chain 1 completes, gains a `Natively-*` task whose NextRunTime puts chain 2's `now + est` past the recomputed deadline → exactly 1 chain runs, the run saves, exits, R INCOMPLETE (flips if the deadline is computed once at start). P4 (m): the same with a task appearing after item 2 → exactly 2 items asked, saved, exited INCOMPLETE. The deadline is recomputed from a fresh task read before every chain attempt and every item."

**I2. I5 is not resolved: case 8 does not exercise the "last 3 words" rule, and case 9 need not exercise the later-turn rule.** Case 8 has 10 words with `hard` at word 10, so the registered "hard among the first 12 words but not first" rule already makes it malformed (checked: 10 words, index 10); removing the new rule flips nothing. Case 9 as written ("the second `hard`") is also caught by the last-3 rule or the first-12 rule. Fix, replace A2.5 rows 8 and 9:
> "8 | a single turn of ≥ 16 words whose word 13+ is the first `hard`, `hard` among its last 3 words (e.g. 14 neutral words + `so it is hard`) | malformed (last-3 rule only). 9 | two completed turns, the first ≥ 13 words with no `hard`, the second `hard, because it needs a full design` | malformed (later-turn rule only: `hard` not in the first 12, not in the last 3)."

**I3. A malformed F line is silently ignored, so a stale valid line can open the G-sitting overlap.** "Exactly one line matching" passes when the controller's update (e.g. `pending from 11:00`, or a higher F) is written with ASCII hyphens or CRLF beside an older valid `done` line: the update is ignored, the guard reads `done`, and router40 can start into the G sitting. Fix, A2.3:
> "Every line of `USER-RULINGS.txt` whose trimmed text begins `F ` must match the regex; any that does not → P9 FAIL. Lines are split on `/\r?\n/` and read as UTF-8." Add P9 cases: "one valid line + `F 2026-10-06: 120 - G sitting: pending from 11:00 - x` (ASCII hyphens) → FAIL; a valid line ending in CRLF → PASS."

**I4. Stub inputs are not refused in a real run, so every date, task, process and G-sitting guard can be passed by a leftover calibration flag.** Only `R40_FAKE_FETCH` (P4 (j)) is refused. Fix, A2.4, new item 7:
> "In a real (non-`--dry`, non-calibration) run, P9, `run-r.mjs`, `lite-l.mjs` and `launch-grader-r40.mjs` exit 2 before any network or launch when any stub input is set (`--now`, a stub clock, stub task/process list, stub ledger, stub `gsitting.log` path, stub deadline, or their env vars)." Add a case to each piece: "real mode with `--now 2026-10-06T10:01` → exit 2."

## Minor

- **m1.** A2.1's "R needs no quota gate, so a slow F line does not block it" contradicts A2.3/A2.4 (R needs the F line's G-sitting state). Replace it with "R needs no quota gate; it does need the F line (A2.4 guard 3)". Add the P9 case "`--arm R`, no F line → FAIL".
- **m2.** The m8 "user told" line has no pattern and no positive case. Add: "matches `^\d{4}-\d{2}-\d{2} \d{2}:\d{2} TST CONTROLLER: the user was told .*2026-10-06`; case: the 17:58 line → PASS, the file without it → R FAIL". The 17:58 line now satisfies m8, so "Not covered"'s "not yet that R moved too" is stale.
- **m3.** LEDGER-OK matching:
  - Add: "exact string equality after one normalisation (backslashes, case); LEDGER-OK never exempts an answers file, whose entries are always counted".
  - Cases: "a LEDGER-OK for the listed file's parent folder → FAIL; an answers file with 3.1-lite entries plus a LEDGER-OK line → still counted".
- **m4.** Guard 3 cases are one-sided.
  - Add the cases "a node argv containing `interview60.answers.mjs` → FAIL" and "`gsitting.log` missing/unreadable while F says `done` or `pending` → FAIL".
  - Extend the argv check to powershell.exe/pwsh.exe for `eq-gsitting`. The .ps1 runs between its node steps.
- **m5.** Guard 6 (drift) names only L's start and grading's start. Add "and R's start (smoke and full), for R's §0 inputs".
- **m6.** "Sequential, no piece while another runs" has no tool. Add to guard 2: "no other router40 harness process (node argv containing `run-r.mjs`, `lite-l.mjs` or `launch-grader-r40.mjs`, own pid excluded)".
- **m7.** Write the F/LEDGER-OK lines with node or `-Encoding utf8`, never `Set-Content` (the ANSI codepage breaks U+2014 → no match). This fails closed but blocks L.
- **m8.** State that `USER-RULINGS.txt` is append-only and not a §0 input, so later lines are not drift.
- **m9.** R has no upper date bound: `--arm R` on 2026-10-07 passes P9, though A2.1 needs an amendment for that. Add "R refuses unless now's local date is 2026-10-06; case `--arm R --now 2026-10-07T10:01` → FAIL".
