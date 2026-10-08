VERDICT: APPROVE WITH FIXES

# Re-check: PREREGISTER-cue-grading.md revision 5 (sha256 a5e8fbf4b4b2aa39…880df4, recomputed)

Reviewer: Opus, 2026-10-03 ~22:50 local. No model or network call. No cue, question or answer text was read: ids, counts,
hashes and the registration texts only. Line numbers are rev 5's.

**Counts: Critical 0, Important 2 (S1, S2), Minor 6 (S3–S8), nits 7.** R1–R9 closed; none closes with a condition that is
always met or always passes. Two new blockers sit in the recipe's step 1 count (S1, always STOPS) and in the shared grader
cwd (S2, unprobed carry-over).

What was run:
- sha256 of the registration (`a5e8fbf4…80df4`); `node oc-sim.mjs` (sha256/16 `b467d8c1fc6c63d7`, unchanged);
- the sister checker `..\followup-turn\R\check-grader-memory.mjs`, read twice: at the first read it still carried
  `'MEMORY.md'`; at 22:47:35 it was revised (sha256/16 `119ea78a433ba47d`, 17 markers, `PROJECT_MEMORY.includes('MEMORY.md')`
  = false). Its exported `scan()` was imported, in memory and without edits, against the 22:19 probe `011ca16e…` and
  the positive control `a9d35e8deacac3eff`, and against all 5 sessions in the sister's outside-cwd slug (`…scratchpad-followup-7potx7`);
