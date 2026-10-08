# Opus spec + plan review of DESIGN-v4 / PLAN-v4 (2026-09-29)

**Verdict: Sound with changes.** There are no Critical findings. The rule, the wiring and Tasks 3–4 run as written. Task 5's tests cannot pass under the plan's own test command.

Scripts are in `sdd/spec-review-v4-scratch/` and each runs with `node <file>`: `r1-files.mjs`, `r2-cwd-probe.mjs`, `r3-pause.mjs`, `r4-tree.mjs` (it runs the plan's exact code blocks on copies of current MAIN files, using MAIN's vitest, from %TEMP%), `r5-extractor.mjs`, `r6-probes.mjs` and `r7-port.mjs`.

## What checks out

**The 5 Important findings are fixed.** I re-ran the previous reviewer's probe inputs against `rule-v4.mjs` (r6):
- v3's wrong restores ("two percent", "five", "percent", "right", "zmir projesinde") are all gone.
- R22 still restores "hallucinations".
- Spanish and Russian are still mangled by the module on its own, so safety depends on the adapter's gate, as §5 says.

**The plan's TypeScript module matches `rule-v4.mjs` exactly** (r7): 0 differences over 13,892 events, with repairs of 25 / 4 / 6. The same comparison can detect a real difference: the v3 module differs on 2 of 2 synthetic pause cases.

**The pause handling matches the adapter code.**
- An empty final is a Transcript event with `transcript ""`, and `clear()` sits before the return at `DeepgramStreamingSTT.ts:225`.
- UtteranceEnd is its own event, emitted in socket order at `:247`.
- `speech_final` is a top-level field of the results message (`seam-probe.mjs:106` records the same field).
- All 9 "replace" blocks occur verbatim, exactly once, in the current files. Sizes and sha prefixes match the plan.

**No clear lands inside a real loss.** My own runner (r3) gives: seam 6→6, non-holdout 25→25, holdout 4→4, 0 differences.
- None of the 63 seam cuts had an empty final, an UtteranceEnd or `speech_final` on F1.
- In the logs, 1 UtteranceEnd falls inside a NORMAL cut (nothing lost) and 1 empty final falls inside the 49.9 s TAIL1 case.

**Running the plan's exact code** (r4) reproduced every claimed count for Tasks 3 and 4:

| Step | Result |
|---|---|
| Task 3 RED | 9 failed / 58 passed |
| Task 3 GREEN | 67 passed |
| Task 4 keyterms RED → GREEN | 1 failed / 6 passed → 7 passed |
| Task 4 adapter RED → GREEN | 4 failed / 2 passed → 6 passed |
| Gate calibration (gate removed) | 1 failed / 5 passed |
| Audio neighbours present in the mirror | 89 of 89 passed |
| tsc over the finished tree (electron compiler options) | exit 0 |

**The English gate is sound.**
- `languageCode` can only be `'en'`, an iso639 code, or `'multi'` (`languages.ts:15-78`, `DeepgramStreamingSTT.ts:70-84`). The default setting is `english-us`.
- `'multi'` fails the test.
- The gate is re-evaluated in every `connect()`, which covers reconnects and the restart that a language change triggers.
- Sharing `isEnglishLanguage` with `keytermsFor` changes nothing for keyterms: the regex is identical and all 7 keyterm tests pass.

**The extractor pairs the repair line with the right final.**
- Both lines come from one synchronous handler, and `main.ts:63` writes with `appendFileSync`.
- Parity 132 / 181 holds for both the old parse and the v4 parse.
- The end-to-end run on s50a with `scenario50-tts-local` (all 40 WAVs present) gives 132 finals; `finals`, `items` and `actual` all deep-equal the committed fixture.
- When I injected a synthetic repair line, the restored word landed on the correct final.

**The numbers trace to files.** I spot-checked 3715 / 3115 / 3207, 7835 / 2506 / 3774 / 12, 187 / 445 / 223, 26 = 18 + 7 + 1, and `main.ts` lines 1401 / 1584 / 1609 / 1413.

