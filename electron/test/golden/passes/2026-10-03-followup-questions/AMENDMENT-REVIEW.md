# Review of AMENDMENT-s50l.fable.md (Opus, 2026-10-02, read-only, no model call, no subagent)

**VERDICT: APPROVE WITH FIXES.** 0 Critical, 4 Important, 7 Minor.

The amendment is a faithful reading of the registration, not a renegotiation:
- **A1.** It applies the frozen builder's own refusal by name and keeps the registered slot ids. It does not touch
  the 42 roster pairs. On clause 2 it leans against B.
- **A2.** Withdrawn. The dropped-parent cases D1-D3 run as registered.
- **A4.** The dist meets §6.2's own test, using the exact bytes Thursday ran.

Two of its factual statements are false (I1, I2), and the runbook does not yet carry what the amendment requires
(I3, I4). Fix all four before the user is asked for the OK.

## What I verified myself

- **The registration is unchanged.** sha256 `cc127dab…a8ca1`, 22,704 bytes, mtime 2026-09-28 21:36:02.
- **Every full hash in item 13 and item 14 matches.**
  - `gate-report-s50l.mjs` b4472648…, `make-gate-report-s50l.mjs` 3b828910…, `make-fq-s50l.mjs` f4695b7e…,
    `pooled-decide.mjs` 7229aa8d…, `audit-graders.mjs` ebaab94a….
  - `s50l-gated.json` bfbf1e24…, 383,533 bytes. `s50l-parity-fixture.json` fe0dc50d…, 311,462 bytes: 46 entries,
    14 with a block and 32 empty.
  - Registered and unchanged: `earlierQuestions.ref.mjs` 0459f578…, `gate-report.mjs` b23b9219…, `s50m-gated.json`
    1aa4b3a5…, `parity-fixture.json` f61c4607….
- **The A1 marker is byte-identical to the frozen builder's.** `gate-report-s50l.mjs:182` and `gate-report.mjs:177`
  test the same `after.startsWith('\n\nTHE LIVE LISTENER')`. The generator (`make-gate-report-s50l.mjs:11-39`)
  makes only the anchored swaps it lists.
- **The gate report reads as the amendment says.** `out.txt:283,310` (C1 and C6 EXCLUDED), `:285-303` (C2-C5
  refSelected=yes, 17.1/18.5/33.6/19.5 min), `:314-325` (D1-D3 at 245/245/236 s, none refused) and `:225-228`
  (the S2Q09F block is the S2Q08F question) all match.
- **Item 15: 9 of 14 blocks share their sha12 with s50m.** The 5 that differ (S2Q08, S2Q08F, C3, C5, D2) carry
  exactly the sha12 values and char counts the amendment lists. The system prompt is equal on all 14 items.
- **Thursday's figures and per-item reads match its RESULT.txt.** n 47, R 21, wrong 0/0, off-topic A 9 / B 3,
  Δ 13 − 10 = +3; C1 `ooo→YYY`, C6 `YYY/YYY`, and the others cited in item 1. `pooled-decide.mjs --calibrate` →
  `CALIBRATION OK: all 9 rule lines equal Thursday's RESULT.txt block, in order`.
- **Item 19 arithmetic is correct.**
  - ceil(4·42/21) = 8 and ceil(42/21) = 2, so s50l alone needs Δ ≥ +5 to PASS and is FAIL at ≤ −1.
  - 3c allowance: ceil(2·89/39) = 5; at n = 78 it is 4, and at n = 79 it is 5.
  - Additivity is enforced before the decision prints (`pooled-decide.mjs:92-97`, exit 4 before `:101`).
- **The runner's dry run matches the plan.** `--dry-run` → 84 calls, filter d8fee6ca0170, A first in 21, B first
  in 21; 42 roster, 24 callback and 18 dropped calls. `followup-questions-s50l/` holds 0 `interview60.answers.*`
  files.
