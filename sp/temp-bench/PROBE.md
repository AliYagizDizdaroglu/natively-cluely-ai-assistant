# Temperature probe, 2026-10-02 evening (exploratory; decides nothing)

User: "run the probe now on both models and lets compare with our prior data on performance and latency".
Docs (ai.google.dev gemini-3, whats-new-gemini-3.5): for all Gemini 3.x, do not set temperature (default 1.0);
lower values risk looping / degraded reasoning. The app sends 0.4 on every hands-free answer (LLMHelper.ts:3268,
streamWithGeminiModel, both hedge legs); the offline harness too (interview60.answers.mjs:121, :214).

- Items fixed BEFORE any call (`select.mjs` → `items.json`): s50m captured prompts (pre-cue), failed = prior twins
  acceptable ≤ 3/6 (7 items: S2Q02, S2Q06F, S2Q07F, S1Q02, S1Q04F, S2Q02F, S2Q10F), control = first 2 with 6/6
  (S1Q01F, S1Q02F). Not holdout40 (never tuned on).
- Arms: T04 = temperature 0.4 (shipped) vs TDEF = no temperature. Legs: 3.5-lite thinking HIGH, 3.1-lite thinking LOW.
  3 reps; interleaved per pair, 1.5 s pause (`run.mjs`); 108 calls.
- Prior: s50m's 0.4 twins (P04, 2026-09-22) for the same items, added to the SAME blind files so one grader judges all
  three sets (s50m's own grades were claude-opus-5; tonight's are opus 5.5).
- Grading: frozen grader prompt (interview60.grader-prompt.md), h40d's dispatch text, 2 Opus graders per file, 3 files,
  keys moved out first (`move-keys.mjs`). Read with `analyze.mjs`.
- Loop flag calibrated: normal 1, a sentence repeated twice 2, four times 4 (threshold ≥ 3).
- Limits: 9 items × 3 reps is a direction, not a decision; failed items were chosen for failing (regression to the
  mean affects T04-vs-P04, not T04-vs-TDEF); the Sunday pre-registered bench decides.
