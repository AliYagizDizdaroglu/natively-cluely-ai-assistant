# Changes in revision 2 of `2026-10-01-turn-memory-design`

Every finding of `REVIEW.md` (Opus, 2026-10-01), how revision 2 (`2026-10-01-turn-memory-design.r2.md`,
"r2") answers it, and what the prototype showed. Revision 1 is unchanged. All scripts and outputs are under
`r2/`; `r2/run-r2.mjs` re-runs them. Read-only on every repo; no vitest, tsc, build, npm, model or API call.
Everything the previous attempt left in `r2/` was re-run or replaced; nothing from it is relied on.

## Method

1. The reviewer's scripts were re-run unchanged (`r2/run-review.mjs` → `r2/out-review-*.txt`). Every number
   in the review reproduced: the C1 calibration table, S2Q05F at 3700 against 2372, the crafted C loss, the
   crafted-e revive of a restating statement, s50e 0.53/0.58, s50g 0.47/0.63, the p5 margin 0.51, 16 revives
   and 17 absorptions, the legacy R2 read.
2. The r2 machine is `r2/proto-r2.ts`, built on the reviewer's `proto.ts` (a verbatim copy of
   `interviewerTurn.ts` plus the r1 branches); `r2/replay-r2.mjs` extends `replay-proto.mjs`;
   `r2/rows-r2.mjs`, `calib-r2.mjs`, `crafted-r2.mjs`, `quote-metrics.mjs`, `echo-pairs.mjs`,
   `mark-vs-finals.mjs`, `absorbed-table.mjs`, `legacy-r2.mjs`, `traces.mjs` read it. Three fixtures were
   built with the committed builder (`r2/build-fx.mjs`): the 05:00 re-smoke, s50e, s50g; s50c per item
   (`r2/peritem-s50c.mjs`).
3. The judgement's form was derived on non-holdout hours only (s50b–s50m, br1, the three cue smokes);
   holdout40 was not read by any r2 script.

## New evidence used (the coordinator's message)

