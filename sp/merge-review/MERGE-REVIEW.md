# Merge review: cue mode into MAIN

Reviewer: Opus (claude-opus-5-5), 2026-10-01, the night before the 05:00 re-smoke.

**What was reviewed:**
- `merge/cue-mode-prep` = `1852d89`, the merge of `feat/whole-turn-answers` at `8a13abb` into MAIN's `fix/coding-style-suffix-all-gemini` at `fed4b07`.
- The review package `MR\cue-vs-main.diff`.
- The code around the diff, read in the merge worktree. It is clean at `1852d89`.
- The four cue specs, both SDD ledgers, `cue-group\final-review.md`, `cue-group\offers-spec-review.md`, `AGENDA.md` and the runbooks.
- The scheduled tasks, and the state of MAIN's checkout.

**How:** read-only. I ran no vitest, tsc or build, started no app and made no model call. My only runs were six throwaway node scripts that read files: they are in `MR\scratch`, ran at low CPU priority, and each took under 3 s. Their outputs are quoted at the end. Before finishing I re-ran five of them at idle priority; their outputs are saved as `MR\scratch\out-*.txt`.

## Verdict

**READY WITH FIXES.** The merge needs no code change. It can merge once three things are true:
- the 05:00 re-smoke passes;
- the bench passes;
- the live check of I1 has been done: the overlay and typed chat, on the worktree build.

**Counts: Critical 0 · Important 1 · Minor 4.**

**Confirmed before writing:**
- `git diff 8a13abb 1852d89` outside `passes/` is empty.
- MAIN gained four docs-only commits since `0ef42a0`.
- `1852d89`'s parents are `fed4b07` and `8a13abb`.

## What rides along

A fast-forward to `1852d89` brings 44 commits: 42 ordinary commits, one merge inside the branch, and the prep merge itself. The net change is:
- 35 files outside `passes/` (+1884 −94);
- 8 new files under `passes/` (+1227).

`INDEX.md` does not change.

Besides cue mode, one behaviour change comes with it: `interview60.run.mjs` and `interview60.answers.mjs` read `GEMINI_API_KEY` from the environment first (`fd57512`, `resolveEnvKey`). This changes nothing on MAIN today. I checked variable names only, never values: no `GEMINI*` or `GROQ*` variable exists in the User, Machine or Process scope, so both scripts still read `.env`.

MAIN's checkout has three modified files: `interview60.chains.json`, `interview60.report.md` and `natively_debug.log.1`. The merge touches none of them, and none of the 18 paths it adds exists untracked in MAIN. The fast-forward's checkout is therefore mechanically clean.

---

## Before the merge, in order

1. **The user's two gates.**
   - The 05:00 re-smoke passes `PREREGISTER-cuesmoke.md`, with the `8a13abb` amendment.
   - The bench passes `PREREGISTER-cuebench.md`.
2. **Read the simple-question probe first,** even though it does not gate.
   - It is the only instrument that asks one-word questions.
   - A block-only answer there loses its cues and shows "Could you repeat that?". The cues ride a prose token that never comes (`IntelligenceEngine.ts:456-472`).
   - Saved replies on the shipped wording show 0 such answers once the offers fix is in. A non-zero count on 3.5-lite HIGH is a reason to hold.
3. **I1: the one live look.** On the worktree build:
   - the overlay's cue block;
   - the typed check of spec §3.5.6.
4. **The follow-up replay (M4).**
   - Run it, or at least its §6.2 calibration, before MAIN's dist is rebuilt.
   - Settle its §8 day rule against Thursday's bench before its first call.
5. **Refresh the prep merge if either side moved.**
   - Any commit on the cue branch after `8a13abb` makes `1852d89` stale. Examples: the 05:00 result note and pass record, the bench and probe records, the typed-check readings.
   - So does any commit on MAIN after `fed4b07`. Examples: the replay's or ET38's records.
   - Redo the merge. Re-check that `git diff --stat <cue head> <new merge> -- . ':!electron/test/golden/passes'` is empty and that MAIN's tip is a parent.
6. **Freeze MAIN.**
   - Nothing lands on MAIN between that re-check and the fast-forward (spec 09-30 §3.5.7).
   - No peer session is editing MAIN's shared tree (memory: tooling_commit_shared_index, tooling_build_captures_concurrent_edits).
