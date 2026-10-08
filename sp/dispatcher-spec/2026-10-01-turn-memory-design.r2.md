# Turn memory: declined, not dropped; late echoes absorbed; verdict hygiene — design, revision 2

Date: 2026-10-01. Status: proposed, revision 2. Revision 1 (`2026-10-01-turn-memory-design.md`) was
reviewed by Opus (`REVIEW.md`: NOT READY, 3 Critical, 10 Important, 11 Minor). This revision answers
every finding; `CHANGES-r2.md` lists each one and what changed. A scoped Opus re-check follows, then the
user's review. No code was written. Implementation starts only after Friday's validation flight.

Baseline code: the whole-turn worktree at `8a13abb` ("WT"). Every machine and builder file named here
is byte-identical in MAIN (`diff -q`, r2 session: interviewerTurn, ChipDeduper, questionReconcile,
QuestionDetector, turnDispatch, interview60.turns-fixture, interview60.turns-finals; only
`interview60.metrics.mjs` differs, by the cue rows). Inputs: the diagnosis `scratchpad/dispatcher/DIAGNOSIS.md`
("DS"), the review's scratch `review-scratch/` ("RS") and this revision's own scratch `r2/` ("r2"). Every
r2 script is a throwaway over copies and logs; `r2/run-r2.mjs` re-runs all of them.

Vocabulary is the whole-turn design's (`docs/superpowers/specs/2026-09-09-whole-turn-structured-answers-design.md`):
gate, settle, continuation, supersede, fail-safe, and the R-numbers in `interviewerTurn.ts` and `main.ts`.

**Holdout.** Nothing in this revision reads, tunes on, chooses by or asserts over holdout40. Revision 1's
h40c R18 argument and its "0 of 20" base are gone (review I7). Every measurement below is on s50a–s50m,
after9, br1 and the three cue smokes.

## 0. In one paragraph

The turn machine forgets a turn the moment it closes. A `not-a-question` verdict throws the turn's finals
away; an answered turn survives only as a 60 s entry in ChipDeduper. Evidence that arrives later is given to
whatever turn is open when it arrives. This revision makes the machine remember, with one judgement for every
piece of fresh evidence from either ear: evidence that quotes a remembered answered turn and says nothing new
is absorbed as a late echo (part 2); evidence that fits a declined turn revives it, and it answers from its
own finals (part 1); evidence that fits neither closes only the text the verdict judged and carries the
unjudged tail forward, so a short question after a declined statement is answered as it is today (C3). A
verdict is scoped to the turn and finals count it judged; a stale verdict is ignored and the classify is
re-armed (I3). A detector that could not answer says `unknown`, not "no" (part 3). Parts 1–3 ship behind one
env flag, default off; a pre-registered replay (§7) decides whether the build may proceed; the default flip
is gated on a new recording with statements and small talk, flown flag-off and flag-on (§3.7).

## 1. Problem and evidence (DS, plus the 05:00 re-smoke)

| fact | source |
|---|---|
| br1 S1Q08 (30 Sep, MAIN `0ef42a0`) was heard in full by Deepgram (five finals) and first answered 62.2 s after the clip ended, from Live's paraphrase. A `not-a-question` verdict at 11:01:45.977 closed the turn; the same detector said "question, 0.95" on the same finals 1.4 s later, into an empty turn that died `nothing-heard` 8 s after | DS §3.1 |
| Cue re-smoke S1Q08 (whole-turn `e3fae5f`, 30 Sep 13:46) was answered on time (+1.2 s) and again 76.5 s later from a late Live claim; ChipDeduper's 60 s answered window had expired | DS §3.2 |
| The two are one event: br1 replayed without the negative verdict answers S1Q08 at +3.0 s and again 62.3 s later | DS §4.3 |
| 24 `not-a-question` closes in 18 hours; 23 closed a real question; of the 18 in non-holdout hours, 18 of 18 were real | DS §4.1 |
| 10 of the 24 were a Groq HTTP 403: `detect()` returned null and `detectNow` reported `not-a-question` | DS §4.1; `QuestionDetector.ts:207-213, 316-318` |
| **New.** The 05:00 re-smoke (`2026-10-01T02-37-41-cuesmoke`, whole-turn worktree, PASSED its gate) holds two more declines, both followed by the real question. S1Q07F: the scenario lead-in "A nightly job fails halfway through." was classified alone (`classify finals=1` 02:26:46.499), the question's final landed during the call (47.013), the verdict closed the turn with both finals (47.752), and the answer went out 7.3 s after the voice-off from Live's text (`gate=7279 finals=0 live=1`, 52.576). S1Q08F: the fragment "How could repeatedly" was classified alone (02:30:40.704), declined (41.589), and the answer went out headless: `finals=1`, pinned text "training on customers affected by previous campaigns introduce bias?" (43.805) | the run's `natively_debug.log` lines 3107–3135, 3483–3513; `r2/out-trace-cuesmoke2-S1Q07F.txt`, `…-S1Q08F.txt` (calib) |
| The same two items were declined the same way in s50j (07:37:38.364 "A nightly job fails halfway through."; 07:41:33.617 "How could repeatedly") | s50j `natively_debug.log` lines 3025–3036, 3382–3396 |
| The committed replay never answers a `classify` decision; it passed 116/116 while the flights lost these questions | DS §4.3; `interviewerTurn.replay.test.ts:82-92` |
| Live-only turns in 18 hours: 45; 25 dropped by the deduper, 18 false-close rescues at +5.7 to +7.7 s, 2 doubles. None answered a question the STT had missed on its own | DS §4.4 |
| Live claim lag p50 3.0 s, p90 4.1 s; verified tails 62 s (br1) and 74 s (cue smoke) | DS §4.4 |
| The forgetting contaminates the next question: br1 S2Q01 went out through R21 carrying S1Q10F's Live text; s50i S2Q07F carried a 156 s-late S2Q07 claim as its `live` entry | DS §4.4 |

Revision 1 said "no non-holdout recording contains a statement turn". That is no longer true in the sense
that matters: the re-smoke's S1Q07F lead-in is a declined statement followed by its question, and s50j
holds the same item. What is still true: no non-holdout recording has a **free-standing** statement or a
small-talk question, so the design's behaviour on those stays unmeasured (§3.7, §9).

## 2. Goals and non-goals

Goals
1. A question the classify declined is answered from its own finals as soon as any ear says "question", and
   answered once.
2. A late Live echo of an answered question is never answered a second time and never joins another turn's
   text, at any Live lag.
3. A detector outage is reported as what it is, and the text survives for the other ear.
4. A short real question within 8 s of a declined statement is answered at least as well as today (C3).
5. Flag off: the machine's decisions are today's, event for event (only log lines differ).
6. Every step is decided by a pre-registered replay before any build.

Non-goals (§8): the classify prompt; the fragment rule that drops a 3-word Live claim; what to do in an outage
with no ear at all; the earlier-questions feature; the small-talk detector fix (parked by the user).

## 3. Design

### 3.1 Vocabulary

| term | meaning |
|---|---|
| **evidence** | a fresh positive from an ear: a whisper chip's text, or a Live claim's raw text (`d.liveText`) |
| **judged text** | the finals a classify verdict was asked on (their count travels with the verdict) |
| **unjudged tail** | finals that joined a declined turn after its verdict |
| **declined** | a turn whose latest verdict for its current finals was `not-a-question` or `unknown`; open, not dispatched, holding its finals; lives for the continuation window |
| **remembered** | the last `REMEMBERED_TURNS` closed turns that dispatched, each as `{ text, dispatchedAt }` |
| **fits** | evidence fits the open turn when the judgement of §3.2 says so |
| **echo** | evidence that quotes a remembered turn (≥ `QUOTE_MIN`) and does not fit the open turn; absorbed: opens nothing, marks nothing |
| **revive** | evidence that fits a declined turn makes it `detected`; it dispatches through the normal gate from its own finals |
| **split** | a non-fitting positive on a declined turn closes the judged text and opens a fresh turn holding the unjudged tail, marked by that positive |

### 3.2 The judgement (`judgeEvidence`)

One function decides every fresh positive, from either ear, against the open turn's finals and the remembered
turns. It replaces revision 1's separate "quote test" and "echo test".

**Inputs.** `text` (the evidence), `finalsText` (the open turn's finals joined with spaces, `textOf`,
`interviewerTurn.ts:153`; empty when no turn or no finals), `remembered[]`.

**Content words** are `questionReconcile.ts:19`'s: lower-cased `[a-z0-9]+` tokens longer than 3 letters.
`overlap(a, b)` (`questionReconcile.ts:21-27`) is the fraction of a's content words present in b.

**Steps.**
1. `scorable` := the evidence has at least `QUOTE_MIN_CONTENT_WORDS` (4) content words.
2. `rem` := the remembered turn the evidence quotes best, `overlap(text, rem.text)`; the newest wins ties
   (Minor 6). `remMatch` := scorable and that score ≥ `QUOTE_MIN` (0.5).
3. `residual` := the evidence's content words not in `rem.text` (all of them without a `remMatch`).
4. `fits` the open turn, scorable evidence, either way:
   - **residual**: at least `QUOTE_MIN_HITS` (2) residual words are in the finals and they are ≥ 0.5 of the
     residual. With no `remMatch` this is revision 1's forward test, `overlap(text, finals) ≥ 0.5`.
   - **outright**: `overlap(text, finals) ≥ 0.5` and strictly greater than the `rem` score. A tie goes to
     the memory (I2).
5. `fits`, unscorable evidence (under 4 content words): the **reverse** direction: the finals have at least
   `REVERSE_MIN_CONTENT_WORDS` (2) content words and ≥ 0.5 of *them* appear in the evidence. The evidence is
   the declined text itself, or an extension of it.
6. `echo` := `remMatch` and not `fits`.

**What each clause is for, on the recorded cases (question text only).**

| case | numbers | reads |
|---|---|---|
| br1 S1Q08's late Live claim, 60.8 s after the answer, a wordless blip's turn open with no finals | rem 0.92, residual 2 words, 0 in finals | echo → absorbed |
| cue smoke S1Q08's claim 72.8 s after | rem 1.00, residual 0 | echo → absorbed |
| s50i S2Q07F: a 154.9 s-late S2Q07 claim while S2Q07F's three finals are open | rem 0.68, open 0.14, residual 3 of 12 in the finals (0.25) | echo → absorbed; S2Q07F dispatches with `live=[]` |
| s50g S2Q01F's on-time claim (+1.7 s) that inlines its parent's stage list while the follow-up's two finals are open (review I1) | rem 0.63 (the parent), open 0.47, residual 7 of 7 in the finals | fits by residual → joins |
| br1 S2Q04F's on-time claim (+3.4 s), "Modify your Reciprocal Rank Fusion implementation…" | rem 0.50 (S2Q04), open 0.58, residual 2 of 6 | fits outright (0.58 > 0.50) → joins |
| s50e S2Q01F's late claim (+11.0 s, its turn closed), remembered = parent and S2Q01F | rem 0.58 (the parent), 0.53 against its own text; no finals open | echo → absorbed; `echoOf` names the parent, the outcome is right (S2Q01F was answered) |
| a statement restating Q0, declined; a stale re-fire of Q0 from either ear (crafted S-8, review I2) | rem 1.00, open 1.00, residual 0 | echo → absorbed; the statement expires unanswered |
| the re-smoke's S1Q08F: the declined fragment "How could repeatedly" (2 content words) and its verbatim chip | unscorable; reverse 2 of 2 | fits by the reverse rule → revived; the continuation final and the Live claim join; one whole dispatch |
| the 16 false-close rescues (s50b, s50c, s50d, s50f, s50j, br1, the re-smoke) | best remembered ≤ 0.21 | no `remMatch` → never an echo; they revive their declined turn |

