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

## Task 4 — The verbal hedge behind `NATIVELY_VERBAL_HEDGE` (independent)

**Files:** new `electron/llm/verbalHedge.ts` + `verbalHedge.test.ts`; `electron/LLMHelper.ts` (branch at the top of `streamGeminiWithStallFallback` ~3391, new private `streamGeminiWithHedge` after it); new `electron/LLMHelper.verbalHedge.test.ts`; `electron/llm/WhatToAnswerLLM.ts` (`nameStallSwitch`, ~30–33 and 99–122); `electron/llm/WhatToAnswerLLM.answeringModel.test.ts` (3 new tests); `electron/main.ts` (one log line at 2431).

**Interfaces:**
```ts
// verbalHedge.ts
export const VERBAL_HEDGE_ENV = 'NATIVELY_VERBAL_HEDGE';
export const VERBAL_HEDGE_TRIGGER_ENV = 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS';
export const DEFAULT_HEDGE_TRIGGER_MS = 5000;   // the value probed 2026-09-25 (H1-H3), fixed before any counted window
export function verbalHedgeEnabled(env?: NodeJS.ProcessEnv): boolean;   // 1 on; unset/''/0 off; else throw
export function verbalHedgeTriggerMs(env?: NodeJS.ProcessEnv): number;  // positive whole number or the default; else throw (firstTokenTimeoutMs's shape)
```
Log lines (natively_debug.log; the h40c stats script and the smoke check parse exactly these):
```
[LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms
[LLMHelper] verbal hedge: back started at <ms>ms reason=<trigger|front-error|front-empty>
[LLMHelper] verbal hedge: won by <model> at <ms>ms; other=<not-started|aborted|failed|empty>
[LLMHelper] verbal hedge: no answer - front <error|empty>, back <error|empty>        (console.warn)
```
Winner sentinel on the raw stream, ahead of its first token: `` `__model_source:${model} (hedge)__` `` (no underscore in the label; consumers match `/__model_source:([^_]+)__/`).

