# Pre-registration: the simple-question probe on the shipped cue rule (reported, not gating)

Written 2026-09-30 about 10:15 local, before any probe call and before the v2 build exists. Plan
`docs/superpowers/plans/2026-09-30-cue-mode-small-cues.md`, Task 6 Step 4 (it was Task 5 Step 4 until the plan's
revision 2 renumbered the operator task). Script `SP\cue-group\probe-shipped.mjs`, calibrated by
`SP\cue-group\cal-probe-shipped.mjs` (pure parts; PROBE CALIBRATION OK, 15 cases when this was written).

Note, 11:21 the same day (before any probe call; nothing below is changed by it): the printout now splits the
trimmed count into blocks with a dropped line, a cut line or a cleaned line, as the plan names them (16 calibration
cases). The order is fixed by the bench's second amendment: the probe runs AFTER the bench, or before it only when the
quota ledger shows at least 202 requests of headroom on 3.5-lite (150 for the bench plus the probe's own 52).

Note, 15:25 the same day (before any probe call and before the v2 build exists; no measure above or below is changed
by it). The final review (finding I1) saw that "one-line-answer" never looks at the prose: a reply that is ONLY a cue
block would count as a success, while the app shows "Could you repeat that?" and no cue for it. Two additions:
- **One more reported count, per model and set: block-only answers** (a raw block of at least one line with no spoken
  answer under it), listed by item and rep. Spike 6's own rows, recounted the same way at 15:18 with no model call,
  hold 0 of 216.
- **One more line under "Read in advance":** any block-only answer, on either model, is reported to the user before
  the merge, with its cue line. The one-line-answer count is then read with those rows named beside it.
The script also refuses by name when the run folder has no `interview60.prompts.json` (`auto` does not write it; it is
built first with `node electron/test/golden/interview60.prompts.mjs <run dir>` from the worktree). Calibration: 17
cases.

## What it measures, and why

The user's intent for cues is "small and fast": one or two words when that carries the answer, up to 3 lines of 5
words for a complex question. Spike 6 chose the wording on six simple questions (X1-X6) plus one medium one (M1).
The re-smoke reads the shipped build on the S1 roster, which is mostly long questions, so it says little about
simple ones. This probe asks the shipped prompt, exactly as the app captured it, the simple questions again, and six
fresh ones the wording was never chosen on.

It gates nothing. Its numbers go into the result note beside the re-smoke and the bench.

## Method

- **Input:** the v2 re-smoke's `interview60.prompts.json`.
- **Refusal:** the script refuses (exit 3) unless every captured system prompt contains the dist's `CUE_SHAPE_RULE`.
  - Calibrated once, before the counted calls: it must refuse `2026-09-30T02-38-22-cuesmoke` (the old rule).
  - It also refuses a dist without the v2 exports. This was seen at 10:15 on the v1 dist: exit 3.
- **Prompts:**
  - The user turn is the base item `S1Q08F` (spike 6's base), with only the `[INTERVIEWER]:` line swapped for the
    probe question.
  - The system prompt is used exactly as captured, so it carries the shipped rule. There is no rule edit.
- **Items:**
  - Spike set: X1-X6 and M1, spike 6's exact texts. A winner's-curse set: the wording was chosen on them.
  - Fresh set, invented 2026-09-30 and checked against `holdout40.questions.mjs` and `scenario50.questions.mjs`:
    - F1 "Is k-means supervised or unsupervised?"
    - F2 "L1 or L2 regularization when you want sparse weights?"
    - F3 "What's the average time complexity of a hash map lookup?"
    - F4 "Is a Python tuple mutable?"
    - F5 "TCP or UDP for a live video call?"
    - F6 "Which HTTP status code means the resource was not found?"
- **Does the first line carry the answer?** Case-insensitive, fixed now:
  - X1-X6: spike 6's terms (`boost`; `no|not|n't|unnecessary|invarian`; `cpu`; `parquet`; `log`; `batch`).
  - F1 `unsupervised`, F2 `\bl1\b|lasso`, F3 `o\(1\)|constant`, F4 `\bno\b|\bnot\b|n't|immutable`, F5 `udp`, F6 `404`.
- **Models:** 3.1-lite LOW and 3.5-lite HIGH, spike 6's call (temperature 0.4, v1alpha).
  - 4 reps × 13 items = 52 calls per model.
  - Run only after the day rule's quota-ledger check.
- **Display:** each raw block also goes through the BUILT `trimCues(raw, CUE_MAX_LINES, CUE_MAX_WORDS)`, with the
  limits read from the dist.

## Reported, per model × set, on the displayed block and on the raw block

- **empties:** text but no cue lines.
- **one-line-answer:** exactly 1 line, and it carries the answer.
- **answer-first:** the first line carries the answer.
- **over 3 lines.**
- **lines over 5 words.**
- **words p50.**
- **blocks trimmed** (dropped, cut or cleaned).
- **responses with no text,** listed by name.

The script prints cue lines and counts only.

## Read in advance (descriptive, never a gate)

- **A winner's-curse signal:** on either model, fresh-set one-line-answer below half the spike set's rate (per simple
  item: spike /24, fresh /24).
- **An absent-block risk for the live hour:** more than 1 empty of 52 on 3.5-lite HIGH, spike 6's addendum threshold
  scaled from 36.
- **The display cap doing the work, not the prompt:** trims on more than 10% of the blocks.

Each of these is reported with its numbers and the cue lines behind it. Any follow-up goes back to the spec.
