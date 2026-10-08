# Result: flight eq — 2026-10-06T01-12-56-eq

**VERDICT: INCONCLUSIVE (§5 item 4).** 3a = +3 on 20 pairs, between FAIL ≤ +1 and PASS ≥ +4. No feature-attributable
FAIL, no VOID, no other FAIL, no INCOMPLETE. Every other gated clause PASSES. The registered consequence is **ONE re-fly
under this registration; a second INCONCLUSIVE = FAIL**. The flag stays OFF and holdout40 is not flown.

Written 2026-10-06 06:07–06:2x TST by `date` (Opus, result author). No model calls. Nothing written in MAIN. Applies
PREREGISTER-flight-eq.md (9ca3149b…2d14f44) with A1–A7 (shas as in the launcher's PASSES lines 3–10 and
ARMING-flight-eq.md), NOTE-controller-tools-2026-10-05, NOTE-b10-rev7-A1, NOTE-post-hour-tools-2026-10-06 (059aeda5) +
addendum (482d9829) + addendum-2, and USER-RULING-4c. Precedence A7 > … > A1 > the registration. Ids, counts, codes and
hashes only: no answer, question, prompt or cue text appears here.

## The hour

| | |
|---|---|
| Run | `2026-10-06T01-12-56-eq`, registered HEAD `56bda9eb64b6…` (launcher `SHA LINES HEAD`); ARMING sha256/12 `1b87f8d02bbc`; `ARMING COMPLETE 2026-10-06T00:16:54+03` |
| Task | T 03:00; precheck `PRECHECK ACCEPTED 2026-10-06T02:54:10+03`; `NIGHT GATES OK`; `GUARD OK`; `FLIGHT EXIT 0` 05:08:58 |
| Play window | startedAt 2026-10-06T00:04:13.437Z (03:04:13 local) → endedAt 01:12:55.930Z (68.7 min) |
| Window (A7.2) | IN: 2026-10-05T16:30:00Z ≤ 00:04:13.437Z ≤ 2026-10-06T00:30:00Z. Read by direct comparison with A7.2's bounds; `window-eq.mjs`'s printed line is not among the inputs I read |
| Dist | before and after: EQ markers ×4 True, `THE COMBINED BUILD, every marker as expected`, `PARITY DIST … mismatches 0`, REF TESTS 47/47, `earlierQuestion.js` sha256/16 `56bfb8b11c522dd4`, `unchanged since the run started: yes`, `EQ PROOFS: ALL PASSED` |
| Flash arms | `FOCUSED off … skipping the 4 focused arms` (ruling 3) |
| Ears | Live `gemini-3.1-flash-live-preview` (no fallback), Deepgram STT |
| G sitting | 2026-10-06T02:39:47Z → 02:46:05Z (05:39–05:46 local), 16/16 steps exit 0, counterbalanced as A3.4; every front rep's two steps started 21–23 s apart (≤ 15 min) → **2c gates**; before 09:12 (A7.2 I3); ledger re-read: runner headroom 106 (3.5-lite) / 216 (3.1-lite) against bars 52 / 32; the controller's own count incl. harness calls ≥ 155 / ≥ 216 |
| Grader | `claude-opus-5-5` on every transcript: pilot + 14 per-arm + 6 blind = **21 launches**, each PINNED, memory ABSENT, audit clean (`dispatch=match`, `bash=[]`); probes 1–3 clean after the fix (deviation D3); merge 14 MERGED / 0 COPY-FAILED / 0 MERGE-FAILED, exit 0 |

## Rule 1 — mechanical eligibility: not VOID

