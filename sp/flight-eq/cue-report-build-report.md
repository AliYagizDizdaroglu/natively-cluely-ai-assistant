# Counts-only cue reporting: build report, fix round (2026-10-06 ~01:15 TST)

Spec: AMENDMENT-A4 "Counts-only cue reporting"; A5.1 leak checker; A6.1 m5; review: cue-report-review.md (B1, I1-I4, m1-m5).
No model call, no app, no scheduled task, nothing written in MAIN, no commit. The wrapped instruments are unedited.

## Files (all in E), sha256/12
| file | sha256/12 |
|---|---|
| cue-report.mjs (wrapper) | d7888ad679d0 |
| cue-leak-check.mjs | 4cd9e25db5fc |
| cue-leak-check.cal.mjs | db4ab43b8fa8 |
| cue-leak-check.cal.txt (40 ok, 0 FAIL) | a628cac17c3f |
| wrapped, unedited: check-smoke-cues v4 / smoke-facts / h40d-twins / h40d-thoughts-noise | c1ecd07d10a9 / cdc1f9477c50 / b8f374f78af0 / 066f5e81ee59 |
| eq-cues-export.mjs (not mine, not touched; read 952182ae4eea now, was 2ee308d261f1 at the first round: another agent changed it) | 952182ae4eea |

## Use
`node cue-report.mjs <smoke|facts|twins|thoughts|all> <run-dir> --export <cues-export-eq.json> [-- extra tool args]`; `node cue-leak-check.mjs <export> <summary-file>`.
Exit codes of the wrapper: 0 ran, 2 usage/refusal, 3 an instrument FAILED, 4 wrapper crash (class + file:line only), 5 a summary WITHHELD.

## Per item
- **B1 fixed.** The export (and the run log it names) is loaded and validated before any instrument runs. Every refusal and crash prints `refused <class> (<file>:<line>)` / `crash <Name> (<file>:<line>)`, never a parser message; an uncaughtException handler does the same. Cal: four malformed exports (truncated JSON holding a made-up cue, wrong schema, cues not strings, a log file), wrapper and CLI: exit 2, one refusal line, empty stderr, output leak-scanned against the made-up cue: leak 0. A missing file: same shape.
- **I1 fixed.** `--export` is required; without it: usage line, exit 2, nothing printed from a summary. Cal case.
- **I2 fixed.** Known set = export cues + every string in the run log's `[Answer] cues:` arrays and `cues trimmed:` objects (values, keys excluded) + every string literal on the cue-carrying lines of E\cue-report\*.full.txt (re-read after each instrument run). h40d: 11 strings are in the log but not in the export (7 block strings, 4 trim strings); with the export alone 7 of the 11 read leak 0, with the widened set 11 of 11 are caught. Cal cases for the harvester on synthetic lines too. The log must exist (export.runDir) or the checker refuses `run-log-missing`.
- **I3 fixed.** Short cues (< 24) match as a plain substring, no word boundary (A6 m5 literally). Cal: 257/257 whole inserted read >= 1; with "s" appended 257/257 read 1; "x<cue>x" 257/257 read 1.
- **I4 fixed.** Allowed instrument exits (readings): smoke 0/1, facts 0, twins 0/1/3, thoughts 0. Any other exit, a spawn error, or a crash signature (stack frame, `INSTRUMENT ERROR`, `Uncaught`) gives `<tool> on <run>: INSTRUMENT FAILED (...)`, no summary built, summary file holds only that line, wrapper exit 3. Cal: twins with an unknown option (exit 2), thoughts on a malformed answers file (crash signature).
- **m1 fixed.** Case 2g now asserts exactly leak 1 (inside a letter run, since I3).
- **m2 fixed.** Each known string is also tried JSON-escaped (`\"`, `\`, `\uXXXX`), markdown-escaped and HTML-escaped (4 forms). Cal with a synthetic cue holding `"`, `\`, non-ASCII, markdown and HTML characters: clean text 0; raw, JSON, JSON-\u, markdown, HTML forms each leak 1.
- **m3.** Decisions for your note (below).
- **m4 fixed.** Withhold stdout is `<tool> on <run>: WITHHELD leak <n>; ...`, exit 5 (so `all` cannot exit 0 when a summary is withheld). Cal case (synthetic export whose cue is a summary line): exit 5, no summary file left.
- **m5 fixed.** `all` with `-- extra` args is refused (exit 2); extra args reach a single tool (cal: twins `--strict`).

## Calibration totals (cue-leak-check.cal.txt): 40 ok, 0 FAIL
h40d summaries leak 0 x4 (wrapper `all` exit 0, CLI each); one whole cue leak 1 for 158/158 (>= 30 chars), first 30 chars 158/158, inner 24-char run 158/158, case + whitespace 158/158, CLI one-cue mutant leak 1, two cues leak 2, same cue at two places leak 2; plus the cases above; the calibration's own output is leak-scanned (leak 0).
First-round tally was 15 ok; the cases grew to 40.

## For the note (m3): three decisions made while building
1. `n` in `leak <n>` = number of separate leaked regions of the checked file (overlapping matches merge, so one inserted cue is 1 even if a shorter cue sits in it; the same cue at two places is 2). A5.1 defines no n.
2. The check-smoke-cues summary carries counts per class and no ids (the instrument prints none); ids come from the facts summary (block ids, trimmed ids, failed and superseded ids).
3. The twins and thoughts summaries are the instruments' own lines passed through (clipped to 300 chars), not built line by line; their own headers say ids and numbers only, and the leak check is the guard on top. Also: twins exit 1 (STOP) and 3 (INCOMPLETE) are treated as readings, not failures.

## Uncovered
- Tonight's run folder and export were never read; line shapes and counts are h40d's. A changed instrument line shape drops that line from the facts summary (fails closed).
- Short cues minus their last 2 characters read leak 0 for 244 of 257 (registered rule: whole only). A paraphrase, a translation or a cue with punctuation changed inside a 24-char run is not caught; a cue shorter than 24 characters is only caught whole.
- Escapes beyond JSON, markdown, HTML (percent-encoding, base64, other encodings) are not tried.
- The known set misses cue text that never reached the export, the log's cue lines or the full outputs.
- twins refuses when the built CUE_RULE or stream-filter hash differs from h40d's registered values: tonight that shows as INSTRUMENT FAILED (exit 2).
- twins/thoughts read the run folder's judge/answers files; tonight's grading location is not wired.
- The checker and wrapper were measured on Node v22.19.0 only.
- No process was left running.
