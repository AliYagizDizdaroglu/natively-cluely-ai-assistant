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

## Amendment for the second re-smoke

This section was written on 2026-09-30 between 19:55 and 20:20 local, before the combined build existed and before the
task was registered. "What flies" at the end was filled at arming, on 2026-10-01 after 00:04. No run of this build
exists. The run is scheduled for 2026-10-01 05:00.

The rule above is unchanged: PASS is the same three conditions, NOT CLEAN has the same three kinds, and the check is
the same v4 script on the same 26 calibration cases.

### Why there is another run

The 16:12 re-smoke (`2026-09-30T13-46-52-cuesmoke`; its record and `2026-09-30-cuesmoke-v2-result.md` are beside this
file) was NOT CLEAN: one block-only answer, a cue failure. The cause was found on saved replies. The model wrote its
`__MORE__` offers block right after the cue block and BEFORE the spoken answer. The offers guard treated everything
after the sentinel as the block, so the spoken answer was thrown away. That shape is in:
- 9 of 366 saved 3.5-lite replies with a cue rule (8 of them with an answer after the block);
- 1 of 247 saved 3.1-lite replies;
- 0 of 308 answers from hours without cues.

Three commits fly together in one build:

1. **The early close.** The cue block closes on the first prose character, not at the end of the first prose line.
   A one-paragraph answer then streams under cues that are already on the screen.
2. **Two source-text pins.** Tests and one blank line. No behaviour changes.
3. **The offers fix.** An offers block that comes before the spoken answer no longer swallows it. The answer is shown
   and the offers are kept.

### What changes in how this run is read (decided before the data)

- **A block-only answer** in this build is a reply with no spoken answer at all (1 of 624 saved replies). It is still
  a cue failure. It is confirmed by its own `[Answer] budget: … words=0` line between its cues line and the
  substitute.
- **The report's `hard failures` line is read beside the check.** An answer that starts with words and ends with
  `[No answer — …]` is a stream that died after its first words were shown. The check counts it as real.
- **The offers-first line.** The fix writes `offers block before the spoken answer` to `natively_debug.log` once per
  answer whose offers came first. The count of such ANSWERS is reported. 0 is the likely count in about 22 answers
  (about one reply in forty). A run with 0 does not show the offers fix live. Its evidence is then the tests, and the
  replay of the 624 saved replies through the old and the new built filter, where exactly the 9 offers-first replies
  that carry an answer change (8 on 3.5-lite, 1 on 3.1-lite).
  - Each line is read with its answer. A line followed by a `budget: … words=0` line and the substitute is a true
    block-only reply whose offers came first, and it is still a cue failure.
  - A redirect after a stream died inside a leading block can write a second line for the same question, so answers
    are counted, not lines.
- **`first token`.** This corrects the 15:26 sentence for this build. With the early close the `first token` line
  fires on the first prose chunk after the block, not at the end of the first prose line.
- **The start gate** retries every 15 min until 09:00. The task is killed at 10:00.
- **The dist is proven twice** in the launcher log by `dist-proof.mjs`: before the run, and again after it. The run's
  own `auto` step rebuilds when a source is newer than the dist, so the second proof is the dist that flew.

### The early close's timing expectation (reported, never part of PASS)

It is read with `hold-read.mjs` (calibrated on 47 cases) over the COUNTED answers: a `won by` line, a non-empty cue
block reported after it, a spoken answer, and a stream of 50 ms or more.

- R2 is the time from the `[Answer] cues:` line to the `[Answer] budget:` line.
- B is the time from the `first token` line to the `word budget` line.
- **GONE:** R2 under 15 ms in at most a quarter of the counted answers, AND B under 15 ms in at most a quarter.
- **NOT GONE:** either one in at least half.
- **NO VERDICT:** anything in between, fewer than 12 counted answers, or a counted answer with no `first token` line.
- Before, on the 16:12 run (v2): 21 counted, R2 under 15 ms in 15, B under 15 ms in 16. That is NOT GONE.
- **Consequence.** GONE: nothing further. NOT GONE or NO VERDICT: the dist proof is read first. A wrong dist means a
  rebuild and one more re-smoke. A proven dist means the counts and the rows are reported and the user decides.
  Neither changes PASS.
- An answer with the offers-first line has its cues early and its first token late. Its B and its cues-to-first-token
  time are read, not its R2.
- The script's printed lines are compared with the same script's lines on the 16:12 run, never with medians quoted in
  prose.

### What this run cannot show (added)

- The offers fix on a live answer, if no reply puts its offers first during the hour.
- The rare failure states the tests pin: a stream that dies after its first words, inside the filters' holds, or
  inside a leading offers block.
- A reply that closes its cue block with a second `__CUES__` line (1 of 624 saved replies). It shows that line as
  text. It has its own later task.

### What flies in the second re-smoke (filled at arming, 2026-10-01)

- **Task:** `Natively-smoke-cues`, registered for 2026-10-01 05:00 local and killed after 5 hours (10:00).
- **Code:** branch `feat/whole-turn-answers`, built from commit `d83fdfe13e81d7b5da55ec38fed6231f5fe7a745`. On top of
  `e49886c` it carries three commits, each approved by an Opus task review:
  - `64d74a1`, the early close;
  - `18da7fa`, the pins;
  - `d83fdfe`, the offers fix.
- **Build:** `dist-electron/electron/main.js` was written 2026-10-01 00:03:29 local (2026-09-30T21:03:29.295Z). A
  second build right after it printed `Up to date, skipping build`.
- **`dist-proof.mjs --expect combined`:** every marker as expected.
  - `CUE_LINE_PREFIX` ×3, the offers line ×1, and the six v2 markers.
  - `CUE_RULE` sha256/12 `8e15e4e7dd41`, limits 3 × 5.
  - Filter sha256/16 `42d9bc42dbd17870`.
- **Gates at `d83fdfe`:**
  - The full suite from a temp folder: `Tests  1071 passed | 8 skipped (1079)`. One file cannot load there (the replay
    test's fixture path); from the worktree root it passes 12 of 12.
  - tsc: electron 6 (the pre-existing six), root 0.
- **The saved replies through the old (`e3fae5f`) and the new built filter:**
  - Exactly 9 of 624 change, each from nothing shown to its answer.
  - The offers-first line fires on 10: those 9, and the reply with no spoken answer.
  - Nothing else moves at chunk sizes 1, 7, 90 and whole: no cue report, no offers report, no other reply's text.
- **The calibrations re-run on this dist:**
  - the smoke check: 26;
  - the shipped-wording probe: 22 (its offers-first case now reads the answer's words);
  - the hold read: 47;
  - the bench scorer: 20.
- The docs commit that carries this amendment sits on top of `d83fdfe` and changes no code.
