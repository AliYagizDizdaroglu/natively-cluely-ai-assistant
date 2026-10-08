# Controller note addendum 2, 2026-10-06 04:12 TST (flight data exists, not read; written before any post-hour tool touches the run folder) — tools only

This is addendum 2 to NOTE-post-hour-tools-2026-10-06.md (sha256 059aeda5…be72f8) and to its addendum (sha256 482d9829…edf7ab).
Both are sealed and unedited. The flight chain is still running on this machine. While writing this I ran only `date` and
sha256 hashing, and I read no run-folder file. This note moves no bar of §4 or A1–A7.

## 1. The cue twins instrument: filter hash (cue-report-review.md, Re-review N1)

- **Registered text:**
  - PREREGISTER §4 (l. 246–248) and A1 re-point `VH\h40d-twins.mjs` onto this hour.
  - `h40d-twins.mjs` registers CUE_RULE `8e15e4e7dd41` and verbalStreamFilter.js sha256/16 `42d9bc42dbd17870` (its `REGISTERED`, l. 67).
  - No flight-eq text mentions the filter hash or `--dist`.
- **Fact (re-review):**
  - MAIN's dist at HEAD 56bda9e has stream-filter hash `28d6c47b9da4fba6`, which differs from `42d9bc42dbd17870`.
  - The difference comes from `electron/llm/verbalStreamFilter.ts` commits d83fdfe, 801442d, c699638 and 800d6a5. All four are ancestors of 56bda9e.
  - CUE_RULE matches: `8e15e4e7dd41`. The limits match: 3 × 5.
  - The filter hash is compared and printed. It is not a refusal. Twins' default `--dist` root is the whole-turn worktree, which is pre-d83fdfe and would print MATCH on the wrong build.
- **Ruling:**
  - Run twins on its own as `cue-report.mjs twins <run> --export <cues-export-eq.json> -- --dist <MAIN>`. Never run it through `all`, which cannot pass `--dist`.
  - The DIFFERENT line for the stream filter is expected, and it is recorded here as expected, because of the four commits above.
  - The build report's Uncovered line ("twins refuses … INSTRUMENT FAILED (exit 2)") is wrong. On MAIN's dist, twins runs and prints DIFFERENT.
- **Changes no bar.** The cue effect is reported only, never gating (reg. §4).
- **Not shown:** whether the four commits change any emptying stage was not replayed. MAIN's working tree was not compared with HEAD.

## 2. cue-report m3 decisions (cue-report-build-report.md "For the note"; review m3) and m6

- **Registered text:**
  - A4 "Counts-only cue reporting" says `check-smoke-cues` is reported "with counts per class and ids" and that "only a counts-only summary line set is quoted".
  - A5.1 defines `leak <n>` and does not define n.
- **Decisions, kept:**
  1. **`leak <n>` counts regions.** n is the number of separate leaked regions of the checked file. Overlapping matches merge into one region, and the same cue at two places counts 2. It does not count distinct cue strings: a shorter cue sitting inside a longer one would otherwise read 2+ for one insertion.
  2. **The smoke summary has no ids.** `check-smoke-cues` prints none. The ids come from the facts summary: block, trimmed, failed and superseded ids.
  3. **Twins and thoughts lines pass through.** These summaries are the instruments' own lines, clipped to 300 characters, and are not built line by line. The leak check (`--export`, required) is the guard. Twins exit 1 (STOP) and exit 3 (INCOMPLETE) are readings, not failures.
- **m6 (review):** the export's `runDir` is not cross-checked against the reported run folder. **The controller confirms by hand that `runDir` names this run's folder** before quoting any summary.
- **Changes no bar** (reporting only).

## 3. `eq-gsitting.ps1` (sha256/12 23822d03ba6e; gsitting-build-report.md fix round 1, gsitting-review.md)

1. **Outputs are copied, not moved (review m3).** A2.10 says the outputs are moved into the run folder. The runner COPIES them: the originals stay in MAIN's golden folder, and the done line says COPIED. This is recorded as a departure. The bytes graded are the same.
2. **A failed attempt's STEP lines are rewritten (review I2; fix-round decision).**
   - On `-Resume`, the failed attempt's STEP lines are rewritten as `GSITTING failed-attempt STEP …`.
   - A copy of the whole pre-resume log is kept unedited, and the failed step's outputs are moved aside to `E\gsitting-out\failed-<n>-<stamp>\` (never deleted).
   - Reason: `eq-twins` rejects duplicate tags (its `parseSitting`). The resumed log parses with 0 problems.
   - The result note names any resume and its kept log copy.
3. **The m6 cross-check counts app-log mentions only (review m2).** The ledger cross-check bounds headroom only by app calls, and harness calls are not counted. **The controller states the headroom figures** (`-Headroom35`, `-Headroom31`) as its own count, harness calls included, and the result note quotes them as such.
- **Changes no bar.**

## 4. b6/b8 re-review items (b6-b8-review.md, Re-review)

- **N2.** A `-b` hole re-run **fills holes only**. It runs `--only <the hole ids>`, and its filled ids replace only the hole pairs.
  - This follows §4 ("re-run … with `--only <ids>`, its filled ids graded…") and A4.4 m11 read per pair: both sides of a hole's pair come from `-b`, never one side mixed with the original.
  - It is the rule `eq-twins` implements, cited there as "controller ruling B1". This line is what makes that citation true. NOTE (b) did not cover it.
- **N3.** After a rate-limited refusal, which the launcher labels with model "", relaunch with **`--attempt k+1`**, using a fresh cwd derived from the attempt number. That attempt **uses no re-grade**: it is not the "re-graded once by a fresh grader" of §2.
- **Changes no bar.**
- **Note on N1 (b6/b8 re-review, the unbuilt `-b` path).** That re-review read the runner before its fix round. `eq-gsitting.ps1` 23822d03ba6e now has a `-Holes` mode (gsitting-build-report I3) that appends `-b` steps from 17 onward in `gsitting.log`. No Opus review of the fix round is cited in the inputs I read. The `-Holes` path is unused unless a hole re-run is needed.

## 5. New tool shas (sha256/12; recomputed 04:12 TST, all equal to the values given)

| file | sha256/12 |
|---|---|
| `cue-report.mjs` | **d7888ad679d0** |
| `cue-leak-check.mjs` | **4cd9e25db5fc** |
| `eq-twins.mjs` | **592d8cad52f7** |
| `launch-grader-eq.mjs` | **36a2198eea69** |
| `eq-merge.cmd` | **4fe62ce45486** |
| `eq-gsitting.ps1` | **23822d03ba6e** |

These supersede the earlier build-report shas. A2.5 still binds: each tool's line in `instruments.sha256.txt` (sha, cal sha,
review file) is written at use, before its first run on the run folder.
