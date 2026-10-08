# Task 14A report (blind side-by-side export + calibration)

Status: DONE_WITH_CONCERNS. No repo commit (plan step 3: the controller commits these LAB files with Task 19). No model call, no real captured data read.

## Files (LAB = natively-lab\sp\router-default)
- `build-blind-rd.mjs` sha256 29bd4756b7ea4f6e...
- `cal-build-blind-rd.mjs` sha256 5623dabf7c7061b5...
- `cal-build-blind-rd.txt` (output, 35 rows) sha256 bc015491b0b53f40...
- Run-time outputs (not created now): `<run>\router-blind\pairs.blind-<n>.json`, `LAB\keyhold\key-rd.json`, plus `LAB\keyhold\build-record-rd.json`.

## Usage
`node build-blind-rd.mjs --run-dir <run> [--out-dir <run>\router-blind] [--key-dir LAB\keyhold] [--wt <worktree with live40.questions.mjs + interview60.judge.mjs>]` (default wt = live-router-d). Prints counts only.

## Behaviour
- Arms: L = Live text; S = shadow answer of the same item (the `appended:true` text on an appended turn); A = each appended answer as its own item. A shadow with no Live text is not exported (counted). Pipeline-shown items are not here.
- Entries are single answers (as in r40): a pairs file holds L, S (and A) of whole items, shuffled, keyed q01..; the key holds arm, id, route, class, parent, turn, appended.
- Reused from r40: FNV-1a rng with fresh stream per file, seed `blind:router-default:r1`, no-overwrite rules, keyhold layout, judge `RUBRIC`/`JUDGE_MODEL`/`questionForGrader` (follow-up parent via the judge's own resolution; the roster `chain` field).
- Cut: roster (chain) order, items with at least one entry, 4 contiguous slices of whole items, sizes derived from the count (10 -> 3/3/2/2; 3 items -> 3 files of 1; empty slices dropped). r40's fixed 12/12/12/11 does not apply (item count depends on the hour).
- Refuses (exit 2, nothing written): run folder name not equal to the label; key or record exists; pairs exist; key dir inside out dir or run folder; capture file missing/not an array; roster-unknown id; empty text; shadow `appended` not boolean; duplicate entry per (id, kind); hidden AND appended entry for one item; nothing to export.

## Calibration (synthetic captures only; `cal-build-blind-rd.txt`)
- Step 1 RED: run before the builder existed: RD-0 FAIL (builder missing), RD-1 to RD-6 FAIL, and the script then crashed on a missing out dir. It also exposed that my RD-7 passed vacuously on an empty key; fixed (`n > 0`).
- Step 2 GREEN: 35/35. Plan items: 3 L/S pairs and 1 A (RD-2, RD-3); appended turn's S = appended text by sha12 (RD-4); no arm/id/class names in pairs files, scan has a positive control (RD-6, 6b); key maps every q back by answer hash (RD-7, 13c); smoke / suffixed / prefix label refused exit 2, registered label accepted as control (RD-10..10d); same seed byte-identical (RD-9).
- Key separation (RD-8): key only in key dir, out dir only pairs files, run folder untouched, stdout holds no answer text or q keys. The builder also refuses a key dir inside the out dir or run folder.
- Whole-item cut (RD-13..14): 10 items -> 4 files 3/3/2/2, contiguous roster slices, every item's L, S, A in one file (23 entries), negative control (an entry moved to another file) detected, arms interleaved and not in roster order.
- Break-it-once (RD-15): L and S swapped in the key -> key-maps-back check FAILS (caught); ids swapped -> caught.
- Builder mutants run against the calibration (all killed): arms swapped (5 fail), label rule removed (3 fail, RD-10 family), S ignores the appended text (3 fail), A emitted for hidden shadows (7 fail), cut splits items (3 fail), no shuffle (1 fail), key written inside the out dir (fails from RD-2 onward). One first mutant (`SH ?? AP`) survived: it is equivalent because the builder already refuses items holding both kinds; replaced with a real one.

## Concerns / decisions
1. **Run label is an assumption.** The plan gives no registered label; I set the single constant `REGISTERED_RUN_LABEL = 'router-default-r1'` (the cal reads it and checks it). Task 19's registration must confirm or change it, then re-run the cal.
2. **Duplicate entries refuse the whole export** (two Live or two shadow entries mapped to one roster id, e.g. a detector double-answer). It names ids; the controller must decide which to grade. Chosen over guessing, per fail-at-the-boundary.
3. A Live item with no shadow entry is exported as L alone (no Quality pair); its count is printed (`live without a pipeline answer`). A shadow-only item is not exported.
4. On an appended turn S and A carry the same text in the same file, as the spec requires; a grader may notice the identical pair (it cannot tell which arm either is).
5. Heard text for every arm is the roster question (captures hold no heard text); question decoration for follow-ups is identical across arms.
6. The cal reads the roster ids and question texts from live-router-d (roster text, not captured text); the builder's `--wt` must point at a tree with those two files when the integration worktree is used.
7. Not exercised: a real run's capture files (none exist), the grader/export step downstream, the `--wt` default after worktree removal.

## fix1 (review: reviews\task-14A-review.md)
Files changed: `build-blind-rd.mjs`, `cal-build-blind-rd.mjs`, `cal-build-blind-rd.txt` (53 rows). RED on the OLD builder: `reports\task-14A-fix1-red.txt` (new calibration vs old builder: 32 FAIL, 14 PASS, then the harness crashed on missing data). Now 53/53. (Concerns 1, 2 and 4 above are superseded by this section.)

- **B1** The run folder must match `^\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-<LABEL>$` (stamp = `toISOString().replace(/[:.]/g,'-').slice(0,19)`, `interview60.run.mjs:598`). Accepted: `2026-10-07T20-00-05-router-default-r1`. Refused (exit 2, nothing written): `<stamp>-router-smoke`, `<stamp>-<label>-1002`, `<stamp>-<label prefix>`, the bare label, a date-only stamp, junk before the stamp (RD-10..10g). Task 19: smoke and run labels must differ; a retried hour leaves two `<stamp>-<label>` folders, so the registration must name the one.
- **I1** A Live turn with empty or blank pipeline text (hidden or appended) exports L alone, key `sEmpty: true`, printed `empty pipeline answer <n>`. An empty LIVE text still refuses (RD-11f, RD-13, 13b).
- **I2** L pairs with S by `turn`, never by id. Every Live-shown turn is exported and all turns of one id sit in one file. The key carries `turn` and `rank`. Printed: `ids with more than one Live turn <n>`. A shadow of another turn is never joined (RD-14b). A turn that maps to different ids across the two files, or a duplicate turn within one file, refuses. Task 19 must register how the scorer treats multi-turn ids in the Quality pair.
- **I3 (a)** An appended turn emits the appended text ONCE, key `arms: ['S','A']`; the file holds L plus that one answer. The key shape is now `arms: [...]` everywhere (`['L']`, `['S']`, `['S','A']`, `['A']`). RD-7b asserts that no two answers in any file are identical.
- **M1** `--root <checkout>` (default live-router-d) replaces `--wt`. The build record holds `rosterSha256` and `judgeSha256` (RD-16). A bad root fails loudly before anything is written (RD-16b).
- **Superseded** Uses the `superseded: boolean` field (task-5-fix2): true on either the live or the shadow record of the turn marks it. It exports as L alone with key `superseded: true`, and the replacing pipeline text is NOT exported. Printed: `superseded <n>`. A record without the field counts as false and is counted (`records without superseded field <n>`), so a pre-fix log shows every record as missing it (RD-15..15d, synthetic fields).
- Mutants killed by the calibration: stamp rule reverted to bare label, rule removed, no start anchor, sEmpty unmarked, pair-by-id, S and A emitted separately, superseded ignored, superseded live-side only, no shas in the record, counter removed. An attempted no-end-anchor mutant was a syntax error, not informative; RD-10b/10c cover that anchor.
- Not changed: M2, M3.

Concerns (fix1):
1. **Task 13's `buildCaptureFiles` does not copy `superseded` into the capture files today.** Its entry is `{id, turn, text, words, firstMs, endMs, q_src[, appended]}`. Once task-5-fix2 puts the field on the `[RouterAnswer]` line, Task 13 must copy it into each entry. Otherwise every record counts as missing the field and nothing is marked superseded. The count line makes this visible.
2. A superseded turn's Live text is always L alone; whether its Safety grade counts is the scorer's registered rule.
3. An appended answer with no Live text, not superseded and not blank, exports as `[A]` alone.

## fix2 (supersede after Live finished; arbiter fix3)
Files changed: `build-blind-rd.mjs`, `cal-build-blind-rd.mjs`, `cal-build-blind-rd.txt` (58 rows, all PASS). RED on the fix1 builder: `reports\task-14A-fix2-red.txt` (new scene against it: RD-21, 21b, 21c, 21d, 21e FAIL; 53/58).

- The builder reads `<run>\natively_debug.log` for `[Router] superseded turn=<id> phase=<streaming|done> line_written=<yes|no>`. The superseded set is the UNION of those turns and the turns whose capture record has `superseded: true`. Superseded turns export as L alone with key `superseded: true`; the replacing pipeline text is not exported.
- A missing `natively_debug.log` refuses (exit 2), because the set cannot be known. A line with another phase or line_written value is not counted; duplicate lines count once.
- Printed: `superseded sources: diag line turns <n>; capture flag true <n>; union <n>; found only by the diag line <n> (turns <ids>)`.
- Scene RD-21: every capture flag reads `false`, only the diag line names turn 1, so RE01 exports L alone and marked. A malformed line (turn 2, `phase=weird`) marks nothing. A diag line for a turn with no capture (turn 9) counts as diag-only and exports nothing. RD-21b counts; RD-21c missing log; RD-21d union (turn 1 by both, turn 2 by diag only); RD-21e flag true with an empty log still marks.
- Mutants killed: union reduced to flags only (RD-21, 21b, 21d), to diag only (RD-15, 15b, 15d, 21e), regex accepting any phase (RD-21, 21b), missing log tolerated (RD-21c).

Concerns (fix2):
**fix2b (ruling: slice the log by app session, as `router-hour-read.mjs:76-81` does).** Calibration now 64/64 (was 58).
- The builder reads `interview60.timeline.json` (`startedMs`, `endedMs`; missing or malformed refuses) and keys on `=== Natively session started <ISO> ===`. It keeps the session whose header is the last one at or before `startedMs`, up to the next header (so a later process after the hour is excluded too), and reads the diag lines only from it. It refuses (exit 2): no header at or before `startedMs` ("does not cover the hour"); a header inside `(startedMs, endedMs]` ("restarted inside the hour").
- Scene RD-22: three sessions that all reuse turn id 1 (earlier process marks turn 1, the hour's session marks turn 2, a later process marks 1 and 2). Only the hour's session counts: RE01 (turn 1) unmarked with its S, EF01 (turn 2) superseded (RD-22b: counts from that session alone). RD-22c no header, RD-22d the only header after the hour start, RD-22e a header inside the hour, RD-22f no timeline: each exit 2, nothing written. Fixture logs get one session header 1 minute before the hour by default.
- RED: I edited the builder before adding the scene, so the red evidence is a mutant that restores the previous behaviour (whole log, no slicing, no header refusals): `reports\task-14A-fix2b-mutants.txt`, 5 FAIL (RD-22..22e), 59/64. Other mutants killed: slice to log end (RD-22, 22b), first header instead of the last at or before the start (RD-22), no inside-the-hour refusal (RD-22e), no no-header refusal (RD-22c).
- Concern 1 below is resolved by this ruling; it assumes the `=== Natively session started ===` header precedes the process's lines, as the reader does.

Original concern (resolved by fix2b):
1. The diag line's turn ids are the log's, and turn ids restart per meeting. If a run folder's log holds two meetings (a probe or a restart), a diag turn id may name a different turn than the capture entry with the same number, and the builder cannot tell. Task 15/17 must confirm one meeting per run folder.
2. The log is read by regex only; no line text is printed.
3. Calibration uses synthetic lines in the dispatched format; the real line (lane B producer) is not yet exercised.
