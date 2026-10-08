# Task 10 review: routerWiring.ts + main.ts glue (Opus)

Package `reviews/task-10.diff` (f03862d on bfca1fe), reviewed against integration HEAD 99a6e14. `git diff f03862d 99a6e14`
does not touch `main.ts`, `routerWiring.ts` or `routerWiring.test.ts`: the fix2/fix3/fix4 merges are in the arbiter and the
renderer only. Note: during this review the live-router working tree picked up uncommitted Task 11 edits in `main.ts`
(the ear failover, so line numbers moved by about 20). Task 10's own hunks were unchanged.

**Verdict: SPEC PASS, QUALITY APPROVE.** No BLOCKING or IMPORTANT findings. Six MINOR findings, and four of them need a
controller ruling or a follow-up.

## Checks run
- `routerWiring.test.ts`, run from %TEMP% with `--root <WT>`: **23/23 pass**.
- tsc: not re-run by me, because the WT tree was being edited by Task 11. The implementer reports root 0 and electron 6
  (the baseline).
- Read: the full diff, `routerArbiter.ts` @HEAD, `LiveRouterSession.ts`, `interviewerTurn.ts` (turn ids, `speechEnd`,
  `reopenIfStale`), the main.ts regions (turn feed, `dispatchDetection`, `answerDetection`, lifecycle, `endMeeting`,
  event forwarding, constructor order, the autostart seeding at 3606), `IntelligenceEngine` sink use (530),
  `KnowledgeOrchestrator.getRouterProfileSummary`, `routerCapture.mjs`, `probeWait.mjs` and `router-hour-read.mjs`.

## Priority 1: flag-off identity in main.ts. Holds.
- **The arbiter is built `enabled: false`.**
  - `forward` sends token, final and source straight to `send`, and drops `end`.
  - `turnOpened`, `turnClosed`, `turnDispatched`, `setRouterUp`, `setEar` and `routerTurn` all return at once (arbiter
    77, 82, 94, 107, 112, 121).
