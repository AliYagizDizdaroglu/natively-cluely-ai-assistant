# Amendment rev7-A2 to PREREGISTER-cue-grading-rev7.md: the probe-line rule (R1–R4 with M1–M4), HASHES.txt, the user's words

Written **2026-10-06, begun 06:23 TST by `date` (`Tue Oct  6 06:23:31 TST 2026`)**, by an Opus author. It amends
revision 7 as amended by A1; both stay unedited. Precedence: **this amendment > A1 > revision 7** where they differ.

**Status: pre-grading.** No cue has been graded, classified or calibrated. Tonight's flight data exists (`RUN` =
`MAIN\electron\test\golden\interview60.runs\2026-10-06T01-12-56-eq`, `startedAt` 2026-10-06T00:04:13.437Z). **This
amendment is written after that data exists, and says so.** Its author opened no cue, answer, question or prompt text,
no export JSON, no blind file and no `cue-report\`. It rests only on line numbers, timestamps, tags and counts already
recorded in the controller note and the A1 re-check. No model was called. Nothing ran but `date` and `sha256sum`.

What it changes is **material assembly only**: how an in-window cue line that belongs to the harness's readiness probe
is named and accounted for. That class is already outside the material in rev 7 §1F ("Not graded, named: … cue lines
outside the run window (the readiness probe's)"). A1.1's author note sends exactly this case ("the readiness probe's
two lines fall inside … `window`") to "a dated amendment … never by editing the tool to pass". This is that amendment.

Inputs, sha256 as read (06:24 TST):
- `C\PREREGISTER-cue-grading-rev7.md` `b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39`
- `C\AMENDMENT-rev7-A1.md` `6992393e7d6dba219698c14d47aa5878d7a1b4ac58323b086a480cdef870b593`
- `C\NOTE-flight-eq-export-2026-10-06.md` `03de625d611987d05b0f48385e0d54b26e5b92021653a2eff2a22a416fbe9e4f` (equals its
  `.sha256`)
- `C\rev7-A1-RECHECK.md` `659fd227ecb004ba9ff7e257daa723f876969033bcdcd5b89dfe697e248136c4` (A1 CONFIRMED; Important I1,
  Minor M1–M4)
- `C\PREREG-REREVIEW-7.md` `73fd42aa66e98b379d9e8826d55a5b8ea25622236f69f7cc0cf97d33b933b191`
- `E\AMENDMENT-A5.md` `a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6`
- `E\AMENDMENT-A6.md` `92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303`
- `E\NOTE-b10-rev7-A1.md` `2b6550a5d32a3bd88f1c63dd95d6d852648090777865a40d1a03af3b8be7e47b`

`C` = `SP\cue-grading`, `E` = `SP\flight-eq`, `SP` = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp`.

## 0. Resolutions

| item | resolution | binds at |
|---|---|---|
| **I1** (Important) R3 changes the contract outside the registration chain | ADOPTED: R1–R4 are carried in here as **contract delta 5** and its F4 cases (A2.1–A2.3), with M1–M3 applied. Then: A2's scoped fresh-Opus re-check, `C\HASHES.txt` (A2.5), and a dated flight-eq note citing A2's sha before b10's R3 build is recorded | §1F deltas, §1F checks, §7 F4 |
| **M1** criterion 4 too weak | ADOPTED: "no `judge.pairs` `dispatchedAt` lies before `window.startedAt`" | A2.1 criterion 5 |
| **M2** criterion 2's source is b5's output | ADOPTED, consumer-derived: the consumer computes the first roster turn from the run's debug log. It never reads `E\eq-flight-read.out.txt` | A2.1 criterion 4 |
| **M3** which line `probe <logLine>` names | ADOPTED: the cues line. b10 exempts that stream's paired `full:` line. New refuse case: `probe` naming a non-cues line | A2.1, A2.3 |
| **M4** criterion 1 attributes by position | NAMED as a fail-safe residual. No rule change | Not covered |

## A2.1 Contract delta 5: the probe line (carries R1 and R3)

