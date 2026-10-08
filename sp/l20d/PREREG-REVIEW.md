# Review of PREREGISTER-l20d.md (Opus, 2026-10-03 ~00:20 local)

**VERDICT: APPROVE WITH FIXES** (Critical 0, Important 6, Minor 10)

Reviewed: `l20d/PREREGISTER-l20d.md` (mtime 00:07:58), `l20d/instruction.txt` (00:06:46), plus every file the review brief named. The review was read-only: no model calls, no `.env`, and no prompt contents printed (prompts-file checks were booleans, lengths and hashes only). I also looked at the harness files the controller built while this review ran (`make-l20d.out.txt`, `cal-run-refusal.out.txt`, `l20d/run.mjs`, 00:15–00:16) to check them against the registration.

## What was verified and holds

| claim | evidence | result |
|---|---|---|
| instruction.txt sha256 `e29bf381…1f3f`, 1,210 bytes, LF | `sha256sum`: same hash. `wc -c` 1210. 0 CR bytes. Ends in `\n`, ASCII only, 208 words | holds |
| Code block in the registration = instruction.txt | `check-prereg.mjs`: `code block == instruction.txt: true` | holds |
| l20c/run.mjs = l20b/run.mjs = l20/run.mjs except line 16 | `diff` of all three pairs: only `16c16` (HERE) | holds |
| 7 swap anchors match l20c/run.mjs once each, at lines 1, 13, 16, 31/36, 42, 74, 76 | `check-prereg.mjs`: 8 of 8 `ok`, each 1 match at the stated line | holds |
| 10 lines removed, 9 added | 1+6+1+1+1 removed; 1+1+1+3+1+1+1 added. The built `l20d/run.mjs` diff against l20c matches exactly (`make-l20d.out.txt`: 194→193 lines, 184 common) | holds |
| items.json = et38/items.json; 19 pairs, 38 ids, hard 5 / normal 14 | `cmp`: identical. The hard pairs = l20b's hard list; normal = l20b's 5 + l20c's 9 | holds |
| s50k prompts sha256 `92cd829a…597c` | computed: identical | holds |
| Sources: prompts.ts `SPOKEN_LENGTH_AND_DEPTH` 282, 297–300 | MAIN (branch fix/coding-style-suffix-all-gemini) line 280 is the declaration. 282: "AT MOST ${SPOKEN_WORD_TARGET}" (=60). 297: every part, in order, 20–30 words per part, ceiling `${SPOKEN_WORD_CEILING}` (=150). 298: mechanism / named service / number / trade-off. 299: describe code in words, no code/formulas/markdown/lists, pronounceable. 300: first person, open with substance, no questions back | holds; see M1 for line 296 |
| No item knowledge in the treatment | Line-by-line: every sentence traces to prompts.ts 282/296–300 or to L20c's LIVE MODE block (l20c/run.mjs 31–36). There are no topics, services, numbers or item phrasings | holds; see I5 for what the author had seen |
| CONTEXT slice 2.9–4.0k chars, ~1,200 tokens total | measured 2,911–4,041 chars over the 19 mains. Plus 208 words of instruction, that is ~1.1–1.2k tokens | holds |
| Old Live anchor: 111/114, holes r1 S1Q02, S1Q02F, S1Q09F | `check-inputs.mjs`: `answered 111, holes r1 S1Q02, r1 S1Q02F, r1 S1Q09F`, words p50 64, first word p50 1744 ms. Matches the L20c result table | holds |
| App arm: s50m in-app + captured-high r1/r2/r3, all 38, S2Q06 r2 a hole | All four pairs files contain the 38, except r2, where S2Q06 is absent from the pairs file. In the r2 answers file its `spoken` is 0 chars (`raw` 649 chars): emptied by the filter | holds (M6 wording) |
| L20c clause 5 gate met 9/9 (29 Sep–1 Oct) | `node l20c/gate.mjs`: 9 slots PASS, 5/5, 0 abnormal; `health gate: PASS`, exit 0. probe-schedule.log has 9 slot lines with `answered 5/5; abnormal closes 0` | holds |
| Reliability bar 110/114 | 52/54 × 114 = 109.8 → 110 (also L20b's 58/60 → 110.2; ET38 used 110) | holds |
| Extraction filter unchanged in effect | MAIN `dist-electron/.../verbalStreamFilter.js` was rebuilt 2026-10-01, after L20c. I re-ran the et-extract chunking and filter chain in memory on all 111 stored L20b/L20c answers: **111 same, 0 differ** | holds today (M7) |
| Refusal calibration cannot start a real rep | `cal-run-refusal.out.txt`: uses a network-blocking hook on a copy. One byte changed, a space added, the last byte removed or the file missing all lead to a refusal with no network attempt, and the real instruction.txt is untouched | holds |
| Scheduling against a 10:05 run on another model | No scheduled task has a next run time (`Get-ScheduledTask`: every Natively-* task has an empty next run, including `Natively-probe-live38`). L20d calls only gemini-3.8-live, not 3.5-flash-lite. Reps took 32–37 min in ET38 (go.log), so a 07:45 start ends by ~08:25 | consistent (I1 covers the timeout) |
| No second way to pass | The anchor arm, the holes-as-not read and the starter reads are reported only. The registration says "No read below substitutes for a clause" | holds |

## Important

**I1. `go.mjs` is specified as L20c's, which cannot run this registration.** In "Order of work" step 1, go.mjs is "L20c's with the folder, the run file names and the clock guard". But `l20c/go.mjs`:
- has no broken-window stop (fewer than 19 of 38 stops the chain), which the registration requires (the "Broken window" bullet);
- refuses to start if any run file exists (line 49), so "the rest wait for a window" can never be resumed;
- kills a rep at **45 min** (line 62). L20c's reps were 18 items. A 38-item rep took 32–37 min in ET38, and ET38 used 80 min. A few 150 s caps or 60 s no-output waits push a rep past 45 min. The rep then dies as a non-zero exit, with a partial run file and no rule for it.

The mechanism the registration describes is `et38/go-et38.mjs`: it skips finished reps, refuses a run file that has no answers file, applies the `m.last < 19` stop, checks the window before each rep, and has `--selftest`.
**Fix:** state that go.mjs is go-et38.mjs with these changes: one arm (no levels, no early stop), the run file `l20d-rN`, and the clock guard replacing the window guard. The guard must be checked before the pre-flight and before every rep. Rep timeout = min(80 min, time left to 09:30). Add selftest cases: 07:44 may start, 07:46 may not, and one case with a resume after a finished r1.

**I2. How an incomplete chain is read is not fixed, so it could be decided after the data.** Three cases have no rule:
- a rep cut short by the timeout or the 09:30 stop (re-run in full, or count it as played with its unplayed items as holes?);
- reps that resume on another day under a clause titled "Reliability **tonight**";
- what a broken-window rep does to the verdict.

**Fix:** add one paragraph:
- A rep is played at most once. A rep that is cut short counts as played; its unplayed items are holes and are never re-run.
- Clause 4 counts all 114 slots across whatever windows ran. Each rep's window is reported.
- A broken-window rep (< 19 answered) leaves at least 20 holes, so clause 4 FAILS by arithmetic and the best verdict is WAIT. The remaining reps then run only to decide STOP vs WAIT.

**I3. Clause 5's denominator and percentile are ambiguous.** The clause says "over all 114 items (a hole = no first word)" and also says slow-feed items are "left out of the latency numbers". It does not say whether a slow-feed hole is in or out, or what n is. It also names no percentile function. ET38 measured over answered items only, and L20c over all items with holes as no first word. The two definitions give different p90s near a bar that matters (see M9).
**Fix:**
- State: n = 114 minus the slow-feed items that were answered. A hole is always included, as +∞, slow feed or not. The percentile is `sorted[min(n−1, floor(n·p))]` (l20c/score.mjs:51).
- Make `cal-score.mjs` reproduce L20c's old-arm numbers (p50 1.8 s, p90 6.4 s over 114) as a known case, plus a slow-feed-hole case.

**I4. The treatment's premise is misstated: L20c's Live already had the same rules.** In all 19 captured s50k system prompts (16,223 chars, the ones L20c sent), `ANSWER THE QUESTION'S STRUCTURE` is present. The rule landed in 51caaff on 2026-09-10, before s50k (09-20). L20c's LIVE MODE block also told Live to follow "the answer's structure and length rules". So the treatment adds no rule. It changes:
- prominence (the rule first, inside 260 tokens, instead of buried in 5,135);
- the dropped rulebook;
- probably the thinking budget (the 942 vs 310 probe).

Yet the Expectation says "The instruction removes part-omission", and "Why" implies the rule was missing.
**Fix:**
- Say this in "Why" and in "Expectation".
- Name the hypothesis: the same rules, stated alone and short, change Live's part coverage.
- Reword the anchor read (new − old) to "tonight's short instruction vs 29 Sep's long prompt" (see M3).

**I5. The author's exposure to these items is under-disclosed.** The registration says "No item was consulted" and, in "Not covered", only "I have seen L20c's per-question table". But at 22:09–22:33 tonight, `SP/et-live` and `SP/temp-live` ran plain 3.8 Live and the app on 8 of these 38 items (S2Q02, S2Q02F, S2Q06F, S2Q07F, S1Q02, S1Q02F, S1Q04F, S2Q10F). They were graded blind, and `et-live/analyze.out.txt` prints a per-item table. That was about 90 minutes before instruction.txt was written. I found nothing item-specific in the text (see the table above), so this is a disclosure fix, not a leak.
**Fix:** add both probes, their items and times to "At that point" and to "Not covered".

**I6. The added gates go past the user's stated condition and need the user's explicit yes.** The user approved: "if it closes the gap, it earns a prototype." The registration also requires clauses 4 and 5 for PROCEED, so a quality pass can end as WAIT with no prototype. This follows L20c's and ET38's structure, and the starter logic supports it. But clause 5's p90 ≤ 6.6 s sits just above L20c's own 6.4 s, and L20b's half alone read 12.9 s. One slow service hour can therefore withhold the prototype the user said a quality pass earns.
**Fix:** before the first Live call, show the user one line ("closing the gap = clauses 1–3; a starter must also be reliable (4) and fast (5), or the verdict is WAIT"). Record their answer as numbered amendment 1.

## Minor

- **M1. Citations.** "Leaving a part out reads as not knowing it" and "Most questions here have several parts" come from prompts.ts **line 296**, which is not cited. Also, "most" is a claim about the roster, not the source's "Interviewers here ask multi-part questions". **Fix:** cite 282, 296–300.
- **M2. The anchor-cut decision.** "If the batch must be cut for grader budget, this arm is cut, before packets are built". This is made after the new Live answers exist, and it changes the batch's composition (contrast effects on graders). **Fix:** decide now, or state an objective trigger now (for example, the 5-hour window reading above X% when blind.mjs runs).
- **M3. The anchor's "the instruction's own effect".** new − old also contains the date, the service load and any change behind the `gemini-3.8-live` alias since 29 Sep. **Fix:** label it "tonight's Live with the instruction − 29 Sep's Live with the long prompt", and add alias drift to "Not covered".
- **M4. Clause 3's count.** "app consensus-wrong (152 answers)": the app sends 151 (one hole). **Fix:** "152 slots, 151 answers". The 0.75 ratio stays as L20c registered it.
- **M5. Two meanings of "answered".** In Scores, the rate's denominator is "items it answered", which includes graded apologies. In clause 4, "answered" excludes apologies. **Fix:** write "items graded" in Scores.
- **M6. Wording of the S2Q06 hole.** It is absent from the r2 pairs file. Its `spoken` is empty although `raw` is 649 chars, so the filter emptied it. It is still a hole. **Fix:** "empty after the app's filter" (and the same in the result note).
- **M7. Pin the filter.** The extraction loads MAIN's built `dist-electron` filter chain. Today it reproduces 111/111 stored answers, but sessions rebuild MAIN's dist (and the s50l re-run uses a pre-cue snapshot). **Fix:** record the sha256 of `verbalStreamFilter.js` at each extraction (today's begins `42d9bc42dbd17870`). Re-check 111/111 if it differs.
- **M8. Quota.** The free-tier 3.8 Live day ends at 10:00 local, and tonight's probes used an unknown part of it. A quota close would read as unreliability. **Fix:** say now how a close whose reason names quota or RESOURCE_EXHAUSTED counts (a hole like any other, or a broken window). The run file already records `close.code/reason`.
- **M9. Expectation on speed.** "Speed passes" is stated without the margin. With the same definition, L20c's Live p90 was 6.4 s against a 6.6 s bar. **Fix:** say clause 5's p90 is near its bar and depends on the service hour.
- **M10. Small items, one line each:**
  - (a) The system text has two blank lines, not one, before CONTEXT, because the file ends in `\n` and the template adds `\n\n`. Fix the wording; the bytes are hashed and fine.
  - (b) run.mjs header comments 2–5 still describe the long prompt plus LIVE MODE. The new line 1 explains this; acceptable.
  - (c) The extraction summary omits et-extract's fallback: with no turn of ≥ 25 words, the last turn is the answer.
  - (d) The dropped 16k rulebook holds more than the structure rule, including how to use the CONTEXT and resume for experience questions. Add "experience questions answered without the rulebook's CONTEXT guidance" to "Not covered".
  - (e) Name what happens when a grader fails the model or independence check: re-run on the same packet before the key is read. Name `validate-verdicts.mjs` and `writer-model.mjs`, which are already copied into l20d.
  - (f) The user's pass-record rule: the result note also goes into `passes/INDEX.md`, and both name the grader model. Commit through a temp index, since MAIN's index is shared.

## Not checked

- The controller's `blind.mjs`, `score.mjs`, `mechanics-l20d.mjs`, `cal-score.mjs` and the l20d `go.mjs` did not exist when I read the folder (only make/run/cal-refusal did).
- The plan-usage figures (58% / 6%) and the user's quoted words, which I have only from the brief and memory.
