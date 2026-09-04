# After5 fixes: phantom guard, head fragments, intro shortcut, provider override — Design

Parent spec: `docs/superpowers/specs/2026-09-04-answer-what-was-asked-design.md`.
Approved by the user on 2026-09-05: "go ahead with A, B and C, re-fly on Deepgram".

## Goal

Remove the three upstream failures the after5 proof hour exposed, without touching the
answering stage the parent spec proved (pinned question 61/61, budget 59/59, all three
answer-only arms 0 wrong), and re-fly the same hour on Deepgram with the STT provider
selected by the harness rather than by editing the encrypted credential store.

## 1. Evidence (run `interview60.runs/2026-09-04T22-43-34-after5`, Groq REST STT)

Judge: 44 acceptable, 6 weak, 5 wrong of 55 spoken answers (gate needs ≥ 47 and 0 wrong).

| Item | What was spoken | Root cause |
|---|---|---|
| H09 | a self-introduction | `INTRO_PATTERNS` matched `'what do you do'` inside a two-sentence scenario question; the knowledge intercept yielded a generated intro and returned before the pinned prompt was sent |
| H03 | a RAG-pipeline answer to "How would you design a pipeline that" | a 7-word Whisper head passed `looksFragmentary` (texts over 6 words are whole) and was answered at once; Live's whole sentence 7 s later dropped as duplicate |
| W11#2 | a serving-framework answer to "model server and why" | the tail of a head/tail split, held, then answered at expiry; no shared content word with the head |
| W02, M19 | "If you need to wrap up, that's perfectly fine" (W02); a phantom double (M19) | the reconcile `replaced` guard is `isFragment` (< 4 words); the hallucination "I'm going to go." is exactly 4 words, so it replaced correct Live claims three times |
| W09, M04, M07, M24, H10 | heads answered before the sentence existed (weak or rescued by a second answer) | same head-fragment cause as H03 |

Scored offline (scratchpad spikes, read-only over the run logs):

- Reconcile guard swap: 9 `replaced` verdicts across 8 flight hours; `looksFragmentary` keeps
  Live's claim in exactly this hour's phantom cases and changes none of the 7 earlier ones
  (5 of which were correct replacements).
