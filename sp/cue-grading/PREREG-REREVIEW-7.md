VERDICT: APPROVE WITH FIXES

# Re-check: PREREGISTER-cue-grading-rev7.md (sha256 b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39, recomputed)

Reviewer: a fresh, scoped Opus session (`claude-opus-5-5`), 2026-10-05, after 17:39 TST. No model call, no subagent. No
cue, answer, question or captured-prompt text was read: registration texts, amendments, hashes and counts only. Line
numbers are rev 7's. Nothing was edited except this file.

**Counts: Critical 0, Important 1 (U1), Minor 7 (U2–U8).** T1–T11 are resolved in substance. No gating bar, rubric,
plant, floor, threshold or budget is weaker than in rev 6. U1 is a known-answer contradiction in the b10 contract that
leaves the consumer blind to one failure. It is a few lines of text. Apply it by a dated amendment (plus a dated flight-eq
note, since A5.4 says a later cue-grading change reaches b10 only that way), and confirm it with a check scoped to that
amendment. Rev 7 itself needs no new revision. U2–U8 are Minor (§7(i) amendment).

## What was run (read-only)

- sha256, recomputed:
  - rev 7 `b1a41225…1f39` ✓, rev 6 `ab13dc2e…94af3` ✓, `PREREG-REREVIEW-6.md` `08ee797a…2b79` ✓;
  - A2 `0bd449be…f68e` ✓ (mtime 16:56:02), A3 `36aa8000…1d6e` ✓, A4 `1e0ac773…26e0` ✓;
  - `C\oc-flight.mjs` `2b30bf78…ccfb` ✓, `C\oc-sim.mjs` `b467d8c1fc6c63d7…` ✓.
- The full `git diff --no-index` from rev 6 to rev 7 (270+/50−) was read. Every removed line is either replaced by a
  `[rev 7]` text or kept with a bracket note.
- Read: A4 in full, A3.6 and A3's final list, the registration's §2 Build and §7.b2/b10, and §11 "Filled at arming"
  (it holds "Registered HEAD: `<sha>`").
- **New since rev 7: `E\AMENDMENT-A5.md`** (written 17:39:23, sha256 `a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6`).
  - Its A5.4 is the dated flight-eq note that cites rev 7's sha. It adopts deltas 1–2 and producer cases (i)–(iv).
  - It freezes `E\ARMING-flight-eq.md` from the real launcher's `ARMING sha256=` line on ("Notes after T go in the
    result note").
  - Its step 14 puts "the registered HEAD" in the record.
  - It renames a superseded record on overrun.
- Stale names: every `cues.probe.json` / `probe.g1` / "flight-eq §11" occurrence (L177, 372, 456, 464, 501, 517, 675,
  679) carries a rev 6 or rev 7 bracket note, or is the negation "(not flight-eq §11)".

## (1) T1–T11

