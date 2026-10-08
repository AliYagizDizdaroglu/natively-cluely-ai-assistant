# Task 3 report: the module — rule v4 (`clear()`, `speechFinal`, the re-spelling test, non-ASCII guard, corrected comments)

Status: DONE_WITH_CONCERNS (coverage and wording notes in sections 9 and 10; none blocks). Controller ruling (M-a: no alignment guard) applied; RED 10 failed | 58 passed (68), GREEN 68 passed (68).
No git command was run. `.env` and keys were never read. No subagent was dispatched. No `node -e`, no `bash <script>`.
Only two MAIN source files were written (through `copy-into-main.mjs --overwrite`); the other uncommitted work in MAIN (`electron/llm/*`, `electron/LLMHelper*`, Task 1/2 files) was not touched.

**Fix round 1 is the last section of this file (section 12).** It supersedes the hashes of section 6, the `\p{M}` note of section 9 and items 1 and 2 of section 10 (all fixed); the module in MAIN is now 10,743 B, the test 13,947 B, with RED 10 failed | 58 passed (68) and GREEN 68 passed (68) unchanged.

`BR` = `...\scratchpad\boundary-repair`, `SP` = the scratchpad, `MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`.

## 1. Start check (`node BR\seed-stage.mjs`, run once)

All 7 seeded files reported IDENTICAL. The two this task changes matched the brief's starting sizes exactly:

```
electron/audio/deepgramBoundaryRepair.ts: 5940 bytes, sha256 4653b898dadc0885 -> stage 4653b898dadc0885 IDENTICAL
electron/audio/deepgramBoundaryRepair.test.ts: 7691 bytes, sha256 c57ef09964fce75a -> stage c57ef09964fce75a IDENTICAL
```

Before each copy into MAIN I re-read MAIN's file and confirmed it was still the seeded one (module still 5940 / 4653b898 when I copied the module; the test was 13159 / 10d8040a, i.e. mine, by then).

## 2. How the controller's ruling was applied

| # | Ruling item | Done |
|---|---|---|
| 1 | drop `&& raw.length === iw.length`; keep `raw = rawTok(lastInterim)` | The cut condition is `if (fw.length > 0 && fw.length < iw.length) {`; `raw` is still declared and still feeds `Traw: raw.slice(fw.length)`. |
| 2 | header: replace "and ALIGNED (its spelled tokens count the same as its comparison tokens)" | The CUT paragraph now reads "I must be longer than F1 and ASCII-LETTERED (…accented English…). The ASCII-letter condition is also what keeps rawTok() index-aligned with tok(): no character it admits changes the token count, checked on every code point in the 2026-09-29 v4 re-review. T = I's tokens after F1; Traw = the same words in I's own spelling." The rest of the header is byte-identical to the brief. Consequence of the wording: "F1, ASCII-LETTERED (…) and ALIGNED (…)" became "F1 and ASCII-LETTERED (…)", and the six lines from the "S2Q07)" line on were re-wrapped into seven (each ≤ 98 columns, inside the header's existing range: the brief's own lines reach 103). |
| 3 | `rawTok` doc comment | "… index-aligned with tok() on any text without a non-ASCII letter — the NON_ASCII_LETTER guard in createBoundaryRepair is what guarantees it." |
| 4 | İzmir test | Body unchanged. Title: `'an interim with a non-ASCII letter that splits the tokenisers ("İ") is no cut'`. Comment's last clause: "the non-ASCII guard refuses it (it subsumes v2's alignment guard)." |
| 5 | counts unchanged | RED 10 failed / 58 passed (68); GREEN 68 passed (68) — both observed (section 3). |
| 6 | Fidelity check | `raw.length === iw.length` is absent by design; everything else in the brief's fidelity line holds (same `isRespelling` body, same `NON_ASCII_LETTER` regex tested in the `!speechFinal` condition, `!speechFinal` on the new-cut branch only, `clear()` nulls both). |

