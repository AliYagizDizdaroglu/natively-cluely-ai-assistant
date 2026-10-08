# Task 2 report: the boundary repair wired into `DeepgramStreamingSTT` (one state per socket)

**Status: DONE.** No git command was run. Nothing in `.env` or any key was read. Task 1's three files were not touched.

## 1. What changed (MAIN, uncommitted, for the controller to commit)

| Path | Change |
|---|---|
| `electron/audio/DeepgramStreamingSTT.ts` | modified: 12 insertions, 1 deletion, 3 hunks; 13,865 -> 14,831 bytes |
| `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` | new: 5,096 bytes, the brief's test verbatim |

The three hunks of `DeepgramStreamingSTT.ts` (full unified diff: `sdd/task-2-DeepgramStreamingSTT.diff`):

1. Import, after the `keytermsFor` import: `import { createBoundaryRepair } from './deepgramBoundaryRepair';`
2. In `connect()`, right after `const stale = ...`: two comment lines and `const boundaryRepair = createBoundaryRepair();`. A closure variable, so it lives and dies with its socket's handlers.
3. In the Transcript handler, after `if (!transcript) return;` and before `this.emit('transcript', ...)`: a 3-line provenance comment, `const repaired = boundaryRepair.onTranscript(transcript, isFinal, Date.now());`, the `boundary repair: restored "<words>" before "<first 40 chars of the final as received>"` log when `repaired.restored` is set, and `text: transcript` -> `text: repaired.text`.

