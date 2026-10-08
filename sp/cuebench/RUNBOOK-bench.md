# RUNBOOK: the cue bench and the simple-question probe (written 2026-10-01 01:33, before any bench call)

Rules: `SP\PREREGISTER-cuebench.md` (with its two amendments) and `WT\...\passes\PREREGISTER-cueprobe.md`.
Paths:
- WT = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn`
- MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`
- SP = the scratchpad
- CB = `SP\cuebench`
- RUN = MAIN `electron\test\golden\interview60.runs\2026-09-22T08-22-50-s50m`

## 0. Preconditions (print each)
1. The 05:00 re-smoke PASSED all three conditions (`RUNBOOK-resmoke2.md` §9), and its task has ended (no
   `Natively-*` task Running).
2. **Which quota day** (runbook §10, 01:28 refinement):
   - Before 09:00, run the precise ledger for the 2026-09-30 quota day (starts `2026-09-30T07:00:00.000Z`). Count
     3.5-lite requests:
     - hedge `verbal hedge: front=gemini-3.5-flash-lite` lines and `Warming up gemini-3.5-flash-lite` lines since
       07:00Z, in MAIN `natively_debug.log` and WT `natively_debug.log` (the 05:00 run's lines included);
     - plus the 108 spike-6 records (`cue-group\spike6-2026-09-30T07-04-05-912Z.json`);
     - plus the gate probes in both launcher logs.
   - At 01:30 the count was 43 (br1) + 26 (v2 re-smoke) + 108 (spike 6) = 177, before the 05:00 run.
   - Also print `node SP\quota-ledger-today.mjs 2026-09-30T07:00:00.000Z`: its mention count is an upper bound, about
     9 lines per request, and is recorded, not used.
   - Headroom = 500 − used.
     - ≥ 150 and the first call before 09:00: the bench runs now, on the 2026-09-30 quota day.
     - Otherwise it waits for 10:00 (the 2026-10-01 quota day: headroom 500 by construction, printed anyway), and the
       follow-up replay moves to Saturday.
3. `node CB\list-captured-ids.mjs --count` → `39`. `node CB\list-captured-ids.mjs` → `<IDS>` (ids only).
4. The dist is still the proven combined build: `node SP\dist-proof.mjs --expect combined …` as in RUNBOOK-resmoke2 §4,
   the same filter sha as the 05:00 run's second proof.

## 1. Three cue reps (from WT; cwd WT)
For R in r1 r2 r3, one at a time, with `NATIVELY_ROSTER=scenario50` and `NATIVELY_SCENARIOS=S1,S2` in the environment:
```
node SP\run-with-main-env.mjs electron/test/golden/interview60.answers.mjs --model gemini-3.5-flash-lite --thinking HIGH --captured "<RUN>\interview60.prompts.json" --only "<IDS>" --cues --tag cues-<R>
```
- Expect the startup line `cues=inserted into the captured prompt`.
- Expect `electron/test/golden/interview60.answers.gemini-3.5-flash-lite_cues-<R>.json` in WT.
- Count the `transientError` entries per rep.
- Never print a key; never read the captured prompts.

## 2. Blind pairs, keys out of reach
```
node CB\cuebench-pairs.mjs --cue-dir "<WT>\electron\test\golden" --dry
node CB\cuebench-pairs.mjs --cue-dir "<WT>\electron\test\golden"
```
- This writes `CB\blind\pairs.r{1,2,3}.h{1,2}.json` and `key.r*.h*.json`.
- Move every `key.*.json` to `SP\cuebench-keyhold\` BEFORE any grader is dispatched (§2: the key is out of every
  grader's reach). Move them back only after the last verdict file exists.

## 3. Twelve graders (two per pairs file)
- Dispatch text: `SP\h40c-grader-dispatch.txt`, the block after `----- dispatch text`, verbatim. The frozen instrument
  is MAIN `interview60.grader-prompt.md`, stamp 8564ba96369a (cuebench-pairs refuses any other). Substitute:
  - `<PAIRS_FILE>` = `CB\blind\pairs.r<r>.h<h>.json`
  - `VERDICTS` = `CB\blind\verdicts.r<r>.h<h>.g<g>.json`
  - `TAG` = `bench r<r> h<h> g<g>`
- Model `opus`. Afterwards, read each transcript's model field and require `claude-opus-5-5`, adapting
  `SP\h40c-grader-models.mjs`. A grader on any other model is re-run; its verdicts are not used.

## 4. Score
- Move the keys back.
- Run `node CB\cuebench-score.mjs --cue-dir "<WT>\electron\test\golden"`. It is calibrated by
  `cuebench-calibrate.mjs`; re-run that first and require its known outputs (`cuebench-calibrate.combined.out.txt`).
- The decision is exactly the printed `benchDecide` verdict: band, wrong, cue checks at ≥ 90% per rep (lines gated,
  words reported), TTFT reported.

## 5. The probe (reported, never gating)
- Order: after the bench, unless the ledger showed ≥ 202 headroom when the bench started (amendment 3b).
- On the 2026-09-30 quota day it runs only if its 52 calls per model still fit before 10:00. Otherwise it runs after
  10:00, finished before the follow-up replay's first call; never overlapping.
- Steps:
  1. `node electron/test/golden/interview60.prompts.mjs <re-smoke run dir>` (builds that run's
     `interview60.prompts.json`).
  2. `node SP\run-with-main-env.mjs SP\cue-group\probe-shipped.mjs --run <re-smoke run dir>`. It refuses unless every
     prompt carries the dist's CUE_SHAPE_RULE.
- This also serves Friday's pre-hour check that `hasCueRule()` reads true on a cue-build prompts file (the h40d
  review).

## 6. Records
In WT `passes/`:
- `2026-10-01-cuebench-result.md`: the decision, the six counts, the check rates, the quota-day reading and the
  ledger lines, the grader models, and the holes;
- `2026-10-01-cueprobe-result.md`;
- the pre-registrations' copies as they stand.

One docs commit in WT (named paths; INDEX.md restored). Then the merge path in `RUNBOOK-resmoke2.md` §10.
