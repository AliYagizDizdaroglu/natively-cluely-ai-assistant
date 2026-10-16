# Live as primary answerer — offline checks 2026-10-13..17 (live40, ids and counts only)

Lab folder: natively-lab `sp/et-relcheck/` (harness run.mjs sha 4fcfd5de; RESULT.md, RESULT-4source.md, RESULT-6paths.md). Graders: `claude -p` pinned claude-opus-5-5, `--setting-sources project,local`, memory ABSENT on every grader and probe; acceptable = both graders correctness 2 and on_topic 2, wrong = either grader correctness 0. No app code changed.

## 1. Extended-thinking reliability (gemini-3.8-live-extended-thinking, all 47 items, 2 reps each; plain 3.8 Live for reference)
| arm | answered | apology | non-answer | start p50/p90 | end p50 | apology seen after clip end p50/p90 |
|--|--|--|--|--|--|--|
| plain 3.8 Live (bare-r1, bare-r2) | 46, 45 | 0 | 1, 2 | 0.89/1.43, 0.97/1.27 s | 4.3, 3.5 s | — |
| ET LOW | 84/94 | 5 (all HARD) | 5 | 0.80/1.59 s | 16.3 s | 6.3/11.1 s |
| ET MEDIUM | 83/94 | 11 (all HARD) | 0 | 0.97/2.07 s | 17.5 s | 6.7/8.5 s |
| ET HIGH (run-high.mjs = run.mjs + 'high' on line 33) | 75/94 | 7 (1 EASY RE20, 6 HARD) | 12 | 0.86/8.34 s | 15.7 s | 5.0/8.6 s |
HIGH not graded: fails the 3 s apology-detectability clause of the 4-source rule without grading.

## 2. Four-source HARD check (PREREGISTER-4source.md rev 2a, sha 4f715d17…c444; 31 mains: EASY 20, HARD 11; 8 graders)
| source | EASY acc/wrong | HARD acc/wrong | HARD with 3.5-lite fallback | decision |
|--|--|--|--|--|
| A 3.5-lite HIGH (r2 control) | 20/0 | 9/0 | — | baseline |
| B plain 3.8 Live | 19/0 | 8/2 | 8/2 | NOT A CANDIDATE (wrong) |
| C ET LOW | 20/0 | 9/2 | 9/1 | NOT A CANDIDATE (wrong; apology seen at 12.0 s) |
| D ET MEDIUM | 20/0 | 6/3 | 9/0 | NOT A CANDIDATE (apology seen at 7.8/8.3 s) |

## 3. Six paths, 3.5-lite HIGH always in parallel (REGISTER-6paths.md rev 2a, sha 80fa2266…1fbd; 47 items: 20 EASY, 11 HARD, 16 follow-ups; 124 reused + 234 new verdicts, 12 graders; anchors agree 30/31)
correct/weak/wrong, rep 1 ; rep 2 (REAL router labels from the r2 flight give the same counts):
| path | all 47 | HARD 11 | follow-ups 16 | Live end p50 |
|--|--|--|--|--|
| P1 ET LOW only | 38/3/6 ; 37/6/4 | 9/0/2 ; 8/2/1 | 9/3/4 ; 9/4/3 | ~16.4 s |
| P2 ET MEDIUM only | 37/4/6 ; 37/4/6 | 6/2/3 ; 5/3/3 | 11/2/3 ; 12/1/3 | ~17.5 s |
| P3 plain Live only | 39/6/2 ; 40/5/2 | 8/1/2 ; 9/2/0 | 12/4/0 ; 11/3/2 | ~3.9 s |
| P4 plain, HARD→LOW | 37/4/6 ; 37/6/4 | = P1 | = P1 | 8–10 s |
| P5 plain, HARD→MEDIUM | 36/5/6 ; 37/4/6 | = P2 | = P2 | 7–11 s |
| P6 today (plain EASY, 3.5-lite HIGH HARD + follow-ups), proxy | 42/3/0 ; 43/2/0 of 45 | 9/2/0 | 14/0/0 of 14 | Live ~4 s |
EASY: every path 19–20/20, 0 wrong. With 3.5-lite in parallel, plain Live leaves 1–2 items per rep missed by both; its first answer is wrong on 2 per rep.

Limits: offline simulation (no hand-off latency; split-session context not simulated); 3.5-lite one sample, follow-ups 14/16; harness prompt, not the app's; spoken vs text; 2 reps on one day; HARD n 11.
