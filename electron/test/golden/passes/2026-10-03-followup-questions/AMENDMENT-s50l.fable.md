# Amendment (authoritative) to PREREGISTER-followup-questions.md for the ONE pooled s50l re-run

Written 2026-10-02 by the spec author (Fable); this file's mtime is its timestamp. BEFORE any s50l model call:
`followup-questions-s50l/` holds no `interview60.answers.*` file. It supersedes the draft `AMENDMENT-s50l.md`; the runbook's "Rule:" line reads
against THIS file. The registration is unchanged: sha256 `cc127dab401a45aa9002a5423853312564e55e190c76ea8d4796e8a70ffa8ca1`,
22,704 bytes, mtime 2026-09-28 21:36:02 (re-hashed tonight). Every number below was re-read from the files named.
Revised 2026-10-02 23:19 after AMENDMENT-REVIEW.md (Opus, APPROVE WITH FIXES): I1, I2, M1-M6.

## 0. What was known when this was written

1. Thursday's per-item verdicts (`followup-questions/RESULT.txt`, `2026-10-01-followup-questions-result.md`): n = 47
   (C5#1 incomplete, B 503 after four retries), R = 21, clauses 1-4 hold, clause 5 Δ = 13 − 10 = +3 → INCONCLUSIVE.
   Per item: S1Q04F and S1Q06F www→YYY; S2Q09F YYY→wwY; S2Q05F Yoo→ooo; C1 ooo→YYY; D1 www→www.
2. Friday's deep dive (`followup-deepdive/FINDINGS.md`): the S2Q09F SELECTION BUG (its parent was still in the window,
   so the selector skipped it and inserted the older S2Q08F question) and the S2Q05F RE-ANSWER class (the correct
   parent block made the model re-answer the coding parent).
3. Consequence: the reference implementation runs AS REGISTERED, bug included. On s50l the S2Q09F block is again the
   S2Q08F question (`gate-report-s50l.out.txt:225-228`). Nothing in the gate, selector, caps or label is changed:
   PREREGISTER `:53-55` makes any such change a new registration, and §10 `:267-268` says a fix follows a verdict.
4. Because the direction of every item is known, this amendment changes no input byte and adds no rule; it only
   applies the registration's own refusals by name and records s50l's material. No amendment touches the 42 pooled
   roster pairs that decide clause 5.

## A1. Callbacks C1 and C6 are excluded on s50l by name, never moved — the draft's A1, KEPT

5. Registration text. §3 `:83-84`: a callback's arm A is "the captured prompt of a real slot (an id without a Live
   block)". §7 `:229`: the re-run places "the six callbacks … at the same slot ids". The frozen builder enforces
   §3: `gate-report.mjs:177` throws "`<slot> has a live block; pick another slot`".
6. Fact on s50l: slots S1Q09F (C1) and S2Q06F (C6) carry a Live-listener block. This was OBSERVED, not asserted: the
   generated builder tests the same marker and prints EXCLUDED only when it is present (`gate-report-s50l.mjs:182`;
   `gate-report-s50l.out.txt:283,310`). C2-C5 build normally: `refSelected=yes`, 17.1/18.5/33.6/19.5 min back (`:285-303`).
7. Why exclusion and not the alternatives. The two registered requirements (5) cannot both hold for C1 and C6 on s50l.
   (a) Moving them to another slot breaks §7's "same slot ids", and a slot chosen tonight is chosen after Thursday's
   verdicts. (b) Running them with the Live block in breaks §3's definition: a Live paraphrase of the slot's ORIGINAL
   question would sit in both arms of a prompt whose pinned question is a different one, and the hashed builder would
   have to be edited. (c) Exclusion changes no byte of any prompt that runs and is the builder's own refusal applied by
   name. It is a reading, not a renegotiation: the callbacks are descriptive (§3 `:109-111`) and the 12 remaining
   callback pairs are reported as registered.
