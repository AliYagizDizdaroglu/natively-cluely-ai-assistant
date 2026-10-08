# Pre-registration: grading the cues themselves (h40d's cue blocks + flight eq's cue blocks, Opus graders, no Gemini calls)

**Revision 6, written 2026-10-05, begun 16:59 TST (UTC+3) by `date` (`Mon Oct  5 16:59:20 TST 2026`), by an Opus
author, as a NEW file beside revision 5 (`PREREGISTER-cue-grading.md`, sha256 `a5e8fbf4…880df4` as read, unedited).
It follows the Opus re-check `PREREG-REREVIEW-5.md` (APPROVE WITH FIXES: Critical 0, Important S1–S2, Minor S3–S8,
nits N1–N7) and adds the user's directive for tonight's flight (`flight-eq`, 2026-10-05, scenario50 S1+S2, cues ON as
shipped): "grade everything next flight", including whether the cues are correct (memory
`feedback_grade_feature_output`). No cue block, cue line, answer text or captured prompt has been read by the author;
no classification, calibration, build or grading has run; no model was called. Revision 6 is the registration from
its hash on; revision 5 is kept as the record. Grading of ANY set starts only after revision 6 passes its separate
Opus re-check and is hashed (§7 "When grading may start").** Text below the §0.6 table is revision 5's, kept where it
was right; every rev 6 change is marked `[rev 6: …]` in place.

## Revision 6 resolution table (every item of `PREREG-REREVIEW-5.md`; then the flight set)

