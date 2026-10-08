# After9 preparation ledger (user approved "go ahead with all of it, start with the arms", 2026-09-08)

Branch fix/coding-style-suffix-all-gemini, main checkout. Baseline after8 report 9b577e5; fixes 3b82953, bc68d1c, 5ea2d5c, c849f05.

Order (user: arms first):
1. [ ] Arms: Groq branch in interview60.answers.mjs (model ids with "/" → Groq OpenAI-compatible SSE), filename tag sanitises "/"; judge tag + flight answersFileFor use the same tag; ANSWER_MODELS += gemma-4-26b-a4b-it, qwen/qwen3.8-27b, openai/gpt-oss-120b. Probe 2 questions per new model first (think-tag leakage, 429 pacing). Run all four new arms standalone now, grade with Opus (grade-brief.md), compare to 3.1-flash-lite 50/52.
2. [ ] Roster: append 6–8 long system-design questions (40–70 words, multi-clause) with 2–3 follow-ups each, and 2–3 follow-ups after each coding cue; rebuild audio (build-audio-local.mjs); chains rubric for follow-ups. Keep the 52 intact (comparability); report new items as their own rows.
3. [ ] Mini-recording: play only the long questions into the live app (scheduled task, ~15 min) → how they partition.
4. [ ] Big-question assembly rule: prototype on the recording via replay-dedup.mjs (real class), then TDD.
5. [ ] Difficulty field in the detector JSON schema + log line (no routing unless an arm from step 1 qualifies as the hard bucket).
6. [ ] Cue-mode spike: derive a prompter cue from after8's 52 spoken answers client-side, grade offline; display-only strip if it reads well.
7. [ ] Prep notes draft from the recurring-gap list (M14 S3 throughput/pipe mode, M21 CloudFormation stacks, H09 drift reconciliation, M08 CUDA base images); user edits and pastes.
8. [ ] Warm-up trimming to the models in the route order.
9. [ ] Spec update (2026-09-07-after9-fixes-design.md §4 rows) + schedule after9 (task with -WorkingDirectory, free desktop, quota reset).

Decisions: provider inferred from the model id ("/" → Groq); Gemma ids stay on the Gemini endpoint; arm files named with "/"→"_".