| clause | bar | read | source |
|---|---|---|---|
| 1(a) startup lines | exactly on / hedge on 5000 ms / parent off | as registered | reader |
| 1(b) numeric `turn=` | ≥ 95 % of windows | 40/40 (100 %); `turn=none` 0; turn ids increasing | reader |
| 1(c) G\* exercised | ≥ 3 of 4 `gate=block` | **4 of 4** (G = G\* = {S1Q04F, S1Q06F, S2Q05F, S2Q08F}) | reader |
| 1(d) dist proofs + sha | both sets pass, sha unchanged | pass, unchanged | launcher log |
| 1(e) LABEL ↔ block | equal, no UNEXPLAINED | 4 = 4 EQUAL; all 4 blocks `cause=inserted`; 2 LABEL captures outside the window ignored | reader |
| 1(f) lost before dispatch | ≤ 2 | 0 of 40 | reader |
| 1(g) knowledge ON | ENABLED before, no DISABLED, Intent ≥ 95 % | ENABLED 1 (00:02:00Z, before the window), DISABLED 0, `Intent classified` 40 in 40 windows | **hand count**, deviation D7 |
| 1(h) 3.5-lite outage | < 50 % `back started … reason=front-error` | 0 of 42 hedge runs (11 back starts, all `reason=trigger`); won by 3.5-lite 39, 3.1-lite 3 | **hand count**, D7 |
| 1(i) STRAY | 0 | 0 (short 0) | reader |
| 1(j) precheck line | present | `PRECHECK ACCEPTED 2026-10-06T02:54:10+03` | launcher log |
| 1(k) sleep/restart T → endedAt | none | System log 02:55–04:15 local: 0 sleep/wake/boot/shutdown events (query calibrated: 117 such events in 30 days, incl. a restart 2026-10-05 21:09) | **hand read**, D7 (`power-events.ps1` never built) |

**Reported (rule 1):** `gate=` histogram block 4, no-cue 32, parent-in-prompt 4, parent-in-pinned 0, supersede 0,
no-parent 0, error 0, no-turn 0. `ms=` p50 0, p90 1, max 1 (n 40). Won-by 3.5-lite 39 of 42 (br1: 40 of 42). The Live
ear's dispatch share was not computed by any input.

## The clauses

| clause | registered bar | read | outcome |
|---|---|---|---|
| **2a** build time | p90 ≤ 50 ms | p90 1 ms, max 1 | **PASS** |
| **2b** thinking | paired median ≤ +150 (coverage ≥ 90 %) | +29; coverage 20/20 | **PASS** |
| **2c** TTFT | median ≤ +500 PASS, > +1000 FAIL; stalls block ≤ no-block + ceil(2·20/39) = +2; p90 block ≤ no-block + 2000 | median +90 ms; stalls 0 vs 0; p90 4493 vs 4617 ms | **PASS** (gates: sitting condition holds) |
| **2d** length | median ≤ +5 PASS, > +10 FAIL | +3 words | **PASS** |
| **3a** gain, front, G_twin | PASS ≥ ceil(0.20·20) = +4; FAIL ≤ max(floor(0.05·20), ceil(20/21)) = +1 | block 10 − no-block 7 = **+3 on 20 pairs** | **INCONCLUSIVE** |
| 3a back leg (reported) | decides only in 4b | block 7 − no-block 2 = +5 on 12 pairs | reported |
| **3b** live in-app on G | acceptable ≥ ceil(0.5·4) = 2 | 3 of 4 (S1Q06F, S2Q05F, S2Q08F; S1Q04F weak) | **PASS** |
| **4a** wrong in-app on G | 0 | 0 (0 doubles) | **PASS** |
| **4b** consensus wrong per leg | block ≤ no-block, front AND back | front 0 ≤ 0; back 0 ≤ 0 | **PASS** |
| **4c** off-topic, front (U1) | FAIL iff block − no-block ≥ +2 | 0 − 0 = +0 | **PASS** |
| **4d** mains untouched | no main with an inserted block | 0 mains `gate=block`; S1Q08, S2Q08 `parent-in-prompt` as expected | **PASS** |
| **4e** wrong in-app mains | 0 (other FAIL) | 0 of 20 | **PASS** |
| **5a** `gate=error` | 0 | 0 | **PASS** |
| **5b** referents | wrong referent + wrong answer = FAIL | 4/4 RIGHT (S1Q04F→S1Q04, S1Q06F→S1Q06, S2Q05F→S2Q05, S2Q08F→S2Q08) | **PASS** |
| **5d** b4 bytes (A3.1a) | TRANSCRIPT, BLOCK OK; no LABEL outside G | TRANSCRIPT OK 40/40, BLOCK OK 4/4, LABEL OUTSIDE --g NONE | **PASS** |
| 2e, 2f, 3c, 5c | reported | below | reported |

Holes: G sitting 0 (front 20/20, back 12/12 complete pairs); empty prose 0 on either side. Prices that applied
(A2.11, A3.3): 4b false-FAIL 13.7–23.8 %; 4c at U1's margin 12.6–27.5 % (20 pairs); 3b INCONCLUSIVE 17.9 % at the
replay's 0.6 per item. None was spent.

