# live40-r1 blind grading - RESULT

Run: Gemini 3.8 Live transcripts, 47 items (46 answered; RH14 has no answer and counts as a miss).
Instrument: MAIN interview60.judge.mjs (JUDGE_MODEL/RUBRIC/questionForGrader, instrument hash 8564ba96369a) + h40d dispatch text (only pairs path, verdicts path, tag substituted).
Blind file: blind/pairs.blind-1.json (46 answers, keys q01..q46, seed `blind:live40:r1`); key in keyhold/key.json (outside the blind folder).
Graders: g1 and g2, `claude -p --model opus`, each from its own fresh cwd (cwd/g1-a1, cwd/g2-a1), run at the same time, attempt 1 each, no replacement needed.

Definitions: acceptable = both graders correctness 2 AND on_topic 2 (delivery not used). wrong = any grader correctness 0.

## Grader checks
- g1 session 9856e006-bc09-4ac6-b635-66dd642ddfff, g2 session 11b1c4a8-0a51-4ab8-b76b-14801b8962c1; both exit 0, 46/46 valid verdict keys.
- check-grader-memory.mjs (--projects C:/Users/sotka/.claude/projects, session:<id>): g1 ABSENT (projectMemory=0 claudeMem=0), g2 ABSENT (0, 0).
- h40d-grader-models.mjs: g1 {"claude-opus-5-5":6} PINNED, g2 {"claude-opus-5-5":9} PINNED; "ALL GRADERS claude-opus-5-5 (2 of 2 agents)".
- Tool use (names only): g1 Read x2 (rubric, own pairs), Bash x1, Write x1 (own verdicts); g2 Read x3 (rubric, own pairs, own verdicts), Bash x1 (6535-char node -e), Write x1. Neither transcript mentions keyhold or key.json.

## Scores
(table and lists as printed by score.mjs; raw copy in score.out.txt)

| group | items | answered | acceptable | wrong (any grader c=0) | not acceptable (incl. unanswered) |
|---|---|---|---|---|---|
| EASY | 20 | 20 | 18 | 0 | 2 |
| HARD standalone | 11 | 11 | 5 | 1 | 6 |
| HARD follow-up (RH14 = miss) | 16 | 15 | 13 | 0 | 3 |
| ALL | 47 | 46 | 36 | 1 | 11 |
| HARD (both) | 27 | 26 | 18 | 1 | 9 |

- EASY: wrong [] ; not acceptable [RE01, RE08]
- HARD standalone: wrong [RH18] ; not acceptable [RH05, RH09, RH15, RH17, RH18, RH19]
- HARD follow-up: wrong [] ; not acceptable [RH10, RH14 (no answer), RH16]

Scores of the answered non-acceptable items (g1 c/o/d | g2 c/o/d):
- RE01 1/2/2 | 1/2/2
- RE08 1/2/2 | 2/2/2
- RH05 1/2/2 | 2/2/2
- RH09 1/2/2 | 1/2/2
- RH10 1/2/2 | 2/2/2
- RH15 1/1/2 | 1/2/2
- RH16 1/2/2 | 1/2/2
- RH17 1/2/2 | 2/2/2
- RH18 0/0/2 | 0/0/2 (WRONG, both graders)
- RH19 1/2/2 | 2/2/2

## Grader agreement (46 answered)
- correctness exact 41/46; on_topic exact 45/46; delivery exact 40/46
- class (wrong / weak / full c2+o2) same 41/46
- per-grader acceptable (c2+o2): g1 36, g2 41; both 36. g2 is the more lenient: all 5 disagreements (RE08, RH05, RH10, RH17, RH19) are g1 correctness 1 vs g2 correctness 2.
- wrong: g1 1, g2 1, both 1 (RH18)
- distributions 0/1/2: g1 correctness 1/9/36, on_topic 1/1/44; g2 correctness 1/4/41, on_topic 1/0/45

Not shown: causes of any non-acceptable grade (no answer text was read); score depends on the "both graders" rule, so single-grader numbers are g1 36/46 and g2 41/46 acceptable.
