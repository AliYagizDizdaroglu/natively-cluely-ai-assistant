# AMENDMENT A1 to SPEC-bundle-1 (rev 2): the reduced bundle (user option A)

- **Written** 2026-10-08 by Opus, **before any data of the re-bench exists** (no T-arm run of this build has been made, read or graded). Authority: USER-RULINGS.md item 8.
- **Scope.** This amends only §0, §1, §2, §7.4 and §8 of `SPEC-bundle-1.md`, and gives the skeleton of the §10 final-flight registration. Every other part of the spec stands.
- **Hand-off rule kept.** Ids and counts only; no question or answer text.

## 1. What the reduced bundle is

| Spec # | Change | Status under A1 |
|---|---|---|
| 1 | Router BLOCK_B hard-first (+ conditional length guard) | **REVERTED** to r1's flown router: INSTRUCTION sha256 `e29bf3810128…`, BLOCK_B sha256 `e11c240063ea…` (the pins in MAIN dcefca0 `LiveRouterSession.ts:7-8`). **No length guard ships.** |
| 2 | Short-answer rule (pipeline, typed, Live) | **DROPPED everywhere.** `SPOKEN_LENGTH_AND_DEPTH` and the Live INSTRUCTION are dcefca0 / r1 bytes. |
| 3 | Cue gate `cueRuleApplies` / `verbalPromptFor` + `[Answer] cue rule:` log | KEPT, unchanged |
| 4 | Cue coverage, no wording change | KEPT (measured only) |
| 5 | Silent-listener failover, K = 5 | KEPT, unchanged |
| 6 | trimCues follow-ups on 6e3a310 | KEPT, unchanged |
| 7 | Fault drill | KEPT, unchanged |
| 8 | Per-id `hasCueRule` in the harness | KEPT, unchanged |

**Consequences, stated before data:**
- `VERBAL_TYPED_PROMPT` returns to the pre-cue identity sha12 **4495445db0c2** (the §2 "retired" note is withdrawn). `CUE_RULE` stays **8e15e4e7dd41**. The invariant `VERBAL_WHAT_TO_ANSWER_PROMPT === VERBAL_TYPED_PROMPT + CUE_RULE` still holds. The build's dist proof must show all three.
- Deviation **D5** (typed chat carries the short-answer rule) is void. D1, D3, D6, D7, D8 stand. D2 stays dropped. D4 is moot (the routing replay no longer gates anything).
- §1.5 pin updates are not made: `LiveRouterSession.test.ts`, `routerCapture.mjs:9-10` and `routerHarness.test.ts:215` keep r1's values. r1's `guard-rd.mjs` router pins apply as they are.
- The §1.3 routing replay (B0/B1/V) is **closed as FAIL on record** (R1 B1 10/7 vs B0 4; R3 8/40). Its bars R1–R4 and the §1.4 guard decision no longer apply: the instruction they tested is not built.

## 2. The re-bench (§8), amended

### 2.1 Arms
- **C** = reused, **byte-identical**: `bench/arms/captured.C.json` (sha12 `cd90b6f25057`) and its answers `bench/runs/b1c{1,2,3}.json`, sha256 `0bf3b5ba…`, `e42521c8…`, `bbba3618…`. They are not re-run.
- **T** = regenerated, ×3: per capture, **C's system bytes unchanged, except `CUE_RULE` stripped (`withoutCueRule`) on the 22 frozen no-cue ids**. There is no `SPOKEN_LENGTH_AND_DEPTH` substitution.
  - So T on the 20 cue ids is **byte-identical to C**, and T on the 22 is C minus exactly one `CUE_RULE`.
  - The arm builder must refuse unless: the build's `SPOKEN_LENGTH_AND_DEPTH` equals r1's (sha12 `2cad431fde0c`, 2303 chars); `CUE_RULE` occurs exactly once in each capture; the new dist's gate agrees with the frozen 22/20 split on all 42; T's 20 cue ids equal C byte for byte. (`build-arms.mjs` today refuses when old = new SPOKEN, so it needs this change; the old T files move to a `round2/` folder, never overwritten.)
- **Model, ids, reps, grading:** unchanged (gemini-3.5-flash-lite HIGH; frozen 42; 6 `claude -p` Opus sessions, pinned `claude-opus-5-5`, `--setting-sources project,local`; 3 blind files of 84, each one C rep + one T rep). C's answers are reused, but **C is re-graded in the same blind files** as T, so both arms share graders. Total new model calls: 126 (T only).

### 2.2 Bars that apply unchanged

