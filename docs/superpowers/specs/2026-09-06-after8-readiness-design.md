# After8 readiness — answer quality and UI levers (design of record)

**Date:** 2026-09-06 · **Branch:** `fix/coding-style-suffix-all-gemini` · **Baseline:** after7 flight (run dir `electron/test/golden/interview60.runs/2026-09-06T08-14-21-after7/`, report of record de5bc37)

This spec records what was prototyped and measured today, in the order the user asked for it ("spike and prototype before we spec, make the app ready for the next flight pass"), and defines the after8 flight that proves it. Every lever below is already implemented and unit-tested on the branch; the flight is the proof against the original symptoms.

## 1. Where after7 left us

Quality row 47 acceptable / 7 weak / 0 wrong of 54; 2 doubles; lengths flat at 87/89/90 words by level with 42 of 57 over 80; delivery-2 marks 32 (after6: 36). The six weak answers decomposed (spike, seven uncut arms of gemini-3.1-flash-lite on the 52 questions, Opus-judged):

| class | items | evidence |
|---|---|---|
| pipeline: head answered, fuller sentence dropped | W10, M27 | replay of after5–7 |
| pipeline: context bleed | M21 | acceptable in all 7 arms |
| knowledge gaps prep notes fix | M14, H09 (+ M08 recurrent) | notes arm 51/52, gaps all acceptable |
| variance | H07 | noise floor ±3 across identical arms |

Length inflation is the Context toggle's knowledge prompt (p50 100 words vs 61 with the verbal prompt on the same transcript); it drops the verbal prompt's counted budget. A separate bug found today: the overlay never showed hands-free answers because intelligence events were routed by window mode to the hidden launcher.

## 2. Levers (all on the branch)

| # | lever | change | evidence | commit |
|---|---|---|---|---|
| 1 | Overlay routing | `pickIntelligenceSurface`: intelligence events go to the overlay while a meeting is active, regardless of window mode | before: overlay DOM held only the question 40 s after two streamed answers; after: answer bubble in 9 s with the mode still `launcher`; user confirmed live | 8d9770f |
| 2 | Custom notes reach hands-free answers | `userContextBlock` appended in `streamChat` (after knowledge/mode injection) and `streamVerbalWithGeminiFlash`; log line `<user_context> appended (N chars)` | spike: notes arm 46→51/52; live: both chain-test answers logged the append with the user's 2285-char notes (the pasted JD) | 1aa461f |
| 3 | Spoken budget under the Context toggle | `keepSpokenBudget` re-appends `SPOKEN_LENGTH_AND_DEPTH` when the knowledge prompt replaces a caller that carried it | spike: knowledge prompt p50 100 → with the block p50 57, 0 over 80, 51/52 acceptable, résumé grounding kept (14/52 answers reference it vs 5/52 under the verbal prompt) | 1aa461f |
| 4 | Answered questions stay deduped 60 s | `ChipDeduper.answeredWindowMs` 60 000 with a four-content-word floor past 20 s | replay after5–7: exactly the two after7 doubles removed, the one false suppression (after5 W02→W03) blocked by the floor | pending |
| 5 | Extend on an added clause | `shouldExtend` (contains + ≥ 3 added words, ≤ 30 s) → `dispatch: extend`, second answer for the fuller sentence, `ChipDeduper.extend()` | replay 180 answers: 21 firings, 5 rescue a weak/wrong head, 16 answer a second clause the interviewer asked | pending |

Harness: `dispatch: extend` parsed (one surface, `extendsTotal` on the surfaced row, not a double); the judge export appends an extension's answer to its head pair. After7 gate re-run unchanged (2 doubles, 0 extended).

Not done, deliberately: a Paste-JD entry into the JD engine (user chose the notes box); the launcher's `ready-to-show` switching to launcher mid-meeting (stealth, not answers); the real-CV/JD context spike (quota; needs the app's data via a scheduled task); cue mode.

## 3. After8 flight — what is measured

Preconditions: 3.1-flash-lite quota reset (07:00 UTC); Context toggle **ON** with the refreshed CV uploaded (lever 3 is exercised only then); the JD pasted in the notes box; Live 3.1 auto; Deepgram ear; launched from a scheduled task (real AppData).

1. Quality row: ≥ 47 acceptable, 0 wrong (after7 47/7/0), per-question diff on W10, M14, M21, M27, H07, H09.
2. Doubles: 0 (after7: 2); false suppressions 0.
3. Extends: count, and the verdict of each extended item; the head-then-whole class (W10, M27) answered on the fuller sentence.
4. Length with Context ON: p50 60–70 words uncut, 0 cut under 80, delivery-2 ≥ 45 of 52, level shape not flat (after7 89 / 42 over 80 / 32).
5. Context reaching answers: `<user_context> appended` on every hands-free answer; no invented experience.
6. Primary model: 0 fallbacks to 3.5; Live on 3.1.
7. Pipeline health: STT closes ≤ 5, lost utterances 0 under the 5-s resolution rule, fragment chips 0, first-character loss 0, pinned = dispatched.
8. Latency: TTFT p90 ≤ 3 s, detect p50 ≈ 1.4 s (the notes block adds ~2.3k chars of prompt).
9. Overlay rendering: DevTools probe at the start of the hour asserts the first answers are in the overlay DOM.
10. Coverage: ≥ 51 of 52 heard.
11. Chain questions: the verbal chains pass (`interview60.chains.mjs`, 5 chains) stays green; coding chains (3–5 on-screen problems, each followed by "explain / complexity / edge cases" questions) need a harness addition — on-screen problem display plus follow-up clips and a chain rubric — and are measured from the flight after they exist.

Report-time rules: the rubric's delivery band (40–80 words) stays; extends appear in the judge pairs as head + extension.

## 4. Residual risks

Extends add ≈ 7 answers per hour (quota, latency) and a second bubble under an already-answered question; the 60-s answered window can suppress a genuinely repeated question inside a minute (the interviewer re-asking verbatim); the notes block is unbounded text in every prompt (the box caps at 4000 chars); the harness lost-utterance metric still needs the 5-s resolution rule before row 7 can pass.
