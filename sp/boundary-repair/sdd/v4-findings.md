# Inputs for DESIGN v4 (controller, 2026-09-29 ~18:45)

Sources: the Opus SPEC review of DESIGN.md v3 (verdict "Sound with changes", no Critical; its read-only
scripts + outputs in `sdd/spec-review-scratch/`), the Opus Task 2 review (Approved, 4 Minor), and the
controller's measurements (`variants-v4.mjs` -> `evidence/variants-v4.out.txt`; `per-socket.mjs` ->
`evidence/per-socket.out.txt`). Current code state: Tasks 1 and 2 of PLAN.md are implemented and reviewed in
MAIN's working tree, uncommitted (module `electron/audio/deepgramBoundaryRepair.ts` sha 4653b898, its test
c57ef099, fixtures e65c6e74, adapter `DeepgramStreamingSTT.ts` 9584012e, adapter test 4a2b34ec).

## Spec review — Important (each must be decided in v4)
1. **Tolerant cut misaligns T when F1's last token covers several interim tokens** (smart_format numbers,
   compound merges). Reference output (review's probe-inputs.out.txt): I "accuracy reaching ninety two percent
   for each", F1 "accuracy reaching 92%.", F2 "For each of those metrics, define the unit of evaluation," ->
   v3 emits "two percent For each of those metrics, …" (a FALSE insertion). Same for "twenty five"->"25",
   "fifteen percent"->"15%", "all right"->"Alright". The shape is real (fixture negative #28 is this misaligned
   cut; its interim stopped early; a 09-02 log has "p ninety nine" vs "p 99"). All 25 log repairs are strict
   cuts; the tolerant branch's only repairs are the 2 S2Q07 seam plays ("RAC" -> "Rag").
   Reviewer's fix: refuse the tolerant branch when F1's last token contains a digit (optionally require a
   shared first letter); add #28's strings with the interim running on as a fixture.
2. **No language/Unicode scope; v2's alignment guard silently dropped.** The app offers es fr de it pt tr id ru
   uk ja ko zh and 'multi' (`electron/.../languages.ts:64-77`); tokens are ASCII-only. Reference outputs
   (probe-lang.out.txt): Spanish lost "migración" -> "migraci n"; Turkish "İzmir" shifts Traw -> duplicated
   word; Russian compares only Latin tokens. Reviewer's fix: gate like `keytermsFor`
   (`deepgramKeyterms.ts:87-88`, `/^en(-|$)/`, which also excludes 'multi'); restore the token-count alignment
   check (`rawTok(I).length === tok(I).length`, v2's guard); state the scope.
3. **Pause signals undecided.** "Any final clears the cut" is false in the wiring: the module sits after the
   adapter's empty-transcript return, so an EMPTY final (≈190/h, up to 445) never clears. Data: 0/29 log repairs
   and 0/6 seam repairs had an empty final between F1 and F2; the only log cut with one is a 49.9 s turn
   boundary; all 63 seam cuts had speech_final=false; the 5000 ms window never refused a v3 match, so it is today
   the only turn-boundary guard and unmeasured. Reviewer's fix: an empty final, speech_final=true on F1, or an
   UtteranceEnd clears the cut; pin with tests (the adapter test sends an empty INTERIM, not an empty final
   between F1 and F2).
4. **Window provenance wrong:** 4441 ms is the "decreasing"/"by 84%" case v3 does NOT repair. Max gap over v3's
   repairs: 3715 ms (logs), 3115 ms (holdout), 3207 ms (seam). Also state: NORMAL cut gaps reach 7835 ms (12 of
   527 over 5000 ms), so the window will occasionally miss a real loss.
5. **Coverage overstated; fresh data not cited.** seam2 (recorded 16:54, after v3 was settled at 16:53) is the only
   post-v3 data: v3 repaired 2 (TRUE) of 5 cut-shaped losses; 4 more losses had NO interim evidence (F1 longer
   than its last interim: M06#1 "machine", M28#2 "between", M02#1 "scheduled", M10#3 "recommendation") — so 2 of
   9 boundary losses there; no interim rule reaches the no-evidence class. |T| == 1 exclusion is right. Timestamp
   follow-up: promising, unproven — 5 LOST rows, 0 re-heard rows; the NORMAL-cut proxy sits 0.11-0.58 s before
   T[0]'s end, only 90 ms from the nearest lost value on 0.08 s timestamp steps; the silence gap cannot flag
   losses (lost 0.31-0.73 s vs pauses up to 0.56 s). The Live ear had R22's word (log :4808): the only data-backed
   source for the no-evidence class. Fix: cite seam2 + the no-evidence class; state expected recall; require
   re-heard negatives with timings before any timestamp rule.

## Spec review — Minor
- Mic instance statement wrong: only the interviewer Deepgram instance exists (`main.ts:1413` sole
  `createSTTProvider`; mic STT disabled `:1394-1396`, `:1416-1417`; `googleSTT_User` never assigned).
- Fixture negatives #4, #23, #24, #26 are not cuts under the rule (the extractor's cut test,
  `fixtures-v3.mjs:42`, accepts one-token and non-prefix finals); #5 is excluded only by its 49.9 s gap, so
  nothing pins a turn boundary INSIDE the window. Relabel; add #5's strings at a ~2 s gap.
- variants-scan.mjs does not skip empties (|T| == 1 = 49 vs the wiring's 50): no material change.
- The module header states "holdout 4 / 4 TRUE" without "not independent"; R22 and the 4 holdout repairs must be
  excluded from any future holdout measurement of this rule.
- k = 2 with m = 1 rests on one sample ("for a" before "production"): name it as the weakest path.
- Also reported: "all six captured replays were weak" has no support in BR; "exact options" holds for the option
  object, not the audio path; "the app uses finals only" is true for the dispatched turn text only (interims
  reach IntelligenceManager.recentInterviewerSpeech); the "turn boundary" example in v3 is not a cut under the
  rule; "right by inspection" is loose (6 of the 15 warm-up repairs restore "scale", not "scaling"); interims may
  keep fillers finals drop (unmeasured) -> v3 would restore "um" (confirmed on the reference).
- Consumers: all benign (reconciler, session context, detector, RAG, UI, knowledge, liveHold, turn machine,
  dispatch); a restored leading "and" makes looksFragmentary true -> reconciler keeps Live's text (benign); suggest
  mode could hold a detector question starting with a restored conjunction up to 2.5 s (minor).

## Task 2 review (Approved) — Minor
1. Pin "the module never sees an empty text": fire `results('', true)` between socket #2's F1 and F2 in the
   adapter test (NOTE: superseded if v4 makes an empty final CLEAR the cut — then pin that instead).
2. `electron/test/golden/interview60.turns-fixture.mjs:53` takes finals from the RAW `Transcript event` line, and
   `interviewerTurn.replay.test.ts:34` replays them as `turn.final()` input; after this change the app passes the
   REPAIRED text, so fixtures from future flights would replay without the restored words. Fix in the extractor:
   when a `boundary repair:` line directly follows a final, use `${restored} ${raw}` (exact: the module builds its
   output that way and one synchronous handler writes both lines).
3. rule-sim used one state per run log, the wiring one per socket. MEASURED: `per-socket.mjs` — 1922 sockets,
   29 repairs either way, 0 differences. Closed.
4. Adapter comment says "25 losses"; it is 25 REPAIRED losses (all TRUE), a floor.

## Controller measurements (variants-v4.out.txt) — repairs (non-holdout logs / holdout / seam)
- v3: 25 / 4 / 6.
- strict (no tolerant cut at all): 25 / 4 / 4 — loses the two S2Q07 seam "service" repairs.
- digit (tolerant refused when F1's last token has a digit): 25 / 4 / 6 — no loss.
- digitcat (digit + refused when F1's last token starts with the interim token at that position and is longer):
  25 / 4 / 6 — no loss.
- pause (empty final clears; seam: speech_final=true on F1 and UtteranceEnd clear): 25 / 4 / 6 — no loss.
- align (v2's rawTok/tok count guard): 25 / 4 / 6 — no loss.
So every Important fix is free on all recorded data, except dropping the tolerant cut outright.

## Controller rulings for v4 (the Fable author may argue against any, with evidence)
- Tolerant cut kept, but only when F1's last token has NO digit, does NOT start with the interim's token at that
  position while being longer (a merge), and shares its first letter with it. (Measure the first-letter rule too.)
- English only: the ADAPTER creates the repair only when its language matches `/^en(-|$)/` (keytermsFor's test);
  otherwise transcripts pass through untouched. The module gets v2's alignment guard back.
- Pauses clear: an empty final, an UtteranceEnd, or speech_final=true on F1 leaves no remembered cut. The module
  needs a way to be told (e.g. a `clear()` and a speechFinal argument); the adapter calls it before its empty
  return and in its UtteranceEnd handler.
- Comments and spec text: window provenance 3715 ms (+ the 7835 ms NORMAL tail), "25 repaired losses", holdout
  not independent, the mic statement removed, seam2 and the no-evidence class cited with recall stated, k=2/m=1
  named as the weakest path.
- The turns-fixture extractor fix (Task 2 review Minor 2) is IN scope: it is caused by this change.
- Fixture relabel: optional; do not regenerate fixtures-v3.json unless the new rule changes an expected output
  (it must not — the fixtures are all strict or non-cuts). New negatives go in as synthetic edges in the tests.
