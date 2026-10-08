# Task 2, fix round 1: re-review 1 (Opus, 2026-09-25 ~19:35)

**Verdict: All findings addressed.**
- Previous Important finding (check 5 read only the dist): **ADDRESSED**.
- New Critical or Important findings: **none**.
- New Minor findings: **3**.
- Spec (the controller's ruling): met point for point. That means the `r09Missing` module; the two file-naming messages; checks 1–4, the GUARD OK line and both `.cmd` files untouched; the 4-case calibration ending CALIBRATION OK; and the dry launcher exiting 4 with the expected last line.

`<SP>` = the session scratchpad. `MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (HEAD `08dcb8f`, branch fix/coding-style-suffix-all-gemini).

## What I ran

1. **Syntax check.** `node --check` on guard-h40b.mjs, guard-r09.mjs and guard-r09-cal.mjs: exit 0 ×3 (node v22.19.0).
2. **Calibration as shipped.** `node <SP>\guard-r09-cal.mjs` printed the following and exited 0:
   ```
   (a) HEAD source: still lists bare "salary" as a negotiation term
   (b) working tree source: null
   (c) dist build: still lists bare "salary" as a negotiation term
   (d) synthetic text: lacks the R09 phrase terms
   CALIBRATION OK
   ```
   - The working-tree source was last modified at 19:18:11, after Task 1 fix round 2 and before this round's 19:24 runs. So case (b) ran on today's final source.
   - The dist is still the old build (2026-09-24 07:35:59).
3. **Dry launcher, exactly as the report ran it.** Command: `Push-Location MAIN; cmd /c "<SP>\launch-h40b-dry.cmd"`. Result: **exit 4**. The last log line is `GUARD FAILED: the build still lists bare "salary" as a negotiation term - rebuild after the R09 fix`, character for character the ruling's line.
   - My run added 2 lines to `flight-h40b-dry.launcher.log` (4 → 6).
   - It added 1 line to `%TEMP%\natively-h40b-launcher-error.log`, which now holds **3** lines. It needs clearing as planned.
4. **Throwaway probes** in `<SP>\sdd\2026-09-25-flight-h40b\rereview1-probe\`. They are read-only on MAIN and the controller may delete the folder.
   - Git reads run as `git show 08dcb8f:...` from the whole-turn worktree, which shares MAIN's object store.
   - esbuild runs in memory with `write: false`. The outdir points into the probe folder. The dist mtime was checked unchanged afterwards (B5), and no out folder was created (B6).
   - `probe.mjs`: A = predicate edge cases, B = the dist a rebuild would produce, C = the veto's effect on holdout40.
   - `hook-register.mjs` + `hook.mjs` + three stubs: D = the calibration's ability to fail.
   - `missing-import.mjs`: E = what a missing sibling module does.
5. **Diffs.**
   - guard-h40a.mjs lines 15–64 vs guard-h40b.mjs lines 13–62: identical (checks 1–4 untouched).
   - `launch-h40b.cmd` vs `launch-h40b-dry.cmd`: the only differences are the log rename and the removed flight line 43. The guard invocation is line 38 in both files, `"C:\Program Files\nodejs\node.exe" "%~dp0guard-h40b.mjs"`.
   - The `.cmd` mtimes are still round 0's (18:49:16).
   - All three `.mjs` files are LF with no BOM.

## The previous Important finding: ADDRESSED

- **Implementation.** guard-h40b.mjs:67–71 imports the shared predicate and applies it to both files:
  - `${PROJ}/dist-electron/electron/knowledge/IntentClassifier.js`, failing with `the build ${reason} - rebuild after the R09 fix`;
  - `${PROJ}/electron/knowledge/IntentClassifier.ts`, failing with `the source ${reason} - the build would not match the tree the pass record names`.
- **The finding's scenario (fixed dist over a reverted source) now fails.** Reverting to HEAD restores HEAD's text. That text starts its `STRONG_NEGOTIATION` list with `'salary', 'compensation', ...`: I read it independently from `08dcb8f`, and calibration case (a) runs the same text. The predicate returns the bare-salary reason, so the guard exits 1 and the launcher exits 4.
- **Why this closes the real gap, not only the reported one.** The flight runs `interview60.flight.mjs:263` → `interview60.run.mjs auto`, which at `interview60.run.mjs:540` runs `npm run build:electron`. That is the incremental build-electron.js, with no `--force`. So the build that flies is one of two things:
  - the dist the guard just checked, if the build skips; or
  - a compile of the working tree the guard just checked, if it rebuilds.

  With both texts checked, the flying build carries the fix either way. The only exception is an edit landing in the seconds between the guard and the launch build.
- **The guard reads the classifier the app actually loads.**
  - `KnowledgeOrchestrator.ts:9` imports `./IntentClassifier`, which is the knowledge classifier.
  - `electron/llm/IntentClassifier.ts` is a different classifier.
  - `premium/` has no copy.
  - The only other dist copy is the stray `dist-electron/.claude/worktrees/whole-turn/...` tree, which the app does not load.
- **Residual (not a finding): the guard's source-FAIL branch (lines 70–71) has not been exercised end to end.** Today the dist branch exits first; after the rebuild the source passes. The implementer's report says so. What bounds the risk:
  - The predicate is calibrated on the exact HEAD text.
  - The path is the same relative path calibration case (b) reads, under the same root.
  - A wrong path would throw ENOENT, exit 1 and then exit 4, which fails closed.

## The five requested checks

### (1) Predicate correctness (probe A, the real `r09Missing`)

| text | result |
|---|---|
| phrase entries only, TS style (`'salary expectation', 'salary expectations', 'expected salary', 'salary range', 'your salary', 'base salary', 'what salary'`) | `null` |
| `'salary', 'compensation',` (HEAD shape) | bare |
| esbuild one per line `"salary",` | bare |
| minified `["salary","compensation","salary expectations"]` | bare |
| `'salary' ,` | bare |
| **last element, esbuild layout `"salary expectations",\n  "salary"\n]`** | **`null` (escapes)** |
| **last element, minified `["salary expectations","salary"]`** | **`null` (escapes)** |
| last element, no phrase list `"compensation",\n  "salary"\n]` | phrase reason (still fails, but for the wrong reason) |
| last element in TS with a trailing comma `'salary expectations', 'salary',` | bare |
| comment `// "salary" by itself ...` (today's source line 29) | `null` |
| comment `// the old list was "salary", "compensation"` | bare (a false FAIL, source side only) |

