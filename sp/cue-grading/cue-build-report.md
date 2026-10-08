# Cue-grading material pieces: build report (2026-10-06)

No grader, classifier or model call. No cue, answer or prompt text printed. App not started, no scheduled task touched,
MAIN not written, nothing committed. Spec read: rev 7, A1, A2, A3, A4 (sealed `759d6629…`), the two re-checks.
`C` = `SP\cue-grading`, `E` = `SP\flight-eq`.

## 1. b10 (`E\eq-cues-export.mjs`) aligned with A2.1, A3.2 + A4.1

| file | sha256 |
|---|---|
| `eq-cues-export.mjs` (new) | `c64fc4fa8b8d31dbd9ccbc662e59ba4559ced1c8816714e87ab7e51a223326e1` |
| `eq-cues-export.f92e2ec1.mjs` (the R3 copy as found, sha `f92e2ec1…8239`) | kept beside; `eq-cues-export.pre-R3.mjs` (`952182ae…`) untouched |
| `eq-cues-export.cal.mjs` | `a49f8a635b3ef9fa9de2282a59121ca8b3df63a9f37df3328c70f3813535c6b5` |
| `eq-cues-export.cal.txt` | `30762cea7e2552d01c42b33e09c8dc2fcdf58e37c067c678908504b147da26a7` |
| `b10-mutants.mjs` / `b10-mutants.txt` | `1fb12e05…5432` / `1dbe3e17…f572` |

Changes (every one traced to the amendments):
- **Criterion 5 (A2.1):** a probe is admitted only if no judge pair `dispatchedAt` is before `window.startedAt` (a pair AT
  `startedAt` passes; an unparseable one refuses). Replaces "at or before its turn start".
- **M3:** `probe <n>` was already the cues line; added the printed exemption count `full lines exempt (probe) <k>`
  (named so it cannot match `^probe `).
- **A3.2 as limited by A4.1:** a stream is named `superseded` only if its turn started at or after `startedAt`; checked only when the log
  carries turn lines. A stream that fails it is not named; it goes to `L<n>` (INCOMPLETE). h40d (0 turn lines) unchanged.
- Old copies of cal/mutants/txt kept as `*.pre-A2.*`.

Calibration: **122 PASS, 0 FAIL of 122** (was 114; +8: criterion 5 between-turn-and-start pair, pair exactly at startedAt,
M3 count x2, A3.2 x3, leak). Mutants: **29 of 29 non-equivalent flipped**, 1 argued-equivalent (R3-3c) not caught, as before.
Three old mutant patterns (M6, M6b, R3-4) no longer matched the new source; I rewrote them (they were reported invalid
first, then fixed; the final run has 0 PATTERN NOT FOUND). 5 new mutants: A2-5, A2-5b, A2-M3, A3.2, A4.

Leak scan (706 real cue strings of 8+ chars, scanner calibrated: one planted cue -> 1, clean -> 0): 0 hits in run3 stdout,
cal.txt, mutants.txt, completeness file, b10 source, cal source, mutants source.

**Run3 on the real run folder** (`eq-cues-export.run3.txt`; run2's files kept as `cues-export-eq.run2.json`,
`cues-export-eq.completeness.run2.txt`, `eq-cues-export.run2.txt`): exit 0, **EXPORT COMPLETE**.
- LOG sha256/12 `163584db6942`; ARMING `1b87f8d02bbc` head `56bda9e`; window 00:04:13.437Z to 01:12:55.930Z.
- in-app entries 40 on 40 ids; 40 joined to pairs, 0 unjoined.
- cue lines in window 41, outside 1; full lines in window 41, outside 1.
- **probe 386; full lines exempt (probe) 1**; superseded 0; undelivered 0; empties 0.
- cueBlocks present 41 = 40 + 0 + 1: OK.
- twins: six reps, 40 entries each, asked 40.
- export json sha256/12 `f92c6b1a2176` (280 entries), byte-identical to run2's.

## 2. Consumer `C\cue-material-eq.mjs` (the registered name)

| file | sha256 |
|---|---|
| `cue-material-eq.mjs` | `1b6cd518644db56a705bbcb1e76914080e9cb0bdeb4b659d5efb99b521ab2364` |
| `cue-material-eq.cal.mjs` (F4 driver) | `dd98016d7a9e43da705ef9e9174524684a0612d84b891c43ea0dfb8e53abb24a` |
| `cue-material-eq.cal.txt` | `51d21ab5a9c4b7ef3308984e90f3b19fe76165b9026cf57f8fd2b9249ac8036b` |
| `cue-material-eq.mutants.mjs` / `.txt` | `a951c9b7…a34f` / `26a0b38f…c06ef` |

