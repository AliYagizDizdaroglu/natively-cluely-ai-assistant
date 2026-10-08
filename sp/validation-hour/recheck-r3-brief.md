# Brief: scoped Opus re-check of PREREGISTER-h40d, revision 3

VH = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\validation-hour`
WT = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn`
MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`

## What this is
Friday 2026-10-02 13:30 flies h40d: the validation hour of cue mode on holdout40, on MAIN after the cue merge.
Its pre-registration went: draft → Opus review (`VH\REVIEW.md`) → revision 2 (`VH\PREREGISTER-h40d.md`) →
Opus re-check (`VH\RECHECK-r2.md`, READY WITH FIXES: N1–N9, I5, grader drift, M13, §12) → revision 3 by Fable
(`VH\PREREGISTER-h40d.r3.md`, change log `VH\CHANGES-r3.md`, edits `VH\r3-scratch\r3-edits.txt` applied by
`VH\r3-scratch\apply-r3.mjs`). You are the scoped re-check of revision 3. You are the last reader before the user.

## Check, in this order
1. **The edits did what RECHECK-r2 asked, and nothing else.** For each of N1–N9, I5, GRADER DRIFT, M13, §12:
   applied as the re-check's edit (or a stated, reasoned deviation in CHANGES-r3)? Diff r2 → r3 yourself (a node
   script in `VH\recheck-r3-scratch\` is fine); every hunk must trace to one of those items. Name any hunk that
   does not.
2. **Internal consistency.** No rule contradicts another after the edits (precedence, the outcome table, §5/§6,
   the counting rules, the decisions list). Check the numbers r3 states against their sources where a script can
   (the calibrations in `VH\run-calibrations.mjs`: re-run it and compare with its three saved outputs).
3. **The user's decision list** (end of CHANGES-r3 and r3's own list): complete, each with the controller's
   default and the consequence of each choice stated, nothing decided silently in the text.
4. **New facts, after r3 was written (09:27). Does r3's text handle each? If not, propose the minimal edit.**
   a. **The cue bench PASSED** (`WT\electron\test\golden\passes\2026-10-01-cuebench-result.md`): band, wrong and
      cue checks hold; but the cue arm was rated acceptable lower than control in all three reps (−2, −3, −3 of 39;
      15 ids lower, 6 higher). Does r3 depend on the bench's outcome anywhere (preconditions, quotas, the day rule)?
   b. **A record with NO text at all.** The bench's cue arm had S2Q06F rep 1 with `rawLen 0`, finish
      `MALFORMED_RESPONSE`, no cue block, no `transientError` (`answers.mjs` recorded it as an answer). r3's
      empty-prose rule names two kinds: a block-only twin (cues present, prose emptied by a stage other than
      `filterCodeFences`) and a fenced answer (prose removed by `filterCodeFences`). A no-text record is neither.
      How does r3 count it in 3c's gated clause, in the all-ids line, and as a hole or not? If r3 is silent, propose
      one rule, with its consequence for a STOP, and say whether it is the controller's to rule or the user's.
   c. **The simple-question probe** (`WT\electron\test\golden\passes\PREREGISTER-cueprobe.md`, amendment of
      2026-10-01 09:30): its first counted run was void (the swap left the base question in), the re-run is the
      record. If r3 relies on the probe anywhere (e.g. the pre-hour check that `hasCueRule()` reads true on a
      cue-build prompts file), check that the reliance still holds.
5. **Anything that would make Friday's hour unreadable** (a rule that cannot be computed from what the flight
   writes, a check that cannot fail, a time that collides with a scheduled task). Read-only checks only.

## Output
Write `VH\RECHECK-r3.md`: a VERDICT line (READY / READY WITH FIXES / NOT READY); findings numbered with severity
(Critical / Important / Minor), each with its evidence (file + line, or a script's output); mechanical edits as
verbatim OLD/NEW blocks against r3, each OLD unique in the file; and the user's decision list as it should stand.

## Constraints (binding)
- Read-only everywhere except `VH\RECHECK-r3.md` and `VH\recheck-r3-scratch\`. Do not edit r3, r2, any script
  outside your scratch folder, or anything in WT or MAIN.
- No vitest, tsc, build or npm; no API or model call; never start the app. Node scripts that read files are fine.
- Do NOT dispatch subagents of any kind.
- Never print, read or copy an API key or any `.env`. Never read `credentials.enc`.
- Captured prompts (`interview60.prompts.json`, `verbal-prompts.log`) and answer/row JSON files carry the user's
  personal profile: never reproduce their text; print ids, counts, lengths and hashes only.
- holdout40 is never used to tune or choose anything.

When finished, reply with ONLY: the verdict, the number of findings by severity, and the path of RECHECK-r3.md.
