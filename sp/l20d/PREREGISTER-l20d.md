# PREREGISTER — L20d: does a short instruction written for Live close 3.8 Live's correctness gap to the app? (decides whether a fast-starter prototype is specified)

Written 2026-10-03, 00:06 local. At that point:
- no L20d audio had been played and the L20d harness did not exist;
- the treatment text below had been written only from L20c's measured failure class and the app's own spoken rules in `electron/llm/prompts.ts`, never from an item or an answer;
- L20c's answers had been graded once (2026-09-30); here they are graded again only inside this batch.
- **Disclosure (amendment 6, 00:19):** earlier the same night, 22:09–22:33 on 2026-10-02, two throwaway probes, `SP/et-live` and `SP/temp-live`, ran plain 3.8 Live and the app on 8 of these 38 items: S2Q02, S2Q02F, S2Q06F, S2Q07F, S1Q02, S1Q02F, S1Q04F, S2Q10F. They were graded blind and `et-live/analyze.out.txt` prints a per-item table. That was about 90 minutes before `instruction.txt` was written (00:06:46). The Opus pre-registration review read the instruction line by line against `prompts.ts` and L20c's LIVE MODE block and found nothing item-specific in it; the exposure is disclosed, not ruled out.
- Opus reviewed this file before any data (`l20d/PREREG-REVIEW.md`, APPROVE WITH FIXES, 0 C / 6 I / 10 M). Its fixes are applied below as numbered amendments (section "Amendments before the first Live call") or as tagged in-place corrections of factual statements; no Live call had been made when they were written.

The rule below is not changed after the data exists.

## Why

- **The user's request, 2026-10-02 ~23:55:** "start with this now", to the proposal "give it a fair second try as a fast starter: a short instruction written for Live ('answer every part asked, in order') on the same L20c items, graded in the same blind batch as the app; if it closes the gap, it earns a prototype". L20c's rule says only the user reopens the answerer, and only by a new pre-registration. This is it.
- **What L20c found (STOP, 2026-09-30):** bare 3.8 Live acceptable 0.617 against the app's 0.752; its answers shorter (median 63–67 words vs 74–82) and leaving an asked part out more often (85 of 222 grades below correctness 2, vs 59 of 302); first word p50 1.8 s vs the app's first token 6.1–6.6 s. Its system instruction was the app's 16,223-character TEXT-model prompt plus a LIVE MODE block; the 2026-09-28 probe found that prompt triples Live's thinking (942 vs 310 thought tokens with a one-sentence prompt).
- **What L20c's Live already had (corrected, amendment 5, 00:19):** the structure rule was not missing. All 19 captured s50k system prompts (16,223 characters, the ones L20c sent) contain `ANSWER THE QUESTION'S STRUCTURE`; it landed in 51caaff on 2026-09-10, before the s50k capture of 09-20, and L20c's LIVE MODE block told Live to follow "the answer's structure and length rules". The treatment therefore adds no rule. **The hypothesis is: the same rules, stated alone and short, change Live's part coverage.** What changes is prominence (the rule first, inside about 260 tokens, instead of buried in 5,135), the dropped rulebook, and probably the thinking budget (the 2026-09-28 probe: 942 vs 310 thought tokens).
- **What ET38 taught:** the same answers moved 0.770 → 0.649 between grading sessions. Rates compare ONLY within one blind batch; no L20c number is a bar here. The app is graded again in the same batch as Live.
- **Temperature stays unset** (no effect on 3.8 Live, 2026-10-02 probe). **holdout40 is not used.**

## The treatment: one instruction, one variant

`l20d/instruction.txt`, 1,210 bytes, LF line endings, **sha256 `e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f`**. The harness refuses to run if the file's hash differs. Verbatim:

```
You are listening to a job interview through the interviewer's microphone. The speaker is the interviewer. You answer as the candidate described in the CONTEXT below, in the first person, in words that are said out loud right now.

Wait until the interviewer has finished the whole question. Then say only the answer: no greeting, no acknowledgement, no "let me think", no narration, no questions back.

