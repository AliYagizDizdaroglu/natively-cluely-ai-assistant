# Task 4 re-review 2: fix round 2 (N1, N2, M1–M6)

Reviewer: Opus, read-only. `<SP>` = the session scratchpad. `<RR2>` = `<SP>/sdd/2026-09-25-flight-h40b/rr-task4-fix2/`, which holds this review's throwaway probes and their outputs.

## Verdict: findings remain open

| Item | Status | One line |
|---|---|---|
| N1 | **ADDRESSED** | A tier with no captured ids prints `answered 0 of 0 (ids × reps)` and `0/0 acceptable`. Every other tier, both lite lines and the reasons section still print, and the scorer exits 0. Shown with tier 1 empty, with tiers 3+3b empty, and with every tier empty. |
| N2 | **ADDRESSED** | Tested on the runner's literal text at one try: [CUT,429] and [CUT,503] now store `cutRetried: true` and are charged 2 for 2 calls. Under-counted behaviours: 0 (round 1's loop: 2). The harness's named N2 cases now assert a record value, not the loop variable. That record is built by the harness's own transcription of the store line (see M1). |
| M1 | **PARTIALLY ADDRESSED** | The behaviour is exact. Against the literal pre-Task-4 loop at 4 tries, calls differ in 0 of 46,656 sequences, and outcomes differ in none. One-try behaviour is unchanged except for N2's field. **Two false equivalence claims remain in comments:** `gemma-answers.mjs:334-336` says "0 differences in calls or stored record", but the stored record differs in 20,880 of 46,656 sequences. `i1-retry-trace.mjs:1-2` and `:48-50` say "copied verbatim" and "The LITERAL pre-Task-4 loop", but both loops are hand transcriptions, and the harness reads neither file. |
| M2 | **ADDRESSED** | The untouched fixture gives CALIBRATION OK. A scorer copy whose `answeredCount` is always 0 gives CALIBRATION FAILED, with case A failing 5 of 10 checks. |
| M3 | **ADDRESSED** | With a missing rep the scorer prints `answered 6 of 9 (ids × reps)` (round 1 printed `0 of 3 ids`). The comment at `score-blind.mjs:63-67` now says an uncaptured id is invisible. The fixture with R09F skipped behaves exactly that way. |
| M4 | **ADDRESSED** | The guard requires the literal `process.env.GEMMA_MAX_TRIES`. Two runner copies that mention the name but never read it each exit 3. One is the old loop plus a comment. The other is the current runner with the read removed but its header and comments kept. The real runner passes. |
| M5 | **ADDRESSED** | `RUNNER` is resolved once (`sidecar:32`) and the same value is used at `:95/:96/:126/:158`. A relative override resolves once, against the invocation cwd. A copy of the sidecar run past readiness with `--dry` prints the same absolute path in its spawn lines. The launchers neither run the sidecar nor set the override. |
| M6 | **ADDRESSED** | Real process, `--limit 0`: `abc` and `Infinity` each give `GEMMA_MAX_TRIES is not a finite number: "…"`, EXIT 2, and no answers file. On the literal text with a non-empty script, the refusal comes before call 1 (0 calls). With the check removed, the same run makes 61 calls. |

**New findings:** 0 Critical, 0 Important, 1 Minor (**NEW-m1**).

---

## What I ran

Nothing called an API.

- The real sidecar ran only with `--plan` or `--dry`.
- A copy of the sidecar ran only with `--dry`. In that copy, `RUNS` and `OUT` point into `<RR2>`.
- The runner ran only with `--limit 0`: zero questions, no `--captured`, and `GEMMA_ARMS_DIR` inside `<RR2>`.
- MAIN was only read:
  - the generator copy read `electron/test/golden/interview60.answers.mjs`;
  - the tier derivation read h40a's evidence, as `--plan` always does.
