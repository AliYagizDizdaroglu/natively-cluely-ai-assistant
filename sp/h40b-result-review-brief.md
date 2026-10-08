# Fact-check brief: the h40b result note

You are checking a results document before it is committed. You READ ONLY. Do not edit, move or
create any file except your own findings file. Do not run git. Do not start or stop any app.
Do not dispatch subagents.

## The document under review

`C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\stage\electron\test\golden\passes\2026-09-26-h40b-result.md`

It applies a pre-registered pass rule to a one-hour flight (h40b) of an interview-assistant app and
compares it with the previous flight (h40a).

## Your job

1. **Every number and every factual claim** in the document must trace to a source below. For each
   one you cannot confirm exactly, write: the claim as written, the correct value, and the source
   (file and line or the command you ran).
2. **The rule is applied as registered.** Read the pre-registration's four legs and its
   no-regression reading, and check the document applies each one to the right numbers, with no
   leg softened, merged or skipped.
3. **Hunt for what is missing.** The pre-registration names things the result must report (the
   confounds; R09 not counting as generalisation evidence; the twins compared on the ids both hours
   captured). List anything required and absent, and any material fact in the sources the document
   omits or contradicts.
4. **Wording that overclaims.** Flag any sentence that states as proven something the sources only
   suggest.

Ignore style. Do not re-grade any answer: the verdict files are the instrument.

## Sources

MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`
G = MAIN `\electron\test\golden`

- Pre-registration: `G\passes\PREREGISTER-h40b.md`
- Pass records (large, grep them): `G\passes\2026-09-26T11-39-51-h40b.md` (h40b) and
  `G\passes\2026-09-24T08-20-12-h40a.md` (h40a). Each has a Summary, a Gate table and a section per
  question with the heard text, every arm's answer and its grade.
- Run folders: `G\interview60.runs\2026-09-26T11-39-51-h40b\` and
  `G\interview60.runs\2026-09-24T08-20-12-h40a\`. In each: `interview60.judge.verdicts*.json` (raw
  grader scores), `interview60.judge*.json` (the judge's merged verdicts, `items[id].verdict`),
  `interview60.prompts.json` (the captured answer prompt per question id), `natively_debug.log`
  (the app's log), `interview60.report.md`.
- The judge's verdict rule: `G\interview60.judge.mjs`, function `verdictOf` (wrong when correctness
  or on_topic is 0; acceptable when both are 2 and delivery is at least 1; weak otherwise).
- Two throwaway analysis scripts whose output the document uses; you may run them with `node <path>`
  (both are read-only): `<SP>\h40b-compare.mjs` and `<SP>\h40b-confounds.mjs`, where
  SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`.
  Check the scripts' logic too: a script can reproduce a wrong number faithfully.
- The full-Flash sidecar section: the ledger `<SP>\sdd\2026-09-25-flight-h40b\progress.md`, lines
  starting "16:39 FLASH BLIND SCORE", "16:28 BLIND FLASH GRADING", "15:25 FOLLOW-UP DONE" and
  "14:58 SIDECAR DONE"; raw data in `<SP>\flash-h40b\` (answers files, `tiers.json`, per-model
  logs, `blind\` with the blind pairs, keys and verdicts). The scorer is `<SP>\flash-h40b-score-blind.mjs`.
- Prior-flight facts the document quotes (s50l/s50m 3.5-lite HIGH led on mains) come from project
  memory; mark them "not checkable from the sources", do not count them as errors.

## Output

Write your findings to `<SP>\h40b-result-review.md`:
- a line per confirmed-wrong claim: `WRONG | <claim as written> | <correct value> | <source>`
- a line per unconfirmable claim: `UNVERIFIED | <claim> | <what you looked at>`
- a line per missing required item: `MISSING | <item> | <where the requirement is>`
- a line per overclaim: `OVERCLAIM | <sentence> | <why>`
- a last line: `CHECKED <n> claims, <w> wrong, <u> unverified, <m> missing, <o> overclaims`.

Then reply with that last line only, plus the path of the findings file.
