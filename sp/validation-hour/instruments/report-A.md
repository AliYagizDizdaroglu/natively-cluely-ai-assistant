# Report A (saved by the controller from the builder's reply; the builder said the harness blocked its file write)

**Status: DONE_WITH_CONCERNS.**

**Files** (VH = `…\scratchpad\validation-hour`):
- `VH\guard-h40d.mjs`
- `VH\guard-h40d-git.mjs`
- `VH\guard-h40d-cal.txt`
- `VH\instruments\guard-h40d-cal.mjs` (the runner)
- `VH\instruments\guard-h40d-git-cal.mjs`
- `VH\instruments\guard-cal\` (the stub tree, a throwaway git repo built from real WT files)
- `VH\instruments\guard-cal-layout\` and `VH\instruments\guard-cal-appdata\` (scratch the runner needs)

No existing file was edited. Git writes were confined to the stub repo.

**Calibration**
- `node VH\instruments\guard-h40d-git-cal.mjs` → `PREDICATE CALIBRATION OK 19/19`.
- `node VH\instruments\guard-h40d-cal.mjs` (about 100 s) → `GUARD CALIBRATION OK 129/129: 108 cases (stub tree, MAIN's root, the cmd.exe launcher seam), 18/18 mutants caught`.
- Correct environment → `GUARD OK`, with `filter sha256/16 42d9bc42dbd17870` (recomputed independently) and `knowledgeMode = true`.
- Commit unset → `(10b) NATIVELY_FLIGHT_COMMIT is not set`.
- Commit wrong → `(10b) MAIN HEAD is <h>, not the registered commit 000…`.
- Commit abbreviated, or the `<REGISTERED_HEAD>` placeholder → `(10b) … not a full 40-hex commit hash`.
- Tree dirty in the stub repo (tracked `electron/` file, untracked `electron/` file, `scripts/`, untracked `src/` file, `package.json`) → `(10b) … not clean: <path>`.
- MAIN-like allowlisted dirt only → `GUARD OK`, naming the 7 allowlisted paths.
- `.env` in the stub with a guarded name and a dummy value → `(10a) .env declares NATIVELY_VERBAL_HEDGE`. The value is never printed; the `export` and `NAME:` forms also refuse.
- Hedge variable `1` → `(6) … set ("1") … even for the value 1`. `0` → `(6) … ("0")`. Typo or empty string → `(6)`.
- 09-26 hedge default (real build with unset = off) and the old stand-in → `(6) the built default is not the hedge`. The original `guard-br1.mjs hedge` agrees with this guard on all three dists.
- Dist without `CUE_LINE_PREFIX` → `(12) … dist-proof.mjs exit 1 … filter x0 "CUE_LINE_PREFIX"`.
- No `function trimCues`, source without a `CUE_RULE` or `VERBAL_TYPED_PROMPT` declaration, changed rule hash, or a no-op dist-proof → each a named `(12)`.
- Check 13 with the `-off` stub → `(13) knowledgeMode is false`; `-absent` → `(13) … absent`; `-on` → passes, printing the mtime and the key; broken JSON or a missing file → `(13)`, the file's text not quoted.
- The real settings file via the admin share → reads ON (information case, not counted).
- MAIN's root, registered commit ≠ HEAD → `(10b) MAIN HEAD is 73d7f01…, not the registered commit d83fdfe…`.
- MAIN's root, commit = HEAD → 10b passes, then `(12)` fails: 8 BAD markers including `CUE_LINE_PREFIX` x0, then `dist-proof.mjs` crashes on the missing `CUE_RULE`.
- Environment breaks on MAIN's real dist: hedge `1`, hedge `0`, trigger, follow-up flag, model override, thinking override, wrong roster → `(6)(6)(7)(8)(3)(3)(1)`.
- Launcher seam through `cmd.exe`: parent has `NATIVELY_VERBAL_HEDGE=1` and the `.cmd` runs `set NATIVELY_VERBAL_HEDGE=` → `GUARD OK`; no clearing line → `(6)`; a trailing space after the `=` → `(6) … (" ")`.
- Mutation suite: 18 copies of the guard, each with one check off; the cases that must notice it all turn BAD and the correct-environment case stays OK.

**On MAIN today (HEAD 73d7f01, 09-30 dist):**
- Checks 1–9 and 11 pass on MAIN's real files.
- Check 10b refuses any registered commit other than HEAD (the merge has not landed). With the commit set to HEAD it passes.
- Check 12 fails as above.
- Check 13 is not reached on MAIN (the guard stops at the first failure). Check 10a runs last, so MAIN's `.env` was never opened.

**Concerns and decisions**
1. **10b allowlist and scope.** r4 names three paths, but MAIN also carries four untracked scratch paths that h40c tolerated and r4 §11 expects the dry twin to name, plus two stray untracked root files. Allowlisted r4's three plus h40c's four, with the scope `electron src premium scripts package.json natively_debug.log.1`. Root docs, other configs and stray root files are deliberately out of scope: a spurious refusal at 13:30 loses the flight (StartWhenAvailable is off). A strict whole-tree reading would need `resume_prompt.txt` and `retry_claude_print.bat` removed or allowlisted.
2. **Deviations from r4.** Messages carry the r4 check number, `GUARD FAILED: (<n>) …`; h40c's old check 8 is kept as `(6b)`; 10a runs last; the guard also requires `dist-proof`'s verdict and sha lines, not just exit 0; added: the 40-hex shape check, `git --no-optional-locks`, 120 s timeouts (the guard runs in about 0.5 s), an `uncaughtException` handler so a crash is one named line; check 13 uses `=== true` as r4 says (`main.ts:687` accepts any truthy value, but the toggle only writes booleans).
3. **Check 13 in the real scheduled-task context is first exercised by the dry twin.** Here it ran against stubs, a temp `%APPDATA%` folder, and the real file via the admin share.
4. **Check 9 compares only `LLMHelper.js` with `LLMHelper.ts`, as in h40c.** A stale cue dist is caught by check 12.
5. **Check 10a guards only h40c's six names, as in h40c.** The cue work added no new `NATIVELY_*` name; WT and MAIN read identical sets.
6. **The guard depends on SP.** It resolves `../guard-r09.mjs` and `../dist-proof.mjs` from its own location in VH, and the launcher must call it by its VH path.
7. **Not exercised:** a dirty `premium` submodule, an unreadable `.env`, and `git status` failing after `rev-parse` succeeded.
8. **Long paths.** The stub and layout mirror exceed 260 characters; Node and git handle them, but PowerShell 5.1 cannot list them.
9. **For brief D:** `set NATIVELY_VERBAL_HEDGE=` must have no trailing space. A `<…>` commit placeholder makes cmd abort the batch with exit 255 and no error-log line, so use a plain token.
10. **`SP\dist-proof.mjs` crashes with a `TypeError` after its BAD lines on a pre-cue dist.** Its exit code is 1, the same as its normal failure. Not edited.