- `<SP>/flash-h40b` did not exist before this review and does not exist after it.
- **No deliverable changed.** SHA-256 prefixes were taken before the first probe and again after the last:

  | File | SHA-256 prefix |
  |---|---|
  | `gemma-answers.mjs` | 928B59C68B326912 |
  | `flash-h40b-sidecar.mjs` | 732DCF1867B13A73 |
  | `flash-h40b-blind-pairs.mjs` | CE69EA0A49B99C59 |
  | `flash-h40b-score-blind.mjs` | 35EEF4B2B333085F |
  | `flash-h40b-score-cal.mjs` | 0243F41EC1353EE8 |
  | `i1-retry-trace.mjs` | B898D1D745394341 |
  | `gemma-answers-gen.mjs` | 4D41734CF7386AAB (mtime 2026-09-24 03:01:50) |

  The real fixture still holds 23 files, with no `blind-cal/` left behind.

### Checks and results

- **`node --check`.** All 8 scripts OK: gemma-answers, sidecar, blind-pairs, score-blind, score-cal, fixture-build, cal-demo, i1-retry-trace.
- **`--plan`.** Tiers `R02F R08` / `R03 R09F R16` / 11 ids; `6/9/11/11` against budget 18; EXIT 0.
- **`--dry`.** `NOT READY: no *-h40b run folder yet`; EXIT 2.
- **`node i1-retry-trace.mjs`.** `ALL NAMED CASES OK`, `0 mismatches of 46656`, `20880/20880`, `max calls … 2`, `156/156`, `OVERALL: ALL CHECKS OK`; EXIT 0. This reproduces the report's proofs 1–2.
- **The literal pre-Task-4 runner, regenerated today.** `<RR2>/gen/gemma-answers.mjs` was built from MAIN's current source by a copy of `gemma-answers-gen.mjs`.
  - MAIN's source was last modified 2026-09-20 19:05.
  - The result is byte-identical to re-review 1's `pre-task4-runner.mjs` (SHA-256 `DD3A6D0A…`).
  - `git diff --no-index` against the current runner shows only the Task-4 hunks (`<RR2>/pre-vs-current-runner.diff`): header `:29-31`; the hoisted block `:313-318`; the loop `:320-355`; the transient record `:356-361`.
- **`<RR2>/literal-loop-harness2.mjs`** (output: `lit2.out.txt`).
  - It slices the loop text from the real files. The NEW slice runs from `const MAX_TRIES_ENV`, so M6's check, M1's guard and N2's record line all execute as written. The OLD slice is the regenerated literal loop.
  - Each is run with a fake `pacedAnswer`, a recording `sleep`, and a `process.exit` that throws.
  - It covers all 6^6 = 46,656 sequences over {CLEAN, CUT, 429, 503, thrown error, TimeoutError}.
  - Variants are made by exact single-match edits: ROUND1 (no M1 guard, no N2 field), NO_M1, NO_N2, NO_M6.
- **`<RR2>/harness-vs-literal.mjs`** (output: `hvl.out.txt`). A token-level diff of the harness's `runOld`/`runNew` against the literal loops.
- **`<RR2>/hmut.mjs`** (output: `hmut.out.txt`). The harness run on copies of itself with M1's guard or N2's field removed.
- **`<RR2>/fx2.mjs`** (output: `fx2.out.txt`, `out/*.txt`). Seven fixture copies under `<RR2>/fx/`. On each: the pairs builder, then synthetic all-acceptable verdicts, then the real scorer. The copies:
  - `e1`: tier 1 empty;
  - `e3`: tiers 3 and 3b empty;
  - `eall`: every tier empty;
  - `a`: tier 2's `def-r3` file missing;
  - `skip`: R09F uncaptured;
  - `tr`: 3.6-flash holds only 503 records;
  - `full`: complete.
- **`<RR2>/cal2.mjs`** (output: `cal2.out.txt`). The real calibration on the untouched fixture, then copies of score-cal pointed at `fx/full` and at mutated scorer copies.
- **`<RR2>/g2.mjs`** (output: `g2.out.txt`). Guard probes, M5 path probes (including the copy of the sidecar past readiness), and the M6 runner runs.
- **`<RR2>/n2guard.mjs` and `<RR2>/brief-rebuild.mjs`.** The evidence for NEW-m1.

