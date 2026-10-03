# The earlier-questions block, pooled re-run (s50m Thursday + s50l Saturday): FAIL on clause 1

Rule: `passes/2026-10-01-followup-questions/PREREGISTER-followup-questions.md` §7 (adb25a8), read with
`AMENDMENT-s50l.fable.md` (Fable; Opus review APPROVE WITH FIXES, applied; the user's OK 2026-10-02 23:38, hash
7957de0e… re-checked at 10:05). Run 2026-10-03 10:05–10:30 local: one pass, 84 of 84 calls, 0 transient, 0 empty
after the filters; eight claude-opus-5-5 graders (pinned from every transcript; audit clean). Evidence:
`2026-10-03-followup-questions/` (MANIFEST.txt); Thursday's half is adb25a8.

- **DECISION: FAIL.** The gain clause passes at its bar (pooled +8, PASS ≥ +8), but clause 1 fails: one new
  consensus-wrong answer in arm B, none in arm A. Every other clause holds.
- **The one wrong answer is S2Q09F r2 (arm B).** Both graders: it claims Azure services guarantee single-region
  isolation on their own. S2Q09F is the item whose block carries the WRONG question (the selector skips its parent,
  still in the window, and inserts the older S2Q08F question: the known selection bug, run as registered). It read
  A YYY → B wwY on Thursday and A YYY → B YXw today. One draw cannot prove the block's content caused this error;
  the item is the block's worst on both days.
- **The gain is real on both recordings:** s50l alone +5 (B 16 − A 11; reported only), Thursday +3. S1Q04F and
  S1Q06F (the evicted-parent follow-ups) moved www → wYY / YwY; S2Q05F wYw → YYY reversed Thursday's loss; S1Q08
  wYY → YYY. My expectation before the run (+3 on s50l, a second INCONCLUSIVE) was wrong.
- **Consequence (§7, registered): the reference design is never built.** The next step is the turn-based design
  (questions kept by turn, not by the 120 s window) with its own registration; it must fix the selection that put
  S2Q08F's question into S2Q09F's prompt. Sunday's flight does not happen (it was conditional on PASS).

## The rule lines, verbatim (`RESULT-pooled.txt`)

```
additivity OK: n 47+42=89, R 21+21=42, wrongA 0+0, wrongB 0+1, offA 9+6, offB 3+0, slowA 6+0, slowB 7+0, accA 10+11, accB 13+16
POOLED (s50m Thursday + s50l Saturday): 47 + 42 pairs; instrument 8564ba96369a; graders claude-opus-5-5
incomplete pairs (excluded): m:C5#1
answers empty after the filters (scored 0/0/0): none
n = 89 complete (item, rep) pairs; roster pairs R = 42
1. no new wrong answers        consensus-wrong B 1 <= A 0: FAIL
2. no rise in off-topic        consensus-off-topic B 3 <= A 15: holds
3a. not later (median)         median paired TTFT B-A 131 ms (holds <= +500, FAIL > +1000): holds
3b. not later (p90)            p90 B 9610 ms vs p90 A 8771 ms + 2000: holds
3c. stalls                     TTFT > 10 s: B 7 <= A 6 + 5: holds
4. not longer                  median paired words B-A 3 (holds <= +5, FAIL > +10): holds
5. gain, roster pairs          consensus-acceptable B 29 - A 21 = +8 (PASS >= +8, FAIL <= +2): PASS
DECISION: FAIL
```

## Per item, s50l (reps 1–3; Y both acceptable, X both correctness 0, o both on_topic ≤ 1, w otherwise)

| item | kind | A (today's prompt) | B (with the block) | Thursday A → B |
|---|---|---|---|---|
| S1Q04F | roster | www | wYY | www → YYY |
| S1Q06F | roster | www | YwY | www → YYY |
| S1Q08 | roster | wYY | YYY | Ywo → YYw |
| S2Q05F | roster | wYw | YYY | Yoo → ooo |
| S2Q08 | roster | YYY | YYY | YYY → YwY |
| S2Q08F | roster | YYo | YwY | YoY → YYw |
| S2Q09F | roster | YYY | YXw | YYY → wwY |
| C2 / C3 / C4 / C5 | callback | wYY / YYY / Yww / YYY | YYY / YYY / Yww / YYY | www→YYY / YYY→YYY / www→wYY / -YY→-wY |
| D1 / D2 / D3 | dropped parent | ooo / wYw / ooY | wwY / www / YYY | www→www / wYw→YwY / owo→wwY |

C1 and C6 are excluded on s50l by amendment A1 (their slots carry a Live block); 12 callback pairs, not 18.

## What this does not show

- n is small: the bar sat exactly at +8, and a single wrong answer decided the verdict; another draw could read
  either way on either clause.
- About half of s50l repeats s50m's transcript window (amendment item 15; S1Q04F and S1Q06F identical except the
  preview), so the pooled gain partly measures reproducibility, not fresh material.
- The graders auto-load the project memory, which names this experiment, Thursday's +3 and the bar (the same
  exposure Thursday's graders had).
- The filter chain is the pre-cue snapshot (d8fee6ca0170), as Thursday; not today's build.
- Nothing here is a live run: captured prompts replayed, no holdout40 item.