- **The dist snapshot matches item 17.**
  - 910 files, 11,611,637 bytes. `verbalStreamFilter.js` is 16,100 bytes with sha256 `d8fee6ca0170…` (read with
    node; PowerShell cannot reach the path because it is too long).
  - Git: 0e1e8b2 is an ancestor of 73d7f01, and 2b0906f is not.
  - Thursday's last call started at 11:27:55Z; the snapshot is from 11:45:14Z (about 17 min later).
- **Every registration line cite was checked.** The misses are listed in M1.

## Important

**I1. Item 15 says "Every s50l userA differs from s50m's (new material)". That is false for two items and
misleading for five more.**

I compared `s50l-gated.json` with `s50m-gated.json` byte for byte:

| userA on s50l vs s50m | items |
|---|---|
| identical | D1, D3 |
| identical once the `PREVIOUS RESPONSES` preview (the app's own earlier answer) is set aside | S1Q04F, S1Q06F, S2Q08F, C3, C5 |
| different transcript lines too (STT line splits or wording) | S1Q08, S2Q05F, S2Q08, S2Q09F, C2, C4, D2 |

- S1Q04F and S1Q06F produced all of Thursday's +6 (`www→YYY`). On s50l both have the same window and the same block
  sha12 as on s50m (8a58894a5e5f, 03260be280dc). Only the preview differs.
- So about half of s50l is a re-sample of nearly the same prompts, not new material. That includes the two items that
  carry the gain.
- The registration chose s50l, so this changes no rule. But the pooled bars scale pro rata as if the two runs were
  independent, and they are strongly correlated.
- **Fix:** rewrite item 15's last sentence with the table above. Add to item 26: "s50l repeats s50m's transcript
  window on 7 of 14 items (D1 and D3 byte-identical); the pooled Δ partly measures the reproducibility of the same
  items, not new material."
- The user should see this before giving the OK in item 25.

**I2. Item 22 says Thursday's evidence is not under `passes/` on any branch. That is false.**

- `fix/coding-style-suffix-all-gemini` (MAIN's checkout) carries
  `electron/test/golden/passes/2026-10-01-followup-questions/`, committed in adb25a8 on 2026-10-01 16:43. It
  holds MANIFEST.txt, the registration, RESULT.txt, run.log, the 6 answer files, 4 pairs, 4 keys, 8 verdicts,
  graders.json, and the cal, stamp, quota and dry-run outputs.
- The same commit carries `electron/test/golden/passes/2026-10-01-followup-questions-result.md`.
- The check apparently looked at a top-level `passes/`, which does not exist. `main` has none of these files.
- **Fix:** rewrite item 22. The s50l run lands as `electron/test/golden/passes/2026-10-03-followup-questions/` with:
  - its own evidence and run.log;
  - this amendment and the draft, marked superseded;
  - `s50l-gated.json` and `s50l-parity-fixture.json`;
  - RESULT-pooled.txt and RESULT-s50l-alone.txt;
  - a result note and an INDEX line (the pass-records rule).

  Thursday's half is cited by adb25a8, not copied again. Update RUNBOOK step 16, which says "agenda + memory" only.

**I3. The amendment says the runbook reads against it. The runbook still names the draft.**

- AMENDMENT `:4` says "the runbook's 'Rule:' line reads against THIS file".
- RUNBOOK `:3` reads `AMENDMENT-s50l.md` (the draft). `pooled-decide.mjs:1` names the draft too (a comment only).
- There are two amendment files on disk and no marker saying which one governs.
- **Fix:**
  - Change RUNBOOK `:3` to `AMENDMENT-s50l.fable.md`.
  - Prepend one line to `AMENDMENT-s50l.md`: "SUPERSEDED by AMENDMENT-s50l.fable.md (2026-10-02 23:09)".
  - Leave `pooled-decide.mjs` alone: its hash is recorded and the reference is only a comment.

**I4. The runbook has no step for the two preconditions the amendment sets.**

- Item 25: the user's explicit OK on this file before the first call.
- Item 23: this file's sha256 and mtime in run.log before the first answer file exists.
- **Fix:** add RUNBOOK step 0, before precondition 1:
  - "the user's OK on AMENDMENT-s50l.fable.md, quoted with its time";
  - `Get-FileHash` of the amendment, plus its mtime, appended to run.log;
  - a check that no `interview60.answers.*` file exists yet.

  Do this after the I1-I3 edits, so the hash recorded is the hash approved.

## Minor

**M1. Line cites.**
- "the six callbacks … at the same slot ids" and "same reference files, same hashes" are at PREREGISTER `:229`. The
  amendment cites `:230-231` and `:230`.
- Item 11's `:189-191` points into `gate-report-s50l.out.txt`, not the registration. Prefix the file name; every
  other bare `:NNN` in the amendment refers to the registration.
- Item 10 cites `make-gate-report-s50l.mjs:27-34`; the wrapper runs to `:39`.
- Clause 4's noise is registered at `:218-219`. The `:213-216` cited in item 8 is the TTFT noise.

**M2. Item 8 overstates direction, and its 3c sentence is garbled.**
- "Can only make B look marginally lighter" is an expectation, not a necessity. s50l's C1 and C6 blocks were never
  built; 562 and 613 are s50m's sizes.
- Say it plainly: A1 is expected to lean very slightly toward B on 3a, 3b and 4, and (by Thursday) against B on
  clause 2.
- "Allowance per 10" should read "allowance ceil(2n/39) on the pooled n (item 19)".

**M3. Item 18's contrast with 0e1e8b2 is unsupported.**
- The amendment says a 0e1e8b2 build "would pass the same test with a different filter history".
- `git log 0e1e8b2..73d7f01 -- electron/llm/verbalStreamFilter.ts` is empty. In that range `electron/llm` changes
  only `verbalHedge.ts`, `verbalPrimaryModel.ts` and one test.
- The argument that stands: the snapshot is the very bytes Thursday ran and it passes §6.2's own test. The
  conclusion is unchanged.

**M4. Item 24's recommendation cannot be run as written.**
- `stamp.mjs` hard-codes the s50m file names and resolves them relative to the cwd. It cannot be "pointed at" the
  s50l files.
- I ran the equivalent in memory, with the hashed reference and no file written:
  - `S50L PARITY OK: 46 entries (14 with a block)`;
  - the gated blocks equal the fixture blocks for all 14 items;
  - a corrupted parent on S1Q04F was caught.
- On the day, record that as a named command in run.log. Also, RUNBOOK step 4 must run `stamp.mjs` with
  cwd = `followup-context`, or it fails on ENOENT.
- Item 24 says `loadGated` checks only two things. It also checks the reference sha and the 14 ids and kinds.

**M5. Item 25 wording.** Only A1 changes the registered pair set (18 → 12 callback pairs per run). Withdrawing A2
restores the registered set.

**M6. Item 19 states clause 5 only.**
- "Δ ≥ +5 → PASS" is clause 5. The pooled outcome is PASS only if clauses 1, 2, 3a, 3b, 3c and 4 also hold.
- Any in-between reading on 3a, 3b or 4 is a second INCONCLUSIVE, so a FAIL. 3b turns on a single stall.
- One sentence would stop the reader taking +5 as sufficient.

**M7. A generated comment is inaccurate.**
- `gate-report-s50l.mjs:180` says "On s50m this threw". On s50m those two slots had no Live block, so the throw never
  fired.
- The file is hashed, so do not edit it. Mention it in the result note if anyone quotes the comment.

## Before 10:05

1. **Amendment.** Correct item 15 and add the overlap to item 26 (I1). Rewrite item 22 (I2). M1-M3, M5 and M6 can
   be one-line edits in the same pass.
2. **Runbook and draft.**
   - RUNBOOK `:3` points to `AMENDMENT-s50l.fable.md`, and the draft is marked SUPERSEDED (I3).
   - RUNBOOK step 16 names the `electron/test/golden/passes/2026-10-03-followup-questions/` record (I2).
   - Step 4 names its cwd (M4).
3. **The user's OK.** Get it on the corrected amendment, with I1's overlap in front of the user (I4).
4. **run.log, before the first call:**
   - the amendment's sha256 and mtime;
   - "no answers file present";
   - the s50l parity re-derivation line (I4, M4);
   - then the existing preconditions 1-8.
