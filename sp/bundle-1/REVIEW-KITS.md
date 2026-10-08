# REVIEW-KITS: bundle-1 replay bench + routing replay (lean review, Opus, 2026-10-08)

Verdict: **CHANGES (small, none touch the running 252 generations).** The bench can keep running. Fix A before any routing run. Fix B and C before scoring.
Read-only review: no model calls, no claude -p, no git, and nothing under bench\runs or bench\arms was written.

## (1) Arms C vs T: CLEAN (checked on the built files with hashes only; no text printed)
- Script: scratchpad `armdiff.mjs`.
- C is the repaired r1 prompts: file sha12 cd90b6f25057, the same as the source and the manifest.
- T sha12 fd2ea696e89e, the same as the manifest. 42 ids, the same order.
- No field other than `system` differs on any id.
- Every id has a byte-identical prefix and suffix. The only change is the SPOKEN constant: old 2cad431fde0c (2303 chars) becomes new 24388b4a73d3 (2580). Rebuilding T from C with exactly that substitution reproduces T byte for byte on 42/42.
- The cue rule (8e15e4e7dd41) appears once in every C system:
  - kept on 20 ids;
  - stripped on 22 ids, exactly the frozen NOCUE_IDS (common.mjs:30).
- The old typed sha is 4495445db0c2, the pre-cue identity, so C really is r1-era.
- The bundle dist now still matches the manifest (24388b4a73d3 / b93451f8c491 / 8e15e4e7dd41).

## (2) Bars equal the spec: PASS
| Bar | Code | Spec |
|---|---|---|
| Q1 | bars.mjs:46 | SPEC:358 |
| Q2 | bars.mjs:50 | SPEC:359 |
| Q3 | bars.mjs:51-52 | SPEC:360 |
| L1a | bars.mjs:64-66 | SPEC:361 |
| L1b | bars.mjs:67-69 | SPEC:362 |
| L2 | bars.mjs:81-83 | SPEC:363 |
| L3 | bars.mjs:91-93 | SPEC:364 |
| S1 | bars.mjs:107 (keys common.mjs:37-42) | SPEC:365 |
| S2 | bars.mjs:102-108 | SPEC:366 |
| C1 | bars.mjs:115-117 (C1_REQUIRED common.mjs:35) | SPEC:367 |
| C2 | bars.mjs:118-123 | SPEC:368 |

- The frozen sets match SPEC:351-354: MP, SH, SH1, and NS = 42 − 22 = 20.
- The answer verdicts at bars.mjs:25-31 match SPEC:344.
- Routing BARS (score-routing.mjs:15) match SPEC:88-97: R1 ≤1 per rep; R2 ≥15 and ≥B0−3; R2t +300 ms; R3 ≤2; gate ≥2.
- The guard rule (score-routing.mjs:57-71) matches SPEC:105-108.
- The cue sentinel `__CUES__` exists in verbalStreamFilter.ts.
- The runner's record fields (`spoken`, `cues`, `ttft`, `thoughts`, `raw`; interview60.answers.mjs:205) match the data model at bars.mjs:5.

## (3) Blinding, key and graders: SOUND
- The key is in `keyhold/`, outside `blind/`, and that is refused if violated (export-blind.mjs:61).
- Arm labels exist only in the key, and each file holds one C rep and one T rep, shuffled with a seed (:22-43).
- Each grader may Read only its pairs file and the rubric, and Edit only its verdicts file (launch-grader-b1.mjs:139). It has no add-dir.
- Model pin:
  - an exact `--model-id claude-opus-5-5` is required (:178, :200);
  - pinned = the CLI model AND every transcript model equal the pin (:232).
- `--setting-sources project,local` is on the argv (:138). Memory must be ABSENT for exit 0 (:242), and score-bench re-checks it (score-bench.mjs:20).
- Cap: the 7th record is refused (:225).
- First-launch gate (:158-164, :226): a clean record on blind-1.g1 plus a complete verdicts file. run-graders.mjs:90 runs blind-1.g1 alone.
- Residual: if `L.launchAttempt` returns `error` (:229), the launcher refuses WITHOUT appending a record. If a session was already spawned on that path, it escapes the cap. I did not open F_R/launch-grader.mjs to rule this out.

## (4) score-bench join and integrity: SOUND, one gap
- The launch records are re-verified: exit, memory, pin, slugJsonl, tools, and pairs/verdicts shas (score-bench.mjs:14-29).
- The join (:32-50) checks:
  - unique keys = 84 per file;
  - the key set equals the pairs keys;
  - rep == file number;
  - both graders present;
  - no (arm, id, rep) appears twice;
  - every cell is filled and every grade is valid.
- **C (low):** score-bench.mjs:58-64 reads `runs/*.json` but does not compare them with `keyhold/build-record-b1.json` `runSha12`, which export-blind writes at :72.
  - A run file edited or resumed after the export would feed the L/S/C bars different answers from the ones graded.
  - Fix: refuse unless each run's sha12 equals the record.