| Bar | Still makes sense? | Note, decided now |
|---|---|---|
| **Q1** | Yes. It is the "no quality loss from removing the cue rule" bar. | The 20 cue ids are an A/A pair (same bytes), so any effect is carried by the 22; the aggregate dilutes it. Stated, not changed. |
| **Q2** | Yes. 0 new wrong is the safety bar for stripping the rule. | — |
| **Q3** | Yes. A per-item drop on a no-cue id is exactly the feared effect. | It still names SH/MP ids among drops (SH is now just an id list, reported). |
| **L1a** | Yes, as a regression guard. NS = the 20 cue ids, whose T bytes equal C's: it is now an **A/A noise check**. | Fixed thresholds from reused C: pooled NS T ≤ 1.05 × 57.5 = **60.4**. Within-C noise, measured now on C only: 5 of 20 NS ids have a single C rep > 1.25 × their C median, so the per-id clause (median of 3, ≤ 2 ids over) can fail on noise alone. |
| **L1b** | Yes, same A/A status: all 9 MP ids are cue ids. | Fixed: pooled MP T ≥ 0.9 × 62 = **55.8**; per-id 0.75. Within-C min/median per MP id is 0.82–0.98 (RH07 lowest). Round 2's L1b failure came with the short-answer rule, now absent. |
| **L2** | Yes. Removing the cue rule can only remove instructions on the 22; the 20 are identical. | Tolerance **holds**: C rep medians [825, 812, 842.5], spread 30.5 < floor → tol **50**, bar T pooled ≤ **874**. No-cue/cue subsets reported. |
| **L3** | Yes. | Tolerance **holds**: C rep p50s [3374, 3535, 3425], spread 161 < floor → tol **200 ms**, bar T pooled p50 ≤ **3625 ms**. p90 reported. |
| **C1** | Yes, A/A (all MP ids keep the rule): it checks that cue coverage is not lost. | — |
| **C2** | Yes. **The core bar of the reduced bundle:** 0 cue blocks on the 22 per rep; ≥ 18 of 20 cue ids with a block per rep. | — |

- **A/A failures are not excused.** If L1a, L1b or C1 fail on identical bytes, the §8 stop rule still applies: the chain stops, the cause is reported (noise vs. a build or harness fault: first check T's 20 cue-id systems really equal C's), and the user decides. Nothing is re-tolerated after data.
- The tolerances are those of §8 verbatim; the fixed numbers above are C's, which are known because C is reused.

### 2.3 Bars that do not apply: S1, S2
- **S1** (short-answer opening) and **S2** (short-answer length) measure the short-answer rule's output. That rule is **not in the build** (ruling 8): neither arm carries it; both carry r1's `SPOKEN_LENGTH_AND_DEPTH`.
- **Why this is not renegotiation:**
  - the feature they measure is removed, and so is its claim. The bundle no longer claims short answers, so nothing ships on their authority;
  - the decision was made by the user before any T data of this build exists, and is written here before that data;
  - their failures in rounds 1–2 stand on record as the reason the feature was dropped. They are not re-read as passes.
- S1/S2 numbers are still computed and **reported only** (they show what the r1 prompt does on SH/SH1, with no consequence).

## 3. The smoke (§7.4), amended

One scheduled smoke on live40.wav, router flag ON, drill armed, timings and windows unchanged.

| Bar | Status under A1 |
|---|---|
| **S-H** health | **Applies.** The dist proof must show: router INSTRUCTION `e29bf3810128`, BLOCK_B `e11c240063ea` (r1's), `VERBAL_TYPED_PROMPT` `4495445db0c2`, `CUE_RULE` `8e15e4e7dd41`, `cueRuleApplies`, `[Answer] cue rule:`. |
| **S-R1**, **S-R2** routing | **Reported only.** Routing is r1's flown instruction, registered and flown in r1; this smoke makes no routing claim. |
| **S-SL** | **Applies:** 0 `reason=silent-listener` outside the ear-mute window. |
| **S-CUE** | **Applies**, with `skipped` accounting (every `cues: []` preceded by `cue rule: skipped`; well-formed ≥ 90%; 0 over 3×5). |
| **D1** router-drop | **Applies** unchanged. |
| **D2** ear-mute | **Applies** unchanged (the silent-listener failover's only live evidence). |

## 4. Final-flight registration: skeleton only

The registration itself is written next (Opus author, separate Opus reviewer, deadline Sat 2026-10-10; attended, in a window the user names; `NATIVELY_FAULT_DRILL` absent). It must pre-register bars on:

1. **No quality regression vs r1.** In-app acceptable / wrong on live40 vs r1's flown numbers, with a tolerance taken from known noise; 0 new wrong. Bare 3.5-lite HIGH and bare 3.1-lite LOW graded beside in-app and the per-id twins (user rule). Grader pinned and named.
2. **Pipeline-answer latency not worse.** First-word / TTFT p50 and p90 of pipeline-shown answers vs r1, tolerance from known spread; no-cue and cue subsets reported.
3. **Cue gate behaviour.** Per id, `cue rule: sent|skipped` matches the frozen gate on the heard question; every `cues: []` preceded by `skipped`; cue blocks present on the sent ids at the C2 rate; in-app cue blocks graded.
4. **0 cue marker leaks.** No `__CUES__` sentinel, `__MORE__` block or cue-line fragment in any spoken or displayed answer.
5. **Silent-ear failover and fault drill.** Cites the smoke's D1/D2/S-SL evidence (the flight itself runs no drill); in the flight: 0 `reason=silent-listener` unless an ear episode is logged, and any failover is reported with its evidence.
6. **Safety unchanged.** Router shas equal r1's; health as S-H (all dispatched answered, doubles ≤ 1, 0 hard failures); routing (HARD shown Live, EASY shown Live) reported against r1, not gating.

## 5. Not shown / residual
- The 20 cue ids give no information about the change (A/A); the change is measured on 22 ids × 3 reps only.
- The cue gate's cue loss on 10 of 27 live40 HARD items (§3.1) is unchanged and its effect on the candidate unmeasured.
- trimCues follow-ups are covered by unit tests and S-CUE only.
- C is re-graded: C's acceptable counts may differ from rounds 1–2 (round 1 [38,40,40], round 2 [39,39,40] on the same answers).
