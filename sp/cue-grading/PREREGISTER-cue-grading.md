# Pre-registration: grading the cues themselves (h40d's cue blocks, Opus graders, no Gemini calls)

Written 2026-10-03 18:4x local (Fable), before any cue block has been graded. **Revision 5, begun 22:40 local, after
the Opus re-check `PREREG-REREVIEW-4.md` (APPROVE WITH FIXES: Critical 0, Important R1–R2, Minor R3–R9; N1–N9
closed) and its out-of-scope note (no grader-memory rule).** Revision 4 (22:25) followed `PREREG-REREVIEW-3.md`
(N1–N9); revision 3 (22:05) followed `PREREG-REREVIEW.md` (RI1–RI3, m1–m9); revision 2 (18:54)
followed the first review `PREREG-REVIEW.md` (C1, I1–I8, M1–M12). No classification, calibration or grading has run;
nothing was read from a grader; no snapshot has been built; the reference copy of §1 HAS been taken (22:22:21, the
first half of step 0). Every rule change is marked `[rev 2: ...]` … `[rev 5: ...]` in place; the
change logs are §0 (rev 5, rev 4, then rev 3) and §8 (rev 2). Un-parked by the user
at 18:37 ("go with ... 2": Opus graders on h40d's existing cues, no Gemini calls). It closes the gap the user caught
after h40d ("we need to grade cues too"): rule 4 checked the block's shape, 3c the spoken answer under it, 2c the
thinking cost; nothing judged whether a cue is right or usable (memory `feedback_grade_feature_output`). The frozen
answer grader (`interview60.grader-prompt.md`, stamp 8564ba96369a) is not touched: this is a second, separate
instrument.

The question it answers, in the user's roadmap words (AGENDA 18:24 Sat: cue mode comes back, if at all, only on HARD
questions, to make a long answer readable at a glance): **on hard questions, are the cues correct, consistent with the
spoken answer, and usable at a glance?** It decides nothing about speed (2c's FAIL binds and is not renegotiated here)
and licenses no build: a PASS is a precondition for the flag-on measurement the 20:00 Fri ruling named, not that
measurement.

## 0. Change logs

### 0.5 Revision 5 (2026-10-03 22:40 local; every item of `PREREG-REREVIEW-4.md` and its out-of-scope note; nothing graded, built or classified before or after; no model call made)

- **Facts since revision 4, recorded (not findings).** The re-review ran, read-only and in scratch only: PowerShell 5.1
  re-encodes a native-to-native pipe as text (`git archive | tar` fails under it, exit 1, and succeeds under `cmd /c`,
  the extracted script byte-identical to `git show`); `tar` is `C:\Windows\system32\tar.exe` (bsdtar) and extracts a
  326-character path; `LongPathsEnabled` = 0 and 198 of the 911 paths at `2b0906f` exceed 259 characters, so
  `Remove-Item -Recurse` throws `DirectoryNotFoundException` on such a tree and leaves it, while `fs.rmSync` removes it
  and does not follow a junction (one scratch trial each); `cmd /c rmdir` on a junction unlinks only (scratch, target
  intact); MAIN's `node_modules` entry count drifted 963 → 966 within the hour (shared, concurrently installed).
  The user re-logged the Claude CLI at 22:19: a top-level `claude -p --model opus` session with cwd OUTSIDE the project
  tree works (the sister's probe `011ca16e-5258-4124-92fb-3ea525dc85a7`, model `claude-opus-5-5`, result OK, its slug
  folder's `memory\` empty). Nothing here has been built or graded; the reference copy (22:22:21) stands.
- R1 (Important): fixed. Step 1 runs under `cmd /c` (the measured form); `git archive -o` + `tar -xf` is the named
  fallback. The extracted file count is recorded against `git ls-tree -r --name-only 2b0906f | wc -l` = 911 (expected
  909 files; the two gitlinks come out as empty folders).
- R2 (Important): fixed, four parts. (1) The frozen instruction names the Bash tool by name, gives ONE copyable
  validation command whose code is the registered `<code>` (§2), and says that any other shell (the PowerShell tool
  included), tool or command voids the file. (2) `cue-grader-tools.mjs` normalizes `C:\…`, `C:/…` and `/c/…`
  case-insensitively to one form; (a′) gains a `/c/`-form and a `C:/`-form `cd` → ALLOWED each. (3) Real positive
  controls, expectation ALLOWED written first, before any holdout file is dispatched: this registration's own alias
  probe (a tool-exercising one: one Read, one Write, one validation Bash under the dispatch flags) and then every §3
  calibration grader's transcript; calibration slots and the probe slot get `manifest.json` entries. (4) A benign VOID
  on those is repaired by instruction wording (dated amendment), never by loosening the rule.
- R3 (Minor): fixed. Step 7 deletes with `node -e "require('fs').rmSync(…)"`; `Remove-Item -Recurse` is not used.
- R4 (Minor): fixed. Step 0 records the sorted entry-NAME list of MAIN's `node_modules`, not a count; step 6 requires
  "no step-0 name missing" (additions listed, not a stop) and `Test-Path "<X>\node_modules"` = False; the MAIN check
  is repeated after step 7 as step 8.
- R5 (Minor): fixed. "String-literal file-name token" is defined (§3.3): a string literal containing `.`, `/` or `:`,
  or a `\` that is not one of the escapes `\n \t \r \\ \' \"`, other than the four allowed module specifiers. So
  `'.'` is a token, which makes `readdirSync('.')` and `[…].join('.')` VOID by the subset rule; the `.join('.')` case
  is added to (f).
- R6 (Minor): fixed with R7. The 10 holdout blind files are enumerated by neutral number, `cues.blind-1.json` …
  `cues.blind-10.json`, their verdicts `verdicts.blind-N.gX.json`; the probe and calibration files `cues.probe.json`
  and `cues.cal-K.json` likewise; (a′) uses `blind-1`.
- R7 (Minor): fixed. Neutral names: the set ↔ number assignment (seeded coin) lives in `keyhold\sets.json`, outside
  `blind\`, with the key files; `manifest.json` also moves to `keyhold\` (the checker reads it from anywhere) and
  carries no set name. The condition is NOT hidden (the instruction file differs by condition): stated as accepted.
- R8 (nit): fixed. The parenthetical lists R31 for every TWINS-H rep.
- R9 (nit): fixed. The R33-class plant is a "Yes"/no reversal or a wrong metric, or a mechanism mischaracterised WITHOUT
  a named product or service in the mutated line (its falsity depends on the question, never on a name).
- **Out-of-scope note: a grader-memory rule, added (§3 "Grader sessions and memory", §5.1, §7 step 0b), in the sister
  registration's shape (`PREREGISTER-turn-followup.md` §1 Memory, §6.0; `AMENDMENT-A2.md` points 2 and 8).** Graders
  are top-level `claude -p --model opus` sessions with cwd `SP\cue-grading\grading\` (outside the project tree), so the
  project memory index (which records the h40d cue FAIL and the cue-mode rulings) and claude-mem's SessionStart context
  do not load; proven before the user's OK by this registration's own alias probe reading ABSENT under
  `..\followup-turn\R\check-grader-memory.mjs` in its revised form (the non-distinctive `MEMORY.md` marker dropped; the
  positive control `a9d35e8deacac3eff` reads LOADED). A LOADED grader voids its file's reading, reported, re-graded
  ONCE. Subagent graders are a departure, only as the user's explicit, dated, pre-call choice, stated first in the
  result note. The controller writes no memory or agenda line about this grading's outcome until every verdict file
  exists.
- Nothing rejected. No rubric scale, bar, expectation, plant count, size or verdict threshold changes in this revision;
  the §5.1 VOID list gains the memory clause.

### 0.4 Revision 4 (2026-10-03 22:25 local; every item of `PREREG-REREVIEW-3.md`; nothing graded, built or classified before or after; the reference copy taken 22:22:21)

- **Facts since revision 3, recorded (not findings).** MAIN HEAD is `c699638` (2026-10-03 22:14, "a coaching card
  over 200 words passes the word guard whole": `cutAtWordBudget` decides a JSON card on `{"`; +23/−1 on
  `electron/llm/verbalStreamFilter.ts` against `801442d`), which commits the edit rev 3 called uncommitted. MAIN's dist
  is NOT rebuilt: its filter still hashes `42d9bc42dbd17870` (mtime 2026-10-01 16:37, re-read 22:2x). The filter
  history is now `d83fdfe` = `2b0906f` → `801442d` → `c699638`; the pin stays `2b0906f`. `premium` and `natively-api`
  are submodules at `2b0906f` (commit objects, not tracked files; the re-review's "premium/ is tracked" is corrected
  in the §1 recipe, where it does not matter). `.gitattributes` at `2b0906f` is `* text=auto eol=lf` with `*.ts
  eol=lf`, so an export and a checkout agree on LF whatever `core.autocrlf` says (the re-review's CRLF caveat is moot).
- N1 (Important): fixed. The R33-class plant is a wrong DIRECTION or MECHANISM (a "Yes" where the answer is no, the
  wrong metric, a mechanism mischaracterised: the rubric's own `correct` 0 examples), never a number or a name, so the
  `consistent` own-terms 0 clause cannot apply and >= 1 is the rubric's answer in condition B. The B boundary check is
  kept; 26 checks on 22 mutants unchanged.
- N2 (Important): fixed. The §3 tool-use check adopts the sister registration's ALLOWLIST (`followup-turn\AMENDMENT-A2.md`
  point 1, 22:21) with this material's names: Read only the own blind file or the condition's instruction file;
  Write/Edit only the own verdicts file; Bash only `cd "<own blind folder>" && node -e "<code>"` whose file-name
  tokens are a subset of {own verdicts, own blind}, with the A2 syntax bans. The own names come from a dispatch
  manifest `SP\cue-grading\blind\manifest.json` written by `cue-material.mjs` (one entry per grader slot), never from a
  string replace of the verdicts name. Calibration (a) (a Thursday cue-bench transcript, whose names `pairs.rN.hN.json`
  / `verdicts.rN.hN.gN.json` are not this run's and would need a mapping the script does not have) is REPLACED by
  (a′) under this run's exact names in the real blind folder; near-miss negatives (d), (e), (f) added, expectations
  written first. The rev 3 file-name denylist is gone: under the allowlist it is not needed.
- N3 (Important): fixed. The §1 build recipe names every command: `git archive --format=tar 2b0906f | tar -x` from the
  controller's own checkout (no git state written anywhere; never a checkout in MAIN, never `--work-tree` against
  MAIN's shared index), a junction by `cmd /c mklink /J`, `node scripts\build-electron.js --force` with cwd in the
  export, the junction removed ALONE by `cmd /c rmdir` before any recursive delete, then MAIN's `node_modules` proven
  intact (`esbuild\package.json` present, entry count unchanged: 963 at 22:25) before the export is deleted; a failed
  check stops everything. All commands and outputs go to `build.log` in the snapshot folder.
- N4 (Minor): DONE, recorded in the §1 pin table: `SP\cue-grading\ref-verbalStreamFilter.42d9bc42dbd17870.js`, 21426
  bytes, sha256 `42d9bc42dbd17870fe27da16f1172e5164baf253f8274b25cf9ce5faaf8bb8a0`, taken 2026-10-03 22:22:21 from
  MAIN's dist (mtime 2026-10-01 16:37), log `SP\cue-grading\ref-copy.log`. The "copy refused" case no longer exists;
  the reference is this file from here on, never MAIN's dist.
- N5 (Minor): fixed. A pin or tool-use void is repaired by at most TWO regrades per file; a third unpinned or VOID
  transcript leaves the reading VOID, final, reported (§5.1).
- N6 (Minor): fixed. §0.3 (RI2 line), §2 and §3 now agree: one or more Bash calls, each meeting the rule; one failing
  call voids.
- N7 (Minor): closed by construction and by naming. Under the allowlist a Bash call's file-name tokens must be a
  subset of {own verdicts, own blind}, so `interview60.judge*`, `interview60.answers*`, `natively_debug*`,
  `interview60.runs*` and any key file cannot appear; the key files are named (`SP\cue-grading\keyhold\key.<set>.<cond>.json`)
  and calibration (f) proves the answer-bearing name `interview60.judge.pairs.json` reads VOID. Residual as A2's: the
  audit detects, it does not prevent (§6).
- N8 (Minor): fixed. e = the EASY mains NOT already excluded (in-app: pipeline R31 and inherited R33 are mains; TWINS-H
  r2: R11), counted per set and per rep; an excluded main classified EASY is subtracted once. None of the six EASY
  candidates is an excluded main, so the expectation arithmetic is unchanged. `cue-decide.mjs` counts directly.
- N9 (Minor): fixed. "within 2.5 points", the two largest moves named (noisy REPORTED 86.5 → 84.0, a relabelled
  scenario; draft centre SAFE 38.9 → 41.3); no conclusion changes.
- Nothing rejected. No rubric scale, bar, expectation, plant count, size or verdict rule changes in this revision.

### 0.3 Revision 3 (22:05 local; every item of `PREREG-REREVIEW.md`; nothing graded, built or classified before or after)

- RI1 (Important): §3 plants now carry a direction. 20 harm checks pass at or below their target; 6 boundary checks
  pass only at exactly 1 (trailing conjunction, glance; true extra name, consistent) or >= 1 (R33-class, condition B,
  consistent) from BOTH graders. Which plant is which is listed. A harsh grader now fails calibration.
- RI2 (Important): §3 and §5.1 replace "any read other than its own blind file (or any write)" with an explicit
  allow-list: reads of its own blind file and its condition's frozen instruction file; a write to its own verdicts
  file (never a void); Bash calls, one or more, each allowed only under the sister registration's allow-rule [rev 4,
  N6: rev 3 wrote "one Bash call"; §3 governs, and since rev 4 the rule is A2's allowlist shape, not the file-name
  denylist this line carried]. The check is a separate script, `cue-grader-tools.mjs`, calibrated in both
  directions (a transcript that only writes and validates its verdicts must NOT void; one that reads a keyhold path
  must). The calibrated pin script `h40d-grader-models.mjs` (sha256/16 b09b8b84a77335fa) is not edited.
- RI3 (Important): the filter is pinned to a build from a NAMED commit, `2b0906f` (h40d's registered HEAD, under which
  the in-app cue material was produced), into `SP\dist-snapshots\main-h40d-2b0906f\`, built by the controller before
  the user's OK, recorded by full sha256 in the §1 material table. Why 2b0906f and not 801442d: the filter source is
  byte-identical from `d83fdfe` (2026-09-30 22:10, the last filter commit before the hour) through `2b0906f`
  (`git diff d83fdfe 2b0906f -- electron/llm/verbalStreamFilter.ts` is empty) and changes at `801442d` (2026-10-03
  18:57, +11/−1, the notation-chunking fix), with an uncommitted `cutAtWordBudget` edit in MAIN's working copy after
  that. MAIN's live dist (`42d9bc42dbd17870`, built 2026-10-01 16:37) is therefore NOT a stable instrument and is no
  longer referenced as one. A reference copy of that live file is also taken now, for the equivalence rule in §1.
- m1: sizes (36, 110), not (36, 118): in-app = 39 − e, pooled = 119 − 3e, e = EASY mains (derivation in §1). The §5
  table and the illustrative counts are re-run at (36, 110) from the revised `oc-sim.mjs`; the HARD expectation's
  pooled lower bound is 98, not 96.
- m2: `oc-sim.mjs` draws GOOD among non-either-harmful blocks and specifies each scenario by its marginal GOOD rate,
  so GOOD + either-harmful <= 1 by construction; the noisy scenario is relabelled GOOD .80 (rev 2's .85 with
  either-harmful .175 summed to 1.03). Conclusions unchanged within 2.5 points (§5) [rev 4, N9: rev 3 said 2; the two
  largest moves are noisy REPORTED 86.5 → 84.0 (−2.5, the relabelled scenario) and draft centre SAFE 38.9 → 41.3
  (+2.4); no conclusion changes].
- m3: §5 discloses `v4` (looser; centre SAFE 84.6% / FIX 0.8%, low edge FIX 5.6%, but bad rule FIX 89% and noisy
  graders SAFE 28%) and why `v3` was kept; the low edge's FIX 12.1% is above the first review's suggested 10% and is
  accepted, stated as such.
- m4: agreement is computed per FILE over that file's gating blocks; a failing file is regraded once; a second miss
  leaves the reading VOID, reported. Disclosed as a backstop: at the expected rates it cannot fire before the
  either-harmful bar does.
- m5: a floor VOID (< 30 / < 90 cue-attributable HARD blocks) is final for that reading; no regrade changes it.
- m6: counts restated AFTER the pipeline exclusion: partly-correct in-app 4 (R08, R12, R13, R22F), twins 4 / 1 / 3;
  inherited adds only in-app R33 and r2 R11; TWINS-L r1's one correctness-0 answer is R02F (pipeline), so TWINS-L has
  no inherited block (rev 2 said "one"; recounted 22:10 from the judge files, ids only).
- m7: the classification text sent is a copy of `SP\router40\classifier-dispatch.txt` part A (ROUTE, the definition
  and its boundary rules; source sha256/12 33f4da8a2f8b, 35 lines, no router40 ids in part A), part B (difficulty)
  dropped, with this material's input and output names; the copy's sha is appended as a dated amendment before step
  2. Stated: §1 is used as approved and uncalibrated (router40's own §6.4 has not run).
- m8: r1 R09 (no frozen-grader correctness; that judge holds 43 items) is "not cue-introduced, not inherited, not
  partly-correct, named", counted on A alone.
- m9: cue-introduced is `cons0(consistent)` in §3's wider sense (contradiction OR false on its own terms); the rev 2
  change log line for I1 is corrected to match §3.
- Also: the `oc-sim.mjs` revision is recorded by sha in §5; the `trimCues` loader in §7 reads the snapshot, never
  MAIN's dist. None of the nine Minors declined.

## 1. Material (all on disk; no model is called for answers)

Run folder: MAIN `electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d` (registered HEAD 2b0906f, CUE_RULE
8e15e4e7dd41, limits 3 x 5, the app's dist filter sha at the hour `42d9bc42dbd17870`). Counts read 2026-10-03 18:40
from the files and recounted by the review.

**The display instrument [rev 3, RI3].** Every twin and calibration block passes through `trimCues(cues, 3, 5).cues`
(the cap AND `cleanNotation`, exactly what the app would have displayed; the in-app log lines are already post-trim).
The function is loaded from a pinned snapshot, never from MAIN's live dist:

| Pin | Value |
|---|---|
| Source commit | `2b0906f` (h40d's registered HEAD; filter source identical to `d83fdfe`, the last filter commit before the hour; next changes `801442d` 2026-10-03 18:57 and [rev 4] `c699638` 22:14, +23/−1, MAIN's HEAD now; MAIN's dist not rebuilt since 2026-10-01 16:37) |
| Snapshot path | `SP\dist-snapshots\main-h40d-2b0906f\dist-electron\electron\llm\verbalStreamFilter.js` (+ `.js.map`, copied beside it, NOT hashed: its `sources` paths may differ by location), with `SNAPSHOT.txt` (source commit, taken time, builder, sha) as `main-precue-73d7f01` has, and `build.log` (every command below with its output) |
| Build [rev 4, N3: commands named; MAIN's HEAD, index, working tree and `node_modules` are never written; rev 5, R1, R3, R4: executable in PowerShell 5.1] | by the controller, before the user's OK and before step 1: the recipe below this table, steps (0)–(8), every command and its output into `build.log` |
| sha256 (full) | **[controller fills at build time, before the user's OK]** — expected sha256/16 `42d9bc42dbd17870` (same source, same esbuild, the sourcemap comment is relative), in which case the pin is the very bytes the app ran |
| Reference copy [rev 4, N4: DONE] | `SP\cue-grading\ref-verbalStreamFilter.42d9bc42dbd17870.js`, 21426 bytes, sha256 `42d9bc42dbd17870fe27da16f1172e5164baf253f8274b25cf9ce5faaf8bb8a0`, taken 2026-10-03 22:22:21 from MAIN's `dist-electron/electron/llm/verbalStreamFilter.js` (mtime 2026-10-01 16:37), before any MAIN rebuild (MAIN HEAD `c699638`, dist unrebuilt at the copy); log `SP\cue-grading\ref-copy.log`. From here on THIS file is the reference; MAIN's dist is never read again by this work |
| If the snapshot's sha differs from the reference | the snapshot is accepted only when `trimCues(cues, 3, 5).cues` is byte-identical between snapshot and reference on every material block (44 / 44 / 44 / 44 / 42 and the 116-block calibration pool); the comparison's counts go in the amendment. Otherwise stop: no material is built, this file is amended |

**Build recipe [rev 4, N3; rev 5, R1, R3, R4].** `<SP>` = the scratchpad, `<X>` = `<SP>\build-2b0906f`, `<MAIN>` =
the main checkout. The shell is Windows PowerShell 5.1 (`cmd /c` and `node -e` where named). In this order; a failed
step stops the work and the user is told:

0. `(Get-ChildItem "<MAIN>\node_modules" -Force).Name | Sort-Object` → `build.log` as `nm-before.txt` [rev 5, R4: the
   NAME list, not a count: the folder is shared and its count drifted 963 → 966 within an hour; an addition is
   harmless, a deletion is the hazard].
1. Export, no checkout: `mkdir "<X>"`, then from the controller's OWN checkout (any worktree of the repo; the objects
   are shared), under `cmd` because PowerShell 5.1 re-encodes a native pipe as text [rev 5, R1: measured by the
   re-review: the PowerShell pipe fails with `Unrecognized archive format`, exit 1; the `cmd /c` form exits 0 and the
   extracted file is byte-identical to `git show`]:
   `cmd /c "git archive --format=tar 2b0906f | tar -x -C ""<X>"""` (`tar` = `C:\Windows\system32\tar.exe`, bsdtar,
   which extracted a 326-character path in the re-review's trial). Fallback if the quoting fails: `git archive
   --format=tar -o "<SP>\2b0906f.tar" 2b0906f`, then `tar -xf "<SP>\2b0906f.tar" -C "<X>"`, the tar file deleted
   after step 1; which form ran goes in `build.log`. Then record `(Get-ChildItem "<X>" -Recurse -File -Force).Count`
   beside `git ls-tree -r --name-only 2b0906f | wc -l` = 911: expected 909 files (911 minus the two gitlinks, which
   come out as empty folders); a different count stops. `git archive` writes no git state at all.
   Never `git checkout 2b0906f` in MAIN (moves its HEAD and working tree); never `git --work-tree="<X>" checkout`
   (rewrites MAIN's shared index, memory `tooling_commit_shared_index`). `.gitattributes` at `2b0906f` is
   `* text=auto eol=lf`, `*.ts eol=lf`: the export is LF, as a checkout would be. `premium` and `natively-api` are
   submodules (commit objects), so `<X>\premium\electron` does not exist; `build-electron.js` (sha256/16
   `21697e5c82e0b8cf` at `2b0906f`, unchanged to HEAD) skips it when absent and, with `bundle: false`, transpiles
   each file alone, so the filter's output does not depend on it.
2. `cmd /c mklink /J "<X>\node_modules" "<MAIN>\node_modules"` (a junction; `esbuild` 0.21.5 is the only module the
   script requires).
3. `node scripts\build-electron.js --force` with cwd `<X>` (the script's root is its own parent, so `<X>\dist-electron`
   is written, never MAIN's).
4. Copy `<X>\dist-electron\electron\llm\verbalStreamFilter.js` and `.js.map` into the snapshot path (the `.js.map`
   destination is 258 characters, under the 259 limit; copy with `node -e` `fs.copyFileSync` if any path grows);
   write `SNAPSHOT.txt`; sha256 the `.js` into the pin table.
5. Remove the junction ALONE, first: `cmd /c rmdir "<X>\node_modules"` (unlinks the junction without entering its
   target; the re-review exercised it once in scratch: link gone, target intact). Never a recursive delete while the
   junction exists.
6. Prove MAIN intact: `<MAIN>\node_modules\esbuild\package.json` exists AND every name of `nm-before.txt` is still
   present (`Compare-Object` on the sorted lists: names only in the AFTER list are additions, listed and allowed; a
   name only in the BEFORE list stops) AND `Test-Path "<X>\node_modules"` is `False` [rev 5, R4], all three lines
   into `build.log`. A failed check stops here: nothing else is deleted.
7. Only then delete the export: `node -e "require('fs').rmSync('<X>',{recursive:true,force:true})"` (the path in
   `C:/` form) [rev 5, R3: `LongPathsEnabled` = 0 and 198 of the 911 exported paths exceed 259 characters, so
   `Remove-Item -Recurse -Force` threw `DirectoryNotFoundException` on such a tree and left it; `rmSync` removed it,
   and in the same scratch trial did not follow a junction, which `lstat` reports as a symlink].
8. Repeat step 6's first two checks after the delete (the only recursive delete in the recipe) [rev 5, R4]; both
   lines into `build.log`. A miss here is reported to the user at once, before anything else is done.

`cue-material.mjs` refuses to run when the snapshot file's sha256 is not the one recorded here, or when the reference
file's sha256 is not `42d9bc42dbd17870fe27da16f1172e5164baf253f8274b25cf9ce5faaf8bb8a0` [rev 4, N4].

| Set | Source | Blocks | Form the grader sees |
|---|---|---|---|
| IN-APP (gating) | `natively_debug.log` `[Answer] cues:` lines joined to items by the judge pairs' `dispatchedAt` [rev 2, M1: the playing-item join of `smoke-facts.mjs` agrees on all 47 lines; the pairs' dispatch is the join of record] (47 lines: 2 are the readiness probe's, before the first item played, excluded; R29 has two, the 11:31:30Z one superseded, excluded; R05 has none) | 44 on 44 items | as displayed: the log line is the post-`trimCues` array (`IntelligenceEngine.ts:419-421`) |
| TWINS-H (gating, pooled) | `interview60.answers.gemini-3.5-flash-lite_captured-high{,-r2,-r3}.json`, field `cues` (the app's own bytes, 3.5-lite HIGH with the rule, the model that won 38 of 44 in-app windows) | 44 / 44 / 44 (r1's R09 has an empty prose: graded in condition A only, "no answer" in B) | [rev 2, I3; rev 3, RI3] `trimCues(cues, 3, 5).cues` from the pinned snapshot above: the cap AND `cleanNotation`, exactly what the app would have displayed. Blocks the function changed (r1 R23, r2 R04F carry `$` notation) are reported |
| TWINS-L (reported only) | `interview60.answers.gemini-3.1-flash-lite_captured-low.json` r1 (the back leg, 6 in-app wins) | 42 (R01, R09F have no block: absent) | as TWINS-H |

Not graded: the no-cue twins (no blocks), TWINS-L r2/r3, the bare arms (`_high`, `_low`: 33 blocks each on scripted
text with no context, not what the app showed), scenario50's bench blocks (calibration material only, §3).

Each block is graded with the item's question as the judge pairs carry it (`interview60.judge.pairs*.json`
`question`: the scripted text, a follow-up with its parent in brackets). Condition B adds the spoken answer: in-app
the pairs file's `answer` (as shown), twins the `spoken` field (equal to the pairs' `answer` on every paired id, per
the review). [rev 2, M7] One twin `spoken` in r1 and one in r2 carry a raw `__CUES__` marker and 1–2 per file another
`__X__` marker; the condition B instruction tells graders to ignore `__X__` markers when judging `consistent`. Nothing
else is shown: no ids, no model names, no arm, no grades from the answer grading, no prompt, no profile. [rev 5, R7]
The file names a grader sees are neutral (`cues.blind-N.json`, §3), so the set (in-app or a twin rep) is not in the
name either; the CONDITION is visible (the instruction file is `.A.md` or `.B.md`), accepted: it is what the grader
is asked to do, not which arm it grades.

**Exclusions from the gate [rev 2, I4; stated before any grade].** The FIX verdict prescribes a cue-rule change, so
only cue-attributable blocks gate. Excluded from every gating count and reported beside it with their axis scores:
- **pipeline**: R11F, R02F, R07F, R31, named now from the h40d result note (the model never received the scripted
  question: parent evicted, parent merged by the ear, a partial dispatch); the twins replay the same bytes, so the
  exclusion applies in every set: 4 blocks per set and rep.
- **inherited**: blocks whose spoken answer the frozen grader scored correctness 0, not already pipeline [rev 3, m6:
  recounted from the judge files, ids only]: in-app R33; TWINS-H r2 R11 (r2's other correctness-0 answer is R02F,
  pipeline; r1 and r3 have none); TWINS-L r1's only correctness-0 answer is R02F, pipeline, so TWINS-L has no
  inherited block. The cue cannot be better than the answer it was written with.
- **Denominator** per set = HARD blocks minus the excluded = in-app 39 − e, TWINS-H pooled 119 − (e1 + e2 + e3), where
  e = the EASY mains NOT already excluded in that set and rep [rev 4, N8; rev 5, R8: in-app R31 (pipeline) and R33
  (inherited) are mains, as are R31 (pipeline) in every TWINS-H rep and TWINS-H r2's R11 (inherited); an excluded
  main classified EASY is subtracted once, never twice] (classified
  below; in-app 44 − 4 − 1 − e; pooled 132 − 12 − 1 − Σe_r) [rev 3, m1]. [rev 2, M3; rev 3, m6:
  counts after the pipeline exclusion] Blocks on a correctness-1 answer (in-app 4: R08, R12, R13, R22F; TWINS-H
  4 / 1 / 3: r1 R08, R09F, R11, R22; r2 R22; r3 R22, R25, R33) stay in the denominator for GOOD and HARMFUL, are never
  cue-introduced (that needs correctness 2), and are reported as a third class, "on a partly-correct answer".
  [rev 3, m8] r1 R09 has no frozen-grader correctness (that judge holds 43 items): it is counted on A alone, is "not
  cue-introduced, not inherited, not partly-correct", and is named in the report.

**Holdout rule.** holdout40 is graded here and never tuned on. (a) No cue-rule wording, example or prompt line is
written from a holdout block or a grader's reason; (b) a NEEDS-A-FIX verdict is acted on by developing and benching the
fix on scenario50's captured prompts (the cue bench's material), then a fresh holdout hour under a new
pre-registration; (c) the result note reports ids, axis scores and counts, and may quote a cue line to name a failure
class, but the cue rule's next revision cites non-holdout examples only. [rev 2, M11, disclosed] Two rubric phrases
and one expectation below echo holdout lines already quoted in the h40d result note (R33's "Yes" block; R12's line
cut at "and"). Rule (a) restricts the cue rule, not this instrument; per-item expectations do not bind the graders,
and the "and" boundary is settled by a non-holdout plant (§3).

**Hard items [rev 2, I7: the gating split is the router's].** The class "cues on hard only" would be gated by is the
router's, fixed and approved by the user at ~18:35: `SP\router40\SET-draft.md` §1 (EASY = one named concept, stands
alone, no multi-part structure, no situation; ", and why" = HARD; every follow-up HARD; when in doubt, HARD). Two
Opus agents classify the 32 mains blind with that definition verbatim (the 12 follow-ups are HARD by its rule and are
not sent). [rev 3, m7] The text sent is `SP\cue-grading\hard-classifier-dispatch.txt`: a copy of
`SP\router40\classifier-dispatch.txt` (sha256/12 `33f4da8a2f8b`, 35 lines, mtime 18:50) keeping its preamble and
part A (ROUTE: the four EASY clauses, the fixed boundary rules, the HARD catch-all; it cites no router40 ids, unlike
`SET-draft.md`), dropping part B (difficulty) and the `difficulty` output field, with the input renamed to this
material's 32 texts under neutral ids and the verdict path under `SP\cue-grading\blind\`. Its sha256/12 is appended
to this file as a dated amendment before the agents are dispatched; a run on a different sha is not read. Stated now:
this reading uses §1 as approved and uncalibrated (router40's own definition calibration, its §6.4, has not run).
[rev 2, M2] EASY only when both agents say EASY; otherwise HARD. R05 has no block and is not classified. This runs
before any cue grade is read. The base-rate split (`SP\l38base\PREREGISTER-base-rate.md`, one fact in <= 5 words) is
reported beside it by two further agents, never gating. Roster `level` is a second reported cut. Expectation under
§1, recorded now: EASY 3 to 7 of 32 mains (candidates R15, R18, R20, R25, R28, R06), so HARD 37 to 41 of 44; after
the exclusions, cue-attributable HARD blocks 32 to 36 in-app and 98 to 110 pooled over the three TWINS-H reps [rev 3,
m1: 39 − e and 119 − 3e at e = 7 and 3; rev 4, N8: e counts EASY mains not already excluded, and none of the six
candidates is R31, R33 or R11, so the arithmetic stands]. VOID floors (§5) sit at 30 and 90, below both; they trip
only at e >= 10.

## 2. Rubric (frozen here; the graders get it verbatim; integers 0, 1, 2)

Condition A, cue block + question only (can the block stand on its own?):

- **correct** — 2: every line is true for this question. 1: a line is imprecise or could mislead but is defensible.
  0: a line states something false, or answers the question the wrong way (a "Yes" where the answer is no, the wrong
  metric, a mechanism mischaracterised). The line is judged as a candidate would read it aloud.
- **covers** — 2: every part the question names has a line (a grouped theme counts), in the order asked, and no line
  is spent on a part the question did not name [rev 2, M5]. 1: a named part has no line, the order is broken, or a
  line covers an unasked part. 0: the block addresses a different question, or no asked part.
- **specific** — 2: line 1 carries the direct answer (the number, the named service, the mechanism, the choice) and
  every line carries a specific thing. 1: lines are topic labels that point at the right content. 0: generic or
  contentless ("Key considerations", "Overview"), or a line restates the question.
- **glance** — 2: each line reads in one look and could open a spoken sentence. 1: awkward: cut mid-phrase, a trailing
  "and", an abbreviation the candidate may not read. 0: unusable: raw notation or markup, a question, a line that
  addresses the listener as "you" [rev 2, M6: "you" inside a phrase, "keys you control", is not addressing the
  listener], an empty line.

Condition B, cue block + question + the spoken answer (does the block say what the answer says?):

- **consistent** [rev 2, I1: 0 and 1 no longer overlap] — 2: every line is said in substance in the answer, same
  numbers and names (rounding to the same value is the same number). 1: a line is true or plausible but the answer
  never states it (an unsupported extra: a name, a figure, a product the answer does not reach). 0: a line
  contradicts the answer, or states a number or name that is false on its own terms.

One `reason` of one short sentence per block per condition. The two conditions are graded by different agents, so a
grader of A never sees the answer and a grader of B cannot grade A from memory of it.

[rev 2, M4] The grader instruction (output schema, the blinding note, the marker rule, this rubric) is one frozen file
per condition, `SP\cue-grading\cue-grader-prompt.A.md` and `.B.md`; their sha256/12 are appended to this file as a
dated amendment before calibration, and no file graded under a different sha is read. [rev 3, RI2; rev 4, N6; rev 5,
R2] The instruction names the grader's two inputs (its blind file, this instruction file, both as absolute `C:\` paths)
and its one output (its verdicts file), names the tools by their names (Read for the inputs, Write for the output,
Bash for validation), and says: validate the output, if at all, with the Bash tool and the ONE command given below,
pasted as written with the two file names it already carries; any other tool (the PowerShell tool included), any
other shell command, any other file, voids the grader's file and discards its work. The command given is
`cd "<blind folder>" && node -e "<code>"` where `<code>` is the registered validation code: it `require('fs')`s,
reads the own verdicts file and the own blind file by their literal names with `'utf8'`, and prints the block count of
each and whether every blind id has exactly one verdict whose scores are integers 0 to 2 on the condition's axes; it
contains no `+`, no `$`, no template literal, no `\` and no string literal other than `'fs'`, `'utf8'` and the two
file names, so it satisfies §3.3 by construction and is the code of calibration case (a′). The instruction file's
copy of the command is the one graded under; the same bans are listed in the instruction verbatim (the §3.3 list),
so a grader that writes its own command knows what voids it.

## 3. Grading and calibration

- Files [rev 5, R6, R7: neutral names, enumerated]: per set and condition one blind file (IN-APP A, IN-APP B,
  TWINS-H r1/r2/r3 A and B, TWINS-L r1 A and B: 10 files of 42 to 44 blocks), named `SP\cue-grading\blind\cues.blind-N.json`,
  N = 1 … 10 (exactly these ten names); each grader writes `SP\cue-grading\blind\verdicts.blind-N.gX.json`, X = g1 |
  g2 [rev 3, RI2: named so the allow-rule can name it]. The assignment of N to (set, condition) is drawn by the seeded
  coin and written to `SP\cue-grading\keyhold\sets.json`, outside `blind\`; the name tells a grader nothing about the
  set (the condition it learns from its instruction file, §1). Keys anonymous and shuffled by a seeded coin; the key
  files `SP\cue-grading\keyhold\key.blind-N.json` [rev 4, N7: named] before any grader is dispatched, moved back after
  the last verdict file exists (the cue bench's method). The calibration files (§3 below) are `cues.cal-K.json` /
  `verdicts.cal-K.gX.json`, K = 1 … the count `cue-material.mjs` prints (recorded in the sha amendment), and the alias
  probe's fixture is `cues.probe.json` / `verdicts.probe.g1.json` (§3 "Grader sessions and memory"); all in the same
  blind folder. [rev 4, N2; rev 5, R7] `cue-material.mjs` also writes the dispatch manifest
  `SP\cue-grading\keyhold\manifest.json` (outside `blind\`, since it would otherwise sit beside the files the graders
  read; the checker takes its path as an argument): one entry per grader slot `blind-N.gX`, `cal-K.gX` and `probe.g1`
  with `blind`, `verdicts` and `instruction` as normalized absolute paths and no set name. The tool-use check reads a
  grader's own names from this manifest and from nothing else (never a string replace of the verdicts name: the blind
  name has no `.gX`); a slot missing from the manifest is VOID.
- **Grader sessions and memory [rev 5, the re-review's out-of-scope note; the sister registration's §1 Memory and §6.0,
  `AMENDMENT-A2.md` points 2 and 8, adopted].** The project memory index names this instrument's subject (h40d's
  cue FAIL, the cue-mode rulings, `project_cue_mode_next`, `project_h40d_flight`), so a grader that loads it grades
  with the verdict in view. Therefore every grader (probe, calibration, holdout, regrade) is a TOP-LEVEL
  `claude -p --model opus` session whose cwd is `SP\cue-grading\grading\` (= `C\grading\`), OUTSIDE the project tree,
  so neither the project `MEMORY.md` nor claude-mem's SessionStart context loads; never a subagent of the controlling
  session (which does load them). The dispatch command's full text (flags included; the tools it allows are Read,
  Write, Edit and Bash only) goes in the sha amendment; the prompt is the frozen instruction file plus the slot's three
  absolute paths. The session's transcript is `C:\Users\sotka\.claude\projects\<slug>\<session>.jsonl`, where the slug
  of an outside cwd is truncated with a hashed suffix (the sister's reads `…scratchpad-followup-7potx7`), so the tools
  locate it by the `session_id` of the `-p` JSON result across every slug folder (`session:<uuid>`), never by guessing
  the slug; paths handed to node are `C:/` form. Three checks per transcript: the model pin (`claude-opus-5-5`, read
  from the transcript by the sister's adapted reader `..\followup-turn\R\h40d-grader-models.mjs`, which takes
  `session:<uuid>`; sha recorded in the amendment; the `SP\validation-hour` copy, `b09b8b84a77335fa`, is unchanged and
  is not used, since it reads `subagents\` only), the memory check, and the tool-use check (§3.3). The memory check is
  `..\followup-turn\R\check-grader-memory.mjs` in its revised form, with `MEMORY.md` dropped from `PROJECT_MEMORY`
  (tonight's 22:19 probe read LOADED on `MEMORY.md` x4 alone, all four from the generic auto-memory instructions
  every session receives, while the project markers, 'Memory Index', the memory file names and the
  `-natively-cluely-ai-assistant/memory` path, read 0: `MEMORY.md` marks every session and decides nothing); its sha
  is recorded in the amendment, and a checker that still carries `MEMORY.md` is not run (it cannot read ABSENT).
  **Proven BEFORE the user's OK (§7 step 0b):** one throwaway alias probe launched exactly the intended way from
  `C\grading\` with the dispatch flags, whose prompt asks for one Read of `cues.probe.json` (two neutral strings, no cue
  content), one Write of `verdicts.probe.g1.json` and the §2 validation command, nothing else; its transcript located
  by session id; the pin reads `claude-opus-5-5` (a different alias → STOP); the memory check reads ABSENT on it and
  LOADED on the positive control `a9d35e8deacac3eff` (the s50l alias probe, which loaded the project memory; it read
  LOADED on 17 distinct project markers at 22:20, `MEMORY.md` aside) and ABSENT on the sister's removed-effect copies;
  the tool-use check reads ALLOWED on it (R2's first REAL positive control). On the day all three run on every grader
  transcript. **Consequence:** a transcript that reads LOADED (either marker group), or shows any `mcp__*` call, voids
  that file's reading (§5.1); its scores are reported beside; the file is re-graded ONCE by a fresh outside-cwd
  session; a second LOADED leaves the reading VOID, final, reported. **Departure:** if the outside session cannot be
  proven, or fails on the day, graders as subagents of the controlling session are a departure from this rule, taken
  only as the user's explicit choice, asked before any call, the verbatim answer and its time recorded here as a dated
  amendment whose first line is, from column 0, the marker word DEPARTURE-MEMORY-ACCEPTED followed by the date and
  time (the quoted, mid-sentence mention of that word in this paragraph is not such a line); under it project-memory
  LOADED is EXPECTED, is not a void and triggers no regrade, claude-mem markers and `mcp__*` calls keep their
  consequence, `cue-decide.mjs` accepts a LOADED slot only when this file holds a line that begins with that marker
  word (calibrated on a copy of this file with and without one, §3 decide bullet), and the first line of the result
  note reads `GRADERS LOADED
  PROJECT MEMORY (departure, amendment <date time>)`, with the exposure named: every grader then knows h40d's cues
  FAILED on thinking cost, a push toward harsher cue grades and so toward FIX. Tonight the departure is NOT needed:
  the CLI was re-logged at 22:19 and the outside-cwd session works (the sister's probe, `claude-opus-5-5`). **The
  controller's own memory:** no memory, `MEMORY.md` or agenda line about this grading's arms, bars, expectations or
  outcome is written until every verdict file exists (the 20 holdout verdicts, their regrades if any); the result
  note comes first.
- Two independent graders per file, `claude-opus-5-5`, pinned from each session's own transcript [rev 5: by the
  sister's adapted reader `..\followup-turn\R\h40d-grader-models.mjs` with `session:<uuid>` (exit 0; sha in the
  amendment; calibrated on the 22:19 probe reading `claude-opus-5-5`); the `SP\validation-hour` copy, sha256/16
  `b09b8b84a77335fa`, is unchanged and unused, since it finds `subagents\` transcripts only]. Fresh sessions per file.
- **Tool-use check [rev 2, I8; rev 3, RI2: an allow-list, not "any read or write"; rev 4, N2, N6, N7: the sister's
  ALLOWLIST shape, `followup-turn\AMENDMENT-A2.md` point 1 (22:21), with this material's names].** A separate script,
  `SP\cue-grading\cue-grader-tools.mjs`, reads each grader's transcript (the same files the pin script finds) and
  prints every `tool_use` name with its path or command; it never prints transcript text. It takes transcripts as
  `session:<uuid>` or `file:<path>` (top-level sessions, as the memory rule above), and the manifest path as an
  argument. The grader's own names (blind, verdicts, instruction) come from `manifest.json` (above); "blind folder" =
  `SP\cue-grading\blind\`. [rev 5, R2] Every path the script compares (a `file_path`, a `cd` target, the manifest's
  entries) is normalized first: `/c/…` (Git Bash), `C:/…` and `C:\…` to one form, drive letter and path compared
  case-insensitively, separators unified, no trailing separator. A grader's transcript is ALLOWED when EVERY tool call
  is one of:
  1. a Read whose `file_path`, normalized to an absolute path, equals exactly its own blind file or exactly its
     condition's frozen instruction file;
  2. a Write (or Edit) whose `file_path` normalizes to exactly its own verdicts file: writing its verdicts never
     voids, however many times;
  3. a Bash call of the exact shape `cd "<blind folder>" && node -e "<code>"` (the `cd` part optional; its target,
     normalized as above, must equal the blind folder) where `<code>` satisfies ALL of: its string-literal file-name
     tokens form a subset of {its own verdicts file name, its own blind file name}; no glob character `*` `?` `[`; no
     `$`, no backtick, no template literal, no `+` adjacent to a string literal, no `path.join` / `path.resolve` /
     `readdir*` with any non-literal argument; no `require(` / `import(` of anything but `'fs'`, `'node:fs'`,
     `'path'`, `'node:path'`; no `process.env`; no `http`, `https`, `net`, `child_process`, `fetch`, `curl`, `wget`;
     no `..`, no `~`, no absolute path. Any number of such calls is allowed (the expected use is one self-validation
     of its own verdicts file, the §2 command). [rev 5, R5] **A string-literal file-name token** is any single- or
     double-quoted string literal in `<code>` that contains `.`, `/` or `:`, or a `\` that is not one of the escapes
     `\n`, `\t`, `\r`, `\\`, `\'`, `\"`, other than the four module specifiers named above. So `'.'`, `'..'`, `'./x'`
     and `'a.json'` are tokens and `'utf8'`, `'id'`, `'\n'` are not; `readdirSync('.')` and `['cues','blind-2',
     'json'].join('.')` are VOID because `'.'` is a token outside the allowed set (this is why the definition counts a
     bare `'.'`). Computed names (`String.fromCharCode`, a base64 `Buffer`) remain the disclosed parse-only residual
     (§6).
  Anything else voids that file's reading (§5.1): any other tool (Glob, Grep, Agent, WebFetch, WebSearch, the
  PowerShell tool, ...), any `mcp__*` call, any Read, Write, Edit or Bash outside 1–3; one failing call voids whatever
  the other calls are. The file-name tokens rule is what keeps the answer-bearing files of this material
  (`interview60.judge*`, `interview60.answers*`, `natively_debug*`, `interview60.runs*`), the key files and every
  other grader's files out of a Bash call: they are not in the allowed set, so no denylist is needed. The script's
  verdict per grader is ALLOWED or VOID with the offending call's name and path, exit 0 only when every grader is
  ALLOWED; it also records each allowed Bash command's length and sha256/12 for a human spot-read. [rule 8] It is
  calibrated before any holdout transcript is read, on fixture transcripts written under THIS run's exact names in
  the real blind folder (a Thursday cue-bench transcript is NOT used: its names `pairs.rN.hN.json` /
  `verdicts.rN.hN.gN.json` are not this run's), expectations written first [rev 5, R6: the names are the enumerated
  ones; `blind-1` is whichever (set, condition) `sets.json` gave it, which the fixture does not need to know]:
  (a′) grader `g1` of `cues.blind-1.json`: a Read of `cues.blind-1.json`, a Read of its instruction file, a Write of
  `verdicts.blind-1.g1.json`, and one `cd "<blind folder>" && node -e "<code>"` whose code is the §2 validation command's
  code with these two names → ALLOWED; [rev 5, R2] the same with the `cd` target in `/c/Users/…` form → ALLOWED; the
  same in `C:/Users/…` form → ALLOWED; the same with the Read `file_path` in `C:/` form → ALLOWED;
  (b) the same plus a Read of a `keyhold\` path → VOID naming it;
  (c) the same as (a′) but the Bash code also names `key.blind-1.json` → VOID;
  (d) the same as (a′) plus a Read of `cues.blind-2.json` (another file, possibly the other condition's, which carries
  the spoken answer) → VOID; and a variant with a Read of `verdicts.blind-1.g2.json` → VOID (a prefix or `includes`
  match would let these through);
  (e) the same as (a′) but the Bash code names `verdicts.blind-1.g1.json` AND `verdicts.blind-1.g2.json` → VOID;
  (f) the same as (a′) but the Bash code names `verdicts.blind-1.g1.json` AND `interview60.judge.pairs.json` → VOID;
  plus a `+` concatenation (`'cues.' + 'blind-2.json'`), a `readdirSync('.')` variant and [rev 5, R5] a
  `['cues','blind-2','json'].join('.')` variant → VOID each; and a PowerShell-tool call of the validation command →
  VOID (any other tool).
  [rev 5, R2] **Real positive controls, after the fixtures and before any holdout file is dispatched, expectation
  ALLOWED written here first:** (g) the alias probe's transcript (one Read, one Write, one validation Bash by a real
  Opus session under the dispatch flags); (h) every §3 calibration grader's transcript (real transcripts under the
  frozen instruction, the condition's own file). A VOID on (g) or (h) whose call is a benign validation (a Bash of
  the registered shape that trips a syntax ban, a path in a form the normalizer missed, a PowerShell call) is repaired
  by instruction wording or by the normalizer, as a dated amendment, and the probe or that calibration file re-run;
  the rule itself (the allowed set, the bans) is never loosened. A VOID that reads a forbidden file is a VOID.
  The results, one line per case with its expectation, go in the amendment that records the script's sha.
- **Reductions [rev 2, C1: computable as written].** For a block b, condition A has graders g1, g2 and condition B
  graders h1, h2. For each axis x: `min(x)` = the lower of its two graders' scores; `cons0(x)` = both give 0;
  `any0(x)` = either gives 0. Then
  - GOOD(b) = min(correct) = 2 ∧ min(covers) >= 1 ∧ min(specific) >= 1 ∧ min(glance) >= 1 ∧ (min(consistent) >= 1, or
    "no answer" for r1's R09, which is counted on A alone and named);
  - HARMFUL(b) (consensus) = cons0(correct) ∨ cons0(glance) ∨ cons0(consistent); split [rev 2, M6] into
    content-harmful (correct or consistent) and display-harmful (glance), both reported, both in the gate;
  - EITHER-HARMFUL(b) = any0(correct) ∨ any0(glance) ∨ any0(consistent);
  - CUE-INTRODUCED(b) = (cons0(correct) ∨ cons0(consistent)) ∧ the block's spoken answer scored correctness 2 by the
    frozen grader (`interview60.judge.json` in-app; `interview60.judge.gemini-3.5-flash-lite_captured-high{,-r2,-r3}.json`
    twins); `cons0(consistent)` in the rubric's full sense, contradiction or false on its own terms [rev 3, m9];
    inherited, partly-correct and r1 R09 classes as §1;
  - AGREEMENT [rev 2, I2; rev 3, m4: per FILE] = for one blind file, the share of its gating blocks (cue-attributable
    HARD, §1) on which the file's two graders make the same harmful call on that condition's axes (A: correct 0 or
    glance 0; B: consistent 0).
  All other quantities are **per set** [rev 2, M9]: IN-APP, TWINS-H (r1–r3 pooled, per-rep counts reported), TWINS-L.
- **Calibration first, on non-holdout blocks [rev 2, I6, M8, M10; rev 3, RI1].** Pool: the Thursday cue bench's
  scenario50 blocks (WT `interview60.answers.gemini-3.5-flash-lite_cues-r{1,2,3}.json`, 39 ids, 116 blocks), capped
  with `trimCues` from the pinned snapshot as §1, r1's empty `MALFORMED_RESPONSE` block excluded; 12 genuine blocks
  picked by seeded coin, plus one genuine one-line block from the simple-question probe's saved replies
  (`SP\cue-group`, scenario50 S1 swapped questions, non-holdout), planted if none exists. Plants: 11 classes, each
  planted twice from two different sources (22 mutants), each paired with its unmutated source in the same blind
  file, the expected score stated for the target axis and condition only (non-target axes are not checked). Each
  target check has a direction:
  - **harm checks (pass at or below the target)**, 20 on 18 mutants: swapped block from another item (covers 0, A);
    a number changed against the answer (consistent 0, B); a line negated against the answer (correct 0, A; AND
    consistent 0, B: two checks per mutant); a raw LaTeX line (glance 0, A); a question line (glance 0, A); three
    generic labels (specific 0, A); a line addressing the listener (glance 0, A); a named part dropped (covers <= 1,
    A); an R33-class plausible wrong DIRECTION or MECHANISM (a "Yes" where the answer is no, the wrong metric, or a
    mechanism mischaracterised WITHOUT a named product or service in the mutated line, so that its falsity depends on
    the question and never on a name [rev 5, R9]: the rubric's own `correct` 0 examples) written into both the block
    and a copy of the answer, NEVER a wrong number or name [rev 4, N1] (correct 0, A);
  - **boundary checks (pass only in the stated band)**, 6 on 6 mutants: the R33-class plant in condition B
    (consistent >= 1: the block agrees with its answer, and because the plant is a direction, not a number or a name,
    and names no product [rev 5, R9], the rubric's own-terms 0 clause cannot apply; a 0 is the harsh grader's call); a
    line cut to a trailing
    conjunction (glance EXACTLY 1, A: 0 is harsh, 2 is blind to the cut); a true extra name the answer never states
    (consistent EXACTLY 1, B: 0 is harsh, 2 misses the unsupported extra).
  So 26 target checks on 22 mutants; the R33-class mutants carry one harm check (A) and one boundary check (B) each.
  Pass, all three: (i) sensitivity and boundary: 26 of 26 target checks met by BOTH graders of the condition (harm
  checks at or below; boundary checks in band); (ii) the paired source scores >= 1 on the target axis from both
  graders; (iii) specificity: consensus-harmful <= 1 of the 13 genuine blocks, and agreement >= 80% on them. A miss =
  the instruction wording (never the rubric's scales) is fixed as a dated amendment and the calibration re-run with
  fresh agents; no holdout file is dispatched before a pass. The genuine blocks' scores are reported as the
  instrument's base rate.
- `cue-decide.mjs` (to be written) reads the verdict files and applies §3–§5; it refuses a key-count mismatch, a
  score outside 0 to 2, a missing file, a sha mismatch (instruction files, snapshot). [rev 2, M12] It is calibrated on
  hand-made verdict sets with known outcomes before it reads a real file: one per verdict (VOID, FIX, SAFE, REPORTED),
  one refusal, the boundaries (GOOD exactly at 75% and 65%; consensus-harmful exactly at 7% and 11%; cue-introduced
  exactly at 4% and 7%; either-harmful exactly at 16%; agreement exactly at 80% on one file), one set where the A and
  B graders disagree so that a wrong pairing would change the verdict, and [rev 3, m4, m5] one set whose floor fails
  (29 in-app blocks) to show the final VOID, and one whose agreement fails twice on one file; [rev 5] one slot whose
  memory check reads LOADED, decided against a copy of this file in TMP without a departure line → VOID, and against
  a copy with one line beginning with the marker word → accepted (the real file, which only mentions the word
  mid-sentence, must read as the first copy). It reads each slot's pin, memory and tool-use lines from the three checkers' stdout files
  (kept beside the verdicts as `graders.models.out.txt`, `graders.memory.out.txt`, `graders.tools.out.txt`) and
  refuses when a slot of `manifest.json` has no line in any of them.
- Scripts print ids, scores, counts and axis names only: never a prompt, never the profile, never a key.

## 4. What is counted and reported

Per set, HARD cue-attributable blocks (EASY and excluded blocks beside, never gating): GOOD rate; consensus-harmful
count and rate (content / display); either-harmful; cue-introduced; inherited; on a partly-correct answer; r1 R09;
per-axis means per grader; agreement per file; glance-0 lines that still carry notation after `trimCues`; `specific`
= 2 on line 1 (the "one-first" intent); lines the cap cut; the base-rate and roster-level cuts.

**Expectation, recorded before the data (per-item guesses do not bind the graders):** IN-APP GOOD (min of graders)
80 to 90%, consensus-harmful 1 to 5% (R33 is excluded as inherited; R12's cut line expected glance 1), either-harmful
5 to 12%, cue-introduced 0 to 3%; TWINS-H pooled the same; TWINS-L lower on `specific`.

## 5. Verdicts (pre-registered; precedence top to bottom) [rev 2, I5: rates on the cue-attributable denominator; the twins pooled; bounds sized by simulation]

1. **VOID** [rev 2, I8: one reading; rev 3, m4, m5, RI2; rev 5: memory]. A set's reading is void when: its calibration
   never passed; a grader's pin is not met or its transcript is VOID under the §3 tool-use allow-list; a grader's
   transcript reads LOADED under the §3 memory check or shows an `mcp__*` call (outside an accepted departure, §3);
   agreement on any one of its files is under 80% (computed over that file's gating blocks); the decide script
   refuses its files; it has fewer than 30 (IN-APP) or 90 (TWINS-H pooled) cue-attributable HARD blocks.
   - Repair: a pin or tool-use void is repaired by regrading that file with fresh agents at most TWICE [rev 4, N5:
     rev 3 said "until ... exists"]; if the third transcript is still unpinned or VOID, the reading is VOID, final,
     reported; a memory void [rev 5] and an agreement void are each repaired by regrading that file with fresh agents
     ONCE (the memory regrade by a fresh outside-cwd session; a second LOADED is final). The two-regrade budget is
     per file across pin and tool-use voids together, not per cause. Every regrade replaces the file whatever its
     scores, and every voided file's scores are reported beside it. A second agreement miss on the same file leaves
     the reading VOID, reported, not regraded again (no selection of the calmer draw).
   - A floor void (< 30 / < 90) is final for that reading: it counts classified blocks, which no regrade changes.
   - Disclosed: at the expected rates the agreement gate cannot fire before SAFE's either-harmful bar does (< 80%
     needs single-grader harmful disagreement on > 20% of a file's blocks); it is a backstop against one errant
     grader, not the main bound.
   - A void TWINS-L reading voids only the TWINS-L report. No verdict in 2–4 is read while a gating set is void.
2. **CUES NEED A FIX**: IN-APP or TWINS-H has GOOD < 65%, or consensus-harmful >= 11%, or cue-introduced >= 7% of its
   cue-attributable HARD blocks. Consequence: the cue rule changes before any flag-on measurement; the change is
   developed and benched on scenario50 captured prompts (the cue bench's rule: band overlap, no wrong rise, plus this
   instrument on its blocks), and validated on a fresh holdout hour under a new pre-registration.
3. **CUES SAFE TO BRING BACK ON HARD QUESTIONS**: IN-APP and TWINS-H both have GOOD >= 75%, consensus-harmful <= 7%,
   either-harmful <= 16%, and cue-introduced <= 4%. Consequence: the content question is closed for this rule; the
   flag stays off (the 20:00 Fri ruling); the next step is what that ruling named, a fresh pre-registered measurement
   with the flag on, whose own rule must also carry (a) the +161 against +55 thinking question and (b) cue grading on
   its hour by this instrument. The hard-only gating in the app is a design question for that measurement's spec.
4. **REPORTED ONLY**: anything between 2 and 3. The cues are neither cleared nor failed; the flag stays off; the user
   decides whether a non-holdout bench of this instrument (more draws) is worth the quota before the flag-on hour.

At the expected sizes (36 in-app, 110 pooled [rev 3, m1]) the rates read as counts: SAFE needs consensus-harmful
<= 2 / <= 7, either-harmful <= 5 / <= 17, cue-introduced <= 1 / <= 4; FIX fires at consensus-harmful >= 4 / >= 13 or
cue-introduced >= 3 / >= 8. TWINS-L never gates.

**Operating characteristics [rev 2, I5; rev 3, m1, m2]** (`oc-sim.mjs` as revised 22:1x, 20,000 draws, sizes
(36, 110), independent per-block binomials; GOOD drawn only among blocks that are not either-harmful, each scenario
specified by its marginal GOOD rate so GOOD + either-harmful <= 1; the same item recurring across reps ignored, so the
pooled set is somewhat less informative than modelled: the re-review bounded that at +1.2 points of FIX on the low
edge):

| Truth | SAFE | FIX | REPORTED |
|---|---|---|---|
| expectation centre (GOOD 85%, cons.-harmful 3%, either +5 pts, 30% of harmful cue-introduced) | 82.7% | 2.7% | 14.6% |
| expectation low edge (GOOD 80%, harmful 5%, either +7) | 42.9% | 12.1% | 45.0% |
| expectation high edge (GOOD 90%, harmful 1%) | 98.7% | 0.1% | 1.2% |
| bad rule (GOOD 65%, harmful 12%, half cue-introduced) | 0.0% | 93.3% | 6.7% |
| mediocre rule (GOOD 75%, harmful 7%) | 11.0% | 33.6% | 55.4% |
| noisy graders on a good rule (GOOD 80%, either-harmful +15 pts) | 12.0% | 4.0% | 84.0% |

So a true expectation reads FIX in about 3% of draws at the centre and 12% at its low edge; a bad rule reads FIX 93%;
noisy graders read REPORTED, not SAFE (the either-harmful bound). [rev 3, m3] The low edge's 12.1% is above the 10%
the first review suggested; it is accepted as the price of FIX 93% on a bad rule, and stated. Four rules were tried
in the script, all at the centre: `draft` SAFE 41.3%, `v2` 71.4%, `v3` 82.7% (registered above), `v4` 84.6%. `v4`
(either-harmful <= 18%, cue-introduced <= 5%; FIX at harmful >= 12%, cue-introduced >= 8%) reads FIX only 0.8% at the
centre and 5.6% at the low edge, but a bad rule reads FIX 89.3% (v3 93.3%) and noisy graders read SAFE 27.9% (v3
12.0%): it buys fewer false FIXes with more false SAFEs, and the asymmetry this file wants is the other way (a false
FIX costs a bench; a false SAFE ships a wrong cue rule into the flag-on hour). `v3` is kept. The revised script's
sha256/12 is recorded in the dated amendment that records the instruction files' shas.

## 6. What this does not show

- Whether cues help the candidate speak better or sooner (deliberately unmeasured, as since 2026-09-20).
- Anything about speed: 2c's FAIL and the +161 against +55 question stand untouched.
- Cue quality beyond one hour's draws: ~35 hard cue-attributable items in-app, three twin reps of the same items; a
  rate moves by about +/- 7 points on 36, and two graders bound but do not remove grader variance (agreement gated at
  80% per file, reported in full).
- Cues on scenario50 (calibration material only) or on simple questions (the EASY set is 3 to 7 items, reported).
- The overlay itself, typed chat; the bare arms' cues; TWINS-L r2/r3.
- Whether the router's §1 class, applied by two classifiers to scripted text, is the class a live router would pass;
  §1 itself is uncalibrated (router40 §6.4 has not run) [rev 3, m7].
- The pipeline-excluded items' cues (reported, not gated): what a cue does on a lost parent is a pipeline question.
- [rev 3, RI3] Whether the snapshot's `trimCues` equals the app's at the hour is proven only by the sha match
  (expected) or by byte-identical output on the material blocks (the fallback); a block outside the material is not
  covered by the fallback. [rev 4; rev 5] The build has not been run: the sha prediction is unproven until step 0's
  second half, as is esbuild's handling of the 252 outputs past 259 characters; the junction removal, the two delete
  methods and the `cmd /c` pipe were each exercised ONCE by the re-review, in scratch, on one PowerShell build
  (5.1.26100), never on the export itself.
- [rev 4, N7, as A2's residual] The tool-use audit detects, it does not prevent: a grader runs with the controller's
  permissions, so a forbidden read is caught only afterwards, and its consequence is §5.1's (VOID, at most two
  regrades). The allowlist's syntax bans are a parse of the command text, not an execution trace.
- [rev 5] The memory check is a marker search with counts, not proof of what reached the grader: it shows the
  project memory index and claude-mem's context did not load, nothing about the user's global `~/.claude\CLAUDE.md`
  (which every session loads; it carries engineering rules, no cue content) or the model's own prior knowledge. Only
  one probe (a one-turn, no-tool session) has run outside the cwd tonight, the sister's; this registration's
  tool-exercising probe has not. Whether real Opus graders under the new instruction keep to the Bash tool and the
  given command is what (g) and (h) measure; it is unknown until they run.

## 7. Order of work (documents and scripts; the grader and classifier agents are the only model calls)

0. [rev 3, RI3] The display instrument: the reference copy of MAIN's live dist filter (sha check) [rev 4, N4: DONE
   22:22:21], then the `2b0906f` snapshot built by the §1 recipe, steps (0)–(8) with `build.log`, into
   `SP\dist-snapshots\main-h40d-2b0906f\` with its `SNAPSHOT.txt`; the full sha256 written into the §1 pin table (and
   the equivalence counts, if the sha differs). All before the user's OK.
0b. [rev 5] The grader session proven (§3 "Grader sessions and memory"), before the user's OK: `C\grading\` created;
   the revised `check-grader-memory.mjs` (no `MEMORY.md` marker) reading LOADED on `a9d35e8deacac3eff` and ABSENT on
   the removed-effect copies; the alias probe from `C\grading\` under the dispatch flags (its fixture `cues.probe.json`
   written by hand, two neutral strings), its transcript found by session id, pin `claude-opus-5-5`, memory ABSENT,
   tool-use ALLOWED (case (g)); the dispatch command, the checker's and the reader's shas and the probe's session id
   into the sha amendment. The probe's fixture and verdict files are deleted after the check. (Order: the probe needs
   `cue-grader-tools.mjs` from step 3's fixtures; so steps 1 and 3's fixture calibration run first, the probe then,
   and the real calibration graders after the probe reads ALLOWED.)
1. `cue-material.mjs`: join, `trimCues` from the snapshot (sha check; reference sha check), blind (`cues.blind-1…10`,
   `cues.cal-K`), keyhold (`key.blind-N.json`, `sets.json`, `manifest.json`); prints counts matching §1 (44 / 44 / 44 /
   44 / 42) and the calibration file count, or refuses. The frozen instruction files (with the §2 validation command)
   and their sha amendment (§2); the revised `oc-sim.mjs` sha in the same amendment.
2. The hard classification (`hard-classifier-dispatch.txt` with its sha amendment, 2 agents + 2 base-rate agents),
   recorded before step 4.
3. `cue-grader-tools.mjs` calibrated on the fixtures (a′ and its three path-form variants, b, c, d, e, f) and its sha
   recorded; then step 0b's probe (g); then calibration grading (§3) until it passes, each calibration grader's
   transcript through the pin, memory and tool-use checks with ALLOWED expected (h); amendments to this file dated.
4. The 10 holdout files, 20 graders as outside-cwd sessions; the pin, memory and tool-use checks on every transcript;
   `cue-decide.mjs`.
5. Result note `SP\cue-grading\2026-10-0_-cue-grading-result.md`, then copied to MAIN `passes/` with this file under
   the pass-records rule (ids, counts, axes; no prompt text), committed with nothing else.

## 8. Change log, revision 2 (every item of `PREREG-REVIEW.md`; nothing graded before or after)

- C1: §3 reductions (`min`, `cons0`, `any0`) define GOOD, HARMFUL, EITHER-HARMFUL, CUE-INTRODUCED, AGREEMENT per set.
- I1: `consistent` 1 = unsupported extra (true or plausible), 0 = contradiction or false on its own terms; rounding
  is the same number; cue-introduced reads consensus 0 on `consistent` in that full sense [rev 3, m9: this line said
  "by contradiction"; §3 governs].
- I2: agreement < 80% per condition = VOID (regrade); SAFE also bounds either-harmful (<= 16%).
- I3: twin and calibration blocks pass through `trimCues` (cap + `cleanNotation`), sha recorded [rev 3, RI3: from the
  pinned snapshot, no longer MAIN's dist].
- I4: inherited (answer correctness 0) and pipeline items (R11F, R02F, R07F, R31) excluded from the gate, reported;
  the denominator is stated; partly-correct answers are a reported class (M3).
- I5: rates instead of per-file counts, TWINS-H pooled, bounds sized by `oc-sim.mjs`; the table and the rejected rules
  are in §5; the expectation no longer straddles the bars (at the centre FIX 2.6%, SAFE 83%) [rev 3: 2.7% / 82.7% at
  the corrected sizes].
- I6: calibration pairs each plant with its source, plants 11 classes x 2 (R33-class, trailing-conjunction and
  true-extra-name added), gates specificity (consensus-harmful <= 1 of 13 genuine, agreement >= 80%).
- I7: the gating HARD class is router40 §1 verbatim (follow-ups HARD by rule); the base-rate split is reported
  beside; the HARD expectation and the VOID bars are restated under it.
- I8: VOID is per set reading, repaired by a fresh regrade that replaces the file whatever its scores; a TWINS-L miss
  voids only its report; "reachable" replaced by the transcript tool-use check.
- M1 join of record = the pairs' `dispatchedAt`; M2 EASY only when both say EASY, R05 not classified; M3 third class;
  M4 frozen instruction files with sha amendment; M5 unasked part = covers 1; M6 content/display split and the "you"
  note; M7 marker note for B graders; M8 pool capped, empty block excluded, a one-line genuine block included;
  M9 per set; M10 target axis only; M11 disclosed in §1; M12 decide-script calibration sets enumerated. None declined.
- The review's seven answers are taken as read; the one it flagged as sound-with-disclosure (holdout rule) is
  disclosed in §1.
