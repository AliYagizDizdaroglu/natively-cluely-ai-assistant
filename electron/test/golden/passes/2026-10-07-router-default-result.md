# Result: router-default-r1 — INCONCLUSIVE (Quality FAIL, Routing FAIL; Safety PASS)

Verdict per the registration (§6.1): not VOID, no Safety FAIL, two bars unmet → **INCONCLUSIVE, with one re-fly**.
The flag `NATIVELY_LIVE_ROUTER` stays default OFF. The registration (§1 of its rules) puts the committed result note at
MAIN `passes/<date>-router-default-result.md`. That copy is staged as
`staging\passes\2026-10-07-router-default-result.md`.

- Graded folder: `MAIN\electron\test\golden\interview60.runs\2026-10-07T00-22-47-router-default-r1` (the only
  `-router-default-r1` folder; no retry, no VOID attempt).
- Flight: T 03:00:03 TST, exit 0 at 03:40:25, dist proofs before = after. Registered HEAD `fade67f` (code = `19937ab`);
  registration sha256 `4a9acfdef836…`, unchanged since the seal (re-hashed now, MAIN and LAB copies equal).
- Scorer `score-rd.mjs` sha12 `50e0bc95bfb0`; reader `router-hour-read.mjs` sha12 `2d17df40226e`, run with
  `--down-limit-min 2`; reader output sha12 `7f55e63ece05` (= `RUN-READ.txt`). Final score: `grade\score-r1-final.txt`
  (sha12 `4c6a5cffb497`); the pre-retry `score-r1.txt` (sha12 `87fbf677af9b`) has the same bars and verdict, reported
  arms "not graded".

## Bars (registration §5)

| bar | result | numbers |
|---|---|---|
| **Safety (decisive)** | **PASS** | text half: hard-first 0, router marker 0, pipeline unknown marker 0, bare routing token 0; wrong Live shown **0 of 21** graded (ungraded 0) |
| Fallback | PASS | missing appended 0, unflagged Live failures 0, row-4 with Live capture 0, nothing shown 0, pipeline no token 0 |
| Quality | **FAIL** | acceptable L **19** vs S **21** of 21 pairs; needs L ≥ S − 1 = 20. Excluded: 0 (sEmpty 0, superseded 0, no pipeline 0) |
| Speed | PASS | `live_first_ms` p50 **1572** ms (limit 2500), p90 2066, n 21 |
| Routing | **FAIL** | EASY caught **17/20** (≥ 13 PASS); HARD misrouted **4/27** (≤ 1 FAIL) |
| No regression | PASS | wrong **0** of **23** pipeline-shown HARD turns (in-app 23, appended 0, superseded 0), unreadable 0 |
| Integrity | 0 problems | all reader counts 0; captures MATCH (router-live 21, shadow 21, appended 0) |

## What decided it

- **Quality:** the 2 Live answers not acceptable are **RH08** (HARD follow-up, misrouted) and **RE06** (EASY main);
  both graders gave correctness 1, on-topic 2 — partial, not wrong. All 21 shadow (S) answers acceptable.
- **Routing, HARD shown Live:** **RH04, RH05, RH07, RH08**. Live answers on them: RH04, RH05, RH07 acceptable; RH08 weak.
  - Smoke 3 (same wav, same roster) misrouted RH04, RH08, RH09: RH04 and RH08 repeat; RH09 went late this time;
    RH05 and RH07 are new. router40's offline replay misrouted RH05.
  - The registration predicted this (A10: Routing "likely to FAIL", verdict "likely INCONCLUSIVE").
- **Routing, EASY missed:** RE09 (late), RE14 (no-router-turn), RE20 (late).
- **HARD not misrouted but not decided by the router:** late 7 (RH03 RH06 RH09 RH10 RH12 RH17 RH20), no-router-turn 1
  (RH19); the pipeline answered them.

## Decisions and timing (`RUN-READ.txt`)

| | n |
|---|---|
| in-hour decisions | 47 (2 outside the hour = probe) |
| easy-answer → shown Live | 21 |
| hard → pipeline | 15 |
| invalid late → pipeline | 9 |
| invalid no-router-turn → pipeline | 2 |
| appends · supersedes | 0 · 0 |

