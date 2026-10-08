# Pre-registration: flight h40d (holdout40, fourth flight) — cue mode's validation hour

**DRAFT, written 2026-10-01 (Wednesday night, before the 05:00 cue re-smoke, before the bench, before the merge).** An
Opus review checks it; the controller fills "What flies" at arming and commits it to MAIN's `passes/` as
`PREREGISTER-h40d.md` before the task is registered. Not edited after the hour; the result goes in
`passes/<flight-date>-h40d-result.md`, applying this text verbatim. Every number below has its source named; the
numbers marked "h40c's own" or "br1's" were computed before any h40d data existed by `SP\validation-hour\h40d-clocks.mjs`
and are quoted, with the script's full output, in `SP\validation-hour\CALIBRATION-NOTES.md`.

`MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (branch `fix/coding-style-suffix-all-gemini`);
`WT` = `MAIN\.claude\worktrees\whole-turn` (branch `feat/whole-turn-answers`); `SP` = the controller's scratchpad
(`C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`).
Clock times are local (UTC+3, no DST) unless marked Z.

## 1. What the hour tests, and what it does not

**The change under test is cue mode, alone.** Each spoken answer opens with a cue block of at most 3 lines of at most
5 words, above the answer; the block is written by the same model call as the answer, closed by the parser on the first
prose character, capped at the display and logged; a typed chat answer carries no block. It is always on (the 09-20
design's decision 6). This is the hour the holdout protocol requires before a shipped change counts as validated
(`memory/project_holdout_roster.md`: "ship only after ONE holdout hour scored against a rule fixed beforehand; NEVER
edit anything in response to a holdout number").

**The baseline is h40c** (2026-09-29, `PREREGISTER-h40c.md` at 0e1e8b2, `passes/2026-09-29-h40c-result.md`): the same
roster, audio, ears, grader and rubric, the hedge ON, no cue mode. PASS in its window: first token median 4.1 s, p90
6.498 s, 0 answer failures, quality 35 of 45 exactly at its floor, 44 of 45 answered (R05 lost), zero wrong on the 40
gated items.

**The tree that flies is MAIN after Thursday's merge** — MAIN's branch fast-forwarded to the cue branch after MAIN's
four post-br1 docs commits are merged into it (spec 2026-09-30 §3.5.7). Read on 2026-10-01 from the two checkouts:

- MAIN's tip is `fed4b07`. Since h40c's HEAD `0e1e8b2` MAIN carries two app commits and six docs commits:
  `f745d7e` **feat(verbal): the hedge is the default answer policy** (`NATIVELY_VERBAL_HEDGE` unset = on; `0` = the old
  stall race; anything else refuses to start) and `0ef42a0` **fix(stt): a word lost between two Deepgram finals is
  restored from the interim** (the boundary repair, flown live in br1 on 2026-09-30: one repair in 40 items, the right
  word, in place; not a cue-mode change). Docs only: `94adb6f`, `e78f7c7`, `e3db5cb`, `c7e991d`, `ee5f8ac`, `fed4b07`.
- The cue branch (`WT`, tip `8a13abb`, code head `d83fdfe`) contains MAIN's two app commits through the merge `279103b`
  (parents `fd57512` + `0ef42a0`). MAIN's four commits absent from it (`e3db5cb`, `c7e991d`, `ee5f8ac`, `fed4b07`) touch
  nothing under `electron`, `src`, `premium` or `package.json` other than pass records in `electron/test/golden/passes/`
  (`git log HEAD..fix/coding-style-suffix-all-gemini -- electron src premium package.json ':(exclude)electron/test/golden/passes'`
  is empty). **So after the merge the app and harness code equals the cue branch at `d83fdfe`, the code the Thursday
  05:00 re-smoke flies.** The app/harness diff between MAIN's tip and the cue branch is the cue work: 35 files,
  +1884/−94 at `8a13abb`, reviewed by the SDD whole-branch Opus reviews and the merge review (`SP\cue-group\merge-review.md`).
- The cue work, by commit (all on `feat/whole-turn-answers`): v1 `8682b32` (the cue rule at the prompt tail),
  `577d13a` (parser: strip the block, hand the cues out once), `6b7817f` (composition innermost, once-guard), `d648ff3`
  (engine: `[Answer] cues:` once, cues on the first prose token, IPC), `51424e4` (render the block), `f299fae` (harness
  cue checks, `--cues`/`--no-cues`, the cue row), `feaf897` + `49183fc` (the same-bytes no-cue twin, three reps, fails
  closed), `3fd5ba4`, `1ddb738`; the branch's own earlier fixes (first-token aborts `d267870`, `1f23a5e`, `f06fdc8`; the
  model label `5d5ab34`, `896f726`; the emphasis strip `b80a677`; the build cwd `33eae76`; the Gemma handover
  `09d0c0e`; the exit listener `97fc38d`; the grader model `76f90f7`; the harness key `fd57512`), several of which MAIN
  carries by its own commits, all reconciled in the merge `279103b` (8 conflicted files, the merge review approved);
  after the merge: `1901ab6` (hedge × cue seam tests), `721c6fa` (no-cue twins re-pointed to 3.5-lite
  HIGH), `4c07ae9` (3 × 5 and the `one-first` shape bullet, `CUE_RULE` sha256/12 `8e15e4e7dd41`), `949ebc2`, `38da4ac` +
  `578190f` (`trimCues`: notation cleaned, then capped), `87877ee` (the cap at the display boundary, `[Answer] cues
  trimmed:` logged, the metrics row's `trimmed`), `a7e9a79`, `efda6cf` (typed chat sends `VERBAL_TYPED_PROMPT`, no cue
  rule), `4b051a9` (chains strips the block like the app), `e3fae5f`, `64d74a1` (the early close: the block closes on the
  first prose character), `18da7fa` (source-text pins), `d83fdfe` (an offers block before the spoken answer no longer
  swallows the answer; one `console.warn` line per such stream). Docs: `b649011`, `416d4de`, `e49886c`, `8a13abb`.

**Not in the tree, on purpose, so the hour measures cue mode alone:**

- **The five side fixes** (`AGENDA.md`, "The side fixes"): the replay test path, the notation filter's chunking, the
  salary card against the 200-word cap, typed chat's MORE list, the retry-after-failure model. None is committed; each
  sits in its own session worktree on `fed4b07`. **They land AFTER this hour has been read** (its result note written),
  one at a time, per the agenda's own procedure. Nothing else lands on MAIN between the registered commit and the end
  of the hour.
- **The follow-up "earlier questions" change** (`PREREGISTER-followup-questions.md`, `94adb6f`): its offline replay runs
  Thursday; even a PASS licenses a flag-off BUILD, not this hour's tree. `6c50ec3`'s parent restore stays flag-off:
  `NATIVELY_FOLLOWUP_PARENT` is unset (the app logs `[Main] follow-up parent: off`). The five parentless follow-ups
  (R02F R04F R09F R11F R13F) therefore arrive as on h40b and h40c, and rule 3's zero-wrong clause excludes them as
  h40c's did.
- **Nothing from the 3.8 Live or Extended Thinking work** (L20c STOP; ET38 offline) touches the app.

## 2. The run

| | |
|---|---|
| Name | **h40d** (holdout40's fourth flight); run folder `MAIN\electron\test\golden\interview60.runs\<stamp>-h40d`; launcher log `interview60.runs\flight-h40d.launcher.log` |
| Task | `Natively-flight-h40d`, registered by `SP\register-h40d.ps1` (h40c's `register-h40c.ps1` with the name and date changed): **2026-10-02 13:30:00 local**, interactive logon (the user logged on), 5 h limit, StartWhenAvailable OFF (a missed start never fires late), `-WorkingDirectory MAIN` |
| Window | playback start (the timeline's own `startedAt`, converted at UTC+3) **inside 12:00–15:00 local**, h40c's daytime window; a 13:30 task fire gave 13:36 on h40b and h40c. Slip: same day only, after 10:00 (the lite quota reset), with the ledger checked (§8). Outside the window the hour CANNOT PASS (§6). |
| Roster, audio, ears | `holdout40` (45 items: 33 mains + 12 follow-ups; R31 the one `long` item), `holdout40.wav` (SAPI David, deterministic, `wav:check` 45), Deepgram + the Live ear, exactly as h40a–h40c |
| Configuration | the shipped default, every model, hedge, thinking and follow-up variable **cleared** in the launcher (`set NAME=` unsets it in cmd; the hedge default is ON when unset, per `f745d7e`; the guard's `.env` scan proves no `.env` line refills any of them): `NATIVELY_STT_PROVIDER=deepgram`, `NATIVELY_ROSTER=holdout40`, `NATIVELY_SCENARIOS=`, `NATIVELY_GEMINI_THINKING_LEVEL=`, `NATIVELY_VERBAL_PRIMARY_MODEL=`, `NATIVELY_VERBAL_HEDGE=`, `NATIVELY_VERBAL_HEDGE_TRIGGER_MS=`, `NATIVELY_FOLLOWUP_PARENT=`, `NATIVELY_FLIGHT_COMMIT=<the registered HEAD's full hash>` |
| Build | MAIN's `dist-electron`, rebuilt from the registered HEAD after the fast-forward, proven by `node SP\dist-proof.mjs --root <MAIN> --expect combined --prefix-count 3 --offers-marker "offers block before the spoken answer"` printing `DIST PROOF: THE COMBINED BUILD, every marker as expected` (the six v2 markers, `CUE_LINE_PREFIX` ×3, the offers line ×1, `CUE_RULE` sha256/12 `8e15e4e7dd41`, limits 3 × 5) — **twice in the launcher log, before the run and after it** (the run's `auto` step rebuilds when any `electron/**/*.ts` is newer than the oldest output; the second proof is the dist that flew), with the filter's sha256/16 recorded both times (the worktree's combined build read `42d9bc42dbd17870`; a different value on MAIN is explained in "What flies" before arming, never after) |
| Harness command | `launch-h40d.cmd` (h40c's `launch-h40c.cmd` with the label, the env block above, the commit pin, the two dist proofs and a `function trimCues` guard on the built filter): `wav:check` → `guard-h40d.mjs` → `"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs h40d`, all appending to the launcher log; guard failures go to `%TEMP%\natively-h40d-launcher-error.log`, which must not exist |
| The guard | h40c's `guard-h40c.mjs` re-pinned: roster loads as holdout40 with 45 items; no model or thinking override; the answer-model list carries no Groq id and the question-detection override is unset; `.env` declares none of the guarded names; MAIN's HEAD equals `NATIVELY_FLIGHT_COMMIT` and the working tree is clean but for the allowlisted untracked files (re-read at arming); the dist and its source resolve the hedge as ON when the variable is unset (the `guard-br1.mjs hedge` check, calibrated to FAIL on the 09-26 build) and the follow-up flag as off; the built filter contains `function trimCues`. Calibrated by breaking each premise before arming (h40c's `guard-h40c-cal.txt` pattern). `GUARD OK` from the dry twin `launch-h40d-dry.cmd`, registered as its own scheduled task, is required before the real task is registered. |
| MAIN frozen | from the registered commit (this file's own commit) through the end of the hour: any commit moves HEAD and the guard refuses; nothing under `electron/` is touched between the build and the run |

**The arms** (the harness's list as built, `interview60.flight.mjs` `PAIRED_ARMS` at `721c6fa`, plus the two bare arms;
holdout40 has no focused five, so the four Flash arms are skipped with one log line; the user's decision of 30 Sep makes
replay arms opt-in for future flights, but "Friday keeps them, because there they ARE the test", and the opt-in switch
is not built, so the list runs as it stands):

| arm | model, level | prompt | role this hour |
|---|---|---|---|
| in-app | the hedge: 3.5-flash-lite HIGH front, 3.1-flash-lite LOW back from 5 s | the app's own, with `CUE_RULE` | **the live hour** — graded |
| `captured-high`, `-r2`, `-r3` | gemini-3.5-flash-lite HIGH | the hour's captured prompts as the app built them (they carry `[CUES FIRST]`, i.e. `CUE_RULE`) | **the cue twins ×3** — graded; their raw `cues` arrays are the cue checks' input |
| `captured-no-cues-high`, `-r2`, `-r3` | gemini-3.5-flash-lite HIGH | the same bytes with `CUE_RULE` stripped (`answers.mjs --no-cues`, which refuses a prompt without the rule) | **the no-cue twins ×3** — graded; the control |
| `captured-low`, `-r2`, `-r3` | gemini-3.1-flash-lite LOW | the captured prompts, rule included | the back leg's cue twins; graded only under rule 3d's condition |
| `captured-minimal`, `low`, `high`, bare `gemini-3.1-flash-lite`, bare `gemini-3.5-flash-lite` | as named | as named | run by the harness, ungraded (as on h40c) |
| chains (`interview60.chains.mjs`, ~25 calls on 3.1-lite) | | | run by the flight; its `EXIT 0` line and the report's chains section are read; the first cue hour through the chains wrap (`4b051a9`) unless Thursday's MAIN chains run happened (§7) |

The flight's own log line `paired captured arm: N spoken items have a replayable prompt this hour` and its rule
summary (`0 of N lack it`) prove the captured prompts carry the rule; a `paired arm captured-no-cues-high skipped` line
means the hour did NOT fly cue mode and is VOID (§6, rule 1e).

**The grader.** `claude-opus-5-5`, one grading agent per graded arm (h40c's ruling, made before its data: the
pre-registration defines no second in-app grader and the floor of 35 came from one), dispatched with h40b's dispatch
text verbatim (`SP\h40c-grader-dispatch.txt` with h40d's file names), `model: "opus"`, the grader model read from every
agent's own transcript (`SP\h40c-grader-models.mjs`; the check was calibrated on a known Opus, a known Sonnet and a
missing transcript), the frozen grader prompt and rubric, stamp `8564ba96369a`. Every merge carries `--model
claude-opus-5-5` (`SP\h40d-merge.cmd`, h40c's `h40c-merge.cmd` re-pointed; cwd MAIN). Graded: the in-app pairs
(`interview60.judge.pairs.json`) and the six twin pairs files above; the three `captured-low` files only under rule 3d.
If the alias resolves to any other model, rule 3 is reported, not gated, and the hour cannot PASS.

## 3. The three clocks, and why the first-token clock is not h40c's

In a cue build the diag line `first token N ms` (`tapFirstToken`, the first non-empty non-sentinel chunk out of the
whole filter chain) fires **on the first prose chunk after the cue block** — the block's own streaming time plus the
line filter's decision on the first prose line (a few characters, at most 48) — because `stripCueBlock` sits innermost
and, with the early close (`64d74a1`), releases the first prose chunk the moment the pending text can no longer be a cue
line (spec `2026-09-30-cue-early-close.md` §5, §6; the second amendment of `PREREGISTER-cuesmoke.md`). On h40c the same
line fired on the first prose chunk with no block in front of it. So h40c's 4.1 s / 6.498 s and this hour's `first token`
numbers measure the same screen moment but not the same model work. This hour therefore reads three clocks, all from
`SP\validation-hour\h40d-clocks.mjs <run-dir> [--list]` (numbers only; calibrated on h40c, br1 and the 16:12 cue
re-smoke — see `CALIBRATION-NOTES.md`), each per answer-dispatch window (a `dispatch: answer` or `dispatch: supersede`
line to the next one, inside the run's own window, h40c's definition):

| clock | read from | what it is | h40c's own value (n 45) | br1's (no cues, next day, n 40) | the hold's (16:12 cue run, v2, n 21/20) |
|---|---|---|---|---|---|
| **screen clock** | the diag `first token N ms` value (h40c's registered method) | what the candidate waits for: the first prose chunk on screen; in a cue build the cues ride it | median **4.100 s**, p90 **6.498 s**, max 10.514 s | 4.621 / 11.148 / 20.417 s | 5.313 / 6.411 / 13.084 s |
| **model clock** | the `verbal hedge: won by <model> at N ms` value of the window's LAST won-by line | the winner's first raw chunk, before the block: like-for-like across hours with and without cue mode (the same hedge code, the same `t0`) | median **3.499 s**, p90 **6.052 s**, max 9.961 s | 4.105 / 10.661 / 19.985 s | 4.594 / 5.035 / 5.649 s |
| **cue cost C** | the `won by` line's timestamp → the next diag `first token` line's timestamp (one process, two files) | how long the winner's first text waited to reach the screen: the block's streaming plus the holds behind the parser | median **0.002 s**, p90 0.003 s, max 0.026 s | 0.002 / 0.003 / 0.006 s | **0.217 / 0.717 / 1.170 s** (block + whole first paragraph, the hold the early close removes) |

The screen clock is the sum of the other two, up to the milliseconds between `dispatch` and the hedge's own `t0`.
`hold-read.mjs`'s R2 and B reads (the hold's fingerprint: the cues line and the end of the stream under 15 ms apart)
are read beside C, as the cue-smoke pre-registration reads them.

## 4. The rule

The hour **PASSES** only if rule 1 is not VOID, the window and the grader conditions of §6 hold, and rules 2, 3, 4 and
5 all PASS. Rules 2–5 are ALWAYS computed and reported, VOID hour included.

### Rule 1 — mechanical eligibility (VOID, not FAIL; h40c's rule 1 plus three cue-build conditions)

VOID on any of:

- (a) the app's own startup line, read from BEFORE the run's window (last match), is not exactly
  `[Main] verbal hedge: on trigger=5000ms`;
- (b) fewer than 95% of answer-dispatch windows contain a `verbal hedge: front=` line;
- (c) an objective 3.5-lite outage: at least 50% of hedge runs (`front=` line count) are followed by
  `back started … reason=front-error`; `reason=trigger` is never void (it is what the hedge does under load);
- (d) either dist proof in the launcher log does not read `THE COMBINED BUILD, every marker as expected`, or the two
  proofs' filter sha256/16 differ (a rebuild by `auto` from a tree the guard proved clean at the registered HEAD is
  not void by itself: it is reported with the tree state, and the second proof decides);
- (e) the captured prompts do not all carry the rule (the flight's `paired arm captured-no-cues-high skipped` line, or
  a rule summary other than `0 of N lack it`): the hour did not fly cue mode;
- (f) the reliability void of rule 5.

**3.5-lite share, reported only, never gating:** windows whose last `won by` names `gemini-3.5-flash-lite` exactly,
over windows with a won-by line (h40c 44 of 45). Read from the won-by lines only; the pass record's `answerModel` and the
first `answer source:` label per answer name the head model, not the winner.

### Rule 2 — latency against h40c (all four sub-clauses gated; the rest reported)

- **2a. Screen clock median ≤ 5.100 s** = h40c's own 4.100 s + 1.000 s. The 1.0 s is the allowance h40c's rule gave
  itself against h40b's median; it is also nearly three times the whole stream's median length on the 16:12 cue run
  (`won by` → `budget`, 0.347 s), so a block that streams for as long as a typical whole answer still fits. Calibration:
  h40c 4.100 PASS; br1 4.621 PASS (the same code on a loaded day); the 16:12 run under the hold 5.313 FAIL.
  The screen clock's **p90 is reported, not gated**, against h40c's 6.498 s and the gate row's 10 s: br1 read 11.148 s on
  the same code without cue mode, so a p90 gate at any number that h40c's code passes on a loaded day would not test
  cue mode (rule 8 of the engineering rules: a check must answer differently when the effect is absent).
- **2b. Cue cost C: median ≤ 0.350 s and p90 ≤ 1.200 s.** These bound what cue mode adds between the model's first
  output and the screen. They sit above the hold's own numbers (0.217 / 0.717 s), so they do not detect the hold — that
  is 2e's job — and fail only a block that streams longer than a whole v2 answer used to (a long raw block streamed
  before the display cap, an offers block in front of the answer on many items, a slow chunk cadence). Sources: h40c
  and br1 at 2 ms; the 16:12 run's C row.
- **2c. The cue prompt's own cost at the model, on the same bytes: the cue twins' pooled TTFT median ≤ the no-cue
  twins' pooled TTFT median + 0.500 s.** Pooled = all three reps of each side together, over the ids answered (about
  132 per side); `ttft` as `interview60.answers.*.json` records it (the first RAW piece, before the chain: the sentinel
  for the cue side, the first prose chunk for the control — so it measures the prompt, not the block). The p90
  difference is reported. Why 0.5 s: on h40c the three `captured-high` reps' TTFT p50 read 3.2 / 3.4 / 3.5 s (a 0.3 s
  spread between reps of the same arm in the same hour), so 0.5 s is above the rep-to-rep noise; a larger cost means
  the model thinks or waits longer under the cue rule, which the candidate pays on every answer. Thursday's bench (cue
  reps vs `captured-high` on s50m's bytes, "time to first token: reported") is the first known case; its median
  difference is written into "What flies". **If that difference already exceeds 0.500 s, this clause is not quietly
  loosened: the controller raises it with the user before arming, and any change is a dated amendment with its reason.**
  INCOMPLETE when either side has a rep with more than 3 unanswered ids (a transient error, an HTTP 503).