---

## N1: ADDRESSED

- **The change.** `flash-h40b-score-blind.mjs:74` now creates `totals[t]` unconditionally, before the id loop at `:77`.
- **Results** (`fx2.out.txt`):

  | Copy | Pairs builder | Scorer output (key lines) | Scorer exit |
  |---|---|---|---|
  | e1: tier 1 empty (the round-1 crash case) | exit 0, `4 files, 14 ids`, 3 "missing … (recorded as NO ANSWER for its ids)" lines | `tier 1  gemini-3.8-flash  (0 questions, 3 reps)`, then `answered 0 of 0 (ids × reps)` and `0/0 acceptable; … max 0.0 s …`. Tiers 2, 3 and 3b print in full; `lite answered: 3.1 LOW 42 of 42 …`; `re-graded … 3.1 LOW 42/42, 3.5 HIGH 42/42`; `reasons for every non-acceptable Flash answer:` | **0** |
  | e3: tiers 3 and 3b empty (their 11 shared ids) | exit 0, `2 files, 5 ids` | both empty tiers print `answered 0 of 0`; lite `15 of 15` | **0** |
  | eall: every tier empty | exit 0, `0 files, 0 ids`, 8 missing-file lines | all four tiers print `0 of 0`; `lite answered: 3.1 LOW 0 of 0 …`; `re-graded … 0/0, 0/0` | **0** |

- **The report's proof (3)** is reproduced: `4 files, 14 ids`, 3 warnings, and 42 lite answers.
- **Not covered by a standing check.** A scorer copy with N1 reverted still prints CALIBRATION OK, because the complete fixture has no empty tier (see Notes). The fix is proven only by ad-hoc copies such as these.

## N2: ADDRESSED

- **The change.** `gemma-answers.mjs:361` writes `cutRetried: dropRetried` on the transient record.
- **Literal text at one try** (`lit2.out.txt` section 2). There are 11 distinct behaviours, with at most 2 calls. The sidecar charges `1 + cutRetried` (`sidecar:142-144`):

  ```
  [CUT,T429] calls 2, sidecar charges 2, transientError="HTTP 429" cutRetried=true
  [CUT,T503] calls 2, sidecar charges 2, transientError="HTTP 503" cutRetried=true
  NEW: 11 distinct behaviours, max calls 2, sidecar under-counts 0, over-counts 0
  ROUND1 (no N2) for comparison: under-counts 2
  ```

- **Calibration.** With N2's field removed from the literal text, the under-count returns: 2.
- **The harness.** Its named N2 cases (`i1-retry-trace.mjs:93-94, 99`) compare `out.record` against literal expected values, such as `{"transientError":"HTTP 429","cutRetried":true}`. That is the record-level value the sidecar reads, not the loop variable that round 1 checked.
  - A copy of the harness without the field fails 5 named cases and prints `0/20880` (`hmut.out.txt`), so the harness is calibrated against its own copy.
  - That record is built by the harness's transcription of the store line (`:42-44`), not by the runner. This review's literal probe is what ties the result to the runner's actual `store[item.id] = …` line.
- **The report's historical note is correct.** The pre-Task-4 transient record never carried `cutRetried` (literal text, `gen/gemma-answers.mjs:332`).

## M1: PARTIALLY ADDRESSED

**Behaviour: met, on the literal texts** (`lit2.out.txt` sections 1–3).

```
(1) env unset: calls differ 0; stored record identical 25776; differs ONLY by N2's cutRetried key on a transient record: 20880 (cutRetried:false 17496, cutRetried:true 3384); differs otherwise 0; spoken-record cutRetried differs 0; sleeps-only differences 5832; scripts exhausted 0
(1) env 4:     (identical numbers)
(2) GEMMA_MAX_TRIES=1: NEW vs ROUND1 over 46656: calls differ 0; record differs only by N2's cutRetried key 33696; record differs otherwise 0
(3) calibration: OLD vs OLD differs on 0 (must be 0); NO_M1 vs OLD at 4: calls differ on 972 (972 make a 5th call) ; NO_N2 at 1: under-counts 2
```