- Live words p50 36, max 75. Shadow first token p50 3903 ms, p90 4914 (n 47).
- In-hour VOID inputs: router down 0.01 min (limit 2.0); router `session failed` 0; ear failovers 0.
- Session-wide tallies (the whole app session, preflight and probe included, not the hour; `RUN-READ.txt` §4):
  - router: 2 connects, 1 reconnect after a close with code 1011 "Internal error encountered.";
  - ear: 2 closes, both stale.

## Grading

- **Grader `claude-opus-5-5`**, pinned, read from the transcript of the last launch of all 13 graded slots (blind-1..4
  × 2, in-app × 2, high, low, captured-high). Alias probe: `opus` → `claude-opus-5-5`.
- **Memory ABSENT on all 16 launch records** (`grade\launches.jsonl`), including the three attempt-2 arms.
- Attempt 1 of high, low, captured-high: exit 1, no model, no tool call (usage-limit refusal per LEDGER; launches
  show model "" and tools {}). Relaunched as attempt 2 at 13:17–13:20Z, all exit 0, pinned.
- Grade definitions (§7.1, A8): acceptable = correctness 2 AND on-topic 2 (both graders on two-grader files); wrong =
  correctness 0 from either grader.

### Reported only (gate nothing)

| arm | acceptable | wrong | n | note |
|---|---|---|---|---|
| in-app, all pairs (2 graders) | 44 | 0 | 47 | mains 28/31, follow-ups 16/16; weak RE06 (Live text), RH09, RH19 |
| bare 3.5-lite HIGH (1 grader) | 28 | 0 | 31 mains | weak RH07, RH12, RH19 |
| bare 3.1-lite LOW (1 grader) | 28 | 1 | 31 mains | wrong RH19; weak RH18, RE18 |
| captured-high (1 grader) | **UNUSABLE — mis-keyed prompts** | — | 42 | no reading; see below |

### captured-high is UNUSABLE (mis-keyed prompts): its numbers are not model quality

The scorer prints "acceptable 23 wrong 16 of 42". Do not quote it as a 3.5-lite HIGH result.

- **Cause:** the run's `interview60.prompts.json` (sha12 `c0a71cc06961`) is mis-keyed. `pairCapturesToDispatches`
  (`electron/llm/promptCapture.ts:60-82`) takes the first unused capture in a window from −1 s to +30 s. A dispatch
  without its own capture takes the next turn's capture, and the shift chains on (review `diag38-review.md` B1).