7. **Write down the rollback.**
   - While nothing else has landed: move MAIN's branch back to `fed4b07` and rebuild.
   - After that: `git revert -m 1 <merge>`.
   - Cue mode has no runtime switch, by design (spec 09-20 §3 item 6).

## Right after the merge (MAIN)

1. **Fast-forward with a real checkout.** Use `git merge --ff-only` in MAIN, not `update-ref` alone: the working tree must hold the new sources.
2. **Rebuild the dist at once,** before any harness script runs (M1): `npm run build:electron`. Then prove it against MAIN, the runbook's command with MAIN as the root: `node SP\dist-proof.mjs --root <MAIN> --expect combined --prefix-count 3 --offers-marker "offers block before the spoken answer"` → `DIST PROOF: THE COMBINED BUILD, every marker as expected` (`RUNBOOK-resmoke2.md:45-48`). It should show:
   - `CUE_LINE_PREFIX` ×3;
   - the offers warn text ×1;
   - the `CUE_RULE` hash `8e15e4e7dd41`;
   - limits 3 × 5;
   - `VERBAL_TYPED_PROMPT` in `ipcHandlers.js`, and no `VERBAL_WHAT_TO_ANSWER_PROMPT` there.

   `verbalStreamFilter.js` should hash to `42d9bc42dbd1`, the worktree build of the same code: the built JS embeds no absolute path. A different esbuild could change the hash; the markers then decide.
3. **The gates in MAIN:** the full suite, then both tsc runs. Expected: electron 6 (the same six), root 0.
   - MAIN holds run folders the worktree lacks: `2026-09-02-before`, `2026-09-09T15-00-55-s50a` and `2026-09-08T08-44-56-after9`.
   - So the metrics test on `2026-09-02-before` (`interview60.metrics.test.ts:21-59`) runs on the cue code for the first time here. The same holds for `interview60.pass-record.test.ts:239-250` on s50a, when its cwd-relative path (`:14`) resolves.
   - These should pass:
     - The merge's metrics diff only adds: the cue computation, one field and one gate row (13 → 14).
     - The metrics test pins `computeRun`'s other numbers and checks failed rows with `toContain` (`:56-58`).
     - The pass-record test asks for at least 10 rows (`:250`).
     - I ran MAIN's four latest real runs through both metrics modules (below): every old gate row is identical.
   - This is my prediction, not an observation.