Added to rev 7 §1F "Contract deltas, rev 6 → rev 7", after A1's delta 4. Delta 3's "No other change" reads "no other
change except deltas 4 and 5".

> **5. Probe lines.** The completeness file names every in-window `[Answer] cues: ` line that is the readiness
> probe's, one line each: `probe <logLine>`. `<logLine>` is the 1-based line number of the **`[Answer] cues: ` line**
> (the line that matches `^(\S+) \[LOG\] \[Answer\] cues: (\[.*\])$`), never the `full:` line and never a
> `cues trimmed:` line. b10's own full-line accounting exempts that stream's paired `[Answer] full:` line and prints
> the exemption as a count. A probe line is never an entry. b10 ends `EXPORT COMPLETE` when every roster id has its
> entry. A probe line is not an id and never appears in `EXPORT INCOMPLETE: …`.

**The strict criterion.** `cue-material-eq.mjs` accepts a `probe <n>` line only if **all** of these hold for log line
`n`. Any one false refuses.

1. **It is a cues line.** Line `n` matches `^(\S+) \[LOG\] \[Answer\] cues: (\[.*\])$`, and its timestamp `m[1]` lies
   inside `window`. (M3. A probe line outside `window` is not named; outside lines stay a printed count.)
2. **Its turn started before the window.** Its turn start is the last line before `n`, in file order, that matches
   `[IntelligenceEngine] … question: gate=… turn=N`. That line's timestamp lies **before** `window.startedAt`. No such
   line before `n` → refuse. (R3 criterion 1.)
3. **No entry addresses it, and it is not named `superseded`.** No in-app entry's `logLine` equals `n`, and the
   completeness file has no `superseded n` line. (R3 criterion 3.)