**Exactness proof (throwaway `BR\sdd\t3-verify-stage.mjs`).** It extracts the brief's two fenced blocks (Step 1 test, Step 3 module), applies exactly the ruling's replacements (each must match once in the brief, or it throws), prepends the pristine test file for the test, and compares the staged files byte for byte. The delta it derives between the brief and the expectation is 4 changed lines in the test block and 17 in the module block (the 6→7 header lines, the rawTok doc line, the cut-condition line), nothing else. Calibrated: `--selftest` says the unmodified brief blocks are DIFFERENT and a one-character mutation is DIFFERENT; run on the still-unedited stage it said DIFFERENT for both files at the right offsets (char 7683 and char 273). Final run:

```
test  : IDENTICAL to the brief-derived expectation — staged 13159 bytes, CR=0, sha256 10d8040ad1debde6; expected 13159 bytes, sha256 10d8040ad1debde6
module: IDENTICAL to the brief-derived expectation — staged 10262 bytes, CR=0, sha256 8aca65e47f33039a; expected 10262 bytes, sha256 8aca65e47f33039a
```

## 3. TDD evidence (TEST form from a temp cwd: `Set-Location $env:TEMP; cmd /c "npx --prefix … vitest run --root … electron/audio/deepgramBoundaryRepair.test.ts"`)

### RED (Step 2: new test file in MAIN, module still v3 = 5,940 B / 4653b898), 21:27:48
```
 Test Files  1 failed (1)
      Tests  10 failed | 58 passed (68)
```
The 10 failures, each with the cause the brief predicted (received value in the assertion):

1. negative #28 with the interim running on … ("ninety two percent" -> "92%.") is no cut: `two percent For each of those metrics, define the unit of evaluation,`
2. "twenty five" -> "25": the same shape (v3 restored "five"): `five last quarter. What changed?`
3. "all right" -> "Alright" …: `right So tell me about your last project.`
4. "break" -> "breaks" …: `even before the rollout finishes.`
5. a re-spelling keeps its first letter: "put" for "cut" is no cut …: `hallucinations in a rag answer without just making it refuse?`
6. an interim with a non-ASCII letter that splits the tokenisers ("İ") is no cut (the retitled İzmir test): `zmir projesinde projesinde hangi veritabanını seçtiniz?`
7. an interim with a non-ASCII letter is no cut: a lost "résumé" is not restored as "r sum": `r sum and your last role.`
8. clear() between F1 and F2 …: `TypeError: r.clear is not a function`
9. clear() also forgets the latest interim …: `TypeError: r.clear is not a function`
10. speechFinal on F1 … leaves no cut; on F2 it does not stop the repair: first `expect` — received `{ restored: ["hallucinations"], text: "hallucinations in a rag answer …" }`.

The 58 old tests all passed (none touched). Full output: `BR\sdd\t3-red.out.txt`.

### GREEN (Step 4: module replaced by the v4 port), first at 21:28:50, again fresh at 21:33:57
```
 ✓ electron/audio/deepgramBoundaryRepair.test.ts (68 tests) 19ms
 Test Files  1 passed (1)
      Tests  68 passed (68)
```
Exit 0. No old expectation changed. Outputs: `t3-green.out.txt`, `t3-green-final.out.txt`.

### Existing adapter tests with the v4 module in MAIN (the Global Constraints' "existing adapter test stays green")
`vitest run … electron/audio/DeepgramStreamingSTT` (4 files: vadEvents, socketSummary, boundaryRepair, staleSocket):
```
 Test Files  4 passed (4)
      Tests  10 passed (10)
```

## 4. Type checks (fresh, on the final state of MAIN)

