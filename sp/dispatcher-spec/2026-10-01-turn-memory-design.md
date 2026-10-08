# Turn memory: declined, not dropped; late echoes absorbed; verdict hygiene — design

Date: 2026-10-01, 02:00–04:00 local. Status: proposed; Opus review next, user review in the morning.
No code was written. Implementation starts only after Friday's validation flight, because this
change alters the turn logic that flight measures.

Baseline code: the whole-turn worktree at `8a13abb` ("WT"). Every file and line named here is
identical in MAIN after Thursday's merge (DIAGNOSIS §2: the cue branch changes only main.ts's
cue-token forwarding). Input: `scratchpad/dispatcher/DIAGNOSIS.md` ("DS", its §-numbers are cited
as DS §n) and its outputs. Vocabulary is the whole-turn design's
(`docs/superpowers/specs/2026-09-09-whole-turn-structured-answers-design.md`): gate, settle,
continuation, supersede, fail-safe, and the R-numbers in `interviewerTurn.ts` and `main.ts`.

Nothing here reads, tunes on or asserts over holdout40. The three h40 hours appear only where the
diagnosis used them: as evidence that a pipeline path exists.

## 0. In one paragraph

The turn machine forgets a turn the moment it closes. A `not-a-question` verdict throws the turn's
finals away; an answered turn survives only as a 60 s entry in ChipDeduper. Evidence that arrives
later is given to whatever turn is open when it arrives. This spec makes the machine remember: a
declined turn keeps its finals for the continuation window and is revived by a positive that
quotes it (part 1); a Live claim that quotes a turn already answered is absorbed as a late echo,
identified by its words, not by a clock (part 2); a detector that could not answer says
`unknown`, not "no" (part 3). Parts 1 and 2 ship together behind one env flag, default off, and
a pre-registered replay decides whether the build may proceed.

## 1. Problem and evidence (DS, not re-derived)

| fact | source |
|---|---|
| br1 S1Q08 (30 Sep, MAIN `0ef42a0`) was heard in full by Deepgram (five finals) and first answered 62.2 s after the clip ended, from Live's paraphrase. A `not-a-question` verdict at 11:01:45.977 closed the turn; the same detector said "question, 0.95" on the same finals 1.4 s later, into an empty turn that died `nothing-heard` 8 s after | DS §3.1 |
| Cue re-smoke S1Q08 (whole-turn `e3fae5f`) was answered on time (+1.2 s) and again 76.5 s later from a late Live claim; ChipDeduper's 60 s answered window had expired (Jaccard 0.82 against the 0.70 bar would have matched) | DS §3.2 |
| The two are one event: br1 replayed without the negative verdict answers S1Q08 at +3.0 s and again 62.3 s later | DS §4.3 |
| 24 `not-a-question` closes in 18 hours; 23 closed a real question. Of the 18 in non-holdout hours (s50b/c/d/f/i/j, br1), 18 of 18 were real questions | DS §4.1; `out-closes-summary.txt` |
| 10 of the 24 were a Groq HTTP 403: `detect()` returned null, the degraded heuristic knows no imperative verbs, `detectNow` reported `not-a-question` | DS §4.1 row 1; `QuestionDetector.ts:207-213, 316-318, 402-405` |
| The committed replay (`interviewerTurn.replay.test.ts`) never answers a `classify` decision (lines 82-92 feed speech, finals and detections only). It passed 116/116 while the flights lost these questions | DS §4.3 |
| The classify prompt is not weaker than the detector's own framing: paired verdicts disagree 6 of 68, in both directions (2 against 4) | DS §4.2 |
| Live-only turns in 18 hours: 45; 25 dropped by the deduper, 18 false-close rescues at +5.7 to +7.7 s, 2 doubles. Not one answered a question the STT had missed on its own | DS §4.4 |
| Live claim lag p50 3.0 s, p90 4.1 s; verified tails 62 s (br1) and 74 s (cue smoke) | DS §4.4 |
| The same forgetting contaminates the next question: br1 S2Q01 went out through the R21 route carrying S1Q10F's Live text; s50i S2Q07F carried a 156 s-late S2Q07 claim as its `live` entry | DS §4.4 |

## 2. Goals and non-goals

Goals
1. A question the classify declined is answered from its own finals as soon as any ear says
   "question", and answered once.
2. A late Live echo of an answered question is never answered a second time and never joins
   another turn's text, at any Live lag.
3. A detector outage is reported as what it is, and the text survives for the other ear.
4. Flag off: the machine's decisions are today's, event for event (only log lines differ).
5. Every step is decided by a pre-registered replay before any build.

Non-goals (§8): the classify prompt; the fragment rule that drops a 3-word Live claim; what to
do in an outage with no ear at all; the earlier-questions prompt feature; small talk.

## 3. Design

### 3.1 Vocabulary

| term | meaning |
|---|---|
| **declined** | a turn whose latest classify verdict was `not-a-question` or `unknown`; open, not dispatched, holding its finals; it lives for the continuation window |
| **quotes** | evidence text E quotes spoken text S when `quoteScore(E, S) ≥ QUOTE_MIN` (§3.2) |
| **revive** | a positive that quotes a declined turn makes it `detected`; it then dispatches through the normal gate from its own finals |
| **remembered** | the last `REMEMBERED_TURNS` closed turns that dispatched, each as `{ text, live, dispatchedAt }` |
| **echo** | a Live claim that quotes a remembered turn better than it quotes the open turn's finals; absorbed, opens nothing, marks nothing |
| **replace** | a positive on a declined turn that quotes neither the declined turn nor a remembered turn closes the declined turn and opens a fresh turn, exactly as today's "nothing open" case |

### 3.2 The quote test

**What it compares.** The evidence's content words against the spoken words:
`quoteScore(evidence, spoken) = overlap(evidence, spoken)` from `questionReconcile.ts:21-27`: the
fraction of the evidence's content words (lower-cased `[a-z0-9]+` tokens longer than 3 letters)
present in the spoken text. Direction matters: the evidence is the newcomer (a whisper chip's
`question`, a Live claim's raw text); the spoken text is the turn's finals joined with spaces
(`textOf`, `interviewerTurn.ts:153`) or a remembered turn's dispatched text. A chip that quotes
only the last sentence of a five-final turn still scores 1.0; a chip that quotes an earlier
question scores near 0 against a statement's finals.

**Thresholds and provenance.**

| constant | value | where from |
|---|---|---|
| `QUOTE_MIN` | 0.5 | `questionReconcile.ts:76` `MATCH`: the reconciler's own corroboration floor, held there because a union of unrelated speech reaches 0.25 on generic words (after8 07:36:26, an invented question scoring exactly 0.25). The known echoes score 0.92 (br1) and 1.00 (cue smoke) on this rule (`out-similarity.txt`); the non-holdout deduper drops' closest-earlier-answer overlaps are 0.57–1.00 (`out-liveonly.txt`). The one holdout double (h40c R18, "PR AUC" vs "PRAUC") scores 0.67 here where Jaccard and containment both failed; it is cited as the diagnosis cited it, as evidence the text rules have a gap, and no threshold is fitted on it |
| `QUOTE_MIN_CONTENT_WORDS` | 4 | `ChipDeduper.ts:129` `TAIL_MIN_CONTENT_WORDS` and `contentWordSimilar`'s floor (after5's answered "I'm going to go.", one content word, would have swallowed the next real question at +48 s). Evidence with fewer content words scores 0: it can neither revive nor be absorbed |
| `REMEMBERED_TURNS` | 3 | count, not clock: the longest verified echo is one turn back at 76.5 s (cue smoke), the longest observed is two turns back at 156 s (s50i S2Q07F, DS §4.4); 3 gives one turn of margin. Live lag tails beyond that (unverified, DS §10) fall back to today's Live-only path |

Why not Jaccard or containment: both are in ChipDeduper already and both missed h40c R18;
neither is directional, so a chip quoting one sentence of a five-sentence turn scores low.
Why not a longer deduper window: it removes only the cue smoke's double and leaves br1 at 61 s
(DS §7).

