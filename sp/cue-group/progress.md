# Cue mode v2 "small cues" — controller ledger (spec/plan phase; the SDD ledger starts when the plan executes)

- 2026-09-30 08:10 spike 5 done (3.5-lite): complex over-3 1/8; simple one-line 4/24 (worse than cap3-min 11/18, strict-ex 7/18).
- 08:16 spike 6 on 3.5 cut by the free-tier quota after 25 calls; log kept as spike6-35-partial-quota.run.log; discarded.
- 08:29 SPIKE6-RULE.md written BEFORE spike 6's counted calls (selection rule for the wording; header time corrected 08:52, times only). check-terms.mjs: TERMS CHECK OK (18 known cases).
- ~08:31 Fable dispatched (spec delta + plan, working wording one-first): agent a1945f77640b7cfa0. Output files:
  WT docs/superpowers/specs/2026-09-30-cue-mode-small-cues.md, WT docs/superpowers/plans/2026-09-30-cue-mode-small-cues.md.
- NEXT: 10:03 cron runs spike 6 on both models -> apply SPIKE6-RULE.md -> SendMessage the winner to the Fable agent -> Opus spec review.
- 08:50 Fable DONE (spec 335 lines, plan 667 lines: Tasks 1-3 Sonnet + Task 4 operator). Working wording one-first in CUE_SHAPE_RULE; trimCues in verbalStreamFilter.ts; log '[Answer] cues trimmed: {rawLines,dropped,cut}' BEFORE '[Answer] cues: [displayed]'; metrics cueBlocks.trimmed reported not gated. Open: bench wellformed threshold (Fable: gate lines 90%, report words).
- 08:55 Opus spec+plan review dispatched: agent a6710b01ead13ccd3, brief spec-review-brief.md, output spec-review.md. Controller-spotted: spec 3.5.5 INDEX claim (offline records get no INDEX row); spec 8 launcher deadline now 18:30.
- 09:27 Opus review DONE (spec-review.md): READY after fixes; 0 Critical, 7 Important, 11 Minor.
- 09:21 SPIKE6-RULE addendum (review 6 + 18): empty-block disqualifier (>1 of 36 on 3.5-lite), empties first tie key, the all-disqualified branch made exact. Before any counted call.
- Ruling (review 1+2): merge MAIN's line INTO feat/whole-turn-answers NOW (M1), then v2 on the merged code, then build + re-smoke + bench on the merged program -- so the gates test what merges; Thursday = fast-forward (+ the post-br1 docs commit merged in). Cost if wrong: a bad resolution delays v2 ~1 h; fallback = v2 on fd57512 and merge after br1 (M2).
- Verified before acting: finding 7 (typed chat path sends VERBAL_WHAT_TO_ANSWER_PROMPT with CUE_RULE; nothing strips __CUES__ on that path; src/ has no handling) = REAL; empty blocks in spikes 2-4 = the model skipping the block (5) + one empty raw (1).
- ~09:24 merge resolver dispatched (sonnet): agent a57c70212f04cffb3, brief merge-brief.md, report merge-report.md; dry merge = 8 files, 21 hunks; 9 twin commit pairs; WhatToAnswerLLM hunks = MAIN's hedge-winner lines. Hard stop 13:20 (br1).
- 09:45 MERGE COMMITTED 279103b (parents fd57512 + 0ef42a0), DONE_WITH_CONCERNS: suite 979 passed / 8 skipped / 0 failed (99 files; before 804/6/0 of 89); tsc root 0, electron 6 byte-identical; the 17 two-sided auto-merged files checked for silent duplicates; hedge x cues stubbed test 7/7 incl. a mutant. Concern 1: flight captured-no-cues twins on 3.1-lite LOW while the hour answers on 3.5-lite HIGH first -> the validation hour's pre-registration. dist-electron is STALE (pre-merge).
- 09:48 Opus merge review dispatched: agent af9125f33b621821d, brief merge-review-brief.md, output merge-review.md.
- 09:49 Fable resumed for revision 1 (fable-revision-1.md: rulings on all 18 findings; new typed-path task; line refresh on 279103b; br1 window 13:25-14:50 = no tests/builds). Wording stays one-first until spike 6's winner is sent.
- 10:03 Fable revision 1 DONE (typed path = new Task 4: VERBAL_TYPED_PROMPT + VERBAL_WHAT_TO_ANSWER_PROMPT = typed + CUE_RULE; ipcHandlers 16/544/557; a source-text pin test ipcHandlers.typedPrompt.test.ts; cleaned field in trimCues; all lines at 279103b; operator task is now Task 5).
- 10:04 spike 6 STARTED by hand on both models (cron 363e6d1d deleted to avoid a duplicate): logs spike6-31.run.log, spike6-35.run.log (bg ids bkd5g9gml, b9sjdpnvp).
- 10:04 scoped Opus re-review of spec+plan rev 1 dispatched: agent a8f5d9225218d1a16, brief spec-rereview-brief.md, output spec-rereview.md (wording swap checked separately after spike 6).
