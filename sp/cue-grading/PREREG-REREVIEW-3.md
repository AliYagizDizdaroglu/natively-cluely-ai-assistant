VERDICT: APPROVE WITH FIXES

# Re-check: PREREGISTER-cue-grading.md revision 3 (sha256 8afcd163e8b852d5…, recomputed)

Reviewer: Opus, 2026-10-03 ~22:20 local, read-only. No model or network call. No cue, question or answer text was
read or printed. Only ids, counts and hashes were used. Line numbers refer to rev 3 as hashed above.

What was run:
- `node oc-sim.mjs` (sha256/12 `b467d8c1fc6c`);
- `node rr3-correctness-ids.mjs`;
- an id-only count of the judge and answer files;
- the two `git diff --stat` ranges, `git show 2b0906f:scripts/build-electron.js`, and MAIN's dist sha;
- the sha and part-A id check of `router40\classifier-dispatch.txt`;
- the sister rule `followup-turn\AMENDMENT-A2.md` and its calibration script (grep only).

**Counts: Critical 0, Important 3 (N1–N3), Minor 6 (N4–N9).** RI1, RI3 and m1–m9 are closed. RI2 is partly closed.

## Status of the rev 2 findings

| Finding | Status | Where (rev 3) | Note |
|---|---|---|---|
| RI1 boundary plants as floors | **closed** | L234–247 | There are 20 harm checks, which pass at or below their target, and 6 boundary checks, which pass in band. The trailing-conjunction and true-extra-name checks now fail a harsh grader (0) and a blind one (2). The mutant and check counts add up: 18 + 6 − 2 shared R33 mutants = 22 mutants; 20 + 6 = 26 checks. **The R33-B band conflicts with the rubric's own 0 clause: see N1.** |
| RI2 tool-use VOID always met | **partly** | L22–32, L177–181, L186–210, L273–278 | The allow-list replaces "any read or write". Writes to the grader's own verdicts file never void. The rule matches A2's tokens and its "other blind/verdicts name" clause. **Open:** the only positive control uses the cue bench's naming (`pairs.rN.hN.json` / `verdicts.rN.hN.gN.json`), not this run's `cues.<set>.<cond>.json` / `verdicts.<set>.<cond>.g<g>.json`. The file never says how the script derives the blind name from the verdicts name, and there is no near-miss negative control. That leaves the sister's failure shape: all graders VOID, with an unbounded regrade. See N2. |
| RI3 sha pin needs a pinned build | **closed (design)**; recipe gaps in N3 and N4 | L33–40, L74–87, L345–347 | Verified: `git diff --stat d83fdfe 2b0906f -- electron/llm/verbalStreamFilter.ts` is empty, and `2b0906f..801442d` is `1 file, +11/−1`. 801442d is the only filter commit in that range. The ancestry is d83fdfe → 2b0906f → 801442d. MAIN's filter is uncommitted (` M`), and MAIN's dist still hashes to `42d9bc42dbd17870` (built 2026-10-01 16:37). At 2b0906f, `build-electron.js` has `absWorkingDir: rootDir` with `rootDir = __dirname/..`, `--force` and `bundle:false`, and requires only `esbuild`, `path` and `fs`. 0df3c55 is an ancestor. The build script and package files are unchanged 2b0906f→HEAD. The esbuild in MAIN's node_modules is 0.21.5 (mtime 09-03, before the 10-01 build). `premium/` is tracked, and there are no git hooks. So pinning 2b0906f is justified, and the build is executable. |
| m1 sizes | closed | L41–43, L114–115, L145–147, L298–300; oc-sim L51 | (36, 110). The bounds 32–36 and 98–110 are 39−e and 119−3e at e = 7 and 3. The floors trip at e ≥ 10 (in-app 29 < 30; pooled 89 < 90). |
| m2 GOOD draw, noisy label | closed | oc-sim L17–25, L49; L302–315 | GOOD is drawn among non-EH blocks and a feasibility throw is in place. Noisy is .80 + EH .1755 ≤ 1. |
| m3 v4 disclosure | closed | L47–49, L318–325 | All v4 figures match the output. The low edge's 12.1% is accepted and stated. |
| m4 agreement | closed | L50–52, L223–225, L277–284, L256–257 | It is now per file, with one regrade, and a second miss is final. It is still near-vacuous, which is disclosed as a backstop (L282–284). |
| m5 floor final | closed | L53, L281, L256 | |
| m6 counts | closed | L54–56, L110–118 | The recount matches: in-app c0 = R33 and c1 after pipeline = R08 R12 R13 R22F (4); TWINS-H c1 4 / 1 / 3 as listed, r2 c0 = R02F (pipeline) and R11; TWINS-L c0 = R02F only. Ids: 44 items, 32 mains, 12 follow-ups (R22F2 counts as a follow-up), no R05 anywhere. |
| m7 classifier text | closed | L57–60, L135–141, L336–337 | Source sha256/12 is `33f4da8a2f8b`, 35 lines, mtime 18:50:01. Part A cites no router40 ids. The copy and its sha are still to come, before step 2. |
| m8 r1 R09 | closed | L61–62, L119–120, L215 | |
| m9 cue-introduced wording | closed | L63–64, L219–221, L362–364 | The wider `cons0(consistent)` is used throughout. This is what makes N1 bite. |

