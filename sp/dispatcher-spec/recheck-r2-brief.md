# Brief: scoped Opus re-check of the turn-memory (dispatcher) spec, revision 2

DS = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\dispatcher-spec`
WT = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn` (the code the spec changes; MAIN will equal it after today's cue merge)

## What this is
The interviewer-turn machine forgets closed turns, so a statement turn that closes as not-a-question and a late
echo can produce a late or a double answer (diagnosed on br1 S1Q08, 2026-09-30). The fix is designed behind the
proposed flag NATIVELY_TURN_MEMORY. History: spec r1 (`DS\2026-10-01-turn-memory-design.md`) → Opus review
(`DS\REVIEW.md`, NOT READY) → revision 2 by Fable (`DS\2026-10-01-turn-memory-design.r2.md`, change log
`DS\CHANGES-r2.md`, prototype and calibration scripts `DS\r2\`, all re-run by `DS\r2\run-r2.mjs`). You are the scoped
re-check of revision 2. Implementation is planned only after Friday's validation hour; nothing is built now.

## Check, in this order
1. **Every REVIEW.md finding** (Critical, Important, Minor): addressed in r2 as CHANGES-r2 says? For each, name the
   r2 section and say ADDRESSED, PARTLY (what is left) or NOT. Changes r2 made that no finding asked for: listed
   and justified?
2. **The prototype's numbers reproduce.** Re-run `node DS\r2\run-r2.mjs` (node scripts only) and compare its outputs
   with the saved ones the documents quote; name any number that differs.
3. **The design is sound where the fixtures cannot reach.** CHANGES-r2 states that 0 splits and 0 ignores occur on
   the fixtures, so C3's branches rest on crafted cases only. Read those crafted cases against the code paths they
   claim to exercise (`WT\electron\services\interviewerTurn.ts`, `WT\electron\main.ts` actOnTurn/dispatchDetection,
   `WT\electron\services\QuestionDetector.ts`): would a real session reach each branch the way the case says?
4. **Failure modes:** each new state's error path, empty and outage cases (the `unknown` verdict on an outage, a
   throwing detector, a missing Live text, the flag off): named in the spec with its behaviour, and does flag-off
   reproduce today's behaviour exactly (byte for byte in the dispatch log, if the spec claims so)?
5. **holdout40 is never used to tune.** Check the validation plan uses non-holdout recordings only, and that the
   "statements answered (on) ≤ (off)" gate is pre-registrable as written (computable from what a flight logs, can
   fail).
6. **The user's 18 decisions (Appendix C):** complete, each with a recommendation and its consequence; nothing
   decided silently in the text.

## Output
Write `DS\RECHECK-r2.md`: a VERDICT line (READY / READY WITH FIXES / NOT READY); findings numbered with severity
(Critical / Important / Minor), each with evidence (file + line, or a script's output); mechanical fixes as
verbatim OLD/NEW blocks against r2 where a fix is mechanical; the decision list as it should stand for the user.

## Constraints (binding)
- Read-only everywhere except `DS\RECHECK-r2.md` and `DS\recheck-r2-scratch\`. Do not edit r1, r2, CHANGES-r2,
  anything under `DS\r2\`, or anything in WT or MAIN.
- No vitest, tsc, build or npm; no API or model call; never start the app. Node scripts that read files are fine.
- Do NOT dispatch subagents of any kind.
- Never print, read or copy an API key or any `.env`. Never read `credentials.enc`.
- Captured prompts and run logs carry the user's personal profile: never reproduce their text beyond log line
  heads, timestamps, ids, counts and short transcript fragments the spec already quotes.
- holdout40 is never used to tune or choose anything.

When finished, reply with ONLY: the verdict, the number of findings by severity, and the path of RECHECK-r2.md.
