# Task 4 re-review: fix round 1 (M1, M3, M4, M5)

Reviewer: Opus, read-only. Scope: the MAIN working-tree diff of electron/LLMHelper.ts, electron/main.ts and electron/llm/WhatToAnswerLLM.ts (unchanged this round), plus the five test files.

ALL FINDINGS ADDRESSED: NO

Counts: remaining 1 (M3, only partly addressed); new Important 1 (N1); new Minor 1 (N2).

## What I ran

- **The six hedge-related test files** from SD\vitest-cwd-rev4:
  - with `NATIVELY_VERBAL_HEDGE` unset: `Test Files 6 passed (6) / Tests 60 passed (60)`, exit 0;
  - with `NATIVELY_VERBAL_HEDGE=yes` in the shell: `Test Files 6 passed (6) / Tests 60 passed (60)`, exit 0. This confirms M5's hygiene fix end to end.
  - Neither run printed an unhandled-rejection or PromiseRejectionHandled warning, including with the fake's abort-aware `'silent'`.
- **`tsc -p electron/tsconfig.json`:** exit 2, with exactly the 6 known errors (GeminiLiveRouter ×1, ipcHandlers ×3, KnowledgeOrchestrator ×2). No new errors.

## Per finding

### M1: addressed

LLMHelper.ts:3537-3538 now reads exactly as proposed:
- `other` is `aborted` for a loser that settled with a token;
- `stop.abort()` is skipped only for a leg that already failed or ended empty.

The new gated-fake test (`{ gate, chunks }`, LLMHelper.verbalHedge.test.ts:323-352) lands both first tokens in one microtask turn, which is repro G's shape. It asserts the loser's signal is aborted and that `other=aborted`.

I did not re-run the red phase (it would need an edit to MAIN). By reading: before the fix, the loser's `settled.kind === 'token'` skipped the abort, so the test's `signals[loserIdx].aborted` would be false. That is the failure the implementer reports.

Nothing else changed in the hedge.

### M4: addressed

- **Per-leg error text.** `{ error }` steps carry distinct text per leg.
- **Case 6** now pins:
  - `asked()` equals `[3.5, 3.1]`;
  - the rejection is `/503 front/`, so it would fail if `b.err` were thrown first;
  - the `no answer - front error, back error` warn line.
- **Case 9** now pins `asked()`.
- **New: trigger-path close on the sentinel.** At lines 286-300, `signals[0]` and `signals[1]` both end up aborted.
- **New: trigger-path both-fail.** At lines 302-321, `alive` counts down from 2.
- **`'silent'` is abort-aware.** It now rejects with an AbortError, so the aborted loser's rejection path is exercised. It was caught, and no warnings appeared.

### M5: addressed

- The four today's-race files clear `NATIVELY_VERBAL_HEDGE` in `beforeEach` and restore it in `afterEach`. For abortOnClose that covers both describes; emptyStream gained an `afterEach`.
- The new answeringModel describe now saves and restores instead of deleting.
- Verified with the junk-shell run above: 60/60.

### M3: only partly addressed

The per-call throw is kept, and the startup line `[Main] verbal hedge: on trigger=<ms>ms | off` exists. The guard and stats scripts in the scratchpad already rely on it.

The placement fails two of the controller's criteria. See N1.

## New findings

### N1 (Important): a bad value at startup leaves a windowless process that holds the single-instance lock, instead of failing loudly

**Where:** main.ts:3508-3515.

**What happens:** the new block runs inside `async initializeApp()`, which is invoked as `initializeApp().catch(console.error)` at main.ts:3724. When `verbalHedgeEnabled()` or `verbalHedgeTriggerMs()` throws:

1. The error goes to `console.error` and so into natively_debug.log, and the rest of `initializeApp` is skipped:
   - no `createWindow()`, tray or global shortcuts;
   - no `NATIVELY_AUTOSTART_MEETING`;
   - no `window-all-closed` handler (main.ts:3682) and none of the quit-time handlers after it.
2. The process stays alive with nothing on screen.
3. It still holds `requestSingleInstanceLock()` (main.ts:3394). Every relaunch therefore exits at once, and the `second-instance` handler's `centerAndShowWindow()` has no window to show.

**Why it matters:**
- **Interactive user:** the app "does not open", and it keeps not opening until the zombie process is killed. The reason is only in a log file.
- **Unattended flight:** the hour silently gets no meeting. The flight fails with no answers instead of refusing at launch.
- The coordinator's criterion was "cannot crash startup silently". This is effectively a silent, hung startup.