### `oc-sim.mjs` against the registration

Every number quoted matches the printed output to the decimal:

| Scenario (v3) | SAFE | FIX | REPORTED |
|---|---|---|---|
| centre | 82.7 | 2.7 | 14.6 |
| low edge | 42.9 | 12.1 | 45.0 |
| high edge | 98.7 | 0.1 | 1.2 |
| bad rule | 0.0 | 93.3 | 6.7 |
| mediocre | 11.0 | 33.6 | 55.4 |
| noisy | 12.0 | 4.0 | 84.0 |

The other quoted figures also match:
- **Rules at the centre (L320):** draft SAFE 41.3, v2 71.4, v4 84.6.
- **v4 elsewhere (L321–323, L47–48):** FIX 0.8 at the centre and 5.6 at the low edge; the bad rule reads FIX 89.3 and noisy graders SAFE 27.9.
- **Counts at (36, 110) (L298–300):**
  - SAFE: consensus-harmful ≤ 2 / 7, either-harmful ≤ 5 / 17, cue-introduced ≤ 1 / 4.
  - FIX: consensus-harmful ≥ 4 / 13, cue-introduced ≥ 3 / 8.
- **Change log (L371–372):** the rev 3 figures 2.7 / 82.7.

The only mismatch is N9, a nit.

## New findings

### Important

**N1. The R33-class condition-B boundary band contradicts the rubric when the planted fact is a number or name (L171–172 vs L240–241).**
- **Scenario.**
  - The rubric's `consistent` 0 includes "states a number or name that is false on its own terms". m9 made this the governing sense (L221).
  - The R33-class plant is "a plausible wrong fact written into both the block and a copy of the answer" (L239). Its B check passes only at consistent ≥ 1 and calls a 0 "the harsh grader's call" (L240–241).
  - If the controller plants a wrong number or name, a grader that recognises it as false and applies the rubric literally must give 0. That grader fails calibration (i).
  - The only repair allowed is instruction wording, "never the rubric's scales" (L248). Wording that tells graders not to apply the rubric's 0 clause contradicts the frozen rubric. So calibration either loops or passes only an instruction that suspends the clause that cue-introduced depends on.
