# Task 13 review: harness gates (4ee3ea8 on 6b422af, WT-D)

Reviewer: Opus. Scope: PLAN.md Task 13, Global Constraints, Review Focus, SPEC §5 (capture files), §7.2, §10, and the
M2 requirement carried over from the Task 12 review. The task-12-fix1 part of the report is out of scope.

**SPEC: PASS  QUALITY: CHANGES**

## What I ran
- `routerHarness.test.ts`, from a temp cwd: **48/48 pass**.
- tsc root: **0 errors**. tsc electron: **6 errors**, all of them the baseline files (GeminiLiveRouter 125, ipcHandlers
  3436/3439, KnowledgeOrchestrator 349/351). None in Task 13's files.
- **An independent re-derivation of the flightPlan snapshot.** I wrote a scratch script that evaluates the PRE-CHANGE
  `main()` expressions, copied from the diff's `-` lines, for the test's 6 input cases.
  - The old expressions equal the fixture in **6/6** cases.
  - The new `flightPlan` equals the old expressions in **6/6** cases.
  - A fixture with one extra `toGrade` entry is detected.
- I compared the log lines Task 13 parses against the real producers in WT-A (Task 2), WT-B (Task 5), WT-C (Task 7) and
  WT-D's main.ts. I also checked them against a real hour: flight-eq's `natively_debug.log` (2026-10-06T01-12-56-eq).
- **Not run:**
  - `live40.test.ts`. Its M2 case is reviewed by reading.
  - the real `auto()` path;
  - a router-on log, since no producer of `[Router] dispatch`, `[Router] ear model=` or `[RouterAnswer]` is wired yet
    (Task 10).

## Spec compliance: PASS
Every item in the brief is present:
- `probeSettled` / `waitProbeSettled` (cap 120 s, exit 1 with the exact message).
- `buildCaptureFiles`, keyed by the decision line's `q_at` through the play windows at offset 1150.
- `routerPreflight`, with all 6 gates and the smoke mode when the context sha is unset.
- `selectArms`, including the ARMS log line and skipping the untagged arms and chains.
- `flightPlan`, used by `main()` for the moves, the arms loop, the judge exports and `toGrade`, with the snapshot pin.
- The gates are re-read after the wait, right before `appPass()`.
- The capture files are written at snapshot time.
- The preflight writes one `ok()` row per gate line.
- Every listed test exists.
- M2 is done: `wavMismatch` now requires `size − (dataOffset + 8) === dataLen` (run.mjs 155-158).
  - A physically cut wav with its header intact now exits 1. The new live40.test case pins this, and the old
    header-forged case is kept.
  - Neither builder (`build-audio.mjs`, `build-audio-local.mjs`) writes a trailing chunk, so no existing wav is
    falsely refused.

One spec deviation is listed under the findings (M1: `appended:false`).

## Controller questions

### Q1. Can the probe read as settled before its answer is dispatched? Yes. Fix it.
`probeSettled` (probeWait.mjs 471-497) reads settled when two things hold: no dispatched turn is outstanding, and the
last `[Main] turn:` line is `close` (or there is none). There are two ways this goes wrong.

1. **No turn line yet.** The slice starts right before the probe plays. If no `[Main] turn:` line and no dispatch has
   been logged yet, then `last === null` and `open = 0`, so it reads **settled** with zero dispatches.
   - Today's Deepgram STT logs `[Main] turn: deepgram speech-started` at the start of each question, so in practice a
     line exists before the wait begins.
   - Other providers log their first turn line only at `classify` / `gate=` (main.ts 992/1007).
2. **The probe holds several questions, and the last one has not reached its gate.** This holds even with a
   "≥1 dispatch" rule.
   - flight-eq's probe holds 2 questions (log lines 239-357: docker, then k8s autoscale).
   - Question 1 dispatches and closes. Question 2's `gate=` line comes about 1.2 s after its speech ends (VAD gate),
     plus the time for the finals.
   - In that interval, the last turn line is question 1's `close`, and every dispatch so far is decided, so it reads
     settled.
   - The wait starts about 1-2 s after `playWav` returns: preflight's ≥1 s heard-loop sleep, the remaining rows, then
     the child exits. That is the same order of magnitude as the gate.
   - With Deepgram, question 2's `speech-started` line closes this window. Without it, the window stays open.

