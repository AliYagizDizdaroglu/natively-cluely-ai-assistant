# Report C (saved by the controller from the builder's reply; the builder said the harness refused its file write)

**Status: DONE_WITH_CONCERNS**

## Files

In `VH`:
- `h40d-rule3.mjs` and `h40d-rule3-cal.txt`
- `h40d-hascuerule-check.mjs` and `h40d-hascuerule-cal.txt`
- `h40d-grader-models.mjs` and `h40d-grader-models-cal.txt`
- Each `-cal.txt` header carries the instrument's sha256/16 (`d57ab68c6520dca3`, `4a697be922fa9d60`, `b09b8b84a77335fa`), re-checked against the files after the last run.

In `VH\instruments\`:
- `run-cal-C.mjs`, `run-mutants-C.mjs`, `mutants-C.out.txt`
- Fixtures: `grader-fixtures\`, `hascuerule-stubs\`, `rule3-fixtures\`, `C-mut\` (synthetic or text-stripped data only).
- Scratch probes: `C-*.mjs`

## Calibration commands

```
node VH\instruments\run-cal-C.mjs [grader|hascuerule|rule3]
node VH\instruments\run-mutants-C.mjs
```

- The first runs 61 cases (22 + 15 + 24), all read as expected, and rewrites the three `-cal.txt` files.
- The second applies 28 deliberate bugs, one at a time, to copies of the instruments. All 28 were killed by the calibration. Three of the 28 survived the first design and forced the cases R22, R23 and G22.

## Calibration, case → reading

**`h40d-rule3.mjs`**
- h40c (`h40d-rule3.mjs <MAIN>\…\2026-09-29T11-42-00-h40c R20=gemini-3.1-flash-lite`): 35 of 45 (28/33 mains + 7/12 follow-ups); 0 wrong on the 40 gated items, R09F wrong but excluded. 3a PASS, 3b PASS, exit 0. Twins 36/37/38 (3.5-lite HIGH) and 37/37/36 (3.1-lite LOW); combined band 36 to 38, in-app 1 below. Noise: 35 against 36 / 37 / 38, gap 1, WITHIN 1. Below all three own twins: R04F R14 R23. No-cue twins print `absent`, no crash.
- h40b: 35 (27 + 8); R09F and R11F wrong and excluded; PASS. Noise 35 against 38 / 36 / 39, gap 1.
- h40a: 3b FAIL (R09 wrong on a gated item), exit 1. 3a still holds at 39. Noise 39 against 37 / 42 / 38, in-app ABOVE.
- h40c with `--demote 2` (the failing noise case): 33 of 45, 3a MISS, 33 against 36, gap 3, NOT WITHIN, condition NOT MET. `--demote 1`: 34 of 45, gap 2, NOT MET (brackets r4's "at most 1" with the h40c case, gap 1, MET).
- Cross-check against `noise-gap.mjs`: identical on h40a, h40b and h40c.
- Doubles, both ways (R18 second answer wrong, then first answer wrong): 3a stays 35 and 3b FAILs, naming the wrong answer.
- A cue rep with a hole: shared ids drop to 43, counts 35 / 36 / 37.
- INCOMPLETE in both flavours, a non-holdout40 run folder refused, and a corrupt judge file whose error does not echo its text.
- Leak scan on every case: 0 of 702 sensitive strings found; its positive control (`--reasons`) found 9.

**`h40d-hascuerule-check.mjs`**
- True case: 05:00 re-smoke prompts under `NATIVELY_ROSTER=scenario50 NATIVELY_SCENARIOS=S1`, `--flight` the worktree's copy → `capturedOnly ids: 19`, `carry [CUES FIRST]: 19 of 19`, `hasCueRule: true`, exit 0.
- Same file with `--mutate-one` → 18 of 19, false, exit 1.
- 05:00 file under `holdout40` → 0 ids, false, with a note that 0 ids means a wrong roster environment.
- h40c prompts under `holdout40` → 44 ids, 0 of 44, false.
- MAIN's own flight module today → refuses, no `hasCueRule` export, exit 2.
- A lying `hasCueRule` stub → DISAGREE, exit 3. A stub with a different mark → MARK DIFFERS, exit 3.
- A stub that prints a prompt slice on purpose is caught by the leak scan.

**`h40d-grader-models.mjs`**
- h40c's seven graders (found by their dispatch descriptions), `--session 9c5886c7-…` → 7 of 7 PINNED to `claude-opus-5-5`, found by session path.
- This session's bench grader → PINNED.
- Finished Sonnet agent `ae8c58f581cf35c50` (claude-sonnet-5-5, another session and slug) → NOT PINNED, found by SEARCH, exit 1.
- A Sonnet agent inside the named session → NOT PINNED, found by session path.
- `claude-opus-5` → NOT PINNED (the pin is exact).
- Missing id → NO TRANSCRIPT FOUND, GRADER PIN NOT VERIFIED, exit 1.
- The same Opus agent from `--session 11111111-…` → PINNED, `found by SEARCH (not under session 11111111)`.
- The seven graders plus one Sonnet in one call → exit 1, no ALL GRADERS line.
- A drifted `claude-opus-5-6` → NOT PINNED, with `every merge takes --model claude-opus-5-6`.
- A transcript holding the pin plus another model → NOT PINNED.
- A rate-limit placeholder → PINNED with the placeholder named; a transcript with only placeholders → NOT PINNED.
- The `.output`-only search path was exercised with fixtures: found. Empty placeholder or plain text → NO TRANSCRIPT FOUND.

## Where this differs from the brief or r4

- **Verdict files:** brief 1 says `h40d-rule3.mjs` reads `h40d-verdicts-<tag>.json`. r4's bullet says only "re-pointed", so it reads merged judge files only. The verdicts file is consulted just to word an INCOMPLETE or UNDECIDED line.
- **Extra output lines:** r4 §7.6 says the hasCueRule check "prints ONLY" its three facts. It prints those three on fixed lines plus self-describing lines (roster environment, module, mark, file size). No prompt text.
- **`--flight`:** MAIN's `interview60.flight.mjs` has no `hasCueRule` before the merge, so the check has `--flight`, defaulting to MAIN's. Calibration used the worktree's copy.
- **Extra switches:** `--floor`, `--reasons`, `--demote` and `--projects` / `--temp` are the builder's. `--reasons` is off by default because h40c-rule3 always printed reasons, which quote the user's profile.
- Nothing in r4's three instrument bullets was left unimplemented.

## Concerns

1. **The `<synthetic>` ruling is the builder's, not r4's.** A rate-limit placeholder (`isApiErrorMessage` true, 0 tokens) is not model output, so it is counted apart and does not make an agent "mixed". h40c's script would read it as a second model and say NOT PINNED. 6 of the 167 transcripts on this machine that name `claude-opus-5-5` hold one. Accept or reverse; the reversal is one line.
2. **The per-item winner join is not built.** r4 §4 (3d) and §9.5 call for it; `h40d-rule3.mjs` takes `<id>=gemini-3.1-flash-lite` arguments as h40c's did. The clocks `--list` rows and the in-app items' `dispatchedAt` are enough to script it; it was not in brief C.
3. **After the merge, re-run `node VH\instruments\run-cal-C.mjs hascuerule`.** Case H1 then reads the true case through MAIN's own copy, and the cal file records both flight modules' hashes.
4. **No real h40d data exists yet.** The no-cue merged file names follow `judge.mjs`'s naming rule but have not been seen on a real file.
5. **The calibration needs old agent transcripts to stay on disk** (the seven h40c graders, three other agents, two rate-limit agents; ids in the cal file's notes).
6. **Leak scans catch verbatim copies only.** By construction the instruments print no free text.
7. **The noise reading's shared ids** are the roster ids all three cue reps graded, as `noise-gap.mjs` does. A rep that lost an id to a 503 or an emptied answer drops it, which 3c counts differently. Two statistics.
8. **`--floor` can change a verdict.** Printed in the header line; meant only for r4 §6 option (i). `--demote` prints a banner.