Unchanged, verified: the `Transcript event` log line (exactly one in the original and one in the final, byte-identical, still logging Deepgram's RAW text), the event keys (`text`, `isFinal`, `confidence`), `stale()`, VAD events, flush, keepalive, the Close summary.

## 2. Preconditions checked before editing

- `MAIN\.git\HEAD` (plain file read): `ref: refs/heads/fix/coding-style-suffix-all-gemini`.
- `DeepgramStreamingSTT.ts`: 13,865 bytes, mtime 2026-09-20 01:58:40, sha256 `425fcd9f824b806c916be93cc58d164126cf272fb97f883f6949b8fcc99a30ff`. Every line number in the brief matched (import at 13, `stale` at 198, handler 215-230, class field at 48).
- Task 1's files were present: module 5,940 B, test 7,691 B, fixtures 22,788 B.

## 3. TDD evidence

TEST command: the plan's PowerShell form (the session guard refused the compound Bash form; same command, temp cwd, `--root` MAIN):

```powershell
Set-Location $env:TEMP; cmd /c "npx --prefix ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" vitest run --root ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" <file>"
```

Vitest v2.1.9. The helper for every copy into MAIN: `copy-into-main.mjs`.

**Step 1.** The test was written to the stage, compared byte for byte with the brief's fenced block (IDENTICAL; calibration: a different block reports DIFFERENT), then copied into MAIN without `--overwrite`: `5096 bytes, sha256 4a2b34ecd4a0c86e -> 4a2b34ecd4a0c86e IDENTICAL`.

**Step 2, RED** (`... electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`, before any wiring). Fails at the first `expect` (`:90:54`); the ONLY difference is the sixth entry:

```
 FAIL  ... > emits the repaired final, logs the raw text plus one repair line, and a restarted socket starts with no remembered cut
AssertionError: expected [ [ …(2) ], ... ] to deeply equal [ [ …(2) ], ... ]
- Expected
+ Received
    ...
    Array [
-     "service over 10,000,000 documents, it has to support document updates",
+     "over 10,000,000 documents, it has to support document updates",
      true,
    ],
 ❯ electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts:90:54
 Test Files  1 failed (1)
      Tests  1 failed (1)
```

**Step 3.** The three edits went into a staged copy first. The staged file was then compared with the file rebuilt from MAIN's original by applying the brief's own fenced blocks programmatically (import block, per-socket block, old-handler -> new-handler): `IDENTICAL` (calibration: the same comparison with edit (c) skipped reports `DIFFERENT`). Immediately before the overwrite, MAIN's file was re-hashed and was still `425fcd9f...`. Helper output:

```
electron/audio/DeepgramStreamingSTT.ts: 14831 bytes, sha256 9584012e74a483b9 -> 9584012e74a483b9 IDENTICAL
```

**Step 4, GREEN:**

```
 ✓ electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts (1 test) 11ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

**Step 5, the rule-8 hoist calibration.** A staged mutant made from the wired file, exactly as the brief says: the `const boundaryRepair` line deleted from `connect()`, `private boundaryRepair = createBoundaryRepair();` added after `private sockNotOpenWrites = 0;`, the call changed to `this.boundaryRepair.onTranscript(...)`. One PowerShell call: mutant into MAIN (`14830 bytes, sha256 c556e7d44a52ce25 IDENTICAL`), test, restore of the wired staged file. The test FAILS at the same first `expect`, and now the THIRD entry differs (socket #2 repaired with socket #1's cut):

```
    Array [
-     "over 10,000,000 documents, it has to support document updates",
+     "service over 10,000,000 documents, it has to support document updates",
      true,
    ],
 Test Files  1 failed (1)
      Tests  1 failed (1)
--- restore ---
electron/audio/DeepgramStreamingSTT.ts: 14831 bytes, sha256 9584012e74a483b9 -> 9584012e74a483b9 IDENTICAL
```

After the revert: `Test Files  1 passed (1)` / `Tests  1 passed (1)`.
The brief's second Step-5 prediction ("the repair-line filter has 2 entries") is inferred from the module's semantics, not observed: the run stops at the first failed assertion.

**Extra calibration (beyond the brief).** Step 5 only proved assertion 1 can fail. The assertions for the confidence, the repair-line format and the RAW event line ("the raw text is still logged" is half of this task's contract) had never been seen failing. One small staged mutant each, driven by `sdd/t2-calibrate.mjs` (aborts untouched if MAIN is not the wired version; restores in a `finally`; compares hashes):

| Mutant | Fails at | Observed |
|---|---|---|
| A: repair line keeps 30 chars of the final instead of 40 | `:99` (the `boundary repair:` lines) | `... before "over 10,000,000 documents, it "` instead of `... it has to sup"` |
| B: repaired text on its own extra log line (no `boundary repair:` marker) | `:104` (no line carries the repaired text) | `expected true to be false` |
| C: the `Transcript event` line logs the repaired text | `:103` (raw event line count) | `expected [ Array(1) ] to have a length of 2 but got 1` |
| D: `confidence: 1.0` hard-coded | `:98` (every confidence 0.9) | `expected false to be true` |

Every mutant failed exactly at its own assertion (`Tests  1 failed (1)`). Then the restore: `14831 bytes, sha256 9584012e74a483b9 -> 9584012e74a483b9 IDENTICAL`, MAIN sha256 equal to the wired staged file.

**Step 6, the whole `electron/audio/` folder:** `Test Files  10 passed (10)`, `Tests  122 passed (122)`:

| File | Tests |
|---|---|
| `deepgramKeyterms.test.ts` | 6 |
| `SttChannel.test.ts` | 9 |
| `deepgramBoundaryRepair.test.ts` | **58** (the brief said 52; see section 6) |
| `DeepgramStreamingSTT.vadEvents.test.ts` | 1 |
| `DeepgramStreamingSTT.socketSummary.test.ts` | 2 |
| `DeepgramStreamingSTT.boundaryRepair.test.ts` | 1 |
| `DeepgramStreamingSTT.staleSocket.test.ts` | 6 |
| `energyVad.test.ts` | 7 |
| `GeminiLiveRouter.test.ts` | 30 |
| `RestSTT.test.ts` | 2 |

**Step 7, tsc** (temp cwd, the plan's commands):
- Root: no output, `exit=0`.
- Electron project: exactly the 6 baseline errors, `exit=2`: `GeminiLiveRouter.ts(125,44) TS2339`; `ipcHandlers.ts(3433,18) TS2339`, `(3433,38) TS2339`, `(3436,31) TS2339`; `KnowledgeOrchestrator.ts(349,35) TS2322`, `(351,25) TS2322`. None in `DeepgramStreamingSTT.ts`, the module, or either test.

## 4. Final state of MAIN (helper output and an independent re-hash)

| File | Bytes | sha256 |
|---|---|---|
| `electron/audio/DeepgramStreamingSTT.ts` | 14,831 | `9584012e74a483b9e14718cb51e1e27c23d756cf1ef1c6b79555a86d21c2c177` (helper: `9584012e74a483b9 -> 9584012e74a483b9 IDENTICAL`, the same as the Step 3 output) |
| `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` | 5,096 | `4a2b34ecd4a0c86eff98e80f4ffa292f5d4bb6e295c3f5d20f5d01676170e298` (helper: `4a2b34ecd4a0c86e -> 4a2b34ecd4a0c86e IDENTICAL`) |

Both have 0 CR bytes; both equal their staged copies. The original `DeepgramStreamingSTT.ts` (the diff base) was 13,865 bytes, sha256 `425fcd9f824b806c916be93cc58d164126cf272fb97f883f6949b8fcc99a30ff`. Task 1's files still match the ledger: module `4653b898`, test `c57ef099`, fixtures `e65c6e74`. Since 17:00 the only files modified in `electron/audio/` are these two plus Task 1's module and test (17:45 / 17:48).

MAIN's `DeepgramStreamingSTT.ts` held a mutant only while the Step 5 test run and the four calibration runs executed (each vitest run reports about 2.4 s); each cycle was restored and hash-verified. The file's mtime is now the staged copy's write time (2026-09-29 18:03:46; the helper's copy keeps the source's mtime), so the "2026-09-20 01:58" guard no longer applies to this file.

## 5. Self-review of the diff against the request

- Only the import, the per-socket const and the Transcript handler changed (12 insertions, 1 deletion; the one deletion is `text: transcript`).
- Ordering per Global Constraints: the module is called after the empty-transcript return and before `emit`, so it never sees an empty text.
- The state is created in `connect()`, not on the class: a restart (`stop()` + `start()`) and a reconnect (`scheduleReconnect` -> `connect()`) each get a fresh state. The closure lives exactly as long as that socket's handlers.
- Which instances exist (read from the code, not run): `main.ts:1124` is the only `new DeepgramStreamingSTT(...)` outside tests, inside `createSTTProvider(speaker: 'interviewer' | 'user')`; `createSTTProvider` has ONE call, `main.ts:1413`, with `'interviewer'`; `googleSTT_User` (the mic slot) is declared and stopped/started/finalized but is never assigned an instance anywhere in `electron/` (only `= null`). So in this tree exactly one Deepgram instance exists at runtime, the interviewer's; the brief's "both instances (interviewer and candidate mic)" is moot today. Because the state is created in `connect()`, any mic instance added later would get its own per-socket repair with no further change.
- The log line uses `transcript.slice(0, 40)` (the final as received, not the repaired text), as the brief specifies.
- The emitted object still has exactly the three keys; `repaired.restored` never reaches an event.
- Style: 4-space indent, single quotes, semicolons; the comments are the brief's, which state the measured reason and date as the file's other comments do. LF only.
- The build (`scripts/build-electron.js`) transpiles every `.ts` under `electron/` (no bundling, CJS), so `deepgramBoundaryRepair.ts` is emitted next to `DeepgramStreamingSTT.js` and the `require` resolves; the incremental skip treats a missing output as mtime 0, so a new file cannot be skipped. Read only; the build was not run.
- The clock is `Date.now()`, as everywhere in this file. Only a backward wall-clock step inside a 5 s window could make the module see a gap that is too small.

## 6. Deviations from the brief and things to know

- **TEST form.** The session guard refused the compound Bash form (`cd ... && npx ... | tail; echo`). I ran the plan's PowerShell equivalent (temp cwd, `--root` MAIN). Nothing was run from inside the repo.
- **Test count.** The brief expected 52 for `deepgramBoundaryRepair`; the run shows 58. Not a regression: Task 1's fix round 1 added 6 tests (ledger: "58/58"); I did not touch that file.
- **Edit (c).** I replaced only the differing lines (from `if (!transcript) return;` to `text: transcript,`) instead of the whole handler block; the unchanged lines of the brief's old and new blocks are identical, and the result was proven byte-identical to applying the brief's blocks programmatically.
- **Extra calibration** (mutants A to D above) goes beyond Step 5; it touched MAIN's file only through the helper and always ended restored.
- The brief's line "(Step 5) the repair-line filter has 2 entries" is inferred, not observed (see Step 5).

## 7. What the tests did NOT exercise (Step 8)

- **A real socket / the real `@deepgram/sdk`.** The SDK is replaced through `require.cache` (as in the sibling tests); the payload shape (`is_final`, `channel.alternatives[0]`) and the `'Results'` event name are mirrored, not read from the real SDK.
- **The built `dist-electron` output.** The harness contract (`createBoundaryRepair` / `onTranscript` / `.text`) is only exercised by the controller's replay. I read the build script (section 5) but did not run a build.
- **The mic instance.** Same class and the same `connect()`, never fired in a test; and in this tree no mic Deepgram instance is constructed at all (section 5), so there is nothing at runtime to exercise.
- **The real clock.** Vitest fakes `Date`; the 5000 ms window edge is Task 1's module test, not this one.
- **The reconnect path** (Close with a non-1000 code -> `scheduleReconnect` -> `connect()`). Only the sample-rate restart (`stop()` + `start()`) is exercised; the reconnect calls the same `connect()`, so the fresh closure follows by construction, but no test runs it.
- **A late transcript from a replaced socket being repaired by its own state.** The existing `staleSocket` test still passes (its socket has an empty state), but no test checks that a replaced socket's late final is repaired from its own remembered cut; the handler has no `stale()` check (pre-existing), so such an event is emitted, repaired.
- **The event's key set.** The test checks `text`/`isFinal` (via `map`) and `confidence` (via `every`); an accidental extra key on the event (for example spreading `repaired` into it) would pass. The diff shows exactly three keys.
- **A throw from the module inside the handler.** The existing `try/catch` would log `Parse error` and drop that transcript (before this change the handler had nothing that could throw on a string). The module is pure and total over strings (Task 1 pinned the no-token and punctuation-only finals); this branch was not run.
- **An empty FINAL.** Only an empty interim is in the test; both take the same early return before the repair.

## 8. Scratchpad files created (all under `sdd/`, throwaway)

`print-seam.mjs`, `t2-compare-brief-block.mjs`, `t2-hash.mjs`, `t2-stage-copy.mjs`, `t2-apply-brief.mjs` (+ `t2-original.ts`, `t2-expected-from-brief.ts`), `t2-make-mutant.mjs` (+ `t2-mutant/`), `t2-calibrate.mjs` (+ `t2-mutants/A.ts` .. `D.ts`), `t2-final-check.mjs`, `task-2-DeepgramStreamingSTT.diff`. The stage now also holds `stage/electron/audio/DeepgramStreamingSTT.ts` (the wired version) and `DeepgramStreamingSTT.boundaryRepair.test.ts`, both identical to MAIN's.