The 05:00 re-smoke (`2026-10-01T02-37-41-cuesmoke`, passed) holds two real declines followed by the real
question: S1Q07F's lead-in ("A nightly job fails halfway through.", `classify finals=1` 02:26:46.499, closed
47.752, answered from Live's text at 52.576) and S1Q08F's fragment ("How could repeatedly", 02:30:40.704,
closed 41.589, answered headless at 43.805). s50j holds the same two items declined the same way. Both are
now fixtures (`r2/fx-cuesmoke2-off.json`, offset 608 ms, spread 37 ms), rows (R16), crafted cases (S-11,
S-12) and traces (`r2/out-trace-cuesmoke2-*.txt`). Under r2 both yield exactly one answer from their own
finals, the lead-in joined, the fragment whole, under both substitution policies (r2 §6.4, Appendix A).
Case 1 turned out to be the I3 shape (the question's final landed during the classify call), not a decline
followed by a rejoin; S-12 plays the decline-first variant with the same texts.

## Critical

| id | finding | what changed | where |
|---|---|---|---|
| C1 | R1 cannot pass as written; the 100 ms rule ignores the app's VAD, pre-roll audio and timer races; the rule contradicts itself on what an R1 failure means | Calibration is redefined as five reads per fixture (R1a–R1e), each measured on all 12 fixture runs: 0 unmatched replay classifies; every never-matched recorded classify categorised (pre-roll, race, not-quiet) with nothing unexplained; 21 of 21 closes within 100 ms; 0 source mismatches; every first-dispatch delta over 100 ms carries one of four named signals (VAD offset, app-held, a blip, an app timer stall). Timer races within 50 ms are ordered by the log's own `turn: classify`/`gate=` footprints; 50 ms is about twice the measured gate-timer lateness p90 (24 ms; p99 208; n=326, never early). A fixed rule in either direction mis-orders a real race (two s50j cases, named). Per-item offsets for s50c (40 of 40 own). Which fixtures are calibrated (11) and which illustrative (s50c single-offset) is stated. An inadmissible fixture drops its own rows; a headline fixture inadmissible → INCONCLUSIVE, not FAIL. The two unexplained misses of the review (the cue smoke S1Q08F −1987, s50j S2Q09 −1038) are both app timer stalls: the dispatch rode on the next Live mark 2 ms later, about 2 s after the settle; the final handler does re-arm (`main.ts:1230`), so the cause is unlogged and named as pre-existing | r2 §6.1.4–5, §6.2, §7 R1; `r2/out-calib-r2-j50.txt`, `out-calib-r2-j0.txt`, `out-timer-lateness.txt`, `out-peritem-s50c.txt`, `out-trace-cuesmoke-S1Q08F.txt`, `out-trace-s50j-S2Q09.txt` |
| C2 | R6 fails on s50d S2Q05F by construction: the budget ignores the unfinished hold | The budget carries the unfinished hold when the dispatched text does not read finished, and the settle after the last final the dispatched text holds (needed by the re-smoke's S1Q08F, whose second final came 3.1 s after the voice-off); R6 also requires faster than the calibration latency. S2Q05F reads 3700 against 4200 (today 5972); S1Q08F 3490 against 3590 (today 4290). The review's first option was taken, plus the "faster than today" assertion from its second | r2 §6.1.6, §7 R6; `r2/out-rows-r2.txt` |
| C3 | "replace" drops finals that rejoined a declined turn; a short question after a statement is lost; the 4-word floor turns "unscorable" into "does not quote" | The design: a non-fitting positive **splits** the declined turn at the verdict's boundary — the judged text closes, the unjudged tail becomes the fresh turn the positive marks (today's behaviour, close delayed). A whisper positive with no tail is ignored (a fresh turn would be empty); a Live positive with no tail is today's Live-only rescue. Evidence under 4 content words is "unscorable" and gets the reverse rule (the declined text's own words in the evidence), which is what makes the re-smoke's fragment whole. Walked through the prototype: S-6 answers "So why would you use Kafka here?" alone at the gate as today; S-6L, S-1, S-1L, S-13, S-16 pin the other branches; S-11 the fragment. On the 12 fixture runs no non-fitting positive meets a declined turn (0 splits, 0 ignores), so these branches rest on crafted fixtures, and r2 says so | r2 §3.1, §3.3, §6.7, Appendix B.1; `r2/out-crafted-r2.txt` |

## Important