- **The 16 graded off-topic:** the verdict file has on-topic 0 on exactly 16 ids, all 16 also correctness 0:
  EF02 RE08 EF03 RE05 RH04 RH09 RH10 RH11 RH15 RH16 RE16 EF06 EF07 RH18 RH20 RE19. For each of them, the capture's last
  `[INTERVIEWER]` line is another item's question as heard: the re-check measured overlap 1.00 with that item's
  heard text for all 16. Against the roster wording the overlap depends on the metric:
  - containment (the share of the roster question's words of 3+ letters found in the line, my probe): 1.00 for all 16;
  - the re-check's metric: as low as 0.19–0.33 (RH09, RH10, RH15, RE16).
- **Mis-keyed count is 17, not 16:** RE04's capture ends on EF03's question (own overlap 0.00) but was graded correctness 1,
  on-topic 1, so it is not counted among the off-topic grades. Chains (key → whose question): EF02→RE08→RE04→EF03→RE05→RH04→RE06; RH09→RH10→RH11→RE09;
  RH15→RH16→RE16→EF06→RE17; EF07→RH18→RE18; RH20→RE19→RE20. Each chain ends at an id with no key (RE06 RE09 RE17 RE18
  RE20 = the 5 missing of 47).
- **The other 25 keys** each match their own question best, under both metrics:
  - against heard text, all 25 are ≥ 0.92 (the re-check);
  - against roster wording by containment, 24 are ≥ 0.8 and RE07 is 0.75 (my probe);
  - the exact figures depend on the metric. The probe is a throwaway that printed ids and numbers only.
- **The other 12 verdict files** (10 gating, high, low) have 0 on-topic-0 grades.
- **Not caught:** the reader's "captures MATCH" checks only the router capture files (`router-live`, `router-shadow`).
  It never reads `interview60.prompts.json`.

## The re-fly (registration, quoted)

- §6.1: "**Anything else:** INCONCLUSIVE, with one re-fly." "**A second INCONCLUSIVE has no automatic outcome.** The
  controller reports, and the user rules."
- §6.3: "**The re-fly after an INCONCLUSIVE** gets a new label `router-default-r2` and a new blind seed
  `blind:router-default:r2` (14A carry): a dated amendment changes `REGISTERED_RUN_LABEL` and `SEED` in
  `build-blind-rd.mjs`, `cal-build-blind-rd.mjs` is re-run, and the launcher is regenerated with the new label."
- §6.3 also says a retry (VOID, or "The hour was NOT spent") is not a re-fly.
- The registration names no other change for r2. It never allows tuning the router, its instruction or the arbiter.
  The smoke rulings (§11.2, §11.4, A10) say "NOT tuned".

**What else binds r2 (registration):**
- **Needs a new smoke, or a user ruling.** §9.1 and A7: the smoke and the run must fall in one quota day, ending
  before 10:00 TST or entirely after it. r1's smokes ran in the 2026-10-06T07:00Z quota day, which ended at 10:00 TST
  on 2026-10-07.
- **Needs a new commit and a fresh arming.** A4: a change after the commit is "a new dated amendment AND a new commit,
  with the seal and HEAD taken from that new commit". The r2 amendment is therefore a new commit with a new seal and a
  new HEAD, followed by a fresh arming record, ledger read, dry twin and precheck (§8.3, §9).
- **Tied to the smoke's file:** guard r6 needs `RESULT-smoke.md` to hold `context_sha12=<env value>`, and §10 records
  that file's sha256. A new smoke changes both.
- **Quota cost** on the lite models, 3.5 / 3.1: one whole-wav smoke ≈ 50 / 3–7 (A5); the run plus arms ≈ 135 / ≈ 44
  (§8.2; captured-high is ≈ 47–49 of the 135). The arming gate needs headroom ≥ 224 / ≥ 90 (§8.3).
- **Expected outcome: likely a second INCONCLUSIVE.** Two live readings of the same wav and roster misrouted 3/27
  (smoke) and 4/27 (r1) against a bar of ≤ 1. RH04 and RH08 were misrouted in both, and no tuning is allowed.
  A second INCONCLUSIVE "has no automatic outcome"; the user rules (§6.1). This is the same expectation A10 stated
  before r1.

## Not shown

- **One run, n small:** Quality turns on 2 items out of 21; Routing on 4 of 27.
  - The misroute set shifts between readings: 2 of the smoke's 3 repeat.
  - The count stays well over the bar (3 and 4 vs ≤ 1), so a Routing PASS on r2 is unlikely (see the re-fly section).
- **Weak, not wrong:** RH08 and RE06 are correctness 1, not wrong. Safety's wrong-answer half has not yet seen a Live
  answer graded wrong.
- **Branches never reached in the hour:** append (case C), supersede (D/E), router `session failed` / VOID,
  ear failover, quota close; also undispatched pass-through. They are proven only by tests and synthetic logs.
- **No screenshots:** the "(full answer)" header layout was never observed.
- **captured-high gives no reading,** and the pipeline-capture pairing defect is unfixed. The diag38 kit's `--select`
  depends on the same file (review B1, BLOCKING).
- **Unconfirmed root cause, but the review's guess is contradicted:** the review suggests the turns without their own
  capture are likely Live-shown. The five chain heads are EF02, RH09, RH15, EF07 and RH20; these are the dispatches
  that lost their own capture. All five were shown by the pipeline, none by Live. Chain RH09→RH10→RH11→RE09 holds no
  Live-shown turn at all. `verbal-prompts.log` has not yet been read against the dispatches.
- **Harness gate is not a registered bar:** the harness's own gate reads FAIL on two rows, and neither enters this
  verdict:
  - "Surfaced detections": 1 doubles (46 answered of 47 heard);
  - "Interview-acceptable answers (Opus 5 judge)": not run. The harness's judge merge was not used; grading followed
    §7.

  `interview60.flight.done.json` records `autoExit: 1`.
