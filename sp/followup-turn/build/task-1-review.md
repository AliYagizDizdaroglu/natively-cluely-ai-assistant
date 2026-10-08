SPEC: PASS
QUALITY: APPROVE

# Task 1 review: the gate (commit 5c6394b on build/earlier-question, base 89c8f53)

Reviewer: Opus, read-only. 2026-10-05.

## Verdict basis (each check run here, not taken from the report)

| Check | Result |
|---|---|
| Branch ref `build/earlier-question` | 5c6394b37efe (read from MAIN `.git/refs/heads`) |
| WT `earlierQuestionGate.ts` vs the plan's Task 1 Step 3 block | byte-identical (sha12 e6c94dc7f416; LF, no BOM) |
| WT `earlierQuestionGate.test.ts` vs the plan's Task 1 Step 1 block | byte-identical (sha12 10ea3ca2b084; LF, no BOM) |
| 8 named regexes (INTERJECTION, CALLBACK, REFERENCE, LEADING, CONSTRAINT, THAT_NOT incl. `gi`, THAT_PRE, THIS_NOT) vs `followup-context/earlierQuestions.ref.mjs` (sha256 0459f578…, confirmed) | 8/8 identical source strings |
| `firstSegment`, `gate`, `SHORT_WORDS`/`CONSTRAINT_MAX_WORDS`/`wordsOf` bodies vs reference (type annotations stripped) | identical |
| Differential: transpiled TS port vs the reference `gate`/`firstSegment`/`wordsOf` on 2,791 inputs (every scenario50 question, its sentences, word prefixes 1..30, upper-cased, interjection-prefixed, padded, plus null/undefined/blank/em-dash/curly-apostrophe edge cases) | 0 differences. Calibrated: a one-character mutant (`previously` → `previouslyQ`, `these` → `thesQ`) produced 1 difference, so the harness does detect a change |
| Roster calibration ids (S1Q06F, S2Q06F, S2Q08F, S1Q04F, S2Q09F, S3Q04F, S4Q09F, S4Q04F) | all present; the REFERENCE gives each the cue the test expects |
| Calibration set size | 19 must-fire / 10 must-not, as the plan and spec §3.2 state |
| Test run (`eq-tmp` cwd, MAIN vitest 2.1.9, `--root` WT) | `Test Files 1 passed (1)`, `Tests 7 passed (7)` |
| Red evidence (`task-1-red.txt`) | `Failed to resolve import "./earlierQuestionGate"`, as the plan expects |
| Mutant evidence (`task-1-mutant.txt`) | short-cue line removed → `1 failed | 6 passed`, fails on `"Why?"` expecting `short` |
| Type-check evidence | root tsc empty; electron list = the 6-line baseline exactly (sorted diff empty) |
| Scope | the package diff touches 2 new files only; nothing beyond Task 1 |
| Style | 4-space indent, `vitest` imports, `as any` and `../test/golden/*.mjs` imports match existing `electron/**/*.test.ts` (23 files use the same patterns) |

## Are the tests real (would each fail if the behaviour broke)?

- must-fire / must-not: per-sentence `{fires, cue}` equality; any regex or order change on these inputs fails them (the mutant run shows it).
- interjection: without `INTERJECTION`, "Okay, and if it fails?" falls to `pronoun` and "Yeah. So, what about Redis instead?" to `none`, so both fail.
- constraint: swapping the constraint and pronoun checks gives `pronoun` on the first sentence; dropping the 25-word cap gives `constraint` on the 27-word one; both fail.
- empty/null: a missing `?? ''` would throw on null/undefined.

## Findings

1. **Minor (non-blocking, plan text): `electron/llm/earlierQuestionGate.test.ts:52`.** The test title says "stops at the first . : ; ? ! , or em dash", but neither assertion contains an em dash. The em dash is the only non-ASCII character in a gate regex, and the report says the file was copied through PowerShell `Copy-Item`. A lost or mis-encoded em dash would pass this test and be caught only by Task 3's parity run. No defect exists today: the byte comparison and the differential above (which includes em-dash inputs) prove the character is intact. Optional fix: add `expect(firstSegment('Scale it — how?')).toBe('Scale it');`. The implementer followed the plan's verbatim text, so this is not a deviation.
2. **Info, no action: `electron/llm/earlierQuestionGate.ts:3`.** The comment says "scratchpad followup-context/…". The plan's C1 revision moved working paths to the lab folder `sp`, which is where this file lives, so the comment is accurate in the user's own "SP" naming. It is verbatim plan text; leave it.

No Critical or Important findings.

## Not shown

- I did not run `git status` in the eq-build worktree because this reviewer session is worktree-isolated and its git calls are refused. Scope is judged from the package diff and the branch ref only; the report's "status clean" claim was not re-checked.
- The differential's input set is scenario50-derived and synthetic. Some regex alternatives are hit rarely (only 1 `callback` input), so it complements the byte-for-byte source comparison rather than replacing it. The byte comparison is the primary evidence.
- Parity on the 126 captured fixture entries is Task 3's job and was not run here.