- Root: `tsc --noEmit -p MAIN\tsconfig.json` -> exit 0, no output.
- Electron: `tsc --noEmit -p MAIN\electron\tsconfig.json` -> exit 2, exactly 6 errors, matching PLAN.md's baseline list by file + code + message (and by line): `GeminiLiveRouter.ts(125,44) TS2339 'length' on 'never'`; `ipcHandlers.ts(3433,18) TS2339 'canceled' on 'string[]'`; `ipcHandlers.ts(3433,38) TS2339 'filePaths' on 'string[]'`; `ipcHandlers.ts(3436,31) TS2339 'filePaths' on 'string[]'`; `KnowledgeOrchestrator.ts(349,35) TS2322 'CompanyDossier' -> 'null'`; `KnowledgeOrchestrator.ts(351,25) TS2322` (same). Errors in `deepgramBoundaryRepair*`: 0.
- Gate calibration: `tsc --listFilesOnly -p electron/tsconfig.json` lists `deepgramBoundaryRepair.ts`, `.fixtures.json` and `.test.ts` (1,492 files), so an error in them would have shown.

## 5. Self-check: the staged module transpiled with MAIN's esbuild (0.21.5) -> `check-v4.mjs --module`

`BR\sdd\t3-transpile.mjs` first asserts the staged module is byte-identical to MAIN's copy (10262 bytes, sha256 8aca65e47f33039a), then emits `BR\sdd\t3-check\deepgramBoundaryRepair.js` (CommonJS: check-v4 loads a `.js` through `require`, and the real build is CommonJS) and `.mjs` (ESM, the form `verify-plan-v4.mjs` writes). Verdicts:

```
EQUIVALENT: deepgramBoundaryRepair.js == rule-v4.mjs on every recorded event, all 45 fixtures and all 18 probes      (check-v4.mjs --module, CommonJS)
EQUIVALENT: deepgramBoundaryRepair.mjs == rule-v4.mjs on every recorded event, all 45 fixtures and all 18 probes     (check-v4.mjs --module, ESM)
EQUIVALENT: deepgramBoundaryRepair.js == rule-v4.mjs on every recorded event, all 45 fixtures and all 18 probes [deepgramBoundaryRepair.js 2994 bytes, …]   (check-v4-built.mjs, exit 0)
```
Details from the output (`t3-check-v4-cjs.out.txt`, 0 FAIL lines, "ALL CHECKS PASS"): repairs non-holdout 25 / holdout 4 / seam 6, 0 of 13,892 events differ, also with the logs' utterance-end lines applied as `clear()`; 45 of 45 fixtures; all 18 probes pass, including the "alignment guard: İzmir" probe (now refused through the non-ASCII guard) and the résumé probe. The check's own calibrations passed (rule-v3 fails 11 of 18 probes; a pass-through fails the data check).

## 6. Final state of the changed MAIN files (read back from disk at the end)

| MAIN-relative path | bytes | sha256 |
|---|---|---|
| `electron/audio/deepgramBoundaryRepair.ts` | 10,262 (was 5,940) | `8aca65e47f33039aac7c5709187b070e807e637dd6d85c718b01410bee644434` |
| `electron/audio/deepgramBoundaryRepair.test.ts` | 13,159 (was 7,691) | `10d8040ad1debde6a472436010c5166112a7a37f3db560a85d8b278582c206fc` |

Both: LF only (CR=0), no BOM, valid UTF-8, end with LF. Untouched: `deepgramBoundaryRepair.fixtures.json`. Changed paths for the controller's commit are exactly these two.

## 7. Extra checks I ran (all throwaway, under `BR\sdd\`, nothing written to MAIN)

**7a. The ruling's premise, re-checked independently (`t3-align-claim.mjs`).** Every code point 0..0x10FFFF, 8 contexts each (`c`, `aCb`, `ACB`, …), compared token for token (`tok(s)` == `rawTok(s)` lower-cased), Node v22.19.0 / Unicode 16.0: the guard admits 970,635 code points (968,587 without lone surrogates; minus the 128 ASCII ones = 968,459, the re-review's figure); **0 misaligned**. Calibration: the same scan with no guard finds exactly 2 offenders, U+0130 (İ) and U+212A (Kelvin sign), and the real guard refuses both. So dropping the alignment guard removes no reachable behaviour.

