# Hedge default flip — implementer report (Sonnet, 2026-09-29 ~19:15)

The harness would not let the implementer write this file, so the controller saved its returned report here word for word.

**Status: DONE_WITH_CONCERNS.** Not reviewed yet, not committed, and dist-electron is not rebuilt.

## Tests
- **RED 1** (new tests, old `verbalHedge.ts`): 29 passed, 5 failed.
  - `on when unset or empty`
  - `unset: the on line at the default trigger`
  - `unset, trigger set`
  - `unset, junk trigger: throws`
  - `LLMHelper.verbalHedge > default-on pin`
- **GREEN 1:** `verbalHedge.test.ts` 15/15 and `LLMHelper.verbalHedge.test.ts` 19/19.
- **RED 2** (flip in place, six files still deleting the variable): 292 passed and 21 failed, in 5 files:
  - answeringModel 7/15 failed;
  - abortOnClose 3/12;
  - geminiThinking 3/4;
  - stallFallback 6/7;
  - verbalPrimary 2/6.
  - `emptyStream` stayed 4/4.
- **GREEN 2** (with `'0'`): 6 files, 48/48.
- **Final runs:**
  - the 7 changed test files pass 78/78;
  - `electron/llm/` plus `electron/LLMHelper` pass: 35 files, 313 tests;
  - root tsc exits 0;
  - electron tsc shows exactly the 6 baseline errors.
- **Mutant calibration:** the unit test kills 5 of 5 mutants:
  - '0' read as on;
  - junk read as on;
  - trigger ignored while unset;
  - empty refused;
  - unset read as off.
- **Startup seam:** the real module was run in separate processes with the real `process.env`:
  - unset gives `on trigger=5000ms`;
  - `0` gives `off`;
  - `yes` throws;
  - unset + junk trigger throws;
  - `0` + junk trigger gives `off`;
  - unset + trigger 300 gives `on trigger=300ms`.

## Concerns (for the reviewer / controller)
1. **A golden test goes red after the flip.** `electron/test/golden/interview60.pass-record.test.ts:230` expects `describeVerbalHedgeAtStartup({})` to be 'off' and now gets 'on trigger=5000ms'. The run is 26/27. Golden was out of scope for the brief. Suggested fix, in the same commit: `describeVerbalHedgeAtStartup({ NATIVELY_VERBAL_HEDGE: '0' } as any)`, the same shape as line 231. Fingerprint before the fix: 18577 bytes, sha256 501d4622abc1eb48b057d7e859601529364e1bf8d944eb3b80bfa1450a8447e3.
2. **`LLMHelper.emptyStream.test.ts` is unchanged.** It still passes 4/4 with its `delete`. All four cases are Gemma routes, whose Flash tier (`LLMHelper.ts:3225`) never reads the flag.
3. **Stale comments in `LLMHelper.ts`** (out of scope, so not touched):
   - line 3394: "Off unless the flag is set, so a flight compares the two";
   - lines 3465 and 3530: "as today".
4. **Stale test titles.** Two titles still call the stall race "shipped": `LLMHelper.verbalHedge.test.ts:268` and `answeringModel.test.ts:252`.
5. **Launchers and guards need `NATIVELY_VERBAL_HEDGE=0`** if they meant "unset = the old policy". None outside MAIN were opened.
6. **Two tests run through the hedge without pinning it.** `LLMHelper.geminiSystemInstruction.test.ts` and `customNotes.test.ts` still pass, because they assert only the request shape. A junk `NATIVELY_VERBAL_HEDGE_TRIGGER_MS` in the shell now throws there.

## Not reached
- The Electron startup line (dist not rebuilt, app not launched).
- Any real Gemini call.
- Padded values such as " 0 ".
- Other spellings such as "off", which throw by design.

## Changed MAIN paths
All files are LF, with no CR and no BOM. Each copy was byte-identical to its staged source, confirmed by full sha256.

| Path | Bytes | sha256 |
|---|---|---|
| electron/llm/verbalHedge.ts | 3726 | 55a273eda3ce96295d96e2589fc31916c02fc78fc99e6035701163a5fb6223c2 |
| electron/llm/verbalHedge.test.ts | 5190 | 9da6352ed4eec85af7467c6b42ce826fbfd5120c1a4f03674413660367365ce4 |
| electron/LLMHelper.verbalHedge.test.ts | 25665 | 97eec33e86815304465e4c6caf761db5b465dc8184e7d4bdd6fae6218289c8ce |
| electron/LLMHelper.abortOnClose.test.ts | 19346 | 4ebd4b8a1b1c501529860ab2248932f789381ad83d74111a2ca2285e20a54cf3 |
| electron/LLMHelper.geminiThinking.test.ts | 5855 | 70e10ced199a121dc0255b48658f522f5be595c59b1be6f1a38f08fdd9e4e079 |
| electron/LLMHelper.stallFallback.test.ts | 9888 | 53de4939d4f553300ac9168753b64f1a6ec60426b0e5d2f2f05d4a85468b2dfd |
| electron/llm/WhatToAnswerLLM.answeringModel.test.ts | 18317 | 31bc1460e11e4f1e02a9e882e6f0c40c2dc916fbfc89c162c2652a3ddc78905c |
| electron/LLMHelper.verbalPrimary.test.ts | 6512 | ddd493555618f046930c59151eb1451e7f8796c076cff4495cd2aec55525554e |

