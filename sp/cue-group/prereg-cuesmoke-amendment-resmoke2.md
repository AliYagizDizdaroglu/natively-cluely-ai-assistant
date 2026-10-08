
## Amendment for the second re-smoke (written 2026-09-30 at {{WRITTEN}} local; the run is scheduled for 2026-10-01 05:00)

This section was written before the combined build existed and before the task was registered. No run of this build
exists. The rule above is unchanged: PASS is the same three conditions, NOT CLEAN has the same three kinds, and the
check is the same v4 script on the same 26 calibration cases. "What flies" at the end is filled at arming.

### Why there is another run

The 16:12 re-smoke (`2026-09-30T13-46-52-cuesmoke`; its record and `2026-09-30-cuesmoke-v2-result.md` are beside this
file) was NOT CLEAN: one block-only answer, a cue failure. The cause was found on saved replies. The model wrote its
`__MORE__` offers block right after the cue block and BEFORE the spoken answer. The offers guard treated everything
after the sentinel as the block, so the spoken answer was thrown away. That shape is in 9 of 366 saved 3.5-lite
replies with a cue rule, and in 0 of 308 answers from hours without cues.

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
  change.
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

### What this run cannot show (added)

- The offers fix on a live answer, if no reply puts its offers first during the hour.
- The rare failure states the tests pin: a stream that dies after its first words, inside the filters' holds, or
  inside a leading offers block.
- A reply that closes its cue block with a second `__CUES__` line (1 of 624 saved replies). It shows that line as
  text. It has its own later task.

### What flies in the second re-smoke (filled at arming)

{{FLIES}}