This is exactly the I8 failure, and SPEC §7.2 says "**every probe turn's** answer has ended". A turn that has not
dispatched has not ended.

**Recommended fix (IMPORTANT I1).** Do two things:
- (a) require at least one dispatch in the slice;
- (b) require the settled state to hold on consecutive polls for a quiet period longer than the gate plus finals, for
  example **≥ 6 s** with no new `[Main] turn:` or dispatch line.

Add a test for each:
- an empty slice is not settled;
- question 1 dispatched, decided and closed, with question 2's gate still to come, reads settled once but is not
  accepted until the quiet period passes.

The alternative of "a turn-close plus a decision" does not close case 2, because question 1 already supplies both.

**Risk of the fix:** a probe whose question is deduped on a retry (same app, same wav) gets no dispatch. The wait then
hits the 120 s cap and the hour is NOT spent. That fails closed, which is acceptable. Pinning flights to Deepgram
would only mitigate the problem; it is not a fix.

### Q2. Deviations

| Deviation | Verdict |
|--|--|
| `PROBE_LOG_OFFSET` printed on stdout | **Sound.** auto() runs preflight as a child (`runPreflight` → `execFileSync`, run.mjs 541-550), so the plan's module variable cannot cross the process boundary. The offset is printed before the play, the last marker wins, and every attempt overwrites it. A missing marker exits 1 "NOT spent". The only flag-off output change is this one extra line. |
| `flightPlan` 4th argument `{ promptsFile, roster }` | **Sound.** The arms' args embed the prompts path, and `roster` defaults to `ROSTER_NAME`. `capturedOnly` still uses the import-time `INTERVIEW` (the same as production). |
| `buildCaptureFiles` returns `unmapped` and `problems` too | **Sound.** These are additive. Nothing throws after the hour, and auto() prints the counts. The live and shadow arrays match the plan's interface. |

**Unset-flag byte-identity.**
- The pin is real. The fixture equals an independent evaluation of the old expressions, and so does `flightPlan({})`,
  in 6/6 cases.
- `done.json` is unchanged when the variable is unset (`focusedOnly` is the same and there is no `arms` key). The skip
  log texts are identical, and chains still run.
- The one unset-path change is that `moveAside` now runs after `prompts.mjs` rather than before it. This is benign:
  `prompts.mjs` reads the run folder's log, capture and timeline, and writes only `<runDir>/interview60.prompts.json`
  (prompts.mjs 61-70). The pin does not cover this ordering.
- **The run.mjs flag-off path is NOT behaviour-identical.** It gains the probe wait, as the plan requires, and that
  wait depends on Task 7's `answer end` line (see M4).

### Q3. Exact formats parsed, checked against the producers

All matching is regex over `natively_debug.log`. The app prefixes each line with `<iso> [LOG] `, and the regexes are
unanchored, so the prefix is harmless. `routerDiag` and the arbiter's capture both reach the debug log through
`console.log`.

