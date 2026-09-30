# PREREGISTER — L20c: does 3.8 Live answer as correctly as the app's 3.5-flash-lite HIGH? (decides whether the racer is built)

Written 2026-09-29 ~21:00 local. At that point:
- no L20c audio had been played;
- no answer in this comparison had been graded;
- L20b's answers existed but had never been graded; only their mechanics had been read (58/60 answered, first word p50 2.3 s).

The rule below is not changed after the data exists.

Correction 20:57 (times only; no rule changed): the file was written at 20:53 local (file mtime), not "~21:00". The pre-flight probe started at 20:55:13.

## Why

- **The user's request:** on 2026-09-29 the user asked to compare 3.8 Live with the app's 3.5-lite HIGH on correctness, and to build the race mode only "if proved reliable". At ~20:55 they said "go ahead with tonight's live runs".
  - The race mode: 3.8 Live answers beside the text path, and the first real answer wins.
- **What L20b left open:** L20b was graded under its own rule (NOT REPLICATED on safety and speed), so its answers were never graded. Its comparator was 3.1-lite LOW.
- **The app's model today:** the app now answers with 3.5-flash-lite HIGH first. Under the hedge in h40c, it won 44 of 45 answers.
- **holdout40 is not used here.** It stays unused, to validate a finished racer.

## Items: 38, scenario50 S1+S2

- **Selection:** all 20 S1+S2 pairs minus the S1Q01 pair, giving 19 pairs and 38 items.
  - S1Q01 is out because the harness needs a captured s50k prompt, and s50k has none for it. s50m has no captured-high twins for it either.
- **10 pairs are L20's items,** answered by L20b r1–r3 on 2026-09-29 between 17:21 and 18:15.
- **9 pairs are new (L20c):** S1Q08, S1Q09, S1Q10, S2Q03, S2Q04, S2Q05, S2Q06, S2Q07, S2Q10, each with its follow-up.
- **Reporting groups:** hard = L20's 5 hard pairs (10 items); normal = the other 14 pairs (28 items).

## Live arm

- **Model:** `gemini-3.8-live`, with no thinkingConfig.
- **Harness:** `l20c/run.mjs` is `l20b/run.mjs` with ONLY the folder constant changed; `l20b/make-l20c.mjs` checks this line by line.
  - It is L20's harness including amendment 1: one transport retry per pair, and a failed setup counts as abnormal.
- **Runs:** L20c r1, r2, r3, sequential, tonight.
- **Combined reps:** Live rep N over the 38 items = L20b rN (20 items) ∪ L20c rN (18 items).
- **Extraction:** `et10/et-extract.mjs`, unchanged.
  - The answer is the first post-question turn of ≥ 25 words, or a system-error message.
  - Holding turns and premature output are dropped.
  - The app's filter chain is applied.
- **Pre-flight:** an ad-hoc health probe (`l20/health-probe.mjs` defaults) must answer 5/5 with no abnormal close.
  - If it does not, L20c does not run tonight, and that is the reading.
  - It does not count toward the scheduled 3-day gate.
  - `l20c/go.mjs` applies this check and runs nothing on a failure.

## Comparator: the app with 3.5-flash-lite HIGH first

- **s50m** (2026-09-22; 3.5-lite HIGH primary via the override) gives 4 samples on the same 38 items: in-app, captured-high, captured-high-r2 and captured-high-r3.
  - All 38 items are present, checked by `l20b/check-35-sources.mjs` and `check-complement.mjs`.
  - The captured-high-r2 answer to S2Q06 is empty, so it is an app hole.
  - Some in-app answers were served by the 3.1-lite stall fallback. They are labelled, not removed, because that is how the app ran.
- **br1** is tonight's app hour on today's build with the hedge on by default.
  - If it has flown before the batch is built, its in-app answers join the batch as an eighth arm, reported only.
  - It is not part of any condition.

## Grading

- **One blind batch:** 38 items × 7 arms (3 Live + 4 app), plus br1 if present.
  - Answers are in a seeded random order under keys `id#k`.
  - The key goes to `l20c-key/`, a folder no grader is pointed at.
