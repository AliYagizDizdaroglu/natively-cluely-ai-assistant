# Review: Task 6 (router40 offline replay) + task-5-fix2 (lane B, 4c95c19..8d2de5b)

Reviewer: Opus, 2026-10-06. Read-only. Evidence: both test files run from a temp cwd (54/54 pass; replay prints
`shownLive 20, shownPipeline 27, appends 0, row4 0, hardRows 25, late=RH07,RH17, liveFirstMax=1259`); tsc root 0 errors,
electron 6 errors in the same 6 files as `baseline-tsc-electron.txt`; a scratch-copy probe (arbiter copied to the
scratchpad, two extra cases, nothing written to the worktree) for findings I-1 and I-2.

## Verdict

**SPEC: FAIL  QUALITY: CHANGES.** Task 6 alone passes. fix2 requirement 1 holds only when the supersede lands while
the Live display is still streaming. A supersede after the Live answer finished is the likelier case: whole-turn
supersedes come up to 8 s after the voice stop, and the replay shows Live first words at ≤ 1.26 s. In that case the
live capture reads `false`, and the turn's line may already be written with `superseded=no`.

## Task 6: offline replay (PLAN 1204-1240, SPEC §9.2)

The brief is met, step by step:
- fresh arbiter per item, `enabled: true`, router up;
- `turnOpened(1,-5000)` and `turnDispatched(1,0,0,'vad')`;
- cumulative text per chunk, then `generationComplete`;
- pipeline tok at +4000, fin + `end('completed')` at +6000, then `turnClosed(1,30000)`;
- all 7 plan assertions are present and pass;
- step 2's break check was done (RE05 at 2600 ms gives shownLive 19), and the report quotes it.

The report's concern 1 (RH05 shown live, RE09 read as hard) is **already explained by the spec**, so it needs no ruling:
- §9.1 expects `live` 20 = "the 19 EASY answers, RE18 included, plus RH05".
- §9.1 expects 27 `hard` first words. That is 26 HARD items without RH05, plus one EASY item: RE09.
- The extra `per-item identities` test pins exactly this. It stays inside the brief's "every difference explained", so it is kept.

- **MINOR** `routerArbiter.replay.test.ts:73-91`: the replay runs in the `describe` body. An arbiter throw would show as
  a collection error rather than a failed test. It is acceptable for an offline pin, and the report notes it.
- **MINOR** `routerArbiter.replay.test.ts:48`: chunk times are clamped to be non-decreasing. The report says this has
  no effect on the real fixture, and it is needed for the plan's mutant to bite. Fine.

## fix2

### Requirement 2 (trailing ` superseded=yes|no`): met
`routerArbiter.ts:439`. The hour reader parses it (`router-hour-read.mjs:101`).

### Requirement 3 (held source forwarded at a live/appended supersede; later source forwarded): met
- `routerArbiter.ts:373-375` forwards the held source at the supersede.
- A later source is forwarded too: the mode is now `pipeline`, so `route` sends it.
- In appended mode `held` is always empty, because `append()` drains it and `route` sends directly, so it is a no-op there. Correct.

### Requirement 1 (live and shadow captures both read true on a superseded Live turn): only partly met

- **IMPORTANT I-1: a supersede after the Live display ended.** `routerArbiter.ts:366-375` sets `superseded` before
  `writeLiveCapture` only when `t.live.phase === 'streaming'`. The live capture of a finished Live answer is written
  earlier, in `finishLive` (`:274-279`), and the same holds for an append (`:295`). Probe results:
  - **A: Live finished, old pipeline not yet ended, then a replace.** Captures `[["live",false],["shadow",true]]`, line `superseded=yes`.
    `router-hour-read.mjs:229` counts this as a `superseded_flag_disagreement`, so every such turn becomes a false alarm.
  - **B: Live finished and old pipeline ended, so the line is already written, then a replace.** Captures
    `[["live",false],["shadow",false]]`, one line, `superseded=no`.
    The bubble the user saw was rewritten, but the hour reader reads the turn as shown=live and never superseded. It
    would grade the Live text as what was shown.
  - The new tests cover only the streaming case. No test pins A or B.

  Suggested fix, for the controller to rule on:
  - Make the flag mean "superseded at the time this record was written".
  - At every live/appended supersede, emit one extra diag line, e.g.
    `[Router] superseded turn=<id> phase=<streaming|done|appended> line_written=<yes|no>`.
  - Have the reader take that line as authoritative. Its disagreement check should skip records written before the supersede.
  - Add tests for A and B.

  The alternative of deferring the live capture cannot fix B, because the decision line is already out.

### The controller's checks