4. **The chains wrap's first execution** (spec §3.5.7, R5). One `interview60.chains.mjs` run with the store moved aside, if Thursday's quota allows. Read the stored answers for `__CUES__`.
5. **INDEX rows** (the user's pass-records rule).
   - `passes/2026-09-30T02-38-22-cuesmoke.md` and `…T13-46-52-cuesmoke.md` land with no INDEX row, and Thursday's run will add a third.
   - `indexRows()` reads only the checkout's own `interview60.runs` (`interview60.pass-record.mjs:257-262`), and those run folders live in the worktree.
   - Copy them into MAIN's runs folder, then run `--index` in MAIN, as spec §3.5.5 and §3.5.7 already say.
6. **Friday's pre-registration and launcher must carry:**
   - The two knowledge short-circuits (intro, negotiation card). Each logs `[Answer] cues: []` and fails the cue row. This is final review M2; I reproduced it (chain-diff below).
   - `first token` = the first prose chunk after the block.
   - The 3.5-lite budget. A cue hour now runs 8 arms on 3.5-lite (up to about 360 calls on holdout40) plus the hour's own front-leg calls, against 500 a day. The three `captured-no-cues-high` twins run on every MAIN flight from now on, not only Friday's. `interview60.flight.mjs:155` still says "~155 lite calls", and the user's opt-in decision for replay arms is not built yet.
   - A check that `hasCueRule()` reads true on the 05:00 run's `interview60.prompts.json`, which the probe needs built anyway. The twins' gate has only ever seen synthetic prompts. A false reading would skip Friday's control arms with one log line.
   - A launcher guard on the cue build's markers in MAIN's dist.
7. **Memory and docs.**
   - MEMORY.md's cue line and `project_cue_mode_next.md` ("NO merge to MAIN before that").
   - `project_typecheck_gate.md`: the two `ipcHandlers.ts` errors move three lines down, because the merge adds three lines at 544-547.
     - The memory's 3430/3433 already predate `fed4b07`, where the dialog lines read 3433/3436.
     - Expect 3436/3439 after the merge. This is by reading, not a tsc run.
   - `project_ipc_routing.md`: the typed path now sends `VERBAL_TYPED_PROMPT`.
   - `AGENDA.md`.
   - The specs (M3).

---

## Findings

### Important

**I1. The overlay's cue block and typed chat have never run live, and no test crosses from the engine to the screen.**

- **Where:**
  - `electron/main.ts:2424-2430`: the token event carries `cues` only when it is set.
  - `electron/preload.ts:780`: a type change only; `data` passes through.
  - `src/components/NativelyInterface.tsx:862`: `data.cues` goes into `applyAnswerToken`.
  - `NativelyInterface.tsx:2623-2625`: `CueBlock` renders above `renderMessageText`.
  - `src/components/CueBlock.tsx:14-25`.
  - Typed chat: `electron/ipcHandlers.ts:547, 560, 577`.
- **What:** every automated check stops short of the screen.
  - `IntelligenceEngine.cues.test.ts` ends at the engine's emit.
  - `answerMessages.test.ts` and `CueBlock.test.tsx` test pure pieces.
  - No test imports `main.ts`, and `NativelyInterface` has no test.
  - The smoke check, the metrics row and the bench read `natively_debug.log` or offline text. That log is written before the IPC send.
  - The typed path's proof is a source-text pin plus a build marker.
- **Evidence:**
  - `passes/2026-09-30-cuesmoke-v2-result.md`: "What this run did not show: … The overlay itself, and typed chat."
  - `PREREGISTER-cuesmoke.md` lists both under "What this run cannot show". The overlay line is "The user looks at it once during the run", and the 05:00 run is unattended.
  - Spec 09-30 §3.5.6 makes the typed check a merge gate ("a `__CUES__` or a `1|` line in either bubble stops Thursday's merge"). It has not run.
- **Why it matters:** the overlay is the one thing cue mode exists to change.
  - A break anywhere between `main.ts` and `CueBlock` passes every test, both smokes and the bench: the field dropped, a wrong render condition, a style that hides the block.
  - Global rule 7: a first integration earns one live exercise across the seams the tests mock.
  - I read these lines and found nothing wrong. That is why a look should confirm it, not a reason to skip the look.
- **Fix (no code):** one attended session before the fast-forward, on the worktree build. The user starts it with `npm start` in the worktree, with MAIN's app closed. It is never started from a Claude session, which reads a shadow AppData (memory project_claude_sandbox_appdata; spec §3.5.6).
  - (a) One hands-free or "What should I say" answer. Numbered cues sit above the answer. The first words appear with them and the rest streams. The bar shows a first-token time a few tenths of a second under the total (`RUNBOOK-resmoke2.md` §9 item 5).
  - (b) If convenient, one supersede. The bubble's cues are replaced, not kept.
  - (c) The two typed questions of §3.5.6, Context ON and OFF. Neither bubble may show a `__CUES__` line or a `1|` line. A `__MORE__` list may still show: that is the known typed defect from before this branch.
  - Write what was seen into the result note.

### Minor

**M1. Until MAIN's dist is rebuilt, the merged harness fails late and spends quota.**

- **Where:**
  - `interview60.answers.mjs:34`, `:188`, `:261`, and its retry loop `:316-327`;
  - `interview60.chains.mjs:28`, `:89`;
  - `golden/run.mjs:172`, `:207`.
- **What:**
  - The three scripts destructure `stripCueBlock` from the built filter and call it after the API call.
  - MAIN's current dist has no such export. `stale-dist.cjs` prints: `typeof stripCueBlock in MAIN dist: undefined`, and a call throws `TypeError - F.stripCueBlock is not a function`.
  - `answers.mjs` catches the TypeError, then retries: up to 4 real calls per item, with each item recorded as TRANSIENT.
  - `chains.mjs` crashes after its first call. `run.mjs` records an error per question.
  - `P.CUE_RULE` is `undefined` too, so `carriesCueRule` reads false.
- **Why it's minor:**
  - A flight is safe: `auto` runs `npm run build:electron` before the arms (`interview60.run.mjs:545`).
  - `npm start` builds too.
  - Only a hand-run script between the fast-forward and the build is exposed.
- **Fix:**
  - Rebuild in the same step as the fast-forward (checklist).
  - Optionally, following rule 11, one guard per script: `if (typeof stripCueBlock !== 'function') { console.error('dist-electron predates cue mode: npm run build:electron'); process.exit(2); }`.

**M2. The engine tests leave three reachable states unpinned.**

- **Where:** `electron/IntelligenceEngine.cues.test.ts`. None of its 8 cases:
  - uses `replaceAnswer`;
  - streams a block with no prose;
  - supersedes a generation after its cues were reported.
- **What:**
  - (a) A replacing stream's first emitted token carries both `replace` and the cues. Both are consumed on the same emit (`IntelligenceEngine.ts:430, 448-460`), true by construction but unpinned.
  - (b) A block-only stream logs its cues and never sends them; the substitute shows (`:470-472`). This is the parked P2b (`cue-group\final-review.md:57`), but today's behaviour is not pinned, so a change to it would not be deliberate.
  - (c) An aborted generation discards its pending cues (`:433-439`).
- **Fix:** three small cases with the existing stub (`stubStream(cues, tokens)`), when the engine is next touched. They are not needed before the merge.

**M3. The cue specs and plans exist only in the whole-turn worktree, yet the merged code cites them 47 times.**

- **Where:**
  - `.gitignore:206` ignores `docs/superpowers/`.
  - `git grep -E "spec 2026-09-(20|30)" 1852d89 -- electron src` finds 47 lines.
- **What:**
  - Four specs are untracked: `2026-09-20-cue-mode-design.md`, `2026-09-30-cue-mode-small-cues.md`, `2026-09-30-cue-early-close.md` and `2026-09-30-offers-before-answer.md`. Their plans are untracked too.
  - They sit in `.claude\worktrees\whole-turn\docs\superpowers\` only. MAIN's checkout has none of them. The hedge proposal, by contrast, sits there untracked.
- **Why:** once that worktree is cleaned up, every "spec 2026-09-30 §3.6" in MAIN points nowhere. The pre-registrations and results in `passes/` do not contain the design.
- **Fix:** before any worktree cleanup, copy the specs and plans into MAIN's `docs/superpowers/`, or track them with `git add -f`. The specs up to 2026-09-07 are tracked despite `.gitignore:206`.

**M4. A MAIN guard this merge trips: the follow-up replay's instrument, and its day rule against Thursday's bench.**

- **Where:**
  - `passes/PREREGISTER-followup-questions.md:180-186` (§6 item 2);
  - the same file's §8: the day rule at `:239-241`, the sequencing at `:244-245`;
  - `SP\followup-questions\RUNBOOK.md:5, 9, 17-18`;
  - `SP\AGENDA.md:259, 332`;
  - `SP\cue-group\RUNBOOK-resmoke2.md:133`.
- **What:**
  - The replay's runbook records MAIN's built filter as sha256/12 `d8fee6ca0170`, and precondition 2 says: "if the filter sha is no longer d8fee6ca0170, say why before calling".
  - Measured now, MAIN's `dist-electron/electron/llm/verbalStreamFilter.js` is still `d8fee6ca0170` (written 30 Sep 07:48). The post-merge rebuild makes it `42d9bc42dbd1`, and so does any `npm start` in MAIN.
  - The §6.2 calibration itself should survive the merge. It rebuilds only the user turn, with `transcriptCleaner`, `followUpParent` and `lastInterviewerTurn` (`followup-replay-build.mjs:25-27`), and the merge does not touch any of them. What changes under the run is the filter's leading-offers branch, which fires rarely without a cue rule (0 of 308 no-cue app answers).
  - Separately, §8 allows the replay only "on a day with NO flight and NO cue bench". When it was written, the bench was due on 30 Sep. It moved to Thursday after the v2 re-smoke, and the agenda now runs both that day (`AGENDA.md:332`). `RUNBOOK-resmoke2.md` §10 makes the replay a precondition of the merge.
- **Why:** a pre-registered MAIN experiment would run with a changed instrument or on a forbidden day, or the merge waits on it past Friday.
- **Fix:**
  - Run the replay before MAIN's rebuild, or record the sha change's reason as its step says.
  - Settle §8 before the replay's first call: a dated amendment (for example "the bench shares Thursday; ledger headroom checked"), or move the replay.

---

## The brief's eight areas

### 1. The hands-free verbal path: no regression found in code

- **The prompt.**
  - `VERBAL_WHAT_TO_ANSWER_PROMPT = VERBAL_TYPED_PROMPT + CUE_RULE` (`prompts.ts:2444`).
  - Built dist against built dist (`prompts-compare.cjs`):
    - the only existing export that changed is `VERBAL_WHAT_TO_ANSWER_PROMPT`, 12,784 → 13,756 characters;
    - the six additions are the cue constants and `VERBAL_TYPED_PROMPT`;
    - the `CUE_RULE` hash is `8e15e4e7dd41`, the pre-registered one;
    - no other export embeds the verbal prompt.
  - Context ON keeps the rule: `keepVerbalPrompt` keeps the caller's prompt when it contains `SPOKEN_LENGTH_AND_DEPTH`, and the rule follows that text (`knowledgePromptBudget.ts:24, 33`).
  - The style suffix is empty for the verbal prompt (`prompts.ts:384-388`), and Gemma passes the prompt through.
- **Filter order** (`WhatToAnswerLLM.ts:387-393`):
  - `stripModelSentinel` → `stripCueBlock` → fences → lines → offers → notation, then the stall switch, the fallback, the word budget and `tapFirstToken`.
  - Every head sentinel is its own chunk: `LLMHelper.ts:3185`, `3226`, `3432` and `3499` each yield it before the first content. So the block is at the head when `stripCueBlock` sees it.
- **No-cue answers are unchanged.** `chain-diff.cjs`:
  - 8,000 streams of answer-first replies with no cue block, through MAIN's built chain and the cue build's: 0 differ in the shown text or the offers;
  - the cue build reported exactly one `[]` each time;
  - the calibration run shows the comparison can fail: the cue-head and offers-first shapes differ, as designed.
- **Cap and log:**
  - `trimCues` runs at the display boundary; the trimmed line is logged first, then the cues line (`IntelligenceEngine.ts:417-423`).
  - Eight engine cases cover it.
- **Word budget:** it counts prose only, because the strip is innermost.
- **Offers:** they never reach the hands-free UI: the engine passes `onSuggestions` as undefined (`:424`).
- **Hedge, pre-token fallback and once-guards:**
  - The once-guards are at `WhatToAnswerLLM.ts:371-386`.
  - Tests A–E and D2–D4 run the real `LLMHelper`, with only the SDK stubbed.
  - The engine skips sentinel-only chunks before it reads `pendingCues` (`IntelligenceEngine.ts:443-455`).
- **First-token timing:**
  - `tapFirstToken` skips sentinel chunks (`streamTaps.ts`), so `first token` is the first prose chunk after the block. That cost is by design and is measured by the re-smoke's timing band.
  - The hedge trigger and the stall race time the raw first token (`LLMHelper.ts:3386-3542`), which cues do not move.

### 2. The typed chat path: nothing cue-related can reach a typed answer

- The built `VERBAL_TYPED_PROMPT` equals MAIN's built `VERBAL_WHAT_TO_ANSWER_PROMPT` byte for byte (`prompts-compare.cjs`: `true`).
- Both verbal branches and the one call send it (`ipcHandlers.ts:547, 560, 577`). The other branch goes to `streamChat` with no verbal prompt (`:598`).
- Hands-free history is prose (`fullAnswer`), and cues never enter `text`, so no cue text can reach the typed prompt.
- **The raw `__MORE__` list: this merge does not make it worse.**
  - The prompt bytes are the same, and so is the handler's token loop.
  - The new offers code is not on the typed path.
  - Its later fix must change the typed pin's call line on purpose (`ipcHandlers.typedPrompt.test.ts:28-35`), as the agenda already notes.

### 3. Every other route: unchanged, or cues shown as intended

- **Coding:** no chain and no cue callback (`WhatToAnswerLLM.ts:277-294`). Screen-reference hands-free answers take this route (`main.ts:2185-2194`).
- **Knowledge short-circuits:**
  - The intro and the negotiation card pass through the new chain byte-identical at chunk sizes 1, 5 and 1000, with cues `[]` reported once (`chain-diff.cjs`).
  - They log `cues: []`. That is ruled "no code", and it belongs in Friday's pre-registration.
- **Negotiation card:** the renderer clears cues on both of its paths (`NativelyInterface.tsx:845, 900`).
- **Screenshot answers:**
  - With a coding intent they take the coding route, with no cues.
  - With a verbal intent they take the verbal route and show cues. That route already drops images, which predates this branch (`WhatToAnswerLLM.ts:320`).
- **Others:** manual answer, refine, recap, clarify, code hint and brainstorm keep their own prompts, with no rule. "What should I say", chip clicks and Answer-now go through `runWhatShouldISay` and show cues, as intended.

### 4. The renderer: correct by reading, never seen (I1)

- **Correct by reading:**
  - a new answer;
  - an absent or empty block;
  - a supersede with or without a block;
  - an error after the first words (the cues stay with the answer that made them);
  - a coaching card.
  - Hands-free answers always get their own bubble, because `main.ts:2164` broadcasts the question bubble first.
- **Parked, by ruling:**
  - Final review M1: an empty cue draws a bare numeral.
  - Final review M3: a manual answer into a still-streaming bubble, or a block-only replacement, keeps the old cues.
  - Both need rare combinations.

### 5. The golden harness: MAIN's flights, pass records and graders keep working

- **Gate:** `gate-compare.mjs` ran MAIN's metrics module and the merged one on four real MAIN runs: `before`, h40a, h40c and br1.
  - Every old row is identical.
  - One new row, "Cue block above every spoken answer", reads "not logged / FAIL" on each.
  - The overall verdict was already FAIL on all four.
- **INDEX rows** carry no gate data (`pass-record.mjs:231-240`). A regenerated old record gains one FAIL row.
- **Graders** see prose only: the judge reads `[Answer] full:` and the arms' `spoken`, and both are block-free.
- **answers.mjs:** cue checks apply only where the sent prompt carries the rule (`answers.mjs:337-339`).
- **The flight** adds three arms, gated by `hasCueRule`, which fails closed. That is cost, not breakage; see the checklist.
- **Needs the rebuilt dist (M1):** `chains.mjs`, `run.mjs` and `answers.mjs`.

### 6. Tests

- **Order and time dependence:** none found.
  - The hedge tests use real timers, but the stubbed legs resolve in microtasks, so the 5 s trigger never fires.
  - Case B uses fake timers, restored in `afterEach`.
  - The environment is saved and restored, and the spies are restored in `afterEach` or `finally`.
  - The `CueBlock` cases do not depend on each other.
- **Gaps that matter:** I1 (the seam) and M2 (three engine states).
- **Counts:** I rely on the controller's recorded runs at `d83fdfe`: 1071 passed, 8 skipped, and tsc 6/0.
  - `d83fdfe` to `8a13abb` is docs only, and `1852d89` equals `8a13abb` outside `passes/`.
  - No test reads the `passes/` folder, so the union of both sides' records cannot change a test.

### 7. What MAIN needs

Covered by the two checklists above. The only armed task besides the worktree's 05:00 smoke is `Natively-probe-live38`, a standalone health probe in the l20 folder that is independent of MAIN's dist. No MAIN launcher is armed.

### 8. The accepted edges

**None hides a larger failure.**

`edge-shapes.cjs` (synthetic text through the cue build's chain; output in `out-edge-shapes.cjs.txt`) shows the parser recognises a block only when the bare sentinel opens the reply.

These six shapes report no cues (`[]`) and show the block's lines as answer text:
- a preamble line before the sentinel (all of it shows, `__CUES__` included);
- the offers block before the cue block (`__CUES__` and the cue line show; the offers are taken);
- a bold sentinel (it shows as a bare `__CUES__` line);
- `__CUES__:` (a stray `:` line, then the cue line);
- a bare `1|` line (`1|` and the next cue line show);
- dot-numbered cues (the numeral is stripped and the cue shows as a line).

Two shapes differ:
- **The known closing second `__CUES__` line:** its cues are reported and only that line shows.
- **A block with no prose:** it reports its cues and shows nothing, so the engine shows the substitute (checklist item 2).

How often:
- The saved-reply scans through the built chain record one visible leak in 624 replies: that closing `__CUES__` (offers spec §7 item 4).
- I did not re-scan those replies for the six shapes, because the rules keep me off model text.
- On Thursday, two instruments would show a higher rate:
  - the bench's `cues_clean` flags any sentinel left in the prose;
  - a shape that loses its cues lowers the cue rate (the bench's `cues_present`, the flight's cue row).

The other edges:
- **An offer-shaped line after the answer began:** one stray `N| label` line in the bubble and one offer fewer. Offers are never shown hands-free. 0 of 624 (offers spec §7 item 3).
- **A stray prose line inside a leading offers block:** it becomes the answer's first line and shows (offers spec §2.3 rows 5-7, 9). Before the fix, the whole answer after a leading block was lost.
- Related: an offers block after prose that the line filter dropped now shows the text that follows it (calibration run), where MAIN showed nothing. That is also an improvement.
- **D3:** the dead stream's cues sit over the redirect's prose. Its tail: if the redirect also fails before its first token, those cues sit above the `[No answer — both … failed]` line. The catch yields that line outside the chain (`WhatToAnswerLLM.ts:447-449`), and the engine attaches pending cues to whatever token comes first (`IntelligenceEngine.ts:456-460`). It is cosmetic and needs two failures at the block boundary.

---

## What I ran

All six are in `MR\scratch`. They read files only, made no network call, and wrote nothing outside that folder. The re-run outputs are saved there as `out-<script>.txt`.

- **`prompts-compare.cjs`** (MAIN dist against the whole-turn dist):
  - `typed (new) === verbal (old): true`
  - `verbal (new) === typed + CUE_RULE: true`
  - `CUE_RULE sha256/12 8e15e4e7dd41`
  - exports changed: only `VERBAL_WHAT_TO_ANSWER_PROMPT`, 12784 → 13756.
- **`chain-diff.cjs`:**
  - `no-cue, answer-first replies: 8000 streams, 0 differ from MAIN's chain; cue reports != exactly one [] : 0`
  - card and intro: `same cues=[] reports=1` at 1, 5 and 1000.
  - **`chain-diff-calibrate.cjs`:** the plain answer reads `same`; the cue head, offers-first and dropped-prose shapes read `DIFF`; the second `__CUES__` shows.
- **`gate-compare.mjs`:** on all four runs, `rows 13 -> 14`, one `NEW ROW Cue block above every spoken answer: FAIL not logged`, and nothing changed.
- **`edge-shapes.cjs`:** the shapes in item 8. For the shipped shape it gives `cues=["Spaces"]` and the prose alone.
- **`stale-dist.cjs`:** `stripCueBlock` and `CUE_RULE` are `undefined` in MAIN's dist, and the call throws a TypeError.

## Seen in passing (not counted)

- **Two untracked MAIN probes from 11 Sep,** `zai.probe.mjs` and `openrouter.probe.mjs`. They read `VERBAL_WHAT_TO_ANSWER_PROMPT` from the dist and do not strip the block, so a re-run after the rebuild shows raw cue blocks.
- **`golden/run.mjs`** re-scores cached rows from `results.json` (25 Aug). After the merge its summary counts them as failing the four cue checks. It is report-only.
- **`src/components/NativelyInterface.tsx.orig`** is tracked on MAIN already. It is unrelated.
- **The `resolveEnvKey` tests** leave temporary folders in `%TEMP%`.

## What I did not check

- **Nothing was run as a test:**
  - no vitest, tsc, build, app, overlay or typed chat;
  - the MAIN-side test prediction in "Right after the merge" item 3 is by reading and computation, not a run.
- **Nothing was read that the rules forbid:**
  - no model answer text;
  - no `interview60.prompts.json`, `verbal-prompts.log`, spike, probe or repro file;
  - no `.env` or keys.
- **No quality or grading judgement.** That is the bench's job.
- **Cue compliance on selections other than the Gemini lites** is unmeasured: Gemma, Ollama, OpenAI, Claude, Groq and custom providers. On those, any unrecognised block shape shows raw, per item 8.
- **The earlier reviews' large fuzz runs** were not re-derived. My differential covers no-cue replies only.
- **Friday's pre-registration and launcher** do not exist yet.
- **Nothing visual:**
  - long-cue wrapping;
  - theme contrast;
  - the copy button's overlap with `pr-7`.
- **No quota ledger** for Thursday or Friday.
- **`premium/`** and packaged builds.
