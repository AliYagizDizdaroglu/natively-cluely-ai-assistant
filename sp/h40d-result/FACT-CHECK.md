CLAIMS CHECKED: 466; WRONG: 5; UNSUPPORTED: 7; OMISSIONS: 19

Fact-check of `h40d-result/2026-10-02-h40d-result.md` (the note) against `PREREGISTER-h40d.r4.md` (the rule), the saved
readings in VH, the run folder `2026-10-02T11-39-41-h40d`, `flight-h40d.launcher.log` (and the h40a–h40c and dry-twin
launcher logs), the run folder's `natively_debug.log`, the pass record `passes/2026-10-02T11-39-41-h40d.md`,
`passes/2026-09-29-h40c-result.md` and `SP\AGENDA.md`. Read-only; no git, no app, no model call. The claim count is an
itemization by section (numbers, ids, timestamps, quotes, model and file names; each appendix row counted once), so it is
approximate. No answer or prompt text is reproduced here: items are named by id, answers by verdict and word count;
quotes are graders' one-line reasons, roster questions and log metadata.

Independent recomputations made for this check (numbers only): 2c pooled thinking medians from the six answers files
(cue 899, n 131; control 738, n 132; +161; TTFT +559 ms), the hour's in-app and twin grades for the sidecar's five items
from the merged judge files, R33's roster-word coverage in its captured prompt (35 of 37 across 7 INTERVIEWER lines).

Everything not listed below matched its source, including: every number in the verdict table; the consequence quote
(verbatim, line breaks aside); Appendix A (identical to `h40d-hedge-stats.out.txt` lines 2–18); Appendix B (identical to
`h40d-rule3.winners.out.txt` lines 46–90; the diff against `h40d-rule3.out.txt` is exactly the six 3.1-lite rows); every
grader reason quoted in rule 3, the misses table and the marker list (`h40d-merge.with-bare.out.txt`); the four trims and
their timestamps (debug log lines 1347, 2977, 3262, 7262); the R16 offers-first warn line (line 3897, 11:08:42.222Z, 47
words); R05's and R31's transcripts, closes and dispatch times (`h40d-peek-R05/R31.out.txt`); the 42 quota closes and
their 6/16/20 split; all h40c comparison figures; the pre-cue thinking medians 749/758/744 and 895/882/900
(`thoughts-noise.out.txt` lines 37, 47, 57, 7, 17, 27); the bench's +55 (rule §11).

## WRONG

**W1. Bare-arms table, in-app row (note line 232):** "| In-app | 28 | 3 | 1 (R05 unanswered) |".
The in-app's one wrong main is **R33**; R05 is unanswered and is a fourth category, not a wrong answer. Source:
`bare-vs-inapp.out.txt` line 19 (`inapp  A 28  w 3  X 1  - 1`), line 17 (R33 `X`), line 3 (R05 `-`);
`h40d-rule3.winners.out.txt` lines 22–23 (R33 wrong c0 t2 d2; R05 unanswered). The cell should read "1 (R33)", with R05
named as unanswered (28 + 3 + 1 + 1 = 33).

