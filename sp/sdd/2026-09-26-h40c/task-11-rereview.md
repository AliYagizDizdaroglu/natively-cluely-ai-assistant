ALL ADDRESSED

# Task 11 fix round 1: scoped re-review (MAIN 391f1fc + uncommitted working tree)

Counts: 3 of 3 Minors addressed · 0 new defects · 2 residual notes (not defects)

## Nothing else changed

I compared each of the 8 files with my pre-round mirror copies (taken at the first review). Only three files changed this round, all in the places the rulings name:

- `followUpParent.ts`: the docstring only.
- `interview60.pass-record.mjs`:
  - the new `verbalHedgeFromLog`;
  - `collectPass` now calls it;
  - `hedgeEngaged` is new.
- `interview60.pass-record.test.ts`:
  - two imports;
  - one Minor-3 test;
  - a new `verbalHedgeFromLog` describe block with 2 tests.

The other five files are byte-identical to round 0. `LLMHelper.ts` and `verbalHedge.ts` are still identical to HEAD. Across the 814 tracked blobs, the list of files that differ from HEAD is unchanged apart from the new mtimes on these three. All files are LF with no BOM.

## Minor 1: ADDRESSED

- **What was added.** `verbalHedgeFromLog(dbg)` is exported at pass-record.mjs:56. `collectPass` uses it at :89. The test at pass-record.test.ts:224-235 feeds the output of the real `describeVerbalHedgeAtStartup({})` and `({NATIVELY_VERBAL_HEDGE:'1'})`, each wrapped as `<ISO> [LOG] <line>`, and also checks the null case.
- **Calibration on the mirror.**

  | Mutation | Result |
  |---|---|
  | `verbal hedge:` → `verbal-hedge:` (my round-0 mutation, which previously survived 24/24) | 1 failed |
  | Mine: the regex keeps only `off` | 1 failed |

- **End to end.** An s50a copy with the real line inserted still parses as `on trigger=5000ms`, `off` or null, and renders as in round 0.

## Minor 2: ADDRESSED

followUpParent.ts:15-22 now says:
- `describeVerbalHedgeAtStartup` embeds `[Main] ` and is logged raw;
- this function returns the line without the prefix, and main.ts adds it.

This matches main.ts:3446-3447. There was no code change.

## Minor 3: ADDRESSED

- **What changed.** At pass-record.mjs:185, the hedge label now requires both conditions:
  - `verbalHedge` starts with `on`;
  - `answerModel` is `gemini-3.1-flash-lite` or `gemini-3.5-flash-lite`.
- **The new test** (pass-record.test.ts:134) sets hedge on with `gemini-3.5-flash`. It asserts:
  - the answers row reads `gemini-3.5-flash (in-app)`;
  - there is no hedge pair;
  - the summary bullet is still present.
- **Mutation.** Dropping the lite check makes that test fail (1 failed).

## Hard constraint and gates, re-run

- **HEAD against the working module**, over all 27 run folders: 27/27 records are byte-identical, `passRow` is identical for every folder, and INDEX is identical (34 lines).
- **Test files from MAIN, clean env:** 7 files, 80/80 pass, with s50a copied into the scratch cwd and 0 skipped.
- **With `NATIVELY_VERBAL_HEDGE=1` and `NATIVELY_VERBAL_HEDGE_TRIGGER_MS=1` set:** geminiThinking and verbalPrimary pass 10/10.
- **`tsc -p electron/tsconfig.json --noEmit`** (on the mirror): exactly the 6 pre-existing errors.

## Residual notes (not defects; no action required by the rulings)

1. **`collectPass`'s call to the helper is not pinned.** Mutating pass-record.mjs:89 to `verbalHedge: null` survives 27/27. The only fixture that reaches `collectPass` is s50a, which has no hedge line. The regex is now proven, but the one-line wiring is not; the h40c smoke or flight record is its first exercise.

2. **Two small inaccuracies from round 0.**
   - **My test gap.** Keeping only 3.1-lite in the lite set survives 27/27. No test uses a 3.5-lite `answerModel` with the hedge on.
   - **My wrong example.** The comment at pass-record.mjs:182-183 cites `NATIVELY_VERBAL_PRIMARY_MODEL` as a way to get a non-lite primary. That came from my own round-0 example, and it was wrong: `verbalPrimaryModel` refuses anything outside the two lites (LLMHelper.ts:51). Also, `answerModel` comes from CredentialsManager's "Default Model set to" line, not from the override. The real non-lite case is a selected default model such as Gemma or full Flash, which the code handles correctly. Only the comment's example is off.
