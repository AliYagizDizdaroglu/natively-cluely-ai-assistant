# Pre-registration: the cue re-smoke (small cues, v2)

The rule below was written 2026-09-30 at 11:19 local, before the v2 build existed and before the task was registered.
The section "What flies" is filled in at arming, after the build and before registration.

**Amended the same day at 15:26 local, still before the v2 build existed and before the task was registered. No run of
this build exists.** The final whole-branch review and the afternoon's MAIN hour (br1) showed four things the 11:19
text did not cover. Each change is marked "(15:26)" where it sits:

1. **A block-only answer is a cue failure.** A reply that is only a cue block, with no spoken answer under it, passed
   the 11:19 check. The v2 wording tells the model a block can be one word, so this is the failure that wording could
   cause. The check is now v4 and fails it.
2. **Two more pipeline events:** the two knowledge short-circuits, which log an absent block for a stream that never
   saw the cue rule.
3. **A health failure that is not a cue failure** now has a stated consequence. br1 answered one S1 question 61 s
   late on the same dispatcher this build carries.
4. **The `first token` sentence was wrong.** The line fires when the first prose LINE ends, not after the cue block.
   Two timing reads are added to the reported list.

## What it is for

The 05:00 smoke (`2026-09-30T02-38-22-cuesmoke`, record beside this file) ran cue mode v1: a rule of 5 lines of 8
words that lived only in the prompt. It was NOT CLEAN. One answer (S1Q09, a question that names 8 parts) opened with
8 cue lines. The app was otherwise healthy (20 of 20 answered hands-free).

The user then set the intent: cues are "small and fast", at most 3 lines of at most 5 words as a CEILING. v2 asks for
that in the prompt, with the wording spike 6 chose (`PREREGISTER-spike6.md`), and enforces it in code at the display
boundary, logging every line it changes.

This run is the first live run of that build. It is also the first live run of cue mode together with MAIN's hedge
default (3.5-lite HIGH answers first, 3.1-lite LOW starts after about 5 s).

## The run

- **Task:** scheduled task `Natively-smoke-cues`, working directory the whole-turn worktree, launcher
  `launch-smoke-cues.cmd`.
- **Configuration:** scenario50 S1, hands-free, `interview60.run.mjs auto cuesmoke`. Every model, hedge and thinking
  variable is cleared, which is the shipped default.
- **Start gate:** both lites must answer a tiny request in the same attempt (`wait-for-gemini.mjs --models`). It
  retries every 15 min until 18:30.
- **After the hour:** the app is stopped and `check-smoke-cues.mjs` (v4) runs on the run folder. The launcher log
  ends with `CHECK EXIT n`.

## PASS = all three

1. **`CHECK EXIT 0`** from `check-smoke-cues.mjs` v4, calibrated on 26 cases with known answers
   (`calib-cue-smoke.mjs`; 23 cases at 11:19, plus 4 for the block-only rule, one of which replaces a v3 case). The
   check requires:
   - Every `[Answer] cues:` line is a non-empty block of at most 3 non-empty lines of at most 5 words, with no
     notation left in a cue (a backtick, or a backslash before a letter, a bracket or `%`; a money `$` is fine). An
     absent block, `[]`, fails.
   - The number of cue lines lies in [real + superseded, real + superseded + failed], where:
     - real = `[Answer] full:` lines that are model answers;
     - superseded = `_what_to_say stream aborted by new generation` lines;
     - failed = full lines carrying the engine's failure text (`[No answer — …]` or "Could you repeat that? I want to
       make sure I address your question properly.").
   - At least one real answer.
   - **(15:26) No block-only answer:** no non-empty `[Answer] cues:` line is directly followed by the "Could you
     repeat that? …" full line. (A block followed by the abort line is a superseded stream. A block followed by
     `[No answer — …]` is a transport failure. Neither counts.)
