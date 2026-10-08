# Pre-registration: flight h40d (holdout40, fourth flight) — cue mode's validation hour — REVISION 3

**Revision 3, written 2026-10-01 about 09:27 local (Thursday, after the 05:00 cue re-smoke PASSED, while the bench
runs, before the merge).** It replaces revision 2 (written about 01:50, not the 02:30 its header said; re-check N8)
after the scoped Opus re-check `RECHECK-r2.md` (READY WITH FIXES: 19 of the review's 21 findings addressed, I5 and
M13 partial, four new Important findings N1–N4, five new Minor N5–N9). Every re-check edit is applied as written
except where the controller's rulings on its open choices say otherwise; `CHANGES-r3.md` lists each item with the
edit applied or the reason for a different one, and ends with the short list of what only the user decides (also
§12, "Only the user"). Revision 2 (`PREREGISTER-h40d.md` in VH) and `CHANGES-r2.md` are unchanged. The controller
fills "What flies" (§11) at arming and commits this file to MAIN's `passes/` as `PREREGISTER-h40d.md` before the
task is registered. Not edited after the hour; the result goes in `passes/<flight-date>-h40d-result.md`, applying
this text verbatim.

Every number below names its source. The numbers marked "h40c's own", "br1's", "the hold's" and "the re-smoke's"
were computed before any h40d data existed by `SP\validation-hour\h40d-clocks.mjs` (revision 2),
`SP\validation-hour\h40d-thoughts-noise.mjs` (revision 3: its 2c INCOMPLETE line, re-check N6),
`SP\validation-hour\knowledge-mode-read.mjs` and `SP\validation-hour\h40d-knowledge-lines.mjs` (both new in this
revision, rule 1(g)); their full outputs are in `SP\validation-hour\CALIBRATION-NOTES.md`, `clocks.cal-r2.out.txt`,
`thoughts-noise.out.txt` and `knowledge-mode.out.txt`, re-written by `run-calibrations.mjs` after the N6 edit. The
reviewer's read-only scripts in `SP\validation-hour\review-scratch\` and the re-checker's in `recheck-scratch\` are
cited where their numbers are used; each was re-run by the controller.

`MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (branch `fix/coding-style-suffix-all-gemini`);
`WT` = `MAIN\.claude\worktrees\whole-turn` (branch `feat/whole-turn-answers`); `SP` = the controller's scratchpad
(`C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`);
`VH` = `SP\validation-hour`. Clock times are local (UTC+3, no DST) unless marked Z.

**Four words, defined once (review M10).** A **dispatch window** is the span from a `[Main] dispatch: answer` or
`dispatch: supersede` line to the next such line, in the app's debug log. The **run window** is the slice of the
debug and diag logs that `interview60.timeline.json` marks as the run (the readiness probe's answers lie before
it). The **flight window** is the playback-start window 12:00–15:00 local of §6. A **day** is a **quota day**: from
10:00 local (07:00Z, the Gemini lite reset) to the next 10:00, everywhere in this file.

## 1. What the hour tests, and what it does not

