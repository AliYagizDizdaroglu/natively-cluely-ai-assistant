# Amendment rev7-A4 to PREREGISTER-cue-grading-rev7.md: the A3 re-check's B1 and n1–n3 (pre-grading)

Written **2026-10-06, begun 06:31 TST by `date` (`Tue Oct  6 06:31:11 TST 2026`)**, by the Opus author of A2 and A3.
It amends revision 7 as amended by A1, A2 and A3; all four stay unedited. Precedence: **this amendment > A3 > A2 > A1 >
revision 7** where they differ.

**Status: pre-grading.** No cue has been graded, classified or calibrated. The author opened no cue, answer,
question or prompt text, and no export JSON, blind file, log or `cue-report\`. h40d's debug log was hashed, not read.
Its turn-line count (0) comes from the re-checker. No model was called. Nothing ran but `date` and `sha256sum`.

This amendment answers the "## A3 re-check" section of `C\rev7-A2-RECHECK.md`. That section's verdict is **A3 NOT
CONFIRMED**: Blocking B1, Minor n1–n3. The whole file's sha256 after the append is
`aa5a26d1e6aae5d2cdfd7822bb5c9a1407a3735b9533e57f8b61f155c9f916e2`; before the append it was `98fe92f2…d1e6`.

Inputs, sha256 as read (06:31 TST):
- `C\AMENDMENT-rev7-A3.md` `ddb49612f4f30823af9a6e95c2433d9c215dc7a0937de2e47772716a9f024573` (equals its `.sha256`)
- `C\rev7-A2-RECHECK.md` `aa5a26d1e6aae5d2cdfd7822bb5c9a1407a3735b9533e57f8b61f155c9f916e2`
- h40d's log `H\natively_debug.log` `feec720cca2d5a10a4295e61cd5cc466d2972861b4da069faab0f735211ba46d` (7511 lines per
  the re-checker), where
  `H` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\2026-10-02T11-39-41-h40d`

## 0. Resolutions

| item | resolution | binds at |
|---|---|---|
| **B1** (Blocking) A3.2 refuses h40d's known `superseded 1`, because h40d's log has no turn lines | ADOPTED. A3.2 applies only to a log that carries turn lines. h40d's count (0) is stated with its sha. A log with turn lines and no turn line before the `superseded` line still refuses. The same gate is put on the derivation of `N_first` (A2.1 criterion 4), which has the same defect. Case 8 runs against the new check | A3.2, A2.1, A2.3 |
| **n1** the pairs pin may collide with F3 | ADOPTED: F3's merge ran before the pins were taken. The controller confirms the pairs file's mtime and sha when writing `HASHES.txt` | A3.7 |
| **n2** two path forms and `ü` | ADOPTED: `HASHES.txt` is UTF-8 without a BOM, LF line ends; REG cases for the absolute form | A3.7, rev 7 §3.3 (T10.8) |
| **n3** Not covered's first bullet contradicts itself | ADOPTED as the reviewer words it | A3 Not covered |

## A4.1 B1: A3.2 applies only to a log that carries turn lines

**Definition.**
- A **turn line** is a line of the debug log named by the completeness file's `LOG` line (sha-checked) that contains
  `question: gate=` and `turn=`.
- The log **carries turn lines** if it has at least one.
- The consumer prints the count of turn lines.
- Known counts:

| Log | sha256 | turn lines | source |
|---|---|---|---|
| h40d | `feec720c…a46d` | **0** (and 0 lines containing `turn=`) | re-checker's read |
| tonight's `RUN` log | `163584db…d380` | **42** | A1 re-check's QGATE count |

  h40d's turn diagnostic postdates its build. That is why its log has none.

**A3.2, replace its check with (both tools):**
- **A log that carries turn lines:** a `superseded <n>` line's turn start lies at or after `window.startedAt`.
  - The turn start is the last turn line before `n`, in file order.
  - If that turn start lies before `startedAt` → refuse.
  - If the log has turn lines but **none before `n`** → refuse. This part of A3.2 is kept.
- **A log with 0 turn lines:** A3.2 does not apply. U3 (A1.3) alone governs `superseded` lines. The consumer prints
  `turn lines 0: A3.2 not applied`.

**The same gate on A2.1** (the re-checker did not name this; it has the same defect):
- `N_first` (criterion 4) is derived only when the completeness file holds at least one `probe` line.
- The run-level condition (criterion 5) is likewise evaluated only then.
- A `probe` line in a log with 0 turn lines fails criterion 2 and refuses, as before.
- Without this, the consumer's "no such line → refuse" for `N_first` would also refuse h40d, which has probe 0.

**A3.2's false sentence is struck.** It read: "Effect on known answers: none. h40d: … its turn starts after
`startedAt` and it passes". It is replaced with: "h40d: 0 turn lines; A3.2 not applied; U3 alone governs R29's
`superseded` line; tonight: 42 turn lines, `superseded 0`."

