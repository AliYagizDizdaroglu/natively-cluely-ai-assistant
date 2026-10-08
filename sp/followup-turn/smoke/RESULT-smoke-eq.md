# Smoke: NATIVELY_EARLIER_QUESTION on the built app — 2026-10-05 17:37–17:49 TST

Task `Natively-smoke-eq` (scheduled, LastTaskResult 0), quiet machine confirmed by the user in chat.
MAIN HEAD b42ca32 (LANDED 355ad0a + P2), `dirty-lines=3` = the user's three tracked files (interview60.chains.json,
interview60.report.md, natively_debug.log.1), no electron/*.ts dirty. dist main.js mtime 2026-10-05T14:37:21.898Z
(app:start rebuild). Cue mode: MAIN's shipped shape (CUE_RULE present). `chars` = the block BUILT (m3).

## Segment 1, flag on (S1Q04:+150 S1Q04F S1Q06:+150 S1Q06F:+30 WHY)
Startup: `[Main] earlier question: on`

    S1Q04: gate=no-cue cue=none chars=0 turn=1 ms=8
    S1Q04F: gate=block cue=constraint chars=418 turn=2 ms=3
    S1Q06: gate=no-cue cue=none chars=0 turn=3 ms=1
    S1Q06F: gate=block cue=pronoun chars=516 turn=4 ms=1
    WHY: gate=parent-in-prompt cue=short chars=0 turn=5 ms=2
    CHECK CLEAN: 5/5 exercised, 5 answers, mode on
    CHECK EXIT 0

## Segment 2, control, flag unset (S1Q04:+150 S1Q04F)

    S1Q04: pinned, no diag line (flag off)
    S1Q04F: pinned, no diag line (flag off)
    CHECK CLEAN: 2/2 exercised, 2 answers, mode off
    CHECK EXIT 0

## Step 6: captured prompts, strip -> rebuild with the reference -> re-insert (sha12 only)

    OK S1Q04 no block
    OK S1Q04F block sha12=0b6409385bb2 user sha12=075c4cbbb4e5 stripped sha12=5b28bf981290
    OK S1Q06 no block
    OK S1Q06F block sha12=cf28afe82964 user sha12=ad59a779e6d6 stripped sha12=903ca984bfc5
    OK WHY no block
    VERIFY: 2 with a block, 3 without, 0 FAIL of 5 clips          (segment 2: 0 with a block, 2 without, 0 FAIL)
    calibration (segment-2 log against segment-1 prompts): 5 FAIL of 5, exit 1

## Flight-eq pre-hour step 4/5 readings on this smoke
- smoke-rundir: prompts keys [S1Q04, S1Q04F, S1Q06, S1Q06F, WHY] = the played ids, SMOKE RUNDIR OK.
- n5 accept path (`--no-block --only S1Q04F --limit 1`, scenario50 S1,S2): `block=stripped from the captured prompt`,
  answered 1/1, transient 0 (model gemini-3.1-flash-lite, the harness default: 1 request on 3.1-lite). Refusal side
  (`--only S1Q04`): exit 2, "...carries no single well-formed EARLIER QUESTION block immediately...". Probe answer file deleted.
- eq-b4-cal on E\smoke-run-tmp --g S1Q04F,S1Q06F: PENDING (tool fix round running).

## Not shown
Answer quality; the hedge legs' shared bytes under a real race; the supersede, chip and Live-merge rows; the one-word
"Why?" shape; the startup REFUSAL on a junk value (unit test only); WHY.wav was never checked by ear (it pinned, so the
app heard it). The smoke record is not a pass record.