- **Packets:** a seeded shuffle splits the 19 pairs into 4 packets of 5, 5, 5 and 4 pairs, so all of a question's answers go to the same graders.
- **Graders:**
  - each packet is graded by two fresh `claude-opus-5-5` graders, 8 agents in total;
  - the grader model is verified from each transcript's model field.
- **Rubric:** the frozen s50k rubric, verbatim from s50k's `interview60.judge.pairs.json`.
  - acceptable = correctness 2 && on_topic 2 && delivery ≥ 1.
  - consensus-wrong = both graders scored correctness 0.
- **Holes are not sent to graders.** A hole is a Live item with no answer after its retry, or the empty app twin answer.

## Scores

- A sample's rate = acceptable items, averaged over its two graders, divided by the items it answered.
- This is the racer read: in the racer the text answer covers a hole, so what matters is the quality of the answers Live does give.
- The holes-as-not-acceptable read, over all 38, is reported beside it.

## Decision rule (PROCEED needs all of 1–5)

1. **Quality:** mean Live rate over its 3 reps ≥ mean app rate over its 4 samples − 0.05.
2. **Band:** Live's worst rep rate ≥ the app's worst sample rate.
3. **Safety:** Live consensus-wrong ≤ 1 + ⌊app consensus-wrong × 0.75⌋.
   - The factor is 114 Live answers against 152 app answers, the same ratio as L20.
   - A spoken system-error apology is graded like any other answer.
4. **Reliability tonight:** L20c answers at least 52 of its 54 items after at most one transport retry per pair. That allows ≤ 2 holes, L20b's rate (2 of 60).
   - "Answered" means three things: the item played; its extracted answer is non-empty; and that answer is not a spoken system-error apology (`/system error/i`, the health probe's test).
   - An apology still goes to the graders (condition 3), and it is also a hole here.
   - `l20c/mechanics-l20c.mjs` computes this.
5. **Reliability across days:** the scheduled health gate passes: 5/5 with no 1011 at 04:30, 10:00 and 20:00 on 29 Sep, 30 Sep and 1 Oct.

**PROCEED** starts the racer's build path:
- throwaway spikes:
  - manual turn mode on 3.8 Live;
  - a 60-minute session;
  - two Live sessions at once on our key;
  - holding-line suppression;
- then a Fable spec, Opus review, a build with the flag off, and a smoke test;
- then its own pre-registered scenario50 flight;
- then a holdout40 validation flight.

Nothing ships on this result alone.

**STOP** if 1, 2 or 3 fails. Live's answers are not good enough to be shown first, so there is no racer. 3.8 Live stays an ear candidate only; reopening is the user's decision.

**WAIT** if 1–3 pass but 4 or 5 fails. Quality holds but reliability is unproven. Nothing is built, and a later reliability re-test needs its own registration.

## Reported outside the rule

- per-rep and per-sample rates, in both reads;
- the hard/normal split and the per-question table;
- Live first word p50/p90 per run, against the app's first token after the question ends on the same items (the `l20b/e2e-35.mjs` method);
- holding lines and premature starts;
- abnormal closes and retries;
- words;
- grader agreement;
- which in-app answers the fallback served;
- the br1 arm, if present.

## Not covered (residual risks)

- **L20's list:** TTS voice, one session per pair, no barge-in, no screenshots or coding-pad questions, one day's load.
- **Two windows:** the Live halves ran in different windows (17:21 and ~21:15), so each rep mixes them.
- **Build and prompt drift:**
  - the comparator's samples come from 2026-09-22's build;
  - Live's system instruction is the s50k capture from 2026-09-20;
  - prompt drift since then is not measured here.
- **Sensitivity:** 38 items detect only large differences. The 3.5 band spread was about 2 of 38 in s50l and s50m.
- **The racer itself is untested until the spikes:** manual turns, race arbitration, and filtering the system-error apology out of what is shown.