- `h40d-grader-models.mjs` (sha256/16 `8fd717fb71f90ba5`): it accepts `session:<uuid>` (regex at L57);
- `git ls-tree -r 2b0906f` in this worktree (read-only, shared objects): 911 entries, 2 of mode 160000, 0 of mode 120000;
- one PowerShell 5.1.26100 trial against a scratch tree in `<SP>\rr5-longtest` (3 files, 2 under paths > 259 characters).
  The tree and two throwaway scripts were deleted afterwards. `C\` holds only its prior files plus this one.

## Status of R1–R9

| Finding | Status | Where (rev 5) | Note |
|---|---|---|---|
| R1 step 1 pipe | **closed; new S1 in the same step** | L202–211 | `cmd /c` form with named fallback. Under PS 5.1 the `""<X>""` quoting reaches cmd as `-C "<X>"` (cmd strips the outer pair). `<X>` has no spaces, so the quoting is moot anyway. The count check added beside it cannot run (S1). |
| R2 no real positive control | **closed** | L40–47, L340–352, L426–428, L459–462, L473–480, L645–652 | Bash is named; one command is given; the normalizer has 3 forms plus variants; (g) and (h) have expectations written first; repairs go by wording or normalizer, never by loosening. Residuals: S8 (the §2 code's description omits three bans) and nit N5. |
| R3 step 7 delete | **closed** | L232–235 | Nit N4 (`force:true` hides a wrong path). |
| R4 stale count | **closed** | L199–201, L228–231, L236–237 | Name list, additions allowed, junction guard, repeated after step 7. Nit N3 (an empty before-list passes vacuously). |
| R5 token definition | **closed** | L441–447, L470–471 | Computable. `'.'` is a token, so `readdirSync('.')` and `.join('.')` are VOID; the `[` glob ban already voided the array form. But the definition constrains literals only, and S3 shows reads that need no literal. Nit N6 on `\\`. |
| R6 names | **closed** | L356–365, L457–459 | Ten enumerated names, `blind-1` in (a′). |
| R7 arm in names | **closed** | L256–259, L359–361, L366–371 | Neutral names. `sets.json` and `manifest.json` are in `keyhold\`. The condition stays visible, accepted and stated. |
| R8 | **closed** | L271–272 | |
| R9 | **closed** | L509–511, L515 | |

## Grader-memory rule (scope item 2)

- **Precondition is checkable, and met as of 22:47:35.** `PROJECT_MEMORY` is exported, so
  `PROJECT_MEMORY.includes('MEMORY.md')` is a one-line check. Record its output and the checker's sha in the amendment.
  Under the revised checker:
  - 22:19 probe: ABSENT (0 project hits, 0 claude-mem);
  - `a9d35e8deacac3eff`: LOADED (32 hits in 16 distinct).
  - The sister's calibrate script changed at 22:47:41, but its `.out.txt` dates from 19:04. "ABSENT on the removed-effect
    copies" under the revised checker has not been re-run; that is step 0b's job.
- **Departure marker rule: consistent.** The only occurrence of `DEPARTURE-MEMORY-ACCEPTED` is L404, mid-line (indented and
  after other words). A line-start reader reads "no departure" on the real file, as the §3 decide calibration requires. A
  reader using `includes` would fail that calibration, which is the point.
- Gaps are listed below: S2 (shared cwd), S4 (budgets), S5 (departure scope and timing), S6 (refusal wording), S7 (17 vs 16).

## Findings

### Important

**S1. Step 1's count check always STOPS, and its other half does not run in PowerShell 5.1 (L209–211).**
- `(Get-ChildItem "<X>" -Recurse -File -Force).Count` with `LongPathsEnabled` = 0:
  - A scratch tree of 3 files, two under directories past 259 characters, counted **1**, with one
    `DirectoryNotFoundException`. Everything below a too-long directory is skipped.
  - The export has 198 of 911 paths past 259 characters, so the count falls well short of 909, and the step stops every
    time.
- `git ls-tree -r --name-only 2b0906f | wc -l`: `Get-Command wc` finds nothing in this PowerShell, so the command errors.
- **Fix:**
  - Count the files with node: `node -e "console.log(require('fs').readdirSync('<X in C:/ form>',{recursive:true,withFileTypes:true}).filter(d=>d.isFile()).length)"`.
    It read 3 of 3 on the same scratch tree, under node v22.19.0.
  - Count the tree with `(git ls-tree -r --name-only 2b0906f | Measure-Object -Line).Lines`. It read 911 here.
  - The expectation of 909 stands: 2 gitlinks, no symlinks.

**S2. All graders share one cwd. Carry-over through it is unprobed, and the revised checker cannot see one of the two channels (L375–401, L645–652).**
- Every grader runs with cwd `C\grading\`, so all 60+ sessions share one project slug. That slug has:
  - **its own auto-memory folder.** Outside-cwd sessions receive the auto-memory instructions (`MEMORY.md` x4 in the 22:19
    probe). A grader that writes a memory note there is VOID itself (a Write outside the allowlist), but the note loads into
    every later grader: its own regrade, and the other condition's graders (a B grader's note on the spoken answer reaching
    an A grader).
    - The revised checker reads such a load as ABSENT: it no longer matches `MEMORY.md`, and the note carries none of the
      project file names.
    - The sister's slug `memory\` is empty today.
  - **one claude-mem project.** If claude-mem records a grader's tool calls and injects `[grading] recent context` into the
    next session, the checker does catch it (LOADED). But then every later grader voids, the regrade-once budget is spent,
    and the gating reading goes VOID. That would be an always-VOID path on the holdout.
- **Neither channel has been exercised.** All 5 outside-cwd sessions so far made 0 tool calls, and step 0b runs only ONE
  tool-exercising probe, so nothing yet shows a second session after one that used tools. A memory LOADED on a calibration
  transcript (h) also has no registered remedy: L476–479 cover tool-use VOIDs only.
- **Fix:**
  1. Give each grader attempt its own cwd, `C\grading\<slot>.<attempt>\`. This closes both channels by construction; the
     transcript is still found by session id.
  2. After each transcript, require the slot slug's `memory\` folder to be empty or absent; a non-empty folder voids that
     slot.
  3. Step 0b runs two tool-exercising probes in sequence, laid out exactly as the graders will be, and the second must read
     ABSENT.

### Minor

**S3. Answer to scope item 4: yes, the Bash rule can reach any non-own file without computed characters, so the §6 / L446 residual understates it.** Constructed on paper:

```
cd "<blind folder>" && node -e "const fs=require('fs'),path=require('path');process.chdir(path.dirname(process.cwd()));const n=fs.readdirSync('keyhold');process.chdir('keyhold');for(const f of n)console.log(f,fs.readFileSync(f,'utf8').length)"
```

- **It meets every ban.** Its string literals are `'fs'`, `'path'`, `'keyhold'` and `'utf8'`, so it has no file-name token
  and the token set (empty) is a subset of the allowed one. It has:
  - no `*?[`, `$`, backtick, template or `+`;
  - no `path.join` / `path.resolve`, and `readdir` only with a literal argument;
  - only `fs` / `path` required;
  - no `..`, no `~` and no absolute path.
- **It reads every key file.** The same pattern reaches:
  - `cues.blind-K.json` (the other condition's answers), with `process.chdir` into `'blind'`;
  - any file on the disk: `path.parse(process.cwd()).root`, then dot-free literal folder names, then a name taken from
    `readdirSync`;
  - the blind folder's own listing: `fs.opendirSync(process.cwd())` is not covered by `readdir*`.
- **What the bans miss.** `readFileSync`, `writeFileSync`, `rmSync` and `unlinkSync` with a variable argument, plus
  `process.chdir`, `path.dirname`, `path.parse`, `opendir*` and `fs.promises.*` (except `readdir`) are unbanned.
- **What the bans do catch.** `require('fs/promises')` and `node:fs/promises` are VOID (an unlisted module, and a token).
  `Buffer.from(hex)` and `String.fromCharCode` are the disclosed residual.
- **No benign grader does this.** The audit still detects benign strays (`readdirSync('.')`, `readdirSync(process.cwd())`,
  any `.json` literal). This is a disclosure and consistency issue: §2 tells graders that "any other shell command" voids,
  while §3.3 ALLOWS any command that meets the bans.
- **Fix (pick one):**
  1. Make §3.3 match §2: the Bash call must equal the registered command byte for byte, after the two-name substitution and
     path-form normalization. This is closed by construction; (h) measures whether benign graders comply.
  2. Keep the A2 shape and rewrite the residual as "any name obtained at run time: computed characters, a directory listing,
     `process.chdir` / `path.dirname` / `path.parse` of the cwd", and drop "any other shell command voids" from the
     instruction.

**S4. Regrade budgets conflict and have no unit (L399–401, L448–449, L558–564).**
- An `mcp__*` call is in the memory budget ("re-graded ONCE", L399–401) and also a tool-use void ("at most TWICE", L449 with
  L558). The two rules disagree on whether a second `mcp__` transcript is final.
- "If the third transcript is still … VOID" counts transcripts, but the budget is said to be per cause class. After a memory
  LOADED and then a tool-use VOID, the two readings disagree on whether a fourth transcript is allowed.
- "Per file" is undefined. Pin, tool-use and memory voids are per slot (`verdicts.blind-N.gX`); agreement is per blind file.
- The decide calibration (L526–537) has no case that crosses causes.
- **Fix:** one sentence plus one calibration set:
  - classes {pin + tool-use incl. `mcp__`: 2}, {memory: 1}, {agreement: 1};
  - counted independently, per slot (agreement per blind file);
  - a decide set crossing memory → tool-use → tool-use.

**S5. Departure scope and timing are not computable as calibrated (L403–408, L533–535, L555).**
- Under the departure, only project-memory LOADED is accepted; claude-mem LOADED still voids. The checker prints both
  counts, so this is computable, but the one LOADED calibration slot does not say which group fired. The §5.1 parenthetical
  "(outside an accepted departure)" reads as exempting both groups.
- Nothing checks "pre-call": a departure line appended after the graders ran would be accepted.
- **Fix:**
  - Add a calibration slot with claude-mem LOADED under the departure copy, expected VOID.
  - `cue-decide.mjs` requires the marker line's date-time to precede the earliest transcript timestamp of any accepted slot.

**S6. The refusal wording is reversed in effect (L537).** "Refuses when a slot of `manifest.json` has no line in any of
them" reads as "missing from all three". A slot missing from the memory output alone would then pass unchecked. Write
"has no line in any one of them".

**S7. Number drift (L396–397).** "LOADED on 17 distinct project markers at 22:20, `MEMORY.md` aside": the 22:20 output's
17 includes `MEMORY.md`x2. Without it the count is 16, and the revised checker now reads 32 hits in 16 distinct.

**S8. The §2 code description omits bans (L349–350).** "No `+`, no `$`, no template literal, no `\`, no other string
literal" leaves out `*`, `?`, `[`, `..`, `~`, an absolute path, `process.env` and `path.join`. So the code must avoid array
indexing, array literals, ternaries, `?.` and `??`, and "satisfies §3.3 by construction" is not yet true of the text. (a′)
would catch it before dispatch. List the full §3.3 set there.

### Nits

- **N1.** The marker `-natively-cluely-ai-assistant/memory` reads 0 even on the positive control (transcript paths are
  backslash-escaped). It is a dead marker and harmless.
- **N2.** L409–410: the result note's required first line is a code span broken across two source lines. State it on one
  line.
- **N3.** Step 6: an empty `nm-before.txt` (a failed listing) passes "no name missing" vacuously. Require its count (966 at
  the last read) recorded and > 0.
- **N4.** Step 7: `force:true` makes `rmSync` silent on a wrong path. Add `Test-Path "<X>"` = False to step 8.
- **N5.** A normalizer repair under R2 part 4 changes `cue-grader-tools.mjs`'s sha, so re-run fixtures (a′)–(f) and record
  the new sha.
- **N6.** The token definition excludes `\\`, the Windows separator. This is harmless today, since every file name carries
  `.json`.
- **N7.** The manifest's `probe.g1` slot needs an `instruction` value, but the probe has no frozen instruction file. Say what
  it holds.

## oc-sim (scope item 3)

No mismatch. Every §5 row matches the output, as do the `draft` 41.3, `v2` 71.4 and `v4` 84.6 / 0.8 / 5.6 / 89.3 / 27.9
figures and the count bars at (36, 110). The script is unchanged since rev 3. The only number drift found is S7, outside
the simulation.

## Not checked

- The build, the probe and every to-be-written script (`cue-material.mjs`, `cue-grader-tools.mjs`, `cue-decide.mjs`) do not
  exist yet. Findings are against the text.
- Whether claude-mem records `-p` sessions' tool calls, and whether Opus graders write auto-memory, is unknown. S2 is a
  hazard, not an observation.
- S3's command was not executed. The bypass is on paper, checked against the ban list as written.
- The Get-ChildItem trial was one scratch tree on one PowerShell build (5.1.26100.9444).