| id | finding | what changed | where |
|---|---|---|---|
| I1 | the echo guard absorbs an open follow-up's on-time claim (s50g); the s50e example was wrong; 1 of 505 on-time claims absorbed | The test is changed, not the story. One judgement with three ways for the open turn to win: the residual (the evidence's words beyond the remembered text are in the finals: s50g 7 of 7), the outright score (≥ 0.5 and strictly above the memory: br1 S2Q04F 0.58 > 0.50, which the residual alone would have absorbed), and the reverse rule for unscorable evidence. Measured: 0 of 523 on-time claims wrongly absorbed (r1's rule: 1); s50i's contamination claim still absorbed (0.68 against 0.14, residual 3 of 12). The s50e row is corrected: its claim is absorbed as the parent's echo with the right outcome. s50e and s50g are fixtures; S-7 and S-7D pin the shape | r2 §3.2, §3.4, §6.2; `r2/out-quote-metrics.txt`, `out-absorbed-table.txt`, `out-trace-s50g-S2Q01F.txt`, `out-trace-s50e-S2Q01F.txt`, `out-trace-br1-S2Q04F.txt` |
| I2 | a restating statement is revived by a stale re-fire; whisper positives are not echo-tested; ties go to the open turn | Every positive from either ear is judged against the memory first; a tie goes to the memory (the outright clause requires strictly greater; the residual of a verbatim re-fire is empty). S-8 pins both ears; S-8b pins the honest case (the re-armed classify saying "question" on statement + question answers it) | r2 §3.2 step 4, §3.4, §6.7 S-8/S-8b, U14/U15 |
| I3 | a stale-finals verdict without a re-arm leaves a turn nothing resolves; B.2's symmetry is illusory | A final on any undetected turn after its classify was asked re-arms it, declined or not; the cost statement is corrected (no call on a "yes", one on a "no"). S-9 and U7b pin it. On the fixtures the stale-finals path fires 5 times (the re-smoke 1, s50i 2, s50j 2) and every one is re-armed | r2 §3.3 (first two rows), §9; `r2/out-rows-r2.txt` verdict outcomes |
| I4 | `outcome=` before `question=` breaks `metrics.mjs`, flag-off too | Every new field goes after `question=`; the five consumers are listed and checked with the reviewer's regex script (`outcomeLast` row); the new `absorb` action matches no consumer's alternation | r2 §3.8; `r2/out-review-regex-check.txt` |
| I5 | the harness must pass the dedup anchor | It does, as `turnDispatchInput` does (`turnDispatch.ts:17`); s50a/after9 re-checked with it | r2 §6.1.3; `r2/out-legacy-r2.txt` |
| I6 | R11 cannot detect the failure it exists to catch | Attribution by time first (a claim ≤ 10 s after the last clip end belongs to that clip's item), text only for late claims; the row asserts the claim's item was already answered; `echoOf` is informational. Read on all 22 absorptions | r2 §7 R11; `r2/out-absorbed-table.txt` |
| I7 | `QUOTE_MIN`'s provenance rests partly on holdout data and one side of the distribution | The h40c argument and the "0 of 20" base are gone. The metric is chosen on directionality and compared with Jaccard and containment on the non-holdout positive class (22 true echoes: overlap min 0.57; Jaccard 2 under 0.70; containment misses 13); the negative class (16 rescues: max 0.21; 523 on-time claims: 0 absorbed) is stated beside it. The threshold is not tuned; it is the reconciler's MATCH, and the margins (0.07 on the echo side, 0.29 on the rescue side) are reported. The test's form changed (I1), not the story | r2 §3.2 (measured table, constants, "why not"); `r2/out-echo-pairs.txt`, `out-quote-metrics.txt`, `out-mark-vs-finals.txt` |
| I8 | part 3 misses the client-throw path; the detectNow test file exists | `runDetection`'s catch returns `'unknown'` (threw); the file is listed as changed, lines 39 and 44 go red first | r2 §3.5, §4.3, §6.3 |
| I9 | a negative verdict on a marked turn is unspecified | `ignored why=marked`; S-10 and U9b pin it; it fires once on the fixtures (s50i S2Q09 under `unknown` substitution) | r2 §3.3, §5 E4; `r2/out-trace-s50i-S2Q09.txt` |
| I10 | the change pushes against the parked small-talk concern; the flip gate is missing; the smoke exercises no revive | The directional risk is named in §3.7. The default flip is gated on a new non-holdout recording with nine scripted shapes (statements, a restating statement, a short question after a statement, an inlining follow-up, the two re-smoke shapes, small talk, an STT gap), flown flag-off then flag-on with a pre-registered rule: statements and small talk answered (on) ≤ (off) item by item, every scripted question once from its finals within budget, 0 doubles, every absorb/revive its own item. The smoke's inability to exercise declines on purpose is stated (0, 0, 2 declines in its three runs); the env-hook alternative is left to the user (decision 18) with a recommendation against | r2 §3.7, §8, Appendix C 5–6, 18 |

## Minor

| id | finding | what changed |
|---|---|---|
| 1 | pairing edge cases; E10 has no exemption for a meeting ending with a classify in flight or pre-roll asks | Post-fix logs get a `[QD-timing] detectNow issued` line, so pairing is exact; pre-fix pairing records `coalesced` lines as `pairing: 'ambiguous'` (2 cases) and a wait over 3 s as `no-call` (1 case), both printed; an ambiguity can change `raw` only in an hour with null results, and s50d has none. E10 exempts pre-roll and post-roll asks (`resolution`). r2 §3.5, §5 E10–E11, §6.1.1; `r2/out-pairing.txt` |
| 2 | the window margin mixes frames | Re-measured in the verdict frame: every revive within 2.1 s of its decline (max 2091 ms, s50d), margin about 5.9 s; the env name is stated. r2 §3.3 |
| 3 | supersedes after a revive are not counted | Counted per fixture and reported (s50i 7 against 6, s50j 2 against 1); the two cases named. r2 §3.3 interactions |
| 4 | E5's throw surfaces in the wrong place; U9's verdict revive carries no text | The interface is split into `evidence(source, text, at)` and `verdict(v, forTurn, finals, at)`; `text` is a required parameter, so the throw cannot exist. r2 §4.1, Appendix B.9, decision 16 |
| 5 | `ignored why=dispatched` is the common outcome | Said in §3.3 and E3 with the count (46 of 88 verdicts on the 11 fixtures) |
| 6 | ties among remembered turns undefined | The newest wins. r2 §3.2 step 2 |
| 7 | U12 and U14 are red only on the return value | U12 pins both sides (three back absorbed, four back not, the memory shifted by the Live-only echo); S-14 is its twin on the machine. r2 §6.3, §6.7 |
| 8 | the echo test runs before R15 | R15 runs first; a stale dispatched turn is remembered before the judgement; U16 pins it. r2 §3.3 interactions |
| 9 | §6.4 and R2 inaccuracies | s50j S1Q07F/S1Q08F are stale-finals + re-arm cases, s50d S2Q08 is revived by a whisper chip, R2 says ≤ 1400, the legacy budget's "first detection" is kept for the committed rows. r2 §6.4, §7 R2 |
| 10 | the replay feeds a different quote input from production for `replaced` Live claims | The mark line logs the raw Live text in full as `live=`; the replay feeds it when present; the 12 pre-fix fixtures feed the STT line for their `replaced` marks and the builder prints the count. r2 §3.8, §4.5, §6.1.2, E15 |
| 11 | two design fragilities unnamed | Both named in §9 with their bound; the second is pinned by S-16 |

## The open questions

| # | the review's recommendation | r2 |
|---|---|---|
| 1 | substitution yes; every row under both policies; counts pre-registered; print which rows rest on one | Adopted. Expected 8 substitutions (the cue smoke 1, the re-smoke 1, s50i 3, s50j 3; 2 re-armed), cap 16; four rows rest on one and are listed. r2 §7 R14 |
| 2 | ignore stale verdicts of both signs; the question is moot (I3) | Adopted, with the re-arm. r2 §3.3 |
| 3 | reuse `continuationMs`; correct the margin | Adopted; margin re-measured at about 5.9 s |
| 4 | `REMEMBERED_TURNS = 3` is fine; the guard is the risk | Adopted; the guard is the judgement of I1 |
| 5 | flag off; a flag-off live exercise before the flag-on smoke; the recording as a gate | Adopted as §3.7 steps 2–4 |
| 6 | the recording, with five shapes | Adopted, with nine shapes (the review's five plus a free-standing statement, the two re-smoke shapes and ordinary questions), flown flag-off and flag-on |
| 7 | `close reason=no-verdict` | Adopted |
| 8 | what a whisper and a Live non-quoting positive do to a declined turn with a tail (C3) | Answered: split at the verdict's boundary; whisper with no tail ignored; Live with no tail Live-only |
| 9 | is a negative on a marked turn ignored (I9) | Yes |
| 10 | which echo error is accepted (I1) | Neither of the review's two; the judgement absorbs 0 of 523 on-time claims and keeps s50i's fix; the accepted residual is S-4 (0 observed) |
| 11 | are whisper positives echo-tested; which way do ties break (I2) | Yes; to the memory |
| 12 | which text does the quote test use for a `replaced` Live claim (Minor 10) | `d.liveText`, logged in full; the pre-fix fixtures feed the STT line and say so |
| 13 | which calibration mismatches are tolerated, and does an inadmissible fixture block the rule (C1) | The four signals of §6.2; only its own rows, except a headline fixture → INCONCLUSIVE |
| 14 | does R6's budget include the unfinished hold (C2) | Yes, and the last final's settle |
| 15 | which ChipDeduper inputs the harness passes (I5) | question, source, anchor = the dispatched text |

Where r2 departs from a recommendation: open question 6's shape list is extended rather than taken as is;
I10's env hook is not proposed (decision 18, with the reason); C3's whisper rule is "ignore only when there
is no tail" rather than "always ignore", because a short question left to a re-classify can be declined
again, and the split answers it as today (S-6).

## Changes not asked for by the review

| change | why |
|---|---|
| The re-smoke as a fixture, two rows (R16), two crafted cases (S-11, S-12) | the coordinator's evidence; both cases answered once from their finals under both policies |
| The reverse rule for unscorable evidence (`REVERSE_MIN_CONTENT_WORDS = 2`) | without it the re-smoke's S1Q08F stays headless (coverage 0.88) because its 3-word fragment's verbatim chip cannot score forward; with it the question is whole. Its accepted edge (an unscorable chip made of a declined statement's own words revives it) is pinned by S-13b and left to the user (decision 17) |
| The budget's last-final term | S1Q08F's second final came 3.1 s after the voice-off; no machine can dispatch the whole question before it settles |
| Log-ordered races instead of a jitter rule | a fixed rule in either direction mis-orders real races (§6.1.5) |
| The `evidence`/`verdict` interface | Minor 4 and I2 together; 31 unit-test call sites rewritten with unchanged expectations |
| The app-timer-stall signal (R1e iv) | the two misses the review could not attribute; both are the same pattern |

## Prototype results (r2 machine, `r2/out-rows-r2.txt` unless named)

- §7 rows: FAIL 0, INCONCLUSIVE 0, under both substitution policies, on 12 fixture runs.
- br1 S1Q08: once, `finals=5`, 3006 ms (budget 3106; today 65 350); the 60.8 s echo absorbed at 0.92.
- the cue smoke S1Q08: once (today 2); the claim absorbed at 1.00, 72.8 s after the answer.
- the re-smoke S1Q07F: once, `finals=2`, 2845 ms (today 7243 from Live's text); S1Q08F: once, `finals=2`,
  coverage 1.00 (today 0.88), 3490 ms (today 4290), revived by the reverse rule.
- the 14 rescued false closes: all once from their finals, 1.8–3.7 s after the voice-off against 5.5–7.1 s
  today; s50d S2Q05F at 3700 on the unfinished hold.
- s50i S2Q09 coverage 0.96 (today 0.46); s50j S1Q10F 1.00 (today 0.45).
- br1 S2Q01: a normal dispatch with `live=[]` (today the R21 route with S1Q10F's text); s50i S2Q07F `live=[]`.
- s50a 40/40 and after9 76/76 unchanged with memory on, median 1200 (`r2/out-legacy-r2.txt`).
- controls: revive only → br1 S1Q08 twice; echo only → br1 S1Q08 once from Live at 65 350 ms; echo off →
  the cue smoke S1Q08 twice.
- 22 absorptions, all Live, all same-item (`r2/out-absorbed-table.txt`); 19 revives in fix mode, scores
  0.56–1.00 forward and one reverse; 0 splits and 0 ignores on the fixtures.
- 22 of 22 crafted cases as asserted (`r2/out-crafted-r2.txt`).
- calibration: every read clean on 11 fixtures with every exception named (`r2/out-calib-r2-j50.txt`).
- the judgement on non-holdout hours: 0 of 523 on-time claims wrongly absorbed; true echoes min 0.57,
  rescues max 0.21 (`r2/out-quote-metrics.txt`, `out-echo-pairs.txt`).

## What was not checked

- The prototype's fix mode is a reading of r2, not the implementation; its calibration mode reproduces DS's
  replay and the reviewer's, not the vitest harness.
- Answer quality after a revive (statement-prefixed pinned text) was not assessed; no answer text was read.
- The app's energy-VAD transitions are not in the logs; the four R1e signals attribute, they do not prove.
- The two app timer stalls are unexplained.
- Not read: captured prompts, keys, `.env`, `credentials.enc`, `spike*`/`probe-shipped*`/`repro*` json,
  holdout40 hours.