**F4 cases (expectations first):**
- **Case 8 (h40d)** is now run with A3.2 and the A2.1 gate in force. It must print the following, else b10 is refused
  (A1.1's rule):
  - in-app 44, ids 44;
  - superseded 1 (R29);
  - outside 2;
  - probe 0;
  - `turn lines 0: A3.2 not applied`.
- **Case 13:** a fixture log carrying turn lines, with a `superseded <n>` line and no turn line before `n` → **refuse**.
- **Case 14:** an h40d-shaped fixture log with 0 turn lines and a valid U3 `superseded` line → **accept**, A3.2 not
  applied.

## A4.2 n1: F3's merge and the pairs pin

- **Order of events.**
  - The coordinator reports that flight-eq's per-arm grading merge (F3) finished at about 06:2x TST.
  - That was before A3.7's pins were taken at 06:29.
  - The pairs file's mtime is 2026-10-06 05:08:54.6, earlier than both. The merge therefore did not rewrite
    `interview60.judge.pairs.json`, and the pin `989ef47c…4fd7` is taken after it.
- **Not verified by this author:** the merge time. It is the coordinator's report.
- **A3.7, added:** when writing `HASHES.txt`, the controller confirms the pairs file's mtime (expected 2026-10-06
  05:08:54) and its sha against the pin, and writes both into the file's header comment. Any difference → the
  controller writes nothing and reports to the user (A3.7's existing rule).

## A4.3 n2: encoding and the absolute-path form

- **Encoding.** `C\HASHES.txt` is written as **UTF-8 without a BOM, with LF line ends**. REG reads it as UTF-8.
  - A file starting with a BOM → refuse.
  - A line that does not split into `<64 hex>  <path>  <role>` → refuse.
  - A path field starting with a drive letter (`X:\`) is absolute. Any other path field is relative to `SP`.
- **REG cases** (added to rev 7 §3.3 T10.8's REG refusal; each tool runs them):
  - A `HASHES.txt` with an absolute-path INPUT line whose file hashes to its line → **accept**.
  - The same line with `Masaüstü` written in a legacy code page (the bytes are not UTF-8 `ü`) → **refuse**, because
    the file is not found or the line is not UTF-8.
  - The same file saved with a BOM → **refuse**.
  - An absolute-path line whose file has been edited → **refuse**.

## A4.4 n3: A3's Not covered, first bullet

In A3's Not covered, the opening "**M4 stays a residual and fails safe** (A2's wording, now also true of the
`superseded` path through A3.2)" is replaced with: "**M4 stays a residual. The material is unaffected; the line may be
mis-labelled `superseded`.**" The rest of the bullet is unchanged.

That holds more widely under A4.1. In a log with 0 turn lines, a probe line named `superseded` is governed by U3
alone. It is likewise mis-labelled, not graded.

## A4.5 `C\HASHES.txt` (replaces A3.7's block)

The rules are A2.5's and A3.7's, plus A4.2 and A4.3. The controller writes the file **after A4's scoped fresh-Opus
re-check confirms it**.

```
# C\HASHES.txt   written <`date` output, after A4's re-check>   pairs mtime <as read>   UTF-8, no BOM, LF
b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39  cue-grading\PREREGISTER-cue-grading-rev7.md  REGISTRATION
6992393e7d6dba219698c14d47aa5878d7a1b4ac58323b086a480cdef870b593  cue-grading\AMENDMENT-rev7-A1.md  AMENDMENT
bb2154cc1e986a57dd4f3043daaa7a3b8d821be77fff1fca3ebed6c39bc4bf98  cue-grading\AMENDMENT-rev7-A2.md  AMENDMENT
ddb49612f4f30823af9a6e95c2433d9c215dc7a0937de2e47772716a9f024573  cue-grading\AMENDMENT-rev7-A3.md  AMENDMENT
<sha256 of this file, as sealed below; the controller re-hashes it before writing>  cue-grading\AMENDMENT-rev7-A4.md  AMENDMENT
03de625d611987d05b0f48385e0d54b26e5b92021653a2eff2a22a416fbe9e4f  cue-grading\NOTE-flight-eq-export-2026-10-06.md  INPUT
a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6  flight-eq\AMENDMENT-A5.md  INPUT
92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303  flight-eq\AMENDMENT-A6.md  INPUT
989ef47c97695a42574d35c2e463985510a5998185fb6b2f4e2ff4ba04774fd7  C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\2026-10-06T01-12-56-eq\interview60.judge.pairs.json  INPUT
f69287735ddabe8c3c0c7dac832e4cda92f1001380538180f0841251170ebffa  C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\2026-10-06T01-12-56-eq\interview60.timeline.json  INPUT
```

h40d's log is not pinned here. It is not FLT material. Case 8 reaches it through b10's calibration export's `LOG`
line, which is sha-checked. The `feec720c…` cited above is a stated fact, not a REG input.

## A4.6 What does not change

**No bar, set, grader or reading changes.** A4 narrows where A3.2 applies so that it matches what each log can show.

It loosens nothing that rev 7 + A1 registered. A3.2 had not passed its re-check and had never bound. Its effect on a
log that carries turn lines is unchanged.

The A2.1 gate removes only a refusal that had no probe line to check. Every other check stands. A1's known answers
(h40d 44 / 44 / 1 / 2) and A2's expected counts for tonight (40, probe 1, superseded 0, 41 − 0 − 1 = 40, `N_first` 3)
stand.

## Not covered

- **The two logs' turn-line counts are not this author's reads.** h40d's (0) is the re-checker's; tonight's (42) is A1's
  re-check's. Case 8 and the real run print both.
- **Other h40d-based F4 fixtures that may assume turn lines** were not checked (the re-checker's own "Not checked").
  Any such fixture is rebuilt to h40d's shape before F4, expectations unchanged.
- **The probe-in-`superseded` residual is wider in a 0-turn-line log.** A4.4 covers it: such a line is mis-labelled,
  not graded.
- **F3's merge time** is the coordinator's report. The mtime check at `HASHES.txt` time is what binds.
- **Nothing has run.** That covers b10's R3 build, which now owes A3.2 as amended here and a flight-eq note citing A4's
  sha, and the consumer, F4, the probes, calibration and grading.

## Seal

This file's sha256 is computed after its last edit and given outside it; a file cannot carry its own hash.
