# Interview reliability pass — design

Date: 2026-09-02 · Branch: `fix/coding-style-suffix-all-gemini` (main checkout) ·
Baseline: the 60-minute hands-free run of 2026-09-02 15:47–16:48 UTC
(`electron/test/golden/interview60.runs/2026-09-02-before/`, report published as the
"Natively Flight Test" artifact).

## Goal

Fix every open finding from the flight test, in priority order, re-run the identical
hour, and compare before and after against a fixed gate. Iterate — fix, re-run,
compare — until the gate passes. "Reliable" is the gate, not a feeling.

Decisions taken during brainstorming:

| Question | Decision |
|---|---|
| Scope | Every open finding (8), priority order |
| Mode measured / required | Measure **Auto**; Auto certifies both Auto and Suggest |
| Context toggle during the after-run | **On** (same as the before-run) |
| Hand-off per iteration | Live mode persisted; the harness stops, rebuilds, relaunches the app itself |
| Stop condition | The gate in §6 |
| When to run | As soon as built and gated; a quota probe precedes the hour |
| Sequencing | Socket spike first (30 s reproduction), then all fixes, one re-run |

## 1. Enablers and the relaunch loop

### 1.1 Persist Live mode
- `CredentialsManager` gains `liveMode?: 'off' | 'suggest' | 'auto'` with
  `getLiveMode()` / `setLiveMode()`, mirroring `defaultModel`.
- `AppState.setLiveMode` persists the value. `AppState.startMeeting()` reads it and, when
  it is `suggest` or `auto`, starts the router exactly as an IPC `live-mode:set` would.
  Log line: `[Main] Live Mode restored → <mode>`.
- The renderer's Live pill must reflect the restored mode on mount via the existing
  `live-mode:get`; add the mount-time call only if it is missing.

### 1.2 Dev-only meeting auto-start
- Env guard `NATIVELY_AUTOSTART_MEETING=1`: after the window is ready, init calls
  `appState.startMeeting({ title: 'autostart', source: 'env' })` once. Same pattern as
  `NATIVELY_DETECTOR_CHAIN_TEST`. Production behaviour unchanged.

### 1.3 The harness owns the app lifecycle (`interview60.run.mjs`)
- `app:stop` — kill the `npm start` process tree (`taskkill /PID <pid> /T /F`); the pid
  is the one the harness spawned, recorded in `interview60.runs/app.pid`. With no pid
  file (the app was started by hand, as today), kill the electron processes whose
  command line contains this project's path, and nothing else.
- `app:start` — spawn `npm start` with `NATIVELY_AUTOSTART_MEETING=1`; wait for both
  `[Main] Meeting started` and `[Main] Live Mode restored → auto` in
  `natively_debug.log`; fail loudly after 90 s.
- `probe` — one `gemini-3.1-flash-lite` generateContent call and the existing 34 s Live
  preflight. Any 429 postpones (poll every 2 min, configurable deadline) instead of
  starting the hour.
- `auto` becomes: `app:stop` → `npm run build:electron` → `app:start` → `probe` → hour →
  report → snapshot (`interview60.runs/<ISO timestamp>-<label>/`: `natively_debug.log`,
  `verbal-diag.log`, timeline, answers, chains, report). No browser tooling anywhere.

### 1.4 Proof
- Unit: `liveMode` round-trip in `CredentialsManager`; the log-line waiter against a fake
  log file (both lines, one line, timeout).
- Live: two consecutive relaunches come up listening in Auto with no click; preflight
  green both times. The log lines are quoted in the report.

## 2. The STT socket: spike, then fix

### 2.1 Symptom (baseline)
Deepgram closes the interviewer `DeepgramStreamingSTT` socket 10.3–10.8 s after every
open — 299 times in the hour, one per 12.1 s, code 1011 "did not receive audio data or a
text message within the timeout window" — regardless of whether Deepgram transcribed
speech on that socket. Idle app sockets die at 6.3 s. Standalone, the same class, SDK,
key and chunk shape hold a socket indefinitely under both transports; the server honours
real-time silence, quarter-rate silence and KeepAlive. Cost: 2 half-transcribed
questions lost (M04 entirely), 5 fragment finals, H03's head lost. Every mode affected.

