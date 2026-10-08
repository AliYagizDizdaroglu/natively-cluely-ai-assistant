# Plan: h40c — post-h40b fixes and the verbal hedge (2026-09-26)

**Goal.** Land, behind two default-off env flags, (a) the follow-up parent restore and (b) the verbal hedge (3.5-lite HIGH front, 3.1-lite LOW raced in at 5 s, first token wins, loser aborted); fix the two flight instruments (paraphrase attribution; blind pairs without the parent); validate the follow-up fix offline on scenario50 captured prompts under a pre-registered rule; prepare flight h40c (hedge ON, follow-up OFF) with a pre-registration, launcher, guard and a ready-but-unrun registration; verify no regressions; report.

**Architecture.** Electron main process, TypeScript under `electron/`. Verbal answers: `IntelligenceEngine.runWhatShouldISay` → `prepareTranscriptForWhatToAnswer` + `pinSettledQuestion` → `WhatToAnswerLLM.generateStream` (head `__model_source__` sentinel, filter chain, `nameStallSwitch`, `withVerbalFallback`) → `LLMHelper.streamGeminiWithStallFallback` → `streamWithGeminiModel(…, stop)`. Flight harness in `electron/test/golden/*.mjs` (judge, metrics, prompts capture, answers passes). Two new pure modules carry the flags: `electron/llm/followUpParent.ts`, `electron/llm/verbalHedge.ts`.

**Tech stack.** Node 20 / Electron 33, `@google/genai` 1.44, vitest 2.1.9 (fake timers), esbuild transpile build (`scripts/build-electron.js`), PowerShell 5.1 launchers via Windows Task Scheduler, Opus grading agents with the frozen `interview60.grader-prompt.md`.

**Spec.** `docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md` (policy = `electron/test/golden/hedge-live.policy.mjs` `runHedge`, probed PROCEED in `passes/2026-09-25-hedge-probe-result.md`); the h40b findings in `passes/2026-09-26-h40b-result.md`; the brief `SP\sdd\plan-h40c-brief.md`.

