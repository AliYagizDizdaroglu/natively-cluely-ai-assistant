# Design: turn-based follow-up context (the parent question, kept by turn, gated on its absence)

Written 2026-10-03 17:12 local (Fable); revision 2 at 17:30 after the Opus review (`SPEC-REVIEW.md`, APPROVE WITH
FIXES: C1, I1–I5 and the Minors applied; disagreements in §10); revision 3 at 17:38 after the scoped re-review
(`SPEC-REREVIEW.md`, APPROVE WITH FIXES: N1, N2, n1–n5 applied); revision 4 at 17:45 after the second scoped
re-review (`SPEC-REREVIEW-2.md`, APPROVE WITH FIXES: R1, r1–r3 and its smoke note applied; text only). Design only: no code, no model call, no holdout
text opened. Read: memory notes (followup-earlier-questions, h40b/h40c/h40d, not-a-question-close, whole-turn,
length-inflation, gemini-38-live L38P), `followup-deepdive/FINDINGS.md`, design 2 (`followup-context/`), its
pre-registration and both results (`followup-questions/`, `followup-questions-s50l/`), and MAIN's code. Branch
check: MAIN is on `fix/coding-style-suffix-all-gemini` (34fc254); the whole-turn worktree is on
`feat/whole-turn-answers` (c2fff1e), 15 docs-only commits behind, and `electron/` is byte-identical between the two
for every file named here (the review confirmed by sha1 for 9 files). The build lands in MAIN.

## 1. Problem, and what the two failed designs proved

- `SessionTracker.contextWindowDuration = 120` evicts the parent QUESTION; `TemporalContextBuilder` keeps ≤ 3
  answer previews of 200 chars for 180 s, framed "Avoid Repetition". Roster follow-ups arrive 150–190 s after
  their parent (deep dive: parent absent ⇔ gap ≥ 120 s, 110/227 rows; acceptable 86 % present vs 63 % absent;
  19/20 off-topic answers parentless). Second cut: `sparsifyTranscript` keeps only the last 6 interviewer turns
  once the window holds > 12 turns, so "in the window" and "in the prompt" are not the same thing.
- Design 1 (6c50ec3): whole previous exchange, any question, 2–5 min after an answer. FAIL (wrong 0→1; two items
  lost). Lesson: never the answer; never ungated.
- Design 2 (94adb6f, questions-only block, surface-cue gate): pooled s50m+s50l FAIL on clause 1 with the gain at
  its bar (+8/42). The one wrong was S2Q09F: its parent S2Q09 was in the prompt, so the `reference` cue's
  GRANDPARENT rule inserted the older S2Q08F question. The gain is real where an evicted parent is restored
  (S1Q04F, S1Q06F www→YYY/wYY/YwY on both days). S2Q05F re-answered its coding parent once (Thu, from the parent
  line itself), reversed Sat — sampling-sized, but the label must forbid re-answering.

This design keeps design 2's measured parts (gate, caps, placement, byte rule, replay instrument) and changes
the three things the data blames: retention by turn, selection = the previous question only, a label that
forbids re-answering. Its new states (§3.6) are absent from every recording, so they are proven by tests and a
smoke, not by the replay (§6).

## 2. Goals and non-goals

Goals: (1) a follow-up whose parent question left the prompt gets that one question back, as one labelled line
(auto mode, the turn path);
(2) every other prompt is byte-identical to today's; flag off, every prompt is and the ledger is not written;
(3) no new wrong, no rise in off-topic, not later, not longer, not more thinking — proven offline on
non-holdout captures before a build, then in its own flight; (4) any failure inside the feature = today's
prompt.

