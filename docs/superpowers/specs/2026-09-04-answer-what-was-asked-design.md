# Answer what was asked — design

Date: 2026-09-04 · Branch: `fix/coding-style-suffix-all-gemini` (main checkout) ·
Baseline: the unattended flight of 2026-09-04 07:09–08:09 UTC
(`electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4/`, judge 38 acceptable /
10 weak / 4 wrong of 52).

## Goal

Every hands-free answer is an answer to the question the app settled on, the chip and
the answer carry that same text, and no spoken answer runs past the budget a candidate
can say aloud. Proven by re-running the identical hour and passing the gate in §6.

Decisions taken during brainstorming:

| Question | Decision |
|---|---|
| Approach | C — fix the seam between detection and answering (not the STT engine, not the model) |
| Fragmentary text at dispatch | Hold briefly for the other ear, then answer what we have |
| Answer length | Hard ceiling of 80 spoken words, cut at a sentence end; one more sentence is allowed only when the cut would leave fewer than 40 words |
| Modes | Auto and Suggest both; chip text and answered question are one settled text |
| Evidence before code | Every parameter below was measured on the flight logs or against the production model before it was written down (§7) |
| Proof run | Same hour, same STT provider (Deepgram streaming) and Context toggle (on) as the baseline, so the symptom is reproduced before it is declared fixed |

## 1. What the log shows

All four wrong answers come from one seam: `runWhatShouldISay` (electron/IntelligenceEngine.ts)
never shows the model the question that was dispatched. With no `contextOverride` it rebuilds
the prompt from the session transcript and the model answers whatever the last transcript
line was; with a `contextOverride` (chip click) it uses the snapshot verbatim, which also
ends in the raw STT line. The `question` argument only reaches the intent classifier and
the event labels. The dispatched text was already right in three of the four cases:

| Item | Last transcript line at dispatch | Dispatched question | Answered |
|---|---|---|---|
| M26 | "Cross many model services." (Deepgram final; the head was never a final) | Live's full sentence, verdict paraphrase | the previous question's deletion topic |
| M27 | "And when would you not?" (only final; head lost) | that fragment, source whisper; Live's full sentence arrived 1.3 s later and was dropped as duplicate-answered | "when not to use event-driven" |
| M28 | "Serving." (head reached only an interim) | Live's full sentence, verdict match against the interim | a generic serving answer |
| H09 | "What do you do?" (second of two finals) | the joined two-sentence question, source whisper | a personal pitch naming the profile's employer |

Two facts constrain the design. First, the whisper detector ran degraded the whole hour
(70 Groq HTTP 403 while the VPN was on; 45 of 45 chips were the heuristic join), so its chip
texts came from `runDegradedDetection`, not the model — the fix must not depend on chip
shape. Second, the reconcile for M28 was correct: interims are in the 15 s window and the
interim carried the head. Nothing in `questionReconcile.ts` changes.

## 2. The settled question reaches the model

### 2.1 `pinSettledQuestion` (electron/llm/lastInterviewerTurn.ts)

```ts
/** Rewrite a prepared transcript so its last interviewer line is `question`. */
export function pinSettledQuestion(transcript: string, question: string): string
```

- Lines are the `[LABEL]: text` format both `formatTranscriptForLLM` and
  `SessionTracker.getFormattedContext` emit; the parser `lastInterviewerTurn` in the same
  module already knows it.
- Take the trailing run of `[INTERVIEWER]:` lines (walk back from the end until a line with
  another label). Remove from that run every line that is the same utterance as
  `question` — `sameAnchor(line, question)` from `electron/services/questionReconcile.ts`
  (containment either way, or ≥ 50 % content-word overlap either way). Lines that are not
  the same utterance stay (an earlier, unanswered question keeps its place before the new
  one).
- Append `[INTERVIEWER]: <question>` as the last line. An empty transcript becomes that
  single line.
- Worked cases from the hour: M26 "cross many model services." → absorbed (3 of 4 content
  words in the question); M28 "serving." → absorbed; H09 both lines absorbed; M27 "and
  when would you not?" absorbed; a trailing "How do you patch base images?" before an
  unrelated settled question is kept.

### 2.2 Applied in `runWhatShouldISay`

