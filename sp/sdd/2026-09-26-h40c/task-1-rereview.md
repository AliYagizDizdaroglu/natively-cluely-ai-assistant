# Task 1 re-review: fix round 1

ALL FINDINGS ADDRESSED: YES

Counts: Critical 0 / Important 0 / Minor 0 new or remaining that need action. M2 and M3 stay open by
agreement (see below).

## I1: fixed and verified

- **Code.** At both sites, the `question=` term is scored only when `d.verdict === 'paraphrase'`:
  - interview60.judge.mjs:115, one guard;
  - interview60.metrics.mjs:212, the guard on both directions.
  Both comments now give the reason: a paraphrase has been checked against the interviewer's STT,
  while an unverifiable `question=` is unchecked Live text. The four files are LF only with no BOM.
- **Tests.** There is one after8-shaped regression test per file: the real 07:36:26.044Z line and the
  real M11 item.
  - The judge test expects `['?']`.
  - The metrics test expects `answersToNobody === 1` and M11 `answered === false` with
    `dispatches === 0`.
- **MAIN run.** From `SD\vitest-cwd-rev1` with `--root MAIN`: judge 18/18 and metrics 39/39, so
  **57 passed**.
- **Rule 8: the tests fail without the fix.** I copied MAIN's current files into `SP\r1ungated` and
  removed only ` && d.verdict === 'paraphrase'` (1 place in judge, 2 in metrics). Against that copy,
  exactly the two new tests fail:
  - `expected [ 'M11' ] to deeply equal [ '?' ]`
  - `expected +0 to be 1`

  The one other failure is `graderPromptVersion`. It is the known artefact of the copy (the prompt
  `.md` is absent) and it also appeared in the first review's copies.
- **Cross-run.** I reran `SP\rev1\cross-runs.mjs` from 07a0e5e to MAIN over every run that carries
  `question=`:
  - only h40b changes, and only in the intended way: pair 10:47:31.603 goes `?` → R07F,
    `answersToNobody` goes 1→0, and R07F's answered, answeredAt, dispatches and coverage move;
  - after5 is identical (its `'?'` count stays 3);
  - after8 is identical (its `'?'` count stays 1, so the fabrication stays unclaimed);
  - judge and metrics disagree 0 times in every run.

  **Correction to my first review:** it said 21 runs. The true count is **20** (after5–after9,
  s50a, s50b–s50m, h40a, h40b). Here 19 are identical and 1 changed. The report's "18 of 18
  non-h40b" should read 19; nothing else depends on that number.

## M1: applied

- `SP\attrib-check.mjs` and `attrib-diff.mjs` now compare all 9 item fields.
- `SP\round1-wide\attrib-diff-round1.txt` shows:
  - h40a is identical;
  - h40b moves only R07F, and R07F's `coverage 0 -> 1` is now visible.
- The report cites this file as `SP\attrib-diff-round1.txt`, but it actually lives at
  `SP\round1-wide\attrib-diff-round1.txt`. That is a path typo only.

## M2 and M3: left open, reasons accepted

- **M2:** the positional regex silently drops `question=` if a new field ever appears in front of it.
  My first review marked this fix optional. The same pattern already exists in metrics.
- **M3:** judge and metrics still differ structurally. My first review asked for no action, and the
  I1 gate narrows the exposure.
- **Dispatch format today.** The other concurrent MAIN edit to electron/main.ts adds only an
  `[Main] answer source:` log line. It does not touch any `dispatch:` line format, so M2 is not
  triggered now.

## No new findings.
