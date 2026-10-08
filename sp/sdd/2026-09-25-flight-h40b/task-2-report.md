# Task 2 report: h40b launcher and guard, calibrated against the OLD build

## What was implemented

Three files, all in the scratchpad (`<SP>` = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`):

- `<SP>\guard-h40b.mjs`
- `<SP>\launch-h40b.cmd`
- `<SP>\launch-h40b-dry.cmd`

### Step 1 — guard-h40b.mjs

Built by diffing against `guard-h40a.mjs` (see the `diff -u` output below). Only two regions changed, exactly as the brief specified:

1. The opening two paragraphs (the ones that said "h40a"/"BASELINE") were replaced verbatim with the brief's 5-line block. The rest of the header — the "What it cannot see" paragraph and the "Exit 0 = ready..." line, neither of which mentioned h40a/BASELINE — was left untouched.
2. Check 5 was inserted verbatim from the brief, immediately before the final `console.log`, and that line's text was updated to append `, R09 fix in the build` per the brief's exact final-line wording.

Checks 1-4 are byte-identical to guard-h40a.mjs (confirmed by diff — no changes in that region).

Full diff (guard-h40a.mjs -> guard-h40b.mjs):
```diff
@@ -1,11 +1,9 @@
-// Pre-flight guard for h40a, run from the repo root by launch-h40a.cmd AFTER the launcher has
-// set the flight's environment.
-//
-// h40a is the holdout40 BASELINE: the shipped app, unchanged, on a roster it was never tuned
-// on. So this checks that the hour will measure exactly that - the roster the environment names
-// is the one the harness loads, no model or thinking override reaches the app, and the build's
-// default and fallback models get the levels they honour. Every check answers differently if
-// its premise is false; each was run once with the premise broken before arming.
+// Pre-flight guard for h40b, run from the repo root by launch-h40b.cmd AFTER the launcher has set
+// the flight's environment. h40b = holdout40 again with ONE change: the R09 routing fix. So this
+// checks the hour will measure exactly that: the roster the environment names is the one the harness
+// loads, no model or thinking override reaches the app, the build's default and fallback models get
+// the levels they honour, and the built classifier carries the fix. Every check answers differently
+// if its premise is false; check 5 was run against the pre-fix build before arming.
 //
 // What it cannot see: the model the app has SAVED as its selection, which the technical verbal
 // route passes to verbalPrimaryModel. That lives in credentials.enc, which is never read. The
@@ -63,4 +61,10 @@
 if (T.thinkingLevelForModel(primary, level) !== 'LOW') fail(`${primary} would not fly at LOW`);
 if (T.thinkingLevelForModel(fallback, level) !== 'HIGH') fail(`the ${fallback} fallback would fly at a level it ignores`);
 
-console.log(`GUARD OK: roster holdout40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH`);
+// 5. The R09 fix is in the build: the built classifier no longer lists bare "salary" as a
+//    negotiation term and carries the phrase terms instead.
+const cls = fs.readFileSync(`${PROJ}/dist-electron/electron/knowledge/IntentClassifier.js`, 'utf8');
+if (/["']salary["']\s*,/.test(cls)) fail('the build still routes any question with the word salary to negotiation coaching - rebuild after the R09 fix');
+if (!cls.includes('salary expectations')) fail('the build lacks the R09 fix phrase terms - rebuild');
+
+console.log(`GUARD OK: roster holdout40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, R09 fix in the build`);
```

### Step 2 — launch-h40b.cmd and launch-h40b-dry.cmd

Built with PowerShell: read `launch-h40a.cmd` with `[IO.File]::ReadAllText`, spliced in a new 4-line header ahead of the unchanged body, then did a literal `h40a` -> `h40b` substitution over the body (log names, guard filename, the trailing `interview60.flight.mjs h40b` argument). Both written with `[IO.File]::WriteAllText(path, text, [System.Text.Encoding]::ASCII)`.

New header (4 lines, replacing the old 18-line rem block which described the BASELINE framing, the model/audio rationale, and the parenthesis-in-echo style note):
```
rem holdout40 with the R09 fix, flight h40b (task Natively-flight-h40b, 2026-09-26 17:00 local).
rem h40b = holdout40 again with ONE change under test: IntentClassifier no longer routes the bare
rem word "salary" to negotiation coaching. Everything else flies the shipped default - same
rem roster, same audio, same models, same levels - so the hour isolates that one change.
```
This covers the brief's four required points (h40b = holdout40 with the R09 fix; task Natively-flight-h40b; 2026-09-26 17:00 local; everything else the shipped default). Note: the old header's "NOTE ON STYLE" parenthesis warning was dropped along with the rest of the header per the brief's "replaced by four lines" instruction — it was followed procedurally instead (verified separately, see self-review).

Substitutions applied to the body (every occurrence, all confirmed by diff):
- `natively-h40a-launcher-error.log` -> `natively-h40b-launcher-error.log` (4 occurrences: wrong-cwd check, wav-missing check, roster-missing check, appStop findstr check)
- `flight-h40a.launcher.log` -> `flight-h40b.launcher.log` (wav:check redirection + its failure echo; guard redirection + its failure echo)
- `guard-h40a.mjs` -> `guard-h40b.mjs` (the node invocation path)
- final line: `interview60.flight.mjs h40a` -> `interview60.flight.mjs h40b`

Env vars (`NATIVELY_STT_PROVIDER=deepgram`, `NATIVELY_ROSTER=holdout40`, `NATIVELY_SCENARIOS=`, `NATIVELY_GEMINI_THINKING_LEVEL=`, `NATIVELY_VERBAL_PRIMARY_MODEL=`), the four pre-flight existence/findstr checks, and the wav:check / behavioural-guard structure are untouched apart from the naming above — h40b flies the same roster, same audio, same models/levels as h40a, per the brief.

launch-h40b-dry.cmd was then derived from launch-h40b.cmd's in-memory text: cut the string right before the final line's start (removing the `interview60.flight.mjs h40b` invocation entirely, nothing else), then renamed `flight-h40b.launcher.log` -> `flight-h40b-dry.launcher.log` everywhere it appears (4 occurrences: wav:check redirection + its failure echo, guard redirection + its failure echo). The error-log name (`natively-h40b-launcher-error.log`) was intentionally left without a `-dry` suffix — the task's own read-back instructions name it without one, and only "the log" (the launcher/flight log) was specified as renamed.

## Calibration run (Step 3)

Command (from MAIN's root, via PowerShell):
```
Push-Location "C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"
cmd /c "<SP>\launch-h40b-dry.cmd"
"exit $LASTEXITCODE"
Pop-Location
```

Result: **exit code 4** (matches the brief's expectation exactly).

Full content of `electron\test\golden\interview60.runs\flight-h40b-dry.launcher.log` after the run (2 lines total, freshly written by this run — no stale content):
```
holdout40.wav matches holdout40  45 items
GUARD FAILED: the build still routes any question with the word salary to negotiation coaching - rebuild after the R09 fix
```

`%TEMP%\natively-h40b-launcher-error.log`:
```
behavioural guard failed - see flight-h40b-dry.launcher.log
```

This is exactly the brief's expected result: exit 4, last log line `GUARD FAILED: the build still routes any question with the word salary ...`.

Earlier checks confirmed passing on this environment (no premature exit, no earlier GUARD FAILED / earlier-numbered exit code):
- The launcher's pre-guard existence/findstr checks (exit 9/8/7/6) did not fire — we reached wav:check and then the behavioural guard.
- `holdout40.wav matches holdout40  45 items` is wav:check's own success line, confirming the audio-vs-roster guard (exit 5) passed.
- Inside guard-h40b.mjs, checks 1-4 (roster resolution to holdout40/45 items, built primary/fallback model identity, no model/thinking override, correct thinking level per model) emit nothing on success — the only console output is the check-5 failure, meaning checks 1-4 all passed silently and execution reached check 5 before failing there.
- Root-cause check of the premise: read `dist-electron\electron\knowledge\IntentClassifier.js` directly — line 91 still has bare `"salary",` in the `STRONG_NEGOTIATION` array (old build), while `electron\knowledge\IntentClassifier.ts` (source, `git status` shows it Modified) has the R09 fix (`'salary expectations'` etc., no bare `'salary'`). This confirms the calibration exercised exactly the intended contrast: fixed source, unbuilt dist.

No rebuild, no scheduled-task registration, no app start, and `interview60.flight.mjs` was never invoked (grepped launch-h40b-dry.cmd for `flight.mjs` beforehand — the only hit is the harmless existence check on line 6, not an invocation).

## ASCII / CRLF verification

```
launch-h40b.cmd     : bytes=2476 over0x7F=0 crlf=43 lf=43 match=True
launch-h40b-dry.cmd  : bytes=2336 over0x7F=0 crlf=42 lf=42 match=True
```
Both files: zero bytes above 0x7F (ASCII-only), and CRLF count equals LF count (i.e. every line ending is `\r\n`, no bare `\n`). Source `launch-h40a.cmd` was also confirmed 0 bytes over 0x7F, crlf=lf=57, for baseline comparison.

## Self-review

- `grep -in "h40a"` across all three new files: **no matches**. Every h40a that should have become h40b did.
- `grep` for `echo` lines containing `(` or `)` in both new .cmd files: **no matches** — no parenthesis-in-echo-in-if-block risk introduced.
- `grep -in "baseline"` in guard-h40b.mjs: **no matches** — the BASELINE wording is fully gone from the header.
- `diff -u launch-h40a.cmd launch-h40b.cmd` and `diff -u launch-h40b.cmd launch-h40b-dry.cmd`: both reviewed in full above; changes are exactly the ones the brief calls for, nothing else moved.
- `diff -u guard-h40a.mjs guard-h40b.mjs`: reviewed in full above; checks 1-4 byte-identical, only the header paragraph and the check-5/final-line region changed.
- Check 5's regex (`/["']salary["']\s*,/`) and both fail messages, and the final GUARD OK line, were pasted verbatim from the brief — confirmed by the diff hunk matching the brief's block character-for-character.
- Dry file confirmed to contain no flight invocation before running it (grep for `flight.mjs` found only the pre-existing existence check).

**Concerns:**
- The brief's header instruction ("the rem header replaced by four lines") was read literally as replacing the *entire* rem block (18 lines), including the 2026-09-20 parenthesis-in-echo style note. That safety note is procedural guidance for whoever edits these files, not something the running script depends on — I still followed it (verified above, no parens in any echo), but it's no longer written down in launch-h40b.cmd/launch-h40b-dry.cmd for the next person adapting these into h40c etc. Flagging in case the plan intended that note to survive somewhere.
- guard-h40b.mjs's check 5 only reports the *first* failing sub-check (the bare-`"salary",` regex) because `fail()` calls `process.exit(1)` immediately — this is inherited behavior from guard-h40a.mjs's `fail()` helper, not something introduced here, and it's exactly what the brief's expected calibration output shows (only the regex-fail message, not the phrase-terms message).
- No scheduled task was registered, no rebuild was run, the app was never started, and `interview60.flight.mjs` was never invoked, per the task's hard constraints.

## Fix round 1

**Finding addressed (Opus review, Important):** check 5 read only `dist-electron/electron/knowledge/IntentClassifier.js`, proving the build carries the R09 fix but saying nothing about the source tree it must have come from. A later revert of `electron/knowledge/IntentClassifier.ts` with a stale-but-fixed dist left would pass silently. Ruling: test both, via a shared, separately-calibrated predicate.

### Change 1 — new module `<SP>\guard-r09.mjs`

Exports one predicate, `r09Missing(text)`, verbatim to the ruling's spec (bare-salary tested first, phrase second — same order as the original check 5):

```js
export function r09Missing(text) {
    if (/["']salary["']\s*,/.test(text)) return 'still lists bare "salary" as a negotiation term';
    if (!text.includes('salary expectations')) return 'lacks the R09 phrase terms';
    return null;
}
```

Full file (716 bytes) also carries a header comment explaining it's shared between the guard and its calibration script, and that this ordering is deliberate.

### Change 2 — `guard-h40b.mjs` check 5

Diff against the pre-fix-round-1 version (backed up to `guard-h40b.mjs.round0.bak`, diffed, then removed — not one of the three deliverable files):

```diff
@@ -61,10 +61,13 @@
 if (T.thinkingLevelForModel(primary, level) !== 'LOW') fail(`${primary} would not fly at LOW`);
 if (T.thinkingLevelForModel(fallback, level) !== 'HIGH') fail(`the ${fallback} fallback would fly at a level it ignores`);
 
-// 5. The R09 fix is in the build: the built classifier no longer lists bare "salary" as a
-//    negotiation term and carries the phrase terms instead.
-const cls = fs.readFileSync(`${PROJ}/dist-electron/electron/knowledge/IntentClassifier.js`, 'utf8');
-if (/["']salary["']\s*,/.test(cls)) fail('the build still routes any question with the word salary to negotiation coaching - rebuild after the R09 fix');
-if (!cls.includes('salary expectations')) fail('the build lacks the R09 fix phrase terms - rebuild');
+// 5. The R09 fix is in both the build and the source it must have come from: a rebuild after
+//    a later revert of electron/knowledge/IntentClassifier.ts would otherwise leave a passing
+//    guard over a stale-but-fixed dist, attributing the hour to a source tree without the fix.
+import { r09Missing } from './guard-r09.mjs';
+const distReason = r09Missing(fs.readFileSync(`${PROJ}/dist-electron/electron/knowledge/IntentClassifier.js`, 'utf8'));
+if (distReason) fail(`the build ${distReason} - rebuild after the R09 fix`);
+const srcReason = r09Missing(fs.readFileSync(`${PROJ}/electron/knowledge/IntentClassifier.ts`, 'utf8'));
+if (srcReason) fail(`the source ${srcReason} - the build would not match the tree the pass record names`);
 
 console.log(`GUARD OK: roster holdout40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, R09 fix in the build`);
```

Only the check-5 region moved; checks 1-4 and the GUARD OK line are untouched, confirmed by this diff. The `import` sits at check 5's position as the ruling specified rather than up top with the other imports — valid ESM (imports are hoisted regardless of position) and confirmed working end-to-end by the dry-run re-run below. `electron/knowledge/IntentClassifier.ts` was only ever read (by this check, at guard runtime, and by my own Read calls) — never written.

### Change 3 — calibration script `<SP>\guard-r09-cal.mjs`

Imports the same `r09Missing` the guard runs, against the four required cases. HEAD's source is read via `execFileSync('git', ['show', 'HEAD:electron/knowledge/IntentClassifier.ts'], { cwd: MAIN, encoding: 'utf8' })` — spawned directly, no `shell: true`, so no cmd.exe is involved and the non-ASCII `Masaüstü` path is passed straight through Node's own Win32 process-creation path rather than reinterpreted through a console codepage.

Output of `node guard-r09-cal.mjs`:
```
(a) HEAD source: still lists bare "salary" as a negotiation term
(b) working tree source: null
(c) dist build: still lists bare "salary" as a negotiation term
(d) synthetic text: lacks the R09 phrase terms
CALIBRATION OK
```
Exit code 0. All four cases matched their expected value on the first run; nothing needed adjusting. This confirms the predicate distinguishes all three real texts correctly (HEAD still broken, working tree fixed, dist still broken) and separately exercises the phrase-only branch that none of the three real texts reach.

### Change 4 — dry-run re-verification

Command: same as Step 3, unchanged (`Push-Location $MAIN; cmd /c "<SP>\launch-h40b-dry.cmd"; "exit $LASTEXITCODE"; Pop-Location`).

Result: **exit code 4.**

`flight-h40b-dry.launcher.log` tail (log was NOT cleared — this run's two lines are appended after round 0's two lines, as instructed):
```
holdout40.wav matches holdout40  45 items
GUARD FAILED: the build still routes any question with the word salary to negotiation coaching - rebuild after the R09 fix
holdout40.wav matches holdout40  45 items
GUARD FAILED: the build still lists bare "salary" as a negotiation term - rebuild after the R09 fix
```
Last line matches the ruling's expected message exactly: `GUARD FAILED: the build still lists bare "salary" as a negotiation term - rebuild after the R09 fix`. The dist branch fired (dist is still the old build); the source branch was never reached, as expected since `fail()` exits immediately. This also proves the relative import `./guard-r09.mjs` resolved correctly when guard-h40b.mjs is invoked via the launcher's `%~dp0` absolute path from MAIN's cwd — a broken import would have crashed with an uncaught `ERR_MODULE_NOT_FOUND` stack trace instead of this clean `GUARD FAILED:` line.

`%TEMP%\natively-h40b-launcher-error.log` was read, not cleared, per the ruling; it now holds two accumulated `behavioural guard failed - see flight-h40b-dry.launcher.log` lines (round 0 + round 1), left as-is for the controller to clear after the rebuild's passing run.

### ASCII check on .cmd files

Neither `.cmd` file was touched this round — confirmed by mtime: `launch-h40b.cmd` and `launch-h40b-dry.cmd` both still show their round-0 write time, while `guard-h40b.mjs`, `guard-r09.mjs`, and `guard-r09-cal.mjs` all show this round's write time. No re-verification needed since content didn't change from the already-verified round-0 ASCII/CRLF state.

### Self-review (fix round 1)

- `grep -in "h40a"` across `guard-r09.mjs`, `guard-r09-cal.mjs`, and the updated `guard-h40b.mjs`: no matches.
- The two message strings in `guard-r09.mjs` (`still lists bare "salary" as a negotiation term`, `lacks the R09 phrase terms`) match the ruling's spec text character-for-character.
- `git status --short` in MAIN is byte-identical to the round-0 baseline (same 5 modified + 6 untracked entries) — nothing was written into the repo this round.
- Confirmed via calibration that `r09Missing` is not a check that only ever says yes or only ever says no — it answers differently across all three real texts, and the fourth (synthetic) case proves the phrase-only branch actually fires when reached.

**Concerns:**
- None outstanding. The fix directly closes the reviewed gap (dist-only coverage) without touching checks 1-4, either `.cmd` launcher, or the source file under review elsewhere.
- Per the ruling, `%TEMP%\natively-h40b-launcher-error.log` was left uncleared — it currently mixes round 0's and round 1's failure lines. Not cleaned up here; the controller said it will clear it after the rebuild's passing dry run.