**W2. Sidecar (note lines 261–262):** "Grader variance moved two cells between grading sessions: R12 in-app and R08 cue r1
were weak in the hour's grading and acceptable here."
Four cells moved, not two. Besides the two named: **in-app R11F** was *wrong* in the hour (c1 t0 d2, `interview60.judge.json`;
`h40d-merge.with-bare.out.txt` line 9) and *weak* for both sidecar graders (112/112, `flash38-result.txt` line 5); and
**3.1-lite LOW r1 R08** was *acceptable* in the hour (222, `interview60.judge.gemini-3.1-flash-lite_captured-low.json`; R08
absent from that arm's not-acceptable list, `h40d-merge.with-bare.out.txt` lines 22–28) and *weak* for both sidecar
graders (122/122, `flash38-result.txt` line 4). So on these five items the hour's grades give in-app 0 / 3.5-lite r1 3 /
3.1-lite r1 3 acceptable, against the sidecar's 1 / 4 / 2; the drift runs both ways.

**W3. Bare arms (note line 226):** "The flight runs two bare arms every hour: the roster's scripted text under the shipped
system prompt with no context, mains only."
The flight ran **four** arms on the scripted text: untagged `gemini-3.1-flash-lite` and untagged `gemini-3.5-flash-lite`
(no thinking flag; these are the registration's "bare" arms), `low` (3.1-lite, `--thinking LOW`) and `high` (3.5-lite,
`--thinking HIGH`) (`flight-h40d.launcher.log` lines 47–52, 67–68; rule §2 arms table line 124 lists `low`, `high`, bare
3.1, bare 3.5 separately; pass record lines 21, 22, 29, 30). The two arms the note grades and labels "Bare 3.5-lite HIGH
(`_high`)" / "Bare 3.1-lite LOW (`_low`)" are the `high` / `low` arms; the registration's untagged bare arms stayed
ungraded (`h40d-merge.with-bare.out.txt` lines 189–190: `SKIPPED-MISSING bare35`, `SKIPPED-MISSING bare31`). The user's
rule (memory `feedback_grade_bare_arms`, AGENDA 17:36) does call `high`/`low` "bare", so the fix is to say which four arms
ran and which two were graded.

**W4. Opening (note line 7):** "The hour flew as registered."
The registration fixes the ears as "Deepgram + the Live ear, exactly as h40a–h40c" (rule line 105). h40a, h40b and h40c
all flew `gemini-3.1-flash-live-preview` (`flight-h40a.launcher.log` line 7, `flight-h40b.launcher.log` line 7,
`flight-h40c.launcher.log` line 8); h40d flew `gemini-2.5-flash-native-audio-latest` after the probe's exit 3
(`flight-h40d.launcher.log` lines 25–26; `interview60.flight.done.json` `liveModel`). The note itself says later (line
273–274) "The ear as registered … 3.1 Live was not tested." Everything else in the paragraph checks out; the sentence
needs the ear exception.

**W5. The ear (note lines 196–197):** "R31 (the Live ear's rewrite was the only whole rendering)".
By the registered measure the dispatched rendering was not whole: the report's row reads "FAIL Long questions answered
whole: 0 of 1 (dispatched text covers ≥ 80% of the question)" (`interview60.report.md` line 16; pass record line 47), and
the note's own 5b says 0 of 1. The rendering (`h40d-peek-R31.out.txt` line 84) keeps the numbers but drops "a model lifted
checkout conversion" as well as the CV framing (25 of the roster question's 42 tokens, about 60%, by `diag-items.mjs`'s
tokenizer). "The only rendering that
kept every number and the closing question" would be accurate.

## UNSUPPORTED

**U1. 2c's reading is not on file as the instrument printed it.** `h40d-2c.out.txt` stops after the control's `pooled:`
line (line 14). It has no control Theil–Sen line and none of the script's `rule 2c:` lines (coverage, difference, TTFT
difference with the 0.5 s line, `rule 2c reading`, holes), which `h40d-thoughts-noise.mjs` lines 102–110 always print
when both families exist. The note's "+161 … FAIL" and "Coverage is 100% on both sides, so tokens decide" are therefore
the controller's arithmetic, not the registered instrument's verdict line. The arithmetic is right: recomputed from the
six answers files with the registered percentile method, 899 (n 131) vs 738 (n 132) = +161, TTFT +559 ms. Re-run and
save the full output before commit.

**U2. The grader pin's instrument (note lines 285–287).** The text implies the pin was read with the calibrated
`h40d-grader-models.mjs` ("calibrated on 22 known cases"). The only saved pin reading, `h40d-grader-ids.out.txt`, is in
the output format of `grader-ids-today.mjs` (an uncalibrated script written 17:56 today that selects transcripts by file
mtime ≥ 12:30Z and reads the first user message for a verdicts file name). `h40d-grader-models.mjs` prints
`… PINNED` / `ALL GRADERS claude-opus-5-5` (its lines 130–147), and no such output for this hour is in VH. §9.5 names
`h40d-grader-models.mjs`. The pin itself is consistent with every merge line (`model=claude-opus-5-5`) and with rule3's
`model MATCH, stamp MATCH`; what is unsupported is that the registered instrument read it.