8. Effect on §7. Clause 5: none (callbacks never enter the gain count, `:111`); the roster pairs stay 21 + 21 = 42.
   Clauses 1-2 (`:199-203`, over ALL pairs): 6 fewer pairs on both arms. For information only: Thursday's C1 read
   A ooo / B YYY and C6 YYY / YYY, so the removed pairs would, if anything, have added off-topic to A — the exclusion
   does not favour B on clause 2. Clauses 3a/3b/4 (medians and a p90 over all pairs): on s50m the C1 and C6 blocks
   were two of the heavier ones (562 and 613 chars; s50l's were never built), so A1 is EXPECTED to lean very slightly
   toward B on 3a, 3b and 4, and (by Thursday's reads) against B on clause 2 — an expectation, not a necessity; 6 of
   ~89 pairs, inside the registered noise (TTFT `:211-216`, words `:218-219`). Clause 3c: counted over the remaining
   pairs, allowance ceil(2n/39) on the pooled n (item 19).
9. Thursday's per-item results are cited in 8 as information about direction; the justification is 5-7 alone.

## A2 (WITHDRAWN). The dropped-parent cases D1-D3 run on s50l as registered

10. Registration text: §3b `:113-136`; §7 `:199-203` counts them in clauses 1 and 2 "callbacks and dropped-parent cases
    included". The draft's first version left them out; the review (I1) showed that broke A1's principle. Section 6 of
    the frozen builder ran UNMODIFIED on s50l (the generator only wraps it so a refusal is named instead of aborting,
    `make-gate-report-s50l.mjs:27-39`). None refused: stand-ins S1Q05F 245 s, S2Q04F 245 s, S2Q07F 236 s before the
    follow-up, all past the 180 s guard; `withoutPreview` accepted each (`gate-report-s50l.out.txt:314-325`).
    Effect on §7: none — this is the registered content; they do not enter clause 5 (`:136`).

## A3. The s50l material, recorded before any call (§7 `:228-230`: "recorded BEFORE its calls")

11. Gate list over s50l's 39 captured pinned questions: `S1Q04F S1Q06F S1Q08 S2Q05F S2Q08 S2Q08F S2Q09F` — the same
    seven as s50m; S2Q01F fires with nothing to add; 32 ids byte-identical, neither generated nor graded
    (`gate-report-s50l.out.txt:189-191`).
12. Items 14: the 7 roster + C2 C3 C4 C5 + D1 D2 D3 (`scripts/common.mjs:24`). 84 calls, interleaved by `(i + rep) % 2`
    (§4 `:155-158`): A first in 21 pairs, B first in 21. Blind files 4 (4+4+4+2), graders 2 × 4 = 8 Opus.
13. "Same reference files, same hashes" (`:228-229`): the selector is the SAME file, `earlierQuestions.ref.mjs`
    `0459f578e47706424df0c41684a46c041fa52109923c1eb25df1c484d0dda256`, imported unchanged (`gate-report.mjs:12`). The
    report script `gate-report.mjs` (`b23b9219…`, hard-coded to s50m's run path and output names) cannot run on s50l
    as is, so a copy is generated by exact-anchor swaps: run path, two labels, the A1 branch (6), the output names,
    the section-6 wrapper (10). Recorded: `gate-report-s50l.mjs`
    `b4472648606056e643afa34d9b30e22797295f501e2475705da2c28bed1f68f2`; `make-gate-report-s50l.mjs`
    `3b8289104a87ae725a0b9be9a57f63e75b6bb9c4665c4a506535d6906a9335ea`; `make-fq-s50l.mjs` (SP root)
    `f4695b7e5b2e26d0a60abd140f177ee25531488c5757c0506192d9ccd71e8ea7`; `pooled-decide.mjs`
    `7229aa8df71fd3cb296de96a5af9593425b294cad3b43c7bc49d6cc360fac68e`; `audit-graders.mjs`
    `ebaab94a5f26383e98e25e5d41e35092dff4798dfdf8880f6b2f0de39e747ae8` (all re-hashed tonight).
14. Material: `followup-context/s50l-gated.json` sha256
    `bfbf1e24ddd4a6a53173f0cc2ce119a851e6d30e41ef9cc314967b51793d889b`, 383,533 bytes, pinned in `common.mjs:17`;
    `followup-context/s50l-parity-fixture.json` (NOT recorded by the draft) sha256
    `fe0dc50d651156fb31a96f457c16cadb4bce1aae8ba682f6d116f8f42aa2e5aa`, 311,462 bytes, 46 entries (14 with a block,
    32 empty). The registered s50m files are untouched: `s50m-gated.json` `1aa4b3a5…`, `parity-fixture.json`
    `f61c4607…` (both re-hashed, equal §2).
15. Blocks: 9 of the 14 have the same sha12 as their s50m counterpart (identical STT of the parent); S2Q08
    `b6df1c5a0b43`/358, S2Q08F `ebac9c55d83e`/471, C3 `483a202d1bd9`/907, C5 `3753626255ad`/803, D2 `1fadda53555d`/296
    differ because the parent lines are s50l's own STT — exactly what "recomputed on s50l's captured prompts" means.
    userA on s50l against s50m, byte-compared (review I1, re-run tonight: ids, booleans and counts only):

    | userA on s50l vs s50m | items |
    |---|---|
    | identical | D1, D3 |
    | identical once the `PREVIOUS RESPONSES` preview (the app's own earlier answer) is set aside | S1Q04F, S1Q06F, S2Q08F, C3, C5 |
    | different transcript lines too (STT line splits or wording) | S1Q08, S2Q05F, S2Q08, S2Q09F, C2, C4, D2 |

    S1Q04F and S1Q06F, which produced all of Thursday's +6 (www→YYY), have the same window and the same block on
    s50l as on s50m (8a58894a5e5f, 03260be280dc); only their preview differs. So about half of s50l re-samples nearly
    the same prompts, including the two that carry the gain — the registration chose s50l, so no rule changes, but
    see item 26. The system prompt is identical on all 14 (review, verified).

## A4. The dist: Thursday's pre-cue snapshot, not 0e1e8b2

16. Registration text, §6.2 `:180-186`: the calibration runs before cue mode is merged, or is re-passed after; "if the
    merged build no longer reproduces the pre-cue prompts, run it against a dist compiled at 0e1e8b2"; "arm B's own
    bytes … never depend on `dist-electron`". The merged MAIN dist no longer reproduces them (Thursday's result note
    `:109-110`), so the fallback applies.
17. The prep uses `SP/dist-snapshots/main-precue-73d7f01` (SNAPSHOT.txt: copied from MAIN's `dist-electron`
    2026-10-01T11:45:14Z, 18 min after Thursday's last call; 910 files; `verbalStreamFilter.js` sha256/12
    `d8fee6ca0170` = Thursday's dry-run line; re-hashed tonight at the runner's exact path, 16,100 bytes). 73d7f01 is
    pre-cue by git (2b0906f, the cue HEAD, is not its ancestor) and descends from 0e1e8b2. On s50l it reads
    `CALIBRATION OK 39/39` and, with `REPLAY_BREAK=1`, `CALIBRATION MISMATCH 39/39` (`cal-ok/cal-break.out.txt`; the
    review re-ran both). The runner refuses any other filter (`followup-questions-run.mjs:38`).
18. Faithful because §6.2's own test is the criterion and it is met, and because the snapshot is the very bytes
    Thursday ran, so the same filter on both halves of the pool keeps the instrument constant across pooled pairs
    (`verbalStreamFilter.ts` is unchanged between 0e1e8b2 and 73d7f01: `git log 0e1e8b2..73d7f01 --
    electron/llm/verbalStreamFilter.ts` is empty; review M3, re-run tonight). No effect on any clause.

## 5. The pooled rule, restated (verified against `decide()`, `followup-questions-decide.mjs:52,62-68`)

19. Expected n = 47 + 42 = 89 if s50l completes; R = 42. Clause 5: PASS at Δ ≥ ceil(4·42/21) = +8, FAIL at
    Δ ≤ ceil(42/21) = +2 (§7 `:232-233`). With Thursday's +3 banked: s50l's own roster Δ ≥ +5 → PASS; ≤ −1 → FAIL;
    0 to +4 → a second INCONCLUSIVE, which §7 `:233` makes a FAIL. That +5 is clause 5 ONLY: the pooled outcome is
    PASS only when clauses 1, 2, 3a, 3b, 3c and 4 also hold (`:226`); an in-between reading on 3a, 3b or 4 is a second
    INCONCLUSIVE and so a FAIL (3b turns on a single stall). Clause 3c: ceil(2n/39) = 5 at n = 89 (4 at n ≤ 78).
    Clauses 1-2: pooled counts (Thursday wrong 0/0, off-topic A 9 / B 3 carry in). 3a/3b/4: pooled medians and p90.
    Additivity (pooled = Thursday + s50l on every count) is enforced before a decision prints (`pooled-decide.mjs:92-97`).
20. Model row (§4 `:140-145`): h40c PASS 2026-09-29 → `gemini-3.5-flash-lite`, thinkingLevel HIGH, temperature 0.4
    (`common.mjs:20-22`; Thursday's answer files carry the same model). Instrument stamp must read `8564ba96369a`.
21. An incomplete pair after the one pass is named and excluded, never re-called out of interleave (§4 `:152-153`,
    Thursday's C5#1 ruling; runbook 9).

## 6. Requirements of the registration the draft or runbook still omit

22. §9 `:249-256`: Thursday's evidence IS under `passes/`: `electron/test/golden/passes/2026-10-01-followup-questions/`
    (MANIFEST.txt, the registration, RESULT.txt, run.log, the 6 answer files, 4 pairs, 4 keys, 8 verdicts,
    graders.json, the cal/stamp/quota/dry-run outputs, parity-fixture.json) plus
    `passes/2026-10-01-followup-questions-result.md`, committed in adb25a8 on `fix/coding-style-suffix-all-gemini`
    (2026-10-01 16:43, 38 files; `git show --stat adb25a8`, re-run tonight); `main` does not carry it; prompts.A/B.json
    and s50m-gated.json were left out as profile-bearing, with their hashes in MANIFEST.txt. The s50l run lands as
    `electron/test/golden/passes/2026-10-03-followup-questions/` with: its own evidence and `run.log`; this amendment
    and the draft `AMENDMENT-s50l.md` marked superseded; `s50l-gated.json` and `s50l-parity-fixture.json` (note:
    `s50l-gated.json` carries the user's profile exactly as `s50m-gated.json` did, which adb25a8 left out with a hash
    in MANIFEST.txt — the controller decides file or hash); `RESULT-pooled.txt` and `RESULT-s50l-alone.txt`; the
    registration's recorded mtime (2026-09-28 21:36:02); a result note `passes/2026-10-03-followup-questions-result.md`
    and an INDEX line (the pass-records rule). Thursday's half is cited by adb25a8, not copied. Runbook 16 says
    "agenda + memory" only.
23. §7 "recorded BEFORE its calls": the run log must quote this file's mtime and sha256 beside the first answer file's
    mtime, so the order is on record, not asserted.
24. §6.3 for the s50l material: `stamp.mjs` re-derives s50m's 48 entries and CANNOT be pointed at the s50l files (it
    hard-codes the s50m file names and resolves them against the cwd, so runbook step 4 must run it with cwd =
    `followup-context`). `loadGated` (`scripts/common.mjs:34-49`) checks the gated sha, the reference sha, the 14 ids
    and kinds, and userB = insertBlock(userA, block); it does not re-derive the 46 s50l fixture entries from their
    recorded inputs with the hashed selector. Recommended before the first call, not registered: that re-derivation
    (the review ran its equivalent in memory: `S50L PARITY OK: 46 entries (14 with a block)`, gated blocks equal to
    the fixture blocks on all 14, a corrupted parent on S1Q04F caught) runs on the day as a NAMED command whose line
    is recorded in `run.log`; otherwise the s50l blocks rest on the builder's single run at 22:56.
25. Review I2's ask stands: only A1 changes the registered pair set (18 → 12 callback pairs per run); withdrawing A2
    restores the registered dropped-parent set. So the user's explicit OK on this file is a precondition before the
    first call. The runbook has no such step.
26. Residual risks, to be named in the result (§11 style): graders auto-load `MEMORY.md`, which names this experiment,
    Thursday's +3 and the bar — the same exposure Thursday's graders had; the S2Q09F bug is measured, not fixed; the
    callback arm has 12 pairs, not 18; the L38M re-asks must not share the key during the 84 calls (review M7).
    s50l repeats s50m's transcript window on 7 of 14 items (D1 and D3 byte-identical); the two items that carried
    Thursday's +6 (S1Q04F, S1Q06F) have the same window and block; the pooled Δ partly measures the reproducibility
    of the same items, not new material (item 15). The generated comment at `gate-report-s50l.mjs:180` ("On s50m this
    threw") is inaccurate — on s50m neither slot carried a Live block, so the throw never fired; the file is hashed
    and stays as is (review M7).
