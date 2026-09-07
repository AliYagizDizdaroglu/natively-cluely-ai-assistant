# After9 — the after8 findings fixed, and what proves them (design of record)

**Date:** 2026-09-07 · **Branch:** `fix/coding-style-suffix-all-gemini` · **Baseline:** after8 flight (run dir `electron/test/golden/interview60.runs/2026-09-07T08-14-12-after8/`, report of record 9b577e5)

## 1. After8 in one line

46 acceptable / 5 weak / 1 "wrong" of 52 spoken (the wrong is the H02 head superseded by its own double); W10, M27, H07, H09 recovered from after7; W08 never answered; H02 doubled; six extends all correct but 104–114 words; the three screenshot cues answered from the transcript.

## 2. Fixes (all on the branch, each with a failing test first)

| # | finding | root cause (evidence) | fix | proof so far | commit |
|---|---|---|---|---|---|
| 1 | W08 never answered | `findSimilar` checked `sameAnchor` first; it counts frame words ("what is the difference between…" overlap 0.75); the 60-s answered window kept W07 alive past the 20 s the anchor rule was designed for. The replay behind that window never modelled the anchor rule. | anchor rule only inside `windowMs` | replay of the real `ChipDeduper` over after5–after8 dispatch sequences (unpatched code reproduces after8 with 0 mismatches): lost questions 3/1/1/1 → 0/0/0/0, after7's M04/M27 doubles stay removed | 3b82953 |
| 2 | H02 doubled | Deepgram's merged head "has p 99 latency creeping up. How…" vs Live's "…has P99 latency creeping up, how…": containment and the extend rule both missed (number spacing, inner punctuation) | shared `normalizeForContainment` (containment.ts: lower-case, "p 99"→"p99", punctuation dropped) for the deduper and `shouldExtend` | same replay: after8 H02 → head + extension; extends per hour 7–9 | 3b82953 |
| 3 | extensions restate the head | the extend re-ran the full question under the default answer shape | `extendOf` option → `extensionAnswerShape(head)` ("say only what the added part asks, under 30 words") | spike on after8's six extends, 3 reps: p50 58 → 27 words, every extension on the added clause | this commit |
| 4 | cues answered from the transcript | cues were operator-only (nothing on screen, no capture) | harness shows the problem page during the cue (`interview60.cues.mjs`, `cue-display.cjs`); app captures the screen on a screen reference (`screenReference.ts`, `answerDetection`) and answers on the coding path with the image; judge export carries the on-screen problem | dev-app spike: injection → capture → coding route with 1 image → answer, mechanically; the page itself was not captured because another application ran fullscreen on the primary display | this commit |

Not changed, recorded: H10's "Yes" answer came from Deepgram dropping the first word ("How"); Live had it 2 s later with only one added word, below the extend rule's three — a first-word-loss lever, not a dedup one. H06 is model variance (the 3.1 arm made the same S3 mistake). H08 misread "image" as a photo; the transcript is ML-heavy and the JD sits in the notes box — watch, not fix.

## 3. What one-by-one testing proves, and what only a flight proves

- Fixes 1–2 are deterministic rules. The unit tests pin the field texts; the replay runs the real class over every recorded hour we have (four flights, ~420 detections). That is as strong as offline evidence gets — and it is exactly the kind of evidence that missed W08 the first time, because the replay did not model the rule that fired. Rule of record: the replay drives the REAL class, never a re-implementation.
- Fix 3 changes model output: the spike is six questions × three reps; the noise floor across identical arms is ±3 acceptable of 52. Only the hour shows the combined head + extension under the judge's delivery band, and whether shorter extensions cost correctness.
- Fix 4 is an end-to-end path (display → capture → vision model → judge). The spike proves the mechanics; only a flight with a free desktop proves the answers.
- Every fix changes what happens to the NEXT question (an extension is an extra answer; a capture takes ~1 s and hides the windows; a shorter window changes suppression). One-by-one tests cannot show that; the hour's roster adjacency can.

So: one-by-one tests are the gate to run the flight, not a substitute for it.

## 4. After9 flight — expected rows

Preconditions: quota reset (07:00 UTC); Context ON, JD in the notes box; Live 3.1 auto; Deepgram; scheduled task with `-WorkingDirectory` set; **a free desktop on the primary display** (no fullscreen application; the cue page is shown there).

1. Quality ≥ 47 acceptable, 0 wrong of 52 spoken; W08 answered; H02 head + extension, no double.
2. Doubles 0 (M11-style Live inventions are counted "to nobody", not doubles); lost questions 0.
3. Extends 7–9, each ≤ 35 words, delivery 2 on most extended items (after8: 0 of 6).
4. Length p50 55–65, 0 cut, delivery-2 ≥ 45 of 52.
5. Cues: 3 captures logged (`[Main] screen reference: captured`), 3 CODING routes with 1 image, judge correctness 2 on ≥ 2 of 3 against the on-screen problem (after8: 0 of 3).
6. Everything else as after8: notes on every answer, 0 fallbacks, STT 0/0/0, TTFT p90 ≤ 3 s, heard ≥ 51, chains pass.
