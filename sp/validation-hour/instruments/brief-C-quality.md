# Brief C: `h40d-rule3.mjs` (with the 3a noise reading), `h40d-hascuerule-check.mjs`, `h40d-grader-models.mjs`

Read `VH\instruments\COMMON.md` first. Your letter is C.

## 1. `VH\h40d-rule3.mjs`
**Spec:** r4 rule 3 (3a, 3b gated; 3d, 3e reported; 3c is another builder's), and the `h40d-rule3.mjs` bullet in §7.4
(r4 lines 766–773), which now includes the 3a NOISE reading. It is `SP\h40c-rule3.mjs` re-pointed to the h40d files
(the merged judge files the flight writes, and `VH\h40d-verdicts-<tag>.json` where r4 says so), its per-item table
extended by the three `captured-no-cues-high` twins for context (3d), plus the noise reading: per rule 3a, the in-app
count against each cue twin rep's count on the same ids and the gap to the lowest (read r4 for the exact definition).
Make the run folder and file tags parameters, as h40c-rule3 does.
**Known cases** (save in `VH\h40d-rule3-cal.txt`):
- reproduces 35 of 45 (28 + 7) and zero gated wrong on h40c; 35 (27 + 8), R09F and R11F wrong and excluded, on h40b;
  FAIL on h40a (R09 wrong on a gated item) — run against MAIN's run folders of those flights, with the family tags
  those hours used (h40a–h40c had no `captured-no-cues-high` twins: the extension must say "absent", never crash);
- the noise reading's known cases (from `VH\recheck-r3-scratch\noise-gap.mjs`, which reproduces them): h40c 35 against
  36 / 37 / 38, gap 1; h40b 35 against 38 / 36 / 39, gap 1; h40a 39 against 37 / 42 / 38, above;
- a FAILING case for the noise reading: h40c in memory with two acceptable in-app answers set to weak → gap 3.

## 2. `VH\h40d-hascuerule-check.mjs`
**Spec:** r4 §7.6 (r4 lines 816–828). It imports `hasCueRule` and `capturedOnly` from MAIN's
`electron/test/golden/interview60.flight.mjs` (safe: the module runs `main()` only when it is the entry script,
`flight.mjs:388`) under the roster environment the run used, reads the prompts file, and prints ONLY the number of ids
`capturedOnly` returns, how many carry `[CUES FIRST]`, and `hasCueRule` true or false — never a prompt.
IMPORTANT: MAIN is pre-merge right now; its `interview60.flight.mjs` may not yet have `hasCueRule`. If it is absent in
MAIN, import it from the worktree's copy (`WT\electron\test\golden\interview60.flight.mjs`, the code that will be in
MAIN after the merge), make the source a `--flight <path>` option defaulting to MAIN's, and say so in your report.
**Known cases** (save in `VH\h40d-hascuerule-cal.txt`):
- true case: `WT\electron\test\golden\interview60.runs\2026-10-01T02-37-41-cuesmoke\interview60.prompts.json` under
  `NATIVELY_ROSTER=scenario50 NATIVELY_SCENARIOS=S1` → true, N of N;
- false: h40c's `interview60.prompts.json` (MAIN's h40c run folder) under `NATIVELY_ROSTER=holdout40` → false, 0 of 44;
- false: the 05:00 file with one id's system text stripped of the mark IN MEMORY (`--mutate-one`, never written) →
  false (a mixed hour gates closed);
- false: the 05:00 file under `NATIVELY_ROSTER=holdout40` → false with 0 ids.

## 3. `VH\h40d-grader-models.mjs`
**Spec:** r4 §7.4 bullet (r4 lines 797–801): `SP\h40c-grader-models.mjs` with the session as a parameter
(`--session <id>`) or a search over every session's `subagents/` under every project slug in
`C:\Users\sotka\.claude\projects\` and the temp `tasks/` folders under `C:\Users\sotka\AppData\Local\Temp\claude\`;
prints model ids and message counts only (never transcript content).
**Known cases** (save in `VH\h40d-grader-models-cal.txt`):
- one of h40c's seven grader agents (Opus) → PINNED (find an h40c grader's agent id in `SP\h40c-result\` or
  `SP\AGENDA.md`; or use this session's bench grader `a724b4a1166d1c18a`, known `claude-opus-5-5`);
- a known Sonnet transcript → NOT PINNED (any subagent transcript whose model field is a sonnet id; search for one);
- a missing id → NO TRANSCRIPT FOUND;
- the same Opus agent looked up from a different `--session` → found by the search, not by the hard-coded path.

Output: the three instruments, their `-cal.txt` files, scratch under `VH\instruments\`, `report-C.md`.
