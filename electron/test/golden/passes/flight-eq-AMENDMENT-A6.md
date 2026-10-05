# Amendment A6 to PREREGISTER-flight-eq.md: A5-RECHECK's fixes (pre-data)

Written **2026-10-05, 17:43 TST by `date`** (Opus, author). It builds on the registration and A1–A5, all unedited
(sha256 below). **No flight datum exists.** Precedence: **A6 > A5 > … > the registration.** It adopts the re-checker's
exact fix wording (`E\A5-RECHECK.md`) and changes nothing else.

## 0. Resolutions

| item | resolution | binds at |
|---|---|---|
| **I1** arming-record passes an unfinished record | ADOPTED as worded: write `.tmp`, rename; last line `ARMING COMPLETE <stamp>`; gate requires it with stamp ≤ `-At` − 4 min; two cal cases | A5.2, step 12, step 14 |
| **I2** b5 case (i) expected the hour's reading | ADOPTED as worded: (i) checks only that the smoke's LABEL captures are counted `ignored` and never read under 1(e)/5d; no expected VOID count | A5.1 |
| **m1** cal stubs off the real path | ADOPTED as worded | A5.2 |
| **m2** one `T:` line | ADOPTED as worded | A5.2 |
| **m3** unparseable `at` | ADOPTED as worded | A5.1 1(e) |
| **m4** post-hour `LABEL OUTSIDE --g` | ADOPTED as worded | A5.5 B-I1 |
| **m5** short cues and the leak checker | ADOPTED as worded | A5.1 leak checker |
| **m6** tools-review sha | ADOPTED: added below | hashes |
| **m7** section order | NOTED: cosmetic; read A5.5 after A5.4; no text moved | — |

## A6.1 Text added or replaced

- **A5.2 and step 14 (I1).** "Step 14 writes the record to `ARMING-flight-eq.md.tmp` and renames it into place in one
  step; its last line is `ARMING COMPLETE <yyyy-MM-ddTHH:mm:ss+03>`. Gate `arming-record` additionally requires that
  last line with a stamp ≤ `-At` − 4 min (= T − 10). Cal: a stub naming At + 6 without the line → `FAILED (1):
  arming-record`; a stub stamped At − 3 → `FAILED (1): arming-record`." (An overrun record can therefore never pass the
  precheck, and the flight is disabled.)
- **A5.1, b5 case (i), replaced (I2).** "(i) On the run folder's real `verbal-prompts.log` after the hour: every LABEL
  capture with `at` < the smoke's end (the smoke's S1Q04F/S1Q06F captures, ≥ 2) is counted under `ignored` and none
  appears under 1(e) or 5d. The 1(e) count on the hour is the hour's reading, never part of this case. A failure of this
  case = the reader is defective and is rebuilt under A2.5 before 1(e) is read."
- **A5.2 (m1).** "P8's cal stubs live in `E\eqcal-arming\` and are passed by `-ArmingPath`; the cal never writes
  `E\ARMING-flight-eq.md`."
- **A5.2 (m2).** "The record has exactly one line matching `^T: \d{4}-\d\d-\d\d \d\d:\d\d$`; a superseded T is written
  as `Superseded: …`; two `T:` lines → FAIL arming-record."
- **A5.1, 1(e) second half (m3).** Add: "a LABEL capture with a missing or unparseable `at` is read as in the window"
  (fails closed).
- **A5.5 B-I1 (m4).** Add: "post-hour, a non-empty line means `--g` was built wrong: rebuild `--g` from the kept entries
  and re-run; the line is never 5d by itself."
- **A5.1 leak checker (m5).** Add: "a cue string shorter than 24 normalised characters is matched whole; the whole-cue
  cal case uses a cue of ≥ 30 characters." Post-hour.

## Hashes as read (sha256)

- `PREREGISTER-flight-eq.md` `9ca3149bfb5ed44bff9f7d7c81e6203c15d9fe1b6442b47210ccfb59e2d14f44`
- `AMENDMENT-A1.md` `3e3f0ddd2ace1586bc4137394ee5c27868bf7ae121b73f1605519b8cd1d863c8`
- `AMENDMENT-A2.md` `0bd449be9b3bc68c80b3711308b1b4916f21e479fa36adac57a27eea0089f68e`
- `AMENDMENT-A3.md` `36aa80002a6b36d41a5c0ac613e4e7f705f81faa46b559566e9edaad79e31d6e`
- `AMENDMENT-A4.md` `1e0ac7735fce2f857a74588521d43d0b73e721e5c95f1bab0a7e13cee4cd26e0`
- `AMENDMENT-A5.md` `a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6`
- `tools-367-review.md` (adopted in A5.5) `d19d4f741f8adc015695d28ee076cb907d893afa46e925402b353d57974155cf`

## Pre-hour list: changes only (A5's list otherwise stands)

- **Step 12** (`eq-precheck.ps1`, UNBUILT) gains these known answers:
  - a stub without `ARMING COMPLETE` → `FAILED (1): arming-record`;
  - a stub stamped At − 3 → `FAILED (1): arming-record`;
  - a stub with two `T:` lines → FAILED.
  - Stubs live in `E\eqcal-arming\`.
- **Step 14** writes `.tmp`, renames it into place, and ends with `ARMING COMPLETE <stamp>` ≤ T − 10.
