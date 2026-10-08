# Turn-based follow-up context, offline replay on s50m + s50l (two legs): PASS

Rule: `followup-turn/PREREGISTER-turn-followup.md` FINAL, sha256 `eac1ad4f414b688ef5f2dd50cdf44734994c1e9a69e13cf0ad464db77a8290f5`
(registered text + §2 filled + dated I3 note, A1 and A2 points 1–16 appended), read with `AMENDMENT-A3.md` (separate, pre-decision).
Run 2026-10-04 local: gate 00:25–00:27, front pass 00:27–00:39, back pass 00:39–00:48, graders 00:50–00:53 (files 1–4) and 14:53–14:59
(files 5–9), decided 15:00:21. Note written Sun 2026-10-04 15:13 TST (`date`). Evidence: `followup-turn/R/` (`run.log`,
`RESULT-front-back.txt`, `MANIFEST.txt`, `blind/`), to be copied to `passes/2026-10-04-turn-followup/` with an INDEX line.

- **`DECISION: PASS`** — hash `eac1ad4f414b688ef5f2dd50cdf44734994c1e9a69e13cf0ad464db77a8290f5`. Every clause holds; the gain on the
  40 roster pairs is +19 against a PASS bar of +8. A PASS is not a ship decision (§9).
- **Four process departures, each recorded before any verdict was read.** (1) The user's delegation replaced the hash OK — 2026-10-03
  22:52:10, verbatim: "do the run tonight regardless, as long as it's verified ready, dont wait for me ok" (A2 point 12; run.log
  `DELEGATED OK eac1ad4f… under A2.12` at 00:26:06). (2) The gate failed once: 00:22:49 `GATE FAILED (A2.12 c): exit 2 (expected 0);
  missing ["E2E OK"]` — the controller's gate script ran `e2e-synthetic.mjs` without `TURN_PREREG=section2-filled.md`, so the check read
  the still-empty §2 of the registered file; voided by A2 point 16 (written from run.log, pre-data), gate re-run WHOLE from (a) at
  00:25:04 → `GATES PASSED (A2.12 a-h) hash eac1ad4f…` 00:27:22; the 00:22 block stays in run.log. (3) A3 (14:50): the 20 launches for
  blind-5..9 (a1 AND a2, 00:53:24–00:54:38) exited 1 within ~8 s with no model turn — the account's usage limit (`rate_limit`,
  `isApiErrorMessage: true`, model `<synthetic>`, no tool call, no verdicts file; 4 of 20 transcripts read, identical). Ruled refused
  attempts, not grader attempts: no slot's one replacement is consumed; `GRADING STOPPED` 00:54:57 with no decision run; blind-5..9
  graded by fresh a3 after a reset probe at 14:52:58. (4) `decide` refused at 14:59:53 (exit 3, `REPORTED, NOT DECIDED`): `graders.json`
  lacked `attempt` and `cwd` per slot (A2 point 5) because the controller's derive script omitted them; no verdict was read, no DECISION
  line existed; the script was fixed (both copied from the slot's exit-0 launch line), graders.json re-derived, decide re-run 15:00:21.
- **Gain per hour, front (20 roster pairs each):** s50m A 2 → B 10 (+8); s50l A 3 → B 14 (+11). Back (12 each): s50m A 2 → B 9 (+7);
  s50l A 4 → B 9 (+5). Neither hour carries the other: s50m alone meets the +8 bar's share, s50l exceeds it.
- **Where it did not help:** s50m:S2Q05F front 0/0 (wwwww both arms; back A 1 B 2 of 3); s50l:D2 0/0 (dropped-parent case, wwwww both
  arms); s50l:S2Q08F front A 2 B 1 of 5 (back A 1 B 2); s50l:D3 A 3 B 2 of 5. None is consensus-wrong: clause 1 reads 0/0 on both legs.
  Either-grader (reported, never decided): wrong A 5 B 2, off-topic A 17 B 9.
- **Back leg (3.1-lite LOW, 8 roster items × 3 reps = 24 pairs; clause 1 decides, the rest descriptive):** wrong B 0 ≤ A 0, off-topic
  B 2 vs A 3, acceptable B 19 − A 7 = +12; S1Q04F www → YYY in both hours; thoughts median +35. It is there to show the arm-A baseline
  on the shipped model (§11) and reads the same direction as the front.
- **Consequence (§9, registered): build behind `NATIVELY_EARLIER_QUESTION` (OFF) in MAIN** — TDD on every spec §3.6 row, the build gate
  c1–c3 (parity fixture reproduced; flag-off dist byte-identical, `--calibrate` 39/39; `fullMessage_on === insertBlock(…)` as app tests),
  Opus review, rebuild + dist proof; then the quick-follow-up smoke; then the scenario50 S1+S2 live flight under its own registration
  (flag ON, zero wrong among gated items as a clause). The s50k re-run (INCONCLUSIVE only) stays frozen and unused.

## The rule lines, verbatim (`R/RESULT-front-back.txt`; `legs-decide.mjs` 15:00:21)

```
instrument 8564ba96369a; graders claude-opus-5-5 x 18
incomplete pairs (excluded): none
answers empty after the filters (scored 0/0/0): none
n_front = 70 complete front pairs (roster + D); R = 40 complete roster pairs (the bars below are formulas on R); n_back = 24 complete back pairs
1. no new wrong, per leg       front: consensus-wrong B 0 <= A 0: holds; back: B 0 <= A 0: holds  =>  holds
2. no rise in off-topic        front consensus-off-topic B 1 <= A 4: holds   (back, reported: B 2, A 3)
3a. not later (median)         median paired TTFT B-A on R 131 ms (holds <= +500, FAIL > +1000): holds   (all 70 front pairs, reported: 25 ms)
3b. not later (p90)            p90 B 4048 ms vs p90 A 3947 ms + 2000: holds   (all front pairs, reported: B 3846 vs A 3987)
3c. stalls                     TTFT > 10 s on R: B 0 <= A 0 + 3: holds   (all front pairs, reported: B 0 <= A 0 + 4)
4. not longer                  median paired words B-A on R 4 (holds <= +5, FAIL > +10): holds   (all front pairs, reported: 1)
5. not more thinking           median paired thoughts B-A on R 58 tokens (holds <= +150): holds   (all front pairs, reported: 31; back leg at LOW, reported: 35)
6. parity                      checked before any verdict was opened: holds
7. gain, on R                  consensus-acceptable B 24 - A 5 = +19 (PASS >= +8, FAIL <= +2): PASS   (back leg, descriptive: +12 on 24 pairs)
DECISION: PASS
```

## Per item, front leg (3.5-lite HIGH, reps 1–5; Y both graders acceptable, X both correctness 0, o both on_topic ≤ 1, w otherwise)

| item (s50m / s50l) | kind | A (captured prompt) | B (with the block) | acceptable A/B of 5 |
|---|---|---|---|---|
| S1Q04F | roster | wYwww / wwwww | wwYYw / YYYYY | 1/2 ; 0/5 |
| S1Q06F | roster | wwwww / wwwww | YwYwY / YYYYY | 0/3 ; 0/5 |
| S2Q05F | roster | wwwww / Ywwww | wwwww / YoYwY | 0/0 ; 1/3 |
| S2Q08F | roster | oowYo / wwYwY | YYYYY / Ywwww | 1/5 ; 2/1 |
| D1 / D2 / D3 | dropped parent | wwwww, wwwww, wYwYw / wwoww, wwwww, wYwYY | wYYwY, YYwYw, wYYYY / wYwwY, wwwww, wYYww | 0/3, 0/3, 2/4 ; 0/2, 0/0, 3/2 |

Back leg (3.1-lite LOW, reps 1–3), s50m / s50l: S1Q04F www→YYY / www→YYY; S1Q06F wYw→YYY / Yww→YYY; S2Q05F oYo→YYw / YYw→woY; S2Q08F
www→Yww / Yow→oYY. Passes: front 140 calls, 70/70 per arm, transient 0, empty 0, null thoughts 0, TTFT p50 A 3382 / B 3460 ms, p90 A 3987 /
B 3846, words p50 61 / 63; back 48 calls, 24/24 per arm, transient 0, TTFT p50 A 9047 / B 8367 ms, p90 A 11259 / B 10602, words p50 73 / 72.
A first in 35 of 70 and 12 of 24 pairs. Filter chain d8fee6ca0170 (the pre-cue snapshot).

## The instrument

18 `claude-opus-5-5` graders (instrument 8564ba96369a), two per blind file, each from a fresh cwd outside the project
(`grading/<slot>-a<k>`; tools Read/Write/Edit, no Bash, `--strict-mcp-config`), keys moved out of reach before the first launch and back
after the last. Model pinned from every transcript (18/18); memory ABSENT 18/18 (project memory 0, claude-mem 0); audit clean 18/18
(Read 2–4, Write 1, bash=[], dispatch=match); `graders.json` departure false; parity checked before any verdict opened. Two sessions:
files 1–4 (8 graders, attempt 1) 00:50–00:53 and files 5–9 (10 graders, attempt 3) 14:53–14:59 under A3. That drift is bounded: each
blind file holds both arms of its own items (`R-keyhold/key.blind-N.json`: A 10 / B 10 in blind-1 and blind-5, A 12 / B 12 in blind-9)
and both graders of a file sat in one sitting, so a level shift between files moves A and B together and cancels in the paired
consensus; it can still shift the reported either-grader and mean counts, which decide nothing.

## What this does not show

- An offline replay of captured prompts (s50m, s50l), not the app: no holdout id, no audio, no dispatch path, no turn machine. In-app
  latency (`ms=`) and the hedge's real race are untested; the replay times requests.
- The reference implementation (`earlierQuestion.ref.mjs`, 47/47 tests), not the built feature; the build gate c1–c3 is still ahead, and
  spec §3.6's new states (quick follow-ups, merges, echoes, chips, R21) occur in neither hour (§10).
- The arm-A baseline is low under these graders: 5 consensus-acceptable of 40 on 3.5-lite HIGH (S1Q06F www in both hours against 8/9
  in-app, §11); either-grader off-topic A 17. The gain is measured against that A by Opus 5.5 graders, stricter than the earlier Opus 5
  verdicts; design 2's Saturday verdicts on the same 4 ids are a prior, not a comparison.
- s50l repeats s50m's window on S1Q04F and S1Q06F (identical but for the preview): part of the gain is reproducibility (§10).
- The s50k re-run material is frozen and was not run; PASS opens no second draw. A1 lifted the earliest-day rule for this run only (the
  quota day already carried the design-2 s50l re-run). The grader split across two sessions is stated above.
