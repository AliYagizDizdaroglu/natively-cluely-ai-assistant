# Task 12 review: live40 harness (WT-D, 51e98d0)

Reviewer: Opus. Inputs: PLAN.md Task 12 (1606-1645), Global Constraints, Review Focus, SPEC.md 7.4, report, task-12.diff, the worktree files.

**SPEC: PASS  QUALITY: CHANGES** (one IMPORTANT interface finding; it needs a controller ruling because the brief itself prescribes the field)

## What I ran
- `live40.test.ts` + `roster.test.ts` from `%TEMP%`: 24/24 pass (11 + 13).
- tsc: root 0 errors, electron 6 (= baseline); none in live40 files.
- Checked by node: items.json sha256 = e531772b...2aaf (the pinned one); routes EASY 20 / HARD 27 (HARD = H 11 + QF 9 + AF 7); 16 follow-ups; the real `live40.wav` is 55 582 196 bytes, header data length 55 582 152 = file size - 44, i.e. 1157.96 s = 19.30 min. The file is not truncated.
- `DEFAULT_TURN_CONSTANTS` in WT-D (`interviewerTurn.ts:25`) are unchanged from the spec's derivation table.

## Spec compliance (every brief item)
- Files: all four created, roster.mjs and the builder modified as listed. Commit message as briefed.
- Interfaces: `LIVE40` items `{id, q, gapMs 20000, chain, parent?, route, class, level: route, topic: chain}`; roster entry and `noRender: true`; `SAMPLES.live40 = ['RE11','EF06','RH05','RE12']`; `export TTS_NO_RENDER`. computeOffsets (run.mjs:119) reads `level` and `topic`.
- Tests: all five step-1 bullets present (gen exit 2 + message, 47/31/order/parent/classes/gap, clips sha12 + 22 050 Hz, builder refusal message verbatim, wav:check 0 then 1 on a temp copy). RED against stubs reported.
- gen: sha refusal, header comment names the sha. clips: header format, whole-file sha12 (the plan correction), manifest `path` ignored, `.txt` = q.
- Extra (acceptable, rule 11): gen also refuses exit 1 when the order or parent/chain relation is broken. Clips checks everything before copying anything.
- The .gitignore was correctly left alone: it is not in the brief's file list.

## Answers to the dispatch questions

**1. 19.3 vs 19.6 min: does anything downstream depend on 19.6?** No. 218 s + 47 x 20 s = 1158 s = 19.3 min; the plan's 19.6 is an arithmetic slip copied from SPEC.md:595. Nothing reads a duration constant:
- `wavMismatch` (run.mjs:142) derives the expected length from the clips + `gapMs`; the timeline comes from `computeOffsets`.
- Every other mention is prose or a "~20 min" budget: PLAN.md:1854 (Task 17 smoke), PLAN.md:1875 ("about 2 ear reconnects in 20 min"), PLAN.md:1961 and SPEC.md:34 (`I60_PROBE_DEADLINE_MIN`: the latest start + about 20 min). The real file is 0.3 min shorter, so each budget gains margin.
- Fix the two text lines (SPEC.md:595, PLAN.md:1640/1854) to 19.3 when the registration is written (Task 19), so the registration does not record a figure the run will contradict. MINOR.

**2. Is the 20 s gap derivation honoured?** Yes.
- `GAP_MS = 20000` is used on every item, follow-ups included (gen.mjs:24, :59), and the test pins it.
- The builder appends `gapMs` of silence after each clip (build-audio-local.mjs:101), so the time from one voice stop to the next voice start is at least 20 s. Any trailing silence SAPI left in a clip only adds margin.
- The last item also gets its 20 s, so the final turn can close (16 s worst case) and the pairing window (2 s) can expire inside the wav.
- The constants the derivation rests on are unchanged in WT-D.
- One note for the §7.4 "gap adjustment from the smoke" choice: the gap's single knob is `GAP_MS` in gen.mjs. Raising it means re-generating `live40.questions.mjs` and rebuilding the wav, and the test's `gapMs === 20000` assertion and the plan's constraint line must change with it. Not a defect.

**3. Does the wav:check calibration prove what it should?** Partly. It proves the length comparison, not the file bytes.
- It shows a known-good wav exits 0 and the same wav shortened by 2 s exits 1 with the mismatch message. That is above the 1 s tolerance, and the message is distinct from "missing". Removing `wavMismatch` would turn the second case green, so the pair discriminates.
- The implementer had to rewrite the header lengths to make the cut wav fail, which exposed what the check really does: `wavMismatch` reads only the header's data length (run.mjs:135-141).
  - A physically truncated wav whose header was left intact passes wav:check. The plan's literal "a copy with 2 s of PCM cut" would have exited 0.
  - So the check proves "the header claims the length of this roster's clips plus their gaps", not "the file holds that audio".
  - Real risk is low: the builder writes the file in one `writeFileSync`. But the plan reads this check as the guard for the flight's stimulus.
  - The one-line hardening, `fileSize - dataOffset - 8 === dataLen`, belongs in run.mjs, which is Task 13's file. MINOR, for the controller to route.