- **Fix (one line at L239).** The R33-class wrong fact is a wrong direction or mechanism (as R33's yes/no was), never a number or a name. Then the own-terms clause cannot apply, and ≥ 1 is the rubric's answer.
  - The alternative is to drop the B check for this class: it is a harm check in A only, and B is not checked. That leaves 25 target checks.

**N2. RI2: the positive control does not exercise this run's file names; nothing pins the derivation (L196–210, L186–187).**
- **Scenario.** This is the sister's failure (A2 L31–34, where the replace-derived pairs name would have flagged all 18):
  - `cue-grader-tools.mjs` derives the own-blind name by replacing `verdicts.` with `cues.`. That yields `cues.<set>.<cond>.g<g>.json`, but the real name has no `.g<g>`.
  - Every grader's legitimate Read of its blind file is then "a Read of any other path", so every grader is VOID.
  - Calibration (a) is a Thursday cue-bench transcript, whose names are `pairs.rN.hN.json` / `verdicts.rN.hN.gN.json` (checked in `cuebench\blind\`). It needs a separately supplied mapping, so it reads ALLOWED and cannot catch this.
  - The §5.1 repair then regrades "until a pinned, ALLOWED transcript exists" (L277–278), which never happens. That is the "always met" shape again.
- **Also missing:** a near-miss negative control. Grader `g1` of `cues.inapp.A.json` reading `cues.inapp.B.json` (the other condition's file, which carries the spoken answer) or `verdicts.inapp.A.g2.json` must read VOID. A2 has the analogue as its control (iii). A prefix or `includes` match would let these through.
- **Fix.**
  1. State the derivation: the blind name is the verdicts name with `verdicts.` replaced by `cues.` AND `.g<g>` removed. Better, read both names from `cue-material.mjs`'s dispatch manifest.
  2. Add the following to the calibration, each with its expectation written first:
     - (a′) a fixture under this run's exact names and its real `SP\cue-grading\blind\` directory, with a Read of the own blind file, a Write of the own verdicts and one `cd <blind dir> && node -e …` validation naming both → ALLOWED;
     - (d) the same grader reading the other condition's blind file → VOID;
     - (e) a Bash naming its own verdicts file and the other grader's verdicts file → VOID.

**N3. The build recipe does not name its git and removal commands; one reading disturbs MAIN (L82).**
- **Scenario.**
  - "A detached checkout of `2b0906f` under the scratchpad" admits two unsafe forms:
    - `git -C MAIN checkout 2b0906f`, which moves MAIN's HEAD and working tree;
    - `git --work-tree=<SP dir> checkout 2b0906f -- .`, which rewrites MAIN's shared index (memory `tooling_commit_shared_index`).
  - "The checkout removed" with a MAIN `node_modules` junction inside it is also a risk:
    - a recursive delete that follows junctions (Windows PowerShell 5.1 `Remove-Item -Recurse` is the known risk class) can empty MAIN's `node_modules`;
    - this was not exercised here (read-only).
- **Fix.** Name the commands:
  - Either `git -C MAIN worktree add --detach <SP>\build-2b0906f 2b0906f`, which writes only `.git/worktrees/` (MAIN's index and working tree are untouched), and later `git -C MAIN worktree remove --force <dir>` after unlinking the junction;
  - or `git -C MAIN archive 2b0906f | tar -x -C <dir>`, which touches no git state at all.
  - Create the junction with `New-Item -ItemType Junction` or `mklink /J`. Before removing anything, delete the junction alone (`cmd /c rmdir <dir>\node_modules`). Then check that `MAIN\node_modules\esbuild\package.json` still exists.

### Minor

- **N4 (L40, L84).** The reference copy has not been taken yet.
  - §0 says it "is also taken now", but `C\` holds no `ref-verbalStreamFilter.*`. MAIN's dist is still `42d9bc42dbd17870` at 22:20.
  - Any MAIN rebuild before step 0 loses it: MAIN has 801442d plus an uncommitted filter edit.
  - The case where the reference copy is refused is undefined. Say that without a reference, the snapshot must hash to the registered `42d9bc42dbd17870` exactly, or the work stops.
  - Take the copy first.
- **N5 (L277–278).** The tool-use and pin repair is unbounded ("until … exists"). Cap it, for example at 2 regrades per file, after which the reading is VOID (reported, final). That avoids an endless loop, which N2 would otherwise cause.
- **N6 (L27 vs L199, L181).** §0 says "one Bash call allowed", while §3 allows any Bash call that meets the rule, and A2 allows "one or more". Align §0 with §3: one or more, each meeting the rule, and one failing call voids.
- **N7 (L200–201).** The Bash denylist was copied verbatim from a material with different file names.
  - `key.blind` is the sister's key naming. This run's key file names are unstated, so they are caught only through `keyhold` in the path.
  - The answer-bearing files of this material are not listed: `interview60.judge` (the pairs carry `answer`), `natively_debug`, `interview60.runs`. A condition-A grader's validation Bash could name them and still read ALLOWED.
  - Add them. Reads are already exact-allow-listed, so this concerns Bash only. The residual risk of an unsound denylist is the same as A2's, which was accepted there.
- **N8 (L114–115).** `39 − e` and `119 − 3e` assume that no excluded main is EASY. The excluded mains are pipeline R31, inherited R33, and r2's R11. If one of them is classified EASY, it is subtracted twice. Define e as the EASY mains that are not already excluded. This is expectation arithmetic only; `cue-decide.mjs` counts directly.
- **N9 (L45–46).** "Conclusions unchanged within 2 points" is slightly off. Noisy REPORTED moves 86.5 → 84.0 (−2.5), and draft centre SAFE 38.9 → 41.3 (+2.4). The noisy row is a relabelled scenario, so say "within 2.5 points" or name the exception. No conclusion changes.

## Not checked

- **The build itself was not run.** So the prediction that the snapshot will hash to `42d9bc42dbd17870` is unproven, as is any effect of CRLF line endings under `core.autocrlf=true` on the output. The fallback rule covers a mismatch.
- **The junction-removal behaviour (N3) was not tested;** it is flagged as a risk class.
- **No Thursday cue-bench grader transcript was opened.** So whether one of them holds a validation Bash, which calibration (a) needs, is unknown. The fixture fallback is registered.
- **`cue-grader-tools.mjs`, `cue-material.mjs` and `cue-decide.mjs` do not exist yet.** All findings here are against the text.
- **No material text was read.** That includes cues, questions, answers, the rubric files and the classifier text beyond its section markers and id pattern.
- **The sister scripts' implementation was not audited.** Only the A2 rule text and its calibration list were read.