### 2.2 Instrumentation (permanent, one line per socket)
At close: `[DeepgramStreaming] socket #n lived Xs — Y chunks / Z bytes to send() after
the flush, K keepalive ticks, last send T s before close, readyState at last write=R`,
plus a counter of writes attempted while the SDK reports the connection not open.

### 2.3 Reproduction
Relaunch (§1), play `probe-continuous.wav` (34 s) followed by 60 s of silence, expect
~8 closes, read the summaries.

### 2.4 Decision table
| Numbers say | Fix site |
|---|---|
| Bytes after the flush ≈ 0 while transcripts arrive | Class state handling (`isOpen` / readyState around `write()`) |
| Bytes flow at capture rate, server still closes | Transport framing — compare the same bytes through a raw `ws` client in the app process (compression, text vs binary, subprotocol) |
| Bytes in speech, zero in silence | Capture goes quiet; keepalive should cover it — tick count says whether it is sent; if sent and ineffective, that is the fix site |
| Anything else | Time-box: 2 h of spikes, then this item alone falls back to "instrumentation ships now, fix from the hour's data in pass 2" |

Not done before the cause is known: changing Deepgram parameters, or padding silence.

### 2.5 Proof of the fix
- Unit test on the changed path with fake timers.
- Live: 3 minutes of probe audio plus silence with zero code-1011 closes; a question
  spoken 8 s after a socket opens (the M04 shape) transcribed to a complete final.

## 3. The fixes, in priority order

### 3.1 Auto-mode race (critical)
- `ChipDeduper`: cache entries gain `answered`; `markAnswered(question)`;
  `AdmitResult.alreadyAnswered` on a suppressed duplicate.
- `main.ts`: the Live and whisper handlers collapse into `dispatchDetection(question,
  intent, source)`. Decision is a pure function `decideDispatch(mode, verdict) →
  'answer' | 'chip' | 'drop'`:
  - `auto`, admitted → broadcast `live-question`, call `runWhatShouldISay` once, mark
    answered. Either source. No chip in Auto.
  - `suggest`, admitted → chip (as today).
  - duplicate → drop; never a second answer.
- Log line: `[Main] dispatch: <answer|chip|drop> source=<live|whisper>
  anchor="<transcript sentence>" verdict=<match|paraphrase|replaced|unverifiable>`; a
  `drop` also carries `duplicateOf=<source> answered=<true|false>`.
- Tests: `decideDispatch` across mode × source × duplicate × alreadyAnswered;
  `ChipDeduper` mark/duplicate. Hour metric: race losses 22 → 0.

### 3.2 Context-on classifier (critical)
1. `streamChat` takes an optional 7th positional `knowledgeQuestion?: string`;
   `WhatToAnswerLLM` passes the last interviewer turn from `cleanedTranscript`;
   `processQuestion` and `negotiationTracker.addUserUtterance` receive it instead of the
   composed prompt. (The composed prompt currently carries prior coaching blobs, which is
   why the misclassification is self-sustaining.)
2. `knowledge/IntentClassifier.ts`: word-boundary matching; NEGOTIATION fires on a strong
   term alone (salary, compensation, negotiate, equity, rsu, signing bonus, total comp,
   market rate, counteroffer); weak terms (base, range, expect, pay, offer, package,
   budget, raise, stock, worth, requirement) count only alongside a strong term. Other
   keyword lists unchanged.
3. Structured generation: a provider that returned 429 is skipped for 10 minutes in the
   rotation loop (generic, per provider name).
- Tests: the 52 bank questions → 0 NEGOTIATION; a handful of genuine negotiation
  questions → NEGOTIATION; a stub orchestrator proving `processQuestion` receives the
  question text; the cooldown with a fake provider list.