**Measured on non-holdout hours only** (16 whole-turn hours: s50b–s50m, br1, the three cue smokes; the
scripts extend RS `ontime-echo.mjs` and `followup-echo.mjs`):

| class | n | result | source |
|---|---|---|---|
| true echoes: Live-only turns the deduper dropped, plus the cue double | 22 | overlap against the answered text: min 0.57 (br1 S2Q01 at 11:11:54), 20 of 22 ≥ 0.85. Jaccard: min 0.32, 2 of 22 under the deduper's 0.70. Containment: true for 9 of 22 | `r2/out-echo-pairs.txt` |
| rescues: Live-only turns answered with no earlier match | 16 | overlap against the best earlier answer: max 0.21; Jaccard max 0.15 | same |
| on-time Live claims (≤ 10 s after their own clip), every one with finals open | 523 | wrongly absorbed by the judgement: **0**. By revision 1's rule (rem ≥ 0.5 and rem > open): 1 (s50g). 11 claims have rem ≥ 0.40: nine S2Q04F claims (rem 0.42–0.45, own 0.92–1.00: residual), s50g S2Q01F (residual 7 of 7), br1 S2Q04F (outright). Own score p5 0.67, p1 0.30 | `r2/out-quote-metrics.txt` |
| the revive side: every mark on a turn with finals, scored against the finals so far | whisper 973, Live 422 | whisper: 115 unscorable (under 4 content words), 1 under 0.5, 0 of 349 first marks under; Live: 19 under 0.5, 8 of 49 first marks under. A first Live mark under the bar on a declined turn takes the split path, which is today's Live-only rescue | `r2/out-mark-vs-finals.txt` |

So `QUOTE_MIN` = 0.5 separates the positive class (min 0.57) from the rescues (max 0.21) with the on-time
follow-ups (0.42–0.63) decided by `fits`. The threshold is not tuned; it is the reconciler's `MATCH`
(`questionReconcile.ts:76`) and the data say it works. The margin on the positive side is 0.07 (0.57), on
the rescue side 0.29; both are reported, not fitted. Lowering the bar would catch no additional echo (none
lies between 0.21 and 0.57).

**Constants and provenance.**

