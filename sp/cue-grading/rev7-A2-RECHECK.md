VERDICT: A2 CONFIRMED (I1 and M1–M4 adopted; no bar, set, grader or reading moved; item 6 judgement right). Blocking 0, Important 0, Minor 6. Fixes go to a dated A3 per A2.5; grading stays gated.

# Scoped re-check: AMENDMENT-rev7-A2.md

Reviewer: a fresh, scoped Opus session (`claude-opus-5-5`), 2026-10-06. No model call, no subagent. No cue, answer,
question or prompt text read or printed; the export JSON and `cue-report\` not opened. One in-process read printed only
the timeline's first three ids with startSec/clipSecs/playedAt and the timestamps of `[Answer] cues: ` lines below L700.
Nothing edited except this file.

## Hashes, recomputed (sha256)

| File | sha256 | as cited |
|---|---|---|
| `C\AMENDMENT-rev7-A2.md` | `bb2154cc…bf98` | ✓ seal, equals its `.sha256` |
| `C\PREREGISTER-cue-grading-rev7.md` | `b1a41225…1f39` | ✓ |
| `C\AMENDMENT-rev7-A1.md` | `6992393e…b593` | ✓ |
| `C\NOTE-flight-eq-export-2026-10-06.md` | `03de625d…9e4f` | ✓ |
| `C\rev7-A1-RECHECK.md` | `659fd227…36c4` | ✓ |
| `C\PREREG-REREVIEW-7.md` | `73fd42aa…b191` | ✓ |
| `E\AMENDMENT-A5.md` / `E\AMENDMENT-A6.md` | `a1f9a2e0…76b6` / `92929cd3…2f303` | ✓ / ✓ |
| `E\NOTE-b10-rev7-A1.md` | `2b6550a5…e47b` | ✓ |

State: `C\HASHES.txt` absent. `E\eq-cues-export.mjs` `f92e2ec1…8239` (06:20:53); `instruments.sha256.txt` b10 line
still `952182ae…8123` (pre-R3). No flight-eq note for A2 yet. All as A2 says.

## 1. Adoption of I1 and M1–M4: yes

- **I1.** All four fix steps present: R1–R4 carried as delta 5 + F4 cases (A2.1–A2.4); this re-check; rev 7 + A1 + A2
  into `HASHES.txt` (A2.5); a dated flight-eq note citing A2's sha before b10's rebuild is recorded (A2.4).
- **M1.** Criterion 5 is exactly the re-check's wording, run-level. F4 case 5.
- **M2.** Consumer-derived `N_first`; b5's output never read. Tonight: L441 (27.000) is the first QGATE at or after the
  earliest `dispatchedAt` 26.995 → `turn=3`. F4 case 6 (both halves).
- **M3.** `<logLine>` = the cues line; b10 exempts the paired `full:` line and prints the count; F4 case 4.
- **M4.** Named in Not covered, no rule change. Its reasoning holds under A2's renumbering (R3 criterion 1 = A2 criterion 2).

## 2. No bar, set, grader or reading changes: yes in substance; one sentence overstates (m1)

Rubric, plants, floors, thresholds, budgets, sets (40 / TWINS-H / TWINS-L), grader, §5/§5F untouched. The FLT selection
rule is read as registered (a rebuilt b10 under flight-eq A2.5 is rev 7 §1F's own remedy). The probe class was already
outside the material (rev 7 §1F "Not graded, named").

## 3. HASHES list: complete for what REG verifies

REG verifies the listed files only; the list holds the rules (rev 7, A1, A2) plus A1.2's inputs (A5, A6) plus the
controller note. The consumer's other inputs reach it by their own checks (`LOG` sha, `instruments.sha256.txt`, the
ARMING sha) and the re-checks/b10 notes are correctly left to their own chains. Nothing REG must verify is missing.

## 4. Item 6 (the user's words): judgement right

Rev 7 §7(iii) asks for the OK "asked in chat with the hashes, the probes' results and the calibration result in hand";
F5 adds "the counts of F4 in hand". None of those existed when the words were given (2026-10-05), and R1–R4 postdate
them. The words bind scope, not the gate. One ask carrying hashes, 0b probes, calibration, F4 counts and the
L386/L395 exclusion, answered yes, meets it. Only the user can waive it.

## Findings

### Minor

**m1. A2.7 "Each new check only adds a way to refuse. None removes one." is literally false.** The addressing check
gains a third alternative (`probe`) and the `cueBlocks` equality a third term; tonight's L386 refuses under rev 7 + A1
and passes under A2. That is the intent, and it is gated by five refusing criteria that no roster stream can meet
(criterion 2: no roster turn starts before `startedAt`). Fix (A3): "A2 adds one acceptance path, `probe`, for a class
rev 7 already excludes; every criterion on it refuses; no other check is relaxed."

**m2. U3 does not keep a probe line out of `superseded`, so M4's "the export refuses; nothing is hidden" overstates.**
L386 (+4.212 s) lies in S1Q01's play window (0 → 72.4 s, next item S1Q01F at +72.445 s), and S1Q01's own cues line is
L476 at +24.835 s. A b10 that named L386 `superseded` would pass U3 as worded (a later addressed same-id line before the
next play start) and the reconciliation (41 − 1 − 0 = 40), bypassing all five probe criteria. The NOTE's "U3 itself
would refuse it" is therefore wrong, and A2.2's "a probe line is not a `superseded` line" is asserted, not checked. The
material is unaffected either way (both classes are excluded), so this mis-labels rather than mis-grades. Fix (A3):
name it as a residual, or add a check that a `superseded` line's turn start lies at or after `startedAt` (plus an F4
case).

**m3. "A2.5" names two things.** A2.4 "with its A2.5 re-calibration" means flight-eq's A2.5; A2's own §A2.5 is
`HASHES.txt` (and the I1 row cites "`C\HASHES.txt` (A2.5)"). Fix: write "flight-eq A2.5" in A2.4.

**m4. Delta 5's completion rule can be read as loosening b10.** "b10 ends `EXPORT COMPLETE` when every roster id has
its entry" reads as a sufficient condition; it does not say b10's own `cueBlocks-count` invariant (tonight's second
INCOMPLETE token) subtracts probe lines, nor that b10's other checks still hold. The consumer re-checks `cueBlocks`, so
this fails safe. Fix: "…when every roster id has its entry and b10's other checks pass, its `cueBlocks` count less the
non-empty `probe` lines."

**m5. Three new refuse branches have no F4 case.** A `probe` naming an outside-`window` cues line (criterion 1); no
turn line before `n` (criterion 2); a line named twice (`superseded` + `probe`, or `probe` twice; A2.2). Each would
probably also break the reconciliation, but uncalibrated. Fix: three F4 cases, expectations refuse.

**m6. Provenance and precedence wording.** (a) The controller note is hashed as INPUT, but its R3 (weaker criteria 2
and 4) differs from A2.1 and the note is outside A2's precedence line; state "A2.1 replaces the note's R3". (b) Not
covered says "A1's re-check reads h40d's probe lines at −25.131 s and −8.137 s"; the re-check cites those from NOTE §1,
it did not read them.

## Not checked

- b10's in-progress R3 edits (not read). The judge pairs and timeline are not hash-pinned in `HASHES.txt` (pre-existing;
  A2 now uses the pairs for criteria 4 and 5).
- How U3 attributes an id to a `superseded` line is read here as "by play window"; the registration does not say.
- Nothing in A2 has run: consumer, F4, probes, calibration.

## A3 re-check

VERDICT: A3 NOT CONFIRMED. Blocking 1 (A3.2's check refuses h40d's known answer), Minor 3. m1, m3, m4, m5, m6 and the pins adopted faithfully; no bar moves. Fix in a dated A4 before `HASHES.txt` is written.

Reviewer: the same scoped Opus session, 2026-10-06, read-only. No cue, answer, question or prompt text; logs read for
tag names, line numbers and counts only.

**Hashes.** `C\AMENDMENT-rev7-A3.md` `ddb49612…4573`, equals its `.sha256`. Cited inputs recomputed and equal: A2
`bb2154cc…bf98`, this re-check (pre-append) `98fe92f2…d1e6`, `RUN\interview60.judge.pairs.json` `989ef47c…4fd7` (mtime
05:08:54.6), `RUN\interview60.timeline.json` `f6928773…bffa`.

**Faithful adoption.** A3.1 (m1), A3.3 (m3), A3.4 (m4), A3.5 (m5, cases 9–11), A3.6 (m6 a, b) are the re-check's
wording. A3.7 adds the pairs and timeline as INPUT rows. A3.8 is accurate: one refuse check, four F4 cases, two pins,
wording; nothing relaxed; no bar, set, grader or reading changed.

### Blocking

**B1. A3.2's "no such line before `n` → refuse" refuses h40d's R29 `superseded` line, so A1.1's known answer
(superseded 1) and A2.3 case 8 cannot pass; b10 is refused and the flight path stops.**
- h40d's `natively_debug.log` (`feec720c…a46d`, 7511 lines) has **0** lines containing `turn=` and **0** containing
  `question: gate=`. Its `[IntelligenceEngine]` tags are only `runWhatShouldISay` (94), `Temporal RAG` (47),
  `Initializing LLMs` (2) and `_what_to_say stream aborted` (1). The turn diag postdates h40d.
- L6541 (R29's superseded line, an `[Answer] cues: ` line) therefore has no turn line before it → A3.2 refuses.
- A3.2's "Effect on known answers: none. h40d: … its turn starts after `startedAt` and it passes" is false.
- Tonight's log has 42 such lines (`[IntelligenceEngine] earlier question: gate=…`), so the check works there.
- Fix (A4), for the author to choose: e.g. apply A3.2 only to a log that carries turn lines (h40d: 0, stated as a
  fact with its sha, so U3 alone governs h40d), or key the check on something h40d logs. Add h40d (case 8) to the
  cases the new check is run against. The re-checker's m2 option did not consider h40d's log either.

### Minor

**n1. The pairs pin may collide with F3.** Rev 7 F3 waits for flight-eq's per-arm grading to be merged. If that merge
has not happened and rewrites `interview60.judge.pairs.json`, A3.7's mismatch rule halts the controller and needs a new
amendment. State whether F3's merge is complete (it writes the judge files, maybe not the pairs), or write
`HASHES.txt` only after F3.

**n2. Two absolute paths carry `Masaüstü` in `HASHES.txt`.** REG's parser now has two path forms (under `SP`, and
absolute), and a non-UTF-8 write or read mangles `ü`. Name the encoding (UTF-8, no BOM or with BOM, stated) and add
a REG case for the absolute form.

**n3. Not covered's first bullet contradicts itself.** "M4 … fails safe (A2's wording, now also true of the
`superseded` path through A3.2)" and then "A3.2 does not close that combination". A2's wording was "the export refuses;
nothing is hidden", which is not true on the `superseded` path. Say "the material is unaffected; the line may be
mis-labelled `superseded`".

**Not checked.** b10's in-progress edits; whether other h40d-based F4 fixtures assume turn lines.

## A4 re-check

VERDICT: A4 CONFIRMED. B1, n1–n3 and the author's A2.1 gate adopted faithfully; h40d's known answer passes on paper; no bar moves. Blocking 0, Important 0, Minor 2 (wording; may ride in the next dated note, no re-check needed for HASHES).

Reviewer: the same scoped Opus session, 2026-10-06, read-only. Logs counted by tag only.

**Hashes.** `C\AMENDMENT-rev7-A4.md` `759d6629…8a9b`, equals its `.sha256`. A3 `ddb49612…4573` and this file before
this append `aa5a26d1…16e2`, as cited. Turn lines under A4.1's definition (contains `question: gate=` and `turn=`),
recounted: tonight's log `163584db…` **42** (all 42 also `[IntelligenceEngine]`), h40d `feec720c…` **0**. Both as stated.

**Faithful adoption.**
- **B1.** A3.2 applies only to a log with ≥ 1 turn line; with turn lines, "none before `n`" still refuses (case 13);
  0 lines → U3 alone, printed (case 14). The false "h40d … passes" sentence is struck and replaced correctly.
- **A2.1 gate (author's addition).** `N_first` and criterion 5 evaluated only when a `probe` line exists. Harmless: on
  A2's own text both are conditions on a probe line, so with probe 0 they refuse nothing; the gate makes that
  explicit. A probe line in a 0-turn-line log still refuses (criterion 2). Not a relaxation.
- **n1.** Adopted; the binding control is the mtime + sha check at `HASHES.txt` time. The merge time is the
  coordinator's report, named as such.
- **n2.** UTF-8 no BOM, LF; drive-letter rule for absolute paths; four REG cases.
- **n3.** My wording, and A4.4 extends it correctly to the 0-turn-line case.

**h40d on paper (case 8).** 0 turn lines → A3.2 not applied; R29's L6541 governed by U3 as in A1 (b10's own h40d
calibration printed `superseded 6541`); the probe's two lines (−25.131 s, −8.137 s) lie outside `window`, so probe 0
and `N_first` / criterion 5 are not evaluated; two-entry rule and reconciliation (45 = 44 + 1) unchanged. Expected
44 / 44 / 1 / 2 / probe 0 / `turn lines 0: A3.2 not applied` is reachable.

### Minor

**p1. A4.3's line rule refuses A4.5's own header.** "A line that does not split into `<64 hex>  <path>  <role>` →
refuse" also catches the `# C\HASHES.txt written …` comment line A4.5 requires. Say "every non-comment line (not
starting with `#`)".

**p2. Two turn-line definitions.** A4.1 defines a turn line as containing `question: gate=` and `turn=`; A2.1
criteria 2 and 4 use `[IntelligenceEngine] … question: gate=… turn=N`. Tonight both select the same 42 lines and h40d
0, so nothing differs on the known logs; one shared definition would remove the ambiguity for the consumer.

**Not checked.** Other h40d-based F4 fixtures (A4 names this); b10's in-progress build.
