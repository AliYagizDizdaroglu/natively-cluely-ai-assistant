# b1-final result — 2026-10-11 21:20 TST (attended), run 2026-10-11T18-43-32-b1-final

Ids and counts only. Registration: natively-lab `sp/bundle-1/flight/PREREGISTER-b1-final.md`, sealed rev 3a sha256 `4fa5db4b8e6905c4cc09cab465b3a44ead666fdf047f3e46aee2bef6f04f653d`; USER-RULINGS item 9 (branch A, lean extras). Build MAIN @ 9d5bd9e (reduced bundle: cue gate, cue-trim, silent-ear failover, harness overlay; r1's router instruction).

## Verdict: INCONCLUSIVE (bar 5 only)

Scorer `score-b1.mjs` (sha256 prefix 8e9ed7df8066, Opus-reviewed, 3 findings fixed, calibration 103/103), output `sp/bundle-1/flight/grade/score-b1.final.out.txt`.

| bar | result | r1 (2026-10-07) |
|--|--|--|
| 1 quality | MET: in-app acceptable 46 of 47, 0 wrong (mains 31/31, follow-ups 15/16) | 44/47, 0 wrong |
| 2 safety | MET: wrong Live-shown 0 of 19; text half 0/0/0/0 | 0 of 21 |
| 3 latency | MET: shadow first token p50 3363 ms, p90 4509 ms (n 46) | 3903 / 4914 |
| 4a cue gate | MET: 24 sent / 24 skipped, 0 mismatches | — |
| 4b cue blocks | MET: well-formed 24/24, malformed 0, over 3x5 0 | — |
| 4c markers | MET: 0 leaks in 65 shown texts | 0 |
| 5 reliability | NOT MET: items answered 46/47 (RH02 never dispatched); doubles 0; nothing shown 0; failed 0; router down 0.00 min | r1 also short (1 double) |
| 6 observability | MET: overlay shown in the console session; Q1 yes | — |

Reported only: routing EASY caught 17/20, HARD shown Live 2/27; Live first text p50 1652 ms.

## The user's confirmations (§4, verbatim)
1) yes · 2) no · 3) no only scrolled  — all met (mouse-wheel scrolling is not typing/clicking).

## Grading
- Gating: 3 probes + in-app g1/g2, `claude -p` pinned claude-opus-5-5, `--setting-sources project,local`, memory ABSENT on all 5 transcripts, model read from each transcript.
- Measured cost: weekly 93% → 94% over the 5 sessions (≤ ~0.2% per session; whole-percent meter).
- Control (reported, user asked to check the 46/47): bare 3.5-lite HIGH, same graders: **30/31** vs r1 28/31. Both arms +2 vs r1 → tonight's graders ~2 kinder; read quality as **equal to r1, 0 wrong**. Pairing audit: 46/46 pair questions match their roster question; answers median 48 words (r1 47), none under 21.
- Cue content (informational, cue-grader kit with b1 added, rubric fce7ac5bb1e3 unchanged): 16 blocks, good 15 / weak 1 / wrong 0, agreement 100%, adds-error 0; axis means R 1.96 C 1.99 G 1.88 V 1.94 K 1.81 (r1 K 2.00).
- Not graded (branch A, lean): low, captured-high, twins, blind L/S.

## RH02 (bar 5) root cause
- D1: the 6-word Live-heard follow-up (2 content words) was dropped by ChipDeduper's sameAnchor overlap half: 1 of 2 content words in RE14's anchor → overlap 0.50 at +19.0 s, inside windowMs 20 s (`dispatch: drop ... duplicateOf=live answered=true`). Containment false, Jaccard 0.25. FIXED 3737daf (short-anchor overlap only within CROSS_DETECTOR_MS 5 s); replay over 32 run logs / 1821 turn dispatches: only RH02 changes in the turn-based era.
- D2 (open): Deepgram produced RH02's 3 words only at 18:38:48, while RE15 played; they opened RE15's turn (dispatched 15 words = RH02's 3 + RE15's 12). Same family as the not-a-question-close finding (closed turns forgotten).

## Deviations (owned)
- The grader launcher and scorer were derived AFTER the flight; the gating graders ran before the scorer's Opus review (§3.5 says before). The review's 3 findings did not change this run's result.
- The cue-grader kit's trimCues hash check is skipped for b1 (this build's trim differs from the kit's pin).

## Next
One re-fly (b1-final-r2) allowed under the same registration, after D1 (+ the overlay auto-scroll toggle, 75c16d9) landed in MAIN.