Most questions here have several parts. Find every part the question names and answer each one, in the order asked, in one or two sentences each. Leaving a part out reads as not knowing it. For each part say the specific thing asked: the mechanism, the named service, the number, the trade-off, never a generic remark. About 20 to 30 words per part; a one-part question in about 60 words; never more than 150 words. Open with substance, not with a restatement of the question.

If a part asks you to write, implement or code something, describe in words how you would build it: the approach, the key structure, and how edge cases and failures are handled. No code, formulas, markdown or numbered lists; every word must be pronounceable.

If what you heard is not a question for the candidate, say nothing.
```

- **Where it comes from:** the failure class (parts omitted, short answers) and the app's own spoken rules (`prompts.ts` `SPOKEN_LENGTH_AND_DEPTH`, declared at line 280; lines 282 and 296–300 [citation corrected in place, M1, 00:19]: 282 "AT MOST 60"; 296 multi-part questions and "leaving a part out reads as not knowing it"; 297 every part in the order asked, 20–30 words per part, 150 ceiling; 298 mechanism, named service, number, trade-off; 299 describe code in words, no code, formulas, markdown or lists, pronounceable; 300 first person, open with substance, no questions back). The instruction's "Most questions here have several parts" is the author's rewording of line 296's "Interviewers here ask multi-part questions": a claim about the roster, not the source's wording; the file is hashed and stays as written. Plus L20c's LIVE MODE basics (wait for the whole question, output only the answer, nothing if it is not a question). No item was consulted. No second variant is written or run; nothing is tuned on these items.
- **The CONTEXT slice STAYS.** The captured s50k user prompt's `CONTEXT:` block (the candidate's profile and the role, 2.9–4.0k characters, about 900 tokens) follows the instruction after two blank lines (the file ends in `\n` and the template adds `\n\n`; wording corrected in place, M10a, 00:19; the bytes are hashed and unchanged), as L20c sent it. Reasons: the app's own answers had it; behavioural and "in your experience" items are unanswerable without it; and it is not the 16,223-character text-model rulebook the probe tied to tripled thinking. That rulebook is dropped whole. The new system instruction is about 1,200 tokens against 5,135.

## Items: L20c's 38

The 19 scenario50 S1+S2 pairs of L20c: `l20b/items.json` (10 pairs: 5 hard, 5 normal) + `l20c/items.json` (9 pairs, normal). `l20d/items.json` is a byte copy of `et38/items.json`, which merged them; `make-l20d.mjs` checks 19 pairs, 38 distinct ids, hard 5, normal 14. Reporting groups as L20c: hard 10 items, normal 28.

## Live arm

- **Model:** `gemini-3.8-live`, no thinkingConfig, no temperature. One session per pair, three reps.
- **Harness:** `l20d/run.mjs` is `l20c/run.mjs` (itself `l20b/run.mjs` and `l20/run.mjs` with only line 16, the folder, changed: `diff` shows nothing else) with exactly these changes, made by `make-l20d.mjs` through exact-anchor swaps that must each match once; it prints the removed and added lines and proves every other line identical and in order (ET38's `make-et38.mjs` method):
  1. a header line prepended before `// L20 runner (see PREREGISTER-l20.md)`;
  2. after line 13 (`import { createRequire } from 'node:module';`): `import { createHash } from 'node:crypto';`;
  3. line 16: `/scratchpad/l20c';` → `/scratchpad/l20d';`;
  4. lines 31–36, the `const LIVE_MODE = \`[LIVE MODE]` … `[END LIVE MODE]\`;` block → three lines: `const INSTRUCTION_SHA256 = '<the hash above>';`, `const INSTRUCTION = fs.readFileSync(\`${HERE}/instruction.txt\`, 'utf8').replace(/\r\n/g, '\n');`, and a refusal (`process.exit(2)` with a message) when `createHash('sha256').update(INSTRUCTION).digest('hex') !== INSTRUCTION_SHA256`;
  5. line 42: `` return `${p.system}\n\n${p.user.slice(a, b).trim()}\n\n${LIVE_MODE}`; `` → `` return `${INSTRUCTION}\n\n${p.user.slice(a, b).trim()}`; ``;
  6. line 74: `` `${HERE}/runs/live38-r${REP}.json` `` → `` `${HERE}/runs/l20d-r${REP}.json` ``;
  7. line 76: `level: 'none',` → `level: 'none', instruction: INSTRUCTION_SHA256,`.
  Ten lines removed, nine added. Unchanged: the captured s50k prompts file (read for the CONTEXT slice only; referenced by path, sha256 `92cd829a6061d262a00bcfa6e48ddd8abe9d34b5893262779b38e7b2886f597c`), the clips and their 16 kHz feed in real time, AUDIO modality with input and output transcription, contextWindowCompression, the waits (6 s quiet after a turn of ≥ 25 words or a system-error message, 30 s after a shorter turn, 60 s with no output, cap 150 s), one transport retry per pair, a failed setup counted as abnormal.