**7b. The tests still pin the guard that replaced it (`t3-mutants.mjs`, mirror tree with vitest, MAIN read-only; run three times, same result).**
- final module in the mirror: `Tests 68 passed (68)` (harness calibrated to MAIN's real run).
- non-ASCII guard removed: `Tests 2 failed | 66 passed (68)` — exactly the retitled İzmir test and the résumé test. So the İzmir test is GREEN on v4 through the non-ASCII guard, as the ruling says.
- guard narrowed from `[\p{L}\p{M}]` to `\p{L}`: `Tests 68 passed (68)` — a SURVIVOR: no test pins the combining-mark half (see section 9).
- Direct probe with a decomposed résumé (`re` + U+0301 + `sume` + U+0301, F1 "Tell me about your", F2 "and your last role."): the final module returns "and your last role." (unchanged, correct); the `\p{L}`-only mutant returns "re sume and your last role.".

## 8. Deviations from the brief

Only the ruling's items (section 2). Nothing else differs from the brief's Step 1 block and Step 3 module (proved byte for byte in section 2). The brief's "Fidelity check" line about `raw.length === iw.length` is superseded by ruling item 6.

## 9. What was NOT exercised / residual risks

- **`\p{M}` half of `NON_ASCII_LETTER` is unpinned** by any unit test and by any check-v4 probe (7b: narrowing it leaves 68/68 green; only my throwaway probe covers it). Not added: the ruling fixes the count at 68.
- Not reached in this task: the adapter wiring of `clear()` and `speechFinal` (Task 4), the built `dist-electron` artifact (the controller's `check-v4-built.mjs` on the real build — I ran the same wrapper on my esbuild transpile, not on a real build), a real Deepgram socket.
- Residuals the brief already documents and I did not change: "Q&A"-class merges, filler restores, the recall cost for inflected cuts.

## 10. Observations for the controller (not changed — outside the ruling's list)

1. The describe title of the appended block still says "…, aligned interims only, pauses" (test line 134). It stays true by construction now (alignment holds because the non-ASCII guard refuses the two characters that could break it), but "ASCII-lettered interims only" would match the retitled İzmir test. Candidate for the Fable erratum pass; no effect on counts.
2. The module header still says "a line-for-line port of its reference rule-v4.mjs". Behaviour is identical (check-v4 EQUIVALENT), but the module now deliberately omits one line that `rule-v4.mjs` keeps (line 64, the alignment guard) — the accepted M-a cost noted in progress.md.
3. `check-v4.mjs --module` loads a `.js` via `require`, so a `.js` candidate must be CommonJS; `verify-plan-v4.mjs` writes ESM to `.mjs`. I ran both.

## 11. Housekeeping

Scratch files (all under `BR\sdd\`): `t3-orig\` (pristine copies of the two files as seeded), `t3-verify-stage.mjs`, `t3-main-hash.mjs`, `t3-transpile.mjs`, `t3-align-claim.mjs`, `t3-mutants.mjs`, `t3-check\` (the transpiled `.js`/`.mjs`), and the `t3-*.out.txt` outputs. The mirror tree that `t3-mutants.mjs` builds contains a junction to MAIN's `node_modules`; the script now removes the junction (`cmd /c rmdir`, link only) and then its own tree, and I confirmed afterwards that MAIN's `node_modules\vitest` is intact. Nothing from this task remains in the vitest cache under the scratchpad.

## 12. Fix round 1 (the coordinator's message after the Opus task review: I1 + M1 to M4; M5 not fixed)

Status: done, counts unchanged as required. `check-v4.mjs` was NOT run this round (instructed: another agent is extending it), and neither was `check-v4-built.mjs`, which calls it. Still no git, no `.env`, no subagent.

Start: `node BR\seed-stage.mjs electron/audio/deepgramBoundaryRepair.ts electron/audio/deepgramBoundaryRepair.test.ts` reported both IDENTICAL to MAIN: module 10,262 B / 8aca65e4, test 13,159 B / 10d8040a, exactly what round 1 left. Snapshot kept in `BR\sdd\t3-r1-orig\`.

### What changed

| Item | Where | Done |
|---|---|---|
| I1, the pin | test, the "twenty five" test | the coordinator's 4-line block ("version two" -> "v2") appended after its existing expect, verbatim |
| I1, the comment | module, the comment above `isRespelling` (lines 92 to 97 now) | keeps the original counts ("1 for a digit ... 0 refused for the first letter") and then explains them: "but check-v4 counts each cut under the FIRST rule that refuses it (digit, longer, first letter), and a spelled-out number never shares its first character with its digits, so "ninety" -> "92" fails the first-letter rule too: "1 digit, 0 first letter" only reflects that order. The data isolates neither rule; the digit rule rests on the synthetic "v2" for "version" case, the first-letter rule on the synthetic "put" for "cut" case." (The other agent's in-progress check-v4 note says the same about check order.) |
| M1 | test, the résumé test | the coordinator's 3-line block appended after its existing expect, with `re\u0301sume\u0301` as literal escapes (tool quirk below) |
| M2 | module header, lines 16 to 20 | the coordinator's phrase verbatim: "a port of rule-v4.mjs, line for line except v2's alignment guard (rule-v4.mjs:64), which the non-ASCII guard makes unreachable (re-review M-a)"; the sentence is re-wrapped from 3 to 5 lines, its tail ("the two must agree event for event (check-v4.mjs proves ...") unchanged |
| M3 | test line 134 | "aligned interims only" -> "ASCII-lettered interims only" |
| M4 | test lines 139 to 141 | "a 5852 ms gap" -> "F2 5164 ms after F1 (outside the window)"; the 3-line comment re-wrapped (longest line 122 columns, the file's existing range) |
| M5 | none | NOT fixed, as instructed |

One thing I caught myself: my first wording of the I1 comment quoted "0 for the first letter" without stating that count anywhere, a dangling reference. I reworded it before finishing (the table row is the final wording, and it is what is in MAIN).

### Tool quirk, for the record

The Edit tool unescapes a typed backslash-u sequence. My M1 line first landed in the staged test with two real U+0301 characters (the verifier said `U+0301 characters=2`, first difference at char 12372) instead of the six literal characters. The Write tool kept it literal in a `.mjs` script (bytes `5c 75 30 33 30 31`; `sdd\t3-r1-bytes.mjs` shows both), but converted it in the Markdown text I wrote for this report (3 real U+0301 characters, fixed with `t3-r1-fix-report-escape.mjs`; `t3-r1-scan-escapes.mjs` in the same folder lists every file), so neither tool can be relied on for this sequence: check the bytes after every write. The test was fixed by `sdd\t3-r1-fix-escape.mjs`, which maps each U+0301 to the literal escape (both built from char codes; it refuses unless there are exactly 2). Final state read back from MAIN: literal escapes 2, U+0301 characters 0, file NFC. Anyone who edits that test line through the Edit tool will hit the same thing.

### Exactness

`sdd\t3-r1-verify-stage.mjs` derives the expectation from the round-1 start plus exactly the requested edits (each anchor must match once), calibrated the same way (`--selftest`; DIFFERENT on the unedited stage at the right offsets). Delta against the start: 16 changed lines in the module (all inside block comments), 15 in the test. Final run: test IDENTICAL (13,947 B, sha256 6956aea35dfef746), module IDENTICAL (10,743 B, sha256 d5ba4da0650e7531), CR=0, U+0301 characters=0.

### The compiled module code is unchanged

`sdd\t3-r1-code-unchanged.mjs` compiles the round-1 module and the new module with MAIN's esbuild: CommonJS 2,994 chars vs 2,994, identical; ESM 2,093 vs 2,093, identical. Calibration: `MAX_SKIPPED_WORDS` 2 -> 3 compiles differently. So this round changed no compiled code, and section 5's check-v4 verdict (EQUIVALENT) still describes what runs. That is an argument, not a re-run: the controller's next check-v4 run will confirm it.

### Mutant proof (mirror tree, MAIN read-only; `sdd\t3-r1-proof.mjs`, output `sdd\t3-r1-proof.out.txt`; run three times, same result each time, the last on the final bytes)

| Variant | Before this round | Now |
|---|---|---|
| v3 original (`sdd\t3-orig`, 5,940 B), the RED state | `10 failed \| 58 passed (68)` | `Tests 10 failed \| 58 passed (68)`, the same 10 test names |
| final module | 68 passed | `Tests 68 passed (68)` |
| digit rule removed (`&& !/\d/.test(finalTok)` out of `isRespelling`) | 68 passed (survivor) | `Tests 1 failed \| 67 passed (68)`: only `"twenty five" -> "25": the same shape (v3 restored "five")`; Expected "last week, then rolled it back." / Received "two last week, then rolled it back.", i.e. the NEW expect |
| guard narrowed to `\p{L}` (`[\p{L}\p{M}]` -> `\p{L}`) | 68 passed (survivor) | `Tests 1 failed \| 67 passed (68)`: only the résumé test; Expected "and your last role." / Received "re sume and your last role.", i.e. the NEW decomposed expect |
| non-ASCII guard removed (continuity with round 1) | 2 failed | 2 failed (the İ test and the résumé test), unchanged |

A vitest test stops at its first failing expect, so the RED run against v3 never reaches the two new expects. Run directly on the v3 module they FAIL ("two last week, then rolled it back." and "re sume and your last role."); on the final module they pass.

### Gates (fresh, on the final bytes in MAIN)

- RED: above (`Tests 10 failed | 58 passed (68)`). GREEN on MAIN, TEST form from a temp cwd: `Tests  68 passed (68)`.
- Existing adapter tests (`electron/audio/DeepgramStreamingSTT`): `Test Files  4 passed (4)`, `Tests  10 passed (10)`.
- tsc: root exit 0, no output. Electron exit 2, exactly the 6 baseline errors, 0 in `deepgramBoundaryRepair*`.

### Final state of the changed MAIN files (read back from disk at the end)

| MAIN-relative path | bytes | sha256 |
|---|---|---|
| `electron/audio/deepgramBoundaryRepair.ts` | 10,743 (round 1: 10,262) | `d5ba4da0650e75319b3e4be09dffd529edf48a80f36f8613a2797606e3accc27` |
| `electron/audio/deepgramBoundaryRepair.test.ts` | 13,947 (round 1: 13,159) | `6956aea35dfef746f1a6132153774c833cdb4b6ffb335154a19890c18c9faec4` |

Both LF only, no BOM, valid UTF-8, NFC. The test has 2 literal `\u0301` escapes and no U+0301 character.

### Effect on the sections above

- Section 6 (hashes and sizes) is superseded by the table above.
- Section 9, the unpinned `\p{M}` half of the guard: now pinned by the résumé test's decomposed expect (proved by the mutant).
- Section 10, items 1 and 2 (the describe title, the "line-for-line" header): fixed (M3, M2). Item 3 stands.
- Section 5's check-v4 verdict was for the round-1 module; its compiled code is unchanged (above).

### Housekeeping

New scratch under `BR\sdd\`: `t3-r1-orig\` (the round-1 starting files), `t3-r1-verify-stage.mjs`, `t3-r1-bytes.mjs`, `t3-r1-fix-escape.mjs`, `t3-r1-code-unchanged.mjs`, `t3-r1-proof.mjs`, `t3-r1-report-section.md`, `t3-r1-report-pointer.md`, `t3-r1-append-report.mjs`, `t3-r1-fix-report-escape.mjs`, `t3-r1-scan-escapes.mjs`, and the `t3-r1-*.out.txt` outputs. The proof script builds a mirror tree with a junction into MAIN's `node_modules` and removes the junction (`rmdir`, link only) and then the tree in a `finally`; after each run I confirmed the tree was gone and MAIN's `node_modules\vitest` present.
