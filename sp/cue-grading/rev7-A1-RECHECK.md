VERDICT: A1 CONFIRMED (U1 closed; U2–U8 adopted verbatim). NOTE-flight-eq-export consistent in substance; R3 loosens no check but needs one registration fix. Blocking 0, Important 1, Minor 4. Grading stays gated (open gates listed below).

# Scoped re-check: AMENDMENT-rev7-A1.md + NOTE-flight-eq-export-2026-10-06.md

Reviewer: a fresh, scoped Opus session (`claude-opus-5-5`), 2026-10-06, after 06:14 TST. No model call, no subagent. No
cue, answer, question or prompt text read or printed. `cues-export-eq.json` and `cue-report\` were not opened. Log
reads went through an in-process script that printed only line numbers, offsets, tags, gate names, turn numbers and
counts. Nothing edited except this file.

## Hashes, recomputed (sha256)

| File | sha256 | as cited |
|---|---|---|
| `C\PREREGISTER-cue-grading-rev7.md` | `b1a41225…1f39` | ✓ |
| `C\PREREG-REREVIEW-7.md` (the rev 7 re-check) | `73fd42aa…b191` | ✓ (A1) |
| `C\AMENDMENT-rev7-A1.md` (mtime 2026-10-05 17:45:17) | `6992393e…b593` | ✓ |
| `C\NOTE-flight-eq-export-2026-10-06.md` (mtime 05:58:36) | `03de625d…9e4f` | ✓, equals its `.sha256` |
| `E\NOTE-b10-rev7-A1.md` (mtime 2026-10-05 17:45:45) | `2b6550a5…e47b` | ✓ (NOTE) |
| `E\cues-export-eq.completeness.txt` | `acbba74d…ab23` | ✓ |
| `E\eq-cues-export.run.txt` | `18406488…11fa` | ✓ |
| `RUN\natively_debug.log` (7953 lines, 0 CRLF) | `163584db…d380` | ✓ (NOTE, completeness `LOG`) |

`C\HASHES.txt` does not exist.

## 1. Does rev7-A1 adopt the rev-7 re-check without changing a bar after data?

**Yes.**
- **Verbatim.** A1.1–A1.8 match U1–U8 of `PREREG-REREVIEW-7.md` line for line: delta 4 (44 / 44 ids / 1 superseded = R29 11:31:30Z / 2 outside / 0 empties), the F4 known-answer run and synthetic case, the §6 replacement, the ARMING / `<H>` rule and its three cases, U3's check and case, U4's FORMAT VOID and two fixtures, U5, U6, U7, U8 and its case.
- **One addition.** A1.1 also writes the two-entry rule into §1F's standing checks, besides the synthetic case. That is the rule the re-checker's case is meant to flip. It only tightens, and tonight it does nothing (40 entries on 40 ids).
- **Pre-data.** A1 was written 2026-10-05 17:44–17:45 TST. The hour's `startedAt` is 2026-10-06T00:04:13.437Z (03:04 TST). It changes no rubric, plant, floor, threshold, budget or gating bar. Its only count change (47→45+2 to 44/1/2) is the known answer the re-checker asked for.
- **U1 is confirmed.** The consumer now catches a superseded stream exported as an entry: the two-entry rule plus the known-answer run.
- **A1's "Not covered" is partly settled since it was written** (this is information, not a defect):
  - The flight-eq note exists (`E\NOTE-b10-rev7-A1.md`, 17:45:45, before any flight data). It cites A1's sha `6992393e…` and carries A1.9's text.
  - b10's own h40d calibration (`E\b10cal-out\h40d\cues-export-eq.completeness.txt`) prints:
    - in-app 44, ids 44;
    - in-window 45, outside 2;
    - `superseded 6541`, and log line 6541 is an `[Answer] cues: ` line at 2026-10-02T11:31:30.776Z, which is R29's;
    - cueBlocks `45 = 44 + 1: OK`, `EXPORT COMPLETE`.
  - The "2 outside" premise now has evidence. NOTE §1 puts h40d's two probe lines at −25.131 s and −8.137 s.
  - Still owed: the consumer's own F4 run on that export.

## 2. Is NOTE-flight-eq-export consistent with rev 7 + A1, and is R3 sufficient without loosening a check?

**Consistent in substance.**
- **R1 (material).** "40 roster in-app entries plus the twins" matches rev 7 §1F:
  - the FLT-INAPP / TWINS rows;
  - "Not graded, named: … cue lines outside the run window (the readiness probe's)";
  - the roster-id regex.
- **R2 (not VOID, not export-missing).** Supported.
  - The INCOMPLETE / FLT-selection rules count in-app roster ids, and 0 of 40 are missing.
  - Rev 7 §1F also says a failing b10 "is rebuilt under flight-eq A2.5 … never adapted by a cue-grading script". That is exactly the NOTE's path, so the registered remedy for this refusal is a rebuild, not a VOID.
- **The NOTE does not misuse U3.** Calling L386 `superseded` would be false, and U3 would refuse it.
- **It stays inside A1.1's author note.** The ruling is given to the user (it takes effect only with the user's OK), not edited into a tool.
- **No bar moves.** R3 changes material assembly only, decided on counts and line metadata with no cue or score text seen.

**The evidence reproduces.** Offsets are vs `startedAt`.

| Line | Offset (s) | Tag |
|---|---|---|
| L261 | −30.286 | QGATE `turn=1` |
| L284 / L291 | −19.031 / −18.924 | cues / full |
| L336 | −13.262 | QGATE `turn=2` |
| L386 / L395 | +4.212 / +4.398 | cues / full |
| L441 | +13.563 | QGATE `turn=3` |

- No QGATE line falls between L336 and L386.
- There are 42 QGATE lines, 2 of them before `startedAt`.
- The pairs hold 40 items. The earliest `dispatchedAt` is 00:04:26.995Z, and 0 lie before `startedAt`.

**R3 is sufficient and loosens no check.**
- Criterion 1 (the turn start lies before `window.startedAt`) cannot be met by a roster stream. Every roster stream has its own turn line at or after `startedAt` (the first is L441), and that line precedes its cues line.
- R3's other three criteria and its three refuse-cases only narrow the exemption.
- The addressing check and the cueBlocks reconciliation keep refusing on every other mismatch.
- Tonight's shape satisfies criteria 1–3 as the log shows, and criterion 4 as the pairs show.

## Findings

### Important

**I1. R3 changes the registered contract, but the NOTE puts it outside the registration chain.**
- **What R3 adds.** A new completeness line `probe <logLine>`, a third addressing alternative, a new term in the cueBlocks reconciliation, and four F4 cases.
- **Why that breaks rev 7.** Rev 7 §1F delta 3 says "No other change: … the `LOG` / `EXPORT …` lines are rev 6's". A1.1's author note sends exactly this kind of case to "a dated amendment".
- **What the NOTE says instead.** "This note is not one of [`HASHES.txt`'s] registered inputs".
- **The effect.** REG (A1.8) verifies only the files listed in `HASHES.txt`. A consumer built to R3 would therefore run checks that no hashed text registers.
- **Fix.**
  1. Carry R1–R4 into `C\AMENDMENT-rev7-A2.md` as contract delta 5 plus the F4 cases, with M1–M3 below applied.
  2. Get a scoped fresh-Opus re-check of A2.
  3. Hash rev 7 + A1 + A2 into `C\HASHES.txt`.
  4. File a dated flight-eq note citing A2's sha before b10's R3 build is recorded in `instruments.sha256.txt`.
- **Not BLOCKING in substance.** The ruling is right. Grading cannot start until this is done.

### Minor

**M1. Criterion 4 is weaker than "no pair belongs to it".**
- "No `dispatchedAt` at or before its turn start" leaves the interval (turn start, `startedAt`) uncovered.
- It also relies on the dispatch line preceding the turn line. Tonight that holds by 5 ms: L334 at .170, L336 at .175.
- **Fix.** "No `judge.pairs` `dispatchedAt` lies before `window.startedAt`". This is strictly stronger, no roster pair can fail it, and tonight's count is 0.

**M2. Criterion 2's source is not a consumer input.**
- "The first roster window's turn (b5: `turn=3`)" comes from b5's output.
- **Fix.** Either name `E\eq-flight-read.out.txt` (sha `2e8b0b58…1681`) as a hashed input, or derive the turn in the consumer: the turn of the first QGATE line at or after the earliest pairs `dispatchedAt` (tonight L441, `turn=3`).

**M3. R3 does not say which line `probe <logLine>` names.**
- Tonight's INCOMPLETE token was the **full** line (L395). The consumer's addressing check and the contract's `logLine` are about **cues** lines (L386).
- b10's own full-line accounting (in-window full 41 vs 40) is not mentioned as exempted.
- **Fix.** `<logLine>` is the cues line. b10 exempts that stream's paired `full:` line. Add a refuse-case: a `probe` line naming a non-cues line refuses.

**M4. Criterion 1 attributes by position, not by stream (residual; fails closed).**
- It takes the last QGATE line before the cues line. A probe stream delivering after the first roster turn line (later than +13.563 s tonight) would read `turn=3`.
- Such a line fails criterion 1, so the export refuses rather than hiding anything.
- **Fix.** Name this in A2's Not covered alongside the harness's missing drain. No rule change is needed.

## 3. What blocks grading

These are open gates, not defects in A1 or the NOTE.
- **`C\HASHES.txt` does not exist.** Rev 7 §7(ii) and REG need it, with rev 7 + A1 (+ A2 per I1) and the time from `date`.
- **I1's amendment and its re-check** are not yet written.
- **b10's R3 build is in progress, unrecorded.**
  - `E\eq-cues-export.mjs` now hashes `f92e2ec1…b8239` (mtime 06:20:53, after the NOTE).
  - `instruments.sha256.txt`'s b10 line is `952182ae…8123`, which equals `eq-cues-export.pre-R3.mjs`, the tool that wrote tonight's export.
  - No dated flight-eq note carrying R3 was found; `RESULT-flight-eq.md` L165 says it waits on R3.
  - The consumer would refuse the current file on its `instruments` check. That is fail-closed and correct, but b10 needs the note, its A2.5 recalibration, an Opus review and a new `instruments` line.
- **`cue-material-eq.mjs` does not exist**, so its F4 calibration has not run. That includes A1's h40d known answer at the consumer and R3's cases.
- **The user's OK** (F5), with the F4 counts in hand.

## Not checked

- The export JSON was not opened. That no entry addresses L386 rests on b10's counts. The consumer's refuse-case 3 checks it.
- The probe's scripted text, and the twins' empties.
- b10's in-progress R3 edits (not read). The A5/A6 contents beyond what A1 cites.
- The h40d judge pairs' content (whether R29's superseded stream is in them). Only F4's consumer run settles it.