- **2d. Answer failures ≤ 0** (h40c's own 0), counted per window as the sum of two terms: (i) h40c's definition,
  verbatim — a window with a failure line (`[WhatToAnswerLLM] Stream failed`, or the exact `verbal hedge: no answer -
  front empty, back empty`) and NO `won by` line, plus a window with both, resolved by its own last `[Answer] full:`
  text (charged when that text carries `[No answer —` or the "Could you repeat that? …" substitute; unresolved when no
  full line exists, which makes the clause INCOMPLETE, never PASS) — computed by `SP\h40c-hedge-stats.mjs`; and (ii)
  any window the first term did not charge whose last `[Answer] full:` carries one of those two failure texts,
  computed by `h40d-clocks.mjs` ("rule 2d, second term"; h40c 0, the synthetic failure fixture 1, the delivered fixture
  0). The second term exists because a **block-only answer** — a cue block with no spoken answer under it — has a
  `won by` line, no failure line, and the substitute: the candidate hears "Could you repeat that?", so it is an answer
  failure under this rule as well as a cue failure under rule 4. A D2-shaped death (first words shown, then
  `[No answer — …]`) is charged by either term. The readiness probe's answers before the window are rule 4's, not 2d's.
- **2e. The hold, `hold-read.mjs`'s `holdVerdict` over the hour's counted answers** (a won-by line, a non-empty block
  reported after it, words above 0, a stream of 50 ms or more): GONE = R2 under 15 ms in at most a quarter of them AND B
  under 15 ms in at most a quarter; NOT GONE = either in at least half; NO VERDICT between, or n under 12, or a counted
  answer with no `first token` line. **Gated (GONE required; NOT GONE fails rule 2; NO VERDICT makes it INCOMPLETE) if
  and only if Thursday's re-smoke read GONE; if the re-smoke read NOT GONE or NO VERDICT on a proven dist and the user
  accepted that residual — the cue-smoke pre-registration's own consequence — 2e is reported only.** Which branch
  applies is written into "What flies" before arming. The hold's known case: the 16:12 run, n 21, R2 under 15 ms in
  15, B in 16.
- **Reported, never gating:** the model clock's median and p90 against h40c's own (3.499 / 6.052 s) and br1's (4.105 /
  10.661 s); the screen clock's p90 (above); the gate row `Answer TTFT p90 · detect p50` (limit 10 s); dispatch after the
  question ends and first token after the question ends, p50 / p90 / max, in h40c's table form; C's max; the cues line →
  `first token` gap (screen-side, the early close's fingerprint); answer words p50 / p90 / max against h40c's 57 / 72 / 92
  and the 150-word cliff row (cue mode changes no prompt line about length; a moved length is reported, not judged).
- **The provider-load reading of a 2a breach, decided now:** if 2a fails while 2b and 2c PASS and the model clock's
  median exceeds **4.499 s** (h40c's 3.499 s + the same 1.000 s), the model was slower and the cue costs were not: rule 2
  reads **NO LATENCY VERDICT** (not FAIL) — the hour is re-flown inside the window before it counts toward validation,
  exactly as h40c's out-of-window rule works. A 2a breach with the model clock at or under 4.499 s, or with 2b or 2c
  failing, is a **FAIL**: the extra time is cue mode's.
- **The percentile method** for every median and p90 above: the element at index `min(n-1, floor(n*p))` of the
  ascending list — the method that reproduces h40c's 4.100 s / 6.498 s exactly. INCOMPLETE only ever replaces a
  would-be PASS: a charged failure, or a breach measured on an adequate sample (first-token lines covering at least 90%
  of the windows with a won-by line), decides rule 2 outright.

### Rule 3 — quality (3a, 3b, 3c gated; 3d, 3e reported)

- **3a. In-app acceptable ≥ 35 of 45**, all roster items, best answer per item, the judge's verdict (correctness 2,
  on_topic 2, delivery ≥ 1). The floor is h40c's own committed count, as h40c's floor was h40b's committed 35. Counted by
  `h40c-rule3.mjs`'s method (calibrated on h40a, h40b and h40c: it reproduces 35 of 45 = 28 of 33 + 7 of 12 on h40c).
- **3b. Zero wrong among the live in-app answers on the 40 items that are not R02F R04F R09F R11F R13F** — the five
  follow-ups that arrive without their parent on every hour of this roster (the 120 s eviction; their fix is not in this
  tree, §1). Their grades are reported beside the rule, never inside it. h40c: zero wrong on the 40; R09F wrong.
- **3c. The cue twins against the no-cue twins on the hour's own captured bytes** — the validation rule the cue-mode
  design set for this hour (09-20 spec §8; `memory/project_cue_mode_next.md`: "cue band overlaps or exceeds the no-cue
  band on the same bytes"), decided by the bench's calibrated pure function `benchDecide` (`SP\cuebench\cuebench-score.mjs`,
  `cuebench-calibrate.mjs`), fed per rep r = 1, 2, 3 with control = `captured-no-cues-high[-r]`, cue = `captured-high[-r]`:
  - **band:** max over the cue reps' acceptable counts ≥ min over the no-cue reps' — overlap or exceed; entirely below
    = FAIL;
  - **wrong:** no cue rep with more wrong answers (correctness 0) than the worst no-cue rep;
  - **cue checks:** in every cue rep, the RAW block (the recorded `cues` array, what the model wrote before the display
    cap) present AND shaped — 1 to 3 lines, none empty, none containing `?`, none containing "you" (`blockShape`, the
    bench amendment of 2026-09-30) — on at least 90% of the rep's ids; lines over 5 words and blocks with such a line
    are reported per rep, not gated (the app cuts a long line, which keeps every part; it drops a fourth line, which
    loses one — hence lines gate and words report).

  Inputs: one grader per arm, all six graded in the same session by the pinned grader (the bench paired control and
  cue answers blind because its controls carried an older grader's verdicts; here both sides are graded fresh
  together). Counts per rep: acceptable = ids whose verdict is acceptable; wrong = ids with correctness 0; an id with no
  answer in a rep (a transient error) counts as not acceptable and not wrong in that rep, and as not present for the
  cue check; a rep with more than 3 such ids makes 3c INCOMPLETE (that arm is re-run the same day if the ledger allows
  it; otherwise 3c has no verdict and the hour cannot PASS). The adapter that builds `benchDecide`'s input from the six
  verdict files, `SP\validation-hour\h40d-twins.mjs`, is calibrated before the hour on h40c's six twin arms with
  `captured-high` as the cue side and `captured-low` as the control: the known answer is band cue [36, 38] vs control
  [36, 37] → overlap, worst control wrong 2, cue wrong 1 / 0 / 2 → no stop, cue check n/a (no cues) → `PASS`. Words over
  5, the raw over-3 rate and each rep's TTFT p90 are printed beside the verdict.
- **3d. The per-item twin reading (reported; spec 2026-09-30 §9.7's method):** each in-app item is read against the
  captured cue twin of the leg that won it, from its last `won by` line — a 3.5-lite win against `captured-high` r1–r3,
  a 3.1-lite win against `captured-low` r1–r3 — with the combined band for context, in h40c's appendix-B form (in-app
  grade, winner, its own three twins, the other model's three). 3.1-lite wins are **never pooled into the 3.5
  comparison**: when 3.1-lite won 3 or more windows the three `captured-low` arms are graded (three more agents) and
  used; when it won 1 or 2, those items are listed with their in-app grade and no twin reading. The join of items to
  winners is made by hand from the judge's pairs and the clocks script's `--list` (h40c's method). Items in-app below all
  three of their own twins are named. h40c's reading: in-app 35 against a combined band of 36–38, one below it; below
  all three own twins on R04F, R14, R23.
- **3e. The holdout protocol's original band test (reported):** live in-app mains not below the lower edge of the cue
  twins' band on the mains, on the ids both captured. Reported because it fails the shipped baseline: h40b failed it by
  one (27 against 28–30) and h40c sat one below its own combined band, so gating it would fail cue mode for what the
  hedge already does.
- **Also reported:** the gate row `Interview-acceptable answers` as `metrics.mjs` prints it (h40c: 29 acceptable, 4
  weak, 0 wrong of 33 per pair, follow-ups 7 of 12); the five excluded follow-ups' grades; the Live ear's share
  (prompts carrying its rendering, answers dispatched from it — h40c 9 of 44 and 7 of 45), a confound named in advance.

### Rule 4 — the cue checks on the live hour (gated: no cue failure; the rest reported)

Read from the run folder's `natively_debug.log` (the app's whole log for the run, readiness probe included, as the
smokes read it) and `interview60.report.md`:

- **4a. `CHECK EXIT 0` from `check-smoke-cues.mjs` v4** (`node SP\check-smoke-cues.mjs h40d --runs <MAIN>\electron\test\golden\interview60.runs`;
  calibrated on 26 cases, `SP\calib-cue-smoke.mjs`): every `[Answer] cues:` line a non-empty block of at most 3
  non-empty lines of at most 5 words with no notation (a backtick, a backslash before a letter, a bracket or `%`; a money
  `$` is fine); the cue-line count in [real + superseded, real + superseded + failed] (real = model answers, superseded =
  `_what_to_say stream aborted by new generation` lines, failed = full lines with the engine's failure text); at least one
  real answer; no block-only answer (a non-empty cues line directly followed by the "Could you repeat that? …" full line,
  confirmed by its own `[Answer] budget: … words=0` line between them).
- **4b. The report's cue row `Cue block above every spoken answer`**: present = well-formed = n with n ≥ floor(0.9 ×
  delivered) (`interview60.metrics.mjs` row `cueBlocks`; well-formed = 1–3 non-empty lines, ≤ 5 words each, no `?`,
  no "you"). On the smokes it read `22/22 present, 22 well-formed, 4 trimmed`.
- **The three NOT CLEAN kinds, as the cue-smoke pre-registration decided them, applied to a holdout hour:**
  - **a cue failure** — a malformed non-empty block (4 or more lines, a line of 6 or more words, notation, an empty
    cue); an absent block (`[]`) beside a REAL answer; a true block-only answer (no transport error for it in the log):
    **rule 4 FAILS**;
  - **a pipeline event** — a `[]` directly before a failed answer (that failure is rule 2d's); a coding route's full line
    with no cues line (by design, no block on the CODING path; the gate row `Spoken questions routed CODING` names it);
    a superseded stream that logged no block; a count the failed or superseded answers explain; a knowledge
    short-circuit (`[LLMHelper] Knowledge mode (stream): returning generated intro response`, or a
    `{"__negotiationCoaching":…` full line): rule 4 reads **CLEAN NET OF PIPELINE EVENTS**, each event named in the
    result note with its lines; it does not fail rule 4 (the event's own consequence lives in rule 2d or rule 5);
  - **a health failure with no cue failure** (a question answered late, not at all, or not whole, for a reason the log
    places in the dispatcher or the provider): rule 5's, below.
- **Reported, never gating:** every `[Answer] cues trimmed:` line quoted verbatim from the run folder's log (not from
  the check's printout), split into cap overruns (`dropped`, `cut`) and cleanups (`cleaned`), each `cleaned` line read
  for a lost currency sign; the shape counts (`SP\cue-group\smoke-facts.mjs <run-dir>`: one / two / three lines, words per
  line, lines over 5); the number of ANSWERS with the offers-first warn line (`offers block before the spoken answer`),
  each read with its answer (a line followed by `budget: … words=0` and the substitute is a true block-only reply and
  a cue failure; a line followed by words is an answer the fix recovered; answers are counted, not lines, since a
  redirect can write a second line for one question); the hedge's won-by split; failed and superseded answers by name;
  `hold-read.mjs <run-dir> --list`'s rows (R2, R1, T, C, B) compared with the same script's printed lines on the
  Thursday re-smoke and on the 16:12 run, never with prose medians; 3.1-lite's cues (only on back-leg wins); the cue
  twins' raw over-3 and over-5 rates (from 3c).

### Rule 5 — reliability (hands-free, whole)

- **5a. Answered: at least 44 of the 45 roster items have an attributed in-app answer** (the judge's pairs; h40c 44 —
  R05, the three-word question, is lost before dispatch on every hour of this roster: h40b and h40c, a diagnosed
  pre-existing pipeline loss). `0 to nobody` on the `Answered hands-free` row is expected (h40c 0) and reported; an
  answer attributed to nobody simply leaves its item unanswered for this count.
- **5b. Long questions answered whole: 1 of 1** (R31; the dispatched text covers ≥ 80% of the question, the report's
  row; h40c 1 of 1).
- **The reading, decided now.** An item lost with NO answer-dispatch window (a `not-a-question` close, a fragment drop,
  nothing heard, a late Live text that only marked the turn) never ran the cue path; so **5a at 43 or fewer, or 5b at
  0 of 1, for causes the log places before dispatch, is VOID (re-fly), not FAIL** — rules 2–4 are still reported. An
  item dispatched but not delivered has a window and is rule 2d's (charged, whatever the cause: h40c's rule charged
  transport failures too). Doubles (h40c 1: R18, answered twice, both acceptable), `surfaced detections`, `STT socket
  closes / lost utterances` and Live reconnects are reported; the not-a-question / late-Live class (br1's S1Q08, the
  16:12 run's S1Q08) is pre-existing and has its own debugging pass.

### Counting rulings, before any verdict

- An item answered twice counts once toward 3a (its best answer) and both answers count for 3b (h40c's ruling).
- An item with no captured prompt (unanswered in-app) is absent from every captured arm; bands are read on the ids
  each rep answered; the number of ids per rep is printed with every count.
- A twin answer with an HTTP 503 or other transient error is "no answer" (3c's rule above), never re-graded by hand.
- The cue twins' `cues` arrays are the RAW blocks; the in-app `[Answer] cues:` lines are the DISPLAYED blocks (after
  `trimCues`); the two are never compared line for line — the in-app trims are quoted, the twins' overruns counted.
- Grades are the graders'; nothing is re-graded by hand. The judge grades prose only: `[Answer] full:` never carries a
  block (the engine hands the parser's prose to `SessionTracker`), and the captured arms strip the block through the
  built `stripCueBlock` before storing the answer.

## 5. What each verdict licenses

- **PASS** (rule 1 not void, in window, grader pinned, rules 2–5 PASS): cue mode is **validated** on the holdout: it
  stays in MAIN as shipped. It licenses, in this order and nothing else: (1) the five side fixes, one at a time, per the
  agenda's procedure, starting only after this hour's result note is written; (2) the follow-up earlier-questions
  flag-off build (if its Thursday replay PASSED) and that build's own pre-registered flight; (3) the 3.8 Flash bench
  (the user's paid key). A PASS is not evidence that cue mode improves quality (one hour, a ±4 noise floor on 45), and
  says nothing about the overlay's look, typed chat, the second-`__CUES__`-line leak, the typeset-fraction chunking, or
  3.1-lite's cues beyond the few back-leg wins.
- **FAIL on 2b, 2c, 3c or 4** (a cost or a defect the log or the twins place in cue mode): cue mode is **not validated**
  and does not stay as shipped: a reviewed revert of the merge on MAIN (dist rebuilt, one hands-free S1 smoke on the
  reverted build), or a reviewed change that disables the cue path, the choice being the user's; the failing leg is
  understood on non-holdout data (captured-prompt replays, scenario50) before any new cue build; the next holdout hour
  gets a new pre-registration; **nothing is tuned on holdout40**. The side fixes wait for the user's ruling and then land
  on whatever MAIN is.
- **FAIL on 2a (not the provider reading), 2d, 3a or 3b**: cue mode is not validated; the miss is read item by item in
  h40c's three-way form (pipeline / mixed / model, with the captured prompt against the scripted question and the six
  twins on the same prompt) before any decision; the user rules between revert and re-fly; never tuning on holdout40.
- **VOID** (rule 1, or rule 5's pre-dispatch losses): the hour did not test cue mode as built; re-fly on the next free
  quota day at the same start time under this same pre-registration (a dated "re-flight" note in "What flies", no rule
  change); rules 2–4 are reported for what they show.
- **INCOMPLETE** (2c/2d/2e/3c undecided with nothing already failed): the hour cannot PASS; the missing piece is re-run
  the same day if it is an offline arm and the ledger allows, else the hour is re-flown.
- **NO LATENCY VERDICT** (2a's provider reading, or an out-of-window start): quality and cue rules are read normally; the
  hour cannot PASS; re-fly inside the window.
- In every outcome the side fixes do not land before the result note exists.

## 6. The window, the grader and the day

- **Start** = the timeline's own `startedAt`, converted at UTC+3, printed by `h40c-hedge-stats.mjs` as
  `playback start HH:MM local — IN WINDOW 12:00-15:00` or `OUT OF WINDOW (cannot PASS)`; read first. Register the task at
  **13:30 on Friday 2 October 2026**; a slip is same-day only, after 10:00, with §8's ledger check. Outside the window,
  rule 2 is reported, not gated, and the hour cannot PASS.
- **Grader** pinned to `claude-opus-5-5` from the transcripts (§2); otherwise rule 3 is reported, not gated, and the hour
  cannot PASS.
- **The day depends on Thursday.** The hour flies only after: the 05:00 re-smoke PASSED (all three of its conditions),
  the bench PASSED (`PREREGISTER-cuebench.md` §3 with its amendments), the follow-up replay has run (its own day rule),
  the Opus merge review is done, MAIN is fast-forwarded and rebuilt, the dist proven, the pre-hour MAIN start done (§7),
  and this file is committed. If any of these slips off Thursday — the bench's second amendment moves the bench to "the
  next quota day that has neither a flight nor another pre-registered replay on 3.5-lite", and then the merge and this
  hour move after it — the hour moves to the first day that satisfies all of them, at 13:30, and "What flies" records
  the new date; no rule changes. The earlier-questions flight ("Saturday 3 October at the earliest") yields to this
  hour.
- **During the hour:** no vitest, tsc, build or npm on the machine; no other `Natively-*` task Running; no Live probe or
  ET38 run between 12:00 and 16:30 (the flight's Live ear uses the same service); the user logged on; AC power, sleep
  never, no restart pending; speaker unmuted at the calibrated level; port 5180 free; no Natively window open before the
  task fires (a MAIN instance holds the single-instance lock) — h40c's precheck list, run by `h40d-precheck.ps1`
  (h40c's `h40c-precheck.ps1` re-pointed) at 13:24.

## 7. Blocking checklist before arming (none is optional)

1. **The merge and the build.** MAIN's four docs commits merged into the cue branch; the branch's final Opus review
   done; MAIN fast-forwarded; `npm run build:electron` in MAIN once (a `Done in` line), then again (`Up to date, skipping
   build`); `dist-proof.mjs --root <MAIN> --expect combined …` → every marker as expected; the filter's sha256/16
   recorded. The registered HEAD is this file's own commit on top of that tree.
2. **The qualifying-HEAD test** (h40c's blocking item 1, adapted):
   `git diff --stat d83fdfe..<registered HEAD> -- electron src premium package.json ':(exclude)electron/test/golden/passes'`
   must be EMPTY — then the Thursday 05:00 re-smoke (worktree build of the same code, the same app-start chain,
   scenario50 S1, hedge default) is this hour's smoke of the program. If it is not empty, a pre-hour smoke of the
   changed program is owed before arming (a scheduled `Natively-smoke-cues`-shaped run on MAIN's build with the v4
   check), and "What flies" says which.
3. **The pre-hour MAIN start** (the one seam the re-smoke does not cross: MAIN's own checkout, `.env` loader, rebuilt
   dist and single-instance lock with cue mode in it): a scheduled task (never a Claude-session launch: shadow AppData),
   Thursday after the rebuild and outside any other task's window, that starts MAIN's app through
   `interview60.run.mjs` (the same chain the flight uses), lets the readiness probe answer, and stops it. Required in
   MAIN's `natively_debug.log`: `[Main] verbal hedge: on trigger=5000ms`, `[Main] follow-up parent: off`, at least one
   `verbal hedge: won by`, at least one non-empty `[Answer] cues:` line, no block-only answer, and `dist-proof` passing
   after it. About 2–5 lite requests, on Thursday's quota day. Its lines are quoted in "What flies".
4. **The instruments, each calibrated, outputs saved beside the old ones:** `launch-h40d.cmd` (ASCII, CRLF, checked
   byte by byte; edited with a node script, never `sed -i`) and its dry twin; `guard-h40d.mjs` with each premise broken
   once (`guard-h40d-cal.txt`); the dry twin registered as its own task and its log reading `GUARD OK` (and once from
   the wrong folder, refusing); `h40d-clocks.mjs` (done: h40c 4.100 / 6.498 reproduced, the 16:12 C 0.217, the 2d fixtures
   1 / 0); `h40d-rule3.mjs` (h40c's re-pointed: reproduces 35 of 45 on h40c); `h40d-twins.mjs` (the 3c adapter, the h40c
   known case in 3c); `check-smoke-cues.mjs` v4 (26), `hold-read.mjs` (47), `smoke-facts.mjs`, `dist-proof.mjs` on MAIN's
   root; `h40d-grader-dispatch.txt` and `h40d-merge.cmd`; `quota-ledger-today.mjs`.
5. **The chains wrap's first execution** (spec §3.5.7, R5): one `interview60.chains.mjs` run in MAIN after the rebuild
   with `interview60.chains.json` moved aside (about 25 calls on 3.1-lite, Thursday's quota day, only if the ledger
   allows) reading the stored answers for no `__CUES__`; if it cannot run Thursday, the flight's own chains pass is the
   first, and the post-flight read checks its `EXIT 0` line and the report's chains section for the same.
6. **The ledger** (§8) on the flight day before 11:00.
7. **This file committed** to MAIN's `passes/` with "What flies" filled; then the build command once more (`Up to
   date`); then the task registered (state Ready, next run 13:30); then the precheck sleeper and the flight-end watcher
   armed (session crons do not fire while a Monitor or a background agent runs: use a background sleeper).

## 8. Quota

Per-model requests the flight itself makes (the arms of §2; 44 captured ids if R05 is lost again, 45 if not):

- **gemini-3.5-flash-lite ≈ 390**: 45 hedge fronts + 33 bare + 33 `high` + 132 `captured-high` ×3 + 132
  `captured-no-cues-high` ×3 = 375, plus redirects (h40c 0), the readiness probe (2), warm-ups and preflight (≤ 10).
- **gemini-3.1-flash-lite ≈ 290–330**: 33 bare + 33 `low` + 44 `captured-minimal` + 132 `captured-low` ×3 = 242, plus back
  legs (h40c 7; up to about 40 under load), chains (≈ 25), the probe and preflight (≤ 10).

Both fit under the 500-per-model-per-day lite quota on a fresh quota day (reset 10:00 local / 07:00Z) and on no other.
**Rule:** at about 10:45 on the flight day, `node SP\quota-ledger-today.mjs <that day's reset ISO>` must show at most 60
requests used on 3.5-lite and at most 150 on 3.1-lite since the reset (h40c's day showed 0), and no bench, probe,
replay or smoke may be scheduled on that quota day; otherwise the hour moves to the next day that satisfies this. Full
Flash models are not used by any rule or reported row.

## 9. The order of reading after the hour

1. **The launcher log:** `wav:check` 45; `GUARD OK` with the HEAD and the tree state; dist proof 1 (combined, filter
   sha); the flight's readiness probe; `auto`'s `[build-electron] Up to date, skipping build` (a `Done in` line there
   means the task built: say so, name the tree); `AUTO EXIT`; the arms (every `captured-no-cues-high` arm ran, `0 of N
   lack it`); chains `EXIT`; the judge exports; `DONE` and the task's exit code; dist proof 2 (same sha).
2. **Rules 1 and 2, no grading:** `node SP\h40c-hedge-stats.mjs <run-dir>` — read the `playback start … IN WINDOW` line
   first, then rule 1 (a)–(c), the failure count (2d's first term) and its INCOMPLETE reasons; its own "rule 2 vs h40b"
   line carries h40b's thresholds and is **ignored**. Then `node SP\validation-hour\h40d-clocks.mjs <run-dir> --list` for
   2a, 2b, 2d's second term and the model clock; `node SP\cue-group\hold-read.mjs <run-dir> --list` for 2e and the rows.
   2c waits for the arms' answer files (`ttft` per id).
3. **Rule 4:** `node SP\check-smoke-cues.mjs h40d --runs …`; the report's cue row; `smoke-facts.mjs`; the trims quoted
   from the log; the offers-first count per answer; the coding-route and short-circuit lines, if any.
4. **Rule 5** from `interview60.report.md`'s rows and the judge's pairs (unanswered items by name, with their
   dispatcher lines).
5. **Rule 3:** grade the in-app pairs and the six twin pairs files (one agent each, `opus`, h40b's dispatch text; the
   three `captured-low` files only under 3d's condition); confirm `claude-opus-5-5` in every transcript; merge with
   `--model claude-opus-5-5`; `h40d-rule3.mjs` (3a, 3b), `h40d-twins.mjs` (3c, and the per-item table for 3d), the
   hand-made join of items to winners.
6. **The verdict**, in the order of §4 and §5: void → window and grader → 2 → 3 → 4 → 5.
7. **The result note** `passes/<date>-h40d-result.md` applying this file verbatim, with the h40c table form; an Opus
   fact-check of the note against the run folder (h40b's found 5 wrong and 6 missing claims, h40c's 5 wrong); the pass
   record (`interview60.pass-record.mjs <run-dir>`, the judge merges regenerate it) and INDEX; one docs commit to MAIN
   with `commit-main-paths.ps1 -Expected <registered HEAD>`; memory and the agenda updated.
8. Only then the side fixes.

## 10. What this hour cannot show (stated in advance)

- A trim or a cleanup, if no block overruns or carries notation during the hour (the twins' raw rates are the
  substitute evidence); 3.1-lite's cues, except on its back-leg wins (h40c 1 of 45; br1 2 of 40); the offers fix live, if
  no reply puts its offers first (about one in forty on 3.5-lite HIGH); a block-only answer on a simple question
  (holdout40's simple items are R05, R15, R18; R05 is lost before dispatch).
- The overlay itself: the user looks at it once during the run — the cues and the first words should appear together
  and the rest stream; the bar under the answer should show a first-token time a few tenths under the total and a rate in
  the hundreds, never the tens of thousands. Typed chat (its own check on a user-started build). The second
  `__CUES__` line leak (1 of 624 saved replies) and the typeset fraction (0 of 624): their own tasks.
- Quality beyond one hour's noise: the bare arms, which measured day-to-day noise on h40b (up to 5 of 33), are
  ungraded; the paired-grading noise floor is about ±4 on 45; 3c's bands are three reps a side.
- The follow-up parent defect (R09F, R11F class) and the R05 fragment drop: not cue mode's, unchanged in this tree.
- Provider load: the model clock is reported against h40c's and br1's, but one hour decides nothing about the hedge's
  tail on a different day; rule 2 gates only what cue mode adds (2b, 2c) and the candidate's total at the median (2a).
- Whether cue mode helps the candidate speak: the user's own delivery is deliberately unmeasured (the 09-20 decision).

## 11. What flies (filled at arming, 2026-10-0_)

- Registered HEAD: `________` (this file's commit); MAIN fast-forwarded to `________`; the four docs commits merged as
  `________`; the final Opus review: `________`.
- Build: `dist-electron/electron/main.js` written `________`; dist proof: `________`; filter sha256/16 `________`
  (worktree combined build: `42d9bc42dbd17870`).
- The qualifying-HEAD test (§7.2): `________` (empty / not empty → the smoke owed and run: `________`).
- The pre-hour MAIN start (§7.3): task `________`, lines quoted: `________`.
- Thursday's re-smoke: run `________`, `CHECK EXIT ___`, the three conditions `________`; `hold-read` verdict `________`
  → **2e is gated / reported** (strike one); the clocks script's lines on it: `________`.
- Thursday's bench: verdict `________`; cue-vs-control TTFT median difference `________ s` (2c's first known case;
  `________` ≤ 0.500 s, or the amendment `________`).
- The follow-up replay: `________` (verdict; nothing of it is in this tree).
- Chains run in MAIN (§7.5): `________` / deferred to the flight.
- The dry twin's `GUARD OK`: `________`; the allowlisted untracked files: `________`.
- The ledger on the flight day (§8): `________`.
- Task `Natively-flight-h40d`: registered `________` for `________ 13:30:00`, state Ready.

## 12. Open questions for the user (each with the draft's choice and why)

1. **How the twins are graded for 3c.** Chosen: the standard method, one pinned grader per arm, all six arms in one
   session (7 agents; 10 if 3d's condition triggers). The alternative is the bench's blind paired design (control and
   cue answers side by side in random order, two graders per file, mean counts, consensus-wrong): stronger against
   grader bias, 12 more agents, and it needs a new pairs builder for flight answer files (the bench's is bound to
   s50m's control files). Recommendation: the standard method — both sides are graded fresh together by the pinned
   grader, which is what the bench's pairing was compensating for; if the user wants the blind design, the builder must
   be written and calibrated Thursday.
2. **The live-mains-versus-twin-band gate.** The holdout protocol's original second-flight rule and the 09-20 design's
   §8 both gate it; h40c replaced it with the floor of 35 because it fails the shipped baseline (h40b by one; h40c one
   below its band). Chosen: h40c's floor gated (3a), the band reported (3e). Recommendation: keep.
3. **The screen clock's p90.** Chosen: reported, not gated (br1 read 11.148 s on h40c's own code). Recommendation: keep;
   a p90 gate at any bar h40c's code passes on a loaded day would not test cue mode, and 2b + 2c gate the tail cue mode
   can add.
4. **Rule 2c's 0.500 s.** Set now, before the bench's first cue-vs-control TTFT reading exists. If Thursday's bench
   shows a larger median difference, the clause is raised with the user before arming (amend with the reason, or accept
   a known FAIL). Recommendation: keep 0.500 s; a larger prompt cost is a real finding about "fast".
5. **Rule 2e's conditional gating.** Chosen: GONE gated only if Thursday's re-smoke read GONE; otherwise reported (the
   cue-smoke pre-registration's own "the user decides"). Recommendation: keep; the user already owns the NOT GONE
   decision on Thursday.
6. **The pre-hour MAIN start (§7.3).** Chosen: required (about 5 requests, a scheduled task Thursday evening). The user
   may waive it on the strength of h40c's and br1's proven chain plus the dist proof; then the flight's own readiness
   probe is the first start of MAIN's cue build. Recommendation: do it.
7. **Grading `captured-low` ×3 only when 3.1-lite won 3 or more windows.** Chosen to save three agents on an hour where
   3.1-lite won 1 of 45 (h40c) or 2 of 40 (br1); spec §9.7's "never pool" is kept either way. Alternative: always grade
   them. Recommendation: keep the condition.
8. **Transient holes in the twins.** Chosen: an unanswered id counts as not acceptable and not wrong in its rep; more
   than 3 holes in a rep makes 3c INCOMPLETE and that arm is re-run the same day if the ledger allows. Alternative: a
   hole in a cue rep counts as wrong (the bench's rule for empty prose). Recommendation: keep the symmetric rule; name
   every hole.
9. **The fallback day if Thursday slips.** Chosen: the first day satisfying §6 at 13:30, the earlier-questions flight
   yielding. Recommendation: confirm, since Saturday was pencilled for that flight.
10. **Replay arms.** The user made them opt-in for future flights and Friday keeps them; the switch is not built, so
    the harness runs its full list (the five ungraded arms cost about 175 lite requests and about 40 minutes).
    Recommendation: run the full list this once (nothing in the harness is changed before the hour); build the opt-in
    after.

## 13. Conflicts in the inputs, and how this draft resolves them

- **The `first token` sentence.** The cue-smoke pre-registration's 15:26 amendment says the line fires when the first
  prose LINE ends; its second amendment (for the combined build) and the early-close spec §6 say the first prose chunk
  after the block. The second is the build that flies; §3 carries it.
- **Band gate versus floor** (open question 2): the holdout memory and the 09-20 design gate the live mains against
  the twins' band; h40c's registered rule gates the floor of 35 and reports the band. The draft follows h40c, the latest
  committed rule, and reports the band.
- **Two graders versus one.** The agenda written before h40c said two Opus graders; h40c ruled one per arm before its
  data; the bench uses two blind graders per pairs file. The draft uses one per arm (open question 1).
- **Replay arms opt-in versus the harness as built** (open question 10): no conflict in effect for Friday.
- **The h40c stats script's built-in rule-2 thresholds are h40b's** (5.026 + 1.0 s, 13.608 s); its printed "rule 2 vs
  h40b" verdict is not this hour's rule and is ignored; rule 2 is read from `h40d-clocks.mjs` and the script's failure and
  coverage logic only.
- **The bench's day rule** can move the bench off Thursday, which moves the merge and this hour; the agenda's calendar
  names Friday. §6 states the dependency.
- **The 16:12 result note's first-token line** ("In this build the line fires when the first prose line ends") is true of
  the v2 build and superseded for the combined build; the clocks script reads that run as a known hold case only.