When `question` is a non-empty string (Auto dispatch, chip click, answer-now-fast, the
manual button with a typed question, the suggestion trigger):

- `contextOverride` path: `preparedTranscript = pinSettledQuestion(options.contextOverride, question)`.
- Transcript path: the interim injection is skipped (the settled text is the authority;
  an injected interim would become the last line again), then
  `preparedTranscript = pinSettledQuestion(prepareTranscriptForWhatToAnswer(turns, 12), question)`
  and `lastInterviewerTurn = question`.
- Log, full text, one line: `[IntelligenceEngine] runWhatShouldISay: pinned question "<question>"`.
- Without a question nothing changes.

`WhatToAnswerLLM` needs no change: `knowledgeQuestion = lastInterviewerTurn(cleanedTranscript)`
now yields the settled question, so the knowledge lookup asks about the right thing too.
The coding path gets the same pin (its `CONVERSATION` framing still ends with the question).

### 2.3 Chip parity

Auto: `dispatchDetection` broadcasts `live-question` with `d.question` and answers
`d.question` — with §2.2 the model now sees that text. Suggest: the chip carries
`d.question`; the click sends it back as `payload.question` and §2.2 pins it. The
dispatch log line gains a trailing ` question="<full text>"` field so the harness can
compare it with the pinned line; existing parsers match the prefix and are unaffected.

## 3. Fragment hold

### 3.1 `looksFragmentary` (electron/services/questionShape.ts)

```ts
export function looksFragmentary(text: string): boolean
```
True when any of: fewer than 4 words (the existing `isFragment`); the first word is
`and`, `so`, `but`, `or`, `then`, `because`; or the text has at most 6 words, does not end
with `?`/`？` (closing quotes and brackets allowed after it, as `isCompleteQuestionText`),
and its first word is not a question or imperative opener (`what why how when where which
who whom whose can could would should do does did is are was were will have has tell walk
describe explain give compare imagine suppose say let`).

Measured on every whisper chip and Live question text of four hours (after2, after3,
after4, liveonly2; 317 texts): 2 flagged, both real fragments ("And when would you not?",
"but the input schema is unchanged How do you debug…"), 0 whole questions. Over the 220
dispatched questions: 1 hold (M27), 0 false holds.

### 3.2 Wiring (electron/main.ts `dispatchDetection`)

- A second `createLiveHold<DetectionInput>` instance, `fragmentHold`, `holdMs = FRAGMENT_HOLD_MS`
  (2500 — see §8.1), `onResolve: held => this.dispatchDetection({ ...held, resolving: true })`.
- New gate after the Live `isFragment` drop and the unverifiable hold, before the deduper:
  `if (this.liveMode !== 'off' && !d.resolving && looksFragmentary(d.question))` → offer to
  `fragmentHold`; log `[Main] dispatch: hold source=… anchor=… verdict=… reason=fragmentary`
  and, for a superseded previous hold, the usual `drop … duplicateOf=<source> answered=false`
  line; return. `resolving: true` skips both holds (a resolution is never re-held).