**Flag-unset behaviour also changed:**
- The block reads `NATIVELY_VERBAL_HEDGE_TRIGGER_MS` even when the hedge is off. A junk trigger value with the flag unset now produces this zombie; before, the value was never read.
- With both variables unset, the only change is the harmless `[Main] verbal hedge: off` line.

**Fix:**
1. Move the block to just after the log-file reset (main.ts ~3433). It is then after `whenReady`, so the log file exists, and before credentials, IPC or any window.
2. Wrap it so a bad value exits the process with a message:
   ```ts
   try { …validate + log… } catch (e) {
     console.error(`[Main] ${(e as Error).message} — refusing to start`);
     app.exit(1);   // no modal dialog: it would block an unattended flight's scheduled task
     return;
   }
   ```
   `app.exit(1)` releases the lock, and the flight harness sees the process end.
3. Optionally, read the trigger only when the hedge is on, so an unset flag stays exactly today's behaviour. The controller may prefer to keep validating it when off; that is acceptable once the failure is a clean exit.
4. Calibration (rule 8): once in the scheduled-task smoke, launch with `NATIVELY_VERBAL_HEDGE=yes` and confirm three things:
   - the process exits;
   - natively_debug.log has the refusing line;
   - a second launch with the value fixed opens normally.

### N2 (Minor): the new answeringModel hedge describe does not clear `NATIVELY_VERBAL_HEDGE_TRIGGER_MS`

**Where:** WhatToAnswerLLM.answeringModel.test.ts, the second describe's `beforeEach`.

**What happens:** a shell exporting a junk trigger value makes its 3 label tests throw. A numeric value such as 300 still passes.

**Fix:** save, delete and restore the trigger variable, as LLMHelper.verbalHedge.test.ts does.

## Nothing else introduced

- LLMHelper.ts differs from round 0 only in M1's two lines and their comment.
- WhatToAnswerLLM.ts is unchanged.
- In main.ts, the only other change is the import at line 258.

## Round 2 (fix round 2: N1, N2)

ALL FINDINGS ADDRESSED: YES

Counts: remaining 0, new 0. N1 and N2 are fixed, and so is M3, because N1 completed it.

### Checks

**N1 and M3: the placement is right.** In main.ts, the `try { console.log(describeVerbalHedgeAtStartup()) } catch { console.error(`[Main] <message> — refusing to start`); app.exit(1); return }` block runs:
- after `await app.whenReady()` (line 3419) and after the log-file reset (lines 3423-3433), so the refusing line lands in natively_debug.log;
- before the dock hide, `CredentialsManager.init()`, `AppState.getInstance()`, `initializeIpcHandlers` and `createWindow()`.

**Nothing runs between the two.** The only earlier side effects are `requestSingleInstanceLock()` and the `second-instance` listener.

**The lock is released.** `app.exit(1)` ends the process immediately without quit handlers, so the OS-held single-instance lock goes with it. The error line is written first, because `logToFile` uses `appendFileSync`. No modal dialog is shown, so an unattended scheduled task is not blocked.

**Flag-unset startup is unchanged** apart from the `[Main] verbal hedge: off` line. `describeVerbalHedgeAtStartup` returns early when the flag is off and never reads `NATIVELY_VERBAL_HEDGE_TRIGGER_MS`; its test covers this with a junk trigger. The per-answer path still reads the trigger only inside the hedge.

**The guard and stats scripts still match.** The startup line text is exactly what they parse: `[Main] verbal hedge: on trigger=<ms>ms` and `[Main] verbal hedge: off`.

**N2:** the answeringModel hedge describe now saves, deletes and restores `NATIVELY_VERBAL_HEDGE_TRIGGER_MS`.

### Runs from SD\vitest-cwd-rev4 (the six files)

| shell environment | result |
|---|---|
| both variables unset | 65/65 passed, exit 0 |
| `NATIVELY_VERBAL_HEDGE=yes`, `NATIVELY_VERBAL_HEDGE_TRIGGER_MS=junk` | 65/65 passed, exit 0 |
| `NATIVELY_VERBAL_HEDGE=1`, `NATIVELY_VERBAL_HEDGE_TRIGGER_MS=junk` | 65/65 passed, exit 0 |

- No unhandled-rejection lines appeared in any run.
- `tsc -p electron/tsconfig.json` shows only the 6 known errors.
- verbalHedge.ts, verbalHedge.test.ts and main.ts are UTF-8 with no BOM and no CR, with no double-encoded dashes.

### Still unexercised

The live exit path has not been run: a real Electron launch with a bad value, the process exiting, a clean relaunch, and the refusing line in the log. It is scheduled for the smoke, as the coordinator noted. Until then, this path is reviewed only by reading.