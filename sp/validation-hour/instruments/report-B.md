# Report B (builder B: h40d-twins, the rule-3c adapter)

Saved by the controller from builder B's reply (agent a4c70b6d59bc7a8f0), 2026-10-01 ~15:55; the harness refused the
builder's own write. HTML entities in the relayed reply were restored.

Status: DONE_WITH_CONCERNS

## Files
- `VH\h40d-twins.mjs`: the rule-3c adapter. ASCII only, a pure reader (no env, no write, no network, no spawn).
- `VH\h40d-twins-cal.txt`: the calibration of record, with every case's command, output and assertions, then a CASE -> READING ledger. It ends `SUMMARY: 182 assertions, 182 OK, 0 FAIL`.
- `VH\instruments\B-twins-cases.mjs`: the case runner. Real-file cases go through the CLI; synthetic ones are built in memory and never written anywhere. About 7 s.
- `VH\instruments\B-mutants.mjs`, `B-mutants-out.txt`, `mutants\`: 40 mutants of the adapter, with the whole runner run on each.
- `VH\instruments\B-copy-bench.mjs`, `twins-bench\`: byte-checked copies of the bench's three cue answer files under the flight naming. They hold personal text, as the brief required.
- `VH\instruments\B-leak-scan.mjs` (with `--canary`), `B-expected-counts.mjs` (an independent tally written before the adapter), and `B-verdictof-compare.mjs`.
- Read-only peeks: `B-inspect-shape`, `B-dist-peek`, `B-join-peek`, `B-roster-peek`, `B-twin-ids-peek`, `B-nonascii-scan`. `B-first-run.txt` to `B-fourth-run.txt` are superseded outputs, not evidence.
- `VH\instruments\fake-inputs\`: stub dist roots `dist-limits-4x5`, `dist-other-rule`, `dist-no-cue-stage`, plus two malformed answers files.
- No file of SP, VH, MAIN or WT was edited. WT's `git status` still shows only the two files that were already modified at session start.

## Friday's use
```
node VH\h40d-twins.mjs <run-dir> --dist <MAIN> --answers-only                 # before grading
node VH\h40d-twins.mjs <run-dir> --dist <MAIN> [--strict] [--notext-gated]    # the reading
```
- Exit codes: 0 PASS or NOT COMPUTED, 1 STOP, 2 REFUSED, 3 INCOMPLETE, 4 instrument error.
- Flags: `--strict` makes the strict per-rep clause govern. `--notext-gated` is r4 section 12 item 6's alternative. Both gated readings are always printed.
- `--dist`: the checkout whose built filter chain does the stage replay. Default WT; the adapter prints the filter sha against r4's `42d9bc42dbd17870`.
- Re-run after the merge: MAIN's dist is still pre-merge (0 occurrences of `stripCueBlock`). Re-run `node VH\instruments\B-twins-cases.mjs` after the rebuild; its `X6g --dist MAIN` check will run.

## Calibrations (case -> reading)
1. h40c, `--control gemini-3.1-flash-lite_captured-low --pre-cue` -> PASS, exit 0. Band cue [36,38] vs control [36,37], overlap. Gated wrong cue 0/0/0 vs control 1/0/0. All-ids wrong cue 1/0/2 vs control 2/1/2. Control rep 3: 36 of 43, hole R10. Reading line carries the not-applicable mark.
2. h40b, same flags -> PASS, exit 0, default and `--strict`. Band cue [36,39] vs control [38,40]; gated 0/0/0 vs 0/0/1.
3. Bench cue files, `--answers-only` -> NOT COMPUTED (no judge files). Present 38/39, 39/39, 39/39. Shaped 38/39, 38/39, 39/39. Over-3-lines 0/1/0; over-5-word blocks 7/8/7. Equal to `cuebench-score.mjs` on the originals.
4. Synthetic, cues on every id: five 4-line blocks in one rep -> STOP, exit 1, shaped 39/44 = 88.6%; four -> PASS, 40/44 = 90.9%.
5. 3 holes + 1 block-only twin in a cue rep -> not INCOMPLETE (PASS). Holes 3, cue-check n 41, all-ids wrong +1, gated wrong +1.
6. 4 holes in a rep -> INCOMPLETE, exit 3, cue side and control side.
7. s50l S1Q06 and s50m S2Q06 -> all-ids wrong +1, "PIPELINE EVENT: emptied by filterCodeFences", gated +0.
8. Synthetic block-only twins vs a 0/0/0 control: two in one rep -> STOP; one in each of two reps -> STOP (2 > 0+1); one -> default PASS (1 <= 1), strict STOP; both printed.
9. Real no-text record (bench S2Q06F) -> "NO-TEXT RECORD: rawLen 0, finish MALFORMED_RESPONSE". All-ids +1, gated 0 both sides, 38 of 39 present, not a hole.

Extras: 2b (h40c roles swapped, `--pre-cue`) default PASS / `--strict` STOP exit 1; 6c (INCOMPLETE with the already-read STOP named); 8d (block-only on excluded follow-ups: all-ids +2, gated unchanged); 8e (empty prose, no cue block: all-ids +1, gated +0); 9b/9c `--notext-gated`; 10a/10b band edge (cue [35,35] vs control [36,37] STOP, [35,36] PASS); X1 thoughts and TTFT equal `h40d-thoughts-noise.mjs` on all six reps; X2 counts equal `B-expected-counts.mjs`; X3 stage of the two real empties matches `replay-stages.mjs`; X4 stage table; X5–X8 boundary guards (REFUSED exit 2: `--pre-cue` on a cue family, swapped judge file, non-`verdictOf` verdict, dist without `stripCueBlock`, other cue limits, other CUE_RULE, bad JSON, wrong id key; INCOMPLETE exit 3: missing judge/answers file, ungraded verdict, bench folder in full mode; GRADER MIXED flag).

Rule 8 and privacy: mutation harness 40 variants, every one as decided (~290 s). Leak scan: 37,185 windows of 28 chars from 51 real files in 58 output files, no hit; canary exits 1. `verdictOf` identical in MAIN and WT over 27 score triples.

## Where r4 and the brief differ (r4 wins)
- Chain source: the brief says WT's dist; r4 §2 flies MAIN's rebuilt dist. Added `--dist`, default WT.
- Roster size: r4's "40 gated ids" counts the 45-id roster; the twin files hold ids with a captured prompt (h40c: 44, R05 none), so the gated clause covers 39 there. The adapter follows the files.
- No cue block (r4 silent): empty prose with no cue block from a stage other than `filterCodeFences` -> all-ids line only, never gated (builder's reading).
- Missing id: an id missing from one rep's file is REFUSED (exit 2), not INCOMPLETE; r4 defines holes only as `transientError` records.
- `--notext-gated` is the builder's flag name; `--pre-cue` also used in 2b, 7, 10 with the not-applicable mark; refused when the cue family carries any cue block.

## Own-test weaknesses the mutation test found (all fixed)
- X5 e caught the wrong guard (record deleted instead of a stale graded item kept).
- A reading-line assertion matched the `mode:` header, so a dropped mark went unnoticed.
- M32's kill list named an assertion M32 cannot affect; list corrected, no output expectation changed.
- X6b depended on MAIN being pre-merge; replaced with a stub root plus X6g and mutants M42/M43.

## Concerns
1. Never run on a real h40d file set; no `captured-no-cues-high*` file exists yet, so the control side is exercised only on pre-cue data and in memory.
2. The positive `--dist <MAIN>` path is untested until the merge and rebuild. A MAIN build with a different filter sha prints DIFFERENT rather than refusing. A chain that does not reproduce a stored empty prose is refused.
3. No natural band STOP in real data; band STOP exercised only in memory. A real CLI STOP exists only for the strict clause (2b).
4. `benchDecide` and `blockShape` come from `SP\cuebench\cuebench-score.mjs`, no hash pinned.
5. Mutation patches are exact-match texts of the current adapter; any adapter edit needs them re-pointed.
6. Hole error strings are printed capped at 40 characters.
7. Stub roots under `fake-inputs\` exceed 260 characters; PowerShell 5.1 `Get-ChildItem` cannot enumerate them.
8. `B-dist-peek`, `B-join-peek` and `B-roster-peek` contain the literal U+00FC of the MAIN folder name.
