ALL ADDRESSED

# Task 8 re-review 3: fix round 3

Reviewer: Opus. Scope: the rulings on R1-R6, whether 5.026 s / 13.608 s reproduce from the h40b copy, whether the new helper matches the smoke launcher's real file names, and anything new. Files as of 20:06-20:19. MAIN HEAD is e94305a.

What I ran, all read-only:
- `h40c-hedge-stats.mjs` on seven existing fixtures (stdout only; no calibration script re-run, no fixture rebuilt).
- `guard-h40c.mjs` against real MAIN in two environments, from a node child with `cwd` = MAIN (stdout only).
- `git status` and `check-ignore`.
- A node float check.

Nothing was started or registered, and no model was called.

## Status of each ruling

- **R1: addressed.**
  - guard-h40c.mjs:232-237 requires `Array.isArray`, equal length, and an element-wise `===` against `['gemini-3.1-flash-lite','gemini-3.5-flash-lite']`. An absent export now prints `ANSWER_MODELS is undefined, not exactly …` and fails.
  - On real MAIN at e94305a with the correct environment: GUARD OK, `ANSWER_MODELS = ["gemini-3.1-flash-lite","gemini-3.5-flash-lite"]`.
  - A wrong commit still fails at 10b.
- **R2: addressed.**
  - `reAnswerFull` and `FAILURE_TEXT_MARKERS` (`'[No answer —'` and the exact IntelligenceEngine.ts:449 text) are at stats:86 and :94.
  - Resolution uses the window's own last `[Answer] full:` line: a failure marker → charged; otherwise not charged; no line → UNRESOLVED → INCOMPLETE (stats:188-206, :237).
  - Pre-registration :121-131 states it. The markers survive `JSON.stringify` (SessionTracker.ts:244).
  - Fixture results:
    - r2-failure: 1 charged, `failures FAIL`;
    - r2-delivered: 0 charged;
    - r2-unresolved: 0 charged, `— INCOMPLETE, cannot read PASS`;
    - synth: `2 = 1 clean + 1 resolved`, 3 windows with both lines (1 failure, 1 delivered, 1 UNRESOLVED).
- **R3: addressed.**
  - Blocking item 1 (pre-registration :204-222) is now an executable recipe.
  - `h40c-smoke-window.mjs` reads `smoke-hedge-default.natively_debug.log`, `smoke-hedge-default.log` and `smoke-hedge-off.log`. These match launch-smoke-hedge.cmd:57-58 and :84.
  - The start instant is the second line of each progress log, written at launcher :79 and :92 as `node -e console.log(new Date().toISOString())` right after the header echo.
  - The diag bracket is [default start, off start). The default segment's app starts after its instant, and it is stopped and copied (:84) before the off instant is written (:92), so the bracket is clean.
  - Diag lines are `[<ISO>] <msg>` (WhatToAnswerLLM.ts:23). The file is `process.cwd()/verbal-diag.log`, append-only.
  - `startDebug` is the byte offset of the first `dispatch: answer` after the startup line (smoke-window:71-74, correct as relative-to-absolute).
  - Wrong segment and no-dispatch cases throw. `isMain` uses `fileURLToPath`.
  - `smoke-turn.mjs` writes only under `interview60.runs/` (:35), and the app's logs are `*.log` at the root (`.gitignore:14`), so the smoke cannot dirty check 10b's paths.
  - One dead branch: N-M2.
- **R4: addressed.** Pre-registration :194-201: MAIN is frozen from the pre-registration's own commit through the end of the hour; blocking-item outputs are never committed; `interview60.runs/` is ignored (`.gitignore:258`, checked). Side effect: N-M1.
- **R5: addressed.**
  - (a) "neither leg has produced a token and either one has errored": :34-36, :116-117, :244-245, matching LLMHelper's `if (f.kind==='error') throw…; if (b.kind==='error') throw…`.
  - (b) VOID (b) wording: :153.
  - (c) no "FAIL on rule 1": :172.
  - (d) "rule 3": :234.
  - (e) no "controller" in the pre-registration (grep: 0).
  - (f) e94305a with its exact subject: :46-47, matching `git log`.
  - (g) exact ceilings, median 6.026 s and p90 13.608 s: :107-112 and stats:55. `5.026 + 1.0 === 6.026` is true in node, so no float edge.
  - (h) the 51e349d / 18242df gloss: :41-45, matching both commit messages.
  - Report-only slip, no effect on the deliverables: the fact-finding note gives the commit list as "e311019, 18242df, 51e349d, da28f25, 6c50ec3, e311019" (e94305a missing, e311019 twice), and quotes 18242df's message as 51e349d's.
