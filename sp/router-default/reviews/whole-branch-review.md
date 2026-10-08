# Whole-branch review: router-default (Task 15 step 4)

- Reviewer: fresh Opus (claude-opus-5-5), 2026-10-07 ~00:40 TST.
- Scope: `17d199d..dae41f9` on `feat/live-router` (33 commits, 49 files). The diff was read from the shared object
  store; the files were read in WT at HEAD dae41f9.
- Authority: SPEC.md rev 4c, PLAN.md rev 2 (Global Constraints, Review Focus), and the `build/progress.md` rulings.
- Method: a hunt for what is missing against the spec. Per-task reviews were read only to avoid re-finding fixed items.

## Verdict: READY WITH FIXES

- No BLOCKING finding.
- No path was found that shows a dup, unpaired, pre-dispatch, row-3 or row-4 Live answer, or a marker token. The one
  gap in the Safety bar comes from the spec's own definitions (I-1), and the run reader shares it. It needs a ruling.
- I-2 does not change code. It must reach Task 19 before the registration is sealed.

## What was checked, and holds

**SPEC §4.5 cases A–E, end to end (arbiter → `send` → preload → `answerMessages.ts` / `NativelyInterface.tsx`).**
- **A.** Held events are released in order with `origin:'pipeline'` and `turnId`. fix4 makes a first `replace` false
  when nothing of the turn is visible.
- **B.** The Live source is sent first. Tokens come only from `showablePrefix` (complete tokens, cut before a marker
  token and at word 81), then through the stripper, with `replace:false` and no cues. The final equals the
  concatenation of what was sent.
- **C.** Live final, then the pipeline source, then held tokens with `append:true`. The label is on the first token
  only. Then the append final. The renderer opens a separate keyed bubble and never joins the Live one.
- **D.** Every pipeline event of a `live` turn stays in `held` and is never sent.
- **E.** `onSupersede` in mode `live`/`appended` stops Live: no Live token, no Live final, no history. The replacing
  token is still `replace:true`, because `visible` is set, and `replaceFirstOfTurn` drops the append bubble.

**The decisive Safety bar, Live side.** The following were all traced in `routerArbiter.ts`:
- `tryDecide` returns before the dispatch (the dispatch gate).
- Row 3 is a hard first word. Row 4 runs `checkCompleted` on the text at V.
- `pumpLive` shows only the decider's text.
- dup and unpaired router turns return at line 135.
- A capped decider ignores later events.
- The cap timer, a session close (`endKind:closed`) and `stop()` all end a stream that is shown. Each such end
  appends the pipeline answer.
- Rows 1–4 release the held pipeline. Rows 1 and 2 are always reached through the deadline timer.

**History (§4.6).**
- The engine's sink replaces `session.addAssistantMessage` only when the flag is on and a `turnId` exists.
- A shadow's history text is stored and never added: `finishLive` adds only the Live text.
- An append adds Live + pipeline (spec).
- Rows 1–4 add the pipeline text once, at release or on arrival.
- A supersede while Live is streaming adds only the replacing stream.

**Flag-off identity.**
- With `enabled:false`, `forward` hands every token, final and source straight to `send`. The payload is today's
  payload plus `turnId` and `origin:'pipeline'`. History goes to the engine directly; the sink is not set.
- The renderer's gate (`keyedGate`) never fires without `origin:'live'` or `append`.
- `unkeyedStreamingTarget` returns exactly the last message when there are no keyed bubbles.
- The replace and final paths match 17d199d line for line, apart from the stored tags.
- `label` is set only on the keyed path. No other message type carries a `label` field.
- No router session, no failover (`shouldFailOver` needs the flag), and the ear model parameter is `undefined`, which
  falls back to today's `LIVE_ROUTER_MODEL`.

**Review Focus 1–5.** Every named test exists, and the 4 targeted suites pass from a temp cwd: 153/153, run at
00:38. The code paths match each expectation:
- Interleave: each turn is keyed by its own `turnId`; an aborted shadow is settled and gets its line.
- A final that arrives before the decision is held.
- A partial token is never shown.
- A supersede during Live is handled as in case E above.
- Stop: `generation++`, timer cleared, `stopping`; a new `LiveRouterSession` per meeting, and `context=null` on stop.

