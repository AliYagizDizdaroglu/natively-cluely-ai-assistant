VERDICT: APPROVE WITH FIXES

# Re-check: PREREGISTER-cue-grading.md revision 4 (sha256 933f52882ad1a1f6…916b, recomputed)

Reviewer: Opus, 2026-10-03 ~22:45 local. No model or network call. No cue, question or answer text was read: ids, counts,
hashes and the registration texts only. Line numbers are rev 4's.

**Counts: Critical 0, Important 2 (R1, R2), Minor 7 (R3–R9, of which R8 and R9 are nits).** N1, N4–N9 closed; N2 closed for the
name derivation (its positive-control half continues as R2); N3 closed on safety (no step can write MAIN's tree, index or refs
or delete MAIN content), but the recipe is not executable as written (R1, R3).

What was run:
- sha256 of the registration (`933f5288…916b`) and of `ref-verbalStreamFilter.42d9bc42dbd17870.js` (`42d9bc42dbd17870fe27…bb8a0`,
  21426 bytes; `ref-copy.log` agrees);
- `node oc-sim.mjs` (sha256/16 `b467d8c1fc6c63d7`, unchanged since rev 3): every §5 figure and the (36, 110) counts match;
- read-only `git -C MAIN`: HEAD `c699638` (22:14, filter +23/−1 vs `801442d`), `d83fdfe..2b0906f` filter diff empty,
  `.gitattributes@2b0906f`, gitlinks (`natively-api`, `premium`: mode 160000), tracked `node_modules` paths (0), export-ignore /
  export-subst (none), `build-electron.js@2b0906f` (sha256/16 `21697e5c82e0b8cf`, unchanged to HEAD, as are the package and
  tsconfig files), MAIN's dist filter (`42d9bc42dbd17870`, 2026-10-01 16:37), esbuild 0.21.5, `node_modules` entries;
- `git archive 2b0906f -- scripts/build-electron.js` piped to `tar` under Windows PowerShell 5.1.26100 and under `cmd /c`;
- a long-path extraction, two delete methods and `cmd /c rmdir` against a SCRATCH junction (target in the scratchpad, never MAIN).
  The scratch folders were deleted afterwards.

## Status of the rev 3 findings

| Finding | Status | Where (rev 4) | Note |
|---|---|---|---|
| N1 R33-class B band vs own-terms 0 | **closed** | L34–37, L350–356 | The plant is a direction or mechanism, never a number or a name; the B check (>= 1) is now what the rubric gives. Residual nit R9. |
| N2 name derivation, positive control | **closed (derivation); continues as R2** | L38–46, L275–278, L282–321 | Names come from `manifest.json`, never a replace; a missing slot is VOID; near-miss negatives (d), (e), (f) have their expectations written first. The new positive control (a′) is a fixture the controller writes, so it cannot show that a REAL grader under this instruction reads ALLOWED: see R2. |
| N3 build recipe | **closed on safety; executability R1, R3** | L141–164 | No `checkout`, no `--work-tree`; `git archive` writes no git state. The tar extraction runs before the junction exists, and `2b0906f` tracks no `node_modules` path, so neither tar nor mklink can reach MAIN. `cmd /c rmdir` on a junction removed only the link (scratch test, target intact). |
| N4 reference copy | **closed** | L53–56, L138, L166–167 | The sha, size and log are verified. MAIN's dist is still `42d9bc42dbd17870`, unrebuilt. |
| N5 unbounded repair | **closed** | L57–58, L391–395 | At most two regrades, then VOID (final). Nit: whether an agreement regrade and a tool-use regrade share one budget is not said. |
| N6 one vs many Bash | **closed** | L80–82, L263–266, L298–301 | §2's "exact shape with `cd`" is stricter than §3's optional `cd`. That is harmless: the checker is the looser of the two. |
| N7 denylist names | **closed by construction, subject to R5** | L61–65, L301–304 | The allowlist is only as tight as "file-name token", which is undefined (R5). |
| N8 e double-subtract | **closed** | L66–68, L194–197, L229–231 | None of R06, R15, R18, R20, R25, R28 is R31, R33 or R11. Nit R8. |
| N9 wording | **closed** | L69–70, L98–100 | The current figures match the output. The rev 2 values (86.5, 38.9) were not re-derived. |

## New findings

### Important

**R1. Step 1 of the recipe fails as written in Windows PowerShell 5.1, the shell steps 0 and 7 are written in (L144–146, L164).**
- Windows PowerShell 5.1 re-encodes a native-to-native pipe as text.
  - `git -C MAIN archive --format=tar 2b0906f -- scripts/build-electron.js | tar -t` under PowerShell 5.1.26100.9444 gave
    `tar.exe: Error opening archive: Unrecognized archive format`, with exit 1. `tar -x` failed the same way.
  - The same pipe under `cmd /c "git … archive … | tar -x -C …"` gave exit 0, and the extracted file hashed `21697e5c82e0b8cf`,
    which is byte-identical to `git show`.