- [ ] **Failing tests (env module)** — `verbalHedge.test.ts`: enabled off for `{}`, `'0'`, `''`; on for `'1'`; throws for `'true'`; trigger default 5000; `'300'` → 300; `'0'`, `'fast'`, `'2.5'` throw with the variable name. Implement the module (copy `firstTokenTimeoutMs`'s parsing). Green.
- [ ] **Failing tests (LLMHelper)** — `electron/LLMHelper.verbalHedge.test.ts`, with the SDK/electron shims and `plan`/`signals` machinery copied from `WhatToAnswerLLM.answeringModel.test.ts` (steps `'silent' | 'error' | string[]`), `technical(helper) = helper.streamChat('how do you make ingestion idempotent', undefined, undefined, VERBAL_WHAT_TO_ANSWER_PROMPT, false, 'gemini-3.1-flash-lite')`, fake timers, `process.env.NATIVELY_VERBAL_HEDGE='1'` in `beforeEach` (saved/restored like the thinking-level env). Cases, each with exact expectations on `asked()` (models in call order), the chunks, and `signals[i].aborted`:
  1. front speaks at once → `asked() = ['gemini-3.5-flash-lite']`; chunks start `['__model_source:gemini-3.5-flash-lite (hedge)__', 'I would key every message ', 'by document id.']`; after `advanceTimersByTimeAsync(10_000)` still one call; log has `won by gemini-3.5-flash-lite … other=not-started`.
  2. front `'silent'`, back speaks → at 4999 ms one call, at 5000 ms two (`['gemini-3.5-flash-lite','gemini-3.1-flash-lite']`); winner sentinel names 3.1-lite; `signals[0].aborted === true`; log `back started at 5000ms reason=trigger` and `won by gemini-3.1-flash-lite … other=aborted`.
  3. front slow (first chunk after a `setTimeout` 6000 inside the fake stream — extend the fake with a `{ after: ms, chunks }` step), back `'silent'` → winner 3.5-lite after the trigger; `signals[1].aborted === true`.
  4. front `'error'` (503) → back starts at once (`advanceTimersByTimeAsync(1)` → two calls, log `reason=front-error`); winner 3.1-lite; front's signal not aborted (it already failed) — `other=failed`.
  5. front `{ after: 7000, chunks }`, back `'error'` → winner 3.5-lite; log `other=failed`; `signals[0].aborted === false`.
  6. both `'error'` → `await expect(drain(technical(helper))).rejects.toThrow(/503/)` (the front's error propagates, so WhatToAnswerLLM's pre-token redirect applies).
  7. levels: front request `config.thinkingConfig = { thinkingLevel: 'HIGH' }` (3.5-lite maps LOW→HIGH), back `{ thinkingLevel: 'LOW' }`; same `systemInstruction` bytes on both legs.
  8. `NATIVELY_VERBAL_HEDGE_TRIGGER_MS='300'` → the back starts at 300 ms.
  9. a consumer that closes on the winner's sentinel aborts the winner's request: `for await (const c of technical(helper)) { break; }` then `await vi.advanceTimersByTimeAsync(0)` → `signals[0].aborted === true` (the `abortOnClose` pattern: read one macrotask later).
  10. **default-off pin:** flag unset → exactly today's sequence for a silent primary: `['gemini-3.1-flash-lite']` at 9999 ms, `['gemini-3.1-flash-lite','gemini-3.5-flash-lite']` at 10 000 ms, sentinel `__model_source:gemini-3.5-flash-lite (fallback)__`, and no `verbal hedge` line in `console.log`; flag `'yes'` → the stream rejects with `/NATIVELY_VERBAL_HEDGE/`.
  11. the behavioral route (`helper.streamVerbalWithGeminiFlash(...)`) takes the same hedge (one implementation): front 3.5-lite first.
  12. a non-lite primary (`streamVerbalWithGeminiFlash(msg, prompt, undefined, 'gemini-3.5-flash')` — a name outside the pair) keeps today's race (`asked()[0] === 'gemini-3.5-flash'`, no hedge line).
  Run → all but 10 fail (10 passes already: it pins today).
- [ ] **Implement in LLMHelper.ts.** Import `{ verbalHedgeEnabled, verbalHedgeTriggerMs } from "./llm/verbalHedge"`. At the top of `streamGeminiWithStallFallback` (before `const FALLBACK_MODEL`):

```ts
    // The verbal hedge (NATIVELY_VERBAL_HEDGE=1): 3.5-lite HIGH first, 3.1-lite LOW raced in when it
    // is silent, the first token wins — see streamGeminiWithHedge. Only the two Flash Lites hedge;
    // any other primary keeps the race below. Off unless the flag is set, so a flight compares the two.
    if (verbalHedgeEnabled() && (primaryModel === GEMINI_FLASH_MODEL || primaryModel === GEMINI_FLASH_FALLBACK_MODEL)) {
      yield* this.streamGeminiWithHedge(userMessage, imagePaths, systemInstruction);
      return;
    }
```
  Then the new generator (place right after `streamGeminiWithStallFallback`):

```ts
  /**
   * The verbal hedge — docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md, the policy of
   * electron/test/golden/hedge-live.policy.mjs (runHedge), probed live 2026-09-25: PROCEED.
   * gemini-3.5-flash-lite (HIGH) starts first. With no first token by the trigger, or on a failure
   * before its first token, gemini-3.1-flash-lite (LOW) starts BESIDE it and 3.5-lite keeps running;
   * the first token wins and the other request is aborted at once through its own stop signal
   * (never AbortSignal.any: it leaks under Electron 33). A leg that fails leaves the other to finish.
   * Both failing throws the front's error so WhatToAnswerLLM's pre-token redirect applies, as with
   * today's race; both ending empty ends empty, as today. The winner is announced as
   * `__model_source:<model> (hedge)__` ahead of its first token: the head label named the shipped
   * primary before any request was made, and a bar that names the wrong model was the 2026-09-22
   * bug class (783991a, 47def85).
   */
  private async * streamGeminiWithHedge(
    userMessage: string,
    imagePaths: string[] | undefined,
    systemInstruction: string,
  ): AsyncGenerator<string, void, unknown> {
    const FRONT = GEMINI_FLASH_FALLBACK_MODEL, BACK = GEMINI_FLASH_MODEL;
    const triggerMs = verbalHedgeTriggerMs();
    const t0 = Date.now();
    const since = () => Date.now() - t0;
    console.log(`[LLMHelper] verbal hedge: front=${FRONT} back=${BACK} trigger=${triggerMs}ms`);
    type First = { kind: 'token'; value: string } | { kind: 'empty' } | { kind: 'error'; err: unknown };
    const start = (model: string) => {
      const stop = new AbortController();
      const gen = this.streamWithGeminiModel(userMessage, model, imagePaths, systemInstruction, stop.signal);
      const leg = { model, gen, stop, settled: null as First | null, first: null as unknown as Promise<First> };
      leg.first = gen.next().then(
        (r): First => (r.done || !r.value ? { kind: 'empty' } : { kind: 'token', value: r.value }),
        (err): First => ({ kind: 'error', err }),
      ).then((r) => { leg.settled = r; return r; });
      return leg;
    };
    type Leg = ReturnType<typeof start>;
    const deliver = async function* (leg: Leg, firstToken: string): AsyncGenerator<string, void, unknown> {
      // The sentinel and the first token are hand-yielded outside `yield* leg.gen`; a consumer that
      // stops on either (a superseding generation) never reaches the request's own finally, so close
      // the parked generator here, not awaited (it sits at its first yield: the close aborts at once).
      let delivered = false;
      try {
        yield `__model_source:${leg.model} (hedge)__`;
        yield firstToken;
        delivered = true;
      } finally {
        if (!delivered) leg.gen.return(undefined);
      }
      yield* leg.gen;
    };
    const front = start(FRONT);
    let timer!: NodeJS.Timeout;
    const trigger = new Promise<'trigger'>((resolve) => { timer = setTimeout(() => resolve('trigger'), triggerMs); });
    const frontFirst = await Promise.race([front.first, trigger]);
    clearTimeout(timer);
    if (frontFirst !== 'trigger' && frontFirst.kind === 'token') {
      console.log(`[LLMHelper] verbal hedge: won by ${FRONT} at ${since()}ms; other=not-started`);
      yield* deliver(front, frontFirst.value);
      return;
    }
    const reason = frontFirst === 'trigger' ? 'trigger' : frontFirst.kind === 'error' ? 'front-error' : 'front-empty';
    if (frontFirst !== 'trigger' && frontFirst.kind === 'error') console.warn(`[LLMHelper] verbal hedge: ${FRONT} failed before its first token: ${(frontFirst.err as Error)?.message ?? String(frontFirst.err)}`);
    console.log(`[LLMHelper] verbal hedge: back started at ${since()}ms reason=${reason}`);
    const back = start(BACK);
    const legs: Leg[] = reason === 'trigger' ? [front, back] : [back];
    const winner = await new Promise<{ leg: Leg; value: string } | null>((resolve) => {
      let alive = legs.length;
      for (const leg of legs) leg.first.then((r) => { if (r.kind === 'token') resolve({ leg, value: r.value }); else if (--alive === 0) resolve(null); });
    });
    if (!winner) {
      const f = front.settled!, b = back.settled!;
      console.warn(`[LLMHelper] verbal hedge: no answer - front ${f.kind}, back ${b.kind}`);
      if (f.kind === 'error') throw f.err;
      if (b.kind === 'error') throw b.err;
      return;   // both empty: nothing to say, as today
    }
    const loser = winner.leg === front ? back : front;
    const other = loser.settled ? (loser.settled.kind === 'error' ? 'failed' : 'empty') : 'aborted';
    if (!loser.settled) loser.stop.abort();   // its pending next() rejects into `first` (already caught): no unhandled rejection
    console.log(`[LLMHelper] verbal hedge: won by ${winner.leg.model} at ${since()}ms; other=${other}`);
    yield* deliver(winner.leg, winner.value);
  }
```
  Run the file → green. Also re-run `LLMHelper.stallFallback.test.ts`, `LLMHelper.abortOnClose.test.ts`, `LLMHelper.emptyStream.test.ts` → green (flag unset there).
- [ ] **Failing tests (label through WhatToAnswerLLM)** — append to `WhatToAnswerLLM.answeringModel.test.ts` (env `NATIVELY_VERBAL_HEDGE='1'` set inside each and deleted in `afterEach`):
  - back wins: `plan.push('silent', ['The back answered.'])`, fake timers, `advanceTimersByTimeAsync(5000)` → `asked() = ['gemini-3.5-flash-lite','gemini-3.1-flash-lite']`; `named(chunks)` ends with `'gemini-3.1-flash-lite (hedge)'`; the sentinel chunk index < the index of the chunk containing `'back answered'`.
  - front wins: `plan.push(['The front answered.'])` → `named(chunks)` ends with `'gemini-3.5-flash-lite (hedge)'`.
  - both legs 503, then the redirect answers: `plan.push('error', 'error', ['Recovered on the redirect.'])` → `asked() = ['gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-3.5-flash-lite']` (the redirect re-enters the hedge; the third call is its front) and the last name is `'gemini-3.5-flash-lite (hedge)'`; text contains `Recovered`.
  Run → the first two fail on the name (the head still says 3.1-lite; the `(hedge)` sentinel is stripped by `stripModelSentinel` and never re-announced) — exactly the bug class.
- [ ] **Implement in WhatToAnswerLLM.ts.** Add `const HEDGE_WINNER = /^__model_source:(\S+) \(hedge\)__$/;` beside `STALL_SWITCH` with a one-line comment (the hedge's winner, LLMHelper.streamGeminiWithHedge). In `nameStallSwitch` replace `switchedTo` with the exact chunk to re-announce:

```ts
        let announce = null as string | null;
        async function* watch() {
            for await (const chunk of raw) {
                const h = HEDGE_WINNER.exec(chunk);
                const m = h ?? STALL_SWITCH.exec(chunk) ?? GEMMA_HANDOVER.exec(chunk);
                if (m) {
                    // The hedge's winner is re-announced verbatim; a stall switch or a Gemma handover as `(fallback)`, as before.
                    announce = h ? chunk : `__model_source:${m[1]} (fallback)__`;
                    onSwitch(m[1]);
                }
                yield chunk;
            }
        }
        for await (const chunk of filter(watch())) {
            if (announce) { yield announce; announce = null; }
            yield chunk;
        }
```
  Update the doc comment of `nameStallSwitch` with one sentence. Run the answeringModel file → all green (the existing `(fallback)` / `Gemini Flash (fallback)` expectations unchanged).
- [ ] **main.ts** (2431): inside the `'suggested_answer_source'` handler add `console.log(\`[Main] answer source: ${label}\`)` — the only place the label the renderer receives is visible to a log reader (smoke and flight). No test (main.ts has none); the smoke check reads it.
- [ ] Calibrate (rule 8): delete the `HEDGE_WINNER` branch → the two label tests fail; delete `loser.stop.abort()` → LLMHelper cases 2 and 3 fail; restore both.

---
