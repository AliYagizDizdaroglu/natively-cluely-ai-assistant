You are the FINAL whole-change reviewer (Opus) for the Deepgram "boundary repair" in the Natively Electron app. It is five tasks, all implemented and task-reviewed in MAIN's working tree and uncommitted; the controller commits them as one commit after your review. Review the WHOLE change against the REQUEST, not against itself. Hunt for what is MISSING — a state nobody enumerated, a path nobody exercised — as well as what is wrong.

## The request
- The user asked to fix the misses found on flight h40c, then to verify the fixes landed, through tests and probes.
- This change is the R22 fix. On h40c, Deepgram's interim held "How do you cut hallucinations in a rag answer without just making", but its finals were "How do you cut" and "in a rag answer without just making it refuse?". The app dispatched the joined finals without "hallucinations".
- The mechanism was reproduced at the Deepgram seam: a final cuts short of its interim, and the next final resumes after a lost word.
- The fix restores such words from the interim.
- holdout40 (run folders containing "h40") is never used to tune, and fixes target the general mechanism.

## What was built (BR = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\boundary-repair`)
- **Spec:** `BR\DESIGN-v4.md`. **Reference rule:** `BR\rule-v4.mjs`. **Proof:** `BR\check-v4.mjs` and `BR\evidence\check-v4.out.txt`.
- **Plans:** `BR\PLAN.md` (Tasks 1-2, v3) and `BR\PLAN-v4.md` (Tasks 3-5, the v4 deltas).
- **Ledger with every ruling:** `BR\sdd\progress.md`. Read it; the rulings are binding unless you find them wrong.
- **Task reports:** `BR\sdd\task-{1..5}-report.md`. **Reviews:** `BR\sdd\spec-review-v4.md`, plus the task reviews summarized in the ledger.
- **Whole-change package:** `BR\sdd\final-review-package.txt`, the MAIN working tree against HEAD f745d7e. New files are shown in full; modified files as diffs; the fixtures JSON by stat only.
- **Files:**
  - `electron/audio/deepgramBoundaryRepair.ts` + `.test.ts` + `.fixtures.json`: the pure module, rule v4;
  - `electron/audio/DeepgramStreamingSTT.ts` + `DeepgramStreamingSTT.boundaryRepair.test.ts`: the adapter wiring — English gate per `connect()`, `clear()` on an empty FINAL and on UtteranceEnd, `speech_final` passed, the repair log line;
  - `electron/audio/deepgramKeyterms.ts` + `.test.ts`: `isEnglishLanguage` shared with `keytermsFor`;
  - `electron/test/golden/interview60.turns-finals.mjs` + `.test.ts` and `interview60.turns-fixture.mjs`: the extractor replays `<restored> <raw>`.
- MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`, branch fix/coding-style-suffix-all-gemini, HEAD f745d7e.
- Also uncommitted in MAIN, and NOT part of this change: `electron/test/golden/interview60.chains.json`, `interview60.report.md` and `natively_debug.log.1` (the user's), plus untracked probes.

## Since the task reviews
- **Task 4:** approved after fix round 2 (adjacency and reconnect tests; comment-only adapter change).
  - One parked nit: adapter test :230 says "the other way a socket is replaced". It should say "another way": a server close 1000 followed by the next `write()` also reconnects.
- **Task 5:** fix round 1 per `BR\sdd\task-5-fix1.md`:
  - the parity tests skip where the gitignored run folder is absent;
  - `>=` is pinned;
  - the empty final moved to where the app can log it;
  - `finalsFrom` now REFUSES a repair line that is not right under its own final (rule 11). This reverses the plan's T3.
  - It passed a scoped re-review; see the ledger.
- **Fresh live data (DESIGN-v4 §7 item 5).** A seam probe streamed 30 plays of 10 non-holdout clips to Deepgram with the app's options. Files: `BR\seam-probe-v4\events-2026-09-29T20-12-42-248Z.jsonl` and `plan-…`. The recording sits outside `seam-probe\` on purpose: check-v4 globs that folder, and its 25/4/6 are frozen.
  - Rule v4 under the adapter's wiring makes 1 repair, TRUE against the script (L04#1 "upstream"), and no wrong repair.
  - `speech_final` is on 53 of 174 finals, and on 0 of 37 strict cut finals (0 of 38 in seam2).
  - One "head drop" of a different class: L04#3's final dropped its first word "or", which its own interim held. It is not in scope.
  - Evidence: `BR\evidence\seam3-rule-v4.out.txt`, `seam3-detail.out.txt`, `cal-seam-v4.out.txt`.
- **Post-build tools, calibrated:**
  - `guard-br1.mjs post` has v4 checks: `cal-guard-v4.mjs`, 13 cases, each check failing on its own premise.
  - `br1-read.mjs` pairs by time and words: APP-ONLY = defect, REF-ONLY = read by hand (`speech_final` is never logged). `cal-br1-read-v4.mjs`, 5 cases.

## Check
1. **Parked findings.** Task 1's parked Minors (the module header wording, a rule-sim citation), Task 4's nit above, and any other parked item in the ledger: resolved, or still true?
2. **Consumers of the repaired text.** Whatever reads DeepgramStreamingSTT's `transcript` events:
   - the turn machine;
   - the dispatcher and its question text;
   - the reconciler (Live vs Deepgram);
   - session context;
   - RAG / knowledge;
   - the UI.
   Can a restored word break any of them, e.g. `looksFragmentary`, supersede timing, dedup anchors, or the `recentInterviewerSpeech` interims? The earlier spec review found all consumers benign for v3; confirm v4's pauses and English gate change nothing there.
3. **The live path.** Is anything that production relies on unexercised by the tests?
   - A real Deepgram socket.
   - A real `speech_final` payload shape: the SDK's type is `speech_final?: boolean`.
   - The built `dist-electron` output.
   - The single-instance app hour.
   The controller's post-build plan: `check-v4-built.mjs` on the BUILT module (calibrated: rule-v4 EQUIVALENT; shim-v3 and 3 mutants NOT), `guard-br1.mjs post`, and the scheduled app hour br1 read by `br1-read.mjs` (app repairs vs the rule-v4 reference replay, plus whether each restored word reaches a dispatched question). Say what those checks would miss.
4. **Tests as a whole.**
   - Does every behaviour in DESIGN-v4 have a test that fails when it is wrong?
   - Is any test asserting nothing, or duplicating another?
   - Run `TEST electron/audio/` and the golden turns tests from a temp cwd (`Set-Location $env:TEMP; cmd /c "npx --prefix ""<MAIN>"" vitest run --root ""<MAIN>"" <file>"`), and both tsc gates. Electron has exactly 6 baseline errors.
5. **Honesty of comments and docs against the evidence files.** Numbers must trace to files; "25 repaired losses" is a floor; holdout is not evidence.

## Rules
- Read-only on MAIN. No git writes. Never read `.env`. No subagents. No `node -e`.
- Scratch only under `BR\sdd\final-review-scratch\`. Paths there can exceed Windows MAX_PATH for PowerShell cmdlets, so use node.
- Never the full vitest suite.

## Output (reply as text, under ~45 lines)
- **Verdict:** Ready to commit / Ready with fixes / Not ready.
- **Findings:** Critical / Important / Minor, each with file:line, the evidence you ran and a concrete fix.
- What the post-build checks and br1 will NOT exercise.
