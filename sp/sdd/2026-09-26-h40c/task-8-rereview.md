NOT ALL ADDRESSED

# Task 8 re-review: fix round 1

Reviewer: Opus. Scope: the fixes to the original findings (C1, I1-I10, M1-M10), the Groq-arm addendum, and anything new the fixes introduced.

What I checked, all read-only:
- the files as they stood at 19:12-19:22;
- MAIN at HEAD 18242df;
- `h40c-hedge-stats.mjs` on the h40b copy and on the rebuilt synthetic fixture (stdout only);
- `guard-h40c-git-cal.mjs`, which passed 6/6;
- `Get-ScheduledTask` and User/Machine environment lookups (set/unset only);
- `.env` variable names only; no value was read.

Nothing was started, registered, or sent to a model.

## Status of each original finding

- **C1: NOT addressed (1 of 3 parts wrong).** VOID (a) and (b) match the ruling, and rules 2-3 are always reported. VOID (c) does not. The ruling says "≥ 50% of *hedge runs* `reason=front-error`". Both texts divide by back-starts instead:
  - the pre-registration (PREREGISTER-h40c.md:76-78) says "at least 50% of `verbal hedge: back started` lines";
  - the script (h40c-hedge-stats.mjs:162) computes `frontErrorCount / backStarted.length`.
  See new finding N1.
- **I1: addressed.** PREREGISTER:49-65 and guard-h40c.mjs:12-36 now state what the guard proves and what it does not. Check 10a covers the `.env` gap; its parser has a gap of its own (N6). Task 7's `smoke-turn.mjs` does use `run.mjs app:start` (lines 77-79), so "same app:start chain" is true.
- **I2: addressed.** h40c-hedge-stats.mjs:84-86 reads the line from `[0, startDebug)` and takes the last match. The rebuilt fixture has the line at byte ~64 with `startDebug=269` and reads `on trigger=5000ms`. Fixture void-a2 (no line at all) reads VOID. On the h40b copy it prints "not observed" and VOID.
- **I3: addressed.** h40c-hedge-stats.mjs:130-138 computes the share per window: the last won-by, compared by exact string, divided by windows that have a won-by line. The synthetic fixture gives "2 of 4 (50%)", which is correct.
- **I4: addressed as defined.** Failures = `Stream failed` plus `no answer - front empty, back empty`, with superseded windows excluded (h40c-hedge-stats.mjs:146-150; PREREGISTER:90-95). Two problems remain in how it is explained and calibrated: N3 and N5.
- **I5: addressed as ruled.** The three commits are named, the floor stays 35, and the e311019 bias is stated (PREREGISTER:6-30). The 6c50ec3 entry is now factually wrong, and the commit list is incomplete (N2).
- **I6: addressed.** Start at 13:30 local on the day the user names; daytime window 12:00-15:00; a PASS licenses only a separate reviewed default-on commit; grader pinned to claude-opus-5-5; result file `passes/<flight-date>-h40c-result.md` (PREREGISTER:3, :116-128). What an out-of-window hour means is not defined (N8).
- **I7: addressed.**
  - `-StartWhenAvailable` is gone (register-h40c.ps1:50).
  - `-StartAt` is Mandatory (:31).
  - The header now matches the live tasks: Get-ScheduledTask shows h40a and h40b both at StartWhenAvailable=False, 5 h, WakeToRun.
  - Settings are read back from the task (:61-65).
  - The file is ASCII and PSParser reports 0 errors.
- **I8: addressed, with one justified deviation.**
  - 10b fails when `NATIVELY_FLIGHT_COMMIT` is unset (guard:185) and fails when HEAD differs (:192).
  - The whitelist adds the four untracked probe files the plan already lists as the user's known files. They are untracked `.mjs` that esbuild never compiles. The real `git status` today also shows the controller's in-progress README/flight.mjs/flight.test.ts edits, which will be clean once committed.
  - The predicate passes its calibration 6/6, including a negative case.
  - Neither 10a nor 10b has ever run against MAIN (N11).