4. **Its turn precedes the roster's.** Its `N` is lower than `N_first`. `N_first` is derived by the consumer from the
   log named by the `LOG` line (sha-checked as rev 7 requires): the `turn=` value of the first
   `[IntelligenceEngine] … question: gate=… turn=…` line whose timestamp is at or after the earliest `dispatchedAt` in
   `interview60.judge.pairs.json`. No such line → refuse. The consumer never reads b5's output
   (`E\eq-flight-read.out.txt`). (R3 criterion 2, M2. Tonight's expected value: L441, `turn=3`.)
5. **No roster pair precedes the window.** No `dispatchedAt` in `interview60.judge.pairs.json` lies before
   `window.startedAt`. This is a run-level condition: if it fails, every `probe` line refuses. (R3 criterion 4 as
   strengthened by M1. Tonight's count: 0; earliest 00:04:26.995Z.)

## A2.2 What the consumer's checks become (carries R3's two check changes)

Rev 7 §1F "Checks `cue-material-eq.mjs` makes", amended:

- **Addressing.** "every `[Answer] cues: ` line whose timestamp lies inside `window` is addressed by exactly one entry,
  **or** named `superseded <logLine>`, **or** named `probe <logLine>` under A2.1's criterion." A line named twice
  (both `superseded` and `probe`, or `probe` twice) refuses.
- **`cueBlocks` equality.** The number of in-app entries with `empty: null` = `cueBlocks.present` **minus the named
  non-empty `superseded` lines minus the named non-empty `probe` lines**. Tonight's expected shape: 41 − 0 − 1 = 40.
- **Printed.** The count of `probe` lines, each line number, its turn `N`, its offset from `startedAt` in seconds, and
  `N_first`. The result note names each one (R4).
- **The registered checks are otherwise unchanged.** They refuse on every other mismatch, including the two-entry
  rule (A1.1) and U3 (A1.3). U3 still governs `superseded` lines; a `probe` line is not a `superseded` line.

## A2.3 F4 cases (added to §7 F4, expectations first, before the real export is read)

On synthetic h40d-shaped fixtures with invented cue strings (never real cues), plus the h40d run:

1. Tonight's shape: a turn whose start is before `startedAt`, with `N < N_first`, delivering a non-empty cues line
   after `startedAt`, unaddressed, named `probe <cues line>` → **accept, probe 1**, reconciliation present − 0 − 1.
2. A line named `probe` whose turn starts inside `window` → **refuse**.
3. A line named `probe` that an entry addresses → **refuse**.
4. **(M3)** A `probe <n>` whose line `n` is not an `[Answer] cues: ` line (the paired `full:` line, or a
   `cues trimmed:` line) → **refuse**.
5. **(M1)** Case 1's fixture plus one `judge.pairs` `dispatchedAt` before `startedAt` → **refuse**.
6. **(M2)** Case 1's fixture with `N` equal to `N_first`, where `N_first` is derived from the fixture log → **refuse**.
   A fixture log with no turn line at or after the earliest pairs `dispatchedAt` → **refuse**.
7. Case 1's fixture with the probe line **not** named (neither addressed nor named) → **refuse** (rev 7's existing
   case, now with a probe-shaped line).
8. **h40d's run** → unchanged: in-app 44, ids 44, superseded 1 (R29), outside 2, **probe 0**. A1.1's known answer
   stands, and A1.1's refusal rule applies to any other count.

## A2.4 Exclusion and status of tonight's hour (carries R1, R2, R4)

- **R1.** The material is the 40 roster in-app entries (one per S1/S2 id, all joined to pairs), plus the twins as
  registered. L386/L395 (probe turn 2, +4.212 s) are excluded as the registered "readiness probe's" class. They are
  counted and named by line number. No probe text enters any blind file.
- **R2.** No roster id is excluded, so the INCOMPLETE ≤ 2 / > 2 rule is not triggered. The hour is not FLT VOID and
  has no `export-missing` id. It qualifies as FLT once a b10 built to delta 5 ends `EXPORT COMPLETE`.
- **R4.** The result note names L386/L395, turn 2, +4.212 s; this amendment and the controller note with their
  sha256; and the harness cause (no drain between `preflight` and `appPass()`).
- **Until both tools carry delta 5,** the consumer refuses tonight's export as registered. That refusal is correct.
  b10 reaches delta 5 only through a dated flight-eq note citing **A2's** sha256, with its A2.5 re-calibration, an Opus
  review and a new `instruments.sha256.txt` line. Nothing is adapted by a cue-grading script to pass.

## A2.5 `C\HASHES.txt`: the contents the consumer verifies

Written by the controller **after A2's scoped fresh-Opus re-check confirms it**, with the time read by `date`. One
file per line, `<sha256>  <path under SP>  <role>`. REG (A1.8) prints the sha256/16 of the line whose role is
`REGISTRATION`. Every tool refuses unless every listed file hashes to its line.

```
# C\HASHES.txt   written <`date` output, after A2's re-check>
b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39  cue-grading\PREREGISTER-cue-grading-rev7.md  REGISTRATION
6992393e7d6dba219698c14d47aa5878d7a1b4ac58323b086a480cdef870b593  cue-grading\AMENDMENT-rev7-A1.md  AMENDMENT
<sha256 of this file, as sealed below; the controller re-hashes it before writing>  cue-grading\AMENDMENT-rev7-A2.md  AMENDMENT
03de625d611987d05b0f48385e0d54b26e5b92021653a2eff2a22a416fbe9e4f  cue-grading\NOTE-flight-eq-export-2026-10-06.md  INPUT
a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6  flight-eq\AMENDMENT-A5.md  INPUT
92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303  flight-eq\AMENDMENT-A6.md  INPUT
```

- **Registered texts** (REGISTRATION and AMENDMENT): rev 7, A1, A2. These are the rules.
- **Inputs**: A5 and A6 (A1.2 puts them here); the controller note (A2 carries its R1–R4, so its bytes are pinned).
- **Not listed**: the re-checks (`PREREG-REREVIEW-7.md`, `rev7-A1-RECHECK.md`, A2's own re-check). They are gates and
  are cited by sha in the result note. Also not listed: `E\NOTE-b10-rev7-A1.md` and the coming flight-eq note for A2.
  They bind b10 through flight-eq's own chain (`instruments.sha256.txt`), not through REG.
- **If A2's re-check returns any fix,** it goes into a dated A3 and is hashed here the same way; A2 is never edited
  after this seal. If A2 changes before hashing, the controller writes the file's current sha only after a re-check of
  those bytes.

## A2.6 The user's go-ahead

**Recorded words:**
- 2026-10-05, in chat: "we grade the cues too right, since never tested those so we can test both followups and cues
  this time?"
- 2026-10-05 23:58: "when done do the grading and provide the full report".
- Rev 6's header already carries the earlier directive "grade everything next flight".

**What rev 6/7 require.** §7(iii): "the user's OK, asked in chat with the hashes, the probes' results and the
calibration result in hand". Step 4: "The user's OK". F5: "The user's OK (the counts of F4 in hand)". The controller
note adds that R1–R4 take effect "only with the user's OK".

**Judgement: these words do not meet the requirement.** They are a real and binding directive on **scope**: grade the
cues as well as the follow-ups, grade everything, and report in full. No scope question remains to ask the user.
But the registered OK is a specific informed act, given in chat **with the hashes, the probes' results, the
calibration result and (for FLT) F4's counts in hand**. Every one of those came later than the words or does not
exist yet:
- `HASHES.txt` does not exist.
- No probe has run.
- No calibration has run.
- F4 has not run.
- R1–R4 were written at 05:57 on 2026-10-06, after both messages, so the user has not seen the probe-line exclusion.

A directive given before the evidence cannot be the OK that the registration asks for with the evidence in hand.
Nothing in the user's words waives that gate either.

**What follows.** Step 4 and F5 still need one short ask in chat, carrying the hashes, the probe and calibration
results, F4's counts, and a one-line statement of A2's exclusion (L386/L395). A plain yes then meets the gate. Only
the user can waive the gate itself.

## A2.7 What does not change

**No bar, set, grader or reading changes.** This covers rubrics, plants, floors, thresholds, budgets, gating bars,
the set definitions (FLT-INAPP 40, FLT-TWINS-H, FLT-TWINS-L), the grader model, launch, checks and instruction files,
and the decision readings (§5, §5F). A1's known answers stand.

A2 changes three things only:
- how a non-roster cue line is named in the completeness file;
- how the consumer accounts for that line;
- which files `HASHES.txt` lists.

Each new check only adds a way to refuse. None removes one.

## Not covered

- **M4, a residual that fails safe.** Criterion 2 attributes a cues line to the last turn line before it, by position,
  not by stream. Suppose a probe stream delivers after the first roster turn line (later than +13.563 s tonight). It
  would read that roster turn's `N` (`turn=3` tonight). It would then fail criterion 2 (that turn line lies after
  `startedAt`) and criterion 4 (`N < N_first`), and could not be named `probe`. The export refuses; nothing is hidden. Such an hour waits for a rule keyed on stream identity, which
  needs a new dated amendment. Tonight's line is not this case: no turn line lies between L336 and L386.
- **The harness has no drain** between `preflight` and `appPass()`. The window opens about 2 s after the 34 s probe
  ends, so a probe answer taking more than ~13 s from its last turn start lands inside the window. The fix is a
  harness change, out of scope here.
- **The export JSON is unopened.** That no entry addresses L386 rests on b10's counts (40 entries, 40 ids, 40 joined)
  and its `L395` token. A2.1 criterion 3, run by the consumer, checks it.
- **b10's R3 build is in progress and unrecorded.** `E\eq-cues-export.mjs` (`f92e2ec1…`, 06:20:53) was not read.
  `instruments.sha256.txt` still names the pre-R3 tool. The consumer refuses until a flight-eq note cites A2's sha and
  the rebuilt tool is recorded.
- **h40d's "probe 0" is unproven.** A1's re-check reads h40d's probe lines at −25.131 s and −8.137 s, both outside
  `window`. A2.3 case 8 confirms it at the consumer.
- **Nothing in A2 has run.** That covers the consumer, its F4 cases, the probes, calibration and grading.

## Seal

This file's sha256 is computed after its last edit and given outside it; a file cannot carry its own hash.