| # | Parser (file:line) | Regex / requirement | Producer | Match |
|--|--|--|--|--|
| 1 | probeWait 458 | `PROBE_LOG_OFFSET (\d+)` (child stdout) | run.mjs preflight 305 | ✓ |
| 2 | probeWait 473, 477 | `\[Router\] dispatch turn=(\d+)\b` | routerArbiter.ts:97 (WT-B) `[Router] dispatch turn=${id} at=… q_at=… q_src=… router=… ear=…` | ✓ |
| 3 | probeWait 478 | `\[Router\] turn=(\d+) [^\n]*?\bshown=(?:live\|pipeline)\b` | routerArbiter.ts:431, `shown=${dec.shown}` ∈ live/pipeline | ✓. dup/unpaired (`:194`) carry `shown=-` and `turn=-`, so they are correctly excluded. |
| 4 | probeWait 484 | `\[Main\] dispatch: answer\b` | main.ts:2148 `dispatch: ${action}`, where action is answer/chip/mark/hold | ✓. **But `dispatch: supersede` (main.ts:1030) is not counted** (M2). |
| 5 | probeWait 484 | `\[IntelligenceEngine\] answer end\b` | IntelligenceEngine.ts:555 (WT-C) `answer end turn=${turnId} kind=${endKind}` | ✓, but **logged only when `turnId != null`** (M4) |
| 6 | probeWait 491 | `\[Main\] turn: (\S+)`; settled requires the last one to be `close` | main.ts 963 (vad), 992 (classify), 1007/1029 (gate=), 1038 (close), 1054 (detection-fallback), 1248/1249 (deepgram speech-started / utterance-end) | ✓. Any non-close kind counts as "open"; see M5. |
| 7 | routerCapture 544 | `\[Router\] session up\b` | LiveRouterSession.ts:139 `session up setup_ms=<n>` | ✓ |
| 8 | routerCapture 548-551 | the last `\[Router\] session connect …`; the fields `block_sha12=`, `instruction_sha12=`, `context_sha12=`, `context_chars=` via `\b<name>=(\S+)` | LiveRouterSession.ts:107 `session connect model=… block_sha12=… instruction_sha12=… context_sha12=… context_chars=${ctx.length}` | ✓ |
| 9 | routerCapture 559 | `Live Mode status: (\w+)`; the last one must be `connected` | main.ts:2207 `[Main] Live Mode status: ${s.state}${reason? ' (…)'}` | ✓ |
| 10 | routerCapture 562 | `\[Router\] session close\b`, any close after the last up → FAIL | LiveRouterSession.ts:143 (goAway: `close gen=<n> code=- reason=goAway stale=no quota=no`) and :175 (`close gen=… code=… reason=… stale=yes\|no quota=yes\|no`) | Format ✓. **Semantics: a `stale=yes` close is counted** (M3). The quota reconnect line (`attempt=<n> reason=quota backoff <ms>ms`) is not parsed by Task 13, so there is no mismatch there. |
| 11 | routerCapture 567 | `\[Router\] ear failover\b` anywhere | plan Task 11: `[Router] ear failover from=3.1 to=2.5 reason=… dispatches_before=…` | ✓ against the plan text. Not built yet (Task 11). |
| 12 | routerCapture 569 | the last `\[Router\] ear model=(\S+)` must be `gemini-3.1-flash-live-preview` | plan Task 10 step 5: `[Router] ear model=<id>` | ✓ against the plan text. Not built yet (Task 10). |
| 13 | routerCapture 588 | `\[Router\] turn=(\d+) [^\n]*?\bshown=(?:live\|pipeline)\b[^\n]*?\bq_at=(\d+)` | routerArbiter.ts:431. `shown` comes before `q_at=${t.q}` (epoch ms), followed by `sent=` | ✓ |
| 14 | routerCapture 598-601 | `\[RouterAnswer\] (.*)$` (multiline), JSON with a numeric `turn` and `kind` ∈ live/shadow/appended; it reads `text, words, firstMs, endMs, q_src` | routerArbiter.ts:387-388 `'[RouterAnswer] ' + JSON.stringify({ turn: t.id, kind, text, words, firstMs, endMs, q_src })`, kind typed `'live'\|'shadow'\|'appended'`; wiring `capture: (line) => console.log(line)` (plan 1525) | ✓. JSON escapes newlines, so one line per record. |
| 15 | test fixture only | `[Answer] budget: words=N` | WhatToAnswerLLM.ts:438 `[Answer] budget: ${line}` | Not parsed in production code. |

Task 7's event `suggested_answer_end(turnId, kind, generationId?)` is not consumed by the harness. Only its log line
(row 5) is.

## Findings

**IMPORTANT I1. `probeSettled` can settle before the last probe question dispatches (probeWait.mjs 471-497).**
- Neither of these is required:
  - at least one dispatch;
  - a quiet period that outlasts the VAD gate.
- An empty slice reads settled, and so does a multi-question probe between question 1's close and question 2's gate.
- This is the I8 failure (SPEC §7.2: "every probe turn's answer has ended").
- Fix: ≥1 dispatch, plus a settled state that holds for ≥ 6 s of consecutive polls. Add the two tests listed under Q1.

