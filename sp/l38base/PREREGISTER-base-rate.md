# Pre-registration: the easy-question base rate (router agenda item 1)

Written 2026-10-01 20:1x local, before any item is classified. Descriptive: it produces a count, not a verdict; the
go/no-go on the router is the user's call with the count in hand (agreed 20:0x: no threshold).

## Question

Of the questions a non-holdout interview hour asks, how many are "easy" in the sense the Live router was tested on
(L38R / L38H: bare 3.8 Live answers them right in one line at ≈ 0.85 s)? holdout40 is never read.

## Sets

- `scenario50.questions.mjs` SPOKEN: 100 items (50 mains + 50 follow-ups, ids S1Q01…S5Q10F). Two scenarios ≈ 68 min.
- `interview60.questions.mjs` SPOKEN: 76 items, 92 min. Its own `level` labels ("easy" = the roster author's warm-up
  tier) are NOT the definition below and are hidden from the graders.
- Follow-ups are classified on their own text with the parent's text shown, as the router hears it (same session).

## Definition (fixed here; the graders get it verbatim)

EASY = all of:
1. one part: a single thing is asked (no "and", no list of sub-questions, no "what … and why");
2. the correct answer is one fact statable in ≤ 5 words: a term, a number, a yes/no, a name, a choice between two
   named options ("Batch or online?" → "Batch");
3. it stands alone: it does not depend on what the candidate said or did ("your approach", "that call", "how long did
   it take you", "why did you choose") and does not ask about the candidate's experience or CV;
4. it asks for no explanation, justification, design, comparison of trade-offs, walkthrough, or code ("why", "how
   would you", "walk me through", "design", "compare", "explain" → HARD, unless the sentence still reduces to naming
   one thing).
Everything else is HARD. When in doubt, HARD (the router's cost of a wrong EASY is an unsafe line on screen; the cost
of a wrong HARD is nothing).

## Procedure

1. `extract.mjs` writes `items.json` (id, text, parent text for follow-ups, set) and a blind file `blind/blind.json`
   (anonymous keys, shuffled, no ids, no set, no level), key in `keyhold/key.json`.
2. Two Opus agents (`claude-opus-5-5`, verified from each transcript) classify the blind file independently, EASY /
   HARD per key with a ≤ 12-word reason. They return text; it is saved verbatim as `blind/verdicts.g1.json` / `.g2.json`.
3. `read.mjs` unblinds and reports, per set and per level (main / follow-up): EASY by grader 1, by grader 2, by BOTH,
   by EITHER; agreement; and the per-hour figure = BOTH-easy × (items per hour / items in set). Items where the
   graders disagree are listed with both reasons.
4. The number reported as the base rate is BOTH-easy (the conservative one); EITHER is reported beside.

## My expectation, recorded before the data

scenario50 mains: 2–6 of 50 (median 40 words, imperative heads). scenario50 follow-ups: 8–15 of 50. interview60:
15–25 of 76 (short definitional warm-ups, but many are "what is X and why"). Overall 10–20%; per 68-min hour on
scenario50 about 4–8 items.

## Not covered

What a real interviewer asks (both sets are authored rosters); whether Live would actually answer every item the
graders call EASY (L38R/L38H measured 18 self-written items, not these); typed questions.