- By construction the check cannot see:
  - a wrong `gapMs` baked into both the roster and the wav. The test's `gapMs === 20000` pins that instead.
  - a same-length wav built from other clips. The clips script's sha12 check guards the clips, but nothing ties the wav to them.
  - order. Reported, not a defect of this task.

**4. Should `.gitignore` gain the two lines?** Yes.
- Add `electron/test/golden/live40.wav` and `electron/test/golden/live40-tts-local/`, plus `live40-tts/` for parity with holdout40 (.gitignore:276-278), even though it is never created.
- Why: the wav is 55.6 MB and the clip copies are about 10 MB. Today they show as untracked in WT-D and will show in WT and MAIN after the merge.
- The plan's "if not, do not add them" refers to git-adding the audio, not to the ignore file. Task 12's file list does not include .gitignore, so the implementer was right not to touch it.
- The controller (or a Task 13 commit in WT-D) should add the lines, with no lane intersection: .gitignore is in no other lane's set. MINOR.

**5. Do Task 13 and Task 14 consume the roster and timeline as named?** For their own needs yes, but the existing grading path does not (finding I1).
- Task 13: `buildCaptureFiles` needs only `id`, `startSec` and the item order from the timeline, all present via computeOffsets. `NATIVELY_ROSTER=live40` for the flight dry-run resolves (roster, SAMPLES; flight.mjs:349 logs "no focused five", which is expected).
- Task 14: reads route labels from `<root>\electron\test\golden\live40.questions.mjs`. The export is `LIVE40` with `route` (EASY 20 / HARD 27, matching the 13/20 and 1/27 bars). The timeline does NOT carry `route`, `class` or `parent` (run.mjs:119 copies only `id, level, topic, kind, q, startSec, clipSecs, chain`), but `level === route`, so either source works. The reader's brief does not name the export; it should import `LIVE40`.
- Task 14A consumes "the live40 roster": fine for ids and classes.

## Findings

**IMPORTANT I1: `chain` collides with the harness's existing meaning (the parent's id), so 16 follow-ups lose their parent in grading and in the bare arms.**
- live40.questions.mjs sets `chain` = the chain id (`"C01"`) and puts the parent in `parent` (gen.mjs:60-61), exactly as PLAN.md:1618 prescribes. The existing harness reads `chain` as the parent's item id and `level === 'followup'` as the follow-up flag:
  - `interview60.judge.mjs:57-62` `questionForGrader`: `items.find(it => it.id === item.chain)` finds nothing for `"C01"` (0 of 47 items resolve; checked). So the in-app export and every arm export (flight.mjs:384-385) grade the follow-ups (e.g. RH01 "Can you give me an example of each?") with no `[Follow-up to: …]` context.
  - `interview60.answers.mjs:298-302`: no item has `level === 'followup'`, so the bare `high` and `low` arms (NATIVELY_FLIGHT_ARMS) answer all 16 follow-ups standalone. The comment at 298 says that "would measure nothing".
  - `interview60.metrics.mjs:450, 470`: `gradeable` and the follow-up level mapping treat all 47 as mains.
