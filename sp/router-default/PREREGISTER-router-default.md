# Pre-registration: router-default-r1 — the 3.8 Live router as the app's default extension, one unattended live40 run (flag ON)

**Status: PASS 2, the smoke fields filled** (plan Task 19 step 1). Pass 1 was written 2026-10-07 ~01:00 TST by the
Opus registration author, before the smoke (Task 17). Pass 2 (~02:2x TST) fills the smoke fields from smoke 3
(`LAB\RESULT-smoke.md`, `LAB\SMOKE-READ.txt`), states the grading-tool and Task 18 rulings made since pass 1, and adds
amendment A1 (the router padding fix, made after smoke 2 and before any data of the run). Both passes precede any data
of the run. Only `<<ARMING: …>>` fields remain (index in §0). A separate fresh Opus agent re-checks each pass (spec §2
rule 3); this author does not review itself.

**Rules of this file.** It is committed to MAIN's `passes/` as `PREREGISTER-router-default.md` before the flight task
is registered (plan Task 19 step 3); the flight HEAD is that commit. After the run starts nothing in it is edited: the
result goes in `passes/<date>-router-default-result.md` and applies this text verbatim. A change before data is a dated
amendment at the end, never an edit in place. Every number names its source.

**Names.** `MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (branch
`fix/coding-style-suffix-all-gemini`; HEAD `3d13436` as this is written, before the router lands). `SP` =
`C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp`. `LAB` = `SP\router-default`. `SPEC` = `LAB\SPEC.md` rev 4c
(committed MAIN 17d199d). `PLAN` = `LAB\PLAN.md` rev 2 (MAIN 3d13436). `LEDGER` = `LAB\build\progress.md`. `WBR` =
`LAB\reviews\whole-branch-review.md`. Clock times are TST (UTC+3) unless marked Z. A **quota day** runs 10:00 → 10:00
TST (07:00Z → 07:00Z), the lite reset (SPEC §10.1).

---

## 0. Placeholders

| # | field | state | where used |
|--|--|--|--|
| P1 | `context_sha12` | **filled: `b2a43a2159a2`** (smoke 3, and smoke 2 before it) | §2 env `NATIVELY_ROUTER_CONTEXT_SHA12`, guard r6, auto() preflight |
| P2 | `context_chars` | **filled: 266** | §2, §4.9 (the I7 rule) |
| P3 | the gap and the wav | **filled: `gapMs` 20 000 (0 overruns), wav unchanged, sha256/12 `F6DF5D53E8D8`** | §3, §10 |
| P4 | `I60_PROBE_DEADLINE_MIN` | **filled: 35** (§9.2), with a check at arming on the dry twin's duration | §2 env, §9 |
| P5 | the quota table | **filled**: the final pre-commit read (23:21:52Z) in §8.2a; the arming record carries its own fresh read (A4) | §8 |
| P6 | T | `<<ARMING>>` (§9.1) | §2, §9 |
| P7 | instrument sha256 lines | **filled** in §10 (from `LAB\build\instrument-shas.md`, 23:21:52Z) | §10 |
| P8 | the smoke's run folder, its reader output, the measured B | **filled** (§11.4, §9.2) | §9.2, §11.4 |
| P9 | `NATIVELY_RD_EXTRA_REQUESTS` | **filled: 0** (§8.4), re-confirmed by hand at arming | §2 env, §8 |
| P10 | the registered flight HEAD (40 hex) | `<<ARMING>>` (the commit of this file) | §2, §10 |

---

## 1. What the run tests, and the tree that flies

**The change under test (SPEC §1, §3).** With `NATIVELY_LIVE_ROUTER=1`, a second Live session (`LiveRouterSession`,
`gemini-3.8-live`, router40's setup) hears the interviewer audio beside the ear. Its first word routes each dispatched
turn: a hard word sends the turn to the pipeline (shown with cues, as today); anything else, if the arbiter's checks
pass, streams the Live answer on screen while the pipeline answer for the same turn is generated and kept as a hidden
shadow. The pipeline always dispatches; the arbiter decides only what is shown and what enters the history (SPEC §3,
§4.3, §4.6).

**Behind the flag (SPEC §3 "Flag coverage"):** the router session, the arbiter's Live path, the ear failover (SPEC §4.4;
the user ruled 21:0x to KEEP it, LEDGER line 4).

**Not behind the flag, so in the tree under the pipeline as well (named here as SPEC §10 and §7.3 require):**
- **§7.3, the ear reconnect fix, is a change to the ear under the pipeline.** A connection generation counter ignores
  stale callbacks, the old session is marked stale before a `goAway` close, `scheduleReconnect` skips while one is
  pending, close codes are logged. It is ON with the flag on or off.
- §7.1, the unknown-marker filter on the displayed answer stream (uppercase `__[A-Z][A-Z0-9_]*__` only, §4.2 below).
- §4.5, `turnId` on every `suggested_answer*` event (flag off: the renderer behaves as today, WBR "Flag-off identity").
- Flag-off log lines (WBR m-6, accepted): `[Router] ear model=…` on every ear start (also to `verbal-diag.log`),
  `[Router] flag NATIVELY_LIVE_ROUTER=off`, and `[IntelligenceEngine] answer end …` for every `turnId` answer. Any
  verbal-diag line-count comparison with earlier hours must subtract them.

**The tree.** MAIN at the registered HEAD (P10) = `3d13436` + the land commit of `feat/live-router` **`4511f20`**
(PLAN Task 16: 49 paths, copy hashes verified, no foreign edits; the user ruled 00:48 "land in MAIN = YES, local commit,
flag default off, no push", LEDGER line 65) + **`19937ab`, the router padding fix (amendment A1)** + the instrument
copies + this file's commit. Smoke 3 flew MAIN `19937ab`. Not tracked, and copied into MAIN as assets (smoke attempt 1
carry): `electron/test/golden/live40.wav` and `live40-tts-local\` (94 files), both gitignored; the guard's `wav:check`
and the wav sha (§10) prove them. The flag is OFF by default in that tree; the launcher sets it ON, the only place it is ON. Nothing
lands between that commit and the end of the run; the guard refuses a moved HEAD or a dirty tree. The build is made
AFTER the final HEAD is in place, then the dry twin runs (Task 18 review M5: the mtime checks refuse a build older than
its source).

**Not in this run (SPEC §1):** the flight-eq re-fly (never shares a run window with this flight), the cue-less
follow-up parent fix, the mishearing fix, the earlier-question block (OFF).

---

## 2. The run

| | |
|--|--|
| **Run label** | **`router-default-r1`**. The flight call is `node electron\test\golden\interview60.flight.mjs router-default-r1` (launcher `{{RUNLABEL}}`). The run folder is `MAIN\electron\test\golden\interview60.runs\<stamp>-router-default-r1`, `<stamp>` = the harness's ISO instant with `:`/`.` → `-`, 19 chars (`interview60.run.mjs:598-599`). Launcher log `interview60.runs\flight-rd.launcher.log`. |
| **Smoke label** | **`router-smoke`** (distinct; LEDGER line 32; `LAB\launch-router-smoke.cmd` runs `auto router-smoke`). PLAN Task 17's "smoke-router" is superseded by that ruling. A `<stamp>-router-smoke` folder is never graded: `build-blind-rd.mjs` accepts only `^\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-router-default-r1$` (14A B1 fix) and refuses smoke, suffixed, prefixed, bare-label and junk-prefix folders (cal RD-10..10g). |
| **The graded folder** | The run folder named above. **If the hour is retried** (§6.3: a run VOID, or an attempt that ended "The hour was NOT spent"), every retry under this label writes another `<stamp>-router-default-r1` folder; **the folder graded is the first one, in stamp order, that is not VOID** (reader exit ≠ 3, and not a "NOT spent" attempt, which writes no snapshot). The result note names that folder and every other `-router-default-r1` folder with its reader verdict. The blind export runs on the graded folder only (its keyhold refuses a second build). |
| **Tasks** | `Natively-flight-rd` (flight) and `Natively-flight-rd-precheck` (at T−6), registered by `LAB\flight\register-rd.ps1 -Which armed -T '<T>'`; dry twin `Natively-flight-rd-dry`. Interactive logon (the user logged on), StartWhenAvailable OFF, working directory MAIN. Never started by hand; the app is never started from a Claude session (SPEC §2 rules 1–2). |
| **T** | `<<ARMING: T, yyyy-MM-dd HH:mm TST>>` (P6), set by the timing ruling of §9.1. |
| **Roster, audio, ears** | `live40` (`NATIVELY_ROSTER=live40`), 47 items in 31 chains (§3), `live40.wav` with gap 20 000 ms (P3), played hands-free; Deepgram + the Live ear on `gemini-3.1-flash-live-preview` (the harness default); the router on `gemini-3.8-live`. |
| **Environment** (`LAB\flight\launch-rd-src.txt`, generated by `gen-launchers-rd.mjs`) | set: `NATIVELY_STT_PROVIDER=deepgram`, `NATIVELY_LIVE_ROUTER=1`, `NATIVELY_ROSTER=live40`, `NATIVELY_FLIGHT_ARMS=high,low,captured-high`, `NATIVELY_FLIGHT_FOCUSED=off`, `NATIVELY_ROUTER_CONTEXT_SHA12=b2a43a2159a2`, `I60_PROBE_DEADLINE_MIN=35` (§9.2), `NATIVELY_RD_EXTRA_REQUESTS=0` (§8.4), `NATIVELY_RD_T=<<ARMING: T>>`, `NATIVELY_FLIGHT_COMMIT=<<ARMING: HEAD>>`. Cleared (a `set` with no value): `NATIVELY_SCENARIOS`, `NATIVELY_EARLIER_QUESTION`, `NATIVELY_VERBAL_HEDGE` (the hedge is ON by default and the guard refuses any value), `NATIVELY_LIVE_MODEL` (any value disables the failover, LEDGER line 51, and fails preflight), and every other name flight-eq clears (the source's list, Task 18 review "Env": the diff of set names leaves only eq's own `NATIVELY_EQ_T`). |
| **Knowledge mode** | ON, persisted `knowledgeMode: true` (read 00:50: True, key only, LEDGER line 67), guarded by `guard-rd.mjs`. The resume is unconfirmed; §4.9 rules how the smoke decides readiness. |
| **Cues** | On the pipeline path, as shipped; no flag (SPEC §10). |
| **The flight's arms** | exactly `high, low, captured-high`, in that order (`NATIVELY_FLIGHT_ARMS`, `selectArms`/`flightPlan`, Task 13): untagged `ANSWER_MODELS` arms and the chains pass are skipped; `toGrade` = in-app + the three arms (4 files). §7.3 says which are graded and how. |
| **Launcher chain** (`launch-rd.cmd`) | folder, wav, roster and `appStop` checks → env block → commit check (40 hex) → committed-texts sha lines (`rd-sha-lines.mjs`) → `wav:check` (live40) → router dist proofs 1 (`rd-proofs.mjs`: cue build, router markers, sha256 of `LiveRouterSession.js`, `routerArbiter.js`, `routeReader.js`) → `guard-rd.mjs --require-precheck` → the flight → router dist proofs 2 (the three sha256 must equal the before values, bounded at the `DIST AFTER` banner, Task 18 M1; a difference exits 3 and the hour is **VOID**: the dist that flew is not the proven build). Error log `%TEMP%\natively-rd-launcher-error.log` must not exist at arming. |
| **Guard** (`guard-rd.mjs`, flight-eq checks 2–4, 6, 6b, 7–9, 10a, 10b, 11–13, g2, g4, g5 kept; e1/e2/g1/g3/(1) replaced) | r1 roster live40 = 47; r2 flag exactly `1` and the BUILT `main.js` holds the `[Router] flag` line; r3 dist holds `ROUTER_SHAS_OK`, `gemini-3.8-live` and both sha constants, no router dist file older than its source; r4 `NATIVELY_EARLIER_QUESTION` unset; r5 arms exactly `high,low,captured-high` and the BUILT `selectArms` returns that order; r6 `LAB\RESULT-smoke.md` holds `context_sha12=<env value>`; r7 a fresh ledger read with headroom ≥ 224 on 3.5-lite and ≥ 90 on 3.1-lite, `complete=yes`, extra requests added (§8); g4/g5 the T rules of §9.1 (Task 18 fix2–fix4). **The g4 clock check (`g4-clock`) runs LAST**, after 10a, so a dry twin run before T's window proves every other check; a window-only failure ends with `GUARD FAILED: (g4-clock) …` and `WINDOW ONLY`, **exits 10, and the dry launcher writes no error log for it** (fix4; an error log would make the T−6 precheck disable the flight). Ruling K1: a pre-arming dry twin is judged on BOTH ending lines (`g4-clock` + `WINDOW ONLY`); the precheck still needs exit 0. `write-arming-rd.mjs` refuses while the error log exists; `register-rd.ps1` asserts UTC+3. Calibrated by breaking each premise once (`guard-rd-cal.txt`: 237/237, 61 mutants at fix3; fix4 APPROVE). |
| **Precheck split (PLAN Task 13, stated here for the re-check to accept or reject)** | SPEC §10 asks at T−6 for `[Router] session up`, the registered `block_sha12`/`instruction_sha12`, the smoke's `context_sha12`, the ear on 3.1 and both sessions up together. Those sessions exist only after `auto()` starts the app, after T, and flight-eq's T−6 precheck requires that NO Electron runs. **So:** the T−6 scheduled precheck (`rd-precheck.ps1`) keeps flight-eq's machine and task gates; the **session gates run in `auto()`'s preflight** (`routerPreflight`: a `session up`; the last `session connect` with `block_sha12=e11c240063ea instruction_sha12=e29bf3810128 context_sha12=<env>` and `context_chars>0`; the last `Live Mode status:` `connected`; no router `session close` after the last `up`; no `[Router] ear failover from=` line (WBR m-5 fix: the `disabled` line does not match); the last `[Router] ear model=` = `gemini-3.1-flash-live-preview`), and are **re-read right before `appPass()`** after the §7.2 wait. A failure takes the existing "not ready → retry until the deadline → The hour was NOT spent" path. |
| **MAIN frozen; the machine** | from the registered commit to the end of the arms: no vitest/tsc/build/npm, no other `Natively-*` task, no orphaned `tail.exe`, port 5180 free, AC power, the user logged on, **a quiet machine** (system audio hears everything) from T−15 to the end of playback, told to the user before arming. |

---

## 3. Roster, labels, audio

- **Items:** `SP\live40\items.json` (sha256 `e531772bdc6e9c23…`, SPEC §7.4; the generator refuses any other), 47 items in
  31 chains: **20 EASY, 27 HARD** (E 20, H 11, QF 9, AF 7). `electron/test/golden/live40.questions.mjs` is generated
  from it in chain order. Ruling (LEDGER line 9/18): follow-ups carry `chain = <parent id>`, `level = followup`; mains
  `level = main`; the chain id is the topic; `route` is a separate field (PLAN 1618/1624 superseded).
- **Labels and denominators:** router40's key `SP\router40\keyhold\key.json` (sha16 `42e1b04f1f60283f`), carried into
  `items.json` `route`; two blind Opus classifiers agreed 47/47 (SPEC §10).
- **Audio:** one continuous `live40.wav` built by `interview60.build-audio-local.mjs` from the 47 clips (24 kHz mono
  16-bit, each clip's PCM sha12 equal to `manifest.json`'s), expected SUSPECT lines RE11 1.57 w/s and EF06 1.58 w/s.
  Length with the 20 000 ms gap: 218 s of clips + 47 × 20 s = **19.3 min** (LEDGER line 9 M1; SPEC's 19.6 is corrected).
- **The gap: 20 000 ms, unchanged.** Measured (PLAN Task 17 item 7, `LAB\build\gap-check.mjs`, self-test PASS): on
  smoke 2 and on smoke 3, 49 dispatches, 49 pipeline answer ends, **0 overruns** (every pipeline answer ended before the
  next dispatch). So no raise, no regeneration and no wav rebuild. **The run flies the same `live40.wav` the smoke flew**
  (sha256/12 `F6DF5D53E8D8`, `wav:check` PASS 47 items after the asset copy); I9 does not apply. Smoke 3's playback
  lasted 19 min 18.5 s (22:42:41.009Z → 23:01:59.498Z, launcher log), matching 19.3 min.
- **Item mapping:** by play window, `OFFSET_MS` 1150 (timelines stamp `startedMs` ~1.15 s early); a line with `q_at`
  before the first window is the probe's; after `endedMs` the harness rule applies (no upper bound, as `routerCapture.mjs`
  `idFor`; LEDGER line 46).

---

## 4. Binding definitions (each is what the app, the run reader and the scorer apply)

### 4.1 First word — I-1, a dated clarification made before data (2026-10-07 00:4x, LEDGER line 63; WBR I-1)
SPEC §4.2 defines "First word: the first token". **Clarified:** the first word is **the first whitespace token whose
letters-only form (lowercase, every character outside ASCII `a`–`z` removed) is non-empty.** Letterless tokens before
it (`"`, `-`, `...`, `1.`, non-ASCII-only tokens) are skipped. It is complete once whitespace follows it or the turn
has ended. **Why:** with the literal SPEC reading, `" hard` or `... hard hard …` put a routing token on screen while
the reader's Safety check saw no hard first word (WBR I-1, observed on a bundle of the arbiter). The clarification
**tightens Safety**; it can only route some punctuation-led answers differently. **The app (`routeReader.ts`, wb-fix-a
`4757002`) and the run reader (`router-hour-read.mjs` `hardFirst`, wb-fix-b) use the same rule**: parity checked on 26
strings, 0 disagreements (LEDGER, whole-branch re-check READY); the router40 replay stays 20 shown / 27 pipeline.
Hard word, clean hard, words: as SPEC §4.2.