**Stale callbacks.**
- Ear: `onopen`/`onmessage` are gated; `onclose` goes through `handleClose(gen)`; a late session is closed after
  `await`; goAway bumps the generation; `scheduleReconnect` and `scheduleSlowRetry` both skip while a timer is pending.
- Router: the same pattern, plus the context retry loop exits on `stopping`.
- Failover: decided inside the `liveRouter === router` check; the deferred restart is checked again through
  `shouldRestartEar`. The old ear's listeners are removed by `stopLiveRouter`.

**Line formats the app writes vs what the readers parse.** These all match:
- dispatch, decision, dup/unpaired, superseded, session connect/up/close/reconnect/refused/failed, ear failover,
  `[LiveRouter] close` and `[RouterAnswer]` (`router-hour-read.mjs` 106–152, `build-blind-rd.mjs` 110,
  `routerCapture.mjs` 71/81, `probeWait.mjs` 32–33);
- the extra trailing fields (`q_at`, `sent`, `superseded`), which the readers tolerate.

## Findings

### BLOCKING

None.

### IMPORTANT

**I-1. A punctuation-only (letterless) first token lets a routing "hard" reach the screen. The run reader cannot see
it.**
- Code:
  - `electron/services/routeReader.ts:8` `isHardWord` and `:12-16` `completeFirstWord`: the first token is taken
    as-is;
  - `routerArbiter.ts:211-216`: row 3 tests only that token;
  - LAB `router-hour-read.mjs:34` `hardFirst`: the same definition.
- Rests on:
  - SPEC §4.2: "First word: the first token"; "Hard word: a token whose letters-only form matches `^(hard)+$`";
  - SPEC §10.2 Safety: "0 garbled or routing-token text shown (no hard first word…)", the decisive bar;
  - the task's hunt item 1.
- **Observed** in a throwaway probe of the built arbiter (esbuild bundle of `routerArbiter.ts`):
  - Router text `" hard` (completed): row 5, Live shows `"` and then `hard`, and the history gets `" hard`. The line
    reads `route=invalid reason=too-short shown=live`, so the append catches the answer, but the token was shown.
  - Router text `... hard hard hard hard hard hard hard hard` (9 words, completed): `route=easy-answer reason=-
    shown=live`, with no append at all.
  - In both cases the reader's `hardFirst` reads the first token `"` or `...` and finds no hard first word, so
    Safety (text half) would PASS.
- **Likelihood:** low. Router40's 27 hard outputs were all single tokens. An output transcription that leads with
  `"`, `-`, `...` or `1.` is the exposure.
- **Fix (needs a ruling, since it changes a spec definition):** the first word is the first token whose letters-only
  form is non-empty (letterless tokens are skipped while they come before it), in both `routeReader.ts` and
  `router-hour-read.mjs` `hardFirst`. Add reader tests for `" hard`, `- Hard.` and `... hard`, plus one reader
  calibration case. The router40 binding fixtures should not move, since all 47 start with a letter token; re-run
  `routeReader.test.ts` to confirm.

**I-2. With the flag on, the history line `[Answer] full:` now carries Live text. The in-app judge pairs each dispatch
with the first such line.**
- Code:
  - `routerArbiter.ts:277` (`finishLive`) and `:295` (`append`) call `addHistory`, and `SessionTracker.ts:252` logs
    `[Answer] full:` for each call;
  - `interview60.judge.mjs:102` takes the first full line after each `dispatch: answer`;
  - LAB `router-hour-read.mjs:101` labels `answers` "pipeline-shown", yet it contains Live texts too.
