# Task 2 report — Blind-pairs builder carries the parent question

## Files changed

Scratchpad only, per the brief ("Files: ... Repo: none"):

- `SP\blind-parent-check.mjs` — **new**. Rule-8 check: for every `pairs.blind-*.json` in a
  blind dir, every item whose `id` is a `chain` item in the given timeline must have `question`
  containing `[Follow-up to: ` or `[Follow-up on the problem`. Prints `follow-ups N, with parent
  M`; exits 1 if `M < N`.
- `SP\flash-h40b-blind-pairs.mjs` — **fixed**. Added `const TL = JSON.parse(fs.readFileSync(
  `${RUN}/interview60.timeline.json`, 'utf8'))` right after `RUN` is resolved, and changed the
  item-push line to `question: J.questionForGrader(TL.items.find((i) => i.id === id) ?? { q: e.q
  }, TL.items)` (kept `heard: e.q` unchanged). Added a header line naming the h40b finding (R09F
  rank-one answer graded acceptable x3 blind, wrong x3 standard). Added a throwaway
  `BLIND_NO_PARENT=1` env switch (left in per the brief — "leave the switch in; it is throwaway
  code") that forces the pre-fix `question: e.q` shape, used only for the negative-control
  calibration run below.
- `SP\blind-cal.txt` — **new**. Records all three check runs (real pre-fix dir FAIL, fixed
  builder's calibration output PASS, `BLIND_NO_PARENT=1` negative control FAIL).
- Calibration output directories created (not graded, not committed): `SP\flash-h40b-blind-cal\`,
  `SP\flash-h40b-blind-cal-broken\`.
- Throwaway helper scripts used only to inspect fixtures while working (not part of the
  deliverable, left in the scratchpad): `SP\sdd\2026-09-26-h40c\peek-timeline.mjs`,
  `peek-pairs.mjs`, `peek-cal-r09f.mjs`.

Repo (`MAIN`): **no changes**. The brief is correct that no repo blind-pairs builder exists;
`interview60.judge.mjs --export` already carries the parent via the `questionForGrader` function
Task 1 exported (verified present: `electron/test/golden/interview60.judge.mjs:53`, `export
function questionForGrader(item, items)`). This task only fixes the scratchpad's own
`flash-h40b-blind-pairs.mjs`, which is not a repo file.

## Check-first run (must fail) — real, un-fixed h40b blind dir

```
$ node blind-parent-check.mjs "SP\flash-h40b\blind" "MAIN\electron\test\golden\interview60.runs\2026-09-26T11-39-51-h40b\interview60.timeline.json"
follow-ups 6, with parent 0
FAIL: R02F, R09F, R11F, R17F, R26F, R31F missing the parent marker
exit code: 1
```

Matches the brief's expected failure exactly: 0 of 6, the same six ids named in the brief (R02F,
R09F, R11F, R17F, R26F, R31F). `SP\flash-h40b\blind` was read-only in this run and every run
after — it already holds `verdicts.blind-*.json` (graded, final), so it was never rebuilt or
otherwise written.

## Fix

Builder edit described above. The fixed line mirrors `interview60.judge.mjs`'s own use of
`questionForGrader` in `pairAnswers` (`question: item ? questionForGrader(item, items) : null`,
judge.mjs:122), so the blind pairs question text and the standard judge's question text are now
produced by the same function on the same timeline data.

## Calibration (without touching graded files)

Ran the fixed builder into `BLIND_DIR=SP\flash-h40b-blind-cal` (RUN_DIR/FLASH_DIR left at their
defaults, i.e. the real h40b run and the real `SP\flash-h40b` flash-arm files):

```
pairs.blind-1.json  32 items  R02F,R08,R03,R09F
pairs.blind-2.json  30 items  R16,R01,R11F,R12
pairs.blind-3.json  31 items  R17F,R23,R26F,R27
pairs.blind-4.json  29 items  R28,R30,R31F,R32
4 files, 16 ids; 11 arm answers missing (scored as no answer); instrument 8564ba96369a
```

(Two stderr lines, `missing ... gemini-3.7-flash_def-r2/r3.json ... recorded as NO ANSWER`, are
pre-existing real gaps in the `SP\flash-h40b` fixture — that model's tier only ever wrote a `def`
rep, not `def-r2`/`def-r3` — unrelated to this fix; they reproduce identically with and without
the fix and do not affect the follow-up ids checked below.)

```
$ node blind-parent-check.mjs "SP\flash-h40b-blind-cal" "MAIN\...\interview60.timeline.json"
follow-ups 6, with parent 6
PASS 6 of 6
exit code: 0
```

Spot-checked `R09F#1` in the calibration output directly (the brief's named h40b finding item):
`question` is now `"Now without a subquery. Can you do it with a window function? [Follow-up to:
Give me the SQL for the second highest salary in each department. Say it out loud.]"` — the
follow-up text plus its parent, `heard` is unchanged (still just the follow-up text).

### Rule-8 negative control (proves the check itself can fail, not just parrot success)

Ran the fixed builder again with `BLIND_NO_PARENT=1` into `BLIND_DIR=SP\flash-h40b-blind-cal-
broken` (forces the pre-fix `question: e.q` shape via the throwaway switch):

```
$ node blind-parent-check.mjs "SP\flash-h40b-blind-cal-broken" "MAIN\...\interview60.timeline.json"
follow-ups 6, with parent 0
FAIL: R02F, R09F, R11F, R17F, R26F, R31F missing the parent marker
exit code: 1
```

Full outputs for all three runs are recorded in `SP\blind-cal.txt`.

## Deviations from the brief

None. Followed the brief's exact code (`TL` load location, the exact `question:` expression
including the `(i) => i.id === id)` shadowing of the outer `forEach`'s `i`, `BLIND_DIR`/
`BLIND_NO_PARENT` names) and its exact command shapes.

## Open concerns

- None regarding this task's deliverable. One pre-existing observation, out of scope: the real
  `SP\flash-h40b\blind` directory (graded, final, per the controller's instruction never to
  touch) still has the pre-fix question text baked into its already-graded
  `pairs.blind-*.json`/`verdicts.blind-*.json`. The brief's last bullet already anticipates this
  ("if the controller wants the leniency quantified, one optional Opus grading of
  `pairs.blind-*` from the calibration dir is a separate, later decision") — no action taken
  here beyond noting it, as instructed.