**U3. 3e (note line 131).** The rule's 3e instrument is `mains-band` (§9.5), and no `mains-band` output is saved. The
figures (in-app 28 vs 28/30/29) match `bare-vs-inapp.out.txt` lines 19 and 22–24, so the number is fine; the instrument
attribution is not.

**U4. R33's prompt (note line 213):** "The whole question across seven INTERVIEWER lines". `h40d-diag-items.out.txt` line 5
prints only the line count (7) and the last line, and no saved reading shows the whole question is present. My
numbers-only check found 35 of 37 roster words across those 7 lines, which supports the substance. Save the reading.

**U5. The 3d join (note lines 137–141).** A12 registers the join "from `h40d-clocks.mjs --list` and the pairs'
`dispatchedAt`", and 3d reads "its last `won by` line". The note used `wonby-join.mjs`, which takes the first won-by line
after each dispatch (`wonby-join.out.txt` lines 11–12). The results agree with `h40d-clocks.list.out.txt` (#32–#37 =
R24–R28 on 3.1-lite; R29's two won-by lines are both 3.5-lite), so no number changes. The departure is not named.

**U6. "The app itself has no ear fallback." (note line 190).** No saved reading supports this. The code does
(`electron/audio/GeminiLiveRouter.ts:62`, `process.env.NATIVELY_LIVE_MODEL || 'gemini-3.1-flash-live-preview'`); cite it.

**U7. "Every output is saved in VH." (note line 284).** This is not so for the 2c verdict lines (U1), the registered
grader-pin instrument (U2) or `mains-band` (U3).

## VERDICT LOGIC

- **Precedence: correct.** The playback start was 13:33 (in window), so every clause of rule 2 gates. 1(d) and 1(e) pass
  (launcher lines 18–19 and 126–127, the same sha `42d9bc42dbd17870`; no skip line; `pairedArms` lists the three no-cue
  tags; lines 70, 72 and 74 `EXIT 0`). §5 item 1 is therefore readable, and 2c fails, so the verdict is a
  CUE-ATTRIBUTABLE FAIL. Nothing under 1(a)–(g) voids the hour, and no clause is INCOMPLETE. The 3b FAIL is correctly
  reported as an other FAIL beneath item 1. GRADER DRIFT does not arise.
- **The consequence** is quoted verbatim from §5 (rule lines 580–585).
- **2a: PASS** (4.878 ≤ 5.100). There was no breach, so the provider reading is not invoked. The note's "The tail is the
  provider's" is about the reported p90, not about 2a's provider reading. It is verdict-neutral but overstated (see
  OVERSTATEMENTS).
- **2b: PASS** (0.054 / 0.158 s), and 2b is not INCOMPLETE: first-token lines cover 44 of 44 won-by windows.
- **2c: FAIL**, correct: +161 > +150, with thinking tokens deciding (coverage 131/131 and 132/132), no holes and no
  exclusions (U1).
- **2d: PASS**: 0 charged, 0 unresolved. #39's missing `[Answer] full:` line is a supersede, correctly not UNRESOLVED.
- **2e is gated**, correctly (§11: Thursday's re-smoke read GONE). It reads GONE with n 46 ≥ 12 and every counted answer
  carrying a first token.
- **3a: PASS**, net of the pre-dispatch losses (36 → 35, at the floor). 3a NOISE does not arise.
- **3b: FAIL**, correct: R33 is gated and graded wrong (c0).
- **3c: PASS**, correct under both the default and the strict clause, with no holes and no no-text records. R09 r1 is
  correctly kept out of the gated clause as a `filterCodeFences` empty.
- **Rule 4: CLEAN**, correct. There were no cue failures and no pipeline events to name.
- **Rule 5 and R31's placement.** Placing R31 *before* dispatch is right: three partial turns closed as not-a-question,
  the Deepgram tail was only marked, and the Live text was dispatched 25 s after the clip (peek lines 23, 30, 37, 38 and
  84). Counting R31 as a *loss* before dispatch, though, is a reading rather than the rule's letter:
  - The rule's "Lost before dispatch" bullet describes items that "never ran the cue path". R31 did run it: it was
    dispatched, carried a cue block and was graded acceptable.
  - The rule names an explicit consequence for a not-whole dispatched item only "for a cause after dispatch" (a rule-5
    FAIL).
  - The note's treatment rests on "each lost or partial item is placed … before or after", and it is the conservative
    choice.
  - It does not change the verdict. With R31 as a loss, 3a is 35 (PASS) and 1(f) is 2 (not void). Without it, 3a is 36
    and 1(f) is 1. Item 1 governs either way.

  The note should say it is applying the "partial" wording. The verdict-table cell "R05 and R31 lost before dispatch"
  (line 41) should say "R31 not whole, cause before dispatch".
- **1(f)'s bound:** 2 is not "more than 2", so not void. Correct.

## OMISSIONS

1. **Rule 2, reported: dispatch → won-by** (G + model; h40c 4.101 s) is absent. h40d reads 4.856 / 9.768 / 11.633 s
   (`h40d-clocks.out.txt` line 9).
2. **Rule 2, reported: model clock and G against br1's** (4.105 / 10.661 s; 0.501 / 0.555 s) are absent. Only h40c's are
   given.
3. **Rule 2, reported:** "dispatch after the question ends and first token after the question ends, p50 / p90 / max, in
   h40c's table form" is absent from the rule-2 table. The h40c note carries these rows.
4. **The gate row `Answer TTFT p90 · detect p50`.** Only its 10 s limit is cited. Its reading, 9.8 s · 2.1 s
   (`interview60.report.md` line 17), is not given.
5. **The 150-word cliff row** is absent: over 85: 3/44, over 150: 0/44 (report line 20).
6. **2c's reported TTFT lines** should name "the 0.5 s line and the run order". The +0.559 s is beyond the 0.5 s line, and
   the note does not say so. The order is not named either: the no-cue twins ran last, 12:24–12:36Z, after `high`; cue r1
   ran 12:00–12:11Z (launcher lines 61–74).
7. **Rule 3, also reported: the Live ear's share.** "Prompts carrying its rendering" (h40c 9 of 44) is absent. The answers
   figure is given on the whole log (12 of 46, the readiness probe's two included) against h40c's in-run 7 of 45. In the
   run window it is 11 of 44: the probe's first dispatch was a Live one.
8. **Cue-twin rates.** Blocks with a line over 5 words per rep (1/44, 4/44, 1/44) and the raw over-3 rate (0/44 in every
   rep) are not reported (`h40d-twins.out.txt` lines 11, 16, 21; rule 3c cue checks, rule 4 reported).
9. **3c's single gated wrongs are not named.** On the cue side it is R11 in `captured-high-r2` ("Multiplies the stated
   peak by a peak-to-average ratio to get 30k rps…"); on the control side, R12 in `captured-no-cues-high-r3`. §4 3c says a
   single one "is named and read item by item". It is arguable whether that applies only to an *extra* one; naming both
   costs a line.
10. **Rule 4, reported: `hold-read --list` rows R1 and C,** and the comparison with the 16:12 run's printed lines, are
    absent. Only the R2/B under-15 counts and T's median are given, against the re-smoke only (`h40d-hold-read.out.txt`
    lines 5 and 9).
11. **Rule 5, reported: Live reconnects** are absent (pass record line 15: 55; h40c 22).
12. **§9.1:** the launcher's `wav:check` 45 (line 2) is not stated. Whether `auto` rebuilt is not stated: no build line is
    quoted, though both proofs' unchanged `2026-10-01T13:37Z` timestamps show it did not. The chains `EXIT 0` (line 76) is
    given only as "ran".
13. **§7.5 / A11:** the post-flight check of the chains pass for no `__CUES__` is not reported.
    `interview60.chains.json` holds 0 occurrences.
14. **A12:** the note does not record that `h40d-twins.mjs` ran with `--dist <MAIN>` (output line 2 shows the MAIN chain).
    The join instrument departure is in U5.
15. **A13:** the flight task's registration read-back (Ready, StartWhenAvailable False, next run 13:30) and the dry twin's
    check-13 line are not recorded. Only the precheck's "Ready next 13:30" is.
16. **A14:** the note does not say whether unrelated speech appeared in the hour's log. All 47 dispatch lines map to
    roster items or the probe's two questions.
17. **§10 items missing from "What this does not show":**
    - a bench-size quality cost, which 3c's PASS cannot exclude;
    - provider load: "one hour decides nothing about the hedge's tail" (the note asserts the opposite);
    - whether cue mode helps the candidate speak (deliberately unmeasured);
    - a block-only answer on a simple question (R05 was lost; R15 and R18 were answered);
    - the typeset-fraction residual.
18. **Diagnosis, R07F.** Deepgram's "And if the worker that claimed it crashes halfway," was itself closed as
    not-a-question (debug log lines 1772 and 1778, 10:47:17.428Z) before the Live ear's merged text was dispatched (line
    1792, 10:47:22.376Z). The note files R07F only as "the ear's merge". The hour's 16 not-a-question closes (they touch
    R05, R07F, R09, R11, R12, R13, R17F, R19, R23, R26, R27, R31×3, R32 and R33) are also not set against the baseline
    the rule cites (2, 3 and 1 on h40a–h40c).