- Head-fragment rule (§3): on after5's 58 full-text whisper chips, 6 change class, all six are
  real heads, 0 of the 55 scripted questions is classed fragmentary, Live's whole sentence
  arrived inside the 2.5 s hold for 5 of the 6 (H03's Live sentence took 7 s).
- Intro patterns: 1 of the 55 scripted questions contains an intro phrase as a substring (H09).

## 2. Fix A — reconcile guard (`electron/services/questionReconcile.ts`)

`reconcileLiveQuestion` keeps its scoring; only the guard on the `replaced` verdict changes:

```ts
if (looksFragmentary(latest.text)) return { text: liveText, anchor: null, verdict: 'unverifiable', score: bestScore };
```

`looksFragmentary` is the fragment hold's own predicate (parent spec §3.1). A latest STT
sentence that is under 4 words, opens with a conjunction, or is a short non-question cannot
replace Live's claim; the verdict is `unverifiable`, so the existing Live hold (2.5 s) keeps
Live's text and dispatches it. `isFragment` stays exported for `main.ts`'s Live-fragment drop.

## 3. Fix B — head fragments (`electron/services/questionShape.ts`)

One rule is added to `looksFragmentary`, ahead of the "more than 6 words is whole" rule. A
text with **no terminal punctuation at all** (`TERMINAL_PUNCTUATION = /[.!?？…]["'”’)\]]*$/`)
is fragmentary when either:

- it has at most 6 words (the opener no longer rescues it — "What problem does infrastructure"), or
- its last word is in `TRAILING_FUNCTION_WORDS`: `that, the, a, an, and, or, of, for, to, in,
  into, on, at, with, without, from, by, as, like, than, because, if, while, your, our, their,
  its, my, his, her`.

The set holds only words no English sentence ends on (determiners, prepositions,
conjunctions, possessives), plus `that`, which the corpus shows ending heads six times and
sentences never. Verbs and pronouns that legitimately end a question (`do`, `is`, `not`, …)
are excluded so the degraded-detector chip "…will not update What do you do" stays whole
(existing test). Cost of the rule: a whole question that lost its punctuation and ends on
one of those words waits at most 2.5 s for the other ear before being answered anyway.

Two existing tests pin the first-word normalisation with unpunctuated 4-word texts
("Who's on call tonight", `"What should we deploy`). They keep their purpose with a trailing
period: the terminal-punctuation rule then does not fire, and only the opener rule decides.

## 4. Fix C — intro shortcut (`electron/knowledge/ContextAssembler.ts`)

- `'what do you do'` and `'who are you'` leave `INTRO_PATTERNS`: both occur inside ordinary
  interview questions and neither is asked on its own in an interview.
- `isIntroQuestion` is exported and gains a sentence rule: split the lower-cased question on
  `SENTENCE_BREAK = /[.!?？]+\s+/`; the first sentence containing a pattern decides, and every
  sentence before it must have at most `PLEASANTRY_MAX_WORDS = 4` words ("Thanks for
  joining."). A scenario sentence ahead of the request means the question is about the
  scenario.
- Asymmetry that justifies strictness: a missed intro is still answered from the résumé
  context by the normal knowledge path (its system prompt already says to introduce only when
  asked); a false intro is a self-introduction spoken in place of the real answer.
- Unchanged: greetings, `generateJitIntro`, the knowledge block assembly.

## 5. Fix D — harness: STT provider override

The saved provider lives inside `credentials.enc` (safeStorage-encrypted). The flight must not
edit it. Instead, like `NATIVELY_LIVE_MODE`, a dev-only variable selects the provider for one
launch:

- `electron/services/sttProviderOverride.ts`: `resolveSttProvider(saved, process.env.NATIVELY_STT_PROVIDER, app.isPackaged)`
  returns the saved provider when the variable is unset or the build is packaged, the named
  provider when it is one of the ten known names, and **throws** naming the bad value otherwise
  (fail at the boundary; never fall back).
- `main.ts` `createSTTProvider` uses it and logs
  `[Main] NATIVELY_STT_PROVIDER=<p> overrides the saved STT provider (<saved>) for this launch`
  when they differ.
- `interview60.run.mjs` preflight: when `NATIVELY_STT_PROVIDER` is set, require the app's own
  `[Main] Using <Class> for interviewer` line to name it (`DeepgramStreamingSTT` for
  `deepgram`); a missing Deepgram key falls back to GoogleSTT with only a warning today, which
  would silently run the hour on the wrong ear. Proved for `deepgram`; other providers' start
  lines are not part of this check.
- `interview60.flight.mjs` logs `STT   <provider>` beside its `LIVE` line so the run log says
  which ear the hour used.

## 6. Proof

Unit (`npx vitest run electron`): the tests in the plan, plus the existing suite (405 green
before this spec; the two rewritten tests keep their assertions). Type gates unchanged (six
pre-existing electron errors, none added).

Live: `NATIVELY_STT_PROVIDER=deepgram node electron/test/golden/interview60.flight.mjs after6`,
Context toggle on, Live 3.x. Pass: the harness gate, i.e. quality ≥ 47 acceptable and 0
wrong, `pinned` and `budget` PASS, `heard` ≥ 51/52, and H03, H09, W02 and M19 individually
acceptable; the `stt` row may stay red on Deepgram (socket flap, known). The report is
graded by Opus subagents exactly as after5 was, then the artifact and the report of record are
republished and committed.

## 7. Not in this spec

- The deduper's 4-shared-word threshold (M21: Live's paraphrase shared 3 words and superseded
  the whisper answer). Needs its own measurement.
- A Whisper hallucination gate for Groq REST (`no_speech_prob`, phrase lists) and a longer
  fragment hold for 6-second REST chunks. Deepgram sidesteps both for this proof.
- Two-part questions split at a comma (W05), answered in halves.
- The noise source on the machine's system audio channel between clips (0 silence skips in
  after5 against 42 in after3). Not observable from the logs; the user checks the machine.