- **Does forwarding the OLD stream's held source mislabel the replacement bubble? Sometimes. IMPORTANT I-2,
  `routerArbiter.ts:373`.**
  - On the hedge path (default ON), each stream announces its winner as a whole sentinel chunk "just ahead of the first words":
    - `WhatToAnswerLLM.nameStallSwitch`;
    - `IntelligenceEngine.ts:473-479` emits `suggested_answer_source` before the token that carries `replace: true`.

    So the latest held source at `onSupersede` is the replacing stream's own label, which is correct.
  - When the replacing stream emits no source (no hedge or fallback announce) but the old one did, the old stream's
    label is forwarded. Probe A sent `src:old@1` before `tok:New|pipeline|replace`.
  - The task-8 renderer's `sourceForBubble` then gives that label to the new pipeline-keyed bubble. Before fix2 that
    bubble showed the neutral "…". Now the bar claims a model that did not write the answer, against the renderer
    contract ("label from the replacing stream").
  - The updated Task 5 test (`routerArbiter.test.ts:343`, `'src:gemini@1'`) pins exactly this old-stream forward.
  - One-line fix: forward the latest held source only if it is the LAST held item. The replacing stream's announce
    always directly precedes its replace token. An old stream's source is followed by that stream's own tokens.
  - Apply the same rule to the pending-mode branch (`:361-364`, pre-existing Task 5 code with the same latent issue),
    and update the test to forward a source sent between the old tokens and the replace.
- **Renderer interface (merge check, no finding on this diff).** The staged task-8 renderer (`stage/task-8/.../NativelyInterface.tsx:151-160, 875, 936`)
  reads the pending label, then deletes it, for a replace bubble under the new pipeline key. That works with fix2's
  order (source first, then the replace token). The parallel renderer fix must keep **read-then-clear**. If it clears
  the pending label when the replace token arrives, before reading it, the forwarded source is discarded and fix2's
  requirement 3 has no visible effect. A source arriving after the supersede then finds the turn gone from
  `liveTurnsRef` and falls to `sm.setSource` (the bubble is never relabelled).
- **Unsafe show or uncaught failure: none found.**
  - fix2 adds one `source` emit, which carries a label and no answer text.
  - It adds two flag reads, and moves `t.superseded = true` ahead of an existing call.
  - `writeLiveCapture`'s `t.live.V!` is reached only in the streaming branch, where V is set.
  - No new hold, release or history path.
- **A pending-mode supersede reads `superseded=no`. Correct** for the flag's meaning, a Live display the user saw being
  replaced:
  - In pending mode only the replacing stream is ever released (or shadowed). The user never saw the old one.
  - This matches plan item 13, which sets `superseded` only under "Live shown".
  - Name the semantics in the reader's header so `supTurns` is not read as "all supersedes".
- **MINOR (pre-existing Task 5, not fix2), `routerArbiter.ts:356-360`.** `onSupersede` does not reset `pipeFirstAt`.
  So on any supersede, `shadow=` and the shadow/appended capture's `firstMs` report the OLD stream's first token.
  This is worth a note in the reader, or a reset, if the hour uses shadow timing on superseded turns.

## Not shown
- The renderer's parallel fix itself was not available to review. Only the staged task-8 copy was checked.
- No test drives the engine and arbiter together (source sentinel to replace token). The order of events is read from
  the code, not observed.
- How often the replacing stream lacks a source announce in the flight's configuration was not measured.

## Re-review: task-5-fix3 (4878ad8 on 8d2de5b, lane B), 2026-10-07

Evidence:
- Lane B arbiter + replay: 60/60 pass. The replay is unchanged: 20 live / 27 pipeline / RH07, RH17 late.
- tsc: root 0 errors; electron 6, the baseline.
- The scratch probes were re-run on the fix3 arbiter copy, with two new cases (C, D).

| Ruling | Resolved? | Evidence |
|--|--|--|
| I-1: authoritative `[Router] superseded turn= phase= line_written=` at every supersede with shown=live; `t.superseded` set before any later capture | **Yes** | `routerArbiter.ts:361-364`, which runs before the pending/live branches. Probe A: shadow `true`, line `superseded=yes`. Probe B (line already written): `phase=done line_written=yes`. Probe C (append, then supersede): the appended capture reads `true`, `phase=done line_written=no`. The new tests cover streaming, done with the line open, done with the line written, and pending (no line). |
| I-2: forward a held source only if it is the last held item, in both branches | **Yes** | `:366-367` and `:376-378`. Probe A: the old label is no longer forwarded. Probe D (final-only replace preceded by its own source): `src:new` is forwarded before the `fin`. The old-stream pin was removed, and the pending test now sends a source right before the replace. |
| MINOR: `pipeFirstAt` reset at a supersede | **Yes** | `:360`. Both readers of it are null-safe (`:412`, `:442`). Probe D: a final-only replace now reads `shadow=-` and `firstMs null`, which is honest (there was no token). |