- **The probe is calibrated.**
  - 972 raw length-6 sequences equal re-review 1's 162 distinct behaviours × 6 free trailing symbols, so removing the guard reproduces round 1's defect exactly.
  - The sleep-only count is 5,832 (= 162 × 36). That is the terminal-sleep difference the comment explicitly does not claim.
- **The one-try cut path is untouched by the guard.** `MAX_TRIES > 1` is false at 1, and NEW vs ROUND1 at one try differs in 0 calls.
- **The spoken record's `cutRetried` differs in 0 sequences** at 4 tries.
  - That field matters: it is what keeps "a cut on the last try is kept, flagged `cutRetried: true`".
  - The harness cannot see this. Its comparison (`i1-retry-trace.mjs:129-130`) drops `cutRetried` from *both* branches, not only from the transient branch that N2 changes.

**Comments: two false equivalence claims remain.** The ruling said none may be left.

1. **The runner comment is false for the stored record.**
   - `gemma-answers.mjs:334-336` claims the new loop reproduces "the pre-Task-4 loop's ending exactly (0 differences in calls or stored record over the reviewer's 46,656-sequence enumeration at 4 tries …)".
   - With N2 in the same file, the stored record at 4 tries differs from the literal old loop in **20,880 of 46,656** sequences: every transient-ending one now carries a `cutRetried` key the old record never had. In **3,384** of them that key is `true`.
   - Where the "0 differences" figure comes from: re-review 1's `suggested-fix-check.mjs` applied both fixes, and its own print says "records differ (**ignoring the N2 field on transient records**)". Re-review 1's summary sentence dropped that caveat. The comment copied the summary, and the shipped file has N2.
   - The report makes the same slip. Proof (2) calls `0 mismatches` "calls/record match" while stating, a sentence earlier, that the harness excluded `cutRetried`.
   - **Where it is visible.** Downstream tallies read this field:
     - `gemma-score-blind.mjs:57` counts `cuts: allRecs.filter((x) => x.cutRetried)` over every record, transient ones included (`:50`);
     - `gemma-watch.mjs:30` counts `cuts=` the same way.

     A default-4 arm run after round 2 therefore reports more "cuts" for the same transport behaviour, while the comment says nothing changed.
   - **Correct wording:** "0 differences in calls or outcome; the transient record now also carries `cutRetried` (N2)".
2. **The harness's fidelity claims are false.**
   - The claims: `i1-retry-trace.mjs:1-2` says "exercises the EXACT retry-loop + record-construction shape now in gemma-answers.mjs (copied verbatim below…)", and `:48-50` says "The LITERAL pre-Task-4 loop … the historical baseline …, not a hypothetical". The report's proof (2) repeats both.
   - The token diff (`hvl.out.txt`):
     - `runOld` is 165 tokens against 203 in the literal loop, with **24 differing runs**;
     - `runNew` is 202 tokens against 232, with **20 differing runs**.
   - What differs:
     - the `pacedAnswer` arguments and **every** `sleep` argument are gone, including the `8000 * (a + 1)` and `4000 * (a + 1)` backoff;
     - the timeout message is rewritten ("X s");
     - the record is a hand-built ternary of 2–3 fields instead of `store[item.id] = { ...item, model: ARM, … }`.
   - The control-flow tokens match: the loop head, the conditions, `attempts`, the M1 guard, and the breaks and continues.
   - **The harness never reads `gemma-answers.mjs` or the pre-Task-4 text.** `readFileSync` and `import` are absent; the file names appear only in comments. So:
     - it would stay green if the runner's M1 guard or N2 field were reverted;
     - it does *not* compare against the literal old loop text;
     - its N2 case reads a transcribed record, not the stored record.
   - Its headline numbers (0/46,656; N2 correct) are right. This review reproduced them on the literal texts. What is false is the claim that it measured the files.

**Fix.** Two comment edits:

