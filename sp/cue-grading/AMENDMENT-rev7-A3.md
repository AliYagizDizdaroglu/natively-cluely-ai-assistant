# Amendment rev7-A3 to PREREGISTER-cue-grading-rev7.md: the A2 re-check's m1–m6 (pre-grading)

Written **2026-10-06, begun 06:28 TST by `date` (`Tue Oct  6 06:28:52 TST 2026`)**, by the Opus author of A2. It
amends revision 7 as amended by A1 and A2; all three stay unedited. Precedence: **this amendment > A2 > A1 > revision
7** where they differ.

**Status: pre-grading.** No cue has been graded, classified or calibrated. Tonight's flight data exists, as A2 states.
Its author opened no cue, answer, question or prompt text, no export JSON, no blind file and no `cue-report\`. The run's
judge pairs and timeline were hashed, not opened. No model was called. Nothing ran but `date` and `sha256sum`.

It adopts every finding of `C\rev7-A2-RECHECK.md` **in the re-checker's own wording**:
- the re-check's sha256 is `98fe92f28e3ee9a809b9336de207c37f076dc2c94a02ed6cd436a7d7ab75d1e6`;
- its verdict is A2 CONFIRMED, with Blocking 0, Important 0 and Minor m1–m6.

For m2 it takes the re-checker's second option, a check, and not the residual. It changes nothing else.

Inputs, sha256 as read (06:29 TST):
- `C\AMENDMENT-rev7-A2.md` `bb2154cc1e986a57dd4f3043daaa7a3b8d821be77fff1fca3ebed6c39bc4bf98` (equals its `.sha256`)
- `C\rev7-A2-RECHECK.md` `98fe92f28e3ee9a809b9336de207c37f076dc2c94a02ed6cd436a7d7ab75d1e6`
- `RUN\interview60.judge.pairs.json` `989ef47c97695a42574d35c2e463985510a5998185fb6b2f4e2ff4ba04774fd7` (mtime
  2026-10-06 05:08:54)
- `RUN\interview60.timeline.json` `f69287735ddabe8c3c0c7dac832e4cda92f1001380538180f0841251170ebffa` (mtime 04:12:55;
  equals the controller note's)

Folder names as in A2:
- `RUN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\2026-10-06T01-12-56-eq`
- `C` = `SP\cue-grading`
- `E` = `SP\flight-eq`

## 0. Resolutions

| item | resolution | binds at |
|---|---|---|
| **m1** A2.7's "None removes one" is false | ADOPTED as worded | A2.7 |
| **m2** a probe line could be named `superseded` and pass U3 | ADOPTED as a **check**: b10 and the consumer refuse a `superseded` line whose turn started before `window.startedAt`; one F4 case; the controller note's "U3 itself would refuse it" is struck as wrong | A1.3 (U3), A2.2, A2.3, Not covered |
| **m3** "A2.5" names two things | ADOPTED as worded | A2.4 |
| **m4** delta 5's completion rule reads as loosening b10 | ADOPTED as worded | A2.1 delta 5 |
| **m5** three new refuse branches have no F4 case | ADOPTED: three F4 cases, each expecting refuse | A2.3 |
| **m6** provenance and precedence wording | ADOPTED as worded, (a) and (b) | A2 header, A2.1, Not covered |
| re-check "Not checked": pairs and timeline not pinned | ADOPTED: both are INPUT rows in `HASHES.txt` | A2.5 → A3.7 |

## A3.1 m1: A2.7's sentence

**A2.7, replace** "Each new check only adds a way to refuse. None removes one." **with (verbatim):** "A2 adds one
acceptance path, `probe`, for a class rev 7 already excludes; every criterion on it refuses; no other check is
relaxed."

## A3.2 m2: a `superseded` line whose turn started before the window refuses

The re-checker found the gap. As worded, U3 would let L386 pass if it were named `superseded`: S1Q01's own line L476
comes later inside S1Q01's play window. The reconciliation would also pass (41 − 1 − 0 = 40). That path would bypass all
five probe criteria. The controller note's sentence "U3 itself would refuse it" is therefore **wrong and struck**. A2.2's
sentence "a probe line is not a `superseded` line" becomes a check, as follows.

- **A1.3 (U3) and A2.2, add this check (both tools):** "a `superseded <n>` line's turn start lies at or after
  `window.startedAt`; else refuse."
  - **Turn start** has A2.1 criterion 2's meaning: the last
    `[IntelligenceEngine] … question: gate=… turn=N` line before `n`, in file order.
  - **No such line before `n`** → refuse.
  - **b10** must not write such a line, and its A2.5 calibration carries the case below.
  - **`cue-material-eq.mjs`** refuses on it whatever b10 wrote.
- **F4 case (expectation: refuse):** tonight's shape is a turn that starts before `startedAt` and delivers an
  unaddressed non-empty cues line after it. In this case that line is named `superseded <n>` instead of `probe <n>`.
  A later same-id addressed line falls inside the same play window, so U3 alone would accept it. Expected result:
  **refuse**.
- **Effect on known answers: none.**
  - h40d: R29's superseded line is a roster stream, so its turn starts after `startedAt` and it passes.
  - Tonight: `superseded 0`.
- **No roster stream can fail this check.** A2.1 criterion 2 already rests on the same fact: no roster turn starts
  before `startedAt`.

## A3.3 m3: "A2.5" names two things

**A2.4, replace** "with its A2.5 re-calibration" **with** "with its flight-eq A2.5 re-calibration". A2's own §A2.5 stays
`HASHES.txt`.

## A3.4 m4: delta 5's completion rule

In A2.1 delta 5, the sentence "b10 ends `EXPORT COMPLETE` when every roster id has its entry" is replaced **by
(verbatim):** "b10 ends `EXPORT COMPLETE` when every roster id has its entry and b10's other checks pass, its
`cueBlocks` count less the non-empty `probe` lines."

## A3.5 m5: three more F4 cases (added to A2.3, expectations first; each → refuse)

9. A `probe <n>` naming a cues line timestamped **outside** `window` → **refuse** (criterion 1).
10. A `probe <n>` with **no** `[IntelligenceEngine] … question: gate=… turn=…` line before `n` → **refuse**
    (criterion 2).
11. A line named twice → **refuse**. There are two fixtures: the same `n` as both `superseded n` and `probe n`, and
    the same `n` as `probe n` twice (A2.2).

With A3.2's case, which is case 12, A2.3 holds twelve cases. h40d (case 8) is unchanged: 44 / 44 / superseded 1 /
outside 2 / probe 0.

## A3.6 m6: provenance and precedence

- **(a)** Add to A2.1, under the criterion: "A2.1 replaces the note's R3."
  - The controller note is hashed as INPUT for provenance only.
  - Its R3 criteria 2 and 4 are weaker and do not bind; A2.1 (as amended here) does.
- **(b)** A2's Not covered: replace "A1's re-check reads h40d's probe lines at −25.131 s and −8.137 s" **with**
  "the controller note (§1) puts h40d's probe lines at −25.131 s and −8.137 s; A1's re-check cites them from it and
  did not read them".

## A3.7 `C\HASHES.txt`: the contents the consumer verifies (replaces A2.5's block)

This block replaces A2.5's. The line format, the REG rule and the "Not listed" paragraph are A2.5's. Two lines are
added for files outside `SP`; for those lines the path field is the absolute path. The controller writes the file
**after A3's scoped fresh-Opus re-check confirms it**, with the time read by `date`.

```
# C\HASHES.txt   written <`date` output, after A3's re-check>
b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39  cue-grading\PREREGISTER-cue-grading-rev7.md  REGISTRATION
6992393e7d6dba219698c14d47aa5878d7a1b4ac58323b086a480cdef870b593  cue-grading\AMENDMENT-rev7-A1.md  AMENDMENT
bb2154cc1e986a57dd4f3043daaa7a3b8d821be77fff1fca3ebed6c39bc4bf98  cue-grading\AMENDMENT-rev7-A2.md  AMENDMENT
<sha256 of this file, as sealed below; the controller re-hashes it before writing>  cue-grading\AMENDMENT-rev7-A3.md  AMENDMENT
03de625d611987d05b0f48385e0d54b26e5b92021653a2eff2a22a416fbe9e4f  cue-grading\NOTE-flight-eq-export-2026-10-06.md  INPUT
a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6  flight-eq\AMENDMENT-A5.md  INPUT
92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303  flight-eq\AMENDMENT-A6.md  INPUT
989ef47c97695a42574d35c2e463985510a5998185fb6b2f4e2ff4ba04774fd7  C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\2026-10-06T01-12-56-eq\interview60.judge.pairs.json  INPUT
f69287735ddabe8c3c0c7dac832e4cda92f1001380538180f0841251170ebffa  C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\2026-10-06T01-12-56-eq\interview60.timeline.json  INPUT
```

- **Why the pairs and the timeline are pinned.**
  - A2.1 criteria 4 and 5 and A3.2 read the pairs.
  - `window`, U3's play windows and A3.2 read the timeline.
  - Before this, neither file was hash-pinned.
- **If either file differs from its line when the controller writes `HASHES.txt`,** the controller writes nothing and
  reports to the user. A changed pairs file means something rewrote the run folder after 05:08:54. That must be
  explained before any line is changed.
- **REG** still prints the sha256/16 of the `REGISTRATION` line. Every tool refuses unless every listed file hashes to
  its line.

## A3.8 What does not change

**No bar, set, grader or reading changes.** The scope matches A2.7, with A2.7 itself corrected by A3.1.

A3 adds:
- one refuse check (A3.2);
- four F4 cases (A3.2, A3.5);
- two INPUT pins (A3.7);
- wording corrections (A3.1, A3.3, A3.4, A3.6).

It relaxes no check. A1's known answers and A2's expected tonight counts stand:
- 40 entries;
- probe 1;
- superseded 0;
- 41 − 0 − 1 = 40;
- `N_first` = 3.

## Not covered

- **M4 stays a residual and fails safe** (A2's wording, now also true of the `superseded` path through A3.2). Suppose a
  probe stream delivers after the first roster turn line. It reads a roster turn whose start is after `startedAt`, so
  it cannot be named `probe` (criteria 2 and 4). If it were named `superseded`, it would pass A3.2 and could then pass
  U3 if a later same-id line exists. **A3.2 does not close that combination.**
  - What it costs: such a line would be mis-labelled `superseded`, not graded. Both classes are excluded, so the
    material is unaffected (the re-checker's m2 reasoning).
  - What would close it: a rule keyed on stream identity, which needs a new dated amendment.
  - Tonight: no turn line lies between L336 and L386.
- **How U3 attributes an id to a `superseded` line** is read as "by play window". The registration does not say so
  explicitly, and A3 does not settle it.
- **The pairs pin is as of 06:29.** flight-eq's post-hour grading (F3) may still be due. If it rewrites the pairs file,
  A3.7's mismatch rule stops the controller.
- **Not read:** b10's in-progress R3 edits (`E\eq-cues-export.mjs` `f92e2ec1…`). It now also owes A3.2's check and
  must cite A3's sha in its flight-eq note.
- **Nothing in A2 or A3 has run.** That covers the consumer, the F4 cases, the probes, calibration and grading.

## Seal

This file's sha256 is computed after its last edit and given outside it; a file cannot carry its own hash.