- **I9: addressed.** The quota section is at PREREGISTER:130-144 with corrected counts (3.1-lite ≈ 270, 3.5-lite ≈ 243), the fly-on-a-clean-day rule, and the ledger. `SP\quota-ledger.mjs` exists. The committed text points at scratchpad paths (N9).
- **I10: addressed.** PREREGISTER:146-152 makes calibrating the stats script on the smoke's log a blocking item before arming.
- **M1: addressed.** guard:150 requires `HEDGE_WINNER` or `\(hedge\)__`. MAIN's real dist `WhatToAnswerLLM.js` has both at line 52 (and `HEDGE_WINNER` at 115), so the new check passes on the real build. The JSDoc prose alone no longer satisfies it.
- **M2: addressed.** guard:136-139 and :154-159.
- **M3: addressed.** Both `.cmd` files are CRLF (56/0 and 57/0 bare LF), ASCII, and have no parentheses in if-block echoes. The dry twin exists. Registering it is not on any blocking list (N11).
- **M4: addressed.** `fileURLToPath` at h40c-hedge-stats.mjs:243.
- **M5: addressed.** `FRONT_MODEL === ` exact compare at :44 and :137.
- **M6: addressed.** PREREGISTER:97-100.
- **M7: addressed.** PREREGISTER:103-107: a per-item band from the model that won the item, plus the combined band; neither gates.
- **M8: mostly addressed.** The real settings are printed (register-h40c.ps1:61-65). Nit: the header example (:24) still uses a relative `-File register-h40c.ps1`.
- **M9: addressed.** The DRAFT banner and the verification appendix are gone from the pre-registration.
- **M10: addressed.** PREREGISTER:142-144: no full-Flash sidecar; if one runs, it uses Task 4's blind builder and is descriptive only.
- **Addendum (Groq answer arms): stated but not proven mechanically.**
  - PREREGISTER:37-42 drops `qwen/qwen3.8-27b` and `openai/gpt-oss-120b` and keeps the app's Groq detector `openai/gpt-oss-20b` as part of the app under test.
  - The registered commit is a placeholder in both launchers (`NATIVELY_FLIGHT_COMMIT=REPLACE_WITH_FINAL_HEAD_BEFORE_ARMING`), which fails closed.
  - Nothing mechanically proves the arm list or the detector model at the registered commit (N7).

## New findings

### Critical

**N1. VOID (c) divides by back-starts, not by hedge runs. It can void a healthy fast hour and throw away a real FAIL.**
- **Where:** PREREGISTER-h40c.md:76-78; h40c-hedge-stats.mjs:162 and :167.
- **Deviation:** the controller ruled "≥ 50% of hedge runs".
- **Why this matters:** in a fast hour, back legs are rare. The probe's H1 and H3 started 3 and 4 back legs in 39 answers (2026-09-25-hedge-probe-result.md:14, :20).
- **Failure scenario:** 44 hedge runs. 3.5-lite answers inside 5 s except two trigger back-starts and two HTTP 503 bursts. Two of four back-starts are front-error = 50%, so the hour is VOID and re-flown. By the ruling's denominator it is 2 of 44 = 5%, not void. If that hour failed rule 3 (quality, since 3.5-lite wrote nearly every answer), the VOID excuses the failure, which is exactly the C1 class of problem.
- **Why calibration missed it:** h40c-void-cal.mjs:84-104 uses 2 runs with 2 front-error back-starts. Both denominators give 100% there, so the calibration cannot tell them apart (rule 8).
- **Fix:**
  - Denominator = hedge runs (count of `verbal hedge: front=` lines), or windows with a `front=` line. Change the pre-registration text to match.
  - Add two calibration cases: 10 runs with 2 back-starts, both front-error, must be NOT void; 10 runs with 5 front-error must be VOID.

### Important

**N2. The pre-registration and launcher misstate 6c50ec3, and the commit list is incomplete.**
- **"Validated offline" is false:**
  - PREREGISTER:20-22 and launch-h40c.cmd:6 say the follow-up restore was "validated offline on a non-holdout roster".
  - MAIN now carries 51e349d, "follow-up parent replay - FAIL by rule step 1, flag stays off" (wrong 0 → 1, acceptable 16 → 22).
  - A never-edited record would state the opposite of a committed result.
- **Wrong component:** ":22 only changes what `TemporalContextBuilder` stores" is also wrong. With the flag off, the commit changes the `questionContext` that `SessionTracker.addAssistantMessage` puts into `assistantResponseHistory` (SessionTracker.ts:287). Only `withParentExchange` reads it, and only with the flag on. TemporalContextBuilder merely declares the type.
- **Incomplete commit list:** "07a0e5e plus three commits" (:6-7) no longer describes the tree that will fly. MAIN already has 51e349d and 18242df (docs only). The Groq-arm commit (harness) and the pre-registration commit will follow.
- **Fix:**
  - Say "its offline replay FAILED its pre-registered rule (51e349d); the flag stays off".
  - Name `SessionTracker`.
  - List every commit between 07a0e5e and the registered HEAD by kind (app / harness / docs), including the arm-removal commit's hash, which exists before the pre-registration is committed.

**N3. The "Not covered" redirect bullet describes behaviour the code cannot produce, and the rebuilt fixture encodes it.**
- **What the code does:**
  - When both hedge legs end EMPTY, `streamGeminiWithHedge` returns without throwing (LLMHelper.ts, da28f25 hunk: `return; // both empty`).
  - `withVerbalFallback` only catches errors (WhatToAnswerLLM.ts:64-85), so there is no redirect, and the user gets IntelligenceEngine's "Could you repeat that?" (IntelligenceEngine.ts:448-450).
  - Only an ERROR from either leg, with no token, re-runs the pair.
- **What the pre-registration says (PREREGISTER:167-173):**
  - "When both legs end with nothing … the pre-token redirect re-runs the same hedge";
  - "a redirect … still counts toward answer failures if it ends in `no answer - front empty, back empty` before the redirect succeeds". That second sentence says an answer that was delivered counts as a failure.
