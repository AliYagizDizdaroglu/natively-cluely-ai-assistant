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
| `interview60.calibrate-detector.mjs` | proves the STT detector returns two-clause questions whole — prompt plus the deterministic scenario-sentence merge in `mergeScenarioSentence.ts` — on the real Groq model, by relaunching the app with `NATIVELY_DETECTOR_CALIBRATE=1` and reading its `[DetectorCalibration]` lines |
| `interview60.run.mjs` | `preflight` / `app` / `report` / `gate` / `auto` — see below |
| `interview60.answers.mjs` | answer-only pass over the same questions: scored quality + latency, no Live. `--model <id>` runs the same pass on another arm into `interview60.answers.<id>.json` — the arms in `interview60.flight.mjs` (3.1 Flash Lite, 3.5 Flash Lite, Gemma 4 31B, plus `qwen/qwen3.8-27b` and `openai/gpt-oss-120b` on Groq: an id with a `/` needs a real `GROQ_API_KEY` in `.env`, the placeholder exits 3) — and every item records its `model`. `--limit <n>` answers the first n only (probes) |
| `interview60.cues.mjs` + `interview60.cue-display.cjs` | the three screenshot cues, hands-free: each cue names a golden coding problem (`problem` in the question bank); `run.mjs auto` spawns `cues.mjs schedule`, which shows that problem's page (all shots on one image, `interview60.cues/<PYn>.png`) on the primary display while the cue plays. The app captures the screen when the interviewer points at it (`main.ts answerDetection`, `screenReference.ts`) and answers on the coding path; the judge export appends the on-screen problem to the cue's question so the grader can judge the solution. `show <PYn> <ms>` puts one page up by hand; `NATIVELY_DETECTOR_CHAIN_TEST=1 NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS='["…on screen…"]'` pushes a cue sentence through the real pipeline without audio. **Preconditions:** the app captures the display its overlay is on (else the cursor's), the page goes on the primary display, so run a flight on one display or with the overlay on the primary; and the desktop must be free — an application running fullscreen on the primary display wins over the page and the capture shows that application (spike 2026-09-07). `interview60.cues.log` in the run folder records the pages shown and whether each image loaded |
| `interview60.chains.mjs` | chain-question continuity: follow-ups that lean on "it"/"that", asked with the app's transcript vs standalone |
| `interview60.judge.mjs` | judge pass over the hour's OWN answers: Claude Opus 5 grades each delivered answer against the scripted question for correctness, on-topic-ness and spoken delivery (0-2 each); feeds the gate row "Interview-acceptable answers" (≥ 47 of 52 acceptable, 0 wrong). Reads `[Answer] full:` lines that SessionTracker logs once per answer. Needs `ANTHROPIC_API_KEY` (or `CLAUDE_API_KEY`) in `.env` — or no key at all: `--export` writes the pairs and the rubric to `interview60.judge.pairs.json`, an Opus subagent in Claude Code grades them into `interview60.judge.verdicts.json`, and `--verdicts <file> --model <id>` writes the same judge file, recording the exact model the grading agent ran on (from its transcript, never an alias). `--answers <file>` grades an answers-pass arm instead of the hour's log, with every file suffixed `.<model>`; resumable; run AFTER the hour, never during it |
| `interview60.live-probe.cjs` | one Live session with the app's exact config against the 34 s probe clip: exit 0 = tool call seen, 3 = connected but silent (the 3.x daily-allowance failure), 1 = could not connect, 2 = no key. A yes/no before a build and a launch |
| `interview60.flight.mjs` | unattended flight for a scheduled task: live-probe → Live model for the hour (3.x, or 2.5 via `NATIVELY_LIVE_MODEL` when 3.x is silent) → `auto <label>` → the three answer arms + chains into the run folder → judge exports; `--dry-run` logs every command and runs none. Logs to `interview60.run.flight.log`, leaves `interview60.flight.done.json` in the run folder |
| `interview60.metrics.mjs` | `computeRun(dir) → RunMetrics` — the one analysis (attribution, STT, coaching, gate) shared by `gate` and the report, plus the spec §6 pass table (`GATE`, `evaluateGate`). Each dispatch line is claimed by exactly one item (highest anchor overlap, ties to the latest); `delivered` (= `answered` minus `[WhatToAnswerLLM] Stream failed` lines) is what the "Answered hands-free" row judges; a `verdict=replaced` line is `caught` (informational — the reconciler catching a mismatch, not an invented question reaching the user); two rows from the 2026-09-04 spec — "Answer prompt pinned to the dispatched question" pairs each answer dispatch's question= field with the engine's pinned question line inside 2 s, and "Spoken answers: the sentence in progress at 80 words finishes (ceiling 160)" reads the [Answer] budget: lines (every spoken answer logs one; the row passes when at least 90 % of delivered answers logged one, no cut answer is under 80 words, words p50 ≤ 100 and max ≤ 130 — spec 2026-09-05 §3) |
| `interview60.report-html.mjs` | builds the flight-test report page from the logs |

```bash
node electron/test/golden/interview60.run.mjs auto [label]   # stop → build → relaunch → probe → hour → report → snapshot to interview60.runs/<stamp>-<label>/ → gate → stop (a failed run closes the app too; after Ctrl+C or a killed task, run app:stop)
node electron/test/golden/interview60.run.mjs app:start|app:stop|probe   # the pieces, individually
node electron/test/golden/interview60.run.mjs gate <dir>   # judge a run snapshot against the spec §6 pass table; exits 0/1
node electron/test/golden/interview60.answers.mjs      # AFTER the hour (same key — do not run concurrently)
node --env-file=.env electron/test/golden/interview60.judge.mjs electron/test/golden/interview60.runs/<run>   # AFTER the hour: grades the delivered answers (Claude Opus 5, ~$1-4)
node electron/test/golden/interview60.judge.mjs electron/test/golden/interview60.runs/<run> --export   # no API key: pairs + rubric for an Opus subagent to grade, then --verdicts electron/test/golden/interview60.runs/<run>/interview60.judge.verdicts.json --model <grader model id, from its transcript>
node electron/test/golden/interview60.report-html.mjs                       # writes interview60.report.html from the live checkout's own logs
node electron/test/golden/interview60.report-html.mjs <dir>                 # same page, from a run snapshot instead
node electron/test/golden/interview60.report-html.mjs <beforeDir> <afterDir>  # adds a gate table, a before/after strip, and an iterations table
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

### The probe requires five consecutive 200s, not one

A single `modelAlive('gemini-3.1-flash-lite')` 200 is not proof of headroom: on
2026-09-03 the probe saw HTTP 200 at 04:09:40 UTC, and the free tier (500
requests/model/day) walled every subsequent call with a 429 fifteen seconds
later — a key that is genuinely exhausted for the day can still return one or
two 200s on a leaky-bucket burst right after being idle. `probe()` now
requires **five** consecutive 200s, 15 s apart, logging one
`PROBE  gemini-3.1-flash-lite HTTP <status> (<k>/5)` line per attempt; any
non-200 fails that attempt outright (the `auto` retry loop tries again in 2
min, restarting the count from 1). Only once all five land does the existing
end-to-end preflight run.

### `app:stop` only ever touches this checkout's own electron.exe

Two failure modes it guards against:

- **Matching `node.exe` by command-line path prefix** used to also kill any
  `vitest`/`vite`/`tsc` process — of this session or an unrelated one — whose
  command line happened to contain the checkout path. `app:stop` now matches
  `electron.exe` only.
- **A git worktree of this checkout has its own `electron.exe`** whose command
  line also contains the main checkout's path as a prefix (`<checkout>\.claude\
  worktrees\<name>\...`). The broad process scan now excludes any command line
  containing `\.claude\worktrees\`.
- **The tracked pid-file pid can be stale** — Windows recycles process ids, so
  by the time `app:stop` runs, that pid may belong to an unrelated process.
  Before `taskkill /T /F` on it, `app:stop` reads that pid's own command line
  and only kills it if it still names an `electron`/`npm start` process; it
  logs what it skipped otherwise.

### Unattended flight

The free-tier day resets at 07:00 UTC, so the hour of record is scheduled, not started by hand.
A Windows Task Scheduler task runs `interview60.flight.mjs` in the logged-on user's desktop session
(the app needs a desktop and an output device; the task runs only while the user is logged on).
Prove the plumbing with a `--dry-run` task first — it must reach the script with the repo as cwd
and write `interview60.run.flight.log` — then register the real one:

```powershell
$repo = 'C:\path\to\natively-cluely-ai-assistant'
$action = New-ScheduledTaskAction -Execute (Get-Command node).Source -Argument 'electron\test\golden\interview60.flight.mjs after4' -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Once -At '2026-09-04 10:05'   # 07:05 UTC in Europe/Istanbul
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 5)
Register-ScheduledTask -TaskName 'Natively-flight-after4' -Action $action -Trigger $trigger -Settings $settings
# cancel: Unregister-ScheduledTask -TaskName 'Natively-flight-after4' -Confirm:$false
```

When it is done, `interview60.flight.done.json` in the run folder lists the four pairs files to grade
(the hour's own answers and the three arms). Grading is the no-key judge route above; the gate reads
the hour's `interview60.judge.json`, and the three `interview60.judge.<model>.json` files are the comparison.