- Rests on:
  - SPEC §4.6 ("the `[Answer] full:` line therefore logs exactly what entered the history"; the judge "keeps
    reading that line for the in-app arm");
  - SPEC §5 ("Pipeline-shown turns (rows 1–4) are captured by the existing `[Answer] full:` line");
  - SPEC §10 grading, and the No-regression bar ("0 wrong pipeline answers shown on the 27 HARD items … appends
    count").
- **Effect** on the in-app arm:
  - on shown=live turns, its answer is the Live text;
  - on appended turns, its answer is the *cut* Live text, and the appended full answer is never paired.
  - If the Task 19 scorer reads in-app grades for the HARD No-regression gate or for "pipeline-shown", a misrouted
    HARD item is graded on its Live text. An appended HARD item is graded on a fragment, which would likely read as
    wrong and FAIL an absolute gate for the wrong reason.
- **The reader's own use is safe.** It applies only stricter text checks, `pipeTexts` at `router-hour-read.mjs:302`.
- **Fix (registration / scorer, not app code):** Task 19 states that the in-app arm is graded only on turns whose
  decision line reads `shown=pipeline`. Appended answers come from `router-shadow.json` (`appended:true`), and Live
  answers come from `router-live.json`. Fix the reader comment at line 101.

### MINOR

**m-1 (ledger m2): `answered()` reads `speechEnd()` without checking that it belongs to the dispatching turn.
Confirmed latent; no current call site reaches it.**
- Code: `routerWiring.ts:32-37`; `interviewerTurn.ts` `speechEnd()` reads the machine's current turn.
- Why it is not reachable: every turn dispatch goes through `turnDispatchInput`, which sets `resolving: true`
  (`turnDispatch.ts:15`). So neither `fragmentHold` (main.ts:2153) nor `liveHold` (2141) ever holds a dispatch with a
  `turnId`, and `answered()` runs synchronously in the same `actOnTurn` that took the snapshot id.
- Fix (cheap guard): pass the id and return null when `snapshot().id !== turnId`.

**m-2 (ledger m3): a pipeline event for a turn the arbiter never saw dispatched is held forever and logs nothing.
Confirmed open.**
- Code: `routerArbiter.ts:313-317` with `turn()` at 457-471. `tryDecide` returns while `dispatchedAt === null`, so
  the held events are never released, and no dispatch or decision line is written. The reader's "dispatched turns
  with no decision line" and "nothing shown" checks therefore cannot see it.
- Reachability:
  - none via the current call sites (`answered()` always precedes `answerDetection` with the same id);
  - a late event for an evicted turn (KEEP_TURNS 50) would recreate such a turn. Non-dispatched turns are never
    evicted, so `turns` only grows (M-5, parked).
- Rests on SPEC §5 ("dispatched turns with nothing shown (must be 0)") and rule 11.
- Fix: on the first event for a never-dispatched turn, write one
  `[Router] undispatched turn=<id> ch=<…>` line, and pass the event through as if the flag were off.

**m-3: an empty cue-only pipeline token does not mark the turn visible. Confirmed.**
- Code: `routerArbiter.ts:320` routes it; `:453` sets `visible` only for a non-empty token.
- A supersede whose first token arrives next then has `replace` forced to false (line 350). In the renderer that
  token joins the still-streaming cue-only bubble, which keeps the old stream's cues when the new stream has none.
- Rare. Fix: count a token with cues as visible.
- Also at `:320`, the comment is duplicated ("filtered away; cues must survive … // filtered away: nothing to hold or
  show").

**m-4: a stale test name. Confirmed.**
- Code: `routerArbiter.test.ts:350`, "its first token keeping replace:true".
- Since fix4, the test asserts `tok:New |pipeline@1`, with no `replace`. Rename it to "its first token sent with
  replace:false (nothing shown yet)".

**m-5: the ear-failover preflight gate also matches `[Router] ear failover disabled`. Confirmed.**
- Code: `electron/test/golden/routerCapture.mjs:50` uses `/\[Router\] ear failover\b/`. main.ts:2235 logs
  `[Router] ear failover disabled reason=NATIVELY_LIVE_MODEL …` whenever the flag is on and `NATIVELY_LIVE_MODEL` is
  set.
- Rests on: the ledger (Task 14 complete; Task 11 "ear failover disabled must not read as failover"), and SPEC §5,
  whose failover line is `ear failover from=3.1 …`.
- **Impact:** a run with `NATIVELY_LIVE_MODEL=gemini-3.1-flash-live-preview` fails the precheck as "ear failover".
  - With a 2.5 override, the next gate (`ear on 3.1`) fails correctly anyway.
  - `interview60.flight.mjs:388` sets the variable only when the probe picks a non-default ear, and the LAB
    launchers clear it.
- Fix: `/\[Router\] ear failover from=/`, with a test for the `disabled` line. That matches `router-hour-read.mjs:130`.

**m-6: with the flag off, the app writes new router lines to the logs, including to verbal-diag.log.**
- Code:
  - main.ts:2269 → `routerWiring.onEarModel` → `routerDiag('[Router] ear model=…')` on every ear start, flag off
    included, and that line also goes to `verbal-diag.log`;
  - main.ts:2513 writes `[Router] flag NATIVELY_LIVE_ROUTER=off`;
  - the engine writes `[IntelligenceEngine] answer end …` for every `turnId` answer.
- **Impact:** the renderer stays identical, so this sits within PLAN "Flag coverage" (only the renderer is pinned).
  But any existing verbal-diag.log line-count check (memory: "47 app lines in the hour") now sees extra lines.
- Fix: state it in the registration, or limit `ear model=` to `console.log` when the flag is off. Task 13's preflight
  reads the debug log, not verbal-diag.

**m-7: when `speechEnd()` is null, Q falls back to the dispatch time and is labelled `q_src=final`.**
- Code: `routerWiring.ts:37`.
- When it happens: a turn with no VAD stop and no final, for example one opened only by Live text. Then
  `live_first_ms` ≈ V − dispatch, which understates the Speed bar, and the label hides it.
- Rare, because the system-audio VAD is always on. Fix: log `q_src=dispatch` (or `-`), so the reader can exclude or
  split those turns.

**m-8: a supersede after a Live answer has finished leaves the Live text in the history beside the replacing answer.**
- Code: `routerArbiter.ts:277` (Live added at the finish) and `:333` (the replacing stream is added in mode
  `pipeline`).
- This matches today's pipeline, where a completed head and its supersede both enter the history. SPEC §4.6 and
  Review Focus 4 cover only the streaming case. Recorded so that "exactly one answer per turn" is not claimed for
  this case. No fix proposed.

**m-9 (ledger carry, re-confirmed): the `answerLLM` branch writes the history directly even when the sink is set.**
- Code: `IntelligenceEngine.ts:316`.
- Unreachable in production, since `whatToAnswerLLM` always exists. If reached on a Live-shown turn, the hidden
  shadow would enter the history (SPEC §4.6). Fix: route that branch through the sink as well.

## Not shown by this review

- No live exercise. The real SDK connect from inside the app, the main.ts call sites and the renderer in Electron are
  first reached at the smoke (Task 17).
- I-1 was demonstrated only on a bundle of the arbiter, not on real router output.
- Real ear failover is never exercised: 3.1 cannot be forced to `failed`.
- `interview60.run.mjs` `auto()` and the LAB flight tools (Task 18) were not re-reviewed beyond the line-format
  consistency above.
- The full suite was not re-run here (the controller ran it: 1499/9/0). Only 4 targeted files were re-run (153/153).

## Re-check (2026-10-07 ~00:55 TST, same reviewer)

- Scope: `dae41f9..9fbdf5b` on feat/live-router (4757002 I-1, fa39d86 m-1, 2d34cbe m-2/m-3/m-4, 9fbdf5b m-5).
  `git diff --stat` from the shared object store matches `wb-fix-a.diff`: 9 files, +104/−14.
- Reader: LAB `router-hour-read.mjs` (mtime 00:50; wb-fix-b reports sha12 2d17df40226e).
- Rulings applied as given: I-1 is the first token with a letter, in the app and the reader. m-2 is narrowed to
  unknown or evicted turns. m-6..m-9 are accepted. I-2 goes to Task 19.

### Results

| item | result | evidence |
|--|--|--|
| **I-1, app** | FIXED | `routeReader.ts` `completeFirstWord` skips tokens whose letters-only form is empty. Complete = whitespace follows, or the turn ended. Every first-word use in the arbiter (lines 132, 194, 211, 433) goes through it. |
| **I-1, end to end: no Live text ever** | HOLDS | Throwaway probe on an esbuild bundle of the fixed `routerArbiter.ts`. It streamed incremental router text, with the dispatch before, during and after the stream: `" hard`, `... hard ×8`, `- Hard.`, `1. hard`, `— " ... hard` (interrupted). **All 15 runs: 0 Live tokens, 0 Live finals; route=hard shown=pipeline.** `" ...` alone (no letter token, 3 runs): 0 Live; row 2 (`no-router-turn`), shown=pipeline. **Calibration:** in the same probe, `"Mutable lists … here` (a letter token after the quote) shows Live. And before the fix, the same harness showed `"` and `hard` (see I-1 above). So the probe can see a Live show. |
| **I-1, app/reader parity** | HOLDS | 26 strings run through the app (`completeFirstWord(t, true)` + `isHardWord`, bundled from `routeReader.ts`) and through the reader's own `letters`/`tokens`/`isHardWord`/`hardFirst` lines, read out of `router-hour-read.mjs`. The set covers the quote, ellipsis, dash, number, em dash, non-ASCII (`ü`, `日本`, `Ünder`), `hardware`, `h-ard`, empty and whitespace-only strings, and `Okay, hard.`. **0 disagreements.** Calibration: the old first-token reader disagrees on 12 of the 26. Non-ASCII-only tokens are skipped on both sides (`ü hard` → hard), the safe direction. |
| **m-1** | FIXED | `routerWiring.ts:48` uses `speechEnd()` only when `currentTurnId() === turnId`; otherwise Q is the dispatch time, with `final`. main.ts passes `() => this.turn.snapshot().id`, which is synchronous in `actOnTurn`, so today's Q is unchanged. That main.ts line is covered by tsc only, not run in the app. |
| **m-3** | FIXED | `emit` counts a token with cues as visible (`routerArbiter.ts`). The new test keeps `replace` on the replacing token. Live tokens never carry cues, so the Live path is unchanged. |
| **m-4** | FIXED | Renamed: "…its first token sent with replace:false (nothing shown yet)". |
| **m-5** | FIXED | `routerCapture.mjs` gate matches `/\[Router\] ear failover from=/`. The new test passes a `disabled` line; the existing `from=` test still fails the gate. Now the same as `router-hour-read.mjs:130`. |
| **m-2 (narrowed ruling)** | AS RULED | An event for a turn the arbiter has no record of is passed through as if the flag were off, with one `[Router] undispatched turn=<id> kind=<ch>` line per id. A turn that is opened but not dispatched is still held, by design, per the ruling. |
| **Router40 replay** | 20 / 27, unchanged | `[replay] {"shownLive":20,"shownPipeline":27,"appends":0,"row4":0,"hardRows":25} late=RH07,RH17 liveFirstMax=1259`. |
| **Tests** | PASS | 6 files from a temp cwd (routeReader, routerArbiter, replay, routerWiring, routerHarness, answerMessages): **219/219**. |

### No new unsafe-show path

- **I-1 only makes a first word later or hard, never earlier or easy.** A letterless token used to be the first word
  (always "live"); it is now skipped. So a turn can only move from row 5 toward row 3, or to row 2 (no first word by
  Q + 2 s). Neither shows Live.
  - `showablePrefix`, `checkCompleted`, `tokensOf` and the 8/80 limits are untouched.
  - The `!` on `completeFirstWord` at line 211 stays safe, because text only grows for a given `seq`/`firstTextAt`.
- **m-2 pass-through carries only pipeline events, never Live text.** It applies only to turns with no record.
  - A hidden-shadow event cannot reach it on a live turn: `turnDispatched` creates the turn before any engine event,
    since `answered()` precedes `answerDetection`.
  - Eviction (KEEP_TURNS 50) removes only turns whose line is written, so their pipeline has ended and their Live
    display is over. A later event can only be a new (replacing) stream, which today's path would show too.
- **m-3 changes only the `replace` flag** on a pipeline token after a cue-only token.

### Observations (no action asked)

- A router turn with no letter token at all is logged `route=invalid reason=no-router-turn`, although a router turn
  existed. It is safe, and SPEC §4.3 row 2 reads "no deciding router turn has a complete first word". `late` vs
  `no-router-turn` is a counting label only.
- The m-1 main.ts line, and the reader's full `--mutations` run, were not exercised here. The wb-fix-b report says the
  full mutation run was not re-run.

### Still open, as ruled

- I-2 is carried to the Task 19 registration and scorer.
- m-6..m-9 are accepted.

**Verdict: READY**