Non-goals: previous ANSWERS (design 1); answer-dependent follow-ups ("why did you choose X?" — L38P: 12/18 at
roster timing even with the preview; needs a gist of the app's own answer, a separate design); a semantic
dependency model; callbacks to questions older than the parent (§8, v2); the not-a-question close and the
Live-echo dispatcher defects (their own fix); the coding/screenshot framing and the recap/clarify/brainstorm/
refine paths; the typed chat path (`gemini-chat-stream` never reaches `runWhatShouldISay`: it neither writes
the ledger nor gets a block).

## 3. The design

### 3.1 Question ledger: retention by turn

`SessionTracker.askedQuestions: { text, turnId: number | null, seq: number }[]`, newest last, capped at
`LEDGER_DEPTH = 3`. It is written inside `runWhatShouldISay`, for every call with a pinned question (`settled`),
synchronously right after `preparedTranscript` is final (IntelligenceEngine.ts:353) and right after the block
for that call is built: there is no `await` between :298 and :353, so each call's block-then-write is atomic
and the ledger order is the call order even when two calls overlap on the awaited `classifyIntent` (n3). Every
answering path writes it (turn dispatch, Live dispatch, chip click with `contextOverride`, answer-now, manual
"what to answer" with a pinned text), and the write can never change the bytes of the call that makes it.
`turnId` is captured on the `DetectionInput` at dispatch time (not read inside `answerDetection` after its
screenshot `await`) and arrives through `options`: the turn machine's `snapshot().id` on the auto turn path,
`null` elsewhere.

**The block is built only when `options.turnId != null`** — the auto turn path, where every admitted question
is dispatched and "newest entry" really is the previous asked question. In suggest and off mode a question
reaches `runWhatShouldISay` only when its chip is CLICKED, so the ledger there holds clicked questions: a
skipped chip would shift the parent to an older question (click Q1, skip Q2 and Q3, click "Why that one?" → the
block would insert Q1 while Q3 sits in the snapshot — the S2Q09F shape on a path no recording covers; re-review
N1). Those paths still write the ledger (a real asked question, a duplicate harmless) and get today's prompt.
Giving chip paths a block is a v2 item: it needs emitted chips (`dispatch: chip`) recorded as asked, and its own
current-question identity, because the clicked chip is then already in the ledger.

| Call | Ledger write |
|---|---|
| any `settled` call whose `turnId` the ledger does not hold, or `turnId` null | push |
| a `settled` call whose `turnId` the ledger holds (the 8 s supersede: head + tail) | REMOVE that entry and PUSH the new text as newest (one entry per machine turn; `syncTurnIdentity`'s rule: mirror the machine's id, never its notifications). Remove-and-push, not replace in place: a `turnId: null` entry newer than the head (answer-now re-running it) would otherwise sit above the superseded text (n2) |
| the R21 supersede re-entering through `dispatchDetection` | its head never reached the answer branch (`turnDedupId` undefined), so no entry exists: a PUSH (n4). Two causes (main.ts:1010-1013): the head was dropped by the deduper as an answered duplicate, or it was a Live-sourced head under 4 words dropped by `isFragment` (r2) |
| `settled` null (manual with nothing dispatched) | nothing; block '' |
| flag off | nothing: the flag-off path is literally today's code |
| `reset()` (new meeting) | cleared |

Why at dispatch, not at answer completion: a follow-up refers to what was ASKED. An answer aborted by a stall or
a supersede (IntelligenceEngine.ts:464-468) or filtered as a fallback phrase (SessionTracker.ts:255-258) still
leaves the question the interviewer asked. Why inside `runWhatShouldISay` and not at `dispatch: answer`: the
chip, answer-now and manual paths never pass `dispatchDetection` (ipcHandlers.ts:2387-2444, :2373-2385), and
suggest mode never dispatches `answer` at all — written there, the ledger would be empty on every one of them.

No text-based dedup. On the dispatch path a re-fire of an answered question within 60 s is dropped before it
reaches `runWhatShouldISay` (`decideDispatch` drops `alreadyAnswered`), so anything that arrives there is a
question the deduper judged different; chip, answer-now and manual calls bypass the deduper (n5), and their
duplicates are harmless too (below). `sameAnchor` on short follow-ups matches their parent on frame words
alone ("Why that one?" is `sameAnchor` to 16 of the 50 scenario50 mains) — a dedup would replace the parent
with its follow-up and hand the next selection the grandparent: the S2Q09F shape again (review C1). A duplicate
entry is harmless: the parent is the newest entry, and a copy of it is the same text; answer-now's re-run of
the current question gets '' through containment in the pinned line.

`LEDGER_DEPTH = 3`: v1 reads only the newest entry (and a supersede returns '' without reading), so any depth
≥ 1 selects the same parent; 3 is a buffer so the diag line and a flight audit can show the last three asked
questions (n2). A v2 callback rule needs its own depth and its own reason.

### 3.2 Gate: cue AND parent absent from the prompt

Two conditions, both required; either failing = '' (today's prompt):

1. **Cue** — design 2's calibrated surface gate, unchanged: `callback`, `reference`, `leading`, `constraint`,
   `pronoun` (first comma-free segment), `short` (≤ 3 words); interjection strip; 19 must-fire / 10 must-not
   sentences (scenario50 texts and invented ones, no holdout sentence). Measured on the scenario50 roster:
   follow-ups needing a parent 11/12 fired (miss S5Q04F), standalone follow-ups 1/38 false (S4Q10F), dependent
   mains 4/4, standalone mains 0/46. On captured STT text it fires on 8 of 39 ids in s50m and 8 of 39 in s50l
   (S1Q01 was captured in neither). Why keep a cue rather than "absent only": the block is paid for on every
   fire (§3.4), and self-contained evicted follow-ups already score 9/9 (S1Q05F, S1Q08F, S2Q04F) — a block
   there is cost with no gain and an untested risk (design 1's wrong, S2Q07F, was a parentless self-contained
   item). Design 2's gate caused none of its failures; its selector did.
2. **Parent absent from the PROMPT** — the parent (§3.3) is `sameAnchor` to none of the `[INTERVIEWER]:` lines
   of `preparedTranscript` except the pinned last line, and is not contained in the pinned line itself (a Live
   merge, R07F, or a re-ask of the same question: the text is already there). Checked on the prepared
   transcript, not on `getContext`, because of `sparsifyTranscript`'s 6-interviewer-turn cut. Residual: a parent
   present only as a tail fragment after that cut counts as present (named, §7).

### 3.3 Selection: the previous question, nothing else

- **Parent** = the newest ledger entry, read only on the auto turn path (`options.turnId != null`, §3.1). The
  current question is not in the ledger yet when the block is built, so no text identity is needed (review
  m6). Exception: on a **supersede** (`replaceAnswer === true`)
  the newest entry is this turn's own head, and the block is '' — the head is already in the pinned line, and
  "two questions in one turn" (the interviewer adds a second question before the candidate speaks; the turn
  supersedes, interviewerTurn.ts:233-243) would otherwise hand the merged text's cue the grandparent (review
  I2).
- **No older entry enters in v1.** No grandparent, no term search. S2Q09F's recorded trace: the only candidate is
  S2Q09, in the prompt → ''. The same rule makes S1Q08/S2Q08 '' (their parent S1Q07F/S2Q07F is in the prompt):
  those "extend that design" mains lose a grandparent line that read +1/+1 (S1Q08) and 0/−1 (S2Q08).
- **Parent in the prompt** → '' (S2Q01F on both days: byte-identical).
- **Age**: no time cap. Retention is by turn; a cap would re-create the eviction.
- Output: at most ONE line.

### 3.4 Block: wording, placement, size

```
EARLIER QUESTION (asked earlier; context only, do not answer it again; answer only the question under INTERVIEWER JUST SAID):
- <parent, ≤ 450 chars>
```

"asked earlier", not "asked and answered": the ledger deliberately holds parents whose answer was aborted
(review m8). Over 450 chars the parent keeps its head (150) + `…` + its tail (299): the task is named in the
first clause and the referent sits at the end (S1Q04's tie rule at char 300, S1Q06's "zero calls" at 350 of a
407-char question); design 2's head-only clip would have dropped exactly the referent (m7). Max captured
length is 409 in both hours; longer texts come only from joined whole-turn finals, so the cut is a tested
state, not a measured one.

Placement: the last context part before `INTERVIEWER JUST SAID:` — after PREVIOUS RESPONSES, verbal framing
only: pushed into `contextParts` before the join at WhatToAnswerLLM.ts:227 under
`intentResult?.intent !== 'coding'` (m5: `isCodingForFraming` is declared after the join). Passed to
`generateStream` as its own argument so `preparedTranscript`, `classifyIntent`'s input, `lastInterviewerTurn`
(the knowledge lookup that once sent "salary" to the negotiation card) and `temporalContext` stay
byte-identical. Byte rule: `fullMessage_on = fullMessage_off` with `${block}\n\n` inserted immediately before
`INTERVIEWER JUST SAID:\n`, whether or not `extraContext` is empty; the replay's `insertBlock` does the same to
a captured `user`, so the replay tests what ships.

Size: label 125 chars (~31 tokens) + parent ≤ 450 chars (~110 tokens): worst case ~580 chars / ~140 tokens on
a ~5,500-token request (s50m: system 16 k chars, user 4–6 k). Provenance of 450: the longest scenario50
question is 407 chars. Cost prior, from design 2's answer files on the FOUR items this design keeps (S1Q04F,
S1Q06F, S2Q05F, S2Q08F; 24 pairs, paired medians): thinking +74.5 tokens (per-pair −341…+348), TTFT +261.5 ms,
words +3 — about half the +150 thinking bar and half the +500 TTFT bar (review I4; the pooled 89-pair figures
+2 / +131 ms / +3 are diluted by shorter D-case blocks and longer callback blocks, 272–908 chars). The cue
lesson (h40d 2c: +161 thinking tokens for a ~600-char RULE) is about a rule that changes the output format; a
context line is measured by its own clause (§6). The label is new bytes; it and the selector are the two
variables the replay measures.

