SPEC: PASS
QUALITY: APPROVE

# Task 3 review — parity test (commit 51d5296, reviewer Opus 5.5, 2026-10-05)

Verdict: the test does what Task 3 and the Global Constraints ask; the child-process deviation is sound and documented. Three minor, non-blocking robustness items (M1–M3), none reachable on today's fixtures.

## Checked, with evidence

- **Scope of the commit:** `git diff --stat d32cc75 51d5296` = one file, `electron/llm/earlierQuestion.parity.test.ts` (+105). The WT copies of the test and of `earlierQuestion.ts` hash to the committed blobs (`a37b5c7`, `290cdb9`), so the Task 2 mutant was restored. The commit message records the deviation and ends with the attribution line.
- **Green, re-run by me** (cwd eq-tmp, both env vars set, `--root` WT): `Tests 7 passed (7)`, exit 0. This matches task-3-green.txt.
- **All 126 entries, byte-exact:** the test asserts 3 files and 42 keys per file. Every key is compared with the fixture on block (`!==`), cue, sha256 and sha12, and with the reference on block, cue and why. `withBlock === 7` per hour. A one-byte difference in any block fails both checks.
- **Calibration of the break switch** (task-3-break.txt): all 3 hour tests FAIL with 14 rows each (the 7 gated keys × fixture + "vs reference"), each block +6 chars. The "vs reference" rows prove the child really returns the reference's blocks; the comparison is not vacuous. The prompt-line tests stay green, as the plan requires.
- **Calibration of the mutant** (task-3-mutant.txt, `slice(0,-1)`→`(0,-2)`): the 3 prompt-line tests FAIL (29/28/28 rows) and the parity tests pass. The 117 = 3×39 rows are asserted by `n === 39`, with D-cases skipped.
- **Not tautological:** the TS side imports only `./earlierQuestionGate` and `../services/questionReconcile`. The reference imports only `../followup-context/earlierQuestions.ref.mjs`. Neither side loads the other.
- **The runner cannot mask a failure.** I calibrated it in a scratch probe, using the REF_RUNNER string verbatim:

  | Failure | What happens |
  |---|---|
  | import throws | `Command failed` thrown |
  | `process.exit(0)` before output | empty stdout, `SyntaxError: Unexpected end of JSON input` |
  | extra stdout | `SyntaxError` |
  | async reference | `[{}]`, so the block/cue/why compare flags it |
  | missing reference file | thrown, status 1 |

  A throw inside `it` fails the test. A short array makes `refs[i]` undefined, which raises a TypeError, so the test fails.
- **Round trip on the real fixtures:** an echo-hash fake reference received exactly the inputs sent, 42/42 per hour. The payloads are 46.7–46.9 KB and all ASCII.
- **No captured text printed:** `why` is an enum (`off|no-question|…|error|''`). Failure rows carry keys, cue names, lengths and hashes only. I ran a regex audit over every `+ "…"` row in the task-3 evidence files: 71 rows, 0 nonconforming, longest line 259 chars. The committed file holds only run-folder names and marker strings.
- **Skips only when inputs are absent:** with `NATIVELY_EQ_PARITY_DIR` unset, the dir missing, or no `turn-parity-*.json` file, the first describe is skipped (task-3-skipped.txt: 1 skipped, exit 0). The second describe is skipped when `NATIVELY_EQ_RUNS_DIR` is unset or missing. Any partial presence FAILS: wrong file set, missing `earlierQuestion.ref.mjs`, or a missing run folder or prompt.
- **Type-check gates:** root is empty. The electron gate shows exactly the six baseline positions, with a `../../../` path prefix only.

## Findings

- **M1 (minor, latent): the child decodes stdin per chunk.** `s+=c` turns each Buffer chunk into a string on its own, so a multibyte character split across a pipe-chunk boundary becomes U+FFFD. My synthetic 1.6 MB payload of ü/…/ç had only 27–30 of 42 entries survive the round trip. Today's fixtures are 47 KB and ASCII-only (42/42), so the bug cannot occur now. It can only cause a false FAIL, never a false pass: the reference would get corrupted input, and the fixture check does not depend on the child. Fix: add `process.stdin.setEncoding("utf8");` before the loop.
- **M2 (minor, latent leak path): the stdout parse error can quote output.** `JSON.parse(out)` in the parent throws V8's message, which quotes the first ~10 characters of stdout (probe: `Unexpected token 'S', "SECRET-FIX"... is not valid JSON`). That would print text only if the reference ever wrote to stdout. Today neither ref module contains `console.`/`process.stdout` (grep), so it is unreachable. Fix (rule 11): catch the error and rethrow `reference output is not JSON (<n> bytes)`.
- **M3 (minor): `execFileSync` has no `timeout`.** A hanging reference blocks the vitest worker forever, because a sync call stops `testTimeout` from firing. Fix: `timeout: 60_000` (on timeout it throws, so the test fails).
- **Nit: the report's mutant row count is wrong.** It says "63 key lines", but the evidence summary shows 29+28+28 = 85 rows; the file itself shows 57 rows. The evidence is fine; only the report's count is off.
- **Nit: `why` was never shown to fail on its own.** The break switch changes the block, not `why`. The `why` comparison is a plain string `!==` next to calibrated ones, so I accept it unproven.

## Not shown

- I ran no BREAK or mutant run myself; I relied on the implementer's evidence files, which match the code.
- M1/M2 were exercised only with synthetic payloads in my scratchpad, not through vitest.
- Task 9's dist-level parity script is not part of this task.
