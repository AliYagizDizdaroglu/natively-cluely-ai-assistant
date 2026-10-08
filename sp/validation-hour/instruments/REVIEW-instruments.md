# REVIEW-instruments.md: Opus review of the h40d flight instruments against PREREGISTER-h40d.r4.md

Saved by the controller from the Opus reviewer's reply (2026-10-01 ~16:05; the harness refuses subagent report
files). Condensed only where the reply repeated calibration output already in the builders' cal files; every
finding, fix, decision and amendment is verbatim in substance.

**VERDICT: READY WITH FIXES.** 0 Critical, 2 Important, 10 Minor. Fix I1 before the dry twin is registered. Make
the GRADER DRIFT (i) naming in I2 a dated amendment before arming. The Minor items are amendments or notes.

Reviewer scratch: `VH\instruments\review-scratch\` (`bytes.mjs`, `guard-cases.mjs`, `wrong-folder.mjs`). The real
`%TEMP%\natively-h40d-launcher-error.log` was never created.

## Re-runs (all equal the builders' cal files; no expected answer adjusted to output)
- h40d-twins: case 1 h40c exit 0 (band cue [36,38] vs control [36,37], gated 0/0/0 vs 1/0/0, all-ids 1/0/2 vs 2/1/2, hole R10); case 2 h40b --strict exit 0; cases 3/9 bench present 38/39,39/39,39/39, shaped 38/39,38/39,39/39, S2Q06F NO-TEXT RECORD; filter sha 42d9bc42dbd17870 MATCH.
- h40d-rule3: h40c 35 of 45, gap 1 WITHIN; h40b 35; h40a 3b FAIL (R09) exit 1; h40c --demote 2 -> 33, NOT MET exit 1.
- hascuerule-check: re-smoke 19/19 true; --mutate-one 18/19 false; holdout40 0 ids false; h40c 0/44 false; MAIN today refused (no hasCueRule export).
- grader-models: PINNED / NOT PINNED (Sonnet) / NO TRANSCRIPT / found by SEARCH, as calibrated.
- guard-h40d (stub repo): GUARD OK; hedge 1 -> (6); wrong commit/placeholder -> (10b); settings off/absent -> (13); fifth case = I1.
- Launchers from a wrong folder -> exit 9 each; h40d-merge.cmd -> 13 with args, 12 without.
- Bytes: four .cmd CRLF only (79/67/106/61), no bare LF, no byte >126, no BOM, final CRLF; two .ps1 ASCII LF.
- dist-proof --root . crashes (ERR_INVALID_ARG_VALUE); absolute root -> THE COMBINED BUILD, filter 42d9bc42dbd17870.

## Findings

### I1 (Important): the launcher clears 9 of the 31 NATIVELY_* names the code reads; guard 10a scans .env for only 6
Files: `VH\launch-h40d.cmd` 29–37 (same block in -dry and -prestart, source `launch-h40d-src.txt`); `VH\guard-h40d.mjs` 288.
Evidence: 31 names read in WT (e.g. NATIVELY_LIVE_MODEL GeminiLiveRouter.ts:62, NATIVELY_FIRST_TOKEN_TIMEOUT_MS geminiThinking.ts:47, NATIVELY_TURN_* interviewerTurn.ts:33–38, NATIVELY_DETECTOR_CHAIN_TEST/_QUESTIONS IntelligenceManager.ts:120–132, NATIVELY_GEMMA_*). main.ts:6 dotenv does not override, so .env fills any name left unset. guard-cases "unguarded overrides set" -> exit 0 GUARD OK. Latent (none set today per builder D).
Fix 1, launch-h40d-src.txt common section, after `set NATIVELY_FOLLOWUP_PARENT=` add (no trailing spaces):
```
set NATIVELY_LIVE_MODEL=
set NATIVELY_LIVE_MODE=
set NATIVELY_AUTOSTART_MEETING=
set NATIVELY_CAPTURE_PROMPTS=
set NATIVELY_QUESTION_DETECTION_MODEL=
set NATIVELY_FIRST_TOKEN_TIMEOUT_MS=
set NATIVELY_TURN_GATE_MS=
set NATIVELY_TURN_SETTLE_MS=
set NATIVELY_TURN_UNFINISHED_HOLD_MS=
set NATIVELY_TURN_CONTINUATION_MS=
set NATIVELY_TURN_MAX_HOLD_MS=
set NATIVELY_TURN_WORDLESS_GRACE_MS=
set NATIVELY_DETECTOR_CALIBRATE=
set NATIVELY_DETECTOR_CHAIN_TEST=
set NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS=
set NATIVELY_GEMMA_TTFT_MS=
set NATIVELY_GEMMA_MAX_ATTEMPTS=
set NATIVELY_GEMMA_VISION_TTFT_MS=
set NATIVELY_GEMMA_VISION_TTFT_BASE_MS=
set NATIVELY_GEMMA_VISION_TTFT_PER_IMAGE_MS=
set NATIVELY_GEMMA_VISION_MAX_ATTEMPTS=
set NATIVELY_API_URL=
set NATIVELY_BUILD_ALL_MAC_ARCHES=
set I60_PROBE_DEADLINE_MIN=
```
then gen-launchers.mjs, --check, launchers-cal.mjs.
Fix 2, guard-h40d.mjs 288: ENV_NAMES_GUARDED adds NATIVELY_LIVE_MODEL, NATIVELY_FIRST_TOKEN_TIMEOUT_MS, the six NATIVELY_TURN_*, NATIVELY_DETECTOR_CALIBRATE, NATIVELY_DETECTOR_CHAIN_TEST, NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS, the six NATIVELY_GEMMA_*, NATIVELY_STT_PROVIDER, NATIVELY_ROSTER, NATIVELY_SCENARIOS (.env scan only; the launcher sets the last three). AUTOSTART_MEETING, LIVE_MODE, CAPTURE_PROMPTS stay out (run.mjs:280 sets them in the app env). Re-run guard-h40d-cal.mjs; re-point mutants touching line 288.
Caveat: if MAIN's .env declares an added name, the dry twin will refuse; decide by dated amendment (remove or allowlist as h40c's configuration), never silently. Find out at arming through the dry twin.

### I2 (Important): GRADER DRIFT choice (i) has no tag/file/merge target; the obvious merge overwrites h40c's judge file
File: `VH\h40d-grader-dispatch.txt`; r4 §6. Fix: amendment A7. Nothing needed under default (ii), but the amendment must exist before arming.

### Minor
- M1 launch-h40d.cmd 57/74: r4 writes `--root .` (crashes); launchers pass `--root "%CD%"`: sound, amend r4 (A1).
- M2 h40d-twins.mjs 402/89: --dist defaults to WT; Friday must pass `--dist <MAIN>`, or record the value in the result note.
- M3 launch-h40d.cmd 40: findstr `[a-f]` collation lets A–E pass; backed by guard 10b and the generator. Note only.
- M4 guard-h40d-git.mjs 18–28: 10b scope and four extra allowlisted untracked paths beyond r4: sound, amend (A3).
- M5 h40d-rule3.mjs 213: the 3d item-to-winner join is not built; unnamed items read as 3.5-lite wins. Build it Friday from `h40d-clocks.mjs --list` and the pairs' dispatchedAt; pass every 3.1-lite win as `<id>=gemini-3.1-flash-lite`; list them in the note.
- M6 h40d-twins.mjs 297–303: missing id -> REFUSED exit 2; treat as INCOMPLETE under §5 item 4 (A9).
- M7 register-h40d.ps1: nothing stops `-Which flight` before the dry twin's GUARD OK (procedure); file is in VH not SP (A4); no shell env leaks into the task.
- M8 h40d-precheck.ps1: lacks logged-on, sleep-never, restart-pending, Context toggle checks (by hand at 13:24); line 20 does not refuse when $m resolves to nothing.
- M9 unpinned SP dependencies (dist-proof.mjs, guard-r09.mjs, cuebench-score.mjs): record sha256/16 in "What flies" at arming.
- M10 h40d-grader-models.mjs 19–23: the `<synthetic>` placeholder ruling is the builder's; sound; amend (A8).

## Declared deviations
A guard: sound except the 10b scope/allowlist (M4). B twins: --dist sound (M2); gated n follows the files, sound (state it, A9); empty prose with no cue block -> all-ids only, sound; missing id REFUSED -> amend (M6). C: merged judge files only, extra hasCueRule lines, --flight until the merge, --floor/--demote: sound; `<synthetic>` amend (M10). D: --root "%CD%" amend (A1); @@…@@ placeholders sound (A5); prestart commit = MAIN HEAD at prestart, sound (A5); extra wav:check and proofs, precheck -ReadOnly/-Label, merge's judge-script check: sound.

## Controller decisions (reviewer's view)
1. Env block: clear all, plus I60_PROBE_DEADLINE_MIN; none must stay uncleared. STT_PROVIDER and ROSTER are the only ones the flight sets with a value; NATIVELY_FLIGHT_COMMIT is the launcher's own; AUTOSTART_MEETING, LIVE_MODE, CAPTURE_PROMPTS are set by interview60.run.mjs:280 in the app env; NATIVELY_LIVE_MODEL is set by interview60.flight.mjs:305 only when its live probe picks the fallback. Clearing alone does not stop dotenv refilling from .env; the 10a extension is the other half.
2. natively_debug.log copy: either reading valid; reviewer prefers the prestart launcher (removes the window in which a hand-started app rotates the log):
```
if not exist "<VH>\2026-10-01-prestart-h40d" mkdir "<VH>\2026-10-01-prestart-h40d"
copy /y natively_debug.log "<VH>\2026-10-01-prestart-h40d\natively_debug.log" >> electron\test\golden\interview60.runs\flight-h40d-prestart.launcher.log 2>&1
```
   If it stays a controller step: copy before any other app start, match the logged dir fingerprint; write who copied into "What flies".
3. GRADER DRIFT (i): fix the names now (A7); never merge the re-grade into h40c's run folder.

## Seams not built, and checks that wait
- Not built: 3d winner join (M5); 13:24 logged-on/sleep/restart/Context checks (M8); the .env scan for the I1 names (the extended guard).
- After merge + rebuild: `node SP\dist-proof.mjs --root <MAIN> --expect combined --prefix-count 3 --offers-marker "offers block before the spoken answer"`; `node VH\instruments\B-twins-cases.mjs` (X6g); `node VH\instruments\run-cal-C.mjs hascuerule`, then `NATIVELY_ROSTER=scenario50 NATIVELY_SCENARIOS=S1 node VH\h40d-hascuerule-check.mjs <05:00 prompts.json>` without --flight (19 of 19 true); `node VH\h40d-twins.mjs VH\instruments\twins-bench --cue gemini-3.5-flash-lite_cues --answers-only --dist <MAIN>`; after the I1 edits `guard-h40d-cal.mjs` and `launchers-cal.mjs`.
- At arming: gen-launchers --prestart-commit <HEAD>, then --commit <registered HEAD>, --check --armed; dry twin -> GUARD OK + every marker as expected (check 13's and the I1 .env scan's first real run); register read-back (Ready, StartWhenAvailable False, next run 13:30); error log absent.
- After the prestart: PROBE READY; app:start/probe/app:stop exit 0, WAIT timestamps ~60 s apart; `h40d-precheck.ps1 -At <now> -ReadOnly`; the copied log's lines; `node SP\check-smoke-cues.mjs prestart-h40d --runs VH`; `node VH\h40d-clocks.mjs VH\2026-10-01-prestart-h40d --whole-log` (0 charged); the after-run dist proof.

## Privacy
Every run printed only ids, counts, model ids, hashes, paths and classes. .env and credentials.enc not read. Builders' leak scans relied on, not re-run. Never pass `--reasons` to h40d-rule3.mjs on Friday.

## Amendments r4 needs (dated at application)
- A1 (§2 Build row, §7.4 launch bullet): "`node SP\dist-proof.mjs --root . --expect combined`" -> "`node SP\dist-proof.mjs --root "%CD%" --expect combined` (an absolute root: `--root .` crashes dist-proof.mjs, reviewer 2026-10-01)".
- A2 (§2 Configuration row), append: "The launcher also clears every other `NATIVELY_*` name the source reads (the list in `launch-h40d-src.txt`) and `I60_PROBE_DEADLINE_MIN`. The guard's `.env` scan covers all of them except the three the harness sets explicitly in the app's environment (`NATIVELY_AUTOSTART_MEETING`, `NATIVELY_LIVE_MODE`, `NATIVELY_CAPTURE_PROMPTS`)."
- A3 (§7.4 guard bullet, 10b), after "the allowlisted paths": "scoped to `electron src premium scripts package.json natively_debug.log.1`; the allowlist adds h40c's four untracked scratch paths `electron/test/golden/openrouter-probes/`, `openrouter.probe.mjs`, `zai-probes/`, `zai.probe.mjs`; files outside the scope never refuse".
- A4 (§2 Task row): "`SP\register-h40d.ps1`" -> "`VH\register-h40d.ps1 -Which flight|dry|prestart -StartAt <local ISO>`".
- A5 (§2 Configuration row and §7.3): "`NATIVELY_FLIGHT_COMMIT` holds the token `@@REGISTERED_HEAD_FULL_HASH@@` until `gen-launchers.mjs --commit` fills it; the prestart's holds MAIN's HEAD at prestart time (`--prestart-commit`), because the registered HEAD does not exist yet."
- A6 (§7.3, Required afterwards): "copied after `app:stop` by <the prestart launcher | the controller, before any other app start, matched to the launcher log's `dir` line> into `VH\2026-10-01-prestart-h40d\natively_debug.log`".
- A7 (§6, option (i)), append: "The re-grade's tag is `h40c-regrade`, its verdicts file `VH\h40d-verdicts-h40c-regrade.json`. It is merged with `--model <new id>` into a COPY of h40c's run folder at `VH\h40c-regrade-run\` (its `interview60.timeline.json`, `natively_debug.log` and `interview60.judge.pairs.json` copied), never into h40c's own folder. The new floor is `h40d-rule3.mjs VH\h40c-regrade-run`'s ACCEPTABLE (items) count."
- A8 (§7.4 grader-models bullet), append: "A `<synthetic>` assistant record (the client's API-error placeholder, 0 tokens) carries no model identity: it is counted and printed, and does not make an agent mixed."
- A9 (§4 Counting rulings), append: "3c's gated clause covers the gated ids the twin files hold (39 when R05 is lost). A twin file that lacks an id another rep holds makes 3c INCOMPLETE (the adapter prints REFUSED, exit 2), never a reading."
