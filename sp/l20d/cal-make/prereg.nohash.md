# PREREGISTER — L20d: does a short instruction written for Live close 3.8 Live's correctness gap to the app? (decides whether a fast-starter prototype is specified)

Written 2026-10-03, 00:06 local. At that point:
- no L20d audio had been played and the L20d harness did not exist;
- the treatment text below had been written only from L20c's measured failure class and the app's own spoken rules in `electron/llm/prompts.ts`, never from an item or an answer;
- L20c's answers had been graded once (2026-09-30); here they are graded again only inside this batch.

The rule below is not changed after the data exists.

## Why

- **The user's request, 2026-10-02 ~23:55:** "start with this now", to the proposal "give it a fair second try as a fast starter: a short instruction written for Live ('answer every part asked, in order') on the same L20c items, graded in the same blind batch as the app; if it closes the gap, it earns a prototype". L20c's rule says only the user reopens the answerer, and only by a new pre-registration. This is it.
- **What L20c found (STOP, 2026-09-30):** bare 3.8 Live acceptable 0.617 against the app's 0.752; its answers shorter (median 63–67 words vs 74–82) and leaving an asked part out more often (85 of 222 grades below correctness 2, vs 59 of 302); first word p50 1.8 s vs the app's first token 6.1–6.6 s. Its system instruction was the app's 16,223-character TEXT-model prompt plus a LIVE MODE block; the 2026-09-28 probe found that prompt triples Live's thinking (942 vs 310 thought tokens with a one-sentence prompt).
- **What ET38 taught:** the same answers moved 0.770 → 0.649 between grading sessions. Rates compare ONLY within one blind batch; no L20c number is a bar here. The app is graded again in the same batch as Live.
- **Temperature stays unset** (no effect on 3.8 Live, 2026-10-02 probe). **holdout40 is not used.**

## The treatment: one instruction, one variant

`l20d/instruction.txt`, 1,210 bytes, LF line endings, **sha256 `x`**. The harness refuses to run if the file's hash differs. Verbatim:

```
You are listening to a job interview through the interviewer's microphone. The speaker is the interviewer. You answer as the candidate described in the CONTEXT below, in the first person, in words that are said out loud right now.

Wait until the interviewer has finished the whole question. Then say only the answer: no greeting, no acknowledgement, no "let me think", no narration, no questions back.

Most questions here have several parts. Find every part the question names and answer each one, in the order asked, in one or two sentences each. Leaving a part out reads as not knowing it. For each part say the specific thing asked: the mechanism, the named service, the number, the trade-off, never a generic remark. About 20 to 30 words per part; a one-part question in about 60 words; never more than 150 words. Open with substance, not with a restatement of the question.

If a part asks you to write, implement or code something, describe in words how you would build it: the approach, the key structure, and how edge cases and failures are handled. No code, formulas, markdown or numbered lists; every word must be pronounceable.

If what you heard is not a question for the candidate, say nothing.
```