- Tests pass because none crosses into judge, answers or metrics. This is a plan-level interface error, not an implementer deviation, but the fix lands in Task 12's files.
- Suggested minimal fix, to be ruled by the controller before Task 13's dry-run and Task 14A:
  - gen emits `chain: <parent id>` on follow-ups (the existing convention) and no `chain` on mains;
  - the chain id stays in `topic` (already) or in a new `chainId`;
  - the 31-chains test counts `topic`;
  - `level` stays `route` (Task 14's bars need it).
- Separately rule whether bare `high`/`low` should skip the 16 follow-ups (that needs `level: 'followup'`, which conflicts with `level = route`) or answer them standalone on purpose. The `captured-high` arm carries the parents in its replayed prompt either way.

**MINOR M1:** the 19.6 min figure at SPEC.md:595 and PLAN.md:1640 and 1854 should read 19.3 (1158 s). No code depends on it.

**MINOR M2:** run.mjs:135-141 `wavMismatch` trusts the header. A truncated file with an intact header passes. The calibration had to forge the header to fail, so the check guards the header's claim, not the bytes. Add a size-vs-header check in Task 13's run.mjs change, or record it as a residual risk in the registration.

**MINOR M3:** `.gitignore` lacks live40 (it has holdout40 at :276-278). Add `live40.wav`, `live40-tts-local/` and `live40-tts/` under golden.

**MINOR M4:** build-audio-local.mjs:35 and :53: when `live40-tts-local` was never filled, the builder creates the empty folder and throws "would re-render RE01 — refused". The message is correct but does not say "run live40.clips.mjs first". Cosmetic.

**MINOR M5 (report concern 2, confirmed):** run.mjs resolves `GEMINI_API_KEY` at load, so even `wav:check` needs a key. The tests pass a dummy. The controller's env has the real one; no model call is made. No action.

Not covered by this review: playing the wav or listening to the clips; the app; a real timeline from `auto()` (computeOffsets was read, not run on live40); the judge, answers and metrics behaviour on live40 (I1 comes from reading the code plus a 0-of-47 resolution check, not from running an export).

## Re-review (task-12-fix1, 6b422af on 51e98d0)

Scope: I1, M3, M4 against the controller's ruling; anything new in consumers of `chain`, `level`, `topic`, `route`. M1 deferred to Task 19; M2 is Task 13's.

**What I ran:**
- `live40.test.ts` + `roster.test.ts` from %TEMP%: 25/25 pass (+1, the I1 test).
- tsc: root 0, electron 6 (= baseline).
- Field check on the regenerated module:
  - level: 16 `followup`, 31 `main`;
  - all 16 `chain` values resolve to an item id, and every follow-up's parent is a main, so the one-hop `effective()` in metrics.mjs:470 is enough;
  - route: EASY 20 / HARD 27;
  - topic: 31 distinct.
- The questions module's item order and `q`/`gapMs` are unchanged, so the untracked wav stays valid. The report shows wav:check exit 0 after the fix.

**I1: resolved, per the ruling.**
- gen.mjs emits `chain = parent = <parent id>` and `level: 'followup'` on follow-ups, and `level: 'main'` with no `chain` on mains. `topic` holds the chain id and `route` is untouched.
- The new test drives the judge's own `questionForGrader`: 16/16 follow-ups carry `[Follow-up to: <parent q>]`, and mains are unchanged. The report says it failed 0/16 before the fix.
- The same test pins `gradeable(LIVE40) === 31`.

**Consumers, checked one by one:**
- **judge.mjs:57-62, 125, 165, 195, 260:** parents resolve. The grader prompt now reads `(main / C01)` or `(followup / C01)` instead of the old `(EASY / C01)`. That is an improvement: the router's route key no longer reaches the grader.
- **metrics.mjs:**
  - `gradeable` = 31;
  - `extra('followup')` = 16;
  - `effective()` maps a follow-up to its parent's `main`, which is not in `CODING_LEVELS` (`coding`, `codingHeavy`, `sql`), so live40 routing metrics are the same as before;
  - `'main'` is a new level value, but no consumer enumerates level values except `CODING_LEVELS` and the `'long'`/`'followup'` tests.
- **pass-record.mjs:30, 106, 212:** `isMain` gives 31; the tags print `main`/`followup`. Fine.
- **calibrate-audio.mjs:80, turns-fixture.mjs:51:** both only read `level === 'long'` or pass it through. Fine.
- **run.mjs:127 computeOffsets:** copies `level`, `topic` and `chain` (now the parent id) into the timeline. Task 13's `routerCapture.mjs` and `probeWait.mjs` read none of these four fields (grep). Fine.
- **Task 14 / 14A:** they read `route` (and `class`) from the `LIVE40` export, which is unchanged. No LAB script reads live40 fields yet.
- **answers.mjs:302:** see N1.

**M3: resolved.**
- `.gitignore` gains `live40.wav`, `live40-tts/` and `live40-tts-local/`, matching the holdout40 block.
- It sits before the existing `*.stale-*.json` line, which is not disturbed.

**M4: resolved.**
- The builder's refusal now ends "— run live40.clips.mjs first". The test asserts the full string.
- The plan's verbatim message is a prefix of the new one, so any check that searches for the plan's string still matches.

**New findings:**
- **MINOR N1:** the ruling says the bare arms answer follow-ups with parent context "as the existing harness does". They do not, and the existing harness never did.
  - answers.mjs:302 drops `level === 'followup'` items for any arm without `--captured`. `high` (flight.mjs:201) and `low` (:190) are `captured: false`, so on live40 they answer the 31 mains only.
  - Only `captured-high` (:195) answers the follow-ups, with the parent turns inside the replayed prompt.
  - This IS the existing behaviour, so no code change is needed. But the ruling's wording, and the registration (Task 19), should say "bare arms: 31 mains; follow-ups only in the captured arm and in-app", so that nobody expects 47 bare answers.
- **MINOR N2:** PLAN.md:1618 still reads `level: route, topic: chain`, and the brief's test bullet at :1624 says "31 chains". Update the plan text, or record the ruling beside it, so Task 15's whole-branch review does not flag the regenerated module as a deviation.

Nothing else new. The fix touches only the five files named in the report.

SPEC: PASS  QUALITY: APPROVE