**Per-item G table, front (5 reps a side; Y = both graders acceptable, X = consensus wrong, o = both off-topic, w otherwise):**

| id | in-app | block r1–r5 | no-block r1–r5 | block / no-block acceptable | back block / no-block (r1–r3) |
|---|---|---|---|---|---|
| S1Q04F | weak | Y w w Y w | w w w w w | 2 / 0 | YYw / wwY = 2 / 1 |
| S1Q06F | acceptable | Y Y w Y Y | Y w w w w | 4 / 1 | YYY / www = 3 / 0 |
| S2Q05F | acceptable | w w w w w | Y Y w Y Y | **0 / 4** | Yww / wwY = 1 / 1 |
| S2Q08F | acceptable | Y Y Y Y w | Y w w Y w | 4 / 2 | Yww / www = 1 / 0 |

Three of four items move in the block's direction (+2, +3, +2); S2Q05F moves against it (−4) and alone holds the pooled
Δ under the PASS line. Either-grader counts, front: wrong 0 / 0, off-topic 0 / 0. The replay read +19 of 40 on these
four ids; this hour's live bytes read +3 of 20. The cause of S2Q05F's reversal is not diagnosed here (it needs the
hour's captured bytes, §5's "understood on the hour's own captured bytes"; no text was read for this note).

