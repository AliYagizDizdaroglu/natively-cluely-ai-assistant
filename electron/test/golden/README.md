# Golden test set

A reusable, live-model regression suite for the two paths a candidate actually
leans on in an interview: **screenshot coding** and **spoken answers**.

It is not part of `npm test`. `vitest.config.ts` only includes `**/*.test.ts`, so
nothing here runs automatically — these tests call real models, cost real quota,
and take minutes.

## Running it

```bash
npm run build:electron                                    # required — see below
node --env-file=.env electron/test/golden/calibrate.mjs   # gate: run first
node --env-file=.env electron/test/golden/run.mjs         # both suites
node --env-file=.env electron/test/golden/run.mjs coding  # or one suite
node --env-file=.env electron/test/golden/run.mjs verbal
```

The build is required because the suite imports the **real shipped prompts and
the real stream filter** from `dist-electron`, not copies. A test that grades a
copy of the prompt cannot catch the prompt drifting — which is exactly the bug
class that produced the shipped-default-gets-no-coding-rules defect.

Results cache to `results.json` and are skipped on re-run, so a rate limit or a
transient 500 mid-suite does not cost completed work. Delete it for a clean run.

## Calibrate before you believe anything

`calibrate.mjs` is a gate, not a formality. On this project, hand-written checks
have been wrong more often than the models they graded:

- a regex using `[^.]` could not cross the dot in `collections.OrderedDict`, so
  it scored a perfectly correct offer as absent;
- a harness that dropped `systemInstruction` for Gemma ran an entire suite with
  **no system prompt** and reported 0/3 — a model failure that never happened;
- hand-written answer anchors were wrong four separate times, each requiring a
  full rescore.

So the gate checks that every check can fail:

1. every reference solution **passes** its own assertions
2. every negative control **fails** them
3. the stdlib-offer detector matches real offers and **rejects mere tool use**
4. the notation detector flags `$O(\log n)$`-style text and passes clean prose
5. the rendered screenshots are **legible to the vision model** (skip with
   `GOLDEN_SKIP_VISION=1`)

Non-zero exit means fix the harness before scoring any model.

## Coding suite — `problems.coding.mjs`

Five medium LeetCode problems, 5–6 screenshots each, run as **two turns in one
conversation**: solve normally, then "now give me the pythonic version".

**The screenshots are split so shot 1 is not enough.** The required entry name
appears *only on the last screenshot*, and assertions exercise behaviour stated
only on the middle ones. So `executable` doubles as proof that every screenshot
reached the model — no separate "did it read them all" heuristic needed.

**The set tests both directions of the stdlib contract.** `INTERVIEW_COPILOT_PROMPT`
*requires* the sentence

> Python has `<tool>` for this, but let me implement the mechanism directly.

when the stdlib tool **is the thing being built**, and *forbids* it when the tool
is merely useful — it names "a Counter to find the k most frequent items" and
"a dict to group anagrams" as non-firing cases.

| id | problem | tool | template |
|----|---------|------|----------|
| PY1 | LRU Cache (LC146) | `OrderedDict` | **required** |
| PY2 | Design Circular Queue (LC622) | `deque` | **required** |
| PY3 | Kth Largest in a Stream (LC703) | `heapq` | **required** |
| PY4 | Top K Frequent Elements (LC347) | `Counter` | **forbidden** |
| PY5 | Group Anagrams (LC49) | `defaultdict` | **forbidden** |

A set of only should-fire problems would score full marks on a prompt that fires
always. PY4 and PY5 are what make the score mean something.

### The empty-response row is a measurement, not a pass/fail

`pythonic: EMPTY response` counts how often the **model** returned nothing.
Expect **PY1 to be empty**, reproducibly: Gemini's recitation filter refuses to
emit the canonical `OrderedDict` LRU snippet and returns `finishReason:
RECITATION` with an empty body (measured 6/6 on 2026-08-25, across conversation
shapes, with and without screenshots). That is Google's behaviour and nothing in
this repo can change it.

What *was* ours, and is fixed: `streamWithGemmaGuarded` treated a zero-chunk
stream as success and emitted only the `__model_source` sentinel — an answer
bubble with a badge and no text, no fallback, no error. It now falls through to
Flash, which answers the identical request correctly.

**This suite cannot verify that fallback**, because it calls the REST API
directly rather than going through `LLMHelper` (which needs an Electron runtime).
The app-side behaviour is covered by `electron/LLMHelper.emptyStream.test.ts`,
which feeds the guard a zero-chunk stream and asserts it reaches Flash instead of
returning a bare sentinel. Run both: this suite tells you the model went silent,
that test tells you the user still gets an answer.

So the row to watch here is a **change** in which problems come back empty — a
new one appearing means a new snippet has become recitation-blocked.

