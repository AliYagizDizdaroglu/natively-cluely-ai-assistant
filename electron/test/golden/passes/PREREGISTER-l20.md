# PREREGISTER — L20: replication of gemini-3.8-live BARE as the answerer, 20 scenario50 items × 3 runs

Written 2026-09-28, before any L20 audio is played. The rule below is not changed after the data exists.

## Question

ET10b's live38 arm passed on one run of the 10 hardest items. Does that replicate across three independent runs, with 10 normal questions added? It has to replicate on three counts:
- quality at least as good as the app's, overall and on normal questions;
- no failures;
- a clearly faster start.

The user chose this replication (option 1) on 2026-09-28.

## Items (20, scenario50 only)

- **Hard 10:** the ET10 set, S1Q02, S1Q04, S1Q05, S1Q07, S2Q02, each with its follow-up.
- **Normal 10:** five pairs drawn by `pick-items.mjs` (seed 20260928) from the 14 eligible S1+S2 pairs: **S1Q03, S1Q06, S2Q01, S2Q08, S2Q09**, each with its follow-up.
  - S1Q01 is ineligible because s50k did not capture its prompt.

## Arm under test

- live38, run three times (r1, r2, r3), one after another. It is `gemini-3.8-live` with no thinkingConfig.
- The harness is `run.mjs`: ET10's harness after amendment 1, unchanged. That covers the system instruction (captured s50k system prompt + the pair's main CONTEXT + LIVE MODE), the real-time 16 kHz audio, and the wait.
- **One addition, a transport retry.**
  - When: a pair's session closes abnormally (code ≠ 1000) before every played item has a generationComplete after its question ended.
  - What happens: the pair is re-run ONCE in a fresh session.
  - Record: the failed attempt stays in the file, relabelled `<id>~a1`, and every drop and retry is reported.

## Answer text and TTFT

- `et10/et-extract.mjs`, unchanged.
- The answer starts at the first post-question turn of ≥ 25 words or a system-error message; otherwise the last turn is the answer. Holding turns and premature output are dropped. The app's filter chain is then applied.
- TTFT = the first word of the answer, minus the time the question's last audio chunk was sent.

## Comparator

s50k, 3.1-flash-lite LOW (the shipped config): in-app plus the three captured-low twins, i.e. 4 samples on the same 20 items. Computed by `app-baseline.mjs` before this file:

| Measure (after the question ends) | p50 | p90 |
|---|---|---|
| First answer token | 6812 ms | 9441 ms |
| Whole answer | 7261 ms | 9846 ms |

## Grading

- One blind batch of 140 answers: 20 items × 7 arms (4 app + 3 live38).
- Each item's 7 answers are in a seeded random order under keys `id#1..#7`. The key goes to `l20-key/key.json`, a folder no grader is pointed at.
- The batch is split into two packets of 5 pairs (10 items, 70 answers) by a seeded shuffle of the pairs.
- Each packet is graded by two independent claude-opus-5-5 graders (Agent tool, model opus), 4 agents in total. Every answer gets exactly two grades.
- The frozen s50k rubric is used verbatim.
- acceptable = correctness 2 && on_topic 2 && delivery ≥ 1.
- A **consensus-wrong** answer is one both graders scored correctness 0.

## Decision rule

A sample's score is the number of acceptable items, averaged over its two graders. ALL of the following must hold for **REPLICATED**:

1. **Quality, overall 20:** mean live38 score over the 3 runs ≥ mean app score over the 4 samples − 1.0.
2. **Quality, normal 10:** on the 10 normal items, mean live38 score ≥ mean app score − 1.0.
3. **Band:** live38's worst run (overall 20) ≥ the app's worst sample (overall 20).
4. **Safety:**
   - zero system-error, empty or no-answer items in all 60 live38 answers, after at most one transport retry per pair;
   - live38 consensus-wrong answers ≤ 1 + ⌊app consensus-wrong answers × 60/80⌋.
5. **Speed:** live38's real-answer TTFT pooled over its 60 answers: p50 ≤ 6812 ms AND p90 ≤ 9441 ms. Percentile = `a[min(n-1, floor(n·p))]`.

**If REPLICATED:** plan the in-app prototype, 3.8 Live as the answerer. Build it after h40c (MAIN is frozen until then) and fly it on its own pre-registered hour.

**Otherwise NOT REPLICATED:** no prototype. 3.8 Live stays a candidate ear only; its env-only hour after h40c stands.

## Reported outside the rule

- the per-run and per-sample scores (the live38 band against the app band);
- the hard/normal split and the per-question table;
- premature starts, i.e. speech before the question ended;
- abnormal disconnects and retries;
- the whole-answer time and the words;
- the graders' agreement.

## AMENDMENT 1

Written 2026-09-28 17:15. At that point no L20 answer had been graded or scored. This is a HARNESS fix; the decision rule above is unchanged.

**The runner defect.** A session that never finished setup did not take the promised retry. In r2, the S2Q09 pair's session was closed at setup: 1011 "The service is currently unavailable." The runner returned no `abnormal` flag for that path, so no retry ran, which is contrary to this file's transport-retry rule.

**Fixes:**
- **r2 S2Q09.** A failed setup now counts as an abnormal close, and `run.mjs --retry-pair` performs the owed retry. It is appended to `live38-r2.json` as attempt 2, logged `late: true`, about 10 minutes after the original. The retry mode refuses any pair not owed one; it was checked on three such cases.
- **r3.** r3 had played one question with the defective runner. It was stopped and restarted from scratch with the fixed runner. The stub is kept as `runs/aborted-r3-1.console.txt`; no run file was written.

**How missing answers are graded (implementation, not a rule change).**
- Covers a live38 item with no answer after its retry: either never played, or played with no text.
- Such an item is not sent to the graders.
- It is scored not acceptable and counts as a safety failure, as the "no-answer item" clause above says.

**Observed so far, recorded before any grading.** 1011 "Internal error encountered." closed the session:
- S2Q01: 2 of its 3 attempts;
- S2Q08: 4 of 4 attempts, with no output at all each time.

## Not covered (residual risks)

- **Stimulus:** a TTS voice, not a human.
- **Sessions:** one per pair, not a 60-minute session.
- **Interruptions:** no barge-in or backchannels.
- **Comparator:** from 2026-09-20.
- **Coverage:** no screenshots or coding-pad questions.
- **Load:** one day's Google load.