**Unsafe show or uncaught failure: none.**
- fix3 adds a diag line, a flag write and a field reset.
- It narrows source forwarding; it never widens it.
- It adds no new emit of answer text, no hold or release path, and no non-null assertion.

The test quality holds: the report records RED for all 6 new tests, plus 4 mutants that each fail.

Remaining findings:
- **IMPORTANT (outside this diff: Task 14's LAB reader) `router-hour-read.mjs:229, 233`.** The reader does not yet read the new
  `[Router] superseded` line.
  - It still counts a live capture `false` against a line `yes` as a `superseded_flag_disagreement`, and `capOk` requires that count to be 0.
  - So the ruled-for case (supersede after Live finished, probe A) FAILS the reader's capture check.
  - A line-written supersede (probe B) stays invisible to it.
  - The reader must take the diag line as the record before the hour is read: skip records written before the supersede, and mark the turn superseded when `line_written=yes`.
- **MINOR `routerArbiter.ts:361`.** A second supersede on the same turn logs a second diag line (probe C: `line_written=no`, then `line_written=yes`). That is a correct record, but the reader must dedupe by turn when it counts superseded turns.
- **MINOR (accepted edge).** In pending mode, an old stream that announced its source and then sent no token before the replace leaves its source last. A replacing stream without its own announce then inherits that label. This is rare and is covered by the ruling's rule.

Not shown: the engine-to-arbiter order on a real stream (read from the code, not observed), and the renderer's parallel fix.

**Re-review verdict (fix3): SPEC: PASS  QUALITY: APPROVE.** It is conditional on the reader follow-up above, which belongs to Task 14, not lane B.

## fix4 review: task-5-fix4 (16868de on 4878ad8, lane B; Task 8 re-review R2)

Evidence:
- Lane B arbiter + replay: 62/62 pass. The replay is unchanged.
- tsc: root 0 errors; electron 6, the baseline.
- Scratch probes on the fix4 arbiter copy: the earlier A-D, plus E (a pipeline-shown turn, then a supersede) and F1-F4
  (odd Live first words: `__ABC__`, `__MORE__`, `__`, `w0__ABC`).

| Check | Result |
|--|--|
| Guard keyed on visible text | **Yes.** `emit` sets `t.visible` on any non-empty token or final, Live or pipeline. A source event or an empty token does not set it. `sendPipeline` clears `replace` only while `!t.visible`, and only on a token or final. Every per-turn send goes through `emit`. The flag-off path and the path with no turnId bypass the arbiter's per-turn logic as before, which is unchanged behaviour. |
| "A Live decision with zero Live tokens sent" is unreachable | **Holds in every case I could build.** F1/F2 (a marker first word): the turn stays undecided and nothing is shown, and the supersede then sends `replace:false`, which is correct. F3/F4 (`__` or a mid-word `__ABC` first): Live is decided and its first token is shown, so `visible` is set and the supersede keeps `replace:true`. The stripper holds only an uppercase or underscore *tail*, and a Live decision needs a whitespace-terminated first word, so the first Live token always carries text. Because the guard is keyed on visible text, the case would be handled correctly even if it arose. |
| A real supersede after visible text still replaces | **Yes.** After Live text (fix4 test; probes A, B, F3, F4): `tok:New|pipeline|replace`. After pipeline text on a pipeline-shown turn (probe E): `tok:New|pipeline|replace`, `fin:New|pipeline|replace`. After an append (probe C): the replace is kept, because the append's pipeline tokens were visible. |
| Pending-mode supersede | First released token `replace:false`, its final `replace:true`. The final then overwrites only the bubble this stream just opened, which is correct. A final-only replace is sent as `replace:false`, which is correct. |
| New unsafe-show path | **None.** fix4 only lowers a flag on a copy of the outbound. It never changes what is held, released, shown or added to history. Lowering `replace` cannot show text that was not already going to be shown. It can only stop that text overwriting a bubble from another turn, which is the defect R2 names. |

Tests: the 3 new and 1 updated tests fail without the guard (RED and mutants are recorded in the report). The shown-text test
pins the case where the replace is kept.

Findings:
- **MINOR `routerArbiter.ts:463` (`emit`).** An empty token that carries cues (the M-4b path) does not set `visible`. If the
  renderer draws a cue-only bubble, a following `replace:true` is lowered and the replacing stream opens beside it
  instead of over it. That is cosmetic, and the engine attaches cues to the first prose token, so it is rare.
  Count `p.cues?.length` as visible if the renderer shows cues on their own.
- **MINOR (cleanup).** The test name at `routerArbiter.test.ts:350` still says "its first token keeping replace:true",
  but the assertion is now `replace:false`.

Not shown: the renderer side of R2 (the overwrite this prevents) was not exercised here, and nothing drove the engine and arbiter together.

**fix4 verdict: SPEC: PASS  QUALITY: APPROVE.**