**Where it is injected.** `createInterviewerTurn` already takes the `finished` predicate as its
second parameter (`interviewerTurn.ts:103`). The quote scorer is the fourth:
`createInterviewerTurn(c, finished, memory, quote = quoteScore)`. The default lives in a new
`electron/services/turnQuote.ts` (§4.1) and reuses `overlap`; tests inject a stub to prove the
machine's branches without the tokenizer, and `turnQuote.test.ts` proves the tokenizer alone.

### 3.3 Part 1: declined, not dropped

**Today** (`interviewerTurn.ts:202-212, 227-230`): `detected(…, 'not-a-question', forTurn)` sets
`notAQuestion`; the next `tick()` sets `turn = null` and returns `close not-a-question`. The
finals are gone. The detector's positive 1.4 s later opens an empty turn (`open()`), which dies
`nothing-heard` after `maxHoldMs`.

**New (flag on).** A negative or unknown verdict marks the turn *declined* instead:
`t.declined = { at, verdict }`, `t.detected` stays false, `t.detectedAt` stays null. The turn
stays open. What can happen to it:

| event | effect on a declined turn |
|---|---|
| a positive that quotes it (a whisper chip or a Live claim with `quoteScore ≥ QUOTE_MIN`) | **revive**: `declined = null`, `detected = true`, `detectedAt = at`. The next tick runs today's dispatch branch (`interviewerTurn.ts:272-283`): at the gate if quiet and finished, else the unfinished hold, else the fail-safe. br1: the chip at 11:01:47.374 quotes the five finals; the voice has been quiet 3.0 s and the text reads finished, so it dispatches at 11:01:47.374, `finals=5`, `fromLive=false` (DS §4.3 replay without the verdict) |
| a classify verdict `question` for this turn (`forTurn` = its id, `finals` = its current count) | revive without a quote test: the classify judged the turn's own text |
| a new final | rejoins: `finals.push`, `lastFinalAt = at`, `classifyAsked = false`. The turn stays declined. At the next quiet the machine emits `classify` again on the grown text (the existing branch, `interviewerTurn.ts:263-270`). This removes C3 (DS §5): a verdict on partial text no longer decides the whole |
| a Live claim that quotes it | joins `live[]` as today, then its `detected()` revives |
| a positive that does not quote it (a Live claim is echo-tested first, §3.4) | **replace**: the declined turn closes (`close reason=not-a-question` or `no-verdict`, logged with `cause=no-quote`), a fresh turn opens and is marked, exactly today's path once the old close had happened. A whisper positive with no text of its own to add leaves an empty marked turn that dies `nothing-heard` (today's br1 shape, harmless); a Live positive opens a Live-only turn that dispatches on the unfinished hold (today's rescue path) |
| a second negative or unknown verdict (after a rejoin) | `declined.at = now`; the window restarts |
| a verdict whose `finals` count is not the turn's current count | ignored (`stale-finals`); the re-armed classify decides. Uniform for both signs (§B, decision 2) |
| the candidate speaks | `close candidate`, as for any open turn |
| the window expires: `now − max(declined.at, lastFinalAt, effectiveStopAt) ≥ continuationMs`, and not speaking | `close reason=not-a-question` (last verdict a model "no") or `close reason=no-verdict` (last verdict `unknown`). The turn is not remembered (it was never answered) |

**The window** is `continuationMs` (8000, `interviewerTurn.ts:17, 25`: human pauses over 3 s are
2 of 544), counted from the later of the verdict, the last final and the last worded voice stop,
the same clock a dispatched turn's continuation close uses (`interviewerTurn.ts:143-150, 246`).
Margin: the verdict lands about 1.6 s after the voice stops (br1: gate 1200 ms + 391 ms latency),
so the window ends about +9.6 s; the latest observed rescue is +7.7 s (s50j S1Q10F, DS §4.1) and
br1's own positive came at +3.0 s. A rescue that misses the window takes today's Live-only path:
late, but answered. No new constant is introduced. `nextTimerAt` gains two candidates for a
declined turn: `max(declined.at, lastFinalAt) + continuationMs`, and `lastSpeechAt +
wordlessGraceMs` when a stop came after the verdict, the same pair the dispatched case carries
(`interviewerTurn.ts:299-304`); the earlier gate and settle candidates stay, so a re-classify is
asked at the first quiet after a rejoin.

**Interactions**, each with the rule it meets:

| rule | interaction with a declined or revived turn |
|---|---|
| R20 (`forTurn`) | unchanged: a verdict for any turn but the open one is ignored. Extended: the classify decision's `finals` count travels back with the verdict; a verdict for the right turn but a different finals count is ignored as `stale-finals`. A verdict for a turn that has already dispatched is ignored as `dispatched` (today it closes the answered turn early, `interviewerTurn.ts:227-230`, and costs the continuation window; the answer is already out, so nothing else changes) |
| R15 (`reopenIfStale`) | extended to declined turns with the same clock: text arriving `continuationMs` past the later of the decline, the last final and the last worded stop starts a new turn silently. In practice the expiry timer closes the turn first (`nextTimerAt` carries the expiry); this is the same fallback the dispatched case has |
| R14 (fail-safe) | a declined turn has no detection, so no fail-safe, like any undetected turn today. A revive sets `detectedAt`, so the fail-safe runs from the revive, the last final and the last VAD transition, unchanged rule |
| wordless grace | a stop that no words followed within `wordlessGraceMs` does not extend the declined window (`effectiveStopAt`), as it does not extend a dispatched turn's window (the 2026-09-13 loopback-energy fix) |
| supersede | a revived turn dispatches and then behaves as any dispatched turn: a final inside the window supersedes; R21 in main.ts is untouched |
| speaking | the expiry does not fire while `speaking` (mirrors line 246); a stuck VAD leaves the declined turn open until R15 replaces it, the same shape a dispatched turn has today |
| candidate | `close candidate` at any time |

**Flag off.** `notAQuestion` keeps today's path byte for byte; an `unknown` verdict is treated as
`not-a-question` there, so the flag-off machine closes an outage turn exactly as today.

### 3.4 Part 2: late echoes absorbed

**Memory.** When a dispatched turn closes (continuation expired, candidate, or R15 replacement),
the machine pushes `{ text: dispatched.text, live: [...live], dispatchedAt }` onto `remembered`,
keeping the last `REMEMBERED_TURNS`. `reset()` clears it. Declined turns are never remembered.
Live-only dispatches are remembered too (their text is Live's paraphrase; a Live re-fire of the
same claim quotes it at 1.0).

The machine does not know whether main.ts's deduper dropped a dispatch. It does not need to: a
dropped dispatch was a duplicate of an answered question, so its text was answered under another
entry, and remembering it is right.

**The test**, in `liveClaim(text, at)`, before the claim touches any turn:

```
bestRemembered = max over remembered of quoteScore(text, r.text)          (0 when empty)
openScore      = quoteScore(text, finals of the open turn joined)          (0 when no open turn, or no finals)
absorbed  iff  bestRemembered ≥ QUOTE_MIN  and  bestRemembered > openScore
```

The strict `>` is the diagnosis's "a better match to it than to the open turn's text"; "no
worded interviewer speech since that turn" is the case `openScore = 0`. Ties go to the open turn:
newer speech wins. A claim with fewer than `QUOTE_MIN_CONTENT_WORDS` content words scores 0 and
is never absorbed (a claim under 4 words never reaches the machine anyway: `main.ts:2089`).

What it does on the recorded cases (question text only):

| case | bestRemembered | openScore | result |
|---|---|---|---|
| cue smoke S1Q08 echo at 13:38:28.725, no turn open | 1.00 (`out-similarity.txt`) | 0 | absorbed; no second answer |
| br1 S1Q08 echo at 11:02:46.017 after part 1 answered S1Q08 from its finals; a wordless blip's turn is open with no finals | 0.92 | 0 | absorbed; br1 does not double |
| s50i S2Q07F: a 156 s-late S2Q07 claim while S2Q07F's finals are open | high against S2Q07 (two turns back) | low against S2Q07F's finals | absorbed; S2Q07F dispatches with an empty `live[]` |
| s50e S2Q01F's late claim (a Live-only turn the deduper dropped, `out-liveonly.txt`): 0.58 against its parent S2Q01, higher against S2Q01F's own remembered text | S2Q01F's, the best | 0 (no turn open) | absorbed as S2Q01F's own echo, same item. The test takes the best match, not any match over 0.5: a follow-up shares words with its parent. Had the claim arrived while S2Q01F's finals were still open, the open turn would have won and it would have joined, as today |
| the 18 rescues (DS §4.4): "no earlier answer matches" for every one | < 0.5 | — | not absorbed; they revive their declined turn (part 1) |

Whisper detections are not echo-tested: they carry no text into the turn, so a stale whisper
re-fire is harmless today and stays so (it marks whatever is open; §9 names the pre-existing
risk that this pre-marks a following turn).

**Scope, stated plainly.** During an STT gap, a genuinely new Live-heard question that reuses
half the content words of one of the last three answered questions, with no finals since, is
absorbed and not answered. Not observed in 20 answered Live-only turns (DS §9); pinned by crafted
fixture S-4 (§6.7) so a change to it is noticed. With the interviewer STT channel switched off
(`setSttEnabled(false)`, `main.ts:2258`) the `openScore` guard never fires; only the score and
count guards remain. Named as a residual (§9).

### 3.5 Part 3: verdict hygiene

`QuestionDetector.detectNow` today (`QuestionDetector.ts:207-213`) returns `not-a-question` when
the detector is disabled, when `startDetection` throws, and when `detect()` returned null and the
degraded heuristic (`looksLikeQuestion`, no imperative verbs) said no. It returns a tri-state
instead:

| condition | today | new |
|---|---|---|
| `!this.enabled` | `not-a-question` | `{ verdict: 'unknown', reason: 'disabled' }` |
| `startDetection` rejects | `not-a-question` (`catch`) | `{ verdict: 'unknown', reason: 'threw' }` |
| `detect()` returned null, heuristic no | `not-a-question` | `{ verdict: 'unknown', reason: 'null-result' }` |
| `detect()` returned null, heuristic yes (chip emitted) | `question` | `{ verdict: 'question' }` (unchanged: the chip also marks the turn) |
| `clear()` ran during the call (generation guard, line 309) | `not-a-question` | `{ verdict: 'unknown', reason: 'stale' }` |
| model `detected=false`, or confidence under the threshold, or a blank/short question | `not-a-question` | `{ verdict: 'not-a-question' }` |
| model `detected=true` and a chip was emitted or updated | `question` | `{ verdict: 'question' }` |

`IntelligenceManager.detectQuestionNow` passes the shape through. main.ts logs the real reason
(`turn: verdict=unknown reason=null-result …`, §3.8) and feeds `unknown` to the machine, which
declines (flag on) or closes as today (flag off). The debounce path (`triggerDetection`) ignores
the return value as it does today; its side effects are unchanged.

Whether an outage hour should answer a long, finished-reading turn with no ear at all (s50d
S2Q09) is a product decision and out of scope (§8).

### 3.6 Why parts 1 and 2 ship together

Part 1 alone answers br1 S1Q08 from its finals at +3.0 s and then again from the Live echo 62.3 s
later, past ChipDeduper's 60 s answered window: the cue re-smoke's double (DS §4.3, the replay
without the verdict). Part 2 alone leaves br1 at 61 s. The env flag switches both; the harness
alone can construct `{ revive: true, echo: false }` for the negative control (§6.5).

### 3.7 Flag and rollout

**Flag**: `NATIVELY_TURN_MEMORY`, `electron/services/turnMemory.ts`, followUpParent's shape
(`followUpParent.ts:8-13, 24-26`): unset, empty or `0` is off; `1` is on; anything else throws.
`describeTurnMemoryAtStartup` returns `turn memory: on|off`; main.ts logs it as
`[Main] turn memory: …` inside the existing try/catch that exits on a bad flag
(`main.ts:3446-3453`), so a typo refuses to start rather than flying silently.

**Recommendation: ship behind the flag, default off, then flip after a flight.** Why:
- The live behaviour on interviewer statements is unmeasured (§6.7, §9). A flag is the only
  revert that needs no rebuild during an interview week.
- Friday's validation flight must fly the code it validates. This fix is implemented after it;
  the flag-off build then changes nothing that flight measured except log lines, which the
  replay pins (§7, row R2 and the calibration rows).
- It is the project's own path: hedge built flag-off `da28f25`, flown h40c, default flipped
  `f745d7e`; earlier-questions and follow-up-parent are flag-off designs.
- The alternative, no flag, saves about 20 lines and makes the validated build and this change
  inseparable.

**Path**: implement (TDD, §6) → replay rule PASS (§7) → build flag-off; the built dist's startup
line reads `turn memory: off` → a flag-on smoke on the 20-item cue-smoke roster with its own
`PREREGISTER-turnmemory-smoke.md` (rows: every item once; 0 `nothing-heard`; every `absorb` and
`revived` line attributed to its own item; median gate unchanged) → a flag-on flight on scenario50
with its own pre-registration → default flip (unset = on, `0` = off, the hedge's shape). Each
step licenses only the next.

### 3.8 States and log lines

New machine state (flag on only): `declined: { at, verdict } | null` on the open turn;
`remembered[]` on the machine; the `hold` reason `declined`; the close reason `no-verdict`.
Removed: nothing. `notAQuestion` stays for the flag-off path.

| line | when | new? |
|---|---|---|
| `[Main] turn memory: on\|off` | startup | new |
| `[Main] turn: verdict=<question\|not-a-question\|unknown> [reason=<disabled\|null-result\|threw\|stale>] finals=N turn=ID outcome=<marked\|revived\|declined\|ignored why=<stale-turn\|stale-finals\|dispatched>>` | every classify resolution (today a "yes" leaves no line) | new |
| `[Main] dispatch: mark source=… anchor="…" verdict=… outcome=<marked\|revived\|replaced-declined> [score=0.92] question="…"` | the mark block; `outcome=` sits before `question=` so the builder's regex (`interview60.turns-fixture.mjs:56`, `[^\n]*?` between them) still parses it | extended |
| `[Main] dispatch: absorb source=live anchor="…" verdict=<reconcile verdict> echoOf="<80 chars>" score=1.00 ageMs=72740 question="…"` | an absorbed echo, in the mark block, before any state changes | new |
| `[Main] turn: close reason=<not-a-question\|no-verdict> cause=no-quote score=0.12` | a declined turn replaced by a non-quoting positive; logged from the mark path because the machine closes it inside `detected()`/`liveClaim()`, not in `tick()` | new |
| `[Main] turn: close reason=not-a-question` | now at the window's end, not at the verdict | existing, timing changed |
| `[Main] turn: close reason=no-verdict` | the window expired after an `unknown` verdict | new reason |

`interview60.metrics.mjs` reads `Live question` and `pinned question` lines only (lines 64, 102);
none of the above changes a flight number. An `absorb` line should be counted as informational
alongside `supersede` (§3.8 of the whole-turn design) in a follow-up to metrics, not required
here.

## 4. Interfaces

Every changed or added signature, with its callers. Callers not listed keep their meaning.

### 4.1 `electron/services/interviewerTurn.ts`

```ts
export type ClassifyVerdict = 'question' | 'not-a-question' | 'unknown';          // was the two-valued union

export type TurnDecision =
    | { kind: 'idle' }
    | { kind: 'hold'; reason: 'speaking' | 'gate' | 'settle' | 'unfinished' | 'undetected' | 'declined' }   // + declined
    | { kind: 'classify'; text: string; finals: number; turn: number }                                      // unchanged
    | { kind: 'dispatch'; …unchanged }
    | { kind: 'supersede'; …unchanged }
    | { kind: 'close'; reason: 'candidate' | 'continuation-expired' | 'not-a-question' | 'no-verdict' | 'nothing-heard' };  // + no-verdict

export type DetectedOutcome =
    | { kind: 'marked' }
    | { kind: 'revived'; score: number; finals: number }
    | { kind: 'declined'; verdict: 'not-a-question' | 'unknown'; until: number }
    | { kind: 'ignored'; why: 'stale-turn' | 'stale-finals' | 'dispatched' }
    | { kind: 'replaced-declined'; closed: 'not-a-question' | 'no-verdict'; score: number };

export type ClaimOutcome =
    | { kind: 'joined' }
    | { kind: 'absorbed'; of: string; score: number; ageMs: number }
    | { kind: 'replaced-declined'; closed: 'not-a-question' | 'no-verdict'; score: number };

export const REMEMBERED_TURNS = 3;   // provenance in §3.2

export interface InterviewerTurn {
    speech(active: boolean, at: number): void;                                   // unchanged
    final(text: string, at: number): void;                                       // unchanged signature; rejoins a declined turn
    liveClaim(text: string, at: number): ClaimOutcome;                           // was void
    detected(source: 'live' | 'whisper', at: number, verdict?: ClassifyVerdict, forTurn?: number,
             opts?: { finals?: number; text?: string }): DetectedOutcome;       // was void; + opts
    candidateSpoke(at: number): void;                                            // unchanged
    tick(now: number): TurnDecision;                                             // unchanged signature
    nextTimerAt(now: number): number | null;                                     // unchanged signature; + the declined expiry and re-classify candidates
    reset(): void;                                                               // also clears remembered
    snapshot(): { open; finals; live; detected; dispatched; speaking; id; declined: 'not-a-question' | 'unknown' | null; remembered: number };  // + 2 fields
}

export function createInterviewerTurn(
    c: TurnConstants = DEFAULT_TURN_CONSTANTS,
    finished: (text: string) => boolean = readsFinished,
    memory: TurnMemoryOptions = TURN_MEMORY_OFF,            // new; default = today's machine
    quote: QuoteScore = quoteScore,                          // new; §3.2
): InterviewerTurn
```

`opts.finals` with `forTurn`: the classify decision's `finals` count, for the `stale-finals` check.
`opts.text`: the detection's own text, for the quote test; required only when a declined turn is
open (§5, E5). Callers: `main.ts:997` (adds `{ finals: d.finals }`), `main.ts:2099-2100` (adds
`{ text }` and reads both outcomes), `interviewerTurn.replay.test.ts:31, 89-90` (constructs with
an explicit `memory` per mode and feeds verdicts), `interviewerTurn.test.ts` (unchanged calls keep
today's behaviour because `memory` defaults to off).

### 4.2 `electron/services/turnQuote.ts` (new) and `turnMemory.ts` (new)

```ts
// turnQuote.ts
export const QUOTE_MIN = 0.5;                // = questionReconcile MATCH
export const QUOTE_MIN_CONTENT_WORDS = 4;    // = ChipDeduper TAIL_MIN_CONTENT_WORDS
export type QuoteScore = (evidence: string, spoken: string) => number;   // in [0, 1]
export function quoteScore(evidence: string, spoken: string): number;    // < 4 content words → 0; else overlap(evidence, spoken)

// turnMemory.ts
export const TURN_MEMORY_ENV = 'NATIVELY_TURN_MEMORY';
export interface TurnMemoryOptions { revive: boolean; echo: boolean }
export const TURN_MEMORY_OFF: TurnMemoryOptions;             // { revive: false, echo: false }
export function turnMemoryFromEnv(env?: NodeJS.ProcessEnv): TurnMemoryOptions;   // off | { revive: true, echo: true } | throws
export function describeTurnMemoryAtStartup(env?: NodeJS.ProcessEnv): string;   // 'turn memory: on' | 'turn memory: off'; throws on junk
```

`{ revive: true, echo: false }` is constructible only in code (the harness's control); no env
value produces it.

### 4.3 `electron/services/QuestionDetector.ts`, `electron/IntelligenceManager.ts`

```ts
export type UnknownReason = 'disabled' | 'null-result' | 'threw' | 'stale';
export type DetectNowResult = { verdict: 'question' | 'not-a-question' } | { verdict: 'unknown'; reason: UnknownReason };
async detectNow(text: string): Promise<DetectNowResult>;                    // was Promise<'question' | 'not-a-question'>
private async runDetection(override?: string): Promise<'question' | 'not-a-question' | 'unknown'>;   // was Promise<boolean>; 'unknown' only from the null/stale paths
detectQuestionNow(text: string): Promise<DetectNowResult>;                  // IntelligenceManager.ts:210, pass-through
```

Callers: `main.ts:990` only. `startDetection`'s `.finally` and `triggerDetection` ignore the value.

### 4.4 `electron/main.ts`, what changes and where

| site | today | new |
|---|---|---|
| construction, line 942 | `createInterviewerTurn(turnConstantsFromEnv())` | `createInterviewerTurn(turnConstantsFromEnv(), readsFinished, turnMemoryFromEnv())` |
| startup, lines 3446-3453 | logs hedge and follow-up-parent | also `console.log(\`[Main] ${describeTurnMemoryAtStartup()}\`)` inside the same try |
| classify case, lines 988-1000 | `this.turn.detected('whisper', now, v, d.turn)` | `const o = this.turn.detected('whisper', now, r.verdict, d.turn, { finals: d.finals })`, then the `turn: verdict=` line with the real reason and `outcome`, then `turnTick()` |
| the mark block, lines 2097-2109 (the Live path before the mark) | `liveClaim(text)`; `detected(source)`; sync; pick; mark line; tick | `text = source === 'live' ? (d.liveText ?? d.question) : d.question`. Live: `const c = liveClaim(text, now)`; `absorbed` → log `dispatch: absorb …` and **return** (no `detected`, no `pickTurnDetection`, no `turnTick`: the machine did not change); `replaced-declined` → log the close line, continue. Then `const o = detected(source, now, undefined, undefined, { text })`; `replaced-declined` → log the close line; sync; pick; mark line with `outcome=` (and `score=` on a revive); tick |
| close case, lines 1034-1039 | logs the reason, resets per-turn state | unchanged code; the new reason `no-verdict` flows through |
| R21 route, lines 1016-1019 | routes a supersede with no admitted head as fresh | unchanged. After part 2 the br1 S2Q01 shape no longer reaches it; its original purpose (Task 8 review I2) stands |
| `syncTurnIdentity`, lines 1061-1067 | resets per-turn state when the machine's id changes | unchanged; it already covers the silent replacement a `replaced-declined` outcome performs (R26) |
| `turnDetectionOr`, lines 1049-1053 | falls back to a verbal whisper detection when the classify path proved the question | unchanged; a revive by a classify verdict takes this fallback, a revive by a chip or a Live claim takes that detection's intent |

The absorbed echo is logged in the mark block only, as `dispatch: absorb`, before any state
changes; it never reaches `chipDeduper.admit`, `liveHold` or `fragmentHold` (all of which sit
after the mark block's `return`, lines 2110-2137, and never engage in Auto).

### 4.5 Harness: `interview60.turns-fixture.mjs` and `interviewerTurn.replay.test.ts`

Fixture shape, added fields (existing fields unchanged):

```ts
interface Fixture {
    …existing…;
    offset: { ms: number; n: number; p10: number; p90: number; source: 'measured' | 'per-item' | 'legacy-1150' };
    items: (…existing & { offsetMs?: number; offsetSource?: 'own' | 'nearest' })[];   // per-item only when offset.source === 'per-item'
    classifications: { askedAt: number; finals: number; verdict: 'question' | 'not-a-question'; raw: 'model' | 'null' | 'threw' | 'no-call'; latencyMs: number }[];
    detectorCalls: { issuedAt: number; returnedAt: number; verdict: 'question' | 'not-a-question' | 'null' }[];   // every [QD-timing] pair, for verdict substitution (§6.1)
    turnLog: boolean;   // true when the log has any `turn:` line (a whole-turn app); false for s50a/after9
}
```

Replay entry points:

```ts
replay(f: Fixture, mode: { memory: TurnMemoryOptions; verdicts: 'off' | 'recorded' | 'recorded+detector' | 'recorded+unknown' }): { decisions; drops; absorbed; substituted; unmatched }
score(f, decisions)   // budget uses the first POSITIVE evidence (first mark, or first positive verdict delivery), §6.1
```

## 5. Error handling: fail loudly at the boundary, never recover silently

| id | case | behaviour |
|---|---|---|
| E1 | a verdict for a closed or replaced turn | refused as today (R20): `detected` returns `ignored why=stale-turn`; main.ts logs it on the verdict line. Neither marks nor opens a turn |
| E2 | a verdict for the open turn with a finals count other than the turn's | `ignored why=stale-finals`; the re-armed classify decides. Logged |
| E3 | a verdict for a turn that already dispatched (flag on) | `ignored why=dispatched`; the continuation window survives. Logged |
| E4 | a revive on a declined turn with no finals | impossible by construction (a classify is asked only on text; a Live-only turn is `detected` by its claim and never classified). One assertion throws `Error('declined turn has no finals')` rather than a fallback |
| E5 | a positive with no `opts.text` while a declined turn is open | `detected` throws `Error('a detection on a declined turn needs its text')`. main.ts always passes it; the unit test pins the throw. A throw here is a programming error, not a runtime state |
| E6 | a junk `NATIVELY_TURN_MEMORY` | the app refuses to start (`main.ts:3450-3452`), as for the other flags |
| E7 | `detectNow` cannot classify (disabled, null, throw, stale) | `unknown` with its reason; never "no". The machine declines (flag on) or closes (flag off); the log names the reason |
| E8 | the replay meets a `classify` with no recorded verdict, in calibration mode | the test fails naming the time and finals count. An unmatched classify on the unmodified machine means the fixture is not the run |
| E9 | the replay meets a `classify` with no recorded verdict, in post-fix mode | never silent: `recorded+detector` substitutes the run's own detector call issued within 4 s after the ask with no fixture final in between (DS §4.2's pairing rule), else `unknown`; `recorded+unknown` substitutes `unknown`; every substitution is counted, printed with its item, and reported in the rule (§7, R14) |
| E10 | the builder finds a `turn: classify` line with no resolution (no `turn: verdict=` line, no `not-a-question` close within 2 s of its `detect returned`, no dispatch, and no candidate close within 10 s) | the builder refuses, naming the line |
| E11 | the builder finds a classify with no `detect issued` of its own within 3 s (§6.1 pairing rule) | the classify made no call (`raw: 'no-call'`: the detector disabled, or the meeting ended); its verdict is read from the close as for the others; a call that waited on an in-flight detection records `waitedMs`; both are printed so an unexpected count is seen |
| E12 | the builder's measured offset has `p90 − p10 > 100 ms` | refuses unless `--per-item-offsets`; then every item takes its own measured lag, an item without one takes its nearest neighbour's and is marked `nearest`; refuses when fewer than half the spoken items have their own |
| E13 | a legacy fixture (`turnLog: false`) in a verdict-feeding mode | verdict feeding is skipped and printed as `no verdict feed (legacy log)`; the rows are today's |
| E14 | a crafted fixture whose expected outcomes are not met | that fixture's own `it` fails; crafted fixtures never feed the aggregate rows |

## 6. Test plan, failing first

Order: harness changes and fixtures first (they must reproduce today's logs on the unmodified
machine), then the unit tests, each watched red, then the fix, then the replay rule (§7).

### 6.1 Harness changes (`interview60.turns-fixture.mjs`, `interviewerTurn.replay.test.ts`)

1. **Verdict feeding.** The builder records `classifications[]` from each `turn: classify` line,
   its own call (the first `[QD-timing] detect issued` within 3 s after it whose previous line is
   not a `debounce elapsed` line: `detectNow` first waits out an in-flight debounce call,
   `QuestionDetector.ts:211`, so the classify's call is not always adjacent) and that call's
   `detect returned`, and its
   resolution: for pre-fix logs a `close reason=not-a-question` within 2 s after the result means
   `not-a-question`, otherwise `question` (a "yes" left no line of its own until now); for post-fix
   logs the `turn: verdict=` line. `raw` keeps whether the result was a model verdict, `null`, a
   throw or no call, so a post-fix replay can feed `unknown` for outages the app once saw as "no".
   The replay answers each machine `classify` with the recorded classify nearest in time within
   ±2.5 s at the same finals count, delivered at `askedAt + latencyMs`, scoped with `forTurn` and
   `{ finals }` as main.ts does. Unmatched: E8/E9. Sizing of ±2.5 s: the calibration deltas are
   ≤ 31 ms (`out-replay.txt`); 2.5 s only keeps a match from jumping to the next item's classify
   (items are ≥ 60 s apart).
2. **Detections for whole-turn logs** are the `dispatch: mark` lines only, with the full
   `question=` text for both sources (the `anchor=` field is cut at 80 chars,
   `main.ts:2106`). Today's builder feeds every dispatch line's anchor (line 70), which on a
   whole-turn log re-feeds the machine's own outputs as detections. `absorb` lines are parsed
   (for calibrating post-fix logs) and never fed.
3. **The R21 route.** A `supersede` whose head the deduper dropped (`answeredId === undefined`)
   is admitted through `dedup.admit` as a fresh dispatch and scored as one. Without this, br1's
   S2Q01 row fails for a harness reason (DS §8).
4. **Offsets.** `--offset-ms` is replaced by the measured rule of `DS/vadlag.mjs`: median over
   the run's `turn: gate=G finals=N` lines (N > 0, G < 4000: `lastVoiceOff = t − G`) and its
   `turn: classify` lines more than 450 ms after their last final (`lastVoiceOff = t − 1200`),
   each minus the WAV voice-off of the item playing. Recorded with n, p10, p90. Refusal on a
   bimodal spread (E12): the cap of 100 ms is about three times the largest unimodal spread
   measured (37 ms, br1 p10–p90 `out-vadlag.txt`) and far under s50c's two modes (600 and
   1306 ms). Legacy fixtures keep `1150` and say so.
5. **Modes.** `replay(f, mode)` takes the machine's `memory` and the verdict policy (§4.5). The
   test file runs, per fixture: calibration (memory off, recorded verdicts), fix (on, recorded +
   detector substitution), fix (on, recorded + unknown substitution), and for br1 the control
   (`{ revive: true, echo: false }`).
6. **Budget.** `score()` line 109 uses `firstDetection`; it becomes the first positive evidence
   in the item's window: the earliest of the first mark and the first `question` verdict
   delivery. For s50a/after9 (no verdicts) this is identical to today.
7. **A builder test** (`interview60.turns-fixture.test.ts`, new) on synthetic log snippets:
   a null-result classify with a close → `{ verdict: 'not-a-question', raw: 'null' }`; an
   unresolved classify → throws (E10); a bimodal lag → throws unless per-item (E12); marks-only
   detections on a whole-turn log; `absorb` parsed, not fed.

### 6.2 Fixtures (non-holdout only) and calibration

| fixture | run | offset (ms) | why it is here |
|---|---|---|---|
| `2026-09-30T11-45-30-br1-turns.json` | MAIN `interview60.runs/…-br1` | 1419 (n=46, p10 1402, p90 1439) | the 61 s late answer; the R21 S2Q01 contamination; 11 classifies |
| `2026-09-30T13-46-52-cuesmoke-turns.json` | whole-turn worktree's run | 776 (n=24, 757–789) | the double; 5 classifies |
| `…-s50b-turns.json` | MAIN | 625 | S2Q06 false close, Live rescue +6.4 s |
| `…-s50c-turns.json` | MAIN | per-item (600 / 1306) | S2Q05: detector "yes" 1.1 s after the close |
| `…-s50d-turns.json` | MAIN | 686 | the outage hour: 10 `unknown` closes, 9 rescues, S2Q09 miss |
| `…-s50f-turns.json` | MAIN | 628 | S2Q05 false close; 4 deduper-dropped echoes |
| `…-s50i-turns.json` | MAIN | 837 | S2Q09 headless (verdict on 3 of 5 finals); S2Q07F contamination |
| `…-s50j-turns.json` | MAIN | 1003 | S1Q07F, S1Q08F (final in flight), S1Q10F headless; 4 dropped echoes |

Offsets: DS §8 and `out-vadlag.txt`; each is re-measured by the committed builder at build time
and the fixture records the measurement, not this table. About 115 KB each (DS `fx-*.json`),
about 1 MB in all, the precedent being the two committed fixtures.

**Calibration, before any fix**, on the unmodified machine with recorded verdicts (mode
"calibration"), per fixture:
- every recorded classify is matched (0 unmatched, E8);
- every recorded `not-a-question` close is reproduced on the same item within 100 ms;
- every item's first dispatch has the log's source (`fromLive`) and lands within 100 ms of the
  log's `turn: gate=` line; the item outcomes of `out-replay.txt` (once/never/double, `finals`,
  coverage) match.
The tolerance of 100 ms is about three times the largest delta already measured (31 ms, cue
smoke, `out-replay.txt`) and equals the budget row's own slack. DS §4.3 has shown this for all
eight fixtures on the unmodified code; the committed test repeats it so the fixtures are
admissible evidence, not copies of a scratchpad result.

### 6.3 Unit tests, each watched red first

`interviewerTurn.test.ts`, new describe blocks (flag-on machine, `memory: { revive: true, echo: true }`, stub `quote` where noted):

| id | test | red today because |
|---|---|---|
| U1 | a "no" on two finals, then a whisper detection quoting them 1.4 s later with no new speech → `dispatch` with `finals: 2`, `fromLive: false`, at that tick | today the "no" closes the turn; the detection opens an empty turn; no dispatch |
| U2 | a final after a "no" rejoins (`snapshot().finals` grows, `declined` set) and re-arms: the next quiet tick is `classify` with the grown count | today the turn is gone; the final opens a new turn holding one final |
| U3 | a declined turn with nothing after it: draining the machine's own timers from the verdict (the file's `drain` helper) yields exactly one decision, `close not-a-question` at `verdict + continuationMs` | today it closes at the verdict |
| U4 | an `unknown` verdict declines; the expiry is `close no-verdict` | today `unknown` does not exist |
| U5 | a Live claim quoting the answered turn 76 s after its dispatch → `liveClaim` returns `absorbed` with `score ≥ 0.5`; `snapshot().open` is false; no dispatch follows | today a Live-only turn dispatches 3.7 s later |
| U6 | a non-quoting positive on a declined turn → `replaced-declined`; the id changes; the fresh turn is marked; nothing dispatches from the statement's finals | today the "no" turn is already closed, so the outcome value does not exist |
| U7 | a verdict for the open turn with a stale finals count → `ignored why=stale-finals`; state unchanged | today it applies |
| U8 | a verdict on a dispatched turn → `ignored why=dispatched`; the continuation close still comes 8 s after the dispatch | today it closes the turn at once |
| U9 | a classify verdict `question` with `forTurn` and the current finals count revives a declined turn without `opts.text` | today: no declined state |
| U10 | a positive without `opts.text` on a declined turn throws (E5); a positive without text on a non-declined turn marks as today | — |
| U11 | a declined turn hears `speech(true)`: the expiry does not fire while speaking; after `speech(false)` with no words, the window ends 8 s after the verdict, not after the stop (wordless grace) | — |
| U12 | four answered turns, then an echo of the first → not absorbed (opens a Live-only turn): pins `REMEMBERED_TURNS = 3` | — |
| U13 | an echo of the last answered turn arriving while a new turn holds finals that it quotes less well → absorbed; the new turn's `live` stays empty (the s50i S2Q07F shape) | today it marks the new turn and joins its `live[]` |
| U14 | ties go to the open turn: equal scores → `joined`, not absorbed | — |
| U15 | flag-off machine: `unknown` closes as `not-a-question` at once; every existing test in the file passes unchanged (they construct with the default `memory`) | these are pins, green from the start; rule 8 is met by running them once against the flag-on machine and watching them fail |

`turnQuote.test.ts`: the floor (3 content words → 0); direction (evidence a subset of spoken →
1.0; spoken a subset of evidence → lower); the two S1Q08 pairs of `out-similarity.txt` score 0.92
and 1.00 (question text only). `turnMemory.test.ts`: unset/empty/`0` off, `1` on, junk throws;
the startup line. `QuestionDetector.detectNow.test.ts`: a null client result with the heuristic
saying no → `unknown/null-result`; null with the heuristic saying yes → `question`; a rejecting
client → `unknown/threw`; disabled → `unknown/disabled`; `clear()` during the call →
`unknown/stale`; a model "no" → `not-a-question`.

### 6.4 Replay assertions (today → after the fix)

The numbers are DS §4.3's replay on today's machine (`out-replay.txt`).

| test | today | after |
|---|---|---|
| br1 S1Q08: exactly one dispatch, `fromLive=false`, `finals=5`, latency ≤ budget; no `nothing-heard` in its window | 65 350 ms, from Live, `nothing-heard` present → **fails** the budget row | ≈ 3 000 ms from the finals; budget = mark 47.374 + 100 ms |
| cue smoke S1Q08: exactly once; one `absorb` with score ≥ 0.5 | 2 → **fails** the existing "once" row | 1; score 1.00 |
| s50b S2Q06, s50c S2Q05, s50f S2Q05, s50j S1Q07F, s50j S1Q08F, and s50d S1Q04 S1Q06 S1Q08 S1Q09 S2Q04 S2Q05 S2Q05F S2Q06 S2Q08: exactly once, `fromLive=false`, `finals ≥` the classify's count, latency ≤ budget | +5.5 to +7.5 s from Live, `finals=0` → **fail** the budget row | revived at the first quoting positive (the detector's call for s50c/s50j S1Q07F/S1Q08F; Live's claim for the rest) |
| s50i S2Q09, s50j S1Q10F: coverage ≥ 0.8 | 0.46, 0.45 → **fail** the long-whole row | whole, from all finals |
| s50d S2Q09 | never | still never: `close no-verdict`, asserted as 0 dispatches so a change is seen |
| br1 S2Q01: one dispatch from its own finals, no supersede through R21, every `live` text (if any) quotes its finals | R21 route, `live` carries S1Q10F's text | normal dispatch, `live=[]` |
| s50i S2Q07F: every `live` text quotes its finals | carries S2Q07 | `live=[]` |
| committed s50a / after9 | 40/40 once, 76/76 spoken once, 0 early, 15/15 and 6/6 long whole, 0 supersedes, median 1200 ms | unchanged, in every mode |

### 6.5 Negative control

br1 in mode `{ revive: true, echo: false }` with recorded verdicts: S1Q08 must dispatch **twice**
(finals at +3.0 s, Live echo 62.3 s later). This is DS §4.3's "without the verdict" shape,
produced now by the real revive. If it does not double, the harness is not showing the echo and
the whole rule is INCONCLUSIVE (§7).

Second control, after the fix: restore the clock-only echo rule (echo off, deduper only) and
watch the cue smoke row turn red again; disable the revive and watch the br1 row turn red again
(DS §8 calibration).

### 6.6 Unchanged elsewhere

For every item on every fixture not named in §6.4: dispatch count, first-dispatch source and
coverage equal to the same fixture's calibration run, and first-dispatch time within 100 ms of
it. Both runs happen in the same test file, so the comparison is against the machine as it was,
not against a number written down.

### 6.7 The unmeasured risk: interviewer statements. Crafted fixtures

No non-holdout recording contains a statement turn (DS §1, §9). Crafted fixtures can prove the
machine's branches on a statement; they cannot prove what the detector or Live would say about
one. They live in `electron/test/golden/fixtures/crafted/`, carry `crafted: true` and a
provenance note, use synthetic times, and never feed the aggregate rows. Verdict latency in them
is 400 ms (`DS/replay.mjs`'s default; br1's classify took 391 ms). Q0 below is "How would you
shard a Postgres table by tenant?" (a question the unit tests already use); the statement is
"Great, thanks for walking me through that." (the existing `not-a-question` unit test's text,
7 words, reads finished).

| id | shape | asserts | proves | cannot prove |
|---|---|---|---|---|
| S-1 | Q0 answered (voice 0–6.0 s, final 6.7 s, mark 7.2 s, dispatch 7.2 s, close 15.2 s). Statement: voice 20.0–22.5 s, final 23.2 s, classify 23.7 s, crafted verdict `not-a-question` at 24.1 s. A stale whisper mark at 25.5 s carrying Q0's text (what a detector re-fire quoting its 30 s context would carry). Variant S-1L: the same at 25.5 s as a Live claim | no dispatch in [20 s, 60 s); S-1: `close not-a-question cause=no-quote` at 25.5 s, then `close nothing-heard` at 33.5 s; S-1L: one `absorb` of Q0 (score 1.0) at 25.5 s, then the plain expiry `close not-a-question` at 32.1 s; Q0 answered exactly once; the statement's finals never dispatched | a non-quoting positive cannot revive a declined turn; an echo cannot either; quote score of Q0's words against the statement is 0 | that the real detector says "no" on this statement, that its re-fire would carry Q0's text, or that Live is silent on statements |
| S-2 | the statement, then silence | draining the timers from 24.1 s yields exactly `close not-a-question` at 32.1 s (= 24.1 + 8.0); no dispatch; `remembered` unchanged | the expiry clock; a declined turn leaves nothing behind | the verdict |
| S-3 | the statement (declined at 24.1 s), then a question: voice 27.0–31.0 s, final 31.7 s "What is the difference between a process and a thread?", whisper mark at 32.0 s with that text (before the gate, as the cue smoke's mark was) | revived at 32.0 s (score 1.0: its 5 content words are all in the joined finals), then one dispatch at 32.2 s (= voice-off 31.0 + gate 1.2; settled 31.7 + 0.4), `finals=2`, text = statement + question, coverage of the question 1.0 | rejoin, re-arm, revive by a quoting positive; **the pinned question grows** (the whole-turn design's intent, DS §9 risk 2), visible in the asserted text | whether the statement prefix changes the answer (quality is unmeasured) |
| S-3b | as S-3 with no mark; the re-classify at 32.2 s (`finals=2`) gets a crafted `question` at 32.6 s | one dispatch at 32.6 s from both finals | revive by verdict with the current finals count | the real verdict on the grown text |
| S-4 | Q0 answered; the STT then silent (no finals, no VAD); a Live claim at 40 s for a new question reusing Q0's words: "Would you shard that Postgres table by tenant or by region?" (5 of 7 content words in Q0) | `absorbed`, score 0.71; the new question is not answered | the rule's boundary: the accepted false absorption (DS §9) is pinned, so a later change to it is noticed | how often this happens live (0 of 20 observed) |
| S-5 | Q0 answered at 7.2 s, Q1 "What is a DAG?" answered at 60 s; Q2's finals open at 120 s ("How would you index those tables, and what changes if history is kept?"); a Live claim at 121 s with Q0's text | `absorbed` (two turns back: 1.0 against Q0; Q2's finals score 0.2 against it, only "would" in common); Q2 dispatches with `live=[]` | `REMEMBERED_TURNS ≥ 2` and the "better than the open turn" guard; the contamination fix | the real lag distribution |

**A live measurement needs a new recording** with statements and small talk mixed among
questions ("Great, thanks for walking me through that.", "How's your day going?", a two-sentence
remark before a question). That recording is also the first step of the concern the user parked,
"the app would answer small-talk questions such as 'How's your day going?'": the same audio
serves both. This spec does not design the small-talk fix; it names the shared need only. Until
that recording exists, the statement behaviour of the flag-on machine is unmeasured and the flag
stays off.

## 7. Pre-registered replay rule

Written before the fix exists. Never renegotiated after the data. A PASS licenses the flag-off
build and the pre-registration of the flag-on smoke; it licenses nothing else. Thresholds are the
provenance-bound constants of §3.2 and the tolerances of §6; none moves in response to a result.

| row | what | source | threshold / provenance | reads |
|---|---|---|---|---|
| R1 | calibration: each of the 8 fixtures reproduces its log on the unmodified machine (§6.2) | `interviewerTurn.replay.test.ts`, mode calibration | 0 unmatched classifies; closes and first dispatches within 100 ms (3× the largest observed delta) | FAIL → the fixture is not admissible; fix the builder, not the machine; re-run R1 only |
| R2 | s50a and after9 unchanged in every mode | same file | 40/40, 76/76 spoken, 0 early, 15/15 and 6/6 long whole, 0 supersedes, median 1200 ms (the file's own rows, DS §4.3) | FAIL → the fix regresses today's questions |
| R3 | br1 S1Q08 | §6.4 row 1 | once, `fromLive=false`, `finals=5`, ≤ budget, no `nothing-heard` | FAIL |
| R4 | cue smoke S1Q08 | §6.4 row 2 | once; one `absorb`, score ≥ 0.5 | FAIL |
| R5 | negative control: br1, revive on, echo off | §6.5 | S1Q08 dispatched exactly twice | not twice → **INCONCLUSIVE** (the harness does not show the echo) |
| R6 | the 14 rescued false-close items | §6.4 row 3 | each once, `fromLive=false`, `finals ≥` the classify's count, ≤ budget | FAIL |
| R7 | s50i S2Q09, s50j S1Q10F | §6.4 row 4 | coverage ≥ 0.8 (the long-whole row's floor) | FAIL |
| R8 | s50d S2Q09 | §6.4 row 5 | 0 dispatches, `close no-verdict` | a dispatch → FAIL (an ear that does not exist answered) |
| R9 | unchanged elsewhere | §6.6 | every other item: same count, same source, same coverage, time within 100 ms | FAIL |
| R10 | no double anywhere | the "once" row over all 8 fixtures | 0 items with > 1 dispatch | FAIL |
| R11 | every absorbed claim is same-item | `absorbed[]` with `livelag.mjs`'s attribution (the item whose script covers ≥ 0.5 of the claim's content words, among items started before it) | 0 claims attributed to an item other than the remembered turn's; an unattributable claim is printed with its question text and read by hand | a cross-item absorption → FAIL (the rule is too loose) |
| R12 | br1 S2Q01 and s50i S2Q07F carry no stale Live text | §6.4 rows 6–7 | every `live` text quotes the finals (score ≥ 0.5) or `live=[]` | FAIL |
| R13 | unit tests | §6.3 | U1–U14 red on today's code, green after; U15 pins green and red against the flag-on machine; turnQuote, turnMemory, detectNow tests green | FAIL |
| R14 | substitution independence | §6.1 mode 5 | R3, R6, R7 give the same reading under `recorded+detector` and `recorded+unknown`; the substitution counts are printed per fixture | a row that differs between policies → **INCONCLUSIVE** for that row |
| R15 | crafted fixtures | §6.7 | S-1, S-1L, S-2, S-3, S-3b, S-4, S-5 each as asserted | FAIL |

Decision: every row PASS → **PASS**; any FAIL → **FAIL**: no build; the design is re-examined and
any change gets a new spec revision and a new pre-registration; R5 or R14 INCONCLUSIVE and
nothing FAIL → **INCONCLUSIVE**: fix the harness, re-run the same rule. Expected absorptions
(reported, not gated): the 15 late claims of `out-liveonly.txt` that fall in these fixtures, 14
deduper drops and the cue double: s50d S1Q03F; s50f S1Q01F, S1Q09F, S1Q10, S2Q01F; s50j S1Q06F,
S2Q07, S2Q07F, S2Q08; br1 S1Q10F, S2Q01 (11:11:54), S2Q01F, S2Q02F, S2Q10; cue S1Q08. br1's
S2Q01 claim scored 0.57 against an answered text that carried S1Q10F's Live words; against
S2Q01's clean finals it may fall under 0.5 and be dropped by the deduper instead, which R10
reads the same way.

## 8. Out of scope, named

- **The small-talk detector prompt.** Not designed here; the shared recording need is named in
  §6.7.
- **The h40b/h40c R05 miss.** Live's 3-word claim "Redis or Memcached?" is dropped by
  `isFragment` (`main.ts:2089`, `questionShape.ts:18-21`) before the mark block. A pre-existing
  rule with its own provenance (R36 round 3). Follow-up: a whole question under 4 words needs its
  own evidence and spec.
- **Answering in a detector outage with no ear** (s50d S2Q09): a product decision. Part 3 keeps
  the text and names the outage; it does not answer.
- **The earlier-questions feature** (`NATIVELY_EARLIER_QUESTIONS`, design
  `passes/2026-09-28-followup-question-context-design.md`, not built). Interaction: it reads the
  pinned questions the app answered (`SessionTracker.recordAnsweredQuestion` in that design),
  never the machine. This change alters which text is pinned for a revived turn (the finals, not
  Live's paraphrase) and removes the echo's second pin, so that feature would see one clean parent
  where today it would see a paraphrase or two entries. Neither feature reads the other's state.
  The same holds for `NATIVELY_FOLLOWUP_PARENT` (`followUpParent.ts`, off), which reads
  `assistantResponseHistory`.
- **Live lag itself** (C7): external; this design makes the dispatcher tolerate it.

## 9. What this change cannot show; residual risks

| risk | why it remains | bound |
|---|---|---|
| Statements and small talk | no non-holdout recording has one; the crafted verdicts are assumptions | flag off until the new recording is flown (§6.7) |
| A stale whisper positive pre-marks the next turn | a non-quoting positive opens an empty marked turn that absorbs the next finals as a detected turn (today's behaviour) | pre-existing; named, not changed |
| False absorption | a new Live-heard question reusing half the content words of a remembered one, with no finals since (S-4); worse with the STT channel off | 0 of 20 observed; pinned by S-4; count guard 3 |
| A repeated question the STT missed | "let me repeat that" with no finals → absorbed; today it would be answered again after 60 s | the previous answer is on screen |
| Live lag beyond three turns | count-based memory | falls back to today's Live-only path |
| Re-armed classifies | the real detector's verdict on a grown declined turn is unknown until flown; the replay substitutes (§6.1) | R14 requires policy independence |
| Model flips on identical input | unmeasurable offline (DS §10) | the design makes one sample non-terminal |
| Answer quality after a revive | the answer is generated from the finals as an on-time answer would be; not graded here | the smoke and flight grade it |
| The window margin | about 2 s between the latest observed rescue (+7.7 s) and the window's end (+9.6 s) | a late rescue takes today's path; the smoke reports every rescue's lag |
| Tokenizer gaps | "PRAUC" vs "PR AUC" are different words to `overlap`; a short claim could fall under 0.5 | shared with the reconciler; not new |
| Extra Groq calls | one more classify per grown declined turn | negligible against ~160 detector calls an hour (DS §9) |

## 10. Files

New: `electron/services/turnQuote.ts` (+ test), `electron/services/turnMemory.ts` (+ test),
`electron/services/QuestionDetector.detectNow.test.ts`,
`electron/test/golden/interview60.turns-fixture.test.ts`, 8 fixtures under
`electron/test/golden/fixtures/`, 7 crafted fixtures under `fixtures/crafted/`,
`passes/PREREGISTER-turnmemory-replay.md` (§7 verbatim, before the fix).
Changed: `electron/services/interviewerTurn.ts` (+ test), `electron/services/QuestionDetector.ts`,
`electron/IntelligenceManager.ts`, `electron/main.ts`,
`electron/services/interviewerTurn.replay.test.ts`, `electron/test/golden/interview60.turns-fixture.mjs`.
Untouched: `ChipDeduper.ts`, `questionReconcile.ts` (its `overlap` is reused), `turnDispatch.ts`,
`liveHold.ts`, `questionShape.ts`, `detectionDispatch.ts`, every prompt.

## Appendix A. The two runs under the new machine

**br1 S1Q08** (times UTC, the log's; DS §3.1)

| time | today | new (flag on) |
|---|---|---|
| 11:01:45.586 | `classify finals=5` | same |
| 11:01:45.978 | `close not-a-question`; finals dropped | `verdict=not-a-question finals=5 turn=15 outcome=declined`; window to about 11:01:53.98 |
| 11:01:47.374 | the chip opens an empty turn | `mark source=whisper … outcome=revived score≈1.0`; quiet 3.0 s, finished → `turn: gate≈2990 finals=5 live=0` → `dispatch: answer source=whisper` |
| 11:01:55.383 | `close nothing-heard` | `close continuation-expired` (8 s after the dispatch); S1Q08 remembered |
| 11:02:37.450 | a wordless blip opens a turn | same (no text; waits, as today) |
| 11:02:46.017 | Live claim → new Live-only turn → answered | `dispatch: absorb source=live … score=0.92 ageMs≈58600`; nothing else |

**Cue smoke S1Q08** (DS §3.2)

| time | today | new |
|---|---|---|
| 13:37:15.273 → 15.987 | mark, dispatch at the gate | same |
| 13:37:23.996 | `close continuation-expired` | same; S1Q08 remembered |
| 13:38:28.725 | Live claim → Live-only turn → second answer at 32.441 | `dispatch: absorb … score=1.00 ageMs≈72740`; no turn |

## Appendix B. Decisions this spec had to make beyond the diagnosis

1. **A non-quoting positive replaces the declined turn** (closes it, opens a fresh one) instead
   of being ignored. Ignoring it would be a new loss path: a Live-heard question the STT missed
   entirely, arriving while a statement is declined, would vanish. Replacing keeps today's meaning
   for every existing path; the statement case ends as today's br1 shape (an empty turn,
   `nothing-heard`), which dispatches nothing.
2. **Verdicts are scoped to (turn, finals count), both signs alike.** A positive on a prefix is
   ignored too and the re-armed classify decides. Applying positives on prefixes would save one
   Groq call on the few turns where a final lands during the call (11 of 184 verdicts, DS §5 C3)
   at the price of an asymmetric rule; R20's "the verdict applies to what it judged" is kept
   uniform.
3. **The echo memory is the last three dispatched turns by count, tested with the reconciler's
   `overlap ≥ 0.5`, strictly better than the open turn's finals.** Not a clock (the diagnosis's
   requirement), not Jaccard or containment (both missed h40c R18), and the best-match comparison is
   what keeps a follow-up that shares words with its parent (s50e S2Q01F, 0.58 against S2Q01)
   attributed to itself rather than to the parent.
4. **A verdict on a dispatched turn is ignored** (flag on) rather than closing the answered turn
   early as today; the answer is out either way and the continuation window is kept.
5. **The post-fix replay substitutes verdicts for classifies the run never asked** and reports
   the count; the rule demands the readings be policy-independent (R14). The diagnosis's "fail
   loudly on an unmatched classify" is kept for calibration, where it is the right rule; after
   the fix the machine necessarily asks classifies the run did not.
6. **One env flag, default off**, switching both parts; the part-1-only control exists only in
   code.

## Appendix C. Open questions for the user, each with a recommendation

1. Substitution policy for re-armed classifies in the replay (Appendix B.5): the run's own
   detector call on the same finals, else `unknown`, with R14's independence check. Recommend
   yes; the alternative, refusing, makes the post-fix replay impossible.
2. Should a positive verdict on stale finals apply (B.2)? Recommend no: uniform, one fewer
   branch; the cost is one Groq call on about 6 % of classifies.
3. The declined window: reuse `continuationMs` (8 s) or a new constant? Recommend reuse: no new
   number, about 2 s margin over the latest observed rescue, and a missed window still answers
   through today's path. Revisit only if the smoke shows rescues past the window.
4. `REMEMBERED_TURNS = 3`? Recommend 3 (one turn beyond the longest observed echo). A larger
   count widens the false-absorption surface for nothing observed.
5. The flag and the flip path (§3.7)? Recommend flag, default off, flip after the flag-on flight.
6. The new recording with statements and small talk (§6.7): build it after Friday's flight, on
   the interview60 build-audio path, shared with the parked small-talk concern. Recommend it is
   scheduled before the flag-on flight, so that flight measures statements too.
7. `close reason=no-verdict` as a new close reason in the log vocabulary (metrics do not read
   close lines; DS's throwaway scripts do). Recommend yes: an outage should not read as "not a
   question" in a flight log.