## (5) Routing replay
- **Deadline: correct.** classify.mjs:118 makes `fwAt > 2000` LATE, the same as routerArbiter.ts:208 `d.firstWordAt > deadline` with DECIDE_MS = 2000 (:32).
- **Decider: correct.** The decider is the first turn whose `completeFirstWord` is non-null, as at arbiter :133.
- **System composition: identical.** B0 is `${instr}\n\n${ctx}\n\n${block}` (common.mjs:229), the same as `buildRouterSystem` (LiveRouterSession.ts:12). The two arms differ only in the instruction and block shas, which are checked (common.mjs:225-226, :239-240).
- **The gate truly blocks.** run.mjs:40-45 refuses B1 and V, smoke included, unless B0-r1 exists, is not fake, partial or stopped, has the exact roster ids, and routed ≥2 of RH04/05/07/08 EASY.
  - The guard also needs the gate (score-routing.mjs:60).
  - B0 cannot be overwritten (run.mjs:26). Deleting it and re-running ("gate shopping") is blocked only by procedure.
- **Rosters.** scenario50 is S1+S2 only (40 items, all keyed HARD; common.mjs:176-178). holdout40 cannot be reached: loadRoster throws on any other name (:180).
- **Session resumption cannot change a decision.**
  - Reconnects happen only BETWEEN items (engine.mjs:108-113), with the same system carried by the resumption handle.
  - A cut item is replayed once and its first attempt is relabelled `~a1` (:115-124). The model may then have heard that item's prefix twice. This is the same in every arm and recorded in `cutAttempts`.
  - Residual: text that arrives after an item's 2 s quiet close is booked to the next item at negative t (engine.mjs:73, 104). It could then decide that item before Q. This is rare and arm-neutral, but it is not excluded.
- **A (must fix before any routing run):** `runProblems` (score-routing.mjs:102-111) and therefore `gateProblem` (run.mjs:42) never read `run.shas`. Add checks for:
  - B0 = OLD e29bf3810128/e11c240063ea;
  - B1 and V = NEW 79ad0f464d95/3a1da134e4c7;
  - `shas.ctx` IDENTICAL across B0, B1r1, B1r2 and V (and equal to the registered or ruled context sha);
  - `model === 'gemini-3.8-live'`.
  - Today, nothing would catch a B1 flown on another context or instruction. This becomes the main guarantee under (6).
- **B (fix or rule before scoring):** R4 (score-routing.mjs:45-47) counts `garbled` on LATE items too, because classify.mjs:117-118 sets garbled before the LATE return.
  - SPEC:97 says garbled tokens "shown". A LATE item goes to the pipeline and is not shown, so R4 can FAIL on a token the user never sees.
  - Fix: count garbled only where `cls === 'HARD'` (on time), and report LATE-garbled separately.

## (6) The context blocker: a substitute is VALID FOR THE COMPARISON, under conditions
Ruling: one fixed substitute context, used for B0, B1 and V alike, keeps OLD-vs-NEW a valid paired comparison. The instruction is still the only variable. The calibration gate is what licenses it: if B0 on the substitute reproduces ≥2 of r1's 4 misroutes, the substitute shows the failure that the NEW instruction must fix. If the gate fails, nothing is claimed, which is the same rule as SPEC:88-91.

Conditions:
1. The user rules on it, and it is recorded as a spec amendment. SPEC:73 and :404 forbid silent substitution.
2. The context is ONE fixed byte string, with its sha recorded and enforced identical across all four runs (fix A). `loadContext` takes the ruled sha as its `expect`; it is not deleted.
3. The context has the same shape as the real one: a short resume/JD summary of about 266 chars.
   - **Caution:** L20d's "CONTEXT" is the answer pipeline's per-pair `CONTEXT:` block, cut from each captured user prompt (l20d/run.mjs:39). It is not the router's 266-char context. It differs per item and is probably far longer.
   - Using it per item adds a second variable. Using one of them adds an unrepresentative length.
   - Prefer the real resume file through context-from-profile.mjs. Failing that, use a fixed 266-char-class summary written once and sha-pinned.

What it cannot show:
- The absolute rates under the user's real context. R1, R2 and R3 were registered against r1's 4/27 baseline, which was flown on b2a43a2159a2.
- The context × instruction interaction. Whether a question about the candidate's own experience routes HARD depends on what the context says; scenario50's HARD rationale (SPEC:96) leans on "refers to context".
- On a gate failure, whether the cause is the context or the model.
- Only the app smoke on the real context closes this (SPEC:403), and it runs on live40, the tuning set.

## Not checked
- The F_R launcher internals (memory detection, the launchAttempt error path).
- cal-*/mutants-* were not re-run.
- run-bench's runner retry semantics beyond the preflight.
- heard-words.json contents.