### 3.5 Data flow (delta only)

```
IntelligenceEngine.runWhatShouldISay(question, …, options { turnId?, replaceAnswer?, … }):
   preparedTranscript final (both branches)                                                   unchanged
   earlier = buildEarlierQuestion({ enabled, question: settled, turnId: options.turnId ?? null,
                                    supersede: !!options.replaceAnswer, ledger: session.getAskedQuestions(),
                                    promptLines: interviewerLinesBefore(preparedTranscript) })   NEW, pure; '' when turnId null
   console.log('[IntelligenceEngine] earlier question: gate=… cue=… chars=… turn=… ms=…')  (flag on only) NEW
   if (enabled && settled) session.recordAskedQuestion(settled, options.turnId ?? null)        NEW, same tick, no await between
   … await classifyIntent …                                                                     unchanged
   generateStream(..., liveTexts, onCues, earlier.block)                                       new optional arg
WhatToAnswerLLM.generateStream:  if (intentResult?.intent !== 'coding' && block) contextParts.push(block)  NEW
main.ts dispatchDetection / actOnTurn supersede: d.turnId = this.turn.snapshot().id (on the DetectionInput,
   at dispatch) → answerDetection passes options.turnId                                       NEW (auto path)
```

The diag line carries the turn id so a flight log can audit the ledger (m9); the supersede log line itself has
none, so the replay's ledger rebuild maps a supersede to its entry through `replaces=` and says so in the
registration.