## Verbal suite — `problems.verbal.mjs`

Six verbal-technical and four behavioral questions. Every response is piped
through the **real** `filterVerbalLines` → `stripSuggestionBlock` pipeline, fed
in **adversarial chunks** — including a boundary placed mid-`__MORE__` and a run
of single-character chunks — because that is the only place a streaming guard
leaks.

Checks are objective; there is deliberately **no LLM judge**. Judged scores on
this project swung ±0.70 and reversed model ordering at n=10, so they cannot
separate models at this sample size.

| check | what it catches |
|-------|-----------------|
| `nonempty` | the path produced nothing |
| `sentinel_clean` | `__MORE__` reaching the listener |
| `budget` | answer exceeds `SPOKEN_WORD_BUDGET` |
| `offers_wellformed` | >3 offers, questions instead of labels, addressing the listener |
| `no_notation` | `$O(\log n)$`, `**bold**`, backticks — TTS reads these literally |
| `ends_cleanly` | answer stops mid-clause |

`no_notation` is a known-open gap, not a passing check: the filter has line-drop
and opener-rewrite rules but no math/markdown stripping. Measured 1/10 on
2026-08-24.

## Extending it

Add a coding problem by appending to `CODING` with: 5–6 `shots`, `tests`,
`reference` (must pass), `negative` (must fail), `entry` (named **only** on the
last shot), and `templateExpected` set from the prompt's contract — not from
intuition. Then re-run `calibrate.mjs`; a new problem whose negative passes is a
problem that proves nothing.

## Deliberate non-goals

- **Not a benchmark.** n=5 coding, n=10 verbal. It catches breakage, it does not
  rank models.
- **Does not test the Electron UI.** Everything below the renderer only — real
  prompts, real filter, real models, but no window is ever opened.
- **Does not cover STT or Live.** `GeminiLiveRouter.test.ts` covers the Live
  router's reconnect and gap-buffer behaviour with mocks.

## interview60 — the 60-minute hands-free run

A full hour of interviewer prompts (55 items: 52 spoken, 3 screenshot cues) played
out of the speakers into the running app, with Live set to **Auto**, so detection,
routing, answering, and Live-session stability are all measured on the real app.

| file | role |
|---|---|
| `interview60.questions.mjs` | the question bank, with per-item gaps |
| `interview60.build-audio-local.mjs` | renders `interview60.wav` with Windows SAPI (free, unmetered) |
| `interview60.build-audio.mjs` | same via Gemini TTS — better voice, but it hit a daily quota wall after 3 clips |
| `interview60.calibrate-audio.mjs` | proves the live detector hears the chosen voice BEFORE an hour is spent |
| `interview60.calibrate-detector.mjs` | proves the STT detector's prompt returns two-clause questions whole, on the real Groq model, by relaunching the app with `NATIVELY_DETECTOR_CALIBRATE=1` and reading its `[DetectorCalibration]` lines |
| `interview60.run.mjs` | `preflight` / `app` / `report` / `auto` — see below |
| `interview60.answers.mjs` | answer-only pass over the same questions: scored quality + latency, no Live |
| `interview60.chains.mjs` | chain-question continuity: follow-ups that lean on "it"/"that", asked with the app's transcript vs standalone |
| `interview60.report-html.mjs` | builds the flight-test report page from the logs |

```bash
node electron/test/golden/interview60.run.mjs auto [label]   # stop → build → relaunch → probe → hour → report → snapshot to interview60.runs/<stamp>-<label>/
node electron/test/golden/interview60.run.mjs app:start|app:stop|probe   # the pieces, individually
node electron/test/golden/interview60.answers.mjs      # AFTER the hour (same key — do not run concurrently)
node electron/test/golden/interview60.report-html.mjs  # writes interview60.report.html
```

Two things that will silently waste the hour if forgotten:

- **The stimulus must be ONE continuous audio file.** System-audio capture only
  emits while the device is actually rendering (~5% duty when clips are played one
  at a time), so gaps between separate plays are true silence: Gemini Live never
  receives the trailing silence it needs to close a turn, detects nothing, and
  eventually aborts the session as idle. Rendered silence inside one file keeps the
  capture hot. Measured: discrete clips 0 detections; the same clips in one file 3/3.
- **Relaunch is unattended.** `NATIVELY_AUTOSTART_MEETING=1` starts a meeting on launch,
  and `NATIVELY_LIVE_MODE=auto` seeds (and, from then on, persists) Live mode for the
  very first run before anything has been saved; `app:start` waits for
  `[Main] Starting Meeting` and `[Main] Live Mode (restored )?→ auto` in the debug log
  and fails loudly after 90 s.

`auto` re-runs preflight at the last moment for exactly that reason, and aborts
without spending the hour if it is not green.
