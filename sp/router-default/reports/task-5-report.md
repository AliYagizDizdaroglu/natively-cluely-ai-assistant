# Task 5 report: arbiter pure core (lane B, branch feat/live-router-b), commit ebfd8d5

Files: electron/services/routerArbiter.ts, routerArbiter.test.ts, routerDiag.ts (staged at LAB\stage\task-5, applied).
Tests: 41 in routerArbiter.test.ts; with routeReader + unknownMarkerFilter suites all pass. tsc root clean; electron config 6 errors (= baseline), none in the new files.
RED: a no-op stub (types + empty methods) was run first: every test then existing failed on its own assertion (expected [] to equal ...), no import errors.
Mutants: DECIDE_MS 2500 -> 2 fail; V without dispatch gate -> 1 fail; no idempotent end guard -> 1 fail.

Controller addition (second end idempotent): onEnd ignores any end once pipeEnded; pipeEndKind/pipeEndAt are not overwritten. Two tests (one line + one capture; shadow endMs unchanged).

Deviations / choices:
- Stale-end drop (rule 20) applies only if the old stream had not already ended at the replace (staleEndPending = !pipeEnded); otherwise a real abort of the replacing stream would be dropped and the line never written.
- Empty non-replace pipeline tokens are dropped (not held, not counted in sent). Replace tokens are kept even if empty.
- On supersede in Live mode the decision stays shown=live (line is shown=live; shadow capture holds the new stream's text, as the plan's I1 test asks). No `live` capture is written for a Live stream stopped by supersede (only at the Live final), so the hour reader's live-capture count is 1 short per such turn.
- Supersede in pending mode keeps the latest held source plus the new stream. In live/appended mode the replacing stream's source is not sent (renderer never relabels a bubble).
- The line for shown=live additionally waits for the Live display to be over (the cap guarantees it ends).
- A router turn pairing to a turn whose line is already written becomes dup.
- Router state defaults to up when setRouterUp was never called; ear defaults to 3.1. Dup lines use the unpaired template (no sent=) with their turn's id, q_src, q_at.
- turnClosed before turnDispatched unpairs that turn's router turns (spec); Task 10 must dispatch before close (PLAN 1535-1541 does).
- A pipeline event for a turnId never opened/dispatched creates a record and is held until a decision.

Concerns: router-turn text is assumed cumulative. Router/ear state at Q for the ear uses setEar's now() (setEar has no timestamp).

## fix1 (commit 4c95c19)

Each fix has a test that failed first (8 RED of 48 before the code change) and a mutant that reverts it; each mutant is killed by exactly one test.
- I-1: onSupersede writes the `live` capture (text shown so far, endMs = supersede time) when it stops a streaming Live display; decision stays shown=live. Pin: the supersede-during-Live test now expects captures live, shadow.
- I-2: a router turn is a new one when its firstTextAt differs from the stored record for that seq. Pin: P7.
- I-3: router state defaults to down. Pin: P2 (row 1 at once, router=down).
- M-1: stale ends are counted (staleEnds), one per unfinished superseded stream; reset at the first accepted end. Pin: P1 (two supersedes).
- M-2: tokens and finals sent in appended mode carry replace:false. Pin: P3.
- M-3: the decider record is frozen (text/completed) once its Live display is over (final, append, supersede); ended flags still update. Pin: P5.
- M-4: a replace:true final with no replace token triggers the supersede (replaceSeen flag, cleared at the first accepted end); an empty token that carries cues is kept. Pins: M-4a, M-4b.
M-5 untouched. tsc root clean; electron config still 6 baseline errors, none in the new files. Suites: routerArbiter 48 + routeReader + unknownMarkerFilter = 84 pass.
Not shown: the optional `reason=superseded` tag on the line was not added (decision line unchanged).

## fix2 (task-5-fix2, lane B)
- Capture records: `[RouterAnswer]` JSON now has `superseded` (from `t.superseded`; `onSupersede` sets it before the live capture it writes).
- Decision line: trailing ` superseded=yes|no` after `sent=`.
- Task 8 I2: `onSupersede` in live/appended mode forwards the latest held `source` (sendPipeline) instead of dropping it; a source arriving after the supersede is already routed in pipeline mode.
- Tests (3 new, 1 updated): supersede during Live gives live+shadow `superseded:true` and a line ending `superseded=yes`; normal Live gives false/no; held source after a finished Live answer + final-only replace is sent, later source forwarded. The existing "during Live" test now expects `src:gemini@1` before the replacing token (the old stream's held source is now forwarded, as pending mode does).
- RED: first two tests failed on `superseded` undefined before the code. Mutants: dropping `t.superseded = true` before the live capture fails the supersede test (live reads false); dropping the source forward fails 2 tests.
- 54 tests pass (arbiter 51 + replay 3); tsc root clean, electron 6 lines (baseline).
- Caveat: `t.superseded` is only set in live/appended mode; a supersede while still pending reads `superseded=no`, as `t.superseded` did before. Test for the held-source fix was written together with the code, validated by mutant rather than a prior RED.

## fix3 (task-5-fix3, lane B)
- I-1: at every supersede with decision shown=live, `t.superseded = true` is set first (before any capture) and one diag line is logged:
  `[Router] superseded turn=<id> phase=<streaming|done> line_written=<yes|no>` (phase done covers appended). Pending-mode supersede: no line, superseded=no.
  A live capture written before the supersede still reads false; the diag line is the record.
- I-2: held source forwarded only if it is the LAST held item, in both branches. The test that pinned the old-stream label was updated (label no longer forwarded); the pending-mode test now sends a source right before the replace token.
- MINOR: `pipeFirstAt` reset at a supersede (shadow= and capture firstMs come from the replacing stream).
- Tests: 6 new (I-1 streaming / done-line-open / done-line-written / pending none; I-2 live; pipeFirstAt) + 2 updated. RED before code: 6 failed. After: 60 pass (57 arbiter + 3 replay). tsc root clean, electron 6 (baseline).
- Mutants: drop early flag -> 1 fails; drop diag line -> 3; forward any held source -> 2; keep pipeFirstAt -> 1.

## fix4 (task-5-fix4, lane B, Task 8 re-review R2)
- `Turn.visible` is set in `emit` when a token or final with non-empty text goes out (Live or pipeline). `sendPipeline` rewrites `replace:true` to `false` while `!t.visible`. A later final-after-token keeps `replace:true`.
- Tests: pending supersede (token path, and final-only replace) send replace:false; supersede after shown Live text keeps replace:true; the existing pending test updated (first token false, final true). RED before code: 3 failed (+1 failed test I then removed, below).
- Mutants: drop the guard -> 2 fail; never mark visible -> 4 fail. 62 pass (59 arbiter + 3 replay); tsc root clean, electron 6 (baseline).
- Not testable: "Live decision with zero Live tokens sent". A Live decision needs a complete first word, and the display always shows it (markers and hard words read rows 3/4, not Live; the stripper only holds a tail that is not followed by whitespace). I found no public-API path, so I wrote no test for it; the guard is keyed on visible text so it covers it if it ever arises. Left a comment in the test file.