**Paths.** `MAIN = C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (branch `fix/coding-style-suffix-all-gemini`, HEAD 07a0e5e). `SP = C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`. In PowerShell resolve MAIN as `$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path`.

## Global constraints (every task)

- Rule-8 calibration for every check that decides something: run it on a known case, and prove it can fail (break the code, watch the test fail).
- TDD: failing test first, watched failing, for every code change.
- Tests: run MAIN's vitest from a temp cwd with `--root <MAIN>` (cwd-relative writes must not land in MAIN); timed-out tests can corrupt the next (serial queue exists, a63dc09). No `npx`; from PowerShell use `cmd /c "npm run ..."`. Two type-check gates: root `tsc` and `tsc -p electron/tsconfig.json`. The latter has 6 pre-existing errors (record them in Task 0; require "no NEW errors"): `electron/audio/GeminiLiveRouter.ts(125,44) TS2339 'length' on never`; `electron/ipcHandlers.ts(~3433,18) TS2339 'canceled' on string[]`; `electron/ipcHandlers.ts(~3433,38) TS2339 'filePaths'`; `electron/ipcHandlers.ts(~3436,31) TS2339 'filePaths'`; `electron/knowledge/KnowledgeOrchestrator.ts(349,35) TS2322 CompanyDossier→null`; `electron/knowledge/KnowledgeOrchestrator.ts(351,25) TS2322`. Compare by file+code+message, not line numbers (scratchpad `hc-tsc.mjs` shows the normalisation). Build: `cmd /c "npm run build:electron -- --force"` from MAIN; verify a marker per change in `dist-electron` with a timestamp (builds capture concurrent edits: check ListAgents and `.ts` mtimes before and after the build).
- Never start the Electron app from a Claude session (it reads a shadow credentials store); a live app exercise goes through a Windows scheduled task (`SP\register-natively-task.ps1` shape; the h40b task's settings: 5 h limit, AllowStartIfOnBatteries, DontStopIfGoingOnBatteries, WakeToRun) or is handed to the user. Stop the app only via `node electron/test/golden/interview60.run.mjs app:stop`.
- Keys live in `.env`/shell only; never print, read or copy key values; never read or edit `credentials.enc`.
- Commits are made by the CONTROLLER only, via `SP\commit-main-paths.ps1` (private index + compare-and-swap); implementers never run `git commit/add/stash`. Read-only `git -C <MAIN> status --porcelain` / `git diff` are allowed. Never stage the user's uncommitted files: `natively_debug.log.1`, `electron/test/golden/interview60.chains.json`, `electron/test/golden/interview60.report.md`, `resume_prompt.txt`, `retry_claude_print.bat`, `electron/test/golden/openrouter-probes/`, `openrouter.probe.mjs`, `zai-probes/`, `zai.probe.mjs`. Never `git stash`, `git add -A/-u`, push. New repo files are written with LF line endings (the commit script refuses CR).
- Committed pass records are never hand-edited or regenerated for old runs; the attribution fix is proven on COPIES of the h40a/h40b run folders in the scratchpad.
- holdout40 is NEVER used to tune or validate the follow-up fix.
- Gemini quota: lite models 500 requests/model/day, reset 10:00 local (07:00 UTC). Every live call is budgeted below; the replay must fit ~120 requests on 3.1-lite; if the ledger says it does not fit, the task says so and schedules after 10:00 tomorrow. Full Flash models (20/day) are not used.
- Throwaway scripts live in the scratchpad; `.cmd`/`.ps1` files are ASCII-only; paths contain the non-ASCII "Masaüstü" (PowerShell: resolve MAIN with the `.git`-filtered `Masa*` wildcard; use `-LiteralPath`).
- Surgical changes; no refactors; match existing style (comments explain the measured reason, as the neighbours do).
- Flags default OFF: `NATIVELY_FOLLOWUP_PARENT` and `NATIVELY_VERBAL_HEDGE`. Accepted values: `1` = on; unset/empty/`0` = off; anything else throws at the call (a typo must not fly silently OFF). h40c flies hedge ON, follow-up OFF.

**Standard commands** (PowerShell; `$SP`, `$repo` as above):

```powershell
# one test file (from a temp cwd)
New-Item -ItemType Directory -Force "$SP\vitest-cwd" | Out-Null; Push-Location "$SP\vitest-cwd"
& node "$repo\node_modules\vitest\vitest.mjs" run --root "$repo" --config "$repo\vitest.config.ts" electron/llm/followUpParent.test.ts
Pop-Location
# full suite (same cwd; record the counts line "Tests  N passed | M skipped (T)")
# tsc gates (absolute -p; no cwd dependence)
& node "$repo\node_modules\typescript\bin\tsc" -p "$repo\tsconfig.json" --noEmit --pretty false
& node "$repo\node_modules\typescript\bin\tsc" -p "$repo\electron\tsconfig.json" --noEmit --pretty false
# build
Push-Location $repo; cmd /c "npm run build:electron -- --force"; Pop-Location
```

Task dependency map: T0 → {T1 → T2}, T3, T4 are independent of each other (T1, T3, T4 touch disjoint files; T2 needs T1's export). T5 after T1–T4. T6 needs T3 + T5's build. T7 needs T4 + T5's build. T8 needs T4 (guard markers); its pre-registration text can be drafted any time. T9 last.

---


---

## Task 1 — Attribute a paraphrase-anchored answer by its dispatched `question=` (independent)

**Files:** `electron/test/golden/interview60.judge.mjs` (pairAnswers regex + overlap; export `questionForGrader`), `electron/test/golden/interview60.metrics.mjs` (claimOf score), `electron/test/golden/interview60.judge.test.ts`, `electron/test/golden/interview60.metrics.test.ts`, scratchpad `SP\attrib-check.mjs`.

**Interfaces:** `pairAnswers(debugLog, timeline)` unchanged signature; dispatch records gain `question: string | null`. `export function questionForGrader(item, items)` (was module-local). `computeRunFromFiles` unchanged.

- [ ] **Failing test first (judge).** Append to the `describe('pairAnswers')` block in `interview60.judge.test.ts`:

```ts
    it('claims an answer anchored on a Live paraphrase by the question= it dispatched (h40b R07F: the anchor is the paraphrase\'s first 80 chars and shares no content word with the played text)', () => {
        const at = (iso: string) => Date.parse(iso);
        const tl = { ...timeline, items: [
            { id: 'R07', kind: 'spoken', level: 'verbal', topic: 'queues', q: 'Two workers pick up the same job from a queue. How do you stop that happening?', playedAt: at('2026-09-04T08:00:00.000Z'), clipSecs: 6 },
            { id: 'R07F', kind: 'spoken', level: 'followup', topic: 'queues', chain: 'R07', q: 'And if the worker that claimed it crashes halfway?', playedAt: at('2026-09-04T08:01:30.000Z'), clipSecs: 3 },
        ] };
        const log = [
            '2026-09-04T08:01:40.000Z [LOG] [Main] dispatch: answer source=live anchor="In the scenario where two workers are picking up jobs from a queue, what happens" verdict=paraphrase question="In the scenario where two workers are picking up jobs from a queue, what happens if the worker that claimed a job crashes halfway through processing it?"',
            '2026-09-04T08:01:44.000Z [LOG] [Answer] full: "I rely on the visibility timeout and an idempotent handler."',
        ].join('\n');
        const pairs = pairAnswers(log, tl);
        expect(pairs.map((p) => p.id)).toEqual(['R07F']);
        expect(pairs[0].question).toBe(`${tl.items[1].q} [Follow-up to: ${tl.items[0].q}]`);
        expect(pairs[0].heard).toBe('In the scenario where two workers are picking up jobs from a queue, what happens');
        // Without a question= field the same anchor stays unclaimed, as before (R07's own window ended at 66 s).
        expect(pairAnswers(log.replace(/ question="[^"]*"/, ''), tl).map((p) => p.id)).toEqual(['?']);
    });
    it('exports questionForGrader for the blind-pairs builders: a chained follow-up carries its parent', () => {
        const items = [{ id: 'P', q: 'Parent question?' }, { id: 'F', chain: 'P', q: 'Follow-up?' }] as any[];
        expect(questionForGrader(items[1], items)).toBe('Follow-up? [Follow-up to: Parent question?]');
        expect(questionForGrader(items[0], items)).toBe('Parent question?');
    });
```
  Add `questionForGrader` to the import line. Run the file → expected: the first new test fails with `['?']` vs `['R07F']`, the second with "questionForGrader is not a function".
- [ ] **Implement (judge).** In `interview60.judge.mjs`: change `function questionForGrader` to `export function questionForGrader`. Replace the dispatch regex in `pairAnswers` with the metrics one so both sites parse one shape (non-capturing except anchor/verdict/question):

```js
    const all = [...debugLog.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|extend|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=\w+ answered=(?:true|false))?(?: extends="(?:[^"\\]|\\.)*")?(?: replaces="(?:[^"\\]|\\.)*")?(?: reason=\w+)?(?: question="((?:[^"\\]|\\.)*)")?/gm)]
        .map((m) => ({ at: Date.parse(m[1]), action: m[2], source: m[3], anchor: JSON.parse(`"${m[4]}"`), verdict: m[5], question: m[6] == null ? null : JSON.parse(`"${m[6]}"`) }));