- Hour metrics: "Intent classified: negotiation" 25 → 0; coaching blobs 25 → 0; Pro
  attempts 25 → 0; technical answers routed `VERBAL-TECHNICAL (filtered)`.

### 3.3 Live cross-check against the STT transcript (high)
- `IntelligenceManager`, which already receives every interviewer transcript, keeps a
  ring buffer of timestamped interviewer finals and interims and exposes
  `getRecentInterviewerSpeech(windowMs)`; `main.ts` reads the last ~15 s from it.
  Interims included — that is what carried M04's wording.
- Pure function `reconcileLiveQuestion(liveText, recentFinals) → { text, anchor,
  verdict }` using the report's overlap measure (fraction of the Live text's content words,
  length > 3, present in the window):
  - `match` (≥ 0.5) and `paraphrase` (0.25–0.5): keep Live's wording; `anchor` = the
    best-matching transcript sentence.
  - `replaced` (< 0.25 while the window holds speech): surface the transcript sentence
    instead; intent demoted to `verbal`.
  - `unverifiable` (no speech in the window): accept Live as-is; logged.
- `ChipDeduper.admit` accepts an optional `anchor`; two candidates with the same anchor
  are duplicates, in addition to the existing Jaccard/containment rules.
- Tests: fixtures from the baseline log — M04 (replaced), M25 (paraphrase, anchored), W02
  (match); same-anchor dedupe. Hour metrics: invented 1 → 0; double chips 12 → 0.

### 3.4 Split questions (medium)
- `QUESTION_DETECTION_SYSTEM_PROMPT`: replace "Identify the MOST RECENT question" with a
  contract to return the complete question as asked — when it leans on the sentence
  before it ("it", "that", "and …"), include that sentence so the question stands alone.
  JSON schema unchanged.
- Proof: a calibration script against the real Groq model with the H02, H03 and H08
  transcripts (golden-dir pattern); hour metric: the nine two-sentence items get a chip
  containing the scenario.

### 3.5 Spoken questions routed CODING (medium)
- In `WhatToAnswerLLM`, a detector `coding` intent routes to the coding branch only when
  screenshots are attached; otherwise the verbal branch (prompt, filters, budget) applies.
  Manual and screenshot flows unchanged.
- Test: route selection for `coding` with and without images. Hour metric: `CODING (no
  filter)` routes for spoken questions 4 → 0.

### 3.6 Metrics-bar label (medium)
- `LLMHelper` yields `__model_source:<model>__` at the head of every verbal stream. The
  two intent-based guesses in `NativelyInterface.tsx` (~814, ~2570) are deleted; the bar
  is blank until the sentinel arrives. Filters already strip the sentinel.
- Tests: sentinel present on the default path; renderer label follows the event. Live:
  the bar under a hands-free answer names `gemini-3.1-flash-lite`.

### 3.7 Word budget (low)
- The instruction target drops to 60 so the model lands near the 70-word gate; the gate
  stays at 70.
- Proof: the answer-only pass over the 52 questions, over-budget count and median before
  vs after. Reverted if the hypothesis does not hold.

## 4. Comparison and the gate

### 4.1 Runs are folders
`electron/test/golden/interview60.runs/<timestamp>-<label>/` (gitignored). The baseline
is `2026-09-02-before`.

### 4.2 One metrics function, two consumers
- `computeRun(dir)` (extracted from `interview60.report-html.mjs`) returns the metrics
  object below plus per-item outcomes.
- `interview60.run.mjs gate <dir>` prints the gate table and exits non-zero on any
  failure — the loop's stop condition.
- `interview60.report-html.mjs <before> <after>` renders: the gate table (before / after
  / gate / pass-fail), the two 52-cell strips stacked in the same order, each finding's
  after-number under its status, an iterations table (one row per run). The single-run
  page remains for a lone run.

