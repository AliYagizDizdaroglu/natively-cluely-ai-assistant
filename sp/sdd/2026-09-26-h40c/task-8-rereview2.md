ALL ADDRESSED

# Task 8 re-review 2: fix round 2

Reviewer: Opus. Scope: the controller's rulings on N1-N11 and M8, plus anything the fixes introduced. Files as of 19:41-19:47. MAIN HEAD is e94305a; the arm-removal commit landed at 19:52.

What I ran, all read-only or scratchpad-only:
- `h40c-hedge-stats.mjs` on five existing fixtures: synthetic, the h40b copy, void-n1-notvoid, void-n1-void, void-c (stdout only; no fixture rebuilt).
- `guard-h40c.mjs` against real MAIN, from a node child with `cwd` = MAIN, in four environments. Stdout only. Nothing was started or registered, and no model was called. The guard reads `.env` in-process and prints names only.
- `git log`, `git status`, `git check-ignore`, `git diff`, the `Get-ScheduledTask` list, and PSParser.

## Status of each finding

- **C1: addressed.** VOID (c) now divides by hedge runs; see N1.
- **N1: addressed.**
  - Script: `hedgeRuns = front.length`, `frontErrorShare = frontErrorCount / hedgeRuns` (h40c-hedge-stats.mjs:179-185).
  - Pre-registration :90-93 says "hedge runs — counted as `verbal hedge: front=` lines across the hour, not back-starts".
  - The two ruled calibration cases, re-read on the existing fixture dirs:
    - 10 runs, 2 front-error → `hedgeRuns 10`, share 20%, **not void**. The old back-start denominator would have given 2/2.
    - 10 runs, 5 front-error → 50%, **VOID**.
- **N2: addressed.**
  - The pre-registration (:22-29) and the launcher (launch-h40c.cmd:6-8) now say 6c50ec3's replay **FAILED** (wrong 0 → 1, acceptable 16 → 22, 51e349d). This matches the 51e349d message.
  - `SessionTracker.addAssistantMessage` is named. `withParentExchange` checks the flag before reading history (followUpParent.ts:33), so "never runs while the flag is off" holds in effect.
  - Commit list (:6-45): e311019 (harness), 6c50ec3 (app, off), da28f25 (app, on this hour), 51e349d and 18242df (docs), `ARM_COMMIT_HASH` (harness), then the pre-registration's own commit. This matches `git log 07a0e5e..HEAD`. The token is still literal and should become **e94305a** ("fix(flight): … no Groq arms", 19:52:48).
- **N3: addressed.**
  - Rule 2 (:109-124) and the "Not covered" bullet (:208-216) now say an error with no token redirects (up to four requests), while both-empty ends quietly with one charged failure.
  - The fixture has a real redirect in window 3, charged 0: front 503 → `back started … reason=front-error` → `no answer - front error, back empty` → redirect → `(fallback)` → second `front=` → won by.
  - Window 4 is a terminal `front empty, back empty`, charged 1.
  - Wording nit: see R5.
- **N4: addressed.** `p90CeilingS: 13.608` (stats:48); pre-registration :105-108. The h40b copy now reads `p90 PASS` against its own reproduction (13.608 s).
- **N5: addressed.**
  - A failure is a window with a failure line and no won-by, charged once per window (stats:156-161). Windows with both lines are counted as `ambiguousFailures` and printed.
  - The made-up "Stream failed: aborted for a fuller supersede" line is gone.
  - Fixture window 6 has a stale `front empty, back empty` before its own won-by: 1 ambiguous, 0 charged.
  - The pre-registration states the edge inside rule 2 (:117-122). One case the text does not cover: R2.
- **N6: addressed.** `DOTENV_NAME = /^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)/` (guard:174) has the same name shape as dotenv 17.3.1's LINE regex. On real MAIN the guard printed ".env carries none of the guarded names".
- **N7: addressed.**
  - Check 11 imports `ANSWER_MODELS` from `interview60.flight.mjs`, which has no import-time side effects (`main()` is guarded at :335), and fails on "/" (guard:221-228).
  - `NATIVELY_QUESTION_DETECTION_MODEL` is in 10a's names and has a direct `process.env` check (guard:170 and :188).
  - The dry-twin comment is fixed (launch-h40c-dry.cmd:7-13), and no flight dry-run was added.
  - On real MAIN: the detector override set in the process gave `GUARD FAILED: NATIVELY_QUESTION_DETECTION_MODEL is set …`, and the correct environment gave GUARD OK listing the two lites.
  - Absent-export gap: R1.
- **N8: addressed.** Start = the timeline's own playback timestamp (:148-150). An out-of-window hour cannot PASS but can still VOID or FAIL on rule 3 (:156-159). Wording nit in R5.
- **N9: addressed.** No review labels (C/I/M/N numbers), "Task n", scratchpad paths, `.mjs` names or "fix round" remain (grep, zero hits). R07F now reads "would be attributed, not graded" (:16-18). Leftovers in R5.
- **N10: addressed.** A window without a won-by gets the label `'none'` (stats:144). The h40b copy prints `{"none":44}`; the synthetic superseded window prints `none`.
- **N11: addressed.**
  - Blocking item 2 (:185-192) requires the dry twin as a scheduled task with the final hash and GUARD OK, and states the freeze.
  - `NATIVELY_FLIGHT_COMMIT?.trim()` (guard:198).
  - On real MAIN at e94305a, run from this session's environment (not the task's):
    - a padded commit → **GUARD OK**, with checks 8, 10a, 10b and 11 all live;
    - an all-zero commit → `GUARD FAILED: MAIN HEAD is e94305a…`;
    - unset → `GUARD FAILED: NATIVELY_FLIGHT_COMMIT is not set …`.
  - The task-environment run is still required: the blocking item stands.
  - The launcher logs are gitignored (`.gitignore:258 electron/test/golden/interview60.runs/`), so the launcher's own `wav:check` log written before the guard cannot dirty the check-10b status.