- The failure is loud and harmless: nothing is extracted and the work stops. But the registered command cannot be run, and any
  deviation needs an amendment.
- **Fix (one line).** Run step 1 as `cmd /c "git archive --format=tar 2b0906f | tar -x -C ""<X>"""`.
  - The alternative is `git archive --format=tar -o "<SP>\2b0906f.tar" 2b0906f`, then `tar -xf … -C "<X>"`.
  - Either way, record the extracted file count beside `git ls-tree -r --name-only 2b0906f | wc -l` (911 entries; the 2
    gitlinks come out as empty folders).
- `tar` resolves to `C:\Windows\system32\tar.exe` (bsdtar). It extracted a 326-character path without error, so long paths are
  not a problem for step 1.

**R2. The tool-use allowlist has no REAL positive control, and nothing makes a real grader's benign validation fit it (L264–266, L291–321).**
- **Scenario.** A2 adopted this rule only after its 8 real s50l grader transcripts, under h40d's dispatch text, read clean
  (A2 point 1, L9–10, L27–28). This run's instruction file is new, and §2 tells the grader only "the exact shape … that names
  nothing but its verdicts file and its blind file". It does not carry the syntax bans. Any of these voids a legitimate grader:
  - an ordinary `console.log('n=' + n)` is "a `+` adjacent to a string literal";
  - a `${…}` breaks the `$` and template bans;
  - a validation run through the PowerShell tool rather than Bash. The PowerShell tool is the primary shell in this
    environment, and the call is "any other tool";
  - a `cd "/c/Users/…/blind"` (Git Bash form) or `cd C:/…/blind`, if the new script's normalization handles only the
    `C:\` form.
- (a′) cannot catch any of this, because the controller writes the fixture to be clean. The result would be the N2 failure shape
  again: graders VOID, two regrades each, then a final VOID of the gating reading, after 60 Opus grader runs.
- **Fix.**
  1. The frozen instruction (`.A.md` / `.B.md`) states which tool to use (the Bash tool) and gives one copyable validation
     command, or lists the bans verbatim.
  2. `cue-grader-tools.mjs` normalizes `/c/…`, `C:/…` and `C:\…` case-insensitively to one form. (a′) gains two ALLOWED
     variants: a `/c/`-form `cd` and a `C:/`-form `cd`.
  3. The §3 calibration graders' own transcripts are real transcripts under the frozen instruction. Run them through
     `cue-grader-tools.mjs`, with the expectation written first that every one reads ALLOWED, before any holdout file is
     dispatched. The calibration slots therefore need `manifest.json` entries.
  4. A benign VOID there is repaired by instruction wording (a dated amendment), never by loosening the rule.

### Minor

- **R3 (L164). Step 7 cannot delete the export.**
  - `<X>` is 205 characters long, `LongPathsEnabled` = 0, and 198 of the 911 exported paths exceed 259 characters (as do 252
    of the electron outputs under `dist-electron`).
  - `Remove-Item -LiteralPath … -Recurse -Force` on a scratch tree holding one 326-character path threw
    `DirectoryNotFoundException`, and the folder remained.
  - `node -e "require('fs').rmSync('<X>',{recursive:true,force:true})"` removed it. In the scratch test, rmSync also did NOT
    follow a junction left in place: `lstat` reports the junction as a symlink, and the target survived.
  - Use rmSync for step 7.
  - Step 4 is fine: the copied `.js.map` path is 258 characters.
- **R4 (L144, L162–164). The MAIN-intact check is stale, and it sits in the wrong place.**
  - The count is 966 now, against the 963 recorded at 22:25: MAIN's `node_modules` is shared and changed within the hour. A
    count-equality check will stop on any concurrent install. Additions are harmless; deletion is the hazard.
  - Record the step 0 entry-name list instead, and require "no step-0 name missing".
  - Add `Test-Path "<X>\node_modules"` = False as a stop condition before step 7.
  - Repeat the MAIN check AFTER step 7, the only recursive delete in the recipe. (The PowerShell 5.1 follow-the-junction risk
    did not reproduce in one scratch trial on 5.1.26100: `Remove-Item -Recurse` removed the parent and left the target intact.
    So the guard is cheap insurance, not a known live hazard.)
- **R5 (L293–296, L320). "String-literal file-name token" is undefined, so the expectations in (f) cannot be derived from the rule.**
  - The bans name `readdir*` only "with any non-literal argument", yet (f) expects `readdirSync('.')`, whose argument is a
    literal, to be VOID. That holds only if `'.'` counts as a token.
  - `['cues','inapp','B','json'].join('.')` builds the condition-B file name (answers, same folder) without `+`, `$` or a
    template.
  - Define the term, for example: "every string literal containing `.`, `/`, `\` or `:`, other than the four allowed module
    specifiers". Then add the `.join('.')` case to (f) → VOID.
  - Computed names (`String.fromCharCode`, a base64 Buffer) remain the disclosed parse-only residual (L458–460).
- **R6 (L270–272, L310–320). The 10 blind file names are not enumerated.**
  - `<set>` must encode the TWINS-H rep (r1/r2/r3) and TWINS-L, but only `inapp` appears. So "THIS run's exact names" in (a′)
    is not yet fixed by the text, and `blind\manifest.json` does not exist yet (no `blind\` folder), so this review could not
    check it.
  - Either list the 10 names, or derive the fixture names from `manifest.json` after step 1. §7 already orders step 1 before
    the tools calibration in step 3.
- **R7 (L183 vs L270–272). Grader-visible file names carry the arm label.**
  - `cues.<set>.<cond>.json` tells a grader whether it grades the in-app blocks or a twin rep, against "no ids, no model names,
    no arm".
  - The sister uses neutral `pairs.blind-N.json`.
  - Either use neutral names, with the set mapping and `manifest.json` held outside `blind\` (the checker reads it from
    anywhere), or state the exposure as accepted. It cannot favour one gating set over the other, because both must pass, so
    it is minor.
- **R8 (nit, L195–196, L66–67).** The parenthetical omits that pipeline R31 is excluded in every TWINS-H rep too. The governing
  definition ("EASY mains NOT already excluded in that set and rep") is right; only the example list is short.
- **R9 (nit, L350–352).** Of the three permitted plant shapes, "a mechanism mischaracterised" stated with a named product can
  read as "a name … false on its own terms" to a literal B grader. Prefer the "Yes"/no or wrong-metric shape, or a mechanism
  whose falsity depends on the question.

## Scope answers

1. N1–N9: closed as tabled. No remaining condition is always met or always passes. The nearest are:
   - R2: a likely-always-VOID on real graders, unexercised;
   - R4: a likely false stop.
2. **oc-sim:** no mismatch.
   - **New contradiction:** R5's (f) vs the readdir ban.
   - **Uncomputable as written:** the names in (a′) (R6) and the start of the step 0 count, which is now stale (R4).
3. **Recipe:** nothing writes MAIN's tree, index or refs, and no step was found that can delete MAIN content.
   - tar runs before the junction exists, and no tracked `node_modules` path exists.
   - The build writes `<X>\dist-electron` only (`rootDir = <X>`, `outDir = rootDir\dist-electron`).
   - `rmdir` unlinks only; both recursive deletes left a junction's target intact in scratch tests.
   - Not executable as written: R1 (step 1), R3 (step 7).
4. **Allowlist:**
   - It names the right file shapes, but the concrete names are unfixed (R6) and `manifest.json` does not exist yet.
   - The allowed Read and Write shapes cannot reach the key or the other condition's answers.
   - The allowed Bash shape can reach them only through a computed name. `.join` is reachable today until R5's definition
     closes it; `fromCharCode` and base64 are the disclosed parse-only residual.

## Outside the asked scope (noted, not counted)

- This file has no grader-memory rule. The sister has one (§6.0, A2 point 2). If graders run as subagents in this project,
  they load the project memory index, which records the h40d cue verdict and cue-mode rulings. Worth a decision before
  dispatch.

## Not checked

- **The build was not run.** So these remain unproven:
  - the `42d9bc42dbd17870` prediction;
  - esbuild writing 252 outputs past 259 characters (Go normally handles long paths).
- The `Remove-Item` follow-the-junction behaviour was tested once, on one PowerShell build, against a scratch target.
- **No grader transcript was opened**, so whether real Opus graders under a new instruction use Bash rather than PowerShell, or
  `+` concatenation, is unknown (R2).
- **`cue-material.mjs`, `cue-grader-tools.mjs`, `cue-decide.mjs` and `manifest.json` do not exist.** All findings are against
  the text.
- One `git -C MAIN status --porcelain` was run as a count (11 entries). It may have refreshed MAIN's index stat cache (no
  content change). The later reads used `show`, `ls-tree`, `diff`, `grep` and `archive` only.
- Temporary writes were made in `C\rr4-tmp` (one extracted script) and `<SP>\rr4-tartest`. Both were deleted, and `C\` holds only
  its prior files plus this one.
