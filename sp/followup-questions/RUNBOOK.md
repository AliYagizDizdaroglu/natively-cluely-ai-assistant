# Thursday 2026-10-01 — earlier-question context replay (runbook)

Pre-registration: `SP\followup-context\PREREGISTER-followup-questions.md` (also MAIN `electron/test/golden/passes/`).
Every command's output is appended to `SP\followup-questions\run.log` (§9 keeps it). Run after 10:00 local,
BEFORE cue mode is merged into MAIN (§6 item 2), on a day with no flight and no cue bench (§8).

Prepared and checked 2026-09-30 (Wednesday), before any model call:
- `scripts/followup-questions-run.mjs --dry-run`: 96 calls, A first in 24 pairs and B first in 24; the material's two
  hashes OK; filter `dist-electron/electron/llm/verbalStreamFilter.js` sha256/12 `d8fee6ca0170` (MAIN at 0ef42a0).
- `scripts/check-grader-questions.mjs`: 16 grader questions as §3/§3b/§5 say; instrument `8564ba96369a` = pre-registered.
- `scripts/followup-questions-decide-calibrate.mjs`: CALIBRATION OK (every §7 branch and edge);
  `scripts/mutate-decide.mjs`: all 13 mutants caught; `scripts/e2e-synthetic.mjs`: E2E OK (the file seams).
- §6 item 2 early run: `followup-replay-build.mjs --calibrate` on s50m = CALIBRATION OK 39/39; REPLAY_BREAK=1 = MISMATCH 39/39.

## Preconditions (§6), in order, into run.log
1. Model row (§4): h40c PASS (2026-09-29) → `gemini-3.5-flash-lite`, thinkingLevel HIGH. Write that line into run.log.
2. `node "<MAIN>/electron/test/golden/passes/2026-09-26-followup-replay/scripts/followup-replay-build.mjs" "<MAIN>/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m" "<SP>/followup-questions/cal" --calibrate` → `CALIBRATION OK 39/39`;
   the same with `REPLAY_BREAK=1` → `CALIBRATION MISMATCH 39/39`. If the filter sha is no longer `d8fee6ca0170`, say why before calling.
3. In `SP\followup-context`: `node stamp.mjs` → `ARMS OK`, `PARITY FIXTURE OK: 48 entries …`, `fixture check fails on a corrupted input: OK`, the four sha256 of §2.
4. `node scripts/followup-questions-decide-calibrate.mjs` → `CALIBRATION OK`.
5. `node <SP>/quota-ledger-today.mjs 2026-10-01T07:00:00.000Z` → at least 150 headroom on gemini-3.5-flash-lite.
6. `node scripts/followup-questions-run.mjs --dry-run` (the order is part of the record).

## Run
7. `node scripts/followup-questions-run.mjs` (≈ 96 calls, ~15-25 min; resumable). Transients are retried 4 times and never scored.
8. `node scripts/followup-questions-blind.mjs` → `blind/pairs.blind-{1..4}.json` + keys; names untested/emptied answers.
9. Graders: 8 Opus agents (model `opus`), two per file, each handed `MAIN/electron/test/golden/interview60.grader-prompt.md`
   VERBATIM with `<PAIRS_FILE>` = `blind/pairs.blind-N.json`, `<VERDICTS_FILE>` = `blind/verdicts.blind-N.g1.json` / `.g2.json`.
   Never show a grader a key file. Record each agent's model from its transcript (`subagents/agent-<id>.jsonl` "model")
   in `blind/graders.json`; every one must be `claude-opus-5-5` or the run is reported, not decided.
10. `node scripts/followup-questions-decide.mjs` → `RESULT.txt` (verbatim).

## After
11. Result note `passes/<date>-followup-questions-result.md`: §7 verbatim, per-item Y/w/o/X tables (roster, callbacks,
    dropped-parent), grader ids + stamp, quota line, pre-registration mtime. Evidence folder per §9 into
    `passes/2026-10-01-followup-questions/` (offline record: no INDEX row; INDEX.md is regenerated from flights only).
12. §10: PASS → build behind `NATIVELY_EARLIER_QUESTIONS` (TDD, parity test) after h40c; FAIL → never built;
    INCONCLUSIVE → the ONE pooled s50l re-run (new gate list recorded before its calls; `decide(..., { pooled: true })`).
