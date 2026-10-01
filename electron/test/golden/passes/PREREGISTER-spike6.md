# Spike 6: how the CUE_RULE wording is chosen (written 2026-09-30 08:29, before spike 6's calls)

Times-only correction, 08:52 (before any counted call): this header first said "~08:50"; the file's mtime was 08:29:36.
The rule below is unchanged.

Times-only correction, 10:33 (after spike 6's calls; no rule text touched): the Addendum header below says 09:25, but
this file's mtime before this edit was 09:21:40, so the addendum was written by 09:21, still before any counted call
(spike 6's counted calls began at 10:04). (This note itself first said "10:36"; the edit was saved at 10:33:54.
Corrected 11:19.)

This file's mtime predates every spike-6 call that counts (the 10:03 runs on both models; the 25 calls cut by the
quota at 08:16 are discarded). The rule is not changed after the data exists. (True of the rule text: the last edit
that touched it was saved at 09:21:40. The file's mtime has moved since, with the times-only notes above.)

Arms (verbatim in make-spike6.mjs): `cap3-min` (spike 3), `strict-ex` (spike 4), `one-first` (new: cap first, answer
first + the Tabs/Spaces example, "A one-part question gets exactly one line", only the question's parts, grouping).
Material: X1-X6 simple (invented, holdout-checked), M1 medium, S1Q09 + S1Q07 complex, 4 reps, 3.1-lite LOW and 3.5-lite
HIGH, each inside the smoke's real captured call.

1. **Disqualified** on either model if: complex blocks over 3 lines > 2 of 8 (the display cap would drop a named
   part); or S1Q09 services p50 < 5 (grouping went generic); or empty simple blocks > 2 of 24.
2. **Primary** (the user's concern, on the front model): 3.5-lite's `one-line-answer` count on simple questions — one
   non-empty line whose FIRST line carries the direct answer (TERMS in spike6.mjs, checked by check-terms.mjs).
3. **Ties** (primary within 2 of the best): higher `answer-first` summed over both models; then fewer simple cue
   words p50 on 3.5-lite; then `strict-ex`.
4. If every arm is disqualified: no wording is chosen from this spike; the spec says so and keeps the best-guarding
   arm with the failure named as a residual risk for the bench.

Whatever wins, 3.1-lite's own scaling is REPORTED beside it (it has not scaled down under any wording so far:
one-line 0/18 and 1/18 in spike 3), because the re-smoke on the whole-turn branch answers with 3.1-lite only.

## Addendum, 09:25 (before any counted call; Opus spec review findings 6 and 18)

5. **Empty blocks.** An "empty block" is an answer WITH text but no cue lines (every empty block in spikes 2-4 was
   the model skipping the block and answering directly). A response with no text at all is a model/transport
   failure: reported by name, not counted as empty. Besides item 1, an arm is **disqualified** when 3.5-lite HIGH
   has more than 1 empty block over all its 36 calls. Reason: the re-smoke fails on any absent block, and it will
   answer on 3.5-lite HIGH (the merged build's front leg, per the review's finding 1); at 1 in 36 the chance of at
   least one absent block in 20 answers is already about 43%.
6. **Ties** (item 3) take a new FIRST key: fewest empty blocks summed over both models; then item 3's keys.
7. **Every arm disqualified** (item 4, made exact): the "best-guarding arm" is the one with the fewest complex
   blocks over 3 lines summed over both models; then the fewest empty blocks summed over both models; then strict-ex.
