# Pre-registration — follow-up parent restore, offline replay (2026-09-26)

Written before any model call for this replay. Task 6 of plan h40c.

## Rule (verbatim from the h40c plan, Task 6)

Roster: scenario50, run `2026-09-22T08-22-50-s50m` (the newest scenario50 hour with captured
prompts). Items: its 10 follow-ups whose captured prompt carries no parent line: S1Q04F S1Q05F
S1Q06F S1Q07F S1Q08F S2Q04F S2Q05F S2Q06F S2Q07F S2Q08F; an id whose parent answer is absent from
the hour's log is dropped before the run and named. Arms on gemini-3.1-flash-lite at LOW, 3 reps
each, temperature 0.4 (the answers pass's own): A = the captured prompt exactly as the app sent it
(parent absent); B = the same prompt with the parent exchange restored by the BUILT
`withParentExchange` → `prepareTranscriptForWhatToAnswer` → `pinSettledQuestion` (flag on), the
outer message bytes untouched. Instrument calibration before any call: with the flag off the
rebuild reproduces every captured prompt of the run byte for byte. Grading: blind, both arms
shuffled per item under anonymous keys, `question` = `questionForGrader` (carries "[Follow-up to:
parent]"), Opus agents with the frozen grader prompt (stamp recorded), grader model recorded from
the transcripts. Decision over the 30 (item, rep) pairs, in this order: (1) wrong(B) > wrong(A) →
FAIL; (2) acceptable(B) − acceptable(A) ≥ +5 → PASS (the fix earns a pre-registered flight on a
non-holdout roster); (3) delta ≤ +1 → FAIL (the flag stays off; the diagnosis is re-examined); (4)
otherwise INCONCLUSIVE: one more replay of the same design on s50l is allowed after the quota
resets, and its result is read by the same rule pooled with this one. Budget: 60 requests on
3.1-lite plus retries; not started unless the day's ledger shows ≥ 100 headroom. Nothing here
touches holdout40.

## Note on the app's actual behaviour after fix round 1

`SessionTracker.addAssistantMessage(text, question)` now stores the PINNED question the answer
was generated for (`IntelligenceEngine` passes `settled`, the last `[INTERVIEWER]` line of the
transcript at answer time — not a raw STT fragment). This replay's arm B mirrors that: the
restored `history[0].questionContext` is the parent's own pinned/settled question (the last
`[INTERVIEWER]` line of the PARENT's captured block), not a raw fragment of what the interviewer
said. This is a deliberate deviation from a literal reading of "the parent's question" toward what
the fixed app actually now stores and would actually restore.

## Ids kept

All 10 named ids are kept — no drops. Checked against `pairAnswers()` over the s50m run's
`natively_debug.log` + `interview60.timeline.json`: every parent (S1Q04, S1Q05, S1Q06, S1Q07,
S1Q08, S2Q04, S2Q05, S2Q06, S2Q07, S2Q08) has exactly one delivered answer in that hour's log.

| follow-up id | parent id | parent answer present |
|---|---|---|
| S1Q04F | S1Q04 | yes (575 chars) |
| S1Q05F | S1Q05 | yes (562 chars) |
| S1Q06F | S1Q06 | yes (414 chars) |
| S1Q07F | S1Q07 | yes (761 chars) |
| S1Q08F | S1Q08 | yes (567 chars) |
| S2Q04F | S2Q04 | yes (607 chars) |
| S2Q05F | S2Q05 | yes (590 chars) |
| S2Q06F | S2Q06 | yes (505 chars) |
| S2Q07F | S2Q07 | yes (629 chars) |
| S2Q08F | S2Q08 | yes (629 chars) |

(S2Q08 answer length listed as 629 chars, matching the measured value; see
`SP\followup-replay-build.mjs` output for the authoritative per-id figures recorded at build
time.)

## Grader-prompt instrument stamp

`graderPromptVersion()` (from `electron/test/golden/interview60.judge.mjs`, hashing both
`interview60.grader-prompt.md` and the RUBRIC constant) at the time of this pre-registration:

```
8564ba96369a
```

## Quota check

`SP\quota-ledger.mjs` re-run 2026-09-26: gemini-3.1-flash-lite headroom = 500 − 314 = 186, which
is ≥ 100. Proceeding.

## Status

Written before any model call. This file's filesystem mtime is the pre-registration timestamp;
see the report for the recorded value. A copy is placed at
`SP\stage\electron\test\golden\passes\PREREGISTER-followup-replay.md` for the controller to commit
as `passes/PREREGISTER-followup-replay.md`.