- **A phrase entry cannot match the bare test.** The regex needs a quote immediately after `salary` and immediately before it. Every phrase has a space on one side (`salary expectations`, `your salary`, and so on).
- **The last-element escape is real but not reachable in this codebase.**
  - HEAD lists `'salary'` first, so any revert puts it before a comma in both the TS and the esbuild output.
  - The TS file's trailing-comma style means an appended `'salary',` is caught on the source side.
  - Both checks miss it only if bare `salary` is added as the last element *without* a trailing comma *and* the phrase list is kept.
  - See Minor 1.
- **No false FAIL after a correct rebuild (probe B, calibrated).**
  - B1: `esbuild.transformSync(HEAD text, {loader ts, format cjs, platform node, target node20})` reproduces the on-disk old dist **byte for byte**, apart from the `sourceMappingURL` line. So the pipeline is faithful, and the current dist was compiled from HEAD-equivalent text.
  - B2: the real `esbuild.build` API with build-electron.js's options on the working-tree file gives the same output as the transform.
  - B3: `r09Missing(predicted post-rebuild dist)` = `null`. That dist carries 11 `salary` phrase lines, no bare entry, and the veto call.
  - The source side is `null` as well (case b).
  - So after Task 3's rebuild, check 5 passes.

### (2) The relative import `./guard-r09.mjs`