### 4.2 Markers — two sets (I6, the controller's ruling; Task 9 ruling, LEDGER lines 6, 8)
- **Live-shown text** (`[RouterAnswer] kind=live`): SPEC §4.2's router set, `<`, `>`, `[`, `]`, `/__\S+?__/`. Broader
  than the pipeline set (the safe direction). **Stated as the Task 4 carry requires:** a Live answer that mentions
  `__init__`, `x[i]` or `a<b` reads `marker`: its display stops at the token that carries it and the pipeline answer is
  appended (or, if already invalid at V, row 4: Live is never shown). `hasMarker`, `checkCompleted` and
  `showablePrefix` are never applied to pipeline text.
- **Pipeline-shown text** (`[Answer] full:` on shown=pipeline turns, and `kind=appended`): an unknown **uppercase**
  marker `__[A-Z][A-Z0-9_]*__` other than `__MORE__` and `__CUES__` (the lowercase `__model_source:…__` sentinel cannot
  match), and a **bare routing token** (the whole shown text, letters-only, matches `^(hard)+$`). `<`, `>`, `[`, `]`
  are **not** markers in pipeline text. SPEC §7.1's `[A-Za-z][A-Za-z0-9_]*` is superseded by the uppercase-only ruling
  (all observed leaks were uppercase; cost if wrong: a lowercase invented marker would leak, none observed).

### 4.3 Timing fields
- `live_first_ms` = V − Q on shown=live turns (first visible text), W − Q otherwise, `-` with no router turn (SPEC §4.3).
- `shadow=` is measured **from the dispatch**, not from the request send (M2; dispatch → `generateStream` is 5 ms p50,
  DIAG Q2).
- `q_src` = `vad` or `final`. When `speechEnd()` is null, Q falls back to the dispatch time and reads `final`
  (WBR m-7, accepted, rare): such turns understate Speed; the reader's split by `q_src` shows them.
- `q_at` (plan choice) is appended to decision lines so lines map to play windows.

### 4.4 Speed p50
The **usual median**: the middle value for odd n, the mean of the two middle values for even n (LEDGER line 46, I3
ruling); other percentiles are nearest-rank. Taken over every in-hour decision line with `shown=live` (appended turns
included), of `live_first_ms`.

### 4.5 EASY caught (Routing bar)
An EASY item whose **first decision** in the hour (by Q) reads `shown=live` (LEDGER line 29; cost if wrong: a doubled
EASY item counts on its first turn only). The any-decision count is printed as information only.

### 4.6 HARD misrouted (Routing bar)
A HARD item **any** of whose in-hour decision lines has a deciding router turn whose first word was not a hard word
(route ≠ `hard`), shown or not (SPEC §10.2 [choice], stricter). Decisions with no deciding router turn (`late`,
`no-router-turn`, `unpaired`, `router-down`) are not misrouted and are reported (M2). The first-decision count is
printed as information.

### 4.7 Decision-line conventions (plan choices, PLAN Task 5 items 16–17)
- The **dispatch line** `[Router] dispatch turn=<id> at=<ms> q_at=<ms> q_src=<…> router=<…> ear=<…>` is written at
  `turnDispatched`; the reader needs it for "dispatched turns with no decision line".
- `dup` and `unpaired` lines carry **`shown=-`**, so the reader never counts them as decisions.
- Decision lines carry trailing `q_at=`, `sent=<n>` and `superseded=yes|no`; parsers tolerate trailing fields.
- `[Router] superseded turn=<n> phase=<streaming|done> line_written=<yes|no>` is **authoritative** for a supersede of a
  shown=live turn (task-5-fix3). A supersede before the Live decision (pending mode) is never logged and not counted.
  A superseded shown=live turn's decision line may still read `route=easy-answer` (Task 5 ruling, LEDGER line 27).

### 4.8 Router down time (the VOID input)
Minutes within the run window [`startedMs`, `endedMs`] during which the router state is down, inferred from
`[Router] session up` and `[Router] session close … stale=no` lines; a router never seen up before `startedMs` counts as
down from the start (`router-hour-read.mjs` §3). Closes are counted by `stale=no`, quota closes apart (`quota=yes`,
Task 2 carry).

