# Summary: the 3.8 Live router design after one day of probes (2026-10-01)

Four pre-registered spikes, each with its own result note in this folder: L38R (`2026-10-01-l38r-result.md`), L38F
(`2026-10-01-l38f-result.md`), L38P (`2026-10-01-l38p-result.md`), L38H (`2026-10-01-l38h-result.md`). Grades are
Opus 5.5, blind. "Easy" = a one-part factual question; "hard" = anything else. The design under study: bare 3.8 Live
answers easy questions in one line; it says "hard" otherwise; the pipeline always runs and replaces Live's line.

## 1. Routing, per run (the L38R routing prompt)

| run | time | easy: answered and right | easy: marked hard | easy: silent | hard: "hard" | hard: answered | Live first word, easy, p50 / p90 |
|---|---|---|---|---|---|---|---|
| L38R rep 1 | 15:05 | 12 of 12 | 0 | 0 | 9 of 10 | 1 (full answer) | 0.9 / 1.6 s |
| L38R rep 2 | 15:13 | 11 of 12 | 1 | 0 | 9 of 10 | 1 (recited its instructions) | 0.8 / 1.7 s |
| L38H rep 3 | 18:19 | 10 of 12 | 0 | 2 | 10 of 10 | 0 | 0.8 / 1.2 s |
| pooled | | 33 of 36 answered, all right | 1 | 2 | 28 of 30 | 2 | ≈ 0.85 s |

## 2. Follow-ups in the same session as their parent (L38F; a longer prompt saying Live never hears the candidate)

| item type | rep 1 | rep 2 | expected |
|---|---|---|---|
| easy parents | 6 of 6 right | 6 of 6 right | answer |
| follow-ups on the earlier QUESTION | 6 of 6 right | 6 of 6 right (p50 1.0 s) | answer |
| hard parents | 6 of 6 "hard" | 6 of 6 "hard" | hard |
| follow-ups on the candidate's earlier ANSWER | 4 hard, 1 silent, 1 full answer | 3 hard, 2 answered, 1 full answer | hard |
| real roster parents | 3 hard, 1 full answer | 3 hard, 1 garbled "hard" | hard |
| real roster follow-ups | 1 hard, 2 full answers, 1 garbled "hard" | 3 hard, 1 full answer | hard |

L38F's pre-registered bar 2 (answer-based follow-ups answered ≤ 1 of 6 per rep) FAILED in rep 2.

## 3. Failure shapes

| shape | count | caught by a 5-word cap | risk |
|---|---|---|---|
| a hard question answered in full | 2 of 30 (bare); 4 of 16 roster items (longer prompt) | yes | low with the cap |
| a follow-up about the candidate's answer answered | 4 of 12 | no ("O(1) constant time.") | high |
| an invented experience | 1 | yes | high without the cap |
| its own instructions voiced | 1 | yes | low with the cap |
| a garbled "hard" (markup) | 3 | needs a parser rule | low |
| an answer in Spanish | 1 | needs a language check | low |
| silent on an easy question | 2 of 36 | — | none (the pipeline answers) |
| an easy question marked hard | 1 of 36 | — | none |
| Google internal error / dropped session | L38F rep 2 one 1011 (+ one local drop); repeated on 3.1 Live this afternoon | — | the early line is lost, the answer still comes |

## 4. The hard path (L38H)

| model | answered | acceptable of 10 (both graders) | wrong | first token p50 / p90 |
|---|---|---|---|---|
| 3.5-lite HIGH | 10 of 10 | 4 (5 and 6 per grader) | 0 | 4.4 / 16.1 s (busy afternoon) |
| 3.8 Flash | 2 of 20 requests | not graded | — | 9.8 and 55 s |
| 3.7 Flash | 3 of 10 | not graded | — | 4.7, 10.1, 24.1 s |

## 5. Consistency on follow-ups about the earlier answer (L38P: the pipeline against its own earlier answer)

| when the follow-up comes | consistent | contradicts | invents |
|---|---|---|---|
| soon after the parent | 15 of 17 | 0 | 2 |
| after the 120 s window (roster timing) | 12 of 18 | 2 | 4 |
| 3.8 Live (never sees the answer) | guesses by construction | | |

## 6. What the composed design delivers

| | value |
|---|---|
| easy questions right (Live or fallback) | 12 of 12 (L38H); 33 of 33 of Live's own answers overall |
| time to first useful text, easy | ≈ 0.85 s (Live) vs ≈ 4.7 s (today's first cue) |
| time to first text, hard | ≈ 4.4 s offline + the 0.6 s gate (unchanged; Live adds no delay) |
| hard-question quality | the pipeline's own; Live never touches it |
| unsafe lines reaching the screen with only a 5-word cap | answers to answer-based follow-ups, ≈ 1 in 3 when one is asked |
| extra cost | none on the free tier; on a paid tier the Live session re-bills its whole context every turn |

## Same-question comparison as answerers (L20c, 2026-09-29/30, 38 scenario50 items, one blind batch)

| | 3.8 Live | 3.5-lite HIGH |
|---|---|---|
| acceptable rate | 0.57–0.68 (mean 0.62) | 0.66–0.80 (mean 0.75) |
| mains / follow-ups | 0.58 / 0.65 | 0.84 / 0.66 |
| first word after the question, p50 / p90 | 1.8 / 6.4 s | 6.1 / 14.3 s (in-app, with the gate) |

## Where it leaves the design

- Live earns a place only on one-part questions: right and ≈ 3.5 s faster; everything else stays on the pipeline.
- Required guards if built: a 5-word cap, a markup/language filter, never on a turn that points at the candidate or
  follows a pipeline answer within about 2 minutes; the pipeline always runs and replaces the line.
- The hole no cap closes: short answers to follow-ups about the earlier answer. The cheap text-call competitor
  (given the earlier question and the on-screen answer as text) closes it by construction.
- Next, after Friday's hour: the text-call spike against the Live router on the same items, rule written first;
  the full-Flash hard path needs the paid key or a quiet morning; the 3.8 Live ear trial is a separate item.
