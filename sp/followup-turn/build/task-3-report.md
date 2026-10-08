# Task 3 report: parity test (local fixtures)

Status: DONE. Commit 51d5296 on build/earlier-question (WT = .claude/worktrees/eq-build), one file: electron/llm/earlierQuestion.parity.test.ts (105 lines).

## Parity counts (env set, vitest 2.1.9, cwd eq-tmp, --root WT)
- 7 passed / 7: 1 presence + 3 hour parity + 3 hour prompt-line.
- Entries compared: 126 (3 hours x 42), each against the fixture (cue, block, sha256, sha12) AND the reference (cue, why, block).
- Blocks: 21 (7 per hour). Mismatches: 0.
- Prompt-line rows: 117 (3 x 39 roster ids), promptLines and current-question length equal to the replay derivation; mismatches 0.

## Calibration
- Skipped run (env unset): 1 skipped, exit 0 (task-3-skipped.txt).
- NATIVELY_EQ_PARITY_BREAK=1: 3 parity tests FAIL, 7 gated keys per hour listed (key, cue, chars, sha12 only), prompt-line tests pass (task-3-break.txt).
- Mutant texts.slice(0,-1) -> (0,-2) in interviewerLinesBefore: 3 prompt-line tests FAIL, 63 key lines (lengths and sha12 only); restored byte-identical (task-3-mutant.txt).
- Failure outputs scanned: only keys, cue names, lengths, hashes; max line 259 chars.

## Gates
- root tsc: 0 errors. electron tsc: exactly the six baseline errors (paths printed with a ../../../ prefix; same files and positions as tsc-electron-baseline.txt). No error in a touched file.

## Deviation from the plan's test text (needed)
The plan's `await import(pathToFileURL(REF_PATH).href)` fails under vite-node: it percent-encodes the Masaüstü path ("Failed to load url ... Masa%C3%BCst%C3%BC ... Does the file exist?"). A `new Function('return import(u)')` also fails (no dynamic import callback in the vm context). Kept the reference comparison by running it in a plain node child (execFileSync, `--input-type=module`, JSON over stdin/stdout, never printed) once per hour. `why` is still compared. The plan's fallback (drop the ref comparison) was NOT needed. The REF_PATH presence assertion is kept.

## Notes
- Session could not Write/Edit in WT (isolated to another worktree): test staged in sp\eq-tmp\stage\, Copy-Item into WT, sha256 verified equal (final staged == WT copy).
- Fixtures/prompts never printed or committed; no Task-2 file changed (mutant restored, hash verified).
- Evidence: build\task-3-green.txt, -break.txt, -mutant.txt, -skipped.txt, -tsc-root.txt, -tsc-electron*.txt.

## Concerns
- The child-process reference runner depends on `process.execPath` being node and on the reference's relative import `../followup-context/earlierQuestions.ref.mjs` staying beside it (true today).
- Plan expectation "(1 file, both describes skipped)" prints as "1 test | 1 skipped" (the second describe's tests are not counted when its skipIf triggers at collection); exit 0.