- **Resolution.** ESM resolves the specifier against the importing module's URL, not the working directory.
- **Invocation.** The real launcher's guard line (`launch-h40b.cmd:38`) is the dry launcher's line apart from the log name.
- **The dry run proves it resolves.** The logged reason string exists only in guard-r09.mjs.
- **The scheduled task runs the launcher in place.** `register-natively-task.ps1:28` sets `-Execute cmd.exe -Argument '/c "<launcher>"' -WorkingDirectory $repo`, and plan line 256 arms `-Launcher "$sp\launch-h40b.cmd"`. So `%~dp0` = `<SP>\` and the sibling is found. Nothing copies the launcher files.
- **A plain `node <abs path>` from the repo root** is literally the launcher's line.
- **If the sibling is absent (probe E),** a static import of a missing sibling dies with `ERR_MODULE_NOT_FOUND`, exit 1, before any statement of the module runs (imports are hoisted). The launcher then exits 4. That fails closed, but the log holds a stack trace, not a `GUARD FAILED:` line. See Minor 3.

### (3) Can the calibration fail? (probe D)

Probe D runs the **unmodified** guard-r09-cal.mjs through a module-resolve hook that swaps `./guard-r09.mjs` for a stub:

| predicate | result |
|---|---|
| control: pass-through to the real module | CALIBRATION OK, exit 0 |
| always `null` | `CALIBRATION FAILED (HEAD source): got null, ...`, exit 1 |
| tests in the wrong order (phrase first) | `CALIBRATION FAILED (HEAD source): got "lacks the R09 phrase terms", ...`, exit 1 |
| phrase test dropped | (a)–(c) pass, then `CALIBRATION FAILED (synthetic text): got null, ...`, exit 1 |

- The calibration catches a vacuous predicate, pins the order, and case (d) is load-bearing: only (d) catches a lost phrase test.
- **How git is spawned.** `execFileSync('git', [...], { cwd: MAIN, encoding: 'utf8' })` has no `shell` option.
  - The non-ASCII path travels as the process working directory, not through cmd.exe.
  - The only arguments are ASCII.
  - Its HEAD text matches my independent `git show 08dcb8f:` read.

### (4) Exit codes and messages

- **Guard.** `fail()` prints `GUARD FAILED: <msg>` to stderr and exits 1. The launcher maps any non-zero exit to `exit /b 4` and writes the error-log line.
- **Dist message.** Observed, and it matches the ruling.
- **Source messages.** Read from the code, not run:
  - `GUARD FAILED: the source still lists bare "salary" as a negotiation term - the build would not match the tree the pass record names`
  - `GUARD FAILED: the source lacks the R09 phrase terms - the build would not match the tree the pass record names`
- **Calibration.** Exit 0 with `CALIBRATION OK`, or exit 1 with `CALIBRATION FAILED (<case>): got X, expected Y`.
- **Unnamed exits.** A missing module, or a missing dist or source file, exits 1 without a named check (Minor 3). All fail closed.

### (5) Could the guard PASS wrongly, or FAIL wrongly?

**PASS wrongly (the worst outcome).** Every path I found is minor or unreachable:

- **(a) A tree with the phrase list but without the `TECHNICAL_CONTEXT` veto passes** (probe C0b). The measured effect on this flight is none: across all 45 holdout40 items, the phrase-only variant and the working tree classify identically (C1 `[]`).
  - NEGOTIATION sets: HEAD `["R09"]`, phrase-only `[]`, working tree `[]`.
  - R09 is `technical` in both fixed variants.
  - See Minor 2.
- **(b) The last-element escape** is not reachable (see (1)).
- **(c) The guard proves the working tree, not HEAD.** A HEAD moved while the working tree stays fixed would be misattributed. The controller's commit gate before arming covers this; it is outside the ruling.
- **(d) A race** between the guard and the launch-time `build:electron` is negligible.

**FAIL wrongly after a correct rebuild (the second worst).**

- The predicted post-rebuild dist and today's source both give `null`.
- Two routes remain, and both would show up at the post-rebuild dry run before arming:
  - a future comment in the source quoting `"salary",` (probe A, last row; Minor 1);
  - a missing guard-r09.mjs (Minor 3).
- The one exception is a scratchpad cleanup, which would remove the launcher itself too.

## New findings

**Minor 1: guard-r09.mjs:9, the bare-salary regex has two edges.**
- *What happens.*
  - It misses a bare `"salary"` in the last position (`"salary"]`, `"salary"\n]`), because esbuild drops trailing commas.
  - On the source side it also counts comments, so a comment quoting `"salary",` fails the guard.
- *Why it is Minor.*
  - Neither edge is reachable today. HEAD lists `'salary'` first, the TS file uses trailing commas, and the current comment reads `"salary" by itself`.
  - The false-FAIL direction would show at the post-rebuild dry run.
- *Fix.* One-character hardening for the escape: `/["']salary["']\s*[,\]]/`. It cannot match any phrase entry, since each has a space next to `salary`.

**Minor 2: guard-r09.mjs:8–11 and guard-h40b.mjs:5/73, the predicate proves only the phrase-list half of "the R09 fix".**
- *What happens.* The fix now also includes the `TECHNICAL_CONTEXT` veto (IntentClassifier.ts:45–49 and :70, from Task 1 fix rounds 1–2). A tree without the veto passes the guard (probe C0b).
- *Why it is Minor.* The measured effect on h40b is zero: 0 of 45 holdout40 items classify differently.
- *What is still off.* The header's "the built classifier carries the fix" and the GUARD OK line's "R09 fix in the build" claim more than is checked. The ruling chose "the same two tests", so this is a scope note.
- *Fix.* Record it as such, or add the veto call (`TECHNICAL_CONTEXT.some(`, present once in the predicted dist) as a third test with a fifth calibration case.

**Minor 3: guard-h40b.mjs:12 and :64–66, plus plan line 218. The guard is now a two-file unit, and the fix's documentation doesn't say so.**
- *Header exit semantics.* Line 12 says "Exit 1 = a named check failed; the message says which". A missing or broken guard-r09.mjs now exits 1 with an `ERR_MODULE_NOT_FOUND` trace before any check (probe E).
- *File list.* The plan's Task 2 list (line 218) names only launch-h40b.cmd, launch-h40b-dry.cmd and guard-h40b.mjs. Whoever carries these files to the next flight must carry guard-r09.mjs too. For h40b itself this is fail-closed and not reachable, because the files are armed in place.
- *Check-5 comment.* Lines 64–66 describe the protected scenario as "a rebuild after a later revert ... over a stale-but-fixed dist". Taken literally, a rebuild after a revert yields an *unfixed* dist, which the dist check alone catches. The scenario the source check actually adds is a revert *after* the build. The launch-time `auto` rebuild (`interview60.run.mjs:540`) would then compile the reverted source, so the hour would *fly* without the fix, not merely be misattributed.

## Observations (not findings)

- **The calibration only works before the fix is committed and rebuilt.** Case (a) reads MAIN's HEAD and case (c) the current dist. Once the controller commits the R09 fix and Task 3 rebuilds, the script prints CALIBRATION FAILED on (a) and (c) by design. Don't use it as a post-rebuild check. It can only fail loudly; it cannot pass wrongly.
- **The review package shows the wrong path.**
  - review-task2-fix1.diff shows guard-r09-cal.mjs's path as `MasaÃ¼stÃ¼` (bytes `C3 83 C2 BC`).
  - The deliverable itself holds correct UTF-8 `Masaüstü` (`C3 BC`), and it ran.
  - The package generator double-encodes non-ASCII: the PowerShell 5.1 BOM-less read.
  - A reviewer who reads only the package would think the path is broken.
- **Deferred Minors from the previous review:** none made worse. The error log grew by one more line from this re-review's dry run (3 lines now); the design point is unchanged.
