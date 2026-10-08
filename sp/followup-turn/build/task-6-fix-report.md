# Task 6 fix round: review findings m2 and m3 (test only)

Commit: 7fb3d04 `test(earlier-question): turn id 0 reaches the engine; the no-text check needs a line` (WT eq-build, branch build/earlier-question, parent f9c785d). One file, +11/-1: `electron/IntelligenceEngine.earlierQuestion.test.ts`. No production change: `electron/IntelligenceEngine.ts` sha256 83d6f367...f64f3a9 before and after.

## Changes

- **m2:** new test "flag on, turn id 0 (falsy but a real id)". Flag on, ledger parent (turn 1, 156 s ago), follow-up `runWhatShouldISay(..., { turnId: 0 })`. Asserts argument 9 is the block, the last diag line matches `gate=block cue=pronoun chars=\d+ turn=0 ms=\d+$`, and the ledger holds `turnId: 0`.
- **m3:** the "counts, never text" test now asserts `lines.length > 0` before the no-question/no-parent-text loop.

## Mutants (IntelligenceEngine.ts, run by `scratchpad\mut6.mjs`; restored after each, sha256 compared)

| Mutant | Result |
|---|---|
| M2: `options.turnId ?? null` -> `options.turnId \|\| null` (:374) | KILLED: 1 fail, the new turn-0 test (`expected '' to be 'EARLIER QUESTION ...'`); 12 others pass |
| M3: the success diag `console.log` at :381 replaced by a no-op | KILLED: 8 fail, including the never-text test (`expected 0 to be greater than 0`) |

Both restores byte-identical (sha256 equal to the pre-mutation value).

## Gates

- `IntelligenceEngine.earlierQuestion.test.ts`: 13/13 (was 12).
- `electron/IntelligenceEngine*` (MAIN vitest, cwd SP\eq-tmp, --root WT): 6 files, 34/34.
- `tsc -p electron/tsconfig.json`: exactly the six baseline errors (same list as `tsc-electron-baseline.txt`), none in a touched file.
- `git -C WT status --short`: clean.

## Not covered

- Only the engine seam for turn 0; main.ts turnId plumbing (Task 7) is not exercised here.
- M3 suppresses the success line only; the catch-branch line (`gate=error ... error=`) has no suppression mutant. m1 and I1 are untouched.
- Full suite not run.