### 4.3 Metric definitions
| Metric | Source |
|---|---|
| Heard | per item: a Live line or STT forward inside its play window (window-first attribution, overlap ≥ 0.3 top candidate, else lone ≥ 0.15) |
| Answered | per item: a `dispatch: answer` line inside its window followed by a `route:` line within 4 s |
| Answers to a question nobody asked | `dispatch: answer` lines matching no played item |
| Surfaced detections per question | `dispatch: answer` (Auto) or `dispatch: chip` (Suggest) lines per item — the gate wants exactly one; "text matching what was said" means verdict `match`, `paraphrase`, or `replaced` (transcript wording), with `unverifiable` allowed only while STT was down |
| Invented Live lines | `verdict=replaced` count (bank attribution as cross-check) |
| Race losses | `dispatch: drop … alreadyAnswered=false` from the second source with no answer in the window |
| Socket closes / lost utterances / fragment chips | as in the baseline report (code-1011 closes; empty final after a worded partial; finals within 3 s of a reconnect) |
| Coaching-path answers | `__negotiationCoaching` blobs during the hour (bank has no negotiation questions) |
| CODING-for-spoken | `route: CODING` lines for spoken items |
| Expiry loops | `session expired` count |
| Detect p50 | first admitted detection (either source) − spoke end |
| Answer TTFT p90 | new `WhatToAnswerLLM` diag line: request start → first token |

Two new diag lines in `WhatToAnswerLLM`: first-token time, and the first 120 characters
of each hands-free answer with its question.

### 4.4 After-run passes
The word-budget change alters the prompt, so the answer-only and chain passes run again
for the after-run and sit beside the before numbers.

## 5. Order of work
1. §1 enablers → relaunch proof.
2. §2 spike → fix → probe proof (time-boxed).
3. §3.1, §3.2 → unit tests; the 30 s probe shows a whisper-first question answered.
4. §3.3 – §3.7.
5. §4 harness.
6. Full gates: `vitest run`, `tsc --noEmit`, `build:electron`, `vite build`; the three
   calibrations (classifier on the bank, detector prompt on the split transcripts,
   reconcile fixtures); quota probe; the hour; gate verdict; comparison page republished
   to the existing artifact link.
7. Gate fails → the failing rows name the fix → relaunch → hour → repeat.

Each fix is test-first. No fix is reported done without its unit test green and its
live proof quoted.

## 6. The gate (one hour, same 52-question file, Auto + Context on)

| Metric | Before | Gate |
|---|---|---|
| Answered hands-free | 26/52 | ≥ 50/52, and 0 answers to a question nobody asked |
| Heard by either detector | 51/52 | ≥ 51/52 |
| Surfaced detections per question (answer in Auto, chip in Suggest) | 12 doubles, 1 invented | exactly one, text matching what was said (§4.3) |
| STT socket closes / lost utterances / fragment chips | 299 / 2 / 5 | ≤ 5 / 0 / 0 |
| Technical questions answered via the coaching path | 25 | 0 |
| Spoken questions routed CODING | 4 | 0 |
| Live expiry loops | 0 | 0 |
| Answer TTFT p90 · detect p50 | 3.7 s (answer-only pass) · 4.1 s | ≤ 5 s · ≤ 5 s |

The before-run recorded no in-app first-token time (the answer path went through the
coaching short-circuit), so its TTFT is the answer-only pass's; the after-run's is
measured in-app by the new diag line. The two are noted as such on the page.

## 7. Out of scope
- A second answer provider (Gemini-key outage redundancy).
- Recording answer text to the database outside a formal meeting.
- Any UI redesign; the renderer changes are limited to §3.6 and the mount-time
  `live-mode:get` call in §1.1.
- Real-voice audio; the stimulus stays the SAPI file so before and after are comparable.

## 8. Open decision for the reviewer
Commit each fix on the branch as it lands (preferred: reviewable history, clean
before/after in git), or commit nothing until told, as today. The working tree already
carries unrelated uncommitted changes; either way, only files this pass touches are
staged.