**Holdout (reported separately, not used for any argument):** 4 repairs stay 4, with 0 clear signals between F1 and F2. Of 3 tolerant cuts, 1 is kept and 2 are refused ("idem"→"idempotent" as longer, "exactly"→"a" for the first letter); none was followed by a repair.

## Important

**I1. Task 5's parity tests cannot pass under the plan's test command.** The test uses `path.resolve(process.cwd(), 'electron/test/golden')` (PLAN-v4.md:632), but vitest workers inherit the caller's working directory, not `--root`.
- r2 printed `WORKER_CWD=C:\Users\sotka\AppData\Local\Temp`, while `__dirname` was the test file's folder.
- In r4 the old parse gave 4 failed / 1 passed (the plan says 2 / 3), and the v4 parse gave 2 failed / 3 passed (the plan says 5 passed). Both failures are `ENOENT ...\AppData\Local\Temp\electron\test\golden\interview60.runs\2026-09-09T15-00-55-s50a\interview60.timeline.json`.
- Step 5 has the same problem: `interviewerTurn.replay.test.ts:7` also reads through `process.cwd()`, and memory `tooling_vitest_temp_cwd` records it failing from a temp working directory. It also never imports the extractor or `finalsFrom`, so it cannot "guard the import path".
- **Fix:**
  - Use `const golden = __dirname;` in the new test.
  - Drop Step 5, or run it from MAIN's working directory with a log fingerprint taken before and after.
  - Treat Step 4's end-to-end extractor run as the real import-path check. I ran it and it passes.

## Minor

**M1. The case for refusing a longer token is wrong for inflections** (DESIGN-v4.md:90-93, the module comment, the "breaks" test at PLAN-v4.md:82-85).
- All 7 non-holdout "breaks" cuts are aligned: I "…and break score ties by original row", F1 "…and breaks", F2 "score ties by original row order." The inflection does not shift T.
- So refusing a longer token costs recall on inflections. In my probe, "scale"→"scales" followed by a lost "horizontally": v3 restores the right word and v4 restores nothing.
- The plan's synthetic test pins what most naturally reads as a TRUE loss of "even" as if refusing it were a precision gain. Keep the rule, but describe it as a known recall cost.

**M2. Shapes v4 still accepts, not listed in §8.**
- Shorter symbol merges: "Q and A"→"Q&A" and "M and A"→"M&A" make v4 emit "A session on Friday."
- Accented English: "résumé" becomes "r sum" and "café" becomes "caf". These tokens stay aligned, so the alignment guard lets them through.
- Neither appears in the data: 0 "&"-joined words and 0 non-ASCII letters across all 28 English logs.
- Either list them as residuals, or add a one-line ASCII floor (no cut when I contains a non-ASCII character). That floor costs nothing on the recorded data and would also cover es/ru if the gate were ever bypassed.

**M3. Holdout data is used as evidence.** The changed ruling's evidence (DESIGN-v4.md:19-22 and the module comment) counts the holdout cuts "idem" and "exactly". On non-holdout data there are 42 tolerant cuts: 34 kept, 7 refused as longer, 1 for a digit, 0 for the first letter. So the first-letter rule rests only on the synthetic "put" case.

**M4. The pause evidence has a scope limit that §6 and §8 should state.**
- Only 14 of the 25 non-holdout repairs are in logs that carry utterance-end lines (15 of 28 logs have them; the listener dates from 2026-09-09).
- `speech_final` is never logged. On the app's audio path its effect is therefore unmeasured, and the §10.6 live run cannot count it; only a seam probe records it.

**M5. Things an implementer would have to guess:**
- How to seed the stage for the three files that have no staged copy (`deepgramKeyterms.ts`, its test, `interview60.turns-fixture.mjs`): byte-copy first, then edit the staged copy.
- Controller step 1: `check-v4.mjs` has no hook for plugging in the built module, so a wrapper is needed. r7 is one.
- Task 5 Step 2 fails with "Failed to resolve import", not "Failed to load url".

**M6.** DESIGN-v4 §8 says "25 of 25 is a floor on precision". It is the measured precision; 25 is a floor on the number of losses.
