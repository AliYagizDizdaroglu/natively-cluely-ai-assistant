# Follow-up parent replay result: 2026-09-26, scenario50 (s50m)

The pre-registration is `PREREGISTER-followup-replay.md`, written at 18:28:12 local before any model
call and not edited. The change under test is commit 6c50ec3 (`withParentExchange`, behind
`NATIVELY_FOLLOWUP_PARENT`, off). Nothing here touches holdout40.

## VERDICT: FAIL by rule step 1. The flag stays off; the diagnosis is re-examined

```
n = 60 (item, rep) pairs graded
  A: wrong=0 acceptable=16 weak=14
  B: wrong=1 acceptable=22 weak=7
DECISION: FAIL  (wrong(B)=1 > wrong(A)=0)
```

(`followup-replay-decide.mjs` output, verbatim. A = the captured prompt as the app sent it, parent
absent. B = the same prompt with the parent exchange restored by the built modules. 10 follow-ups
× 3 reps × 2 arms on gemini-3.1-flash-lite LOW; 61 requests, one retry after a 503. Graded blind by
three Opus agents, all `claude-opus-5-5` per their transcripts, with the frozen grader prompt and
each follow-up's parent question available to the grader.)

## Per item (Y acceptable, w weak, X wrong; three reps each)

| Item | A | B | Change |
|---|---|---|---|
| S1Q04F | wYY | www | −2 |
| S1Q05F | YwY | YYY | +1 |
| S1Q06F | www | YYY | +3 |
| S1Q07F | YYY | YYY | 0 |
| S1Q08F | YYY | YYY | 0 |
| S2Q04F | YYY | YYY | 0 |
| S2Q05F | YYY | Yww | −2 |
| S2Q06F | www | YYY | +3 |
| S2Q07F | www | wXw | 0 |
| S2Q08F | www | YYY | +3 |

## What it says

- **The restore fixes the failure it was built for.** Three follow-ups that no rep answered
  acceptably without the parent went to three of three with it: S1Q06F, S2Q06F, S2Q08F.
- **It also cost two items.** S1Q04F and S2Q05F lost two acceptable reps each. The graders' reasons
  are technical errors (tie handling in a top-k heap) and a misreading ("multi-hop dependencies"
  read as dependence on the embedding model). Whether the restored parent caused them is not
  tested here.
- **The one wrong answer** is S2Q07F, B rep 2: it had an LLM judge enforce authorization by checking
  session tokens. All six S2Q07F answers, in both arms, drift into ingestion; none was acceptable.
- The registered rule reads wrong answers first, and a +6 gain does not buy back one new wrong.
  That order was fixed before the run.

## Next, not decided here

The restore clearly helps follow-ups that cannot be understood alone; on others it is neutral or
worse, for reasons this replay cannot separate from sampling on 3 reps. A narrower design, for
example restoring the parent QUESTION only and not its answer, would be a new change with its own
pre-registered replay, on scenario50 again or another non-holdout roster. The user decides whether
to pursue it.