Staged copies are in `stage\`, and every vitest run is saved as JSON in `runs\`.

## Fix round 1 (same implementer, 2026-09-29 ~20:50) — concerns 1, 3, 4 fixed; no drift before any copy
- golden `interview60.pass-record.test.ts:230`: `describeVerbalHedgeAtStartup({})` → `({ NATIVELY_VERBAL_HEDGE: '0' } as any)`, only line changed (18577 → 18612 B, sha 288f2ba6…).
- `LLMHelper.ts` COMMENT-ONLY (197519 → 197668 B, sha dc6728fb… → 4251a061…): :3393-3394 now say the hedge is the default since h40c and `=0` restores the stall race; the two "as today" comments (now :3466, :3531) name the opt-out stall race (=0). Proof: TS printer w/o comments, parser token stream and esbuild minified output all EQUAL before/after; the three checks were calibrated (4 known-bad edits flagged by all, 3 known-good by none).
- Titles: `LLMHelper.verbalHedge.test.ts:268` and `answeringModel.test.ts:253` now name the opt-out stall race (=0).
- Runs: golden pass-record test 23 passed / 4 skipped / 0 failed (the 4 = the "collectPass on the real s50a run" block, which resolves its folder from process.cwd() and skips under a temp cwd; round 0's "26/27" was really 22 passed / 1 failed / 4 skipped); 7 changed test files 78/78; llm + LLMHelper 35 files / 313; root tsc 0; electron tsc = the 6 baseline errors.
- Total change set: the 8 round-0 files + the golden test + LLMHelper.ts (comments) = 10 files.

## Opus review (2026-09-29 ~21:05): spec ✓, quality Approved; I1 + M1–M5 → fix round 2
- I1: `NATIVELY_VERBAL_PRIMARY_MODEL` is inert by default (the hedge takes either Flash Lite) → comment-only.
- M1: whitespace unpinned.
- M2: geminiSystemInstruction/customNotes run through the hedge unpinned.
- M3: the emptyStream comment is wrong.
- M4: the line reference in pass-record.mjs:182.
- M5: stale comments in flight.mjs and verbalPrimaryModel.ts, and verbalHedge.ts:8 wording.

## Fix round 2 (same implementer, ~21:30): no behaviour change (5 comment-only files + 4 test files)
- **I1, comments:**
  - `LLMHelper.ts` 2723-2725: the override matters only with =0, and the capture names the RESOLVED primary, not the winning leg.
  - `verbalPrimaryModel.ts` 11-14.
  - `verbalHedge.ts` 23.
- **M1:** `verbalHedge.test.ts` +2 tests (' 0 ' → false, '  ' → true), 17 total. Mutants:
  - `.trim()` removed → 15/17;
  - blank read as off → 16/17;
  - trimEnd only / trimStart only → 16/17 each.
- **M2:** geminiSystemInstruction + customNotes pin '0' and delete the trigger (save/restore).
  - Known-bad control, old text + junk trigger: 3 of 5 fail.
  - Pinned: 5/5 clean, 5/5 with a junk trigger, 5/5 with both variables junk.
- **M3:** emptyStream sets '0'; its comment now says the flag is never read on that Gemma path.
- **M4:** `pass-record.mjs:182` → `:3396`; an rg sweep found no other shifted line reference.
- **M5:** `flight.mjs` 47-49 and 116-126 (the hour answers with 3.5-lite HIGH first, so captured-high is its twin); `verbalHedge.ts` 8-10 wording (rule 1 not void, rules 2-3 PASS).
- **Comment-only proof** (3 calibrated checks each): LLMHelper.ts, verbalPrimaryModel.ts, verbalHedge.ts (round-2 diff), flight.mjs and pass-record.mjs are all EQUAL x3. LLMHelper.ts HEAD → final is also EQUAL x3, so rounds 1 and 2 were both comment-only.
- **Runs:**
  - `interview60.flight.test.ts` 18/18;
  - golden pass-record 27/27 with an s50a copy as cwd;
  - 10 hedge-related files 89/89;
  - llm + LLMHelper 35 files / 315, green unpolluted, with a junk trigger, and with the flag exported as 0, 1 and yes;
  - root tsc 0; electron tsc = the 6 baseline errors.
- **Commit set: 16 files** (round 0 + round 1 + round 2):
  - `verbalHedge.ts`, `verbalHedge.test.ts`, `verbalPrimaryModel.ts`;
  - `LLMHelper.ts`;
  - `LLMHelper.{verbalHedge,abortOnClose,geminiThinking,stallFallback,verbalPrimary,emptyStream,geminiSystemInstruction,customNotes}.test.ts`;
  - `WhatToAnswerLLM.answeringModel.test.ts`;
  - golden `interview60.pass-record.test.ts`, `interview60.pass-record.mjs`, `interview60.flight.mjs`.
- **Round 3 (running):** three more stale comments, `flight.mjs:120` and `:136` and `pass-record.mjs:183`.

## Next (controller)
1. Opus review. Give the reviewer the brief, this report, and a package of the 8 files plus the golden test.
2. Fix concern 1 in the same commit.
3. Commit through commit-main-paths.ps1, in a commit separate from the boundary repair.
4. Rebuild, then confirm the built module's startup line reads `on trigger=5000ms`.