| constant | value | where from |
|---|---|---|
| `QUOTE_MIN` | 0.5 | `questionReconcile.ts:76` `MATCH`, the reconciler's corroboration floor (a union of unrelated speech reaches 0.25 on generic words: after8 07:36:26) |
| `QUOTE_MIN_CONTENT_WORDS` | 4 | `ChipDeduper.ts` `TAIL_MIN_CONTENT_WORDS` (after5's answered "I'm going to go.", one content word). Evidence under it is "unscorable", not "scores 0" (C3) |
| `QUOTE_MIN_HITS` | 2 | the same precedent on the residual side: one coincidental content word ("that", "what") must not make an echo fit the open turn. Not measured separately: in the 22 true echoes the residual hit count is 0 in 21 and 3 of 12 in s50i S2Q07, where the 0.5 ratio decides |
| `REVERSE_MIN_CONTENT_WORDS` | 2 | the re-smoke's declined fragment has exactly 2; with 1 ("Okay.") any unscorable chip containing that word would revive it |
| `REMEMBERED_TURNS` | 3 | count, not clock: the longest verified echo is one turn back at 76.5 s (cue smoke), the longest observed two turns back at 154.9 s (s50i S2Q07F); 3 gives one turn of margin. s50g needs one (review open question 4) |

**Why not Jaccard or containment.** On the non-holdout positive class, Jaccard misses 2 of 22 at the
deduper's 0.70 and containment misses 13 of 22 (`r2/out-echo-pairs.txt`). Neither is directional: a claim
quoting one sentence of a five-sentence answer scores low on both and 1.0 on `overlap`. Why not a longer
deduper window: it removes only the cue smoke's double and leaves br1 at 61 s (DS §7).

**Where it is injected.** `createInterviewerTurn(c, finished, memory, judge = judgeEvidence)` (§4.1). The
default lives in a new `electron/services/turnQuote.ts`; tests inject a stub to prove the machine's branches
without the tokenizer; `turnQuote.test.ts` proves the judgement alone on the cases of this section.

### 3.3 Part 1: declined, not dropped

**Today** (`interviewerTurn.ts:202-212, 227-230`): `detected(…, 'not-a-question', forTurn)` sets
`notAQuestion`; the next `tick()` sets `turn = null` and returns `close not-a-question`. The finals are gone.
A verdict is matched to a turn id only; a final that landed during the call is closed with it (the re-smoke's
S1Q07F).

**New (flag on).** A verdict is scoped to the turn *and* the finals count it judged (`verdict(v, forTurn,
finals, at)`, §4.1). A negative or unknown verdict for the current count marks the turn *declined*:
`t.declined = { at, verdict }`, `t.detected` stays false. The turn stays open. What can happen to it:

| event | effect |
|---|---|
| a verdict whose `finals` count is not the turn's current count | `ignored why=stale-finals`, both signs. A final that lands after the classify was asked has already re-armed it (next row), so the re-armed classify judges the grown text. This happens on 11 of 184 verdicts (DS §5 C3); in the fixtures: the re-smoke S1Q07F (1), s50i (2), s50j (2) (`r2/out-rows-r2.txt`, verdict outcomes) |
| a final on an **undetected** turn after its classify was asked (declined or not) | rejoins (`finals.push`, `lastFinalAt`) and re-arms: `classifyAsked = false`; at the next quiet the machine emits `classify` again on the grown text. Review I3: without this, a turn whose first classify was in flight when a final landed waited for the next question's finals (RS `crafted.mjs` A) |
| a verdict `question` for the turn's current count | revive without a judgement: the classify judged this text. `declined = null`, `detected = true` |
| a negative or unknown verdict for a turn already `detected` by an ear | `ignored why=marked` (review I9): the design answers as soon as any ear says question. In s50i S2Q09 under `unknown` substitution this verdict lands 0.3 s after Live revived the turn (`r2/out-trace-s50i-S2Q09.txt`) |
| a verdict for a turn that already dispatched | `ignored why=dispatched`. This is the **common** outcome of a classify "yes": its own chip marks the turn through the mark block before the verdict's `.then` runs (`QuestionDetector.ts:375`, `main.ts:2531-2541`), and the gate dispatches it. In the fixtures 46 of 88 verdicts read this way (fix mode, the 11 distinct fixtures, `r2/out-rows-r2.txt` verdict outcomes). Today such a verdict would close the answered turn early (`interviewerTurn.ts:227-230`) |
| a verdict for any other turn | `ignored why=stale-turn` (R20, unchanged) |
| evidence that fits the declined turn (§3.2) | **revive**: `declined = null`, `detected = true`, `detectedAt = at`; a Live claim also joins `live[]`. The next tick runs today's dispatch branch (`interviewerTurn.ts:272-283`): at the gate if quiet and finished, else the unfinished hold, else the fail-safe. br1: the chip at 11:01:47.374 fits the five finals (residual 25 of 25); quiet 3.0 s, finished → dispatch at 11:01:47.374, `finals=5` |
| evidence that is an echo (§3.2) | absorbed before the declined turn is consulted; the turn is untouched (S-8) |
| a **whisper** positive that neither fits nor echoes, and the turn has **no unjudged tail** | `ignored why=no-quote` (scorable) or `why=unscorable`; the declined turn lives on for its continuation, a later fitting positive, or the re-armed classify. A whisper chip carries no text into the machine, so a fresh turn would be empty and die `nothing-heard`, exactly br1's old shape (S-1, S-13) |
| a positive that neither fits nor echoes, and the turn **has** an unjudged tail (either ear) | **split**: the judged text closes (`close reason=not-a-question` or `no-verdict`, logged `cause=split`), a fresh turn opens holding the tail finals, inheriting the VAD state (`speaking`, `vadSeen`, `lastSpeechAt`); the positive marks it; a Live claim joins its `live[]`. The tail then dispatches as any marked turn: at the gate if finished. This is today's behaviour with the close delayed: the verdict closes only the text it judged (S-6: "So why would you use Kafka here?" answered alone at the gate, as today) |
| a **Live** positive that neither fits nor echoes, and no unjudged tail | split with 0 finals moved: a Live-only turn, dispatched on the unfinished hold — today's rescue path for a question the STT missed (S-1L, S-6L) |
| the candidate speaks | `close candidate`, as for any open turn |
| the window expires: `now − max(declined.at, lastFinalAt, effectiveStopAt) ≥ continuationMs`, not speaking | `close reason=not-a-question` (last verdict a model "no") or `close reason=no-verdict` (last verdict `unknown`). Not remembered |

**The window** is `continuationMs` (8000, `interviewerTurn.ts:17, 25`; follows `NATIVELY_TURN_CONTINUATION_MS`),
counted from the later of the verdict, the last final and the last worded voice stop, the same clock a
dispatched turn's continuation close uses (`interviewerTurn.ts:143-150, 246`). Margin, in the verdict's own
frame (review Minor 2): across the fixtures every revive came within 2.1 s of its decline (max 2091 ms, s50d;
br1 1414; s50f 1853; s50b 1270; s50i 1200; s50c 1112; s50j 402; the re-smoke 259; `r2/out-rows-r2.txt`
notes), so the margin to the 8 s window is about 5.9 s. A rescue that misses the window takes today's
Live-only path: late, but answered. `nextTimerAt` gains two candidates for a declined turn:
`max(declined.at, lastFinalAt) + continuationMs`, and `lastSpeechAt + wordlessGraceMs` when a stop came after
the verdict, the pair the dispatched case carries (`interviewerTurn.ts:299-304`); the gate and settle
candidates stay, so a re-classify is asked at the first quiet after a rejoin.

**Interactions**, each with the rule it meets:

| rule | interaction |
|---|---|
| R20 (`forTurn`) | unchanged for the turn id; extended by the finals count (above) |
| R15 (`reopenIfStale`) | runs **first**, before the judgement (review Minor 8): a stale dispatched turn is remembered and closed, a stale declined turn closed, and only then is the evidence judged. The declined clock is the dispatched clock |
| R14 (fail-safe) | a declined turn has no detection, so no fail-safe. A revive sets `detectedAt`; the fail-safe runs from the revive, the last final and the last VAD transition, unchanged rule |
| wordless grace | a stop that no words followed within `wordlessGraceMs` does not extend the declined window (`effectiveStopAt`), as for a dispatched turn (the 2026-09-13 loopback fix) |
| supersede | a revived turn dispatches and then behaves as any dispatched turn: a final inside the window supersedes. In the fixtures a revive is followed by a supersede 0.5–1.5 s later twice (s50i S2Q09 finals 4 → 5; s50j S1Q10F 2 → 3: `r2/out-trace-s50i-S2Q09.txt`, `…-s50j-S1Q10F.txt`); supersede counts are reported per fixture (review Minor 3: s50i 7 against today's 6, s50j 2 against 1) |
| speaking | the expiry does not fire while `speaking` (mirrors line 246); a stuck VAD leaves the declined turn open until R15 replaces it |
| candidate | `close candidate` at any time |

**Flag off.** `verdict()` with `not-a-question` or `unknown` sets `notAQuestion`, and the next tick closes
the turn as today; the finals count is not checked. `evidence()` marks as `liveClaim` + `detected` do today.

### 3.4 Part 2: late echoes absorbed

**Memory.** When a dispatched turn closes (continuation expired, candidate, or R15 replacement), the machine
pushes `{ text: dispatched.text, dispatchedAt }` onto `remembered`, keeping the last `REMEMBERED_TURNS`.
`reset()` clears it. Declined turns are never remembered. Live-only dispatches are remembered too (their text
is Live's paraphrase; a re-fire quotes it at 1.0); a remembered Live-only echo pushes the oldest entry out
(S-14). The machine does not know whether main.ts's deduper dropped a dispatch; a dropped dispatch was a
duplicate of an answered question, so remembering it is right.

**The test** is the judgement of §3.2, run in `evidence()` for **both ears** before the evidence touches any
turn (review I2: whisper positives were not echo-tested in revision 1). `echo` → `absorbed`: no state
changes, nothing opens, nothing is marked; main.ts logs `dispatch: absorb` and returns. In the fixtures 22
claims are absorbed, all Live, every one the same item as the remembered turn it quotes, 21 of them late (10
to 155 s after the clip) and one an on-time re-fire of an already answered follow-up (s50f S2Q01F, +8.7 s)
(`r2/out-absorbed-table.txt`). No whisper evidence is absorbed on the fixtures; the whisper branch is proved
by S-8 only.

**Scope, stated plainly.** During an STT gap, a genuinely new Live-heard question that reuses half the
content words of one of the last three answered questions, with no finals since and none of its new words
in any finals, is absorbed and not answered (S-4: "Would you shard that Postgres table by tenant or by
region?" after Q0, 0.71). Observed on non-holdout data: 0 of 523 on-time claims, 0 of 16 rescues. With the
interviewer STT channel switched off (`setSttEnabled(false)`, `main.ts:2258`) the `fits` clauses never fire;
only the remembered score and the count guard remain. Named as a residual (§9).

### 3.5 Part 3: verdict hygiene

`QuestionDetector.detectNow` today (`QuestionDetector.ts:207-213`) returns `not-a-question` when the detector
is disabled, when `startDetection` rejects, and when `detect()` returned null and the degraded heuristic said
no. A throwing client never makes `startDetection` reject: `runDetection` catches the throw and returns
`false` (`QuestionDetector.ts:296-300`), so today's `catch` in `detectNow` is unreachable for it (review I8).
It returns a tri-state instead:

| condition | today | new |
|---|---|---|
| `!this.enabled` | `not-a-question` | `{ verdict: 'unknown', reason: 'disabled' }` |
| the client throws (`runDetection`'s catch, line 296) | `false` → `not-a-question` | `runDetection` returns `'unknown'`; `detectNow` maps it to `{ verdict: 'unknown', reason: 'threw' }` |
| `startDetection` rejects (any other throw) | `not-a-question` (`catch`) | `{ verdict: 'unknown', reason: 'threw' }` |
| `detect()` returned null, heuristic no | `not-a-question` | `{ verdict: 'unknown', reason: 'null-result' }` |
| `detect()` returned null, heuristic yes (chip emitted) | `question` | `{ verdict: 'question' }` (unchanged) |
| `clear()` ran during the call (generation guard, line 309) | `not-a-question` | `{ verdict: 'unknown', reason: 'stale' }` |
| model `detected=false`, confidence under the threshold, or a blank/short question | `not-a-question` | `{ verdict: 'not-a-question' }` |
| model `detected=true` and a chip was emitted or updated | `question` | `{ verdict: 'question' }` |

`runDetection` returns `'question' | 'not-a-question' | 'unknown'` (was boolean); the debounce path ignores
the value as it does today. `detectNow` also logs `[QD-timing] detectNow issued` right before its own call
starts (after the in-flight wait), so a post-fix log pairs a classify with its call exactly (review Minor 1).
`IntelligenceManager.detectQuestionNow` passes the shape through. main.ts logs the reason and feeds `unknown`
to the machine, which declines (flag on) or closes as today (flag off).

`QuestionDetector.detectNow.test.ts` **exists** (review I8); its lines 39 (disabled → `not-a-question`) and
44 (a throwing client → `not-a-question`) turn red on the new expectations before the change is made.

Whether an outage hour should answer a long, finished-reading turn with no ear at all (s50d S2Q09) is a
product decision and out of scope (§8).

### 3.6 Why parts 1 and 2 ship together

Three controls on the prototype (`r2/out-rows-r2.txt`): revive on, echo off → br1 S1Q08 is dispatched
**twice** (the finals at +3.0 s, the Live echo 62 s later); echo on, revive off → br1 S1Q08 is answered once
but from Live at 65 350 ms; echo off on the cue smoke → S1Q08 twice. The env flag switches both; the harness
alone constructs the controls (§6.5).

### 3.7 Flag and rollout

**Flag**: `NATIVELY_TURN_MEMORY`, `electron/services/turnMemory.ts`, followUpParent's shape
(`followUpParent.ts:8-13, 24-26`): unset, empty or `0` is off; `1` is on; anything else throws.
`describeTurnMemoryAtStartup` returns `turn memory: on|off`; main.ts logs it inside the existing startup
try/catch that exits on a bad flag (`main.ts:3446-3453`), which runs before AppState is built, so a junk value
refuses to start (review: confirmed).

**Default off, and the flip is gated.** Why a flag: the live behaviour on free-standing statements and small
talk is unmeasured; a flag is the only revert that needs no rebuild during an interview week; Friday's
validation flight must fly the code it validates, and the flag-off build changes nothing that flight measured
except log lines (§7 R2 and R1 pin that); it is the project's own path (hedge `da28f25` → `f745d7e`).

**The directional risk, named (review I10).** This change makes a classify "no" softer: a declined turn is
answered whenever another ear says "question" on its text. For a small-talk question such as "How's your
day going?" that is the opposite direction from the concern the user parked. The design does not touch the
small-talk fix. It gates its own default on a measurement of exactly this direction.

**Path**, each step licensing only the next:
1. implement (TDD, §6) → the replay rule PASSES (§7) → build flag-off; the built dist's startup line reads
   `turn memory: off`.
2. **A flag-off live exercise** (review open question 5): one hour on the 20-item cue-smoke roster with the
   flag off. The default build carries the new `detectNow` shape and the new log lines. Read: 20 of 20
   answered once; every `turn: classify` resolved by a `turn: verdict=` line; `nothing-heard` 0; the gate rows
   of the smoke unchanged.
3. **The new recording**, built on the interview60 build-audio path, non-holdout, shared with the parked
   small-talk concern (the same audio serves both). It must contain, each at least twice: a free-standing
   statement ("Great, thanks for walking me through that."); a statement that restates the previous question
   (I2); a short question within 8 s of a statement (C3); a follow-up whose paraphrase inlines its parent
   (I1); a lead-in followed by its question after a pause (the re-smoke's S1Q07F shape); a question with a
   mid-sentence pause long enough to split the final (the S1Q08F shape); a small-talk question ("How's your
   day going?"); a segment with the interviewer STT muted while Live hears the question (the STT-gap shape);
   and ordinary questions between them.
4. **Two hours on that recording, flag off then flag on**, each with its own pre-registration written before
   the first hour flies. The flip is licensed only if the flag-on hour shows: (a) statements and small-talk
   items answered from their own text: the flag-on count ≤ the flag-off count, item by item reported with the
   ear that said "question"; (b) every scripted question after a statement: answered once, from its finals,
   within the §6.1 budget, the statement never answered alone; (c) the I1 and I2 shapes each answered once,
   the restating statement never; (d) 0 doubles; (e) every `absorb` and `revived` line attributed to its own
   item. A flag-on hour that answers more statements than the flag-off hour keeps the default off and sends
   the small-talk concern to its own spec.
5. A flag-on smoke on the cue roster, then a flag-on flight on scenario50, each pre-registered, then the
   default flip (unset = on, `0` = off, the hedge's shape).

**What the cue-smoke roster cannot exercise.** It has no statement item and no small talk. Its declines come
from the classify's own noise: 0, 0 and 2 in its three runs (`DS/out-count.txt`; the re-smoke's log). A
flag-on smoke therefore reports every `declined`, `revived`, `absorb` and `split` line it happens to produce
and gates on none that needs a decline; the recording of step 3 is where part 1 is exercised on purpose. The
review's alternative, an env hook that forces `detectNow` to `unknown` in a smoke, is listed for the user
(Appendix C, decision 18); this revision does not propose it.

### 3.8 States and log lines

New machine state (flag on only): `declined: { at, verdict } | null` on the open turn; `remembered[]` on the
machine; the `hold` reason `declined`; the close reason `no-verdict`. Removed: nothing. `notAQuestion` stays
for the flag-off path.

Every new field on an existing line goes **after** `question=` (review I4): `interview60.metrics.mjs:67`
parses every `dispatch:` line with a strict chain of optional fields ending in `question=`, and a field
before it makes `question` null, which breaks claim scoring of `verdict=paraphrase` marks (line 231) in the
flag-off build too. The consumers checked: `interview60.metrics.mjs:67`, `interview60.judge.mjs:87`,
`interview60.prompts.mjs:26`, `interview60.turns-fixture.mjs:56`, `interview60.metrics.test.ts:301`; every one
captures `question="…"` by its closing quote and ignores what follows (RS `regex-check.mjs`, `outcomeLast`
row). The new action word `absorb` matches none of their action alternations, so an `absorb` line is invisible
to them, as intended.

| line | when | new? |
|---|---|---|
| `[Main] turn memory: on\|off` | startup | new |
| `[Main] turn: verdict=<question\|not-a-question\|unknown> [reason=<disabled\|null-result\|threw\|stale>] finals=N turn=ID outcome=<marked\|revived\|declined\|ignored why=<stale-turn\|stale-finals\|dispatched\|marked>>` | every classify resolution (today a "yes" leaves no line) | new |
| `[QD-timing] detectNow issued` | the classify's own detector call starts | new |
| `[Main] dispatch: mark source=… anchor="…" verdict=… question="…" outcome=<marked\|revived\|split> [rule=<forward\|reverse> score=0.92] [live="<full raw Live text>"]` | the mark block; `live=` on Live marks only, the raw `d.liveText` in full (review Minor 10: the `anchor=` field is cut at 80 chars and `question=` is the STT line for a `replaced` claim) | extended |
| `[Main] dispatch: absorb source=<live\|whisper> anchor="…" verdict=<reconcile verdict> question="…" echoOf="<80 chars>" score=1.00 ageMs=72740` | an absorbed echo, logged in the mark block before any state changes | new |
| `[Main] turn: close reason=<not-a-question\|no-verdict> cause=split moved=N score=0.12` | a declined turn's judged text closed by a non-fitting positive; logged from the mark path because the machine closes it inside `evidence()`, not in `tick()` | new |
| `[Main] turn: close reason=not-a-question` | now at the window's end, not at the verdict | existing, timing changed |
| `[Main] turn: close reason=no-verdict` | the window expired after an `unknown` verdict | new reason |

`interview60.metrics.mjs` reads `Live question`, `pinned question` and `dispatch:` lines; none of the
above changes a flight number (the field order rule above is what keeps that true). An `absorb` line should be
counted as informational alongside `supersede` in a follow-up to metrics, not required here.

## 4. Interfaces

Every changed or added signature, with its callers. Callers not listed keep their meaning.

### 4.1 `electron/services/interviewerTurn.ts`

```ts
export type ClassifyVerdict = 'question' | 'not-a-question' | 'unknown';

export type TurnDecision =
    | { kind: 'idle' }
    | { kind: 'hold'; reason: 'speaking' | 'gate' | 'settle' | 'unfinished' | 'undetected' | 'declined' }   // + declined
    | { kind: 'classify'; text: string; finals: number; turn: number }                                      // unchanged
    | { kind: 'dispatch'; …unchanged }
    | { kind: 'supersede'; …unchanged }
    | { kind: 'close'; reason: 'candidate' | 'continuation-expired' | 'not-a-question' | 'no-verdict' | 'nothing-heard' };  // + no-verdict

export type EvidenceOutcome =
    | { kind: 'marked' }
    | { kind: 'revived'; rule: 'forward' | 'reverse'; score: number; finals: number }
    | { kind: 'absorbed'; of: string; score: number; ageMs: number }
    | { kind: 'ignored'; why: 'no-quote' | 'unscorable'; score: number }
    | { kind: 'split'; closed: 'not-a-question' | 'no-verdict'; moved: number; score: number };

export type VerdictOutcome =
    | { kind: 'marked' }
    | { kind: 'revived' }
    | { kind: 'declined'; verdict: 'not-a-question' | 'unknown'; until: number; again: boolean }
    | { kind: 'ignored'; why: 'stale-turn' | 'stale-finals' | 'dispatched' | 'marked' };

export const REMEMBERED_TURNS = 3;   // provenance in §3.2

export interface InterviewerTurn {
    speech(active: boolean, at: number): void;                                   // unchanged
    final(text: string, at: number): void;                                       // unchanged signature; rejoins and re-arms (§3.3)
    /** Fresh evidence from either ear: a whisper chip's text, or a Live claim's raw text. Replaces liveClaim() + detected(source, at). */
    evidence(source: 'live' | 'whisper', text: string, at: number): EvidenceOutcome;
    /** A classify verdict, scoped to the turn and finals count it judged. Replaces detected(source, at, verdict, forTurn). */
    verdict(v: ClassifyVerdict, forTurn: number, finals: number, at: number): VerdictOutcome;
    candidateSpoke(at: number): void;                                            // unchanged
    tick(now: number): TurnDecision;                                             // unchanged signature
    nextTimerAt(now: number): number | null;                                     // unchanged signature; + the declined candidates
    reset(): void;                                                               // also clears remembered
    snapshot(): { open; finals; live; detected; dispatched; speaking; id; declined: 'not-a-question' | 'unknown' | null; remembered: number };  // + 2 fields
}

export function createInterviewerTurn(
    c: TurnConstants = DEFAULT_TURN_CONSTANTS,
    finished: (text: string) => boolean = readsFinished,
    memory: TurnMemoryOptions = TURN_MEMORY_OFF,            // new; default = today's machine
    judge: JudgeEvidence = judgeEvidence,                    // new; §3.2
): InterviewerTurn
```

Why two entry points instead of revision 1's `liveClaim` + `detected(…, opts)`: the judgement needs the
evidence's text for both ears in one place (I2), and a fresh detection without text was revision 1's E5
throw, which surfaced inside `runDetection` or the Live router's emitter rather than loudly (review Minor 4).
With `text` a required parameter that error cannot exist. `liveClaim` and `detected` are removed. Callers:
`main.ts:997-1000` (the classify `.then` → `verdict`), `main.ts:2099-2100` (the mark block → one `evidence`
call), `interviewerTurn.replay.test.ts:89-90` (rewritten with §6.1), and `interviewerTurn.test.ts`: 28
`detected(` and 3 `liveClaim(` call sites (grep, r2 session) rewritten mechanically — the 25 fresh detections
to `evidence(source, <the test's own text>, at)` and the 3 verdict calls (lines 143, 172, 193) to `verdict(v,
forTurn, finals, at)` — with every expectation unchanged, because `memory` defaults to off.

### 4.2 `electron/services/turnQuote.ts` (new) and `turnMemory.ts` (new)

```ts
// turnQuote.ts
export const QUOTE_MIN = 0.5;                  // = questionReconcile MATCH
export const QUOTE_MIN_CONTENT_WORDS = 4;      // = ChipDeduper TAIL_MIN_CONTENT_WORDS
export const QUOTE_MIN_HITS = 2;
export const REVERSE_MIN_CONTENT_WORDS = 2;
export interface Judgement { scorable: boolean; remIdx: number; remScore: number; residual: number; hits: number; fits: boolean; echo: boolean; openScore: number; rule: 'forward' | 'reverse'; by: 'residual' | 'outright' | 'reverse' | null }
export type JudgeEvidence = (text: string, finalsText: string, remembered: { text: string }[]) => Judgement;
export function judgeEvidence(text: string, finalsText: string, remembered: { text: string }[]): Judgement;   // §3.2, reuses overlap()

// turnMemory.ts
export const TURN_MEMORY_ENV = 'NATIVELY_TURN_MEMORY';
export interface TurnMemoryOptions { revive: boolean; echo: boolean }
export const TURN_MEMORY_OFF: TurnMemoryOptions;             // { revive: false, echo: false }
export function turnMemoryFromEnv(env?: NodeJS.ProcessEnv): TurnMemoryOptions;   // off | { revive: true, echo: true } | throws
export function describeTurnMemoryAtStartup(env?: NodeJS.ProcessEnv): string;   // 'turn memory: on' | 'turn memory: off'; throws on junk
```

`{ revive: true, echo: false }` and `{ revive: false, echo: true }` are constructible only in code (the
harness's controls, §6.5); no env value produces them.

### 4.3 `electron/services/QuestionDetector.ts`, `electron/IntelligenceManager.ts`

```ts
export type UnknownReason = 'disabled' | 'null-result' | 'threw' | 'stale';
export type DetectNowResult = { verdict: 'question' | 'not-a-question' } | { verdict: 'unknown'; reason: UnknownReason };
async detectNow(text: string): Promise<DetectNowResult>;                    // was Promise<'question' | 'not-a-question'>
private async runDetection(override?: string): Promise<'question' | 'not-a-question' | 'unknown'>;   // was Promise<boolean>; 'unknown' from the null, stale AND throw paths
detectQuestionNow(text: string): Promise<DetectNowResult>;                  // IntelligenceManager.ts:210, pass-through
```

Callers: `main.ts:990` only. `startDetection`'s `.finally` and `triggerDetection` ignore the value.

### 4.4 `electron/main.ts`, what changes and where

| site | today | new |
|---|---|---|
| construction, line 942 | `createInterviewerTurn(turnConstantsFromEnv())` | `createInterviewerTurn(turnConstantsFromEnv(), readsFinished, turnMemoryFromEnv())` |
| startup, lines 3446-3453 | logs hedge and follow-up-parent | also `console.log(\`[Main] ${describeTurnMemoryAtStartup()}\`)` inside the same try |
| classify case, lines 988-1000 | `this.turn.detected('whisper', now, v, d.turn)` | `const o = this.turn.verdict(r.verdict, d.turn, d.finals, now)`, then the `turn: verdict=` line with the real reason and `outcome`, then `turnTick()` |
| the mark block, lines 2097-2109 | `liveClaim(text)`; `detected(source)`; sync; pick; mark line; tick | `text = source === 'live' ? (d.liveText ?? d.question) : d.question`; `const o = this.turn.evidence(source, text, now)`; `absorbed` → log `dispatch: absorb …` and **return** (no `syncTurnIdentity`, no `pickTurnDetection`, no `turnTick`: the machine did not change); `split` → log the close line, continue; `ignored` → log it on the mark line and continue (the detection still feeds `pickTurnDetection` for the turn it would have marked); then sync; pick; the mark line with `outcome=` and, on a Live mark, `live=`; tick |
| close case, lines 1034-1039 | logs the reason, resets per-turn state | unchanged code; the new reason `no-verdict` flows through |
| R21 route, lines 1016-1019 | routes a supersede with no admitted head as fresh | unchanged. After part 2 the br1 S2Q01 shape no longer reaches it (`r2/out-trace-br1-S2Q01.txt`: a normal dispatch, `live=[]`); its original purpose stands |
| `syncTurnIdentity`, lines 1061-1067 | resets per-turn state when the machine's id changes | unchanged; it covers the silent replacement a `split` performs (R26) |
| `turnDetectionOr`, lines 1049-1053 | falls back to a verbal whisper detection when the classify path proved the question | unchanged; a revive by a verdict takes this fallback, a revive by evidence takes that detection's intent |
| the final handler, line 1230 | `turn.final(text, now); turnTick()` | unchanged; the re-arm lives in the machine |

The absorbed echo never reaches `chipDeduper.admit`, `liveHold` or `fragmentHold` (all after the mark block's
`return`, lines 2110-2137, never engaged in Auto).

### 4.5 Harness: `interview60.turns-fixture.mjs` and `interviewerTurn.replay.test.ts`

Fixture shape, added fields (existing fields unchanged):

```ts
interface Fixture {
    …existing…;
    offset: { ms: number; n: number; p10: number; p90: number; source: 'measured' | 'per-item' | 'legacy-1150' };
    items: (…existing & { offsetMs?: number; offsetSource?: 'own' | 'nearest' })[];   // per-item only when offset.source === 'per-item'
    classifications: { askedAt: number; finals: number; verdict: 'question' | 'not-a-question'; raw: 'model' | 'null' | 'threw' | 'no-call'; latencyMs: number; pairing: 'exact' | 'adjacent' | 'waited' | 'ambiguous'; resolution: 'verdict-line' | 'close' | 'dispatch' | 'pre-roll' | 'post-roll' }[];
    detectorCalls: { issuedAt: number; returnedAt: number; verdict: 'question' | 'not-a-question' | 'null' }[];   // every [QD-timing] pair, for substitution (§6.1)
    footprints: number[];      // every `turn: classify` and `turn: gate=` line's time: the app's timer having fired (§6.1 ordering)
    marks: { at: number; source: 'live' | 'whisper'; text: string; live?: string; verdict: string }[];   // the mark lines only; `live` = the raw Live text when the log has it
    turnLog: boolean;          // true when the log has any `turn:` line (a whole-turn app); false for s50a/after9
}
```

Replay entry points:

```ts
replay(f: Fixture, mode: { memory: TurnMemoryOptions; verdicts: 'off' | 'recorded' | 'recorded+detector' | 'recorded+unknown'; raceWindowMs: 50 }): { decisions; drops; absorbed; substituted; unmatched; reorders }
score(f, decisions)   // the budget of §6.1.6
```

## 5. Error handling: fail loudly at the boundary, never recover silently

| id | case | behaviour |
|---|---|---|
| E1 | a verdict for a closed or replaced turn | refused as today (R20): `ignored why=stale-turn`; logged. Neither marks nor opens a turn |
| E2 | a verdict for the open turn with a finals count other than the turn's | `ignored why=stale-finals`; the re-armed classify decides (the final that grew the count re-armed it). Logged |
| E3 | a verdict for a turn that already dispatched (flag on) | `ignored why=dispatched`; the continuation window survives. The common outcome of a "yes" (§3.3). Logged |
| E4 | a negative or unknown verdict for a turn an ear already marked | `ignored why=marked`. Logged |
| E5 | a revive on a declined turn with no finals | impossible by construction (a classify is asked only on text; a Live-only turn is marked by its claim and never classified). One assertion throws `Error('declined turn has no finals')` rather than a fallback |
| E6 | a junk `NATIVELY_TURN_MEMORY` | the app refuses to start (`main.ts:3450-3452`), as for the other flags |
| E7 | `detectNow` cannot classify (disabled, null, throw, stale) | `unknown` with its reason; never "no". The machine declines (flag on) or closes (flag off); the log names the reason |
| E8 | the replay meets a `classify` with no recorded verdict, in calibration mode | counted as `unmatched` and reported with the time and count; R1a of §6.2 reads the count |
| E9 | the replay meets a `classify` with no recorded verdict, in a post-fix mode | never silent: `recorded+detector` substitutes the run's own detector call issued within 4 s after the ask with no fixture final in between (DS §4.2's pairing rule), else `unknown`; `recorded+unknown` substitutes `unknown`; every substitution is counted, printed with its item, and every row that rests on one is marked (§7, R14) |
| E10 | the builder finds a `turn: classify` with no resolution (no `turn: verdict=` line; no `not-a-question` close within 2 s of its call's return; no `dispatch:` of the same turn; no candidate or continuation close within 10 s) | refuses naming the line, unless the ask is pre-roll (before the first item) or post-roll (after the last item's clip end: the meeting ended with the classify in flight, and the `.then` returns early) — those are recorded with `resolution: 'pre-roll' \| 'post-roll'` and never matched |
| E11 | the builder's classify–call pairing (§6.1.1) finds no `detect issued` within 3 s, or a `coalesced` line between the ask and the picked call | `raw: 'no-call'` with the verdict read from the close (one case: s50j 08:17:12.511, a classify that waited behind a slow call), or `pairing: 'ambiguous'` (two cases: the cue smoke 13:23:16.446, s50i 07:14:01.830; RS `pairing.mjs`, reproduced `r2/out-pairing.txt`). Both are printed. An ambiguous pairing can change `raw` only in an hour with null results; s50d, the only such hour, has none |
| E12 | the builder's measured offset has `p90 − p10 > 100 ms` | refuses unless `--per-item-offsets`; then every item takes its own measured lag, an item without one takes its nearest neighbour's (`nearest`); refuses when fewer than half the spoken items have their own. s50c: 40 of 40 have their own (`r2/out-peritem-s50c.txt`) |
| E13 | a legacy fixture (`turnLog: false`) in a verdict-feeding mode | verdict feeding is skipped and printed as `no verdict feed (legacy log)`; the rows are today's |
| E14 | a crafted fixture whose expected outcomes are not met | that fixture's own `it` fails; crafted fixtures never feed the aggregate rows |
| E15 | a `dispatch: mark` line whose `question=` and `live=` are both missing | the builder refuses naming the line |

## 6. Test plan, failing first

Order: harness changes and fixtures first (they must reproduce today's logs on the unmodified machine within
the rule of §6.2), then the unit tests, each watched red, then the fix, then the replay rule (§7).

### 6.1 Harness changes (`interview60.turns-fixture.mjs`, `interviewerTurn.replay.test.ts`)

1. **Verdict feeding.** The builder records `classifications[]` from each `turn: classify` line: its own
   call (post-fix logs: the `[QD-timing] detectNow issued` line that follows it; pre-fix logs: the first
   `detect issued` within 3 s whose previous line is not `debounce elapsed`, with the `coalesced` count
   between the ask and the pick recorded as `pairing`), that call's `detect returned`, and its resolution
   (post-fix: the `turn: verdict=` line; pre-fix: a `close reason=not-a-question` within 2 s after the result
   means `not-a-question`, otherwise `question`). `raw` keeps whether the result was a model verdict, `null`,
   a throw or no call, so a post-fix replay can feed `unknown` for outages the app once saw as "no". The
   replay answers each machine `classify` with the recorded classify nearest in time within ±2.5 s at the
   same finals count, delivered at `askedAt + latencyMs`, as `verdict(v, d.turn, d.finals, at)`. Unmatched:
   E8/E9.
2. **Detections for whole-turn logs** are the `dispatch: mark` lines only, with the full `question=` text,
   and the `live=` text when the line has one (post-fix logs); for the 12 pre-fix fixtures a `replaced` Live
   mark feeds the STT line (`question=`) because its raw text survives only in the 80-char `Live question`
   line; the builder prints the count per fixture (review Minor 10: 3 such marks on the eight DS fixtures).
   `absorb` lines are parsed (for calibrating post-fix logs) and never fed.
3. **The deduper gets the anchor** (review I5): `dedup.admit({ question: d.text, source, anchor: d.text })`,
   as `turnDispatchInput` does (`turnDispatch.ts:17`). Without it br1 S2Q01 doubles through the R21 model.
   **The R21 route**: a `supersede` whose head the deduper dropped is admitted as a fresh dispatch.
4. **Offsets.** `--offset-ms` is replaced by the measured rule of `DS/vadlag.mjs`: median over the run's
   `turn: gate=G finals=N` lines (N > 0, G < 4000: `lastVoiceOff = t − G`) and its `turn: classify` lines more
   than 450 ms after their last final (`lastVoiceOff = t − 1200`), each minus the WAV voice-off of the item
   playing. Recorded with n, p10, p90. Refusal on a bimodal spread (E12): 100 ms is about three times the
   largest unimodal spread measured (37 ms: br1 and the re-smoke, `DS/out-vadlag.txt`, `r2/out-build-fx.txt`)
   and far under s50c's two modes (600 and 1300 ms, `r2/out-peritem-s50c.txt`). Legacy fixtures keep `1150`.
5. **Event ordering** (review C1, timer races). A due machine timer and a recorded, logged event (a mark or a
   final) within `raceWindowMs` (50) of each other are a race the app resolved one way or the other; the
   log says which: a timer footprint (`turn: classify` or `turn: gate=`) stamped at or before the event's own
   line means the timer went first, none means the event did. Outside the window the due timer runs first.
   Provenance of 50 ms: the app's gate timer fires late by p50 4, p90 24, p95 134, p99 208, max 286 ms over
   326 gate dispatches in 10 runs, never early (`r2/out-timer-lateness.txt`); 50 is about twice p90. A fixed
   rule in either direction mis-orders real races: with the timer always first s50j S1Q10F's classify at
   07:47:37.977 is unmatched (the Live mark came 2 ms later, and the app took it first); with the event always
   first s50j S1Q07F's classify at 07:37:38.000 is asked on 2 finals (the final came 16 ms after it, and the
   app took the timer first) (`r2/out-calib-r2-j0.txt` against the earlier fixed-jitter run). The log-ordered
   rule matches both. Reorders per fixture: br1 4, the cue smokes 3 and 1, s50b 6, s50c 4, s50d 2, s50e 3,
   s50f 6, s50g 6, s50i 1, s50j 1 (`r2/out-calib-r2-j50.txt`).
6. **Budget** (review C2, and the re-smoke's S1Q08F). `score()` line 109 uses `firstDetection`; the new rows
   use: `max(voiceOff + gate + settle + (unfinished hold when the dispatched text does not read finished),
   the first positive evidence in the item's window, the last final the dispatched text holds + settle)
   + 100 ms`. The first positive evidence is the earliest of the first mark and the first `question` verdict
   delivery. Each term is a clock the machine must wait out: s50d S2Q05F's finals end without terminal
   punctuation, so the Live revive at 08:03:24.734 dispatches on the unfinished hold at +3700 (budget 4200;
   today +5972); the re-smoke's S1Q08F has its second final 3.1 s after the voice-off, so the whole dispatch
   lands at +3490 (budget 3590; today +4290, headless). For s50a/after9 (no verdicts, finals within the gate)
   this is identical to today. The committed test keeps its own rows for those two fixtures.
7. **Modes.** `replay(f, mode)` takes the machine's `memory` and the verdict policy. The test file runs, per
   fixture: calibration (memory off, recorded verdicts), fix (on, recorded + detector substitution), fix (on,
   recorded + unknown substitution), and for br1 and the cue smoke the three controls (§6.5).
8. **A builder test** (`interview60.turns-fixture.test.ts`, new) on synthetic log snippets: a null-result
   classify with a close → `{ verdict: 'not-a-question', raw: 'null' }`; an unresolved classify → throws
   (E10); a post-roll classify → recorded, not thrown; a bimodal lag → throws unless per-item (E12);
   marks-only detections on a whole-turn log; `absorb` parsed, not fed; `live=` preferred over `question=`;
   a footprint list.

### 6.2 Fixtures (non-holdout only) and calibration, redefined

| fixture | run | offset (ms) | why it is here |
|---|---|---|---|
| `2026-09-30T11-45-30-br1-turns.json` | MAIN | 1419 (n=46, p10 1402, p90 1439) | the 61 s late answer; the R21 S2Q01 contamination; 11 classifies |
| `2026-09-30T13-46-52-cuesmoke-turns.json` | whole-turn | 776 (n=24, 757–789) | the double; 5 classifies |
| `2026-10-01T02-37-41-cuesmoke-turns.json` | whole-turn, the 05:00 re-smoke | 608 (n=22, 590–627) | two real declines: the S1Q07F lead-in, the S1Q08F fragment (`r2/out-build-fx.txt`) |
| `…-s50b-turns.json` | MAIN | 625 | S2Q06 false close, Live rescue +6.4 s |
| `…-s50c-turns.json` | MAIN | per item (S1Q01–S1Q07 586–620, the rest 1292–1346; 40 of 40 own) | S2Q05: detector "yes" 1.1 s after the close |
| `…-s50d-turns.json` | MAIN | 686 | the outage hour: 10 `unknown` closes, 9 rescues, S2Q09 miss |
| `…-s50e-turns.json` | MAIN | 694 (n=47, 679–710) | S2Q01F's late inlining claim (I1) |
| `…-s50f-turns.json` | MAIN | 628 | S2Q05 false close; 4 deduper-dropped echoes |
| `…-s50g-turns.json` | MAIN | 707 (n=43, 690–722) | S2Q01F's on-time inlining claim on an open turn (I1) |
| `…-s50i-turns.json` | MAIN | 837 | S2Q09 headless (verdict on 3 of 5 finals); S2Q07F contamination |
| `…-s50j-turns.json` | MAIN | 1003 | S1Q07F, S1Q08F (a final in flight), S1Q10F headless; 4 dropped echoes |

About 115 KB each, about 1.3 MB in all, the precedent being the two committed fixtures.

**Calibration (R1), what a WAV-span fixture can and cannot reproduce.** The fixture carries the WAV's voice
spans, the log's finals and marks, and the recorded verdicts. It does not carry the app's energy-VAD
transitions (not logged per transition), pre-roll audio, or the app's own timer lateness. The review showed
revision 1's "every event within 100 ms" cannot pass (`RS/calib-check.mjs`, reproduced in
`r2/out-review-calib-anchor.txt`). The rule is therefore five reads per fixture on the unmodified machine
with recorded verdicts, each pre-registered, each measured on the prototype (`r2/out-calib-r2-j50.txt`):

| read | rule | measured, 12 fixtures |
|---|---|---|
| R1a | every replay `classify` is matched to a recorded one | 0 unmatched on all 12 |
| R1b | every recorded classify the replay never asked is listed, and each is **pre-roll** (before the first item), a **race** (a mark within 200 ms of the ask that the replay's clock delivered first), or **not-quiet** (the WAV's voice was on, or a final under settle, at the ask) | br1: 1 pre-roll, 1 race (+4 ms); the cue smoke 1 pre-roll; the re-smoke 1 pre-roll; s50c 1 pre-roll (plus 1 race at +166 ms on the single-offset fixture only); s50e 1; s50f 1; s50i 2; s50j 1; s50b, s50d, s50g 0. Nothing unexplained |
| R1c | every recorded `not-a-question` close is reproduced on the same item within 100 ms | 21 of 21 (br1 1, re-smoke 2, s50b 1, s50c 1, s50d 10, s50f 1, s50i 1, s50j 3) |
| R1d | every item's first dispatch has the log's source (`fromLive`) | 0 mismatches on all 12 |
| R1e | every item's first dispatch lands within 100 ms of the log's, **or** carries one of four named signals and is listed: (i) its own VAD offset deviates from the fixture's by more than 100 ms (the app's VAD-off, from its `gate=`/classify lines, against the WAV voice-off); (ii) the log's `gate=` is ≥ 3700 while the replay dispatched at the gate (the app held); (iii) a `deepgram speech-started vad=true` blip between the WAV voice-off and the log's dispatch; (iv) the log's dispatch rode on a mark (within 50 ms after a mark line) at a `gate=` that is neither the gate nor the hold, while the replay's did not (the app's timer had not fired). Each listed item is reported with its delta | 0 unexplained on all 12. Listed with a delta over 100 ms: br1 S1Q02 (i, −600), S1Q02F (i and iii, −4136), S1Q03F (ii and six blips, −7648), S1Q08 (iii, +3698: the 11:02:37 blip); the cue smoke S1Q08F (iv, `gate=3207`, −1987); s50j S2Q09 (iv, `gate=3205`, −1038); s50c on the single-offset fixture: 13 items (i, +521 to +716), none on the per-item fixture |

The four signals are properties of the run, not of the machine: (i) and (iii) are the energy VAD, (ii) a
stop the app never saw, (iv) an app timer that fired late (both (iv) cases dispatched 2 ms after the next
Live mark, about 2 s after the settle; the final handler does re-arm the timer, `main.ts:1230`, so the cause
is an unlogged stall, not a missing re-arm). The replay's budget is relative to the WAV voice-off, so an item
listed under (i)–(iv) still counts in R3–R16: those rows compare the fix against the calibration run of the
same fixture (§6.6), never against the log.

**Which fixtures are calibrated, which illustrative.** Calibrated (all five reads clean, every exception
named): all 11 with s50c per item. Illustrative only: s50c with a single offset (13 items under signal (i));
it is kept to show E12's refusal and is not in the rule. **Admissibility**: a fixture failing R1a, R1c or R1d,
or with an unexplained R1b/R1e entry, is inadmissible: its rows are dropped from R3–R16 and it is listed
with the failing read; the other fixtures' rows stand. If br1, the cue smoke or the re-smoke is inadmissible
the rule cannot be read (R3, R4, R16 need them) → INCONCLUSIVE: fix the builder, re-run the same rule.

### 6.3 Unit tests, each watched red first

`interviewerTurn.test.ts`, new describe blocks (flag-on machine, `memory: { revive: true, echo: true }`, a
stub `judge` where noted):

| id | test | red today because |
|---|---|---|
| U1 | a "no" on two finals, then whisper evidence quoting them 1.4 s later with no new speech → `dispatch` with `finals: 2`, `fromLive: false`, at that tick | today the "no" closes the turn; the detection opens an empty turn; no dispatch |
| U2 | a final after a "no" rejoins (`snapshot().finals` grows, `declined` set) and re-arms: the next quiet tick is `classify` with the grown count | today the turn is gone |
| U3 | a declined turn with nothing after it: draining the machine's timers from the verdict yields exactly one decision, `close not-a-question` at `verdict + continuationMs` | today it closes at the verdict |
| U4 | an `unknown` verdict declines; the expiry is `close no-verdict` | `unknown` does not exist |
| U5 | a Live claim quoting the answered turn 76 s after its dispatch → `evidence` returns `absorbed` with `score ≥ 0.5`; `snapshot().open` is false; no dispatch follows | today a Live-only turn dispatches 3.7 s later |
| U6 | a non-fitting whisper positive on a declined turn with an unjudged tail → `split` with `moved` = the tail's count; the id changes; the fresh turn holds the tail and is marked; the judged text never dispatches | the outcome does not exist |
| U6b | the same with no tail → `ignored why=no-quote`; the declined turn's id is unchanged | — |
| U6c | the same with an unscorable chip (3 content words) and no tail → `ignored why=unscorable` | — |
| U6L | a non-fitting Live claim on a declined turn with no tail → `split` with `moved: 0`; the fresh turn dispatches `fromLive: true` on the unfinished hold | — |
| U7 | a verdict for the open turn with a stale finals count → `ignored why=stale-finals`; state unchanged | today it applies |
| U7b | a final on an undetected, classified turn re-arms: the next quiet tick is `classify` again (I3), declined or not | today `classifyAsked` is set once |
| U8 | a verdict on a dispatched turn → `ignored why=dispatched`; the continuation close still comes 8 s after the dispatch | today it closes the turn at once |
| U9 | a classify verdict `question` with the current finals count revives a declined turn | no declined state |
| U9b | a negative verdict on a marked, undispatched turn → `ignored why=marked`; the gate dispatch stands (I9) | today it closes the marked turn |
| U10 | the reverse rule: a declined 2-content-word fragment and its verbatim chip → `revived` with `rule: 'reverse'`; a chip sharing none of its words → `ignored why=unscorable` | — |
| U11 | a declined turn hears `speech(true)`: the expiry does not fire while speaking; after `speech(false)` with no words, the window ends 8 s after the verdict, not after the stop | — |
| U12 | four answered turns; an echo of the second (three back) → `absorbed`; then an echo of the first (four back) → `marked`, a Live-only dispatch, and the memory ends with that echo (pins `REMEMBERED_TURNS = 3` from both sides, review Minor 7) | — |
| U13 | an echo of the last answered turn arriving while a new turn holds finals it does not fit → `absorbed`; the new turn's `live` stays empty (the s50i S2Q07F shape) | today it marks the new turn and joins its `live[]` |
| U14 | the residual rule: a claim quoting a remembered turn at 0.6 whose other words are in the open finals → `marked` (joined), not absorbed (the s50g shape); the outright rule: a claim at 0.58 against the finals and 0.50 against the memory → `marked`; a tie (1.0 and 1.0) → `absorbed` (I2) | — |
| U15 | whisper evidence quoting a remembered turn with no new words → `absorbed` (I2) | today whisper is never echo-tested |
| U16 | R15 before the judgement: a stale dispatched turn is remembered and closed by the evidence that arrives `continuationMs` later, and that evidence is then judged against the new memory | — |
| U17 | flag-off machine: `unknown` closes as `not-a-question` at once; every existing test in the file passes with its calls rewritten to `evidence`/`verdict` (they construct with the default `memory`) | pins, green from the start; rule 8 is met by running them once against the flag-on machine and watching them fail |

`turnQuote.test.ts`: the floor (3 content words → unscorable); direction (evidence a subset of spoken → 1.0;
spoken a subset of evidence → lower); the reverse rule's two sides; `QUOTE_MIN_HITS` (one coincidental
residual word does not fit); the cases of §3.2's first table, numbers as given (question text only).
`turnMemory.test.ts`: unset/empty/`0` off, `1` on, junk throws; the startup line.
`QuestionDetector.detectNow.test.ts` (changed): lines 39 and 44 go red; new rows: null with the heuristic
saying no → `unknown/null-result`; null with the heuristic saying yes → `question`; a throwing client →
`unknown/threw`; disabled → `unknown/disabled`; `clear()` during the call → `unknown/stale`; a model "no" →
`not-a-question`; the `detectNow issued` line.

### 6.4 Replay assertions (today → after the fix)

The "today" column is the calibration run of the same fixture on the prototype; the "after" column is the
prototype in fix mode (`r2/out-rows-r2.txt`). Every row reads the same under both substitution policies.

| test | today | after |
|---|---|---|
| br1 S1Q08: exactly one dispatch, `fromLive=false`, `finals=5`, ≤ budget; no `nothing-heard` in its window | 65 350 ms, from Live, `nothing-heard` present → **fails** the budget row | 3006 ms from the finals (budget 3106); the echo at 11:02:46 absorbed at 0.92 |
| cue smoke S1Q08: exactly once; one `absorb` with score ≥ 0.5 | 2 → **fails** the "once" row | 1; absorbed 1.00 at +72.8 s |
| the re-smoke S1Q07F: once, `fromLive=false`, `finals=2`, coverage ≥ 0.8, ≤ budget | once, from Live, `finals=0`, 7243 ms | 2845 ms from both finals (budget 2945): the stale-finals verdict ignored, the re-armed classify on 2 finals answered by the detector's own call (fix) or declined and revived by the chip at 1.0 (unknown); the statement never alone |
| the re-smoke S1Q08F: once, `fromLive=false`, `finals=2`, coverage ≥ 0.8, ≤ budget | once, `finals=1`, coverage 0.88, 4290 ms (headless) | 3490 ms (budget 3590), coverage 1.00, whole: revived by the reverse rule at 02:30:41.839 |
| s50b S2Q06, s50c S2Q05, s50f S2Q05, s50j S1Q07F, s50j S1Q08F, and s50d S1Q04 S1Q06 S1Q08 S1Q09 S2Q04 S2Q05 S2Q05F S2Q06 S2Q08: exactly once, `fromLive=false`, `finals ≥` the classify's count, ≤ budget, **faster than today** | +5.5 to +7.5 s from Live, `finals=0` | revived at the first fitting positive, +1.8 to +3.7 s: s50b 2910 (today 6610); s50c 2768 (6816); s50d 2202, 3335, 2563, 3360, 2333, 3205, 3700 (the hold), 2710, 2278 (today 5902–7060); s50f 3378 (7078); s50j S1Q07F 1829 (5529), S1Q08F 3062 (6922). The detector's own chip revives s50c S2Q05, s50d S2Q08, s50j S1Q08F; Live revives the rest |
| s50i S2Q09, s50j S1Q10F: once, coverage ≥ 0.8 | 0.46, 0.45 → **fail** the long-whole row | 0.96 (4 finals then a supersede to 5), 1.00 (2 then 3) |
| s50d S2Q09 | never | still never: `close no-verdict`, asserted as 0 dispatches so a change is seen |
| br1 S2Q01: one dispatch from its own finals, no R21 route, `live=[]` | R21 route, `live` carries S1Q10F's text | a normal gate dispatch, `finals=4`, `live=[]`; the S1Q10F echo absorbed at 11:11:12 |
| s50i S2Q07F: `live=[]` | carries S2Q07 | `live=[]`, `finals=3` |
| committed s50a / after9 | 40/40 once, 76/76, 0 early, 15/15 and 6/6 long whole, 0 supersedes, median 1200 ms | unchanged with memory on; today's 2 deduper drops on s50a become absorptions (`r2/out-legacy-r2.txt`) |

### 6.5 Controls

- br1, revive on, echo off, recorded verdicts: S1Q08 dispatched **twice** (prototype: 2). Not twice → the
  harness does not show the echo → INCONCLUSIVE.
- br1, revive off, echo on: S1Q08 once, `fromLive=true`, 65 350 ms (prototype: so). Anything else → the revive
  is not what fixes it → INCONCLUSIVE.
- the cue smoke, echo off: S1Q08 **twice** (prototype: 2).

### 6.6 Unchanged elsewhere

For every item on every fixture not named in §6.4: dispatch count, first-dispatch source and coverage equal
to the same fixture's calibration run, and first-dispatch time within 100 ms of it. Both runs happen in the
same test file, so the comparison is against the machine as it was, never against the log. Prototype: 0
differences on all 12 fixtures.

### 6.7 Crafted fixtures: statements, the split, the echo guard

Crafted fixtures prove the machine's branches on shapes the recordings do not hold; they cannot prove what
the detector or Live would say about a statement. They live in `electron/test/golden/fixtures/crafted/`,
carry `crafted: true` and a provenance note, use synthetic times, never feed the aggregate rows, and each
asserts its own outcomes (rule 8: a crafted case that cannot fail proves nothing). Verdict latency 400 ms
unless the case copies a run. Q0 is "How would you shard a Postgres table by tenant?"; the statement is
"Great, thanks for walking me through that." (the existing `not-a-question` unit test's text). All 22 read as
asserted on the prototype (`r2/out-crafted-r2.txt`).

| id | shape | asserts | proves |
|---|---|---|---|
| S-1 | the statement declined at 24.1 s; a stale non-quoting whisper chip at 25.5 s | `ignored why=no-quote`; no dispatch; `close not-a-question` at 32.1 s | a non-fitting whisper positive with no tail leaves the declined turn alone |
| S-1L | the same with a non-quoting Live claim | `split moved=0`; one Live-only dispatch at 26.2 s on the unfinished hold | today's rescue path |
| S-2 | the statement, then silence | exactly `close not-a-question` at 32.1 s | the expiry clock |
| S-3 | the statement declined; a question's final at 31.7 s; its chip at 32.0 s | `revived forward 1.0 finals=2`; one dispatch at 32.2 s of statement + question | rejoin, revive; the pinned text grows (the whole-turn intent) |
| S-3b | as S-3 with no chip; the re-armed classify (finals=2) says "question" | `revived by verdict`; one dispatch at 32.6 s | revive by verdict with the current count |
| S-4 | Q0 answered; the STT silent; a new Live question reusing Q0's words at 40 s | `absorbed` at 0.71 | the accepted residual, pinned |
| S-5 | Q0, Q1 answered; Q2's finals open; a Live claim with Q0's text | `absorbed` (two back); Q2 dispatches with `live=[]` | the count ≥ 2 and the contamination fix |
| S-6 | C3: "Okay, that makes sense, thanks for that." declined; "So why would you use Kafka here?" at 28.1 s; the chip "Why would you use Kafka here?" (3 content words) at 29.6 s | `split moved=1 unscorable`; one dispatch of the question alone at 29.6 s | a short question after a declined statement is answered as today |
| S-6L | the statement declined; a Live claim for a question the STT missed | `split moved=0`; Live-only dispatch | today's rescue |
| S-7 | I1, the s50g shape with real texts: the parent answered; the follow-up's finals open; Live's inlining claim | residual 7 of 7; `marked` (joined); one follow-up dispatch with the claim in `live[]` | the residual clause |
| S-7D | as S-7 with the follow-up declined first | `revived forward` | the residual clause revives too |
| S-8 | I2: Q0 answered; "Okay, so you would shard the Postgres table by tenant, got it." declined; stale whisper and Live re-fires of Q0 | both `absorbed`; the statement expires at 32.1 s; Q0 answered once | ties go to the memory; whisper is echo-tested |
| S-8b | honesty pin: the re-armed classify on statement + question says "question" | one dispatch, text starts with the statement | the design answers a statement when an ear says question on its text |
| S-9 | I3: a final lands while the first classify is in flight | `ignored why=stale-finals`; a re-armed classify at 5.2 s (finals=2); "question" → one dispatch at 5.6 s | the re-arm |
| S-10 | I9: a chip marks before the gate; a negative verdict for the same turn and count | `ignored why=marked`; the gate dispatch stands | — |
| S-11 | the re-smoke's S1Q08F shape, real texts, log-relative times | `declined`; the verbatim chip → `revived reverse 1.0 finals=1`; the Live claim joins; one whole dispatch of 2 finals at the settle after the second final | the reverse rule on the recorded shape |
| S-12 | the re-smoke's S1Q07F shape with a 400 ms verdict (landing before the question's final) | `declined`; the question's final rejoins; its chip → `revived forward 1.0 finals=2`; one dispatch of lead-in + question; the lead-in never alone | the C3 path on the recorded texts |
| S-13 | the reverse rule's negative: the statement (5 content words) and an unscorable chip of another question ("Why not Redis then?") | `ignored why=unscorable`, score 0; and a scorable chip sharing one word ("Thanks, what about cost?") → `ignored why=no-quote` at 0.25 | the floor and the forward test |
| S-13b | the reverse rule's accepted edge: an unscorable chip made of the statement's own words ("Walking me through that?") | `revived reverse 0.6`; the statement answered | the detector said yes on this text; pinned so a change is noticed |
| S-14 | U12's twin on the machine | as U12 | the count bound from both sides |
| S-15 | the interviewer repeats Q0 within 60 s and the STT hears it; Live's claim for the repeat | `absorbed`; the repeat's finals go to the classify at 35.4 s | the §9 residual |
| S-16 | Minor 11's second fragility: the re-armed classify's own chip paraphrases the declined text under the bar, with a tail | `split moved=1` before its own "question" verdict, which hits `stale-turn`; the tail answered alone | named, pinned |

## 7. Pre-registered replay rule

Written before the fix exists. Never renegotiated after the data. A PASS licenses the flag-off build and the
pre-registration of the flag-off live exercise (§3.7 step 2); it licenses nothing else. Thresholds are the
provenance-bound constants of §3.2 and the tolerances of §6; none moves in response to a result. The
prototype's reading of every row is in `r2/out-rows-r2.txt` and `r2/out-calib-r2-j50.txt`.

**R1 (precondition, per fixture): the five calibration reads of §6.2.** An inadmissible fixture drops its own
rows and is listed; br1, the cue smoke or the re-smoke inadmissible → INCONCLUSIVE (fix the builder, re-run).

| row | what | threshold / provenance | reads |
|---|---|---|---|
| R2 | s50a and after9 unchanged in every mode | 40/40, 76/76 spoken, 0 early, 15/15 and 6/6 long whole, 0 supersedes, median ≤ 1400 ms (the committed file's own rows, `interviewerTurn.replay.test.ts:146-149`) | FAIL |
| R3 | br1 S1Q08 | once, `fromLive=false`, `finals=5`, ≤ budget, no `nothing-heard` | FAIL |
| R4 | cue smoke S1Q08 | once; one `absorb`, score ≥ 0.5 | FAIL |
| R5 | the three controls of §6.5 | as stated | not as stated → **INCONCLUSIVE** |
| R6 | the 14 rescued false-close items of §6.4 (s50c per item) | each once, `fromLive=false`, `finals ≥` the classify's count, ≤ the §6.1.6 budget, **and faster than its calibration latency** | FAIL |
| R7 | s50i S2Q09, s50j S1Q10F | once, coverage ≥ 0.8 | FAIL |
| R8 | s50d S2Q09 | 0 dispatches, `close no-verdict` | a dispatch → FAIL |
| R9 | unchanged elsewhere (§6.6) | every other item: same count, same source, same coverage, time within 100 ms of calibration | FAIL |
| R10 | no double anywhere | 0 items with > 1 dispatch over the 11 fixtures | FAIL |
| R11 | every absorbed claim belongs to an item already answered | attribution by **time** first (review I6): a claim ≤ 10 s after the last clip end belongs to that clip's item; later claims by text (`livelag.mjs`'s rule); the item must hold an admitted dispatch before the claim; an unattributable claim is printed with its question text and read by hand. The `echoOf` identity is informational | an absorbed claim whose item was not yet answered → FAIL |
| R12 | br1 S2Q01 and s50i S2Q07F carry no stale Live text | once, no R21 route, `live=[]` | FAIL |
| R13 | unit tests | U1–U16 red on today's code, green after; U17 pins green and red against the flag-on machine; turnQuote, turnMemory, detectNow (lines 39, 44 red first) green | FAIL |
| R14 | substitution independence | **every** row R3–R12 and R16 reads the same under `recorded+detector` and `recorded+unknown`; the substitution count is printed per fixture and every row resting on a substituted verdict is marked. Expected: 8 substitutions in all (the cue smoke 1, the re-smoke 1, s50i 3, s50j 3; of them 2 re-armed), rows resting on one: the re-smoke S1Q07F, s50i S2Q07F, s50j S1Q08F, s50j S1Q10F (`r2/out-rows-r2.txt` notes) | a row that differs between policies → **INCONCLUSIVE** for that row; more than 16 substitutions → INCONCLUSIVE |
| R15 | crafted fixtures | S-1 … S-16 each as asserted (§6.7) | FAIL |
| R16 | the re-smoke's two declines | S1Q07F and S1Q08F each once, `fromLive=false`, `finals=2`, coverage ≥ 0.8, ≤ budget; the lead-in and the fragment never dispatched alone | FAIL |

Decision: every row PASS → **PASS**; any FAIL → **FAIL**: no build; the design is re-examined and any change
gets a new spec revision and a new pre-registration; R5 or R14 INCONCLUSIVE and nothing FAIL →
**INCONCLUSIVE**: fix the harness, re-run the same rule. Expected absorptions (reported, not gated): 22, all
Live, all same-item: br1 S1Q08, S1Q10F, S2Q01 (11:11:50, at 0.57), S2Q01F, S2Q02F, S2Q10; the cue smoke
S1Q08; the re-smoke S1Q10; s50d S1Q03F; s50e S1Q10, S1Q10F, S2Q01 (its follow-up's late claim, `echoOf` the
parent), S2Q02; s50f S1Q01F, S1Q09F, S1Q10, S2Q01F (on time, +8.7 s, after its own answer); s50i S2Q07
(the contamination claim, 0.68 against 0.14); s50j S1Q06F, S2Q07, S2Q07F, S2Q08 (`r2/out-absorbed-table.txt`).
Expected `split` and `ignored` outcomes on the fixtures: 0 (no non-fitting positive meets a declined turn in
the 12 hours); those branches are proved by S-1, S-1L, S-6, S-6L, S-13, S-16 only.

## 8. Out of scope, named

- **The small-talk detector prompt.** Not designed here. The recording of §3.7 step 3 is shared with it, and
  the flip gate of step 4 is where this change's effect on small talk is measured.
- **The h40b/h40c R05 miss.** Live's 3-word claim "Redis or Memcached?" is dropped by `isFragment`
  (`main.ts:2089`) before the mark block. Named by DS only as a pipeline path.
- **Answering in a detector outage with no ear** (s50d S2Q09): a product decision. Part 3 keeps the text and
  names the outage; it does not answer.
- **The earlier-questions feature** (`NATIVELY_EARLIER_QUESTIONS`, not built) and `NATIVELY_FOLLOWUP_PARENT`
  (off): neither reads the machine's state; this change alters which text is pinned for a revived turn (the
  finals, not Live's paraphrase) and removes the echo's second pin.
- **Live lag itself** (DS C7): external; this design makes the dispatcher tolerate it.
- **The two app timer stalls** found by calibration (the cue smoke S1Q08F, s50j S2Q09: a settle-time dispatch
  that waited about 2 s for the next mark): unexplained, pre-existing, not changed here; named so the next
  timing read knows the signal.

## 9. What this change cannot show; residual risks

| risk | why it remains | bound |
|---|---|---|
| Free-standing statements and small talk | no non-holdout recording has one; the crafted verdicts are assumptions | flag off until the recording is flown both ways (§3.7) |
| A revived statement | the design answers a declined turn when any ear says "question" on its text: the re-armed classify (S-8b), an unscorable chip made of its own words (S-13b) | pinned; measured by the flip gate's (a) |
| A revived lead-in pins the lead-in | a Live claim that fits a declined lead-in while the STT missed the question dispatches the lead-in's finals with the claim in `live[]` (review Minor 11) | needs the STT to miss the question after hearing its lead-in; 0 of 16 rescues; the smoke's `revived` lines are read for it |
| The split's second fragility | the re-armed classify's own heavily paraphrased chip splits the turn before its "question" verdict (S-16); the tail is answered, the judged head is not | 1 of 973 whisper marks on turns with finals scored under 0.5 (`r2/out-mark-vs-finals.txt`) |
| False absorption | a new Live-heard question reusing half the content words of a remembered one, with no finals since and none of its new words in any finals (S-4); worse with the STT channel off | 0 of 523 on-time claims, 0 of 16 rescues; pinned by S-4; count guard 3 |
| A repeated question the STT missed | "let me repeat that" with no finals → absorbed; today it would be answered again after 60 s | the previous answer is on screen; S-15 |
| Live lag beyond three turns | count-based memory | falls back to today's Live-only path (S-14) |
| Re-armed classifies | the real detector's verdict on a grown declined turn is unknown until flown; the replay substitutes (§6.1) | R14 requires policy independence; 8 substitutions expected |
| Model flips on identical input | unmeasurable offline (DS §10) | the design makes one sample non-terminal |
| Answer quality after a revive | the answer is generated from the finals as an on-time answer would be; the statement prefix of S-3/S-12 is new text in a pinned question; not graded here | the smoke and the flight grade it |
| The window margin | revives came within 2.1 s of the decline in every fixture; the window is 8 s | a late rescue takes today's path; the smoke reports every rescue's lag |
| Tokenizer gaps | "PRAUC" against "PR AUC" are different words to `overlap`; a short claim can be unscorable | shared with the reconciler; not new |
| Extra Groq calls | one more classify per rejoined undetected turn; the stale-finals ignore costs no call on a "yes" (the chip marks first) and one call on a "no" (review I3) | 11 of 184 verdicts; negligible against about 160 detector calls an hour |
| The two app timer stalls | unexplained (§8) | pre-existing; excluded from R1e by signal (iv) |

## 10. Files

New: `electron/services/turnQuote.ts` (+ test), `electron/services/turnMemory.ts` (+ test),
`electron/test/golden/interview60.turns-fixture.test.ts`, 11 fixtures under `electron/test/golden/fixtures/`,
22 crafted fixtures under `fixtures/crafted/`, `passes/PREREGISTER-turnmemory-replay.md` (§7 verbatim, before
the fix).
Changed: `electron/services/interviewerTurn.ts` (+ test, 31 call sites rewritten), `electron/services/QuestionDetector.ts`
(+ `QuestionDetector.detectNow.test.ts`, existing), `electron/IntelligenceManager.ts`, `electron/main.ts`,
`electron/services/interviewerTurn.replay.test.ts`, `electron/test/golden/interview60.turns-fixture.mjs`.
Untouched: `ChipDeduper.ts`, `questionReconcile.ts` (its `overlap` is reused), `turnDispatch.ts`, `liveHold.ts`,
`questionShape.ts`, `detectionDispatch.ts`, `interview60.metrics.mjs`, every prompt.

## Appendix A. The recorded runs under the new machine (prototype traces)

**br1 S1Q08** (`r2/out-trace-br1-S1Q08.txt`; times UTC)

| time | today | new (flag on) |
|---|---|---|
| 11:01:45.568 | `classify finals=5` | same |
| 11:01:45.960 | `close not-a-question`; finals dropped | `verdict=not-a-question finals=5 outcome=declined`; window to about 11:01:53.96 |
| 11:01:47.374 | the chip opens an empty turn | `mark … outcome=revived rule=forward score=1.00` (residual 25 of 25); quiet 3.0 s, finished → dispatch, `finals=5` |
| 11:01:55.374 | `close nothing-heard` | `close continuation-expired`; S1Q08 remembered |
| 11:02:46.018 | Live claim → Live-only turn → the only answer, 65 350 ms after the voice-off | `dispatch: absorb … score=0.92 ageMs≈58600`; nothing else |

**Cue smoke S1Q08** (`r2/out-trace-cuesmoke-S1Q08.txt`): the whisper dispatch at 13:37:15.956 as today; at
13:38:28.725 the Live claim is absorbed at 1.00 (72.8 s after the answer) instead of opening the second turn.

**The re-smoke S1Q07F** (`r2/out-trace-cuesmoke2-S1Q07F.txt`)

| time | today (the log, reproduced by calibration) | new |
|---|---|---|
| 02:26:45.270 | final 1 "A nightly job fails halfway through." (its voice ended at 40.140; Deepgram held it 5 s) | same |
| 02:26:46.520 | `classify finals=1` | same |
| 02:26:47.013 | final 2 "How do you resume it without duplicate campaign actions or mixed model versions?" lands during the call | rejoins and re-arms |
| 02:26:47.413 | — | `classify finals=2` (re-armed) |
| 02:26:47.769 | `close not-a-question` with both finals | `ignored why=stale-finals` |
| 02:26:48.165 / 48.168 | the chip opens an empty turn | the re-armed classify's verdict ("question", the detector's own call) marks, or under the unknown policy the chip revives at 1.00; dispatch `finals=2`, 2.8 s after the voice-off |
| 02:26:52.563 | `gate=7279 finals=0 live=1` → the answer from Live's text | the Live claim at 48.863 joins an already dispatched turn |

**The re-smoke S1Q08F** (`r2/out-trace-cuesmoke2-S1Q08F.txt`)

| time | today | new |
|---|---|---|
| 02:30:39.796 | final 1 "How could repeatedly" (0.3 s after the voice-off; the WAV has one unbroken voice span) | same |
| 02:30:40.699 | `classify finals=1` | same |
| 02:30:41.580 | `close not-a-question` | `outcome=declined` |
| 02:30:41.839 | the chip "How could repeatedly" opens an empty turn | `outcome=revived rule=reverse score=1.00` (2 of 2 content words) |
| 02:30:42.275 | Live's claim joins the empty turn | joins the revived turn |
| 02:30:42.589 | final 2 joins the empty turn | joins; settle |
| 02:30:42.989 / 43.789 | dispatch at 43.789 with `finals=1`: "training on customers affected by previous campaigns introduce bias?" | dispatch at 42.989 with `finals=2`, the whole question |

## Appendix B. Decisions this spec had to make beyond the diagnosis

1. **A non-fitting positive splits a declined turn at the verdict's boundary** (C3): the judged text closes,
   the unjudged tail becomes the fresh turn the positive marks. Replacing the whole turn (revision 1) lost
   the tail; ignoring the positive (the review's whisper option) would leave a short question to a
   re-classify that may say "no" again. A whisper positive with no tail is ignored because a fresh turn
   would be empty; a Live positive with no tail is today's Live-only rescue.
2. **Verdicts are scoped to (turn, finals count), both signs, and a final re-arms any undetected classified
   turn** (I3). A positive on a prefix is ignored too; it costs no call, because the classify's own chip
   marks the turn first.
3. **One judgement for both ears, with three ways to fit the open turn** (residual, outright, reverse) and
   ties to the memory (I1, I2, C3). Each clause is carried by a recorded case: s50g (residual), br1 S2Q04F
   (outright), the re-smoke's S1Q08F (reverse), the restating statement (ties).
4. **The echo memory is the last three dispatched turns by count**, tested after R15 (Minor 8), newest wins
   ties (Minor 6).
5. **A verdict on a dispatched or marked turn is ignored** (I9) rather than closing an answered or detected
   turn.
6. **The post-fix replay substitutes verdicts** for classifies the run never asked and reports every one;
   R14 demands policy independence and caps the count.
7. **Calibration is five reads with named exceptions**, not a 100 ms rule over every event (C1); the budget
   carries the unfinished hold and the last final's settle (C2).
8. **One env flag, default off; the flip is gated on a recording flown flag-off and flag-on** (I10).
9. **Two machine entry points** (`evidence`, `verdict`) replace `liveClaim` + the `detected` overloads
   (Minor 4); 31 unit-test call sites are rewritten mechanically.

## Appendix C. Open questions for the user, each with a recommendation

1. Substitution policy for re-armed classifies in the replay: the run's own detector call on the same
   finals, else `unknown`, every row read under both, counts pre-registered (8, cap 16). Recommend yes.
2. A positive verdict on stale finals: ignored, like a negative; the chip marks first so it costs nothing
   (I3). Recommend yes.
3. The declined window: reuse `continuationMs` (8 s); margin 5.9 s in the verdict frame. Recommend reuse.
4. `REMEMBERED_TURNS = 3`. Recommend 3.
5. The flag, default off; a flag-off live hour before the flag-on smoke; the recording's two hours before
   the flip (§3.7). Recommend yes.
6. The new recording (§3.7 step 3): build it after Friday's flight on the interview60 build-audio path; nine
   scripted shapes, each at least twice; fly it flag-off then flag-on. Recommend it before the flag-on flight.
7. `close reason=no-verdict` as a new close reason. Recommend yes.
8. (new) C3's rule: split at the verdict's boundary; a whisper positive with no tail ignored; a Live positive
   with no tail goes Live-only. Recommend yes.
9. (new) I9: a negative on a marked turn is ignored. Recommend yes.
10. (new) I1: which echo error to accept. Neither: the judgement absorbs 0 of 523 on-time claims and keeps
    s50i's contamination fix; the accepted residual is S-4. Recommend the judgement as specified.
11. (new) I2: whisper positives are echo-tested; ties go to the memory. Recommend yes.
12. (new) Minor 10: the Live quote input is `d.liveText`; the mark line logs it in full as `live=`; the
    pre-fix fixtures feed the STT line for `replaced` marks and say so. Recommend yes.
13. (new) C1: calibration as five reads with four named signals; an inadmissible fixture drops its own rows;
    a headline fixture inadmissible → INCONCLUSIVE. Recommend yes.
14. (new) C2: the budget's hold and last-final terms; R6 also requires faster than calibration. Recommend yes.
15. (new) I5: the harness passes the dedup anchor. Recommend yes.
16. (new, mine) The interface: `evidence()` and `verdict()` replace `liveClaim`/`detected`; 31 unit-test call
    sites rewritten with unchanged expectations. Recommend yes; the alternative (revision 1's `opts`) keeps
    the names at the cost of a throw that cannot surface loudly.
17. (new, mine) The reverse rule for unscorable evidence (`REVERSE_MIN_CONTENT_WORDS = 2`): it makes the
    re-smoke's S1Q08F whole; its accepted edge is S-13b. Recommend yes; the alternative leaves S1Q08F headless
    as today (coverage 0.88, which the long-whole row would still pass).
18. (new, from the review) A smoke-only env hook forcing `detectNow` to `unknown`, so a flag-on smoke
    exercises part 1 on purpose. Recommend no: it is test-only code in production, and the recording of
    step 3 exercises every shape on purpose; the smoke reports what it gets.
