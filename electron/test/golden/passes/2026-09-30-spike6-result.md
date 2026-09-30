# Spike 6 result: the cue wording, decided by its pre-registered rule

Run on 2026-09-30, 10:04 to 10:15 local, after the 10:00 quota reset.
- Script: `spike6.mjs --reps 4`, one process per model.
- Row files: `spike6-2026-09-30T07-04-03-320Z.json` (3.1-lite LOW) and `spike6-2026-09-30T07-04-05-912Z.json`
  (3.5-lite HIGH). Each has 108 rows, and both runs exited 0.
- Logs: `spike6-31.run.log` and `spike6-35.run.log`.
- Excluded: the 08:14 partial file `spike6-2026-09-30T05-13-19-415Z.json`, which ran out of quota. It was excluded by
  its name time, as the rule's addendum says.

The rule (`PREREGISTER-spike6.md`, verbatim from the scratchpad's `SPIKE6-RULE.md`) was written at 08:29, before any
counted call; its addendum was written by 09:21 (times-only corrections are inside the file). It was applied by
`decide-spike6.mjs`, which `cal-decide-spike6.mjs` checks against 12 synthetic cases, one per branch of the rule: all
12 OK. The scripts and row files stay in the session scratchpad (`cue-group/`); the row files hold model prose written
from a prompt that carries the user's profile, so they are not committed.

## Before spike 6 (exploratory spikes, no pre-registered rule; reported for the record)

Each spike replayed the 05:00 smoke's exact captured calls with one rule line changed. Simple questions were invented,
checked against holdout40, and swapped into a real captured call.

- **Spike 1** (limit 5, plus "group related parts"): S1Q09 still went over 5 lines.
  - 3.1-lite LOW: 2 of 4 without the sentence, 2 of 4 with it.
  - 3.5-lite HIGH: 4 of 4 without it, 3 of 4 with it.
  - So a prompt sentence cannot hold a line limit; only code can. This is why v2 has a display cap.
- **Spike 2** (limit 3×5):
  - Over 3 lines: 0 of 24 on 3.1-lite and 1 of 24 on 3.5-lite. But every answer filled 3 lines, short follow-ups
    included.
  - The "themes3" wording produced generic labels that restate the question. "cap3" kept the specific services.
- **Spike 3** (simple questions):
  - 3.1-lite never scaled down: 0 to 1 one-line blocks of 18.
  - 3.5-lite HIGH went from 8/18 to 11/18 with cap3-min's "one or two words when that is enough".
- **Spike 4** (answer first, plus the "Tabs or spaces?" example), 3.5-lite:
  - The first line was the direct answer every time; one-line 7/18.
  - With the cap last, complex blocks held worse: over 3 lines in 5 of 12.
  - A cue came out as raw LaTeX, which is why v2 cleans cue notation.
- **Spike 5** (the cap sentence first, then answer-first + example + grouping), 3.5-lite:
  - Complex held: over 3 lines 1 of 8.
  - Simple scaled down worse: one-line 4/24.
- **A metric trap:** spikes 3–4 counted EMPTY blocks as "two words or fewer". Spike 6 counts only non-empty blocks,
  and its rule makes empties a disqualifier.

## Measures (216 rows; every arm has 36 per model: 24 simple, 4 medium, 8 complex)

| arm | model | empty (all/simple) | no text | complex over 3 | S1Q09 services p50 | one-line-answer /24 | answer-first /24 | simple words p50 |
|---|---|---|---|---|---|---|---|---|
| cap3-min | 3.1-lite LOW | 1/1 | 0 | 0 | 6 | 2 | 23 | 6 |
| cap3-min | 3.5-lite HIGH | 0/0 | 0 | 1 | 7 | 10 | 24 | 5 |
| strict-ex | 3.1-lite LOW | 0/0 | 0 | 0 | 7 | 0 | 24 | 5 |
| strict-ex | 3.5-lite HIGH | 0/0 | 0 | 1 | 7 | 11 | 24 | 4 |
| one-first | 3.1-lite LOW | 0/0 | 0 | 0 | 7 | 3 | 24 | 5 |
| one-first | 3.5-lite HIGH | 0/0 | 0 | 0 | 5 | 15 | 24 | 4 |

No arm is disqualified:
- complex over 3 lines: at most 1 of 8 (the limit is > 2);
- S1Q09 services p50: 5 or more everywhere (one-first on 3.5-lite sits exactly at the bound of 5);
- empty simple blocks: at most 1 of 24 (the limit is > 2);
- empty blocks on 3.5-lite HIGH: 0 of 36 on every arm (the limit is > 1).

**WINNER: `one-first`**, on the primary measure: 3.5-lite HIGH one-line-answer 15 of 24, against 11 for strict-ex and 10
for cap3-min. The margin is more than 2, so no tie-break was needed.

`one-first` is already the plan's working wording (revision 1), so nothing is swapped. The fourth build marker stays
`A one-part question gets exactly one line. Add a line only`.

## What else the rows show (reported, not part of the rule)

- **One-line answers come from 3.5-lite HIGH.** 3.1-lite LOW wrote a one-line answer on 0 to 3 of 24 simple questions
  under every wording. It usually adds a second, supporting line. Under the hedge default, 3.5-lite HIGH writes almost
  every live answer (h40c: 44 of 45), and 3.1-lite answers only when it wins the back leg.
- **The first line carries the answer** on 23 or 24 of 24, on both models and every wording.
- **Complex blocks stay at 3 lines** (0 over 3 for one-first). Most lines are 5 words or fewer; the display cap trims
  the rest. S1Q07 on 3.1-lite, rep 4, is 3 lines of 5 words.
- **A LaTeX cue appeared live:** X5, 3.1-lite, one-first, rep 3 is `$O(\log n)$`. The v2 notation cleanup exists for
  exactly this; now there is one real case of it.
- **Empty blocks:**
  - one-first: 0 of 36 on 3.5-lite HIGH and 0 of 72 over both models.
  - All arms: 1 of 216 (cap3-min, 3.1-lite).
  - 95% one-sided upper bounds on the per-answer absent rate, and the resulting chance of at least one absent block in
    20 answers:

    | basis | observed | upper bound per answer | chance in 20 answers |
    |---|---|---|---|
    | one-first, 3.5-lite alone | 0 of 36 | 8.0% | up to 81% |
    | one-first, both models | 0 of 72 | 4.1% | up to 56% |
    | every arm, 3.5-lite HIGH | 0 of 108 | 2.7% | up to 43% |

    The point estimate is 0 in every case. The spike cannot rule an absent block out. The re-smoke's rule (an absent
    block fails it) was stated before arming and stands.