Flag `NATIVELY_EARLIER_QUESTION` (unset/''/'0' off, '1' on, junk throws at startup; refuses to start with
`NATIVELY_FOLLOWUP_PARENT=1` set too). The commit that makes this default also removes `withParentExchange`
and its flag in one reviewed change.

### 3.6 Fail-safe and the state table — every row is a deterministic test

| State | Prompt |
|---|---|
| flag off / junk flag | byte-identical, no ledger write / app refuses to start |
| ledger empty (first question), `settled` null | '' |
| parent in the prompt (short gap) | '' |
| parent contained in the pinned line (Live merge, R07F) | '' |
| re-ask of the parent (same text, its earlier copy evicted) | parent = the same text, contained in the pinned line → '' (m3) |
| **distinct quick follow-up < 60 s after its parent sharing a frame word ("Why that one?")**, parent in the prompt — and its 90 s control | '' both; the parent entry is KEPT (no dedup; review C1) |
| supersede, continuation of the same question | '' (newest entry = this turn's head) |
| **two questions in one turn** (supersede of a different question) | '' (I2); residual: one dispatch carrying "Q1? And Q2-with-pronoun?" can fire on Q2's words and add the previous turn — named |
| R21 supersede re-entering as `dispatch: answer`, head dropped by the deduper | a PUSH, no `replaceAnswer`; block '' in practice because the head duplicated an answered question still in the prompt — the test asserts that block (n4) |
| R21 supersede, head dropped by `isFragment` (Live-sourced, under 4 words) | a PUSH; the normal gated block, whose parent is the previous turn's question — the correct referent; tested (r2) |
| supersede after an answer-now re-ran the head (`turnId: null` entry newer than the head) | the head's entry is removed and the merged text pushed newest (n2) |
| double dispatch past the deduper | duplicate entry; parent unchanged |
| chip click (`contextOverride`), answer-now, manual with a pinned text — in auto mode | ledger written; block only with a `turnId` (none here) → '' |
| **suggest or off mode: click Q1, skip Q2 and Q3, click a follow-up chip** | ledger written (clicked questions only); `turnId` null → '' (N1); the chip's 60 s snapshot is today's prompt |
| question the app never dispatched (R05 lost, not-a-question close, fragment drop) | the previous DISPATCHED question becomes a wrong referent, bounded by the label, one line; measured by the D-cases (§6) |
| late Live echo of Q dispatched as its own turn at 61 s (before the next question R) | ledger [Q, Q-echo]; R, a follow-up of Q, gets Q's text (from the echo): a harmless duplicate (r1) |
| late Live echo of Q at 76 s, AFTER the next question R (roster gaps start at 65 s) | ledger [Q, R, Q-echo]; R's follow-up gets parent Q, absent from the prompt while R is present — a WRONG referent, bounded by the label; the 76 s test asserts that outcome; cured by the dispatcher fix (n1) |
| aborted or stalled parent | recorded; the label says "asked earlier", not "answered" |
| parent over 450 chars | head 150 + `…` + tail 299 |
| parent present only as a fragment after the sparsify cut | counts as present → '' (residual) |
| coding framing / screenshot / knowledge-card short-circuit | block ignored; a coding main IS recorded, so a verbal follow-up to it gets it (S1Q04F's case) |
| any exception in gate/select/format, or in the ledger write | caught, logged `gate=error`, '' — the answer, history and UI are untouched |
| hedge / stall race / first-token abort | same bytes to every leg; no timing change |

## 4. Interaction with the turn machine and the ears

- **Whole-turn dispatch**: one ledger entry per machine turn id; the 8 s supersede removes it, pushes the merged
  text newest, and gets ''.
  A turn that closes `not-a-question` or `nothing-heard` never dispatched and writes nothing (m4:
  `continuation-expired` closes only after a dispatch, whose entry exists). The machine forgets the closed turn
  and so does the ledger — consistent; the cost is the wrong-parent row, the cure is the proposed
  declined-not-dropped dispatcher fix, not this design.
- **Live ear**: in auto mode the pinned text is the turn's STT finals joined; Live's rendering is pinned only
  when the turn has no final (m2). So the paraphrase-vs-STT `sameAnchor` miss (a duplicate parent line ≤ 450
  chars, harmless) is the no-finals case only. A Live MERGE (R07F) is the containment case → ''.
- **ChipDeduper**: untouched and not reused.
- **Cue mode** (`__CUES__`): the block is a context part, the cue rule a tail of the system prompt; no shared
  bytes. The replay runs on pre-cue captures; the flight must state which prompt shape it flies (MAIN still
  ships `CUE_RULE` while the 10-02 ruling, cue OFF by default, is parked).

## 5. Derived numbers

| Constant | Value | Provenance |
|---|---|---|
| `LEDGER_DEPTH` | 3 | v1 reads only the newest entry; 3 is an audit buffer for the diag line and the flight read |
| block scope | auto turn path only (`turnId != null`) | suggest/off mode's ledger holds clicked chips, not asked questions (N1) |
| lines in the block | 1 | the parent line carried the gain (S1Q04F, S1Q06F) and one loss (S2Q05F Thu, reversed Sat); the grandparent line carried S1Q08's +1 and S2Q09F's wrong |
| parent cap | 450 chars, head 150 + tail 299 | longest scenario50 question 407 chars, referent at chars 300–350 |
| label | 125 chars | shortest wording naming the three facts: asked earlier, context only, do not re-answer |
| text dedup | none | `decideDispatch` already drops re-fires; `sameAnchor` on short follow-ups matches 16/50 mains |
| age cap | none | retention is by turn |
| gate | design 2's cue set | calibration 19/10; roster recall 11/12, false 1/38 + 0/46 |
| window check | prompt lines, not `getContext` | `sparsifyTranscript` keeps 6 interviewer turns past 12 |
| thinking clause | ≤ +150 tokens paired median | h40d 2c's bar (the cue rule FAILED it at +161); prior on the 4 items +74.5 |

## 6. Evaluation plan (outline; the PREREGISTER is written after the spec is approved)

**What the replay can and cannot measure.** It measures the label and the parent line on the 4
evicted-parent items (S1Q04F, S1Q06F, S2Q05F, S2Q08F) and the wrong-parent line on D1–D3. It cannot see any
state §3.6 adds: s50m and s50l have no pair of distinct questions under 65 s, one same-turn supersede (s50l
S1Q02, 0.9 s), 42/42 `continuation-expired` closes and no not-a-question close. Those states are proven by the
§3.6 tests and observed in the flight; before default-ON a short SMOKE with invented quick follow-ups ("Why?",
"Why that one?" 20–40 s after a parent) exercises the regime where C1 and I2 live, which neither roster holds.
Those follow-ups are under 4 words, and a Live-sourced turn whose joined text is under 4 words is dropped by
`isFragment` before it marks the turn (main.ts:2089): the smoke's registration must require a `pinned question`
log line for every scripted follow-up and count a missing line as "not exercised", never as a pass.

**Material**: s50m and s50l captured prompts (the newest pre-cue shapes, the same two design 2 used; 39 ids
each). holdout40 captures are never opened. Arm A = captured bytes; arm B = `insertBlock(userA, block)` from a
reference implementation (`earlierQuestion.ref.mjs`, derived from `earlierQuestions.ref.mjs` with §3.3–3.4),
the ledger rebuilt per id from the hour's `dispatch: answer|supersede` lines cut at the id's own dispatch
(supersedes mapped through `replaces=`). About half of s50l's windows repeat s50m's (the result note's
"What this does not show"), so the two hours are not independent material.

**Items**: 4 roster ids per hour get a block; S1Q08, S2Q08, S2Q09F, S2Q01F are '' and are NOT called. D1–D3 per
hour, rebuilt for the new label. Callbacks C1–C6 dropped with the callback rule (v2). Saturday's verdicts on the
4 ids are a prior: same parent line, different label.

**Arms and size**: front leg 3.5-lite HIGH (the hedge front after h40c): 4 ids × 2 hours × 5 reps = 40 roster
pairs + D-cases 3 × 2 × 5 = 30 pairs → 140 calls on 3.5-lite. Back leg 3.1-lite LOW on the 4 roster ids × 2
hours × 3 reps = 24 pairs = 48 calls on 3.1-lite (review I5: the hedge sends the same bytes to both legs, and on
S1Q06F the shipped app reads 8/9 acceptable with the parent absent while arm A reads www on 3.5-lite HIGH —
part of the gain may be a replay-model effect). 188 calls + retries, each lite model under its own 500/day
cap, one quota day with no flight and no other pre-registered lite replay. Interleaved A/B per (item, rep). Eight Opus graders from a cwd with NO project memory (the memory
names this experiment and its bars; m13), the frozen rubric, `questionForGrader` carrying the parent, model id
read from each transcript; `decide()` calibrated on synthetic verdicts for every branch and mutation-tested
before any real verdict.

**Clauses, fixed order** (each at least as strict as design 2's):
1. no new wrong, BOTH legs, read per leg: consensus-wrong B ≤ A over the 70 front-leg pairs AND B ≤ A over the
   24 back-leg pairs — else FAIL (the hedge sends the same bytes to both legs; N2 rule (a)). Price, stated for
   the user, under the model "consensus-wrong rate p per pair per arm, A and B independent binomials per leg,
   NO real effect" (re-review 2, `falsefail.mjs`, exact):

   | p per pair | 42 pairs (design 2) | 70 front | 24 back | either leg fails (the rule chosen) | pooled 94 |
   |---|---|---|---|---|---|
   | 0.5 % | 15.7 % | 22.1 % | 10.1 % | **29.9 %** | 25.9 % |
   | 0.75 % | 20.7 % | 27.4 % | 14.0 % | **37.5 %** | 30.9 % |
   | 1 % | 24.5 % | 30.9 % | 17.3 % | **42.8 %** | 34.0 % |

   So about 30–43 % for the per-leg rule (front leg alone 22–31 %; 16–25 % at design 2's 42). Pooling both legs
   (26–34 %) is cheaper but would hide a back-leg wrong behind the front leg; the user chooses in §9.2. Kept
   deliberately; a single-draw FAIL is read as what it is;
2. no rise in off-topic (an answer to the EARLIER question is off-topic by the rubric): B ≤ A — else FAIL;
3. not later, on the 40 ROSTER pairs (the shape that ships; the 70-pair figure reported beside): paired TTFT
   median ≤ +500 ms (FAIL > +1000); p90 B ≤ p90 A + 2000; stalls > 10 s: B ≤ A + 3 (2 per 39 pro rata, rounded
   up, on 40);
4. not longer, on the 40: paired words median ≤ +5 (FAIL > +10);
5. **not more thinking** (new), on the 40: paired `thoughtsTokenCount` median ≤ +150 — else FAIL;
6. parity precondition, before the first call (m12): (a) the reference returns '' for every non-gated id of
   both hours from the log-rebuilt ledger, S2Q09F/S1Q08/S2Q08/S2Q01F asserted by id; (b) the 8 gated blocks'
   sha256 frozen; (c) at build time the app reproduces (a) and (b) on the fixture, and the flag-off dist
   builder reproduces the captured bytes as design 2's `--calibrate` did;
7. gain, roster pairs (40): Δ consensus-acceptable ≥ +8 PASS (4/21 scaled, rounded up), ≤ +2 FAIL, between
   INCONCLUSIVE; reported PER ITEM as well as pooled, so a pass carried by one item is visible; the back leg's
   Δ reported beside (descriptive here; its wrong answers decide only in clause 1). One pooled re-run on s50k
   allowed; a second INCONCLUSIVE = FAIL.

The prior puts the expected gain near +18 on 40 pairs, so clause 7 mostly confirms that the known gain
survives the new label; clauses 1–5 are where this replay can fail.

**What PASS licenses**: build behind the flag (OFF) in MAIN, TDD on every §3.6 row + the §6 fixture, Opus
review, the quick-follow-up smoke; then its own pre-registered scenario50 S1+S2 flight with the flag ON (zero
wrong among gated items as a clause; the diag `ms=`, `turn=` and the thinking read from the log; the cue-mode
state stated). holdout40 stays OFF until that flight passes, then only as validation, never as a tuning target;
the three holdout sentences seen on 2026-09-28 bias any reading of R02F/R09F/R11F and the note must say so.
FAIL: never built; INCONCLUSIVE: the one re-run.

## 7. What it does not solve; residual risks

- Answer-dependent follow-ups (why did you choose X / how long did it take): need the app's own answer gist;
  L38P 12/18 at roster timing. Separate design, after this one flies.
- A parent the app never dispatched (R05 lost by both ears; a not-a-question close; a fragment drop): the
  previous dispatched question becomes a wrong parent. Bounded by the label and one line; measured by D1–D3
  (design 2 read D1 ooo→wwY, D2 wYw→www, D3 ooY→YYY on s50l — mixed, inside noise). The cure is the
  dispatcher fix.
- The gain rests on two items (S1Q04F, S1Q06F: +10 of design 2's +11 on the kept 4 over 24 pairs), whose
  windows repeat across the two hours; and S1Q06F's arm-A baseline (www on 3.5-lite HIGH) disagrees with the
  shipped app (8/9 in-app with the parent absent) — the back leg and the per-item read exist to show this.
- One dispatch carrying two questions ("Q1? And Q2-with-pronoun?") can fire on Q2's words and add the previous
  turn; a Live echo of Q dispatched late as its own turn AFTER the next question R (76 s shape; roster gaps
  start at 65 s) makes R's follow-up carry Q as a wrong referent — bounded by the label, cured by the
  dispatcher fix. Named, tested, not measured.
- Suggest and off mode get no block in v1 (their ledger holds clicked chips, not asked questions); chip
  paths are a v2 item with emitted chips recorded as asked.
- A parent present only as a tail fragment after the sparsify cut counts as present.
- Gate misses stay today's prompt (S5Q04F-like; STT-mangled "Extended to…" for S2Q06F, 1/9 in-app, the single
  worst roster follow-up — not reached; a Live rendering that keeps "Extend it" is).
- Parent-present misses (S2Q02F 4/9, S2Q01F, S2Q10F) are model capability, untouched.
- The replay is pre-cue bytes; the flight is the shipped shape.

## 8. Alternatives considered

1. **Turn-based transcript window** (SessionTracker keeps the last K interviewer turns regardless of age):
   changes every prompt's bytes, brings whole answers back (design 1's measured harm), feeds the classifier and
   the knowledge lookup different text, grows every request by ~1–2 exchanges. Rejected.
2. **Raise `contextWindowDuration` to ~200 s**: design 1 by another name (answers included, ungated), and
   `sparsifyTranscript` would still cut to 6 interviewer turns. Rejected.
3. **Design 2 with the grandparent rule removed, no ledger change**: fixes S2Q09F's trace but keeps the
   answer-based list (misses aborted turns, chip/manual paths), the 300 s cap and the old label. The recommended
   design is this plus those fixes; the extra cost is one ledger write per answered call.
4. **Callback rule in v1** (older questions on "going back to…"): no roster example, descriptive-only data
   (C2 improved, C4 Yww unchanged), a term search — the selection shape that failed. Deferred to v2 with its own
   registration and its own depth.
5. **Block on every path, including clicked chips in suggest/off mode** (revision 2): the ledger there holds
   clicked questions, so a skipped chip inserts an older, wrong question (N1). "Nothing" on those paths is
   today's prompt, which is safe; a wrong referent is not. Rejected: the block is auto-path only, the ledger is
   written everywhere (ready for v2's emitted-chip recording).

**Recommendation**: §3 as written, replayed per §6 (front leg 5 reps, back leg 3 reps, 188 calls), built only
on PASS, smoked on quick follow-ups before default-ON.

## 9. Open questions for the user (with the reviewer's view)

1. Ledger written inside `runWhatShouldISay` for every pinned call (turn id captured at dispatch), but the
   BLOCK only on the auto turn path; suggest/off-mode chips get today's prompt until a v2 records emitted chips
   (recommended; the re-review's fix). Or should v2's chip support be pulled into v1 now?
2. Front leg 5 reps (140 calls on 3.5-lite) plus the 3.1-lite LOW back leg on the 4 roster ids × 2 hours × 3
   reps (48 calls) = 188 — the reviewer's preference over more reps; s50k kept as the allowed re-run. And how
   clause 1 reads the two legs, with its false-FAIL price at 0.5–1 % wrong per pair and no real effect (exact
   binomials, §6 table):
   - **per leg, either leg failing** (stricter): 30–43 % — recommended, because the hedge ships the same bytes
     to both legs and a back-leg wrong must not hide behind the front leg;
   - **pooled across both legs** (94 pairs): 26–34 %;
   - for scale, design 2's 42 pairs carried 16–25 %.
   Which rule?
3. The new label ("asked earlier; context only, do not answer it again") — the reviewer agrees: the only lever on
   S2Q05F's one-draw re-answer; the replay measures it.
4. Callbacks: v2 (recommended, reviewer agrees) or in v1?
5. After PASS: scenario50 S1+S2 flight with the flag ON, holdout40 OFF until it passes (reviewer agrees); the
   quick-follow-up smoke before default-ON; the flight states its cue-mode shape. Confirm the order.

## 10. Review response (where this revision departs from the review)

- m7 asked for tail-only or head + tail; chosen head 150 + tail 299, because the first clause names the task
  ("Implement evaluation for…") and the tail the constraint; a tail-only cut past 450 would keep the constraint
  and lose what it constrains. Untested beyond 409 chars either way; it is a §3.6 test, not a measurement.
- m10 asked to drop the v2 justification for depth 3; done. Revision 2's replacement reason ("depth 1 would
  make a double dispatch hide the parent") was wrong — v1 reads only the newest entry, which a duplicate leaves
  equal to the parent (re-review n2). The value stays 3 only as an audit buffer; 1 would select identically.
- Re-review N2 offered (a) clause 1 on both legs per leg, or (b) back-leg wrongs descriptive; (a) chosen, the
  stricter one. The 24-call figure was the first review's and mine; it is 48. Revision 3's price for (a),
  "25–35 %", was the pooled figure (re-review 2, R1); the per-leg price is 30–43 % and §6/§9.2 now carry the
  exact table.
- m13 "3 reps too few is unsupported": agreed and removed; 5 reps are kept for precision on clauses 3–5 (the
  thinking per-pair spread is −341…+348 on these items), not for the gain bar.
- Everything else in the review is applied as written.

## 11. Decisions (the user, 2026-10-03 18:00 local: "all recommended")

1. The ledger is written inside `runWhatShouldISay` for every pinned call (turn id captured at dispatch); the BLOCK is
   built only on the auto turn path; suggest/off-mode chips get today's prompt; chip support is v2.
2. Front leg 5 reps (140 calls, 3.5-lite HIGH) + back leg 3.1-lite LOW on the 4 roster ids x 2 hours x 3 reps (48 calls)
   = 188; s50k is the one allowed re-run; clause 1 is read PER LEG, either leg failing fails (false-FAIL price about
   30-43 % at 0.5-1 % wrong per pair, accepted).
3. The new 125-char label ("asked earlier; context only, do not answer it again").
4. Callbacks ("going back to...") in v2 with their own registration.
5. After a PASS: the quick-follow-up smoke (with the pinned-line requirement), then a scenario50 S1+S2 flight with the
   flag ON (stating its cue-mode shape); holdout40 stays OFF until that flight passes.

Reviews: SPEC-REVIEW.md (APPROVE WITH FIXES 1C/5I/13M), SPEC-REREVIEW.md (0C/2I/5M), SPEC-REREVIEW-2.md (0C/1I/3M); all
findings applied in revisions 2-4.
