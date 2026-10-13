# b1-final-r2 result — 2026-10-13 06:00 TST (unattended), run 2026-10-13T03-23-31-b1-final-r2

Ids and counts only. Registration: natively-lab `sp/bundle-1/flight/PREREGISTER-b1-final.md` (sealed rev 3a, sha256 `4fa5db4b…f653d`) + `AMENDMENT-r2-2026-10-13.md` (sha256 `8817efe3a8cfc16e47729c51d64e036f5b0212fdbab9ce0a207c7ee291d33465`): same bars and grading; the build departs from §8 (same HEAD) at the user's direction (USER-RULINGS item 10). Build MAIN @ 999b5152 = 9d5bd9e + D1, D2, overlay toggle, F1, F2a, F2b, F3, F3b.

## Verdict: INCONCLUSIVE

Scorer `score-b1.mjs --label b1-final-r2`, output `sp/bundle-1/flight/grade-r2/score-b1-r2.final.out.txt`. Reasons: bar 6 human half not met (the user did not watch: Q1 = not sure); bars 1–2 UNREADABLE on one unclaimed turn (turn:30, undiagnosed).

| bar | r2 | b1-final | r1 |
|--|--|--|--|
| 1 quality | 44/47 acceptable, 0 wrong (RE06, RH15: correctness 1 by one grader); mains 29/31, follow-ups 15/16 | 46/47, 0 wrong | 44/47, 0 wrong |
| 2 safety | wrong Live-shown 0 of 18; text half 0/0/0/0 | 0 of 19 | 0 of 21 |
| 3 latency | p50 3544, p90 4842 ms (n 47) — MET | 3363 / 4509 | 3903 / 4914 |
| 4a/4b/4c cues | 26 sent / 23 skipped, 0 mismatches; 26/26 well-formed; 0 leaks | 24/24 | — |
| 5 reliability | **MET: 47/47 answered, 0 doubles**, 0 failed, router down 0.05 min | 46/47 (RH02) | short |
| 6 observability | automated PASS (overlay 3x, console session); human half Q1 not sure | MET | — |

Reported: routing EASY 17/20, HARD shown Live 1/27 (b1 2/27); Live first text p50 1265 ms.

## User confirmations (§4)
Asked verbatim at ~06:32; answer: "I didnt watch this time, continue to grading and report" → Q1/Q2/Q3 = not sure.

## Grading
3 probes + in-app g1/g2 + HIGH control, `claude -p` pinned claude-opus-5-5, memory ABSENT on all 6; cue content 2 graders, memory ABSENT, pinned.
- Control, bare 3.5-lite HIGH (31 mains): **31/31** (b1 30/31, r1 28/31) → graders lenient-leaning; read quality as ≈ r1/b1, 0 wrong.
- Cue content (kit, b1r2 informational): 17 blocks good 16 / weak 1 / wrong 0, agreement 100%; R 1.97 C 1.98 G 1.86 V 2.00 K 1.94 (b1 K 1.81); adds-error 0.

## Open
- turn:30 unclaimed (undiagnosed); the not-a-question premature close (SQ07 +6 s on smalltalk25 run 3); a watched flight for a formal PASS.
