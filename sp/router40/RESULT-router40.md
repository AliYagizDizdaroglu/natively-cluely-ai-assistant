# router40 RESULT: the 3.8 Live router on the live40 set (a comparison, never a ship decision)

Written 2026-10-06 06:33 TST by the grading session (Sonnet 5.5), from `PREREGISTER-router40.md` + A1 to A8 (A8 rev4, seal `0b1dadec...74a3`, verified). Ids, classes, counts, ms and hashes only: no question or answer text appears here.

## READING: 2 NOT SAFE

`AF_answered >= 1` OR `wrong_R > wrong_L` (registration section 7, row 2). Both halves hold. The router on this set stops unless the user reopens it; no router flight registration (row 2's own text).

| row | condition | value read | fires |
|--|--|--|--|
| 1 INCOMPLETE | L or R not complete, or grading INCOMPLETE | L complete (47 answers, 0 holes, 48 requests); R complete (31/31 chains); grading complete: 8 of 8 verdict files valid, 8 of 8 audits CLEAN + ABSENT + PINNED | no |
| **2 NOT SAFE** | `AF_answered >= 1` OR `wrong_R > wrong_L` | **AF answered 1 of 7 (RH10)**; **wrong_R 2 (RH08, RH10) vs wrong_L 0** | **YES (first match)** |
| 3 COSTS QUALITY | `acc_R <= acc_L - 3` | acc_R 41, acc_L 43 (diff -2; needs <= 40) | no (not reached) |
| 4 BUYS NOTHING | `EASY_caught < 10` OR `lead < 1000 ms` OR `M >= 3` | EASY_caught 19 of 20; lead 5749 ms; M 0 | no (not reached) |
| 5 CANDIDATE | none of 1-4 | n/a | no |

Rows 3 to 5 are listed only so the numbers are visible; the registration applies the first matching row.

## The numbers (grade\score.out.txt, sha12 `cac913fd2857`, verbatim)

```
READING 2: NOT SAFE  (AF answered 1; wrong R 2 vs L 0)
numbers: acc A 37, L 43, R 41, ORACLE 42; wrong L 0, R 2

quality (acceptable / answered / wrong, per group)
  group                            A               L               R          ORACLE
  EASY                 18/20/0 of 20   19/20/0 of 20   19/20/0 of 20   18/20/0 of 20
  HARD standalone       7/11/1 of 11    8/11/0 of 11    8/11/0 of 11    8/11/0 of 11
  HARD follow-up       12/15/0 of 16   16/16/0 of 16   14/16/2 of 16   16/16/0 of 16
  HARD (both)          19/26/1 of 27   24/27/0 of 27   22/27/2 of 27   24/27/0 of 27
  ALL                  37/46/1 of 47   43/47/0 of 47   41/47/2 of 47   42/47/0 of 47

routing by live40 class (nine class columns)
  row                   answer      hard    silent   missing   apology malformed       cut     early  too-long   n
  E                         19         1         0         0         0         0         0         0         0  20
  H                          1        10         0         0         0         0         0         0         0  11
  QF                         1         8         0         0         0         0         0         0         0   9
  AF                         1         6         0         0         0         0         0         0         0   7

routing by live40 group
  row                   answer      hard    silent   missing   apology malformed       cut     early  too-long   n
  EASY                      19         1         0         0         0         0         0         0         0  20
  HARD standalone            1        10         0         0         0         0         0         0         0  11
  HARD follow-up             2        14         0         0         0         0         0         0         0  16

routing by l38base consensus label
  row                   answer      hard    silent   missing   apology malformed       cut     early  too-long   n
  EASY                       5         1         0         0         0         0         0         0         0   6
  HARD                      17        24         0         0         0         0         0         0         0  41
  split                      0         0         0         0         0         0         0         0         0   0
EASY caught 19/20; AF answered 1/7; QF answered 1/9; H answered 1/11; exact "hard" on HARD 24/27; HARD not answered 24/27 (denominators exclude missing); M 0 []

latency (seconds)
  Live first text on R's answered items: n 22, p50 0.72, p90 1.18; A on the same items: p50 1.06, p90 1.45
  "hard" decision time: n 25, p50 0.80, p90 1.63
  L TTFT on R's answered items: p50 6.47, p90 13.08; by group: EASY 8.63/13.08; HARD standalone 4.81/12.02; HARD follow-up 3.98/11.44; ALL 4.43/12.02
  lead = p50 L TTFT - p50 Live first text on R's answered items = 5749 ms
  composed R first text: parallel p50 1.58 p90 11.37; serial p50 3.46 p90 11.80

misroute costs
  false EASY (a HARD item R answered), AF first then H then QF: RH10[AF] dAcc -1 dWrong 1; RH05[H] dAcc 0 dWrong 0; RH08[QF] dAcc -1 dWrong 1
  false HARD (an EASY item not answered): 1; RE09(hard) latency cost 3.30 s, L acc vs A acc

paired lists: R vs L differ on [RH08,RH10]; R vs A differ on HARD [EF03,RH08,RH19,RH14,RH17,RH16,RH18]; A vs L differ on [RE01,EF03,RH10,RH19,RH14,RH17,RE14,RH16,RH18,RE19]
health: {"chains":31,"retried":1,"abnormalAttempts":1,"closes":{"1000":31,"1006":1},"missing":0}
test-retest of A: 41/46 items graded the same (original 36/46 acceptable, new 37/46); different [RE08,EF03,RH05,RH17,RE19]
```

`router40 3.1-lite requests sent: 48` (counter `lite-quota.answers.jsonl`, file sha12 `560b9c77a820`, from `runs-L-console.txt`). They ran on the 2026-10-05 quota day under the user's 21:41 ruling (flight-eq RESULT D10 already records this).

## What drives the reading

- **The reading comes from three R answers, none of them EASY.** Live answered RH10 (AF), RH08 (QF) and RH05 (H). The other 19 R answers are on EASY items (19 of 20 EASY caught).
  - RH10 and RH08 are the two `wrong` lines: each shows dAcc -1 and dWrong +1 against L. RH05 cost nothing (dAcc 0, dWrong 0).
  - Both wrong items are HARD follow-ups (R follow-up row: 14 acceptable, 2 wrong of 16; L: 16 of 16 acceptable, 0 wrong).
  - The reader's word count for RH08 and RH10 is **1 word each** (`reader-diff-R.txt`: w 1, class `answer`), against 30 to 71 words on the 20 other answers. Their text is not shown here; whether these two one-word outputs are a router mis-emit rather than an attempted answer is not decided by this note and no reading changes on it.
- **Coverage is good, the lead is large, the safety rows fail.** EASY caught 19 of 20 (bar 10); lead 5749 ms (bar 1000 ms); M 0 (bar 3). `acc_R` 41 vs `acc_L` 43 is inside the registered noise (a difference of 1 to 2 is read as no detectable difference; row 3 needs 3). The router fails only on the strict safety row: one AF answered, two wrong lines where L has none.
- **Routing on the hard classes:** "hard" on 24 of 27 HARD items; HARD answered 3 of 27 (RH05, RH08, RH10); false HARD on the EASY set 1 (RE09, latency cost 3.30 s).
- **Health:** 31 sessions, 1 retried (one 1006 close, 1 abnormal attempt, 31 normal 1000 closes), 0 missing. Below the health-STOP rules.

## Registered expectations vs the data (recorded before data, so a surprise is visible)

| expectation (section 7) | recorded | read |
|--|--|--|
| Under variant B: `EASY_caught` | 14 to 19 | 19 (top of the range) |
| false EASY (short traps) | 1 to 3 | 3 (RH10, RH05, RH08) |
| reading | 2, 4 or 5 all plausible | 2 |
| L acceptable EASY | 18 to 20 | 19 |
| L HARD standalone | 5 to 8 of 11 | 8 |
| L follow-ups | 11 to 14 of 16 | 16 (above the range) |
| L TTFT p50 | 1.5 to 3.5 s | 4.43 s over all items (the score's ALL row); 6.47 s on R's answered (EASY) items (above the range) |

## Descriptive axes (decide nothing)

- **A (live40-r1) vs L:** acceptable 37 vs 43 of 47; they differ on RE01, EF03, RH10, RH19, RH14, RH17, RE14, RH16, RH18, RE19.
- **R vs A on HARD:** differ on EF03, RH08, RH19, RH14, RH17, RH16, RH18. **ORACLE** (A on EASY + L on HARD) 42 acceptable, 0 wrong.
- **Test-retest of A:** 41 of 46 items graded the same; new 37 of 46 acceptable against the original 36 of 46; different on RE08, EF03, RH05, RH17, RE19.
- **l38base axis:** classifiers c3 and c4 are each 22 of 22 on the calibration turns (CALIBRATED), so the axis is read. They agree on all 47 turns (split 0): EASY 6, HARD 41. Against it R answered 5 of 6 EASY and 17 of 41 HARD. This axis feeds no reading row.
- **Latency:** Live's first text p50 0.72 s (p90 1.18 s) on R's 22 answered items, against A's 1.06 s on the same items; "hard" decisions p50 0.80 s (n 25).

## What ran, and how it matches the registration

| piece | what | result |
|--|--|--|
| A8 seal | bytes above the seal line | `0b1dadecbc634c48b554b5aee46931bfbf1fee316015036c54885c09e8c274a3`, matches |
| preconditions | A8-PRECONDITIONS-REVIEW | APPROVE; the launcher sha12 `77b50cbd897e` equals the approved one |
| F line (A8.2) | USER-RULINGS line 12 | `F 2026-10-06: 0`, G sitting `done`; F gates nothing for grading (range-checked only), and the value 0 is the controller-session's own reading ("no flight piece on the 2026-10-06 quota day"), not a supplied number |
| step 8 line | USER-RULINGS line 13 | flight-eq's last grader ended 06:06:35 local; G sitting finished 05:46:05; written 06:22 before the first launch |
| `build-blind-r40.mjs` | exit 0 | 4 files 12/12/12/11 items; answers A 46, L 47, RL 22; A questions equal live40's 46/46; instrument `8564ba96369a` |
| the block | 06:22:39 to 06:31:15 local, 10 launches | strictly serial, every attempt a1, every exit 0, **0 re-grades** |
| step 9 line | USER-RULINGS line 14 | every start on 2026-10-06 at or after 01:15:00Z (04:15 local); no flight-eq grader start inside the block; c3/c4 audits checked by hand (M-5) |
| `score-r40.mjs` | exit 0 | READING 2 |

| slot | attempt | session | audit | memory | model |
|--|--|--|--|--|--|
| c3 | a1 | 88ffbe41-1528-48e1-a80a-e3fb8d0aba13 | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| c4 | a1 | 8685d401-8f54-406e-b69c-b5a4a63132e8 | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-1.g1 | a1 | a39f88b3-9cd0-4f3c-b896-53599e5e27fc | CLEAN | ABSENT | PINNED |
| blind-1.g2 | a1 | 0b79bde4-388b-40e0-a563-3e6329994900 | CLEAN | ABSENT | PINNED |
| blind-2.g1 | a1 | 03e56334-afe3-4f24-b7b2-830e470eeba6 | CLEAN | ABSENT | PINNED |
| blind-2.g2 | a1 | 5778fbff-4f8f-4c98-84d8-d2b97230f60c | CLEAN | ABSENT | PINNED |
| blind-3.g1 | a1 | 24adc635-85ff-43d8-a0ed-e6e3170e0c91 | CLEAN | ABSENT | PINNED |
| blind-3.g2 | a1 | 247259a0-af33-4132-b4f5-1407282fc308 | CLEAN | ABSENT | PINNED |
| blind-4.g1 | a1 | a70613f1-10a1-4b67-b104-d98b912ced74 | CLEAN | ABSENT | PINNED |
| blind-4.g2 | a1 | cbe17bbd-cadc-49e8-9877-eba5940edf2a | CLEAN | ABSENT | PINNED |

Tools per session: Read x2 + Write x1 (classifiers); Read x3 or x4 + Write x1 (graders). Verdict files valid on their pairs: blind-1 30 keys, blind-2 29, blind-3 29, blind-4 27.

Code identity (sha12, as the re-review read them): `score-r40.mjs` `ca45b2d63967`, `build-blind-r40.mjs` `0bab422e1da5`, `audit-r40.mjs` `217653bb7760`, `launch-grader-r40.mjs` `77b50cbd897e`, `r40-common.mjs` `e59546014cca`, `read-r.mjs` `297f87656b0d` (the freeze record `keyhold\build-record.json` holds the same reader sha and a reader-output sha `a909653fb076...`; score-r40 passed both checks), `check-classify-r40.mjs` `72e780c63893`.

**The reader fix (A8.4 step 3, M-2): read, not acted on.** `reader-diff-R.txt` (old reader `01a4fbe39388...`, fixed `297f87656b0d...`, on `router40-R`): "0 items change class; 0 change word count; 0 change T (text not shown)"; transitions answer -> answer x22, hard -> hard x25. No reading depends on it.

## Not shown (what this result does not cover)

- **Two R answers are 1 word long and graded wrong.** The reading rests on RH08 and RH10 (and the AF count of 1 is RH10 alone). Their text was not printed here; the registration's rules were applied verbatim, and a reopening decision belongs to the user, who may want to look at those two items first.
- **n is small.** 20 EASY, 27 HARD; the registered noise caveat stands (live40's two graders differed on 5 of 46). Row 2 is deliberately strict (one extra wrong line is the cost); two wrong lines on 47 is far from a rate.
- **Grading is one blind batch with 2 Opus graders per file**, as registered. The graders' agreement is not summarised here beyond what the score reads (acceptable = both correctness 2 and on-topic 2; wrong = any grader 0).
- **Cross-registration dependencies of A8 M-5 stay unverified:** whether flight-eq's graders occupy the slot P6 checks, and whether a flight-eq step appears as a `Natively-*` task. They did not matter in the event (no flight-eq session ran inside the block; every `Natively-*` task read Ready).
- **The F value 0 was not supplied by the controller;** it is the reading of the quota-day definition and gates nothing here.
- **The block took 9 minutes, not the 250 minutes P9 estimates.** The guard's 25 min per launch is a ceiling; no launch ran past 1 minute.
- **A is from 2026-10-03,** L and R from 2026-10-05, graded together on 2026-10-06; Live and lite model behaviour on another day is not covered. Variant B only; the real run is one chain order.
- **No Gemini call was made by grading.** Nothing was committed; nothing in MAIN or the worktree was written; no scheduled task was touched; no key was read.
sha256 (of every byte above this line): 824a895cf6c37faf0e31905dcf058eec350198c3589556ca936920695eba2c82