What it does, in order: REG (reads `C\HASHES.txt`: no BOM, valid UTF-8, LF, row format, absolute or SP-relative paths, every
file hashes to its line, one REGISTRATION, rows for A1-A4, run pairs and timeline are INPUT rows; prints `REG <16 hex>`
first) → b10's `instruments.sha256.txt` line must match the tool file → ARMING record vs the last pre-start launcher line →
LOG sha → export contract (keys, forbidden fields, ids, src names, empties, two-entry rule) → addressing (each in-window
cues line addressed once, or `superseded`, or `probe`; no line named twice) → U3 and A3.2/A4.1 → probes (criteria 1-5,
`N_first` derived from the log, only when a probe line exists) → `cueBlocks` equality re-read from MAIN's metrics module →
twins against their answer files → INCOMPLETE tokens (<=2 in-app ids excluded, >2 = `FLT VOID (export)`, exit 3) →
assembly of `cues.blind-11..24`, `keyhold\key.blind-N.json`, `sets.flight.json`, manifest slots `blind-N.g1/g2`. Prints counts,
ids and hashes only. Overrides need `CUE_EQ_CAL=1`.

**F4 calibration: 83 PASS, 0 FAIL of 83.** Includes A2.3 cases 1-8, A3 cases 9-12, A4 cases 13-14, the four A4.3 REG cases
(plus BOM, CR, malformed row, missing A4 row, unpinned pairs/timeline), U2 ARMING cases, rev 6/7 F4 list (forbidden field,
id outside S1+S2, twin cues differ, trimmed-line logLine, INCOMPLETE a,b / a,b,c, missing judge file, wrong judge model,
b10 line missing / wrong sha, HEAD, ARMING sha, LOG sha, entry vs log, outside-window addressed, missing+logLine,
r4 src, superseded reconcile / unnamed), assembly (14 files, neutral ids, A without answer, B with, trimCues applied, 28 slots,
determinism, re-run refuses, exclusions). Mutants: **33 of 33 flipped** the calibration (two initially not caught, X30 and X33; I added a case for each).

**h40d known answer (case 8)**, from b10's rebuilt h40d export and the h40d run folder:
in-app 44, ids 44, superseded 1 (log line 6541), outside window cues 2 / full 2, probe 0,
`turn lines 0: A3.2 not applied`, cueBlocks 45 = 44 + 1 + 0, six twin reps 44 = records. As A1.1/A4.1 require.

## 3. Real-input state

- `C\HASHES.txt` exists (written 06:33:32). Running the consumer on the real inputs prints `REG b1a412257cc8edc7` (the registration's
  sha256/16) and **refuses at the b10 line check** (`instruments.sha256.txt` still names the pre-R3 sha `952182ae…`; the new tool is `c64fc4fa…`).
  The export and completeness file were not opened by the consumer (it stops before them). That refusal is correct until the items below are done.

## 4. Unresolved / for the controller

1. **b10 is not recorded.** Needs: a dated flight-eq note citing A4's sha `759d6629…8a9b` (A2.4 / A4 Not covered), an Opus review of c64fc4fa, a new
   `instruments.sha256.txt` line (`eq-cues-export.mjs sha256=c64fc4fa… cal=… review=…`). I did not write any of these.
2. **Not built, so the real assembly cannot run yet:** the display-pin snapshot (`main-eq-<H7>` + its sha; the consumer takes `--trim-module` and `--trim-sha` and
   refuses without them), the frozen `cue-grader-prompt.A.md/.B.md`, `C\flight\pipeline-ids.txt`. HARD/EASY classifier verdicts and the denominators are not read:
   they belong to `cue-decide.mjs`; F4's "HARD, denominators" print is therefore not done (the consumer prints pipeline, inherited, partly-correct counts per set).
3. **Choices the registration does not fix (please confirm or amend):** blind file shape `{"blocks":[{"id":"b01","question","cues"[, "answer"]}]}`;
   manifest `{"slots":{"blind-N.gX":{blind,verdicts,instruction}}}`; B files omit unpaired in-app blocks; an empty twin `spoken` is a B block with `answer: "no answer"`;
   REG = first 16 hex of the REGISTRATION row's sha (A1.8 says "of the line", §3.3 says "of the registration file"; both give the same text only under my reading);
   the seeded coin is a counter-mode sha256 stream over `cue-grading:flight-eq:<HEAD>` (assignment of N and block order).
4. **Extra checks I added beyond the text:** a pairs entry's id must equal the entry's id; turn-line count by the A4 definition must equal the count of parseable turn starts
   (else refuse); `full lines in window` vs entries + probe is printed as a NOTE, not a refusal.
5. **Residual M4 (A2/A3/A4):** a probe delivered after the first roster turn line, or in a 0-turn-line log, may be mis-labelled `superseded`; material unaffected.
6. The cal drivers run fixtures in `%TEMP%\cue-eq-cal*` (ASCII path, because `cpSync` fails on `Masaüstü`); they are throwaway.
7. Nothing was graded, classified or sent to a model. The user's OK (F5 / step 4) is still the gate.
