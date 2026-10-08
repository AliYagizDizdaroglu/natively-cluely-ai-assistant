# Task 4 report — the capped Flash sidecar, ready before the flight

All paths below are under `<SP>` = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad` unless stated otherwise. Nothing was written to the repo or to MAIN; MAIN was read-only throughout (h40a run folder, h40a blind verdicts, `interview60.judge.mjs`). No git command was run. No Gemini/Groq API call was made — confirmed by tracing every execution in this session (see "Nothing calls the API" below).

## Files

**Edited**
- `gemma-answers.mjs` — Step 1. Line 314 (`for (let a = 0; a < 4; a++) {`) replaced with the brief's exact two lines:
  ```js
  const MAX_TRIES = Math.max(1, Number(process.env.GEMMA_MAX_TRIES ?? 4));   // the capped Flash sidecar sets 1: a 429 or 503 is recorded, never retried
  for (let a = 0; a < MAX_TRIES; a++) {
  ```
  Unset (all other callers: `gemma-h40a-sidecar.mjs`, `flash-h40a-tiers.mjs`) → `Number(undefined ?? 4)` = 4 = the old hardcoded value. Behaviour unchanged for them.

**Created**
- `flash-h40b-sidecar.mjs` — Step 2. Tier derivation verbatim from `flash-h40a-tiers.mjs` (h40a blind verdicts + `h40a-verdicts-inapp.json`, R09 skipped as uncaptured), then the brief's `PLAN`/`BUDGET`/`tier()` code, `--plan` and `--dry` per the resolutions, `Promise.all` on tiers 1/2/3 then 3b, writes `flash-h40b/tiers.json`.
- `flash-h40b-blind-pairs.mjs` — Step 3. `flash-h40a-blind-pairs.mjs` adapted: `RUN_DIR`/`FLASH_DIR`/`BLIND_DIR` env overrides (default: dynamic `*-h40b` discovery under MAIN's `interview60.runs`, `SP/flash-h40b`, `<FLASH_DIR>/blind`); `TIERS` read from `<FLASH_DIR>/tiers.json` (no separate tiers module exists for h40b); per-question loop merges tier 3 and 3b's arms into ONE blind item per shared id (never two), lite arms added once per unique id. Exports `RUN` (new, so the scorer stays in step with whatever `blind-pairs` resolved) alongside `TIERS`, `FLASH_FILES`, `PER_FILE`.
- `flash-h40b-score-blind.mjs` — Step 3. `flash-h40a-score-blind.mjs` adapted: `FLASH_DIR`/`BLIND_DIR` env overrides; imports `RUN` from the pairs module instead of hardcoding it; every `[1,2,3]`-hardcoded rep list replaced with `repsOf(arm)` driven by a `REPCOUNT` map (3 reps for tiers 1/2, 1 for tiers 3/3b, keyed by arm since each tier has a distinct model); lite totals computed in one pass over the **unique** id set (tier 3 and 3b share their 11 ids as a single graded item — summing inside the per-tier loop would have double-counted them).
- `flash-h40b-score-cal.mjs` — Step 3. `flash-h40a-score-cal.mjs` pattern with `FLASH_DIR`/`BLIND_DIR` overrides and cases re-targeted at the real output text (`"<model> on tier <t>: X/Y acceptable"` — see concern below) and h40b's four-tier totals (6/6, 9/9, 11/11, 11/11) and the 37-answer Flash total (2·3+3·3+11·1+11·1).
- `flash-h40b-fixture-build.mjs` — verification-only, not named in the brief but required by resolution #2. Builds `<SP>\flash-h40b-fixture\` (`run/` = 6 copied h40a lite-answer files; `flash/` = `tiers.json` with the real h40a-derived tier ids + `spoken:'fixture answer'` records for each tier id/rep). Tier ids are imported from `flash-h40a-tiers.mjs`, never retyped.
- `flash-h40b-cal-demo.mjs` — verification-only. Reproduces calibration case A outside `score-cal.mjs` so the scorer's full totals output could be captured and quoted (`score-cal.mjs` only echoes output on failure).

## Verification

### node --check (every script written or edited)
```
== gemma-answers.mjs ==            OK
== flash-h40b-sidecar.mjs ==       OK
== flash-h40b-blind-pairs.mjs ==   OK
== flash-h40b-score-blind.mjs ==   OK
== flash-h40b-score-cal.mjs ==     OK
== flash-h40b-fixture-build.mjs == OK
== flash-h40b-cal-demo.mjs ==      OK
```

### `--plan` (no run folder needed)
```
tier 1  gemini-3.8-flash  R02F(4/7) R08(6/7)
tier 2  gemini-3.7-flash  R03(2/7) R09F(3/7) R16(3/7)
tier 3  gemini-3.6-flash  R01(1/7) R11F(1/7) R12(1/7) R17F(1/7) R23(1/7) R26F(1/7) R27(1/7) R28(1/7) R30(1/7) R31F(1/7) R32(1/7)
skipped (h40a evidence): R09 (1/7, no captured prompt)

plan (budget 18/model/day):
  tier 1  gemini-3.8-flash  2 ids x 3 reps = 6 requests (budget 18)
  tier 2  gemini-3.7-flash  3 ids x 3 reps = 9 requests (budget 18)
  tier 3  gemini-3.6-flash  11 ids x 1 rep = 11 requests (budget 18)
  tier 3b gemini-3.5-flash  11 ids x 1 rep = 11 requests (budget 18)
EXIT: 0
```
Matches the brief's expected 6/9/11/11 exactly, computed from `ids.length * reps.length`, never typed in.

### `--dry` and the bare (real) invocation — both NOT READY today
```
===== --dry =====
[... same tier/plan lines as above ...]
NOT READY: no *-h40b run folder yet
EXIT: 2

===== bare (real run) =====
[... same tier/plan lines as above ...]
NOT READY: no *-h40b run folder yet
EXIT: 2
```
Confirmed via `ls` that `SP/flash-h40b/` does not exist afterward — the readiness gate (line 82) exits before `fs.mkdirSync(OUT, ...)` (line 97), so neither invocation left any trace, let alone made a request.

### Fixture pipeline (verifies the grading pipeline without any real h40b data)
Built `SP/flash-h40b-fixture/` (`run/` with 6 copied h40a lite-answer files; `flash/tiers.json` with the real derived ids: tier1=`R02F,R08`; tier2=`R03,R09F,R16`; tier3=tier3b=`R01,R11F,R12,R17F,R23,R26F,R27,R28,R30,R31F,R32`; 8 fake Flash answer files).

`flash-h40b-blind-pairs.mjs` with `RUN_DIR`/`FLASH_DIR` pointed at the fixture:
```
pairs.blind-1.json  36 items  R02F,R08,R03,R09F
pairs.blind-2.json  33 items  R16,R01,R11F,R12
pairs.blind-3.json  32 items  R17F,R23,R26F,R27
pairs.blind-4.json  32 items  R28,R30,R31F,R32
4 files, 16 ids; 0 arm answers missing (scored as no answer); instrument 8564ba96369a
```
Inspected `key.blind-2.json` directly: R16 (tier 2) carries exactly 9 entries (`gemini-3.7-flash default` x3 + `3.1-lite LOW` x3 + `3.5-lite HIGH` x3); R01/R11F/R12 (shared tier 3/3b ids) carry exactly 8 entries each (`gemini-3.6-flash default` x1 + `gemini-3.5-flash default` x1 + the two lite arms x3 each) — matches the brief's 9-vs-8 spec exactly, and confirms the merge (not double-item) design for shared ids.

`flash-h40b-score-cal.mjs` against the fixture:
```
case A: ok
case B: ok
case C: ok
CALIBRATION OK
EXIT: 0
```

Scorer totals on case A's synthetic (all-acceptable) verdicts, captured directly (via `flash-h40b-cal-demo.mjs`, since `score-cal.mjs` only echoes output on failure):
```
gemini-3.8-flash on tier 1: 6/6 acceptable; ...
gemini-3.7-flash on tier 2: 9/9 acceptable; ...
gemini-3.6-flash on tier 3: 11/11 acceptable; ...
gemini-3.5-flash on tier 3b: 11/11 acceptable; ...
on the same questions, re-graded in the same files: 3.1 LOW 48/48, 3.5 HIGH 48/48
```
Exactly the brief's expected totals (6/6, 9/9, 11/11, 11/11, lite 48/48). Case B (all Flash "wrong") and case C (Flash "weak", 3.1 LOW "wrong", 3.5 HIGH fine) also passed their embedded checks (0/6, 0/9, 0/11, 0/11; 37 wrong/weak reason lines = 2·3+3·3+11·1+11·1; 3.1 LOW 0/48 in case C) — these are pass/fail assertions inside `score-cal.mjs` itself, and all reported "ok".

All fixture scratch state (`blind-cal`, `blind-cal-demo`) self-cleaned; verified nothing remains under the fixture beyond `run/`, `flash/`, and `flash/blind/{pairs,key}.blind-*.json`. Verified via file mtimes that no `flash-h40a/*` file was touched this session (all predate my first edit at 19:1x).

## Self-review

**Budget can never be exceeded.** Traced `gemma-answers.mjs`'s retry loop with `GEMMA_MAX_TRIES=1`: the loop body runs only `a=0`; on a mid-stream cut it sets `dropRetried=true`, sleeps 5s, then `continue` — which goes straight to the loop's increment/condition (`a=1 < 1` is false) and exits *without* a second `pacedAnswer` call. So every id, cut or not, costs **exactly one** real HTTP request per `run()` invocation. The sidecar's own bookkeeping (`used += todo.length` plus `used += todo.filter(cutRetried).length`) therefore *over*-counts relative to actual requests made whenever a cut occurs (crediting a phantom second request that never happened) — never under-counts. Since `tier()`'s pass loop only starts a new pass when `used + todo.length <= BUDGET` using this (over-)estimate, actual cumulative requests ≤ bookkeeping `used` ≤ BUDGET at every pass boundary. Nominal case (no retries needed): 6+9+11+11 = 37 requests total, well inside 4×18=72 daily capacity and each tier individually ≤ 18.

**GEMMA_MAX_TRIES defaults to 4.** Confirmed by reading the edited line: `Math.max(1, Number(process.env.GEMMA_MAX_TRIES ?? 4))` — unset → 4, identical to the prior hardcoded loop bound. `gemma-h40a-sidecar.mjs` and `flash-h40a-tiers.mjs` don't set this env var (confirmed by re-reading both, unedited), so they are unaffected.

**Tier keys are the strings '1','2','3','3b' everywhere.** The sidecar's `PLAN`/output `final` object uses those exact literal keys (numeric-looking object-literal keys like `{1: r1}` are auto-stringified by JS/JSON.stringify to `"1"`, so the written `tiers.json` has genuine string keys throughout — confirmed in the fixture's `tiers.json` dump above). The grading scripts read `TIERS` from JSON (always string keys) and compare with `t === '3' || t === '3b'` (string literals) in both `flash-h40b-blind-pairs.mjs` (`repTagsFor`) and `flash-h40b-score-blind.mjs` (`REPCOUNT` construction).

**Fixture is separate from the real paths.** `SP/flash-h40b/` does not exist (never created — confirmed by `ls` failing on it after every sidecar invocation). All fixture work lives under `SP/flash-h40b-fixture/`, reached only via explicit `RUN_DIR`/`FLASH_DIR` env vars on every invocation; nothing defaults into the fixture by accident.

**Nothing calls the API.** Enumerated every execution this session: `flash-h40b-sidecar.mjs` (`--plan`, `--dry`, bare) all exited before reaching `run()`/`spawn` (readiness gate or `--plan`'s early exit). `flash-h40b-fixture-build.mjs`, `flash-h40b-blind-pairs.mjs`, `flash-h40b-score-cal.mjs`, `flash-h40b-cal-demo.mjs` only touch the filesystem (plus one `execFileSync` of `flash-h40b-score-blind.mjs`, itself filesystem-only). `gemma-answers.mjs` (the only script with a `fetch` call) was `node --check`'d — parsed, never executed. No `.env`/`credentials.enc` was read, printed, or copied.

## Concerns

1. **The h40a reference calibration script may not actually pass.** `flash-h40a-score-cal.mjs`'s case-A/B/C regexes (e.g. `/gemini-3\.8-flash: 6\/6 acceptable/`) look for text *without* `"on tier N"`, but `flash-h40a-score-blind.mjs`'s actual line is `` `${model} on tier ${t}: ${T.acc}/${T.n} acceptable...` `` — I confirmed by testing the regex against that exact template output (`node -e`) that it does **not** match. I did not run `flash-h40a-score-cal.mjs` itself (the task forbids touching `flash-h40a` outputs, and running it would create/delete `flash-h40a/blind-cal`), so I cannot confirm whether it currently reports OK or FAIL — only that the text is a static mismatch. My h40b versions use corrected regex text (`"on tier 1"` etc.), verified empirically against my own scorer's real output (quoted above), so this does not affect task 4's deliverables — flagging it only because the h40a script may be silently broken if anyone relies on it later.

2. **The sidecar's "ready" branch is unexercised.** `--plan` and the NOT READY gate are proven live; the branch that runs once a real `*-h40b` folder exists (capturedIds computation, pacing-gap math, `--dry`'s spawn-arg printing, and the `tier()` pass/budget loop) was only statically traced, never run against data. I could not fixture-test it without either writing a synthetic run folder into MAIN (violates the read-only-MAIN constraint — the sidecar has no `RUN_DIR`-style override, unlike the three grading scripts) or adding an override not in the brief. It closely mirrors `gemma-h40a-sidecar.mjs`'s already-proven capturedIds/gapMs computation, and the `tiers.json` shape it must produce is proven correct downstream by the fixture. Recommend a quick `--dry` smoke check the moment the real h40b run folder lands tomorrow, before letting the full unattended run proceed.

3. **Minor deviation from the brief's literal Step 2 snippet:** I replaced the one-liner `` const runDir = `${RUNS}/${fs.readdirSync(RUNS).filter(...).pop()}` `` (which would silently embed the string `"undefined"` in a path when no `*-h40b` folder exists yet, still reaching NOT READY via a missing-file check) with an explicit `if (!h40bDir) { NOT READY... }` check first. Same exit code and gate today (confirmed above), clearer failure message, no functional change.

---

## Fix round 1

Opus review (`task-4-review.md`) returned Needs fixes (1 Important spec finding, 3 Important quality findings). The controller ruled I1(a), I2, I3, I4 exactly as specified below. The 9 Minors (Q-m1..Q-m9) are explicitly deferred — not touched.

### I1 — the cut-stream re-ask must survive GEMMA_MAX_TRIES=1 (ruled: option (a), decouple it from MAX_TRIES)

**Changed:** `gemma-answers.mjs` — the per-item retry loop, now `gemma-answers.mjs:315-349` (declaration through the rewritten loop's closing brace). Rewrote `for (let a = 0; a < MAX_TRIES; a++)` as `while (true)` with a new `attempts` counter (`:315`, `:326`) that increments once per real `pacedAnswer()` call, in *both* the try body (`:330`) and the catch block (`:343`). `MAX_TRIES` now gates only the transient-failure/thrown-error retry (`if (attempts >= MAX_TRIES) break;` at `:340` and `:346`); the cut-stream branch (`:335-337`) is unconditional on `!dropRetried` alone, so it always gets its one re-ask regardless of `MAX_TRIES`, and its own `pacedAnswer()` call still increments `attempts` (so the sidecar's existing `used += cutRetried` accounting at `flash-h40b-sidecar.mjs:137` now counts a request that actually happens, not a phantom one).

**I1 path trace** (verified by running the actual loop shape against a mocked `pacedAnswer`, not just read — see PROOF below):
- **429/503 (or any thrown error), MAX_TRIES=1:** call 1 → `attempts` becomes 1 → `attempts >= MAX_TRIES(1)` is true → `break`. **1 real call, recorded as transient/error, never retried.**
- **Cut, MAX_TRIES=1:** call 1 → cut (`finish===null`, not transient) → `!dropRetried` is true → `dropRetried=true`, sleep, `continue` (this branch never checks `attempts` vs `MAX_TRIES`) → call 2 (the re-ask) → whatever it returns (clean/cut/transient) is now the final `r`, and since `dropRetried` is already true the cut-branch cannot fire a second time, so the loop takes its normal break path. **2 real calls total, `cutRetried` (i.e. `dropRetried`) true.**
- **Cut, MAX_TRIES=4 (default, every other caller):** identical 2-call sequence to the case above — the re-ask still happens exactly once, `attempts` reaching 2 is nowhere near the now-irrelevant-to-this-branch `MAX_TRIES=4` ceiling. **Unchanged from the pre-Task-4 hardcoded-`a<4` loop** (proven by direct comparison, not assertion — see PROOF (below) / `i1-retry-trace.mjs`'s cross-check section, which also covers the harder cut-then-429-then-429-then-429 compound case: 4 calls total both before and after, because the cut's re-ask never consumes one of the 3 remaining transient-retry slots).

**Comment changes (every one, as required):**
- `gemma-answers.mjs:27-31` — header: restored "Nothing else differs" for the generator's own changes, and *added* a sentence naming the GEMMA_MAX_TRIES difference explicitly (previously it just said "Nothing else differs" with no mention at all — flagged by I4 too, see below).
- `gemma-answers.mjs:316-325` — new comment block above `const MAX_TRIES` explaining the attempts/MAX_TRIES split and stating the MAX_TRIES=4 equivalence claim (the claim the PROOF below verifies).
- `gemma-answers.mjs:331-334` — reworded "One more try; a second cut is kept..." to "One more try, independent of MAX_TRIES (see above); a second cut is kept..." — adds four words, no meaning change otherwise.
- `flash-h40b-sidecar.mjs:71` — **restored** `// HTTP requests per model today, leaving 2 of the 20 for the runner's own stream-cut re-ask` (was silently rewritten to "for slack" in the original submission; that was the spec-compliance finding).
- `flash-h40b-sidecar.mjs:7-10` — caught on my own final re-read (not named by the review): the file's top-of-file header comment independently said "Budget 18/model, leaving 2 of the 20 for slack" — the *same* inaccuracy, in a second place the review didn't anchor to. Fixed to match the restored wording, so the file no longer contradicts itself about what the 2 spare requests are for.

### I2 — a missing Flash rep file must not abort the builder

**Changed:** `flash-h40b-blind-pairs.mjs`. Added `loadFlash` (comment `:45-50`, function `:51`; strict `load` at `:44` untouched and still used for the lite files at `:56`) which, on a missing file, prints one `console.error` warning naming the file and returns `{}` instead of calling `process.exit(2)`. Line `:62` (`const flash = FLASH_FILES[arm].map(load)` → `.map(loadFlash)`) is the only call-site change. No other logic changed: the existing per-id `missing++` counter (`:67` inside the Flash arm loop, `:77` inside the lite arm loop, both unchanged) already handles "every id that file would have covered" correctly once `loadFlash` returns `{}` for that file (each id's lookup becomes `undefined`, `x?.spoken` is falsy, counted as missing) — I verified this is sufficient rather than adding a redundant explicit loop. A tier that captured no ids needs no special case either: `FLASH_FILES[arm]` still gets `.map(loadFlash)`'d (now tolerantly) but the `for (const id of ids)` loop over an empty array simply does nothing, so nothing crashes and nothing is added.

**Comment added:** `flash-h40b-blind-pairs.mjs:45-50`, a block comment above `loadFlash` explaining why a missing Flash file is expected (budget gate skipped a rep, or a tier captured 0 ids) versus why the lite files stay strict.

### I3 — calibration proves the scorer (fixture only); real-data scorer shows gaps, never fails

**Changed:** `flash-h40b-score-cal.mjs` — rewrote to hardcode `FIX_RUN`/`FIX_FLASH` at `:20-23` to `SP/flash-h40b-fixture/{run,flash}` (removed the `FLASH_DIR`/`BLIND_DIR` env-override reads it previously had; RUN_DIR/FLASH_DIR are now pinned explicitly in the `execFileSync` env at `:45`, not inherited, so a stray env var in the caller's shell can no longer redirect calibration onto real data). Added a `console.log` at `:25` printing `run=`/`flash=`/`blind=` before anything else, and both terminal messages (`:26` no-fixture error, `:51` OK/FAILED) now name the fixture path. Whole header comment (`:1-15`) rewritten to state the fixture-only intent and the flight-day order (calibrate first, must print OK, then score real data).

**Changed:** `flash-h40b-score-blind.mjs` — added `answeredCount(arm, ids)` (`:60-63`): counts ids (out of the given set) where *every* rep this arm expects has a `.spoken` record — deliberately "every rep", not "at least one", because the actual Q-I1 scenario (`def` ran, `def-r2`/`def-r3` never did) would otherwise still read as "fully answered" via just the one rep that exists. Two new lines print it, both left as *additional* lines rather than edited into the existing "acceptable" lines, specifically so the calibration's regexes (which match the pre-existing "`X on tier Y: N/M acceptable`" and "`3.1 LOW N/M, 3.5 HIGH N/M`" substrings) needed no restructuring beyond the tier-value updates I3 also required:
  - `:79`, inside the per-tier loop: `` `${model} on tier ${t}: answered ${answeredCount(arm, ids)} of ${ids.length} ids` ``.
  - `:87`, before the lite summary: `` `lite answered: 3.1 LOW ${answeredCount(...)} of ${uniqueIds.length} ids, 3.5 HIGH ${...}` ``.
  Header comment (`:1-13`) rewrote the file's framing: it is now explicitly documented as the real-data scorer that never fails closed on a hole, pointing at `score-cal.mjs` as the thing that proves the logic and stating the flight-day order.

### I4 — refuse to spawn if the runner lost GEMMA_MAX_TRIES

**Changed:** `flash-h40b-sidecar.mjs`. Added `const RUNNER = process.env.GEMMA_RUNNER_PATH ?? \`${SP}/gemma-answers.mjs\`` (`:26-28`) and the guard (`:82-91`, reads `RUNNER`'s text, refuses with the exact required message and `process.exit(3)` if it lacks `GEMMA_MAX_TRIES`). Both spawn sites (the paced `run()` at `:119` and the `--dry` arg-printer at `:151`) now use `RUNNER` instead of the hardcoded `${SP}/gemma-answers.mjs`, so the override actually governs what would be spawned, not just what gets guard-checked.
**Placement deviation (reported, not silent):** the ruling says "before spawning the runner", which the NOT-READY gate (needing a real `*-h40b` folder) would have made untestable today if the guard stayed *after* it, as I first wrote it. I moved the guard to run *before* the readiness gate — it is a property of the tooling, independent of whether the flight's run folder exists — so `--dry`/a bare run check it even today. This does not change today's NOT READY output (re-verified after the move: still `EXIT 2`, same message) and makes the guard reachable now instead of only after the flight.
**Comment changed:** `gemma-answers.mjs:27-31` header, see I1 above (same edit satisfies both rulings' "name it" requirement — the header now says "Nothing else in the generator's own changes differs — EXCEPT a GEMMA_MAX_TRIES env var...").

### PROOF

**(a) A missing Flash rep file → exit 0, one warning, NO ANSWER for its ids.** Copied the fixture, deleted `interview60.answers.gemini-3.7-flash_def-r3.json` (tier 2's third rep), ran the builder (`RUN_DIR=.../run FLASH_DIR=.../flash node flash-h40b-blind-pairs.mjs`):
```
missing ./flash-h40b-fixture-proof-a/flash/interview60.answers.gemini-3.7-flash_def-r3.json (recorded as NO ANSWER for its ids)
pairs.blind-1.json  34 items  R02F,R08,R03,R09F
pairs.blind-2.json  32 items  R16,R01,R11F,R12
pairs.blind-3.json  32 items  R17F,R23,R26F,R27
pairs.blind-4.json  32 items  R28,R30,R31F,R32
4 files, 16 ids; 3 arm answers missing (scored as no answer); instrument 8564ba96369a
EXIT: 0
```
Read `key.blind-2.json` directly: R16 (tier 2) now has exactly 8 entries (was 9), `gemini-3.7-flash default` present at rep 1 and rep 2 only — rep 3 silently absent, exactly the deleted file's ids. 3 missing = R03/R09F/R16's rep-3 flash entries, matching "3 arm answers missing". Copy deleted afterward.

**(b) One missing answer RECORD (not a whole file) → real-data scorer shows "answered N-1 of M", nothing fails; untouched fixture still calibrates OK.** Copied the fixture, removed R08's entry (leaving R02F) from `gemini-3.8-flash_def.json` only (its `def-r2`/`def-r3` files, and R02F, untouched), rebuilt pairs (`3 files... 1 arm answers missing`, exit 0), ran `flash-h40b-score-blind.mjs` against it (no verdicts needed — `answeredCount` doesn't depend on grading):
```
gemini-3.8-flash on tier 1: answered 1 of 2 ids
gemini-3.8-flash on tier 1: 0/6 acceptable; ...
SCORE EXIT: 0
```
(0/6 acceptable because no verdicts.blind-*.json exist in this ad hoc run — irrelevant to what's being proven, the "answered" line and exit 0 are.) Then ran `node flash-h40b-score-cal.mjs` with **no env vars** (it is now hardcoded to the real, untouched fixture) and got `case A: ok / case B: ok / case C: ok / CALIBRATION OK (fixture: .../flash-h40b-fixture/flash)`. Copy deleted afterward.

**(c) The calibration still rejects known-bad scorer behaviour, naming the case.** Three mutations, each applied, run, confirmed FAILED, then reverted and reconfirmed OK (verified clean via `grep -c "TEMP PROOF-C"` = 0 and `node --check` after each revert):
  - **11/33** (old bug: ignore the tier-3/3b one-rep special case). Mutated `flash-h40b-score-blind.mjs`'s `REPCOUNT` line to hardcode `3` for every arm. `node flash-h40b-score-cal.mjs` (real fixture) → `case A: FAIL (2 of 5 checks)` with `gemini-3.6-flash on tier 3: 11/33 acceptable` and `gemini-3.5-flash on tier 3b: 11/33 acceptable` printed; cases B/C failed too; `CALIBRATION FAILED (3 case(s)...)`. Reverted; `CALIBRATION OK` confirmed again.
  - **81/81** (old bug: sum lite totals inside the per-tier loop, double-counting tier 3/3b's shared 11 ids: 27 slots × 3 = 81). Added a `buggyLite` accumulator inside the per-tier-id loop and pointed the final print at it instead of the correct `liteTotals`. `node flash-h40b-score-cal.mjs` → `on the same questions, re-graded in the same files: 3.1 LOW 81/81, 3.5 HIGH 81/81` in all 3 cases; `CALIBRATION FAILED (3 case(s)...)`. Reverted; OK confirmed again.
  - **5/6** (a real data hole checked against the fixed complete-data expectation — this is Q-I2's exact point, made concrete). Temporarily pointed `score-cal.mjs`'s hardcoded `FIX_RUN`/`FIX_FLASH` at the proof-b holed copy (still on disk from proof (b)) instead of the real fixture. `node flash-h40b-score-cal.mjs` → `gemini-3.8-flash on tier 1: 5/6 acceptable` (and `answered 1 of 2 ids`); `case A/B/C: FAIL`; `CALIBRATION FAILED`. Reverted the path constants; `CALIBRATION OK` against the real fixture confirmed again.

**(d) `--limit 0` zero-request validation.** `gemma-answers.mjs` has `--limit <n>` (`slice(0, LIMIT)`); with `0` the per-item loop body never executes, so `pacedAnswer`/`fetch` is never called. Ran the review's suggested exact form, using h40a's real `interview60.prompts.json` (read-only, via PowerShell since it touches MAIN) and all 16 fixture ids:
```
GEMMA_ARMS_DIR=<scratch> NATIVELY_ROSTER=holdout40 GEMMA_MAX_TRIES=1 node gemma-answers.mjs --model gemini-3.8-flash --tag probe --captured <h40a prompts.json> --only R02F,R08,R03,R09F,R16,R01,R11F,R12,R17F,R23,R26F,R27,R28,R30,R31F,R32 --limit 0
```
```
ANSWER-ONLY PASS  model=gemini-3.8-flash  variant=probe (prompt suffix 0 chars)  prompts=captured (the app's own system + user turn, replayed)  0 spoken questions

  answered 0/0   transient 0

  wrote .../flash-h40b-proof-d/interview60.answers.gemini-3.8-flash_probe.json
EXIT: 0
```
This also exercised the pre-loop validations for real: `--only` names were checked against the roster and `--captured` was checked for a prompt on all 16 ids (either failure prints an error and a non-zero exit *before* "ANSWER-ONLY PASS" — neither fired, so both passed for real h40a data on these ids). Stronger than expected: the answers file is written *inside* the per-item loop, which never ran, so with `--limit 0` the "wrote ..." line is printed but the file is never actually created — confirmed (`ls` on the scratch dir: empty). Zero requests, zero file writes. Scratch dir deleted afterward.

**(e) `node --check` / `--plan` / `--dry`, final state.** All 8 touched scripts (`gemma-answers.mjs`, `flash-h40b-sidecar.mjs`, `flash-h40b-blind-pairs.mjs`, `flash-h40b-score-blind.mjs`, `flash-h40b-score-cal.mjs`, `flash-h40b-fixture-build.mjs`, `flash-h40b-cal-demo.mjs`, `i1-retry-trace.mjs`) — `OK`. `--plan`: same 6/9/11/11 as before. `--dry`: `NOT READY: no *-h40b run folder yet`, `EXIT: 2` (re-confirmed with the shell's real exit code, not a piped command's — an earlier `| tail` in my own scratch testing masked this as exit 0, caught and re-verified unpiped), `SP/flash-h40b/` still does not exist afterward. Re-ran once more after the header-comment fix above (last edit made this round) — identical output both times.

**(f) The I4 guard.** Built `gemma-answers-broken-proof-f.mjs`, a copy of `gemma-answers.mjs` with every `GEMMA_MAX_TRIES` occurrence removed (header + loop comment + the `const MAX_TRIES` line reverted to the literal pre-Task-4 `for (let a = 0; a < 4; a++)` form) — `grep -c GEMMA_MAX_TRIES` = 0, `node --check` still OK (valid JS). Ran:
```
GEMMA_RUNNER_PATH=./gemma-answers-broken-proof-f.mjs node flash-h40b-sidecar.mjs --dry
...
RUNNER LACKS GEMMA_MAX_TRIES: ./gemma-answers-broken-proof-f.mjs — regenerate or re-apply the one-try limit
EXIT: 3
```
Exact message and exit code as specified. This also proves the guard now fires *before* the (today, always-failing) readiness gate — the tier/plan lines print, then the guard message appears instead of "NOT READY". Restore: re-ran with `GEMMA_RUNNER_PATH` unset — guard passes silently, `NOT READY: no *-h40b run folder yet`, `EXIT: 2`, identical to before the broken-runner test. Broken copy deleted afterward.

### Self-review

- **I1 correctness beyond the hand trace:** built `i1-retry-trace.mjs` (verification-only, not a deliverable) — a byte-faithful extraction of the new loop's control flow against a scripted mock `pacedAnswer`, run for real (not just reasoned about): all 10 named scenarios (429/cut × MAX_TRIES 1 and 4, plus mixed sequences) match expected `{calls, dropRetried, final-kind}` exactly, **and** a separate cross-check runs the *actual pre-Task-4* loop shape (hardcoded `a<4`, no `attempts`) against 8 scripted sequences at MAX_TRIES=4 and diffs every field against the new loop — all 8 `MATCH`. This is the "would it answer differently if the effect were absent" calibration (rule 8): the previous (buggy) implementation is known to fail the "cut, MAX_TRIES=1" cases (1 call instead of 2), so this harness is a real check, not a tautology.
- **Every PROOF mutation was reverted and reconfirmed**, not just undone: `grep -c "TEMP PROOF"` = 0 across all shipped files, `node --check` re-run after every revert, and `CALIBRATION OK` re-observed after mutations A, B and C specifically (not assumed from "I put the text back").
- **No API call, ever, this round:** every command executed is either `node --check` (parse-only), a `--plan`/`--dry` invocation (both exit before any `spawn`/`fetch`), a filesystem-only script (`blind-pairs`, `score-cal`, `score-blind`, `fixture-build`, `cal-demo`), or the one deliberate `gemma-answers.mjs --limit 0` run (proof (d)), which by construction makes zero real calls (see (d) above — the loop body that calls `pacedAnswer` never executes when `todo` is empty).
- **MAIN touched read-only only:** the one `--captured <h40a prompts.json>` read in proof (d) was done via PowerShell per the task's own instruction ("Use the PowerShell tool for any command that touches MAIN"); nothing was written under MAIN; no git command was run this round either.
- **Scope discipline:** did not touch any of the 9 deferred Minors (Q-m1..Q-m9) — confirmed by re-reading the diffs above against the review's anchors for each Minor (e.g. Q-m7's `--dry`/`mkdirSync` ordering and hand-typed env line are both still exactly as the original submission left them; Q-m5's missing `skipped`/`requests` printout in the scorer is still absent).
- **Residual, unchanged from before:** the sidecar's post-NOT-READY branch (capturedIds/gapMs on real data, the `tier()` pass/budget loop itself) is still unexercised against real or fixture data this round either — proof (f) exercises the new guard specifically by making it fire *before* that branch, which was necessary to test it today at all, but does not newly cover the branch itself. Unchanged concern from the original report.

---

## Fix round 2

Re-review (`task-4-rereview1.md`) accepted I2 and I4 outright; found I1 and I3 partially addressed (N1, N2 — both Important); raised 6 new Minors (M1–M6). The controller ruled: fix all 8. Every item below was applied, then proven, in the order N1, N2, M1 (all three touch the same retry loop / scorer regions), M2, M3 (M2 depends on M3's new line format), M4, M5, M6.

### N1 — a tier with no captured ids must not crash the scorer

**Changed:** `flash-h40b-score-blind.mjs:71-85`. `totals[t] = { acc: 0, n: 0, ttft: [], thoughts: [], total: [] }` (line `:74`) moved from a conditional `??=` *inside* the per-id loop to an unconditional assignment *before* it, right after `const n = REPCOUNT[arm] ?? 3;`. With `ids: []` the id loop's body never runs, but `totals[t]` now already exists, so `const T = totals[t]` is never `undefined`. `pct()` and `Math.max(...[], 0)` were already null/zero-safe on an empty array (unchanged), so no further guard was needed.

### N2 — a cut whose re-ask hits a transient failure must still charge 2, via the stored record

**Changed:** `gemma-answers.mjs:356-362` (the `if (!r || r.transient)` branch). Added `cutRetried: dropRetried` to the transient-record literal, so it now reads `store[item.id] = { ...item, model: ARM, transientError: lastErr, cutRetried: dropRetried };` — the exact one-field addition the ruling specified. The success-branch record already carried `cutRetried` (pre-Task-4, unchanged).

Historical note for calibration: this gap (`cutRetried` missing on the transient branch) existed in the pre-Task-4 code too, whenever a cut was followed by more retries that ended transiently — it was simply never operationally significant before, because no caller did per-id budget accounting off `cutRetried` until `flash-h40b-sidecar.mjs`. The fix closes it for every caller, not only the capped sidecar.

### M1 — restore the pre-Task-4 loop's ending at the default 4 tries

**Changed:** `gemma-answers.mjs:339-343` (the cut branch). Added the reviewer's suggested line: after `await sleep(5000);`, before `continue;`, now `if (MAX_TRIES > 1 && attempts >= MAX_TRIES) break;`. At `MAX_TRIES=1` this condition is always false (`1 > 1` never holds), so the re-ask stays unconditional — one-try behaviour provably unchanged (see PROOF below). At `MAX_TRIES>1`, a cut that lands as the last allowed attempt now ends the loop right there (keeping the cut's own truncated answer, `cutRetried: true`) instead of spending an extra, un-budgeted request — matching the pre-Task-4 loop's ending.

### M2 — calibration must assert the "answered" lines too

**Changed:** `flash-h40b-score-cal.mjs:31-38` (case A's `expect` array). Added 5 regexes checking `answered 6 of 6`, `9 of 9`, `11 of 11` ×2 and the lite `48 of 48` ×2 (ids × reps format from M3, below) on the complete fixture — a scorer whose `answeredCount` always returns 0 now fails case A (proven below).

### M3 — the "answered" metric switches to individual rep-slots, and the comment stops overclaiming

**Changed:** `flash-h40b-score-blind.mjs:63-68`. Redefined `answeredCount(arm, ids)`: was `ids.filter(id => every rep present).length` (an id-level completeness count that hid 2 good reps behind 1 missing one); now `ids.reduce((sum, id) => sum + reps-with-a-spoken-record-for-that-id, 0)` — counts individual answered rep-slots across all ids, so a partial hole is visible as a proportion (e.g. fx-a's tier 2: `answered 6 of 9`, not `0 of 3`). Both print sites changed to match: `:84` (`answered ${answeredCount(arm, ids)} of ${ids.length * n} (ids × reps)`, per-tier) and `:92` (the lite-arm line, `of ${uniqueIds.length * 3}`). Rewrote the function's comment (`:63-67`) to state plainly that an *uncaptured* id (absent from `ids`/`tiers.json`) is invisible to this count either way — the old comment's claim that it "shows up" was false and is gone.

### M4 — the guard requires the literal read expression, not the bare token

**Changed:** `flash-h40b-sidecar.mjs:94-95` (comment) and `:96` (was `:95` before the comment grew) — the guard's `.includes('GEMMA_MAX_TRIES')` is now `.includes('process.env.GEMMA_MAX_TRIES')`. A file whose only mention of the token is prose (a comment, a header sentence) no longer satisfies it; only the runner's own `process.env.GEMMA_MAX_TRIES` read does. Verified the real `gemma-answers.mjs` still contains this exact literal (`grep`, line 316) before relying on it.

### M5 — resolve `GEMMA_RUNNER_PATH` to one absolute path, used everywhere

**Changed:** `flash-h40b-sidecar.mjs` — added `import path from 'node:path';` (`:19`) and wrapped the `RUNNER` assignment: `const RUNNER = path.resolve(process.env.GEMMA_RUNNER_PATH ?? \`${SP}/gemma-answers.mjs\`);` (`:32`). `RUNNER` is a single `const`, referenced identically at the guard's read (`:95`), `run()`'s spawn args (`:126`), and `--dry`'s spawn-arg printer (`:158`) — verified by `grep -n RUNNER` showing exactly those 4 use sites (1 assignment + 3 reads), so "one value, used everywhere" holds by construction, not just for the specific paths I happened to test.

### M6 — a non-finite `GEMMA_MAX_TRIES` must refuse loudly, before any request

**Changed:** `gemma-answers.mjs:313-318`. Hoisted the `MAX_TRIES` computation out of the per-item loop (it was recomputed identically on every item before; the env var cannot change mid-run) to run once, immediately after the "ANSWER-ONLY PASS" summary line and before the per-item loop begins. Added `if (!Number.isFinite(MAX_TRIES)) { console.error(...); process.exit(2); }`. `Math.max(1, Number('abc'))` is `NaN`, which `Number.isFinite` correctly rejects (and so does `Infinity`, a sensible side effect, not separately required).

### PROOF

**(1) The harness, N2 case asserting the stored record.** Rewrote `i1-retry-trace.mjs`'s `runNew`/`runOld` to construct and return the actual `record` object (`{transientError, cutRetried}` or `{spoken, finish, cutRetried}`) exactly as `gemma-answers.mjs` does, and changed every assertion to compare `record`, not the loop-local `dropRetried`. Named cases (full output quoted below the table) include the two previously under-counted shapes:
```
OK   N2 (fix round 2): cut, MAX_TRIES=1, re-ask comes back 429 -> STORED RECORD now has cutRetried:true (was missing before this fix)
     calls=2 (expected 2)  record={"transientError":"HTTP 429","cutRetried":true} (expected {"transientError":"HTTP 429","cutRetried":true})
OK   N2: cut, MAX_TRIES=1, re-ask comes back 503 -> same fix
     calls=2 (expected 2)  record={"transientError":"HTTP 503","cutRetried":true} (expected {"transientError":"HTTP 503","cutRetried":true})
```
Plus the exhaustive check (below) confirms this at scale: **20,880/20,880** transient-ending sequences at 4 tries, and **156/156** at 1 try, have a stored `cutRetried` matching exactly whether a cut occurred.

**(2) The reviewer's enumeration approach, extended in the harness: 0 differences at 4 tries, unchanged 1-try counts.** Implemented `runOld` as the literal pre-Task-4 loop (hardcoded `for (a<4)`, no `attempts`, no `cutRetried` on the transient branch — the actual historical baseline, not a description of it) and ran **all 6^6 = 46,656 sequences of length 6** over `{CLEAN, CUT, T429, T503, ERR, TIMEOUT}` — the same symbol set and exhaustive scope the reviewer used — comparing `{calls, transientError, spoken, finish}` between `runOld` and `runNew(_, 4)` (deliberately excluding `cutRetried` from this specific comparison, since N2 intentionally changes it — that is proof (1), not a M1 regression):
```
=== exhaustive cross-check, 6^6 = 46656 sequences of length 6, MAX_TRIES=4 ===
M1 (calls/outcome match, cutRetried excluded): 0 mismatches of 46656
N2 (stored record's cutRetried correct on every transient-ending sequence): 20880/20880 correct

=== exhaustive check at MAX_TRIES=1 ===
max calls at MAX_TRIES=1 over 6^3=216 length-3 sequences: 2 (expected 2)
N2 at MAX_TRIES=1: 156/156 correct
```
`0 mismatches of 46656` is the M1 claim my code comment now makes (calls/record match at 4 tries — explicitly *not* claiming the residual terminal-sleep timing is identical, matching the reviewer's own narrower claim for their suggested fix). All 11 named scenarios also passed (`ALL NAMED CASES OK`); one of my own draft scenarios had a wrong expectation on first run (see self-review) and was corrected, not the code.

**(3) N1: a fixture copy with one tier having no captured ids.** Built `flash-h40b-fixture-proof-n1/` (copy of the real fixture; tier 1's 3 answer files deleted; `tiers.json`'s tier `"1"` set to `ids: [], skipped: [R02F, R08], requests: 0`). Pairs builder: exit 0, 3 warnings (one per deleted tier-1 file), `4 files, 14 ids`. Scorer:
```
tier 1  gemini-3.8-flash  (0 questions, 3 reps)
  gemini-3.8-flash on tier 1: answered 0 of 0 (ids × reps)
  gemini-3.8-flash on tier 1: 0/0 acceptable; first word p50 ? s, p90 ? s, max 0.0 s; thinking tokens p50 ?; total p50 ? s
[... tier 2, tier 3, tier 3b all print normally ...]
lite answered: 3.1 LOW 42 of 42 (ids × reps), 3.5 HIGH 42 of 42 (ids × reps)
on the same questions, re-graded in the same files: 3.1 LOW 0/42, 3.5 HIGH 0/42
SCORE EXIT: 0
```
No crash; every other tier and both lite totals printed (42 = the remaining 14 unique ids × 3 reps). Copy deleted afterward.

**(4) Calibration on the untouched fixture → OK; forced-0 scorer → FAILED naming the case.**
```
case A: ok
case B: ok
case C: ok
CALIBRATION OK (fixture: .../flash-h40b-fixture/flash)
```
Then temporarily replaced `answeredCount`'s body with `0` in `flash-h40b-score-blind.mjs`, re-ran the (unmodified) calibration:
```
case A: FAIL (5 of 10 checks)
  gemini-3.8-flash on tier 1: answered 0 of 6 (ids × reps)
  ...
  lite answered: 3.1 LOW 0 of 48 (ids × reps), 3.5 HIGH 0 of 48 (ids × reps)
case B: ok
case C: ok
CALIBRATION FAILED (1 case(s), fixture: .../flash-h40b-fixture/flash)
```
Exactly the 5 checks M2 added failed (the pre-existing "acceptable" checks, unaffected by `answeredCount`, still passed) — confirms M2 is what catches this, not a coincidental failure elsewhere. Reverted; `grep -c "TEMP PROOF-M2"` = 0; `node --check` OK; re-ran calibration, `CALIBRATION OK` confirmed again.

**(5) The I4 guard against a comment-only mention.** Built `gemma-answers-m4-comment-only-proof.mjs` (the old 4-try loop, one comment line naming `GEMMA_MAX_TRIES`, zero occurrences of `process.env.GEMMA_MAX_TRIES` — verified by `grep -c` on both patterns before running). `GEMMA_RUNNER_PATH=./gemma-answers-m4-comment-only-proof.mjs node flash-h40b-sidecar.mjs --dry`:
```
RUNNER LACKS GEMMA_MAX_TRIES: C:\...\scratchpad\gemma-answers-m4-comment-only-proof.mjs — regenerate or re-apply the one-try limit
EXIT: 3
```
(The printed path is already absolute — M5's `path.resolve` confirmed incidentally.) File deleted afterward.

**(6) `GEMMA_MAX_TRIES=abc` → the loud exit, before any request.** Via PowerShell (touches nothing in MAIN except the read-only `--captured` prompts file):
```
ANSWER-ONLY PASS  model=gemini-3.8-flash  variant=probe (prompt suffix 0 chars)  prompts=captured (the app's own system + user turn, replayed)  1 spoken questions

GEMMA_MAX_TRIES is not a finite number: "abc"
EXIT: 2
```
`Get-ChildItem` on the scratch `GEMMA_ARMS_DIR` afterward: empty — no answers file, confirming the per-item loop (the only place `pacedAnswer`/`fetch` is called) never started. Scratch dir deleted afterward.

**(7) `node --check` / `--plan` / `--dry`, final state.** All 8 scripts touched this round (`gemma-answers.mjs`, `flash-h40b-sidecar.mjs`, `flash-h40b-blind-pairs.mjs`, `flash-h40b-score-blind.mjs`, `flash-h40b-score-cal.mjs`, `flash-h40b-fixture-build.mjs`, `flash-h40b-cal-demo.mjs`, `i1-retry-trace.mjs`) — `OK`. `--plan`: `6/9/11/11` against budget 18, unchanged, `EXIT 0`. `--dry`: `NOT READY: no *-h40b run folder yet`, `EXIT 2`, `SP/flash-h40b/` still does not exist.

### Every comment changed

- `gemma-answers.mjs:313-315` — new comment above the hoisted `MAX_TRIES_ENV`/`MAX_TRIES` (M6): states it is computed and validated once, before any request, not per item.
- `gemma-answers.mjs:327-338` — rewrote the cut-branch comment: explains the `MAX_TRIES > 1` guard (M1), states the 4-tries equivalence claim precisely (calls/record only, over the reviewer's 46,656-sequence enumeration — *not* claiming timing equivalence, which the reviewer's own check for this fix didn't claim either), and notes `cutRetried: true` applies "whichever branch below ends the loop" (N2).
- `gemma-answers.mjs:357-360` — new comment on the transient-record branch explaining why `cutRetried` belongs there too (N2).
- `flash-h40b-sidecar.mjs:7-10` (this round's carry-over, already fixed last round) — unchanged this round.
- `flash-h40b-sidecar.mjs:26-30` — extended the `GEMMA_RUNNER_PATH` comment to explain *why* it must be resolved once (M5): the guard's cwd and `run()`'s `cwd: OUT` would otherwise resolve a relative override differently.
- `flash-h40b-sidecar.mjs:90-94` — added one sentence to the guard's existing comment block stating it checks the literal read expression, not the bare token (M4).
- `flash-h40b-score-blind.mjs:6-13` (header) — rewrote to name the new "answered A of N (ids × reps)" format, the N1 fix, and the M2 calibration check, replacing the round-1 "answered N of M" wording throughout.
- `flash-h40b-score-blind.mjs:63-67` — replaced `answeredCount`'s comment: dropped the false "an uncaptured id shows up here" claim (M3); states plainly what the new rep-slot count does and does not show.
- `flash-h40b-score-cal.mjs:1-9` (header) — updated to describe the "A of N (ids × reps)" format and that case A now also proves `answeredCount` isn't stuck at 0 (M2).
- `flash-h40b-score-cal.mjs:34-36` — new comment above the 5 added regexes explaining what M2 checks and why.
- `i1-retry-trace.mjs` header (`:1-5`) and the exhaustive-check section header (`:112-119`) — rewritten to describe the new record-based assertions and the 46,656-sequence exhaustive methodology.

### Self-review

- **My own draft harness case was wrong, not the code — caught by running it, not trusted.** The first version of the "three failures, cut, then transient" named case assumed a 5th call would happen; running it showed `calls=4` (the M1 guard correctly stops the loop at the cut itself, since it's already the last allowed attempt, so there's no re-ask to return transient). Fixed the test to use `[CUT, T429, T429, T429]` instead (cut first, room left, then the budget runs out on transient retries) — this is the scenario that actually demonstrates N2 at `MAX_TRIES=4`. Left uncorrected, this would have been exactly the rule-8 trap the reviewer named for the original harness: a probe that doesn't match what it claims to test.
- **The exhaustive check reuses the review's own falsification target.** Before this round, `i1-retry-trace.mjs`'s cross-check covered 8 hand-picked sequences and reported "0 mismatches" — true for those 8, false in general (162 real mismatches at 4 tries, per the review). The new version doesn't add more hand-picked cases; it enumerates the same 46,656-sequence space the reviewer used, so "0 mismatches" is now a claim over the space the review actually falsified, not a widened set of examples that could again miss the same shape.
- **N2 assembled from the STORED record, per the ruling's explicit instruction.** Every N2 assertion (named cases and the exhaustive 20,880+156 checks) reads `record.cutRetried`, built the same way `gemma-answers.mjs` builds `store[item.id]`, never the loop-local `dropRetried` — the exact proxy-vs-target distinction the ruling called out.
- **M1's equivalence claim is scoped honestly.** The code comment and this report both say "0 differences in calls or stored record," never "identical," and explicitly flag that a residual timing difference was not checked and is not claimed absent — matching the reviewer's own narrower verification of their suggested fix, not overclaiming beyond it.
- **Every mutation for proof (4) was reverted and reconfirmed:** `grep -c "TEMP PROOF-M2"` = 0, `node --check` re-run, `CALIBRATION OK` re-observed on the untouched fixture after the revert.
- **No API call, ever, this round:** every command was `node --check` (parse-only), `--plan`/`--dry` (both exit before any `spawn`/`fetch`), the harness (pure in-memory mock, no network), a filesystem-only script (`blind-pairs`, `score-cal`, `score-blind`, `fixture-build`), or a deliberate PowerShell run of `gemma-answers.mjs` that refuses (M6) or makes exactly the requests its own `--only`/`--limit` scope allows — proof (6) specifically confirmed zero requests by checking no answers file was written.
- **MAIN touched read-only only**, via PowerShell as instructed; no git command; no write under MAIN.
- **Scope discipline:** did not touch anything outside the 8 ruled items. The header note in the re-review's "Notes (not counted)" section (`sidecar:13` calling `--plan` "the only mode that works before the flight," stale now that `--dry` also gives a meaningful pre-flight answer via the guard) was **not** fixed — it wasn't one of N1/N2/M1–M6, and I flagged it in fix round 1's own residual-risk framing already. Left alone deliberately, not overlooked.
- **Residual, unchanged:** the sidecar's post-readiness branch (capturedIds/gapMs on real data, `tier()`'s pass/budget loop, a real spawn under `GEMMA_MAX_TRIES=1`) is still never exercised against real or fixture data. The re-review's own "Residual risks" section names this as open; nothing in this round's ruling asked for it, and it still requires either a real h40b run folder or writing into MAIN to close.

## Fix round 3

Re-review 2 (`task-4-rereview2.md`) confirmed N1, N2, M2–M6 and the M1 loop itself (0 of 46,656 sequences differ, on the literal texts). It left M1 "PARTIALLY ADDRESSED" over two false equivalence-claim comments, and raised one new Minor (NEW-m1: the guard's single marker and the runner header both name only the `GEMMA_MAX_TRIES` change, so a partial re-application that restores just that env read — following the guard's own old remediation text — passes silently while losing the cut re-ask and N2). The controller ruled three fixes: (a) and (b) wording only, (c) one guard line plus the header naming all three hand-applied changes. No other item was open for this round.

### (a) `gemma-answers.mjs` — the false "0 differences in calls or stored record" claim

The cut-branch comment claimed the new loop reproduces the pre-Task-4 loop's ending "exactly (0 differences in calls or stored record...)". False for the record: N2 adds `cutRetried` to every transient-ending record, which the old loop never wrote — 20,880 of the 46,656 sequences (re-review 2's own count, reproduced again below in proof (4)).

Before (`:334-338`):
```
            // instead of spending an un-budgeted 5th request, reproducing the pre-Task-4 loop's
            // ending exactly (0 differences in calls or stored record over the reviewer's
            // 46,656-sequence enumeration at 4 tries; a residual terminal-sleep timing difference
            // remains — that claim is NOT made here). A second cut is kept as the truncated answer
            // it is, `cutRetried: true`, whichever branch below ends the loop.
```
After:
```
            // instead of spending an un-budgeted 5th request, reproducing the pre-Task-4 loop's
            // ending exactly in calls and outcome (0 differences over the reviewer's 46,656-sequence
            // enumeration at 4 tries; a residual terminal-sleep timing difference remains — that
            // claim is NOT made here). The STORED RECORD is not identical: N2 (below) adds a
            // `cutRetried` key to every transient-ending record, present in 20,880 of those 46,656
            // sequences. A second cut itself is kept as the truncated answer it is, `cutRetried:
            // true`, whichever branch below ends the loop.
```
No code changed — comment only, confirmed by proof (4) reproducing round 2's exact numbers unchanged.

### (b) `i1-retry-trace.mjs` — the false "copied verbatim" / "LITERAL" claims

Neither loop is read from a file; both are hand transcriptions the harness constructs from scratch. Re-review 2's own token diff found `runOld` differs from the real pre-Task-4 text in 24 of its runs and `runNew` in 20 (arguments and sleep durations dropped, the record hand-built instead of spread from `item`) — the control flow matches, the text does not.

Before (header, `:1-2` of `:1-5`):
```
// Throwaway: exercises the EXACT retry-loop + record-construction shape now in gemma-answers.mjs
// (copied verbatim below, same variable names, fix round 2's M1 + N2 changes included) against a
// scripted mock pacedAnswer, to PROVE the loop's call counts, final state AND STORED RECORD rather
// than assert them from a static read. sleep() resolves immediately (no real waiting). Not one of
// task 4's deliverables — verification-only.
```
After:
```
// Throwaway: exercises the retry-loop + record-construction shape below — hand-copied from
// gemma-answers.mjs (scratchpad copy, 2026-09-25 fix round 2) and from the pre-Task-4 loop; the
// harness does not read the files, so re-copy after any loop edit — against a scripted mock
// pacedAnswer, to PROVE the loop's call counts, final state AND STORED RECORD rather than assert
// them from a static read. sleep() resolves immediately (no real waiting). Not one of task 4's
// deliverables — verification-only.
```

Before (`runOld` section header, `:48-50`):
```
// ── The LITERAL pre-Task-4 loop (hardcoded MAX_TRIES=4, no `attempts`, `a` both indexes the for-loop
// and drives backoff, and the transient record NEVER carries cutRetried — this is the historical
// baseline the M1/N2 fixes are checked against, not a hypothetical) ────────────────────────────────
```
After:
```
// ── The pre-Task-4 loop (hand-copied — not read by the harness, see the file header — hardcoded
// MAX_TRIES=4, no `attempts`, `a` both indexes the for-loop and drives backoff, and the transient
// record NEVER carries cutRetried — this is the historical baseline the M1/N2 fixes are checked
// against, not a hypothetical) ──────────────────────────────────────────────────────────────────
```
Both edits keep the numeric claims (`0 differences`, `20,880`, the 46,656/216 sequence counts) exactly as re-review 2 reproduced them — the ruling and re-review 2 agree those are right; only the "measured the files" framing was false. No code changed, confirmed by proof (4).

### (c) `flash-h40b-sidecar.mjs` guard + `gemma-answers.mjs` header — a partial re-application could pass the old guard

The old guard checked one marker (`process.env.GEMMA_MAX_TRIES`) and its own refusal message's remediation ("regenerate or re-apply the one-try limit") named only that one change. Per NEW-m1, a regeneration followed by re-applying just the MAX_TRIES read — exactly what that message suggests — would pass the old guard while the cut re-ask and N2's `cutRetried` stayed lost. The ruling: add a second literal-text marker, `dropRetried`, and rewrite the message to name whichever marker(s) are actually missing.

Before (`:86-98`):
```js
// The whole budget above rests on the runner honoring GEMMA_MAX_TRIES (it is what makes a 429/503
// cost exactly 1 request instead of up to 4). That change lives only in this generated scratchpad
// copy, not in gemma-answers-gen.mjs, so a regeneration would silently drop it. This is a property of
// the TOOLING, independent of whether the h40b run folder exists yet, so it is checked before the
// readiness gate below (and so a `--dry` the moment the runner is (re)built catches it without waiting
// on the flight): refuse rather than spend quota on an assumption nothing checks (rule 11). Checks for
// the literal READ expression, not the bare token (fix round 2, M4) — a comment or a header sentence
// that merely names GEMMA_MAX_TRIES (as this file's own header does) must not satisfy the guard; only
// the runner's code actually reading `process.env.GEMMA_MAX_TRIES` does.
if (!fs.readFileSync(RUNNER, 'utf8').includes('process.env.GEMMA_MAX_TRIES')) {
    console.log(`RUNNER LACKS GEMMA_MAX_TRIES: ${RUNNER} — regenerate or re-apply the one-try limit`);
    process.exit(3);
}
```
After:
```js
// The whole budget above rests on the runner honoring GEMMA_MAX_TRIES (it is what makes a 429/503
// cost exactly 1 request instead of up to 4) AND on the cut-stream re-ask and N2's `cutRetried` record
// field (they are what the accounting at `used += … cutRetried` below charges 2 requests for). All
// three are hand-applied to this scratchpad copy, not in gemma-answers-gen.mjs, so a regeneration
// drops every one of them — and so would a partial re-application that adds back only a MAX_TRIES
// read without the cut-handling it gates (re-review 2, NEW-m1: the old one-marker message's own advice
// invited exactly that). This is a property of the TOOLING, independent of whether the h40b run folder
// exists yet, so it is checked before the readiness gate below (and so a `--dry` the moment the runner
// is (re)built catches it without waiting on the flight): refuse rather than spend quota on an
// assumption nothing checks (rule 11). Checks for the literal READ expression and the cut-handling
// variable name, not a looser token (fix round 2, M4) — a comment or a header sentence that merely
// names them (as this file's own header used to) must not satisfy the guard; only the runner's code
// actually reading `process.env.GEMMA_MAX_TRIES` and using `dropRetried` (the cut re-ask, and N2's
// `cutRetried: dropRetried` on the transient record) does.
const RUNNER_MARKERS = ['process.env.GEMMA_MAX_TRIES', 'dropRetried'];
const runnerText = fs.readFileSync(RUNNER, 'utf8');
const missingMarkers = RUNNER_MARKERS.filter((m) => !runnerText.includes(m));
if (missingMarkers.length) {
    console.log(`RUNNER LACKS ${missingMarkers.join(', ')}: ${RUNNER} — copy the scratchpad gemma-answers.mjs; do not regenerate: the generator lacks the one-try limit, the cut re-ask and cutRetried on transient records`);
    process.exit(3);
}
```

And the runner header (`gemma-answers.mjs:27-31`), which the guard's new comment now cross-references, rewritten to name all three hand-applied changes instead of one:

Before:
```
// SCRATCHPAD COPY of MAIN's interview60.answers.mjs, made by gemma-answers-gen.mjs: golden
// modules from MAIN by absolute path, answers into GEMMA_ARMS_DIR, and thought parts never
// counted as answer text. Nothing else in the generator's own changes differs — EXCEPT a
// GEMMA_MAX_TRIES env var (Task 4, hand-applied, not one of the generator's changes 1-8) that
// bounds the per-item retry loop below; see that loop's own comment for what it does at 1 vs 4.
```
After:
```
// SCRATCHPAD COPY of MAIN's interview60.answers.mjs, made by gemma-answers-gen.mjs: golden
// modules from MAIN by absolute path, answers into GEMMA_ARMS_DIR, and thought parts never
// counted as answer text. Nothing else in the generator's own changes differs — EXCEPT three
// hand-applied changes (Task 4, not among the generator's changes 1-8; a regeneration drops all
// three — flash-h40b-sidecar.mjs's guard checks for them, see its comment): (1) a GEMMA_MAX_TRIES
// env var that bounds the per-item retry loop below (default 4, the sidecar sets 1); (2) that same
// loop's cut-stream re-ask respecting the `attempts` ceiling once MAX_TRIES>1, instead of always
// spending one more request (fix round 2, M1); (3) `cutRetried` written onto the TRANSIENT record
// too, not only the spoken one (fix round 2, N2). See the loop's own comments for what each does.
```

This is the one behaviour change this round: the guard now fails closed on either marker being absent, and names whichever is missing.

### Proof

**(1) The guard against a runner that has `process.env.GEMMA_MAX_TRIES` but not `dropRetried`.** Built a copy of the (already-fixed) `gemma-answers.mjs` with every `dropRetried` identifier renamed to `cutFlag` — a global rename, not a hand-picked deletion, so the marker is genuinely gone from the text, not just from one spot:
```
source has process.env.GEMMA_MAX_TRIES: true
source has dropRetried: true
copy has process.env.GEMMA_MAX_TRIES: true
copy has dropRetried: false
no-dropretried.mjs --check exit 0
```
Ran the real (edited) sidecar against it via the override:
```
GEMMA_RUNNER_PATH=<SP>/round3-fix/no-dropretried.mjs node flash-h40b-sidecar.mjs --dry
...
RUNNER LACKS dropRetried: C:\Users\sotka\AppData\Local\Temp\claude\...\scratchpad\round3-fix\no-dropretried.mjs — copy the scratchpad gemma-answers.mjs; do not regenerate: the generator lacks the one-try limit, the cut re-ask and cutRetried on transient records
EXIT 3
```
Exit 3, and the message names exactly the one absent marker (`dropRetried`), matching the ruled template with `<what is missing>` substituted correctly. Proof scratch (`round3-fix/`) deleted afterward; `ls "$SP" | grep -i round3` found nothing.

**(2) The real runner still passes; `--plan` and `--dry` unchanged.**
```
--- --plan ---
  tier 1  gemini-3.8-flash  2 ids x 3 reps = 6 requests (budget 18)
  tier 2  gemini-3.7-flash  3 ids x 3 reps = 9 requests (budget 18)
  tier 3  gemini-3.6-flash  11 ids x 1 rep = 11 requests (budget 18)
  tier 3b gemini-3.5-flash  11 ids x 1 rep = 11 requests (budget 18)
EXIT 0
--- --dry ---
[guard passes silently — no RUNNER LACKS line]
NOT READY: no *-h40b run folder yet
EXIT 2
```
`6/9/11/11` unchanged from every prior round; the guard produced no refusal line before the readiness gate, i.e. it read both markers as present on the unmodified runner.

**(3) `node --check` on every file changed this round.**
```
gemma-answers.mjs: exit 0
i1-retry-trace.mjs: exit 0
flash-h40b-sidecar.mjs: exit 0
```

**(4) `node i1-retry-trace.mjs`, full output, to confirm the comment-only edits changed nothing.**
```
ALL NAMED CASES OK

=== exhaustive cross-check, 6^6 = 46656 sequences of length 6, MAX_TRIES=4 ===
M1 (calls/outcome match, cutRetried excluded): 0 mismatches of 46656
N2 (stored record's cutRetried correct on every transient-ending sequence): 20880/20880 correct

=== exhaustive check at MAX_TRIES=1 ===
max calls at MAX_TRIES=1 over 6^3=216 length-3 sequences: 2 (expected 2)
N2 at MAX_TRIES=1: 156/156 correct

OVERALL: ALL CHECKS OK
EXIT 0
```
All 11 named cases individually printed `OK` (unchanged from round 2's run); the four headline numbers (`0/46656`, `20880/20880`, max calls `2`, `156/156`) are byte-identical to re-review 2's own reproduction of round 2's proof. Confirms (a) and (b) were comment-only, as the controller specified.

### Self-review

- **The two-marker guard narrows NEW-m1's gap; it does not close every partial-reapplication path, and I have not been asked to close them all.** `dropRetried` is a substring check, and that identifier already existed in MAIN's pre-Task-4 code (it is how the *original* cut-then-retry logic names its flag) — so a runner built by keeping pre-Task-4's own `dropRetried`-based cut branch and bolting on only a `MAX_TRIES`-gated loop bound (the exact `brief-runner.mjs` shape re-review 2 constructed for NEW-m1) would still contain both literal markers and pass this guard, while still lacking M1's `attempts`-ceiling guard on the cut branch and N2's `cutRetried` on the transient one. NEW-m1's own "Fix" section offered a stronger alternative (check the literal transient-branch line `transientError: lastErr, cutRetried: dropRetried`, which pre-Task-4 code never wrote). The ruling asked specifically for "the literal text `dropRetried`" — the narrower check — and this round implements exactly that, not the stronger one. I did not silently upgrade it: expanding a guard's check beyond what was ruled is exactly the kind of scope creep rule 4 rules out, and the ruling frames this round as "one guard line," singular. Flagging this now rather than letting it surface as a future NEW-m2.
- **Round 2's own self-review defended the phrase this round corrects.** Its line 355 says "The code comment and this report both say '0 differences in calls or stored record,' never 'identical'" — true as far as it went, but re-review 2 showed "calls or stored record" was itself the overclaim (calls: 0 differences; stored record: 20,880 differences). Noting this rather than quietly rewriting round 2's text: that section is left as the historical record of what was believed after round 2, not edited to look right in hindsight.
- **Proof (1)'s negative runner was built by mechanical rename, not hand edit**, specifically so the missing-marker result reflects text absence, not a cherry-picked deletion site — the same discipline M4's own proof used in round 2.
- **No API call, no write into MAIN, no subagent, no commit this round.** Every command was `node --check` (parse-only), `--plan`/`--dry` (exit before any `spawn`), the retry-trace harness (in-memory mock, no network), or a throwaway builder script under the scratchpad. Nothing under `<SP>` outside `round3-fix/` was touched, and that directory was removed after proof (1).
- **Scope discipline.** Only (a), (b) and (c) were touched. Re-review 2's other open items — the softened sentence in `score-cal.mjs:4-8`, the calibration blind spots (a scorer whose `answeredCount` always prints "full" also passes CALIBRATION OK), the `max 0.0 s` cosmetic, NEW-m1 itself beyond the ruled fix — were not in this round's ruling and were left alone.
- **Reply format.** The controller asked for status and the one-line proof summary only this round, narrower than rounds 1–2's per-item format; the full per-item detail lives here instead.

## Follow-up: calibration case D

Final whole-branch review, `final-review.md` Q-m1, sent while the REAL h40b sidecar was running (pid 44240, started 14:41:50, writing into `scratchpad/flash-h40b/`). Extra constraint this round: do not touch `flash-h40b\`, `flash-h40b-sidecar.mjs`, `gemma-answers.mjs`, or the sidecar's log files, and no API calls. Only `flash-h40b-score-cal.mjs` was edited; `flash-h40b-score-blind.mjs` (the real scorer) was read for its exact line format but never written, per the ruling ("adjust only the regexes, not the scorer").

**Finding.** Tiers 3 and 3b grade the SAME 11 ids on two different models (gemini-3.6-flash, gemini-3.5-flash). Cases A/B/C each grade every flash arm identically (all acceptable, all wrong, or all weak) — they never give tier 3 a different verdict than tier 3b — so a scorer bug that reads one tier's grades under the other's label, or collapses both onto one label, would still print matching numbers and pass every existing check.

### Diff — `flash-h40b-score-cal.mjs`

Header, cases list (`A`/`B`/`C` → `A`–`D`):
```diff
-// Copies the fixture's key files into a scratch blind dir, writes verdicts by arm, runs the scorer
-// against that dir, and checks the totals it prints. Three cases:
+// Copies the fixture's key files into a scratch blind dir, writes verdicts by arm, runs the scorer
+// against that dir, and checks the totals it prints. Four cases:
    A  everything acceptable            -> tier1 6/6, tier2 9/9, tier3 11/11, tier3b 11/11; lite 48/48 each
    B  Flash wrong, lite acceptable     -> Flash 0/6, 0/9, 0/11, 0/11; lite 48/48; 37 "wrong" reasons
    C  Flash weak, 3.1 wrong, 3.5 fine  -> Flash 0/...; 3.1 LOW 0/48, 3.5 HIGH 48/48; 37 "weak" reasons
+//   D  tier 3 acceptable, tier 3b wrong -> tier3 11/11, tier3b 0/11, else as A. Tiers 3 and 3b share
+//      their 11 ids on two different models; A/B/C grade every flash arm alike, so a scorer that
+//      attributes tier 3b's (3.5-flash) verdicts to tier 3 (3.6-flash), or the reverse, would still
+//      pass A/B/C — only a case where the two tiers' expected numbers actually differ can catch that
+//      (final-review Q-m1).
```
New case, appended after C:
```diff
     C: { by: (arm) => (/flash default/.test(arm) ? 1 : arm === '3.1-lite LOW' ? 0 : 2), expect: [...] },
+    // Q-m1: tier 3's model (3.6-flash) acceptable, tier 3b's model (3.5-flash) wrong on the same 11
+    // ids, everything else acceptable as in A. A/B/C never give tier 3 and tier 3b different grades, so
+    // only D can catch the scorer reading one tier's verdicts under the other's label.
+    D: { by: (arm) => (arm === 'gemini-3.5-flash default' ? 0 : 2), expect: [/gemini-3\.6-flash on tier 3: 11\/11 acceptable/, /gemini-3\.5-flash on tier 3b: 0\/11 acceptable/] },
 };
```
No other line changed. `CALIBRATION OK` requiring A–D and the output naming case D both follow for free from the existing generic `for (const [name, c] of Object.entries(cases))` loop — no separate code needed for either.

### Proof

**(1) Untouched fixture → CALIBRATION OK, case D listed.**
```
case A: ok
case B: ok
case C: ok
case D: ok
CALIBRATION OK (fixture: .../flash-h40b-fixture/flash)
EXIT 0
```

**(2) Swapped attribution → CALIBRATION FAILED, case D only.** Built a throwaway copy of `flash-h40b-score-blind.mjs` (`followup-qm1/score-blind-swap.mjs`; real file never written) with one line changed — the tier loop's `arm` lookup, not the printed label:
```diff
 for (const [t, { model, ids }] of Object.entries(TIERS)) {
-    const arm = `${model} default`;
+    const arm = (t === '3') ? 'gemini-3.5-flash default' : (t === '3b') ? 'gemini-3.6-flash default' : `${model} default`; // BROKEN
```
Run (via a matching throwaway copy of score-cal.mjs pointed at the broken file instead of the real one):
```
case A: ok
case B: ok
case C: ok
case D: FAIL (2 of 2 checks)
  gemini-3.6-flash on tier 3: 0/11 acceptable; ...
  gemini-3.5-flash on tier 3b: 11/11 acceptable; ...
CALIBRATION FAILED (1 case(s), ...)
EXIT 1
```
A/B/C stayed `ok` — confirming the finding's own claim empirically, not just asserting it — while D failed both checks with the two tiers' numbers exactly swapped (0/11 where 11/11 was expected and vice versa).

**(3) Tier 3b's verdicts collapsed onto tier 3 → CALIBRATION FAILED, case D only.** Second throwaway copy, tier 3b's lookup redirected to tier 3's arm (tier 3's own lookup untouched):
```diff
 for (const [t, { model, ids }] of Object.entries(TIERS)) {
-    const arm = `${model} default`;
+    const arm = (t === '3b') ? `${TIERS['3'].model} default` : `${model} default`; // BROKEN
```
Run:
```
case A: ok
case B: ok
case C: ok
case D: FAIL (1 of 2 checks)
  gemini-3.6-flash on tier 3: 11/11 acceptable; ...   [correct — unaffected]
  gemini-3.5-flash on tier 3b: 11/11 acceptable; ...  [expected 0/11 — tier 3b now reports tier 3's data]
CALIBRATION FAILED (1 case(s), ...)
EXIT 1
```
Tier 3's own line is unaffected (its lookup was never redirected); tier 3b's line silently reports tier 3's (acceptable) data instead of its own (wrong) data — "both models counted under tier 3" — and only case D's second check catches it.

**(4) `node --check` on the changed file.**
```
flash-h40b-score-cal.mjs: exit 0
```
(The two throwaway scorer/calibration copies used for proofs 2–3 also passed `node --check` before being run, and were deleted afterward along with their directory; `ls "$SP" | grep -i "qm1"` found nothing left.)

### Self-review

- **Constraint compliance, checked directly, not assumed.** `flash-h40b-sidecar.mjs` and `gemma-answers.mjs` mtimes are both 2026-09-25 (yesterday, from fix round 3) — confirmed via `ls -la --time-style=full-iso` after this follow-up's work, not before, so the check covers everything just done. `flash-h40b-score-cal.mjs` alone shows today's mtime. `flash-h40b/` (the live run dir) was only ever `ls`-listed, never opened for writing; its own files (the sidecar's in-progress `.log`s and `interview60.answers.*.json`s) were visible but not read or touched. No API call: every command this round was `node --check`, a filesystem-copy-and-diff builder script, or a subprocess run of a scorer against a filesystem fixture — none of that path calls a model.
- **The broken copies target the scorer's lookup, not its printed label**, matching the finding precisely: the finding is about the calibration's blind spot for a *data*-attribution bug, not a *label* bug — a label bug (e.g. `TIERS['3'].model`/`TIERS['3b'].model` themselves swapped) would already be caught by case A's existing model-name-specific regexes, so it wouldn't demonstrate the gap Q-m1 is about. Redirecting only the lookup `arm` while leaving the console.log's `model`/`t` untouched isolates the actual blind spot.
- **Residual scope, disclosed rather than fixed.** These two broken-copy shapes (swap; collapse-onto-tier-3) are the ones the ruling described. A third shape — collapse-onto-tier-3b (3.6's verdicts hidden behind 3.5's) — was not built; by symmetry with proof (3) it would fail case D's *first* check instead of its second, and nothing in the existing code suggests asymmetric risk between the two directions, so it was left untested rather than added unrequested.
- **Scope discipline.** Only case D and the header/case-list comment were added; cases A–C's own code is byte-identical to before. `flash-h40b-score-blind.mjs` was read (for the exact `acceptable` line format the new regexes match) but never edited, per the ruling. No other open item from `final-review.md` was addressed — only Q-m1 was in this ruling.
- **No subagent, no commit, no write into MAIN this round** — this follow-up never touched MAIN at all (the fixture and all throwaway copies are scratchpad-only).
- **Budget-exceeds-18 note (re-review's "Budget accounting with the re-ask" section):** the re-review observed that with the cut re-ask, a pass can now cost up to `2 × todo.length`, so real requests per model can exceed 18 by the cut count in the last admitted pass (bounded by the server's 20/day 429). This is **accepted by the ruling** per the re-review's own text and was not one of the 8 items to fix; the original report's "budget can never be exceeded" self-review line is superseded by this — noted here rather than silently left standing.
