SUPERSEDED by AMENDMENT-s50l.fable.md (2026-10-02 23:18). Kept as the draft of record; it governs nothing.

# Amendment to PREREGISTER-followup-questions.md for the ONE pooled s50l re-run

Written 2026-10-02 22:45–23:00 local, BEFORE any s50l model call (no s50l answer file exists). Revised after the Opus
prep review (`PREP-REVIEW.md`, READY WITH FIXES, 0 C / 6 I / 8 M). The registration itself is unchanged (sha256
`cc127dab401a45aa9002a5423853312564e55e190c76ea8d4796e8a70ffa8ca1`). The user asked for the re-run on Saturday 3 Oct
(AGENDA 22:41 Fri).

## What was known when this was written (review I2)

Thursday's per-item verdicts (RESULT.txt, `2026-10-01-followup-questions-result.md`) and Friday's deep dive
(`followup-deepdive/FINDINGS.md`), which names a selection bug on S2Q09F (the selector inserts an older question when the
parent is still in the window) and an off-topic class on S2Q05F (the block makes the model re-answer the coding parent).
**The reference implementation is run AS REGISTERED, bug included: nothing in the design is fixed inside the re-run**;
a fix is a new registration (§10).

## A1. Two callback slots carry a Live-listener block on s50l: excluded by name, never moved

§3 defines a callback slot as a real slot without a Live block (PREREGISTER lines 83-84); §7 fixes the slot ids; the
frozen builder refuses a slot with a Live block ("has a live block; pick another slot"). On s50l, S1Q09F (C1) and
S2Q06F (C6) carry one (`gate-report-s50l.out.txt`). The rule followed: **run the frozen builder; exclude by name only
what it refuses.** C1 and C6 are excluded on s50l; C2–C5 run (each selects its reference question, 17–34 min back).
Effect: s50l has 12 callback pairs instead of 18. It does not touch the 42 roster pairs (clause 5). In clauses 1–2 it
removes pairs from both arms alike; on Thursday C1 read A ooo / B YYY, so dropping it removes a cushion that favoured
B in clause 2 (the exclusion leans conservative).

## A2 (WITHDRAWN after review I1). The dropped-parent cases ARE rebuilt on s50l

The first draft left §3b's three dropped-parent cases out of the re-run. That broke A1's own principle. Section 6 of the
frozen builder now runs unmodified on s50l, and a case it refuses would be excluded by name. **None was refused**: D1
(S1Q06F, stand-in S1Q05F, 245 s), D2 (S2Q05F, stand-in S2Q04F, 245 s), D3 (S2Q08F, stand-in S2Q07F, 236 s), all past
the 180 s guard.

## The re-run's material, recorded before any call (review M3)

- s50l gate list: roster S1Q04F S1Q06F S1Q08 S2Q05F S2Q08 S2Q08F S2Q09F (the same seven as s50m); callbacks C2 C3 C4
  C5; dropped D1 D2 D3; 14 items, 84 calls, interleaved (A first 21, B first 21).
- `s50l-gated.json` sha256 `bfbf1e24ddd4a6a53173f0cc2ce119a851e6d30e41ef9cc314967b51793d889b` (pinned in common.mjs).
- Generated builder `gate-report-s50l.mjs` `b4472648606056e643afa34d9b30e22797295f501e2475705da2c28bed1f68f2`, from
  `make-gate-report-s50l.mjs` `3b8289104a87ae725a0b9be9a57f63e75b6bb9c4665c4a506535d6906a9335ea`; scripts from
  `make-fq-s50l.mjs` `f4695b7e5b2e26d0a60abd140f177ee25531488c5757c0506192d9ccd71e8ea7`; `pooled-decide.mjs`
  `7229aa8df71fd3cb296de96a5af9593425b294cad3b43c7bc49d6cc360fac68e`; `audit-graders.mjs`
  `ebaab94a5f26383e98e25e5d41e35092dff4798dfdf8880f6b2f0de39e747ae8`.
- Unchanged and verified: `earlierQuestions.ref.mjs` `0459f578…` (registered), `s50m-gated.json` `1aa4b3a5…`, parity
  fixture `f61c4607…`.
- **Expected pooled counts:** n = 47 (Thursday; C5 r1 incomplete) + 42 (s50l if complete) = 89; R = 42 → **PASS ≥ +8,
  FAIL ≤ +2** (Thursday banked +3, so s50l needs ≥ +5 of its own); clause 3c allows ceil(2n/39) = 5 more slow answers
  at n = 89 (4 at n ≤ 78). A second INCONCLUSIVE is a FAIL.

## The dist (review M4)

§6.2 names 0e1e8b2 as the fallback dist. The prep uses the snapshot `main-precue-73d7f01`, the exact dist Thursday ran
on (filter sha256/12 `d8fee6ca0170`, Thursday's dry-run line). On s50l its calibration reads `CALIBRATION OK 39/39`, and
`REPLAY_BREAK=1` reads `MISMATCH 39/39`. This is more faithful to Thursday than 0e1e8b2 would be.

## Residual risk, stated (review M6)

Grader agents auto-load the project's memory index, which names this experiment, Thursday's +3 and the bar. Thursday's
graders loaded it too, so the exposure is the same on both days. It is noted in the result.