- **R6: addressed.**
  - `firstTokenCoverageOk = windowsWithWonBy === 0 || n ≥ 0.9 × windowsWithWonBy` (stats:235).
  - r6-sparse (1 of 3) → INCOMPLETE naming the shortfall; r6-full (3 of 3) → no INCOMPLETE.
  - The h40b copy takes the "nothing to cover" branch.
  - Pre-registration :131-133 states it.
- **Numbers reproduce.** The h40b copy gives `first token n=44 median=5.026s p90=13.608s` and `median<=6.026s … median PASS, p90 PASS, failures PASS`.
- **Launchers: fine.** Both are CRLF (58/0 and 61/0) and ASCII. launch-h40c.cmd:36-40 reflects e94305a having landed.

## New findings

Critical: none.

### Important

**N-I1. INCOMPLETE can mask a rule-2 FAIL that is already decided.**
- **What the pre-registration says:** :129-131 has an UNRESOLVED window make rule 2 report "INCOMPLETE rather than a verdict it has not earned". :155-158 says "(2) INCOMPLETE … not a result to act on either way".
- **What the script does:** it sets `rule2Incomplete` whenever an UNRESOLVED window exists or first-token coverage is below 90% (stats:236-238), whatever the other sub-clauses show.
- **Why it is wrong:**
  - Unresolved windows can only ADD failures. So with ≥ 1 charged failure, rule 2 fails however they resolve.
  - With first-token coverage ≥ 90%, a median or p90 over its ceiling is decided no matter what an unresolved window turns out to be.
- **Evidence:** the synthetic fixture prints `failures FAIL — INCOMPLETE, cannot read PASS` with 2 charged failures. By :155-158 that hour's rule 2 is "not a result to act on either way".
- **Failure scenario:** a slow hour (median 8 s at full coverage), or an hour with a real "Could you repeat that?" failure, that also has one UNRESOLVED window (for example, a window whose own answer line landed after the next dispatch) reads INCOMPLETE instead of FAIL. The hedge escapes its latency verdict. This is the C1 class of problem, triggered rarely.
- **Fix (text and script):**
  - INCOMPLETE only replaces a would-be PASS.
  - Rule 2 FAILs when any sub-clause fails on data that is already decided: charged failures ≥ 1, or median/p90 over the ceiling with first-token coverage ≥ 90%.
  - INCOMPLETE applies only when no sub-clause has failed and one is undecided.
  - Make the script's verdict field three-valued (PASS / FAIL / INCOMPLETE) instead of a separate boolean.

### Minor

**N-M1. The freeze now forces the smoke to run after the pre-registration commit.** :197-199 says both blocking items run "after this pre-registration's own commit exists". Item 2 needs the hash; item 1 (the smoke) does not. If Task 7's smoke runs first, at e94305a, the text forces a second smoke, costing quota and about 15 minutes, or it is technically violated. The app code between e94305a and the pre-registration commit is identical (docs only). The smoke's segment logs record `git rev-parse HEAD` (launch-smoke-hedge.cmd:86). Allow item 1 on any HEAD whose `git diff --stat <smoke HEAD>..<registered HEAD> -- electron src premium package.json` is empty.

**N-M2. The pooled fallback is dead.** When diag lines lack a `[timestamp]` prefix, `h40c-smoke-window.mjs` pools the whole file (:98-102). But the stats script's first-token regex needs that same prefix (`/^\[(\S+)\] first token/`, stats:80), so a pooled folder always yields n=0 and INCOMPLETE; it can never "pool first-token numbers" as the pre-registration's recipe (:218-220) promises. This is harmless, since R6 makes it loud, and real diag lines always carry the prefix (WhatToAnswerLLM.ts:23). Either drop the fallback and throw, or say that pooled means INCOMPLETE. Calibration case 4 checks only the offsets, not what `hedgeStats` makes of them.

**N-M3. Nits.**
- :127 says a window is charged when its text "is itself one of the app's own failure messages". The script checks *contains*, which is right for a partial answer followed by "[No answer — …]". Say "contains".
- launch-h40c-dry.cmd:36-41 still says "the controller fills this in … after the Groq-answer-arm-removal commit and the pre-registration commit both land". That is stale now e94305a has landed, and out of step with the real launcher's :36-40. The file is scratchpad-only; mirror the real launcher's comment.

Counts: all six rulings (R1-R6) are met, and 5.026 / 13.608 reproduce. New: Critical 0, Important 1, Minor 3.