- **Payloads.**
  - Token: `{token, question, confidence, replace: replace===true, ...cues}` has today's keys in today's order (pinned
    by the test's `Object.keys`).
  - Final: identical to today's.
  - `turnId` and `origin: 'pipeline'` are added only when the engine gave a turnId. Global Constraints allow this.
- **Source.** Main's `send` calls `send(channel, label)` alone when `turnId` is undefined, which is today's call byte for
  byte. With a turnId it adds the turnId (allowed). The `[Main] answer source:` console line stays before the window
  check, as before.
- **Listeners.**
  - The order of the three listeners is unchanged.
  - The new `suggested_answer_end` listener forwards to a no-op.
  - The new `answered()` call only fills a Set.
- **History.** `setTurnHistorySink` is installed only when the flag is on. With the flag off, the engine writes the
  session history as today.
- **Construction order.**
  - `setupIntelligenceEvents` runs in the constructor (main.ts 543).
  - The first callers of `routerWiring` come later: `resetTurn` from `startMeeting` or `setLiveMode`, from IPC or the
    autostart timeout at 3606.
  - So the `!` fields are never read unset.
- **Additions with the flag off: two log lines only.**
  - `[Router] flag NATIVELY_LIVE_ROUTER=off`.
  - `[Router] ear model=<id>`, through `routerDiag`, so it also reaches verbal-diag.log.
  - No IPC send or history write changes.

## Priority 2: event ordering
- **`turnDispatched` before `turnClosed`.** This holds on every normal path.
  - A dispatch happens while the machine's turn is open. Its close comes at the earliest 8 s later (continuation), or
    through candidate, not-a-question or nothing-heard, none of which can follow a dispatch inside the same tick.
  - The exception is one edge, MINOR m2.
- **Open, close and stale replace.** The open, close and stale-replace stamps are right.
  - Every mutation of the turn machine (`speech`, `final`, `detected`, `candidateSpoke`) is followed by `turnTick()`,
    which calls `syncTurnIdentity()` first. The Live/whisper mark path calls `syncTurnIdentity()` itself.
  - `close` and `resetTurn` call `turnIdentity(turnSeenId, null)` before the reset.
  - `reopenIfStale` is seen as X→Y at the next sync, in the same tick.
- **`setRouterUp`.** The session's `state` events drive it through `onRouterState`.
  - The arbiter's `routerStates` starts empty, so `routerUpAt` is false: the router starts DOWN, as SPEC 4.1 and fix I-3
    require.
  - Up comes only at `setupComplete` (LiveRouterSession 137-140).
- **`stop()` before `removeAllListeners()`.** The order is right.
  - `stop()` emits the open router turn's `closed` end and the down state while the listeners are still attached.
  - The extra `onRouterState(false)` after that is a harmless second down entry (the implementer's concern 3; nothing
    counts the arbiter's own state entries).
- **One arbiter per process.** This is correct across meetings.
  - Turn ids never repeat: `nextTurnId` lives in one `createInterviewerTurn` per AppState, and `reset()` only nulls the
    open turn.
  - The router's `seq` restarts with each new `LiveRouterSession`. The arbiter's fix I-2 handles that: an entry with the
    same seq but a different `firstTextAt` is a new router turn (arbiter 124).
  - Router down/up history is carried in timestamps, so a Q before the new session's `setupComplete` reads router-down
    (row 1), as specified.
  - The wiring's `dispatched` Set is safe for the same reason.
- **Audio tee.** It sits at all three `liveRouter?.write` sites, with the same arguments.
  - `LiveRouterSession.write` returns at once while the session is down, so there is no gap buffer (spec 4.1).

## Priority 3: quota. SPEC-compliant; a ruling is wanted (MINOR m1)
- **What SPEC says.**
  - §4.1 Lifecycle: "The session starts and stops with the ear (meeting start and stop) when the flag is on."
  - §1: "The router acts only on turns the interviewer-turn machine dispatches in `auto`." That limits what the router
    acts on, not when the session runs.
  - The code follows §4.1 literally: start next to `startLiveRouter` at meeting start and at off→suggest/auto; stop
    beside `stopLiveRouter` at →off and in `endMeeting`.
- **The cost.**
  - In `suggest` mode, `onInterviewerAudio` returns unless the mode is `auto`, so no turn ever opens.
  - Every router turn is then `unpaired`, and each one writes a decision line and bills 3.8 Live audio for nothing.
  - The same holds after auto→suggest mid-meeting: the router keeps running.
- **The registered run is safe.** The launcher seeds `NATIVELY_LIVE_MODE=auto` before the meeting starts, and the flag
  is off in daily use.
- **If the user wants it gated to auto,** the change has two parts:
  - start only when `liveMode === 'auto'`;
  - add start/stop on suggest↔auto, because today that switch does not restart anything (`wasRunning`).

  That deviates from SPEC 4.1's wording, so it needs a user ruling. Do not change it unasked.

## Priority 4: log lines against their readers. All match.
| line | emitted by | reader | match |
|--|--|--|--|
| `[Router] flag NATIVELY_LIVE_ROUTER=on\|off` | main.ts console.log template literal | guard-rd r2 and rd-proofs read the BUILT main.js for the literal prefix `[Router] flag NATIVELY_LIVE_ROUTER=` | yes in source: the prefix is a contiguous literal, and esbuild keeps it contiguous whether or not it lowers the template literal. **The built-file grep (plan step 6) has not been run** (m4) |
| `[Router] session failed reason=<r> dispatches_before=<n>` | `routerDiag` (console + verbal-diag.log) | hour reader 127-129: `^\[Router\] session failed\b`, then the last `dispatches_before=(\d+)` on the line or its continuation. It reads only natively_debug.log, so the verbal-diag copy is not double-counted | yes. A reason with spaces ("connection closed") is fine: the reader takes the last `dispatches_before` |
| `[Router] ear model=<id>` | `routerDiag` in `onEarModel`, at every `startLiveRouter` | routerCapture.mjs 52: the last `/\[Router\] ear model=(\S+)/` must equal `gemini-3.1-flash-live-preview` | yes. `getModel()` returns `LIVE_ROUTER_MODEL` (default 3.1). The extra line `[Router] ear model id not recognised …` has no `=` after "model", so the regex does not match it |
| `[Router] session connect/up/close/reconnect/refused` | LiveRouterSession through `log: routerDiag` | routerCapture 25-48; hour reader 132-139 | already reviewed at Task 2; wired here through `log` |

`probeWait.mjs` reads `[Router] dispatch turn=` and the decision lines. The arbiter writes both, and Task 10 makes sure
each turn-dispatched answer goes through `turnDispatched`.

## Priority 5: the implementer's other concerns
- **`turnOpened` is stamped at sync time.** Not a defect.
  - The machine's `startedAt` and the sync are in the same synchronous call chain on every path (see Priority 2), so the
    gap is under 1 ms.
  - A turn opened by a transcript final opens inside `turn.final(…, Date.now())`, followed at once by `turnTick()`. The
    report's "waits for the next turnTick/dispatchDetection" does not happen: line 1246 runs `turnTick()` in the same
    statement.
- **The extra unrecognised-ear line.** Fine.
  - It is loud and honest, and no reader is confused by it.
  - The arbiter keeps its default `3.1` for `ear=`, which the line explains.
  - Today it can only fire on a `NATIVELY_LIVE_MODEL` override with an odd id.
- **`answered()` keeps its own guard Set.** The brief requires it ("pins the wiring's own guard").
  - Process-lifetime growth is a few hundred ids. That is fine.
- **The history sink with a live engine.**
  - The engine calls the sink only when `options.turnId != null` (IntelligenceEngine 530). Typed, manual and chip
    answers still write the session history directly.
  - Pending: the history is held until the decision. Pipeline: added. Live: never added. Appended: added after the Live
    text. Supersede: reset, then the replacing stream's text is added.
  - This matches SPEC 4.6.
  - Not exercised: the real engine with the sink, at the smoke.

## Spec compliance (brief, lines 1432-1571)
- **Module surface.** It matches lines 1450-1471 exactly. `WiringDeps` matches too.
- **Unit tests.** Every listed test is present and meaningful:
  - open/close/stale order;
  - dispatch with and without `speechEnd`;
  - supersede does not dispatch;
  - idempotent;
  - `answered(undefined)`;
  - flag-off identity against a real `RouterArbiter({enabled:false})` and today's payload table;
  - the failed line's count;
  - ear 2.5 → `setEar('2.5')` plus its line.

  Breaking any of them mentally (the guard removed, open before close, `speechEnd` ignored, origin dropped, cues
  dropped, count hard-wired) fails a named assertion. The implementer reports 10 mutants, all killed.
- **Steps 1-5.** All present: construction plus the flag line plus the sink (flag on only); the four listeners; the turn
  feed at sync, close and reset; `answered` in the answer branch before `answerDetection`; the session lifecycle beside
  the ear at the four sites, never inside `startLiveRouter`; the tee at three sites; `onEarModel` in `startLiveRouter`.
- **Paths that reach `answered`.** The brief names four (direct, fragment-hold resolution, live-hold resolution, R21);
  the first three go through `dispatchDetection`'s answer branch. The `supersede` path with `turnDedupId` set calls
  `answerDetection` directly and never calls `answered`, as the brief pins.
- **Deviations 1-6 in the report.** All are justified.
  - 1 is stricter flag-off identity.
  - 2 follows rule 11.
  - 3 is required.
  - 4: `LiveRouterSession`'s default connect is the Task 2/3 path.
  - 5 is as ordered.
  - 6 is equivalent.
- **Not extra.** Nothing beyond the brief.

## Findings (all MINOR)
- **m1. The router session runs in `suggest` mode too** (main.ts `startMeeting` deferred block, ~2037-2040; `setLiveMode`
  ~2090-2093).
  - It bills 3.8 Live audio with nothing that can dispatch.
  - SPEC §4.1 "starts and stops with the ear" is followed literally, so this is not a spec failure.
  - **Ruling wanted** from the user or controller: keep it, or gate the session to `auto` (that needs a start/stop on
    suggest↔auto). The registered run is unaffected (auto is seeded).
- **m2. A fragment-held turn dispatch can resolve after its turn closed or was replaced** (main.ts 2150-2158 hold, 951
  resolve, 2187 `answered`).
  - **The cause.** `looksFragmentary` also holds turn dispatches (`turnDispatch: true` is not excluded). The resolution
    calls `answered(X)` 2.5 s later.
  - **If X closed in that window** (a candidate interjection), `turnClosed` came first. The arbiter unpaired X's router
    turns, and the dispatch then decides row 2 (pipeline). That fails safe.
  - **Q is then wrong or late.** `answered` reads `this.turn.speechEnd()`, the machine's current turn and not
    necessarily X's.
    - If X closed, that is `null`, so Q = now with `q_src=final`, and the pipeline is held about 2 s more.
    - If X was replaced, Q comes from another turn.
  - **Rare on live40** (whole-sentence items).
  - **Suggestion (Task 15 sweep):** in `answered`, use `speechEnd()` only when `turn.snapshot().id === turnId`. That
    needs a dep change; either way it is cheap. Otherwise record it as a residual.
- **m3. A turnId'd pipeline stream for a turn the arbiter never saw dispatched is held forever, with no line.**
  - **Reachable only in a corner.** A fragment-hold resolution sets `turnDedupId` inside a later turn Y, whose own
    dispatch was then dropped as a duplicate. Y's supersede then sends `replace` with turnId Y, which was never
    dispatched.
  - **The result.** The answer is never shown and no `[Router]` line records it.
  - **Not Task 10's code alone.** It comes from the arbiter's `pending` default plus the pre-existing cross-turn
    `turnDedupId` state.
  - **Suggestion for the whole-branch review (Task 15).** Have the arbiter log one line for a pipeline event on a
    never-dispatched turn (for example `[Router] undispatched turn=<id>`). Then the smoke and the hour reader can see
    it, instead of it being silent.
- **m4. Plan step 6 was not run:** build WT, then grep the built `dist-electron/electron/main.js` for
  `[Router] flag NATIVELY_LIVE_ROUTER=` and `routerArbiter.forward`.
  - The implementer deferred it, correctly under Global Constraints (only the controller builds). The source literals
    are present.
  - **Controller:** run it at the next build and record the grep. guard-rd r2 and rd-proofs depend on it.
- **m5. The flag-off main.ts `send` branch has no unit test.**
  - The branch: `send(label)` without turnId, `send(label, turnId)` with one.
  - The wiring/arbiter half is pinned; main's 4-line switch is not. It is trivial and visible in the diff.
  - The flag-off smoke or flight is its live exercise. Its first byte-identity check is the renderer's existing
    flag-off sequence test (Task 8) plus the smoke.
- **m6. A second `startMeeting` without an `endMeeting` keeps the old router session and its old context.**
  - `startRouterSession` returns early when `this.routerSession` is set. Meanwhile `startLiveRouter` restarts the ear.
  - Only abnormal flows reach this. Note it as a residual; no change needed.

## Not shown or residual
- No main.ts call site was exercised live (the turn machine against the real VAD, session timing, real `@google/genai`
  connect from the app, the sink on a live engine). The smoke (Task 17) is the first live exercise. It should check:
  - one `[Router] dispatch` per answered turn;
  - no `unpaired` router turn just before a turn opens;
  - `[Router] ear model=gemini-3.1-flash-live-preview`;
  - `[Router] flag NATIVELY_LIVE_ROUTER=on`.
- tsc was not re-run by this reviewer (WT under concurrent Task 11 edit).