| Item | Status | Note |
|---|---|---|
| T1 | **resolved** | Binding goes through A4.3a by reference plus the deltas, and A5.4 now exists citing rev 7's sha. `<H>` comes from ARMING, sha-checked against the real launcher line. Four F4 refusal cases flip. The A2 read-time question is answered. Residuals: U1 (h40d known answer), U2 (which launcher line; HEAD parse). |
| T2 | **resolved, with one blind spot** | Log sha, regex with trailing space, window, JSON equality, `missing` ⇔ null, the addressed-or-`superseded` rule, metrics minus superseded, `src` refusal, plus 7 F4 cases. Blind spot: U1. A falsely named `superseded` line is not checked: U3. |
| T3 | **resolved** | Offset instant, transcript `startedAt`, `n/a`, no-offset line, all as asked. The cases flip, but the parenthetical is wrong: U7. |
| T4 | **resolved** | Probes are out of the format check, calibration budgets stop calibration, empty `reason` = VOID, and the seven fixtures are listed in §3.3 and §9. |
| T5 | **resolved** | One regrade from each failed class, `resultSubtype`/`errorKind`/`toolCalls`, the refused-launch triple, 3 stand-in and 4 decide cases. The day-of pattern change has no process: U6. |
| T6 | **resolved** | Upper bound = the second dist proof. The lower bound's "main.js mtime" wording is ambiguous: U5. Not verdict-relevant: the snapshot sha or the equivalence fallback still pins. |
| T7 | **resolved** | Byte-for-byte first user message, sha12 printed, MISMATCH = tool-use void, three fixtures (incl. classifier). |
| T8 | **resolved** | 8 slots with all checks and the void rule. "Format-free" leaves classifier output unchecked: U4. |
| T9 | **resolved** | Figures match `PREREG-REREVIEW-6` and the §5F table (L1029 33.6, L1088 35.5). The reasoning is right: GOOD 75% / harmful 7% fails no FIX bar. |
| T10 | **resolved, all 8** | Abbreviations, `<SP>` = `L` (134 / 132 / 62), `oc-flight` in `C\` (sha ✓), probe names, line numbers, the not-graded list, doubles, REG. REG with several hashed files is ambiguous: U8. |
| T11 | **resolved** | The scope is stated. flight-eq's reads are counts-only under A4.3a with a leak checker. The residual is named. Graders are unaffected. Not a weakening: rev 6 let that controller see quoted trims, and rev 7 sees fewer. |

## (2) Bars against rev 6

**No bar is weakened.**
- Unchanged: §2 rubric, §3 plants and pass criteria, the §5/§5F thresholds and precedence, the floors (30/90), the
  agreement gate, the holdout rule and "FLT FIX suspends a holdout SAFE".
- Stricter in rev 7:
  - A multi-class transcript consumes from every class.
  - A spent calibration or classifier budget stops the work.
  - Classifier slots get void rules.
  - The dispatch check.
  - REG refusal.
  - The log cross-check.
- Relaxed (score-blind): the metrics equality now subtracts named superseded lines. This is needed to accept h40d's
  shape, and U1/U3 close the hole it opens.

## (3) b10 contract deltas

**Implementable and consistent, with one exception (U1):**
- The registered HEAD exists in the record (§11 field; A5 step 14), and the record is frozen from the launcher line (A5.4).
- The launcher log path is the registration's (§2: `interview60.runs\flight-eq.launcher.log`).
- `superseded <logLine>` matches the in-app `logLine` addressing.
- The producer cases match A5.4 verbatim.

## (4) Do the new checks flip on known answers?

- **Yes:** F4's eleven cases; T3's 17:01Z case (string comparison VOIDs it, the instant accepts it) and its 16:59Z case
  (catches an offset applied the wrong way); T4's seven; T5's stand-ins and decide sets; T7's one-word case; REG against
  a wrong `HASHES.txt`.
- **Gaps:** consumer-side detection of a superseded stream exported as an entry (U1), a falsely named `superseded`
  line (U3), classifier output (U4).

## (5) Grading start conditions

Checkable:
- (i) this file's first line and counts. U1 must be applied and confirmed first.
- (ii) `C\HASHES.txt` with `date`, enforced by REG.
- (iii) the user's OK in chat.
- F2: ARMING sha against the launcher line.
- F3: `instruments.sha256.txt`, the committed note, the merged judge files, the leak-checker line.

## Findings

### Important

**U1. The b10 contract has two contradictory h40d known answers, and the consumer cannot catch the wrong one.**
- **b10's registered calibration**, kept by A4.3a and again by A5.4 ("in addition to A4.3a's"), expects 47 cue lines
  → **45** in-app entries + 2 outside the window.
- **Rev 7 says otherwise.** In-app entries are one per delivered answer, "superseded streams excluded" (L521). Rev 5 §1
  (L385) counts 45 in-window lines = 44 delivered + R29's 11:31:30Z superseded line. So 45 entries can only be reached by
  exporting R29's superseded stream as an entry. Producer case (iv) (rev 7 L508–509, A5.4) demands that same line as
  `superseded`. b10 cannot pass both.
- **The consumer is blind to the wrong shape.** Suppose b10 meets "45". Every in-window line is then addressed by
  exactly one entry, and the entries with `empty: null` (45) equal `cueBlocks.present` (45) minus 0 named. Every T2 check
  passes.
- **So rev 7's §6 claim is false here.** L1151–1153 says cue-material-eq "refuses it on delta 2 whenever a superseded
  in-window cue line exists". It does not for this shape.
- **Effect on the verdict.** A superseded stream enters FLT as an unpaired entry (reported, excluded), or as a graded
  "double" if the pairs join gives it a dispatch time. The second adds a block that rev 7 (L612) says is "excluded in
  both readings".
- **Fix (dated amendment; then a dated flight-eq note citing it, per A5.4).** Add to §1F "Contract deltas":
  > "4. h40d's known answer under this contract is **44 in-app entries on 44 ids, 1 `superseded <logLine>` line (R29's
  > 11:31:30Z line), 2 cue lines outside `window`, 0 empties** (§1's IN-APP row). It replaces b10's registered '47 → 45
  > in-app entries + 2'. The twins' 44/44 per rep is unchanged."

  Add to F4, before the real export is read:
  > "`cue-material-eq.mjs` is run once on b10's h40d calibration export with h40d's run folder (counts and ids only)
  > and must print in-app entries 44, ids 44, superseded 1 (id R29, by play window), outside-window 2. Any other count
  > refuses b10. Synthetic case: an h40d-shaped fixture whose superseded line is exported as a second R29 entry, with no
  > `superseded` line → refuse ('an id with two in-app entries must have both `dispatchedAt` non-null and present in
  > the pairs; otherwise refuse')."

  Replace L1151–1153's clause with:
  > "a b10 that exports a superseded stream as an entry is caught by the h40d known-answer run and the two-entry rule
  > (delta 4)."

### Minor

**U2. Which `ARMING sha256=` line, and how the HEAD is read from the record.**
- The launcher log is one file. The real launcher prints `ARMING absent` when the record is missing (A4.6), and an
  overrun renames the record and regenerates (A5).
- **Fix (§1F Run, F2, F4):**
  > "The line used is the last `ARMING …` line in `flight-eq.launcher.log` before `timeline.startedAt` of `runDir`'s
  > timeline. `ARMING absent`, no line, or a sha unequal to the file → refuse. `<H>` is the single 40-hex value on the
  > record's registered-HEAD line; zero or several → refuse."

  F4 cases:
  > "two ARMING lines with different shas, only the later (pre-start) one matching → accept; only the earlier matching →
  > refuse; a record with two 40-hex HEAD values → refuse."
- Also record A5 (`a1f9a2e0…76b6`, A5.4 = the dated note; its freeze clause) in the amendment and in `C\HASHES.txt`'s
  inputs, and strike "a flight-eq note that does not exist yet" from Not covered (L1316).

**U3. A falsely named `superseded` line silently drops a delivered block.**
- If b10 names a delivered answer's line `superseded` and omits its entry, every rev 7 check still passes.
- **Fix (F4 checks):**
  > "each `superseded <n>` line must be followed, before the next roster item's play start (the timeline's play
  > windows), by an in-window `[Answer] cues: ` line addressed by an entry with the same id; else refuse. The count of
  > superseded lines and their ids are printed and named in the result note."

  Case:
  > "a delivered line named `superseded` with no later addressed line for that id → refuse."

**U4. Classifier output has no format check, and the HARD default absorbs a broken file.**
- "EASY only when both say EASY; otherwise HARD" (L442) and T8's "format-free" together mean a malformed or partial
  classifier file reads as all-HARD. That moves the gating denominator (expected e = 3–7 of 32).
- **Fix (§1F Hard items, §1):**
  > "a classifier or base-rate verdicts file that does not hold exactly the input file's ids, each with a value from its
  > dispatch's enumeration, is a FORMAT VOID of that slot (the T8 re-run-once rule); a missing id is never read as
  > HARD."

  Fixture:
  > "one id missing → VOID; one value outside the enumeration → VOID."

**U5. T6's lower bound must not be the end of the build.**
- b2 records `main.js` mtime "after the build", which is an end time. The filter is written in that same build, at or
  just before it. Using it as the lower bound would reject the true dist.
- **Fix (L594–596, F2):**
  > "`main.js`'s mtime is an end time and is never the lower bound; only a recorded build start time is. Otherwise the
  > lower bound is dropped and named."

**U6. Changing the rate-limit pattern on the day has no process.**
- Not covered (L1312–1313) says the pattern is "settled … on the day, by the first refusal seen".
- **Fix:**
  > "A pattern change after 0b is a launcher edit: the stand-in cases are re-run, the new sha goes in a dated amendment
  > before the next launch, and attempts already recorded are re-read under the new pattern for budget accounting
  > only, never for scores."

**U7. T3's parenthetical names the wrong case (L922–923).**
- A string comparison VOIDs 16:59Z correctly. It wrongly VOIDs 17:01Z, and that is the case that flips it. 16:59Z
  catches an offset applied the wrong way.
- **Fix:** replace "(a string comparison would accept the first)" with "(a string comparison VOIDs the second; adding
  the offset in the wrong direction accepts the first)".

**U8. REG is ambiguous when `C\HASHES.txt` lists several files.**
- **Fix (L848–850):**
  > "REG prints the sha256/16 of the `HASHES.txt` line naming the registration file in force (rev 7), and the tool
  > refuses unless every file listed in `HASHES.txt` (the registration and each Minor-fix amendment) hashes to its
  > line."

  Case:
  > "an amendment edited after hashing → refuse."

## Not checked

- No tool, build, probe, classification, calibration, b10 or leak checker exists or ran. The findings are against the
  texts only.
- Whether h40d's judge pairs carry R29's superseded stream. Reading `interview60.judge.pairs.json` would expose answer
  text, so U1's verdict effect is stated both ways.
- Whether the debug log ends lines with LF. A CRLF log would refuse every entry under `(\[.*\])$`. That fails closed,
  and U1's real-folder run would surface it.
- Whether `interview60.timeline.json` carries per-item play windows (U3 assumes it does; b5 and the T2 window rely on
  the same timeline).
- A5's other sections (A4-RECHECK fixes) beyond A5.4, the freeze clause, step 14 and the overrun rename.