**S1Q04F in-app (3b's one miss), against its ten twins:** block 2 of 5, no-block 0 of 5 acceptable. A weak in-app draw
sits inside the item's own twin rate, so it reads as sampling, not a live-only defect (h40d appendix-B form, by counts).

## In-app and bare-arm grades (counts only; claude-opus-5-5; reported, never gating)

| arm | of | acceptable | weak | wrong | note |
|---|---|---|---|---|---|
| **in-app, mains** | 20 | **14** | 6 | 0 | quality bar 18 of 20, reported (s50m 18, s50l 19: Opus 5, direction only) |
| **in-app, follow-ups** | 20 | **16** | 4 | 0 | s50m 12, s50l 19 (Opus 5, direction only) |
| block twins `captured-high` r1/r2/r3, all ids | 40 | 31 / 31 / 31 | 9 / 9 / 9 | 0 / 0 / 0 | mains 15 / 16 / 14 (my count from the merge's per-id lines; `mains-band.mjs` was not run) |
| no-cue twins r1/r2/r3 | 40 | 32 / 31 / 33 | 7 / 9 / 7 | 1 / 0 / 0 | |
| back twins `captured-low` r1/r2/r3 | 40 | 30 / 29 / 23 | 10 / 9 / 17 | 0 / 2 / 0 | |
| `high` (3.5-lite HIGH, scripted, mains) | 20 | 16 | 4 | 0 | |
| `low` (3.1-lite LOW, scripted, mains) | 20 | 15 | 5 | 0 | |
| bare `gemini-3.1-flash-lite` (untagged) | 20 | 10 | 9 | 1 | |
| bare `gemini-3.5-flash-lite` (untagged) | 16 graded | 4 | 11 | 1 | 4 of 20 records carry raw output but 0 spoken words (S1Q03, S1Q05, S2Q02, S2Q03; finish STOP; thoughts 0) and were not exported to the grader; under h40d's rule an empty prose counts wrong, so this arm reads 4 acceptable of 20 at best; cause not investigated |

**Rule 3c (reported):** the six cue-silent evicted follow-ups 4 of 6 acceptable (S1Q05F, S2Q06F weak; S1Q07F, S1Q08F,
S2Q04F, S2Q07F acceptable); the four cue-fired-parent-present ids all read `parent-in-prompt` (no block, as required),
3 of 4 acceptable (S2Q01F weak); the ten parent-present follow-ups 9 of 10.

**What the grades show:**
- In-app quality is sound on correctness: 0 wrong in 40, and 0 wrong in every 3.5-lite captured arm except one no-cue
  draw.
- In-app mains (14) sit at the bottom of the block twins' mains band [14, 16] and under the 18-of-20 bar. The mains'
  prompts are flag-off bytes (4d: 0 blocks), so by §4 4d this is the hedge's and the provider's, not the feature's.
- The scripted 3.5-lite HIGH arm (16 of 20) beats in-app (14), as on earlier hours. The untagged bare pair is far
  weaker (10 of 20; 4 of 16 graded): the standing rule's arms, kept for the record.
- The back leg (3.1-lite LOW) is weaker and noisier than the front: 30 / 29 / 23 of 40, with the hour's only two
  captured-arm wrongs (r2: S1Q02, S2Q02). S1Q02 is also wrong on both untagged bare arms.

## 2e, 2f and 5c (reported)

- **2e clocks.** Pass record: TTFT p90 10.3 s, detect p50 −0.2 s. smoke-facts' diag first token: median 4899 ms, p90 11250,
  max 17467 (n 42) against br1's 4.621 / 11.148 / 20.417 s. The hedge won by 3.1-lite on 3 of 42 at median 13547 ms.
  Answer words p50 77, p90 106, max 137 (br1 85 / 123 / 144); over 150 words 0 of 41. The gate row's 10 s is crossed.
  The flight ran at 03:04 local, so time of day differs from br1 (A1.1, A7.2). `h40c-hedge-stats.mjs` was not run, and
  the G-windows-against-the-rest split and the knowledge-step clock are not reported.
- **2f.** `h40d-clocks.mjs` was not run, so the charged-failure and UNRESOLVED union is not reported. 2f's gating role
  is decided by the registered cue instruments: failed answers 0 (smoke-facts: `failed answer ids: none`;
  check-smoke-cues: `failed 0`). The pass record shows delivered 40/40 and 0 doubles. Every G item has a graded in-app
  answer, so 3b is not INCOMPLETE. Harness gate: lost utterances 3 (13 resolved within 5 s); Live reconnects 26.
- **5c reached:** `block` (4), `no-cue` (32), `parent-in-prompt` on the four expected ids. **NOT EXERCISED:**
  `parent-in-pinned`, `supersede`, `no-parent`, `error`, `turn=none`, a duplicate ledger entry (0 doubles), a
  never-dispatched parent, two questions in one turn, the R21 re-entry, chip / answer-now / manual paths, the > 450-char
  clip, the 76 s late echo, suggest/off mode, the junk-flag refusal (unit test only), the quick-follow-up regime (the
  smoke's).

## Deviations, and whether any moves a clause

| # | deviation | moves a clause? |
|---|---|---|
| D1 | **A2.5 blindness.** The controller read `interview60.report.md`'s gate table at 05:3x. That was before the instruments line, which was stamped 05:26:08, landed. The run folder was not closed as required. | No. The table holds harness-gate counts only (TTFT p90, lost utterances, the generic acceptable row), and no registered clause reads it. No instrument was edited after the read: every tool sha used matches its `instruments.sha256.txt` line. |
| D2 | **A7.3.** The window tools' lines (`window-eq` 3e6d307be61e, `guard-eq` 78907488180e, `gen-launchers-eq` 871327fbe0d4, `register-eq` f4d8f825d16f) went into `instruments.sha256.txt` late, at 05:26, instead of before step 10. | No. Each sha equals the one the arming record quotes from its 00:0x calibration, so the tools that guarded and judged the hour are the calibrated ones. |
| D3 | **Grader launcher fixed live.** The first `cwdprobe-1` read memory LOADED (claude-mem through user settings, claudeMem=5). `launch-grader-eq.mjs` moved 36a2198eea69 → **9b64492fe6fa** to add `--setting-sources project,local`, with its own instruments line and live-fix review. The failed folder was renamed to `failed-cwdprobe-1-a1-0547-claudemem` and the `cwdprobe-1-a1` name reused; both sessions are kept. **This hour's grader command therefore differs from h40d's.** | No same-hour clause. The fix is what makes memory ABSENT true (reg. §6), and every clause compares within this hour under one grader. Cross-hour readings (3c, 4d's s50 counts, 2e) were reported only already. The grader's verdict level against h40d's is not proven equal. |
| D4 | **Answer content in a session.** The grading operator printed judge reason lines (paraphrased answer content) into the controller's session. While extracting counts for this note, I also had two such lines print into my own session. None is reproduced here. | No. Grades are the graders' files, unchanged. This breaks the counts-only discipline of §8, not a verdict. |
| D5 | **Cue export INCOMPLETE** (`L395,cueBlocks-count`: cueBlocks present 41 against 40 non-empty entries). Cause, per the controller ledger: the readiness probe's second turn was answered 4.2 s into the run window. The cue-grading note **NOTE-flight-eq-export-2026-10-06** (sha256 `03de625d611987d0…`) excludes the probe line, so the material is the 40 roster entries + the twins. That needs an R3 probe-line mode in b10, its note, a rebuild and a review. | No: §7.b10, "it does not touch this hour's verdict". |
| D6 | **Harness gate FAIL:** TTFT p90 10.3 s, Live reconnects 26, lost utterances 3, the generic acceptable row; `auto` exit 1. | No. This is the harness's generic gate, not a registered clause. 2e is reported, and 1(f) reads 0 items lost before dispatch. |
| D7 | **Unregistered hand reads.** 1(g) and 1(h) were not printed by any recorded instrument. `power-events.ps1` (1(k)) was never built: A5's list marks it UNBUILT. I read the three by count-only greps and one System-log query, the query calibrated on a known 30-day window. | No: all three read clean. Had any read VOID, the verdict would be VOID, not INCONCLUSIVE. These counts are mine, not an instrument's. |
| D8 | **Instruments not run:** `h40d-clocks.mjs` (2f union), `h40c-hedge-stats.mjs` (2e's hedge split), `mains-band.mjs` (4d's band; I counted it from the merge's per-id lines). | No gated clause. 2f's one gating role, a charged failure on G, is decided by smoke-facts (0 failed). A reader who holds 2f undecided without `h40d-clocks` would read §5 item 3 INCOMPLETE ahead of INCONCLUSIVE, and the remedy would be that offline instrument, recorded and run. |
| D9 | **Filter hash DIFFERENT** in h40d-twins (dist `28d6c47b9da4fba6` against the registered `42d9bc42dbd17870`). It is expected per addendum-2 §1: commits d83fdfe, 801442d, c699638, 800d6a5 are in the tree. | No: the cue effect is reported only. |
| D10 | **Quota day.** router40's 48 calls on 3.1-lite ran on this quota day, under the user's 21:41 ruling recorded in the arming record. That supersedes A2.2's "no other lite run". The G sitting's outputs were COPIED, not moved (addendum-2 §3). No resume or hole re-run happened. | No. |

## Cues (reported, never gating)

| reading | value | h40d / bar |
|---|---|---|
| Thinking, cue − no-cue (pooled medians, 120 a side) | **+58 tokens**; p90 diff +135; coverage 120/120 a side | +150 bar → **2c PASS** (h40d read +161) |
| TTFT, cue − no-cue | +266 ms median, +367 ms p90 | fallback +1000 → within |
| Acceptable band, all ids | cue [31, 31] against no-cue [31, 33] | OVERLAP |
| Wrong (gated, sums over 3 reps, margin 1) | cue 0 against no-cue 1 (+1) | no stop; STRICT: no stop |
| Cue blocks present / shaped per cue rep | present 100 / 100 / 100 %; shaped 100 / 95.0 / 97.5 % | ≥ 90 % holds → **3c PASS** |
| In-app cue row | 41/41 present, 41 well-formed, 8 trimmed (S1Q04, S1Q08, S1Q09, S2Q02F, S2Q03, S2Q04, S2Q05F, S2Q09) | |
| check-smoke-cues v4 | **CLEAN**: 42 answers, 42 cue lines, malformed 0, block-only 0 | |
| Shape (smoke-facts) | 42 blocks: two lines 14, three lines 28, > 3 lines 0; words per cue line median 4, max 5, over 5 words 0 | |
| Export | 280 entries (40 in-app + 6 × 40 twins), sha256/12 `f92c6b1a2176`; **INCOMPLETE** (D5) | |

The cues add thinking (+58) and a quarter-second of TTFT on these bytes without moving the acceptable band or adding a
wrong. **Cue CONTENT grading is pending** under `L\cue-grading\PREREGISTER-cue-grading.md`, with this hour as a
material set per NOTE-flight-eq-export (03de625d). It waits on the R3 probe-line mode in b10, its review and the
rebuilt export. Nothing about cue content decides this hour.

## Does not show

- **Generalisation.** The roster is the tuned one. holdout40 decides that, and only after a PASS.
- **Whether the gain is real.** +3 on 20 sits between the lines, and one item reverses (S2Q05F, −4). The hour cannot
  separate a weaker live effect from an item-level failure without reading the captured bytes.
- **The S2Q05F reversal's cause.** Not read: no prompt or answer text was opened for this note.
- **The back leg's +5 of 12.** Reported only. With 3 reps it decides nothing beyond 4b.
- **Cue content.** Pending (above). The cue effect here comes from 3 reps a side, a band about 3 wide.
- **The hedge's real race on G.** Every G in-app answer came from one draw, and the race is not decomposed.
- **2e like-for-like.** The hour ran at 03:04 local, br1 midday: different provider load, one hour.
- **2f's charged/UNRESOLVED union, the Live ear's dispatch share, 2e's G-window split.** Their instruments were not run
  (D8).
- **1(g), 1(h), 1(k) by a recorded instrument.** They are hand reads (D7).
- **Grader comparability with h40d.** The command differs (D3), and graders are Opus 5.5 against s50m/s50l's Opus 5.
- **The bare 3.5-lite empties.** 4 of 20 records have 0 spoken words, not investigated.
- **Whether the four stream-filter commits change any emptying stage.** Not replayed (addendum-2 §1).
- **The smaller same-day re-run budget** (A7.2). Unused: no hole or INCOMPLETE re-run was needed.
- **Paired-grading noise.** About ±4 on 40 (reg. §9). At 20 pairs, +3 against a +4 bar is within one item's swing.

## What INCONCLUSIVE means for the next step (the registration's own text)

- **§5 item 4:** "3a between its lines … **ONE re-fly under this registration; a second INCONCLUSIVE = FAIL** (the
  replay's rule)." A2.11 restates it: two in a row → FAIL by §5 item 4.
- **The re-fly is a new hour under this same file and its amendments**, the bars unchanged. The registration gives VOID
  the form "a dated re-flight note in §11, no rule change". It names no other form for INCONCLUSIVE's re-fly, so the
  same form is the natural reading, but the text does not spell it out. The day, T and window must be set again: A7.2
  fixed them for 2026-10-05/06 only, so the re-fly needs a dated note for them before data.
- **No pooled data.** No text of the registration, A1–A7 or the notes licenses pooling this hour's pairs with the
  re-fly's. The re-fly is read on its own pairs, and a second INCONCLUSIVE is a FAIL. Pooling would be a rule change.
  It would need a dated amendment before the re-fly's data and a ruling by the user. This note does not propose one.
- **Until then (§5):** the flag stays OFF (the tree is flag-off by default), holdout40 is not flown with the flag, the
  default-ON commit is not licensed, and "in every outcome the result note exists before anything else lands on MAIN".
  §8 asks for this note to be committed to MAIN `passes/` as `2026-10-06-flight-eq-result.md`, with
  `flight-eq-ARMING.md` and the evidence folder. That commit is the controller's: this note is written in E only.
- **Not licensed:** "Sampling until it passes is not allowed" (§5 item 1). The re-fly is the one the text grants.

## Inputs read (sha256/12 where computed by their tools)

eq-flight-read.out.txt (b5 `53151846367b`); eq-b4-cal.run.txt (`aa8dad977672`); gsitting.log (`23822d03ba6e`);
eq-twins.eval.out.txt (b6 `592d8cad52f7`); grading-log.md (launcher `9b64492fe6fa`); grading\merge.out.txt (counts);
eq-cues-export.run.txt + cues-export-eq.completeness.txt (b10 `952182ae4eea`); cue-report\*eq.{smoke,facts,thoughts,twins}.summary.txt
(`d7888ad679d0`); instruments.sha256.txt; ARMING-flight-eq.md; MAIN interview60.runs\flight-eq.launcher.log; MAIN
passes\2026-10-06T01-12-56-eq.md (Summary and Gate only); followup-turn\build\progress.md from "- 00:07 SUPERSEDED" to
the end. Hand reads (D7): the run's natively_debug.log by count-only greps; the System event log; the bare 3.5-lite
answer file by field counts.

Checked at writing (06:1x): the on-disk sha256/12 of all 14 tools in `instruments.sha256.txt` equals their last recorded
line (incl. `launch-grader-eq` 9b64492fe6fa). `cue-leak-check.mjs` (4cd9e25db5fc) on this note against
`cues-export-eq.json`: `leak 0`, exit 0. Seal: `RESULT-flight-eq.md.sha256` beside this file.