- **M8: addressed.** The header example uses the absolute `'<SP>\register-h40c.ps1'` (register-h40c.ps1:24). ASCII, and PSParser reports 0 errors.
- **Launchers: fine.** Both are CRLF (58/0 and 61/0), ASCII, and have no parentheses in echo lines. The dry twin differs from the real launcher only in comments, log names, and the missing final flight call.

## New findings

Critical: none. Important: none.

### Minor

**R1. Check 11 passes on an absent value.**
- **Where:** guard-h40c.mjs:227: `(flightMjs.ANSWER_MODELS ?? []).filter(...)`.
- **Problem:** if the export were renamed or removed, `[]` has no "/" id and the check passes. GUARD OK would then print `ANSWER_MODELS = undefined`. The HEAD pin and e94305a's tests make this unlikely, but the check does not answer differently when its premise is false.
- **Fix:** fail unless the export is an array exactly equal to `['gemini-3.1-flash-lite','gemini-3.5-flash-lite']`. That is also what the PAIRED_ARMS indexes [0] and [1] rely on.

**R2. "Ambiguous" also hides a failure of the window's own answer after its first token.**
- **What happens:** the first token logs `won by`. If the stream then errors, `withVerbalFallback` rethrows (`started`, WhatToAnswerLLM.ts:76), and generateStream logs `Stream failed` and appends "[No answer — …]" (:419-429). That window has both lines, so it is classed ambiguous and never charged.
- **Why it matters:** the pre-registration says every such window is a stale straggler "(its own answer was delivered)" (:117-122). That is false in this case. It is also more lenient than h40b's raw `Stream failed` count, which this case would have charged.
- **Fix:** before the commit, decide how an ambiguous window is resolved. For example, charge it when that window's own `[Answer] full:` line (SessionTracker.ts:244) carries "[No answer —" or the "Could you repeat that?" fallback. Or state that rule 2's failure clause cannot read PASS while any ambiguous window is unresolved.

**R3. Blocking item 1 cannot be executed as written.**
- **Problems:**
  - `smoke-turn.mjs` writes no `interview60.timeline.json`, so the stats script throws "missing …timeline.json".
  - The smoke restarts the app per segment, which resets `natively_debug.log`. Only the per-segment copies Task 7's launcher makes survive (`interview60.runs\smoke-hedge-{forced,default,off,refuse}.natively_debug.log`).
  - `verbal-diag.log` is not split per segment.
- **Fix:** give the recipe in the item:
  - use the `default` segment's copy (its startup line should read `on trigger=5000ms`; `forced` reads `on trigger=1ms` and VOIDs by design);
  - build a timeline with `startDebug` = byte offset of the first `dispatch: answer` line (after the startup line) and `endDebug` = file size;
  - bracket the diag offsets for that segment, or note that first-token numbers are pooled across segments.

**R4. The freeze starts at the wrong point.**
- **Contradiction:** :45 makes "this pre-registration's own commit" the registered HEAD, but :189-192 freezes MAIN only "once the real flight is registered". Any commit between the pre-registration commit and registration, for example recording blocking-item outputs in `passes/`, makes :45 false and forces a new `NATIVELY_FLIGHT_COMMIT`.
- **Fix:** freeze from the pre-registration's commit to the hour, and keep the blocking items' outputs outside MAIN.

**R5. Wording, while the file can still change.**
- :35, :112 and :208 say "BOTH legs end in an ERROR". The code redirects when neither leg produced a token and *either* errored (LLMHelper `if (f.kind === 'error') throw …; if (b.kind === 'error') throw …`). The fixture's own redirect is `front error, back empty`.
- :141-142: "too few of the hour's hedge runs ever reached the front= line" should be "too few answer-dispatch windows ran the hedge (had a front= line)".
- :158: "FAIL on rule 1 (VOID)" contradicts rule 1's "VOID, not FAIL".
- :198: "leg 3" should be "rule 3".
- "the controller" appears at :43, :177 and :182. At :43, the whole parenthetical "(harness — placeholder; the controller fills in the real hash before committing this file)" must be replaced along with the token, or the committed file keeps a stale instruction next to e94305a.
- The median ceiling uses the rounded 5.0 s (+1.0) while p90 now uses h40b's exact 13.608 s. Choose one precision for both (exact would be 6.026 s).
- 51e349d's one-line gloss: that commit carried the pre-registration twice; 18242df put the result note in place.

**R6. Rule 2 reads "n/a", not FAIL, on a missing measurement.**
- **Problem:** with no `first token` lines in the diag slice, stats:244-245 prints `median n/a, p90 n/a` and failures PASS (seen on the void fixtures, which also print the cosmetic "n/as"). This could happen from a mis-sliced or uncopied `verbal-diag.log`, and the latency rule would never FAIL.
- **Fix:** print INCOMPLETE and state that rule 2 cannot hold when `firstTokenN` is well below the number of windows with a won-by (for example, less than 90%).

Counts: every ruling on N1-N11 and M8 is met. New: Critical 0, Important 0, Minor 6.
