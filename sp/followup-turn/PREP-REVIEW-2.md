VERDICT: READY WITH FIXES

Opus prep review (§12 step 3b) of the turn-follow-up harness, checked against PREREGISTER-turn-followup.md (sha256 a91b3c77…f830, verified on disk) with Amendment A1. Written 2026-10-03 evening.
Counts: 2 Critical (both stop the run safely, but the run can't finish as hashed), 4 Important, 10 Minor.
The design, the arms, the call plan and §7 are implemented as registered. What is missing is the plumbing for tonight's conditions: the A1 hard stop, the grader-session departure, and a §2 that is now filled.
Every fix below touches a hashed file. Re-run fill-section2 and every self-check afterwards, before the OK.

## Critical

**C1. Precondition 6.5d cannot pass once §2 is filled, so nothing runs.**
- Where: `R/scripts/runner-selftest.mjs:147-148`, plus `:13` and `e2e-synthetic.mjs:21`.
- The `r0` check asserts that the runner REFUSES against `PREREGISTER-turn-followup.md` "while its section 2 is still empty". The OK has to come on a filled file (§12.4), and once the table is filled the dry-run verifies and exits 0.
- What happens: `RUNNER SELF-TEST FAILED`, day-pre stops at step 6.5d, and no call is made tonight.
- A second dependency: both self-tests default `TURN_PREREG` to `section2-filled.md` (`??=`). day-pre does not set the variable. On the day they therefore verify a copy, not the approved file. If that copy is removed, or goes stale after the A2 edits, 6.5c/6.5d fail too.
- Fix:
  - Make `r0` copy the registered file to TMP with every 64-hex hash stripped and assert REFUSED on the copy. e2e run 3b already does this.
  - Default both self-tests to the registered file once its §2 is filled, or have day-pre pass `TURN_PREREG` explicitly to the registered path.
  - Re-run day-pre's 6.5 steps against the filled registered file before asking for the OK.

**C2. Under the departure (graders = Opus subagents, memory LOADED), the run can never be decided, and the natural workaround mislabels it.**
- Where: `R/legs-decide.mjs:205`, `:117-133`, and §1 "Consequence".
- `collect()` refuses (`REPORTED, NOT DECIDED`, exit 3) any slot whose `memory !== 'ABSENT'`. The e2e test, run 4, proves it.
- Under the departure every one of the 18 graders reads LOADED, because a subagent's transcript carries the `instructions` attachment (the positive control a9d35e8d reads LOADED). Re-grading does not help: §1 "re-graded ONCE" gives another LOADED grader.
- Result: either no decision ever prints, or the controller writes `'ABSENT'` by hand into graders.json. That is a false label, and legs-decide trusts it (see I4).
- `formatResult` has no line for the memory-exposure statement that the departure says must come first in the result.
- Fix: before the OK, put the departure in A2 / the dated §3 note in operational terms:
  - LOADED from the project-memory group is expected and does not trigger a re-grade.
  - A claude-mem context header, any `mcp__*` call, or a FLAGGED audit still triggers the consequence.
- In legs-decide:
  - Accept `memory: 'LOADED'` only when graders.json carries `departure: "<§3 note date>"` AND the registered file contains that dated note (grep it; the file is hash-pinned by day-pre 6.1).
  - Under the departure, keep refusing a slot with claude-mem markers. This needs check-grader-memory's two groups recorded separately in graders.json.
  - Print `GRADERS LOADED PROJECT MEMORY (departure from spec §6, §3 note <date>)` as the first RESULT line.
- Add an e2e case for the departure, and one for a departure label with no note in the file, which must be refused.
- Operational, under the departure: the controller must not write any memory or MEMORY.md line about this run (arms, label text, bars, expectations) until the last verdict exists. Every grader loads that index.

## Important

**I1. The A1 hard stop (all calls finish before 09:30 local = 2026-10-04T06:30Z) is neither enforced nor checked anywhere.**
- Where: `followup-turn-run.mjs:74-103`, `gemini.mjs:170`, `followup-turn-blind.mjs:186-203`, `legs-decide.mjs:226-241`.
- The runner has no clock check, and `fetch` has no timeout. One hung SSE stream (socket open, no bytes) blocks the pass indefinitely, across 09:30.
- The stop depends on the controller being awake. Project memory records that session crons do not fire while a Monitor or background agent runs (2026-09-26 / 09-30).
- Once stopped, the blind builder and legs-decide would happily grade and decide the partial files. Missing slots become "incomplete pairs, named, excluded". A1.7 says stopped records are "NOT graded under this amendment".
- A1.7's "fresh pair of passes" after 10:00 also needs the stopped records moved out of R/: the runner refuses (`existing > 0`) and 6.1 lists answer files. No step exists for that move.
- Fix:
  - In the runner, take `--stop-at 2026-10-04T06:30:00Z` (or hard-code A1's cutoff for the primary hours). Before each call, refuse if now + 120 s ≥ cutoff. Log `STOPPED AT HARD STOP` to run.log and exit non-zero.
  - Wrap each fetch in `AbortSignal.timeout(120000)` so an abort becomes a transient. This is plain Node, not Electron.
  - Record `end = at + total` per record.
  - Make the blind builder and legs-decide refuse when any record's end ≥ cutoff, or when run.log holds a STOPPED line for that leg.
  - Document the move-out step for the stopped records.

**I2. `isValidationBash` and the path audit can be bypassed, so a grader can read the API key, the answer files or the keys and still read "clean".**
- Where: `R/audit-graders.mjs:19-26`, `:46-49`.
- I calibrated this with a throwaway probe (deleted). The literal `R-keyhold/key.blind-1.json` control is refused, so the probe can tell the cases apart.
- These commands are ALLOWED as validation Bash, as long as they also name the grader's own verdicts file:
  1. reading `MAIN/.env` (`.env` and credentials are not in the denylist at all)
  2. `R-key*/k*-1.json` (glob around "keyhold")
  3. `../interview60.ans*` (glob)
  4. a `readdirSync('..')` with `'interview60.'+'ans'` (concatenation)
  5. `../../PREREGISTER-turn-followup.md`
  6. `../run.log`
  7. `verdicts.blind-1.g?.json` (another grader's verdicts, by glob)
  8. `fetch('ht'+'tps://…')`
- The Read/Write path audit (`:49`) also flags 0 of: Read `.env`, Read the registration, Read `R/run.log`, Read `R/s50m-gated-turn.json`, Write `blind/graders.json`.
- Why it matters tonight: under the departure the graders inherit the controller's permission mode (bypass), so the audit is the ONLY control.
  - The answer files carry the arm in their name and the spoken text, and they sit in `R/`, the parent of the graders' `blind/`.
  - If the pass stdout is kept under R/, it maps `<key> r<n> <arm>` to word counts.
  - The registration and spec are exactly what spec §6 hides.
- A denylist over shell text cannot be made sound. Fix with an allowlist:
  - Read/Write: the `file_path` must be exactly one of {`MAIN/electron/test/golden/interview60.grader-prompt.md`, own `pairs.blind-N.json`, own `verdicts.blind-N.gX.json`}. Anything else is FLAGGED.
  - Bash, under `--allow-validation-bash`:
    - The command must match the s50l template: optional `cd "<own blind dir>" &&` then `node -e "<code>"`.
    - Every quoted string in `<code>` that names a file must be own pairs or own verdicts.
    - Reject `..`, `*`, `?`, `$`, backticks, `+` between string literals, `readdir`, `child_process`, `fetch`, `http`, `require(` of anything but `'fs'`, and the `cd` target being anything other than the own blind dir.
  - Also print each allowed Bash command's length and its sha12 into graders.json, so a human can spot-read all 18.
  - Add the bypass list above as calibration cases in `grader-session-calibrate.mjs`, every one of which must be FLAGGED, and keep the 8 real s50l graders reading clean.

**I3. A stream that ends with no text and no finishReason is recorded as a real answer. It is scored wrong, and on the front leg it refuses the whole decision.**
- Where: `followup-turn-run.mjs:87`, `gemini.mjs:175-199`, `legs-decide.mjs:43, 235`.
- The cut-stream retry runs only `&& r.spoken`. An HTTP 200 that closes with no data gives `{spoken:'', finish:null, ttft:null, thoughts:null}`, and it is stored as a completed record with no retry.
- In decide it becomes 0/0/0. That is a consensus-wrong, so on arm B it fails clause 1. Its `thoughts: null` on a front record also makes `validate()` refuse the entire decision (m8).
- The registration forbids re-calling a record that exists, so the run is unrecoverable.
- This is a transport failure, not "an answer empty after the filters" (§5). The registration already says "A transient leaves the pair".
- Fix: retry on `finish === null` whether or not `spoken` is empty. After the attempts, store `finish === null && !raw` as `transientError: 'empty stream (no text, no finishReason)'`. Add the case to runner-selftest.
- A record with a finishReason and an empty filtered answer stays a real 0/0/0, as registered.

**I4. legs-decide trusts hand-written grader labels.**
- Where: `R/legs-decide.mjs:203-206`.
- `model`, `memory`, `audit` and `replaced` in `blind/graders.json` are typed by the controller. legs-decide never re-derives them from the transcripts.
- It checks the slot COUNT, not the slot names. Slots `blind-1.g1 … blind-9.g1` plus 9 stray names would pass, as long as the verdict files exist.
- C2 makes a wrong label the path of least resistance.
- Fix: graders.json carries `agent` (or `session:`) per slot. legs-decide calls the exported `scan()` and `auditText()` and the model reader on each transcript, and refuses on any disagreement with the label. It also requires the slot names to equal {`blind-1..9`} × {`g1`,`g2`} exactly (`blind-1..5` for the re-run).
- If touching legs-decide is too much tonight, add a hashed `build-graders-json.mjs` that writes graders.json only from the three tools' outputs, and make legs-decide refuse a graders.json that lacks its stamp.

## Minor

1. **The judge module and the dispatch text are not pinned.**
   - Where: §2 / `common.mjs:92`.
   - `MAIN/electron/test/golden/interview60.judge.mjs` supplies `questionForGrader` (blind builder) and `verdictOf` (decide). The instrument stamp `8564ba96369a` hashes only the grader-prompt file and the rubric.
   - `validation-hour/h40d-grader-dispatch.txt` (sha256 f8d64670…81cd, 9,064 bytes) is "verbatim" but has no registered hash. Peer sessions edit MAIN's tree.
   - Fix: add both files to §2 and verify them in the runner, blind builder and decide. Compare the dispatch hash with each grader transcript's first user message.
2. **The 6.7 quota check is read by eye, and its usage example has the wrong quota day for A1.**
   - Where: `day-pre.mjs:5, 22, 69-70`.
   - The usage line shows `--quota-start 2026-10-04T07:00:00.000Z`. Under A1 the quota day starts 2026-10-03T07:00:00.000Z. A future start reads 0 used.
   - The ledger prints no headroom, so `≥ 290 / ≥ 98` is never computed.
   - Fix: derive the start as the latest 07:00Z ≤ now. Count the lite records in today's answer files plus the log lines. Print the headroom per model against 290/98, and stop on a shortfall.
3. **The runner writes its store non-atomically.**
   - Where: `followup-turn-run.mjs:101`.
   - A crash mid-write leaves truncated JSON, and the next start crashes in `JSON.parse`. Deleting the file to recover re-calls up to 7 records that were already made, which §1 forbids.
   - Fix: write to `.tmp`, then `renameSync`.
4. **Self-checks write transient files into the hashed folders.**
   - Where: `mutate-decide.mjs:12, 103`; `e2e-synthetic.mjs:180`.
   - They write `R/mutant-decide.mjs` and `R/scripts/zz-stray.mjs`. A crash in between leaves a stray `.mjs`, so `verifySection2` fails. If decide runs then, the result is VOID, which is irreversible under I5.
   - Fix: delete in `finally`. day-steps `decide` should first list R/ and R/scripts and refuse on any unlisted `.mjs`, without printing VOID.
5. **VOID can follow a printed clause line on a second invocation.**
   - Where: `legs-decide.mjs:173-191`.
   - Example: decide prints clauses, then a file changes, then decide runs again and prints VOID. The registration says that is unavailable.
   - Fix: when `RESULT-front-back.txt` already holds a `DECISION:` line, legs-decide refuses to print VOID and reports the hash mismatch as an incident.
6. **day-pre accepts a failing step if its markers appear.**
   - Where: `day-pre.mjs:32`.
   - `ok = … && (code === 0 || expect.length > 0)` passes a non-zero exit whenever the markers are present. The 6.6 marker `'OK'` is weak, and the 6.4 PARITY marker can be satisfied by any one hour's line. Today `STAMP OK` and the exit codes cover it.
   - Fix: require exit 0 on every step, and expect all three per-hour PARITY lines.
7. **The runner drops the original's Retry-After handling.**
   - Where: `gemini.mjs:171`.
   - `interview60.answers.mjs` honours Retry-After; the copy drops it. The cut-stream retry also uses one of the 5 attempts, so a 429 burst after a cut gets 3 retries, not 4.
8. **"Front leg first, then back leg" (§4) is not enforced.**
   - Where: `followup-turn-run.mjs`.
   - Fix: `--leg back` refuses unless all 20 front files exist.
9. **`section2-filled.md` carries two things the m3 diff rule does not name.**
   - It adds a "Gated block hashes" table inside §2. It is required by `verifySection2`, but the step 12.4 diff check must state that it accepts it.
   - It also carries a `DRAFT FOR THE CONTROLLER` block after A1. That block must be moved into §3 as a dated note, or dropped, before the file is hashed for the OK.
10. **A missing thoughts count on the front leg refuses the decision (m8, as registered).**
    - Prior: 84/84 design-2 records on 3.5-lite HIGH carried `thoughts` (min 610; 0 zero, 0 cut streams, 0 empty).
    - This is a residual risk, not a defect. State it in the result note if it fires.

## Open items (a) and (b)

**(a) Departure.** What breaks or mislabels:
- legs-decide's ABSENT gate (C2).
- The §1 re-grade-on-LOADED loop (C2).
- graders.json hand labels (I4).
- The audit becomes the only access control under the inherited permission mode (I2).
- The missing exposure line (C2).

What works unchanged with subagent ids: `h40d-grader-models.mjs` and `audit-graders.mjs` (the `subagents/agent-<id>.jsonl` lookup), `check-grader-memory.mjs` (reads LOADED, as it should), move-keys, the blind builder, and day-steps. Nothing in the harness hard-codes the `grading/` cwd.

**(b) `isValidationBash`.** Holes confirmed: 8 of 8 bypasses are ALLOWED, and 5 of 5 out-of-scope Read/Write calls read clean. Fix per I2.

## What I checked and found sound

- **§2 matches the files on disk.** `verifySection2` against `section2-filled.md` → ok, 30 files, 21 block rows, 0 problems.
- **The registered file.** It currently refuses (empty §2), as it should. Its lines 1–97 and A1 are byte-identical to `section2-filled.md`; the only diffs are the §2 table, the block table and the draft block.
- **The registration hash** equals a91b3c77…f830.
- **Every recorded self-check reproduces now:**

  | Check | Result |
  |---|---|
  | ref tests | 47/47 |
  | stamp-turn | STAMP OK |
  | ARMS OK | 8 roster + 6 D |
  | Parity | 42 entries/hour, 7 with a block, 35 empty, on all 3 hours |
  | legs-decide `--calibrate` | CALIBRATION OK |
  | mutate-decide | 65/65 mutants caught |
  | check-grader-questions | instrument 8564ba96369a OK |
  | runner-selftest | OK, but with the r0 check that C1 breaks once §2 is filled |
  | grader-session-calibrate | OK |
  | e2e | E2E OK |

- **Dry runs.** Front: 140 calls, `gemini-3.5-flash-lite` HIGH. Back: 48 calls, `gemini-3.1-flash-lite` LOW. Filter d8fee6ca0170. No stray file was left in R/ afterwards.
- **Per-leg model and thinking** come from `LEGS` into the request body and every record. Blind and decide refuse a mismatched record; calibration covers both legs and both directions.
- **Interleaving.** A first iff (itemIndex + rep) is even. Each (item, rep) has exactly one A and one B. Front splits 35/35, back 12/12. There is one fixed pause after every call.
- **Crash-resume never duplicates or drops a pair** (beyond Minor 3).
  - A second invocation without the flag is refused.
  - `--crash-resume` is logged and calls only slots with no record. A transient is never re-called. The self-test covers the lost-record case exactly.
- **Null thoughts.** Absent stays null, never 0. Any front record with null refuses the decision; on the back leg it is reported as n/a. Both are calibrated.
- **VOID-first order.** `verifySection2` (every file plus the block hashes) and the parity re-derivation run, with exceptions mapped to VOID, before `graders.json`, any key or verdict file, or any answer file is opened. VOID prints exactly `VOID`; e2e run 3 covers it.
- **§7 matches the text.**
  - Clause 1 per leg over all front pairs and all back pairs.
  - Clause 2 over all front pairs.
  - Clauses 3a/3b/3c/4/5 on R, with the 70-pair figures reported only. ceil(2R/39), with +500/+1000 ms, +2000 ms, +5/+10 words, +150 thoughts.
  - Clause 7 bars ceil(4R/21) / ceil(R/21), i.e. +8/+2 at R = 40.
  - Percentiles as element min(n−1, floor(n·p)).
  - Outcome logic as written. Re-run: a second INCONCLUSIVE becomes FAIL, pooled bars +12/+3 at R_p = 60, additivity checked before printing.
- **Blind builder.**
  - 10 answers per front item, 6 per back item.
  - Seed `blind:turn-followup:<hour>:<id>`.
  - Front items 2 per file, back items 4 per file: 9 files, ≤ 24 answers each.
  - `questionForGrader` with `[Follow-up to: …]` for all 14 front items, and the TRUE parent for D-cases, through `rosterId`.
  - Keys moved out and back with a byte check; it refuses to rebuild when verdicts exist.
- **gate-report-turn and stamp-turn.**
  - The ledger is rebuilt from the dispatch lines, and a `replaces=` with 0 or more than 1 matches is refused (synthetic case and the real s50l supersede).
  - `supersede` comes from the matching dispatch kind.
  - The D-case stand-in is checked to be more than 180 s earlier, and `withoutPreview` requires exactly one response.
  - The gated files equal a fresh rebuild.
  - The gated sets match §3 on s50m and s50l. The s50k set and its overlap are recorded in the draft note.
- **The key is never printed.** It is read in-process only in the non-dry CLI; `--dry-run` reads no key.

## Not checked

- Live API behaviour tonight: whether `thoughtsTokenCount` is present on 3.1-lite LOW, how often 200-with-empty-stream happens, provider load.
- The grader dispatch text's content against the h40d original (hash printed only), and what the controller will actually type.
- The outside-cwd session. It can't run tonight because the CLI's OAuth expired (`grader-probe.out.json`). One untested risk: claude-mem's SessionStart hook might inject a header even for an empty project, which would make every outside-cwd grader read LOADED.
- `quota-ledger-today.mjs` counts (not run). It reads logs and file mtimes, and it prints no headroom.
- The source of `legs-decide-calibrate.mjs`, `mutate-decide.mjs` and `e2e-synthetic.mjs` beyond their outputs and spot reads.
- `earlierQuestion.ref.mjs` against spec §3 in depth (step 12.1's own review). I checked only the selector order against §1.
- `parseDispatches` against MAIN's `readDispatches` beyond line-count equality.
- The re-run path's day preconditions. day-pre has no s50k mode: its 6.4/6.8 markers are primary-hour only.
