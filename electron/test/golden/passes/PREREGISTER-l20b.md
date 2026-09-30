# PREREGISTER — L20b: the L20 replication of gemini-3.8-live BARE, re-run on a day the service probes healthy

Written 2026-09-29 ~17:25 local, before any L20b audio is played and before the result of this
afternoon's ad-hoc health probe was read. The rule below is not changed after the data exists.

Correction 17:18 (times only, no rule changed): the machine clock read ~17:15 when this file was
written, not 17:25; the ad-hoc probe started ~17:16 (its console file is named `...-1725` by mistake).
When this note was added, the probe's console showed only its first item (S1Q02 answered).

## Why a re-run, and why now

- L20 (2026-09-28 16:34–17:30 local, `l20/PREREGISTER-l20.md` + amendment 1) was NOT REPLICATED on
  arithmetic alone: 25 of 60 answers missing, pooled first-word p50 16.8 s. Every drop was a Google-side
  1011 "Internal error encountered." close, escalating through the hour (4/12, 4/12, 18/19 sessions), while
  Google's plain text models answered 503 "high demand" to 13/13 calls in the same window.
- The scheduled health gate (`Natively-probe-live38`) answered 5/5 with no 1011 at 04:30 and 10:00 today,
  S2Q08 included (0/13 on the 28th).
- The user asked on 2026-09-29 ~17:20 ("meanwhile on parallel can we probe and test 3.8 live?") to test now.
  This runs AHEAD of the agreed gate (5/5 on 3 different days, earliest Thu 1 Oct; today is day 1).
- Question: on a day the service probes healthy, does live38 bare meet L20's bar?

## Pre-flight (decides whether L20b runs at all)

The ad-hoc health probe started at ~17:25 local (`l20/health-probe.mjs`, default ids S1Q02, S2Q08, S2Q01,
S1Q06, S1Q04, compression on; output `l20/health/adhoc-2026-09-29-1725.console.txt` + its json) must answer
5/5 with no abnormal close. Otherwise L20b is not run today, and that is reported as today's reading.
This ad-hoc probe does NOT count toward the scheduled 3-day gate, whatever its result.

## Design: L20's, unchanged

- Items, arm, harness, answer extraction, TTFT, comparator, grading design and the five-condition
  decision rule are exactly `l20/PREREGISTER-l20.md` §Items to §Decision rule, with amendment 1's
  harness fixes. Referenced, not restated, so they cannot drift:
  - 20 items (`items.json`, byte-identical copy); live38 = `gemini-3.8-live`, no thinkingConfig; runs
    r1, r2, r3, one after another; one transport retry per pair (a failed setup counts as abnormal).
  - Harness `l20b/run.mjs` = `l20/run.mjs` with ONLY the folder constant changed (checked line by line by
    `l20/make-l20b.mjs`; `mechanics.mjs` and `drops.mjs` likewise). Extraction: `et10/et-extract.mjs`.
  - Comparator: s50k 3.1-flash-lite LOW, 4 samples, first-answer-token p50 6812 ms / p90 9441 ms.
- Grading: one blind batch of 140 (20 items x 7 arms: the same 4 app samples + L20b's 3 runs), seeded
  order, key kept away from graders, two packets of 5 pairs, each graded by two FRESH claude-opus-5-5
  graders (4 agents; the grader model verified from each transcript), the frozen s50k rubric verbatim,
  acceptable = correctness 2 && on_topic 2 && delivery >= 1. The app samples are regraded inside this
  batch, so the comparison is within one batch (the ET10/ET10b batches showed batch-to-batch drift).
- Order of evaluation, as on the 28th: conditions 4 (safety) and 5 (speed) are computed from the runs
  first. If either fails, the verdict is NOT REPLICATED and nothing is graded. Grading happens only if
  both pass.

## Consequence (fixed now)

- **REPLICATED:** live38 bare CAN meet the bar on a healthy day. With L20 it also says reliability varies
  by day, so this alone does NOT license the in-app prototype. The prototype plan starts only if the
  scheduled 3-day health gate also passes (earliest Thu 1 Oct), and any design keeps our text path
  running as an always-on fallback (the L20 lesson).
- **NOT REPLICATED:** live38-as-answerer stays parked; the scheduled probes continue for the ear
  question; reopening it is the user's decision.

## Reported outside the rule

L20's list (per-run and per-sample scores, hard/normal split, per-question table, premature starts,
abnormal disconnects and retries, whole-answer time, words, grader agreement), plus: S2Q08's result
against its 0/13 on the 28th, and the per-run first-word distribution beside L20's (1.7 / 9.8 / 37 s).

## Not covered (residual risks)

L20's list, plus: running right after a clean probe SELECTS a healthy window — L20b measures capability
on a good afternoon, not stability across days; the 3-day gate is what speaks to stability.