**MINOR M1. The shadow entries omit `appended` (routerCapture.mjs 607-608).**
- SPEC §5 says "with `appended: true|false`".
- The test at routerHarness.test.ts:138 pins `undefined` instead of `false`.
- Task 14A reads these files. Set `appended: false` on kind=shadow, and change the test.

**MINOR M2. The flag-off wait ignores supersede streams (probeWait.mjs 484).**
- A `dispatch: supersede` aborts stream 1, which logs `answer end kind=aborted`, and starts stream 2.
- The counter then reaches 0 while stream 2 is still streaming.
- Fix: count `\[Main\] dispatch: (?:answer|supersede)\b` as dispatches.
- The flag-on twin is a residual, not a code fix. A decision line already written before a supersede on the same
  `turnId` also settles while the replacing stream runs. Item 20 covers only a stale end that arrives after the
  replace, not a decision already made. In both cases the `close` (continuation-expired, about 8 s later) usually
  trails, but nothing guarantees it.

**MINOR M3. The close-after-up gate counts stale closes (routerCapture.mjs 562-565).**
- On goAway, LiveRouterSession.ts:142-145 logs `close … stale=no`, bumps the generation and closes the old socket.
- That socket's `onclose` then logs `close gen=<old> … stale=yes` (:175).
- If that line lands after the new session's `up`, a healthy router fails the gate, and the hour is not spent.
- This is unlikely, because the reconnect delay normally puts the stale close first, but it fails closed for no
  reason.
- Fix: count only closes with `stale=no`. Test: goAway close, up, then a stale close → PASS.

**MINOR M4. The flag-off probe wait needs Task 7's `answer end` line, and that line exists only for calls with a
`turnId` (IntelligenceEngine.ts 554-556, WT-C).**
- In WT-D alone (no Task 7), every flag-off `auto()` whose probe dispatches hits the 120 s cap and exits 1.
- In a non-auto live mode, `dispatch: answer` can carry no turnId and so never settles. In auto mode every
  `dispatch: answer` comes from the turn path with a turnId (flight-eq log 258-259, 333-334), so this is fine.
- Action: Task 15/16 must land D only together with C, which the integration order already does. The registration
  should note that the flight runs in auto mode.

**MINOR M5. Any non-close `[Main] turn:` line after the probe's last close keeps the wait open.**
- Example: a stray `deepgram speech-started` from noise.
- The result is the 120 s cap and an unspent hour. It fails closed, and a quiet machine is already a flight rule.
- Record it as a residual; no code change.

**MINOR M6. The "hidden shadow reaches the file whole" test is a pass-through check (routerHarness.test.ts 141-146).**
- The test writes `words=57` into both the synthetic capture line and the budget line, so it proves only that `words`
  is copied through.
- The real check is Task 17 item 4, as the plan says. Keep the test, but do not cite it as evidence of wholeness.

**Residual, for Task 15/17.** A dispatched turn whose pipeline never runs never gets a decision line. That happens if
Task 10 calls `turnDispatched` before a deduper drop. The wait then times out: fail-closed, and the hour is not spent.
Task 17 should confirm that every probe `[Router] dispatch` gets its decision line.

## Not shown
- None of the router-on parsers ran against a real app log. Rows 11-12 match the plan text only.
- The M2 live40 case and the dry-run evidence are taken from the report. I re-ran neither.
- The I1 race is argued from the timings in the flight-eq log and the code paths. It was not reproduced.

## Re-review (fix round 1: 8da79cb on 4ee3ea8)

Scope: I1, M1, M2, M3, plus a hunt for anything new. M4-M6 are recorded residuals.

**Ran:**
- `routerHarness.test.ts`: **52/52 pass**.
- I traced `waitProbeSettled` by hand against both Q1 cases and against the timing of a healthy probe.
- I checked the deduper window in `ChipDeduper.ts` for the "never dispatches on a retry" risk.

**Resolutions:**

