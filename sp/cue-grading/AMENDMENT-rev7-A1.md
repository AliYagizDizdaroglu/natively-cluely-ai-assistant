# Amendment rev7-A1 to PREREGISTER-cue-grading-rev7.md: the rev 7 re-check's U1–U8 (pre-data)

Written **2026-10-05, begun 17:44 TST by `date` (`Mon Oct  5 17:44:08 TST 2026`)**, by the Opus author of revisions 6
and 7. It amends revision 7, which stays unedited (sha256 as read
`b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39`). **No cue, answer, question, captured-prompt or key
text was read; no model was called; nothing was built, classified, calibrated or graded.** Precedence: **this
amendment > revision 7** where they differ. It adopts every finding of `PREREG-REREVIEW-7.md` (sha256
`73fd42aa66e98b379d9e8826d55a5b8ea25622236f69f7cc0cf97d33b933b191`; APPROVE WITH FIXES, Important U1, Minor U2–U8) **in
the re-checker's own wording**, and changes nothing else. Rev 7 §7(i) applies: this amendment is named in `C\HASHES.txt`
beside rev 7, and grading starts only after a check scoped to it confirms U1 (the re-checker's condition) and both
files are hashed there.

## 0. Resolutions

| item | resolution | binds at (rev 7) |
|---|---|---|
| **U1** (Important) two contradictory h40d known answers; the consumer blind to a superseded stream exported as an entry | ADOPTED as worded: contract delta 4 (h40d = 44 in-app entries on 44 ids, 1 `superseded` line = R29's 11:31:30Z line, 2 cue lines outside `window`, 0 empties; replaces b10's registered "47 → 45 + 2"); F4 runs `cue-material-eq.mjs` once on b10's h40d calibration export and must reproduce those counts, else b10 is refused; the two-entry rule (both `dispatchedAt` non-null and present in the pairs) with its synthetic case; §6's false clause replaced. Needs a dated flight-eq note (A1.9 below) | §1F deltas, §7 F4, §6 |
| **U2** which `ARMING` line; HEAD parse | ADOPTED as worded: the last `ARMING …` line before `timeline.startedAt`; `ARMING absent`, no line, or a sha unequal → refuse; `<H>` = the single 40-hex value on the record's registered-HEAD line; three F4 cases. A5 recorded; the stale "note does not exist yet" struck | §1F Run, §7 F2, F4, §11 |
| **U3** a falsely named `superseded` line | ADOPTED as worded: each `superseded <n>` must be followed, before the next roster item's play start, by an addressed line with the same id; else refuse; one F4 case | §1F checks, §7 F4 |
| **U4** classifier output unchecked; HARD absorbs a broken file | ADOPTED as worded: exact ids, each value from the dispatch's enumeration, else FORMAT VOID of that slot (T8's re-run-once); a missing id is never read as HARD; two fixtures | §1 Hard items, §1F Hard items, §3.3 |
| **U5** T6's lower bound must not be an end time | ADOPTED as worded: `main.js`'s mtime is never the lower bound; only a recorded build start is, else dropped and named | §1F display pin, §7 F2 |
| **U6** rate-limit pattern change on the day | ADOPTED as worded: a launcher edit, stand-ins re-run, new sha in a dated amendment before the next launch, earlier records re-read for budget accounting only | §3 sessions (T5), §11 not covered |
| **U7** T3's parenthetical names the wrong case | ADOPTED as worded | §3 decide bullet |
| **U8** REG with several hashed files | ADOPTED as worded: REG prints the sha256/16 of the `HASHES.txt` line naming the registration in force; the tool refuses unless every listed file hashes to its line; one case | §3.3 (T10.8) |

## A1.1 U1 — h40d's known answer and the two-entry rule (Important)