| item | resolution | where |
|---|---|---|
| **S1** (Important) step 1's count always stops; `wc` absent | ADOPTED: files counted by `node … readdirSync({recursive:true,withFileTypes:true})`; the tree by `(git ls-tree -r --name-only <commit> \| Measure-Object -Line).Lines`; gitlinks by `(git ls-tree -r <commit> \| Select-String '^160000').Count`; expected = tree − gitlinks (2b0906f: 911 − 2 = 909) | §1 recipe step 1 |
| **S2** (Important) one shared grader cwd; carry-over unprobed | ADOPTED, all three parts: a fresh cwd per attempt `C\grading\<slot>-a<k>\` (refused if it exists); before launch that cwd's projects folder holds no `.jsonl` and no non-empty `memory\`; after, its `memory\` empty or absent, else that slot VOID (memory class); step 0b runs TWO tool-exercising probes in sequence, the second must read ABSENT. The sister launcher `F\R\launch-grader.mjs` (sha256/16 `2f096c38016161ed`) already implements all three and is adapted, not rewritten. A memory LOADED on a calibration transcript (h) now has a remedy: re-run that calibration file once | §3 sessions, §5.1, §7 0b |
| **S3** Bash rule admits run-time names | RULED OTHERWISE, stricter than both options: **graders get no Bash at all** (tools Read, Write, Edit; `--permission-mode dontAsk`, `--strict-mcp-config`, no `--add-dir`, the flight's grader recipe and the launching agent's instruction). Any Bash call voids. The validation command, its code and the syntax-ban parse are removed; the controller validates each verdicts file by script (format void → regrade). Reason: no ban list can close run-time names; removing the tool closes it by construction, and the sister's graders already run this way | §2, §3.3, §6 |
| **S4** regrade budgets conflict | ADOPTED: classes {pin + tool-use incl. `mcp__` + format: 2}, {memory: 1} per SLOT, {agreement: 1} per blind FILE, counted independently; a slot's reading is final VOID when a class budget is spent and its next transcript fails that class; a decide calibration set crosses memory → tool-use → tool-use | §5.1, §3 decide |
| **S5** departure scope and timing | ADOPTED: under a departure only PROJECT-memory LOADED is accepted (claude-mem LOADED still voids; a calibration slot proves it); the departure line's date-time must precede the earliest `startedAt` of any slot it accepts (`cue-decide.mjs` checks) | §3 sessions, §5.1, §3 decide |
| **S6** "no line in any of them" | ADOPTED: "has no line in any ONE of them" | §3 decide |
| **S7** 17 vs 16 | ADOPTED: the positive control reads LOADED on 32 hits in 16 distinct project markers under the revised checker (sha256/16 `119ea78a433ba47d`, 17 markers, `MEMORY.md` absent: re-read 2026-10-05 17:0x) | §3 sessions |
| **S8** §2 code description omits bans | CLOSED BY REMOVAL (S3): no validation code exists any more | §2 |
| N1 dead marker | NOTED, not changed (the checker is the sister's; a dead marker cannot read LOADED falsely) | §6 |
| N2 broken code span | ADOPTED: the result-note line is stated on one line | §3 sessions |
| N3 empty before-list | ADOPTED: `nm-before.txt`'s count recorded and must be > 0 | §1 recipe steps 0, 6 |
| N4 `force:true` silent | ADOPTED: step 8 adds `Test-Path "<X>"` = False | §1 recipe step 8 |
| N5 normalizer edit | ADOPTED: any edit to `cue-grader-tools.mjs` re-runs fixtures (a′)–(f), new sha recorded | §3.3 |
| N6 `\\` token | CLOSED BY REMOVAL (no Bash code is parsed) | — |
| N7 probe instruction | ADOPTED: probe slots carry `instruction: null`; allowlist rule 1 then admits only the own blind file | §3 files |
| **Flight set** (the directive) | ADDED as its OWN registered set **FLT**, NOT pooled with h40d's: different roster (scenario50, the roster the cue rule was benched on; tuned, not holdout), different tree and filter (three filter commits after `2b0906f`), a different answer-grader run, and an item overlap with this file's calibration pool (39 of the flight's 40 ids are the cue bench's). Own input contract, display pin, classification, exclusions, counts, bars and verdict; graded by the same frozen instruction files and the same calibration | §1F, §4, §5F, §7 F1–F6, §9 |
| Premise fact | CORRECTED (not a rule change): no cue flag exists in MAIN (the 2026-10-02 OFF ruling was parked unbuilt; MAIN ships cues ON, flight-eq §1/§11); "the flag stays off" in §5 reads as stated there | §5 |

### 0.6 Revision 6 facts recorded (not findings; read 2026-10-05 16:59–17:13 TST by the author, finished 17:13:52 by `date`; ids, names, counts and hashes only)

- MAIN branch `fix/coding-style-suffix-all-gemini` HEAD `89c8f53` (2026-10-04 15:18). Filter history at it:
  `d83fdfe` → `801442d` (10-03 18:57) → `c699638` (10-03 22:14) → `800d6a5` (10-03 22:33, "a spoken answer that opens
  with `{` is stripped of notation"). `git ls-tree -r` at `89c8f53`: 1110 entries, 2 gitlinks. MAIN's working copy
  `electron/IntelligenceEngine.ts:419–421`: `trimCues(raw, CUE_MAX_LINES, CUE_MAX_WORDS)`, then a `[Answer] cues
  trimmed: {…}` line (dropped/cut/cleaned TEXT) when anything changed, then `[Answer] cues: <JSON of t.cues>`.
  The flight's registered HEAD will be `89c8f53` + LANDED + the focused-off commit + the `passes/` commit
  (flight-eq A2.8); not known at writing.
- The calibration pool (WT `interview60.answers.gemini-3.5-flash-lite_cues-r1.json`) holds 39 ids: 19 `S1*`, 20 `S2*`,
  0 other — the flight's roster (counted by id prefix only).
- h40d's run folder names (listed, not opened): `interview60.judge.pairs.json`, `interview60.judge.json`,
  `interview60.answers.gemini-3.5-flash-lite_captured-high{,-r2,-r3}.json`, `…3.1-flash-lite_captured-low{,-r2,-r3}.json`,
  `interview60.judge.gemini-3.{5,1}-flash-lite_captured-{high,low}{,-r2,-r3}.json`, `interview60.judge.pairs.<model>_<tag>.json`.
  The flight's files follow the same harness, so the same patterns are the contract (§1F); a missing file refuses.
- Sister tools (`L\followup-turn\R\`, sha256/16): `launch-grader.mjs` `2f096c38016161ed` (per-attempt fresh cwd
  `<slot>-a<k>`, slug pre-check, `--permission-mode dontAsk --tools Read,Write,Edit --strict-mcp-config`, no `--add-dir`,
  allowed-tools rules for the own files, two probes, max 2 at once; it passes `--model opus`); `audit-graders.mjs`
  `07833cf41bcc1c6e`; `check-grader-memory.mjs` `119ea78a433ba47d` (`PROJECT_MEMORY` 17 entries, `MEMORY.md` not among
  them); `h40d-grader-models.mjs` `3626e263f3fac5ba` (the re-check read `8fd717fb71f90ba5` on 10-03: it changed since;
  the amendment records the sha used on the day, re-calibrated on the 22:19 probe); `legs-decide.mjs` `e00a46c0b1cd9dc2`.
- `oc-sim.mjs` unchanged (`b467d8c1fc6c63d7`). A throwaway copy with only the sizes block replaced
  (scratchpad `oc-flight.mjs`, sha256/16 `2b30bf7813dffa09`) gave §5F's table; same seed, same scenarios, rule `v3`.
- flight-eq as read: registration `9ca3149b…2d14f44`, A1 `3e3f0ddd…1d863c8`, A2 (16:53) and `USER-RULING-4c.txt`
  (16:58); b10 (registration §7) is the export this file consumes; A2.5 makes b10 a post-hour instrument
  (sha + calibration + Opus review before its first run on the run folder).

---

*Revision 5's header, kept:* Written 2026-10-03 18:4x local (Fable), before any cue block has been graded. **Revision 5, begun 22:40 local, after
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
   harmless, a deletion is the hazard]. [rev 6, N3] The list's line count is written beside it and must be > 0 (966 at
   the last read); 0 or a listing error stops here (an empty list would pass step 6 vacuously).
1. Export, no checkout: `mkdir "<X>"`, then from the controller's OWN checkout (any worktree of the repo; the objects
   are shared), under `cmd` because PowerShell 5.1 re-encodes a native pipe as text [rev 5, R1: measured by the
   re-review: the PowerShell pipe fails with `Unrecognized archive format`, exit 1; the `cmd /c` form exits 0 and the
   extracted file is byte-identical to `git show`]:
   `cmd /c "git archive --format=tar 2b0906f | tar -x -C ""<X>"""` (`tar` = `C:\Windows\system32\tar.exe`, bsdtar,
   which extracted a 326-character path in the re-review's trial). Fallback if the quoting fails: `git archive
   --format=tar -o "<SP>\2b0906f.tar" 2b0906f`, then `tar -xf "<SP>\2b0906f.tar" -C "<X>"`, the tar file deleted
   after step 1; which form ran goes in `build.log`. Then [rev 6, S1: `Get-ChildItem -Recurse` skips everything below a
   directory past 259 characters (re-check: 1 of 3 on a scratch tree) and `wc` does not exist in PowerShell 5.1] record
   three numbers: the extracted file count by
   `node -e "console.log(require('fs').readdirSync('<X in C:/ form>',{recursive:true,withFileTypes:true}).filter(d=>d.isFile()).length)"`
   (the re-check read 3 of 3 on the same scratch tree, node v22.19.0); the tree count by
   `(git ls-tree -r --name-only 2b0906f | Measure-Object -Line).Lines` (= 911, read again by the rev 6 author in
   PowerShell 5.1.26100.9444); and the gitlink count by `(git ls-tree -r 2b0906f | Select-String '^160000').Count`
   (= 2; symlinks `'^120000'` = 0). Expected files = tree − gitlinks = 909 (the two gitlinks come out as empty
   folders); a different count stops. `git archive` writes no git state at all.
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
   lines into `build.log`, plus [rev 6, N4] `Test-Path "<X>"` = `False` (`force:true` would hide a wrong path). A miss
   here is reported to the user at once, before anything else is done.

[rev 6] **The recipe is parameterized by commit.** The flight set's display pin (§1F) is built by the same steps (0)–(8)
with `2b0906f` replaced by the flight's registered HEAD `<H>` (flight-eq §11), `<X>` = `<SP>\build-<H7>`, the snapshot
folder `SP\dist-snapshots\main-eq-<H7>\`, and the expected file count = step 1's tree count at `<H>` minus its gitlink
count (at `89c8f53`: 1110 − 2 = 1108; the LANDED commits add files, so the number on the day is computed, not this one).
`<SP>` keeps revision 5's meaning (the path lengths of step 4 were measured under it); `main-eq-<H7>` (15 characters)
is 2 shorter than `main-h40d-2b0906f` (17), so the `.js.map` destination stays under 259; any longer path is copied
with `fs.copyFileSync`.

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

## 1F. The flight set FLT [rev 6] (flight eq, 2026-10-05 evening, scenario50 S1+S2, cues ON as shipped)

**Why its own set, not pooled with §1's.** (1) Roster: scenario50 is the roster the shipped cue rule was benched on
(the Thursday cue bench used its captured prompts; 39 of its ids are this flight's), so FLT is in-sample; §1's sets
are holdout. (2) Tree: FLT's in-app lines come from the flight's registered HEAD `<H>` (flight-eq §11), whose filter
carries `801442d`, `c699638`, `800d6a5` after `2b0906f`; its twins need their own display pin. (3) Answer grades: the
flight's per-arm judge files come from tonight's grader run (`claude-opus-5-5`, one grader per arm), not h40d's.
(4) The calibration pool overlaps FLT's items (§3). Pooling would mix a tuned with an untuned reading, two filters and
two answer-grader runs into one rate; each reading is therefore computed, barred and reported on its own (§5F), with
one shared instrument (rubric, instruction files, calibration, checkers).

**Run.** Run folder `MAIN\electron\test\golden\interview60.runs\<stamp>-eq` (flight-eq §2), `<H>` and the run window
(`timeline.startedAt` → `endedAt`) as flight-eq §11 and its result note record them. If the flight does not fly
tonight and re-flies under flight-eq's §6 on another day, FLT is that hour's. FLT is the FIRST eq hour that reaches
FLIGHT EXIT with an export that is COMPLETE or missing ≤ 2 in-app ids, whatever flight-eq's own verdict on it (a VOID
or INCONCLUSIVE flight hour's cues were still shown; its verdict is named beside FLT); a later re-flight's cues are not
graded under this file.

| Set | Source | Blocks (at most) | Form the grader sees | Role |
|---|---|---|---|---|
| FLT-INAPP | b10 export, `arm: "inapp"` | 40 (+ a double's second answer) | as logged: the `[Answer] cues: ` line is post-`trimCues` (`IntelligenceEngine.ts:419–421` in MAIN's working copy, §0.6) | gating for the FLT verdict |
| FLT-TWINS-H | b10 export, `arm: "captured-high"`, reps 1–3 (3.5-lite HIGH, the hedge's front model) | 40 / 40 / 40 | `trimCues(cues, 3, 5).cues` from the FLT display pin below | gating for the FLT verdict, pooled |
| FLT-TWINS-L | b10 export, `arm: "captured-low"`, reps 1–3 (3.1-lite LOW, the back leg) | 40 / 40 / 40 | as FLT-TWINS-H | reported only ("grade everything": all three reps, unlike §1's r1-only) |

Not graded, named: the no-cue twins (no blocks); the bare arms `high`, `low`, untagged 3.5-lite and 3.1-lite (scripted
text with no context, not what the app showed — rev 5's reason; b10 does not export them); the G sitting's
`captured-g-*` and `captured-no-block-*` arms (≤ 7 ids each, not in b10's export; the first are the
`captured-high`/`-low` prompts again on those ids, the second the same without the earlier-question block); `captured-minimal`, chains; cue lines outside the run window (the readiness probe's).

**Input contract: b10's export (`E\eq-cues-export.mjs`, flight-eq §7.b10 + A2.5).** Consumed only by
`C\cue-material-eq.mjs`, which refuses on any violation and prints the violated field with ids and counts only. The
cue-grading controller never opens the file otherwise; nothing prints its cues.
- **Files.** `L\flight-eq\cues-export-eq.json` (UTF-8 JSON; never printed, never committed; its sha256 recorded in
  this file's material amendment) and `L\flight-eq\cues-export-eq.completeness.txt` (b10's printed completeness lines,
  counts and ids only, with one line `LOG <basename> <sha256>` naming the debug log it read — the file `logLine`
  indexes — and the LAST line exactly `EXPORT COMPLETE` or `EXPORT INCOMPLETE: <id>[,<id>…]`). The b10 tool's
  line in `E\instruments.sha256.txt` (sha, calibration file sha, Opus review READY: flight-eq A2.5) must exist and its
  sha must match the tool file at material time, else refuse (an unreviewed exporter is not an input).
- **Top level.** One JSON object with exactly the keys `schema` (= `"cues-export-eq/1"`), `runDir` (absolute path of
  the run folder, `C:/` or `C:\` form), `registeredHead` (40 hex, equal to flight-eq §11's registered HEAD),
  `window` (`{"startedAt": <ISO>, "endedAt": <ISO>}`, the timeline's), `entries` (array). Anything else refuses.
- **In-app entry**, one per delivered in-app answer in the run window (a `[Answer] full:` line; superseded streams
  excluded, b10's rule), exactly the keys: `id` (a scenario50 S1/S2 roster id, `/^S[12]Q(0[1-9]|10)F?$/`); `arm`
  (= `"inapp"`); `rep` (= `null`); `dispatchedAt` (ISO string, character-equal to the `dispatchedAt` of the judge-pairs
  entry it was joined to by b10's `wonby-join.mjs` join, or `null` when b10 joined none); `cues` (array of strings: the
  JSON parsed from the run-window `[Answer] cues: ` line of that answer — NEVER the `[Answer] cues trimmed:` line,
  which carries dropped/cut/cleaned text; `[]` when the line logged `[]`); `empty` (`null` when `cues` is non-empty,
  else one of `"knowledge"`, `"coding"`, `"failed"`, `"other"`: h40d's classes as b10 names them; `"missing"` when the
  answer had no cues line at all, `cues` then `[]`); `logLine` (integer, the 1-based line number of the cues line in
  the run's debug log, `null` for `"missing"`).
- **Twin entry**, one per record of each of the six answer files
  `interview60.answers.gemini-3.5-flash-lite_captured-high{,-r2,-r3}.json` and
  `interview60.answers.gemini-3.1-flash-lite_captured-low{,-r2,-r3}.json`, exactly the keys: `id`; `arm`
  (`"captured-high"` | `"captured-low"`); `rep` (1 = the untagged file, 2 = `-r2`, 3 = `-r3`); `src` (that file's
  basename); `cues` (the record's raw `cues` array, PRE-trim, unchanged; `[]` if the record has none); `empty` (`null`
  when non-empty; `"empty"` for a logged `[]`; `"absent"` when the record has no `cues` field or carries
  `transientError`); `dispatchedAt` and `logLine` `null`.
- **Forbidden in the export:** any `answer`, `spoken`, `question`, `prompt`, `reason` or score field; any id outside the
  40 S1+S2 ids; a duplicate (`id`, `dispatchedAt`) in-app pair; a duplicate (`id`, `arm`, `rep`) twin triple.
- **Checks `cue-material-eq.mjs` makes (counts printed):** per (arm, rep), twin entries = the answer file's record
  count, ids equal as sets, and every entry's `cues` equal to the record's `cues` by `JSON.stringify` (the export is
  cross-checked against its source; a mismatch refuses); in-app entries = the completeness file's in-app count; the
  number of in-app entries with `empty: null` = `interview60.metrics.mjs`'s `cueBlocks` present count (b10's own
  invariant, re-read); every non-null `dispatchedAt` present in `interview60.judge.pairs.json`.
- **INCOMPLETE.** ≤ 2 in-app ids named → those ids are `export-missing`, excluded, reported; > 2 → **FLT VOID
  (export)**, final for this hour. On a twin rep: ≤ 2 → named and excluded; > 2 → that rep is excluded from FLT-TWINS-H
  (or -L), named, and the floor (below) applies to what remains.

**Other inputs (read by `cue-material-eq.mjs` into the blind files only; never printed).** The question per id: the
judge pairs' `question` (scripted text, a follow-up with its parent in brackets) from `interview60.judge.pairs.json`;
refuse if a twin pairs file (`interview60.judge.pairs.<model>_<tag>.json`) disagrees on an id. Condition B's answer:
in-app the pairs entry's `answer` for the joined `dispatchedAt`; twins the answer record's `spoken` (empty `spoken` →
A only, "no answer" in B, named). Correctness for the classes: `interview60.judge.json` (in-app),
`interview60.judge.gemini-3.5-flash-lite_captured-high{,-r2,-r3}.json`,
`interview60.judge.gemini-3.1-flash-lite_captured-low{,-r2,-r3}.json`, as merged by flight-eq with
`--model claude-opus-5-5` (the pass record names the grader; a judge file whose verdicts were merged under another
model, or are missing for an id that has a block, refuses — the material waits for flight-eq's grading). The pipeline
list `C\flight\pipeline-ids.txt` (below). G (the earlier-question gated ids) from flight-eq's reader output, a reported
subclass only.

**Display pin for the FLT twins.** A snapshot built by §1's recipe at `<H>` (parameterized, §1 recipe note) into
`SP\dist-snapshots\main-eq-<H7>\` with `SNAPSHOT.txt`, `build.log` and its full sha256 recorded here by amendment
before `cue-material-eq.mjs` runs. Reference copy: MAIN's `dist-electron\electron\llm\verbalStreamFilter.js`, copied to
`C\ref-verbalStreamFilter.eq.<sha16>.js` with sha256 and mtime by the cue-grading controller's FIRST action after
flight-eq's FLIGHT EXIT line, accepted as reference only if its mtime lies between the launcher log's two dist-proof
lines' times (the dist that flew; flight-eq §2 "Build"); otherwise there is no reference, named, and the snapshot
alone pins. Snapshot sha = reference sha → the pin is the very bytes the app ran; different → accepted only when
`trimCues(cues, 3, 5).cues` is byte-identical between the two on every FLT twin block (counts in the amendment),
otherwise stop, amend. `git diff 800d6a5 <H> -- electron/llm/verbalStreamFilter.ts` is recorded (empty expected: no
LANDED path is the filter). The in-app lines need no pin (the app trimmed them).

**Hard items.** The 20 S1+S2 mains are classified exactly as §1 (two classifier sessions, the copied
`hard-classifier-dispatch.txt`, EASY only when both say EASY, follow-ups HARD by rule, the base-rate split by two more,
reported), from the roster's scripted texts under neutral ids in `C\blind\hard-input.eq.json`, verdicts
`C\blind\hard-verdicts.eq.cN.json`; this needs no flight datum and may run before the flight's export exists, but after
revision 6 is hashed. No EASY expectation is registered for FLT (the author did not read the roster texts).

**Exclusions and denominator (stated before any grade, as §1's).** Excluded from every FLT gating count, reported
beside with their axis scores: **pipeline** — the ids flight-eq's result note classes `pipeline` in its three-way form
plus any id its reader (b5) names lost before dispatch, written as ids only to `C\flight\pipeline-ids.txt` from the
COMMITTED result note (its sha256 beside it) before `cue-material-eq.mjs` runs, applied in every FLT set and rep;
**inherited** — a block whose answer that set's judge scored correctness 0, not pipeline; **empty** — an entry with
`empty` ≠ `null` (no block to grade; counted by kind, never graded; the block-presence rate is flight-eq's cue-effect
report, not this one's); **unpaired** — an in-app entry with `dispatchedAt: null` or no pairs match (condition A only,
reported); **export-missing** (above). Partly-correct (correctness 1) stays, a reported class, never cue-introduced.
A double whose two answers both have pairs entries contributes both blocks (each was shown). **Denominator** per FLT
set = HARD, non-empty, paired blocks minus pipeline and inherited. **Floors** = rev 5's: 30 (FLT-INAPP) and 90
(FLT-TWINS-H pooled); below = FLT VOID (floor), final. Disclosed: at e EASY mains, p pipeline, i inherited and m empty
or missing in-app entries the in-app count is 40 − e − p − i − m (plus doubles), so the floor trips when those sum
past 10; e is unknown (above).

**Files.** FLT-INAPP A, B; FLT-TWINS-H r1, r2, r3 A, B; FLT-TWINS-L r1, r2, r3 A, B = **14 blind files**
(`cues.blind-11` … `-24`, §3), two graders each = **28 graders** (+ regrades). Blinding as §1: graders see the
question, the block (and in B the answer), never an id, model, arm, set name, grade or prompt.

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
R2; rev 6, S3, S8] The instruction names the grader's two inputs (its blind file, this instruction file, both as
absolute `C:\` paths) and its one output (its verdicts file), names the tools by their names (Read for the two inputs,
Write — or Edit — for the output and nothing else), and says: there is no shell; any other tool, any other file, voids
the grader's file and discards its work; re-read your verdicts file with Read if you want to check it (a Read of the
own verdicts file is allowed, §3.3 rule 1). [rev 6] It also states the output schema exactly (one JSON object:
`{"verdicts":[{"id":…, <the condition's axes as integers 0–2>, "reason":"<one sentence>"}]}`, one entry per blind id,
no other key) so the controller's format check (§3.3, `cue-verdict-check.mjs`) can decide it. **Rev 5's validation
command and its code are removed** (S3: a ban list over Bash code cannot close names obtained at run time; S8: its
description could not satisfy the bans by construction). The same instruction files serve the holdout sets and the
flight set (§1F); the blind file's shape is the same in both.

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
  probe's fixture is `cues.probe.json` / `verdicts.probe.g1.json` [rev 6, S2: two probes, `cues.probe-1.json` /
  `verdicts.probe-1.g1.json` and `cues.probe-2.json` / `verdicts.probe-2.g1.json`, slots `probe-1.g1`, `probe-2.g1`]
  (§3 "Grader sessions and memory"); all in the same blind folder. [rev 4, N2; rev 5, R7] `cue-material.mjs` also writes the dispatch manifest
  `SP\cue-grading\keyhold\manifest.json` (outside `blind\`, since it would otherwise sit beside the files the graders
  read; the checker takes its path as an argument): one entry per grader slot `blind-N.gX`, `cal-K.gX` and `probe.g1`
  with `blind`, `verdicts` and `instruction` as normalized absolute paths and no set name. The tool-use check reads a
  grader's own names from this manifest and from nothing else (never a string replace of the verdicts name: the blind
  name has no `.gX`); a slot missing from the manifest is VOID. [rev 6, N7] A probe slot (`probe-1.g1`, `probe-2.g1`)
  has no frozen instruction file: its manifest entry carries `instruction: null`, and allowlist rule 1 then admits only
  its own blind file (and its own verdicts file). [rev 6, flight set] The flight set's 14 blind files (§1F) are
  `cues.blind-11.json` … `cues.blind-24.json` (exactly these names), verdicts `verdicts.blind-N.gX.json`, keys
  `keyhold\key.blind-N.json`, the N ↔ (set, rep, condition) assignment drawn by its own seeded coin (seed
  `cue-grading:flight-eq:<registered HEAD 40 hex>`) into `keyhold\sets.flight.json`; their slots are appended to the same
  `keyhold\manifest.json` by `cue-material-eq.mjs`, which refuses to write a slot name that already exists. The holdout
  numbering 1–10 is unchanged.
- **Grader sessions and memory [rev 5, the re-review's out-of-scope note; the sister registration's §1 Memory and §6.0,
  `AMENDMENT-A2.md` points 2 and 8, adopted].** The project memory index names this instrument's subject (h40d's
  cue FAIL, the cue-mode rulings, `project_cue_mode_next`, `project_h40d_flight`), so a grader that loads it grades
  with the verdict in view. Therefore every grader (probe, calibration, holdout, flight, regrade) [rev 6: and every
  classifier of §1 and §1F, whose output sets the gating denominator] is a TOP-LEVEL `claude -p` session
  [rev 6: `--model claude-opus-5-5`, the pinned id, not the alias: the user's pin for tonight's graders (flight-eq A2.7);
  a refused or unavailable id means grading waits — no other model grades] whose cwd is OUTSIDE the project tree
  [rev 6, S2: a FRESH folder per attempt, `C\grading\<slot>-a<k>\` (k = 1, 2, …), created by a `mkdirSync` that refuses
  an existing path, never reused; rev 5's single shared `C\grading\` is withdrawn: all graders would share one projects
  slug, so a memory note written by one grader, or claude-mem context recorded from one, would reach every later one],
  so neither the project `MEMORY.md` nor claude-mem's SessionStart context loads; never a subagent of the controlling
  session (which does load them). The dispatch command's full text (flags included) goes in the sha amendment
  [rev 6, S3: the tools are **Read, Write and Edit only** — `--permission-mode dontAsk --tools Read,Write,Edit
  --strict-mcp-config`, NO `--add-dir`, NO Bash, `--allowed-tools` rules naming exactly the slot's own blind file,
  instruction file and verdicts file (Read of the three, Edit/Write of the verdicts file); never
  `--dangerously-skip-permissions`; the launcher prints its argv per launch]; the prompt is the frozen instruction file
  plus the slot's three absolute paths. [rev 6, S2] **The launcher** is `C\cue-launch-grader.mjs`, an adaptation of the
  sister's `F\R\launch-grader.mjs` (sha256/16 `2f096c38016161ed`, which already does per-attempt cwds, the slug
  pre-check, the flags above and the two-at-once lock) with this material's names, the cue instruction files, the
  pinned model id and the cue verdict check; its sha, its self-test output and its Opus review go in the amendment.
  **Before each launch** the attempt cwd's projects folder (the launcher's `projectSlug`) must hold no top-level
  `.jsonl` and no non-empty `memory\`, else REFUSED, nothing launched. **After each transcript** that folder's `memory\`
  must be absent or empty and hold exactly one top-level `.jsonl` (the session's): a non-empty `memory\` voids that
  slot in the memory class (§5.1) and its regrade runs in a new fresh cwd. The session's transcript is `C:\Users\sotka\.claude\projects\<slug>\<session>.jsonl`, where the slug
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
  [rev 6] Precondition, re-read 2026-10-05: `check-grader-memory.mjs` sha256/16 `119ea78a433ba47d`, `PROJECT_MEMORY` 17
  entries, `PROJECT_MEMORY.includes('MEMORY.md')` = false; the amendment records the same one-line check on the day.
  **Proven BEFORE the user's OK (§7 step 0b)** [rev 6, S2: TWO probes, in sequence, laid out exactly as the graders
  will be]: probe 1, then probe 2 only after probe 1's transcript exists, each launched by `cue-launch-grader.mjs` from
  its own fresh cwd (`C\grading\probe-1.g1-a1\`, `…\probe-2.g1-a1\`) with the dispatch flags, each prompt asking for
  one Read of its own `cues.probe-<n>.json` (two neutral strings, no cue content) and one Write of its own
  `verdicts.probe-<n>.g1.json`, nothing else [rev 6, S3: no validation command]; each transcript located by session id;
  the pin reads `claude-opus-5-5` on both (anything else → STOP); the memory check reads ABSENT on BOTH (the second is
  the carry-over test: a session after one that used tools), its slug `memory\` absent or empty on both, and LOADED on
  the positive control `a9d35e8deacac3eff` (the s50l alias probe, which loaded the project memory; [rev 6, S7] it reads
  LOADED on 32 hits in 16 distinct project markers under the revised checker, `MEMORY.md` not among them) and ABSENT
  on the sister's removed-effect copies (re-run under the revised checker on the day, since its `.out.txt` predates
  the revision); the tool-use check reads ALLOWED on both (the first REAL positive controls). On the day all three
  checks run on every grader transcript, plus the slug-folder check above. **Consequence:** a transcript that reads
  LOADED (either marker group) or whose slug `memory\` is non-empty voids that SLOT's reading in the memory class
  [rev 6, S4: an `mcp__*` call is a tool-use void, the tool-use class, not this one]; its scores are reported beside;
  the slot is re-graded ONCE by a fresh session in a fresh cwd; a second memory void on the same slot leaves the
  reading VOID, final, reported (§5.1 gives the budgets). A memory void on a calibration transcript (h) [rev 6, S2: rev 5
  had no remedy] re-runs that calibration file's slot once the same way; a second one stops calibration and is
  reported to the user before anything else runs. **Departure:** if the outside session cannot be
  proven, or fails on the day, graders as subagents of the controlling session are a departure from this rule, taken
  only as the user's explicit choice, asked before any call, the verbatim answer and its time recorded here as a dated
  amendment whose first line is, from column 0, the marker word DEPARTURE-MEMORY-ACCEPTED followed by the date and
  time (the quoted, mid-sentence mention of that word in this paragraph is not such a line); under it project-memory
  LOADED is EXPECTED, is not a void and triggers no regrade, claude-mem markers and `mcp__*` calls keep their
  consequence [rev 6, S5: ONLY the project-memory group is accepted; a slot whose claude-mem count is > 0 is VOID under
  the departure as without it; the checker prints both groups' counts and `cue-decide.mjs` reads them separately],
  `cue-decide.mjs` accepts a LOADED slot only when this file holds a line that begins with that marker
  word (calibrated on a copy of this file with and without one, §3 decide bullet) [rev 6, S5: AND the date-time on
  that line precedes the earliest `startedAt` (launcher record) of every slot it accepts; a departure line written
  after a slot ran accepts nothing for that slot], and the first line of the result note reads
  `GRADERS LOADED PROJECT MEMORY (departure, amendment <date time>)` [rev 6, N2: one line], with the exposure named:
  every grader then knows h40d's cues FAILED on thinking cost, a push toward harsher cue grades and so toward FIX.
  Tonight the departure is NOT expected to be needed: the CLI was re-logged at 22:19 on 10-03 and the outside-cwd
  session works (the sister's probe, `claude-opus-5-5`); [rev 6] the flight's own two probes (flight-eq b8) run under the
  same flags tonight and are evidence, not a substitute for this file's two. **The controller's own memory:** no
  memory, `MEMORY.md` or agenda line about this grading's arms, bars, expectations or outcome is written until every
  verdict file exists (the 20 holdout verdicts [rev 6: and, for the flight set, its 28], their regrades if any); the
  result note comes first. [rev 6] The holdout reading's result note may be written before the flight set is graded;
  then the memory rule binds per set: nothing about a set until that set's verdict files all exist.
- Two independent graders per file, `claude-opus-5-5`, pinned from each session's own transcript [rev 5: by the
  sister's adapted reader `..\followup-turn\R\h40d-grader-models.mjs` with `session:<uuid>` (exit 0; sha in the
  amendment; calibrated on the 22:19 probe reading `claude-opus-5-5`); the `SP\validation-hour` copy, sha256/16
  `b09b8b84a77335fa`, is unchanged and unused, since it finds `subagents\` transcripts only]. Fresh sessions per file.
  [rev 6: the reader's sha changed since the re-check (`8fd717fb71f90ba5` → `3626e263f3fac5ba`, 2026-10-05); the sha used
  is the one re-calibrated on the day (the 22:19 probe → `claude-opus-5-5`, AND one transcript of another model or a
  synthetic copy with its `model` field changed → not `claude-opus-5-5`), recorded in the amendment; a later edit
  re-runs both.]
- **Tool-use check [rev 2, I8; rev 3, RI2: an allow-list, not "any read or write"; rev 4, N2, N6, N7: the sister's
  ALLOWLIST shape, `followup-turn\AMENDMENT-A2.md` point 1 (22:21), with this material's names; rev 6, S3: no Bash
  at all, so the allowlist is Read and Write/Edit only].** A separate script,
  `SP\cue-grading\cue-grader-tools.mjs`, reads each grader's transcript (the same files the pin script finds) and
  prints every `tool_use` name with its path; it never prints transcript text. It takes transcripts as
  `session:<uuid>` or `file:<path>` (top-level sessions, as the memory rule above), and the manifest path as an
  argument. The grader's own names (blind, verdicts, instruction) come from `manifest.json` (above); "blind folder" =
  `SP\cue-grading\blind\`. [rev 5, R2] Every path the script compares (a `file_path`, the manifest's entries) is
  normalized first: `/c/…` (Git Bash), `C:/…` and `C:\…` to one form, drive letter and path compared
  case-insensitively, separators unified, no trailing separator. A grader's transcript is ALLOWED when EVERY
  `tool_use` in it (a call the permission system DENIED included: a denied call is still an attempt) is one of:
  1. a Read whose `file_path`, normalized to an absolute path, equals exactly its own blind file, exactly its
     condition's frozen instruction file (none for a probe slot, N7), or exactly its own verdicts file [rev 6: a
     re-read of its own output replaces rev 5's validation command];
  2. a Write (or Edit) whose `file_path` normalizes to exactly its own verdicts file: writing its verdicts never
     voids, however many times.
  [rev 6, S3] Rev 5's rule 3 (a Bash call of the registered shape, with its syntax bans and the string-literal
  file-name token definition) is WITHDRAWN: the re-check showed a command meeting every ban that reads every key file
  through names obtained at run time (`process.chdir`, `readdirSync` on a literal folder, `opendirSync`), and no ban
  list over code text closes that. **Any Bash call voids** (denied or not), as does anything else: any other tool
  (Glob, Grep, Agent, WebFetch, WebSearch, the PowerShell tool, …), any `mcp__*` call, any Read, Write or Edit outside
  1–2; one failing call voids whatever the other calls are. The dispatch flags (`--tools Read,Write,Edit`,
  `--permission-mode dontAsk`, `--strict-mcp-config`, no `--add-dir`, allow rules naming only the slot's own three
  files) make such a call fail at the permission layer; the audit is the record that it was not attempted. The
  script's verdict per grader is ALLOWED or VOID with the offending call's name and path, exit 0 only when every
  grader is ALLOWED.
  **Format check [rev 6, replaces the grader's self-validation].** `SP\cue-grading\cue-verdict-check.mjs <manifest>
  <slot>` reads the slot's verdicts file and its blind file and prints, ids and counts only: the blind block count, the
  verdict count, ids missing / extra / duplicated, scores outside the integers 0–2 or on the wrong axes, a missing or
  empty `reason` counted (not printed), and `FORMAT OK` or `FORMAT VOID (<n> problems)`. A FORMAT VOID
  is a void of the tool-use class (§5.1: at most two regrades per slot). It never prints a reason or a score.
  [rule 8] Both scripts are calibrated before any holdout or flight transcript is read, on fixture transcripts and
  verdict files written under THIS run's exact names in the real blind folder (a Thursday cue-bench transcript is NOT
  used: its names are not this run's), expectations written first [rev 5, R6: `blind-1` is whichever (set, condition)
  `sets.json` gave it, which the fixture does not need to know]:
  (a′) grader `g1` of `cues.blind-1.json`: a Read of `cues.blind-1.json`, a Read of its instruction file, a Write of
  `verdicts.blind-1.g1.json`, a Read of `verdicts.blind-1.g1.json` → ALLOWED; the same with the Read `file_path` in
  `C:/Users/…` form → ALLOWED; in `/c/Users/…` form → ALLOWED; in lower-case `c:\users\…` → ALLOWED; the Write
  replaced by an Edit → ALLOWED;
  (b) the same plus a Read of a `keyhold\` path → VOID naming it;
  (c) the same as (a′) plus ONE Bash call carrying exactly rev 5's validation command for these two names (the
  formerly registered, benign shape) → VOID; the same Bash call marked denied in its `tool_result` → VOID;
  (d) the same as (a′) plus a Read of `cues.blind-2.json` (another file, possibly the other condition's, which carries
  the spoken answer) → VOID; a variant with a Read of `verdicts.blind-1.g2.json` → VOID; a variant with a Read of
  `cues.blind-11.json` (a flight file, §1F) → VOID (a prefix or `includes` match would let these through);
  (e) the same as (a′) plus a Write of `verdicts.blind-1.g2.json` → VOID;
  (f) the same as (a′) plus a PowerShell-tool call → VOID; plus a Glob call → VOID; plus an `mcp__x__y` call → VOID;
  (f2) a probe slot `probe-1.g1` (`instruction: null`): Read of its blind, Write of its verdicts → ALLOWED; plus a Read
  of `cue-grader-prompt.A.md` → VOID (no instruction file is its own);
  format fixtures: a complete valid verdicts file → `FORMAT OK`; one id missing → VOID; one extra id → VOID; one
  score 3 → VOID; one score `"2"` (a string) → VOID; a B-axis on an A file → VOID; unparseable JSON → VOID.
  [rev 6, N5] Any edit to `cue-grader-tools.mjs` or `cue-verdict-check.mjs` after calibration (a normalizer repair
  included) re-runs every fixture above and records the new sha before the next transcript is read.
  [rev 5, R2] **Real positive controls, after the fixtures and before any holdout or flight file is dispatched,
  expectation ALLOWED and FORMAT OK written here first:** (g) the two probes' transcripts (one Read, one Write each by
  a real Opus session under the dispatch flags) [rev 6, S2]; (h) every §3 calibration grader's transcript (real
  transcripts under the frozen instruction, the condition's own file). A VOID on (g) or (h) whose call is benign (a
  re-read in a path form the normalizer missed, a Bash or PowerShell attempt at self-validation that the permission
  layer denied) is repaired by instruction wording or by the normalizer, as a dated amendment, and the probe or that
  calibration file re-run; the rule itself (the allowed set) is never loosened. A VOID that reads a forbidden file is
  a VOID. The results, one line per case with its expectation, go in the amendment that records the scripts' shas.
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
  fresh agents; no holdout file is dispatched before a pass [rev 6: nor any flight file; one calibration pass, under
  the frozen instruction shas, qualifies both readings, since both are graded under those same files]. The genuine
  blocks' scores are reported as the instrument's base rate. [rev 6, disclosed] The pool's 39 ids are 39 of the flight
  set's 40 (§0.6): the calibration plants and genuine blocks sit on the flight's own questions (other draws, other
  bytes). Calibration and flight graders are separate fresh sessions in separate cwds, so nothing carries over; the
  overlap means only that the flight reading is not independent of the calibration's item mix, which is stated in §6.
- `cue-decide.mjs` (to be written) reads the verdict files and applies §3–§5; it refuses a key-count mismatch, a
  score outside 0 to 2, a missing file, a sha mismatch (instruction files, snapshot). [rev 2, M12] It is calibrated on
  hand-made verdict sets with known outcomes before it reads a real file: one per verdict (VOID, FIX, SAFE, REPORTED),
  one refusal, the boundaries (GOOD exactly at 75% and 65%; consensus-harmful exactly at 7% and 11%; cue-introduced
  exactly at 4% and 7%; either-harmful exactly at 16%; agreement exactly at 80% on one file), one set where the A and
  B graders disagree so that a wrong pairing would change the verdict, and [rev 3, m4, m5] one set whose floor fails
  (29 in-app blocks) to show the final VOID, and one whose agreement fails twice on one file; [rev 5] one slot whose
  memory check reads LOADED, decided against a copy of this file in TMP without a departure line → VOID, and against
  a copy with one line beginning with the marker word → accepted (the real file, which only mentions the word
  mid-sentence, must read as the first copy). [rev 6, S5] Under the with-departure copy: a slot whose claude-mem
  count is > 0 (project count 0 or > 0) → VOID; a LOADED slot whose `startedAt` precedes the departure line's
  date-time → VOID (not accepted); the same slot started after it → accepted. [rev 6, S4] Budget sets, expectations
  first: one slot voided memory → tool-use → tool-use and then clean (4 transcripts) → its last transcript's scores
  are read; the same slot whose 4th transcript is tool-use VOID again → that reading VOID, final; one slot voided
  memory → memory → VOID final (memory budget 1); one slot voided pin → format → pin → VOID final (pin + tool-use +
  format share 2); one file voided on agreement twice → VOID final, while a slot of that file that ALSO had one
  tool-use void reads the agreement rule, not a fresh budget. [rev 6, §1F] The flight set: one calibration set per
  flight verdict (FLT VOID by floor at 29 in-app, FLT FIX, FLT CLEAR, FLT REPORTED), one where the export is
  INCOMPLETE on 3 ids → FLT VOID (export), one on 2 ids → graded with the 2 named, and one where the holdout reads SAFE
  and the flight FIX → the combined line of §5F. It reads each slot's pin, memory, tool-use [rev 6: format and
  slug-folder] lines from the checkers' stdout files (kept beside the verdicts as `graders.models.out.txt`,
  `graders.memory.out.txt`, `graders.tools.out.txt` [rev 6: `graders.format.out.txt`, and the launcher's
  `launches.jsonl` for `startedAt`, `memoryDir`, `slugJsonl`]) and refuses when a slot of `manifest.json` has no line
  in any ONE of them [rev 6, S6: a slot missing from one output alone refuses; rev 5's wording read as "missing from
  all"].
- Scripts print ids, scores, counts and axis names only: never a prompt, never the profile, never a key.

## 4. What is counted and reported

Per set, HARD cue-attributable blocks (EASY and excluded blocks beside, never gating): GOOD rate; consensus-harmful
count and rate (content / display); either-harmful; cue-introduced; inherited; on a partly-correct answer; r1 R09;
per-axis means per grader; agreement per file; glance-0 lines that still carry notation after `trimCues`; `specific`
= 2 on line 1 (the "one-first" intent); lines the cap cut; the base-rate and roster-level cuts.

**Expectation, recorded before the data (per-item guesses do not bind the graders):** IN-APP GOOD (min of graders)
80 to 90%, consensus-harmful 1 to 5% (R33 is excluded as inherited; R12's cut line expected glance 1), either-harmful
5 to 12%, cue-introduced 0 to 3%; TWINS-H pooled the same; TWINS-L lower on `specific`.

[rev 6] **FLT, counted and reported the same way, per FLT set,** plus: the empty entries by kind (`knowledge`,
`coding`, `failed`, `other`, `missing`, twins `empty`/`absent`); unpaired and export-missing ids; the G subclass (blocks
written with the earlier-question context part, flight-eq's G) beside the rest; FLT-TWINS-L's three reps pooled and
per rep; the in-app blocks split by the hedge leg that won the window (front 3.5-lite / back 3.1-lite, from flight-eq's
won-by lines, ids only). **FLT expectation, recorded before the data:** the same ranges as IN-APP above for FLT-INAPP
and FLT-TWINS-H (GOOD 80–90%, consensus-harmful 1–5%, either-harmful 5–12%, cue-introduced 0–3%); FLT-TWINS-L lower on
`specific`; no EASY count is predicted (§1F). Nothing here binds the graders.

## 5. Verdicts (pre-registered; precedence top to bottom) [rev 2, I5: rates on the cue-attributable denominator; the twins pooled; bounds sized by simulation]

1. **VOID** [rev 2, I8: one reading; rev 3, m4, m5, RI2; rev 5: memory; rev 6, S4, S5: budgets per class and slot].
   A set's reading is void when: its calibration never passed; a slot's reading is final VOID (below); agreement on
   any one of its files is under 80% (computed over that file's gating blocks) after its one regrade; the decide
   script refuses its files; it has fewer than 30 (IN-APP) or 90 (TWINS-H pooled) cue-attributable HARD blocks.
   - **Void causes, by class [rev 6, S4].** Per SLOT (`blind-N.gX`): the **tool-use class** = pin not met (the
     transcript's model is not `claude-opus-5-5`), tool-use VOID (§3.3, `mcp__*` included), FORMAT VOID; the **memory
     class** = memory check LOADED (project group, or claude-mem group; under an accepted departure the project group
     alone is not a void, the claude-mem group still is, S5) or a non-empty slug `memory\`. Per blind FILE: the
     **agreement class** = agreement < 80%.
   - **Budgets [rev 6, S4; rev 5's "per file" read as per slot, and its two sentences reconciled].** Tool-use class:
     at most TWO regrades per slot; memory class: at most ONE regrade per slot; agreement class: at most ONE regrade
     per file (both slots of the file re-graded by fresh sessions). The classes are counted independently: a slot may
     use its memory regrade and both tool-use regrades (four transcripts at most, plus the agreement round, which
     re-grades the file's two slots and counts in neither slot class). A transcript that fails a class whose budget is
     spent makes that slot's reading VOID, final, reported; so does a second agreement miss on the same file (no
     selection of the calmer draw). Every regrade runs in a fresh cwd and replaces the slot's file whatever its scores;
     every voided transcript's scores are reported beside it.
   - A floor void (< 30 / < 90) is final for that reading: it counts classified blocks, which no regrade changes.
   - Disclosed: at the expected rates the agreement gate cannot fire before SAFE's either-harmful bar does (< 80%
     needs single-grader harmful disagreement on > 20% of a file's blocks); it is a backstop against one errant
     grader, not the main bound.
   - A void TWINS-L reading voids only the TWINS-L report. No verdict in 2–4 is read while a gating set is void.
   - [rev 6] A refused launch (the account's usage limit: `rate_limit`, no tool call, no verdicts file; flight-eq §6's
     A3 shape) is not an attempt: it consumes no budget; grading waits and continues in a later sitting, named.
2. **CUES NEED A FIX**: IN-APP or TWINS-H has GOOD < 65%, or consensus-harmful >= 11%, or cue-introduced >= 7% of its
   cue-attributable HARD blocks. Consequence: the cue rule changes before any flag-on measurement; the change is
   developed and benched on scenario50 captured prompts (the cue bench's rule: band overlap, no wrong rise, plus this
   instrument on its blocks), and validated on a fresh holdout hour under a new pre-registration. [rev 6, premise
   fact: MAIN ships cues ON (no cue flag was built, flight-eq §1/§11); this registration changes no default and builds
   nothing; whether cues stay ON in MAIN while the fix is made is put to the user in the result note's first lines.]
3. **CUES SAFE TO BRING BACK ON HARD QUESTIONS**: IN-APP and TWINS-H both have GOOD >= 75%, consensus-harmful <= 7%,
   either-harmful <= 16%, and cue-introduced <= 4%. Consequence: the content question is closed for this rule; the
   flag stays off (the 20:00 Fri ruling) [rev 6, premise fact: no such flag exists; MAIN ships cues ON on every
   question; read "the flag stays off" as "this verdict builds nothing and changes no default"]; the next step is
   what that ruling named, a fresh pre-registered measurement with the flag on [rev 6: of cue mode as it would ship,
   hard-only or not, under its own registration], whose own rule must also carry (a) the +161 against +55 thinking
   question and (b) cue grading on its hour by this instrument. The hard-only gating in the app is a design question
   for that measurement's spec. [rev 6] Suspended, not reversed, when the flight set reads FLT FIX (§5F).
4. **REPORTED ONLY**: anything between 2 and 3. The cues are neither cleared nor failed; the flag stays off [rev 6:
   read as in item 3]; the user decides whether a non-holdout bench of this instrument (more draws) is worth the quota
   before the flag-on hour.

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

## 5F. The flight set's verdict [rev 6] (its own reading; precedence top to bottom; the same reductions and rates)

1. **FLT VOID** — §5 item 1 applied to FLT's files (calibration never passed; a slot final VOID under §5.1's budgets;
   agreement < 80% on any FLT file after its one regrade; the decide script refuses), plus: FLT VOID (export) (§1F, > 2
   in-app ids missing); the FLT display pin not accepted (§1F); fewer than 30 FLT-INAPP or 90 FLT-TWINS-H pooled
   cue-attributable HARD blocks (final). A void FLT-TWINS-L voids only its report.
2. **FLT FIX** — FLT-INAPP or FLT-TWINS-H has GOOD < 65%, or consensus-harmful >= 11%, or cue-introduced >= 7%.
3. **FLT CLEAR** — FLT-INAPP and FLT-TWINS-H both meet SAFE's four bars (GOOD >= 75%, consensus-harmful <= 7%,
   either-harmful <= 16%, cue-introduced <= 4%).
4. **FLT REPORTED** — anything between.

**Consequences, decided now.**
- **FLT FIX**: the shipped cue rule fails on its own tuned roster under the shipped filter. The result note's first
  lines say so and put two questions to the user: whether cues stay ON in MAIN meanwhile, and the fix (developed and
  benched as §5 item 2 says; FLT's blocks are scenario50, non-holdout, so they MAY be cited for the rule's next
  revision, unlike §1's). It does not change the holdout verdict's computation; a holdout **SAFE is SUSPENDED** (its
  next step does not start) until the user rules. A holdout FIX stands as written.
- **FLT CLEAR**: licenses nothing on its own (in-sample: the rule was benched on these prompts); reported beside the
  holdout verdict. It does not upgrade a holdout REPORTED or VOID.
- **FLT REPORTED / FLT VOID**: reported; no consequence for the holdout verdict.
- The note's verdict line: `CUE GRADING: holdout <VOID|FIX|SAFE|REPORTED>; flight <FLT VOID|FLT FIX|FLT CLEAR|FLT
  REPORTED>` and, when holdout SAFE and FLT FIX, `SAFE SUSPENDED (flight FIX) — the user rules`. Either reading may be
  written first (they finish at different times); the line is completed when the second exists.

**Why not "FIX if either reading reads FIX" (considered and rejected).** The same simulation with the flight at
(34, 100) (a nominal size; FLT's real size is unknown until classification) gives, for that combined rule: centre FIX
4.5% (holdout alone 2.7%), low edge FIX **22.4%** (alone 12.1%), bad rule FIX 99.6%, noisy graders FIX 8.6%. Doubling
the false-FIX price at the low edge to gain 6 points on a bad rule (93.3 → 99.6) is the wrong trade for an in-sample
set. The suspension rule costs a holdout SAFE only when FLT reads FIX: under independence about 0.827 × 0.022 ≈ 1.8%
at the centre and 0.429 × 0.118 ≈ 5.1% at the low edge (products of the rows below and §5's).

**Operating characteristics of the FLT reading alone** (the throwaway copy `oc-flight.mjs`, sha256/16
`2b30bf7813dffa09`: `oc-sim.mjs` unchanged above its sizes line, same seed, scenarios, 20,000 draws, rule `v3`):

| Truth | (30, 90) SAFE / FIX / REP | (34, 100) SAFE / FIX / REP | (37, 110) SAFE / FIX / REP |
|---|---|---|---|
| expectation centre | 81.3 / 1.6 / 17.1 | 83.9 / 2.2 / 13.8 | 81.2 / 1.0 / 17.8 |
| expectation low edge | 43.3 / 9.9 / 46.8 | 47.8 / 11.8 / 40.5 | 41.0 / 6.4 / 52.5 |
| expectation high edge | 98.4 / 0.0 / 1.6 | 98.5 / 0.1 / 1.4 | 98.7 / 0.0 / 1.3 |
| bad rule | 0.0 / 92.3 / 7.7 | 0.0 / 94.4 / 5.5 | 0.0 / 92.3 / 7.7 |
| mediocre rule | 12.4 / 31.2 / 56.4 | 13.7 / 35.5 / 50.8 | 10.5 / 26.3 / 63.2 |
| noisy graders, good rule | 13.8 / 3.9 / 82.3 | 16.7 / 4.5 / 78.8 | 11.2 / 3.0 / 85.8 |

(SAFE here = FLT CLEAR.) The same caveat as §5: the reps of one item are not independent, so the pooled set is less
informative than modelled. At (34, 100) the rates read as counts: CLEAR needs consensus-harmful <= 2 / <= 7,
either-harmful <= 5 / <= 16, cue-introduced <= 1 / <= 4; FIX fires at consensus-harmful >= 4 / >= 11 or
cue-introduced >= 3 / >= 7. FLT-TWINS-L never gates.

## 6. What this does not show

- Whether cues help the candidate speak better or sooner (deliberately unmeasured, as since 2026-09-20).
- Anything about speed: 2c's FAIL and the +161 against +55 question stand untouched.
- Cue quality beyond one hour's draws: ~35 hard cue-attributable items in-app, three twin reps of the same items; a
  rate moves by about +/- 7 points on 36, and two graders bound but do not remove grader variance (agreement gated at
  80% per file, reported in full).
- Cues on scenario50 (calibration material only) or on simple questions (the EASY set is 3 to 7 items, reported).
  [rev 6: scenario50 S1+S2 is now graded as FLT, an in-sample reading, below; simple questions still are not.]
- The overlay itself, typed chat; the bare arms' cues; TWINS-L r2/r3 [rev 6: of h40d; FLT grades its TWINS-L r1–r3].
- Whether the router's §1 class, applied by two classifiers to scripted text, is the class a live router would pass;
  §1 itself is uncalibrated (router40 §6.4 has not run) [rev 3, m7].
- The pipeline-excluded items' cues (reported, not gated): what a cue does on a lost parent is a pipeline question.
- [rev 3, RI3] Whether the snapshot's `trimCues` equals the app's at the hour is proven only by the sha match
  (expected) or by byte-identical output on the material blocks (the fallback); a block outside the material is not
  covered by the fallback. [rev 4; rev 5] The build has not been run: the sha prediction is unproven until step 0's
  second half, as is esbuild's handling of the 252 outputs past 259 characters; the junction removal, the two delete
  methods and the `cmd /c` pipe were each exercised ONCE by the re-review, in scratch, on one PowerShell build
  (5.1.26100), never on the export itself.
- [rev 4, N7, as A2's residual; rev 6, S3] The tool-use audit detects, the dispatch flags prevent: with no shell, no
  `--add-dir`, `dontAsk` and allow rules naming only the slot's own three files, a forbidden read must go through Read
  and is denied at the permission layer and recorded as an attempt (the sister's negative probe `f8d13b32` was
  DENIED); the audit is a transcript parse, not an execution trace. [rev 6] Rev 5's disclosed Bash residual
  (computed names, and the re-check's run-time-name bypass) no longer exists: there is no Bash to carry it. What
  remains: the permission layer's behaviour under these exact flags is proven by the sister's probes and this file's
  two probes, not by a hostile grader.
- [rev 5; rev 6] The memory check is a marker search with counts, not proof of what reached the grader: it shows the
  project memory index and claude-mem's context did not load, nothing about the user's global `~/.claude\CLAUDE.md`
  (which every session loads; it carries engineering rules, no cue content) or the model's own prior knowledge. Two
  sequential tool-exercising probes test carry-over between attempts (S2); they cannot test carry-over after a grader
  that READ cue or answer content, which only the per-transcript checks on the day see. [rev 6, N1] The checker's
  marker `-natively-cluely-ai-assistant/memory` is dead (transcript paths are backslash-escaped); it cannot read LOADED
  falsely and is left in the sister's file unedited. Whether real Opus graders keep to Read and Write without a shell
  (the old self-validation habit) is what (g) and (h) measure.
- [rev 6] **The flight set.** FLT is in-sample: the shipped cue rule was benched on scenario50's captured prompts and
  39 of FLT's 40 ids are this file's calibration pool, so a FLT CLEAR says nothing about generalisation and FLT's
  rates are not independent of the calibration's item mix (fresh sessions remove carry-over, not the shared items).
  One hour, one hedge mix (in-app blocks come from whichever leg won each window: 3.5-lite front or 3.1-lite back), one
  grader per answer arm for the classes (inherited, cue-introduced), so a misgraded answer moves a block between
  classes. G's blocks were written with the earlier-question context part (n ≤ 7, reported). The empty blocks are not
  graded (a missing cue on a hard question is a presence question, flight-eq's cue-effect report). FLT's size is
  unknown until classification; the floor can trip (§1F). The flight's own controller may read cue shapes and quote
  trimmed lines under flight-eq §4's cue-effect report ("trims quoted") before FLT is graded: that exposes cue text to
  that controller, never to a grader (graders see only their blind file); the cue-grading controller does not open
  those outputs before every FLT verdict file exists.
- [rev 6] The parameterized recipe, the FLT reference-copy timing rule and `cue-material-eq.mjs`'s cross-checks are
  unrun; b10's exporter does not exist yet (flight-eq A2.5 builds it post-hour).

## 7. Order of work (documents and scripts; the grader and classifier sessions are the only model calls)

**When grading may start [rev 6] — no grader, classifier or probe session is launched, and nobody opens a cue line,
blind file, verdicts file or the b10 export, before ALL of:** (i) a separate fresh Opus re-check of THIS file
(revision 6) returns no Critical and no Important finding open (Minor fixes, if any, applied as a dated amendment file
beside this one and named in `C\HASHES.txt`); (ii) the sha256 of this file (and of that amendment) is written to
`C\HASHES.txt` with the time read by `date`, and every later step's output cites it; (iii) for the steps that need it
below, the user's OK, asked in chat with the hashes, the probes' results and the calibration result in hand.
Revision 5 is never graded under: a run that cites rev 5's sha is not read. The holdout path (steps 0–5) and the
flight path (F1–F6) share steps 0b and 3 (one probe pair, one calibration) and are otherwise independent.

0. [rev 3, RI3] The display instrument: the reference copy of MAIN's live dist filter (sha check) [rev 4, N4: DONE
   22:22:21], then the `2b0906f` snapshot built by the §1 recipe, steps (0)–(8) with `build.log` [rev 6: S1's counts,
   N3, N4], into `SP\dist-snapshots\main-h40d-2b0906f\` with its `SNAPSHOT.txt`; the full sha256 written into the §1
   pin table (and the equivalence counts, if the sha differs). All before the user's OK. [rev 6: no model call; may run
   once (i)–(ii) hold.]
0b. [rev 5; rev 6, S2] The grader session proven (§3 "Grader sessions and memory"), before the user's OK:
   `cue-launch-grader.mjs` written, self-tested against a stand-in for the claude binary (the sister's
   `TURN_FAKE_CLAUDE` seam: an existing cwd → refused; a slug folder holding a `.jsonl` → refused; a non-empty
   `memory\` → refused; argv printed with `--model claude-opus-5-5`, `--tools Read,Write,Edit`, `--permission-mode
   dontAsk`, `--strict-mcp-config`, no `--add-dir`, no Bash; a third concurrent launch → refused) and Opus-reviewed;
   the revised `check-grader-memory.mjs` (no `MEMORY.md` marker; precondition line recorded) reading LOADED on
   `a9d35e8deacac3eff` (32 hits / 16 distinct expected) and ABSENT on the removed-effect copies; the pin reader
   re-calibrated (§3); then probe 1 and, after its transcript exists, probe 2, each from its own fresh cwd under the
   dispatch flags (fixtures `cues.probe-<n>.json` written by hand, two neutral strings), each transcript found by
   session id: pin `claude-opus-5-5`, memory ABSENT, slug `memory\` absent or empty, tool-use ALLOWED (case (g)) on
   BOTH; the dispatch argv, the launcher's, checker's and reader's shas and both session ids into the sha amendment.
   The probes' fixture and verdict files are deleted after the check. (Order: the probes need `cue-grader-tools.mjs`
   from step 3's fixtures; so steps 1 and 3's fixture calibration run first, the probes then, and the real
   calibration graders after both read ALLOWED.)
1. `cue-material.mjs`: join, `trimCues` from the snapshot (sha check; reference sha check), blind (`cues.blind-1…10`,
   `cues.cal-K`), keyhold (`key.blind-N.json`, `sets.json`, `manifest.json`); prints counts matching §1 (44 / 44 / 44 /
   44 / 42) and the calibration file count, or refuses. The frozen instruction files [rev 6: Read/Write only, no
   validation command, the exact output schema, §2] and their sha amendment (§2); the revised `oc-sim.mjs` sha and
   `oc-flight.mjs`'s in the same amendment.
2. The hard classification (`hard-classifier-dispatch.txt` with its sha amendment, 2 classifier sessions + 2
   base-rate sessions [rev 6: outside-cwd top-level sessions launched like graders, §3]), recorded before step 4.
3. `cue-grader-tools.mjs` and `cue-verdict-check.mjs` calibrated on the fixtures (§3.3: a′ and its path-form variants,
   b, c, d, e, f, f2, the format fixtures) and their shas recorded; then step 0b's probes (g); then calibration grading
   (§3) until it passes, each calibration grader's transcript through the pin, memory, tool-use, format and slug-folder
   checks with ALLOWED / FORMAT OK expected (h); `cue-decide.mjs` calibrated (§3 decide bullet, rev 6's sets included);
   amendments to this file dated.
4. The user's OK; then the 10 holdout files, 20 graders as outside-cwd sessions in fresh cwds, at most two at once;
   the pin, memory, tool-use, format and slug-folder checks on every transcript; `cue-decide.mjs`.
5. Result note `SP\cue-grading\2026-10-0_-cue-grading-result.md`, then copied to MAIN `passes/` with this file under
   the pass-records rule (ids, counts, axes; no prompt text), committed with nothing else. [rev 6: if FLT is not yet
   graded, the verdict line carries `flight PENDING` and is completed by F6.]

**The flight path [rev 6].**

F1. Classification of the 20 S1+S2 mains (§1F), as step 2; may run any time after (i)–(ii), no flight datum needed.
F2. After flight-eq's FLIGHT EXIT: the reference copy of MAIN's dist filter as the controller's first action (§1F
   timing rule; sha, mtime, the launcher log's two dist-proof times, ids/times only); then the `<H>` snapshot by the
   parameterized recipe; its sha into §1F by amendment.
F3. Wait for flight-eq's own post-hour work: b10's exporter in `E\instruments.sha256.txt`, the export and its
   completeness file written; flight-eq's per-arm answer grading merged (`--model claude-opus-5-5`); flight-eq's
   result note COMMITTED. Then `C\flight\pipeline-ids.txt` from that note (ids only, with the note's sha256). The
   cue-grading controller reads none of flight-eq's cue-effect outputs (§6).
F4. `cue-material-eq.mjs` written, calibrated before it reads the real export, expectations first: on a synthetic
   export built from h40d-shaped fixtures with invented cue strings (never real cues): a complete export → counts as
   built; a twin entry whose `cues` differs from its answer record → refuse; a forbidden field (`spoken`) → refuse; an
   id outside S1+S2 → refuse; a `[Answer] cues trimmed:` array substituted for one entry (detected by a fixture
   `logLine` pointing at a `trimmed` line) → refuse; completeness `EXPORT INCOMPLETE: a,b` → 2 named exclusions;
   `…: a,b,c` → FLT VOID (export); a missing judge file → refuse; a judge file merged under another model → refuse.
   Opus-reviewed. Then on the real inputs: prints counts only (entries per arm/rep, empties by kind, unpaired, pipeline,
   inherited, partly-correct, HARD, denominators), writes `cues.blind-11…24`, keys, `sets.flight.json`, the new
   manifest slots; refuses as §1F says.
F5. The user's OK (the counts of F4 in hand); then the 14 FLT files, 28 graders exactly as step 4; `cue-decide.mjs`
   on FLT (§5F).
F6. The FLT reading in the result note (its own section; the combined verdict line of §5F), then MAIN `passes/` as
   step 5. The result note quotes no cue line from FLT except to name a failure class (FLT is non-holdout, so this is
   allowed, and such lines may be cited for the rule's next revision).

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

## 9. Tools that must exist before grading [rev 6] (each with its calibration; none exists yet unless stated)

| Tool | Status | Calibration before first real use |
|---|---|---|
| `C\cue-launch-grader.mjs` (adapted from `F\R\launch-grader.mjs` `2f096c38016161ed`) | to write | stand-in-binary self-test (0b); two real probes ALLOWED, ABSENT, pinned; Opus review |
| `F\R\check-grader-memory.mjs` (`119ea78a433ba47d`) | exists | LOADED on `a9d35e8deacac3eff` (32/16), ABSENT on the removed-effect copies and both probes; `MEMORY.md` not a marker |
| `F\R\h40d-grader-models.mjs` (`3626e263f3fac5ba` today) | exists | `claude-opus-5-5` on the 22:19 probe; a changed-model copy reads otherwise |
| `C\cue-grader-tools.mjs` | to write | fixtures (a′) + 4 path forms + Edit, (b), (c) ×2, (d) ×3, (e), (f) ×3, (f2) ×2; real (g), (h) |
| `C\cue-verdict-check.mjs` | to write | the seven format fixtures (§3.3) |
| `C\cue-material.mjs` | to write | prints §1's 44/44/44/44/42 and K; refuses a wrong snapshot or reference sha |
| `C\cue-material-eq.mjs` | to write | F4's nine synthetic cases; Opus review |
| `C\cue-decide.mjs` | to write | §3 decide sets: verdicts, boundaries, pairing, floor, agreement twice, departure ×4 (S5), budgets ×5 (S4), FLT ×6 |
| `C\hard-classifier-dispatch.txt` + `hard-input.eq.json` | to write | sha amendment; the copy diffed against `router40\classifier-dispatch.txt` part A |
| `cue-grader-prompt.A.md`, `.B.md` | to write | sha amendment; calibration pass (§3) |
| `SP\dist-snapshots\main-h40d-2b0906f\` and `main-eq-<H7>\` | to build | the §1 recipe's step checks; sha vs reference or the equivalence fallback |
| flight-eq's `E\eq-cues-export.mjs` (b10) | flight-eq builds it | flight-eq b10's own cases (h40d 47 → 45 + 2, the 05:00 re-smoke 20/20, an empty block named, a missing line INCOMPLETE) + A2.5's review; MUST meet §1F's contract |
| `oc-sim.mjs` (`b467d8c1fc6c63d7`), `oc-flight.mjs` (`2b30bf7813dffa09`) | exist | reproduce §5 / §5F tables |

## 10. Sha256 of revision 5 as read

`PREREGISTER-cue-grading.md` (revision 5): **`a5e8fbf4b4b2aa39171a57218fc176d7d58b67235680818de2d3b2d399880df4`**
(sha256sum, 2026-10-05 16:59 TST; also the hash of this file's starting copy before any rev 6 edit). Inputs as read:
`PREREG-REREVIEW-5.md`, flight-eq's registration `9ca3149b…2d14f44`, A1 `3e3f0ddd…1d863c8`, A2 and
`USER-RULING-4c.txt` (their shas recorded in the amendment that hashes this file).

**Not covered:** no tool, snapshot, probe, classification or calibration has run, so every expectation above is
unproven; whether the permission layer denies a Bash attempt under these flags for THIS launcher (the sister's probes
show it for theirs); whether real graders comply without a shell (g, h); b10's exporter does not exist and may not
meet §1F's contract on first build (then `cue-material-eq.mjs` refuses and FLT waits); FLT's size and EASY count; the
in-app `[Answer] cues:` line position was read in MAIN's working copy, not at `<H>`; the OC tables model independent
blocks; the h40d holdout path's step 0 build is still unrun from rev 5.
