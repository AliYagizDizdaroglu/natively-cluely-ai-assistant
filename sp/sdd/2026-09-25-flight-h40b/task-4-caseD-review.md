# Task 4 follow-up review: calibration case D (final-review Q-m1)

**Verdict: Approved.** Critical 0, Important 0, Minor 2. Both Minors go beyond what the ruling asked for, and neither blocks reading the tier 3/3b verdicts.

`<SP>` below is the session scratchpad. I read these files:
- `flash-h40b-score-cal.mjs` in full: 68 lines, mtime 2026-09-26 14:46:21.
- `flash-h40b-score-blind.mjs` in full.
- `flash-h40b-blind-pairs.mjs`, for how answers map to arms.
- The report section "## Follow-up: calibration case D".
- The five Q-m1 mentions in `final-review.md`.

Limits I kept:
- Nothing was written into the repo or MAIN.
- I never opened, listed or read `flash-h40b\`. My whole-scratchpad search pruned it.
- No API calls and no subagents.
- All my throwaway files went in `<SP>\review-caseD-tmp\`, which I deleted afterwards.

## Ruling vs delivery

| Ruling item | Delivered? | Where / evidence |
|---|---|---|
| Fixture variant: every 3.6-flash answer acceptable, every 3.5-flash answer wrong on the same ids. It must be in memory or a throwaway copy, never `flash-h40b\`. | Yes | `score-cal.mjs:49` sets `by: arm === 'gemini-3.5-flash default' ? 0 : 2`. The verdicts are written into the throwaway CAL dir (`flash-h40b-fixture/flash/blind-cal`), which is removed at `:53`/`:66`. Every other arm is acceptable, as in A. |
| Run the REAL scorer | Yes | It goes through the same generic loop (`:52-65`) and the same `execFileSync` on `${SP}/flash-h40b-score-blind.mjs` (`:61`). A trace confirmed this (see (d)). |
| Assert "gemini-3.6-flash on tier 3: 11/11" and "gemini-3.5-flash on tier 3b: 0/11" in the scorer's exact format | Yes | `:49` uses `/gemini-3\.6-flash on tier 3: 11\/11 acceptable/` and `/gemini-3\.5-flash on tier 3b: 0\/11 acceptable/`. These match the scorer's own template at `score-blind.mjs:85`: `` `${model} on tier ${t}: ${T.acc}/${T.n} acceptable; …` ``. |
| CALIBRATION OK requires A, B, C and D | Yes | D is an entry in the same `cases` object. A failing D raises `failed` and turns the result into CALIBRATION FAILED with exit 1 (shown in (b) and (c)). |
| Case D named in the header and output | Yes | The header names it at `:13` ("Four cases:") and `:17-21`. The output prints `case D: ok`. |

## Verification

All runs were offline, from `<SP>`. Before and after every run I hashed the fixture (`sha256sum` of all 23 files). It was byte-identical at the end, and no `blind-cal` directory was left behind.

### (a) The untouched fixture calibrates OK, with case D listed

`node --check flash-h40b-score-cal.mjs` exits 0, and so does `node --check flash-h40b-score-blind.mjs`. Then `node flash-h40b-score-cal.mjs`:
```
case A: ok
case B: ok
case C: ok
case D: ok
CALIBRATION OK (fixture: …/scratchpad/flash-h40b-fixture/flash)
EXIT 0
```

To see what the real scorer prints under D's verdicts, I used a derived copy of the calibration. It is the real file with CAL moved into my temp folder and the scorer output always echoed for case D. The real scorer file was not modified. Output:
```
gemini-3.8-flash on tier 1: 6/6 acceptable; …      gemini-3.7-flash on tier 2: 9/9 acceptable; …
gemini-3.6-flash on tier 3: 11/11 acceptable; first word p50 1.2 s, p90 1.2 s, max 1.2 s; thinking tokens p50 10; total p50 2.3 s
gemini-3.5-flash on tier 3b: 0/11 acceptable; first word p50 1.2 s, p90 1.2 s, max 1.2 s; thinking tokens p50 10; total p50 2.3 s
on the same questions, re-graded in the same files: 3.1 LOW 48/48, 3.5 HIGH 48/48
reason lines in D: 11, all gemini-3.5-flash: true
```

I also tested D's two regexes, taken verbatim from the file, against near misses. None of these matched:
- `3b: 10/11`
- the 3.6 model on the tier 3b line
- the 3.5 model on the tier 3 line
- `11/110`
- `11/22`

The two real lines matched. That is 0 mismatches out of 7 probes.

### (b) and (c): broken scorer copies fail case D

**How the copies were built.** I made my own copies of the real scorer with `harness.mjs`, in the temp folder. Each copy has exactly one text replacement, and the script asserts that the replaced text occurs exactly once. Every copy passes `node --check`.

**How the calibration was run against them.** I derived copies of both calibrations:
- **old:** the A/B/C version, rebuilt from the full-file hunk in `review-final-scratchpad.diff`.
- **new:** the current file.

Each derived copy differs from its source in exactly two lines, confirmed with `diff`:
- the scorer path it spawns (`:61`);
- `CAL` (`:31`), moved into the temp folder so these runs never write into the fixture.

**Checking the harness itself.** An unmodified copy (M0) gives OK under both calibrations. That shows the harness does not cause failures by itself.

```
old  M0_control             exit=0 OK      A:ok  B:ok  C:ok
old  M1_swap_lookup         exit=0 OK      A:ok  B:ok  C:ok
old  M2_swap_ingest         exit=0 OK      A:ok  B:ok  C:ok
old  M3_collapse_3b_onto_3  exit=0 OK      A:ok  B:ok  C:ok
old  M4_collapse_3_onto_3b  exit=0 OK      A:ok  B:ok  C:ok
old  M5_merge_bucket        exit=0 OK      A:ok  B:ok  C:ok
old  M6_sum_both_under_3    exit=1 FAILED  A:FAIL (1 of 10 checks)  B:FAIL (1 of 6 checks)  C:FAIL (1 of 4 checks)
new  M0_control             exit=0 OK      A:ok  B:ok  C:ok  D:ok
new  M1_swap_lookup         exit=1 FAILED  A:ok  B:ok  C:ok  D:FAIL (2 of 2 checks)
new  M2_swap_ingest         exit=1 FAILED  A:ok  B:ok  C:ok  D:FAIL (2 of 2 checks)
new  M3_collapse_3b_onto_3  exit=1 FAILED  A:ok  B:ok  C:ok  D:FAIL (1 of 2 checks)
new  M4_collapse_3_onto_3b  exit=1 FAILED  A:ok  B:ok  C:ok  D:FAIL (1 of 2 checks)
new  M5_merge_bucket        exit=1 FAILED  A:ok  B:ok  C:ok  D:FAIL (2 of 2 checks)
new  M6_sum_both_under_3    exit=1 FAILED  A:FAIL (1 of 10)  B:FAIL (1 of 6)  C:FAIL (1 of 4)  D:FAIL (1 of 2 checks)
```

The tier lines each copy printed in case D:
- **M1** `0/11 | 11/11`
- **M2** `0/11 | 11/11`
- **M3** `11/11 | 11/11`
- **M4** `0/11 | 0/11`
- **M5** `5/11 | 5/11`
- **M6** `11/22 | 0/11`

**(b) Swapped attribution.** There are two independent injection points:
- **M1** changes the tier loop's `arm` lookup (`score-blind.mjs:72`). The printed labels stay untouched. I wrote this through `TIERS` rather than hardcoded names, so it is a different text from the implementer's.
- **M2** swaps the key's 3.6 and 3.5 arms when the grades are stored (`:54`).

The old calibration passes both, which confirms the Q-m1 blind spot existed. The new one fails both on case D alone.

**(c) Both models counted under tier 3.**
- **M3:** tier 3b's line reads 3.6's grades. This reproduces the implementer's shape independently.
- **M5:** both models' verdicts go into one bucket per id, where the last key wins, and both lines read that bucket. The fixture's shuffle gives 5 of 11 in both lines, so D fails whichever direction the order falls.
- **M4:** the reverse collapse, which the implementer did not build. It fails D's *first* check, as the report predicted.

The old calibration passes all three and the new one fails them. **M6** is the literal "tier 3 sums both models" (11/22). It was already caught by A/B/C, and D catches it too.

### (d) Case D runs the real scorer file, and the variant cannot leak

**Static reading.** The calibration holds no scoring logic. It writes verdict files, spawns the scorer, and matches regexes on the scorer's stdout. D uses exactly that path.

**Trace.** I ran the real, unmodified `flash-h40b-score-cal.mjs` under a write tracer. The tracer is a preload set through `NODE_OPTIONS`, so every child process inherits it. The trace showed:
- **Processes:** 5 in total. One is the calibration. The other four are `…\scratchpad\flash-h40b-score-blind.mjs`, the real scorer path, one per case A to D.
- **Writes:** 81 in total: `rmSync` 5, `mkdirSync` 4, `copyFileSync` 16, `writeFileSync` 16, `rmdirSync` 8, `unlinkSync` 32. Every destination is under `flash-h40b-fixture/flash/blind-cal`.
- **The four scorer processes wrote nothing.**
- **Copy sources:** only `flash-h40b-fixture/flash/blind/`.
- **Live run folder:** no path under the live run folder `scratchpad/flash-h40b/` appears at all, as source or destination.

The expected write counts (4 keys and 4 verdict files × 4 cases, plus 4 mkdir and 5 rm) are the known positive that shows the tracer works.

**Environment pinning.** `RUN_DIR`, `FLASH_DIR` and `BLIND_DIR` are all set explicitly for the child (`:61`), so an inherited override cannot redirect it. The pairs module's builder block does not run on import, because it is guarded on `argv[1]` (`blind-pairs.mjs:53`).

**Fixture state.** All 23 fixture files still carry their 2026-09-24/25 mtimes and are byte-identical before and after this review. Only the `flash/` directory mtime moves, when `blind-cal` is created and deleted.

### (e) Cases A, B and C behave exactly as before

- **Text.** A `diff -u` of the reconstructed pre-follow-up file against the current one shows exactly two hunks:
  - "Three cases:" became "Four cases:", plus the 5-line D header (`:17-21`).
  - The 3 D comment lines and the D entry (`:46-49`).
  
  The A, B and C entries, `V`, the loop, the `execFileSync` line and the final messages are byte-identical.
- **Behaviour.** For each of the 9 scorer copies (M0–M8), the A/B/C result is identical between the old and new calibrations: "A/B/C identical: yes" in all 9 rows. That includes M6, where A, B and C fail with the same check counts in both.

### (f) The change touched nothing else

- **The file's own diff:** exactly the four additions listed in (e).
- **The scorer** is byte-identical to the final-review state: 98 of 98 lines match the reconstruction from `review-final-scratchpad.diff`, with lines 48-51 filled from the h40a original. I checked that this comparison can fail: a copy with line 72 changed reports "mismatches: 72". Its mtime is 2026-09-25 20:46.
- **Other file mtimes:**
  - `flash-h40b-blind-pairs.mjs`: 2026-09-25 19:52
  - `flash-h40b-sidecar.mjs`: 2026-09-25 21:25
  - `gemma-answers.mjs`: 2026-09-25 21:25
- **Everything in `<SP>` modified today,** from a full recursive search that pruned `flash-h40b\`:
  - the sidecar's two run logs (the live run);
  - `h40b-merge.cmd` at 14:43. `progress.md` 14:45 records it as the controller's "PREP FOR GRADING". Its content is a MAIN merge launcher and never mentions the calibration, scorer or fixture;
  - `flash-h40b-score-cal.mjs` at 14:46, which is this change;
  - `flash-h40b-fixture/flash/` at 14:47, the directory mtime from the implementer's calibration run;
  - the `<SP>` root at 14:47:55, consistent with the implementer deleting `followup-qm1/`. None is left: no `qm1` entry exists;
  - `task-4-report.md` at 14:48;
  - `progress.md` at 14:59, the controller.
  
  Nothing else changed.

## Findings

### Critical: none

### Important: none

### Minor

**m1. Case D does not pin which model the reasons lines are attributed to** (`flash-h40b-score-cal.mjs:49`).
- The "reasons for every non-acceptable Flash answer" section (`score-blind.mjs:94-98`) has its own `grade[...]` lookup, separate from the tier loop. D is the only case where 3.6 and 3.5 differ, and it checks only the two totals lines.
- A copy that swaps only that lookup (M8) passes A, B, C and D. Every "synthetic wrong" line then comes out labelled `gemini-3.6-flash`.
- This is outside what the ruling asked for.
- A single check covers it, and I tested it. Adding this to D's `expect` catches M8 (`D: FAIL (1 of 3 checks)`) and keeps M0 at OK:
  ```js
  (o) => (o.match(/ wrong: synthetic wrong/g) ?? []).length === 11 && (o.match(/ gemini-3\.5-flash R\w+ r1 wrong: synthetic wrong/g) ?? []).length === 11
  ```

**m2. The fixture cannot distinguish 3.6 from 3.5 on the "answered" and latency lines** (`flash-h40b-fixture/flash/*_def.json`, built by `flash-h40b-fixture-build.mjs`).
- Every Flash fixture record is identical: `ttft 1234`, `total 2345`, `thoughts 10`, all present.
- So a swap confined to the scorer's answers lookup (M7: 3.6 and 3.5 swapped in `FILES`, `score-blind.mjs:27-31`) passes A, B, C and D.
- On real data that swap would report 3.6's first-word latency and "answered" counts under 3.5, and the reverse. That is the latency half of the same 3.6-vs-3.5 comparison.
- This is beyond this ruling, which covered verdicts. Closing it needs different values per model in the fixture plus a D assertion on the "first word" or "answered" line.
- Cheaper stop-gap on flight day: check one tier-3 id's first-word time in the scorer's table against the raw `interview60.answers.gemini-3.6-flash_def.json` and `…3.5-flash_def.json`.

## Residual risks: what this review did not reach

- **An asymmetric cross-wiring still passes.**
  - Example: tier 3 takes the better of the two models' verdicts and tier 3b the worse (M9). It passes A, B, C and D, because D fixes only one direction (3.6 good, 3.5 bad).
  - A mirrored case E (3.6 wrong, 3.5 acceptable) catches it (`E: FAIL (2 of 2 checks)`) and keeps M0 at OK. I tested both.
  - I judge the shape contrived and do not count it; it is the only failure shape I found that D misses on verdicts.
- **The pairs builder is outside the calibration's reach.** The calibration grades by the key files' arm labels and never rebuilds the keys. So a mismatch between answer file and label inside `flash-h40b-blind-pairs.mjs` would not be caught. Today that mismatch cannot happen: the label and the file name come from the same `model` variable (`blind-pairs.mjs:35`, `:61`). Not a finding.
- **Real flight data was not exercised,** by design: the calibration runs only on the fixture.

## Notes (not counted)

- **Header wording.** The header's "else as A" for D (`:17`) describes the expected output; D asserts only the two tier lines. That matches the existing style: C's header likewise says "Flash 0/..." but asserts only tiers 3 and 3b. I observed the other lines really are as in A (quoted in (a)).
- **Pre-existing behaviour, unchanged by D.**
  - CAL lives inside the fixture. If the calibration crashes mid-run, for example because the scorer exits non-zero and `execFileSync` throws, `flash-h40b-fixture/flash/blind-cal/` is left behind. That is harmless: the next run removes it first, and nothing else reads it.
  - Two calibration runs at the same time would share CAL, so don't run two at once.
- **The report's hand-drawn diff is slightly off.**
  - It shows the unchanged "Copies the fixture's key files…" line as removed and re-added.
  - It drops the `//` on the A/B/C context lines.
  
  The real change matches the report's "No other line changed" exactly (see (e)).
- **The implementer's report checks out.** Its proofs (1)–(3) reproduce independently: (1) as (a) above, (2) as M1/M2, (3) as M3. Its "by symmetry" claim for the untested reverse collapse holds (M4).
- **Two of my own probes broke, and I fixed and reran both.**
  - My first traced run crashed inside my tracer before the calibration's first write: `appendFileSync` routes through the wrapped `writeFileSync`, so it recursed. I confirmed the fixture byte-identical and nothing left behind, then re-ran with a raw append fd.
  - My first M9 copy was broken by my own trailing `// BROKEN` comment, which swallowed `totals[t].n += n;` on the same line. I caught it because it failed A, which it should not have. I switched it to a block comment. The edited line of every other copy has no code after its comment; I checked each with `grep`. The results above are from the corrected runs.