- **What the fixture does:** h40c-stats-cal-synth\natively_debug.log has empty-empty → redirect warning → `(fallback)` → second `front=` → won by, at 17:01:30-31. So the "positive" calibration charges a failure to a window that was answered. It never exercises the real redirect (error-error → redirect → won by), which must count 0 failures.
- **Why only the text is wrong:** the rule's own definition (:90-95) is correct for the real code, because an empty-empty line is always terminal.
- **Fix:**
  - Rewrite the bullet: both legs fail → redirect (up to four requests); both empty → the answer ends, no redirect, counted as one failure.
  - Rebuild the fixture with a real error-error redirect (expect 0 failures) and a separate terminal empty-empty window (expect 1).

### Minor

**N4. The p90 ceiling fails its own baseline.** h40b's real p90 is 13.608 s. The stats run on the h40b copy prints "p90 FAIL" against the 13.6 ceiling (PREREGISTER:89-90; stats:41). Compare at h40b's reported precision (p90 rounded to 0.1 s ≤ 13.6) or use 13.608.

**N5. Stale failure lines from a superseded generation are charged to the wrong window.**
- A superseded generation is ended by `.return()` at its next token (IntelligenceEngine.ts:414-421, which logs `_what_to_say stream aborted by new generation`), not by an error.
- Its hedge keeps running, so any stale `won by` / `no answer` / `Stream failed` lines land AFTER the `dispatch: supersede` line (main.ts:1026-1029), in the superseding window. One stale empty-empty line fails rule 2 (≤ 0).
- The fixture's "Stream failed: aborted for a fuller supersede" before the supersede line is not something the real code logs.
- **Fix:** count a window as failed only when a failure line has no later `won by` in the window; or state the edge case in the pre-registration.

**N6. Check 10a's `.env` parser misses two forms dotenv accepts.** `line.split('=')[0].trim()` (guard:173) misses `export NAME=value` and `NAME: value`, both of which MAIN's dotenv 17.3.1 accepts. Its LINE regex is `^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)`. Parse names with the same shape. Today `.env` declares no NATIVELY_* name in any form.

**N7. Nothing proves the addendum mechanically.**
- The dry twin's comment (launch-h40c-dry.cmd:5-9) asks the controller to check that launch-h40c.cmd's flight call has no `--model qwen/` or `--model openai/` arm. The launcher never names arms; they come from `ANSWER_MODELS` in interview60.flight.mjs (lines 54 and 296-298), so that check proves nothing.
- The detector named as unchanged can be overridden by `NATIVELY_QUESTION_DETECTION_MODEL` (GroqDetectionClient.ts:66). That variable is unset today (User, Machine, `.env`), but neither the guard nor 10a checks it.
- **Fix:**
  - Add `interview60.flight.mjs h40c --dry-run` to the dry twin. It executes nothing (flight.mjs:212-216) and logs every `answers.mjs --model` line at the registered commit. Or have the guard import `ANSWER_MODELS` and fail on any id containing "/".
  - Add `NATIVELY_QUESTION_DETECTION_MODEL` to 10a's names and to a `process.env` check.

**N8. An out-of-window hour has no defined verdict.** PREREGISTER:118-123 says rule 2 is "reported but not gated" out of window, but "the hour PASSES only if all hold" (:67), so its verdict is undefined. "Start" is also undefined: `auto`'s probe can wait up to 45 min (run.mjs:543), so a 14:30 task start can put playback after 15:00. Define start = `timeline.startedAt` (playback), and state the out-of-window verdict explicitly (e.g. "no latency verdict; re-fly in window").

**N9. Wording in the permanent document.**
- :112-113 describes VOID (b) as "under-triggered the back leg entirely". (b) measures hedge runs per dispatch window, not back legs.
- :134 has "M-finding redirects".
- Review labels (C1, I2-I10, M5-M10), "Task 7's smoke", "Task 8's fix-round-1 synthetic fixture" and `SP\quota-ledger.mjs` point at scratchpad artifacts that will not be in the repo.
- :15-17 says h40b's R07F becomes "graded acceptable". It would be attributed; it was never graded. The seven captured arms answering the same prompt were.
- Fix the wording before the commit.

**N10. The descriptive per-window label repeats the M7 trap.** When a window has no `won by`, the label falls back to the last `answer source:` line (stats:141-143), which is the 3.1-lite head label. The synthetic fixture's superseded window is reported as `gemini-3.1-flash-lite`. Print "none" for windows without a won-by.

**N11. Parts of the guard have never run against MAIN, and nothing blocks arming on it.**
- The real-MAIN calibration (guard-h40c-realcal.txt, 18:53) predates the new check 8, 10a and 10b. None of the three has run against MAIN's root and git (the stub repo was the stand-in).
- **Fix:** make "register launch-h40c-dry.cmd as a scheduled task with the final `NATIVELY_FLIGHT_COMMIT`, and require GUARD OK in flight-h40c-dry.launcher.log" a blocking item beside I10's.
- **Also state:** after registration MAIN is frozen until the hour. Any commit, including a docs-only one, moves HEAD and makes the guard refuse, loudly but losing the day. Trimming `NATIVELY_FLIGHT_COMMIT` in the guard would also stop a trailing space on the `set` line from failing it.

Counts: 1 original finding not addressed (C1). New: Critical 1, Important 2, Minor 8.
