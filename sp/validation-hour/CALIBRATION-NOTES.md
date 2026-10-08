# Calibration notes for PREREGISTER-h40d.md, revision 2 and revision 3 (2026-10-01, before any h40d data exists)

Every number revision 2 quotes as "h40c's own", "br1's" or "the hold's" comes from `h40d-clocks.mjs` (revision 2, this
folder); every thinking-token number from `h40d-thoughts-noise.mjs` (this folder). Both read files only and print
numbers, ids and timestamps: never an answer, never a prompt. `run-calibrations.mjs` runs every case below and writes
`clocks.cal-r2.out.txt` and `thoughts-noise.out.txt`, from which these lines are copied. The percentile method is the
registered one: the element at index `min(n-1, floor(n*p))` of the ascending list. No API call, no build, no test suite
was run. The reviewer's read-only scripts in `review-scratch\` were re-run for §5; their outputs are quoted there.

**Revision 3 (2026-10-01, about 09:30, after the Opus re-check `RECHECK-r2.md`)** added: §1 item 7 (the 05:00 re-smoke, the
combined build's first run); §2's INCOMPLETE case (re-check N6: `h40d-thoughts-noise.mjs` edited to print 2c's
INCOMPLETE, then every case re-run — the earlier cases reproduce exactly, only the holes line's wording changed); §3's
hold-read on the 05:00 re-smoke (GONE); §6 (rule 1(g), re-check N1: `knowledge-mode-read.mjs` and
`h40d-knowledge-lines.mjs`, outputs in `knowledge-mode.out.txt`). `run-calibrations.mjs` now runs all of it; its three
outputs were re-written on 2026-10-01 09:27 and the clocks and thinking-token outputs diff against the re-checker's
copies (`recheck-scratch\*.recheck.txt`) only in the added cases and that one wording.

## 1. The clocks script (`h40d-clocks.mjs`, revision 2)

What changed from the draft's version: each `--list` row carries the window's dispatch and won-by ISO timestamps
and its 2d status (M3); the gap G and the identity screen = G + model + C are printed (I1); rule 2d is computed per
window as both terms, their union and the UNRESOLVED windows, each named by dispatch time (M4); `--whole-log` applies
rule 2d to the whole debug log, readiness probe included.

1. **h40c** (`MAIN\electron\test\golden\interview60.runs\2026-09-29T11-42-00-h40c`) — the screen clock must reproduce
   h40c's registered rule-2 reading (median 4.1 s, p90 6.498 s over 45 windows); G must be about half a second (the
   review's `gap-g.mjs`: 504 / 635 / 786 ms); 2d must read 0. It does:

```
run: 2026-09-29T11-42-00-h40c
answer-dispatch windows: 45; with a won-by line: 45; winners: {"gemini-3.5-flash-lite":44,"gemini-3.1-flash-lite":1}
rule 2d: charged windows 0 = union of term 1 (h40c's definition) 0 and term 2 (last [Answer] full: is failure text) 0; UNRESOLVED windows 0 (a won-by line, no [Answer] full: line, not superseded); windows with no [Answer] full: line at all 0, of which superseded 0
rule 2d reading: PASS (0 charged, 0 unresolved)
screen clock (diag first token N ms, all lines in the window, h40c's method): n=45 median=4.100s p90=6.498s max=10.514s
model clock (won-by at N ms, last won-by per window): n=45 median=3.499s p90=6.052s max=9.961s
gap G (hedge t0 - screen-clock t0: the knowledge step before the hedge starts): n=45 median=0.504s p90=0.635s max=0.786s
dispatch line -> screen-clock t0: n=45 median=0.004s p90=0.007s max=0.012s
dispatch line -> won-by line: n=45 median=4.101s p90=6.500s max=10.512s
cue cost C (won-by line -> first token line): n=45 median=0.002s p90=0.003s max=0.026s  (windows with no first-token line after their won-by: 0)
identity check, per window: screen N - (G + model N + C) = 0 ms at most (0 by construction)
cues line -> first token line: n/a (no non-empty cues line)
```

   The first `--list` rows (the join for 3d reads these timestamps beside the judge pairs' `dispatchedAt`):

```
  # 1 answer    dispatched=2026-09-29T10:36:17.230Z won-by=2026-09-29T10:36:20.865Z gemini-3.5-flash-lite  at=3152 disp->won=3635 G=478 C=2 cues->ft=- ft=3632 2d=-
  # 2 answer    dispatched=2026-09-29T10:37:25.169Z won-by=2026-09-29T10:37:31.174Z gemini-3.5-flash-lite  at=5530 disp->won=6005 G=469 C=3 cues->ft=- ft=6002 2d=-
  # 3 answer    dispatched=2026-09-29T10:39:59.265Z won-by=2026-09-29T10:40:02.874Z gemini-3.5-flash-lite  at=3130 disp->won=3609 G=474 C=2 cues->ft=- ft=3606 2d=-
```

2. **br1** (`…\interview60.runs\2026-09-30T11-45-30-br1`, MAIN 0ef42a0, the same hedge code the next day, scenario50
   S1+S2 — another roster, words p50 85) — its TTFT p90 row read 11.1 s in its result note, reproduced here:

```
run: 2026-09-30T11-45-30-br1
answer-dispatch windows: 40; with a won-by line: 40; winners: {"gemini-3.5-flash-lite":38,"gemini-3.1-flash-lite":2}
rule 2d: charged windows 0 = union of term 1 (h40c's definition) 0 and term 2 (last [Answer] full: is failure text) 0; UNRESOLVED windows 0 (a won-by line, no [Answer] full: line, not superseded); windows with no [Answer] full: line at all 0, of which superseded 0
screen clock (diag first token N ms, all lines in the window, h40c's method): n=40 median=4.621s p90=11.148s max=20.417s
model clock (won-by at N ms, last won-by per window): n=40 median=4.105s p90=10.661s max=19.985s
gap G (hedge t0 - screen-clock t0: the knowledge step before the hedge starts): n=40 median=0.501s p90=0.555s max=1.219s
dispatch line -> screen-clock t0: n=40 median=0.005s p90=0.006s max=0.021s
dispatch line -> won-by line: n=40 median=4.624s p90=11.150s max=20.420s
cue cost C (won-by line -> first token line): n=40 median=0.002s p90=0.003s max=0.006s  (windows with no first-token line after their won-by: 0)
```

3. **The 16:12 cue re-smoke** (`WT\electron\test\golden\interview60.runs\2026-09-30T13-46-52-cuesmoke`, build e3fae5f,
   the v2 build WITH the display hold) — the cue cost must sit near hold-read.mjs's 218.5 ms median (its result note);
   it does (this script slices to the run window, so the readiness probe's two answers are left out: n 20/21, not 22).
   G's max of 6.879 s is one window, #10 (dispatch → won-by 11.931 s with the model clock at 5.035 s: a stall before the
   hedge started), and its C of 1.170 s is the same window:

```
run: 2026-09-30T13-46-52-cuesmoke
answer-dispatch windows: 22; with a won-by line: 21; winners: {"gemini-3.5-flash-lite":21}
rule 2d: charged windows 0 = union of term 1 (h40c's definition) 0 and term 2 (last [Answer] full: is failure text) 0; UNRESOLVED windows 0 (a won-by line, no [Answer] full: line, not superseded); windows with no [Answer] full: line at all 1, of which superseded 1
screen clock (diag first token N ms, all lines in the window, h40c's method): n=21 median=5.313s p90=6.411s max=13.084s
model clock (won-by at N ms, last won-by per window): n=21 median=4.594s p90=5.035s max=5.649s
gap G (hedge t0 - screen-clock t0: the knowledge step before the hedge starts): n=20 median=0.674s p90=1.165s max=6.879s
dispatch line -> screen-clock t0: n=20 median=0.011s p90=0.017s max=0.026s
dispatch line -> won-by line: n=21 median=5.061s p90=5.886s max=11.931s
cue cost C (won-by line -> first token line): n=20 median=0.217s p90=0.717s max=1.170s  (windows with no first-token line after their won-by: 1)
cues line -> first token line: n=20 median=0.004s p90=0.008s max=0.009s
```

   Under revision 2's rule 2, this run reads: 2a breach (5.313 > 5.100), 2b PASS (0.217 ≤ 0.350, 0.717 ≤ 1.200), 2c
   not applicable → NO LATENCY VERDICT on the provider reading, with the model clock 4.594 s above 4.499 s and G
   0.674 s above h40c's 0.504 s as the explanation; 2e alone catches the hold (NOT GONE: n 21, R2 under 15 ms in 15, B
   in 16, per `hold-read.resmoke.v3.out.txt`).

   Its `--list` rows (the superseded window #2 has no won-by line; #3 is the supersede that replaced it):

```
  # 1 answer    dispatched=2026-09-30T13:12:32.086Z won-by=2026-09-30T13:12:36.777Z gemini-3.5-flash-lite  at=4673 disp->won=4691 G=8 C=15 cues->ft=2 ft=4696 2d=-
  # 2 answer    dispatched=2026-09-30T13:13:39.132Z won-by=- none                   at=- disp->won=- G=- C=- cues->ft=- ft=- 2d=superseded
  # 3 supersede dispatched=2026-09-30T13:13:39.850Z won-by=2026-09-30T13:13:45.256Z gemini-3.5-flash-lite  at=5239 disp->won=5406 G=- C=- cues->ft=- ft=- 2d=-
  # 4 answer    dispatched=2026-09-30T13:15:05.322Z won-by=2026-09-30T13:15:10.915Z gemini-3.5-flash-lite  at=4977 disp->won=5593 G=603 C=217 cues->ft=8 ft=5797 2d=-
  …
  #10 answer    dispatched=2026-09-30T13:24:41.743Z won-by=2026-09-30T13:24:53.674Z gemini-3.5-flash-lite  at=5035 disp->won=11931 G=6879 C=1170 cues->ft=4 ft=13084 2d=-
```

4. **The 05:00 v1 smoke** (`2026-09-30T02-38-22-cuesmoke`, no hedge, 3.1-lite LOW) has no `won by` lines, so the model
   clock, G and C are n/a there; its screen clock reads median 5.025 s, p90 6.448 s (n 20). Its `[Answer] cues:` lines
   did not match this script's cues regex (v1's line shape was not checked); the cues → first-token read is calibrated
   on the 16:12 run only and is reported, never gated.

5. **Rule 2d on the three synthetic fixtures** (h40c's own, `SP\h40c-stats-cal-r2-failure`, `-r2-delivered`,
   `-r2-unresolved`; each a startup line and one or two dispatch windows with known answers): charged 1 / 0 / 0,
   UNRESOLVED 0 / 0 / 1, as required:

```
run: h40c-stats-cal-r2-failure
rule 2d: charged windows 1 = union of term 1 (h40c's definition) 1 and term 2 (last [Answer] full: is failure text) 1; UNRESOLVED windows 0 …
  2d charged:    window #1 dispatched 2026-09-26T18:00:10.000Z (answer); term 1: charged (failure line, won-by, failure text); term 2: failure text; won-by lines in the window: 1+, failure lines: 1
rule 2d reading: FAIL (charged >= 1)

run: h40c-stats-cal-r2-delivered
rule 2d: charged windows 0 = union of term 1 (h40c's definition) 0 and term 2 (last [Answer] full: is failure text) 0; UNRESOLVED windows 0 …; windows with no [Answer] full: line at all 1, of which superseded 1
rule 2d reading: PASS (0 charged, 0 unresolved)

run: h40c-stats-cal-r2-unresolved
rule 2d: charged windows 0 = union of term 1 (h40c's definition) 0 and term 2 (last [Answer] full: is failure text) 0; UNRESOLVED windows 1 (a won-by line, no [Answer] full: line, not superseded); windows with no [Answer] full: line at all 2, of which superseded 1
  2d UNRESOLVED: window #2 dispatched 2026-09-26T18:02:00.450Z (supersede); won by gemini-3.1-flash-lite at 2100 ms; no [Answer] full: line; failure lines: 1
rule 2d reading: INCOMPLETE (an unresolved window, nothing charged)
```

   The `r2-delivered` fixture's first window (a `dispatch: answer` replaced by a `dispatch: supersede` 450 ms later,
   no won-by, no full line) is correctly read as superseded, not UNRESOLVED.

6. **Rule 2d on the whole log (`--whole-log`)** — the one real block-only answer known (the 16:12 run's readiness
   probe: a won-by line, no failure line, the substitute) must be charged by term 2 alone, and h40c's whole log (47
   windows, the probe's two answers included) must read 0:

```
run: 2026-09-30T13-46-52-cuesmoke (WHOLE LOG, readiness probe included; rule 2d only)
answer-dispatch windows: 24; with a won-by line: 23; winners: {"gemini-3.5-flash-lite":23}
rule 2d: charged windows 1 = union of term 1 (h40c's definition) 0 and term 2 (last [Answer] full: is failure text) 1; UNRESOLVED windows 0 …
  2d charged:    window #2 dispatched 2026-09-30T13:12:04.732Z (answer); term 1: none; term 2: failure text; won-by lines in the window: 1+, failure lines: 0
rule 2d reading: FAIL (charged >= 1)

run: 2026-09-29T11-42-00-h40c (WHOLE LOG, readiness probe included; rule 2d only)
answer-dispatch windows: 47; with a won-by line: 47; winners: {"gemini-3.5-flash-lite":46,"gemini-3.1-flash-lite":1}
rule 2d: charged windows 0 = union of term 1 (h40c's definition) 0 and term 2 (last [Answer] full: is failure text) 0; UNRESOLVED windows 0 …
rule 2d reading: PASS (0 charged, 0 unresolved)
```

7. **The 05:00 re-smoke (revision 3)** — `WT\…\interview60.runs\2026-10-01T02-37-41-cuesmoke`, the COMBINED build
   (early close + offers fix, the dist that flies; filter sha `42d9bc42dbd17870`), scenario50 S1, hedge on: the first
   run of that build, so the first reading of its clocks (the re-check's residual risk asked for G beside br1's). G's
   median sits 0.093 s above br1's 0.501 s (under the re-check's 0.1 s line); C reads 0.052 / 0.192 s, where the hold
   read 0.217 / 0.717 s; 2d reads 0 in the run window and in the whole log. Row 1 of `--list` (the run's first window)
   reads G = 2 ms: no knowledge step ran on that window (and no `Intent classified` line, §6); the 16:12 run's first
   run window read G = 8 ms the same way. Rows 2–4 read G 592 / 1147 / 510 ms.

```
run: 2026-10-01T02-37-41-cuesmoke
answer-dispatch windows: 20; with a won-by line: 20; winners: {"gemini-3.5-flash-lite":20}
rule 2d: charged windows 0 = union of term 1 (h40c's definition) 0 and term 2 (last [Answer] full: is failure text) 0; UNRESOLVED windows 0 …
rule 2d reading: PASS (0 charged, 0 unresolved)
screen clock (diag first token N ms, all lines in the window, h40c's method): n=20 median=4.742s p90=5.770s max=5.999s
model clock (won-by at N ms, last won-by per window): n=20 median=4.232s p90=5.162s max=5.379s
gap G (hedge t0 - screen-clock t0: the knowledge step before the hedge starts): n=20 median=0.594s p90=1.112s max=1.147s
dispatch line -> screen-clock t0: n=20 median=0.009s p90=0.018s max=0.020s
dispatch line -> won-by line: n=20 median=4.656s p90=5.719s max=6.000s
cue cost C (won-by line -> first token line): n=20 median=0.052s p90=0.192s max=0.193s  (windows with no first-token line after their won-by: 0)
identity check, per window: screen N - (G + model N + C) = 0 ms at most (0 by construction)
cues line -> first token line: n=20 median=0.002s p90=0.007s max=0.091s

run: 2026-10-01T02-37-41-cuesmoke (WHOLE LOG, readiness probe included; rule 2d only)
answer-dispatch windows: 22; with a won-by line: 22; winners: {"gemini-3.5-flash-lite":22}
rule 2d reading: PASS (0 charged, 0 unresolved)

  # 1 answer    dispatched=2026-10-01T02:03:21.006Z won-by=2026-10-01T02:03:25.264Z gemini-3.5-flash-lite  at=4244 disp->won=4258 G=2 C=7 cues->ft=2 ft=4253 2d=-
  # 2 answer    dispatched=2026-10-01T02:04:29.648Z won-by=2026-10-01T02:04:34.228Z gemini-3.5-flash-lite  at=3970 disp->won=4580 G=592 C=46 cues->ft=1 ft=4608 2d=-
```

   Under revision 3's rule 2 this run reads: 2a 4.742 ≤ 5.100 PASS (another roster), 2b 0.052 / 0.192 PASS, 2d PASS;
   2c not applicable (no no-cue twins on a smoke); 2e GONE (§3).

## 2. The thinking-token script (`h40d-thoughts-noise.mjs`) — rule 2c's provenance

Per hour, the 3.5-lite HIGH `captured-high` reps (the same bytes three times in one hour; `thoughts` =
`usageMetadata.thoughtsTokenCount`). "one rep against the other two pooled" = |median(rep) − median(the other two
reps pooled)|, the noise the 2c statistic (pooled-3 against pooled-3) is bounded by. Theil–Sen = the median of
pairwise slopes of ttft on thoughts, pooled over the reps.

| hour | roster, day | n per rep | rep medians (tokens) | spread | one vs two, max | pooled median | Theil–Sen ms/token (stalls > 10 s excluded) | ttft pooled p50 (ms) |
|---|---|---|---|---|---|---|---|---|
| s50k | scenario50, Sun 20 Sep | 39 / 39 / 39 | 874 / 897 / 905 | 31 | 31 | 895 | 2.90 | 3851 |
| s50l | scenario50, Mon 21 Sep | 39 / 39 / 38 | 849 / 890 / 887 | 41 | 38 | 882 | 2.81 | 3855 |
| s50m | scenario50, Tue 22 Sep | 39 / 38 / 39 | 911 / 892 / 899 | 19 | 13 | 900 | 2.75 | 3858 |
| h40a | holdout40, Thu 24 Sep (noise only) | 44 / 44 / 44 | 735 / 765 / 744 | 30 | 30 | 749 | 3.77 | 3531 |
| h40b | holdout40, Sat 26 Sep, loaded (noise only) | 44 / 44 / 44 | 751 / 705 / 783 | 78 | 67 | 758 | 2.94 | 4027 |
| h40c | holdout40, Tue 29 Sep (noise only) | 44 / 44 / 44 | 723 / 748 / 750 | 27 | 25 | 744 | 3.29 | 3355 |

- Scenario50, the preferred noise estimate: the largest one-rep-versus-two difference is 38 tokens (s50l); the
  largest rep-to-rep spread 41; the pooled medians of three different days sit within 18 tokens (895, 882, 900) while
  their TTFT medians sit within 7 ms (calm mornings). Holdout, measurement noise only: 30 / 67 / 25, the 67 on h40b's
  loaded afternoon, where TTFT medians moved by 0.99 s between adjacent reps (`review-scratch/arm-ttft.mjs`: 3943 /
  4882 / 3888 ms). Thinking tokens do not move with load; TTFT does.
- The threshold 150 = about 4 × 38 (scenario50), more than 2 × 67 (the worst holdout split), about 0.44 s at the
  median Theil–Sen slope of 2.9 ms per token (2.75–3.77 across the six hours; the review's 2.4–4.3 per rep, re-derived
  pooled and with stalls excluded).
- Empty prose without a transient error exists on no-cue answers: s50l `captured-high-r3` S1Q06, s50m
  `captured-high-r2` S2Q06 (printed by the script as `empty prose 1 [S1Q06]` and `[S2Q06]`); a true hole: h40c
  `captured-low-r3` R10 (the review's `arm-ttft.mjs`: `holes=1`). Every answered id on these six hours carries a finite
  `thoughts` (`no thoughts 0` in every rep).

The 2c computation's calibration on h40c (the cue family named as its own control; `thoughts-noise.out.txt`):

```
CALIBRATION: h40c, cue = control (same files) -> difference 0, PASS
rule 2c: thoughts coverage cue 132/132 control 132/132 -> thinking tokens decide
rule 2c: cue pooled median thoughts - control pooled median thoughts = 0 tokens (threshold +150); p90 difference 0 (reported)
rule 2c: cue pooled median ttft - control pooled median ttft = 0 ms (fallback threshold +1000; the 0.5 s line is reported: within); p90 difference 0 ms (reported)
rule 2c reading: PASS
CALIBRATION: h40c, cue = control + 200 tokens -> FAIL
rule 2c: cue pooled median thoughts - control pooled median thoughts = 200 tokens (threshold +150); p90 difference 200 (reported)
rule 2c reading: FAIL  [CALIBRATION RUN, not a reading]
CALIBRATION: h40c, cue = control + 150 tokens -> PASS at the boundary
rule 2c reading: PASS  [CALIBRATION RUN, not a reading]
CALIBRATION: h40c, cue = control + 151 tokens -> FAIL
rule 2c reading: FAIL  [CALIBRATION RUN, not a reading]
CALIBRATION: h40c, --exclude R10,R20 -> answered 42 per rep (was 44) on both sides; PASS
CALIBRATION: h40c, the control family absent -> "no answers file", no 2c reading
CALIBRATION: --control-dir (h40c's captured-high against h40b's, read from h40b's folder) -> -14 tokens, PASS (exercises the option; different bytes)
```

A bug the calibration caught (rule 8): the script's first version reused the cue object as the control when the two
tags were equal, so the +200 case read 0 tokens and PASS. Fixed (the control is always read afresh, without the
offset) before any real reading; the outputs above are from the fixed version.

**Revision 3 (re-check N6): the script never printed 2c's INCOMPLETE.** Rule 2c says a rep with more than 3 true
holes on either side makes 2c INCOMPLETE; the revision-2 verdict line was PASS or FAIL whatever the holes, and its
own holes line said "makes 3c INCOMPLETE; 2c is read on the ids answered". Edited (two lines, the re-check's N6-a and
N6-b verbatim; the revision-2 file is kept as `r3-scratch\h40d-thoughts-noise.r2-backup.mjs`) and calibrated on the
re-check's real case — s50e's single-rep `gemini-3.7-flash` arm named as both sides, 4 holes of 5 ids — which must read
INCOMPLETE, while h40c (0 holes) must still read PASS. Both do; every earlier case above reproduces unchanged:

```
CALIBRATION (re-check N6): s50e's single-rep gemini-3.7-flash arm as both sides, 4 holes of 5 -> INCOMPLETE
  -r1 interview60.answers.gemini-3.7-flash.json: answered 1, holes 4 [S1Q02 S1Q06 S2Q07 S2Q10], empty prose 0, no thoughts 1; …
rule 2c reading: INCOMPLETE (more than 3 true holes: cue -r1 (4), control -r1 (4))
rule 2c holes: cue 4, control 4 (a rep with more than 3 true holes makes 2c and 3c INCOMPLETE; otherwise 2c is read on the ids answered); …
CALIBRATION: h40c, cue = control (same files) -> difference 0, PASS   (unchanged: rule 2c reading: PASS)
```

The unedited script on the same s50e case read `rule 2c reading: PASS (fallback)` (`recheck-scratch\test-n6-edit.mjs`).

## 3. hold-read on the no-hold hours (rule 2e's known no-hold cases)

`node SP\cue-group\hold-read.mjs <run-dir>` (2026-10-01, this session; summary lines only):

```
run 2026-09-29T11-42-00-h40c  window 2026-09-29T10:34:08.567Z .. 2026-09-29T11:41:56.783Z
lines: cues 0 (empty 0), budget 47, won-by 47; diag: invoked 47, first token 47, word budget 47
T   won by -> budget          : n 47, under 15 ms 3, median 156 ms, p90 337 ms, min 8 ms, max 693 ms, unpaired 0
C   won by -> first token     : n 47, under 15 ms 45, median 2 ms, p90 3 ms, min 1 ms, max 26 ms, unpaired 0
B   first token -> word budget: n 47, under 15 ms 3, median 156 ms, p90 313 ms, min 6 ms, max 690 ms, unpaired 0
HOLD NO VERDICT (0 counted answer(s), under 12)        <- no cue block on h40c: nothing to count, as expected

run 2026-09-30T11-45-30-br1  window 2026-09-30T10:31:55.367Z .. 2026-09-30T11:45:30.146Z
T   won by -> budget          : n 42, under 15 ms 0, median 197.5 ms, p90 432 ms, min 29 ms, max 723 ms, unpaired 0
C   won by -> first token     : n 42, under 15 ms 42, median 2 ms, p90 4 ms, min 1 ms, max 13 ms, unpaired 0
B   first token -> word budget: n 42, under 15 ms 0, median 196 ms, p90 431 ms, min 27 ms, max 720 ms, unpaired 0
HOLD NO VERDICT (0 counted answer(s), under 12)
```

On holdout40 the whole stream after the first token (B) is under 15 ms in 3 of 47 answers with a median of 156 ms:
a correct early close should read GONE comfortably there. hold-read reads the whole debug log (47 answers on h40c:
45 in the run window plus the probe's two).

**Revision 3: the 05:00 re-smoke (the combined build) reads GONE** (`cue-group\hold-read.resmoke2.out.txt`, re-run
on 2026-10-01 09:10 with the same lines), which decides 2e's branch: GATED on h40d.

```
run 2026-10-01T02-37-41-cuesmoke  window 2026-10-01T02:01:12.480Z .. 2026-10-01T02:37:39.234Z
lines: cues 22 (empty 0), budget 22, won-by 22; diag: invoked 22, first token 22, word budget 22
R2  cues -> budget            : n 22, under 15 ms 0, median 343.5 ms, p90 673 ms, min 35 ms, max 753 ms, unpaired 0
T   won by -> budget          : n 22, under 15 ms 0, median 370 ms, p90 763 ms, min 40 ms, max 858 ms, unpaired 0
C   won by -> first token     : n 22, under 15 ms 4, median 50 ms, p90 192 ms, min 7 ms, max 324 ms, unpaired 0
B   first token -> word budget: n 22, under 15 ms 0, median 332 ms, p90 667 ms, min 33 ms, max 752 ms, unpaired 0
the hold, by the early-close expectation: counted answers (won-by, a non-empty block, words, stream >= 50 ms) n 21; R2 under 15 ms 0; B under 15 ms 0
HOLD GONE (R2 and B both at most a quarter)
```

## 4. What was NOT calibrated

- (Done in revision 3: the screen clock, model clock, G and C on a run of the COMBINED build — §1 item 7, the 05:00
  re-smoke; its lines are in revision 3's §3 and §11.)
- The cue twins' thinking tokens against the no-cue twins' (rule 2c) on real cue-vs-no-cue files: no such pair exists
  yet. The first is Thursday's bench (cue reps on s50m's bytes against s50m's `captured-high` of 2026-09-22, read with
  `--control-dir`), whose difference goes into "What flies". The tag naming of the bench's cue files must be checked
  against the script's `interview60.answers.<tag>[-r2|-r3].json` pattern on the day.
- `h40d-twins.mjs`, `h40d-rule3.mjs`, `guard-h40d.mjs`, the launchers, the register and precheck scripts, the merge
  script, the dispatch text, `h40d-grader-models.mjs` and `h40d-hascuerule-check.mjs` do not exist yet; §7.4 and §7.6 of
  the pre-registration state what each must do and its known cases, to be built and checked on Thursday.
- The 2d reading on a window that is charged by term 1 alone (a failure line and no won-by, or a resolved-ambiguous
  window): h40c's own `h40c-stats-cal-void-*`, `-ni1-*` and `-r6-*` fixtures were not re-run here; the h40c stats script
  remains the cross-check on term 1 after the hour.

## 5. The reviewer's scripts, re-run (numbers used by C1, C2, M2)

`review-scratch/twin-wrongs.mjs` on h40a / h40b / h40c (acc = acceptable; wrong(verdict) = the judge's `verdictOf`;
corr0 = correctness 0; gated = on the 40 ids outside R02F R04F R09F R11F R13F):

```
h40a  captured-low r1/r2/r3   acc 41/39/39  wrong(verdict) 0/0/0  corr0 0/0/0  gatedWrong 0/0/0
h40a  captured-high r1/r2/r3  acc 37/42/38  wrong(verdict) 0/0/0  corr0 0/0/0  gatedWrong 0/0/0
h40a  in-app                  acc 39 of 45 answers  wrong R02F R09            gatedWrong 1 (R09)
h40b  captured-low r1/r2/r3   acc 40/40/38  wrong(verdict) 1/0/3 [R11F | - | R08 R09F R11F]  corr0 0/0/2  gatedWrong 0/0/1
h40b  captured-high r1/r2/r3  acc 38/36/39  wrong(verdict) 3/1/2 [R02F R09F R11F | R09F | R09F R11F]  corr0 2/1/1  gatedWrong 0/0/0
h40b  in-app                  acc 35 of 43 answers  wrong R09F R11F           gatedWrong 0
h40c  captured-low r1/r2/r3   acc 37/37/36  wrong(verdict) 2/1/2 [R08 R11F | R11F | R09F R11F]  corr0 1/0/1  gatedWrong 1/0/0 (R08)
h40c  captured-high r1/r2/r3  acc 36/37/38  wrong(verdict) 1/0/2 [R09F | - | R02F R09F]  corr0 1/0/2  gatedWrong 0/0/0
h40c  in-app                  acc 36 of 45 answers (35 items; R18 twice)  wrong R09F   gatedWrong 0
```

`review-scratch/mains-band.mjs` (in-app acceptable mains against each twin's, on the mains the hour captured):

```
h40a: mains captured 32; in-app 29;  captured-low 29/30/28;  captured-high 27/31/28
h40b: mains captured 32; in-app 27;  captured-low 30/29/30;  captured-high 29/28/30
h40c: mains captured 32; in-app 28;  captured-low 27/28/28;  captured-high 28/29/30
```

`review-scratch/wrong-clause-null.mjs`: P(STOP | no cue effect) = 30.1% (verdict-wrong, all ids), 21.0% (correctness
0, all ids), 0.0% (the 40 gated ids, nine reps all 0).

`recheck-scratch/gated-null.mjs` (re-run 2026-10-01 09:10 for revision 3's 3c wrong clause; the re-checker's figures
reproduce): the strict per-rep clause ("clause A", revision 2) stops a no-effect hour 2.9 / 5.5 / 12.3 / 20.2 / 27.7% at
a per-rep chance of a gated wrong of 1 / 2 / 5 / 10 / 20%; the sums with a margin of one ("clause B", revision 3's
default) 0.0 / 0.2 / 0.9 / 3.1 / 8.5%; nine zero reps bound the per-rep chance at 28.3% (95%); clause A's expected null
STOP is 14.4% (uniform prior) or 9.0% (Jeffreys).

## 6. Knowledge mode, rule 1(g) (revision 3, re-check N1) — `knowledge-mode.out.txt`

Two instruments, both new, both read files only and print paths, sizes, mtimes, counts, indices and timestamps.

- **`knowledge-mode-read.mjs`** reads the persisted Context toggle (`knowledgeMode` in `%APPDATA%\natively\settings.json`,
  `SettingsManager.ts:28`; non-secret boot toggles only, `SettingsManager.ts:6`) without starting the app, from the
  direct path (an MSIX shadow inside a Claude session, memory `claude-sandbox-appdata`) AND the admin share
  `\\localhost\C$\…` (the real file); the admin-share line decides. On 2026-10-01 the two files differed (shadow 323
  bytes, mtime 2026-07-02, 10 keys; real 151 bytes, mtime 2026-09-12, 5 keys) and both read `knowledgeMode = ON`.
  Calibrated on stubs in `kmode-stubs\`: true → ON (exit 0); false → NOT ON (exit 1); the key absent → NOT ON (exit 1:
  `main.ts:687` restores nothing); unparsable → UNREADABLE (exit 2); a missing file → UNREADABLE (exit 2).
- **`h40d-knowledge-lines.mjs`** reads the hour's debug log: the `ENABLED` / `DISABLED` lines placed before, inside or
  after the run window (the timeline's byte slice, as `h40d-clocks.mjs` reads it), and every dispatch window's
  `Intent classified` count on the whole log. Readings: h40c 47 of 47 → OK; br1 42 of 42 → OK; the 16:12 cue smoke
  23 of 24 → OK (95.8%); the 05:00 re-smoke 21 of 22 → OK (95.5%) — in both smokes the one window without the line is
  the first of the run proper (window #3 of the whole log), where the clocks script reads G 8 ms and 2 ms: the
  knowledge step did not run on that window (cause unproven; h40c and br1 never skip it). Fixtures in
  `kmode-fixtures\` (synthetic logs in the app's line shape, `make-fixtures.mjs`): every window classified → OK; 1 of
  20 missing (95.0%) → OK at the boundary; 3 of 20 missing (85%) → VOID; a `DISABLED` line inside the window → VOID;
  no `ENABLED` line → VOID.

```
run: 2026-10-01T02-37-41-cuesmoke  (run window: interview60.timeline.json bytes 36799..463800)
knowledge-mode lines: restored-from-settings 1; ENABLED before/inside/after the run window 1/0/0; DISABLED 0/0/0
dispatch windows (whole log): 22 (2 before the run window, 20 inside, 0 after); with an Intent classified line 21 (95.5%)
  window #3 answer dispatched 2026-10-01T02:03:21.006Z (inside the run window): NO Intent classified line — read its G in h40d-clocks.mjs --list
rule 1(g) reading: OK (last toggle before the run window ENABLED, no DISABLED inside, Intent classified on 21 of 22 windows)
run: missing-3-of-20.log  (run window: the whole file)
rule 1(g) reading: VOID (Intent classified on 17 of 20 windows (85.0% < 95%))
run: disabled-inside.log  (run window: the whole file)
rule 1(g) reading: VOID (1 DISABLED line(s) inside the run window)
run: no-enabled.log  (run window: the whole file)
rule 1(g) reading: VOID (the last ENABLED/DISABLED line before the run window is none)
```