19. **The sidecar's own pre-registered "Reported" item,** per-item better / same / worse against in-app, is absent
    (`flash38-result.txt`: BETTER on R13, R08, R11F and R33; same on R12).

(The §9.7 fact-check line, "FACT-CHECK-RESULT", is a placeholder awaiting this report and is not counted.)

## OVERSTATEMENTS

- **Lines 78–80, "The tail is the provider's".** The hour cannot separate provider load from the cue rule's added
  thinking, which 2c just measured at +161 tokens on the same model. Against h40c, back starts rose from 7 to 9 and
  3.1-lite wins from 1 to 6. §10 says one hour decides nothing about the tail.
- **Lines 89–91 ("about 0.56 s of model time per answer") and 270–271 ("measured offline").** This is an estimate from a
  cross-sectional Theil–Sen slope, and that slope is inflated by cue r1's slow spell. The registered provenance slope
  (~2.9 ms/token) gives ~0.47 s. Nothing measured a per-answer cost.
- **Lines 95–96, "so it costs most where the question needed least".** This is a causal generalization from two points
  (holdout vs scenario50). It is labelled a reading, but the "so" clause goes beyond it.
- **Line 219, "so none of the misses reads as cue mode's".** Twelve draws a side on four items cannot exclude a cue effect.
  R33's cue block and answer come from the same call, and the note itself says the block repeats the error.
- **Line 210, R02F "pipeline … as on h40c".** The h40c note read R02F as a *model* miss on this prompt shape ("one repeat
  model miss"). The reclassification rests on no new evidence (2 of 9 twins).
- **Lines 239–240, "this hour's losses sit in the follow-ups and before dispatch".** Four of the nine misses are
  dispatched mains (R08, R12, R13, and R33, the gated wrong). "Neither costs nor clearly helps" compares arms that differ
  in thinking level and profile (bare 3.1-lite LOW 30 vs in-app 28).
- **Line 186, "a confound named in advance".** The rule named the Live ear's *share* in advance (rule 3, "Also
  reported"), not a fallback to a different ear model.
- **Lines 191–192, "each followed by a backoff and a fresh reconnect".** The lines announce it. Two closes came 5 ms apart
  (11:31:17.320Z / .325Z), and the last (11:39:37.103Z) came about 3 s before the log's last line (11:39:40.483Z).
- **Lines 258–259, "its 4 of 5 is regression to the mean".** This asserts the mechanism. The design predicts it, but this
  run does not show it per item (and see W2: the grades also drifted).