2. **The app is healthy**, read from the run folder's `interview60.report.md`: `Answered hands-free` at least 90% of
   S1, and `Long questions answered whole` all.
3. **The cue row** of that report: present = well-formed = n, with n at least floor(0.9 × delivered).

## NOT CLEAN has three kinds, decided before the data

- **A cue failure.** Any of:
  - a non-empty block that is malformed (4 or more lines, a line of 6 or more words, notation, an empty cue);
  - an absent block beside a REAL answer;
  - **(15:26) a block-only answer,** unless the log shows a transport error for that same answer (then it is a
    pipeline event).

  The fix goes back through the plan's tasks. Nothing else is armed on that build, and cue mode does not merge.
- **A pipeline event.** The ONLY causes of the failure are one or more of:
  - a `[]` directly before a failed answer (a stream that ended without text; the check prints a hint);
  - a full line with no cues line from a coding route;
  - a superseded stream that logged no block;
  - a count that the failed or superseded answers explain;
  - **(15:26) a knowledge short-circuit:** a `[]` beside an answer that never reached a model with the cue rule. Two
    shapes, both readable in the log: `[LLMHelper] Knowledge mode (stream): returning generated intro response`, and
    a full line that is the negotiation card (`{"__negotiationCoaching":…`).

  The result note names each one, and the re-smoke is **re-run once**. A pipeline event is never re-worded into a
  pass. A second run that ends the same way goes back to the spec.
- **(15:26) A health failure with no cue failure.** The check is clean and the cue row passes, but condition 2 fails:
  a question was answered late, not at all, or not whole, for a reason the log places in the dispatcher or the
  provider (for example a turn closed as `not-a-question`, as br1's S1Q08 was this afternoon). The run does not pass.
  The result note names the item and quotes its dispatcher lines. The re-smoke is **re-run once**. A second run that
  fails the same way goes to the dispatcher's own debugging, and cue mode does not merge until a run passes all three.

## Reported, never gating

- **The `trimmed` count** and every `[Answer] cues trimmed:` line, quoted from the run folder's
  `natively_debug.log`: the display cap and the notation cleanup at work. **(15:26)** The note splits them: cap
  overruns (`dropped`, `cut`) against cleanups (`cleaned`), and it reads every `cleaned` line for a lost currency
  sign (the cleanup removes a `$` that follows a non-space character).
- **The hedge split:** the `verbal hedge: won by <model>` lines.
- **Failed and superseded answers,** by name.
- **The report's first-token timings.** **(15:26, corrected)** In a cue build the `first token` line fires when the
  first prose LINE ends, because the parser holds the block and that line together. For a one-paragraph answer that
  is about the end of the stream. The number is honest about the screen, and it is not comparable with h40c's.
- **(15:26) The hold, measured.** Two reads per answer:
  - the gap between the `[Answer] cues:` line and the `[Answer] budget:` line (a gap under 15 ms means the cues and
    the whole answer appeared together; at 05:00 that was 14 of 22);
  - the time from the hedge's `won by … at N ms` to the `first token` line.

## What this run cannot show

- **A trim or a cleanup,** if the model never overruns or writes notation during the hour.
- **3.1-lite's cues,** except on the few answers its back leg wins.
- **The overlay itself.** The user looks at it once during the run.
- **Typed chat.** It has its own check after this one, on a build the user starts.
- **Answer quality.** That is the bench's job.
- **(15:26) A block-only answer on a simple question.** S1's questions are mostly long. The simple-question probe
  counts them (`PREREGISTER-cueprobe.md`).

## What flies (filled at arming)

- Code: branch `feat/whole-turn-answers`, built from commit `e3fae5fb0c6eb95d18110bb66335effbb6067897`.
- Build: `dist-electron/electron/main.js` written `2026-09-30 15:44:09 local (12:44:09.492Z)`; all six build markers read as expected.
- The docs commit that carries this file sits on top of that commit and changes no code.