- `gemma-answers.mjs:335`: "calls or stored record" → "calls or outcome; the transient record now also carries `cutRetried` (N2)".
- `i1-retry-trace.mjs:1-2, 48-50`: "copied verbatim" / "LITERAL" → "hand-transcribed; control flow matches, arguments dropped; it never reads the runner".

No code change.

## M2: ADDRESSED

- **The change.** Case A (`flash-h40b-score-cal.mjs:35-37`) now asserts the four tier `answered … of … (ids × reps)` lines and the lite line.
- **Results** (`cal2.out.txt`):

  | Run | Result | Detail |
  |---|---|---|
  | Real `flash-h40b-score-cal.mjs`, untouched fixture | **OK**, EXIT 0 | `CALIBRATION OK (fixture: <SP>/flash-h40b-fixture/flash)`; the fixture's `flash/` listing is unchanged by the run |
  | Control: unmodified scorer copy on `fx/full` | OK | |
  | **`answeredCount` always 0** (the ruling's case) | **FAILED**, EXIT 1 | `case A: FAIL (5 of 10 checks)`, first failing print `on tier 1: answered 0 of 6 (ids × reps)`; cases B and C ok. Exactly the 5 checks M2 added, as the report says. |
  | Round 1's id-level count under the new print | FAILED | 3 of 10 checks, `answered 2 of 6` |
  | Count of rep 1 only | FAILED | 3 of 10 checks |
  | `answeredCount` always "full" (`ids × reps`, never reads the files) | **OK** | a blind spot the ruling's scope implies (see Notes) |
  | N1 reverted | **OK** | the complete fixture has no empty tier (see Notes) |

## M3: ADDRESSED

- **The metric.** `score-blind.mjs:68` now counts individual rep-slots with a spoken record. The prints at `:84` and `:92` use `of ${ids.length * n} (ids × reps)` and `of ${uniqueIds.length * 3} (ids × reps)`.
- **Results** (`fx2.out.txt`):

  | Copy | Scorer output |
  |---|---|
  | a: `def-r3` missing | `gemini-3.7-flash on tier 2: answered 6 of 9 (ids × reps)` (round 1: `0 of 3 ids`) |
  | tr: 503-only | `gemini-3.6-flash on tier 3: answered 0 of 11 (ids × reps)` |
  | skip: R09F uncaptured | `gemini-3.7-flash on tier 2: answered 6 of 6 (ids × reps)`, with R09F named nowhere |

  The skip result is now exactly what the rewritten comment (`:63-67`) says: an uncaptured id "never enters this count either way … (Q-m5, deferred)".
- **The header.** The score-blind header (`:6-12`) no longer claims uncaptured ids are shown.
- **One softened sentence remains** in `score-cal.mjs:4-8`; see Notes.

## M4: ADDRESSED

- **The change.** `sidecar:95` checks `.includes('process.env.GEMMA_MAX_TRIES')`.
- **Occurrences** (`g2.out.txt`):

  | File | `GEMMA_MAX_TRIES` | `process.env.GEMMA_MAX_TRIES` |
  |---|---|---|
  | Real runner | 4 | 1 (the code read at `:316`) |
  | `m4a`: re-review 1's old 4-try loop plus one comment | 1 | 0 |
  | `m4b`: current runner, `:316`'s read replaced by `undefined`, header and comments kept | 3 | 0 |

- **Runs:**

  | Invocation | Result |
  |---|---|
  | `--dry`, real runner | `NOT READY` EXIT 2 (guard passed) |
  | `--dry` with `GEMMA_RUNNER_PATH=m4a` | `RUNNER LACKS GEMMA_MAX_TRIES: <SP>\…\m4a.mjs — regenerate or re-apply the one-try limit` **EXIT 3** |
  | `--dry` with `GEMMA_RUNNER_PATH=m4b.mjs` (relative) | same message, **EXIT 3** |
  | `--plan` with m4a | EXIT 0, unchanged from round 1: `--plan` exits at `:84`, before the guard, and never spawns |

- **What it still cannot do.** It is a text check. A comment containing the literal expression would satisfy it, and so would a runner that reads the variable but has lost other Task-4 semantics (NEW-m1).

## M5: ADDRESSED

- **The change.** `sidecar:32`: `const RUNNER = path.resolve(process.env.GEMMA_RUNNER_PATH ?? `${SP}/gemma-answers.mjs`)`.
  - Uses: the guard read `:95`, the refusal message `:96`, the spawn args `:126`, and the dry print `:158`.
  - That is 4 reads, not the report's "3", but the claim "one value, used everywhere" holds by construction.
- **Relative overrides** (`g2.out.txt`):

  | Override | Invocation cwd | Result |
  |---|---|---|
  | `m4b.mjs` | `<RR2>` | printed as the absolute `<SP>\sdd\…\rr-task4-fix2\m4b.mjs` |
  | `..\..\..\gemma-answers.mjs` | `<RR2>` | resolves to the real runner and passes the guard (`NOT READY` EXIT 2) |
  | the same value | `<SP>` | resolves to `C:\Users\sotka\AppData\Local\Temp\claude\gemma-answers.mjs` and fails loud (`ENOENT`, EXIT 1) |

  A relative value is resolved once, against the invocation cwd.
- **The spawn uses the same value.** The copy of the sidecar has `RUNS` pointed at a fake `…-h40b` folder in `<RR2>` with 15 synthetic prompts. R08, R09F and R12 are left uncaptured. Its `OUT` points at `<RR2>/sidecar-out`. Run with `--dry`:
  - It prints `[dry] run folder 2026-09-26T17-00-00-h40b; 15 captured prompts; call gap 24990 ms`.
  - Every spawn line reads `node.exe <SP>\gemma-answers.mjs --model …`, both with no override and with the relative override. That is the same absolute path the guard just read. `cwd: OUT` (`:127`) cannot change an absolute script path.
  - It also prints `skipped (not captured this run): R08` (tier 1), `R09F` (tier 2), and `R12` (tiers 3 and 3b).
- **The launcher's cwd.** `launch-h40b.cmd` and `launch-h40b-dry.cmd` run from MAIN (their `:6` checks). They invoke only `wav:check`, `guard-h40b.mjs` and `interview60.flight.mjs`. They never run the sidecar and never set `GEMMA_RUNNER_PATH`. In normal use the default is already absolute, so the launcher's cwd plays no part.

## M6: ADDRESSED

- **The change.** `gemma-answers.mjs:316-318` computes the value once and refuses a non-finite one. This sits after the argument checks and the banner (`:298-311`) and before the per-item loop (`:320`), which is the only caller of `pacedAnswer`.
- **Real process, `--limit 0`** (`LIMIT = Number('0')`, so `todo = []` and no request is possible). `NATIVELY_ROSTER=holdout40`, `GEMMA_ARMS_DIR=<RR2>/arms`:

  | `GEMMA_MAX_TRIES` | Output | Exit | Arms dir after |
  |---|---|---|---|
  | `abc` | `ANSWER-ONLY PASS … 0 spoken questions` / `GEMMA_MAX_TRIES is not a finite number: "abc"` | **2** | empty |
  | `Infinity` | the same message | **2** | empty |
  | unset | `answered 0/0` | 0 | empty |
  | `1` | `answered 0/0` | 0 | empty |

- **Literal text with a non-empty script** (60 × 503, then CLEAN; `lit2.out.txt` section 4):
  - `abc`, `Infinity`, `1e999` and `NaN`: exit 2 with **0 calls**.
  - Calibration: with the check removed, `abc` makes **61 calls**.
- **Placement relative to `--plan` and `--dry`: no defect.** The runner has no such modes. The sidecar never starts the runner in `--plan` or `--dry`, and it pins `GEMMA_MAX_TRIES: '1'` into the child env (`sidecar:119`), so a stray value in the operator's shell cannot reach the runner through it. `--limit 0` is a zero-request way to exercise the refusal directly.

---

## New finding

### NEW-m1 (Minor): the I4 guard and the runner header cover only the env read, but the sidecar's accounting now depends on more hand-applied runner semantics

Anchors:

- `gemma-answers.mjs:29-31`: the header lists one hand-applied difference, "a GEMMA_MAX_TRIES env var … that bounds the per-item retry loop".
- `flash-h40b-sidecar.mjs:86-98`: the guard's comment says "The whole budget above rests on the runner honoring GEMMA_MAX_TRIES". The check is `:95`. The remediation text is "regenerate or re-apply the one-try limit".
- `flash-h40b-sidecar.mjs:144`: the accounting that reads `cutRetried`.

**Mechanism.**

- Round 2 made N2's `cutRetried` on the transient record a second hand-applied change the budget accounting depends on. M1's guard and I1's one-try cut re-ask are part of the same dependency.
- `gemma-answers-gen.mjs` is untouched, so a regeneration drops all of them. The guard catches a plain regeneration.
- A partial re-application does not trip it:
  - The guard's only remedy is "re-apply the one-try limit".
  - The only written recipe for that limit is `task-4-brief.md` Step 1: `const MAX_TRIES = …; for (let a = 0; a < MAX_TRIES; a++) {`.
  - Following that recipe yields a runner that contains `process.env.GEMMA_MAX_TRIES` and passes.

**Evidence** (`n2guard.out.txt`, `brief.out.txt`):

- **`non2.mjs`** (the current runner minus N2's field): `--dry` gives `NOT READY` EXIT 2, so the guard passed. At one try, the literal NO_N2 variant under-counts 2 behaviours ([CUT,429] and [CUT,503], each charged 1 for 2 calls).
- **`brief-runner.mjs`** (the regenerated text plus Step 1): `--dry` gives `NOT READY` EXIT 2, so the guard passed. At one try:
  - `[CUT,CLEAN]` makes 1 call, stores `spoken="partial" cutRetried=true`, and is charged 2.
  - `[CUT,T429]` does the same.
  - That is round 0's I1 defect returning (the cut is never re-asked; a truncated answer is graded), with N2, M1 and M6 lost as well.

**Scenario.**

1. Before the 2026-09-26 flight, someone regenerates `<SP>/gemma-answers.mjs`.
2. The flight-day `--dry` exits 3.
3. The operator re-applies "the one-try limit" per the message and the brief.
4. `--dry` passes, and the sidecar runs.
5. Every cut on a full-Flash model is graded as its truncated answer and charged 2 for 1 request. If only N2 was lost, every [cut → 429/503] is charged 1 for 2 requests.
6. `tiers.json.requests` and the tier table in the pass record are then wrong, silently.

**Likelihood and bound.** Low: nothing regenerates the runner on its own. The quota damage is capped by the server's 20/day.

**Fix, one of:**

- make the guard also require N2's line (`transientError: lastErr, cutRetried: dropRetried`) and M1's guard, and name all Task-4 changes in the runner header and in the guard's message;
- or move the Task-4 changes into `gemma-answers-gen.mjs` so a regeneration keeps them.

---

## Notes (not counted)

- **M6 accepts some values silently.**
  - `''` and `'  '` become 1 try, not the default 4.
  - `'0'` and `'-3'` become 1.
  - `'2.5'` gives 3 tries.

  Only non-finite values refuse, as ruled. These are reachable only through a stray env var on a default-4 caller: `$env:X = ''` removes the variable in PowerShell, while Git Bash can set an empty one. The sidecar always pins `'1'`.
- **One softened sentence in `score-cal.mjs:4-8`.** It still lists "an uncaptured id" among the flight-day gaps, then says the scorer's "answered A of N" line makes "a partial hole … visible".
  - Round 1's back-reference ("such a hole") is gone, so this is no longer an explicit claim, but it can still be read as one.
  - `score-blind.mjs:63-67` states the truth.
- **Calibration blind spots.** These follow from the ruled design: the calibration runs on the complete fixture only.
  - A scorer whose `answeredCount` always prints "full" passes CALIBRATION OK.
  - So does a scorer with N1 reverted.
  - The partial-hole logic and the empty-tier fix are therefore proven only by ad-hoc fixture copies (the report's proof 3; `e1`, `e3`, `eall`, `a`, `skip`, `tr` here). No standing check protects them.
- **`max 0.0 s` on a tier with no answers** (`score-blind.mjs:85`, `Math.max(...T.ttft, 0)`). The expression is pre-existing and already printed this for all-transient tiers (`tr`). N1 makes empty tiers reach it too. Cosmetic.
- **The sidecar's `--dry` past readiness creates `OUT`.** `sidecar:118` runs before the dry exit at `:152-165`; the sidecar copy's `--dry` created an empty `sidecar-out`. This is pre-existing. On flight day the first real `--dry` will create an empty `<SP>/flash-h40b`. That is harmless: the pairs builder then refuses with "tiers.json missing".
- **The report's proof (6) was a live-fire test.** It ran the runner with a non-empty todo (`--captured`, 1 spoken question, gemini-3.8-flash) under `GEMMA_MAX_TRIES=abc`. Had the refusal been missing, round 1's NaN loop would have sent unbounded requests to a 20/day model. `--limit 0` gives the same evidence with no request possible.
- **A wrong comment in the harness.** `i1-retry-trace.mjs:142-143` says the one-try check runs "across the same 46656 sequences". It runs 216 length-3 sequences (`:146`), and its own print at `:156` says so.
- **Pre-existing cosmetics.**
  - The runner prints its banner before refusing.
  - At `--limit 0` it prints `wrote <OUT>`, although nothing is written.
  - The sidecar's dry env line (`:163`) hardcodes `GEMMA_MAX_TRIES=1` as text instead of reading `env` (`:119`).
- **The report's claims otherwise check out:**
  - the line numbers for N1, N2, M1, M3, M4, M5 and M6;
  - proofs (3), (4), (5) and (7), each reproduced;
  - the proof files (`flash-h40b-fixture-proof-n1/`, `gemma-answers-m4-comment-only-proof.mjs`, and the proof-6 scratch dir) are gone;
  - `TEMP PROOF-M2` occurs 0 times in the scorer.

## Residual risks

- **The sidecar's spawning branch has still never run.** That branch is `tier()`, `run()`'s spawn, the per-pass gate and the `tiers.json` write. This review is the first to exercise the post-readiness `--dry` branch: `capturedIds`, the per-tier skip lines, the gap computation and the spawn arguments. It did so on synthetic prompts through a redirected copy. The flight-day `--dry` is its first run on the real prompts.
- **The loop analysis is exhaustive over control flow on the literal text, with a fake `pacedAnswer`.** It does not cover:
  - the real `fetch` and SSE path (what a real cut, 503 or timeout looks like);
  - the real sleeps;
  - the Groq `retryAfterMs` branch;
  - runs of more than one item.
- **The one-try accounting is exact only while the runner is the round-2 text** (NEW-m1).

## Probe files (throwaway, safe to delete)

All under `<RR2>`:

- `gen/`: the generator copy and the regenerated pre-Task-4 runner
- `pre-vs-current-runner.diff`
- `literal-loop-harness2.mjs`, `lit2.out.txt`
- `harness-vs-literal.mjs`, `hvl.out.txt`
- `hmut.mjs`, `hmut.out.txt`, `h.m1.mjs`, `h.n2.mjs`
- `fx2.mjs`, `fx2.out.txt`, `fx/{e1,e3,eall,a,skip,tr,full}`, `out/*.txt`
- `cal2.mjs`, `cal2.out.txt`, `sc/`
- `g2.mjs`, `g2.out.txt`, `m4a.mjs`, `m4b.mjs`, `sdry.mjs`, `runs/`, `sidecar-out/`, `arms/`
- `n2guard.mjs`, `n2guard.out.txt`, `non2.mjs`
- `brief-rebuild.mjs`, `brief.out.txt`, `brief-runner.mjs`
- `i1-retry-trace.out.txt`, `plan.out.txt`, `dry.out.txt`
