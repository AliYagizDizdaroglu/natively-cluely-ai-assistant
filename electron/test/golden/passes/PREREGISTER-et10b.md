# PREREGISTER — ET10b: Extended Thinking at MEDIUM, and gemini-3.8-live bare, on the same 10 items

Written 2026-09-27, before any ET10b audio is played. The rule below is not changed after the data exists.

## Question

The user asked for "the same test with medium on extended thinking and live 3.8 bare". Two new candidates are tested:
- `gemini-3.8-live-extended-thinking` at thinkingLevel **medium**;
- `gemini-3.8-live` **bare**: the plain Live model answering on its own, with no thinkingConfig, since that model takes none.

## Unchanged from PREREGISTER-et10.md and its amendment 1

- **Items:** the same 10 (S1Q02, S1Q02F, S1Q04, S1Q04F, S1Q05, S1Q05F, S1Q07, S1Q07F, S2Q02, S2Q02F).
- **Harness:** `et-run.mjs`, one Live session per pair, the amendment-1 wait. The system instruction and the audio are unchanged.
- **Answer text and TTFT:** `et-extract.mjs`, the amendment-1 definitions, then the app's filter chain.
- **App comparator:** s50k in-app plus captured-low twins 1–3. The app's TTFT median on these items is 7472 ms.

## Grading: a NEW blind batch

- The batch holds 80 answers = 10 items × 8 arms:
  - app-inapp, app-twin1, app-twin2, app-twin3;
  - et-low, et-high (the ET10 answers, unchanged);
  - et-medium, live38.
- Each item's 8 answers are in a seeded random order under keys `id#1..#8`. The key goes to `et10-key/key2.json`.
- Two NEW independent graders, each claude-opus-5-5 (Agent tool, model opus), grade all 80 answers with the frozen rubric verbatim.
- et-low and et-high are re-graded here for context only. **The ET10 verdict (NOT VIABLE) is final and is not revisited by this batch.**

## Decision rule

The rule is applied to **et-medium** and to **live38**, each on its own, against this batch's grades. ALL three conditions must hold for "worth an in-app prototype on its own pre-registered hour":
1. **Quality:** mean acceptable over the two graders ≥ the best app arm's mean in this batch.
2. **Safety:** zero wrong by either grader, and zero system-error or empty answers.
3. **Speed:** real-answer TTFT median ≤ 7472 ms.

Otherwise that arm is NOT VIABLE.

## Reported outside the rule

- this batch's grades for et-low and et-high, next to their ET10 grades, as a measure of grader-to-grader noise;
- the holding lines, the last word, words and thought tokens;
- premature output: speech before the question ended. live38 has proactive audio always on.

## Not covered (residual risks)

- These are the same as ET10: one rep per arm, a TTS voice, per-pair sessions, no barge-in, and a comparator from 2026-09-20.
- The medium and live38 runs are made in a different window from the ET10 runs, so Google's load differs. The TTFT and system-error comparisons ACROSS the ET10 and ET10b windows are therefore confounded by time of day.
