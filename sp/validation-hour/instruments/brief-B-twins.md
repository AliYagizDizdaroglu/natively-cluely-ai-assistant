# Brief B: `h40d-twins.mjs` (rule 3c's adapter) and its calibration

Read `VH\instruments\COMMON.md` first. Your letter is B.

**Spec:** r4 rule 3c (inside "Rule 3 — quality", from r4 line 342), the "Counting per rep" paragraph and the
"Counting rulings, before any verdict" (r4 line 535), and the `h40d-twins.mjs` bullet in §7.4 (r4 lines 774–796),
which lists cases (1)–(9). Read all of rule 3c, including "Empty prose in this clause" and the no-text record
paragraph that revision 4 added.

**What it does (summary; r4 is binding):** per rep r of a family, read `interview60.answers.<family>[-r].json`
(holes = `transientError`; empty prose; the raw `cues` array) and the merged `interview60.judge.<family>[-r].json`
(verdicts); build `benchDecide`'s input (control = the no-cue twins, cue = the cue twins) with acceptable and wrong
as r4 §4 defines them. Import `benchDecide` and `blockShape` from `SP\cuebench\cuebench-score.mjs` (they are exported
pure functions; importing does not run its main block) and `verdictOf` from MAIN's
`electron/test/golden/interview60.judge.mjs` if r4's definition uses it. The gated wrong clause is decided by the
adapter itself on the 40 gated ids, as the three reps' sums with a margin of one (the controller's default), printed
beside the strict per-rep reading (the user's alternative); `benchDecide` gets the band and the cue check only. Wrong on
all ids beside it. Present and shape via `blockShape`, net of true holes. Empty prose counted wrong with the stage that
emptied it: `filterCodeFences` = a pipeline event (all-ids line only); any other stage with cues present = a
block-only twin (gated clause); `rawLen` 0 = a no-text record (all-ids line only, named with its finish reason, an
absent block in the cue check). Print per rep: n, holes by id, empty prose by id (with its kind), acceptable, gated
wrong, all-ids wrong, present, shaped, over-3 and over-5 rates, each rep's `thoughts` and TTFT p50/p90.
`--pre-cue` marks the cue check not applicable and says so (never a silent pass); it is for known cases (1) and (2)
only. The gated ids and the roster come from the files r4 names; find them (holdout40's gated list is in r4 and the
h40c instruments; never tune anything on holdout40 — you only count).

To tell which stage emptied a record you need the shipped filter chain on the raw text: the h40d hour runs on the
merged build, whose chain is the worktree's (`WT\dist-electron\electron\llm\verbalStreamFilter.js`), exactly as
`SP\cue-group\old-vs-new-replay.mjs` and `SP\boundary-repair` scripts load it. Never print raw text.

**Known cases, each run and saved in `VH\h40d-twins-cal.txt`** (r4's list, verbatim numbering):
1. h40c with `captured-low` as the control, `--pre-cue` → PASS with the counts of r4 §4's known case;
2. h40b the same way → PASS;
3. the cue check WITH cues: Thursday's bench cue answer files (`WT\electron\test\golden\interview60.answers.
   gemini-3.5-flash-lite_cues-r1.json`, `-r2`, `-r3`; note rep 1 carries `-r1` in its name, unlike the flight's
   naming: copy them under the flight's naming into `VH\instruments\twins-bench\` with node, byte-checked) → the
   same per-rep present and shaped counts `cuebench-score.mjs` printed (`SP\cuebench\cuebench-score.out.txt`:
   present 38/39, 39/39, 39/39; shaped 38/39, 38/39, 39/39);
4. synthetic, in memory from h40c's `captured-high` files, never written into a run folder: `cues` injected on every
   id with five 4-line blocks in one rep → STOP; with four such blocks → PASS (r4 gives the arithmetic);
5. a hole case: 3 `transientError` plus 1 empty prose in a cue rep → not INCOMPLETE, wrong +1, cue-check n = 41;
6. 4 `transientError` in a rep → INCOMPLETE;
7. the real empty-prose cases s50l `captured-high-r3` S1Q06 and s50m `captured-high-r2` S2Q06 → each wrong in the
   all-ids line, named as emptied by `filterCodeFences`, kept out of the gated clause;
8. synthetic, in memory: two gated ids given a raw that holds a cue block alone (`stripCueBlock` empties it) against a
   0/0/0 control → two block-only twins in the gated clause → STOP under the default; with ONE such id → named, no
   STOP under the default and STOP under the strict alternative (both readings printed);
9. the real no-text record: the bench's `_cues-r1` S2Q06F (`rawLen` 0, `MALFORMED_RESPONSE`) → named as no-text,
   wrong in the all-ids line, absent in the cue check (38 of 39 present in that rep), in neither side's gated clause.

Where a real case needs judge verdict files that do not exist (e.g. the bench's cue reps have blind-pair verdicts, not
`interview60.judge.*` files), say so and test the parts that do not need verdicts (present/shape/holes/empty kinds);
never invent verdicts for a real case.

Output: `VH\h40d-twins.mjs`, `VH\h40d-twins-cal.txt`, any case runner under `VH\instruments\`, `report-B.md`.