```
  and in the claim loop: `const ov = Math.max(overlap(d.anchor, it.q), d.question ? overlap(d.question, it.q) : 0);` with a comment: "An answer dispatched on a Live PARAPHRASE (verdict=paraphrase) anchors on the paraphrase's first 80 chars, which can share no content word with the played text (h40b R07F went to nobody); the dispatch line also carries the question the app answered, so it is scored too." Keep `heard: d.anchor`.
- [ ] **Failing test first (metrics).** Add a new `describe('claimOf: a paraphrase-anchored answer is claimed by its dispatched question (h40b R07F)')` in `interview60.metrics.test.ts` that writes a minimal fixture to a temp dir (copy the shape of the synthetic fixture at lines 130–175: `timeline` with `startDebug: 0, endDebug: 1e9, startDiag: 0, endDiag: 1e9`, the two items above with `clipSecs`, a `natively_debug.log` with the paraphrase dispatch line at R07F.playedAt+10 s and an `[Answer] full:` line 4 s later, and a `verbal-diag.log` with `[<iso of dispatch+1 s>] route: VERBAL-TECHNICAL (selected model, filtered)`), then `computeRunFromFiles(...)`. Assert `m.answersToNobody === 0`, `m.items.find((i) => i.id === 'R07F').answered === true`, `.dispatches === 1`, `.heardBy === 'live'`. Control in the same describe: the same log with ` question="…"` stripped → `answersToNobody === 1` and R07F `answered === false`. Run → the first case fails (1 / false).
- [ ] **Implement (metrics).** In the `claimOf` builder (~line 202): `.map((it) => ({ it, score: Math.max(overlap(d.anchor, it.q), overlap(it.q, d.anchor), d.question ? overlap(d.question, it.q) : 0, d.question ? overlap(it.q, d.question) : 0) }))` with the same one-line comment. Run both test files → green.
- [ ] **Prove on copies (rule 8).** PowerShell: `Copy-Item -LiteralPath "$repo\electron\test\golden\interview60.runs\2026-09-24T08-20-12-h40a" -Destination "$SP\attrib-h40a" -Recurse` and the same for `2026-09-26T11-39-51-h40b` → `$SP\attrib-h40b`. Write `SP\attrib-check.mjs <run-copy> <out.json>`: imports MAIN's `interview60.judge.mjs`, `interview60.metrics.mjs`, `interview60.lib.mjs`; `dbg = logSince(<dir>/natively_debug.log, tl.startDebug, tl.endDebug)`; writes `{ pairs: pairAnswers(dbg, tl).map(p => ({ id, heard, dispatchedAt })), answersToNobody: computeRun(dir).answersToNobody, items: computeRun(dir).items.map(i => ({ id, answered, answeredAt, dispatches, heardBy })) }`. **Order matters:** run it on both copies BEFORE editing the two .mjs files (outputs `SP\attrib-before-h40a.json`, `-h40b.json`) — i.e. do this step first, then the edits above, then run again to `SP\attrib-after-*.json`. Compare with a 10-line node diff. Expected: h40a before == after byte-for-byte (JSON.stringify equal); h40b differs in exactly: the pair dispatched `2026-09-26T10:47:31.603Z` id `?` → `R07F`; `answersToNobody` 1 → 0; item R07F `answered false → true`, `dispatches 0 → 1`, `heardBy null → 'live'`; every other pair/item identical. Any other movement = stop and report (do not tune thresholds). Save the diff output to `SP\attrib-diff.txt`.
- [ ] Note for the record: the h40b pass record and judge files are NOT regenerated; the proof lives in `SP\attrib-*.json` and goes into the report.

---