### 4.9 Knowledge mode and CONTEXT readiness (I7)
`knowledgeMode` reads `True` in the app settings (checked 00:50, key only). The user is asleep and could not confirm
that a resume is loaded. **Rule, fixed now:** `context_chars > 0` on the smoke's `[Router] session connect` lines
counts as proof that the profile summary exists. **`context_chars = 0` means NOT READY:** the registration is not
sealed and the flight does not arm (the plan's preflight gate; `routerPreflight` also requires `context_chars>0`).
SPEC §4.1a's empty case (an empty CONTEXT is legal in the app) is therefore not accepted for this run. **Smoke values:
`context_sha12 = b2a43a2159a2`, `context_chars = 266`** — READY. Smoke 3 had one router connect (no reconnect), so
"equal on every connect" holds trivially; smoke 2 logged the same pair, so it is stable across app sessions. Stability
across a reconnect inside one session was proven only by the Task 3 probe (on its fixture context). The run's preflight
gates on this sha (`NATIVELY_ROUTER_CONTEXT_SHA12=b2a43a2159a2`) and guard r6 checks it against `RESULT-smoke.md`.

---

## 5. The bars (SPEC §10.2, verbatim)

| bar | rule | read by |
|--|--|--|
| **Safety (decisive)** | 0 garbled or routing-token text shown (no hard first word, no marker), AND 0 wrong Live answers shown (graded as shown) | run reader + grades |
| Fallback | every Live failure caught: no row-4 turn shows Live; every failure after V has its "(full answer)"; 0 dispatched turns with nothing shown | run reader |
| Quality (the in-run shadow) | acceptable(Live shown) ≥ acceptable(shadow, same items) − 1 | grades |
| Speed | first visible text (`live_first_ms` = V − Q) p50 ≤ 2500 ms on shown=live | run reader |
| Routing | EASY caught ≥ 13/20; HARD misrouted ≤ 1 of 27 | run reader + router40 labels |
| No regression (absolute gate) | 0 wrong pipeline answers shown on the 27 HARD items (follow-ups included; appends count) | grades |

**How each is read (registration, not a change of the bar):**
- **Safety, text half:** `router-hour-read.mjs` `SAFETY live: hard-first=<n> router-marker=<n>` and
  `SAFETY pipeline: unknown-marker=<n> bare-routing-token=<n>`, all four 0 (§4.1, §4.2). **Safety, wrong-answer half:**
  every **L** answer in the blind export (every Live-shown turn, any class, superseded and `sEmpty` turns included) is
  not consensus-wrong (§7.2).
- **Fallback:** the reader's `BAR Fallback` (missing appended = 0, unflagged live failures = 0, row-4 with a live
  capture = 0, `sent=0` = 0, shown=pipeline with no pipeline token = 0).
- **Quality:** §7.4.
- **Speed:** §4.4, on the reader's `BAR Speed`. Reported beside it, not gated: the shadow's first-token p50/p90 by
  `q_src`, router40's L TTFT p50 4.43 s, the eq hour's diag median 4899 ms (both from request send, SPEC §10.2).