- Resolution: the held detection re-enters `dispatchDetection` and takes today's path — the
  deduper drops it when a whole text for the same utterance was admitted meanwhile (anchor
  match or containment; M27's Live sentence contains the fragment), otherwise it is
  chipped or answered as today. Nothing is suppressed: at expiry we answer what we have.
- Chip updates: `LiveHold` gains `peek(): T | null`. In the `question-detected-update`
  handler, if `fragmentHold.peek()?.chip?.id === chip.id`, cancel the hold and re-dispatch
  `{ ...held, question: chip.question, anchor: chip.question, chip }` — still fragmentary
  → held again with a fresh timer; whole → admitted now. Today an update never reaches
  dispatch at all.
- `fragmentHold.cancel()` beside every `liveHold.cancel()` (meeting end, mode → off, dedup reset).
- Live off: no hold (there is no other ear to wait for).

Cost: a hold delays a chip or answer only when nothing better arrives — at most the hold
length on ≤ 1–2 fragmentary detections an hour. Live trailed the fragment final by 994,
1087 and 1540 ms in the three measured cases.

## 4. Spoken word budget

### 4.1 `cutAtWordBudget` (electron/llm/verbalStreamFilter.ts)

```ts
export async function* cutAtWordBudget(
    source: AsyncGenerator<string>,
    opts: { limit: number; floor: number; onDone?: (r: { words: number; cut: boolean; allowance: boolean }) => void },
): AsyncGenerator<string>
```
- The decision is taken at the start of each sentence. A sentence that starts with fewer
  than `floor` (40) words already emitted streams through token by token, whole, even if
  it crosses `limit` (80) — that is the allowance, and it also means the first sentence
  is never cut inside. A sentence that starts at or past `floor` is buffered; at its end
  it is emitted if `emitted + words ≤ limit`, otherwise the stream is cut there:
  `await source.return(undefined)` (the SDK stream stops the request, the mechanism the
  engine's abort already relies on) and the generator returns.
- Sentence end = `[.!?]` plus optional closing quotes/brackets followed by whitespace
  (end of stream counts). A terminator at the end of a chunk is not an end until the next
  chunk shows what follows, so "e.g." or "3.5" split across chunks cannot cut mid-sentence.
- End of stream with a buffered partial: emitted if within `limit`, else dropped.
- `onDone` fires once with the emitted word count, whether a cut happened, and whether
  the answer ended over `limit` by allowance. WhatToAnswerLLM logs
  `[Answer] budget: words=<n> cut=<yes|no> allowance=<yes|no>` and the same line to
  `verbal-diag.log`.
- First-token latency is unchanged: the first 40 words stream exactly as today.

### 4.2 Placement

Inside `generateStream`'s verbal branch, wrapping the fallback-aware chain and inside the
first-token tap, so both verbal routes (technical on the selected model, behavioral on
Flash Lite, and `forceFastModel`) and the fallback stream are all cut:
`tapFirstToken(cutAtWordBudget(this.withVerbalFallback(filtered(rawStream), …), { limit: 80, floor: 40, onDone }), …)`.
The coding path is exempt (code is not spoken). `generateStream`'s `onSuggestions` callback
has no caller today (grep); a cut ends the stream before any `__MORE__` block, so no
callback fires — if the offers feature is revived, the cut must call it with `[]`.

Measured on the hour's 52 answers (sentence cut at 80, no floor): median 97 → 67 words,
over-80 41 → 0, 2 answers under 40. The floor rule converts those two into one-more-sentence
allowances.

## 5. Not in this spec, and why

- **Join at STT ingest** (spiked: 29 joins, all closer to the script). Dropped: the
  detector already joins on both its paths (`mergeScenarioSentence` on the model path,
  `runDegradedDetection` on the outage path — H09's chip was whole), and §2 replaces the
  transcript tail with the settled text, so a joined transcript would change nothing the
  model sees. The head Deepgram never transcribed (M27) cannot be joined by anyone.
- **Reconcile "fragment guard"**: retracted; M28's match was against an interim that
  carried the head. No change to `questionReconcile.ts`.
- **Which text is settled** when Live and STT both have a whole sentence stays as today
  (Live's text when Live dispatches, the detector's when whisper does). Live sometimes
  embellishes ("your CloudFormation stack" for "your stack"); the four misses were not
  about this choice, so it is left alone and watched.
- **Profile context under the Context toggle** turned H09's "What do you do?" into a
  pitch. The pin removes the ambiguity (the whole scenario is the last line); the toggle
  itself is unchanged and the proof run keeps it on, as the baseline did.
- **Live silent-mode watchdog, detector budget, the 152 s "operation was aborted"
  reconnects, the Deepgram 1011 flap** — separate specs. The STT gate row stays red on
  Deepgram until the flap spec lands; it is not part of this spec's pass condition.

## 6. Proof

### 6.1 Unit (vitest, `npx vitest run electron`)

- `lastInterviewerTurn.test.ts` — `pinSettledQuestion`: M26, M28, H09 and M27 transcripts
  (the hour's last lines) end with the settled question and the absorbed lines are gone;
  an unrelated trailing question is kept before the new line; a snapshot whose last line
  is already the question is unchanged in content; empty transcript; `lastInterviewerTurn`
  of the result equals the question in every case.
- `questionShape.test.ts` — `looksFragmentary`: the two flagged texts true; "Serving." true;
  the 52 script questions false; "Tell me about yourself." false; "Latency is up." true.
- `liveHold.test.ts` — `peek()` returns the pending detection and null after resolve/cancel.
- `IntelligenceEngine` seam — a test with a stubbed `WhatToAnswerLLM` capturing the
  prepared transcript: with a question the transcript ends with it and no interim is
  injected; without a question the transcript is today's.
- `dispatchDetection` hold — exercised through `main.ts`'s existing structure with fake
  timers: fragmentary whisper text holds (no `live-question` broadcast, no answer); a
  whole Live text for the same utterance arriving at 1.0 s is answered and the hold's
  expiry then drops the fragment as a duplicate; expiry with nothing better answers the
  fragment; whole text never holds; a chip update to a whole question resolves the hold
  immediately; `resolving: true` bypasses the hold; Live off never holds.
- `verbalStreamFilter.test.ts` — `cutAtWordBudget`: the hour's 97-word answer cut to its
  67-word sentence boundary; a 30 + 60 word answer keeps both sentences (allowance); a
  single 95-word sentence passes whole; "e.g." split across chunks does not cut; the
  source's `return` is awaited on a cut; `onDone` fires exactly once with the right
  fields; tokens before the floor are yielded as received.
- Type gate: `npx tsc --noEmit -p tsconfig.json` and `npx tsc --noEmit -p electron/tsconfig.json`
  (six pre-existing errors listed in memory; no new ones).

### 6.2 Live (the next flight hour, `interview60.flight.mjs`)

New gate rows in `interview60.metrics.mjs`:

| Row | Pass |
|---|---|
| `pinned` — answers whose prompt was pinned to the dispatched question | every `[Main] dispatch: answer` line is followed within 2 s by a `pinned question` line with identical text; 0 missing, 0 mismatches |
| `budget` — spoken answers within the 80-word budget | 0 answers over 80 words without `allowance=yes`; shows count, over-80 by allowance, words p50 and max |

Pass condition for this spec: the `quality` row (≥ 47 acceptable, 0 wrong, same Opus
judge and rubric), `pinned`, `budget`, `surfaced` (0 doubles), `latency` (TTFT p90 ≤ 5 s,
detect p50 ≤ 5 s — the hold must not move detect p50 on whole-text questions), and M26,
M27, M28, H09 individually graded acceptable. Report before/after with
`interview60.report-html.mjs 2026-09-04T08-09-38-after4 <run>`.

## 7. Evidence the parameters rest on

| Parameter | Measurement (scratchpad spikes, 2026-09-04) |
|---|---|
| Hold length | Live question after the first STT final: p50 2324 ms, p90 4567 ms over 50 whole questions (an unconditional hold would cost every question); on the three fragment cases 994 / 1087 / 1540 ms |
| `looksFragmentary` | 2 flagged of 317 candidate texts in four hours, both real fragments; 1 hold of 220 dispatches, 0 false holds |
| `pinSettledQuestion` | Real-model spike on gemini-3.1-flash-lite with the production verbal prompt: M26, M27, M28 reproduce their wrong answer from the as-is transcript and answer the right topic with the settled question pinned (56, 100, 59 words); H09 answered correctly both ways offline — the hour's pitch needed the profile context, which the pin also disambiguates |
| Word budget | 52 answers: median 97 → 67 words, over-80 41 → 0, under-40 2 |
| Join at ingest | 19 + 10 joins in two hours, all closer to the script, 0 across questions — measured, then dropped for the reasons in §5 |

## 8. Open decisions (defaults below, to confirm before planning)

1. **Hold length**: 2500 ms (default; matches `liveHold`, ~1 s margin over the worst measured
   gap; costs nothing unless Live never fires for that utterance) — or 2000 ms as sketched.
2. **Budget on behavioral answers**: same 80/40 rule as technical (default; the judge's
   "weak" notes cited length on those most) — or exempt behavioral.
3. **Chip-update hook** (§3.2): included (default; closes an existing hole where Auto
   ignores updates) — or leave updates renderer-only.
4. **Proof run STT**: Deepgram, Context on, Live 3.x, same clips (default) — or Groq REST,
   which would not reproduce the fragments the fix is for.
