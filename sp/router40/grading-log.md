# router40 grading log (A8 block, 2026-10-06)

Times local (TST, UTC+3). Ids, classes, counts, hashes only; never answer or question text.

## Pre-block
- 06:19 A8 seal verified: bytes above the seal line hash to `0b1dadec...74a3` (matches). Registration, A7, HARNESS-REVIEW read-as hashes match.
- 06:19 launcher `grade\launch-grader-r40.mjs` sha12 `77b50cbd897e` = the sha the APPROVE names.
- 06:22 step 1: F line appended to USER-RULINGS.txt (line 12): `F 2026-10-06: 0 -- G sitting: done -- ...`. F=0 is the value for "flight pieces on the 2026-10-06 quota day (starts 10:00 local)"; the controller did not supply a number; it only range-checks (A8.2). Time stamps inside both lines were corrected 06:23/06:24 -> 06:22 right after writing (the real clock).
- 06:22 step 2 (A8.4 step 8) line appended (line 13): flight-eq launch logs: latest endedAt 03:06:35.516Z (06:06:35 local), all exit 0; G sitting last STEP 16 end 02:46:05.662Z, `GSITTING done`; no claude -p / grader process; no Natively-* task Running; now >= 04:15.
- 06:22 step 3: `build-blind-r40.mjs` exit 0: built 4 files (12/12/12/11 items); answers A 46, L 47, RL 22; A questions equal live40's 46/46; instrument 8564ba96369a.

## Block (06:22:39 - 06:31:15 local; UTC 03:22:39Z - 03:31:15Z), one session at a time, each audited right after its launch
Launcher dry run (c3) before the first launch: all guards PASS. Order: c3, c4, blind-1.g1, g2, blind-2.g1, g2, blind-3.g1, g2, blind-4.g1, g2. Driver (scratchpad `drive.mjs`): launch -> `audit-r40.mjs --record grade\audits.jsonl` -> next; it stops at the first problem (none happened).

| slot | attempt | session | launch exit | verdict file | audit | memory | model |
|--|--|--|--|--|--|--|--|
| c3 | a1 | 88ffbe41-1528-48e1-a80a-e3fb8d0aba13 | 0 | valid on 69 keys | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| c4 | a1 | 8685d401-8f54-406e-b69c-b5a4a63132e8 | 0 | valid on 69 keys | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-1.g1 | a1 | a39f88b3-9cd0-4f3c-b896-53599e5e27fc | 0 | valid (30 keys) | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-1.g2 | a1 | 0b79bde4-388b-40e0-a563-3e6329994900 | 0 | valid (30 keys) | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-2.g1 | a1 | 03e56334-afe3-4f24-b7b2-830e470eeba6 | 0 | valid (29 keys) | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-2.g2 | a1 | 5778fbff-4f8f-4c98-84d8-d2b97230f60c | 0 | valid (29 keys) | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-3.g1 | a1 | 24adc635-85ff-43d8-a0ed-e6e3170e0c91 | 0 | valid (29 keys) | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-3.g2 | a1 | 247259a0-af33-4132-b4f5-1407282fc308 | 0 | valid (29 keys) | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-4.g1 | a1 | a70613f1-10a1-4b67-b104-d98b912ced74 | 0 | valid (27 keys) | CLEAN | ABSENT | PINNED claude-opus-5-5 |
| blind-4.g2 | a1 | cbe17bbd-cadc-49e8-9877-eba5940edf2a | 0 | valid (27 keys) | CLEAN | ABSENT | PINNED claude-opus-5-5 |

No re-grade was needed; no refusal; no launcher or audit failure.

## After the block
- 06:31 `check-classify-r40.mjs` (c3 + c4 + consensus): c3 22/22, c4 22/22 -> CALIBRATED; both valid on 69 keys; consensus labels HARD 41 / EASY 6 / split 0 (`grade\classify\labels.json`).
- 06:31 step 9 line written (USER-RULINGS line 14) from the launch logs (script `step9.mjs`): 10 records, all a1, all started on 2026-10-06 at or after 01:15:00Z, serial, no flight-eq grader start inside the block (flight-eq's 21 records end by 03:06:35Z); c3/c4 audits checked by hand (M-5).
- 06:31 `score-r40.mjs --l38base grade\classify\labels.json` exit 0 -> **READING 2: NOT SAFE (AF answered 1; wrong R 2 vs L 0)**; output in `grade\score.out.txt` (sha12 cac913fd2857).
- Result note: `RESULT-router40.md` (author: this session; the registration names no separate author).
- RESULT-router40.md written and sealed (sha256 line at its end). Nothing committed; no Gemini call; no scheduled task or app touched.