- **Routing:** §4.5, §4.6, on the reader's `BAR Routing`.
- **No regression:** §7.3.
- **Integrity [registration choice]:** the reader's integrity counts (dispatched turns with no decision line, decision
  lines without a dispatch, duplicate decision/dispatch lines, unparsed lines, decisions without `q_at`, capture
  MISMATCH, capture-file MISMATCH, superseded record defects) must all be 0. SPEC §5 requires these to be 0 but names
  no bar; a non-zero count means a bar cannot be read on that turn, so the run is **INCONCLUSIVE** (SPEC §11 "anything
  else") unless a Safety FAIL is already established on the data that can be read. A dup decision or dispatch line or
  a dropped malformed line fails integrity (LEDGER line 46).

---

## 6. Verdict (SPEC §11, verbatim) and the folder rules

### 6.1 Verbatim
- **VOID** (checked first; the re-fly is not spent) if either:
  - the router session failed (`[Router] session failed`) before the 10th dispatch;
  - router down time was over the registration's limit.
- **PASS** (every bar met): the flag defaults ON, in its own reviewed commit; `NATIVELY_LIVE_ROUTER=0` then turns it
  off.
- **Safety FAIL:** the router stays behind the flag, default OFF.
- **Anything else:** INCONCLUSIVE, with one re-fly.
- **A second INCONCLUSIVE has no automatic outcome.** The controller reports, and the user rules.

### 6.2 The router-down limit (I7): **2.0 minutes** (VOID when the down time is strictly greater)
Reasoning, from SPEC:
- **What VOID is for** (SPEC §11, §14 "A router quota wall never reaches `session failed`. It shows up only as router
  down time, which the registration's down-time limit voids"): a run whose router was absent long enough that the run
  did not test it. Ordinary reconnects must not void it.
- **Ordinary down time is seconds.** A reconnect is up to 3 quick attempts at 300 ms × n plus setup (the probe measured
  `setup_ms` 742 and 624, CHECKPOINTS 21:45); SPEC §7.3 puts a `goAway` gap at 0.5–1 s. Even ten reconnects in 19.3 min
  sum to well under 30 s.
- **A quota wall is minutes.** Quota closes back off 5, 10, 20, 40, 60 s (SPEC §4.1): 75 s after four failed retries,
  135 s after five. A 2.0-min limit tolerates a short quota blip (up to the fourth step) and voids a sustained wall.
- **Bounded cost to the bars.** The run plays one item every ~24.6 s (19.3 min / 47), so 2 min covers at most ~5 item
  slots, ~2 of them EASY at live40's share (20/47). The Routing bar's slack is 7 EASY (13 of 20), and router40's replay
  lost 1 EASY (RE09) to the model; so down time under the limit cannot alone decide the Routing bar, and a run under the
  limit is read on its merits (a Routing shortfall is then INCONCLUSIVE, not VOID).
- Applied as `node router-hour-read.mjs <run> --down-limit-min 2 --root <MAIN>`.
- An ear failover is logged and reported only; it never voids the run (SPEC §4.4).

### 6.3 Retry, the graded folder, the re-fly
- **A retry is not a re-fly.** When an attempt ends "The hour was NOT spent" (preflight not ready by the deadline, the
  §7.2 probe wait over its 120 s cap, the router gates failing before `appPass()`), or when a run is VOID, it may be
  flown again **under this file and the same label `router-default-r1`**, with a dated retry note in §12, after a fresh
  arming (§9, §8 re-read). The graded folder is the first non-VOID one (§2).
- **The re-fly after an INCONCLUSIVE** gets a new label `router-default-r2` and a new blind seed
  `blind:router-default:r2` (14A carry): a dated amendment changes `REGISTERED_RUN_LABEL` and `SEED` in
  `build-blind-rd.mjs`, `cal-build-blind-rd.mjs` is re-run, and the launcher is regenerated with the new label.
- **A Safety breach seen in a VOID run** does not change the verdict (SPEC §11 order) but is reported in the result note
  and diagnosed before any retry.

---

## 7. Grading

### 7.1 The grader (SPEC §10)
Pinned to `claude-opus-5-5` (`--model claude-opus-5-5`), memory-clean (`--setting-sources project,local`; live-proven
2026-10-06), in flight-eq's grader command form (`SP\flight-eq\launch-grader-eq.mjs` `FLAGS`: `-p`, `--output-format
json`, `--permission-mode dontAsk`, `--tools Read,Write,Edit`, `--strict-mcp-config`, `--setting-sources
project,local`, per-file `--allowed-tools` rules, a fresh cwd outside the project), its `--pairs <file> --verdicts
<file>` mode for single files. One alias probe before any grader; memory ABSENT checked on every transcript; the model
read from every transcript and named in the result. **The grader launcher is `LAB\grade\launch-grader-rd.mjs`**
(flight-eq's argv: `--model <id>`, `--setting-sources project,local`, `--strict-mcp-config`, `--tools
Read,Write,Edit`, dontAsk, three per-file allow rules, no add-dir, a fresh cwd, at most 2 at once), with the dispatch
text `LAB\grade\rd-grader-dispatch.txt` (its template region equals h40d's byte for byte; only the template is sent).
Probes 1–2 are pinned, probe 3 is the alias read; every probe transcript is re-read for memory, tools and model.
**The pin is enforced (grading-tools review I-1 fix):** the launcher refuses any grader or probe 1–2 model id other
than `claude-opus-5-5`, and the scorer checks every recorded grader model against the pin and prints the distinct
grader models per file. sha256 in §10 (Opus-APPROVED after the fix round). No past hour is re-graded.

**Grade definitions (SPEC §10, router40's score):** **acceptable** = both graders give correctness 2 AND on-topic 2
(delivery not used); **wrong** = either grader gives correctness 0; no answer = not acceptable.

### 7.2 What is graded, in which file, by how many graders [registration choice where SPEC is silent]
| file | content | graders | feeds |
|--|--|--|--|
| blind `pairs.blind-1..4.json` (`build-blind-rd.mjs`, Task 14A) | every Live-shown turn's L; its S (hidden shadow, same turn); appended text once as S+A; A alone | **2 each** (router40 form; SPEC's "both/either graders") | Safety wrong-half, Quality, No regression (A) |
| in-app `interview60.judge.pairs.json` | every dispatch's first `[Answer] full:` | **2** (it feeds an absolute gate) | No regression (shown=pipeline turns only, §7.3), reported otherwise |
| `high` (bare 3.5-lite HIGH), `low` (bare 3.1-lite LOW) | **the 31 mains only** (§7.5) | 1 each | reported (the user's rule 2026-10-02: grade the bare arms) |
| `captured-high` | the run's captured pipeline prompts re-sent once to 3.5-lite HIGH | 1 | reported only (SPEC §10.1 [choice]) |
| router40's L arm | bare 3.1-lite LOW, 43/47 acceptable, 0 wrong (`RESULT-router40.md`), existing grades | — | reported beside the run, never gated |

### 7.3 I-2: the in-app arm is graded only on `shown=pipeline` turns (WBR I-2, LEDGER line 63)
With the flag on, `[Answer] full:` logs what entered the history, so on shown=live turns it carries the Live text, and
on appended turns the first such line is the cut Live text (`interview60.judge.mjs:102` pairs each dispatch with the
first full line). **Therefore:**
- The scorer joins each in-app pair to its turn through the `[Router] dispatch turn=<id> at=<ms>` line of the same
  dispatch, and **uses the in-app grade only where that turn's decision line reads `shown=pipeline`** (rows 1–4). On
  shown=live turns the in-app grade is ignored by every bar (it is the Live text, graded blind as L).
- **Appended pipeline answers** (the "(full answer)") are graded from the capture files through the blind export
  (Task 14A): `router-shadow.json` entries with `appended: true`, exported once as `arms: ['S','A']`.
- **Live answers** come from `router-live.json` (arm L).
- The judge note (PLAN Task 19 rev 2): on appended turns the in-app arm reads the first `[Answer] full:` (the Live
  text); that grade is not used; the appended answer is graded from the capture file.
- **Superseded shown=live turns [registration choice, made in pass 1; behaviour stated as the scorer implements it,
  grading-tools review m-2 and the narrowed ruling 4].** On such a turn the replacing pipeline stream WAS shown (SPEC
  §4.5 case E), but the blind export carries the turn as L alone and its decision line reads `shown=live`. Rule: for
  every in-hour turn named by a `[Router] superseded` line, the replacing answer is graded from the in-app export and
  counts as a pipeline answer shown:
  - **phase=streaming:** the Live text never enters the history (`routerArbiter.ts:362-366`), so the first
    `[Answer] full:` after that dispatch IS the replacing text; the judge claims it and the scorer grades it.
  - **phase=done:** the history holds the Live text first (WBR m-8). The replacing text is graded where the in-app
    export pairs it with its own dispatch (a `[Main] dispatch: supersede`). **Only a phase=done supersede on a HARD item
    whose replacing text has no gradeable pair is UNREADABLE**, which caps the verdict at INCONCLUSIVE.
  - Only in-hour turns count (review m-1: a probe-turn supersede is ignored); a text-matched pair joined to a turn other
    than the superseded one is treated as unreadable, never as graded.
  - Neither smoke reached a supersede (smoke 3: `superseded_turns=0`), so this rule is exercised only on synthetic logs.
- **The I-2 join (as built):** each in-app pair's `[Main] dispatch: answer` (exact ms, exactly one) → the first
  `[Router] dispatch` before the next answer line (`main.ts:2170-2190` logs one, then calls `routerWiring.answered()`).
- **Unclaimed pipeline turns (controller ruling 5):** an in-hour `shown=pipeline` turn that no in-app pair claims cannot
  be proven not wrong. On a **HARD** item, or one that cannot be mapped to an item, it is UNREADABLE and **caps the
  verdict at INCONCLUSIVE**; on an **EASY** item it is a WARNING only (cost if wrong: one lost judge pairing makes the
  run inconclusive).
- **No regression is computed on:** HARD items' in-app grades on `shown=pipeline` turns + HARD items' A grades
  (appended) + HARD items' replacing answers on superseded turns. Every one of them must be not wrong. **An in-app pair
  is HARD if EITHER mapping says so** (grading-tools review I-3): the judge's anchor-overlap item (`pr.id`) or the
  reader's play-window item (`dec.item`); an unmappable `dec.item` counts as HARD. The scorer prints how many pairs'
  two mappings disagree. Pipeline answers shown on EASY items (rows 1–4, appends) are reported, not gated.

### 7.4 Quality pairing (14A carries)
- **The unit is the turn pair.** Every Live-shown turn yields one pair (L, S) **by turn**, never joined across turns.
  **For an id with more than one Live-shown turn, every Live-shown turn is graded and each pairs with its own turn's
  S** (the key's `turn` and `rank`). Both sides of the bar count the same set of pairs:
  acceptable(L over the pairs) ≥ acceptable(S over the same pairs) − 1. The number of ids with more than one Live turn
  is printed.
- **Out of Quality, in Safety:** turns with `sEmpty` (the pipeline aborted or failed before a token), `superseded`
  turns, and Live turns with no pipeline answer at all. They are exported as L alone, key-marked; their L is graded for
  Safety, and they are left out of both sides of the Quality bar.
- On appended turns the pair is L against the appended pipeline text (SPEC §5's last bullet).
- **The scorer reads the key's `arms` list** (`['L']`, `['S']`, `['S','A']`, `['A']`), not a single `arm` field: one
  grade of an `['S','A']` answer counts for S in Quality and for A in No regression.

### 7.5 Bare arms answer the 31 mains only
`interview60.answers.mjs:302` drops follow-ups for uncaptured arms, as on every past flight (LEDGER line 18, the
corrected ruling; cost if wrong: no bare comparison on the 16 follow-ups, reported-only arms). Follow-ups are covered by
`captured-high` and the in-app arm. SPEC §10.1's 47 per bare arm is corrected to 31 (§8).

### 7.6 Known limits of the blind export
- **R1:** a single-answer item (L alone: `sEmpty`, superseded, or no pipeline answer; A alone) reveals its arm to the
  grader; the run's count of such items is printed by the export.
- **M3:** answer length partly reveals the arm: L is at most 80 words, pipeline answers run longer.
- **M2 (inherited from r40):** files with equal entry counts get the same permutation (a fresh stream per file);
  not exploitable without the code.
- The identical-S/A tell is removed (`['S','A']` emitted once).

### 7.7 The scorer
**`LAB\grade\score-rd.mjs`** (built after pass 1; cal 129/129, 40 mutants, at sha256 `0d581bfe…` before the review
fixes; after the fix round it is Opus-APPROVED, and its final sha256 and calibration output are in §10). It is
Opus-reviewed **before grading starts**; its rules are the ones in this file and it may not change them. As registered:
- **Verdict order** = §6.1: VOID first → SAFETY FAIL (beats integrity and grading problems) → PASS (the 6 bars + the 9
  integrity counts + no gating grading problem) → INCONCLUSIVE.
- **wrong = EITHER grader gives correctness 0** (controller ruling 1; the registered definition; cost if wrong: one
  harsh grader can fail Safety or No regression). acceptable = both graders correctness 2 and on-topic 2.
- **Zero Quality pairs = the bar is not met** (UNREADABLE → not PASS; ruling 6). An ungraded side is UNREADABLE.
- **The scorer runs the reader itself:** `router-hour-read.mjs <run> --down-limit-min 2 --root <MAIN>`, and prints the
  reader's sha12 (review I-2 fix: a reader output passed in by hand could carry another limit or another run). The
  session-failed floor must read 10 and the routing denominators 20 / 27 (m-4).
- **Grades are hash-bound to their exports** (review I-4 fix): the launcher records `pairsSha12` and, after the attempt,
  `verdictsSha12`; for the last record of each slot the scorer requires `pairsSha12` = sha12 of the current pairs file
  and `verdictsSha12` = sha12 of the verdicts file it reads. A verdicts file moved across tags, or a pairs file
  re-exported after grading, is refused. It also refuses a capture, roster or judge sha256 that differs from the export's
  build record, a pairs file whose key set differs from the key, and a grader record that is not memory-ABSENT or not
  pinned; the launcher version and tools are part of provenance (m-3).
- Unclaimed pipeline turns, superseded turns and the HARD mapping: §7.3.

### 7.8 Post-hoc diagnostic (user, 2026-10-07 ~02:00; never changes the verdict)
After the flight and its grading, the most failed, weak or wrong answers are re-run on 3.8 Flash to separate a pipeline
defect from a model ceiling: per item, A = the captured app prompt on 3.8 Flash, B = a clean prompt with the true roster
question (plus the parent for follow-ups); blind Opus grading, same rubric, memory-clean; full-Flash budget 20
requests/day → up to ~10 items, wrong first, then the weakest. Reported only.

---

## 8. Quota (SPEC §10.1, recomputed)

### 8.1 The quota day and the ruling on one quota day
The smoke and the run (with its arms) fall in **one quota day** (user ruling 2026-10-07 00:48, §9.1). The ledger
(`SP\quota-ledger-today.mjs`) derives the reset as the latest 07:00Z at or before now (known-answer cal: 06:59:59Z →
`2026-10-06T07:00:00.000Z`, 07:00:00Z → `2026-10-07T07:00:00.000Z`; 07:00:00Z belongs to the new day). It counts **one
line per request sent** (fix1: `verbal hedge: front=` = one 3.5-lite request; `verbal hedge: back started at` = one
3.1-lite request; `<model> warmed up in` / `warmup failed` = one request), calibrated on the preserved eq-hour logs to
spec's 42 / 11 (43 / 18 with warm-ups), with the old line-count rule (394 / 131) a caught mutant. It reads `.log` and
`.log.1` in MAIN and both live-router worktrees and prints `complete=no` when a location's quota-day lines may have
rotated out.

**Ledger fix in progress (ledger-fix5):** every app start rotates the debug log, so after the smoke attempts the
quota day's first lines left `.log`/`.log.1` and the ledger read `complete=no` (counts right, day start rotated out).
The fix also reads the **run folders' `natively_debug.log` copies** and dedupes by line identity. Its sha256 and
calibration are in §10 and A5; the arming gate requires `complete=yes` from the fixed ledger.

### 8.2 Expected use (pass-1 estimate, kept as the record; §8.2a is the measured read)
| piece | 3.5-lite | 3.1-lite | source |
|--|--|--|--|
| live probe (Task 3) | 0 | 0 | 3.8 Live only |
| smoke, whole wav (47 items + probe + warm-ups) | ≈ 54 | ≈ 14 | PLAN Task 17 |
| the run: 47 dispatches + probe 2 + warm-up/ping ~3 | ≈ 55 | ≈ 13 | SPEC §10.1 hedge ratios (1.05 fronts, 0.27 backs per item) |
| bare `high` | **31** | 0 | §7.5 (SPEC said 47) |
| bare `low` | 0 | **31** | §7.5 |
| `captured-high` | ≈ 47–49 (the run's captured prompts, probe prompts possibly included) | 0 | SPEC §10.1 |
| **need from arming to the end of the arms** | **≈ 135** | **≈ 44** | |

### 8.2a Measured (pass 2)
- Quota day: 2026-10-06T07:00Z → 2026-10-07T07:00Z (10:00 → 10:00 TST). The run at T ≈ 03:15–03:45 TST (00:15–00:45Z)
  and its arms fall in it, as do all three smoke attempts (§9.1's one-quota-day rule holds on the before-10:00 side).
- Ledger reads: 21:55Z `used35=0 used31=0` (before any smoke); 22:37Z `used35=50 used31=3` (after smoke 2); **23:03Z
  `used35=100 used31=10`**, read before smoke 3 had finished adding its share (smoke 3 ended 23:02Z; `complete=no`, see
  §8.1). So one whole-wav smoke cost about 50 on 3.5-lite and 3–7 on 3.1-lite, in line with PLAN's ≈ 54 / ≈ 14.
- **Need vs headroom on the 23:03Z read:** headroom 400 on 3.5-lite and 490 on 3.1-lite, against the gate of ≥ 224 and
  ≥ 90 (need 149 / 60 × 1.5) — met with 176 and 400 to spare. Against the recomputed need (≈ 135 / ≈ 44), the run and
  arms would bring use to ≈ 235 / ≈ 54 of 500.
- **Final ledger read before the commit** (A4 (a); the fixed ledger, sha256 in §10):
  `LEDGER-SUMMARY reset=2026-10-06T07:00:00.000Z now=2026-10-06T23:21:52.763Z cap=500 used35=100 used31=10 extra=0 headroom35=400 headroom31=490 complete=yes`
  → headroom 400 ≥ 224 on 3.5-lite and 490 ≥ 90 on 3.1-lite: the gate is met. The arming record carries its own fresh
  read (≤ 30 min old, A4 (b)).

### 8.3 The arming gate
- **Need constants stay `NEED_35 = 149`, `NEED_31 = 60`** in `guard-rd.mjs` and `write-arming-rd.mjs` (SPEC's 47-per-
  bare-arm figures). They exceed the recomputed ≈ 135 / ≈ 44, so the gate errs strict; no guard edit and no re-cal.
  Margin 1.5 → **headroom ≥ 224 on 3.5-lite and ≥ 90 on 3.1-lite**, cap 500 per lite model. If the ledger-based
  recomputation (P5) ever exceeds 149 / 60, the constants are raised by amendment and `guard-rd-cal` /
  `write-arming-rd-cal` re-run.
- The arming record carries a fresh `LEDGER-SUMMARY` line, ≤ 30 min old, not future-dated, `extra=<n>`,
  `complete=yes`; the guard re-reads the ledger at the dry twin, at T−6 and at T.
- The recomputed table at arming: §8.2a.
- Arm requests that land after the quota-day end count on the next day; the reader records that, and it is not an error.
- Full Flash (20/day) is used by nothing in the run, its arms or its grading; only the post-hoc diagnostic (§7.8) uses
  it, after the verdict. The two Live sessions bill Live quota, which the ledger does not count;
  the precheck, the smoke and the VOID rule are its only checks (SPEC §14).

### 8.4 `--extra-requests` (`NATIVELY_RD_EXTRA_REQUESTS`, Task 18 carry)
Lite requests made by scripts appear in no app log. The value is taken **from the smoke and probe records**:
**`NATIVELY_RD_EXTRA_REQUESTS = 0`**, and it stays 0 unless a script makes lite model calls on this quota day before
arming (none known: the smokes ran through the app and are in its logs; no bench, replay or arm run since the reset).
The live probe (Task 3, CHECKPOINTS 21:45 TST = 18:45Z on 2026-10-06) made **0 lite requests** (3.8 Live only), so it
adds 0 wherever it falls; note that 18:45Z is AFTER this quota day's reset (2026-10-06T07:00Z), so it is inside this
quota day, not before it (a correction of the coordinator's note; the value is unchanged). It is charged to both models
(conservative). The
launcher's value and the arming body's `extra=` are compared **by hand at arming** (N3: `write-arming-rd.mjs` does not
compare them; the gate itself holds because r7 re-reads with the launcher's value).

### 8.5 Unmarked 3.1-lite paths (Task 18 N1), named
These can send to 3.1-lite in this configuration without a ledger marker:
- **CODING intent:** `WhatToAnswerLLM.ts:288` → `streamChat` → `LLMHelper.ts:2736`, a plain `streamWithGeminiModel`;
- **structured generation:** `generateContentStructured`'s 3.1-lite fallback after 3.1-pro (`LLMHelper.ts:1422-1440`,
  `withRetry`), reached through company research and the negotiation path;
- **meeting summary:** the Gemini fallback (`LLMHelper.ts` 4387+, up to 3 attempts), only after Groq fails;
- off the configured path: Gemma tier-2 (3225) and the Groq mode-specific fallback (4157).
Size: the eq hour routed 42/42 VERBAL-TECHNICAL with 0 such lines; live40 has 0 salary/negotiation items. The result
note reports `route: CODING` from `verbal-diag.log`.

### 8.6 App-session limit before T (Task 18 N2)
`complete=no` blocks arming when the quota day's first lines rotated out: every app start renames the log to `.1` and
deletes the older `.1`. **Rule: at most two app sessions per location (MAIN, each worktree) on the run's quota day
before T** (the smoke counts as one). The smoke runs from MAIN. Recovery if exceeded: the run folders' `natively_debug.log`
copies hold the lost lines; the count is then added through `--extra-requests` by a dated note.
**Pass 2:** smokes 2 and 3 each started the app in MAIN (attempt 1 exited before the app), so MAIN already holds two app
sessions on this quota day, and the ledger already read `complete=no` (§8.1: its oldest MAIN log generation starts after
the reset). The two-session rule alone therefore does not give `complete=yes`; arming relies on **ledger-fix5**, which
reads the two smoke run folders' log copies (`2026-10-06T22-25-42-router-smoke`, `2026-10-06T23-01-59-router-smoke`) and
dedupes by line identity; no `--extra-requests` adjustment is used for them. No further app session in MAIN before T.

### 8.7 The router in suggest mode bills quota (Task 10 m1)
The router session runs whenever the ear runs (SPEC §4.1's letter), so a suggest-mode meeting bills 3.8 Live quota for
turns it never dispatches. **This run is `auto`; it is not affected.** A follow-up before any default-ON commit: start
the router only in `auto`.

---

## 9. Timing

### 9.1 The timing ruling (user, 2026-10-07 00:48; LEDGER line 65)
- **The flight flies as early as possible once arming is green.** T is filled at arming (P6), not now. The SPEC §1
  schedule (T = 08:00, go/no-go 05:30, fallback 23:00) and PLAN Task 18's fixed guard windows (07:30–08:30,
  22:30–03:00) are superseded by this ruling.
- **The smoke and the flight must fall in one quota day:** both ending before 10:00 TST, or both entirely after it.
  Read literally (and so registered): if the smoke ran before 10:00 and the run with its playback cannot end before
  10:00 (§9.2's 09:45 line), the run does not fly on that smoke; it flies after 10:00 only after a smoke in the new
  quota day. [The re-check should confirm this reading with the controller.] **Pass 2:** all three smoke attempts ran
  on the 2026-10-06T07:00Z quota day (00:58–02:02 TST), and the target T ≈ 03:15–03:45 TST puts the run and its arms
  in the same quota day, ending long before 10:00. The ruling holds on its first branch.
- **T `<<ARMING>>`: the earliest T once arming is green, targeted at about 03:15–03:45 TST** (the coordinator,
  pass 2).
- **Tool rules (Task 18 fix2–fix4, APPROVE; shas P7):** T is derived from `--t`; **T ≥ now + 15 min** at arming;
  **T + 75 min falls inside one quota day**; the launch is accepted in [T−6, T+30]; the arming stamp ≤ T−10; the
  precheck at T−6; the g4 clock check runs last and a window-only failure exits 10 with no error log (§2 Guard row).
  The 75-min rule bounds T, not the real end (F3): §9.2 sizes the probe deadline so the run still ends inside it. On the
  morning side, playback ends by **09:45** (SPEC §1's 15-min margin before the reset).
- On a smoke or checkpoint failure: fix and re-smoke; fly only on a clean re-smoke; stop if the cause is unclear or a
  spec change is needed (user, 00:48).

### 9.2 `I60_PROBE_DEADLINE_MIN` = **35**
The deadline is counted from `auto()`'s start of waiting, after the build and app start (`interview60.run.mjs:569`;
harness default 45, which this run never uses); a probe attempt may still start just before it. The pass-1 formula
left out the time from a READY attempt to playback and the task's start slack (Task 18 fix2 review F3: "the 75-min
rule bounds T, not the real end"); pass 2 adds both. Terms, each measured where it can be (smoke 3's launcher log
`MAIN\electron\test\golden\interview60.runs\router-smoke.launcher.log`, last run; smoke 2 for comparison):

| term | value used | measured |
|--|--|--|
| `S` start slack (task start after T) | 10 min | Task 18 F3 carry (T+10) |
| `G` flight-only launcher steps (sha lines, `wav:check`, dist proofs 1, guard) | 3 min | not in the smoke launcher; **checked at arming** on the dry twin's log and written into the arming record; if it exceeds 3 min, the controller stops before arming (A4) |
| `B` build + app start → first probe attempt | 2 min | smoke 3: launcher start 22:40:38.15Z (01:40:38 TST) → `AUTO probe attempt 1` 22:40:48.851Z = **10.7 s** (the dist was current); smoke 2, with a real rebuild: 22:03:41Z → 22:04:33.184Z = 52 s. Rule: max measured rounded up + 1 min |
| `P` one probe attempt + preflight + router gates + the §7.2 wait (cap 2 min) | 4 min | smoke 3: attempt 1 22:40:48.851Z → `APP PASS` 22:42:40.359Z = 111.5 s (probe 66 s to `PREFLIGHT`, then 45 s); bound = ~1.5 min + the 2-min wait cap |
| `L` playback | 19.31 min | smoke 3: 22:42:41.009Z → 23:01:59.498Z = 19 min 18.5 s |
| snapshot and capture files | 1 min | smoke 3: playback end → `SMOKE EXIT` 02:02:02.69 TST, ~3 s plus the report |
| `E − T` | 75 min | T + 75 within one quota day (Task 18 fix2); the quota-day end − 15 min (09:45) does not bind for T ≈ 03:15–03:45 |

**D = floor((E − T) − S − G − B − P − L − 1) = floor(75 − 10 − 3 − 2 − 4 − 19.31 − 1) = floor(35.69) = 35.** The
flight does not arm if a recomputation gives D < 5. If T at arming were late enough that 09:45 binds (T after ~08:30),
E − T is recomputed by a dated amendment; at the targeted T it cannot bind. The arms run after the run and may spill
past the quota-day end (§8.3).

---

## 10. Instruments and their sha256 lines

Copied to MAIN `passes/router-default/` with this file (PLAN Task 19 step 3) and printed by `rd-sha-lines.mjs` at T.
Values copied verbatim from `LAB\build\instrument-shas.md` (computed 2026-10-06T23:21:52.595Z). The grading tools are
Opus-APPROVED after their fix round (`LAB\reviews\grading-tools-review.md`, "## Re-review (after the fix round,
2026-10-07)", SPEC PASS / QUALITY APPROVE, all 8 findings closed); the scorer's path is `LAB\grade\score-rd.mjs`
(settles review m-5). The generated `launch-rd.cmd` / `launch-rd-dry.cmd` embed T and the commit, so they are generated
at arming and their bytes are proven there (A4 (b)); their source and generator are registered here.

| instrument | path | sha256 |
|--|--|--|
| hour reader | SP\router-default\router-hour-read.mjs | `2d17df40226ee8a1ae48243dc39598f6a46c9df84f3dcea48980fe71a2703df3` |
| hour reader calibration output | SP\router-default\router-hour-read.cal.current.txt | `a06ed2f974022bc92ca67063a3b17921527f9143ac413f7f33d926113e685a76` |
| blind export | SP\router-default\build-blind-rd.mjs | `7ac16d7e57fe796caad151832fbdc27d5c0fa3ade6cc2f2b3abbd882b0bc3c0d` |
| blind export calibration output | SP\router-default\cal-build-blind-rd.txt | `8cf9677fdff8594108b1cbeb44c8e9bdbf3124e1d2dd360be68a66ae61b2c322` |
| scorer | SP\router-default\grade\score-rd.mjs | `50e0bc95bfb0a72218b64b5c3c7bd5d3508ab7f2d971e345e45b200682e67746` |
| scorer calibration output | SP\router-default\grade\cal-score-rd.txt | `6f2fd69144cffbc0fbeb1008d09ddfa555077a379190dc91c620729594b032a6` |
| grader launcher | SP\router-default\grade\launch-grader-rd.mjs | `edfef2aa8a98a64862d11e2031e06169d744da521a2ba2b76a5a0c2d1c1c5bd2` |
| grader dispatch text | SP\router-default\grade\rd-grader-dispatch.txt | `ad35cdefdd086dbca3e08ff41672622e586a2de9b119691ba36068e6a5f6d822` |
| grader launcher calibration output | SP\router-default\grade\cal-launch-grader-rd.txt | `50fed1b198e1455d8b32b013e927532febc5e372f981daa9eca21b2b03d60703` |
| live probe | SP\router-default\live-probe.mjs | `4c999ab9c415c76ea441b467cbce65ec980536a9a39d09a2d53c1fbd80593664` |
| smoke launcher | SP\router-default\launch-router-smoke.cmd | `06420625ecdfa997b358854fd07d1f1aff0aa96b7494d9eba8f69074f99e5954` |
| flight launcher source | SP\router-default\flight\launch-rd-src.txt | `7155790525e17cfd495477f1dbb726604f199a6e0dc06a842e847725ed58ea84` |
| launcher generator | SP\router-default\flight\gen-launchers-rd.mjs | `562a16c5c199adaa5d8aca6bcdb99ab7bed97d3c2ac6e1e77c68485a20fb1d5b` |
| guard | SP\router-default\flight\guard-rd.mjs | `869652c723fb09b0d082886dbd3612471ae17559af8bc414b02309567ddc0b57` |
| guard git helper | SP\router-default\flight\guard-rd-git.mjs | `88a52a61395e139e606868f52c72256abd7d3d3959adaafc72af16a78caef403` |
| precheck | SP\router-default\flight\rd-precheck.ps1 | `e08d100108a0f47d4912f6c4879e884f98cb2367b4ec114833e9c80ae8bf26cd` |
| register | SP\router-default\flight\register-rd.ps1 | `f99b3e5c381659b8737b36c6c67be4e177371a1bb8fb60ea94703214988b1f50` |
| write-arming | SP\router-default\flight\write-arming-rd.mjs | `5259379f5c243f3833554821e0b46311be7a12e68a648caa994cefb3c8631432` |
| proofs | SP\router-default\flight\rd-proofs.mjs | `35d24e04db41e08dd700ba0246d112af4cc1dc427075693a83197c979533933a` |
| sha-lines | SP\router-default\flight\rd-sha-lines.mjs | `edc0462fe586c7e1df10ec15c35cfa9d3cc02e306bc1e3bdb6e2bc39c63a053c` |
| night gates (flight-eq's, unchanged, read-only) | SP\flight-eq\night-gates.ps1 | `5e6cd2acaed4f98a0cfec1fd57fa0465e8294dec96866792f9a925cc5b172137` |
| quota ledger (ledger-fix5, A5) | SP\quota-ledger-today.mjs | `bd1c5b500b82281d64b17966629bfe15cc280a05844ae2d02dbaa30f38ec6e68` |
| gap check | SP\router-default\build\gap-check.mjs | `178529337fe0ac439ee252a5a1999e73875113f17d8338fa6b26170382645251` |
| live40.wav (gitignored asset copied into MAIN; the wav the smoke flew; `live40-tts-local\` is proven through it and `wav:check`) | MAIN\electron\test\golden\live40.wav | `f6df5d53e8d86b7ba8dd8938c7597eb8c57b793ee107d8729d98f0198f7bfdf7` |
| roster live40.questions.mjs | MAIN\electron\test\golden\live40.questions.mjs | `b4fddc1dbc19ace7e4c606891f03a79a09292523bd1e03b8f0239d8c0d00fb50` |
| live40 items.json | SP\live40\items.json | `e531772bdc6e9c23865156286d8441c51521c62be74413bc56322090c81b2aaf` |
| dist LiveRouterSession.js (after 19937ab) | MAIN\dist-electron\electron\audio\LiveRouterSession.js | `be893d46c0302ca2a78d6900b510652d84f57b55fe78a4e78723e32fa5878c39` |
| dist routerArbiter.js | MAIN\dist-electron\electron\services\routerArbiter.js | `adf35be82079affcf91889736e52f598618948329ddf994c6790936aa63b5585` |
| dist routeReader.js | MAIN\dist-electron\electron\services\routeReader.js | `dd4e279b9d9a557df40d691252b82c59be351c4a86c73a0641fedf4720a94f0d` |
| dist main.js | MAIN\dist-electron\electron\main.js | `8c50f0ce61d69a34b3ff92f64e30f0e378e691a3c261c9e7120e60eda9d8958e` |
| smoke reader output | SP\router-default\SMOKE-READ.txt | `c03a196c12e0abd063c1e6cdb20f058de6d3c8d4b0ab70b6d517f05a28bd1561` |
| smoke result | SP\router-default\RESULT-smoke.md | `a510ec94e3128c9c101373c3eb8671a74279e5ef75ffcdecbca61220baa301e3` |
| router40 key (labels) | SP\router40\keyhold\key.json | sha16 `42e1b04f1f60283f` (SPEC §10) |
| router `INSTRUCTION` (L20d), checked at module load | embedded constant | `e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f` |
| router `BLOCK_B`, checked at module load | embedded constant | `e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8` |

The three router dist files are also printed before and after the run by `rd-proofs.mjs`; the after values must equal
the before values (§2). Earlier build, for the record: at 4511f20 `LiveRouterSession.js` sha12 `9fc4b17b7c53`.

---

## 11. The record of the build (every ruling and carry in the LEDGER, in one place)

### 11.1 Deviations and plan choices
- **Task 3 probe deviation.** A standalone script cannot build the profile summary (`KnowledgeOrchestrator` needs
  Electron's `DatabaseManager`), so the probe fed a fixed 127-char fixture: it proved composition and `context_sha12`
  stability across a forced reconnect (`dd1e8cca2021` on both connects, 2 × `session up`, 742 / 624 ms), 4/4 routes as
  expected (RE05/RE13 easy-answer 29/33 words, RH02/RH16 hard), first text 610–1277 ms from clip end. PROBE PASS
  21:45 (CHECKPOINTS). The probe connected with apiVersion `v1beta`; **the app's own connect path is first exercised by
  the smoke**, which also proves the non-empty in-app summary (§4.9). Task 2 M8 (real SDK connect) is the same residual.
  **Done:** smokes 2 and 3 connected from the app (`session up`, 2063 ms setup on smoke 2), `context_chars=266`.
- **Task 13 precheck split:** §2.
- **Plan choices:** `q_at` on decision lines; the dispatch line; `shown=-` on dup/unpaired (§4.7); **the whole-wav
  smoke** (47 items, not ~15 min: `playWav` plays the whole file and a subset wav would fail `wav:check`; SPEC §9.4's
  "~15-minute smoke" is superseded by it).
- **Task 6 replay** (router40's turns, Q = clipEnd): shown=live 20, pipeline 27, appends 0, row 4: 0; RH07 and RH17
  `late`; max `live_first_ms` 1259. RH05 (HARD) shown live and RE09 (EASY) to pipeline are router40's recorded
  behaviour; SPEC §9.1 already counts RH05 as live. Re-run after I-1: unchanged 20/27.

### 11.2 Rulings (LEDGER)
- User rulings 2026-10-06: I5 = B (the router keeps showing valid easy answers while the ear is on 2.5); context = A
  (profile summary); the quota day is fresh; KEEP the ear failover (if it threatened the deadline, the flight moves
  instead). User 2026-10-07 00:48: land in MAIN (local, flag default off, no push), fly as early as possible, fix +
  re-smoke on failure, keep going through flight and grading.
- Task 9: pipeline marker set uppercase-only (§4.2).
- Task 4: `hasMarker`/`checkCompleted`/`showablePrefix` never on pipeline text; Live code notation reads marker (§4.2).
- Task 12: follow-up chain/level semantics (§3); bare arms 31 mains (§7.5); 19.3 min.
- Task 2: no quota-count reset on `setupComplete` (mirrors the ear); count closes by `stale=no`, quota by `quota=yes`.
- Task 7: an extra optional `generationId` on `suggested_answer_end` (kept unused); a falsy `answerLLM` → failed; a
  second end for a turn is idempotent.
- Task 5: no `reason=superseded` tag (the decision line of a superseded Live turn may read `route=easy-answer`); then
  the `superseded` capture field and trailing decision field (task-5-fix2), and the authoritative `[Router] superseded`
  diag line (fix3); held source forwarded only if last held; fix4: a first released token is `replace:false` when
  nothing of the turn is visible. Accepted edge: a pending-mode label of an old stream with no token can pass to a
  sourceless replacing stream. Parked M-5: no turn eviction (negligible in 47 items).
- Task 8: keep the arbiter's first-visible-token replace guard (`routerArbiter.ts:350`); parked M1 (metrics back to
  `sm` after supersede), M4 (small session leaks).
- Task 10 m1: router runs whenever the ear runs (§8.7).
- Task 11: no fail-back within the process; any `NATIVELY_LIVE_MODEL` value disables failover; the failover line sits
  outside the `liveRouter === router` guard (it records the failed event). Real failover never exercised.
- Task 13: `probeSettled` needs ≥ 1 dispatch + 6 s quiet; `appended:false` on shadows; superseded copied into captures.
- Task 14: speed median (§4.4); a log not starting before the hour → exit 2; dup lines and dropped malformed lines fail
  integrity; mapping after `endedMs` = the harness rule; EASY caught on the first decision (§4.5).
- Task 14A: folder `^<stamp>-<label>$`; empty shadow → L alone `sEmpty`; pair by turn; appended text once as `S,A`;
  `--root` and roster/judge sha256 in the build record; superseded set = diag line ∪ capture flags; the log sliced to
  the session covering the hour.
- Task 18: per-request ledger markers; `.log.1` read; `--extra-requests`; `--seal` = the committed file's sha; ledger
  read ≤ 30 min old.
- Whole-branch: I-1 FIX (§4.1); I-2 → scorer (§7.3); m-1 guard, m-2 narrower (opened-not-dispatched turns stay held by
  design; pass-through + `[Router] undispatched` line only for unknown/evicted turns), m-3 cue-only token visible, m-4
  test name, m-5 `from=` only; accepted m-6 (flag-off log lines, §1), m-7 (`q_src=final` fallback, §4.3), m-8 (history
  keeps Live text before a replacement), m-9 (unreachable `answerLLM` history branch).
- **Since pass 1:**
  - Smoke attempt 1: `live40.wav` absent in MAIN (the landing copies tracked paths only) → the assets copied (§1, §10).
  - Smoke 2 checkpoint DEFECT and the padding fix: amendment A1. Padding-fix review I-1 → fix1: pad only around
    all-zero chunks (a main-thread stall mid-speech must not inject silence); M-2 cost accepted: continuous router audio
    is ~2.2 × the router's audio tokens (Live quota only; the lite ledger is unaffected; it matches router40's and the
    probe's feeding).
  - Smoke 3: the HARD misroutes RH04, RH08, RH09 are recorded as observed (§11.4); **the router is NOT tuned on them**
    (the smoke plays the flight's own roster).
  - Grading tools: rulings 1 (wrong = EITHER), 4 narrowed (only done-phase HARD supersedes are unreadable), 5
    (unclaimed pipeline turn: HARD caps at INCONCLUSIVE, EASY warns), 6 (zero Quality pairs = not met); the review's
    I-1..I-4 fixes (pin enforced, the scorer runs the reader with `--down-limit-min 2`, No regression on either HARD
    mapping, grades hash-bound to their exports) and m-1..m-5 (§7).
  - Task 18 fix2–fix4: T derived; g4-clock last; exit 10 window-only with no error log; write-arming refuses while
    the error log exists; register asserts UTC+3; K1 (§2 Guard row). F3 carry → §9.2.
  - Ledger-fix5: the run-folder log copies (§8.1).
  - User ~02:00: the post-hoc 3.8 Flash diagnostic (§7.8).

### 11.3 Gates recorded
Task 0 baselines: root tsc 0, electron tsc 6 (pre-existing), suite 1194 pass. Task 15 at `dae41f9`: tsc 0 / 6, build OK,
dist greps present, suite 1499 passed / 9 skipped / 0 failed (124 files); WBR READY WITH FIXES, re-check READY after the
fixes (I-1 probe 15 runs 0 Live). Reader: 29 mutants caught, then cal 114/114 and 118/118 after wb-fix-b. Smoke
launcher: cal 39/39, no key wrapper (MAIN launchers never needed one). Task 15 gates final at `9fbdf5b`: tsc 0 / 6,
build OK, suite 1508 passed / 9 skipped / 0 failed. Padding fix: `7408aac` re-review APPROVE, landed MAIN `19937ab`
(2 paths). **Gates at the final code** (A4 (a)): run on integration `7408aac`, whose code is identical to MAIN `19937ab`
(empty diff over `electron`, `src` and `package.json`): tsc root 0; tsc electron 6 (the pre-existing baseline); build
OK; suite 1515 passed / 9 skipped / 0 failed (124 files). The dist that flies: §10.

### 11.4 The smoke (PLAN Task 17; `LAB\RESULT-smoke.md`, `LAB\SMOKE-READ.txt`)
**Attempts.** (1) 00:58 TST: launcher exit 8, `live40.wav` missing in MAIN → assets copied. (2) 01:03–01:25, folder
`2026-10-06T22-25-42-router-smoke`, MAIN `4511f20`: **checkpoint DEFECT**, 43/47 decisions late → amendment A1.
(3) **01:40–02:02, folder `2026-10-06T23-01-59-router-smoke`, MAIN `19937ab`: CHECKPOINT 3 CLEAN.** Read with
`router-hour-read.mjs` (sha12 `2d17df40226e`) `--down-limit-min 2`. Smoke 3 is the smoke of record.

**Smoke 3's items (counts and ms only; no answer text was read into any record):**
1. `[Router]` kinds seen: `flag` (on), `ear model` (gemini-3.1-flash-live-preview), `session connect` 1, `session up`
   1, `dispatch turn` 49, decisions 49 + 2 `unpaired`. **Not reached:** `session failed`, `ear failover` (either form),
   `superseded`, `undispatched`, router reconnect (ordinary or quota), router close.
2. Ear `[LiveRouter] close`: 2, both `stale=yes`; no `stale=no` close (the §7.3 guard holds); router closes 0.
3. Cases: A-type Live shown with a valid answer, no append: 20; pipeline shown 27 (route hard 13, late 12,
   no-router-turn 2); case C (append) 0; supersede (D/E) 0. No overlay screenshots (log-only residual).
4. Capture files: live 20, shadow 20, appended 0; reader MATCH and file MATCH. A hidden shadow (RE01, 71 words) is
   among the `[Answer] budget: words=` values (whole).
5. History rule: for a shown=live turn (RE01, 30 words) an `[Answer] full:` line with the Live answer's word count
   exists.
6. Attribution: 47 decisions in the hour, all mapped; 2 outside (the probe); every dispatch has a decision line
   (49/49; integrity 0).
7. Gap: 49 dispatches, 49 answer ends, 0 overruns → 20 000 ms stays (§3).
8. `context_sha12=b2a43a2159a2`, `context_chars=266`, one connect (§4.9).
9. Residual branches not reached: listed in §12.

**Smoke 3's reader numbers (the flight's bars, read on the smoke; never a prediction that gates):**

| | smoke 3 | bar |
|--|--|--|
| Safety, text half | live hard-first 0, router-marker 0; pipeline unknown-marker 0, bare token 0 → PASS | 0 |
| Fallback | all 5 counts 0 → PASS | 0 |
| Speed | `live_first_ms` p50 **1541.5**, p90 1979, n 20 (all `q_src=vad`) → PASS | ≤ 2500 |
| Routing | EASY caught **17/20** (PASS); HARD misrouted **3/27: RH04, RH08, RH09**, shown Live → FAIL | ≥ 13; ≤ 1 |
| Integrity | every count 0; captures MATCH | 0 |
| VOID inputs | router down 0.00 min; session failed 0; ear failovers 0 | — |
| Reported | shadow first token p50 3970, p90 5795 (n 47); `live_words` p50 34, max 68; HARD late 11, no-router-turn 1 (not misrouted, M2) | — |

**The HARD misroutes are recorded as observed.** RH04, RH08 and RH09 are the 3.8 router's own routing on this audio
(their first word was not a hard word). **The router, its instruction and the arbiter are NOT tuned on them**: the smoke
plays the flight's own roster, and tuning on it would leak the test. If the run reproduces them, the Routing bar FAILs
and the verdict is INCONCLUSIVE at best; Safety decides separately on the graded Live answers (a misrouted HARD item
shown Live is an L answer and counts in Safety's wrong-answer half). Pre-grade reader verdict on the smoke:
"INCONCLUSIVE-leaning; reader bars not met: Routing".

**The carries this smoke could not reach:** case C (two bubbles, header), supersede-after-Live (Task 8 carry), the
`[Router] superseded` join (§7.3), the ear's "no activity after meeting end" was not separately recorded, and no
screenshots. These stay residual (§12).

---

## 12. What this run cannot show (residual risks, SPEC §14 and the LEDGER)

- One router session for a whole run with reconnects and no resumption has never run before the smoke.
- The profile-summary CONTEXT's effect on routing is unmeasured (router40 used a per-question block `dd74bbde…`).
- Pairing by time: a completed early answer to half a question can still decide; only Safety measures it.
- Streaming shows text before the final check; a trailing "hard" or a garble other than `Heart.`-like short turns can
  reach the screen; Safety counts it.
- The dispatch gate leaves ~1.3 s under the 2.5 s bar on a normal turn; unfinished-hold turns count against the p50.
- live40 is synthetic and short (47 SAPI/reused clips, ~19.3 min); its EASY share is not a measured interview share.
- Two concurrent Live sessions on one key: their quota and concurrency are checked only by the precheck, the smoke and
  the VOID rule; Live quota is not in the ledger.
- Ear failover cannot fire on a silent 3.1 or on quota closes; real failover was never exercised.
- Back-to-back arm speed is unmeasured; spill-over counts on the next quota day.
- The `[Router] superseded` line and the superseded-replacing-text join (§7.3) are proven by source and synthetic logs
  only, unless the smoke reaches a supersede.
- Renderer layout of the "(full answer)" header is visual and was not observed (no screenshots).
- §7.2's wait: a stray turn line holds it to the 120 s cap (fail-safe); a gate check > 6 s after the wait starts.
- I-1 was demonstrated on a bundle of the arbiter, not on real router output.
- **Not reached by the smoke** (RESULT-smoke item 9): router reconnect and its context re-send, `session failed` and
  VOID, ear failover, append (case C), supersede (D/E), undispatched pass-through, the `[Router] superseded` line, quota
  close. Every one of them is proven by tests or synthetic logs only.
- **The padding fix (A1)** was verified on one smoke (12/47 late remain; 11 of them HARD); its behaviour on a long
  real pause inside a question and on a main-thread stall is proven by its tests only.
- **Routing on live audio:** smoke 3 misrouted 3/27 HARD; router40's offline replay misrouted 1 (RH05). The flight's
  Routing bar may fail on the model's routing alone.
- The context sha was stable across two app sessions but was seen on only one connect per session.

---

## 13. Filled at arming (nothing above is edited)

- Registered HEAD: `<<ARMING: 40 hex>>` (= 3d13436 + land commit `4511f20` + padding fix `19937ab` + instruments + this
  file).
- Smoke of record: `2026-10-06T23-01-59-router-smoke` (§11.4); `SMOKE-READ.txt` and `RESULT-smoke.md` sha256
  in §10.
- T `<<ARMING>>`; `I60_PROBE_DEADLINE_MIN` = 35 confirmed against the dry twin's duration `<<ARMING>>` (§9.2);
  `NATIVELY_RD_EXTRA_REQUESTS` = 0 re-confirmed by hand against the arming body `<<ARMING>>`; LEDGER-SUMMARY line
  `<<ARMING>>`; dry twin `GUARD OK` and `NIGHT GATES OK` lines (or, before T's window, the `g4-clock` + `WINDOW ONLY`
  pair, K1) `<<ARMING>>`; tasks read back `<<ARMING>>`.
- The alias probe's model is read at grading and named in the result note (§7.1), not here. The user's quiet-machine
  and logged-on confirmation `<<ARMING: time>>`.
- This file's sha256 as committed: `<<ARMING>>`.

## Amendments

### A1 — 2026-10-07 ~02:2x TST, before any data of the run: the router's input is padded to real time (MAIN `19937ab`)
**What changed.** `LiveRouterSession` pads its input with zero PCM up to wall-clock real time, **only around all-zero
chunks** (the suppressor's keepalives are zero 20 ms frames). The router only; the ear's feed is unchanged. Commits:
`bf26b08` (fix), `7408aac` (review fix1: pad only when the incoming/last chunk is all-zero, so a main-thread stall in
mid-speech cannot inject up to 1 s of silence and end a turn early); re-review APPROVE; landed MAIN `19937ab` (2 paths);
rebuilt 01:37 (`LiveRouterSession.js` sha12 `be893d46c030`).

**Why (root cause, rule 6, LEDGER).** Smoke 2's symptom: 43/47 decisions `late`, the router's first word 2.9–6.3 s after
Q (p50 ~3.4 s), while the Task 3 probe saw 0.6–1.3 s after clip end. Cause: the native `SilenceSuppressor`
(`silence_suppression.rs:265-273`) sends ONE silence keepalive frame per 100 ms after a 500–600 ms hangover; the router
was fed that thinned stream (`main.ts:1395/1513/1556`), so 3.8's server-side VAD accumulated its end-of-turn silence in
audio time, seconds late in wall time. The probe fed real-time silence, hence fast. Alternatives considered and
rejected: Q stamped early (the shadow's timing was normal); 3.8 slower under the app's context (same model, 266 vs 127
chars, unlikely to cost 2.5 s).

**Deviation from SPEC §4.1** ("Audio in: the same 16 kHz mono PCM the ear receives, from the same callback. There is no
gap buffer and no replay"): the router now receives that PCM plus zero padding during silence. It adds no buffer of
speech and replays nothing. Recorded here as a dated amendment because it was made after the registered smoke design
and before the run. Cost accepted (review M-2): ~2.2 × the router's audio tokens (Live quota; the lite ledger is
unaffected); it matches how router40 and the probe were fed.

**Verified on the same observation, before → after (smoke 2 at `4511f20` → smoke 3 at `19937ab`, same wav, same
roster, same reader):**

| measure | smoke 2 | smoke 3 |
|--|--|--|
| decisions `late` | 43 / 47 | **12 / 47** |
| Live shown | 1 | **20** |
| `live_first_ms` p50 (n) | 3705 (n 1) | **1541.5 (n 20)** |
| EASY caught | 1 / 20 | **17 / 20** |
| HARD misrouted | not recorded in the ledger (late decisions are not counted as misrouted, M2) | 3 / 27 |
| Safety text half, Fallback, integrity, captures | PASS, PASS, 0, MATCH | PASS, PASS, 0, MATCH |
| router closes; context | 0; 266 chars, `b2a43a2159a2` | 0; 266 chars, `b2a43a2159a2` |

No bar, verdict rule or threshold of this file changed with A1.

### Amendments A2–A10 — 2026-10-07 ~02:15 TST, before any data of the run; from the re-check (`LAB\reviews\preregister-recheck.md`, APPROVE WITH CHANGES), as the coordinator directed
Each amendment names the text it replaces. Where an amendment and the body differ, **the amendment governs**, and the
result note applies the amended text verbatim.

### A2 — the Safety wrong-answer half uses wrong = EITHER grader (re-check finding 1, BLOCKING)
§5, "How each is read", Safety wrong-answer half: the words "every **L** answer … is not consensus-wrong (§7.2)" are
replaced by: **"every L answer in the blind export (every Live-shown turn, any class, superseded and `sEmpty` turns
included) is not wrong, where wrong = EITHER grader gives correctness 0 (§7.1, SPEC §10)."** "Consensus" (both graders)
was looser than the registered definition and than `score-rd.mjs`, which already applies EITHER. The same EITHER rule
applies everywhere this file says "wrong": No regression, Quality's acceptable count (acceptable still needs both
graders), and the reported arms (A8).

### A3 — two SPEC deviations recorded as amendments (re-check finding 4)
Both were plan choices (PLAN rev 2), not user or controller rulings. They stand, recorded here beside A1:
- **A3.1, the precheck split (PLAN Task 13).** SPEC §10 places the router session gates at the T−6 precheck. They move
  into `auto()`'s preflight (`routerPreflight`) and are **re-read right before `appPass()`**, after the §7.2 wait. Why:
  the sessions exist only after `auto()` starts the app, after T, and the T−6 precheck requires that no Electron runs.
  Re-reading just before playback is the stronger check. The T−6 precheck keeps the machine and task gates. The
  re-check accepted it on the merits. Details: §2, "Precheck split".
- **A3.2, the whole-wav smoke (PLAN Task 17).** SPEC §9.4 asks for a ~15-minute smoke. The smoke played the whole
  `live40.wav` (47 items, 19.3 min), because `playWav` plays the whole file and a subset wav would fail `wav:check`.
  The smoke thereby played the flight's own roster. A1 is the only change made after it, and the router was not tuned
  on its outcomes (§11.4).

### A4 — which fields live in this file and which in the arming record (re-check finding 2)
A committed file cannot hold its own commit or its own hash, and an edit after the commit would change both the seal
and the HEAD. So:
- **(a) Filled into THIS file before the step 3 commit** (PLAN Task 19 step 3):
  - every instrument sha256 in §10 (full values; the `<<ARMING>>` marks there become values);
  - the final ledger read in §8.2a;
  - the gate counts at the final tree in §11.3 (tsc root/electron, suite, build marker).
  **The dry twin's duration (`G` in §9.2) goes to the arming record, not this file** (controller ruling): the dry twin
  needs the committed registration, so recording it here would be circular. **If G > 3 min, the controller stops
  before arming.**
  After the commit nothing in this file changes; a late change is a new dated amendment AND a new commit, with the
  seal and HEAD taken from that new commit.
- **(b) Written ONLY into the arming record** (`LAB\flight\ARMING-flight-rd.md`, written by `write-arming-rd.mjs`),
  never into this file:
  - the registered HEAD (P10);
  - this file's sha256 as committed (the `--seal`, checked against `git show HEAD:…PREREGISTER-router-default.md`);
  - T (P6), `NATIVELY_RD_T`;
  - the dry-twin ending lines (`GUARD OK` / `NIGHT GATES OK`, or K1's `g4-clock` + `WINDOW ONLY` pair);
  - the task read-backs;
  - the LEDGER-SUMMARY line the arming gate reads (the same read as (a), or a fresher one);
  - the evidence of A9 and the `extra=` hand check (§8.4).
- §0's P6, P10 and §13's HEAD, sha, T, dry-twin and read-back fields therefore read "in the arming record", not
  "`<<ARMING>>` in this file".

### A5 — the quota facts and the projection corrected; the review status of the tools (re-check findings 3 and 5)
- **§8.2a's description of the 23:03Z read is corrected.** That read came **after** smoke 3 had ended, so it already
  holds smoke 3's share. Sources: the ledger read 22:37Z `used35=50 used31=3`, taken right after smoke 2; smoke 3's
  playback ended 23:01:59.5Z and its launcher exited 23:02:02.7Z (launcher log; the coordinator gives 23:01:55Z); the
  23:03Z read `used35=100 used31=10` came after that. **Each whole-wav smoke cost about 50 requests on 3.5-lite**
  (and 3 and 7 on 3.1-lite). The pass-2 phrase "read before smoke 3 had finished adding its share" is withdrawn.
- **The projection stands at ≈ 235 / ≈ 54 of 500** (100 + ≈ 135, and 10 + ≈ 44). The re-check's "should read ≈ 150",
  with ≈ 285 / ≈ 57–61, assumed smoke 3 was missing from the read, so it does not apply. The gate (≥ 224 / ≥ 90
  headroom) is met either way.
- **Ledger-fix5 is reviewed:** Opus, SPEC PASS / QUALITY APPROVE (`LAB\reviews\task-18-review.md`, "## ledger-fix5
  review"). `quota-ledger-today.mjs` sha256/12 `bd1c5b500b82`; calibration 37/37 (R0–R4), with mutants X10–X12 caught
  (X10 summing instead of max, X11 a set instead of a per-source count). The review's caveat stands: `complete=yes` now
  means some source holds a line older than the reset, and old run copies satisfy that almost always. For this quota
  day the reviewer closed it with the log spans (every app session since the reset has a run copy or a live log). Its
  IMPORTANT carry goes to arming. The full sha256 is filled into §10 before the commit (A4).
- **The fixed scorer (`LAB\grade\score-rd.mjs`) and the fixed grader launcher (`LAB\grade\launch-grader-rd.mjs`)
  each need an Opus re-review of their post-review fixes BEFORE grading starts** (the pin, the reader run with
  `--down-limit-min 2`, the either-mapping HARD gate, the hash binding, m-1..m-5). Grading does not start without both
  APPROVEs. Their final sha256s are filled into §10 before the commit (A4); if a re-review changes them after the commit,
  the change is a new amendment and a new commit before grading.

### A6 — P is a measured value, not a cap (re-check finding 6)
§9.2's `P` = 4 min is smoke 3's measured probe-to-playback time (111.5 s) plus the 2-min wait cap. It is not an upper
bound: a slow probe attempt that starts just before the deadline can overrun it. **A run that ends after T + 75 min for
this reason is not a breach of this registration.** The T + 75 rule is a planning bound for T. The binding limits are
the quota-day end (§9.1) and SPEC §1's 09:45 line, and at T ≈ 03:15–03:45 both are about 6 h away.

### A7 — the one-quota-day rule: the literal reading is kept, and a late T stops for the user (re-check finding 7)
§9.1's literal reading stands: the smoke and the run (with its playback) fall in one quota day. A run that would end
after 10:00 TST needs a smoke in the new quota day. In addition, **if T would fall after 08:30 TST, the controller
stops and the user rules**; no reading applies automatically. At the targeted T (03:15–03:45) the first branch holds.

### A8 — grade definitions for the single-grader arms (re-check finding 8)
For `high`, `low` and `captured-high` (one grader each, §7.2): **acceptable = that grader gives correctness 2 AND
on-topic 2; wrong = that grader gives correctness 0** (the §7.1 definitions with one grader). These arms are reported
only and gate nothing.

### A9 — the user's consent, the quiet machine and the logged-on session: evidence, not a pre-arming notice (re-check findings 9 and 10)
§2's "told to the user before arming" (MAIN frozen row) and §13's "the user's quiet-machine and logged-on confirmation
`<<ARMING: time>>`" are replaced. The user is asleep and cannot be told, so the arming record carries this evidence
instead:
- **Consent, quoted from the user:**
  - 2026-10-06: "approved, yes pc will be free, go ahead" (given for the original 08:00 window; LEDGER line 3, PC free
    07:45–08:40);
  - 2026-10-07 00:48: "keep going until flight and grades" and "as early as possible" (LEDGER line 65).
  Together these extend the consent to the earlier slot.
- **Quiet machine:**
  - smoke 3, in the same night window (01:40–02:02 TST), logged **49 dispatches = 47 items + 2 probe** turns, with no
    extra turn, so no foreign audio reached the app (§11.4);
  - at T−6, the precheck's `audio-state` INFO lines (`rd-precheck.ps1`; printed, never gated, A1.2 of flight-eq) are
    quoted in the arming record or the result note. Any foreign audio source they show is named.
- **Logged on:**
  - the dry twin is an interactive-logon task (`register-rd.ps1`: `-LogonType Interactive`), so it runs only while the
    user is logged on;
  - its log line `NIGHT GATES OK` (sleep and hibernate never on AC, AC power, no pending reboot, updates paused) is the
    citation, as close to T as the arming allows, rather than smoke 3's 01:40 task.
  - **Author's note:** `night-gates.ps1` itself reads power, sleep, reboot and update state. It has no logon reading,
    so the logon proof is the fact that the interactive task ran and wrote that line.

### A10 — the expected outcome, stated before data (re-check finding 11; information, no rule changes)
Smoke 3 misrouted 3 of 27 HARD items (RH04, RH08, RH09) on the same wav and roster. The Routing bar allows 1, and the
router is not tuned. **The Routing bar is therefore likely to FAIL, and the verdict is likely INCONCLUSIVE, with one
re-fly** (`router-default-r2`, a new blind seed `blind:router-default:r2`, by a dated amendment, §6.3). The run is still
informative for Safety (decisive), Quality and No regression, which only grades can read. The controller tells the user
this expectation in the morning report, so an INCONCLUSIVE is not read as a surprise. A Safety FAIL would still decide
first (§6.1).
