# s50k — score and latency by arm

Flight 2026-09-20, run `2026-09-20T11-22-43-s50k`, record `c0e7fdc`.
Frozen grader `8564ba96369a`, Claude Opus 5, one grading agent per arm, blinded to the others.

Verdict rule: **wrong** if correctness or on-topic is 0; **acceptable** if both are 2 and delivery is at least 1; otherwise **weak**.
Latency is time to first token, in seconds. "app" bytes means the arm replayed the exact prompt the app sent that hour; "bare" means the scripted question with no context block.

| arm | bytes | model / level | ok / weak / wrong | n | ttft p50 | p90 | max | words p50 | max | thoughts p50 |
|---|---|---|---|---|---|---|---|---|---|---|
| **in-app (the live hour)** | app | 3.1-lite LOW | 34 / 6 / 0 | 40 | 5.2 | 7.3 | 8.6 | 96 | 189 | — |
| 3.1 LOW twin r1 | app | 3.1-lite LOW | 26 / 13 / 0 | 39 | 3.7 | 6.5 | 8.0 | 87 | 181 | 739 |
| 3.1 LOW twin r2 | app | 3.1-lite LOW | 28 / 11 / 0 | 39 | 4.9 | 6.5 | 6.7 | 83 | 195 | 764 |
| 3.1 LOW twin r3 | app | 3.1-lite LOW | 31 / 8 / 0 | 39 | 5.4 | 6.7 | 8.5 | 91 | 184 | 844 |
| 3.5 HIGH twin r1 | app | 3.5-lite HIGH | 34 / 5 / 0 | 39 | 3.9 | 5.1 | 5.6 | 73 | 170 | 874 |
| 3.5 HIGH twin r2 | app | 3.5-lite HIGH | 29 / 10 / 0 | 39 | 3.9 | 9.9 | 30.9 | 78 | 154 | 897 |
| 3.5 HIGH twin r3 | app | 3.5-lite HIGH | 34 / 5 / 0 | 39 | 3.7 | 4.9 | 5.5 | 85 | 147 | 905 |
| no-thinking twin | app | 3.1-lite default | 23 / 16 / 0 | 39 | 2.9 | 4.0 | 4.9 | 100 | 182 | 0 |
| bare 3.1 LOW | bare | 3.1-lite LOW | 18 / 2 / 0 | 20 | 4.6 | 7.0 | 7.1 | 98 | 198 | 853 |
| bare 3.1 default | bare | 3.1-lite default | 16 / 4 / 0 | 20 | 3.0 | 5.7 | 8.5 | 109 | 154 | 0 |
| bare 3.5 HIGH | bare | 3.5-lite HIGH | 18 / 2 / 0 | 20 | 3.8 | 4.3 | 4.4 | 106 | 135 | 914 |
| bare 3.5 default | bare | 3.5-lite default | 17 / 3 / 0 | 20 | 0.8 | 1.3 | 1.4 | 107 | 189 | 0 |
| qwen3.8-27b | bare | default | 13 / 6 / 1 | 20 | 0.5 | 0.7 | 0.8 | 100 | 164 | — |
| gpt-oss-120b | bare | default | 16 / 4 / 0 | 20 | 2.0 | 3.4 | 4.4 | 65 | 148 | — |
| gemini-3.8-flash | app / focused | default | 1 / 2 / 0 | 3 | 4.6 | 6.0 | 6.0 | 135 | 144 | 807 |
| gemini-3.7-flash | app / focused | default | 3 / 1 / 0 | 4 | 6.6 | 6.9 | 6.9 | 102 | 158 | 475 |
| gemini-3.6-flash | app / focused | default | 4 / 1 / 0 | 5 | 7.3 | 7.6 | 7.6 | 76 | 124 | 934 |
| gemini-3.5-flash | app / focused | default | 3 / 2 / 0 | 5 | 13.7 | 36.2 | 36.2 | 95 | 122 | 1265 |

## The bands that decide the model

Three reps a side, same window, same captured bytes, 39 shared questions.

| | reps | min | max | mean | spread |
|---|---|---|---|---|---|
| 3.1-lite LOW | 26 / 28 / 31 | 26 | 31 | 28.3 | 5 |
| 3.5-lite HIGH | 34 / 29 / 34 | 29 | 34 | 32.3 | 5 |
| live hour | 33 | | | | above the 3.1 band |

The pre-registered rule asked for one of two things: the 3.5 band's minimum beating the 3.1 band's maximum, or a mean ahead by at least 4 with per-question wins at two to one. The bands overlap, so the first fails. The second passes at exactly both thresholds, mean ahead by 4.0 and wins 12 to 6. Spread is 5 on both sides, wider than the noise floor we assume, so this is the weakest possible pass.

## In-app answer length

| | value |
|---|---|
| answers | 42 |
| words p50 | 96 |
| words p90 | 159 |
| over 85 words | 28 of 40 |
| over 150 words | 5 of 40 |
| cut by the 200-word guard | 0 |