**The change under test is cue mode, alone.** Each spoken answer opens with a cue block of at most 3 lines of at most
5 words, above the answer; the block is written by the same model call as the answer, closed by the parser on the
first prose character, capped at the display and logged; a typed chat answer carries no block. It is always on (the
09-20 design's decision 6). This is the hour the holdout protocol requires before a shipped change counts as validated
(`memory/project_holdout_roster.md`: "ship only after ONE holdout hour scored against a rule fixed beforehand; NEVER
edit anything in response to a holdout number").

**The baseline is h40c** (2026-09-29, `PREREGISTER-h40c.md` at 0e1e8b2, `passes/2026-09-29-h40c-result.md`): the same
roster, audio, ears, grader and rubric, the hedge ON, no cue mode. PASS in its window: first token median 4.100 s,
p90 6.498 s, 0 answer failures, quality 35 of 45 exactly at its floor, 44 of 45 answered (R05 lost), zero wrong on
the 40 gated items.

**The tree that flies is MAIN after Thursday's merge** — MAIN's branch fast-forwarded to the refreshed prep merge of
the cue branch (the Opus merge review `SP\merge-review\MERGE-REVIEW.md` reviewed `1852d89` = `8a13abb` into `fed4b07`;
it is refreshed if either side moves, and the refreshed merge's `git diff --stat <cue head> <merge> -- .
':!electron/test/golden/passes'` must be empty with MAIN's tip a parent). Read on 2026-10-01 from the two checkouts,
confirmed by the review's "What checked out":

- MAIN's tip is `fed4b07`. Since h40c's HEAD `0e1e8b2` MAIN carries two app commits and six docs commits:
  `f745d7e` **feat(verbal): the hedge is the default answer policy** (`NATIVELY_VERBAL_HEDGE` unset = on; `0` = the old
  stall race; anything else refuses to start) and `0ef42a0` **fix(stt): a word lost between two Deepgram finals is
  restored from the interim** (the boundary repair, flown live in br1 on 2026-09-30; not a cue-mode change). Docs only:
  `94adb6f`, `e78f7c7`, `e3db5cb`, `c7e991d`, `ee5f8ac`, `fed4b07`.
- The cue branch (`WT`, tip `8a13abb`, code head `d83fdfe`) contains MAIN's two app commits through the merge `279103b`
  (parents `fd57512` + `0ef42a0`). MAIN's four commits absent from it touch only `electron/test/golden/passes/`. **So
  after the merge the app and harness code equals the cue branch at `d83fdfe`, the code the Thursday 05:00 re-smoke
  flies.** The app/harness diff between MAIN's tip and the cue branch is the cue work: 35 files, +1884/−94.
- The cue work, by commit (all on `feat/whole-turn-answers`): v1 `8682b32` (the cue rule at the prompt tail),
  `577d13a` (parser: strip the block, hand the cues out once), `6b7817f` (composition innermost, once-guard), `d648ff3`
  (engine: `[Answer] cues:` once, cues on the first prose token, IPC), `51424e4` (render the block), `f299fae` (harness
  cue checks, `--cues`/`--no-cues`, the cue row), `feaf897` + `49183fc` (the same-bytes no-cue twin, three reps, fails
  closed), `3fd5ba4`, `1ddb738`; the branch's own earlier fixes (first-token aborts `d267870`, `1f23a5e`, `f06fdc8`; the
  model label `5d5ab34`, `896f726`; the emphasis strip `b80a677`; the build cwd `33eae76`; the Gemma handover
  `09d0c0e`; the exit listener `97fc38d`; the grader model `76f90f7`; the harness key `fd57512`), reconciled in the merge
  `279103b`; after the merge: `1901ab6` (hedge × cue seam tests), `721c6fa` (no-cue twins re-pointed to 3.5-lite HIGH),
  `4c07ae9` (3 × 5 and the `one-first` shape bullet, `CUE_RULE` sha256/12 `8e15e4e7dd41`), `949ebc2`, `38da4ac` +
  `578190f` (`trimCues`), `87877ee` (the cap at the display boundary, `[Answer] cues trimmed:` logged), `a7e9a79`,
  `efda6cf` (typed chat sends `VERBAL_TYPED_PROMPT`, no cue rule), `4b051a9` (chains strips the block like the app),
  `e3fae5f`, `64d74a1` (the early close), `18da7fa` (source-text pins), `d83fdfe` (an offers block before the spoken
  answer no longer swallows the answer; one `console.warn` line per such stream). Docs: `b649011`, `416d4de`,
  `e49886c`, `8a13abb`.
- One non-cue behaviour rides along (merge review, "What rides along"): `interview60.run.mjs` and
  `interview60.answers.mjs` read `GEMINI_API_KEY` from the environment first (`fd57512`). No `GEMINI*` variable exists
  in any scope on this machine (the review checked names only), so both still read `.env`.

**Not in the tree, on purpose, so the hour measures cue mode alone:**

- **The five side fixes** (`AGENDA.md`, "The side fixes"): the replay test path, the notation filter's chunking, the
  salary card against the 200-word cap, typed chat's MORE list, the retry-after-failure model. None is committed;
  each sits in its own session worktree on `fed4b07`. **They land AFTER this hour has been read** (its result note
  written), one at a time, per the agenda's procedure. Nothing else lands on MAIN between the registered commit and
  the end of the hour.
- **The follow-up "earlier questions" change** (`PREREGISTER-followup-questions.md`, `94adb6f`): its offline replay is
  NOT a precondition of this hour (review I6; the replay's own §6.2 lets its calibration run after the merge against a
  dist compiled at `0e1e8b2`). Even a PASS licenses a flag-off BUILD, not this hour's tree. `6c50ec3`'s parent restore
  stays flag-off: `NATIVELY_FOLLOWUP_PARENT` is unset (the app logs `[Main] follow-up parent: off`). The five
  parentless follow-ups (R02F R04F R09F R11F R13F) therefore arrive as on h40b and h40c, and every zero-wrong clause
  below (3b and 3c) excludes them as h40c's did.
- **Nothing from the 3.8 Live or Extended Thinking work** (L20c STOP; ET38 offline) touches the app.

## 2. The run

| | |
|---|---|
| Name | **h40d** (holdout40's fourth flight); run folder `MAIN\electron\test\golden\interview60.runs\<stamp>-h40d`; launcher log `interview60.runs\flight-h40d.launcher.log` |
| Task | `Natively-flight-h40d`, registered by `SP\register-h40d.ps1` (h40c's `register-h40c.ps1` with the name and date changed): **Friday 2026-10-02 13:30:00 local if the merge lands on Thursday**, otherwise the fallback day of §6; interactive logon (the user logged on), 5 h limit, StartWhenAvailable OFF (a missed start never fires late), `-WorkingDirectory MAIN` |
| Window | playback start (the timeline's own `startedAt`, converted at UTC+3) **inside the flight window 12:00–15:00 local**, h40c's; a 13:30 task fire gave 13:36 on h40b and h40c. Slip: same quota day only, with §8's ledger checked. Outside the window the hour CANNOT PASS (§6). |
| Roster, audio, ears | `holdout40` (45 items: 33 mains + 12 follow-ups; R31 the one `long` item), `holdout40.wav` (SAPI David, deterministic, `wav:check` 45), Deepgram + the Live ear, exactly as h40a–h40c |
| Configuration | the shipped default, every model, hedge, thinking and follow-up variable **cleared** in the launcher (`set NAME=` unsets it in cmd; the hedge default is ON when unset, per `f745d7e`; the guard refuses any value of `NATIVELY_VERBAL_HEDGE`, `1` included, because the hour tests the default; the guard's `.env` scan proves no `.env` line refills any of them): `NATIVELY_STT_PROVIDER=deepgram`, `NATIVELY_ROSTER=holdout40`, `NATIVELY_SCENARIOS=`, `NATIVELY_GEMINI_THINKING_LEVEL=`, `NATIVELY_VERBAL_PRIMARY_MODEL=`, `NATIVELY_VERBAL_HEDGE=`, `NATIVELY_VERBAL_HEDGE_TRIGGER_MS=`, `NATIVELY_FOLLOWUP_PARENT=`, `NATIVELY_FLIGHT_COMMIT=<the registered HEAD's full hash>` |
| Build | MAIN's `dist-electron`, rebuilt from the registered HEAD after the fast-forward, proven by `node SP\dist-proof.mjs --root <MAIN> --expect combined --prefix-count 3 --offers-marker "offers block before the spoken answer"` printing `DIST PROOF: THE COMBINED BUILD, every marker as expected` (the six v2 markers, `CUE_LINE_PREFIX` ×3, the offers line ×1, `CUE_RULE` sha256/12 `8e15e4e7dd41`, limits 3 × 5) — **twice in the launcher log, before the run and after it** (the run's `auto` step rebuilds when any `electron/**/*.ts` is newer than the oldest output; the second proof is the dist that flew), with the filter's sha256/16 recorded both times (the worktree's combined build read `42d9bc42dbd17870`; a different value on MAIN is explained in "What flies" before arming, never after) |
| Harness command | `launch-h40d.cmd` (§7.4): `wav:check` → dist proof 1 → `guard-h40d.mjs` → `"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs h40d` → dist proof 2, all appending to the launcher log; guard failures go to `%TEMP%\natively-h40d-launcher-error.log`, which must not exist at arming |
| The guard | `guard-h40d.mjs` (§7.4): h40c's `guard-h40c.mjs` re-pinned, plus the cue build's markers in MAIN's dist (the merge review's item 6) and knowledge mode ON in the persisted settings (check 13; rule 1(g), re-check N1). `GUARD OK` from the dry twin `launch-h40d-dry.cmd`, registered as its own scheduled task, is required before the real task is registered. |
| Knowledge mode | **ON (the Context toggle), as on h40c and br1** — not an environment variable: persisted as `knowledgeMode: true` in `%APPDATA%\natively\settings.json` (`SettingsManager.ts:28`; written by the toggle, `ipcHandlers.ts:3030`; restored at start by `main.ts:687`). Read without starting the app by `VH\knowledge-mode-read.mjs` after the user's live look (§7.3a), required by the guard's check 13 at launch, proven by the prestart's `Knowledge mode ENABLED` line (§7.3), and VOID under rule 1(g) if the hour's own log says otherwise. |
| MAIN frozen | from the registered commit (this file's own commit) through the end of the hour: any commit moves HEAD and the guard refuses; nothing under `electron/` is touched between the build and the run |

**The arms** (the harness's list as built, `interview60.flight.mjs` `PAIRED_ARMS` at `721c6fa`, plus the two bare arms;
holdout40 has no focused five, so the four Flash arms are skipped with one log line; the user's decision of 30 Sep
makes replay arms opt-in for future flights, but "Friday keeps them, because there they ARE the test", and the opt-in
switch is not built, so the list runs as it stands — its two costs are named in §8):

| arm | model, level | prompt | role this hour |
|---|---|---|---|
| in-app | the hedge: 3.5-flash-lite HIGH front, 3.1-flash-lite LOW back from 5 s | the app's own, with `CUE_RULE` | **the live hour** — graded |
| `captured-high`, `-r2`, `-r3` | gemini-3.5-flash-lite HIGH | the hour's captured prompts as the app built them (they carry `[CUES FIRST]`, i.e. `CUE_RULE`) | **the cue twins ×3** — graded; their raw `cues` arrays are the cue checks' input; their `thoughts` are 2c's |
| `captured-no-cues-high`, `-r2`, `-r3` | gemini-3.5-flash-lite HIGH | the same bytes with `CUE_RULE` stripped (`answers.mjs --no-cues`, which refuses a prompt without the rule) | **the no-cue twins ×3** — graded; the control |
| `captured-low`, `-r2`, `-r3` | gemini-3.1-flash-lite LOW | the captured prompts, rule included | the back leg's cue twins — **always graded** (review Q7: the arms run anyway; three agents; the join no longer waits on grading) |
| `captured-minimal`, `low`, `high`, bare `gemini-3.1-flash-lite`, bare `gemini-3.5-flash-lite` | as named | as named | run by the harness, ungraded (as on h40c) |
| chains (`interview60.chains.mjs`, ~25 calls on 3.1-lite) | | | run by the flight; its `EXIT 0` line and the report's chains section are read; the first cue hour through the chains wrap (`4b051a9`) unless Thursday's MAIN chains run happened (§7.5) |

**The arms' order, named in advance (review I2, Q10):** the harness runs the arms one after another in
`PAIRED_ARMS` order; the three no-cue twins run LAST, after `high`. On h40c `captured-high` ran 15:15–15:26 and `high`
15:26–15:29 (`flight-h40c.launcher.log`), so the control starts about 15 minutes after the cue side. Two costs follow:
provider drift is confounded with the cue rule in the TTFT comparison, always in the same direction (which is why 2c
reads thinking tokens); and if 3.5-lite runs short of quota the control is lost first (§8).

**The proof that the captured prompts carry the rule (review I4).** The flight logs `ruleSummary` only inside a skip
line (`interview60.flight.mjs:341–347`); on a clean cue hour "0 of N lack it" never appears. The proof is therefore
three lines: (i) no launcher-log line containing both `paired arm captured-no-cues-high` and `skipped`; (ii)
`interview60.flight.done.json`'s `pairedArms` lists `captured-no-cues-high`, `-r2` and `-r3`; (iii) each of the three
`--no-cues` `answers.mjs` runs logs `EXIT 0` (`answers.mjs:301–305` exits 2 on any captured prompt without the rule).
Any of the three failing = rule 1(e), VOID: the hour did not fly cue mode.

**The grader.** `claude-opus-5-5`, one grading agent per graded arm, all ten in one session (review Q1; h40c's ruling,
made before its data: the pre-registration defines no second in-app grader and the floor of 35 came from one),
dispatched with h40b's dispatch text verbatim (`VH\h40d-grader-dispatch.txt`, h40c's with h40d's file names),
`model: "opus"`, the grader model read from every agent's own transcript (`VH\h40d-grader-models.mjs`, §7.4), the
frozen grader prompt and rubric, stamp `8564ba96369a`. Every merge carries `--model <the exact id read from the
transcripts>` (`VH\h40d-merge.cmd`, h40c's `h40c-merge.cmd` re-pointed, with the three no-cue arms added; cwd MAIN).
Graded: the in-app pairs (`interview60.judge.pairs.json`) and the nine twin pairs files (three families × three
reps). Graders see prose only: `[Answer] full:` never carries a block (the engine hands the parser's prose to
`SessionTracker`), and the captured arms strip the block through the built `stripCueBlock` before storing the
answer, so the cue-vs-no-cue comparison is blind by construction. What happens if the alias no longer resolves to
`claude-opus-5-5` is decided in §6 ("GRADER DRIFT").

## 3. The clocks, and why the first-token clock is not h40c's

In a cue build the diag line `first token N ms` (`tapFirstToken`, the first non-empty non-sentinel chunk out of the
whole filter chain) fires **on the first prose chunk after the cue block** (merge review item 6) — the block's own
streaming time plus the line filter's decision on the first prose line (a few characters, at most 48) — because
`stripCueBlock` sits innermost and, with the early close (`64d74a1`), releases the first prose chunk the moment the
pending text can no longer be a cue line (spec `2026-09-30-cue-early-close.md` §5, §6; the second amendment of
`PREREGISTER-cuesmoke.md`). On h40c the same line fired on the first prose chunk with no block in front of it. So
h40c's 4.100 s / 6.498 s and this hour's `first token` numbers measure the same screen moment but not the same model
work.

**The decomposition (corrected per review I1).** The screen clock's t0 is `WhatToAnswerLLM.ts:310`, 4 ms after the
dispatch line at the median (h40c; br1 5 ms; the 16:12 run 11 ms). The hedge's t0 is `LLMHelper.ts:3478`. Between the
two, `streamChat` awaits the knowledge step (`LLMHelper.ts:2441–2474` → `KnowledgeOrchestrator.processQuestion` →
`getRelevantNodes(…, this.embedFn, …)`, an embedding call through the cascaded pipeline, `main.ts:660–670`): a network
round trip unless the local model serves it. Cue mode does not touch it. So, per dispatch window and exactly by
construction (G is computed as the remainder, so the script's printed 0 ms residual checks its arithmetic only; what G contains rests on the code trace above):

**screen clock = G + model clock + C**, where **G** = hedge t0 − screen-clock t0 (the knowledge step), the **model
clock** = the winner's first raw chunk after the hedge's t0, **C** = the winner's first text → the first prose chunk on
screen. G is about half a second, not milliseconds: h40c median **0.504 s**, p90 0.635 s, max 0.786 s (n 45).

All clocks come from `VH\h40d-clocks.mjs <run-dir> [--list]` (numbers, ids and timestamps only; calibrated on h40c,
br1, the 16:12 cue re-smoke, the 05:00 v1 smoke and three synthetic fixtures — `CALIBRATION-NOTES.md`). The screen
clock is every `first token` line in the run window (h40c's method); the other three are read per dispatch window.

| clock | read from | what it is | h40c's own (n 45) | br1's (no cues, next day, scenario50 S1+S2, n 40) | the hold's (16:12 cue run, v2, n 21/20) |
|---|---|---|---|---|---|
| **screen clock** | the diag `first token N ms` value (h40c's registered method) | what the candidate waits for: the first prose chunk on screen; in a cue build the cues ride it | median **4.100 s**, p90 **6.498 s**, max 10.514 s | 4.621 / 11.148 / 20.417 s | 5.313 / 6.411 / 13.084 s |
| **model clock** | the `verbal hedge: won by <model> at N ms` value of the window's LAST won-by line | the winner's first raw chunk, before the block: like-for-like across hours with and without cue mode (the same hedge code, the same t0) | median **3.499 s**, p90 **6.052 s**, max 9.961 s | 4.105 / 10.661 / 19.985 s | 4.594 / 5.035 / 5.649 s |
| **gap G** | (won-by line time − its N ms) − (first-token line time − its N ms) | the knowledge step before the hedge starts; not cue mode's | median **0.504 s**, p90 0.635 s, max 0.786 s | 0.501 / 0.555 / 1.219 s | 0.674 / 1.165 / 6.879 s (n 20; the 6.9 s is one window, #10, a stall before the hedge started: dispatch → won-by 11.9 s with the model clock at 5.0 s) |
| **cue cost C** | the `won by` line's timestamp → the next diag `first token` line's timestamp (one process, two files) | how long the winner's first text waited to reach the screen: the block's streaming plus the holds behind the parser | median **0.002 s**, p90 0.003 s, max 0.026 s | 0.002 / 0.003 / 0.006 s | **0.217 / 0.717 / 1.170 s** (block + whole first paragraph, the hold the early close removes) |

br1 is the same hedge code on a loaded day, but a different roster: scenario50's answers are longer (words p50 85
against holdout40's 57), so its slower model clock is roster plus load (review M10). `hold-read.mjs`'s R2 and B reads
(the hold's fingerprint: the cues line and the end of the stream under 15 ms apart) are read beside C, as the
cue-smoke pre-registration reads them; hold-read reads the WHOLE debug log, readiness probe included.

**The combined build's first run — the re-smoke's (the re-check's residual risk on G).** The 05:00 re-smoke
(`WT\electron\test\golden\interview60.runs\2026-10-01T02-37-41-cuesmoke`: the dist that flies, scenario50 S1, hedge
on; `h40d-clocks.mjs`, n 20 in the run window, `clocks.cal-r2.out.txt`): screen clock 4.742 / 5.770 / 5.999 s; model
clock 4.232 / 5.162 / 5.379 s; **G 0.594 / 1.112 / 1.147 s** — its median 0.093 s above br1's 0.501 s, under the 0.1 s
line the re-check set for saying the provider reading could book a cue cost as load (its p90, 1.112 s against br1's
0.555 s, is reported beside it; G is the embedding call, which cue mode does not touch); **C 0.052 / 0.192 / 0.193 s**
(the hold's 0.217 / 0.717 s gone: the early close); cues line → first token 0.002 / 0.007 / 0.091 s; 2d 0 charged in
the run window and in the whole log (22 windows). One window — the first of the run proper, dispatched
02:03:21.006Z — reads G = 2 ms with no `Intent classified` line: the knowledge step did not run on it (rule 1(g)'s
known case; the 16:12 run shows the same on its first run window, G 8 ms; h40c and br1 never).

## 4. The rule

The hour **PASSES** only if rule 1 is not VOID, the window and the grader conditions of §6 hold, and rules 2, 3, 4 and
5 all PASS. Rules 2–5 are ALWAYS computed and reported, VOID hour included. §5 gives every outcome's consequence and
the precedence between them.

### Rule 1 — mechanical eligibility (VOID, not FAIL; h40c's rule 1 plus three cue-build conditions)

VOID on any of:

- (a) the app's own startup line, read from BEFORE the run window (last match), is not exactly
  `[Main] verbal hedge: on trigger=5000ms`;
- (b) fewer than 95% of dispatch windows, net of knowledge short-circuit windows (rule 4), contain a `verbal hedge: front=` line;
- (c) an objective 3.5-lite outage: at least 50% of hedge runs (`front=` line count) are followed by
  `back started … reason=front-error`; `reason=trigger` is never void (it is what the hedge does under load);
- (d) either dist proof in the launcher log does not read `THE COMBINED BUILD, every marker as expected`, or the two
  proofs' filter sha256/16 differ. **A rebuild by `auto` with an unchanged filter sha is not void** (it is reported
  with the tree state; a tree the guard proved clean at the registered HEAD compiles to the same filter); **a changed
  sha is VOID** (review M6);
- (e) the captured prompts do not all carry the rule: any of the three proof lines of §2 fails (a `paired arm
  captured-no-cues-high … skipped` line; `pairedArms` without the three no-cue tags; a `--no-cues` run without
  `EXIT 0`): the hour did not fly cue mode;
- (f) the reliability void of rule 5 (more than 2 losses before dispatch);
- (g) knowledge mode not on, as it was on h40c (re-check N1): the last `[KnowledgeOrchestrator] Knowledge mode ENABLED` /
  `DISABLED` line before the run window is not `ENABLED`, or a `DISABLED` line falls inside it, or fewer than 95% of
  dispatch windows carry an `[KnowledgeOrchestrator] Intent classified` line (h40c and br1: one `ENABLED` after
  `[AppState] Knowledge mode restored from settings`, no `DISABLED`, `Intent classified` 47 for 47 and 42 for 42
  windows in the whole log; the two cue smokes, 16:12 and 05:00: 23 of 24 and 21 of 22, the one window without the
  line being the first of the run proper in both, where G reads 8 ms and 2 ms — the knowledge step did not run on that
  window, cause unproven — which the 95% line tolerates twice in 45; read after the hour by
  `VH\h40d-knowledge-lines.mjs <run-dir>`, which names every window without the line, and the clocks `--list` gives
  each such window's G, a G under 20 ms being the step's absence). The Context toggle persists (`ipcHandlers.ts:3030`
  writes `knowledgeMode` to `%APPDATA%\natively\settings.json`, `SettingsManager.ts:28`; `main.ts:687` restores it
  at start — `ENABLED` is logged only when the key is true) and the live look of §6 turns it on and off; with it off
  the knowledge step (G) and the knowledge prompt are gone, and 2a and rule 3 would compare another configuration
  with h40c's. Pinned BEFORE the hour as well: the persisted key read without starting the app (§7.3a,
  `VH\knowledge-mode-read.mjs`), the guard's check 13 (§7.4) and the prestart's `ENABLED` line (§7.3).

**3.5-lite share, reported only, never gating:** windows whose last `won by` names `gemini-3.5-flash-lite` exactly,
over windows with a won-by line (h40c 44 of 45). Read from the won-by lines only; the pass record's `answerModel` and the
first `answer source:` label per answer name the head model, not the winner.

### Rule 2 — latency against h40c (2a–2d gated; 2e gated on a condition; the rest reported)

- **2a. Screen clock median ≤ 5.100 s** = h40c's own 4.100 s + 1.000 s. The 1.0 s is the allowance h40c's rule gave
  itself against h40b's median; it is also nearly three times the whole stream's median length on the 16:12 cue run
  (`won by` → `budget`, 0.347 s), so a block that streams for as long as a typical whole answer still fits. Calibration:
  h40c 4.100 PASS; br1 4.621 PASS (another roster on a loaded day); the 05:00 re-smoke 4.742 PASS (the combined build
  on S1, §3); the 16:12 run under the hold 5.313 = a 2a breach,
  which under this rule's own provider reading (below) is NO LATENCY VERDICT, not FAIL — its 2b passes (0.217 /
  0.717 s) and its model clock is 4.594 s; **only 2e catches the hold**, and does (NOT GONE, n 21). The screen clock's
  **p90 is reported, not gated** (review Q3), against h40c's 6.498 s and the gate row's 10 s: br1 read 11.148 s on the
  same code without cue mode, so a p90 gate at any number that h40c's code passes on a loaded day would not test cue
  mode; 2b's p90 bounds what the block adds at the tail, and C's max is reported.
- **2b. Cue cost C: median ≤ 0.350 s and p90 ≤ 1.200 s.** These bound what cue mode adds between the model's first
  output and the screen. They sit above the hold's own numbers (0.217 / 0.717 s), so they do not detect the hold — that
  is 2e's job — and fail only a block that streams longer than a whole v2 answer used to (a long raw block streamed
  before the display cap, an offers block in front of the answer on many items, a slow chunk cadence). Sources: h40c
  and br1 at 2 ms; the 16:12 run's C row; the 05:00 re-smoke's C row (0.052 / 0.192 s, the combined build) sits far
  inside them.
- **2c. The cue prompt's own cost at the model, on the same bytes, read from thinking tokens (review I2, Q4): the cue
  twins' pooled median `thoughts` ≤ the no-cue twins' pooled median `thoughts` + 150 tokens.** `thoughts` =
  `usageMetadata.thoughtsTokenCount`, recorded by `interview60.answers.mjs` on every Gemini answer (`:175`, `:192`).
  Pooled = all three reps of each side together, over the ids answered (about 132 per side); computed by
  `VH\h40d-thoughts-noise.mjs <run-dir>`. Provider load cannot move a token count, and the arms' run order (§2)
  cannot bias it. **Why 150, with its provenance (`thoughts-noise.out.txt`):** on the scenario50 hours' 3.5-lite HIGH
  twins (`captured-high` r1–r3, the same bytes three times in one hour) the per-rep medians read s50k 874 / 897 / 905,
  s50l 849 / 890 / 887, s50m 911 / 892 / 899 tokens; the largest difference between one rep's median and the other two
  pooled was **38 tokens** (s50l), the largest rep-to-rep spread 41; across the three days the pooled medians sat within
  18 tokens of each other (895, 882, 900) while their TTFT medians sat within 7 ms (3851, 3855, 3858) on calm mornings —
  and TTFT moved by up to 0.99 s between adjacent reps on h40b's afternoon. The holdout hours, used as MEASUREMENT
  NOISE ONLY (never to choose app behaviour): one-rep-versus-two differences 30 / 67 / 25 (h40a / h40b / h40c), the 67
  on h40b's loaded day. 150 is about four times the scenario50 figure and more than twice the worst holdout figure.
  The pooled Theil–Sen slope of TTFT on thoughts, stalls over 10 s excluded, reads 2.90 / 2.81 / 2.75 (s50k/l/m) and
  3.77 / 2.94 / 3.29 (h40a/b/c) ms per token, median about 2.9: 150 tokens is about **0.44 s** of model time, the
  sub-second model-side cost the draft's 0.5 s meant. The TTFT p50 and p90 differences are REPORTED beside it, with
  the 0.5 s line and the run order named, never gated. **Fallback:** if fewer than 90% of the answered ids on either
  side carry a finite `thoughts` (the script prints the coverage), TTFT decides at **+1.000 s** on the pooled medians
  (above h40b's 0.99 s adjacent-rep spread, `review-scratch/arm-ttft.mjs`), and §10 says the hour could not detect a
  sub-second model-side cost. **"Ids answered"** = `spoken` non-empty and no `transientError` (review I3); ids that
  a same-day re-run filled (§4, counting rulings) are excluded from 2c with `--exclude` and named (review E, M12).
  INCOMPLETE when either side has a rep with more than 3 true holes (`transientError`: an HTTP 503 after four tries);
  the script then prints `INCOMPLETE (more than 3 true holes: <side> <rep> (<n>), …)` whatever the medians say
  (re-check N6; known case: s50e's single-rep `gemini-3.7-flash` arm as both sides, 4 holes of 5 → INCOMPLETE, where
  the revision-2 script read `PASS (fallback)`).
  **The first real reading (a preview, not a calibration: its answer is not known beforehand) is Thursday's bench's thinking-token difference** (cue reps on s50m's bytes against s50m's
  `captured-high` of 2026-09-22 — token counts are comparable across days; the bench's TTFT is NOT a known case for
  this clause: its control ran nine days earlier, and `cuebench-score.mjs` prints p90s only): `h40d-thoughts-noise.mjs
  <bench cue dir> --cue <tag> --control gemini-3.5-flash-lite_captured-high --control-dir <s50m run dir>` (the tag
  naming on the bench's files is checked on the day), written into "What flies". **If that difference already exceeds
  150 tokens, this clause is not quietly loosened: the controller raises it with the user before arming, and any
  change is a dated amendment with its reason.**
- **2d. Answer failures ≤ 0** (h40c's own 0), read per dispatch window as the UNION of two terms, both computed and
  joined per window by `h40d-clocks.mjs` (review M4; the h40c stats script's own failure count is the cross-check on
  term 1): (i) h40c's definition, verbatim — a window with a failure line (`[WhatToAnswerLLM] Stream failed`, or the
  exact `verbal hedge: no answer - front empty, back empty`) and NO `won by` line, plus a window with both, resolved by
  its own last `[Answer] full:` text (charged when that text carries `[No answer —` or the "Could you repeat that? …"
  substitute; not charged when it is a real answer); (ii) any window whose last `[Answer] full:` carries one of those
  two failure texts, failure line or not. The second term exists because a **block-only answer** — a cue block with
  no spoken answer under it — has a `won by` line, no failure line, and the substitute: the candidate hears "Could you
  repeat that?", so it is an answer failure under this rule as well as a cue failure under rule 4. A D2-shaped death
  (first words shown, then `[No answer — …]`) is charged by either term. **2d FAILS when the union is 1 or more.**
  **UNRESOLVED:** a window with a won-by line, no `[Answer] full:` line and no supersede after it (never delivered,
  not superseded) is undecided and makes 2d INCOMPLETE unless something is already charged. Calibration
  (`clocks.cal-r2.out.txt`): the synthetic fixtures `r2-failure` / `r2-delivered` / `r2-unresolved` read charged
  1 / 0 / 0 and UNRESOLVED 0 / 0 / 1; the real block-only answer (the 16:12 run's readiness probe, whole log, window #2
  dispatched 13:12:04.732Z: a won-by line, 0 failure lines, the substitute) reads charged 1 by term 2 alone; h40c's
  whole log reads 0. The readiness probe's answers lie before the run window and are rule 4's, not 2d's.
- **2e. The hold, `hold-read.mjs`'s `holdVerdict` over the hour's counted answers** (a won-by line, a non-empty block
  reported after it, words above 0, a stream of 50 ms or more; the WHOLE debug log, the readiness probe's answers
  included): GONE = R2 under 15 ms in at most a quarter of them AND B under 15 ms in at most a quarter; NOT GONE =
  either in at least half; NO VERDICT between, or n under 12, or a counted answer with no `first token` line. **Gated
  (GONE required; NOT GONE FAILS rule 2 and is cue-attributable, §5; NO VERDICT makes it INCOMPLETE) if and only if
  Thursday's re-smoke read GONE; if the re-smoke read NOT GONE or NO VERDICT on a proven dist and the user accepted
  that residual — the cue-smoke pre-registration's own consequence — 2e is reported only.** **The branch, decided in
  this revision: Thursday's 05:00 re-smoke read GONE** (`hold-read.resmoke2.out.txt`, the whole log: 21 counted
  answers, R2 under 15 ms in 0, B under 15 ms in 0; T median 370 ms; the dist proven, `CHECK EXIT 0`, filter sha
  `42d9bc42dbd17870` in both proofs) **→ 2e is GATED this hour**; §11 records it. Known cases: the hold, the 16:12 run, n 21, R2 under 15 ms in 15, B in 16
  (NOT GONE); no hold on this roster, h40c: B under 15 ms in 3 of 47 answers, the whole stream's median T 156 ms
  (br1: 0 of 42, T 197.5 ms) — a correct early close should read GONE comfortably on holdout40.
- **Reported, never gating:** the model clock's median and p90 against h40c's own (3.499 / 6.052 s) and br1's (4.105 /
  10.661 s); G against h40c's (0.504 / 0.635 s) and br1's (0.501 / 0.555 s); dispatch → won-by (G + model; h40c
  4.101 s); the screen clock's p90 (above); the gate row `Answer TTFT p90 · detect p50` (limit 10 s); dispatch after the
  question ends and first token after the question ends, p50 / p90 / max, in h40c's table form; C's max; the cues line →
  `first token` gap (screen-side, the early close's fingerprint; the 16:12 run 4 / 8 / 9 ms); answer words p50 / p90 /
  max against h40c's 57 / 72 / 92 and the 150-word cliff row (cue mode changes no prompt line about length; a moved
  length is reported, not judged).
- **The provider reading of a 2a breach, decided now (review I1):** cue mode's parts of the screen clock are exactly C
  (gated by 2b) and the model-side cost (gated by 2c on the twins). So a 2a breach is a **FAIL** — cue-attributable —
  only when **2b or 2c FAILS**. A 2a breach with 2b and 2c both PASS reads **NO LATENCY VERDICT** (not FAIL): the
  model or the knowledge step was slower and the cue costs were not; the hour is re-flown inside the window before it
  counts toward validation, as h40c's out-of-window rule works. The explanation is reported beside it: the model
  clock's median against 4.499 s (h40c's 3.499 + 1.000) and G's median against h40c's 0.504 s; equivalently, dispatch →
  won-by's median against 4.751 s (4.101 + 1.000 − 2b's 0.350). A 2a breach with **2b or 2c INCOMPLETE** (2b INCOMPLETE =
  first-token lines covering under 90% of the windows with a won-by line) is **INCOMPLETE** until both are decided
  (review I5d, re-check I5(e)).
- **The percentile method** for every median and p90 above: the element at index `min(n-1, floor(n*p))` of the
  ascending list — the method that reproduces h40c's 4.100 s / 6.498 s exactly. INCOMPLETE only ever replaces a
  would-be PASS: a charged failure, or a breach measured on an adequate sample (first-token lines covering at least 90%
  of the windows with a won-by line), decides that clause outright (a 2a breach then goes through the provider reading).

### Rule 3 — quality (3a, 3b, 3c gated; 3d, 3e reported)

**One definition of "wrong", for 3b and 3c alike (review A, C1):** the judge's own `verdictOf` "wrong" —
correctness 0 **or** on_topic 0 (`interview60.judge.mjs:171–175`). It is what `h40c-rule3.mjs` tests (`verdict ===
'wrong'`) and what h40c's tables count. The two definitions diverge in practice: h40b's in-app R11F was wrong on
on_topic 0 with correctness above 0; on h40c's `captured-low` reps the verdict-wrong counts are 2 / 1 / 2 and the
correctness-0 counts 1 / 0 / 1 (`review-scratch/twin-wrongs.mjs`). For twin records only, empty prose (3c's counting,
below) also counts wrong; which empty-prose records enter 3c's gated clause is said there.

- **3a. In-app acceptable ≥ 35 of 45**, all roster items, best answer per item, the judge's verdict (correctness 2,
  on_topic 2, delivery ≥ 1). The floor is h40c's own committed count, as h40c's floor was h40b's committed 35. Counted by
  `VH\h40d-rule3.mjs` (h40c's method re-pointed: it reproduces 35 of 45 = 28 of 33 + 7 of 12 on h40c, 35 on h40b, and
  fails h40a on its wrong R09). **A 3a miss read as noise, decided now (review M13):** 3a sits exactly on h40c's own
  count, and the in-app counts on this roster were 39, 35 and 35, with a paired-grading noise floor of about ±4 on 45.
  A 3a miss with **3c PASS** and the in-app count **at most 1 below the smallest of its own three cue twins' counts on the ids
  they share** (the baseline's own gap: h40c in-app 35 against its twins' lowest 36, h40b 35 against 36, h40a 39 against 37; under "not below", a 3a miss on an h40c-shaped hour could never read as noise) reads as noise: the consequence is a re-fly, not a revert (§5). A 3a miss without both is an "other
  FAIL" (§5).
- **3b. Zero wrong among the live in-app answers on the 40 items that are not R02F R04F R09F R11F R13F** — the five
  follow-ups that arrive without their parent on every hour of this roster (the 120 s eviction; their fix is not in this
  tree, §1). Every delivered answer on the 40 counts, a double's second answer included. Their grades are reported
  beside the rule, never inside it. h40c: zero wrong on the 40; R09F wrong.
- **3c. The cue twins against the no-cue twins on the hour's own captured bytes** — the validation rule the cue-mode
  design set for this hour (09-20 spec §8; `memory/project_cue_mode_next.md`: "cue band overlaps or exceeds the no-cue
  band on the same bytes"), decided by the bench's calibrated pure function `benchDecide` (`SP\cuebench\cuebench-score.mjs`,
  `cuebench-calibrate.mjs`), fed per rep r = 1, 2, 3 with control = `captured-no-cues-high[-r]`, cue = `captured-high[-r]`
  by the adapter `VH\h40d-twins.mjs` (§7.4), which reads the ANSWERS files (holes, empty prose, the raw `cues`) as well as
  the merged judge files:
  - **band, on all ids:** max over the cue reps' acceptable counts ≥ min over the no-cue reps' — overlap or exceed;
    entirely below = FAIL. (Symmetric and lenient: about 5% null failure for iid reps, review C2.)
  - **wrong, on the 40 gated ids (review C2; re-check N2) — the controller's default, the sums with a margin of one:**
    the cue reps' TOTAL gated wrong (the one definition above, summed over the three reps) ≤ the no-cue reps' total
    gated wrong + 1; **the all-ids counts are printed beside it, never gated.** Its null STOP with no cue effect is
    0.9% at a 5% per-rep chance of a gated wrong and 3.1% at 10% (`recheck-scratch/gated-null.mjs`, re-run for this
    revision); it still stops two or more extra gated wrong answers, and a single one — a block-only twin included —
    is named and read item by item (§5), never a STOP by itself. This replaces `benchDecide`'s per-rep wrong clause for
    this hour: the adapter feeds `benchDecide` the band and the cue check only and decides this clause itself, printing
    both readings. **The alternative the user may choose before arming (§12, "Only the user"): the strict per-rep
    clause** — no cue rep with more gated wrong than the worst no-cue rep — whose null STOP is 12% at 5% and 20% at
    10%: its control, 3.5-lite HIGH, read 0 gated wrong in all nine reps of h40a–h40c, so its worst rep will very
    likely be 0 and any single gated wrong or block-only twin in any cue rep STOPs. Why the 40: every wrong answer on
    the 3.5-lite HIGH twins of h40b and h40c (9 of 9) is on R02F, R09F or R11F, and on the 40 gated ids those twins
    have 0 wrong in all nine reps of h40a–h40c (`twin-wrongs.mjs`); on all ids the null probability of a per-rep STOP
    with no cue effect is about 30% (verdict-wrong) or 21% (correctness-0), on the 40 about 0 by the plug-in (nine
    reps all 0, an input that cannot produce a STOP — not a proof: nine zero reps allow a per-rep chance up to 28%,
    and at 5% the strict clause stops 12% of hours with no cue effect, `recheck-scratch/gated-null.mjs`;
    `review-scratch/wrong-clause-null.mjs`). A 3c STOP is a cue-attributable FAIL that leads to a revert; it must not
    be drawn from how R09F and R02F happen to fall. **Empty prose in this clause (re-check N2):** a block-only twin —
    cues present, prose emptied by any stage other than `filterCodeFences` — counts, since it cannot exist without cue
    mode; a record whose prose `filterCodeFences` removed (a fenced answer, which the verbal path drops by design, cues or
    not) is a pipeline event on either side: counted wrong in the all-ids line and named, never in this clause. Both
    empty-prose records on file (s50l `captured-high-r3` S1Q06, s50m `captured-high-r2` S2Q06; 2 of 825 3.5-lite HIGH twin
    answers) are fenced answers, and the combined build's chain still empties them (`recheck-scratch/replay-stages.mjs`).
  - **cue checks:** in every cue rep, the RAW block (the recorded `cues` array, what the model wrote before the display
    cap) present AND shaped — 1 to 3 lines, none empty, none containing `?`, none containing "you" (`blockShape`, the
    bench amendment of 2026-09-30) — on at least 90% of the rep's ids **net of true holes** (review I3, Q8); lines over 5
    words and blocks with such a line are reported per rep, not gated (the app cuts a long line, which keeps every
    part; it drops a fourth line, which loses one — hence lines gate and words report).

  **Counting per rep (review I3, Q8, M12):** acceptable = ids whose verdict is acceptable; wrong = ids with the verdict
  "wrong". A **true hole** = a record with `transientError` (no answer after four tries): it counts as not acceptable
  and not wrong in that rep, on either side alike (the symmetric rule), and is EXCLUDED from the cue check's n; a rep
  with more than 3 true holes makes 3c INCOMPLETE. **Empty prose** = a record with no `transientError` and an empty
  `spoken` (an answer the filters emptied, or a block-only twin — the exact cue failure the offers fix was for;
  `pairsFromAnswers` at `judge.mjs:163–168` never grades it, so it looks like a 503 in the verdict files): it counts as
  **wrong** on either side (the bench's rule), and on the cue side, with its cues present, it is named as a block-only twin (which empty-prose records enter the gated clause: "wrong" above). Known real cases
  of empty prose without a transient error on no-cue answers: s50l `captured-high-r3` S1Q06 and s50m
  `captured-high-r2` S2Q06 (`thoughts-noise.out.txt`); a known true hole: h40c `captured-low-r3` R10 (HTTP 503). An
  INCOMPLETE 3c makes the hour INCOMPLETE (it cannot PASS): the arm with the holes is re-run the same quota day if
  the ledger allows (with `--only <that rep's transientError ids>`, never a bare resume: `answers.mjs:314` skips only records whose
  `spoken` is non-empty, so a bare resume also re-draws every empty-prose record and could resample a block-only twin
  away; from MAIN, as the flight invokes the arm (`flight.mjs:350–353`): `node electron\test\golden\interview60.answers.mjs
  --model <the arm's model> --tag <the arm's tag> --thinking HIGH [--no-cues for a control rep] --captured
  <run-dir>\interview60.prompts.json --only <ids>`, which resumes from `electron\test\golden\interview60.answers.<model>_<tag>.json`
  (the flight copies, never moves, that file into the run folder); then the file is copied over the run folder's copy
  and re-exported with `interview60.judge.mjs <run-dir> --answers <that file> --export` before grading); its filled ids are graded by the
  pinned grader in the same session, named in the result note, and excluded from 2c (`--exclude`); if the ledger does
  not allow it, the hour is re-flown.

  **The known case, restated after C1 and C2 (h40c's six twin arms, `captured-high` as the cue side, `captured-low` as
  the control, the cue check marked not applicable on a pre-cue hour):** band cue [36, 38] against control [36, 37]
  (the control's r3 is 36 of 43) → overlap; wrong on the 40 gated ids: control 1 / 0 / 0 (R08 in r1; total 1), cue 0 / 0 / 0 (total 0 ≤ 1 + 1) → no
  stop; all-ids wrong printed beside: control 2 / 1 / 2, cue 1 / 0 / 2 → **PASS**. h40b the same way: band cue [36, 39]
  against control [38, 40] → overlap; gated wrong control 0 / 0 / 1 (R08 in r3; total 1), cue 0 / 0 / 0 (total 0) → PASS, under the default and the strict alternative alike. The cue check is
  calibrated on cases WITH cues (review M9, §7.4), not on "n/a".
- **3d. The per-item twin reading (reported; spec 2026-09-30 §9.7's method):** each in-app item is read against the
  captured cue twin of the leg that won it, from its last `won by` line — a 3.5-lite win against `captured-high` r1–r3,
  a 3.1-lite win against `captured-low` r1–r3 — with the combined band and the no-cue twins for context, in h40c's
  appendix-B form (in-app grade, winner, its own three twins, the other model's three, the three no-cue twins).
  3.1-lite wins are **never pooled into the 3.5 comparison**. The join of items to winners is made from the judge's
  pairs (`dispatchedAt`) and the clocks script's `--list`, whose rows now carry each window's dispatch and won-by ISO
  timestamps (review M3). Items in-app below all three of their own twins are named. h40c's reading: in-app 35 against
  a combined band of 36–38, one below it; below all three own twins on R04F, R14, R23.
- **3e. The holdout protocol's original band test (reported):** live in-app mains not below the lower edge of the cue
  twins' band on the mains, on the ids both captured. Reported, not gated, because at the edge the shipped baseline
  itself fails it about half the time (review M2, `review-scratch/mains-band.mjs`): h40b's mains read 27 against
  29 / 28 / 30 (below by one); h40c's read 28 against 28 / 29 / 30 (passes at the edge; h40c's "one below" in the draft
  was the all-items reading, 35 against 36–38); h40a's 29 sat inside 27 / 31 / 28. Gating it would fail cue mode for
  what the hedge already does half the time.
- **Also reported:** the gate row `Interview-acceptable answers` as `metrics.mjs` prints it (h40c: 29 acceptable, 4
  weak, 0 wrong of 33 per pair, follow-ups 7 of 12); the five excluded follow-ups' grades; the Live ear's share
  (prompts carrying its rendering, answers dispatched from it — h40c 9 of 44 and 7 of 45), a confound named in advance.

### Rule 4 — the cue checks on the live hour (FAILS only on a cue failure; the rest reported)

Read from the run folder's `natively_debug.log` (the app's whole log for the run, readiness probe included, as the
smokes read it) and `interview60.report.md`. **Rule 4 FAILS only on a cue failure (defined below); a failed check or
row explained entirely by pipeline events reads CLEAN NET OF PIPELINE EVENTS = PASS** (review M7). The two instruments:

- **4a. `check-smoke-cues.mjs` v4** (`node SP\check-smoke-cues.mjs h40d --runs <MAIN>\electron\test\golden\interview60.runs`;
  calibrated on 26 cases, `SP\calib-cue-smoke.mjs`): every `[Answer] cues:` line a non-empty block of at most 3
  non-empty lines of at most 5 words with no notation (a backtick, a backslash before a letter, a bracket or `%`; a money
  `$` is fine); the cue-line count in [real + superseded, real + superseded + failed] (real = model answers, superseded =
  `_what_to_say stream aborted by new generation` lines, failed = full lines with the engine's failure text); at least one
  real answer; no block-only answer (a non-empty cues line directly followed by the "Could you repeat that? …" full line,
  confirmed by its own `[Answer] budget: … words=0` line between them). Its `CHECK EXIT 0` is the expected reading; a
  non-zero exit is read line by line against the three kinds below.
- **4b. The report's cue row `Cue block above every spoken answer`**: present = well-formed = n with n ≥ floor(0.9 ×
  delivered) (`interview60.metrics.mjs` row `cueBlocks`; well-formed = 1–3 non-empty lines, ≤ 5 words each, no `?`,
  no "you"). On the smokes it read `22/22 present, 22 well-formed, 4 trimmed`.

**The three kinds, as the cue-smoke pre-registration decided them, applied to a holdout hour:**

- **a cue failure** — a malformed non-empty block (4 or more lines, a line of 6 or more words, notation, an empty
  cue); an absent block (`[]`) beside a REAL model answer that is not a knowledge short-circuit (below); a true
  block-only answer (no transport error for it in the log): **rule 4 FAILS**, cue-attributable (§5);
- **a pipeline event** — a `[]` directly before a failed answer (that failure is rule 2d's); a coding route's full line
  with no cues line (by design, no block on the CODING path; the gate row `Spoken questions routed CODING` names it);
  a superseded stream that logged no block; a count the failed or superseded answers explain; **a knowledge
  short-circuit** (next paragraph): rule 4 reads **CLEAN NET OF PIPELINE EVENTS**, each event named in the result note
  with its lines; it does not fail rule 4 (the event's own consequence lives in rule 2d, rule 3 or rule 5);
- **a health event with no cue failure** — a question answered late, or not whole, for a reason the log places in
  the dispatcher or the provider: **reported** (rule 5 does not measure lateness; 5b measures wholeness); a question
  not answered at all is rule 5's.

**The two knowledge short-circuits, classified now (merge review item 6, final review M2).** The intro short-circuit
(`[LLMHelper] Knowledge mode (stream): returning generated intro response`) and the negotiation card (a full line
whose JSON text is `{"__negotiationCoaching":…}`) yield a fixed text before any model call, so no cue rule ran; each
logs `[Answer] cues: []` and fails the cue row (the merge review reproduced it). They are **neither a cue failure nor
silently excused**: (i) each is named by item id in the result note as a **short-circuit answer**, with its full
line's kind (intro or card), and counted on the reported row `short-circuit answers` (h40c 0, h40a 1 — the salary
card on R09); (ii) it is removed from 4b's n and from 4a's per-line shape check (the `[]` is expected); (iii) its
answer is graded like any other in-app answer, so its consequence lives in rule 3 — on h40a the card on a technical
question was graded wrong, and on this roster a card or an intro on any of the 40 gated items would fail 3b; (iv) it
never makes the hour VOID (rule 1(b) is read net of its windows, re-check N7). The report's row `Technical questions answered via the coaching path` is the cross-check; it counts `__negotiationCoaching` occurrences, two log lines per card (h40a's one card reads 2).

**Reported, never gating:** every `[Answer] cues trimmed:` line quoted verbatim from the run folder's log (not from
the check's printout), split into cap overruns (`dropped`, `cut`) and cleanups (`cleaned`), each `cleaned` line read
for a lost currency sign; the shape counts (`SP\cue-group\smoke-facts.mjs <run-dir>`: one / two / three lines, words per
line, lines over 5); the number of ANSWERS with the offers-first warn line (`offers block before the spoken answer`),
each read with its answer (a line followed by `budget: … words=0` and the substitute is a true block-only reply and
a cue failure; a line followed by words is an answer the fix recovered; answers are counted, not lines, since a
redirect can write a second line for one question); the hedge's won-by split; failed and superseded answers by name;
`hold-read.mjs <run-dir> --list`'s rows (R2, R1, T, C, B) compared with the same script's printed lines on the
Thursday re-smoke and on the 16:12 run, never with prose medians; 3.1-lite's cues (only on back-leg wins); the cue
twins' raw over-3 and over-5 rates (from 3c); the short-circuit answers (above).

### Rule 5 — reliability (hands-free, whole)

- **5a. Answered: every roster item has an attributed in-app answer, except items lost before dispatch, which the
  reading below decides (the baseline's one expected, a second counted not acceptable, a third VOID); 5a FAILS only on
  an item lost after dispatch that 2d does not charge (re-check N3, ruling D)** (the judge's pairs; h40c 44 —
  R05, the three-word question, was lost before dispatch on h40b and h40c, a diagnosed pre-existing pipeline loss; h40a
  answered it when the Live ear added words). `0 to nobody` on the `Answered hands-free` row is expected (h40c 0).
  **An answer attributed to nobody is a harness miss** (h40b's R07F): it is resolved by hand from its dispatch line's
  `question=` text before this count, and named (review M8).
- **5b. Long questions answered whole: 1 of 1** (R31; the dispatched text covers ≥ 80% of the question, the report's
  row; h40c 1 of 1).
- **The reading, decided per item (review M8, D).** Each lost or partial item is placed by the log **before** or
  **after** its dispatch.
  - **Lost before dispatch** (a `not-a-question` close, a fragment drop, nothing heard, a late Live text that only
    marked the turn): the item never ran the cue path. The baseline's one such loss (R05) is expected. **Each loss
    beyond it counts as not acceptable in 3a and the hour continues** — the verdict then reads "PASS net of
    pre-dispatch losses" only if 3a still holds that way, and it validates as a PASS does; a pre-dispatch loss within this bound never fails rule 5. **More than 2 losses before dispatch make the hour VOID**
    (rule 1(f); re-fly): the bound is the baseline hours' worst plus one — h40a lost 0 before dispatch (`Answered
    hands-free` 45/45), h40b 1 (R05; its R07F was dispatched, to nobody) and h40c 1 (R05), from the three pass records'
    rows and result notes; `not-a-question` closes occurred 2, 3 and 1 times on those hours without losing more.
  - **Dispatched but not delivered, or not whole:** it has a dispatch window and is rule 2d's when 2d charges it
    (h40c's rule charged transport failures too); a dispatched item that 2d does not charge and that has no attributed
    answer, or 5b at 0 of 1 for a cause after dispatch, is a **rule-5 FAIL** ("other FAIL", §5).
  - Doubles (h40c 1: R18, answered twice, both acceptable), `surfaced detections`, `STT socket closes / lost
    utterances` and Live reconnects are reported; the not-a-question / late-Live class (br1's S1Q08, the 16:12 run's
    S1Q08) is pre-existing and has its own debugging pass.

### Counting rulings, before any verdict

- An item answered twice counts once toward 3a (its best answer) and both answers count for 3b (h40c's ruling).
- An item with no captured prompt (unanswered in-app) is absent from every captured arm; bands are read on the ids
  each rep answered; the number of ids per rep is printed with every count.
- A twin record with `transientError` is a true hole; a twin record with empty `spoken` and no `transientError` is
  empty prose and counts wrong in 3c's all-ids line, and in its gated clause only as rule 3c's "wrong" says (a block-only twin yes, a `filterCodeFences` emptying no); neither is re-graded by hand.
- A same-day re-run of a twin arm passes `--only` with that rep's `transientError` ids (never a bare resume, which re-draws empty prose too); the filled ids are graded by the pinned grader, named, and
  excluded from 2c.
- The cue twins' `cues` arrays are the RAW blocks; the in-app `[Answer] cues:` lines are the DISPLAYED blocks (after
  `trimCues`); the two are never compared line for line — the in-app trims are quoted, the twins' overruns counted.
- Grades are the graders'; nothing is re-graded by hand. "Wrong" has the one definition of rule 3 everywhere.

## 5. What each verdict licenses, and the precedence between them

**Precedence (review I5e).** The hour's verdict is the first of these that applies:

1. **cue-attributable FAIL** — 2b, 2c, 2e (when gated), 3c, rule 4, or a 2a breach with 2b or 2c failing. **It is read in
   ANY hour whose dist proofs and captured-rule proof pass (rule 1(d) and 1(e)), even an hour that is VOID on 1(a)–(c)
   or 1(f) or 1(g) or NO LATENCY VERDICT or INCOMPLETE** (review I5f, C): a cue failure seen in a VOID hour stops cue mode
   exactly as a rule-4 FAIL would, and there is no re-fly until it is fixed. Sampling until it passes is not allowed.
   **In an out-of-window hour every clause of rule 2 is reported and none is a FAIL (§6; ruling 6 on re-check I5(d)):
   there only 3c and rule 4 reach this item; a reported 2b, 2c or 2e reading beyond its bound is named in the result
   note, and the re-fly inside the window decides it.**
2. **VOID** (rule 1(a)–(g); under 1(d) or 1(e) item 1 does not apply — the build or the captured rule is unproven — and cue failures are reported only): the hour did not test cue mode as built; re-fly on the next free quota day at the
   same start time under this same pre-registration (a dated "re-flight" note in "What flies", no rule change); rules
   2–5 are reported for what they show.
3. **other FAIL** — 2d, 3a (not read as noise, with 3c decided),
   3b, rule 5 (a 2a breach is never here: item 1 with 2b or 2c failing, item 4 with either INCOMPLETE, item 5 otherwise;
   in an out-of-window hour 2d is reported only, §6).
4. **INCOMPLETE** — 2a or 2b on first-token lines covering under 90% of the won-by windows, 2c, 2d, 2e or 3c
   undecided, or a verdicts file missing for 3a or 3b, with nothing already failed; a 2a breach with 2b or 2c
   INCOMPLETE; a 3a miss while 3c is INCOMPLETE.
5. **NO LATENCY VERDICT** — 2a's provider reading, or an out-of-window start (there every clause of rule 2 is reported and none is a FAIL, §6); and, with the same consequence (cannot PASS; re-fly inside the window), **3a NOISE** — a 3a miss read as noise (rule 3a).
6. **PASS**.

**GRADER DRIFT** is a modifier on any of these (§6).

- **PASS** (rule 1 not void, in window, grader pinned, rules 2–5 PASS): cue mode is **validated** on the holdout: it
  stays in MAIN as shipped. It licenses, in this order and nothing else: (1) the five side fixes, one at a time, per the
  agenda's procedure, starting only after this hour's result note is written; (2) the follow-up earlier-questions
  flag-off build (if its replay PASSED) and that build's own pre-registered flight; (3) the 3.8 Flash bench (the user's
  paid key). A PASS is not evidence that cue mode improves quality (one hour, a ±4 noise floor on 45), and says nothing
  about the overlay's look, typed chat, the second-`__CUES__`-line leak, the typeset-fraction chunking, or 3.1-lite's
  cues beyond the few back-leg wins.
- **Cue-attributable FAIL** (2b, 2c, 2e when gated, 3c, rule 4, 2a with 2b or 2c failing): cue mode is **not
  validated** and does not stay as shipped: a reviewed revert of the merge on MAIN (dist rebuilt, one hands-free S1
  smoke on the reverted build), or a reviewed change that disables the cue path, the choice being the user's; the
  failing leg is understood on non-holdout data (captured-prompt replays, scenario50) before any new cue build; the
  next holdout hour gets a new pre-registration; **nothing is tuned on holdout40**. The side fixes wait for the user's
  ruling and then land on whatever MAIN is.
- **Other FAIL on 2d, 3b, or rule 5**: cue mode is not
  validated; the miss is read item by item in h40c's three-way form (pipeline / mixed / model, with the captured
  prompt against the scripted question and the nine twins on the same prompt) before any decision; the user rules
  between revert and re-fly; never tuning on holdout40.
- **A 3a miss**: read as **noise → re-fly** when 3c PASSES and the in-app count is at most 1 below the smallest of its own
  cue twins' counts on the shared ids (rule 3a); otherwise an other FAIL as above.
- **VOID** (rule 1, or more than 2 pre-dispatch losses): re-fly as above.
- **INCOMPLETE** (§5 item 4: 2a/2b on thin first-token coverage, 2c/2d/2e/3c undecided, a verdicts file missing, a 3a miss while 3c is undecided, with nothing already failed): the hour cannot PASS; a missing offline piece
  is re-run the same quota day if the ledger allows (3c's holes; 2c follows), else the hour is re-flown.
- **NO LATENCY VERDICT** (2a's provider reading, or an out-of-window start): rules 3, 4 and 5 are read normally; in an
  out-of-window hour every clause of rule 2 is reported and none is a FAIL (§6; ruling 6 on re-check I5(d)); the hour
  cannot PASS; re-fly inside the window. **3a NOISE** (rule 3a) has the same consequence.
- In every outcome the side fixes do not land before the result note exists.

## 6. The window, the grader and the day

- **Start** = the timeline's own `startedAt`, converted at UTC+3, printed by `h40c-hedge-stats.mjs` as
  `playback start HH:MM local — IN WINDOW 12:00-15:00` or `OUT OF WINDOW (cannot PASS)`; read first. Register the task at
  **13:30**; a slip is same quota day only, with §8's ledger check. Outside the window, every clause of rule 2 (2a–2e) is reported, not gated — none
  reads as a FAIL, cue-attributable or other (§5 items 1 and 3; ruling 6 on re-check I5(d)); rules 3, 4 and 5 are read
  normally, and the hour cannot PASS (NO LATENCY VERDICT: re-fly inside the window).
- **Grader.** Pinned to `claude-opus-5-5` from every grading transcript (`h40d-grader-models.mjs`). **GRADER DRIFT
  (review B, I5c; re-check I5(g)), decided now:** the `opus` alias is read from ONE throwaway probe agent — model
  "opus", a one-line task — dispatched BEFORE any h40d grader, its model read from its own transcript with
  `h40d-grader-models.mjs` (§9.5; and once more at arming, §11; ruling 5). If it no longer resolves to
  `claude-opus-5-5`, the hour is graded by the new model, every merge names it, and the transcripts and the result
  note name it. Rules computed within this hour and graded by that one grader together — **3b and 3c — still gate**.
  Rules compared against h40c's grader — **3a's floor of 35 — are reported, not gated**, and the verdict word carries
  the modifier: e.g. "PASS EXCEPT 3a (GRADER DRIFT)", which is not a validation. **The controller's default is exactly
  that: (ii) grade anyway with the new model, 3a reported, the result saying GRADER DRIFT, the hour not validated, a
  re-fly once a pinned grader exists.** The user's alternative, (i) a dated re-pin amendment written BEFORE grading:
  h40c's own in-app pairs file (`interview60.judge.pairs.json` of h40c's run folder) is re-graded by the new model
  with the same dispatch text, BEFORE h40d's in-app pairs are graded in the same session, and that count becomes 3a's
  floor under the new grader; under (i), 3a gates against the re-graded floor and a PASS validates, reported as "PASS
  (grader re-pinned to <id>)". **The choice is made now, in the veto window before arming, and written into §11 — not
  at grading time, and never after h40d's 3a number is known** (§12, "Only the user").
- **The day.** "Day" means the quota day (10:00 → 10:00 local). **The hour flies only after all of these hold:** the
  05:00 re-smoke PASSED (DONE, written into this revision: run `2026-10-01T02-37-41-cuesmoke`, `CHECK EXIT 0`, 20/20
  answered hands-free, 8/8 long questions whole, the cue row 20/20 present and well-formed, 7 trimmed, filter sha
  `42d9bc42dbd17870` in both proofs, `hold-read` GONE); the bench PASSED (`PREREGISTER-cuebench.md` §3 with its
  amendments; running since 09:04 as this revision is written); the user's one live look at the overlay and typed
  chat on the worktree build (merge review I1), ending with Context ON (the toggle persists into the hour; rule 1(g));
  knowledge mode read ON from the persisted settings after that look (§7.3a); the Opus merge review done and the prep
  merge refreshed and re-checked (§1); MAIN fast-forwarded and rebuilt, the dist proven; the pre-hour MAIN start done
  (§7.3); the `hasCueRule` check done (§7.6); the instruments calibrated (§7.4); the ledger (§8); the GRADER DRIFT
  choice and the 3c wrong-clause choice written into §11 (§12, "Only the user"); this file committed. **The follow-up
  replay is not a precondition** (review I6).
  - **Where the bench runs** (`RUNBOOK-resmoke2.md` §10, the 01:18 ruling and its 01:28 refinement): preferably on the
    **2026-09-30 quota day**, which ends Thursday 10:00, right after the re-smoke, if a precise ledger (per-request
    `usage:` and `trying` lines as `quota-ledger.mjs` counts them, plus the script calls since the reset) shows at least
    150 requests of headroom on gemini-3.5-flash-lite and the bench's first call is before 09:00; the follow-up replay
    then runs after 10:00 on the 2026-10-01 quota day, before the merge. **What happened (written into this
    revision):** the bench started at **09:04** on the 2026-09-30 quota day, the ledger counting 202 used and 298 of
    headroom on 3.5-lite — the headroom condition holds; the 09:00 line (there so the bench's calls end before the
    10:00 reset) was missed by four minutes. Any bench call after 10:00 lands on the 2026-10-01 quota day, the
    replay's: that is the replay's own day rule to read (it is not a precondition here), and the bench's last call time
    goes into "What flies". **Otherwise** (not this run's branch) the bench runs after 10:00
    Thursday on the 2026-10-01 quota day and the replay moves to Saturday (the 2026-10-03 quota day). In this branch the bench's second amendment (3a) says "cue
    mode does not merge on Thursday"; that sentence rests on its next one ("That day is not Thursday: the follow-up
    replay's day rule excludes a cue bench"), whose premise the 01:18 ruling removed, so a Thursday merge after an
    afternoon bench follows 3a's operative rule (the next quota day with neither a flight nor a pre-registered replay
    on 3.5-lite); the user is told before the merge. Either way the
    bench precedes the merge, and the merge precedes this hour.
  - **h40d = Friday 2 October 2026, 13:30 (the 2026-10-02 quota day), if the merge lands on Thursday.** Otherwise the
    **fallback day** is the first quota day that satisfies every precondition above and §8, at 13:30 (review Q9); the
    earlier-questions flight ("Saturday 3 October at the earliest") yields to this hour, and so does the replay if its
    day would be this hour's quota day (§8 forbids a replay on the flight's quota day). "What flies" records the date;
    no rule changes.
- **During the hour:** no vitest, tsc, build or npm on the machine; no other `Natively-*` task Running; no Live probe or
  ET38 run between 12:00 and 16:30 (the flight's Live ear uses the same service); the user logged on; the Context toggle left ON (rule 1(g)); AC power, sleep
  never, no restart pending; speaker unmuted at the calibrated level; port 5180 free; no Natively window open before the
  task fires (a MAIN instance holds the single-instance lock); no orphaned `tail.exe` watcher on MAIN's log — h40c's
  precheck list, run by `h40d-precheck.ps1` (§7.4) at 13:24.

## 7. Blocking checklist before arming (none is optional)

1. **The merge and the build.** The prep merge refreshed (§1) and its Opus review done; the user's live look done, ending with Context ON, and knowledge mode re-read ON (§7.3a);
   MAIN fast-forwarded with a real checkout (`git merge --ff-only`); `npm run build:electron` in MAIN once (a `Done in`
   line), then again (`Up to date, skipping build`); `dist-proof.mjs --root <MAIN> --expect combined …` → every marker
   as expected; the filter's sha256/16 recorded; MAIN's gates (the full suite from a temp cwd; tsc electron 6, root 0).
   The registered HEAD is this file's own commit on top of that tree.
2. **The qualifying-HEAD test** (h40c's blocking item 1, adapted):
   `git diff --stat d83fdfe..<registered HEAD> -- electron src premium package.json ':(exclude)electron/test/golden/passes'`
   must be EMPTY — then the Thursday 05:00 re-smoke (run `2026-10-01T02-37-41-cuesmoke`: the worktree build of the same
   code, the same app-start chain, scenario50 S1, hedge default; PASSED, `CHECK EXIT 0`) is this hour's smoke of the
   program. If it is not empty, a pre-hour smoke of the
   changed program is owed before arming (a scheduled `Natively-smoke-cues`-shaped run on MAIN's build with the v4
   check), and "What flies" says which.
3. **The pre-hour MAIN start** (review Q6, M11; the one seam the re-smoke does not cross: MAIN's own checkout, `.env`
   loader, rebuilt dist and single-instance lock with cue mode in it). A scheduled task `Natively-prestart-h40d`
   (never a Claude-session launch: shadow AppData), after the rebuild, on the quota day before the flight's (the 2026-10-01 quota day for a Friday hour), outside
   any other task's window, running `launch-h40d-prestart.cmd` from MAIN: the launcher's env block and guard, then
   `node electron\test\golden\interview60.run.mjs app:start` → `node … interview60.run.mjs probe` → a 60 s wait (`timeout /t 60 /nobreak`) → `node …
   interview60.run.mjs app:stop`, appending to `interview60.runs\flight-h40d-prestart.launcher.log`. `probe` pings
   3.1-lite five times, runs the preflight and plays the 34 s continuous probe, requiring the app's own log to show it heard
   a question (it does not wait for the answers; the 60 s wait lets the last one finish, or a cues line with no full line reads NOT CLEAN in check-smoke-cues) (`interview60.run.mjs:350–361`, `:385–395`): about 10 lite requests, most of them 3.1-lite
   health pings. **Required afterwards:** its `PROBE READY` line quoted; no `electron.exe` or natively-named process
   left and port 5180 free (the precheck's own counts, run right after); and in MAIN's `natively_debug.log`, copied
   after `app:stop` into `VH\2026-10-01-prestart-h40d\natively_debug.log`: `[Main] verbal hedge: on trigger=5000ms`,
   `[Main] follow-up parent: off`, `[KnowledgeOrchestrator] Knowledge mode ENABLED` after `[AppState] Knowledge mode restored from settings` and no `DISABLED` (rule 1(g)), at least one `verbal hedge: won by`, at least one non-empty `[Answer] cues:` line,
   `check-smoke-cues.mjs prestart-h40d --runs VH` clean, `h40d-clocks.mjs <that folder> --whole-log` reading 0 charged
   (no block-only answer), and `dist-proof` passing after it. Its lines are quoted in "What flies".

   **3a. Knowledge mode ON, read without starting the app (re-check N1, rule 1(g); ruling 1).** After the user's live
   look (which toggles Context ON and OFF and must end ON; the user starts that app with `npm start`, never from a
   Claude session, so it writes the REAL settings file) and before the prestart, the controller runs
   `node VH\knowledge-mode-read.mjs` from the session. It reads `knowledgeMode` from `%APPDATA%\natively\settings.json`
   — the key `ipcHandlers.ts:3030` writes and `main.ts:687` restores (`SettingsManager.ts:28`; the file holds
   non-secret boot toggles only, `SettingsManager.ts:6`) — through the admin share
   `\\localhost\C$\Users\sotka\AppData\Roaming\natively\settings.json`, because a Claude session's direct `%APPDATA%`
   path is an MSIX shadow (memory `claude-sandbox-appdata`; on 2026-10-01 the two differed: the shadow 323 bytes of
   2026-07-02, the real file 151 bytes of 2026-09-12, both `knowledgeMode = ON`), and prints the path, size, mtime and
   that one key; exit 0 = ON. The scheduled tasks (the dry twin, the prestart, the flight) run outside the sandbox and
   read the real file directly. Required: `knowledge mode (rule 1(g)): ON` on the ADMIN SHARE line, quoted in "What
   flies" with the file's mtime; repeated at arming (§7.8) if any app was started by hand in between. If the live look
   ended OFF, the user turns Context ON in their own app (never from a Claude session: that writes the shadow) and the
   read is repeated. Calibrated (`knowledge-mode.out.txt`, stubs in `VH\kmode-stubs\`): `knowledgeMode` true → ON
   (exit 0), false → NOT ON (1), the key absent → NOT ON (1: `main.ts:687` restores nothing), unparsable → UNREADABLE
   (2), a missing file → UNREADABLE (2).
4. **The instruments, each calibrated, outputs saved beside the old ones.** Each one that does not exist yet is
   specified here so it can be built and checked on Thursday (ruling 6); "known case" = a case whose answer is known
   before the instrument reads it, and every instrument must also be shown to FAIL on one (rule 8).
   - **`launch-h40d.cmd`** — h40c's `launch-h40c.cmd` with: the label `h40d`; the env block of §2 (every variable
     cleared, `NATIVELY_VERBAL_HEDGE` included); `NATIVELY_FLIGHT_COMMIT=<registered HEAD>`; `wav:check`; dist proof 1
     (`node SP\dist-proof.mjs --root . --expect combined --prefix-count 3 --offers-marker "offers block before the
     spoken answer"`, exit 3 to the error log on failure); `guard-h40d.mjs`; the flight; dist proof 2 after it. ASCII,
     CRLF, written from a source text by a node script (h40a's `launch-h40a-src.txt` pattern; never `sed -i`) and
     checked byte by byte. Known cases: run from the wrong folder → exit 9 and the error log; the dry twin from MAIN →
     `GUARD OK` and `every marker as expected` in its log; the error log absent at arming.
   - **`launch-h40d-dry.cmd`** — the same up to and including the guard and dist proof 1; no flight; registered as
     `Natively-flight-h40d-dry`; its `GUARD OK` is required before the real task is registered (h40c's blocking item 2).
   - **`guard-h40d.mjs`** — `guard-h40c.mjs` re-pinned: (1) roster holdout40, 45 items; (2)–(4) the built default and
     fallback, no model or thinking override, the levels each model flies at; (5) the R09 fix in dist and source; (6)
     the hedge resolves ON with `NATIVELY_VERBAL_HEDGE` UNSET (the `guard-br1.mjs hedge` check, calibrated to FAIL on
     the 09-26 build), and the guard FAILS if the variable is set to anything, `1` included; (7) trigger 5000 ms; (8) the
     follow-up flag off; (9) the dist not stale against its source; (10a) `.env` declares none of the guarded names;
     (10b) MAIN's HEAD equals `NATIVELY_FLIGHT_COMMIT` and the tree is clean but for the allowlisted paths (the tracked
     `interview60.chains.json`, `interview60.report.md`, `natively_debug.log.1`; `*.stale-*.json` is gitignored — the
     review checked); (11) no Groq id in the answer-model list; **(12, new) the cue build's markers in MAIN's dist**:
     `dist-proof.mjs --root <MAIN> --expect combined --prefix-count 3 --offers-marker …` as a child, exit 0 required,
     plus `function trimCues` in the built filter and `CUE_RULE` and `VERBAL_TYPED_PROMPT` in the SOURCE `prompts.ts`
     (so the dist matches the tree the pass record names); **(13, new) knowledge mode ON in the persisted settings** (rule
     1(g), re-check N1): `knowledgeMode === true` in `%APPDATA%\natively\settings.json` — the launcher runs as a
     scheduled task, outside the sandbox, so that path is the real file there — the guard printing the file's mtime and
     that key only; `--settings <file>` points it at a stub for calibration (`VH\kmode-stubs\settings-off.json` and
     `-absent.json` → `GUARD FAILED`, `-on.json` → the check passes). Calibrated by breaking each premise once (h40c's
     `guard-h40c-cal.txt` pattern, in a stub tree and against MAIN's root): commit unset / wrong / tree dirty / `.env`
     with a guarded name / the hedge variable set to `1` and to `0` / a dist without `CUE_LINE_PREFIX` (MAIN's own
     pre-merge dist is that known-bad case today: `stripCueBlock` is undefined in it, merge review M1) → each a named
     `GUARD FAILED`; the correct environment → `GUARD OK`. Output `guard-h40d-cal.txt`.
   - **`register-h40d.ps1`** — `register-h40c.ps1` with the names; `-StartAt` mandatory; prints the task's settings
     read back (StartWhenAvailable must read False). Known case: `Get-ScheduledTask` after registration reads Ready,
     next run 13:30 on the registered day; the dry twin registered first.
   - **`h40d-precheck.ps1`** — `h40c-precheck.ps1` re-pointed (task names, log names), plus the count of `Natively-*`
     tasks Running other than the flight. Known case: run now with `-At` = the current minute against the h40c task
     names, it prints the h40c task's state and the process, port, power and audio lines (the body works); on Friday at
     13:24 against h40d.
   - **`h40d-clocks.mjs`** (done, revision 2): rules 2a, 2b, 2d, the model clock, G, the `--list` join, `--whole-log`.
     Calibrated: h40c 4.100 / 6.498 reproduced, G 0.504; the 16:12 C 0.217; the 2d fixtures charged 1 / 0 / 0 and
     UNRESOLVED 0 / 0 / 1; whole-log 16:12 = 1 (the probe's block-only answer), h40c = 0; the 05:00 re-smoke (the combined
     build, added in revision 3): screen 4.742 / 5.770 s, G 0.594 s, C 0.052 s, 2d 0 in the run window and the whole log
     (`clocks.cal-r2.out.txt`).
   - **`h40d-thoughts-noise.mjs`** (done): rule 2c. Calibrated on h40c with the cue family as its own control: the
     difference reads 0 → PASS; +150 → PASS at the boundary; +151 and +200 → FAIL; `--exclude R10,R20` drops the two
     ids on both sides; an absent control prints no reading; `--control-dir` reads the control from another folder;
     s50e's single-rep `gemini-3.7-flash` arm as both sides (4 holes of 5) → `INCOMPLETE (more than 3 true holes: cue
     -r1 (4), control -r1 (4))`, h40c still PASS (re-check N6: the revision-2 script read `PASS (fallback)` there and
     never printed 2c's INCOMPLETE; edited and re-run in revision 3) (`thoughts-noise.out.txt`). A bug the calibration
     caught: the first version reused the cue object as the control, so +200 read 0; fixed before any reading.
   - **`knowledge-mode-read.mjs`** (done, revision 3): rule 1(g) before the hour (§7.3a). Calibrated on stub files
     (`VH\kmode-stubs\`): `knowledgeMode` true → ON (exit 0); false → NOT ON (1); the key absent → NOT ON (1); unparsable
     → UNREADABLE (2); a missing file → UNREADABLE (2); the real file through the admin share → ON, the shadow's and the
     real file's size and mtime differing (`knowledge-mode.out.txt`).
   - **`h40d-knowledge-lines.mjs`** (done, revision 3): rule 1(g) after the hour: the `ENABLED` / `DISABLED` lines before
     and inside the run window (the timeline's byte slice, as the clocks script reads it) and every dispatch window's
     `Intent classified` count on the whole log, the windows without the line named; the G cross-check is the clocks
     script's `--list`. Calibrated: h40c 47 of 47 and br1 42 of 42 → OK; the 16:12 and 05:00 cue smokes 23 of 24 and
     21 of 22 (the first run window) → OK at 95%; fixtures (`VH\kmode-fixtures\`, synthetic logs in the app's line
     shape): every window classified → OK; 1 of 20 missing (95%) → OK at the boundary; 3 of 20 missing (85%) → VOID; a
     `DISABLED` line inside the window → VOID; no `ENABLED` line → VOID (`knowledge-mode.out.txt`).
   - **`h40d-rule3.mjs`** — `h40c-rule3.mjs` re-pointed to the h40d files, its per-item table extended by the three
     no-cue twins for context (3d). Known cases: reproduces 35 of 45 (28 + 7) and zero gated wrong on h40c; 35 (27 + 8),
     R09F and R11F wrong and excluded, on h40b; FAIL on h40a (R09 wrong on a gated item).
   - **`h40d-twins.mjs`** — the 3c adapter: per rep r, reads `interview60.answers.<family>[-r].json` (holes, empty
     prose, raw `cues`) and the merged `interview60.judge.<family>[-r].json` (verdicts), builds `benchDecide`'s input
     (control = no-cue, cue = cue) with acceptable and wrong as §4 defines them, wrong on the 40 gated ids for the
     clause (decided by the adapter itself as the three reps' sums with a margin of one — the controller's default — and
     printed beside the strict per-rep reading, the user's alternative; `benchDecide` gets the band and the cue check
     only) and on all ids beside it, present and shape via `blockShape` net of true holes, empty prose counted wrong with the stage that emptied it (filterCodeFences = a pipeline event, all-ids line only; any other stage with cues present = a block-only twin, gated clause)
     and named, and prints per rep: n, holes by id, empty prose by id, acceptable, gated wrong, all-ids wrong,
     present, shaped, over-3 and over-5 rates, each rep's `thoughts` and TTFT p50/p90. `--pre-cue` marks the cue check
     not applicable and says so (never a silent pass); it is for known cases (1) and (2) only — the h40d reading runs without it, and a 3c line carrying the not-applicable mark is not a verdict. Known cases: (1) h40c with `captured-low` as the control,
     `--pre-cue` → PASS with the counts of §4's known case; (2) h40b the same way → PASS; (3) the cue check WITH cues:
     Thursday's bench cue answer files → the same per-rep present and shaped counts `cuebench-score.mjs` prints;
     (4) synthetic, in memory from h40c's `captured-high` files, never written into a run folder: `cues` injected on
     every id with five 4-line blocks in one rep (shaped 39 of 44 = 88.6%) → STOP, with four such blocks (40 of 44 =
     90.9%) → PASS; (5) a hole case: 3 `transientError` plus 1 empty prose in a cue rep → not INCOMPLETE, wrong +1,
     cue-check n = 41; (6) 4 `transientError` in a rep → INCOMPLETE; (7) the real empty-prose cases s50l
     `captured-high-r3` S1Q06 and s50m `captured-high-r2` S2Q06 → each counted wrong in the all-ids line, named as emptied by `filterCodeFences`, and kept out of the gated clause;
     (8) synthetic, in memory: two gated ids in one cue rep (or one in each of two reps) given a raw that holds a cue
     block alone (`stripCueBlock` empties it) against a 0 / 0 / 0 control → two block-only twins in the gated clause →
     STOP under the default (2 > 0 + 1); with ONE such id → named, no STOP under the default (1 ≤ 1) and STOP under the
     strict alternative (both readings printed). Case (5)'s empty-prose record is built the same way.
   - **`h40d-grader-models.mjs`** — `h40c-grader-models.mjs` with the session as a parameter (`--session <id>`) or a
     search over every session's `subagents/` under every project slug and the temp `tasks/` folders (review M1);
     prints model ids and message counts only. Known cases: one of h40c's seven grader agents (Opus) → PINNED; a
     known Sonnet transcript → NOT PINNED; a missing id → NO TRANSCRIPT FOUND; the same Opus agent looked up from a
     different `--session` → found by the search, not by the hard-coded path.
   - **`h40d-grader-dispatch.txt`** — h40c's text verbatim, with the ten tags and their files: inapp;
     `captured-high{,-r2,-r3}`; `captured-no-cues-high{,-r2,-r3}`; `captured-low{,-r2,-r3}`; verdicts to
     `VH\h40d-verdicts-<tag>.json`; the counting rulings of §4; the GRADER DRIFT order of §6.
   - **`h40d-merge.cmd`** — `h40c-merge.cmd` re-pointed (verdicts from `VH`), with three `:arm` lines added for
     `gemini-3.5-flash-lite_captured-no-cues-high{,-r2,-r3}`; every merge passes `--model <exact id>`. Known cases: run
     from the wrong cwd → exit 13; a missing verdicts file → `SKIPPED-MISSING <tag>`, never a merge of the wrong file.
   - **`check-smoke-cues.mjs` v4** (26 known cases, `calib-cue-smoke.combined.out.txt`), **`hold-read.mjs`** (47,
     `cal-hold-read.combined.out.txt`), **`smoke-facts.mjs`**, **`dist-proof.mjs`** on MAIN's root (calibrated on the
     v2 dist: reads v2 and NOT combined), **`quota-ledger-today.mjs`** and the precise `quota-ledger.mjs` (§8): as
     they stand.
5. **The chains wrap's first execution** (spec §3.5.7, R5): one `interview60.chains.mjs` run in MAIN after the rebuild
   with `interview60.chains.json` moved aside (about 25 calls on 3.1-lite, the quota day before the flight's, only if the ledger
   allows) reading the stored answers for no `__CUES__`; if it cannot run Thursday, the flight's own chains pass is the
   first, and the post-flight read checks its `EXIT 0` line and the report's chains section for the same.
6. **The `hasCueRule()` check** (merge review item 6): the twins' gate has only ever seen synthetic prompts, and a
   false reading would skip Friday's control arms with one log line. `VH\h40d-hascuerule-check.mjs <prompts.json>`
   imports `hasCueRule` and `capturedOnly` from `interview60.flight.mjs` (safe: the module runs `main()` only when it is
   the entry script, `flight.mjs:388`) under the roster environment the run used, reads the prompts file, and prints
   ONLY: the number of ids `capturedOnly` returns, how many carry `[CUES FIRST]`, and `hasCueRule` true or false — never
   a prompt. **The case to calibrate on:** the 05:00 re-smoke's `interview60.prompts.json` in its run folder
   `WT\electron\test\golden\interview60.runs\2026-10-01T02-37-41-cuesmoke\` (the 05:00 re-smoke, PASSED; built there by `interview60.prompts.mjs <run-dir>`,
   which the probe needs anyway; its content is never read by a person), under `NATIVELY_ROSTER=scenario50
   NATIVELY_SCENARIOS=S1` → **true, N of N**. Known-false cases: h40c's `interview60.prompts.json` under
   `NATIVELY_ROSTER=holdout40` → false, 0 of 44 (a pre-cue hour); the 05:00 file with one id's system text stripped of
   the mark in memory (`--mutate-one`, never written) → false (a mixed hour gates closed); the 05:00 file read under
   `NATIVELY_ROSTER=holdout40` → false with 0 ids (the check depends on the roster environment, so Friday's flight
   reads holdout40's prompts under holdout40, as it does).
7. **The ledger** (§8) on the flight day before 11:00.
8. **This file committed** to MAIN's `passes/` with "What flies" filled (the grader probe agent of §6 dispatched and its model written in; the knowledge-mode read
   repeated if any app was started by hand after §7.3a; the user's two choices of §12 written in); then the build
   command once more (`Up to
   date`); then the task registered (state Ready, next run 13:30); then the precheck sleeper and the flight-end watcher
   armed (session crons do not fire while a Monitor or a background agent runs: use a background sleeper).

## 8. Quota

Per-model requests the flight itself makes (the arms of §2; 44 captured ids if R05 is lost again, 45 if not):

- **gemini-3.5-flash-lite ≈ 385–395 (8 arms plus the hour's own front legs; merge review item 6):** 45 hedge fronts +
  33 bare + 33 `high` + 132 `captured-high` ×3 + 132 `captured-no-cues-high` ×3 = 375, plus redirects (h40c 0), the
  readiness probe and preflight (≤ 5), warm-ups (≤ 10). The three `captured-no-cues-high` twins run on every MAIN flight
  from now on (`hasCueRule` true on every cue hour), not only this one; `interview60.flight.mjs:155` still says "~155
  lite calls" and the opt-in switch is not built.
- **gemini-3.1-flash-lite ≈ 290–330**: 33 bare + 33 `low` + 44 `captured-minimal` + 132 `captured-low` ×3 = 242, plus back
  legs (h40c 7; up to about 40 under load), chains (≈ 25), the probe's pings and preflight (≤ 10).

Both fit under the 500-per-model-per-day lite quota on a fresh quota day and on no other. **The control's exposure
(review M5, concrete):** the no-cue twins run last; `answers.mjs` retries a 429 up to four times per item, so a
quota-short afternoon burns the control first and 3c reads INCOMPLETE with no same-day re-run possible. **Rule:** at
about 10:45 on the flight day, `node SP\quota-ledger-today.mjs <that day's reset ISO>` — which prints lite-model
MENTIONS in the app logs since the reset (an upper bound, about 9 lines per answer; every hedge `front=` line names
both models) plus a list of files written since the reset — must show **at most 30 mentions naming
gemini-3.5-flash-lite and at most 150 naming gemini-3.1-flash-lite** (h40c's day showed 0), and its file list must show
no bench, probe, replay or smoke on that quota day; a mention count above the bound is resolved only by the precise
ledger (`quota-ledger.mjs` adapted to the day's folders, counting `usage:` and `trying` lines per request), never by
argument. Otherwise the hour moves to the next quota day that satisfies this. The pre-hour MAIN start and the chains
run (§7) happen on the quota day before the flight's (the 2026-10-01 quota day for a Friday hour), never on the flight's. Full Flash models are not
used by any rule or reported row.

## 9. The order of reading after the hour

1. **The launcher log:** `wav:check` 45; dist proof 1 (combined, filter sha); `GUARD OK` with the HEAD and the tree
   state; the flight's readiness probe; `auto`'s `[build-electron] Up to date, skipping build` (a `Done in` line there
   means the task built: say so, name the tree); `AUTO EXIT`; the arms (the three proof lines of §2 for the no-cue arms:
   no skip line, the three `EXIT 0` lines; then `interview60.flight.done.json`'s `pairedArms`); chains `EXIT`; the judge
   exports; `DONE` and the task's exit code; dist proof 2 (same sha).
2. **Rules 1 and 2, no grading:** `node SP\h40c-hedge-stats.mjs <run-dir>` — read the `playback start … IN WINDOW` line
   first, then rule 1 (a)–(c) and (g) (`node VH\h40d-knowledge-lines.mjs <run-dir>`), its failure count (the cross-check on 2d's term 1) and its INCOMPLETE reasons; its own
   "rule 2 vs h40b" line carries h40b's thresholds and is **ignored**. Then `node VH\h40d-clocks.mjs <run-dir> --list`
   for 2a, 2b, 2d (both terms, the union, the UNRESOLVED windows, each by dispatch time), the model clock and G; `node
   SP\cue-group\hold-read.mjs <run-dir> --list` for 2e and the rows. 2c waits for the arms' answer files: `node
   VH\h40d-thoughts-noise.mjs <run-dir>` (with `--exclude` for any re-run ids).
3. **Rule 4:** `node SP\check-smoke-cues.mjs h40d --runs …`; the report's cue row; `smoke-facts.mjs`; the trims quoted
   from the log; the offers-first count per answer; the coding-route and short-circuit lines, if any, each classified.
4. **Rule 5** from `interview60.report.md`'s rows and the judge's pairs (unanswered items by name, each placed before
   or after dispatch from its dispatcher lines; any answer to nobody resolved by hand from its `question=`).
5. **Rule 3:** dispatch the probe agent of §6 and read its model with `h40d-grader-models.mjs` (GRADER DRIFT is decided here, by the choice §11 carries); then the ten grading agents (`opus`, h40d's dispatch text; under GRADER DRIFT, h40c's re-grade first
   if the user chose it); confirm the model in every transcript with `h40d-grader-models.mjs`; merge with `--model
   <that id>`; `h40d-rule3.mjs` (3a, 3b, the per-item table); `h40d-twins.mjs` (3c); the join of items to winners from
   the pairs' `dispatchedAt` and the clocks `--list` timestamps (3d); `mains-band` for 3e.
6. **The verdict**, in the order of §5's precedence: cue-attributable FAIL → VOID → other FAIL → INCOMPLETE → NO
   LATENCY VERDICT or 3a NOISE → PASS, with GRADER DRIFT as a modifier.
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
- A model-side cost under about 150 thinking tokens (about 0.44 s): 2c's threshold is four times the scenario50
  rep-to-rep noise, so a smaller real cost passes. If the TTFT fallback decides 2c, the hour cannot detect a
  sub-second model-side cost at all (review I2).
- The overlay itself beyond the user's one look during the run — the cues and the first words should appear together
  and the rest stream; the bar under the answer should show a first-token time a few tenths under the total and a rate in
  the hundreds, never the tens of thousands. Typed chat (the user's Thursday check on the worktree build). The second
  `__CUES__` line leak (1 of 624 saved replies) and the typeset fraction (0 of 624): their own tasks.
- Quality beyond one hour's noise: the bare arms, which measured day-to-day noise on h40b (up to 5 of 33), are
  ungraded; the paired-grading noise floor is about ±4 on 45; 3c's bands are three reps a side.
- The follow-up parent defect (R09F, R11F class) and the R05 fragment drop: not cue mode's, unchanged in this tree.
- Provider load: the model clock and G are reported against h40c's and br1's, but one hour decides nothing about the
  hedge's tail on a different day; rule 2 gates only what cue mode adds (2b, 2c) and the candidate's total at the median
  (2a, with its provider reading).
- Whether cue mode helps the candidate speak: the user's own delivery is deliberately unmeasured (the 09-20 decision).

## 11. What flies (filled at arming, 2026-10-0_)

- Registered HEAD: `________` (this file's commit); MAIN fast-forwarded to `________` (the refreshed prep merge, parents
  `________` + `________`; `git diff --stat` outside `passes/` empty: `________`); the merge review's final word:
  `________`; the user's live look (overlay, typed ON/OFF, ended with Context ON): `________`; knowledge mode read after it (§7.3a,
  the admin-share line): `________`, file mtime `________`.
- Build: `dist-electron/electron/main.js` written `________`; dist proof: `________`; filter sha256/16 `________`
  (worktree combined build: `42d9bc42dbd17870`); MAIN's gates: `________`.
- The qualifying-HEAD test (§7.2): `________` (empty / not empty → the smoke owed and run: `________`).
- The pre-hour MAIN start (§7.3): task `________`, `PROBE READY` at `________`, lines quoted: `________`; processes after
  `app:stop`: `________`; `check-smoke-cues` `________`; `--whole-log` charged `________`.
- The `hasCueRule` check (§7.6): file `________`, `________ of ________` carry the mark, `true`; the known-false cases:
  `________`.
- Thursday's re-smoke (filled in revision 3): run `2026-10-01T02-37-41-cuesmoke`, `CHECK EXIT 0`, the three conditions
  PASSED (20/20 answered hands-free; 8/8 long questions whole; the cue row 20/20 present and well-formed, 7 trimmed;
  filter sha `42d9bc42dbd17870` in both proofs); `hold-read` verdict GONE (n 21, R2 and B under 15 ms in 0 each)
  → **2e is GATED**; the clocks script's lines on it: screen 4.742 / 5.770 / 5.999 s, model 4.232 / 5.162 / 5.379 s,
  G 0.594 / 1.112 / 1.147 s, C 0.052 / 0.192 / 0.193 s, 2d 0 charged (§3).
- Thursday's bench: verdict `________`; its thinking-token difference, cue reps against s50m's `captured-high`:
  `________ tokens` (2c's first known case; `________` ≤ 150, or the amendment `________`); its TTFT p90 line, reported:
  `________`.
- The bench's quota day: the 2026-09-30 quota day, first call 09:04 (the 09:00 line missed by four minutes; ledger 202
  used, 298 headroom on 3.5-lite), last call `________` (before / after the 10:00 reset);
  the follow-up replay's day: `________` (not a precondition).
- Chains run in MAIN (§7.5): `________` / deferred to the flight.
- The instruments' calibration outputs (§7.4): `guard-h40d-cal.txt` `________`; `h40d-rule3` on h40c/h40b/h40a
  `________`; `h40d-twins` cases 1–7 `________`; `h40d-grader-models` `________`; `h40d-merge` `________`.
- The dry twin's `GUARD OK`: `________`; the allowlisted untracked files: `________`.
- The ledger on the flight day (§8): 3.5-lite mentions `________`, 3.1-lite `________`, files `________`.
- The grader alias at arming (one probe agent, `h40d-grader-models.mjs`): `________`; the user's GRADER DRIFT choice,
  made now: (i) re-pin / (ii) not validated — the controller's default — `________` (read again from a probe agent
  before grading, §9.5).
- 3c's gated wrong clause: the controller's default (the three reps' sums, margin 1) / the strict per-rep clause —
  the user's choice, made now: `________`.
- Rule 1(g) at arming: `knowledge-mode-read.mjs` `________` (ON required); the prestart's `Knowledge mode ENABLED`
  line `________`; the guard's check 13 in the dry twin's log `________`.
- Task `Natively-flight-h40d`: registered `________` for `________ 13:30:00`, state Ready, StartWhenAvailable False.

## 12. Decisions taken by the controller on the review's questions (the user may veto any before arming)

The draft's ten open questions were answered by the review; the controller adopted its answers while the user
slept, with these results (each is applied above; `CHANGES-r2.md` has the detail):

1. **Twins' grading:** one pinned grader per arm, all ten in one session; no blind pairs builder (graders see prose
   only, both sides graded fresh together, the band is symmetric).
2. **Band gate versus floor:** 3a gated, 3e reported with the corrected reason (M2); a 3a miss pre-read as noise under
   rule 3a's two conditions (M13).
3. **Screen p90:** reported.
4. **2c:** thinking tokens at +150 (provenance in rule 2c; scenario50 twins for the noise, holdout twins as
   measurement noise only), TTFT at +1.0 s as the fallback; the bench's TTFT dropped as a known case, its thinking-token
   difference adopted instead.
5. **2e:** conditional as drafted, with its FAIL cue-attributable, hold-read reading the whole log, and h40c as the
   no-hold known case.
6. **The pre-hour MAIN start:** done, with its commands (§7.3).
7. **`captured-low`:** always graded; never pooled.
8. **Holes:** true holes symmetric and out of the cue check's n; empty prose wrong on either side; more than 3 true
   holes → INCOMPLETE.
9. **Fallback day:** the first qualifying quota day at 13:30; the earlier-questions flight yields.
10. **Replay arms:** the full list runs; the two costs of the order are named (§2, §8).

And on the questions the draft missed: **A** one definition of "wrong", 3c's wrong clause on the 40 gated ids;
**B** GRADER DRIFT (§6); **C** a cue failure in a VOID hour stops cue mode (§5); **D** pre-dispatch losses beyond R05
count as not acceptable, more than 2 VOID (rule 5); **E** re-run twin ids excluded from 2c, graded by the pinned
grader, named (§4). **C and D were the review's questions to the user; the controller took them** (re-check, the user
list, item 1): they stand unless vetoed before arming.

And from the scoped Opus re-check (`RECHECK-r2.md`), each for the user's veto: rule 1(g) (knowledge mode on, as on
h40c); fenced-answer empty prose kept out of 3c's gated clause, and that clause as the three reps' sums with a margin
of one (N2); 5a restated against the pre-dispatch reading (N3); the same-day re-run with `--only` (N4); M13's gap of
1; the precedence edits (I5); the GRADER DRIFT choice made now.

### Only the user (decided before arming; each with the controller's default, which stands if the user says nothing)

1. **The veto on §12** — the ten answers, A–E (C and D named above) and the re-check's rule changes. Default: as applied.
2. **GRADER DRIFT, if the `opus` alias no longer resolves to `claude-opus-5-5` when the probe agent reads it (§6):**
   (ii) grade anyway with the new model, 3b and 3c gating, 3a reported, the result saying GRADER DRIFT, not validated
   — the controller's default; or (i) a dated re-pin amendment written before grading (h40c's in-app pairs re-graded
   by the new model first, that count the floor; a PASS then validates). Written into §11 now.
3. **3c's gated wrong clause (N2):** the three reps' sums with a margin of one — the controller's default; or the
   strict per-rep clause (null STOP 12% at a 5% per-rep chance, against 0.9%). Written into §11 now.
4. **The live look ends with Context ON** (N1): the user operates the toggle in their own app; the controller re-reads
   the persisted key afterwards (§7.3a). No default: only the user can do it.
5. **The bench's thinking-token difference, if above 150 tokens** (rule 2c): raised with the user before arming;
   never loosened quietly. Default: the threshold stays at 150.

To know before the merge, not to decide (N9): the bench started at 09:04, four minutes after the 09:00 line, with 298
of headroom; a last call after 10:00 puts part of a bench on the replay's quota day (the replay's own rule); in the
"Otherwise" branch a Thursday merge after an afternoon bench goes against the letter of the bench's 3a sentence, and
the replay moves to Saturday by the 01:18 ruling.

## 13. Conflicts in the inputs, and how this revision resolves them

- **The `first token` sentence.** The cue-smoke pre-registration's 15:26 amendment says the line fires when the first
  prose LINE ends; its second amendment (for the combined build) and the early-close spec §6 say the first prose chunk
  after the block. The second is the build that flies; §3 carries it, and the merge review's item 6 confirms it.
- **Band gate versus floor:** the holdout memory and the 09-20 design gate the live mains against the twins' band;
  h40c's registered rule gates the floor of 35 and reports the band. This revision follows h40c, with the corrected
  reason (rule 3e).
- **Two graders versus one.** The agenda written before h40c said two Opus graders; h40c ruled one per arm before its
  data; the bench uses two blind graders per pairs file. One per arm here (§12, 1).
- **Holes: the review's I3 text versus its Q8 answer.** I3's fix text excludes a true hole from a rep's n for
  acceptable and wrong as well; Q8's answer (the controller's ruling) keeps the symmetric rule for true holes (not
  acceptable, not wrong) and excludes them from the cue check's n only. The ruling is applied; the difference is at
  most 3 per rep, on either side alike.
- **The bench's day and the replay's day** each forbid sharing a quota day with the other; the runbook's 01:28
  refinement resolves it by the quota day (§6). This hour depends on the bench, not on the replay.
- **The h40c stats script's built-in rule-2 thresholds are h40b's** (5.026 + 1.0 s, 13.608 s); its printed "rule 2 vs
  h40b" verdict is not this hour's rule and is ignored; rule 2 is read from `h40d-clocks.mjs` and the script's rule-1
  and coverage logic only; its failure count cross-checks 2d's term 1.
- **The 16:12 result note's first-token line** ("In this build the line fires when the first prose line ends") is true of
  the v2 build and superseded for the combined build; the clocks script reads that run as a known hold case only.
- **The draft's "the screen clock is the sum of the other two, up to the milliseconds between dispatch and the
  hedge's t0"** was wrong by about half a second (G, the knowledge step); §3 and 2a's provider reading are corrected.
- **Out-of-window hours: the re-check's edit against the controller's ruling.** Re-check edit I5-g kept "a
  cue-attributable FAIL of §5 item 1" readable outside the window; ruling 6 reads every clause of rule 2 as reported
  there, none as a FAIL. The ruling is applied (§5 item 1, §6); 3c and rule 4 are still read in such an hour.
- **3c's gated wrong clause: the re-check's minimal fix against its robust one.** Edits N2-b to N2-f are the minimal
  fix (fenced-answer empties out of the clause, the null stated honestly); its optional N2-g (the sums with a margin of
  one) is the controller's default by ruling 2, the strict clause the user's alternative. Case (8) of the adapter's
  calibration is restated for both readings; under the default one block-only twin is named, not a STOP.
- **The bench's 09:00 line.** §6's preferred branch asked for the bench's first call before 09:00; it came at 09:04
  with 298 of headroom. The branch is read as taken — the headroom condition is the one with a consequence for this
  hour, the 09:00 line protects the replay's quota day — and the fact is stated rather than the text re-written.
- **Rule 1(g)'s `Intent classified` line on the first run window.** Both cue smokes lack it there (G 2 ms and 8 ms:
  the knowledge step did not run on that one window; h40c and br1 never skip it). The cause is unproven and no trace
  ties it to cue mode; the 95% line tolerates two such windows in 45, and the windows are named with their G so a
  wider skip would be seen, not averaged away.
