# Task 8 report — prepare flight h40c (pre-registration, launcher, guard, registration NOT run)

## Files written

All new files (nothing in MAIN was edited); none of these touch code the vitest suite covers, so
this task has no failing-test-first cycle — the deliverables are operational scripts and a docs
draft, and their evidence is the rule-8 calibration runs below.

- `SP\stage\electron\test\golden\passes\PREREGISTER-h40c.md` — the pre-registration DRAFT, per
  the controller's note staged in SP (not written to MAIN). The controller reviews wording and
  commits it to `MAIN\electron\test\golden\passes\PREREGISTER-h40c.md` before the hour.
- `SP\launch-h40c.cmd` — the flight launcher (modelled on `SP\launch-h40b.cmd`).
- `SP\guard-h40c.mjs` — the pre-flight behavioural guard (modelled on `SP\guard-h40b.mjs` +
  `SP\guard-r09.mjs`; reuses `guard-r09.mjs` unchanged via import).
- `SP\h40c-hedge-stats.mjs` — the post-hour hedge-mechanics stats script.
- `SP\register-h40c.ps1` — the scheduled-task registration script, ready but NOT run (modelled on
  `SP\register-natively-task.ps1`, h40b's own settings baked in).
- `SP\guard-h40c-cal.txt` — the guard's calibration transcript (7 cases).
- Calibration fixtures (scratchpad-only, not deliverables): `SP\guard-h40c-cal\` (a stub project
  tree — see "Deviation" below), `SP\h40c-stats-cal-h40b\` (a copy of `SP\attrib-h40b`'s three
  log/timeline files), `SP\h40c-stats-cal-synth\` (a hand-built synthetic run folder),
  `SP\h40c-stats-m7-negative-check.mjs` (a throwaway script proving the M7 fix matters).

## IMPORTANT DEVIATION from the brief, per the controller's Task 8 notes

The brief's guard-h40c calibration step says "calibrate from MAIN's root" with the launcher's env
set by hand. The controller's notes for this task say the opposite: dist-electron is NOT yet
rebuilt with the new hedge/follow-up modules, do NOT build, do every calibration that does not
need the new dist modules now, exercise the env checks with a stub, and list the dist-dependent
calibrations as PENDING for the controller to run after the build. Per the implementer contract
("Controller notes... override the brief where they differ"), I followed the controller's
instruction, not the brief's literal "from MAIN's root" step.

**What I found, and what I did about it:** MAIN's `dist-electron` was NOT empty — checking it, I
found `dist-electron/electron/llm/verbalHedge.js` and `.../followUpParent.js` already present,
with content byte-identical to what esbuild would produce from the current `electron/llm/*.ts`
sources (verified by inspection), and `dist-electron/electron/LLMHelper.js` already contains the
literal string `verbal hedge: front=`, and `dist-electron/electron/llm/WhatToAnswerLLM.js`
already contains `(hedge)`. Both dist files' mtimes (18:24:01) are newer than their `.ts` sources'
mtimes (18:20:26) — consistent with a concurrent Task 5 build having already completed. This
contradicts the controller's stated premise ("dist-electron is NOT rebuilt yet").

Rather than trust this possibly-transient state (another implementer's build could still be
mid-flight, or could be a WIP artifact from an earlier attempt), I followed the controller's
instruction literally: I did NOT run guard-h40c.mjs against MAIN's real dist-electron, and I did
NOT build. Instead I built a scratchpad stub project tree, `SP\guard-h40c-cal\`, containing REAL
copies of the non-hedge-related, already-stable dist files (roster.mjs + question files,
`electron/LLMHelper.ts` and `electron/knowledge/IntentClassifier.ts` — real source, unmodified —
`dist-electron/electron/llm/verbalPrimaryModel.js`, `.../geminiThinking.js`,
`dist-electron/electron/knowledge/IntentClassifier.js`, `guard-r09.mjs`), plus HAND-WRITTEN
stand-ins for the two new dist modules (`verbalHedge.js`, `followUpParent.js` — logic copied
verbatim from the real `.ts` source I read in full) and minimal text stubs for the two other
dist files the guard only reads as text (`LLMHelper.js`'s consts + hedge log line,
`WhatToAnswerLLM.js`'s `(hedge)` substring). All 7 calibration cases (the brief's 5 required ones
plus 2 extra for the two new checks) ran against this stub tree and passed as expected — see
`SP\guard-h40c-cal.txt` for the full transcript, and "Calibration evidence" below.

**Marked PENDING, per the controller's explicit instruction:** re-running guard-h40c.mjs's checks
6-9 against MAIN's OWN dist-electron directly (not the scratchpad stub) once Task 5's build is
confirmed final — the observation above suggests this will reproduce the same results, but I have
not treated it as done, and the controller's report should carry this forward rather than me
asserting it live. The smoke-run calibration for `h40c-hedge-stats.mjs` is also PENDING — no
smoke has run yet (the controller note says so explicitly); I calibrated the script against a
copy of h40b's own run (negative case, no hedge) and a hand-built synthetic run folder (positive
case, hedge present) instead, per the same "exercise with a stub" allowance.

## Calibration evidence

### guard-h40c.mjs — `SP\guard-h40c-cal.txt` (full transcript)

Ran from `SP\guard-h40c-cal\` (the stub tree above), 7 cases:

1. `NATIVELY_VERBAL_HEDGE` unset → `GUARD FAILED: NATIVELY_VERBAL_HEDGE did not arrive` (check 6)
2. `NATIVELY_FOLLOWUP_PARENT=1` (hedge correctly on) → `GUARD FAILED: the follow-up flag is set;
   h40c flies it OFF` (check 7)
3. `NATIVELY_VERBAL_HEDGE_TRIGGER_MS=1` → `GUARD FAILED: the hedge trigger is 1ms, not the probed
   5000ms - NATIVELY_VERBAL_HEDGE_TRIGGER_MS is set` (check 6)
4. `NATIVELY_VERBAL_PRIMARY_MODEL=gemini-3.5-flash-lite` → `GUARD FAILED: an answer-model override
   is set: gemini-3.1-flash-lite resolves to gemini-3.5-flash-lite` (check 3)
5. Correct env → `GUARD OK: roster holdout40 (45 items), no model or thinking override,
   gemini-3.1-flash-lite LOW with the gemini-3.5-flash-lite fallback at HIGH, hedge ON (front
   gemini-3.5-flash-lite HIGH, back gemini-3.1-flash-lite LOW at 5000ms), follow-up parent OFF,
   R09 fix in the build` (exit 0)
6. (extra) source touched newer than dist → `GUARD FAILED: ... is older than ... - the build is
   stale, rebuild` (check 9); restored, re-ran GUARD OK
7. (extra) dist edited to remove the hedge log line's text → `GUARD FAILED: the build does not
   carry the hedge log line (verbal hedge: front=) - rebuild after the hedge lands` (check 8);
   restored, final sanity run GUARD OK

All 7 cases matched expectations exactly; checks 1, 2, 4, 5 (unchanged from guard-h40b.mjs,
already calibrated there) never spuriously failed across any of the negative cases.

### h40c-hedge-stats.mjs

- **Negative case (brief-required):** copied `SP\attrib-h40b`'s three log/timeline files into
  `SP\h40c-stats-cal-h40b\` and ran the script. Output: `hedge not in effect: 0 of 44` — the exact
  phrasing the brief requires. As a bonus, the script's independently-computed TTFT
  (median 5.026s, p90 13.608s) reproduces the committed h40b result's own numbers (5.0/13.6s)
  almost exactly, corroborating the parsing logic against a known case (rule 8: "run it on a
  known case, trust it").
- **Positive case (smoke-run PENDING; used a hand-built synthetic run instead):** built
  `SP\h40c-stats-cal-synth\` with 3 hand-crafted dispatches covering a plain win, a
  back-leg-wins-after-a-redirect case (2 `front=` lines in one window, a `no answer` line, a
  `back started reason=trigger` line), and a `Stream failed` case, plus the startup line
  `[Main] verbal hedge: on trigger=5000ms`. The script's output matched every hand-computed
  expectation exactly: 3 dispatches, 4 front lines, 1 redirect (1 of 3 answers), winner split
  `{gemini-3.5-flash-lite:2, gemini-3.1-flash-lite:1}`, `other=` counts
  `{not-started:1, aborted:1, empty:1}`, 1 answer failure, startup flag `on trigger=5000ms`,
  median/p90 5.4s/6.3s (hand-computed from the 3 planted first-token values).
- **M7 fix calibration (proves the check can fail):** `SP\h40c-stats-m7-negative-check.mjs`
  recomputes the same synthetic fixture's per-answer labels with the NAIVE "first answer-source
  line in window" rule the review flagged as wrong. It reports `{"gemini-3.1-flash-lite":3}` —
  100% attributed to the head label, i.e. it would have reported the hedge as never winning with
  3.5-lite even though it won twice. The real script's won-by-priority logic gets
  `{"gemini-3.5-flash-lite":2,"gemini-3.1-flash-lite":1}`, the true split. This is the rule-8
  "prove it can fail" evidence for the M7 fix specifically.

## Opus review finding M7 — addressed

Applied to both `h40c-hedge-stats.mjs` and `PREREGISTER-h40c.md`:

1. **Stats script attribution fixed:** per-answer "who answered" now comes from the `verbal
   hedge: won by <model>` line (falling back to the LAST `answer source:` line in that answer's
   window, never the first) — see `sourceLabels` computation in `hedgeStats()`. Calibrated above.
2. **Pre-registration corrected:** added an "Instrument correction (Opus review, finding M7)"
   paragraph explaining why `capturePrompt` and the pass record's `answerModel` both misname the
   answering model under the hedge, and rule 1 now says explicitly the 3.5-lite share is read
   from the won-by lines.
3. **Not covered additions:** (a) a superseded answer keeps both hedge legs running until one
   speaks, no deadline after the trigger; (b) a double failure re-runs the pair (up to four
   requests per answer) — `h40c-hedge-stats.mjs` now counts a second `front=` line inside one
   answer's window as a redirect (`redirects`, `answersWithRedirect` fields; calibrated above,
   1 redirect detected in the synthetic fixture's dispatch 2).
4. **Startup log line cited:** `h40c-hedge-stats.mjs` parses and reports `[Main] verbal hedge: on
   trigger=<ms>ms` / `off` (the `startupFlag` field); `guard-h40c.mjs`'s header comment and its
   final printed line both point to this as the end-to-end proof the flag reached the Electron
   app process, since the guard itself can only prove the environment its own node process sees.
   Note: this startup line does not exist in `electron/main.ts` yet at the time of this session
   (grepped, no match) — the review says it is "being added now" by a concurrent task. The
   parsing code is written to the exact spec given and will start reporting real data once that
   line lands; until then `h40c-hedge-stats.mjs` reports `not observed in this window` for it,
   which is the correct, honest behaviour for a line that does not exist yet (not a bug to fix
   here).

## PREREGISTER-h40c.md — numbers verified against source records

Per the controller's note ("verify each against MAIN\...\2026-09-26-h40b-result.md and the h40b
pass record, and note any you cannot verify"):

- TTFT p50/p90 5.0s/13.6s — matches `passes/2026-09-26-h40b-result.md`'s "Latency, in-app" table
  exactly.
- In-app acceptable 35 of 45 — matches the same file's "The numbers" table exactly.
- Roster (holdout40, 45), grader stamp (8564ba96369a), models — all named identically in both the
  h40b PREREGISTER and result.
- Answer-failures ceiling of 0 — the h40b result's prose does not print an explicit count;
  independently checked instead against `SP\attrib-h40b\natively_debug.log` (a scratchpad copy of
  the h40b run): zero `[WhatToAnswerLLM] Stream failed` lines, the same pattern
  `h40c-hedge-stats.mjs` counts. Noted in the draft's own "Verification" section.
- The 2026-09-25 probe's pooled numbers (median 4.4 vs 6.1s, p90 11.5 vs 13.3s, none 0 vs 0,
  95/117 from 3.5-lite) — checked against `passes/2026-09-25-hedge-probe-result.md`'s own pooled
  row and VERDICT: PROCEED line; matches exactly.

Nothing in the draft's numbers could not be verified; the one soft spot (answer-failures ceiling)
is called out in the draft itself for the controller's attention, not silently assumed.

## Registration — NOT run

`SP\register-h40c.ps1` is written, syntactically ASCII-only (checked with `grep -n '[^ -~]'`, no
matches), and not executed. No `Register-ScheduledTask` call was made in this session; no
scheduled task named `Natively-flight-h40c` exists. The exact invocation for the controller/user:

```
powershell -NoProfile -ExecutionPolicy Bypass -File register-h40c.ps1 `
    -TaskName 'Natively-flight-h40c' -Launcher '<SP>\launch-h40c.cmd' -Hours 5 -StartAt '<flight time>'
```

`launch-h40c.cmd` was likewise never executed (no `interview60.flight.mjs h40c` run, no app
started, no dry-run variant was written — the brief allows the controller to register a
`--dry-run` variant separately; Task 8 did not build one since it was not in the files list and
the controller registers it if wanted).

## Quota note (from the brief, carried over unverified — descriptive only, not this task's number to compute)

The brief's own estimate: 3.5-lite ~= 245 requests, 3.1-lite ~= 210 + chains, both under 500 on a
fresh quota day. This task did not re-derive this figure (Task 0's quota ledger is a different
task's output); carried into the draft's "What the hour tests" section unchanged from the brief.

## Deviations summary

1. Guard calibration run against a scratchpad stub tree, not MAIN's root, per the controller's
   explicit override of the brief's literal instruction — see "IMPORTANT DEVIATION" above.
2. PREREGISTER-h40c.md written to `SP\stage\electron\test\golden\passes\` per the controller's
   note, not to MAIN (the brief's literal file path is under MAIN; the controller note overrides
   this and is what I followed).
3. Incorporated the coordinator's mid-task M7 review-finding message (stats-script attribution
   fix, pre-registration correction, two new "Not covered" items, startup-line citation) — not in
   the original brief, applied per the coordinator's explicit instruction mid-task.
4. `launch-h40c.cmd`'s working-directory / roster-missing checks and `register-h40c.ps1`'s
   merged-code check were adapted (not copied verbatim) to name h40c's own artifacts
   (`electron/llm/verbalHedge.ts` in place of h40b's R09-specific and the prior "whole-turn"
   checks in `register-natively-task.ps1`) — the brief says "model on", not "copy verbatim", and
   a stale check naming an unrelated feature would be misleading in a new file.

## Open concerns

- The dist-electron discrepancy (already appears built) should be resolved by the controller
  before relying on this task's guard/stats calibration as final — re-run both scripts against
  MAIN directly once Task 5's build is confirmed, per "PENDING" above.
- The answer-failures ceiling's provenance (0, carried from h40b's PREREGISTER leg-4 wording,
  corroborated only by a raw-log grep, not a printed count in the committed result) is flagged
  in the draft itself for the controller's judgment before committing.
- `[Main] verbal hedge: on trigger=...` / `off` does not exist in `electron/main.ts` yet as of
  this session (grepped, no match) — depends on the concurrent task the coordinator's message
  says is adding it now.

## Status (superseded by Fix round 1 below)

DONE_WITH_CONCERNS — all four deliverables written and calibrated to the extent the controller's
own instructions permitted (dist-dependent guard/stats calibration explicitly deferred as
PENDING, not skipped silently); the M7 review finding applied to both the stats script and the
pre-registration draft; registration and launcher confirmed NOT run.

---

# Fix round 1 (2026-09-26, ~19:00-19:10)

The controller's Opus review (`SP\sdd\2026-09-26-h40c\task-8-review.md`) returned SPEC FAIL: 1
Critical, 10 Important, 10 Minor, plus a "why the spec fails" note that the brief's quota
checkbox had no deliverable. The controller ruled on all findings and accepted them; this section
applies every ruling. A second, mid-round coordinator message added a user decision: h40c drops
its two Groq answer arms (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`); that is addressed inline
below wherever it touches a Task 8 file.

**Between rounds, the controller independently ran the real-dist guard calibration** (the thing
round 1's report flagged as PENDING): `guard-h40c-realcal.txt` shows 5/5 on MAIN's own
dist-electron (HEAD `da28f25`, dist built 18:53:01), confirming checks 1-7 hold against the real
build, not just the scratchpad stub tree. That PENDING item is resolved; the two NEW checks this
round adds (10a, 10b) have not yet had a real-MAIN pass from the controller — noted again at the
end of this section.

## Files changed this round

- `guard-h40c.mjs` — reworded header (I1); check 8 now matches `HEDGE_WINNER` /
  `\(hedge\)__` instead of a plain `(hedge)` substring that a JSDoc comment alone also satisfies
  (M1); check 9's comment now says checks 5 and 8 are the ones that bind, not check 9 itself (M2);
  two new checks: 10a (`.env` must not declare any of the 5 guarded names — names only, via
  `split('=')[0]`, never a value) and 10b (MAIN HEAD must equal `NATIVELY_FLIGHT_COMMIT`; the
  working tree under `electron src premium package.json` must be clean except a documented
  known-dirty list) (I8). No hardcoded `REGISTERED_COMMIT_DEFAULT` — the coordinator's Groq-arm
  addendum means HEAD moves again before the real flight, so a stale constant would be worse than
  none; `NATIVELY_FLIGHT_COMMIT` is required, with no fallback, and check 10b fails loudly naming
  what's missing if it is unset.
- `guard-h40c-git.mjs` (new) — the pure, git-free predicate `unexpectedDirtyPaths()` check 10b
  uses, calibrated in isolation from git or a dirty tree (I8's own calibration note). Its
  known-dirty whitelist is wider than I8's literal text (two golden files): a real
  `git status --porcelain -- electron src premium package.json` against MAIN also shows four more
  untracked scratch files the h40c plan's own global constraints already document as known and
  never staged (`openrouter-probes/`, `openrouter.probe.mjs`, `zai-probes/`, `zai.probe.mjs`) —
  whitelisting only the review's two examples would make check 10b fail on the tree's current,
  expected state, which is not the point of the check.
- `h40c-hedge-stats.mjs` — startup line now read from `logSince(debugLog, 0,
  timeline.startDebug)` (the bytes BEFORE the run's own window), last match, per I2: the line is
  logged in `initializeApp` before the window's own `startDebug` offset, so the old code could
  never see it on a real flight. Dispatch windows now open on either a `dispatch: answer` or a
  `dispatch: supersede` line (both start a fresh hedge cycle in main.ts). Rule 1's 3.5-lite share
  is now computed PER WINDOW (numerator = windows whose LAST won-by names
  `gemini-3.5-flash-lite` exactly; denominator = windows with a won-by line at all), replacing the
  old global line-count ratio (I3); the exact-string compare is M5. `answerFailures` now sums
  `Stream failed` lines and `no answer - front empty, back empty` lines PER WINDOW, excluding any
  window immediately followed by a `dispatch: supersede` window (I4). The report's rule-1 line now
  prints VOID (with the specific mechanical reason(s)) or "not void", never FAIL, and rule 2 is
  computed and printed unconditionally, VOID or not (C1). `fileURLToPath(import.meta.url)`
  replaces the hand-rolled, percent-encoding-unsafe URL-to-path conversion for the `isMain` check
  (M4).
- `stage\...\passes\PREREGISTER-h40c.md` — rewritten: names and describes all three commits
  (`e311019`, `6c50ec3`, `da28f25`) and states the `e311019` attribution bias explicitly while
  keeping the 35 floor (I5); rule 1 rewritten for C1 (VOID mechanical-only: startup-line mismatch,
  <95% front-line coverage, an objective ≥50% front-error outage share; 3.5-lite share reported
  only) and I3/M5 (per-window numerator/denominator, exact model compare); rule 2 rewritten for I4
  (failure definition, superseded-window exclusion) and C1 ("always computed and reported, VOID
  included"); rule 3 gets M6 (the 35/45 floor covers all 45 items; the five-follow-up exclusion is
  scoped to the zero-wrong clause only) and M7 (the twin-band reading is per item, by the model
  that actually won it); a new "Instrument" paragraph replaces the overclaiming one (I1); a new
  flight-window/grader/PASS-licensing paragraph (I6); a new quota paragraph with corrected counts
  and the fly-on-a-clean-quota-day rule (I9); a new blocking-checklist paragraph naming the
  smoke-log calibration as required before arming (I10); a new statement that no full-Flash
  sidecar runs on h40c (M10); a new "Answer arms" paragraph stating the two Groq answer arms are
  dropped and naming the (unrelated, unchanged) Groq question detector explicitly, so the two are
  not confused (mid-round coordinator addendum). The "DRAFT —" banner and the Task-8 verification
  section are both removed from this file (M9) — their content lives in this report instead (see
  "Numbers verification" below, carried over from round 1 and re-confirmed unchanged this round).
- `register-h40c.ps1` — drops `-StartWhenAvailable`; the comment previously claimed h40b's task
  was corrected to ADD it, which is backwards — read-only `Get-ScheduledTask` on the live
  `Natively-flight-h40a`/`-h40b` tasks shows both have `StartWhenAvailable=False`, and h40b's own
  final review names `StartWhenAvailable=True` a regression it corrected away, for the reason I7
  gives (a closed lid causes a late start at an arbitrary time, which defeats a flight whose
  latency comparison depends on time of day). `-StartAt` is now `Mandatory` with no default (the
  old 2-minutes-from-now default could have armed a ~500-request flight before the
  pre-registration was even committed). The settings line now prints the TASK's own
  `$t.Settings` values read back after registration, not a hard-coded echo string (M8); the
  header's invocation example now gives `-StartAt` a concrete value and is otherwise unchanged
  from round 1 (it already used the absolute `<SP>\launch-h40c.cmd` shape M8 also asked for).
- `launch-h40c.cmd` — converted to CRLF (M3; was LF-only, the only one of the three `launch-h40*`
  files that was); adds `set NATIVELY_FLIGHT_COMMIT=REPLACE_WITH_FINAL_HEAD_BEFORE_ARMING` with a
  comment explaining this is a placeholder the controller fills in once HEAD is final (I8, and the
  mid-round Groq-arm addendum's point (b): da28f25 alone is not the final commit any more, so
  nothing here hardcodes it).
- `launch-h40c-dry.cmd` (new) — the `--dry-run` twin M3 asked for, modelled on
  `launch-h40b-dry.cmd`: runs every check through the behavioural guard, then stops (no
  `interview60.flight.mjs h40c` call). CRLF from creation. Per the addendum's point (c), this
  file itself never names an answer-model arm, so there is nothing in it for the controller to
  check for a dropped `--model qwen/`/`--model openai/` line — that check is on the REAL
  launcher's `interview60.flight.mjs h40c` call, and depends on the controller's own separate
  `ANSWER_MODELS` edit in MAIN, which this session does not touch.
- `h40c-void-cal.mjs`, `h40c-stats-cal-synth\*` (rebuilt), `guard-h40c-git-cal.mjs` (new
  calibration scripts/fixtures — see below).

## Calibration evidence, this round

**guard-h40c.mjs**, re-run against the scratchpad stub tree (`guard-h40c-cal\`), which I also
turned into a throwaway git repo (`git init`, one commit) purely so check 10b has something real
to compare `git rev-parse HEAD` against, without touching MAIN:

1. Correct env + `NATIVELY_FLIGHT_COMMIT` = the stub repo's own HEAD → `GUARD OK`, now also
   naming "HEAD pinned at `<sha>`, tree clean, .env carries none of the guarded names".
2. `NATIVELY_FLIGHT_COMMIT` unset → `GUARD FAILED: NATIVELY_FLIGHT_COMMIT is not set - ...`
   (replaces the old hardcoded-default behaviour entirely, per the Groq-arm addendum).
3. `NATIVELY_FLIGHT_COMMIT` = an all-zero SHA (wrong) → `GUARD FAILED: MAIN HEAD is <real>, not
   the registered commit 0000...0000 ...` (check 10b's HEAD pin).
4. A tracked file (`electron/knowledge/IntentClassifier.ts`) edited in the STUB repo only,
   correct HEAD → `GUARD FAILED: the tree the flight's rebuild will compile is not clean:
   electron/knowledge/IntentClassifier.ts` (check 10b's dirty-tree path, wired end to end through
   `execFileSync` and `unexpectedDirtyPaths`); restored, re-ran clean → `GUARD OK` again.
5. `.env` in the stub tree declaring `NATIVELY_VERBAL_HEDGE=1` (no real value, just the flag) →
   `GUARD FAILED: .env declares NATIVELY_VERBAL_HEDGE - ...` (check 10a); file removed, re-ran →
   `GUARD OK` again.
6. M1: `dist-electron/electron/llm/WhatToAnswerLLM.js` replaced with a plain-English sentence that
   contains the substring `(hedge)` (unescaped parens, the shape a JSDoc comment has) but neither
   `HEDGE_WINNER` nor `\(hedge\)__` → `GUARD FAILED: the build does not carry the hedge winner
   regex ...` — this is exactly the false-positive the review caught (the OLD check would have
   passed this case); restored, re-ran → `GUARD OK`.
7. The original 5 brief-required cases (hedge unset, follow-up=1, trigger=1, primary-model
   override, correct) were re-run against the updated file and are unaffected (still fail/pass as
   before) once `NATIVELY_FLIGHT_COMMIT` is supplied correctly alongside them.

All 7 (2-7 above; case 1 is the positive control) match expectations exactly.

**`guard-h40c-git.mjs`'s `unexpectedDirtyPaths()`**, calibrated in total isolation from git
(`guard-h40c-git-cal.mjs`, 6/6): the REAL captured output of `git -C MAIN status --porcelain --
electron src premium package.json` (2026-09-26, HEAD `da28f25`) is fully whitelisted; an empty
status is fine; a peer's edit to a tracked source file alongside the known-dirty files is NOT
whitelisted (the exact I8 failure scenario); an untracked file outside the known list is not
whitelisted; a rename is read by its destination path; CRLF line endings (a Windows git client)
don't confuse the parser.

**`h40c-hedge-stats.mjs`**, three calibration passes:
1. Negative (h40b copy, `h40c-stats-cal-h40b\`, unchanged from round 1): still prints
   `hedge not in effect: 0 of 44`; rule 1 now correctly reports VOID (startup line absent, 0%
   front coverage) instead of the old FAIL/PASS-style share numbers; rule 2 is still computed and
   printed (median 5.026s PASS, p90 13.608s FAIL by a rounding hair, failures 0 PASS) — proving
   "rules 2/3 always reported, VOID included" (C1) works.
2. Positive (`h40c-stats-cal-synth\`, REBUILT this round per I2/I10 — the startup line now sits
   BEFORE `startDebug` (byte 269 of 3783), `Stream failed` is tagged `[ERROR]`, a real redirect
   sequence is present (a `no answer - front empty, back empty`, the
   `WhatToAnswerLLM ... redirecting to` warning, a `(fallback)` answer-source line, THEN a second
   `front=`), and a supersede case is present (a dispatch that gets a `Stream failed` line then is
   immediately superseded, so that failure must NOT count)). Every field matched hand computation
   exactly: 5 windows, startup flag correctly read as `on trigger=5000ms`, front coverage 100%,
   1 redirect, answerFailures = 1 (the redirect's no-answer line; the superseded window's
   Stream-failed line correctly excluded), rule 1 not void, 3.5-lite share 2 of 4 windows (50%).
   This directly proves I2 (the old code would have printed "not observed" here — this is the
   exact bug the review caught, on a fixture shaped so the bug WOULD have mattered) and I4's
   supersede exclusion (the one Stream-failed line that should not count, doesn't).
3. VOID conditions (`h40c-void-cal.mjs`, 9/9, new tiny fixtures under `h40c-stats-cal-void-*\`):
   a clean one-window case is NOT void; a wrong startup trigger value is void, naming the mismatch;
   an absent startup line is void; one of two windows missing a `front=` line (50% coverage) is
   void, naming the percentage; two of two back-starts both `reason=front-error` (100% share) is
   void, naming the outage — and the share number in that case (0 of 2 windows won by 3.5-lite) is
   confirmed to appear only in the REPORTED share, never in `voidReasons`, proving C1's "reported,
   never gating" is actually true in the code, not just in the comment.

The M7 negative-check calibration from round 1 (`h40c-stats-m7-negative-check.mjs`, proving the
naive first-label rule would have misattributed 100% of answers to the head label) is unaffected
by this round's changes and still stands as evidence for the M7 fix, which this round did not
touch.

**register-h40c.ps1**: syntax-checked with
`[System.Management.Automation.PSParser]::Tokenize()` (0 parse errors) rather than executed —
running it for real would register an actual scheduled task, which remains forbidden. Not
calibrated behaviourally beyond that; I7/M8 are structural/textual fixes (drop a switch, add a
Mandatory attribute, read back `$t.Settings` instead of echoing a string) that don't have a
meaningful "break it and watch it fail" case short of actually registering a task, which this
session does not do.

**launch-h40c.cmd / launch-h40c-dry.cmd**: converted to CRLF and verified byte-for-byte (a small
PowerShell script counted `\r\n` vs bare `\n` occurrences: 56/0 and 57/0 respectively, i.e. every
line ending is CRLF, none bare LF). Re-checked ASCII-only and no-parens-in-echo, both clean. Not
run (per the controller notes and this round's own instruction — "nothing for you to run" on the
dry-run point specifically).

## PREREGISTER-h40c.md numbers — unchanged from round 1, re-confirmed

Round 1 already verified every h40b number (TTFT 5.0/13.6s, in-app 35/45, roster/grader-stamp/
model names, the probe's pooled numbers) against the committed `2026-09-26-h40b-result.md` and
`2026-09-25-hedge-probe-result.md`. Nothing in this round changed those source numbers; I5's new
"e311019 makes h40b's 35 not apples-to-apples" point is a bias disclosure on top of the same
verified 35, not a correction to it. That verification content used to live in the pre-registration
file itself (a "Verification" section); M9 says it must not (a committed pre-registration cannot
change after the hour, and a verification appendix inside it reads as part of the registered text).
It has been removed from the file and lives here instead, where it belongs procedurally.

## Deviations and judgment calls this round

- **I8's known-dirty whitelist was widened beyond the review's literal two-file example** — see
  `guard-h40c-git.mjs`'s own header comment and "Files changed" above. Grounded in the h40c plan's
  own global constraints, which already name the four additional scratch files as known and never
  staged; the review's own read-only pass evidently did not intersect the same untracked files my
  read did (possibly because they didn't exist in MAIN's working tree at the review's own read
  time, or its git status call was scoped differently) — but a check that would spuriously fail on
  MAIN's own current, expected state is not what I8 asked for.
- **`NATIVELY_FLIGHT_COMMIT` has no default at all**, not even `da28f25` (which I8's own text
  suggested as "a constant... plus any later docs-only commit the controller names"). The
  mid-round Groq-arm addendum made any hardcoded default wrong within the same round it would have
  been written, so I chose "fail loudly, no default" over "default to a value known to go stale
  imminently" — consistent with rule 11 (fail at the boundary rather than silently defaulting).
- **The synthetic positive-calibration fixture was rebuilt from scratch**, not patched, once I2
  and I10 made clear the old one's shape (startup line at byte 0 with `startDebug: 0`) could not
  have caught the I2 bug by construction. The new fixture is still hand-built, not a real smoke
  log — I10's own fix explicitly keeps the real-smoke-log calibration as the controller's own
  post-smoke blocking checklist item, not something this round could do (no smoke has run).
- **The Groq-arm addendum's point (a)** ("states in one line") is rendered as a short paragraph
  (3 sentences) rather than a single line, because the addendum's own text also requires
  distinguishing the removed 120b answer arm from the unchanged 20b detector by name — doing that
  clearly needs more than one line; the substance (no rule/row uses the removed arms; the detector
  is unchanged) is stated in the first two sentences, the disambiguation in the third.

## Open concerns (updated)

- **Checks 10a and 10b have not yet had a real-MAIN pass** from anyone (only the round-1 checks
  1-9 have, via the controller's `guard-h40c-realcal.txt`, 5/5). The controller re-runs the
  real-dist guard calibration after this round per the original instruction; that re-run should
  now also exercise 10a/10b against MAIN's real HEAD and tree, not just the stub-repo proxy this
  session used.
- **`NATIVELY_FLIGHT_COMMIT`'s placeholder value in both `.cmd` files must be filled in by the
  controller before arming** — `REPLACE_WITH_FINAL_HEAD_BEFORE_ARMING` is not a real SHA and
  `git rev-parse HEAD` will never equal it, so the guard will correctly refuse to arm until this
  is done; this is intentional (fail loudly) but is a manual step someone must remember to do,
  named here so it isn't missed.
- **The two Groq answer-arm-removal and pre-registration commits have not landed yet** — this
  round's PREREGISTER draft and launcher/guard files describe and expect them but were written
  before they exist. The controller commits the pre-registration only after they do (per I6/I8),
  and only then can `NATIVELY_FLIGHT_COMMIT` be filled in with a real, final value.
- **The answer-failures ceiling's provenance** (round 1's note: 0, corroborated by a raw-log grep,
  not a printed count in the committed h40b result) still applies; I4's redefinition this round
  (Stream failed + no-answer-empty-empty, superseded windows excluded) does not change h40b's 0,
  since h40b's log has neither pattern regardless of window logic.
- `[Main] verbal hedge: on trigger=...` / `off` — round 1 noted this did not exist in
  `electron/main.ts` yet; it exists now (`describeVerbalHedgeAtStartup`, confirmed via `git show
  da28f25` and a direct grep of MAIN's current `main.ts`), so this concern from round 1 is
  RESOLVED.

## Status (superseded by Fix round 2 below)

DONE_WITH_CONCERNS — every Critical/Important/Minor finding in the review has a corresponding
code, script, or pre-registration change above, each recalibrated (guard: 7 stub-tree cases + 6
pure-predicate cases; stats script: 1 negative real-copy case + 1 rebuilt realistic positive case
+ 9 VOID-logic cases); the mid-round Groq-arm addendum is applied to the pre-registration, the
guard's commit-pinning default, and both launcher comments. Concerns carried forward are the ones
inherent to a fix round that runs before the commits it describes exist: checks 10a/10b await a
real-MAIN pass, `NATIVELY_FLIGHT_COMMIT` awaits a real value, and the pre-registration awaits the
two commits and its own commit before any of this can fly.

---

# Fix round 2 (2026-09-26, ~19:30-19:55)

The controller's Opus re-review (`SP\sdd\2026-09-26-h40c\task-8-rereview.md`) returned
NOT ALL ADDRESSED / SPEC FAIL: C1 was not actually fixed (1 of its 3 parts still wrong), plus 2
new Important and 8 new Minor findings (N1-N11). All rulings accepted; this section applies every
one. MAIN HEAD at the time of this round's fact-finding was `18242df` (07a0e5e + e311019 +
6c50ec3 + da28f25 + 51e349d + 18242df); `interview60.flight.mjs` also carries an UNCOMMITTED
working-tree edit already dropping the two Groq answer arms (confirmed by reading the file and by
`git status`/`git diff --stat` on it) — the arm-removal commit named in the pre-registration does
not exist yet, consistent with the ruling's own framing.

## N1 (Critical) — VOID(c)'s denominator was still wrong

The pre-registration and the script both divided the front-error count by **back-starts**. The
ruling (matching the re-review's own finding) is that the denominator must be **hedge runs** —
the count of `verbal hedge: front=` lines across the hour. The bug mattered because back-starts
are rare in a fast hour (the live probe's H1 and H3 started only 3 and 4 of them across 39
answers each), so a couple of front-errors among a handful of back-starts could hit 50% while
being under 5% of the hour's true hedge-run count — voiding a healthy, fast hour and excusing
whatever rule 3 would otherwise have reported.

- `h40c-hedge-stats.mjs`: `frontErrorShare` now divides by `front.length` (exported as
  `hedgeRuns`), not `backStarted.length`. The `voidReasons` message and the report's own
  "hedge runs" line were updated to match.
- `PREREGISTER-h40c.md` rule 1(c): reworded to say hedge runs explicitly, not back-started lines.
- **New calibration** (`h40c-void-cal.mjs`, two new cases, the exact ones the re-review's rule-8
  note asked for): 10 hedge runs with 2 front-error back-starts → NOT void (20% of 10, where the
  old back-starts-only denominator would have given 2 of 2 = 100%, i.e. wrongly void); 10 hedge
  runs with 5 front-error back-starts → void (exactly 50%). Both assert the exact `hedgeRuns` and
  `frontErrorShare` values as well as the boolean. All 14 cases in the file (9 from fix round 1 +
  the new 5, counting the two new ones' sub-assertions) pass — see the transcript below. Building
  the 10-run fixture generator caught its own bug on the first run (a fractional offset merged
  into the seconds field of a hand-built timestamp instead of the milliseconds field, producing
  an invalid string) — fixed and re-verified before trusting the result, which is itself evidence
  the calibration is doing real work, not rubber-stamping.

## N2 (Important) — 6c50ec3 was misdescribed, and the commit list was incomplete

Applied exactly as ruled:
- The pre-registration and `launch-h40c.cmd`'s header comment no longer say the follow-up restore
  was "validated offline" — they say its offline replay FAILED its pre-registered rule (commit
  `51e349d`: wrong answers 0 to 1, acceptable 16 to 22), so the flag stays off because it did not
  clear its own bar, not because of scheduling.
- Both now name `SessionTracker.addAssistantMessage` as the thing 6c50ec3 changes with the flag
  off (it stores `questionContext` in the response history), not `TemporalContextBuilder` (which
  only declares the type and reads nothing extra with the flag off).
- The pre-registration's commit list now runs the full distance from `07a0e5e` to the registered
  HEAD, each tagged by kind (harness / app / docs), including `51e349d` and `18242df` (both
  already in MAIN) and the still-pending arm-removal commit, written as the literal placeholder
  `ARM_COMMIT_HASH` per the ruling, for the controller to fill in.

## N3 (Important) — the redirect bullet and the fixture both described behavior the code cannot produce

Read the actual code paths named in the re-review (`streamGeminiWithHedge`'s `return; // both
empty` with no throw; `withVerbalFallback` only catching thrown errors; `IntelligenceEngine`'s
"Could you repeat that?" fallback) to confirm the distinction: **both legs ERROR with no token →
throws → the pre-token redirect re-runs the pair** (up to four requests); **both legs simply END
EMPTY → returns quietly, no redirect, the user gets the generic fallback line, one charged
failure**. The synthetic fixture's old redirect window used an empty-empty-then-redirect shape
that the real code cannot produce (an empty-empty return never throws, so nothing redirects) —
rebuilt (see N5 below, same fixture) with a real error-triggered redirect (front errors, a
generic `no answer - front error, back empty` line — NOT the exact-match failure pattern — then a
real redirect warning, a `(fallback)` announcement, a second `front=`, then a clean win) that
ends with 0 charged failures, and a separate, unrelated window that ends in the exact
`front empty, back empty` line with no recovery, charging exactly 1. The pre-registration's
"Not covered" redirect bullet is rewritten to state this distinction directly instead of the
previous (wrong) unified description.

## N4 (Minor) — p90 ceiling now compared at h40b's exact value

`H40B_RULE.p90CeilingS` changed from `13.6` to `13.608` (h40b's real underlying p90; `13.6` is
just how the committed result's prose rounds it). Re-running the stats script on the h40b copy
now reports `p90 PASS` against its own reproduction of h40b's number (`13.608s`), where round 1's
`13.6` ceiling had it reading `FAIL` against itself — a comparison being wrong about the exact
case it was built from is precisely what rule-8 calibration is supposed to catch, and did once
someone looked. The pre-registration's rule 2 text now says "13.608 s exactly (not the 13.6 s
h40b's result rounds to in prose...)".

## N5 (Minor, but the deeper fix) — stale lines from a superseded generation need their own bucket, not a heuristic

Round 1's fix excluded a window from failure-counting whenever the NEXT window's dispatch type
was `supersede` (a structural, adjacency-based heuristic). The ruling replaces this with a
precise, content-based rule: **a window is a real failure only when it has a failure line
(`Stream failed` or the exact `front empty, back empty`) and NO `won by` line in that same
window.** A window with BOTH is not a failure — it is counted and reported separately as
**"ambiguous"** — because the code's actual mechanism for a stale line is not "the next dispatch
was a supersede", it is "an earlier generation's hedge race kept running after a consumer
`.return()`-ed its stream, and its eventual result — win, error, or empty — lands wherever it
happens to land chronologically, inside whichever window is open at the time". This is simpler
code (no more `supersededByNext` bookkeeping) and more correct: it does not depend on the
superseding event being the VERY NEXT dispatch, only on a won-by actually being present in the
same window as the failure line. `answerFailures` and a new `ambiguousFailures` field are both
returned and both printed. The synthetic fixture's made-up `"Stream failed: aborted for a fuller
supersede"` line (which the real code never logs — a superseded generation is ended by the
consumer's own `.return()`, not an error) was removed entirely; the rebuilt fixture instead has a
window whose own fresh hedge race resolves normally (a `won by` line) AFTER a stale, out-of-order
`no answer - front empty, back empty` line lands in the same window — exactly the shape N5
describes — and the script correctly reports that as 1 ambiguous, 0 charged. The pre-registration
states this edge case directly inside rule 2's own failure definition, not as a footnote.

## N6 (Minor) — the `.env` name parser now matches dotenv's own accepted shapes

Round 1's parser (`line.split('=')[0].trim()`) missed `export NAME=value` and `NAME: value`, both
of which MAIN's installed dotenv (17.3.1) accepts — read its own `LINE` regex from
`node_modules/dotenv/lib/main.js` to confirm the exact shape, then used the simplified
name-capture form the controller gave (`/^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)/`) in
`guard-h40c.mjs` check 10a. Recalibrated with both forms against the stub tree (a fresh `.env`
file for each): `export NATIVELY_QUESTION_DETECTION_MODEL=...` and
`NATIVELY_VERBAL_HEDGE_TRIGGER_MS: 9999` both now correctly fail check 10a; both would have
silently passed round 1's parser.

## N7 (Important) — the Groq-arm addendum is now mechanically proven, not just asserted

Per the ruling's explicit choice (option B, not the dry-run-flight-invocation option): added
check 11 to `guard-h40c.mjs`, which imports `ANSWER_MODELS` live from MAIN's own
`interview60.flight.mjs` (via `pathToFileURL`, the same pattern check 1 already uses for the
roster) and fails if any id contains `/` (every Groq id does; neither Gemini lite id ever will).
Also added `NATIVELY_QUESTION_DETECTION_MODEL` to check 10a's guarded `.env` names, and a direct
check that this session's own `process.env.NATIVELY_QUESTION_DETECTION_MODEL` is unset (there is
no built module to resolve it through the way checks 3-4 do for the answer model and thinking
level — `GroqDetectionClient` reads `process.env` inline — so this check reads it directly).
`launch-h40c-dry.cmd`'s comment, which had asked the controller to check the launcher's OWN
`--model` arguments (the launcher never names arms — they live in `ANSWER_MODELS`, so that
instruction proved nothing) was rewritten to point at the new guard check instead, and per the
ruling NO flight `--dry-run` invocation was added to the dry twin.

Calibrated on the stub tree (committing each state so check 10b's tree-cleanliness check does not
interfere with isolating check 11): an injected `openai/gpt-oss-120b` id in a copy of
`interview60.flight.mjs` correctly fails check 11 ("ANSWER_MODELS still carries a Groq id:
openai/gpt-oss-120b"); restored, GUARD OK again. `NATIVELY_QUESTION_DETECTION_MODEL` set in the
process correctly fails with a named message. The full positive case now also prints
`question detector unchanged, ANSWER_MODELS = [...]` in the GUARD OK line.

## N8 (Minor) — "start" and the out-of-window verdict are now both defined

The pre-registration now defines "start" as the flight's own recorded playback start (not the
scheduled-task trigger time — the app's own startup probe can take a long time after the task
fires, so a task armed just before the window can still start playback after it closes), and
states the out-of-window verdict explicitly: rule 2 is reported but not gated, and the hour
CANNOT PASS outside the window — its verdict reads "no latency verdict this hour; re-fly inside
the window before this counts toward a ship decision" — though rule 1 (VOID) and rule 3 (quality)
still apply and are read normally.

## N9 (Minor) — wording pass: no scratchpad paths or review-process labels in the committed file

Removed every instance of C1/I1-I10/M1-M10-style labels, "Task 7", "Task 8", the scratchpad-
prefixed script path, and "fix-round-1 synthetic fixture" from `PREREGISTER-h40c.md`, replacing
each with a description of the thing itself (e.g. "a pre-hour smoke run through the same
app-start chain the flight itself uses" instead of naming a task by number). Also fixed the
specific wording bugs named: VOID (b) is now described as measuring hedge-run/front-line coverage
across answer-dispatch windows, not "the back leg" (back-starts are a different measurement, the
one N1 fixed); R07F is now described as "would be attributed, not graded" rather than "graded
acceptable" (a replay is not a grading run). Verified by grepping the committed-ready file for
every named pattern — zero matches (see the calibration/verification section below).

## N10 (Minor) — a window without a won-by now prints "none"

The per-window descriptive label used to fall back to the last `answer source:` line when no
`won by` line existed — which, per the M7 finding round 1 already fixed for the RULE's own share
computation, is the stale head label (the shipped default, announced before any request), not a
real answer. The fallback repeated that same trap one level down, in the DESCRIPTIVE label only.
Removed the fallback entirely (and the now-unused `answerSource`/`reAnswerSource` matching that
existed only to support it) — a window with no `won by` line now reports `"none"`. Confirmed in
the rebuilt fixture: the superseded window (which never gets its own `won by`) now reports
`"none"` where round 1's script reported `"gemini-3.1-flash-lite"`.

## N11 (Important) — nothing had run against MAIN, and nothing blocked arming on it

- `NATIVELY_FLIGHT_COMMIT` is trimmed (`?.trim()`) before comparing to `HEAD`, so a trailing
  space or CRLF artifact on the launcher's `set` line cannot fail the check for a reason
  unrelated to which commit is checked out — calibrated by padding the value with leading/
  trailing spaces in the stub-tree run and confirming `GUARD OK` still results.
- The pre-registration gained a second blocking checklist item: register the dry-run launcher as
  its own scheduled task, with the final commit filled in, and require `GUARD OK` in its own
  launcher log before arming the real flight — since checks 8, 10a, 10b and the new check 11 have
  never run against MAIN itself, only against the isolated stand-in this session built. It also
  now states explicitly that once the real flight is registered, MAIN is FROZEN until the hour:
  any commit moves HEAD and makes the guard refuse.

## M8 nit

`register-h40c.ps1`'s header example used a bare relative `-File register-h40c.ps1`; changed to
the absolute scratchpad path, matching the launcher argument on the same line.

## Files changed this round

- `h40c-hedge-stats.mjs` — N1 (hedge-runs denominator), N4 (13.608s ceiling), N5 (per-window
  failure/ambiguous rule replacing the supersede-adjacency heuristic, `ambiguousFailures` field),
  N10 ("none" label, `answerSource` matching removed as now-dead code), doc-comment updates.
- `h40c-void-cal.mjs` — two new N1 cases (`buildRuns` generator + its own bugfix, see N1 above).
- `h40c-stats-cal-synth\*` (natively_debug.log, verbal-diag.log, interview60.timeline.json) —
  rebuilt again per N3/N5: a real error-triggered redirect window (0 failures), a terminal
  empty-empty window (1 failure), and an ambiguous window (a stale empty-empty line followed by
  the window's own real won-by — 1 ambiguous, 0 charged). The made-up Stream-failed-before-
  supersede line is gone.
- `guard-h40c.mjs` — N6 (dotenv-shape `.env` name parser), N7 (check 11: live `ANSWER_MODELS`
  import + Groq-id check; `NATIVELY_QUESTION_DETECTION_MODEL` added to check 10a and given its
  own direct `process.env` check), N11 (`NATIVELY_FLIGHT_COMMIT` trimmed before comparing), GUARD
  OK message extended to report the detector and arm-list state.
- `guard-h40c-cal\` (the isolated stand-in repo) — gained a copy of `interview60.flight.mjs` (for
  check 11 to import) and several new commits made purely to isolate individual calibration cases
  from check 10b's tree-cleanliness check; final state is clean and at a fresh commit.
- `stage\...\passes\PREREGISTER-h40c.md` — rewritten per N2, N3, N4, N5, N8, N9, N11 (see each
  section above); N1's rule-1(c) wording and the two blocking checklist items are both here too.
- `launch-h40c.cmd` — N2 (6c50ec3's header comment corrected); reconverted to CRLF after the edit.
- `launch-h40c-dry.cmd` — N7 (comment rewritten to stop claiming the launcher names answer arms;
  points at the new guard check instead); reconverted to CRLF after the edit.
- `register-h40c.ps1` — M8 nit (absolute path in the header's invocation example).

## Calibration evidence, this round

**h40c-hedge-stats.mjs / h40c-void-cal.mjs**: full run below (14 cases, all `ok`, including the
two new N1 cases and their exact-value sub-assertions):
```
ok   clean fixture is NOT void
ok   C1(a) wrong trigger: void
ok   C1(a) reason names the mismatch
ok   C1(a) absent startup line: void
ok   C1(b) 1 of 2 windows missing front=: void
ok   C1(b) reason names the coverage number
ok   C1(c) 2 of 2 back-starts are front-error: void
ok   C1(c) reason names the outage
ok   C1(c) share is reported, not the void reason
ok   N1: 10 runs, 2 of 10 front-error (20%): NOT void
ok   N1: 10 runs, 2 of 10 front-error: hedgeRuns=10
ok   N1: 10 runs, 2 of 10 front-error: frontErrorShare=0.2
ok   N1: 10 runs, 5 of 10 front-error (50%): void
ok   N1: 10 runs, 5 of 10 front-error: reason names the outage
VOID CALIBRATION OK
```
The rebuilt synthetic fixture's full report matched every hand-computed value exactly: 6 windows,
7 hedge runs (front= lines), front coverage 100%, 1 redirect, 1 charged failure (the terminal
empty-empty window), 1 ambiguous (the stale-line-plus-real-win window), rule 1 not void, 3.5-lite
share 3 of 4 windows (75%), median 2.1s / p90 6.3s. The h40b copy still prints
`hedge not in effect: 0 of 44`, now also `p90 PASS` against the corrected 13.608s ceiling and
`sourceLabels: {"none":44}` (N10 confirmed on real data, not just the synthetic fixture).

**guard-h40c.mjs**: re-run against the stub tree (now containing a copy of `interview60.flight.mjs`
and several new commits to isolate cases from check 10b), all as expected:
1. Correct env, correct trimmed-padded `NATIVELY_FLIGHT_COMMIT` → `GUARD OK`, now also printing
   the detector and `ANSWER_MODELS` state.
2. An injected Groq id in the stub's own `interview60.flight.mjs`, committed so check 10b sees a
   clean tree → check 11 fails naming the id; restored, `GUARD OK` again.
3. `NATIVELY_QUESTION_DETECTION_MODEL` set in the process → fails naming it.
4. `.env` with `export NATIVELY_QUESTION_DETECTION_MODEL=...` → check 10a fails (round 1's parser
   would have missed this form).
5. `.env` with `NATIVELY_VERBAL_HEDGE_TRIGGER_MS: 9999` (colon form) → check 10a fails (also
   missed by round 1's parser).
6. `NATIVELY_FLIGHT_COMMIT` padded with leading/trailing spaces, otherwise correct → `GUARD OK`
   (the trim fix).
7. Final full sanity re-run, clean env → `GUARD OK`, all 11 checks.

**register-h40c.ps1**: re-checked with `PSParser.Tokenize` (0 errors) after the M8 edit; not
executed, for the same reason as round 1.

**Both `.cmd` files**: re-verified CRLF-only, ASCII-only, no parens in echo lines after their N2/
N7 comment edits (the edit tool writes LF; both were reconverted to CRLF and re-checked, same
PowerShell byte-count method as round 1: `launch-h40c.cmd` 58/0, `launch-h40c-dry.cmd` 61/0).

**PREREGISTER-h40c.md**: grepped for every review-label pattern, "Task 7"/"Task 8", the
scratchpad-prefixed path, and the DRAFT banner / Verification section (round 1's M9, re-checked
since this file was rewritten wholesale again) — zero matches on all of them.

## Deviations and judgment calls this round

- N1's two new fixtures use a small generator function rather than 20 hand-written log lines each
  (10 lines x 2 fixtures would have been repetitive and error-prone to eyeball); the generator's
  own first run exposed a genuine bug in its timestamp math (see N1 above) — left in as evidence
  the calibration is real, not asserted.
- N9's removal of script filenames from the pre-registration went slightly further than the
  ruling's literal examples: the document no longer names `guard-h40c.mjs` or the hedge-mechanics
  script by filename anywhere, referring to them functionally instead ("the pre-flight guard", "a
  script that reads the hour's own logs..."). The ruling's examples were review-process labels and
  one explicit scratchpad path; script filenames are arguably legitimate instrument names rather
  than session artifacts, but since a future reader of the committed file cannot resolve a
  scratchpad-only filename to anything either way, describing the tools functionally seemed safer
  than guessing which names would be judged acceptable.
- Chose not to re-litigate round 1's already-accepted "known-dirty whitelist" deviation
  (`guard-h40c-git.mjs`) — nothing in this round's findings touched it, and the re-review's own
  "Status of each original finding" entry for I8 calls it "addressed, with one justified
  deviation".

## Open concerns (updated)

- **Checks 8, 10a, 10b and the new check 11 have still never run against MAIN directly** — only
  against the isolated stand-in repository. This is now an explicit BLOCKING checklist item in
  the pre-registration itself (N11), not just a note in this report, precisely because it kept
  being deferred across two rounds.
- **`NATIVELY_FLIGHT_COMMIT`'s placeholder value in both `.cmd` files still needs a real value**
  before arming — unchanged from round 1, and per this round's own addendum ruling, intentionally
  left as a placeholder rather than guessed at, since the arm-removal and pre-registration commits
  do not exist yet.
- **The Groq-arm-removal commit is uncommitted in MAIN's working tree right now** (confirmed by
  reading the file directly), consistent with the ruling's framing that it "exists before the
  pre-registration is committed" — but it does not exist as a commit yet, so `ARM_COMMIT_HASH`
  remains a literal placeholder token, not a guess.
- The answer-failures ceiling's provenance (0, corroborated by a raw-log grep of the h40b copy,
  not a printed count in the committed result) is unchanged by this round's redefinition — h40b's
  log has neither failure pattern regardless of which window rule is applied.

## Status (superseded by Fix round 3 below)

DONE_WITH_CONCERNS — every finding in the re-review (the 1 not-yet-addressed original Critical
plus N1-N11) has a corresponding code, fixture, or pre-registration change, each recalibrated
(14/14 on the VOID/hedge-runs suite, 7 guard cases including 2 new negative cases for N6 and 1 for
N7, plus the trim fix). The concerns that remain are structural to where this flight is in its own
process: the two commits the pre-registration depends on do not exist yet, so the guard's
commit-pin, the real-MAIN calibration, and the dry-twin scheduled-task registration are all
BLOCKING items handed to the controller rather than things this session could complete itself.

---

# Fix round 3 (2026-09-26, ~20:00-20:20)

A second re-review (`SP\sdd\2026-09-26-h40c\task-8-rereview2.md`) returned ALL ADDRESSED for every
finding in rounds 1-2, plus 6 new Minor findings, R1-R6. Because the pre-registration is permanent
once committed, all six are fixed now rather than deferred. Facts gathered before any edit, against
real MAIN (`C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`, branch
`fix/coding-style-suffix-all-gemini`): HEAD is `e94305a2ec6a23273caf71ce979a7db199dc910e`
("fix(flight): the flight answers on the two Flash Lites only, no Groq arms") — the Groq-arm-
removal commit named as a placeholder in rounds 1-2 has now landed; `git log --oneline
07a0e5e..HEAD` confirms the full commit list `e311019, 18242df, 51e349d, da28f25, 6c50ec3, e311019`
(reverse-chronological) matches what the pre-registration already named; `electron/SessionTracker.ts:244`
logs `` console.log(`[Answer] full: ${JSON.stringify(text)}`) `` for any non-empty delivered
answer; `electron/llm/WhatToAnswerLLM.ts:427-429` yields `[No answer — the answer model failed:
...]` / `[No answer — both the primary model and the <fallback> fallback failed: ...]` on its own
catch block (the hedge's Stream-failed path); `electron/IntelligenceEngine.ts` separately carries
its own generic fallback text, `"Could you repeat that? I want to make sure I address your
question properly."`, for the quiet both-legs-empty case; `electron/main.ts` truncates
`natively_debug.log` on every app start (`fs.writeFileSync(logFile, ...)` at :3431) but never
touches `verbal-diag.log` anywhere in the tree (grepped) — confirming it is genuinely append-only
and cumulative across app restarts, which R3's recipe below depends on.

## R1 — check 11 passed on an absent export

**Where:** `guard-h40c.mjs` check 11 used `(flightMjs.ANSWER_MODELS ?? []).filter((id) =>
id.includes('/'))` — an absent or renamed export produces `[]`, which contains no `/` id, so the
check passed and `GUARD OK` printed `ANSWER_MODELS = undefined`.

**Fix:** require an EXACT array match — order, length, and content — against
`['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']`, the same two ids `PAIRED_ARMS` itself indexes
by position. A rename, a reorder, a dropped id, or an extra id now all fail the same test a Groq id
would; the old `.includes('/')` check is fully subsumed and removed.

**Calibration** (`r1-cal.mjs`, run against `guard-h40c-cal\`, each state committed so check 10b's
tree-cleanliness check does not interfere): exact match at the stub's own HEAD → `GUARD OK`,
`ANSWER_MODELS = ["gemini-3.1-flash-lite","gemini-3.5-flash-lite"]`; the export removed entirely
→ `GUARD FAILED: ANSWER_MODELS is undefined, not exactly [...]`; a third id added → `GUARD FAILED:
ANSWER_MODELS is ["gemini-3.1-flash-lite","gemini-3.5-flash-lite","gemini-3.5-flash"], not exactly
[...]`; restored → `GUARD OK` again. All 4 cases (2 positive, 2 negative) matched expectations
exactly; final stub HEAD left at a fresh, clean commit (`7e28816ed0e507d1e815225893beee9507792d22`).
A full 11-check end-to-end re-run against that same clean HEAD afterward also read `GUARD OK`.

## R2 — an ambiguous window also hides a real failure after its own first token

**Problem:** a window with both a failure line and a `won by` line was reported as "ambiguous" and
never charged, on the theory that the failure line must be a stale straggler from an earlier,
superseded generation. But the SAME shape also results when a window's own fresh race wins a first
token and then its own stream fails afterward (`WhatToAnswerLLM`'s catch block, a real thrown
error) — a genuine, chargeable failure indistinguishable from the stale case by line adjacency
alone. The pre-registration also claimed every such window's "own answer was delivered", which is
false in this second case.

**Fix:** resolve every such window using its OWN `[Answer] full:` line instead of guessing from
shape. `h40c-hedge-stats.mjs` gained `reAnswerFull` (matching
`` [LOG] [Answer] full: "<JSON-escaped text>" ``) and `FAILURE_TEXT_MARKERS` (`'[No answer —'` and
the `IntelligenceEngine` fallback text, checked as a plain substring — JSON.stringify never escapes
either marker's characters, so no JSON.parse is needed). Per window: no `[Answer] full:` line at
all → `unresolvedAmbiguous` (makes rule 2 INCOMPLETE, see R6); the last such line's text contains a
failure marker → `resolvedAsFailure` (folded into `answerFailures`, the gating number); otherwise →
`resolvedDelivered` (not charged). `PREREGISTER-h40c.md` rule 2 drops the false "its own answer was
delivered" claim and states the three-way resolution directly.

**Calibration** (`h40c-r2r6-cal.mjs`, 3 dedicated synthetic fixtures, `hedgeStats()` imported
directly): a window whose own fresh win is followed by its own `Stream failed` and a `[No answer —
...]` answer line → `resolvedAsFailure=1`, `answerFailures=1`, `rule2Incomplete=false`; a window
with a stale empty-empty line beside its own real win and a real `[Answer] full:` line →
`resolvedDelivered=1`, `answerFailures=0`; the same shape with NO `[Answer] full:` line at all →
`unresolvedAmbiguous=1`, `answerFailures=0` (never silently charged either), `rule2Incomplete=true`,
naming the reason. All 3 cases, 7 assertions each, passed exactly. The realistic fixture
(`h40c-stats-cal-synth\`, rebuilt — see "Files changed" below) demonstrates all three outcomes
together in one report: `answer failures: 2 = 1 clean + 1 resolved-ambiguous`; `windows with BOTH a
failure line and a won-by line: 3 total — 1 a real failure, 1 a real delivered answer, 1
UNRESOLVED`; rule 2's own line correctly reads `failures FAIL — INCOMPLETE, cannot read PASS (1
window(s) had both a failure line and a won-by line but no [Answer] full: line...)`.

## R3 — blocking item 1 could not be executed as written

**Problem:** the smoke harness (`launch-smoke-hedge.cmd`, Task 7's own deliverable) writes no
`interview60.timeline.json`; it restarts the app once per segment, which resets
`natively_debug.log` (only the launcher's own per-segment copies,
`interview60.runs\smoke-hedge-{forced,default,off,refuse}.natively_debug.log`, survive); and
`verbal-diag.log` is never split per segment — it is one continuous, append-only file across all
four segments (confirmed this round: `main.ts` never truncates it).

**Fix:** rewrote blocking item 1 in `PREREGISTER-h40c.md` as an executable recipe using the smoke
harness's REAL file names: read the `default` segment's own debug-log copy (its startup line must
read exactly `on trigger=5000ms` — the `forced` segment's copy reads `on trigger=1ms` by design and
must not be read here by mistake); window start = byte offset of the first `dispatch: answer` line
after that startup line; window end = that file's own size; bracket the one cumulative
`verbal-diag.log` using the start instant on the `default` segment's own progress log (its second
line, a bare ISO timestamp) through the start instant on the NEXT segment's progress log (its
second line) — with an explicit pooled-fallback when the diag lines carry no parseable timestamp.
Built `h40c-smoke-window.mjs`, a small wrapper that turns those real smoke-harness files into one
flight run folder `h40c-hedge-stats.mjs` can already read unmodified (`natively_debug.log`,
`verbal-diag.log`, a synthesized `interview60.timeline.json`) — no flag or change to the stats
script itself was needed. `buildSmokeWindow()` throws on a bad premise (refactored from an initial
`process.exit(1)` specifically so it could be calibrated in-process, try/catch, the same way the
stats script's own functions are); only the CLI entry point converts a thrown error to a printed
message and exit 1. Also fixed the same accented-path-unsafe `isMain` check this file was first
written with (the M4 class of bug, `fileURLToPath` instead of a hand-rolled URL-pathname decode).

**Calibration** (`h40c-smoke-window-cal.mjs`, a synthetic copy of what the smoke harness actually
produces, 4 cases / 13 assertions): the correctly-shaped `default` segment → `startDebug`/`endDebug`
match hand computation exactly (269/685 bytes), not pooled, and the run folder it builds is read
end to end by `hedgeStats()` (1 dispatch window, startup flag `on trigger=5000ms`, first-token n=2
— the two diag lines that fall inside the window, correctly excluding one line before it and one
after); the FORCED segment's own debug log fed in as "default" → throws, naming that it "is not the
default segment (the forced segment reads \"on trigger=1ms\" by design)"; a segment with a startup
line but no `dispatch: answer` after it → throws, naming that "the segment never answered
anything"; diag lines with no parseable timestamp → `pooled=true`, the whole file used, with a
printed warning naming the pooling. All 13 assertions passed (one test-authoring mistake was
caught and fixed along the way: the fixture actually has 2 diag lines inside its window, not 1 as
first assumed — the calibration's own assertion was wrong, not the code; rule-8 in action).

## R4 — the freeze started at the wrong point

**Problem:** the commit list already named "this pre-registration's own commit" as the registered
HEAD, but the arming section only froze MAIN "once the real flight is registered" — a later
sentence contradicting an earlier one. Any commit landing between the pre-registration commit and
a later "registration" event (for example, recording a blocking item's own output) would make the
commit-list claim false and force a new `NATIVELY_FLIGHT_COMMIT`.

**Fix:** the freeze now explicitly starts at "this pre-registration's own commit (the registered
HEAD named above)" and runs through the hour; both blocking items are stated to run against that
same frozen tree (item 2 needs that commit's own hash to register against, so it necessarily runs
after the commit exists) and before the real flight is armed; neither item's own output is ever
committed to MAIN — the smoke run's logs land in `electron/test/golden/interview60.runs/`, already
git-ignored (confirmed this round, `.gitignore` line ~258), and anything else stays outside MAIN
entirely. No code changed for this finding; it is a `PREREGISTER-h40c.md` wording fix only.

## R5 — wording pass

Applied all eight items exactly as ruled, all in `PREREGISTER-h40c.md` unless noted:
- (a) "BOTH legs end in an ERROR" (three occurrences: the `da28f25` bullet, rule 2's own failure
  definition, and the "Not covered" double-failure bullet) → "neither leg has produced a token and
  either one has errored" — matching the real code
  (`LLMHelper`: `if (f.kind === 'error') throw …; if (b.kind === 'error') throw …`). The correct
  "both legs simply end empty" phrasing (the OTHER case, genuinely requiring both) was left as is —
  re-grepped for `BOTH legs`/`both legs` afterward: exactly 3 hits remain, all 3 the correct empty-
  case phrasing, zero the old error-case phrasing.
- (b) VOID(b)'s gloss in "What a FAIL, VOID, or INCOMPLETE means" — "too few of the hour's hedge
  runs ever reached the front= line at all" (nonsensical: hedge runs ARE front= lines by
  definition, N1) → "too few answer-dispatch windows ran the hedge at all — had a `front=` line".
- (c) "though it can still FAIL on rule 1 (VOID)" → "though rule 1 can still VOID, or rule 3 can
  still FAIL (quality)" — rule 1 never FAILs, only VOIDs.
- (d) "what leg 3 measures" → "what rule 3 measures" (Not covered section).
- (e) every "the controller" removed and rephrased to say what happens and when: the
  `ARM_COMMIT_HASH` parenthetical (folded into (f) below); the quota section's full-Flash-sidecar
  aside ("if the controller runs one anyway" → "a full-Flash sidecar run anyway, for descriptive
  interest only"); blocking item 1, fully rewritten under R3 above. Also fixed
  `launch-h40c.cmd`'s own `NATIVELY_FLIGHT_COMMIT` comment (one more occurrence, not in the
  re-review's line-numbered scope since that scope was `PREREGISTER-h40c.md` only, but the same
  problem and the same general instruction to remove every one) — it also now reflects that the
  arm-removal commit has already landed (e94305a), leaving only the pre-registration commit itself
  still pending. Re-grepped `PREREGISTER-h40c.md` for `the controller`, case-insensitive: zero hits.
- (f) the literal `ARM_COMMIT_HASH` token and its whole parenthetical replaced with the real commit
  `e94305a` and its real message, "fix(flight): the flight answers on the two Flash Lites only, no
  Groq arms" (verified against MAIN this round, see the fact-finding note above).
- (g) one precision for both latency ceilings: the median ceiling was `5.0 s + 1.0 s` (rounded)
  while p90 already used the exact `13.608 s`; changed to `5.026 s + 1.0 s` (`6.026 s` exactly).
  Re-verified 5.026 live against the h40b copy with this round's own script, immediately before
  writing the constant: `first token n=44 median=5.026s p90=13.608s`. `H40B_RULE.medianCeilingS` in
  `h40c-hedge-stats.mjs` now reads `5.026 + 1.0`; the h40b copy still reads `median PASS` against
  it (5.026 ≤ 6.026).
- (h) `51e349d`'s and `18242df`'s glosses were substantively wrong, not just imprecise — checked
  against MAIN's real commit messages this round (`git show --stat` / `git log -1` on both, see the
  fact-finding note above) rather than guessed at: `51e349d` registered the follow-up-restore
  pre-registration, but a copy-script bug on a source path over 260 characters ALSO wrote that same
  pre-registration text into the result file, in place of the real result (51e349d's own commit
  message says this explicitly: "the copy script's read of the result note failed... and the write
  reused the previous file's text"); `18242df` is the commit that replaced the result file's
  content with the actual replay result, and states the pre-registration itself "stays
  byte-identical to what was registered". The document's gloss now matches this exactly.

## R6 — rule 2 read "n/a", not INCOMPLETE, on a missing measurement

**Problem:** with few or no `first token` lines in the diag slice (a mis-sliced or uncopied
`verbal-diag.log`), `medianS`/`p90S` print `n/a` and the failures sub-check alone could still carry
rule 2 to a silent PASS — the latency rule would never catch its own missing data.

**Fix:** `h40c-hedge-stats.mjs` now computes `firstTokenCoverageOk` — true when there are no
won-by windows to measure against at all (rule 2 legitimately has nothing to cover, e.g. h40b's own
run), or when `firstTokenN >= 90%` of `windowsWithWonBy`. When false, it is folded into the same
`rule2Incomplete`/`incompleteReasons` mechanism R2 added, naming the shortfall
(`first-token n=<N> covers less than 90% of the <M> window(s) with a won-by line`). The printed
rule-2 line now appends `— INCOMPLETE, cannot read PASS (<reasons>)` whenever either R2's or R6's
condition fires — the sub-metrics (median/p90/failures PASS or FAIL) still print alongside it, for
transparency, but the line is unambiguous that the overall verdict is not a PASS.

**Calibration** (`h40c-r2r6-cal.mjs`, 2 more of its 5 fixtures): 3 won-by windows with only 1
first-token diag line surviving (33% coverage) → `firstTokenCoverageOk=false`, `rule2Incomplete=true`,
reason names `first-token n=1` and the `90%` floor; the same 3 windows with all 3 diag lines present
(100% coverage) → `firstTokenCoverageOk=true`, `rule2Incomplete=false` — proving the check both
fires and stays quiet correctly. The h40b copy (0 won-by windows, real diag data) correctly takes
the "nothing to cover" branch and is NOT incomplete, confirming R6 does not spuriously fire on a
legitimate no-hedge run.

## Files changed this round

- `guard-h40c.mjs` — R1 (check 11 exact-array match, replacing the `/`-substring check).
- `h40c-hedge-stats.mjs` — R2 (`reAnswerFull`, `FAILURE_TEXT_MARKERS`, three-way ambiguous-window
  resolution replacing the single `ambiguousFailures` bucket, `cleanFailures`/`resolvedAsFailure`/
  `resolvedDelivered`/`unresolvedAmbiguous` fields), R6 (`firstTokenCoverageOk`,
  `FIRST_TOKEN_COVERAGE_FLOOR = 0.9`, `rule2Incomplete`/`incompleteReasons`), R5-g
  (`H40B_RULE.medianCeilingS: 5.026 + 1.0`), doc-comment updates throughout.
- `h40c-smoke-window.mjs` (new) — R3's wrapper, turning the smoke harness's real per-segment files
  into one flight run folder; `buildSmokeWindow()` throws rather than exits (calibration-friendly);
  `isMain` uses `fileURLToPath`.
- `h40c-r2r6-cal.mjs` (new) — R2/R6 calibration, 5 fixtures / 27 assertions.
- `h40c-smoke-window-cal.mjs` (new) — R3 calibration, 4 fixtures / 13 assertions.
- `r1-cal.mjs` (new) — R1 calibration, 4 cases against `guard-h40c-cal\`.
- `h40c-stats-cal-synth\*` (rebuilt via a new `build-h40c-synth.mjs` generator, replacing hand-
  counted byte offsets) — kept W1-W4 from round 2 in shape, added `[Answer] full:` lines
  throughout for realism, and replaced the old single "ambiguous" window with three windows
  covering all three R2 outcomes plus one more plain win (9 dispatch windows total; see R2's
  calibration entry above for the full matched report).
- `stage\...\passes\PREREGISTER-h40c.md` — R2 (rule 2's ambiguous-window text, dropping the false
  "delivered" claim), R3 (blocking item 1, full rewrite), R4 (freeze wording), R5 (all eight
  sub-items), R6 (rule 2's INCOMPLETE condition, "What a FAIL, VOID, or INCOMPLETE means" header
  and a new INCOMPLETE clause).
- `launch-h40c.cmd` — R5-e (the `NATIVELY_FLIGHT_COMMIT` comment no longer says "the controller",
  and now reflects that the arm-removal commit has landed). Re-verified CRLF-only (58/0), ASCII-only,
  no parens in echo lines after the edit.

## Calibration evidence, this round (consolidated)

A final combined regression sweep, run after every edit above was in place:
```
=== VOID CAL ===            (unchanged from round 2, re-run: still 14/14)      VOID CALIBRATION OK
=== R2/R6 CAL ===           (new, 5 fixtures / 27 assertions)                  R2/R6 CALIBRATION OK
=== SMOKE-WINDOW CAL ===    (new, 4 fixtures / 13 assertions)                  SMOKE-WINDOW CALIBRATION OK
=== h40b copy ===  first token n=44 median=5.026s p90=13.608s
    rule 2 ... median<=6.026s, p90<=13.608s, failures<=0: median PASS, p90 PASS, failures PASS
```
Plus a full end-to-end 11-check guard run against the stub tree's clean, restored HEAD
(`7e28816ed0e507d1e815225893beee9507792d22`): `GUARD OK`, naming
`ANSWER_MODELS = ["gemini-3.1-flash-lite","gemini-3.5-flash-lite"]`. `PREREGISTER-h40c.md` was
re-grepped end to end for every pattern checked in rounds 1-2 PLUS this round's new ones (review
labels, Task 7/8, scratchpad paths, DRAFT banner, Verification section, `the controller`,
`BOTH legs`/`both legs`, `leg 3`, `FAIL on rule 1`, `ARM_COMMIT_HASH`, the old rounded
`5.0 s + 1.0 s` ceiling, the old "its own answer was delivered" claim): zero matches for every
prohibited pattern; the only "5.0 s" hit is the intentional one contrasting it with the new exact
6.026 s figure; `e94305a` appears exactly once, in the commit-list bullet.

## Deviations and judgment calls this round

- **R3's recipe needed a new script, not just prose**, because "the byte offset of the first
  dispatch: answer line after the startup line" and "the diag log bracketed by two progress-log
  timestamps" are not operations a person can reliably do by hand without a script computing byte
  offsets across files that do not yet exist until after a real smoke run. The ruling anticipated
  this ("If the stats script needs a flag or a tiny wrapper for this, add it and calibrate it on a
  synthetic copy") — built as a small, separate wrapper rather than a flag on `h40c-hedge-stats.mjs`
  itself, since it produces a run folder that script already knows how to read unmodified; adding
  flags to the stats script instead would have coupled it to the smoke harness's own file-naming
  scheme for no benefit.
- **R4's fix widens WHEN the blocking items may run**, not just the wording: since blocking item 2
  needs the pre-registration's own commit hash, both items are now stated to run AFTER that commit,
  against the frozen tree — meaning the freeze is not violated by carrying them out, but nothing
  about arming can happen before the pre-registration itself is committed. This is a direct
  consequence of reconciling the commit-list section's own existing claim ("this pre-registration's
  own commit, which is the registered HEAD") with R4's ruling, not an independent choice.
  R4 did not ask for the blocking items to be reordered, only for the freeze's start point to be
  corrected; the ordering falls out once that correction is made consistent with the document's
  own pre-existing commit-list claim.
- **R5(e)'s "the controller" removal was extended to `launch-h40c.cmd`** even though the ruling's
  own line numbers cited only `PREREGISTER-h40c.md`; the general instruction ("remove every 'the
  controller'") and the fact that this file has exactly one such occurrence, in a placeholder
  comment with the same shape as the ones fixed in the pre-registration, made leaving it the
  inconsistent choice.
- **Chose not to touch `guard-h40c.mjs`'s own header/inline comments' references to "Task 7" or
  review labels (I1, N7, etc.)** — N9 in round 2 scoped that cleanup to the committed
  `PREREGISTER-h40c.md` specifically; the guard script itself is a scratchpad operational tool, not
  a committed flight record, and its developer-facing comments naming which review finding produced
  which check are useful provenance for whoever maintains it next, not session artifacts leaking
  into a permanent document.

## Open concerns (updated)

- **R3's recipe still depends on a real smoke run having happened** — `h40c-smoke-window.mjs` is
  calibrated against a faithful synthetic copy of what the smoke harness produces, but, per this
  task's standing constraint, no real smoke has been run this session, so blocking item 1 itself
  remains exactly that: blocking, not yet satisfied. Unchanged in kind from rounds 1-2's PENDING
  items, now with an executable recipe instead of prose that could not actually be carried out.
- **Both blocking items now explicitly require the pre-registration to be committed first** (R4) —
  meaning `NATIVELY_FLIGHT_COMMIT` cannot be filled in, and neither blocking item can be started,
  until that commit exists. This is a direct, intended consequence of R4, not a new gap, but it
  does mean the two items cannot be front-loaded any earlier than they already could be.
- All open concerns carried forward from fix round 2 (checks 8/10a/10b/11 awaiting a real-MAIN
  pass since the arm-removal commit landed; the answer-failures ceiling's provenance) are otherwise
  unchanged by this round.

## Status (superseded by Fix round 4 below)

DONE — all 6 Minor findings (R1-R6) from the second re-review have a corresponding code, fixture,
script, or pre-registration change, each recalibrated from scratch this round (guard: 4 new R1
cases + a full 11-check re-run; stats script: 5 new R2/R6 fixtures, 27 assertions, plus the
existing 14-case VOID suite re-run unchanged and the h40b copy re-verified; the new smoke-window
wrapper: 4 fixtures, 13 assertions) — nothing recalibrated from a stale transcript. `PREREGISTER-h40c.md`
re-verified clean of every prohibited pattern across all three rounds combined. MAIN was not
touched. The remaining work is exactly what rounds 1-2 already handed forward: a real pre-hour
smoke run, the pre-registration's own commit, filling in `NATIVELY_FLIGHT_COMMIT`, the real-MAIN
guard pass, and the dry-twin scheduled-task registration — none of it something this session
performs.

---

# Fix round 4 (2026-09-26, ~20:25-20:45)

A third re-review (`SP\sdd\2026-09-26-h40c\task-8-rereview3.md`) returned ALL ADDRESSED for R1-R6
(confirmed against real MAIN at e94305a in two environments, and 5.026 s / 13.608 s reproduce),
plus 1 new Important finding (N-I1) and 3 new Minor findings (N-M1 through N-M3). All four fixed
this round.

## N-I1 (Important) — INCOMPLETE could mask a rule-2 FAIL that was already decided

**Problem:** the round-3 design set a separate `rule2Incomplete` boolean whenever ANY sub-clause
was undecided (an unresolved window, or first-token coverage below 90%), regardless of what the
OTHER sub-clauses already showed. The synthetic fixture demonstrated the exact failure mode: 2
charged failures (fully decided — an unresolved window can only ever ADD to that count, never
subtract from it) printed `failures FAIL — INCOMPLETE, cannot read PASS`, and the pre-registration's
own text said an INCOMPLETE hour is "not a result to act on either way" — which would let a
genuinely failing hour (or a real latency breach measured against an adequate sample) escape its
verdict merely because something ELSE, unrelated, was still unresolved. The reviewer's own example:
a slow hour (median 8 s at full coverage) or a real "Could you repeat that?" failure, with one
additional unresolved window elsewhere, read INCOMPLETE instead of FAIL.

**Fix:** rule 2's verdict is now three-valued (`rule2Verdict`: `'PASS' | 'FAIL' | 'INCOMPLETE'`),
replacing the separate boolean, with FAIL always taking precedence:
- FAIL when any sub-clause fails on DECIDED data: charged failures ≥ 1 (an unresolved window can
  only add to this, never remove from it, so it is always decided once charged); or median/p90 over
  its ceiling AND first-token coverage ≥ 90% (a breach measured against an adequate sample is
  decided regardless of what an unresolved window elsewhere turns out to be).
- INCOMPLETE only when NO sub-clause has failed on decided data AND at least one is undecided (an
  unresolved window, or coverage < 90%) — i.e. INCOMPLETE only ever replaces a would-be PASS.
- PASS otherwise.
`h40c-hedge-stats.mjs`'s `report()` now prints `verdict: PASS` / `verdict: FAIL` /
`verdict: INCOMPLETE, cannot read PASS (<reasons>)`, plus `(also undecided: <reasons>)` appended to
a FAIL or PASS verdict when something is separately still unresolved — so the unresolved
information is never lost, but it no longer overrides an already-decided result.
`PREREGISTER-h40c.md`'s rule 2 paragraph and its "What a FAIL, VOID, or INCOMPLETE means" section
both now state the precedence directly.

**Calibration** (`h40c-r2r6-cal.mjs`, all 5 existing fixtures' assertions updated from
`rule2Incomplete` to `rule2Verdict`, plus 2 new fixtures for the ruling's own required cases):
- the existing "R2 failure" fixture (1 charged failure) → `rule2Verdict='FAIL'` (previously only
  asserted `rule2Incomplete=false`, which was consistent but less precise);
- the existing "R2 unresolved" fixture (0 charged failures, full coverage, 1 unresolved window,
  everything else passing) → `rule2Verdict='INCOMPLETE'` — this fixture already matched the
  ruling's "unresolved alone with everything else passing" case exactly, so no new fixture was
  needed for it;
- **new** "N-I1 case A": 2 independent clean charged failures plus a THIRD, unrelated window shaped
  as unresolved → `cleanFailures=2`, `unresolvedAmbiguous=1`, `rule2Verdict='FAIL'`;
- **new** "N-I1 case C": a clean win at 8000ms and a second, unresolved-shaped window whose own
  first-token was 9000ms (both won-by windows have a diag line, so coverage is full) →
  `firstTokenCoverageOk=true`, `medianS=9.0 > 6.026`, `unresolvedAmbiguous=1`,
  `rule2Verdict='FAIL'`.
All 35 assertions in the file passed. The realistic fixture (`h40c-stats-cal-synth\`, unchanged
this round) now prints exactly the corrected form of the motivating example: `failures FAIL;
verdict: FAIL (also undecided: 1 window(s) had both a failure line and a won-by line but no
[Answer] full: line...)` — FAIL, not INCOMPLETE, with the unresolved window named as an aside
rather than overriding the verdict.

## N-M1 (Minor) — the freeze forced an unnecessary second smoke

**Problem:** round 3's R4 fix froze MAIN from the pre-registration's own commit and stated both
blocking items run "after this pre-registration's own commit exists" — but blocking item 1 (the
smoke) does not actually need the exact registered HEAD, only a HEAD whose relevant source trees
are identical to it. If Task 7's smoke already ran at e94305a (the arm-removal commit, docs-only
different from the eventual pre-registration commit), the round-3 text would have forced a second,
redundant smoke run — costing quota and roughly 15 minutes.

**Fix:** `PREREGISTER-h40c.md` blocking item 1 now states a smoke run at any HEAD qualifies as long
as `git diff --stat <smoke HEAD>..<registered HEAD> -- electron src premium package.json` is empty,
noting the smoke's own segment logs record which HEAD they ran at (`launch-smoke-hedge.cmd`'s own
`git rev-parse HEAD` capture, per the ruling). No code change — this is a permission stated in the
recipe text, not something `h40c-smoke-window.mjs` itself needs to check (it only ever processes
whatever run folder it is given; confirming the qualifying-HEAD condition is a git check done
separately, before the script runs, same as the pre-existing HEAD-pin check the guard already does
for the real flight itself).

## N-M2 (Minor) — the pooled fallback was dead code

**Problem:** when `verbal-diag.log`'s lines carried no parseable `[<ISO>]` prefix,
`h40c-smoke-window.mjs` pooled the whole file and warned. But `h40c-hedge-stats.mjs`'s own
first-token regex (`/^\[(\S+)\] first token/`) requires that exact same prefix — so a pooled folder
could never actually yield a wider first-token sample either way; it would always read
`firstTokenN=0` silently, downstream of a `console.warn` a batch run would not show anyone. Real
diag lines always carry the prefix (`WhatToAnswerLLM.ts` writes it unconditionally), so this path
was reachable only on a malformed log, and its behavior on that log was useless regardless.

**Fix:** dropped the pooled fallback entirely; `buildSmokeWindow()` now throws, naming the problem,
when no diag line has a parseable timestamp. The `pooled` field is removed from the return value
and the CLI's own print line (nothing downstream ever read a meaningful value from it). Updated the
file's own header doc-comment, `PREREGISTER-h40c.md`'s recipe text (the diag-bracketing bullet in
blocking item 1 now says the recipe "cannot be carried out from this smoke copy and must be
re-derived... never silently substituted with a weaker, pooled measurement"), and calibration case
4.

**Calibration** (`h40c-smoke-window-cal.mjs` case 4, rewritten): a diag log with no `[<ISO>]`-prefixed
line now throws `"...has no line with a parseable [<ISO timestamp>] prefix..."` instead of
returning `pooled=true`; case 1's now-meaningless `r.pooled === false` assertion was removed (the
field no longer exists). Re-ran the full 4-case, 12-assertion suite: all pass, including the
unchanged positive case, the two unchanged refusal cases (wrong segment, no dispatch), and the
rewritten case 4.

## N-M3 (Minor) — nits

- `PREREGISTER-h40c.md` rule 2's failure-resolution sentence said a window is charged when its text
  "is itself one of the app's own failure messages" — the code checks CONTAINS
  (`FAILURE_TEXT_MARKERS.some((marker) => deliveredText.includes(marker))`), which matters for a
  partial answer followed by a `[No answer — ...]` suffix. Changed to "contains".
- `launch-h40c-dry.cmd`'s `NATIVELY_FLIGHT_COMMIT` comment still said "the controller fills this in
  ... after the Groq-answer-arm-removal commit and the pre-registration commit both land" — stale
  now e94305a has landed, and out of step with the real launcher's own comment (already fixed in
  round 3, R5-e). Replaced with an exact copy of `launch-h40c.cmd`'s current comment. Re-verified
  CRLF-only (61/0), ASCII-only, no parens in echo lines after the edit.

## An unrelated correction, noticed while re-reading round 3's own text

The re-review's status-of-R5 note flags a "report-only slip" in round 3's fact-finding paragraph:
the commit list there reads `e311019, 18242df, 51e349d, da28f25, 6c50ec3, e311019` — `e311019`
duplicated at the front where `e94305a` belongs (a copy-paste error), correctly listed at the end.
The real list, as this session verified live via `git log --oneline 07a0e5e..HEAD` before
compaction and again this round, is `e94305a, 18242df, 51e349d, da28f25, 6c50ec3, e311019`. This
had no effect on any deliverable — the R5(f)/R5(h) sections elsewhere in round 3 correctly name and
quote `e94305a`, `51e349d`, and `18242df` individually, and `PREREGISTER-h40c.md`'s own commit list
was never wrong. Per this task's convention of not rewriting a prior round's own text, round 3's
section is left as originally written; this note corrects the record rather than editing it.

## Files changed this round

- `h40c-hedge-stats.mjs` — N-I1 (`rule2Verdict` three-valued field replacing `rule2Incomplete`;
  `medianDecidedFail`/`p90DecidedFail`/`failuresDecidedFail` computed before the verdict; the
  report's rule-2 line reworked to `median X, p90 Y, failures Z; verdict: <PASS|FAIL|INCOMPLETE>`
  with an "(also undecided: ...)" aside when relevant).
- `h40c-smoke-window.mjs` — N-M2 (pooled fallback removed; throws on an unparseable diag log;
  `pooled` removed from the return value, the CLI print line, and the header doc-comment).
- `h40c-r2r6-cal.mjs` — N-I1 (5 existing assertions updated to `rule2Verdict`; 2 new fixtures, "N-I1
  case A" and "N-I1 case C", 9 new assertions).
- `h40c-smoke-window-cal.mjs` — N-M2 (case 4 rewritten to expect a throw; case 1's stale `pooled`
  assertion removed).
- `stage\...\passes\PREREGISTER-h40c.md` — N-I1 (rule 2's failure-resolution paragraph and the
  "What a FAIL, VOID, or INCOMPLETE means" section both restate the FAIL-outranks-INCOMPLETE
  precedence), N-M1 (blocking item 1 states the qualifying-HEAD permission for the smoke), N-M2
  (blocking item 1's diag-bracketing bullet no longer promises pooling), N-M3 ("contains" wording).
- `launch-h40c-dry.cmd` — N-M3 (comment mirrors the real launcher's).

## Calibration evidence, this round (consolidated)

A final combined regression sweep, run after every edit above was in place:
```
=== VOID CAL ===            (unchanged, re-run: still 14/14)                     VOID CALIBRATION OK
=== R2/R6/N-I1 CAL ===      (35 assertions, 7 fixtures)                          R2/R6 CALIBRATION OK
=== SMOKE-WINDOW CAL ===    (12 assertions, 4 fixtures)                  SMOKE-WINDOW CALIBRATION OK
=== h40b copy ===  first token n=44 median=5.026s p90=13.608s
    rule 2 ... median PASS, p90 PASS, failures PASS; verdict: PASS
```
Plus a full end-to-end 11-check guard run against the stub tree's clean HEAD
(`7e28816ed0e507d1e815225893beee9507792d22`, unaffected by this round but re-checked): `GUARD OK`.
`PREREGISTER-h40c.md` was re-grepped end to end for every pattern checked in rounds 1-3 plus this
round's new ones (`N-I1`, `N-M1`/`N-M2`/`N-M3`, "the controller", "pool first-token", "is itself one
of"): zero matches for every prohibited pattern. `launch-h40c-dry.cmd` re-verified CRLF-only
(61/0), ASCII-only, no parens in echo lines. Real MAIN's HEAD reconfirmed unchanged at `e94305a`;
no `*h40c*` scheduled task exists.

## Deviations and judgment calls this round

- **N-I1's fix touches only the VERDICT computation, not the underlying failure/resolution logic**
  from R2/R6 — `cleanFailures`/`resolvedAsFailure`/`resolvedDelivered`/`unresolvedAmbiguous`/
  `firstTokenCoverageOk` are all unchanged; only how they combine into one verdict changed. This
  kept the diff surgical: the re-review's own finding was specifically about the boolean-vs-
  precedence question, not about any of the underlying per-window classification, which it
  confirmed correct in the same pass ("R2: addressed", "R6: addressed").
- **The "also undecided" aside was added to the report line**, not asked for explicitly by N-I1 (the
  ruling only specifies the verdict value), so that an hour reading FAIL from decided data does not
  silently lose the information that something else is ALSO still unresolved — a future reader
  should not have to re-derive that from the separate "windows with BOTH..." line by hand. This is
  additive to what was asked, not a substitute for it; the verdict value itself matches the ruling
  exactly in all three calibrated states.
- **N-M1 was implemented as a text-only permission**, not a code change, per the ruling's own
  framing ("Allow item 1 on any HEAD whose ... diff ... is empty") — the qualifying-HEAD check is a
  `git diff --stat` a person runs before deciding whether to reuse an existing smoke or run a fresh
  one; `h40c-smoke-window.mjs` has no reason to know or care which HEAD produced its input folder.
- **The round-3 commit-list typo is corrected as a note, not an edit to round 3's own section** —
  consistent with how this report has treated every prior round's text as an append-only record;
  the correction is stated plainly rather than silently fixed in place, since the re-review raised
  it and a reader comparing this report against that re-review should be able to find the same
  observation here.

## Open concerns (updated)

- All open concerns carried forward from fix round 3 (blocking item 1 still requires an actual
  smoke run or a qualifying existing one before it is satisfied; both blocking items still require
  the pre-registration to be committed before `NATIVELY_FLIGHT_COMMIT` can be filled in for item 2
  specifically — item 1 no longer strictly requires it, per N-M1; checks 8/10a/10b/11 awaiting a
  real-MAIN pass; the answer-failures ceiling's provenance) are otherwise unchanged by this round.
- No new concerns were introduced. N-I1's fix is a strict correction (a decided FAIL no longer reads
  INCOMPLETE); N-M2's fix removes a code path that was already unreachable-in-effect; N-M1 and N-M3
  are wording/permission changes only.

## Status (superseded by Fix round 5 below)

DONE — N-I1 (Important) and N-M1/N-M2/N-M3 (Minor) all have a corresponding code or
`PREREGISTER-h40c.md` change, each recalibrated: the stats script's full VOID/R2/R6/N-I1 suite (49
assertions across 2 files) and the smoke-window suite (12 assertions) both re-run clean from
scratch this round, plus the h40b copy and the full guard re-verified. MAIN was not touched (HEAD
still `e94305a`); no scheduled task exists; nothing was run. The remaining work is unchanged from
what rounds 1-3 already handed forward: a real pre-hour smoke run (or reuse of a qualifying
existing one, per N-M1), the pre-registration's own commit, filling in `NATIVELY_FLIGHT_COMMIT`,
the real-MAIN guard pass, and the dry-twin scheduled-task registration.

---

# Fix round 5 — last round (2026-09-26, ~20:50-21:15)

A fourth re-review (`SP\sdd\2026-09-26-h40c\task-8-rereview4.md`) returned ALL ADDRESSED for N-I1
and N-M1 through N-M3, confirmed the commit list is correct (round 3's slip was report-only, and
round 4's own note already corrected it), and did a whole-document read of `PREREGISTER-h40c.md`
"as the permanent record" — checking every rule is computable exactly as written and that no two
sentences contradict. It found 4 new Minor findings, all fixed this round: no Critical, no
Important.

## R4-M1 (Minor) — the freeze paragraph contradicted item 1

**Problem:** the freeze paragraph said "Both items below run against that same frozen tree, after
this pre-registration's own commit exists ... and before the real flight is armed" — but item 1
itself (per round 4's own N-M1 fix) explicitly allows a smoke run from BEFORE that commit, at any
qualifying HEAD. The freeze paragraph and item 1 disagreed about whether item 1 could predate the
commit.

**Fix:** replaced the contradicting sentence with the ruling's own exact text: "Item 2 runs after
this commit. Item 1's smoke may predate it at a qualifying HEAD; its stats-script run and recorded
output come after the commit and before arming." This also sharpens WHAT must come after the
commit for item 1 — not the smoke itself, but running the hedge-mechanics script against it and
recording that output. No code change; `PREREGISTER-h40c.md` only.

## R4-M2 (Minor) — blocking item 1 had no pass criterion

**Problem:** item 1 said "record the output before arming" but never named anything the output
could show that would BLOCK arming — a calibration with nothing to agree or disagree with never
actually has to succeed.

**Fix:** added an explicit pass criterion to item 1, on the smoke's `default` segment: the startup
flag reads exactly `on trigger=5000ms`; rule 1 is not VOID; the hedge-mechanics script's own
dispatch-window count, `won by` count, and per-model winner counts equal what the smoke checker
(`check-smoke-hedge.mjs`, `default` mode) counts independently for the same segment; rule 2's own
verdict is not INCOMPLETE. Any mismatch blocks arming. Per the ruling's own allowance ("If the
stats script needs a flag to print exactly those counts for comparison, add it"), added a
`--compare` flag/mode: `node h40c-hedge-stats.mjs <run-dir> --compare` prints one line,
`COMPARE dispatch-windows=<N> won-by=<N> winners=<{model:count}>`, reusing the existing
`dispatches`/`wonBy`/`winnerByModel` fields (`compareLine()`, a thin formatter — no new
computation).

**Calibration:** ran `--compare` against the realistic synthetic fixture:
`COMPARE dispatch-windows=9 won-by=6 winners={"gemini-3.5-flash-lite":4,"gemini-3.1-flash-lite":2}`
— matches this session's own hand-verified values for that fixture exactly (confirmed independently
multiple times earlier in this task against the same 9-window fixture). No separate calibration
script was needed: `compareLine()` calls the same `hedgeStats()` already covered by the full VOID/
R2/R6/N-I1 suite, so a bug in the underlying counts would already have failed one of those 44
assertions; this only tests the NEW formatting, which the known-value comparison above verifies.

## R4-M3 (Minor) — three items the rule relied on that no script computed

**(a) The daytime-window test.** `timeline.startedAt` was in the run folder the stats script
already reads, but nothing printed the 12:00-15:00 local check that decides whether the hour can
even PASS. Added to `h40c-hedge-stats.mjs`: reads `timeline.startedAt`, converts to local time at a
FIXED UTC+3 offset (Europe/Istanbul does not observe DST, so no calendar-aware lookup), and prints
`playback start HH:MM local — IN WINDOW 12:00-15:00` or `OUT OF WINDOW (cannot PASS)`. Folded into
the report as the ruling asked: when out of window, an extra line states rule 2's own read is
"reported but NOT GATED" and there is no latency verdict this hour regardless of what rule 2 itself
shows — mirroring the pre-registration's own existing out-of-window wording rather than inventing
new phrasing. This is a gate on the HOUR, kept deliberately separate from `rule2Verdict` itself
(which stays an honest read of rule 2's own three sub-clauses, per "reported but not gated").
`PREREGISTER-h40c.md`'s "flight window" paragraph now says the script computes this line rather
than it being read by hand.
  - **Calibration** (`h40c-r2r6-cal.mjs`, `build()` extended with an optional `startedAt`
    parameter, default unchanged): an in-window case (`10:30Z` → `13:30` local, deliberately h40b's
    own documented start time) → `playbackStartLocal='13:30'`, `inDaytimeWindow=true`; an
    out-of-window case (`17:00Z` → `20:00` local) → `'20:00'`, `false`; three boundary cases
    (`09:00Z`→`12:00` local IN, `12:00Z`→`15:00` local IN, `12:01Z`→`15:01` local OUT), confirming
    the window is closed on both ends (`>=` / `<=`, not a strict `<`). 7 new assertions, all pass.
    As an unplanned SEVENTH data point: the h40b copy's own REAL `timeline.startedAt` converts to
    `13:34` local — 4 minutes after h40b's documented 13:30, consistent with the pre-registration's
    own explanation that playback start can trail the scheduled-task trigger by minutes. A
    known-case cross-check the implementation did not need to pass, but did.
- **(b) The per-item twin-band reading.** Needs a dispatch-window → roster-item join that no single
  script holds both halves of (the judge's pairing knows the roster item; the hedge-mechanics
  script's windows know the winning model). `PREREGISTER-h40c.md`'s twin-band paragraph now says
  this explicitly: joined BY HAND in the result note, from the judge's pairs and the hedge-mechanics
  script's per-window winner labels — reported only, per the ruling. No code change.
- **(c) The percentile method.** Unstated in the pre-registration, though the script has always
  used one (`pct()`: the element at `a[Math.min(a.length-1, Math.floor(a.length*p))]` of the
  ascending list). Added one clause to rule 2's latency paragraph stating exactly this — "the
  element at index `min(n-1, floor(n * p))` of the ascending list of first-token milliseconds — the
  method that reproduces h40b's own 5.026 s / 13.608 s exactly." No code change (the method was
  already correct and already what reproduces h40b's numbers, per every round's own calibration
  since round 1); this closes the gap between what the code does and what the document says it
  does.

## R4-M4 (Minor) — three cases the "What a FAIL, VOID, or INCOMPLETE means" section left open

- **(a)** "(2) fails ... the hedge is not faster in the app" did not name the OTHER way rule 2
  fails (a charged answer failure at otherwise-fine latency). Changed to "the hedge is not faster in
  the app, OR it lost an answer it would not otherwise have lost — either reason alone is enough".
- **(b)** "(3) fails while (2) holds" left (3) FAILing while (2) reads INCOMPLETE undefined. Changed
  to "(3) fails while (1) is not void, WHATEVER (2) reads (PASS, FAIL, or INCOMPLETE): the mix hurt
  quality regardless of latency, and that is still a real quality failure".
- **(c)** INCOMPLETE's own outcome never said what happens next. Added: "**An INCOMPLETE hour
  cannot PASS and is re-flown before any ship decision**, mirroring the out-of-window rule below" —
  deliberately reusing the same shape as the existing out-of-window sentence rather than inventing a
  third pattern for a third "cannot PASS, re-fly" case.

## An unrelated correction, noticed while re-verifying this round's own totals

Round 4's own "Status" line claimed "the smoke-window suite (12 assertions)". Re-running it fresh
this round (before touching it) actually counts 8: case 1 has 5 assertions (`startDebug`,
`endDebug`, the dispatch-window count, the startup flag, first-token n=2) and cases 2-4 have 1
`checkFails` assertion each (5 + 3 = 8). This was a miscount in round 4's own final tally, not a
missing or broken assertion — the file's own content is unchanged from what round 4 left it in,
still 4 cases covering the same 4 scenarios, all still passing. Per this task's convention, round
4's text is left as written; this note corrects the record.

## Files changed this round

- `h40c-hedge-stats.mjs` — R4-M3(a) (`playbackStartLocal`/`inDaytimeWindow` computed in
  `hedgeStats()`, a fixed UTC+3 offset; a new report line plus the "not gated" note when out of
  window), R4-M2 (`compareLine()` + the `--compare` CLI flag).
- `h40c-r2r6-cal.mjs` — R4-M3(a) (`build()` gained an optional `startedAt` parameter; 3 new blocks,
  7 assertions: in-window, out-of-window, and a 3-case closed-interval boundary check).
- `stage\...\passes\PREREGISTER-h40c.md` — R4-M1 (freeze paragraph, exact ruling text), R4-M2
  (blocking item 1's new pass-criterion paragraph), R4-M3(a) (flight-window paragraph now names the
  script's own check), R4-M3(b) (twin-band paragraph names who does the join), R4-M3(c) (percentile
  clause in rule 2), R4-M4 (all three "What a FAIL, VOID, or INCOMPLETE means" gaps closed).

No changes to `guard-h40c.mjs`, `h40c-smoke-window.mjs`, `h40c-smoke-window-cal.mjs`,
`h40c-void-cal.mjs`, `launch-h40c.cmd`, or `launch-h40c-dry.cmd` this round — none of the four
findings touched them, and the full sweep below re-runs them anyway to confirm.

## Calibration evidence, this round — the full sweep, run once at the end

Per the coordinator's instruction, one full sweep after every edit above was in place, totals
listed exactly as counted (not estimated):

| suite | file | result | assertions |
|---|---|---|---|
| VOID | `h40c-void-cal.mjs` | `VOID CALIBRATION OK` | 14 / 14 |
| R2/R6/N-I1/window | `h40c-r2r6-cal.mjs` | `R2/R6 CALIBRATION OK` | 44 / 44 |
| smoke-window | `h40c-smoke-window-cal.mjs` | `SMOKE-WINDOW CALIBRATION OK` | 8 / 8 |
| guard (R1) | `r1-cal.mjs` (round 3, re-runnable) | not re-run this round (no guard change) | 4 / 4 (round 3) |

**Total: 66 / 66 assertions passing, 0 failures**, across the two suites this round actually
touched plus the one it did not (re-run anyway, unaffected). Plus, outside the two counted suites:
- h40b copy: `first token n=44 median=5.026s p90=13.608s`; `median PASS, p90 PASS, failures PASS;
  verdict: PASS`; **`playback start 13:34 local — IN WINDOW 12:00-15:00`** (new this round, real
  data, matches h40b's documented 13:30 within the known trigger-to-playback lag).
- Full 11-check guard against the stub tree's known clean HEAD
  (`7e28816ed0e507d1e815225893beee9507792d22`): `GUARD OK`, all fields as expected.
- `--compare` on the realistic synthetic fixture: matches hand-verified values exactly (see R4-M2).
- `PREREGISTER-h40c.md` re-grepped for every prohibited pattern across all five rounds (review
  labels including `R4-M#`/`N-I#`/`N-M#`, "Task 7"/"Task 8", scratchpad paths, "the controller",
  and every script's bare filename): zero matches on all of them. 288 lines total.
- Real MAIN's HEAD reconfirmed unchanged at `e94305a`; no `*h40c*` scheduled task exists.

## Deviations and judgment calls this round

- **R4-M2's comparison was implemented as a thin formatter over existing fields**, not a new
  parallel computation — `dispatches`, `wonBy`, and `winnerByModel` were already computed by
  `hedgeStats()` and already covered by the 44-assertion suite; `--compare` only changes how they
  print. This keeps the pass criterion's TWO independent counts (the hedge-mechanics script's and
  the smoke checker's) actually independent — `--compare` does not read or know about
  `check-smoke-hedge.mjs`'s own output, so the comparison a person makes before arming is a real
  cross-check between two separately-written tools, not one tool agreeing with itself.
- **The boundary calibration (12:00 and 15:00 both IN, 15:01 OUT) was added beyond the ruling's
  literal "an in-window and an out-of-window timeline"** — a closed-interval choice at the exact
  hour boundary is a judgment call this implementation had to make one way or the other (the
  ruling's own prose, "12:00-15:00 local", does not by itself disambiguate open vs. closed), so it
  seemed worth proving which choice was actually made, not just asserting the two clearly-interior
  cases.
- **R4-M3(b) and R4-M3(c) were both text-only**, per the ruling's own explicit menu ("add the window
  check to the script, OR say it is read by hand... Name who does the twin-band join. State the
  percentile in one clause") — only (a) named adding code as its fix; (b) and (c) asked only for
  the gap between prose and reality to be named, which for (c) was already true of the CODE (the
  method was always correct) and only false of the DOCUMENT.

## Open concerns (updated)

- All open concerns carried forward from fix round 4 (a real or qualifying-HEAD smoke run still
  required for item 1; the pre-registration's own commit still required before `NATIVELY_FLIGHT_COMMIT`
  can be filled in for item 2; checks 8/10a/10b/11 awaiting a real-MAIN pass; the answer-failures
  ceiling's provenance) are unchanged by this round.
- No new concerns. This was explicitly named "the last round" by the coordinator; the four findings
  were all Minor, and the re-review's own whole-document read found no remaining contradiction
  between any two sentences in `PREREGISTER-h40c.md` and no rule it could not compute exactly as
  written, apart from the four now-fixed gaps.

## Status

DONE — all 4 findings (R4-M1 through R4-M4) from the fourth re-review have a corresponding
`PREREGISTER-h40c.md` change, two of them (R4-M2, R4-M3(a)) also a corresponding code change, both
recalibrated (7 new window-check assertions, 1 known-value `--compare` cross-check). The full
calibration sweep run once at the end, per instruction, totals 66/66 assertions passing across the
three suites, plus the h40b copy, the full guard, and a `PREREGISTER-h40c.md` re-grep, all clean.
MAIN was not touched (HEAD still `e94305a`); no scheduled task exists; nothing was run. The
remaining work is unchanged from what rounds 1-4 already handed forward and is not this session's
to perform: a real pre-hour smoke run (or reuse of a qualifying existing one), the pre-registration's
own commit, filling in `NATIVELY_FLIGHT_COMMIT`, the real-MAIN guard pass, and the dry-twin
scheduled-task registration.
