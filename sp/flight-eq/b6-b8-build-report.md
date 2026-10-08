# b6 / b8 build report (written 2026-10-06 00:42 TST; hard stop 02:40 not reached; every process I started has exited)

b6 (the twins adapter) and b8 (the grader pieces) are built and calibrated with no model call: no Gemini or Claude call, no app start, no scheduled task
touched, nothing written inside MAIN or in `followup-turn\R` (the original launcher and audit are byte-unchanged: mtime 2026-10-04), nothing committed.
All files are in `E` = `L\flight-eq`. None has an Opus review or a line in `instruments.sha256.txt` yet (that file does not exist; A2.5 needs both
before the tool's first run on the hour's folder).

Deltas read first: PREREGISTER section 2-6 + b6/b8 (l. 392-414), A1-A7, NOTE-controller-tools-2026-10-05, USER-RULING-4c, ARMING record. What binds the
tools: A2.2/A3.4 (the alternating G sitting: front 5+5, back 3+3, tags `captured-g-high[-rK]` / `captured-no-block-high[-rK]` / `captured-g-low` /
`captured-no-block-low`, counterbalanced order, 2c gates only if every front rep's two steps START <= 15 min apart); A2.1 + A3.2 (3a/2b/2c/2d lines, FAIL
bar `max(floor(0.05 n), ceil(n/21))`); A3.3 (4c: FAIL only at block - no-block >= +2, the user's +1 margin); A2.4/A3.4 m5 (|G_twin| < 3 INCOMPLETE; holes);
A4.4 m11 (`-b` re-run pair replaces the rep on both sides); A2.7 + A3.5 + A4.5 (fourteen per-arm rows, 2 + 1 blind files, `--model-id`, cwdprobe-1/2 pinned,
cwdprobe-3 the alias read); A7 I3 (timing: no effect on these tools, 2c reads the sitting's own start lines).

## Tools (sha256/12) and calibration totals

| file | sha256/12 | result |
|---|---|---|
| `eq-twins.mjs` (b6) | **f90efdb47af8** | `eq-twins.cal.txt` (03fdc2fb164a): **89/89 checks, 15/15 mutants caught** |
| `eq-twins-cal.mjs` | b0adade9525a | |
| `launch-grader-eq.mjs` (b8: pairs mode, `--model-id`, probes 1-3) | **dfca2a67af88** | `launch-grader-eq.cal.txt` (7aaf1d89de91): **72/72 checks, 19/19 mutants caught** (with the three below) |
| `eq-audit.mjs` (audit for pairs-mode graders) | **f86e6fe1b87c** | in the same cal: 10 synthetic transcripts, identical verdict to `audit-graders.auditText` on a blind-named slot; 4 mutants caught |
| `eq-grader-dispatch.txt` | **62c789adbef1** | template region sha256/12 `3dd507745e98` = h40d's, byte-identical; 14 per-arm + 3 blind rows |
| `eq-merge.cmd` | **fc5895f90dbd** | 14 rows; 15 checks (14 MERGED lines, SKIPPED-MISSING, exit 10/12/13, MERGE-FAILED, `--model` on every call); 4 cmd mutants caught |
| `launch-grader-eq-cal.mjs` | 3504e9a8f048 | |

Unchanged originals the new tools import (not copied): `followup-turn\R\launch-grader.mjs` 2f096c380161, `audit-graders.mjs` 07833cf41bcc,
`legs-decide.mjs` e00a46c0b1cd, `check-grader-memory.mjs` 119ea78a433b; h40d dispatch f8d646701e6e, h40d-merge.cmd 8c4930aefd8d.

## b6 `eq-twins.mjs`

`--build-blind --run <run> --g <G_twin> [--answers <dir>] [--inapp-pairs <file>]` writes `E\blind\pairs.blind-1/2/3.json` (front split by whole items
ceil(n/2) + floor(n/2), back 1 file) and keys `E\R-keyhold\key.blind-N.json`; each key carries a sha12 of the graded text. `--eval --g ... [--sitting E\gsitting.log]`
reads both graders' `verdicts.blind-N.gX.json` and prints 3a, 4b, 4c, 2b, 2c, 2d with bars as formulas, the pair counts, holes, empties, per-item rows (Y/X/o/w
per rep, ids only). Exit 0 computed, 2 refusal/integrity, 3 INCOMPLETE input (a verdicts file missing), 4 crash (a JSON syntax error is reported without its
text). Prints ids, counts, hashes only; the cal greps every CLI stdout for answer/question sentinels (0 hits).

Known answers (all in `eq-twins.cal.txt`):
- **The replay's own s50m files and verdicts** (4 roster ids, 64 graded answers): block 10 - no-block 2 = **+8 on 20 pairs** (PASS, bar +4), back +7 on 12 pairs; all 8 per-item
  rows equal `RESULT-front-back.txt` symbol for symbol. Run three ways: direct (replay keys), rebuilt through the blind builder with a text-oracle grader
  (`build -> verdicts -> collect -> assemble -> evaluate`, still +8), and a **mutated copy with two block records set to the no-block text: +8 falls to +6**.
- Synthetic: 3a at n = 20 for +4/+5 PASS, +3/+2 INCONCLUSIVE, +1/0/-3 FAIL; n = 19 +1 FAIL (m1), +2 INCONCLUSIVE, +4 PASS; bars printed for n = 15/21/40; 4b: a back-leg wrong
  alone FAILS (front clean); 4c: +1 PASS (reported), +2 FAIL, 0/-2 PASS, an on_topic-0 pair counts off-topic and wrong; 2b +150 PASS / +151 FAIL; 2c median +500 PASS,
  +501/+700/+1000 INCONCLUSIVE, +1001 FAIL; stall bar (block 3 vs 0 + 2) FAIL; p90 breach INCONCLUSIVE; 2d +5 PASS, +6/+10 INCONCLUSIVE, +11 FAIL; the sitting
  condition (rep 2 at 16.0 min -> 2c REPORTED naming r2; 15.0 gates, 15.1 does not; missing step line or no log -> not gated); `thoughts` nulls (below); holes
  (one -> 19 pairs named; two in one front file -> 3a/2b/2c/2d/4b/4c INCOMPLETE; two in one back file -> 4b INCOMPLETE); empty prose scored wrong;
  `-b` substitution (both sides replace; one side only -> refused; missing file -> instrument failure); blind split 3/4/5/7 ids, refusals for 2 / 8 / 9 ids;
  answer file changed after the blind build -> refused; CLI exit codes 0/2/3/4 and "no leak".
- 15 mutants (4c margin, 3a bars and arm swap, stall allowance, 2b bar and coverage, sitting gap, empty prose, wrong definition, integrity check, hole-partner exclusion,
  4b front-only, 2d line, `-b` tag) each flip the cal. My first mutant run "caught" every mutant for the wrong reason (a harness crash); fixed and rerun.

## b8

- **`launch-grader-eq.mjs`** is a DERIVED launcher: I could not edit `followup-turn\R\launch-grader.mjs` (outside E), so it imports the original's tested functions
  (`launchAttempt`, slot lock, slug/memory checks, `absRule`, `buildPrompt`) and adds what the registration asks: `--model-id` (A3.5 I1), the `--pairs/--verdicts`
  mode, cwdprobe-1/2/3 (A4.5). Slot mode (`blind-N.gX`, E\blind) is kept for the G blind files. Source check: `grep -c add-dir` over the FLAGS and probe-args
  lines = 0 (original: 0 too).
- **`eq-audit.mjs`** is needed because `audit-graders.mjs` derives a grader's files from a `blind-N.gX` tag only; the pilot and the 14 per-arm graders have arbitrary files.
  Same allowlist, same line shape; blind slots are still audited by the original (`--blind-dir E\blind --dispatch E\eq-grader-dispatch.txt`), and the cal proves the original
  reads `dispatch=match` on a slot transcript with the new dispatch file.
- **Dispatch**: h40d's template region byte-identical; the preamble carries this hour's 14 + 3 rows and rulings (A2.7: fourteen, not the registration's eleven).
- **`eq-merge.cmd`**: h40d's with the 14 arms; reads `E\eq-verdicts-<tag>.json` from its own folder (`%~dp0`, so the file has no non-ASCII byte); `captured-minimal` dropped.
- Calibrated with the launcher run against a stand-in `claude` (TURN_FAKE_CLAUDE seam, `EQ_CAL_FAKE=1`) on a PATH where `where claude` fails (no real call possible): pilot through
  PAIRS mode exit 0, verdicts read back against the pairs file's 4 keys, memory ABSENT, model = pin, audit clean + `dispatch=match`; refusals (no pin on a real launch, bad id,
  blind tag in pairs mode, existing verdicts, relative paths, duplicate keys, cwd reuse, probe-2 before probe-1, probe-3 with `--model-id`, a test seam without `EQ_CAL_FAKE`);
  a stand-in reporting another model -> exit 1 "MODEL IS NOT THE PIN"; incomplete verdicts -> exit 1.

## Rulings I made (overrule any; each has a cal case)

1. **Derived launcher in E**, original untouched (no writes outside E). The registration's "the launcher's mode" is `launch-grader-eq.mjs`; the post-flight commands use it.
2. **`eq-audit.mjs` added** (not in the b8 list) because the pilot "audit clean, `dispatch=match`" cannot run on the original for non-blind files.
3. **A real launch without `--model-id` is refused** (the user's pin), cwdprobe-3 must NOT carry it; `--dry-run` without it shows `--model opus` and says NOT pinned. Probe dry runs are not gated on the earlier probe.
4. **After a launch, the CLI-reported model must be the pin** (exact, or with a `[...]` / `-2...` suffix) else exit 1. The transcript-based `h40d-grader-models.mjs` stays the authority.
5. **b6 holes:** a hole = `transientError` or a missing record in an existing file; a missing FILE is a refusal. The ">1 true hole" threshold is per answer FILE (arm x rep). A pair with a hole leaves the
   decision and its graded partner is not sent to a grader. Empty prose without `transientError` = consensus wrong on its side, ttft = ttft ?? total, words 0.
6. **b6 wrong** = the judge's `wrong` (correctness 0 OR on_topic 0) on both graders (registration section 2), not the replay's narrower "both correctness 0"; acceptable/off-topic as registered.
7. **2b coverage conflict in the registration:** its cal sentence ("3 nulls of 20 -> excluded") contradicts its 90 % rule (17/20 = 85 %). The rule wins: 2 nulls -> thoughts decide; 3 nulls or 4 on one side -> the TTFT fallback (FAIL iff median TTFT > +1000 ms, read even when 2c is only REPORTED).
8. **Back-leg holes:** the registration is silent; the same ">1 per file" threshold gives 4b INCOMPLETE (fail closed).
9. `-b` tags: `...-rK-b`, and for rep 1 either `-r1-b` or `-b` (A3.4 names `-rk-b`); one-sided `-b` is refused.
10. Medians/p90 use the replay's `pct` (element min(n-1, floor(n p))) so the replay's numbers reproduce; `ceil(0.20 n)` and `floor(0.05 n)` are computed as `ceil(n/5)`, `floor(n/20)` (no float error).
11. The blind question = `questionForGrader` (follow-up WITH parent) from the run's timeline; `heard` = the in-app pairs file's `heard` for the id when `--inapp-pairs` is given, else the timeline question (printed which).

## Post-flight commands (ready to run; do NOT run before the flight ends; each spends Opus calls except the first block)

`E` = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\flight-eq`; `RUN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\<stamp>-eq`;
`FR` = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\followup-turn\R`. First record each tool in `E\instruments.sha256.txt` (sha above, cal sha, review file) per A2.5.

0. No model: `node E\eq-twins-cal.mjs` and `node E\launch-grader-eq-cal.mjs` (re-run proof; each about 1-3 min).
1. Probes (after the flight; 3 Opus calls), then read each session with `node FR\check-grader-memory.mjs ...` and `h40d-grader-models.mjs` as before (sessions are in `E\grader-cwd.launches.jsonl`):
   `node E\launch-grader-eq.mjs cwdprobe-1 --probe --model-id claude-opus-5-5` then `... cwdprobe-2 --probe --model-id claude-opus-5-5` then `node E\launch-grader-eq.mjs cwdprobe-3 --probe` (alias read, no `--model-id`).
2. Pilot (PAIRS mode, calibrated on `--make-pilot` first):
   `node E\launch-grader-eq.mjs --make-pilot E\grading\pilot-in`
   `node E\launch-grader-eq.mjs pilot --pairs E\grading\pilot-in\pairs.blind-1.json --verdicts E\grading\pilot-in\verdicts.pilot.json --model-id claude-opus-5-5`
   `node E\eq-audit.mjs --item "pilot|E\grading\pilot-in\pairs.blind-1.json|E\grading\pilot-in\verdicts.pilot.json|session:<id from E\launches.arms.jsonl>"` -> `clean ... dispatch=match`.
3. Per-arm grading (14 launches, at most 2 at once; the flight's judge exports `RUN\interview60.judge.pairs*.json` must exist, else `node electron\test\golden\interview60.judge.mjs RUN [--answers RUN\interview60.answers.<arm>.json] --export` from MAIN):
   `node E\launch-grader-eq.mjs <tag> --pairs RUN\<pairs file> --verdicts E\eq-verdicts-<tag>.json --model-id claude-opus-5-5`, with (tag -> pairs file in RUN):
   inapp -> `interview60.judge.pairs.json`; captured-high[-r2|-r3], captured-no-cues-high[-r2|-r3], captured-low[-r2|-r3] -> `interview60.judge.pairs.gemini-3.5-flash-lite_<tag>.json` (3.1-lite for captured-low*);
   high -> `...gemini-3.5-flash-lite_high.json`; low -> `...gemini-3.1-flash-lite_low.json`; bare35 -> `...gemini-3.5-flash-lite.json`; bare31 -> `...gemini-3.1-flash-lite.json` (the table is in `E\eq-grader-dispatch.txt`).
   Audit each: `node E\eq-audit.mjs --item "<tag>|<pairs>|<verdicts>|session:<id>" ...` (ids in `E\launches.arms.jsonl`); clean 100 % or that file is re-graded once (`--attempt 2`, verdicts moved away).
4. Merge (cwd MAIN, after the grading): `cmd /c E\eq-merge.cmd claude-opus-5-5 electron\test\golden\interview60.runs\<stamp>-eq`.
5. G blind files (after the G sitting and `eq-b4-cal`; `<G>` = G_twin ids from `eq-flight-read`):
   `node E\eq-twins.mjs --build-blind --run RUN --g <G> --answers RUN --inapp-pairs RUN\interview60.judge.pairs.json`
   six graders: `node E\launch-grader-eq.mjs blind-N.gX --model-id claude-opus-5-5` for N = 1..3, X = 1..2 (g1, g2), at most 2 at once; audit with the ORIGINAL:
   `node FR\audit-graders.mjs --blind-dir E\blind --dispatch E\eq-grader-dispatch.txt blind-1.g1=session:<id> ...`
   `node E\eq-twins.mjs --eval --g <G> --answers RUN --blind E\blind --keys E\R-keyhold --sitting E\gsitting.log`

## Not covered / residual risk

- No Opus review; no `instruments.sha256.txt` line. Not run: any real `claude` call. **Unverified until the first real probe:** that the CLI accepts `--model claude-opus-5-5`,
  and the format of `modelUsage` keys (the pin check accepts an exact id or `[...]`/`-2...` suffix; anything else exits 1 loudly, transcript kept). Windows `spawnSync('claude')` resolution is the original's.
- `E\gsitting.log` does not exist and `eq-gsitting.ps1` is unbuilt: the parser assumes `STEP <n> <tag> start|end <iso> [EXIT <c>]` (A2.10). A different format reads as "no start line" -> 2c REPORTED (fail-safe, not wrong).
- The live G-sitting answer files were never seen: the record shape is taken from `interview60.answers.mjs` source and the replay's files. `thoughts` null handling, `transientError`, empty `spoken` are exercised synthetically only.
- The bookkeeping that `legs-decide.mjs`/`graders.json` did for the replay (slot-by-slot model/memory/audit labels, launches cross-check) is not ported: the controller reads `launches.arms.jsonl`, `launches.jsonl`, `check-grader-memory`, `h40d-grader-models` and the audit lines.
- `heard` falls back to the timeline question when no in-app pairs file is passed. 3a's per-item rows are descriptive; no single-item-carries-the-pass clause is computed.
- The 4c/4b union price and the verdict ladder (section 5) are not computed here: the tool prints clause states; the precedence is the controller's/reader's.
- eq-merge.cmd was run only against a stub judge (the real `interview60.judge.mjs` merge was not run: it would write into a run folder).