- **Where it comes from:** the failure class (parts omitted, short answers) and the app's own spoken rules (`prompts.ts` `SPOKEN_LENGTH_AND_DEPTH`, lines 282 and 297–300: every part in the order asked, 20–30 words per part, about 60 for one part, 150 ceiling, describe code in words, first person, open with substance, no questions back), plus L20c's LIVE MODE basics (wait for the whole question, output only the answer, nothing if it is not a question). No item was consulted. No second variant is written or run; nothing is tuned on these items.
- **The CONTEXT slice STAYS.** The captured s50k user prompt's `CONTEXT:` block (the candidate's profile and the role, 2.9–4.0k characters, about 900 tokens) follows the instruction after one blank line, as L20c sent it. Reasons: the app's own answers had it; behavioural and "in your experience" items are unanswerable without it; and it is not the 16,223-character text-model rulebook the probe tied to tripled thinking. That rulebook is dropped whole. The new system instruction is about 1,200 tokens against 5,135.

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
- **Extraction:** `et10/et-extract.mjs`, unchanged: the answer is the first post-question turn of ≥ 25 words or a system-error message; holding turns and premature output are dropped; the app's filter chain is applied.
- **Pre-flight:** `node l20/health-probe.mjs` must answer 5/5 with no abnormal close (no 1011), run by `l20d/go.mjs` right before r1. The probe keeps its own L20c prompt: it measures the service, not the treatment. On a failure nothing runs in that window, and that is the reading.
- **Broken window (ET38's rule):** a rep that answers fewer than 19 of 38 stops the chain; the reps played count; the rest wait for a window after the s50l pooled decision. The 3.8 Live free-tier quota day resets at 10:00 local; today's small probes used an unknown part of it.

## Comparator: the app's same four samples, and an anchor

- **s50m** (2026-09-22, 3.5-flash-lite HIGH first): in-app, captured-high r1, r2, r3; all 38 items; the captured-high-r2 answer to S2Q06 is empty (a hole); the four in-app answers served by the stall fallback are kept, labelled. **No new app calls.** br1 is not included: it was never a condition arm.
- **Anchor arm, reported only:** L20c's own Live answers (L20b r1–r3 for its 20 items, L20c r1–r3 for the 18; 111 of 114 answered; holes r1 S1Q02, S1Q02F, S1Q09F) are graded again inside this batch. They let the instruction's own effect be read within one grader session: new Live − old Live, and old Live − app. They are no condition. Cost: 222 grades. If the batch must be cut for grader budget, this arm is cut, before packets are built; the rule reads the same without it.

## Grading: one blind batch

- 38 items × 10 arms (3 new Live, 4 app, 3 old Live) minus holes: about 375 answers, about 750 grades (about 530 without the anchor arm). Seeded random order (seed 20261003) under keys `id#k`; the key goes to `l20d-key/`, a folder no grader is pointed at; a batch is built once (REFUSED if the key exists).
- **Packets:** a seeded shuffle splits the 19 pairs into 4 packets of 5, 5, 5 and 4 pairs, so every answer of a question goes to the same two graders. Each packet: two fresh `claude-opus-5-5` graders, 8 agents; the model is read from every transcript (`grader-models.mjs`); independence from the transcripts (`grader-independence.mjs`); L20c's dispatch prompt verbatim except the packet path (`check-grader-prompts.mjs`: one text).
- **Rubric:** the frozen s50k rubric, verbatim from s50k's `interview60.judge.pairs.json`. acceptable = correctness 2 and on_topic 2 and delivery ≥ 1; consensus-wrong = both graders scored correctness 0.
- **Holes are not sent:** a Live item not played or with an empty extracted answer; the empty app twin answer. A spoken system-error apology IS sent and graded (L20c's treatment; bare Live gave none in 114) and is also a hole for clause 4.
- **Scores:** a sample's rate = acceptable items, averaged over its two graders, divided by the items it answered (the starter read: a hole is covered by the pipeline). The holes-as-not-acceptable read over 38 is reported beside it.

## Decision rule (PROCEED needs all of 1–5; every rate comes from THIS batch)

1. **Quality:** mean rate of the three new Live reps ≥ mean rate of the app's four samples − 0.05.
2. **Band:** the new Live's worst rep ≥ the app's worst sample.
3. **Safety:** new Live consensus-wrong (114 answers) ≤ 1 + ⌊app consensus-wrong (152 answers) × 0.75⌋.
4. **Reliability tonight:** ≥ 110 of 114 items answered after at most one transport retry per pair (L20c's 52 of 54 at this size). Answered = played, non-empty extracted answer, not an apology (`mechanics-l20d.mjs`, L20c's predicate).
5. **Speed, the starter's point:** over all 114 items (a hole = no first word), the first word of the real answer after the question ends has p50 ≤ 3.0 s and p90 ≤ 6.6 s. The app's first token on these items is p50 6.1 s (s50m) and 6.6 s (br1): a starter that is not about 3 s ahead at the median has no point, and at the 90th percentile it must still have started by the app's typical first token. A slow-feed item (its clip sent in more than 1.30× its length) is left out of the latency numbers; its answer is graded.

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

- The instruction removes part-omission, so I expect the new Live mean above the old Live's in the same batch by about 0.05 to 0.10, and still a little below the app: clause 1 near its bar, a coin flip; clause 2 failing more often than not (Live's rep spread in L20c was 0.12, and the app's worst sample is its in-app hour). Safety passes; speed passes with the first word at or under L20c's 1.8 s, since a short prompt thinks less; reliability passes on a healthy night. My prior for PROCEED is under one in three; the most likely verdict is STOP on clause 2 with clause 1 close.
- **Sensitivity:** 38 items × 3 reps detect only large effects. The app's own four samples spread 0.658–0.803 on these items with one model; two graders disagreed on 9 of 299. A true difference of ±0.05 can pass or fail clause 1 by sampling; about 0.10 is needed to read reliably. A STOP does not prove the instruction useless; a PROCEED does not prove it robust — holdout40 does that later.

## Not covered (residual risks)

- TTS voice, one session per pair, no barge-in (the next clip waits for the answer), no candidate speech in the session (in the app Live would hear the candidate too), no screenshots or coding-pad questions, one night's service load, the free-tier quota.
- The starter UX itself: replace-in-place, a wrong opening line shown and then replaced, flicker. Not measured.
- Follow-ups: here Live answers the follow-up with its own previous answer in context (L20c's shape, kept for comparability). In the starter the candidate may have spoken the pipeline's answer, and answer-based follow-ups stay on the pipeline regardless. The follow-up items' Live grades do not model that path.
- Prompt and build drift: the comparator is the 2026-09-22 build; the CONTEXT slice is the s50k capture of 2026-09-20.
- The items are not a holdout: I have seen L20c's per-question table. The instruction was written from the class and the app's rules, not from items; this test cannot prove that. holdout40 stays untouched.
- The instruction's effect in the app's real shape (a second Live session beside the ear; L38M: a router cannot share the ear's prompt), session length beyond a pair, and the paid-tier cost are not measured.

## Order of work and schedule, 3 Oct (the user, 00:0x: "can we continue now until we get the grades?")

1. The controller builds `make-l20d.mjs` → `run.mjs`, `items.json`, `go.mjs` (L20c's with the folder, the run file names and the clock guard in 5), `blind.mjs`, `score.mjs`, `mechanics-l20d.mjs`, `cal-score.mjs`, and calibrates each on known cases before any audio.
2. An Opus review of this file. Any amendment before the first Live call is numbered and dated here; after it, nothing in the rule changes.
3. This file is committed to MAIN `electron/test/golden/passes/PREREGISTER-l20d.md` before the first Live call.
4. Pre-flight probe, then r1, r2, r3 (about 105 min: ET38's three low reps on these 19 pairs took 104), extraction, mechanics; then the blind batch and its 8 graders tonight. Plan usage at 00:0x: weekly 58%, 5-hour window 6% (the controller's reading), so one batch tonight leaves Saturday's 8 s50l graders safe.
5. **Saturday guard:** every L20d Live call and every grader is finished by 09:30 local. `go.mjs` refuses to start a rep after 07:45; a grader not dispatched by 08:30 waits. Whatever is unfinished at 09:30 stops and resumes after the s50l pooled decision (its re-run starts 10:05 on gemini-3.5-flash-lite and then needs its 8 graders; L20d's Live calls touch no lite model). A batch is never rebuilt; a stopped grader is re-run on the same packet.
6. The result note goes to `passes/2026-10-03-l20d-result.md` with `score.mjs`'s verdict verbatim.
