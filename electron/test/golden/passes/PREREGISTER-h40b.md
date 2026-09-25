# Pre-registration: flight h40b (holdout40, second flight) — 2026-09-26 17:00 local

Written and committed before the hour ran. Not edited afterwards; the result goes in `h40b.md`.

## What the hour tests

One change against the h40a baseline (2026-09-24, `92d04a5`): commit `bb94db4` — `IntentClassifier`
no longer routes a question that merely contains "salary" to the negotiation coaching card, and a
question that carries a technical marker (sql, sequel, query, tables, …) is never a negotiation.
On h40a, R09 ("the SQL for the second highest salary in each department") was answered with the
coaching card. Everything else flies the shipped default: same roster (holdout40, 45 items), same
audio, same models (gemini-3.1-flash-lite LOW with the gemini-3.5-flash-lite fallback at HIGH),
same Deepgram + Live ears, same grader rubric (stamp 8564ba96369a). The launcher's guard proves the
build and the source carry the fix and that no model or thinking override reaches the app.

## Instrument

The interview60 flight harness, hands-free, from `holdout40.wav`, task `Natively-flight-h40b`,
then the standard arms and the judge, graded by Claude Opus agents with the grader model recorded
(`--model`, read from the agents' transcripts), pass record + INDEX committed together.

## The rule, fixed beforehand (the holdout protocol's rule for every flight after the baseline)

The hour PASSES only if all four hold:

1. **R09 is answered as a technical question** — an SQL answer, no coaching card, and the app's own
   log shows its intent classified as anything but negotiation. R09F (its follow-up) likewise. This
   is the change under test; without it nothing else matters.
2. **Live mains inside or above the in-app run's own twin band** — the acceptable count of the
   live in-app answers on the mains is not below the lower edge of the band the two captured-prompt
   twins (3.1-lite LOW, 3.5-lite HIGH) give on the same prompts, compared on the ids both hours
   captured.
3. **The quality-gate rows as `metrics.mjs` derives them for the roster's 33 gradeable mains** —
   the same rows h40a's pass record prints — are met.
4. **Zero wrong** among the live in-app answers.

A no-regression reading is reported beside the rule, not instead of it: h40a's in-app hour scored
39 of 45 acceptable; the paired-grading noise floor measured on this instrument is about ±4, so an
h40b count of 35 or more is "no regression", below 35 is a regression to explain.

## What a FAIL means

If (1) fails, `bb94db4` did not fix R09 as it flies — investigate the live path before any other
change. If (2)–(4) fail while (1) holds, the fix is not validated as shipped: no further flight
builds on it until the failing leg is understood; the fix is reverted or re-examined, never tuned
against this roster (holdout40 is never edited in response to a holdout number).

## Not covered (stated in advance)

- R09 sits in the roster the fix's tests were written against; the pass record must not count R09
  as generalisation evidence — the marker list's coverage of unseen phrasings is untested here.
- Confounds vs h40a are not controlled: the Live ear's share of detections and the 3.1-lite 503
  share of the hour; both are reported next to the in-app score.
- The capped full-Flash sidecar after the hour (3.8 / 3.7 / 3.6 / 3.5 on h40a's most-failed ids)
  is a separate, descriptive measurement with its own calibration; it has no pass rule.