| Finding | Status | Evidence |
|--|--|--|
| I1 | **Resolved** | See the I1 section below. |
| M1 | **Resolved** | Non-live entries now carry `appended: a.kind === 'appended'`, so shadow entries are `false` and appended ones `true`. The test pins `false`. Unmapped non-live entries also carry the field, which is harmless. |
| M2 | **Resolved** | The flag-off counter is now `\[Main\] dispatch: (?:answer\|supersede)\b`, which matches main.ts:1030 exactly. The two cases trace correctly: answer, supersede, aborted end, final end → 0; and answer, end, then a later supersede and its end → 0. The test shows "open" before the replacing stream's end and settled after it. |
| M3 | **Resolved** | Only `session close … stale=no` closes count, which matches LiveRouterSession.ts:143/175. The new test passes a goAway close, then up, then a late `stale=yes` close, and fails a real `stale=no` close after up. |

### I1

**`probeSettled` now requires at least one dispatch.**
- Flag on: a `[Router] dispatch`.
- Flag off: an `answer` or `supersede` dispatch.

**`waitProbeSettled` now also requires a quiet period.**
- The state must stay settled with an unchanged count of `[Main] turn: ` / `[Main] dispatch: ` / `[Router] dispatch turn=` lines.
- The time counted toward it is the time slept, and it must reach `PROBE_QUIET_MS` = 6000.
- The count of quiet time starts from 0 at the first read. Any unsettled read, or any new line, resets it.

**Case 1 (empty log, or turn lines but no dispatch) is closed.** It reads not settled ("no dispatch in the log yet"). The test covers both flag states and the 120 s cap.

**Case 2 (question 1 finished, question 2 has not reached its gate) is closed.**
- Acceptance needs 4 consecutive settled, unchanged reads, at 0, 2, 4 and 6 s.
- So question 2's gate, its Deepgram line or its dispatch must appear within about 6 s of the wait's first read, which is about 7-8 s after the clip ends, or the state is not accepted.
- The gate needs about 1.2 s plus the finals after speech ends. That gives a margin of more than 4 s.
- **The test discriminates.** Without the quiet rule, the first read of question 1's settled log returns true and the test fails. With the rule, a gate and dispatch landing 4 s in reset the count. The second half checks that acceptance comes ≥ `PROBE_QUIET_MS` after the last new line.
- **Not covered:** a question 2 whose gate comes more than 6 s after the wait's first read. With a 1.2 s VAD gate that needs finals to take over 4 s. This is a residual, not a defect.

**Can a healthy probe fail to settle?** No new way that I found.

- **Expected timing.** On a healthy probe the last dispatch is near the clip's end. Its `close` (continuation-expired) comes about 8 s later, and the answer ends within roughly 10 s. Acceptance therefore lands about 14-18 s in, well inside the 120 s cap.
- **The quiet count only resets.** A stray line (a Deepgram `utterance-end`, or a Live ear `dispatch: mark`) delays acceptance by at most 6 s once the lines stop. Lines that never stop amount to M5, which is already recorded.
- **A retry is not deduped.** The worry: a retry that replays the same wav gets its question deduped, so it never dispatches. The deduper keeps answered entries for 60 s (`answeredWindowMs`, ChipDeduper.ts:142), while auto() waits 120 s between attempts, plus about 60 s of model pings. So the risk is negligible, and it would fail closed if it happened.
- **One remaining fail-closed path, already a residual.**
  - A dispatched answer that never logs an end never settles. Examples: an `answerDetection` that throws before it reaches the engine, or a call with no `turnId` (M4).
  - The hour is not spent in that case. This is a residual, not a new defect.

### Nothing new
- No change to `flightPlan` or `run.mjs`, so the unset-flag pin is untouched.
- **MINOR (cosmetic, no action needed):**
  - The `PROBE_QUIET_MS` comment says "two questions with a gap of 1.2 s or more". The 1.2 s is the VAD gate, not the gap between questions.
  - The report says acceptance comes 8 s after the first settled read; by my trace it is 6 s.

**Not shown:**
- Not run against a real app log.
- I did not mutate the code myself; I rely on the report's 4 killed mutants and on my own trace of the q2 test.

SPEC: PASS  QUALITY: APPROVE