- **§1F "Contract deltas, rev 6 → rev 7", add item 4 (verbatim):** "4. h40d's known answer under this contract is **44
  in-app entries on 44 ids, 1 `superseded <logLine>` line (R29's 11:31:30Z line), 2 cue lines outside `window`, 0
  empties** (§1's IN-APP row). It replaces b10's registered '47 → 45 in-app entries + 2'. The twins' 44/44 per rep is
  unchanged."
- **§7 F4, add before the real export is read (verbatim):** "`cue-material-eq.mjs` is run once on b10's h40d
  calibration export with h40d's run folder (counts and ids only) and must print in-app entries 44, ids 44, superseded 1
  (id R29, by play window), outside-window 2. Any other count refuses b10. Synthetic case: an h40d-shaped fixture whose
  superseded line is exported as a second R29 entry, with no `superseded` line → refuse ('an id with two in-app entries
  must have both `dispatchedAt` non-null and present in the pairs; otherwise refuse')."
- **§1F "Checks `cue-material-eq.mjs` makes", add the same two-entry rule as a check** (it is the rule the synthetic
  case flips): an id with two in-app entries must have both `dispatchedAt` non-null and present in
  `interview60.judge.pairs.json`; otherwise refuse.
- **§6, replace rev 7's clause** "and `cue-material-eq.mjs` refuses it on delta 2 whenever a superseded in-window cue line
  exists (it cannot then reconcile the log)" **with (verbatim):** "a b10 that exports a superseded stream as an entry is
  caught by the h40d known-answer run and the two-entry rule (delta 4)."
- **Author's note, not a rule change:** a known-answer mismatch on the h40d run refuses b10 and stops the flight path;
  the counts above are never changed after FLT data exists. If the h40d run itself disagrees (for example the readiness
  probe's two lines fall inside h40d's `window`), that is reported to the user and settled by a dated amendment before
  any FLT export is read, never by editing the tool to pass.

## A1.2 U2 — the ARMING line and the HEAD parse

- **§1F Run, §7 F2 and F4 (verbatim):** "The line used is the last `ARMING …` line in `flight-eq.launcher.log` before
  `timeline.startedAt` of `runDir`'s timeline. `ARMING absent`, no line, or a sha unequal to the file → refuse. `<H>` is
  the single 40-hex value on the record's registered-HEAD line; zero or several → refuse."
- **F4 cases (verbatim):** "two ARMING lines with different shas, only the later (pre-start) one matching → accept; only
  the earlier matching → refuse; a record with two 40-hex HEAD values → refuse."
- **Recorded:** flight-eq `AMENDMENT-A5.md` sha256 `a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6`
  (its A5.4 is the dated note citing rev 7's sha; its freeze clause: the ARMING record is frozen once the real
  launcher prints its sha, later notes go in the result note) and `AMENDMENT-A6.md` sha256
  `92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303` (17:43; the record is written `.tmp` and renamed,
  ends `ARMING COMPLETE <stamp>`, exactly one `T:` line; nothing in A6 touches b10). Both go into `C\HASHES.txt`'s
  inputs. **Struck** from rev 7 §11 "Not covered (rev 7)": "rev 7's contract deltas bind b10 only through a flight-eq
  note that does not exist yet" (A5.4 exists).

## A1.3 U3 — a falsely named `superseded` line

- **§1F checks (verbatim):** "each `superseded <n>` line must be followed, before the next roster item's play start (the
  timeline's play windows), by an in-window `[Answer] cues: ` line addressed by an entry with the same id; else refuse.
  The count of superseded lines and their ids are printed and named in the result note."
- **F4 case (verbatim):** "a delivered line named `superseded` with no later addressed line for that id → refuse."

## A1.4 U4 — classifier output format

- **§1 Hard items and §1F Hard items (verbatim):** "a classifier or base-rate verdicts file that does not hold exactly
  the input file's ids, each with a value from its dispatch's enumeration, is a FORMAT VOID of that slot (the T8
  re-run-once rule); a missing id is never read as HARD." This replaces rev 7's "format-free" for classifier slots.
- **Fixtures (verbatim), added to `cue-verdict-check.mjs`'s calibration:** "one id missing → VOID; one value outside the
  enumeration → VOID."

## A1.5 U5 — T6's lower bound

- **§1F display pin and §7 F2 (verbatim):** "`main.js`'s mtime is an end time and is never the lower bound; only a
  recorded build start time is. Otherwise the lower bound is dropped and named." Rev 7's "its build log or `main.js`
  mtime record, whichever names a start time" reads accordingly.

## A1.6 U6 — changing the rate-limit pattern

- **§3 sessions (T5) and §11 (verbatim):** "A pattern change after 0b is a launcher edit: the stand-in cases are
  re-run, the new sha goes in a dated amendment before the next launch, and attempts already recorded are re-read under
  the new pattern for budget accounting only, never for scores."

## A1.7 U7 — T3's parenthetical

- **§3 decide bullet:** replace "(a string comparison would accept the first)" with "(a string comparison VOIDs the
  second; adding the offset in the wrong direction accepts the first)". The two cases and their expectations (16:59Z →
  VOID, 17:01Z → accepted) are unchanged.

## A1.8 U8 — REG with several hashed files

- **§3.3 (T10.8) (verbatim):** "REG prints the sha256/16 of the `HASHES.txt` line naming the registration file in force
  (rev 7), and the tool refuses unless every file listed in `HASHES.txt` (the registration and each Minor-fix
  amendment) hashes to its line."
- **Case (verbatim):** "an amendment edited after hashing → refuse."

## A1.9 What flight-eq's b10 must change: the dated note text (U1)

U1 changes b10's own registered known answer, and A5.4 says a later cue-grading change reaches b10 only by another
dated flight-eq note. b10 is post-hour (A2.5), so this binds its build after tonight's flight, not arming. Proposed
note text, for flight-eq's author to date and insert:

> **b10, cue-grading rev7-A1 (dated note, 2026-10-05 <time> TST).** This note cites
> `L\cue-grading\AMENDMENT-rev7-A1.md`, sha256 `<sha256 of this amendment as hashed>`, on top of A5.4 (rev 7). b10's
> h40d known answer, registered as "47 cue lines → 45 in-app entries + the probe's 2 outside the window" (registration
> §7.b10, kept by A4.3a and A5.4), is REPLACED by: **44 in-app entries on 44 ids, 1 `superseded <logLine>` line (R29's
> 11:31:30Z line), 2 cue lines outside `window`, 0 empties; the twins 44/44 per rep unchanged.** A superseded stream is
> never exported as an entry (rev 6's contract already says so; the old 45 could only be reached by doing it), so
> producer case (iv) and this count now agree. b10's `registeredHead` is the single 40-hex value on the ARMING
> record's registered-HEAD line, and the sha it is checked against is the last `ARMING …` line in
> `flight-eq.launcher.log` before the run's `timeline.startedAt`. A `superseded <n>` line is written only for a stream
> that a later in-window cues line of the same id replaces. Binds b10's build and calibration (post-hour, A2.5); nothing
> pre-hour changes. The cue-grading consumer runs once on b10's h40d calibration export and refuses b10 on any other
> count.

## Hashes as read (sha256)

- `PREREGISTER-cue-grading-rev7.md` `b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39`
- `PREREG-REREVIEW-7.md` `73fd42aa66e98b379d9e8826d55a5b8ea25622236f69f7cc0cf97d33b933b191`
- flight-eq `AMENDMENT-A5.md` `a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6`
- flight-eq `AMENDMENT-A6.md` `92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303`
- This amendment's own sha256 is computed after its last edit and given outside it.

**Not covered:**
- **The h40d known answer is unverified.** The "2 outside `window`" count rests on rev 5's "the readiness probe's two
  lines, before the first item played" and on the re-checker's reading; nobody has compared those lines' timestamps
  with h40d's `timeline.startedAt`. The F4 run on b10's h40d export settles it, and A1.1's author note says what happens
  if it disagrees.
- **Pairs content.** Whether h40d's judge pairs carry R29's superseded stream is unread (it would expose answer text),
  so the two-entry rule's effect on that real folder is known only after the F4 run.
- **Assumptions behind U3 and the regex.** U3 assumes `interview60.timeline.json` carries per-item play windows. The
  log regex assumes LF line ends; a CRLF log fails closed.
- **The flight-eq note is a proposal.** It is not inserted in flight-eq; its `<time>` and this amendment's sha are
  filled when it is.
- **Nothing exists or has run.** No tool, b10, leak checker, build, probe, classification or calibration.