- **Calibration before any audio:** a one-byte change to `instruction.txt` makes `run.mjs` refuse; `go.mjs --selftest`; `cal-score.mjs` on made-up verdict sets with known outcomes.
- **Extraction:** `et10/et-extract.mjs`, unchanged: the answer is the first post-question turn of ≥ 25 words or a system-error message; with no turn of ≥ 25 words, the last turn is the answer (et-extract's fallback; added in place, M10c, 00:19); holding turns and premature output are dropped; the app's filter chain is applied. The filter is MAIN's built `dist-electron/.../verbalStreamFilter.js`, which sessions rebuild: its sha256 is recorded at each extraction (today's begins `42d9bc42dbd17870`; it reproduces all 111 stored L20b/L20c answers), and if it differs the 111/111 check is re-run before the answers are used (amendment 10).
- **Pre-flight:** `node l20/health-probe.mjs` must answer 5/5 with no abnormal close (no 1011), run by `l20d/go.mjs` right before r1. The probe keeps its own L20c prompt: it measures the service, not the treatment. On a failure nothing runs in that window, and that is the reading.
- **Broken window (ET38's rule):** a rep that answers fewer than 19 of 38 stops the chain; the reps played count; the rest wait for a window after the s50l pooled decision. The 3.8 Live free-tier quota day resets at 10:00 local; today's small probes used an unknown part of it. How a cut-short rep, a resumed chain and a broken-window rep are read is fixed by amendment 3; a quota close by amendment 11.

## Comparator: the app's same four samples, and an anchor

- **s50m** (2026-09-22, 3.5-flash-lite HIGH first): in-app, captured-high r1, r2, r3; all 38 items; the captured-high-r2 answer to S2Q06 is empty after the app's filter (`raw` 649 characters, `spoken` 0; absent from the r2 pairs file; a hole; wording corrected in place, M6, 00:19); the four in-app answers served by the stall fallback are kept, labelled. **No new app calls.** br1 is not included: it was never a condition arm.
- **Anchor arm, reported only:** L20c's own Live answers (L20b r1–r3 for its 20 items, L20c r1–r3 for the 18; 111 of 114 answered; holes r1 S1Q02, S1Q02F, S1Q09F) are graded again inside this batch. They let two differences be read within one grader session: **tonight's Live with the instruction − 29 Sep's Live with the long prompt**, and 29 Sep's Live − app. The first is not the instruction's effect alone: it also holds the date, the service load and any change behind the `gemini-3.8-live` alias since 29 Sep (amendment 8). They are no condition. Cost: 222 grades. The arm is kept whatever the grader budget: decided now, before any answer exists (amendment 7; the plan-usage reading at 00:0x was weekly 58%, 5-hour window 6%).

## Grading: one blind batch

- 38 items × 10 arms (3 new Live, 4 app, 3 old Live) minus holes: about 375 answers, about 750 grades (about 530 without the anchor arm). Seeded random order (seed 20261003) under keys `id#k`; the key goes to `l20d-key/`, a folder no grader is pointed at; a batch is built once (REFUSED if the key exists).
- **Packets:** a seeded shuffle splits the 19 pairs into 4 packets of 5, 5, 5 and 4 pairs, so every answer of a question goes to the same two graders. Each packet: two fresh `claude-opus-5-5` graders, 8 agents; the model is read from every transcript (`grader-models.mjs`); independence from the transcripts (`grader-independence.mjs`); L20c's dispatch prompt verbatim except the packet path (`check-grader-prompts.mjs`: one text). A grader that fails the model check or the independence check is re-run on the same packet before the key is read; `validate-verdicts.mjs` checks each verdict file's shape and `writer-model.mjs` the writer's model (both already in `l20d/`) (amendment 12e).
- **Rubric:** the frozen s50k rubric, verbatim from s50k's `interview60.judge.pairs.json`. acceptable = correctness 2 and on_topic 2 and delivery ≥ 1; consensus-wrong = both graders scored correctness 0.
- **Holes are not sent:** a Live item not played or with an empty extracted answer; the empty app twin answer. A spoken system-error apology IS sent and graded (L20c's treatment; bare Live gave none in 114) and is also a hole for clause 4.
- **Scores:** a sample's rate = acceptable items, averaged over its two graders, divided by the items graded for it (this includes a graded apology; "answered" in clause 4 excludes one; wording fixed by amendment 9) (the starter read: a hole is covered by the pipeline). The holes-as-not-acceptable read over 38 is reported beside it.

## Decision rule (PROCEED needs all of 1–5; every rate comes from THIS batch)

1. **Quality:** mean rate of the three new Live reps ≥ mean rate of the app's four samples − 0.05.
2. **Band:** the new Live's worst rep ≥ the app's worst sample.
3. **Safety:** new Live consensus-wrong (114 slots) ≤ 1 + ⌊app consensus-wrong (152 slots, 151 answers: S2Q06 r2 is a hole; count corrected in place, M4, 00:19) × 0.75⌋. The 0.75 ratio stays as L20c registered it.
4. **Reliability over all 114 slots** (retitled from "Reliability tonight" by amendment 3): ≥ 110 of 114 slots answered after at most one transport retry per pair (L20c's 52 of 54 at this size), counted across whatever windows the reps ran in; a slot in a rep that was cut short or never resumed is a hole. Answered = played, non-empty extracted answer, not an apology (`mechanics-l20d.mjs`, L20c's predicate). A quota close counts as a hole like any other (amendment 11).
5. **Speed, the starter's point:** the first word of the real answer after the question ends has p50 ≤ 3.0 s and p90 ≤ 6.6 s, computed as fixed by amendment 4: n = 114 minus the slow-feed items that were answered; a hole is always included, as +∞, slow feed or not; the percentile is `sorted[min(n−1, floor(n·p))]` (`l20c/score.mjs:51`). The app's first token on these items is p50 6.1 s (s50m) and 6.6 s (br1): a starter that is not about 3 s ahead at the median has no point, and at the 90th percentile it must still have started by the app's typical first token. A slow-feed item (its clip sent in more than 1.30× its length) is left out of the latency numbers; its answer is graded.

L20c's clause 5, the scheduled 3-day health gate, is met: 9 of 9 slots PASS, 29 Sep–1 Oct (`l20c/gate.mjs`). It is not re-run for a design spec; the prototype's own flight registers its own gate.

**PROCEED** earns the prototype: a design spec for the fast starter (Fable; Opus review) in which Live's lines are shown first, about 2 s after the question, and the pipeline's answer replaces them in place; answer-based follow-ups stay on the pipeline (L38F); then throwaway spikes (manual turns, a 60-minute session, two Live sessions on one key), a build with the flag off, a smoke, its own pre-registered flight, and a holdout40 validation. Nothing ships on this result.

**STOP** if 1, 2 or 3 fails: this instruction did not close the gap; the answerer is closed again, and reopening is the user's decision with a new registration.

**WAIT** if 1–3 pass and 4 or 5 fails: the answers are good enough, but a starter without reliability or speed has no point; nothing is built; a re-test needs its own registration.

No read below substitutes for a clause: there is no second way to pass.

## Reported outside the rule

- per-rep and per-sample rates in both reads; the hard/normal split; the per-question table beside L20c's; grader agreement; which in-app answers the fallback served; each rep's start time; abnormal closes and retries.
- the anchor: the old Live reps' rates in this batch, new − old, old − app.
- starter reads, from the event timestamps, no grader: the words arrived by 6.6 s after the question (the part of each answer on screen before the pipeline's first token would land); the last word p50/p90; words per answer (L20c: 63–67 Live, 74–82 app); thought tokens per answer (L20c: 91–952; the one-sentence probe: 310); holding lines; premature starts.
- whether the opening lines are correct is NOT graded here: it needs its own instrument, which the prototype's spec defines if PROCEED.

## Expectation, before data

- The hypothesis is that the same rules, stated alone and short, change Live's part coverage (L20c's prompt already carried the structure rule; corrected in place, amendment 5, 00:19). If it holds, I expect tonight's Live mean above 29 Sep's Live in the same batch by about 0.05 to 0.10, and still a little below the app: clause 1 near its bar, a coin flip; clause 2 failing more often than not (Live's rep spread in L20c was 0.12, and the app's worst sample is its in-app hour). Safety passes. Clause 5's p50 should pass (L20c's first word 1.8 s; a short prompt thinks less), but its p90 is near its bar: with the same definition L20c's Live read 6.4 s against the 6.6 s bar, and L20b's half alone 12.9 s, so clause 5 depends on the service hour (corrected in place, M9, 00:19). Reliability passes on a healthy night. My prior for PROCEED is under one in three; the most likely verdict is STOP on clause 2 with clause 1 close.
- **Sensitivity:** 38 items × 3 reps detect only large effects. The app's own four samples spread 0.658–0.803 on these items with one model; two graders disagreed on 9 of 299. A true difference of ±0.05 can pass or fail clause 1 by sampling; about 0.10 is needed to read reliably. A STOP does not prove the instruction useless; a PROCEED does not prove it robust — holdout40 does that later.

## Not covered (residual risks)

- TTS voice, one session per pair, no barge-in (the next clip waits for the answer), no candidate speech in the session (in the app Live would hear the candidate too), no screenshots or coding-pad questions, one night's service load, the free-tier quota.
- The starter UX itself: replace-in-place, a wrong opening line shown and then replaced, flicker. Not measured.
- Follow-ups: here Live answers the follow-up with its own previous answer in context (L20c's shape, kept for comparability). In the starter the candidate may have spoken the pipeline's answer, and answer-based follow-ups stay on the pipeline regardless. The follow-up items' Live grades do not model that path.
- Prompt and build drift: the comparator is the 2026-09-22 build; the CONTEXT slice is the s50k capture of 2026-09-20.
- The items are not a holdout: I have seen L20c's per-question table, and (amendment 6) the per-item table of tonight's `et-live` / `temp-live` probes, 22:09–22:33, on 8 of these items (S2Q02, S2Q02F, S2Q06F, S2Q07F, S1Q02, S1Q02F, S1Q04F, S2Q10F), about 90 minutes before the instruction was written. The instruction was written from the class and the app's rules, not from items; this test cannot prove that. holdout40 stays untouched.
- The instruction's effect in the app's real shape (a second Live session beside the ear; L38M: a router cannot share the ear's prompt), session length beyond a pair, and the paid-tier cost are not measured.
- Alias drift (amendment 8): the anchor arm was played on 29 Sep; anything behind the `gemini-3.8-live` alias that changed since is inside "tonight's Live − 29 Sep's Live" and cannot be separated from the instruction.
- The dropped 16k rulebook held more than the structure rule, including how to use the CONTEXT and the résumé for experience questions; here experience questions are answered without that guidance (amendment 12d).

## Order of work and schedule, 3 Oct (the user, 00:0x: "can we continue now until we get the grades?")

1. The controller builds `make-l20d.mjs` → `run.mjs`, `items.json`, `go.mjs` (specified by amendment 2: `et38/go-et38.mjs` adapted, not L20c's), `blind.mjs`, `score.mjs`, `mechanics-l20d.mjs`, `cal-score.mjs` (its known cases: amendment 4), and calibrates each on known cases before any audio.
2. An Opus review of this file. Any amendment before the first Live call is numbered and dated here; after it, nothing in the rule changes.
3. This file is committed to MAIN `electron/test/golden/passes/PREREGISTER-l20d.md` before the first Live call.
4. Pre-flight probe, then r1, r2, r3 (about 105 min: ET38's three low reps on these 19 pairs took 104), extraction, mechanics; then the blind batch and its 8 graders tonight. Plan usage at 00:0x: weekly 58%, 5-hour window 6% (the controller's reading), so one batch tonight leaves Saturday's 8 s50l graders safe.
5. **Saturday guard:** every L20d Live call and every grader is finished by 09:30 local. `go.mjs` refuses to start a rep after 07:45; a grader not dispatched by 08:30 waits. Whatever is unfinished at 09:30 stops and resumes after the s50l pooled decision (its re-run starts 10:05 on gemini-3.5-flash-lite and then needs its 8 graders; L20d's Live calls touch no lite model). A batch is never rebuilt; a stopped grader is re-run on the same packet.
6. The result note goes to `passes/2026-10-03-l20d-result.md` with `score.mjs`'s verdict verbatim, and a row goes into `passes/INDEX.md`; both name the grader model (the user's pass-record rule). The commit goes through a temporary `GIT_INDEX_FILE`, since MAIN's index is shared (amendment 12f).

## Amendments before the first Live call

Written in one pass after the Opus review, starting at `date` = 2026-10-03 00:19:28 +0300 local; no Live call had been made. Each amendment names the review item it answers. In-place corrections of factual statements are tagged where they stand and listed at the end.

1. **(I6) ANSWERED 2026-10-03 00:26:00 local: clauses 4 and 5 STAY.** The user approved "if it closes the gap, it earns a prototype". This registration also requires clauses 4 and 5 for PROCEED, so a quality pass can end as WAIT with no prototype; clause 5's p90 bar of 6.6 s sits just above L20c's own 6.4 s, and one slow service hour can withhold the prototype. The question put to the user, before the first Live call: "closing the gap = clauses 1-3; a starter must also be reliable (4) and fast (5), or the verdict is WAIT". Offered as A (keep both: PROCEED needs clauses 1-5) or B (closing the gap, clauses 1-3, alone earns the prototype). The user's answer, quoted: "A, keep both". The rule reads as written: PROCEED needs 1-5; 1-3 pass with 4 or 5 failing = WAIT.

2. **(I1) `go.mjs` is `et38/go-et38.mjs` adapted, not L20c's.** 00:19. L20c's `go.mjs` has no broken-window stop, refuses to start when any run file exists (so a chain could never resume) and kills a rep at 45 min, which a 38-item rep (32–37 min in ET38, plus 150 s caps and 60 s no-output waits) can exceed. `l20d/go.mjs` is `go-et38.mjs` with these changes: one arm (no levels, no early stop); the run file `l20d-rN`; the clock guard in schedule step 5 replacing ET38's window guard, checked before the pre-flight and before every rep; a rep timeout of min(80 min, the time left to 09:30 local). It keeps go-et38's mechanism: a finished rep (its answers file exists) is skipped, a run file with no answers file is refused, the `m.last < 19` stop applies. `go.mjs --selftest` must cover: 07:44 may start, 07:46 may not, and a resume after a finished r1. The controller checks the built `go.mjs` against this before the pre-flight (it was built while the review ran; its flat 80-minute timeout and selftest cases must be brought to this spec or shown to meet it).

3. **(I2) How an incomplete chain is read; clause 4 retitled.** 00:19. A rep is played at most once. A rep cut short (by the timeout or the 09:30 stop) counts as played; its unplayed items are holes and are never re-run. Clause 4 counts all 114 slots across whatever windows the reps ran in; each rep's window (start and end time, date) is reported. A broken-window rep (< 19 answered) leaves at least 20 holes, so clause 4 FAILS by arithmetic and the best verdict is WAIT; the remaining reps then run only to decide STOP vs WAIT. Clause 4 is retitled "Reliability over all 114 slots".

4. **(I3) Clause 5's n and percentile.** 00:19. n = 114 minus the slow-feed items that were answered. A hole is always included, as +∞, slow feed or not. The percentile is `sorted[min(n−1, floor(n·p))]` (`l20c/score.mjs:51`). `cal-score.mjs` must reproduce L20c's old-arm numbers under this definition (p50 1.8 s, p90 6.4 s over 114) as a known case, plus a slow-feed-hole case (a hole whose clip fed slowly is still a +∞ entry).

5. **(I4) The premise.** 00:19. L20c's Live already had the structure rule (all 19 captured s50k system prompts contain `ANSWER THE QUESTION'S STRUCTURE`, landed 51caaff 2026-09-10; L20c's LIVE MODE block pointed at the structure and length rules). The hypothesis is stated as: the same rules, stated alone and short, change Live's part coverage. "Why" and "Expectation" were corrected in place and tagged; "The instruction removes part-omission" is withdrawn.

6. **(I5) Disclosure of tonight's probes.** 00:19. `SP/et-live` and `SP/temp-live`, 22:09–22:33 on 2026-10-02, ran plain 3.8 Live and the app on 8 of these 38 items (S2Q02, S2Q02F, S2Q06F, S2Q07F, S1Q02, S1Q02F, S1Q04F, S2Q10F), graded blind, with a per-item table in `et-live/analyze.out.txt`, about 90 minutes before `instruction.txt` was written. Added to "At that point" and "Not covered". The review found nothing item-specific in the instruction; this is a disclosure, not a leak finding.

7. **(M2) The anchor arm is kept; the cut clause is removed.** 00:19. The clause "if the batch must be cut for grader budget, this arm is cut, before packets are built" let the batch's composition be decided after the new answers existed. Decided now: the anchor arm (222 grades) is in the batch whatever the budget. Plan usage read at 00:0x: weekly 58%, 5-hour window 6%.

8. **(M3) The anchor read is relabelled.** 00:19. "new Live − old Live" becomes "tonight's Live with the instruction − 29 Sep's Live with the long prompt"; it carries the date, the service load and any change behind the `gemini-3.8-live` alias since 29 Sep. Alias drift is added to "Not covered".

9. **(M5) "Items graded" in Scores.** 00:19. The rate's denominator is the items graded for the sample (a graded apology is in it); clause 4's "answered" excludes an apology. The two words now say what they mean.

10. **(M7) The filter is pinned.** 00:19. The extraction records the sha256 of MAIN's built `verbalStreamFilter.js` at each run (today's begins `42d9bc42dbd17870`, which reproduces 111/111 stored L20b/L20c answers). If a later extraction sees a different hash, the 111/111 check is re-run against the stored answers before that extraction's output is used.

11. **(M8) A quota close is a hole like any other.** 00:19. A close whose reason names quota or `RESOURCE_EXHAUSTED` (the run file records `close.code` and `close.reason`) counts for clause 4 as a hole like any other abnormal close: it is the service a starter would depend on. `mechanics-l20d.mjs` records quota closes distinctly (count and item ids) beside the other abnormal closes, so the reading can be seen.

12. **(M10 d, e, f) Small additions.** 00:19. (d) "Experience questions answered without the rulebook's CONTEXT guidance" added to "Not covered". (e) A grader that fails the model or independence check is re-run on the same packet before the key is read; `validate-verdicts.mjs` and `writer-model.mjs` (already in `l20d/`) are named in Grading. (f) The result note also goes into `passes/INDEX.md`; both name the grader model; the commit goes through a temporary index since MAIN's index is shared. (b) needs no change: `run.mjs` header comments 2–5 still describe the long prompt plus LIVE MODE and its new line 1 explains this.

**In-place corrections of factual statements, all 00:19, each tagged where it stands:** M1 (citations: 282, 296–300, and "most" as the author's gloss on line 296); M4 (clause 3: 152 slots, 151 answers); M6 (S2Q06 r2: empty after the app's filter); M9 (Expectation: clause 5's p90 is near its bar); M10a (two blank lines before CONTEXT); M10c (et-extract's last-turn fallback); and the I4 wording in "Why" and "Expectation" (amendment 5).

Pass closed at `date` = 2026-10-03 00:22:23 +0300; `check-prereg.mjs` re-run after the edits: code block == instruction.txt true, sha256 in doc matches file `e29bf381…1f3f`, 8 of 8 anchors ok. Only amendment 1's quoted answer remains to be filled in; after it, nothing in the rule changes. Filled in 2026-10-03 00:26:00 (the user: "A, keep both"); the rule is now closed.
