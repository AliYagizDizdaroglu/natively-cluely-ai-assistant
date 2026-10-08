
## 12. Fix round 1 (the coordinator's message after the Opus task review: I1 + M1 to M4; M5 not fixed)

Status: done, counts unchanged as required. `check-v4.mjs` was NOT run this round (instructed: another agent is extending it), and neither was `check-v4-built.mjs`, which calls it. Still no git, no `.env`, no subagent.

Start: `node BR\seed-stage.mjs electron/audio/deepgramBoundaryRepair.ts electron/audio/deepgramBoundaryRepair.test.ts` reported both IDENTICAL to MAIN: module 10,262 B / 8aca65e4, test 13,159 B / 10d8040a, exactly what round 1 left. Snapshot kept in `BR\sdd\t3-r1-orig\`.

### What changed

| Item | Where | Done |
|---|---|---|
| I1, the pin | test, the "twenty five" test | the coordinator's 4-line block ("version two" -> "v2") appended after its existing expect, verbatim |
| I1, the comment | module, the comment above `isRespelling` (lines 92 to 97 now) | keeps the original counts ("1 for a digit ... 0 refused for the first letter") and then explains them: "but check-v4 counts each cut under the FIRST rule that refuses it (digit, longer, first letter), and a spelled-out number never shares its first character with its digits, so "ninety" -> "92" fails the first-letter rule too: "1 digit, 0 first letter" only reflects that order. The data isolates neither rule; the digit rule rests on the synthetic "v2" for "version" case, the first-letter rule on the synthetic "put" for "cut" case." (The other agent's in-progress check-v4 note says the same about check order.) |
| M1 | test, the résumé test | the coordinator's 3-line block appended after its existing expect, with `résumé` as literal escapes (tool quirk below) |
| M2 | module header, lines 16 to 20 | the coordinator's phrase verbatim: "a port of rule-v4.mjs, line for line except v2's alignment guard (rule-v4.mjs:64), which the non-ASCII guard makes unreachable (re-review M-a)"; the sentence is re-wrapped from 3 to 5 lines, its tail ("the two must agree event for event (check-v4.mjs proves ...") unchanged |
| M3 | test line 134 | "aligned interims only" -> "ASCII-lettered interims only" |
| M4 | test lines 139 to 141 | "a 5852 ms gap" -> "F2 5164 ms after F1 (outside the window)"; the 3-line comment re-wrapped (longest line 122 columns, the file's existing range) |
| M5 | none | NOT fixed, as instructed |

One thing I caught myself: my first wording of the I1 comment quoted "0 for the first letter" without stating that count anywhere, a dangling reference. I reworded it before finishing (the table row is the final wording, and it is what is in MAIN).

### Tool quirk, for the record

The Edit tool unescapes a typed backslash-u sequence. My M1 line first landed in the staged test with two real U+0301 characters (the verifier said `U+0301 characters=2`, first difference at char 12372) instead of the six literal characters. The Write tool keeps the sequence literal (bytes `5c 75 30 33 30 31`; `sdd\t3-r1-bytes.mjs` shows both). Fixed by `sdd\t3-r1-fix-escape.mjs`, which maps each U+0301 to the literal escape (both built from char codes; it refuses unless there are exactly 2). Final state read back from MAIN: literal escapes 2, U+0301 characters 0, file NFC. Anyone who edits that test line through the Edit tool will hit the same thing.

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

Both LF only, no BOM, valid UTF-8, NFC. The test has 2 literal `́` escapes and no U+0301 character.

### Effect on the sections above

- Section 6 (hashes and sizes) is superseded by the table above.
- Section 9, the unpinned `\p{M}` half of the guard: now pinned by the résumé test's decomposed expect (proved by the mutant).
- Section 10, items 1 and 2 (the describe title, the "line-for-line" header): fixed (M3, M2). Item 3 stands.
- Section 5's check-v4 verdict was for the round-1 module; its compiled code is unchanged (above).

### Housekeeping

New scratch under `BR\sdd\`: `t3-r1-orig\` (the round-1 starting files), `t3-r1-verify-stage.mjs`, `t3-r1-bytes.mjs`, `t3-r1-fix-escape.mjs`, `t3-r1-code-unchanged.mjs`, `t3-r1-proof.mjs`, `t3-r1-report-section.md`, `t3-r1-report-pointer.md`, `t3-r1-append-report.mjs`, and the `t3-r1-*.out.txt` outputs. The proof script builds a mirror tree with a junction into MAIN's `node_modules` and removes the junction (`rmdir`, link only) and then the tree in a `finally`; after each run I confirmed the tree was gone and MAIN's `node_modules\vitest` present.
