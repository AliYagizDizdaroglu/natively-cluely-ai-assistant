# Live Router Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3.8 Live router behind `NATIVELY_LIVE_ROUTER=1`. It is a second Live session that answers easy questions on screen, while the pipeline answer for every dispatched turn is kept as a hidden shadow or appended. Also build the ride-along fixes, the live40 harness, and the tools for one registered unattended run at T = 2026-10-07 08:00 TST.

**Architecture:** The ear (`GeminiLiveRouter`) stays as it is, plus a generation guard. A new `LiveRouterSession` (gemini-3.8-live, router40's setup) emits `router-turn` events. A pure `routeReader` reads them. A `RouterArbiter` in main pairs router turns with interviewer turns, gates the pipeline's `suggested_answer*` events by `turnId`, and synthesizes the Live answer events. The renderer keys its bubbles by `turnId`, `origin` and `append`.

**Tech Stack:** Electron main (TypeScript, esbuild per-file build), React renderer, vitest, `@google/genai` Live API, node `.mjs` harness, PowerShell and cmd for scheduled tasks.

**Spec:** `docs/superpowers/specs/2026-10-06-live-router-default-design.md` (MAIN 17d199d, sha a4c3b81c…), the same text as `natively-lab\sp\router-default\SPEC.md`. Supporting files: `SPEC-REVIEW.md` and `DIAG-reconnects-ttft.md` in the same folder. Executors read the spec section each task names.

**Plan written:** 2026-10-06 20:31 TST (`date`), by the Opus plan author.

---

## Global Constraints

**Paths**
- MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`. It is on branch `fix/coding-style-suffix-all-gemini`, HEAD 17d199d at plan time, and other sessions share its tree.
- WT = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\live-router`. It holds branch `feat/live-router` from 17d199d, and Task 0 creates it.
- LAB = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\router-default`.
- SP = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp`.

**How subagents edit WT**
- Write and Edit refuse MAIN and worktree paths for subagents.
- So every implementer writes new or changed repo files into `LAB\stage\<task-id>\<repo-relative path>`. Then it runs `node LAB\apply-stage.mjs <task-id>`, which copies them into WT. The copy uses `readdirSync` + `copyFileSync`, never `fs.cpSync`, which exits 127 on a Masaüstü path. The script prints each copied path and its sha12.
- To change an existing file, the implementer copies it from WT into the stage with node, edits the stage copy, and applies it.
- Never `sed -i`.

**Committing**
- Implementers commit in WT with `git -C "<WT>" add <paths>` and `git -C "<WT>" commit`.
- If the harness refuses git on another worktree, leave the change uncommitted and say so. The controller then commits.

**Landing in MAIN**
- MAIN commits go ONLY through `SP\commit-main-paths.ps1` (private GIT_INDEX_FILE, then commit-tree, then CAS update-ref).
- Check the branch of both checkouts before any MAIN edit.

**Tests and type-check**
- Run tests from a temp cwd: `cd "$TEMP"`, then `node "<WT>\node_modules\vitest\vitest.mjs" run --root "<WT>" <test paths>`. Never run the full suite in parallel with another vitest run, because suites are not cwd-safe.
- Type-check gate, both commands:
  - `node "<WT>\node_modules\typescript\bin\tsc" --noEmit -p "<WT>"`
  - `node "<WT>\node_modules\typescript\bin\tsc" --noEmit -p "<WT>\electron\tsconfig.json"`
  - The second has 6 pre-existing errors. Task 0 records the baseline, and a task passes when it adds none.
- TDD: write each test first and watch it fail, with the failure quoted, before the code that makes it pass. A test written after the code counts only once it has been broken once and seen to fail.

**Runtime rules**
- Never start the app from a Claude session (it reads a shadow `credentials.enc`). Any live Gemini call (probe, smoke, run) runs only from a Windows scheduled task.
- Never print keys or captured prompts. Keys are read in-process and only their names are printed. Hashes and character counts may be printed. Router answer text may appear in test fixtures (it is model output for synthetic questions), but never a captured app prompt.

**Model ids and constants (exact)**
- Router model `gemini-3.8-live`. Ear default `gemini-3.1-flash-live-preview`. Ear failover `gemini-2.5-flash-native-audio-latest`.
- `sha256(INSTRUCTION) = e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f`.
- `sha256(BLOCK_B) = e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8`.
- `live40\items.json` sha256 = `e531772bdc6e9c23865156286d8441c51521c62be74413bc56322090c81b2aaf`.
- Reader limits: 8 ≤ words ≤ 80. Arbiter windows: pairing 2000 ms after close; decision deadline Q + 2000 ms; cap Q + 10 000 ms. live40 gap 20 000 ms on every item. `OFFSET_MS` = 1150.

**Flag coverage**
- `NATIVELY_LIVE_ROUTER=1` turns on the router session, the arbiter's Live path and the ear failover.
- The reconnect guard, the marker filter and the `turnId` plumbing are NOT behind the flag.
- With the flag off, the renderer receives today's events in today's order, plus an ignored `turnId`.

**Reviews**
- Every task gets an Opus review against its brief and the spec section it names.
- The whole branch gets an Opus review before any MAIN commit.
- No review is ever cut to make the deadline (spec §1).

---

## Schedule, lanes, and the cut line

**Window:** 2026-10-06 21:00 to 2026-10-07 05:30 TST, which is 510 min. The arming record must be stamped by 07:50 (T−10). Arming may happen after 05:30. Everything else in spec §1's list may not.

**Estimates.** Each estimate is implementer + Opus review + one fix round. "Crit" marks the tasks on the critical path to 05:30.

| # | Task | Lane | Est. | Depends on |
|--|--|--|--|--|
| 0 | Worktree, junction, staging tool, baselines | — | 15 | — |
| 1 | Ear reconnect generation guard + model parameter | A | 35 | 0 |
| 2 | LiveRouterSession + instruction constants + `getRouterProfileSummary` | A | 75 | 1 |
| 3 | Live probe of 3.8 (scheduled task, ~2 min) → **checkpoint 1** | A | 45 | 2 |
| 4 | Route reader + router40 fixtures | B **crit** | 30 | 0 |
| 5 | Arbiter (pure core) | B **crit** | 120 | 4 |
| 6 | Offline replay on router40 | B | 25 | 5 |
| 7 | Engine: `turnId` on events, answer-end event, history sink, `speechEnd()` | C | 45 | 0 |
| 8 | Renderer contract (answerMessages, NativelyInterface, preload, types) | C | 70 | 0 |
| 9 | Unknown-marker filter | C | 30 | 0 |
| 10 | main.ts wiring (arbiter, router session, lines, capture, history) | **crit** | 80 | 2, 5, 7, 9 |
| 11 | Ear failover 3.1 → 2.5 (**CUTTABLE**) | **crit** | 30 | 10 |
| 12 | live40 harness: generator, roster, clips, builder, wav, wav:check | D | 60 | 0 |
| 13 | Harness: probe wait, router preflight gates, capture files, arms filter | D | 60 | 12 |
| 14 | Hour reader + calibration | D | 75 | line formats (Task 5's §) |
| 15 | Gates: both tsc, suite, whole-branch Opus review + fixes | **crit** | 60 | 1–14 |
| 16 | Land in MAIN + MAIN rebuild + build marker | **crit** | 30 | 15 |
| 17 | Smoke (scheduled task, ~30 min wall) + read → **checkpoint 3** | **crit** | 60 | 16, 14 |
| 18 | Quota ledger known-answer + flight tools adapted from flight-eq | D | 120 | 13, 14 |
| 19 | Registration (Opus author) + separate Opus re-check | **crit** (re-check) | 60 (35 overlaps 17) | 17, 18 |
| 20 | Arming | after 05:30 | 20 | 19 |

**Critical path to 05:30:** 0 (15) → 4 (30) → 5 (120) → 10 (80) → 11 (30) → 15 (60) → 16 (30) → 17 (60) → 19 re-check after the smoke (25). That is **450 min** if every lane runs in parallel and no task needs a second fix round.
- Starting 21:15 (plan commit plus Task 0), it ends at **04:45**, which leaves **45 min** of margin.
- Without Task 11 it is 420 min, ending at 04:15 with **75 min** of margin.
- Lanes A, C and D finish inside the critical path's shadow (A by ~23:45, C by ~23:30, D by ~02:30).

**Verdict on fit.** The full scope fits ONLY with four lanes running concurrently (4 Sonnet implementers plus their Opus reviewers) and at most one fix round per task. Serially it is ~17.5 h and cannot fit.
- One slip of more than ~45 min on the critical path (for example, the arbiter needing a second fix round) pushes the run to the spec's no-go fallback, 2026-10-07 ~23:00.
- **Recommendation: the smallest scope that keeps a real margin is the full scope minus Task 11 (ear failover)**, which gives 75 min of margin.
  - Spec §13 lists the failover as a reviewer's fallback cut that **needs the user's ruling**, because the failover is approved.
  - Ask the user at plan approval. Until the user rules, build Task 11 last on the critical path, and cut it at checkpoint 2 if Task 10 is not reviewed by 01:30.

**Checkpoints (controller):**
1. **23:45: probe result (Task 3).** The 3.8 session sets up in the built module, streams `router-turn` events, and keeps its shas across a forced reconnect. If 3.8 refuses, fails setup, or never streams, STOP the night: report and move to the 23:00 fallback. Nothing downstream is worth building blind.
2. **01:30: Task 10 reviewed and green.** If not, cut Task 11 (once the user has ruled, or as the recorded fallback cut).
3. **03:30: smoke flown (Task 17 armed by 03:15).** If the smoke is not armed by 03:15, or it shows a Safety-class defect (shown hard first word, shown marker, nothing shown on a dispatched turn), the 08:00 run is NO-GO and moves to the fallback.
4. **05:30: go/no-go.** Build, every review, the probe, the smoke and the registration with its re-check must all be done.

**The cut line**
- **May be dropped if late, each needing the user's ruling (spec §13):**
  - Task 11 (ear failover);
  - in Task 14, the router and ear connect, reconnect and close tallies by reason and code (step 14.4, marked CUTTABLE). The VOID inputs stay: `session failed` with `dispatches_before`, and router down minutes.
  - The 2-minute probe (Task 3) is also listed in §13, but this plan keeps it, because it is the cheapest evidence that 3.8 works at all and it gates checkpoint 1.
- **May NOT be dropped:**
  - the reconnect guard;
  - the router session and its guard;
  - the reader, the arbiter and the replay;
  - the `turnId` contract and the renderer;
  - the history rule;
  - the marker filter (the Safety bar counts any shown marker);
  - the capture lines and files, and the decision and session lines;
  - the live40 harness, the probe wait and the router preflight gates;
  - the hour reader's bars, VOID and Safety checks;
  - the smoke, the registration and its re-check;
  - the flight tools and the quota-ledger check;
  - every Opus review.

---

## Review Focus

These are the conditions the spec implies that are most likely to bite. Each one is pinned by a named test in its owning task.

1. **Two turns whose pipeline events interleave.** Turn k's answer is still streaming when turn k+1 dispatches, and the engine aborts k: k ends with no final. Expected: each turn is held, hidden or released only under its own `turnId`; an aborted shadow still gets a capture line and a decision line; nothing of k leaks into k+1's bubble. Tests: Task 5 `B3 interleave` and `aborted pipeline`; Task 8 `final closes only its own bubble`.
2. **The pipeline answer ends before the router decides.** This happens on a fast pipeline, or a router turn whose first word arrives at Q + 1.9 s. Expected: the final is held, not shown and not added to the history until the decision; a pipeline decision then releases it in order. Tests: Task 5 `pipeline ends before decision`; Task 7 `history sink instead of session`.
3. **A Live token whose last word is still arriving** (`"__fo"`, `"Hea"`). Expected: only complete tokens are displayed while streaming, so a token that later turns out to carry a marker is never partly shown. Test: Task 5 `partial token never displayed`.
4. **A supersede while Live is streaming.** Expected: Live display stops at once (no more Live tokens and no Live final), the pipeline's replacing stream rewrites the turn's first bubble, any "(full answer)" bubble is removed, and the Live text is not added to the history if the router turn had not ended. Tests: Task 5 `supersede during Live`; Task 8 `replace with turnId`.
5. **The ear and router sessions across meeting stop and restart.** Expected: stop() makes every late callback stale, no reconnect fires after stop, and the profile summary is rebuilt for the next meeting (its cache is cleared on stop). Tests: Task 1 `stop makes late callbacks stale`; Task 2 `context cached per meeting`.

---

## File structure

| File | New/Mod | Responsibility |
|--|--|--|
| `electron/audio/GeminiLiveRouter.ts` | Mod | Generation guard, close line, model constructor parameter |
| `electron/audio/routerInstruction.ts` | New (generated) | `ROUTER_INSTRUCTION` and `ROUTER_BLOCK_B` string constants |
| `electron/audio/LiveRouterSession.ts` | New | The 3.8 router session: connect, guard, reconnects, `router-turn` events |
| `electron/knowledge/KnowledgeOrchestrator.ts` | Mod | `getRouterProfileSummary()` |
| `electron/services/routeReader.ts` | New | Pure reader functions (§4.2) |
| `electron/services/routerArbiter.ts` | New | Pairing, decision, holding, Live synthesis, history, capture, decision lines (§4.3–§4.6, §5) |
| `electron/services/routerDiag.ts` | New | Writes router lines to the debug log and to `verbal-diag.log` (main process only) |
| `electron/services/fixtures/router40-answers.json`, `router40-replay.json` | New | Router40's 47 real outputs and their chunk timings |
| `electron/llm/unknownMarkerFilter.ts` | New | Streaming stripper for unknown `__WORD__` markers |
| `electron/llm/WhatToAnswerLLM.ts` | Mod | The filter as the outermost stage inside `filtered` |
| `electron/IntelligenceEngine.ts` | Mod | `turnId` on 3 emits; `suggested_answer_end`; history sink |
| `electron/IntelligenceManager.ts` | Mod | Forwards the new event; exposes the sink and `addAssistantMessage(text, question?)` |
| `electron/services/interviewerTurn.ts` | Mod | `speechEnd()` read-only accessor (Q and its source) |
| `electron/main.ts` | Mod | Wiring |
| `electron/preload.ts`, `src/types/electron.d.ts` | Mod | Optional payload fields; source event's `turnId` |
| `src/lib/answerMessages.ts` | Mod | Bubble keying by `turnId`, `origin` and `append` |
| `src/lib/bubbleMetrics.ts` | New | Per-bubble stream metrics (pure) |
| `src/components/NativelyInterface.tsx` | Mod | Uses the above; shows the "(full answer)" header |
| `electron/test/golden/live40.gen.mjs`, `live40.questions.mjs`, `live40.clips.mjs` | New | Roster generator, generated roster, clip copy and verify |
| `electron/test/golden/roster.mjs`, `interview60.build-audio-local.mjs` | Mod | live40 entry; `noRender` refusal |
| `electron/test/golden/probeWait.mjs`, `routerCapture.mjs` | New | §7.2 wait predicate; §5 capture files |
| `electron/test/golden/interview60.run.mjs`, `interview60.flight.mjs` | Mod | auto() wait + capture; router preflight gates; `NATIVELY_FLIGHT_ARMS` |
| `LAB\router-hour-read.mjs` (+ `.cal.mjs`) | New | The run reader |
| `LAB\live-probe.mjs`, `LAB\flight\*` | New | Probe; launchers, guard, precheck, register, arming, adapted from flight-eq |

---

### Task 0: Worktree, junction, staging tool, baselines (controller, 15 min)

**Files:** Create `LAB\apply-stage.mjs` and `LAB\stage\`. Worktree at WT.

- [ ] **Step 1: Check both branches.** Run `git -C "<MAIN>" symbolic-ref --short HEAD`, expecting `fix/coding-style-suffix-all-gemini`, and `git -C "<MAIN>" rev-parse HEAD`, which must contain 17d199d (record the actual HEAD).
- [ ] **Step 2: Create the worktree.** Run `git -C "<MAIN>" worktree add -b feat/live-router "<WT>" 17d199d`.
- [ ] **Step 3: Junction node_modules.** Run `cmd /c mklink /J "<WT>\node_modules" "<MAIN>\node_modules"`. The junction is untracked; check that `git -C "<WT>" status --porcelain` stays empty (node_modules is in .gitignore).
- [ ] **Step 4: Write `LAB\apply-stage.mjs`.**

```js
// node apply-stage.mjs <task-id>: copy LAB\stage\<task-id>\** into WT, same relative paths. readdirSync+copyFileSync (cpSync fails on Masaüstü).
import fs from 'node:fs'; import path from 'node:path'; import { createHash } from 'node:crypto';
const LAB = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router';
const id = process.argv[2]; if (!id) { console.log('usage: apply-stage.mjs <task-id>'); process.exit(2); }
const root = path.join(LAB, 'stage', id); if (!fs.existsSync(root)) { console.log(`no stage ${root}`); process.exit(2); }
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root)) {
  const rel = path.relative(root, f); const dest = path.join(WT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(f, dest);
  console.log(`copied ${rel.replace(/\\/g, '/')} sha12=${createHash('sha256').update(fs.readFileSync(dest)).digest('hex').slice(0, 12)}`);
}
```

- [ ] **Step 5: Prove the test runner and record baselines.**
  - From `$TEMP`, run `node "<WT>\node_modules\vitest\vitest.mjs" run --root "<WT>" electron/audio/GeminiLiveRouter.test.ts`. Expected: PASS.
  - Run both tsc commands and save their outputs to `LAB\baseline-tsc-root.txt` and `LAB\baseline-tsc-electron.txt`. Expected: the electron one shows exactly 6 errors.
  - Run the full suite once, serially, and save the pass/fail counts to `LAB\baseline-suite.txt`.
- [ ] **Step 6: Build proof.** From WT, run `cmd /c npm run build:electron`. Then check that `<WT>\dist-electron\electron\audio\GeminiLiveRouter.js` exists with a fresh mtime. This also records where the dist module path lands, which Task 3 needs.

---

### Task 1: Ear reconnect generation guard + model parameter (Lane A, 35 min)

**Spec:** §7.3, §4.4 (model becomes a constructor parameter), §5 (`[LiveRouter] close` line). DIAG Q1 holds the mechanism.

**Files:**
- Modify: `electron/audio/GeminiLiveRouter.ts` (constructor 263–268; `connect` 356–420; goAway 432–442; `handleClose` 498–528; `scheduleReconnect` 530–558; `stop` 280–296)
- Test: `electron/audio/GeminiLiveRouter.test.ts` (append a new `describe`; reuse `makeHarness`)

**Interfaces:**
- Produces: `new GeminiLiveRouter(getApiKey, connectFn?, model?: string)`, where `model` defaults to `LIVE_ROUTER_MODEL`; `getModel(): string`; status events unchanged (`'failed'` keeps `reason`).
- Produces the log line `[LiveRouter] close gen=<n> code=<n|-> reason=<…> stale=<yes|no>` on every close callback.

- [ ] **Step 1: Write the failing tests.**

```ts
describe('GeminiLiveRouter generation guard (DIAG Q1)', () => {
  function multiSessionHarness() {
    const sessions: Array<{ cbs: any; closed: number; sent: number }> = [];
    const connectFn: LiveConnectFn = vi.fn(async (params: any) => {
      const rec = { cbs: params.callbacks, closed: 0, sent: 0 };
      sessions.push(rec);
      return { sendRealtimeInput: () => { rec.sent++; }, sendToolResponse: () => {}, close: () => { rec.closed++; rec.cbs.onclose({ reason: 'connection closed', code: 1000 }); } } as LiveSessionLike;
    }) as any;
    const router = new GeminiLiveRouter(() => 'k', connectFn);
    return { router, sessions, connectFn };
  }

  it('a goAway gives exactly one reconnect, not two', async () => {
    vi.useFakeTimers();
    const h = multiSessionHarness();
    await h.router.start();
    h.sessions[0].cbs.onopen();
    h.sessions[0].cbs.onmessage({ goAway: { timeLeft: '10s' } });   // closes s0 -> its onclose must be stale
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.connectFn).toHaveBeenCalledTimes(2);                   // start + ONE reconnect
  });

  it("a stale session's onclose schedules no reconnect and leaves the live session in place", async () => {
    vi.useFakeTimers();
    const h = multiSessionHarness();
    await h.router.start();
    h.sessions[0].cbs.onmessage({ goAway: {} });
    await vi.advanceTimersByTimeAsync(1000);
    h.sessions[1].cbs.onopen();
    h.sessions[0].cbs.onclose({ reason: 'The operation was aborted.', code: 1006 }); // the orphan dies later
    await vi.advanceTimersByTimeAsync(20000);
    expect(h.connectFn).toHaveBeenCalledTimes(2);
    expect(h.router.getState()).toBe('connected');
    h.router.write(Buffer.alloc(320), 16000);
    expect(h.sessions[1].sent).toBe(1);                              // audio still reaches the live session
  });

  it('a late session from a stale connect is closed, never adopted', async () => {
    let resolveFirst: (s: LiveSessionLike) => void = () => {};
    const late = { sendRealtimeInput: vi.fn(), sendToolResponse: vi.fn(), close: vi.fn() };
    const connectFn: LiveConnectFn = vi.fn()
      .mockImplementationOnce(() => new Promise<LiveSessionLike>((r) => { resolveFirst = r; }))
      .mockImplementation(async () => ({ sendRealtimeInput: vi.fn(), sendToolResponse: vi.fn(), close: vi.fn() })) as any;
    const router = new GeminiLiveRouter(() => 'k', connectFn);
    const p = router.start();
    router.stop();                    // generation moves on
    resolveFirst(late as any); await p;
    expect(late.close).toHaveBeenCalledTimes(1);
  });

  it('stop makes late callbacks stale (Review Focus 5)', async () => {
    vi.useFakeTimers();
    const h = multiSessionHarness();
    await h.router.start();
    const cbs = h.sessions[0].cbs;
    h.router.stop();
    cbs.onclose({ reason: 'x', code: 1006 });
    await vi.advanceTimersByTimeAsync(20000);
    expect(h.connectFn).toHaveBeenCalledTimes(1);
  });

  it('logs the close code', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const h = multiSessionHarness();
    await h.router.start();
    h.sessions[0].cbs.onclose({ reason: 'boom', code: 1011 });
    expect(log.mock.calls.map((c) => String(c[0])).some((l) => /^\[LiveRouter\] close gen=1 code=1011 reason=boom stale=no$/.test(l))).toBe(true);
    log.mockRestore();
  });

  it('takes the model from its constructor', async () => {
    const calls: any[] = [];
    const r = new GeminiLiveRouter(() => 'k', (async (p: any) => { calls.push(p); return { sendRealtimeInput() {}, sendToolResponse() {}, close() {} }; }) as any, 'gemini-2.5-flash-native-audio-latest');
    await r.start();
    expect(calls[0].model).toBe('gemini-2.5-flash-native-audio-latest');
    expect(r.getModel()).toBe('gemini-2.5-flash-native-audio-latest');
  });
});
```

- [ ] **Step 2: Run, and confirm the failures.** Expected failures:
  - the goAway test: 3 connects;
  - the stale-onclose test: 3 connects;
  - the close-code test: no matching line;
  - the model test: `getModel` is not a function.
- [ ] **Step 3: Implement.** Add `private generation = 0;` and `private readonly model: string` (third constructor parameter, defaulting to `LIVE_ROUTER_MODEL`), plus `getModel()`. Then:

```ts
private async connect(): Promise<void> {
  const gen = ++this.generation;
  // ...existing apiKey / state code unchanged...
  try {
    const session = await this.connectFn({
      apiKey, model: this.model, config: { /* unchanged */ },
      callbacks: {
        onopen: () => { if (gen !== this.generation) return; /* existing body */ },
        onmessage: (msg) => { if (gen !== this.generation) return; this.handleMessage(msg); },
        onerror: (e: any) => { console.warn('[LiveRouter] ws error:', e?.message ?? e); },
        onclose: (e: any) => this.handleClose(e, gen),
      },
    });
    if (this.stopping || gen !== this.generation) { try { session.close(); } catch { /* noop */ } return; }
    this.session = session;
    this.maybeFlushGapBuffer();
  } catch (err: any) {
    this.handleClose({ reason: err?.message ?? String(err) }, gen);
  }
}
```

  - **goAway:** set `const session = this.session; this.session = null; this.generation++;` BEFORE `session?.close()`, then `scheduleReconnect(...)`.
  - **`stop()`:** add `this.generation++;` before closing.
  - **`handleClose(e, gen)`:**

```ts
private handleClose(e: any, gen: number): void {
  const stale = gen !== this.generation;
  const reason = e?.reason ? String(e.reason) : 'connection closed';
  console.log(`[LiveRouter] close gen=${gen} code=${e?.code ?? '-'} reason=${reason} stale=${stale ? 'yes' : 'no'}`);
  if (stale) return;
  this.session = null;
  if (this.stopping) return;
  // ...the existing quota / expired / scheduleReconnect body, using `reason`...
}
```

  - **`scheduleReconnect`:** add `if (this.reconnectTimer) return; // a reconnect is already pending` as the second line, after the `stopping` check.
- [ ] **Step 4: Run the whole `GeminiLiveRouter.test.ts`.** Expected: all PASS, the old tests included.
- [ ] **Step 5: Run both tsc commands** and diff against the baselines; no new errors.
- [ ] **Step 6: Commit:** `fix(live): generation-gate the ear's session callbacks; one reconnect per goAway; log close codes`.

---

### Task 2: LiveRouterSession + instruction constants + profile summary (Lane A, 75 min)

**Spec:** §4.1, §4.1a, §5 (session lines), §6 (stale callbacks).

**Files:**
- Create: `LAB\gen-router-instruction.mjs`, which writes `stage\T2\electron\audio\routerInstruction.ts`
- Create: `electron/audio/LiveRouterSession.ts`, `electron/audio/LiveRouterSession.test.ts`
- Modify: `electron/knowledge/KnowledgeOrchestrator.ts` (add the method after `getCompactJDHeader()`, line 534)
- Create: `electron/knowledge/KnowledgeOrchestrator.routerProfile.test.ts`

**Interfaces:**
- Consumes: `resampleTo16kMono`, `LiveConnectFn` and `LiveSessionLike` from `./GeminiLiveRouter`.
- Produces:
  - `ROUTER_MODEL = 'gemini-3.8-live'`, `INSTRUCTION_SHA256`, `BLOCK_B_SHA256`, `buildRouterSystem(context: string): string`.
  - `export interface RouterTurnEvent { seq: number; text: string; firstTextAt: number; completed: boolean; endKind?: 'generationComplete'|'turnComplete'|'interrupted'|'closed'; endedAt?: number; afterComplete?: boolean }`.
  - `class LiveRouterSession extends EventEmitter` with `constructor(opts: RouterSessionOpts)`, `start(): Promise<void>`, `stop(): void`, `write(chunk: Buffer, sampleRate: number, numChannels?: number): void`, `isUp(): boolean`, and `contextInfo(): { sha12: string; chars: number } | null`.
  - Events: `'state'` `{ up: boolean; at: number }`; `'turn'` `RouterTurnEvent`; `'failed'` `{ reason: string }`.
  - `RouterSessionOpts = { getApiKey: () => string | undefined; getContext: () => string; connectFn?: LiveConnectFn; model?: string; log?: (line: string) => void; now?: () => number; shasOk?: boolean }`.
  - `KnowledgeOrchestrator.getRouterProfileSummary(): string`.

- [ ] **Step 1: Generate the constants.** `LAB\gen-router-instruction.mjs`:

```js
import fs from 'node:fs'; import { createHash } from 'node:crypto';
import { BLOCK_B } from '../router40/r40-common.mjs';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const INSTRUCTION = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/instruction.txt', 'utf8').replace(/\r\n/g, '\n');
if (sha(INSTRUCTION) !== 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f') throw new Error('instruction sha');
if (sha(BLOCK_B) !== 'e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8') throw new Error('block B sha');
const out = `// GENERATED by natively-lab/sp/router-default/gen-router-instruction.mjs. Do not edit: LiveRouterSession checks both sha256 values at load.\n`
  + `// INSTRUCTION = l20d/instruction.txt (LF); BLOCK_B = router40 r40-common.mjs BLOCK_B (spec 4.1, M1).\n`
  + `export const ROUTER_INSTRUCTION = ${JSON.stringify(INSTRUCTION)};\nexport const ROUTER_BLOCK_B = ${JSON.stringify(BLOCK_B)};\n`;
const dest = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/stage/T2/electron/audio/routerInstruction.ts';
fs.mkdirSync(dest.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(dest, out);
console.log(`wrote routerInstruction.ts instruction_sha12=${sha(INSTRUCTION).slice(0, 12)} block_sha12=${sha(BLOCK_B).slice(0, 12)} chars=${INSTRUCTION.length}/${BLOCK_B.length}`);
```

  Run it, then run `node LAB\apply-stage.mjs T2`.

- [ ] **Step 2: Write the failing session tests** (`LiveRouterSession.test.ts`). They use a fake `connectFn` that records sessions, as in Task 1. Required cases, each with its assertion:
  1. **Model assert.** `model: 'gemini-3.1-flash-live-preview'`, then `start()`: connect is called 0 times, and the log has `[Router] session refused reason=model-mismatch`.
  2. **Sha refusal.** `shasOk: false`: 0 connects, log `[Router] session refused reason=sha-mismatch`.
  3. **Connect line and config.** One `[Router] session connect model=gemini-3.8-live block_sha12=e11c240063ea instruction_sha12=e29bf3810128 context_sha12=<sha12 of ctx> context_chars=<n>`. Config: `responseModalities ['AUDIO']`, `inputAudioTranscription {}`, `outputAudioTranscription {}`, `contextWindowCompression { slidingWindow: {} }`, `systemInstruction.parts[0].text === buildRouterSystem(ctx)`. There is no `sessionResumption` key.
  4. **Up only on setupComplete.** `onopen` does not set `up`. `onmessage({ setupComplete: {} })` emits `state {up:true}` and logs `[Router] session up setup_ms=<n>`.
  5. **Turn streaming.** outputTranscription `"Mut"` then `"able is"` gives two `turn` events with the same `seq`, text `"Mut"` then `"Mutable is"`, and `completed:false`. Then `generationComplete` gives one event with `completed:true, endKind:'generationComplete', endedAt`. Text before `turnComplete` gives an event with `afterComplete:true`. `turnComplete` emits no new event. The next text gets `seq+1`.
  6. **Interrupted.** Text then `{serverContent:{interrupted:true}}` gives `completed:false, endKind:'interrupted'`.
  7. **Close mid-turn.** It gives `endKind:'closed'` and `state {up:false}`.
  8. **Audio out.** `modelTurn.parts[{inlineData:{data:'AAAA'}}]` emits nothing (counted only).
  9. **Generation guard.** goAway gives exactly 1 reconnect. A stale `onclose` gives 0 reconnects and leaves the live session's `write` target unchanged. The close line reads `[Router] session close gen=<n> code=<n> reason=<…> stale=<yes|no> quota=<yes|no>`.
  10. **Router-session failure.** 4 consecutive connect throws give exactly one `failed` event (on the transition) and then slow retry at 15 s. 3 quota closes (`reason: 'You exceeded your current quota'`) never emit `failed` and back off 5 s, then 10 s, then 20 s.
  11. **Context cached per meeting (Review Focus 5).** `getContext` is called once across start → reconnect → reconnect, and `context_sha12` is the same on every connect line. After `stop()` then `start()`, `getContext` is called again.
  12. **No audio while down.** `write()` before setupComplete sends nothing (no gap buffer).

- [ ] **Step 3: Run; all fail** (the module does not exist).
- [ ] **Step 4: Implement `LiveRouterSession.ts`.**

```ts
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { resampleTo16kMono, type LiveConnectFn, type LiveSessionLike } from './GeminiLiveRouter';
import { ROUTER_INSTRUCTION, ROUTER_BLOCK_B } from './routerInstruction';

export const ROUTER_MODEL = 'gemini-3.8-live';
export const INSTRUCTION_SHA256 = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
export const BLOCK_B_SHA256 = 'e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8';
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
/** Checked once at module load (spec 4.1); a mismatch makes start() refuse, so the flag has no effect. */
export const ROUTER_SHAS_OK = sha256(ROUTER_INSTRUCTION) === INSTRUCTION_SHA256 && sha256(ROUTER_BLOCK_B) === BLOCK_B_SHA256;
export const buildRouterSystem = (context: string): string => `${ROUTER_INSTRUCTION}\n\n${context}\n\n${ROUTER_BLOCK_B}`;

export type RouterEndKind = 'generationComplete' | 'turnComplete' | 'interrupted' | 'closed';
export interface RouterTurnEvent { seq: number; text: string; firstTextAt: number; completed: boolean; endKind?: RouterEndKind; endedAt?: number; afterComplete?: boolean }
export interface RouterSessionOpts { getApiKey: () => string | undefined; getContext: () => string; connectFn?: LiveConnectFn; model?: string; log?: (line: string) => void; now?: () => number; shasOk?: boolean }

// The ear's constants (GeminiLiveRouter.ts 197-210), spec 4.1.
const QUICK_RECONNECT_ATTEMPTS = 3, RECONNECT_BASE_DELAY_MS = 300, SLOW_RETRY_INTERVAL_MS = 15_000;
const QUOTA_BACKOFF_BASE_MS = 5_000, QUOTA_BACKOFF_MAX_MS = 60_000;

const defaultConnect: LiveConnectFn = async ({ apiKey, model, config, callbacks }) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleGenAI } = require('@google/genai');
  return new GoogleGenAI({ apiKey, apiVersion: 'v1beta' }).live.connect({ model, config, callbacks });
};

export class LiveRouterSession extends EventEmitter {
  private generation = 0;
  private session: LiveSessionLike | null = null;
  private up = false;
  private stopping = true;
  private reconnectAttempts = 0;
  private inSlowRetry = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private quotaCloses = 0;
  private context: string | null = null;
  private connectStartedAt = 0;
  private seq = 0;
  private cur: { seq: number; text: string; firstTextAt: number; ended: boolean; completed: boolean; endKind?: RouterEndKind; endedAt?: number } | null = null;
  private audioChunksOut = 0;
  private readonly connectFn: LiveConnectFn;
  private readonly model: string;
  private readonly log: (line: string) => void;
  private readonly now: () => number;
  private readonly shasOk: boolean;

  constructor(private readonly opts: RouterSessionOpts) {
    super();
    this.connectFn = opts.connectFn ?? defaultConnect;
    this.model = opts.model ?? ROUTER_MODEL;
    this.log = opts.log ?? ((l) => console.log(l));
    this.now = opts.now ?? Date.now;
    this.shasOk = opts.shasOk ?? ROUTER_SHAS_OK;
  }

  isUp(): boolean { return this.up; }
  contextInfo(): { sha12: string; chars: number } | null { return this.context === null ? null : { sha12: sha256(this.context).slice(0, 12), chars: this.context.length }; }

  async start(): Promise<void> {
    if (this.model !== ROUTER_MODEL) { this.log('[Router] session refused reason=model-mismatch'); return; }
    if (!this.shasOk) { this.log('[Router] session refused reason=sha-mismatch'); return; }
    this.stopping = false; this.reconnectAttempts = 0; this.inSlowRetry = false; this.quotaCloses = 0;
    await this.connect();
  }

  stop(): void {
    this.stopping = true; this.generation++;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    const s = this.session; this.session = null;
    try { s?.close(); } catch { /* already closed */ }
    this.endTurn('closed', false); this.cur = null;
    this.setUp(false);
    this.context = null; // cached once per meeting (spec 4.1a); the next meeting rebuilds it
  }

  write(chunk: Buffer, sampleRate: number, numChannels = 1): void {
    if (!this.up || !this.session) return; // no gap buffer, no replay (spec 4.1)
    try {
      const pcm = resampleTo16kMono(chunk, sampleRate, numChannels);
      if (pcm.length) this.session.sendRealtimeInput({ audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
    } catch (err: any) { console.warn('[Router] write failed:', err?.message ?? err); }
  }

  private setUp(up: boolean): void {
    if (this.up === up) return;
    this.up = up; this.emit('state', { up, at: this.now() });
  }

  private async connect(): Promise<void> {
    if (this.stopping) return;
    const gen = ++this.generation;
    const apiKey = this.opts.getApiKey();
    if (!apiKey) { this.handleClose({ reason: 'no Gemini API key' }, gen); return; }
    if (this.context === null) { try { this.context = this.opts.getContext() ?? ''; } catch { this.context = ''; } }
    const ctx = this.context;
    this.log(`[Router] session connect model=${this.model} block_sha12=${BLOCK_B_SHA256.slice(0, 12)} instruction_sha12=${INSTRUCTION_SHA256.slice(0, 12)} context_sha12=${sha256(ctx).slice(0, 12)} context_chars=${ctx.length}`);
    this.connectStartedAt = this.now();
    try {
      const session = await this.connectFn({
        apiKey, model: this.model,
        config: {
          responseModalities: ['AUDIO'],
          systemInstruction: { parts: [{ text: buildRouterSystem(ctx) }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
          onopen: () => { /* up comes at setupComplete only */ },
          onmessage: (msg) => { if (gen === this.generation) this.handleMessage(msg); },
          onerror: (e: any) => { console.warn('[Router] ws error:', e?.message ?? e); },
          onclose: (e: any) => this.handleClose(e, gen),
        },
      });
      if (this.stopping || gen !== this.generation) { try { session.close(); } catch { /* noop */ } return; }
      this.session = session;
    } catch (err: any) {
      this.handleClose({ reason: err?.message ?? String(err) }, gen);
    }
  }

  private handleMessage(msg: any): void {
    const sc = msg?.serverContent;
    if (this.quotaCloses && (sc || msg?.setupComplete)) this.quotaCloses = 0;
    if (msg?.setupComplete) {
      this.reconnectAttempts = 0; this.inSlowRetry = false;
      this.log(`[Router] session up setup_ms=${this.now() - this.connectStartedAt}`);
      this.setUp(true);
    }
    if (msg?.goAway) {
      const s = this.session; this.session = null; this.generation++; // its own onclose is now stale
      try { s?.close(); } catch { /* noop */ }
      this.endTurn('closed', false); this.cur = null; this.setUp(false);
      this.scheduleReconnect('goAway');
      return;
    }
    const text = sc?.outputTranscription?.text;
    if (text) this.onText(String(text));
    for (const p of sc?.modelTurn?.parts ?? []) if (p?.inlineData) this.audioChunksOut++; // counted, discarded
    if (sc?.generationComplete) this.endTurn('generationComplete', true);
    if (sc?.turnComplete) { this.endTurn('turnComplete', true); this.cur = null; }
    if (sc?.interrupted) { this.endTurn('interrupted', false); this.cur = null; }
  }

  private onText(t: string): void {
    if (!this.cur) this.cur = { seq: ++this.seq, text: '', firstTextAt: this.now(), ended: false, completed: false };
    const c = this.cur; c.text += t;
    if (c.ended) this.emit('turn', { seq: c.seq, text: c.text, firstTextAt: c.firstTextAt, completed: c.completed, endKind: c.endKind, endedAt: c.endedAt, afterComplete: true } as RouterTurnEvent);
    else this.emit('turn', { seq: c.seq, text: c.text, firstTextAt: c.firstTextAt, completed: false } as RouterTurnEvent);
  }

  private endTurn(kind: RouterEndKind, completed: boolean): void {
    const c = this.cur; if (!c || c.ended) return;
    c.ended = true; c.completed = completed; c.endKind = kind; c.endedAt = this.now();
    this.emit('turn', { seq: c.seq, text: c.text, firstTextAt: c.firstTextAt, completed, endKind: kind, endedAt: c.endedAt } as RouterTurnEvent);
  }

  private handleClose(e: any, gen: number): void {
    const stale = gen !== this.generation;
    const reason = e?.reason ? String(e.reason) : 'connection closed';
    const quota = /quota|resource_exhausted/i.test(reason);
    this.log(`[Router] session close gen=${gen} code=${e?.code ?? '-'} reason=${reason} stale=${stale ? 'yes' : 'no'} quota=${quota ? 'yes' : 'no'}`);
    if (stale) return;
    this.session = null; this.endTurn('closed', false); this.cur = null; this.setUp(false);
    if (this.stopping) return;
    if (quota) {
      this.quotaCloses++;
      const delay = Math.min(QUOTA_BACKOFF_MAX_MS, QUOTA_BACKOFF_BASE_MS * 2 ** (this.quotaCloses - 1));
      this.log(`[Router] session reconnect attempt=quota-${this.quotaCloses} reason=quota backoff ${delay}ms`);
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; void this.connect(); }, delay);
      this.reconnectTimer.unref?.();
      return;
    }
    this.scheduleReconnect(reason);
  }

  private scheduleReconnect(reason: string): void {
    if (this.stopping || this.reconnectTimer) return;
    if (this.reconnectAttempts >= QUICK_RECONNECT_ATTEMPTS) {
      if (!this.inSlowRetry) { this.inSlowRetry = true; this.emit('failed', { reason }); } // once, on the transition
      this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; void this.connect(); }, SLOW_RETRY_INTERVAL_MS);
      this.reconnectTimer.unref?.();
      return;
    }
    this.reconnectAttempts++;
    this.log(`[Router] session reconnect attempt=${this.reconnectAttempts} reason=${reason}`);
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; void this.connect(); }, RECONNECT_BASE_DELAY_MS * this.reconnectAttempts);
    this.reconnectTimer.unref?.();
  }
}
```

- [ ] **Step 5: Write the failing profile-summary tests** (`KnowledgeOrchestrator.routerProfile.test.ts`). Use a fake db: `{ initializeSchema(){}, getDocumentByType(t){ return t === 'resume' ? resumeDoc : jdDoc } }`, plus whatever the constructor's dependencies need. If construction pulls in heavy modules, `vi.mock` them; read the imports at KnowledgeOrchestrator.ts:1–19 first. Check the DocType enum values in `types.ts`. Cases:
  - **Off.** Knowledge mode off: `''`.
  - **No resume.** `''`.
  - **Full.** Mode on, name "Ada Lovelace", experience[0].role "ML Engineer", 20 skills, a JD present: exactly 3 lines. The first is `Candidate: Ada Lovelace, ML Engineer.`, the second `Skills: s1, …, s15.` (15 entries), and the third `Target role: ${getCompactJDHeader()}`.
  - **Name only.** No role: `Candidate: Ada Lovelace.`
  - **Missing data.** No skills and no JD: one line only.
- [ ] **Step 6: Implement**, after `getCompactJDHeader()`:

```ts
/** Spec 4.1a (user ruling A): a fixed profile summary for the 3.8 router's CONTEXT. Deterministic, no model call. */
getRouterProfileSummary(): string {
    if (!this.isKnowledgeMode() || !this.activeResume) return '';
    const r = this.activeResume.structured_data as StructuredResume;
    const lines: string[] = [];
    const who = [r?.identity?.name?.trim(), r?.experience?.[0]?.role?.trim()].filter(Boolean);
    if (who.length) lines.push(`Candidate: ${who.join(', ')}.`);
    const skills = (r?.skills ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 15);
    if (skills.length) lines.push(`Skills: ${skills.join(', ')}.`);
    const jd = this.getCompactJDHeader();
    if (jd) lines.push(`Target role: ${jd}`);
    return lines.join('\n');
}
```

- [ ] **Step 7: Run both test files and the tsc gate.** All pass, with no new tsc errors.
- [ ] **Step 8: Commit:** `feat(router): LiveRouterSession (3.8 Live, router40 setup, generation-gated) and the router's profile summary`.

---

### Task 3: Live probe of 3.8 on the built module (Lane A, 45 min) — checkpoint 1

**Spec:** §9.3.

**Deviation, for the controller and the registration to record.** §9.3 asks the probe to check "the cached profile summary is non-empty with knowledge mode on". A standalone script cannot build that summary: `KnowledgeOrchestrator` needs the Electron `DatabaseManager` (`app.getPath`).
- The probe therefore feeds a fixed fixture summary string (the 3-line output of Task 2's Full test). With it the probe proves the instruction composition and `context_sha12` stability across a forced reconnect.
- The non-empty in-app summary is proven by the smoke (Task 17: `context_chars > 0` on every `[Router] session connect` line) and by Task 2's unit tests.

**Files:**
- Create: `LAB\live-probe.mjs`
- Create: `LAB\register-once.ps1`. It is a small generic one-shot task registrar: interactive, StartWhenAvailable false, read back, never started by hand. Model it on `SP\flight-eq\register-eq.ps1`'s read-back block, and save it UTF-8 with BOM.
- Output: `LAB\live-probe.out.txt`

**Interfaces:**
- Consumes: `<WT>\dist-electron\electron\audio\LiveRouterSession.js` (the path Task 0 step 6 recorded), `GeminiLiveRouter.js` (`resampleTo16kMono`), and `LAB\..\live40\clips\{RE05,RE13,RH02,RH16}.wav` (24 kHz mono, sha12 checked against `manifest.json`).
- Reads the key from `<MAIN>\.env` in-process, with router40's reader pattern (the names only are printed).

- [ ] **Step 1: Write `live-probe.mjs`.** It must do the following.
  1. **Load and assert.** `require` the built module via `createRequire`. Assert `ROUTER_MODEL === 'gemini-3.8-live'` and `ROUTER_SHAS_OK === true`, and print the two sha12s.
  2. **Construct the session.** `new LiveRouterSession({ getApiKey, getContext: () => FIXTURE, connectFn: wrap(realConnect), log: (l) => lines.push(l) })`. Here `wrap` keeps a handle on the real session object, so the probe can call its `close()` once to force a real reconnect.
  3. **Play the clips.** `start()`. Wait for `state up` (fail after 15 s). Then, per clip in order RE05, RH02, RE13, RH16:
     - send the clip's PCM resampled to 16 kHz, in 60 ms chunks at real time, followed by 1.5 s of silence;
     - then wait until the router turn ends, or 12 s;
     - record `firstTextMs` (from clip end), the first-word-complete ms, `endKind`, the words, and the reader verdicts from the built `routeReader.js`.
     - After clip 2, call the captured real session's `close()` and wait for `state up` again (fail after 15 s).
  4. **Print.** Ids, classes, ms, routes, reasons and word counts only, never the text. Print all `[Router] session …` lines, which hold shas and chars only.
  5. **Verdict.** `PROBE PASS` (exit 0) iff:
     - both connects logged the same `context_sha12`, and `context_chars` equals FIXTURE.length;
     - there are 2 `session up` lines;
     - every clip produced a router turn with an end event;
     - at least one EASY clip read `easy-answer`, which proves streaming plus a valid answer end to end.
     Routing mismatches are printed as `MISMATCH id expected got` and do not fail the probe (the model is stochastic; router40 had RE09 EASY→hard). Otherwise print `PROBE FAIL <reason>` and exit 1.
- [ ] **Step 2: Dry calibration (no network).** Run with `--dry`, which swaps `realConnect` for a scripted fake that emits setupComplete, then "Docker is a …" + generationComplete for EASY and "hard" for HARD.
  - Expected: `PROBE PASS`.
  - Then `--dry --dry-break-sha`, where the fake's second connect reports a different context: expected `PROBE FAIL context sha changed`.
  - This is the rule-8 known-answer check.
- [ ] **Step 3: Build WT** (`cmd /c npm run build:electron` from WT) and confirm the dist files exist and are newer than their sources.
- [ ] **Step 4: Register the one-shot task** `Natively-router-probe` at now + 3 min, running `"C:\Program Files\nodejs\node.exe" "<LAB>\live-probe.mjs" > "<LAB>\live-probe.out.txt" 2>&1`. Read the task back as Ready. Do NOT start it by hand.
- [ ] **Step 5: After it runs, read `live-probe.out.txt`.** Record PASS or FAIL in `LAB\CHECKPOINTS.md` with the time. On FAIL, run checkpoint 1: STOP and report.
- [ ] **Step 6: Commit nothing to the repo.** The probe lives in LAB. Delete the one-shot task after reading it.

---

### Task 4: Route reader + router40 fixtures (Lane B, 30 min)

**Spec:** §4.2, §9.1 (reader cases and the 47-output counts).

**Files:**
- Create: `LAB\make-router40-fixtures.mjs`, which writes `stage\T4\electron\services\fixtures\router40-answers.json` and `router40-replay.json`
- Create: `electron/services/routeReader.ts`, `electron/services/routeReader.test.ts`

**Interfaces:**
- Produces (exact):
  - `MAX_WORDS = 80`, `MIN_WORDS = 8`;
  - `tokensOf(text): string[]`, `lettersOnly(tok): string`, `isHardWord(tok): boolean`, `isCleanHard(tok): boolean`;
  - `completeFirstWord(text: string, ended: boolean): string | null`;
  - `routeFirstWord(word: string): { route: 'hard' | 'live'; reason: '-' | 'garbled-hard' }`;
  - `hasMarker(text): boolean`;
  - `type CheckReason = '-' | 'marker' | 'too-long' | 'incomplete' | 'incomplete-after-show' | 'too-short'`;
  - `checkCompleted(text, completed, ended, shown?: boolean): { ok: boolean; reason: CheckReason; words: number }`;
  - `decisionRoute(text, completed, ended): 'hard' | 'easy-answer' | 'invalid'`;
  - `showablePrefix(text: string, ended: boolean): { prefix: string; stop: null | 'marker' | 'too-long' }`.

- [ ] **Step 1: Make the fixtures.**
  - `router40-answers.json`: `[{ id, route, class, text }]` for the 47 items of `SP\router40\runs\router40-R.answers.json` `.answers`, **excluding `RH05~a1`**.
  - `router40-replay.json`: for each of the same 47 items, `{ id, route, text, chunks: [{ atMs, text }], generationCompleteMs, turnCompleteMs }`, read from `router40-R.json`.
    - `atMs` is the outputTx `sinceClipEnd`.
    - Each chunk's text is `text.slice(cum, cum + chars)` over the outputTx events with `sinceClipEnd >= 0`, in order.
    - The script asserts that the summed chars equal `text.length` per item, and prints any item where they differ (expected 0).
  - Apply the stage.
- [ ] **Step 2: Write the failing tests.**

```ts
import fixtures from './fixtures/router40-answers.json';
import { completeFirstWord, routeFirstWord, checkCompleted, isHardWord, decisionRoute, showablePrefix } from './routeReader';

describe('routeReader on router40\'s 47 real outputs (spec 9.1, binding counts)', () => {
  const read = fixtures.map((f: any) => ({ ...f, fw: completeFirstWord(f.text, true)!, r: routeFirstWord(completeFirstWord(f.text, true)!) }));
  it('27 hard, all one-token; 25 clean, 2 garbled (RH08, RH10)', () => {
    const hard = read.filter((x) => x.r.route === 'hard');
    expect(hard).toHaveLength(27);
    expect(hard.every((x) => x.text.trim().split(/\s+/).length === 1)).toBe(true);
    expect(hard.filter((x) => x.r.reason === 'garbled-hard').map((x) => x.id).sort()).toEqual(['RH08', 'RH10']);
  });
  it('20 live: the 19 EASY answers (RE18 included) plus RH05, all checkCompleted ok, 30-71 words', () => {
    const live = read.filter((x) => x.r.route === 'live');
    expect(live).toHaveLength(20);
    expect(live.filter((x) => x.route === 'EASY')).toHaveLength(19);
    expect(live.map((x) => x.id)).toContain('RE18');
    expect(live.map((x) => x.id)).toContain('RH05');
    for (const x of live) { const c = checkCompleted(x.text, true, true); expect(c.ok, x.id).toBe(true); expect(c.words).toBeGreaterThanOrEqual(30); expect(c.words).toBeLessThanOrEqual(71); }
  });
});

describe('routeReader edge cases (spec 9.1)', () => {
  it.each(['hard.hard', '"hard"', 'Hard.', 'hardhard', 'hard".hard".hard', 'hard'])('%s is a hard word', (w) => expect(isHardWord(w)).toBe(true));
  it('hardware is not a hard word', () => expect(isHardWord('hardware')).toBe(false));
  it('"hard" as the 36th word does not route hard', () => {
    const t = Array.from({ length: 35 }, (_, i) => `w${i}`).join(' ') + ' hard and more words here';
    expect(routeFirstWord(completeFirstWord(t, true)!).route).toBe('live');
  });
  it('a first word split across chunks is not complete until whitespace or end', () => {
    expect(completeFirstWord('Mut', false)).toBeNull();
    expect(completeFirstWord('Mutable is', false)).toBe('Mutable');
    expect(completeFirstWord('hard', false)).toBeNull();
    expect(completeFirstWord('hard', true)).toBe('hard');
    expect(completeFirstWord('', true)).toBeNull();
  });
  it('markers', () => {
    for (const t of ['a <b> c d e f g h', 'x [y] z a b c d e', 'one __CUES__ two three four five six seven']) expect(checkCompleted(t, true, true).reason).toBe('marker');
  });
  it('7/8/80/81 words', () => {
    const w = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
    expect(checkCompleted(w(7), true, true).reason).toBe('too-short');
    expect(checkCompleted(w(8), true, true).ok).toBe(true);
    expect(checkCompleted(w(80), true, true).ok).toBe(true);
    expect(checkCompleted(w(81), true, true).reason).toBe('too-long');
    expect(checkCompleted(w(81), false, false).reason).toBe('too-long');  // decidable while streaming
    expect(checkCompleted(w(7), false, false).ok).toBe(true);             // too-short only once ended
  });
  it('cut text', () => {
    const t = Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ');
    expect(checkCompleted(t, false, true).reason).toBe('incomplete');
    expect(checkCompleted(t, false, true, true).reason).toBe('incomplete-after-show');
  });
  it('Heart. is row 4 too-short and routes live, never hard', () => {
    expect(isHardWord('Heart.')).toBe(false);
    expect(checkCompleted('Heart.', true, true).reason).toBe('too-short');
    expect(decisionRoute('Heart.', true, true)).toBe('invalid');
  });
  it('decisionRoute', () => {
    expect(decisionRoute('hard', true, true)).toBe('hard');
    expect(decisionRoute('', true, true)).toBe('invalid');
  });
  it('showablePrefix stops before the marker token and at the 81st word; streaming shows complete tokens only (Review Focus 3)', () => {
    expect(showablePrefix('alpha beta __fo', false)).toEqual({ prefix: 'alpha beta ', stop: null });
    expect(showablePrefix('alpha beta __foo__ gamma', false)).toEqual({ prefix: 'alpha beta ', stop: 'marker' });
    const w81 = Array.from({ length: 81 }, (_, i) => `w${i}`).join(' ');
    expect(showablePrefix(w81, true).prefix.trim().split(/\s+/)).toHaveLength(80);
    expect(showablePrefix(w81, true).stop).toBe('too-long');
    expect(showablePrefix('alpha beta', true)).toEqual({ prefix: 'alpha beta', stop: null });
  });
});
```

- [ ] **Step 3: Run, and confirm the failures** (the module does not exist).
- [ ] **Step 4: Implement `routeReader.ts`.**

```ts
/** Spec 4.2. Pure: no clock, no I/O. */
export const MAX_WORDS = 80;
export const MIN_WORDS = 8;
const MARKER_RE = /[<>\[\]]|__\S+?__/;

export function tokensOf(text: string): string[] { const t = text.trim(); return t ? t.split(/\s+/) : []; }
export function lettersOnly(tok: string): string { return tok.toLowerCase().replace(/[^a-z]/g, ''); }
export function isHardWord(tok: string): boolean { return /^(hard)+$/.test(lettersOnly(tok)); }
export function isCleanHard(tok: string): boolean { return lettersOnly(tok) === 'hard'; }

/** The first token once it is complete: whitespace follows it, or the turn has ended. */
export function completeFirstWord(text: string, ended: boolean): string | null {
    const m = /^\s*(\S+)(\s)?/.exec(text);
    if (!m) return null;
    return m[2] !== undefined || ended ? m[1] : null;
}

export function routeFirstWord(word: string): { route: 'hard' | 'live'; reason: '-' | 'garbled-hard' } {
    if (!isHardWord(word)) return { route: 'live', reason: '-' };
    return { route: 'hard', reason: isCleanHard(word) ? '-' : 'garbled-hard' };
}

export function hasMarker(text: string): boolean { return MARKER_RE.test(text); }

export type CheckReason = '-' | 'marker' | 'too-long' | 'incomplete' | 'incomplete-after-show' | 'too-short';
/** The first failing row wins (spec 4.2 table). `shown` picks incomplete vs incomplete-after-show. */
export function checkCompleted(text: string, completed: boolean, ended: boolean, shown = false): { ok: boolean; reason: CheckReason; words: number } {
    const words = tokensOf(text).length;
    if (hasMarker(text)) return { ok: false, reason: 'marker', words };
    if (words > MAX_WORDS) return { ok: false, reason: 'too-long', words };
    if (ended && !completed) return { ok: false, reason: shown ? 'incomplete-after-show' : 'incomplete', words };
    if (ended && words < MIN_WORDS) return { ok: false, reason: 'too-short', words };
    return { ok: true, reason: '-', words };
}

export function decisionRoute(text: string, completed: boolean, ended: boolean): 'hard' | 'easy-answer' | 'invalid' {
    const w = completeFirstWord(text, ended);
    if (w === null) return 'invalid';
    if (isHardWord(w)) return 'hard';
    return ended && checkCompleted(text, completed, ended).ok ? 'easy-answer' : 'invalid';
}

/**
 * What may be on screen: the text before the first token carrying a marker, at most 80 words, and,
 * while streaming, complete tokens only (a token still arriving may yet turn out to carry a marker).
 */
export function showablePrefix(text: string, ended: boolean): { prefix: string; stop: null | 'marker' | 'too-long' } {
    const re = /\S+/g; let m: RegExpExecArray | null; let n = 0;
    while ((m = re.exec(text))) {
        n++;
        if (MARKER_RE.test(m[0])) return { prefix: text.slice(0, m.index), stop: 'marker' };
        if (n > MAX_WORDS) return { prefix: text.slice(0, m.index), stop: 'too-long' };
    }
    if (ended) return { prefix: text, stop: null };
    const lastWs = Math.max(text.lastIndexOf(' '), text.lastIndexOf('\n'), text.lastIndexOf('\t'));
    return { prefix: lastWs >= 0 ? text.slice(0, lastWs + 1) : '', stop: null };
}
```

  The marker test on a token that is still arriving: `"__fo"` passes, but it is excluded by the complete-token rule. When it completes as `"__foo__"`, the marker rule stops before it.
- [ ] **Step 5: Run.** Expected: PASS, including the binding counts (27 / 25+2 / 20). A count that differs is a STOP: report it to the controller; never edit the expected numbers.
- [ ] **Step 6: Commit:** `feat(router): route reader with router40's 47 real outputs as binding fixtures`.

---

### Task 5: Arbiter, pure core (Lane B, 120 min) — the riskiest task

**Spec:** §4.3 (all of it), §4.5 cases A–E (main side), §4.6, §5 (decision line, capture lines), §6.

**Files:**
- Create: `electron/services/routerArbiter.ts`, `electron/services/routerArbiter.test.ts`
- Create: `electron/services/routerDiag.ts` (tiny; tested through the arbiter)

**Interfaces:**
- Consumes (Task 4): `completeFirstWord`, `routeFirstWord`, `isHardWord`, `checkCompleted`, `decisionRoute`, `showablePrefix`, `tokensOf`.
- Consumes (Task 9): `createUnknownMarkerStripper(): { push(s: string): string; flush(): string }`. If Task 9 has not landed, stage a copy of Task 9's file inside this task's stage. Both tasks own the same file content, verbatim from Task 9.
- Produces (exact; Task 10 wires these):

```ts
export type QSrc = 'vad' | 'final';
export type Origin = 'live' | 'pipeline';
export type RouterEndKind = 'generationComplete' | 'turnComplete' | 'interrupted' | 'closed' | 'cap';
export interface RouterTurnIn { seq: number; text: string; firstTextAt: number; completed: boolean; endKind?: RouterEndKind; endedAt?: number; afterComplete?: boolean }
export interface TokenPayload { token: string; question: string; confidence: number; replace: boolean; cues?: string[]; turnId?: number; origin?: Origin; append?: true; label?: '(full answer)' }
export interface FinalPayload { answer: string; question: string; confidence: number; replace: boolean; turnId?: number; origin?: Origin; append?: true }
export type Outbound = { ch: 'token'; p: TokenPayload } | { ch: 'final'; p: FinalPayload } | { ch: 'source'; label: string; turnId?: number };
export type PipelineIn =
  | Outbound
  | { ch: 'end'; turnId: number; kind: 'completed' | 'aborted' | 'failed' }
  | { ch: 'history'; turnId: number; text: string; question?: string };
export interface ArbiterDeps {
  enabled: boolean;
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(h: unknown): void;
  send(o: Outbound): void;                         // to the renderer
  addHistory(text: string, question?: string): void;
  diag(line: string): void;                        // [Router] decision/dispatch lines
  capture(line: string): void;                     // [RouterAnswer] lines
}
export class RouterArbiter {
  constructor(deps: ArbiterDeps);
  turnOpened(id: number, at: number): void;
  turnClosed(id: number, at: number): void;
  turnDispatched(id: number, at: number, q: number, qSrc: QSrc): void;   // once per turn, on its first answer dispatch
  setRouterUp(up: boolean, at: number): void;
  setEar(model: '3.1' | '2.5'): void;
  routerTurn(ev: RouterTurnIn): void;
  forward(ev: PipelineIn): void;
  dispatchCount(): number;
}
export const LIVE_LABEL = 'gemini-3.8-live';
```

**Behaviour, which the tests below pin down (implement exactly this):**

1. **`enabled: false`.**
   - `forward` passes every Outbound to `send` unchanged.
   - `history` becomes `addHistory(text, question)`, as today.
   - `end` is ignored.
   - The other methods do nothing and no lines are written.
2. **Events with no `turnId`** pass straight through, even when enabled.
3. **Turn records.**
   - A turn record holds `id, openedAt, closedAt, dispatchedAt, q, qSrc`, the router state and the ear at Q, `routerTurns[]`, `decider`, `decision`, the held pipeline Outbounds, the pipeline source label, the pipeline text, `pipeFirstAt`, `pipeEndAt`, `pipeEndKind`, `historyText`, the Live display state, and `appended` / `superseded` / `lineWritten`.
   - Keep at most the last 50 turns (a linear scan, fine at ~50 turns per run). Drop older ones once their line is written.
4. **Pairing** (`routerTurn` with an unseen `seq`, at `F = ev.firstTextAt`):
   - Pair with the turn that is open at F (`openedAt <= F` and `closedAt === null || closedAt > F`).
   - Otherwise pair with the most recently closed turn, if `F - closedAt <= 2000`.
   - Otherwise the router turn is unpaired.
   - A router turn paired to a turn that closes with `dispatchedAt === null` becomes unpaired at that close.
   - An unpaired router turn is never shown. It gets one line when it ends: `[Router] turn=- route=<decisionRoute> reason=unpaired live_first_ms=- live_words=<n> shown=- shadow=- ear=<e> router=<r> q_src=- q_at=-`.
5. **Deciding turn (I2)**, chosen at `turnDispatched`:
   - Discard (as `dup`) the paired router turns with `endKind === 'interrupted' && endedAt < dispatchedAt`.
   - Of the rest with `firstTextAt <= dispatchedAt`, the LAST one decides.
   - If there is none, the first paired router turn that arrives with `firstTextAt > dispatchedAt` decides.
   - Every other paired router turn is `dup`. A dup gets its own line when it ends: `reason=dup shown=-`, with `route=` its `decisionRoute`.
6. **`W`** is `now()` at the first `routerTurn` update for the decider where `completeFirstWord(text, ended)` is non-null. Store it once.
7. **`tryDecide(t)`** is called on dispatch, on every decider update, and by the deadline timer. The dispatch arms the timer at `max(0, q + 2000 - now())`.

```
if (t.decision || t.dispatchedAt === null) return;
if (!t.routerUpAtQ)                                  -> decide row 1 (pipeline, reason router-down)
const d = t.decider;  const deadline = t.q + 2000;
if (!d || d.W === null || d.W > deadline) { if (now() >= deadline) decide row 2 (pipeline, invalid, reason resolved at line time); return; }
const fw = completeFirstWord(d.text, d.ended)!;
if (isHardWord(fw))                                  -> row 3 (pipeline, hard, routeFirstWord(fw).reason)
const c = checkCompleted(d.text, d.completed, d.ended, false);
if (!c.ok)                                           -> row 4 (pipeline, invalid, c.reason)   // I1, Heart. included
else                                                 -> row 5 (live)   V = max(d.W, t.dispatchedAt)
```

   Every call site runs at `now() >= max(W, dispatch)`, so the decision time IS V.

8. **Rows 1–4 (case A).**
   - Release the held Outbounds in their original order, each with `turnId`, `origin: 'pipeline'`.
   - Later pipeline events for the turn pass through with the same tags.
   - A pending `history` becomes `addHistory`.
9. **Row 5, Live (case B).**
   - `send({ch:'source', label: LIVE_LABEL, turnId})`.
   - Then, on every decider update (and right now), compute `showablePrefix(d.text, d.ended)`. Pass the not-yet-shown part of `prefix` through the turn's own `createUnknownMarkerStripper().push(delta)`, and send the result as a token `{ token, question, confidence, replace: false, turnId, origin: 'live' }`. `question` and `confidence` come from the turn's first held pipeline token, or `''` and `1` if none has arrived yet.
   - Arm the cap timer at `q + 10000 - now()`.
10. **Live display end.**
    - **(a) `stop !== null`** (marker / too-long): stop the display at once and append with that reason.
    - **(b) The decider ends.** Compute `checkCompleted(d.text, d.completed, true, true)`.
      - `ok`: flush the stripper; send the Live final `{ answer: shownText, …, origin: 'live' }`; `addHistory(shownText, question)`; write the `live` capture line.
      - Otherwise: append with its reason (`incomplete-after-show` or `too-short`; `marker` / `too-long` when the final text shows them).
    - **(c) The cap timer fires and the decider has not ended.** Mark it ended with `endKind 'cap'`, ignore its later events, and append with `incomplete-after-show`.
11. **Append (case C).** In this order:
    1. the Live final with the text as shown;
    2. `addHistory(shownText)`;
    3. the `live` capture line;
    4. the pipeline source (`send({ch:'source', label: t.pipeSource ?? 'pipeline', turnId})`) if one was held;
    5. the held pipeline tokens with `append: true, origin: 'pipeline'`, and `label: '(full answer)'` on the first;
    6. the held final, if any, with `append: true`.
    - Later pipeline events pass with `append: true`.
    - The pipeline history text (now or when it arrives) becomes `addHistory(text)`, after the Live entry.
    - Record `t.appendReason`.
12. **Hidden shadow (case D).** Pipeline events stay held (for a possible append) and are never sent. `history` is stored, not added.
13. **Supersede (case E; Review Focus 4).** A pipeline token with `replace: true` for the turn:
    - **Decision pending:** clear the turn's held tokens and final, then hold the new stream, keeping `replace: true` on its first token.
    - **Live shown and not ended:** stop the Live display (no more Live tokens and no Live final), set `superseded`, and do not add the Live text to the history.
    - **Live shown** (ended or not): forward the replacing stream and its final with `origin: 'pipeline'` and their `replace` flags.
    - **Pipeline or appended:** forward.
    - Reset the pipeline text accumulators on a replace.
    - After a supersede, the pipeline `history` becomes `addHistory`.
14. **Aborted pipeline** (`end` with `kind 'aborted' | 'failed'` and no final): mark the pipe ended. It still counts for the line and for the shadow capture (with the text streamed so far).
15. **Capture lines** (`deps.capture`), written once each:
    - `live`, at the Live final;
    - `shadow`, at pipeline end, when shown=live and not appended (text = `historyText ?? streamed text`);
    - `appended`, at pipeline end or at append time, whichever is later.
    - Format: `[RouterAnswer] ` + `JSON.stringify({ turn, kind, text, words: tokensOf(text).length, firstMs, endMs, q_src })`.
    - For `live`, `firstMs = V − q` and `endMs = (end time) − q`. For pipeline kinds, `firstMs = pipeFirstAt − q` and `endMs = pipeEndAt − q`.
16. **The decision line** (`deps.diag`) is written once, when all of these hold:
    - a decision exists;
    - the pipeline has ended;
    - every paired router turn has ended, or the turn is closed.

```
[Router] turn=<id> route=<r> reason=<x> live_first_ms=<n|-> live_words=<n|-> shown=<live|pipeline> shadow=<pipeFirstAt-dispatchedAt|-> ear=<3.1|2.5> router=<up|down> q_src=<vad|final> q_at=<q epoch ms>
```

    - `route`:
      - row 1: `decisionRoute` of the first paired router turn, or `invalid` if there is none;
      - row 2: `invalid`;
      - row 3: `hard`;
      - row 4: `invalid`;
      - row 5: `easy-answer` if not appended, otherwise `invalid`.
    - `reason` (row 2): `late` if any paired router turn has `W` after the deadline or arrived after it; otherwise `no-router-turn`.
    - `live_first_ms`: `V−q` on shown=live; `W−q` if the decider has a `W`; otherwise `-`.
    - `live_words`: the words of the decider's final text, or `-`.
    - **[plan choice]** `q_at` is appended so that the hour reader can attribute lines to play windows. `shadow` is measured from the dispatch: dispatch → generateStream invoked is 5 ms p50 (DIAG Q2). dup and unpaired lines carry `shown=-`, so that the hour reader never counts them as decisions.
17. **Dispatch line** (`deps.diag`), at `turnDispatched`: `[Router] dispatch turn=<id> at=<ms> q_at=<ms> q_src=<…> router=<up|down> ear=<3.1|2.5>` **[plan choice]**. The hour reader needs it for "dispatched turns with no decision line".
18. **`dispatchCount()`** counts `turnDispatched` calls.

**`routerDiag.ts`:**

```ts
import * as fs from 'fs'; import * as path from 'path';
const DIAG_LOG = path.join(process.cwd(), 'verbal-diag.log');
/** Router lines: the debug log (console) and, from the Electron main process only, verbal-diag.log (same guard as WhatToAnswerLLM.diagLog, ce4e730). */
export function routerDiag(line: string): void {
  console.log(line);
  if (process.type !== 'browser') return;
  try { fs.appendFileSync(DIAG_LOG, `[${new Date().toISOString()}] ${line}\n`); } catch { /* never break the stream */ }
}
```

- [ ] **Step 1: Write the test harness and the failing tests.** Use a fake clock with timers: `now` = a variable; `setTimer` pushes `{at, fn}`; `advance(ms)` runs due timers in order. Collect `sent`, `history`, `diag` and `capture`. Helpers: `tok(turnId, t, extra?)`, `fin(turnId, a)`, `src(turnId, l)`, `end(turnId, kind)`, `hist(turnId, text)`, `rt(seq, text, F, extra?)`. **Required tests**, one `it` each, each asserting the exact `sent` sequence (channel, origin, append, label, replace, turnId) plus the line fields:
  - **Flag off** → pass-through, identical order, history passes through.
  - **Row 1, router down at Q**: `setRouterUp(false)` before Q, then dispatch → held events released at once; line `route=invalid reason=router-down shown=pipeline router=down`.
  - **Row 2, `no-router-turn`**: no router turn; at Q + 2000 release; line `reason=no-router-turn live_first_ms=-`.
  - **Row 2, `late`**: the router's first word complete at Q + 2173 (RH07's shape) → pipeline; line `reason=late live_first_ms=2173`.
  - **Row 3**: `"hard"` ended at Q + 600 → pipeline + cues released (the first token's `cues` preserved); `route=hard reason=-`.
  - **Row 3**: `'hard".hard".hard'` → `reason=garbled-hard`.
  - **Row 4, each cause**: `"Heart."` ended (too-short); a marker in the first chunk (`"<b> x y z …"`); 81 words before V; an ended interrupted turn with 20 words (`incomplete`). Each is pipeline shown, and no `origin:'live'` event is ever sent.
  - **Row 5, case B**: chunks `"Docker is "` (Q+800), `"a container runtime … (40 words)"`, generationComplete. Expect:
    - the source `gemini-3.8-live`;
    - live tokens of complete tokens only;
    - one Live final whose `answer` equals the concatenated tokens;
    - pipeline tokens, final and source never sent;
    - history = `[Live text]` only (the shadow's `hist` not added);
    - capture lines `live` then `shadow` (after `end`);
    - line `route=easy-answer reason=- shown=live live_first_ms=<V−Q>`.
  - **No display before dispatch**: the router's first word at Q + 300 with the dispatch at Q + 1200 → the first live token is sent at Q + 1200, not before; `live_first_ms=1200`.
  - **Partial token never displayed (Review Focus 3)**: chunk `"alpha beta __fo"` → only `"alpha beta "` sent; then `"o__ gamma"` → stop at marker, append.
  - **Append, marker after V**: the stop at the marker token; the sequence is Live tokens → Live final (text as shown) → pipeline source → held tokens (`append:true`, first with `label:'(full answer)'`) → pipeline final `append:true`; history = `[Live shown, pipeline]`; capture `live`, `appended`; line `shown=live route=invalid reason=marker`.
  - **Append, too-long**: the stop at the 81st word, shown = 80 words exactly.
  - **Append, too-short after show**: 5 words, then generationComplete → `reason=too-short`, append.
  - **Append, `incomplete-after-show`**: the turn ends `interrupted` after V.
  - **The 10 s cap**: the decider never ends; at Q + 10 000 → append with `incomplete-after-show`; a later decider text is ignored (no more live tokens).
  - **Pipeline ends before the decision (Review Focus 2)**: the pipeline final + `hist` + `end` all arrive at Q + 1500, the router's first word at Q + 1900 → row 5 → nothing of the pipeline is sent; the history gets nothing until the Live final.
  - **The same, with a hard first word at Q + 1900** → the held tokens and final are released in order; history = `[pipeline]` exactly once.
  - **Supersede during Live (Review Focus 4)**: Live streaming, then a pipeline `tok(replace:true)` → no further live token or Live final is sent even when the router keeps streaming; the replace token is forwarded with `origin:'pipeline', replace:true`; its final `replace:true`; history = `[replacing pipeline]` only.
  - **Supersede while the decision is pending**: the first pipeline stream held, then a replace stream → on release only the replace stream is sent, its first token keeping `replace:true`.
  - **Pairing**: an open turn; a just-closed turn at 1999 ms → paired; at 2001 ms → unpaired line `turn=-`; a router turn paired to a turn that closes without a dispatch → unpaired line, never shown.
  - **I2 interrupted early**: router turn 1 (F at Q − 3000, `interrupted` at Q − 2500), router turn 2 (F at Q + 700, complete) → turn 2 decides; turn 1's line `reason=dup`.
  - **I2 completed early**: router turn 1 completed before dispatch, router turn 2 with F before dispatch → the LAST before dispatch (turn 2) decides; turn 1 `dup`.
  - **I2 none before dispatch**: the first router turn after dispatch decides; a second is `dup`.
  - **ear = 2.5 with the router up (I5 = B)**: `setEar('2.5')`, a valid easy turn → shown=live; line `ear=2.5`.
  - **B3 interleave (Review Focus 1)**: turns 1 and 2 dispatched; pipeline events for 1 and 2 interleaved; turn 1 → live, turn 2 → hard. Expect: no pipeline event of turn 1 is sent; turn 2's events sent in their original order with `turnId:2`; turn 1's shadow capture holds only turn 1's tokens.
  - **Aborted pipeline (Review Focus 1)**: turn 1 → live; pipeline `end` `aborted` with no final → `shadow` capture with the streamed text; the line is written once the router turn has ended.
  - **The line waits for all three conditions**: no line before the pipeline end; no line while a paired router turn is still streaming (unless the turn is closed).
  - **Dispatch line and `dispatchCount()`.**
- [ ] **Step 2: Run, and confirm the failures** (the module does not exist).
- [ ] **Step 3: Implement `routerArbiter.ts` to the behaviour list above.** Keep one private method per numbered behaviour (`pair`, `chooseDecider`, `tryDecide`, `release`, `startLive`, `pumpLive`, `endLive`, `append`, `onSupersede`, `maybeWriteLine`, `writeCapture`). No other features.
- [ ] **Step 4: Run.** All PASS. Run the tsc gate.
- [ ] **Step 5: Mutation check (rule 8).** In a scratch copy, (a) change `2000` to `2500` in the deadline, and (b) remove the dispatch gate from V. Run the suite against each copy: at least one test must fail per mutant. Record the result in the commit message body.
- [ ] **Step 6: Commit:** `feat(router): arbiter: pairing, decision rows 1-5, holding, Live synthesis, append, supersede, history, capture and decision lines`.

---

### Task 6: Offline replay on router40 (Lane B, 25 min)

**Spec:** §9.2.

**Files:** Create `electron/services/routerArbiter.replay.test.ts`.

**Interfaces:**
- Consumes: `RouterArbiter`, `fixtures/router40-replay.json`.

- [ ] **Step 1: Write the test.** For each item in the fixture, create a fresh arbiter with `enabled: true` and the router up:
  - `turnOpened(1, -5000)`;
  - `turnDispatched(1, 0, 0, 'vad')` (Q = clip end = 0, dispatch at Q);
  - feed `routerTurn` for each chunk at `atMs` with the cumulative text;
  - end with `generationComplete` at `generationCompleteMs`;
  - send a pipeline `tok` at +4000, then `fin` + `end('completed')` at +6000;
  - `turnClosed(1, 30000)`.
  Collect the decision line per item. Assert:

```ts
expect(counts.shownLive).toBe(20);
expect(counts.shownPipeline).toBe(27);
expect(counts.appends).toBe(0);
expect(counts.row4).toBe(0);
// The explained difference (plan-time computation from router40-R.json): RH07 and RH17's single "hard" token is complete
// only at generationComplete (2173 ms, 2258 ms), after Q + 2000, so they read route=invalid reason=late, still pipeline-shown.
expect(lateIds.sort()).toEqual(['RH07', 'RH17']);
expect(counts.hardRows).toBe(25);
expect(liveFirstMs.every((ms) => ms <= 2000)).toBe(true);   // "all on time"
```

- [ ] **Step 2: Run it.** The test is new over existing code, so per rule 8, break it once: temporarily set the fixture's RE05 first chunk to `atMs: 2600` and see `shownLive` 19 fail. Then restore.
- [ ] **Step 3: Commit:** `test(router): offline replay of router40 through reader and arbiter (20 live, 27 pipeline: 25 hard + RH07/RH17 late)`.

  If the counts differ from the above, STOP and report the item list to the controller. Spec §9.2 requires every difference to be explained before the build is called done.

---

### Task 7: Engine events, answer end, history sink, `speechEnd()` (Lane C, 45 min)

**Spec:** §4.5 "Engine events carry turnId", §4.6, §4.3 Inputs (Q and `q_src`, M4).

**Files:**
- Modify: `electron/IntelligenceEngine.ts`:
  - event types, lines 49–50;
  - the emits at 296, 475, 482, 490 and 515;
  - history at 504;
  - the abort return at 494–498;
  - the catch at 520–524.
- Modify: `electron/IntelligenceManager.ts` (forward list 224–232; `addAssistantMessage` at 274; add `setTurnHistorySink`).
- Modify: `electron/services/interviewerTurn.ts` (add `speechEnd()` to the interface at 66–83 and to the returned object).
- Test: `electron/IntelligenceEngine.turnEvents.test.ts` (model it on `IntelligenceEngine.cues.test.ts`'s setup); `electron/services/interviewerTurn.test.ts` (append).

**Interfaces:**
- Produces:
  - engine emits `suggested_answer_token(token, question, confidence, replace, cues, turnId?)`;
  - `suggested_answer(answer, question, confidence, replace, turnId?)`;
  - `suggested_answer_source(label, turnId?)`;
  - NEW `suggested_answer_end(turnId: number | null, kind: 'completed' | 'aborted' | 'failed')`, with the log line `[IntelligenceEngine] answer end turn=<id|none> kind=<k>`;
  - `IntelligenceEngine.setTurnHistorySink(sink: ((turnId: number, text: string, question?: string) => void) | null)`;
  - `IntelligenceManager.setTurnHistorySink(...)` (delegates) and `IntelligenceManager.addAssistantMessage(text: string, questionContext?: string)`;
  - `InterviewerTurn.speechEnd(): { at: number; src: 'vad' | 'final' } | null`. It is null when no turn is open or `lastSpeechAt` is `-Infinity`; `src` is `'vad'` iff `vadSeen`.

- [ ] **Step 1: Write the failing tests.**
  - With `turnId: 7`, every token, the final and the source carry `7` as their last argument.
  - Without a `turnId`, the last argument is `undefined` and the existing argument positions are unchanged.
  - The end event is `completed` after the final, `aborted` when a second `runWhatShouldISay` aborts the first, and `failed` when the stream throws. Each is logged once.
  - **History sink instead of session (Review Focus 2):** with a sink set and `turnId: 7`, `session.addAssistantMessage` is NOT called and the sink gets `(7, fullAnswer, settled)`. Without a `turnId`, the session is called as today even with the sink set.
  - `interviewerTurn`: `speech(true, 100)`, `speech(false, 900)` gives `{at: 900, src: 'vad'}`. `final('x', 1200)` with no VAD gives `{at: 1200, src: 'final'}`. No turn gives `null`.
- [ ] **Step 2: Run, and confirm the failures.**
- [ ] **Step 3: Implement.**
  - Append `options.turnId ?? undefined` as the last argument of the five emits.
  - Emit `suggested_answer_end` and log it, at three exits: after the final emit (completed), in the `streamAborted` return (aborted), and in the catch (failed).
  - Replace line 504 with:

```ts
if (this.turnHistorySink && options.turnId != null) this.turnHistorySink(options.turnId, fullAnswer, settled ?? undefined);
else this.session.addAssistantMessage(fullAnswer, settled ?? undefined);
```

  - In the manager: add `'suggested_answer_end'` to the forward list. Add `setTurnHistorySink(s) { this.engine.setTurnHistorySink(s); }`. Extend `addAssistantMessage(text, questionContext?)` to pass the question through to the session.
- [ ] **Step 4: Run** these tests plus `IntelligenceEngine.*.test.ts` and `interviewerTurn*.test.ts`. All PASS; tsc gate.
- [ ] **Step 5: Commit:** `feat(engine): turnId on suggested_answer* events, an answer-end event, a turn history sink; turn exposes speechEnd()`.

---

### Task 8: Renderer contract (Lane C, 70 min)

**Spec:** §4.5 Renderer and IPC payloads, cases A–E (renderer side).

**Files:**
- Modify: `src/lib/answerMessages.ts`, `src/lib/answerMessages.test.ts` (append; the existing tests stay green)
- Create: `src/lib/bubbleMetrics.ts`, `src/lib/bubbleMetrics.test.ts`
- Modify: `electron/preload.ts` (lines 144–145 types, 780–800 handlers)
- Modify: `src/types/electron.d.ts` (197–199)
- Modify: `src/components/NativelyInterface.tsx` (handlers at 815–930 and 1380–1384; the "(full answer)" header where cues render; find it with grep `cues` in the message render)

**Interfaces:**
- Produces:
  - `AnswerMessage` gains `turnId?: number; origin?: 'live' | 'pipeline'; append?: boolean; label?: string; sourceLabel?: string`.
  - `export interface BubbleMeta { turnId?: number; origin?: 'live' | 'pipeline'; append?: boolean; label?: string; sourceLabel?: string }`.
  - `applyAnswerToken(prev, token, replace, newId, cues?, meta?: BubbleMeta)` and `applyFinalAnswer(prev, replace, finalize, meta?: BubbleMeta)`. Both keep today's behaviour when `meta?.turnId == null`.
  - preload: the token callback data gains `turnId?, origin?, append?, label?`; the final gains `turnId?, origin?, append?`; `onIntelligenceSuggestedAnswerSource(cb: (label: string, turnId?: number) => void)`, with subscription `(_, label, turnId) => cb(label, turnId)`.
  - `bubbleMetrics.ts`: `createBubbleMetrics(nowFn)` returns `{ start(key, at?), first(key), done(key, content, source): StreamMetrics }`, with `bubbleKey(meta) = \`${turnId}|${origin}|${append ? 1 : 0}\``. TTFT is measured from the `start(key)` time, which is the live-question arrival for the turn, recorded under the key's turnId prefix.

**The rules (spec §4.5, exactly):**
1. A token with `turnId`:
   - **`replace: true`:** rewrite the FIRST bubble with that `turnId` (a fresh object, same id, `isStreaming: true`, the meta fields, the new cues), and remove every later bubble with that `turnId`. If none exists, append a new bubble.
   - **Otherwise:** append to the LAST bubble whose `turnId`, `origin` and `append` all match and which `isStreaming`. If none, open a new bubble with the meta (so an append token never joins a non-append bubble). A first append token carries `label: '(full answer)'`.
2. A final with `turnId`: finalize the streaming bubble with the same `turnId`, `origin` and `append`, overwriting only its text.
   - Else, if `replace`: finalize the first bubble with that `turnId` and remove the later ones.
   - Else: append `finalize(null)` with the meta.
3. **Source labels.** The source event `(label, turnId)` sets `pendingSourceByTurn[turnId] = label` (no turnId: `sm.setSource` as today). A bubble created for that `turnId` takes `sourceLabel` = the pending label at creation. A later source event never relabels an existing bubble.
4. **Metrics run once per bubble:** `first(key)` on its first token, `done(key)` on its final, with `modelSource = bubble.sourceLabel`. Events without `turnId` keep using `sm`.
5. **Rendering.** A bubble with `label` renders a small header line with the label text above its text, styled like the cue block's muted text. Find the cue rendering JSX and add it right before.

- [ ] **Step 1: Write the failing tests** (`answerMessages.test.ts` append):
  - an append bubble opens under "(full answer)" and never joins the Live bubble;
  - a final with `turnId` closes only its own bubble and overwrites only its text, with two turns' bubbles interleaved (Review Focus 1);
  - a replace with `turnId` rewrites the turn's first bubble and removes its append (Review Focus 4);
  - a replace with `turnId` and no existing bubble appends a new one;
  - no `turnId` gives exactly today's results (copy two of the existing cases with `meta` undefined);
  - `bubbleMetrics`: two keys measure independently, and `done` returns that bubble's source.
- [ ] **Step 2: Run, and confirm the failures.**
- [ ] **Step 3: Implement** `answerMessages.ts` and `bubbleMetrics.ts`; then preload, types and NativelyInterface:
  - pass `meta` from `data`;
  - keep the negotiation-coaching branch unchanged, since it only fires without `turnId`;
  - keep `setIsProcessing(false)` on any final.
- [ ] **Step 4: Run** the renderer tests plus `answerMessages.test.ts`. Then the tsc gate: root tsc covers `src/`.
- [ ] **Step 5: Commit:** `feat(renderer): answer bubbles keyed by turnId/origin/append; "(full answer)" header; per-bubble source and metrics`.

---

### Task 9: Unknown-marker filter (Lane C, 30 min)

**Spec:** §7.1, M5.

**Files:**
- Create: `electron/llm/unknownMarkerFilter.ts`, `electron/llm/unknownMarkerFilter.test.ts`
- Modify: `electron/llm/WhatToAnswerLLM.ts` lines 398–404 (`filtered`) and the import at line 5

**Interfaces:**
- Produces: `createUnknownMarkerStripper(): { push(s: string): string; flush(): string }` and `stripUnknownMarkers(src: AsyncGenerator<string>): AsyncGenerator<string>`.

- [ ] **Step 1: Write the failing tests.**
  - `"a __FOO__ b"` → `"a  b"`.
  - `__MORE__` and `__CUES__` are kept.
  - `"__model_source:gemini-3.1-flash-lite (hedge)__"` is kept: the `:` and the space keep it from matching `WORD`.
  - Split across chunks: `["a __FO", "O__ b"]` → `"a "`, then `" b"`.
  - A partial released on whitespace: `["x __abc", " y"]` → `"x "`, then `"__abc y"`.
  - End of stream: `["tail __ab"]` then flush → `"tail __ab"`.
  - `snake_case` passes unchanged.
  - **Placement (M5):** a test drives `WhatToAnswerLLM` the way `WhatToAnswerLLM.cues.test.ts` does, with a fake stream `["Hello __S1Q05__ world"]`, and the displayed text has no `__S1Q05__`. A hedge-winner sentinel chunk still names the model (the existing hedge tests stay green).
- [ ] **Step 2: Run, and confirm the failures.**
- [ ] **Step 3: Implement.**

```ts
/** Spec 7.1: strip unknown __WORD__ markers from the displayed stream; __MORE__, __CUES__ and __model_source:…__ are left alone. */
const KNOWN = new Set(['MORE', 'CUES']);
const UNKNOWN = /__([A-Za-z][A-Za-z0-9_]*)__/g;
const PARTIAL_TAIL = /(?:__[A-Za-z][A-Za-z0-9_]*_?|__|_)$/;

export function createUnknownMarkerStripper(): { push(s: string): string; flush(): string } {
    let buf = '';
    const strip = (s: string) => s.replace(UNKNOWN, (m, w: string) => (KNOWN.has(w) ? m : ''));
    return {
        push(s: string): string {
            buf = strip(buf + s);
            const m = PARTIAL_TAIL.exec(buf);
            if (!m) { const out = buf; buf = ''; return out; }
            const out = buf.slice(0, m.index); buf = buf.slice(m.index); return out;
        },
        flush(): string { const out = strip(buf); buf = ''; return out; },
    };
}

export async function* stripUnknownMarkers(src: AsyncGenerator<string>): AsyncGenerator<string> {
    const s = createUnknownMarkerStripper();
    for await (const t of src) { const out = s.push(t); if (out) yield out; }
    const tail = s.flush(); if (tail) yield tail;
}
```

  In `WhatToAnswerLLM.ts`, wrap the outermost call: `const filtered = (raw) => stripUnknownMarkers(stripSpokenNotation(stripSuggestionBlock(…)))`. Nothing outside `filtered` changes.
- [ ] **Step 4: Run** the new test file plus every `WhatToAnswerLLM.*.test.ts` and `verbalStreamFilter*.test.ts`. All PASS; tsc gate.
- [ ] **Step 5: Commit:** `fix(answers): strip unknown __WORD__ markers inside the verbal filter chain (S1Q05 leak, 5/120)`.

---

### Task 10: main.ts wiring (critical, 80 min)

**Spec:** §3, §4.1 (lifecycle), §4.3 inputs, §4.5 (IPC), §4.6, §5.

**Files:**
- Modify: `electron/main.ts`. Read these regions first:
  - 905–1080 (turn plumbing);
  - 1370–1540 (the three `liveRouter?.write` sites: 1378, 1495, 1537);
  - 2000–2075 (meeting start and mode changes);
  - 2088–2170 (`dispatchDetection`);
  - 2200–2276 (`startLiveRouter` / `stopLiveRouter`);
  - 2278–2310 (`endMeeting`);
  - 2405–2445 (event forwarding).
- Test: `electron/main.routerWiring.test.ts`, only if main exposes a testable seam. Otherwise this task's proof is the type gate plus the smoke (Task 17), stated in the commit. **[plan choice]** main.ts has no unit seam today; the logic lives in the arbiter (Task 5) on purpose.

**Interfaces:**
- Consumes:
  - `RouterArbiter`, `LIVE_LABEL`, `PipelineIn` (Task 5);
  - `routerDiag` (Task 5);
  - `LiveRouterSession` (Task 2);
  - `speechEnd()`, `setTurnHistorySink`, `addAssistantMessage(text, q)` and the new event signatures (Task 7);
  - `KnowledgeOrchestrator.getRouterProfileSummary` (Task 2).
- Produces:
  - the startup line `[Router] flag NATIVELY_LIVE_ROUTER=on|off`;
  - the main fields `routerArbiter`, `routerSession`, and `routerEnabled = process.env.NATIVELY_LIVE_ROUTER === '1'`.

- [ ] **Step 1: Construct the arbiter once, in the event-forwarding setup (≈2405).**

```ts
const send = (o: Outbound) => {
  const win = mainWindow(); if (!win) return;
  if (o.ch === 'token') win.webContents.send('intelligence-suggested-answer-token', o.p);
  else if (o.ch === 'final') win.webContents.send('intelligence-suggested-answer', o.p);
  else win.webContents.send('intelligence-suggested-answer-source', o.label, o.turnId);
};
this.routerArbiter = new RouterArbiter({
  enabled: this.routerEnabled, now: Date.now,
  setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (h) => clearTimeout(h as NodeJS.Timeout),
  send, addHistory: (text, q) => this.intelligenceManager.addAssistantMessage(text, q),
  diag: routerDiag, capture: (line) => console.log(line),
});
console.log(`[Router] flag NATIVELY_LIVE_ROUTER=${this.routerEnabled ? 'on' : 'off'}`);
if (this.routerEnabled) this.intelligenceManager.setTurnHistorySink((turnId, text, q) => this.routerArbiter.forward({ ch: 'history', turnId, text, question: q }));
```

  Then replace the three listeners (2419–2445). Each builds the payload exactly as today, plus `...(turnId != null ? { turnId, origin: 'pipeline' as const } : {})`, and calls `this.routerArbiter.forward(...)`.
  - The source listener keeps `console.log(\`[Main] answer source: ${label}\`)`, as h40c reads it.
  - Add `this.intelligenceManager.on('suggested_answer_end', (turnId, kind) => { if (turnId != null) this.routerArbiter.forward({ ch: 'end', turnId, kind }); })`.
- [ ] **Step 2: Turn feed.**
  - In `syncTurnIdentity()`, when the id changes: `if (this.turnSeenId !== null) this.routerArbiter.turnClosed(this.turnSeenId, Date.now()); if (id !== null) this.routerArbiter.turnOpened(id, Date.now());`. This runs before `turnSeenId` is reassigned.
  - In `actOnTurn` case `'close'` and in `resetTurn()`: `if (this.turnSeenId !== null) this.routerArbiter.turnClosed(this.turnSeenId, Date.now());` before the existing resets.
  - In `dispatchDetection`'s answer branch (2164–2169), when `d.turnId != null`, before `answerDetection`:

```ts
const se = this.turn.speechEnd(); const at = Date.now();
this.routerArbiter.turnDispatched(d.turnId, at, se?.at ?? at, se?.src ?? 'final');
```

- [ ] **Step 3: Router session lifecycle (flag on only).**
  - Add `startRouterSession()` and `stopRouterSession()`. Call start next to `startLiveRouter()` at the meeting-start site (≈2020) and the mode-change site (≈2071). Call stop next to `stopLiveRouter()` at ≈2064 and in `endMeeting` (≈2296).
  - **The ear failover (Task 11) must NOT restart the router.** So the router is never started inside `startLiveRouter`.

```ts
private startRouterSession(): void {
  if (!this.routerEnabled || this.routerSession) return;
  const { CredentialsManager } = require('./services/CredentialsManager');
  const s = new LiveRouterSession({
    getApiKey: () => CredentialsManager.getInstance().getGeminiApiKey() || process.env.GEMINI_API_KEY,
    getContext: () => { try { return this.knowledgeOrchestrator?.getRouterProfileSummary?.() ?? ''; } catch { return ''; } },
    log: routerDiag,
  });
  s.on('state', (e: { up: boolean; at: number }) => this.routerArbiter.setRouterUp(e.up, e.at));
  s.on('turn', (ev) => this.routerArbiter.routerTurn(ev));
  s.on('failed', (e: { reason: string }) => routerDiag(`[Router] session failed reason=${e.reason} dispatches_before=${this.routerArbiter.dispatchCount()}`));
  this.routerSession = s; void s.start();
}
private stopRouterSession(): void { const s = this.routerSession; if (!s) return; s.stop(); s.removeAllListeners(); this.routerSession = null; this.routerArbiter.setRouterUp(false, Date.now()); }
```

- [ ] **Step 4: Audio tee.** At each of the three `this.liveRouter?.write(chunk, …)` sites, add `this.routerSession?.write(chunk, this.systemAudioCapture?.getSampleRate() ?? 16000);` right after it, with the same arguments.
- [ ] **Step 5: Ear model for the log.** In `startLiveRouter`, call `this.routerArbiter.setEar(router.getModel().includes('2.5') ? '2.5' : '3.1')`.
- [ ] **Step 6: Gates.** Run both tsc commands and the full suite (serial). Then build WT and grep the built `dist-electron/electron/main.js` for `[Router] flag NATIVELY_LIVE_ROUTER=` and `routerArbiter.forward`. Record the grep output.
- [ ] **Step 7: Commit:** `feat(router): wire the router session, the arbiter and turnId'd answer events into main (behind NATIVELY_LIVE_ROUTER)`.

---

### Task 11: Ear failover 3.1 → 2.5 (critical, 30 min) — CUTTABLE with the user's ruling

**Spec:** §4.4, §5 (the failover line).

**Files:**
- Modify: `electron/main.ts` (`startLiveRouter` and its `'status'` handler, 2200–2224; `endMeeting` reset)
- Create: `electron/services/earFailover.ts`, `electron/services/earFailover.test.ts`. This is a pure decision function, so that the rule is unit-tested.

**Interfaces:**
- Produces: `shouldFailOver(s: { flag: boolean; model: string; state: string; reason?: string; alreadyFailedOver: boolean }): boolean`. It is true iff:
  - the flag is on;
  - the model is `gemini-3.1-flash-live-preview`;
  - the state is `failed`;
  - the reason is not `No Gemini API key configured`;
  - the ear has not already failed over.
- Constants: `EAR_FAILOVER_MODEL = 'gemini-2.5-flash-native-audio-latest'`.

- [ ] **Step 1: Write the failing tests** for the truth table:
  - a 3.1 `failed` → true;
  - a second time → false;
  - a 2.5 start → false (never fails over);
  - flag off → false;
  - `reconnecting` → false;
  - the no-key reason → false.
- [ ] **Step 2: Run, and confirm the failures; then implement the function.**
- [ ] **Step 3: Wire it.**
  - `startLiveRouter(model?: string)` passes `model` as the third constructor argument.
  - In the status handler: `if (shouldFailOver({...})) { this.earFailedOver = true; routerDiag(\`[Router] ear failover from=3.1 to=2.5 reason=${s.reason ?? '-'} dispatches_before=${this.routerArbiter.dispatchCount()}\`); this.routerArbiter.setEar('2.5'); setImmediate(() => this.startLiveRouter(EAR_FAILOVER_MODEL)); }`.
  - Reset `earFailedOver = false` in `endMeeting`. There is no fail-back.
  - The decisions are unchanged by the ear model: the arbiter only logs it (pinned by Task 5's I5 test).
- [ ] **Step 4: Run** the tests and the tsc gate. **Commit:** `feat(router): ear failover 3.1 -> 2.5 on a visible failed, once per meeting, behind the flag`.

---

### Task 12: live40 harness (Lane D, 60 min)

**Spec:** §7.4 (all), §9.1 (harness tests).

**Files:**
- Create: `electron/test/golden/live40.gen.mjs`, `electron/test/golden/live40.questions.mjs` (generated), `electron/test/golden/live40.clips.mjs`
- Create: `electron/test/golden/live40.test.ts`
- Modify: `electron/test/golden/roster.mjs` (`ROSTERS`, `SAMPLES`; export `TTS_NO_RENDER`)
- Modify: `electron/test/golden/interview60.build-audio-local.mjs` (`speak()` refuses to render when `TTS_NO_RENDER`)

**Interfaces:**
- Produces:
  - `LIVE40` items `{ id, q, gapMs: 20000, chain, parent?, route: 'EASY'|'HARD', class, level: route, topic: chain }`. Check at `computeOffsets` (run.mjs 110–121) that `level` and `topic` are read; they are copied into the timeline.
  - The roster entry `live40: { items: LIVE40, ttsLocal: 'live40-tts-local', ttsGemini: 'live40-tts', wav: 'live40.wav', noRender: true }`.
  - `SAMPLES.live40 = ['RE11', 'EF06', 'RH05', 'RE12']` (the two SUSPECT-rate clips and the two longest answers' questions).

- [ ] **Step 1: Write the failing tests** (`live40.test.ts`; spawn node for the CLIs):
  - `live40.gen.mjs --items <a copy with one byte changed>` exits 2 with `items.json sha256 … refused`.
  - The generated module has 47 items in `items.json` chain order (31 chains), and each `parent` precedes its child in the same chain. Classes are E 20, H 11, QF 9, AF 7; `gapMs === 20000` everywhere.
  - **Clips:** `live40.clips.mjs --src <dir>` with one clip whose sha12 differs from the manifest exits 1 naming it; with a 22 050 Hz clip it exits 1 (format).
  - **Builder:** with `NATIVELY_ROSTER=live40` and one `.txt` stamp differing from `q`, the builder exits non-zero with `would re-render RE01 — refused (live40 reuses router40's clips)`.
  - **wav:check:** on the built `live40.wav` it exits 0. On a deliberately wrong wav (copy with 2 s of PCM cut, under a temp `NATIVELY_ROSTER` folder copy), it exits 1. This is the rule-8 calibration, run once.
- [ ] **Step 2: Implement.**
  - `live40.gen.mjs`: reads `SP\live40\items.json`, refuses on sha mismatch, and writes `live40.questions.mjs` with a header comment naming the source sha.
  - `live40.clips.mjs`:
    - copies `SP\live40\clips\<id>.wav` to `live40-tts-local\<id>.wav`;
    - writes `<id>.txt` = `q`;
    - checks 24 kHz / mono / 16-bit from the header;
    - checks **sha12 of the whole file bytes** against `manifest.json` `clips[id].sha12`.
    - **[plan correction of §7.4]** The spec says "PCM sha12", but `make-clips.mjs:71` hashes the whole file. Verified at plan time: 47/47 whole-file sha12 match, all 24000/1ch/16b, 217.9 s in total. The script ignores the manifest's `path` fields.
  - `roster.mjs`: add the entry and `export const TTS_NO_RENDER = chosen.noRender === true;`.
  - Builder: `if (TTS_NO_RENDER) throw new Error(\`would re-render ${item.id} — refused (live40 reuses router40's clips)\`)` at the point where `speak()` would render.
- [ ] **Step 3: Build the audio.**
  - `node live40.gen.mjs`, then `node live40.clips.mjs`, then `NATIVELY_ROSTER=live40 node interview60.build-audio-local.mjs`.
  - Expected: `SUSPECT RE11 1.57 w/s, EF06 1.58 w/s` (recorded as expected) and a duration of ≈ 19.6 min (218 s + 47 × 20 s).
  - Then `NATIVELY_ROSTER=live40 node interview60.run.mjs wav:check`, which must print `live40.wav matches live40  47 items`.
- [ ] **Step 4: Run** the tests. **Commit** the generator, roster, clips script, tests and `live40.questions.mjs`. The wav and the clips stay untracked, as for holdout40; check `.gitignore` covers `*.wav` under golden, and if not, do not add them. Commit message: `feat(harness): live40 roster from router40's set, clips reused and verified, 20 s gaps`.

---

### Task 13: Harness: probe wait, router preflight gates, capture files, arms filter (Lane D, 60 min)

**Spec:** §7.2; §5 (harness capture files); §10 (precheck: session gates); §10.1 (the arms and their order).

**Plan reading of §10 "Precheck at T−6 min".** It requires `[Router] session up`, the shas, the smoke's `context_sha12`, the ear on 3.1, and both sessions up together. Those sessions exist only once the app runs, and the app starts inside `auto()` after T. flight-eq's T−6 precheck requires that NO electron is running.
- So this plan splits the precheck. The T−6 scheduled precheck keeps flight-eq's machine and task gates (Task 18). The session gates run in `auto()`'s preflight right before the run window, and a failure there takes the existing "not ready → retry until deadline → the hour was NOT spent" path.
- The registration (Task 19) must state this split, and its re-check must accept or reject it.

**Files:**
- Create: `electron/test/golden/probeWait.mjs`, `electron/test/golden/routerCapture.mjs`, `electron/test/golden/routerHarness.test.ts`
- Modify: `electron/test/golden/interview60.run.mjs`:
  - `auto()` 536–582: the wait between `probe()` ready and `appPass()`; the capture files at snapshot;
  - `preflight()` 364–420: the router gates when `NATIVELY_LIVE_ROUTER === '1'`.
- Modify: `electron/test/golden/interview60.flight.mjs`: arms 362–378; export `selectArms`.

**Interfaces:**
- Produces:
  - `probeSettled(logSinceProbe: string): { settled: boolean; open: number; why: string }`. It is settled iff every `[Router] dispatch turn=N` (flag on), or every `[Main] dispatch: answer` (flag off), has a matching `[IntelligenceEngine] answer end` line after it, AND the last `[Main] turn:` line is `turn: close` (no interviewer turn open).
  - `waitProbeSettled({ readLog, sleep, capMs = 120000 }): Promise<boolean>`.
  - `buildCaptureFiles(debugLogText, timeline, offsetMs = 1150): { live: Entry[]; shadow: Entry[] }`, where `Entry = { id, turn, text, words, firstMs, endMs, q_src, appended? }`. The id comes from the `q_at` of the turn's decision line, mapped to the item whose play window (`startedMs + offsetMs + startSec*1000` up to the next item's start) contains it.
  - `routerPreflight(logSinceStart: string, env): { ok: boolean; lines: string[] }`. It requires:
    - a `[Router] session up`;
    - the last `[Router] session connect` line with `block_sha12=e11c240063ea instruction_sha12=e29bf3810128 context_sha12=${env.NATIVELY_ROUTER_CONTEXT_SHA12}` and `context_chars>0`;
    - the last `Live Mode status:` line `connected`;
    - no `[Router] session close` after the last `session up`;
    - no `[Router] ear failover` line;
    - the ear on 3.1: no `NATIVELY_LIVE_MODEL` override, and the flight's `LIVE` line names 3.1.
    - When `NATIVELY_ROUTER_CONTEXT_SHA12` is unset (the smoke), it prints the sha and does not gate it.
  - `selectArms(paired, env)`. When `env.NATIVELY_FLIGHT_ARMS` is set (comma list of tags), it returns exactly those tags, in that order; an unknown tag throws. The flight then also skips the untagged `ANSWER_MODELS` arms and the chains pass, and logs `ARMS  <list> (NATIVELY_FLIGHT_ARMS); untagged arms and chains skipped`. Unset means today's behaviour.

- [ ] **Step 1: Write the failing tests** (synthetic logs):
  - **probe wait:** settled; one dispatch with no end; a turn still open; a 120 s cap → `auto` would exit 1 (test `waitProbeSettled` with a fake clock returning false).
  - **capture:** a synthetic log with a live, a shadow and an appended turn, plus a timeline of 3 items, gives the right ids and `appended` flags. **A hidden shadow reaches the file whole**: its `words` equals the `[Answer] budget: words=N` line of that turn (Task 17 re-checks this live).
  - **preflight:** all ok; a wrong block sha; context sha mismatch; a close after up; a failover line.
  - **selectArms:** `'high,low,captured-high'` returns those three in that order; `'high,bogus'` throws; unset returns all.
- [ ] **Step 2: Run, and confirm the failures; then implement and wire.**
  - In `auto()`: after `probe()` is ready, `if (!(await waitProbeSettled(...))) { console.log('AUTO  probe answers not finished in 120 s — The hour was NOT spent.'); process.exit(1); }`. At snapshot, write `interview60.answers.router-live.json` and `interview60.answers.router-shadow.json` into `dest`.
  - In `preflight()`: call `routerPreflight` when the flag is on, and add an `ok(...)` row per line.
- [ ] **Step 3: Run** the tests and `interview60.flight.mjs --dry-run` with `NATIVELY_FLIGHT_ARMS=high,low,captured-high NATIVELY_ROSTER=live40`. The log shows exactly three arms in order and no chains pass.
- [ ] **Step 4: Commit:** `feat(harness): probe answers finish before the run; router preflight gates; router capture files; NATIVELY_FLIGHT_ARMS`.

---

### Task 14: Hour reader + calibration (Lane D, 75 min)

**Spec:** §5 "The run reader" (every bullet), §10.2 (bars), §11 (VOID).

**Files:**
- Create: `LAB\router-hour-read.mjs`, `LAB\router-hour-read.cal.mjs`, `LAB\router-hour-read.cal.txt` (output)

**Interfaces:**
- Consumes:
  - a run folder: `natively_debug.log`, `interview60.timeline.json`, the two capture files;
  - the live40 roster (route labels) from `<root>\electron\test\golden\live40.questions.mjs`;
  - the line formats from Task 5 (decision, dispatch, dup/unpaired with `shown=-`), Task 2 (session lines) and Task 1 (`[LiveRouter] close`).
- CLI: `node router-hour-read.mjs <runDir> [--root <checkout>] [--down-limit-min <n>]`. It prints counts and ms only, never text. Exit codes: 0 read OK; 3 VOID; 2 usage.

- [ ] **Step 1: Write the calibration first** (`router-hour-read.cal.mjs`). It builds synthetic run folders with known answers and asserts the reader's printed numbers:
  - at least one line per reason (`-`, `garbled-hard`, `too-short`, `too-long`, `incomplete`, `incomplete-after-show`, `marker`, `late`, `router-down`, `no-router-turn`, `unpaired`, `dup`);
  - VOID trigger 1: `[Router] session failed … dispatches_before=9`;
  - VOID trigger 2: router down minutes over `--down-limit-min`;
  - a non-VOID failed at `dispatches_before=10`;
  - one dispatched turn with no decision line, which must be reported as 1;
  - a Safety text breach: a live capture whose text's first word is `hard.` (Safety FAIL), and one whose text holds `<x>`;
  - item mapping by play window with `OFFSET_MS` 1150, with one dispatch 1 s before a window boundary;
  - a capture count mismatch.
  Run it before the reader exists: it fails.
- [ ] **Step 2: Implement the reader**, printing:
  1. **Decisions** by route × reason × shown (shown ∈ {live, pipeline}; dup/unpaired counted separately).
  2. **Speed:** `live_first_ms` p50/p90 on shown=live, overall and by `q_src`; the shadow p50/p90 beside it, by `q_src`; `live_words` p50/max; appends by reason.
  3. **VOID inputs:** `session failed` lines with `dispatches_before`; router down minutes, from `state` transitions inferred from `session up` and `session close stale=no` lines, clipped to the run window. Ear failovers with `dispatches_before` (reported only).
  4. **Tallies — CUTTABLE (spec §13, needs the user's ruling):** connects, reconnects and closes for the router and the ear, by reason and code; stale closes; router quota closes, counted separately (I7); the ear's `Live Mode status: reconnecting` count.
  5. **Integrity:** dispatched turns with no decision line (must be 0); dispatched turns with nothing shown, i.e. shown=pipeline with `shadow=-` (must be 0); capture entries per kind against decisions (must match).
  6. **Bars:**
     - Safety, text half: no shown Live text with a hard first word; no shown text of any kind carrying a marker. Live text comes from `[RouterAnswer] kind=live`; pipeline text from `[Answer] full:` and `kind=appended`.
     - Fallback: every after-V failure has its appended entry; no row-4 turn has a live capture.
     - Speed: p50 ≤ 2500.
     - Routing: EASY caught (shown=live on EASY items) ≥ 13/20; HARD misrouted (the decider's first word not hard, shown or not) ≤ 1/27. HARD items with no deciding router turn are reported, not counted (M2).
     - Each bar prints `BAR <name>: PASS|FAIL <numbers>`. Grade-dependent bars print `NEEDS GRADES`.
  7. **Verdict:** VOID checks first, then `READER VERDICT (pre-grade): …`.
- [ ] **Step 3: Run the calibration until it passes.** Then break the reader twice (drop the `dup` exclusion; ignore `OFFSET_MS`) and see the calibration fail each time. Save the output to `.cal.txt`.
- [ ] **Step 4: No repo commit.** LAB files are committed to MAIN by the controller with the registration (Task 19), as instruments with their sha lines.

---

### Task 15: Gates and the whole-branch review (critical, 60 min)

- [ ] **Step 1: Run both tsc commands.** No errors beyond the baseline: quote the counts.
- [ ] **Step 2: Run the full suite, serially** (`vitest run --root <WT>` from `$TEMP`). The failures must equal the Task 0 baseline set exactly: quote the counts.
- [ ] **Step 3: Run `cmd /c npm run build:electron` in WT.** Grep the dist for:
  - `ROUTER_SHAS_OK`;
  - `gemini-3.8-live`;
  - `[Router] flag NATIVELY_LIVE_ROUTER=`;
  - `stripUnknownMarkers`;
  - `generation !== this.generation`.
- [ ] **Step 4: Dispatch the Opus whole-branch review** (superpowers:requesting-code-review) over `git diff 17d199d..feat/live-router`.
  - The review is against the SPEC and THIS PLAN, hunting what is missing: every §4.5 case A–E path; the history rule; the flag-off identity; the five Review Focus lines; the stale-callback paths.
  - The reviewer is a fresh Opus subagent.
- [ ] **Step 5: Fix the findings** through superpowers:receiving-code-review: verify each finding first, use one Sonnet fixer per finding cluster, and get an Opus re-check of the fixes.
- [ ] **Step 6: Record in `LAB\CHECKPOINTS.md`** the branch head sha, the test counts and the review verdict.

---

### Task 16: Land in MAIN + rebuild (critical, 30 min, controller)

- [ ] **Step 1: Check both branches.**
  - MAIN must still be `fix/coding-style-suffix-all-gemini`. Record MAIN's HEAD as `<expected>`.
  - If MAIN moved past 17d199d, run `git -C <WT> rebase <MAIN HEAD>` in WT first, then re-run Task 15 steps 1–3 (no new review unless conflicts touched the reviewed code).
- [ ] **Step 2: Copy the changed paths into MAIN.** List them with `git -C <WT> diff --name-only <expected>..feat/live-router`, and state the full list to the user before landing (rule 9: what is about to be published). Copy with a node script (`copyFileSync`).
- [ ] **Step 3: Commit.** `powershell -NoProfile -ExecutionPolicy Bypass -File SP\commit-main-paths.ps1 -Expected <expected> -Paths <comma list> -MessageFile LAB\land-msg.txt -RefMessage 'land live router' -IndexName live-router-land`. The message file ends with the attribution line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- [ ] **Step 4: Check for concurrent sessions.** Use ListAgents and the mtimes of MAIN's electron tree since the copy. No foreign edit may be captured by the build.
- [ ] **Step 5: Rebuild.** In MAIN, `cmd /c npm run build:electron`. Then write `LAB\build-marker.txt` holding the MAIN HEAD, the build time, and the sha12 of `dist-electron/electron/audio/LiveRouterSession.js`, `services/routerArbiter.js` and `main.js`. Grep the MAIN dist for the Task 15 step 3 strings.

---

### Task 17: Smoke (critical, 60 min) — checkpoint 3

**Spec:** §9.4. **Plan choice:** the smoke plays the whole `live40.wav` (19.6 min, 47 items) rather than ~15 min, because `playWav` plays the whole file and a subset wav would fail `wav:check`.
- Quota: ≈ 54 requests on 3.5-lite and ≈ 14 on 3.1-lite, against ≈ 500 each.
- Recompute the arming need in Task 19 from the ledger, not from the spec's table.

**Files:** Create `LAB\launch-router-smoke.cmd`. It is generated by node (CRLF; never `sed`), in the style of `SP\flight-eq\launch-eq.cmd`, and it:
- `cd`s to MAIN;
- sets `NATIVELY_LIVE_ROUTER=1`, `NATIVELY_ROSTER=live40` and `NATIVELY_STT_PROVIDER=deepgram`;
- clears the same names flight-eq clears, `NATIVELY_EARLIER_QUESTION` included;
- runs `node electron\test\golden\interview60.run.mjs wav:check`, then `node electron\test\golden\interview60.run.mjs auto smoke-router`;
- logs to `interview60.runs\router-smoke.launcher.log`.

- [ ] **Step 1: Warn the user** in chat that the machine must be quiet from the smoke's start for ~35 min, and give the time.
- [ ] **Step 2: Register the one-shot task** `Natively-router-smoke` with `LAB\register-once.ps1` (from Task 3) at the agreed time, working directory MAIN. Read it back as Ready. Never start it by hand.
- [ ] **Step 3: After it ends,** run `node LAB\router-hour-read.mjs <smoke run folder> --root <MAIN>` and save the output to `LAB\SMOKE-READ.txt`.
- [ ] **Step 4: Check by hand, and record each item with its number in `LAB\RESULT-smoke.md`:**
  1. Every `[Router]` line kind seen, and the ones never reached.
  2. `[LiveRouter] close` lines: the ear's reconnect count (expected ≈ 2 in 20 min, one per ~9 min goAway, and NO `stale=no` close within 2 s after a goAway).
  3. Cases A–E as they occurred. Cross-check `natively_debug.log` event lines against the overlay if the user can look; otherwise the log only, and say so.
  4. Both capture files exist. One hidden shadow's `words` equals that turn's `[Answer] budget: words=` (whole).
  5. The history rule: for a shown=live turn, the `[Answer] full:` line holds the Live text and not the shadow.
  6. Play-window attribution: every decision line maps to an item.
  7. **The gap:** for every turn, the pipeline's `answer end` came before the next `[Router] dispatch`. If any did not, compute the maximum overrun; the gap to register is 20 000 + that maximum + 2000, rounded up to 1000. Record it; Task 19 seals it and rebuilds the wav (Task 12 step 3 with the new `gapMs`).
  8. `context_chars > 0` and the same `context_sha12` on every connect: record the sha12 for the registration.
  9. The residual branches not reached: list them.
- [ ] **Step 5: Run checkpoint 3.** Any Safety-class defect (a shown hard first word, a shown marker, a dispatched turn with nothing shown), or a reader integrity count ≠ 0, makes the 08:00 run NO-GO. Report it and move to the fallback.

---

### Task 18: Quota ledger + flight tools adapted from flight-eq (Lane D, 120 min)

**Spec:** §10, §10.1 (the ledger fix and the arming gate), §2 rule 2. Reuse flight-eq's calibrated patterns verbatim where the behaviour is the same, and re-point the names.

**Files** (all in `LAB\flight\`):
- `quota-ledger-cal.mjs`
- `gen-launchers-rd.mjs` + `launch-rd-src.txt` → `launch-rd.cmd`, `launch-rd-dry.cmd`
- `guard-rd.mjs` (+ `guard-rd-cal.mjs`)
- `rd-precheck.ps1` (+ `rd-precheck-cal.mjs`)
- `register-rd.ps1`
- `write-arming-rd.mjs`
- `night-gates.ps1`, reused by reference from `SP\flight-eq\night-gates.ps1` (unchanged, read-only gates)
- `rd-sha-lines.mjs`, adapted from `eq-sha-lines.mjs`

- [ ] **Step 1: Quota ledger.**
  - `SP\quota-ledger-today.mjs` already derives `DAY_START` from `NOW` (lines 15–19), so the spec's "stale" premise is checked rather than assumed.
  - Add the MAIN and WT `live-router` debug-log paths to its sources.
  - Write `quota-ledger-cal.mjs`: `--now 2026-10-07T06:59:59Z` → the reset reads `2026-10-06T07:00:00.000Z`; `--now 2026-10-07T07:00:00Z` → `2026-10-07T07:00:00.000Z`. Run it and save the output.
- [ ] **Step 2: Launcher.** Copy `launch-eq-src.txt` and `gen-launchers-eq.mjs` and re-point them. Keep:
  - the commit placeholder check;
  - the committed-texts sha lines (the router-default registration files);
  - `wav:check` with `NATIVELY_ROSTER=live40`;
  - the guard with `--require-precheck`;
  - the flight call `interview60.flight.mjs router-default`.
  Environment:
  - `NATIVELY_LIVE_ROUTER=1`, `NATIVELY_ROSTER=live40`, `NATIVELY_SCENARIOS=` (cleared), `NATIVELY_STT_PROVIDER=deepgram`;
  - `NATIVELY_EARLIER_QUESTION=` (cleared);
  - `NATIVELY_FLIGHT_ARMS=high,low,captured-high`;
  - `NATIVELY_FLIGHT_FOCUSED=off`;
  - `NATIVELY_ROUTER_CONTEXT_SHA12=<from the smoke>`;
  - `I60_PROBE_DEADLINE_MIN=<registered>`;
  - `NATIVELY_RD_T=<T>`;
  - every other name flight-eq clears.
  Replace the eq dist proofs with router dist proofs: the sha256 of `LiveRouterSession.js`, `routerArbiter.js` and `routeReader.js` before and after the run, which must be equal.
- [ ] **Step 3: `guard-rd.mjs`**, from `guard-eq.mjs`. Keep checks 2–4, 6, 6b, 7, 8, 9, 10a, 10b, 11, 12, 13, g2, g4 (window 2026-10-07 07:30–08:30 for T, and 22:30–03:00 for the fallback), and g5. Replace (1), e1, e2, g1 and g3 with:
  - **r1:** the roster loads live40 with 47 items;
  - **r2:** `NATIVELY_LIVE_ROUTER` is exactly `1`, and the BUILT `main.js` holds the `[Router] flag` line code;
  - **r3:** the dist holds `ROUTER_SHAS_OK`, `gemini-3.8-live` and the two sha constants, and no router dist file is older than its source;
  - **r4:** `NATIVELY_EARLIER_QUESTION` is unset;
  - **r5:** `NATIVELY_FLIGHT_ARMS` is exactly `high,low,captured-high`, and the BUILT `selectArms` returns that order;
  - **r6:** `RESULT-smoke.md` exists and holds `context_sha12=<the env value>`;
  - **r7:** a fresh ledger read with headroom ≥ 1.5 × need (spec §10.1: ≥ 224 on 3.5-lite, ≥ 90 on 3.1-lite, recomputed with the smoke's actual spend).
  Calibrate by breaking each premise once in a stub tree (`guard-rd-cal.mjs`, flight-eq's `guard-eq-cal.mjs` pattern), and save the output.
- [ ] **Step 4: `rd-precheck.ps1` and `register-rd.ps1`.** Copy them from eq with the label `rd`, the task names `Natively-flight-rd`, `-rd-dry` and `-rd-precheck`, the T window per step 3, and the arming-record gate pattern unchanged. Calibrate with the eqcal pattern (dummy tasks `Natively-flight-rdcal*`). Save the files UTF-8 with BOM; PowerShell names are case-insensitive, so use distinct names.
- [ ] **Step 5: `write-arming-rd.mjs`**, from `write-arming.mjs`: T = `2026-10-07 08:00`, the refusal past T−10, the gate pattern read from `rd-precheck.ps1` and proven on its two known answers, and the body seal of the registration's sha.
- [ ] **Step 6: Dry run.** Register `-Which dry` and let the precheck start it in calibration; or run `launch-rd-dry.cmd` from a scheduled task. Expected: `GUARD OK` and `NIGHT GATES OK` in the dry log.

---

### Task 19: Registration — Opus author + separate Opus re-check (critical re-check, 60 min)

**Spec:** §10, §10.1, §10.2, §11; §2 rules 3 and 7.

- [ ] **Step 1: The author** (fresh Opus subagent) writes `LAB\PREREGISTER-router-default.md`, starting after Task 15. It fills the smoke-dependent fields after Task 17. Content:
  - the run, roster, settings and arms per spec §10 and §10.1;
  - the bars (§10.2) and the verdict (§11) verbatim;
  - **the router-down limit (I7)** in minutes;
  - `I60_PROBE_DEADLINE_MIN`, such that the latest start + ~20 min audio + the 2-min §7.2 cap ends by 09:45;
  - the gap value (20 000 ms, or the smoke-raised value) with its measurement;
  - the smoke's `context_sha12` and `context_chars`;
  - the instruments with their sha256 lines: the reader, `live-probe.mjs`, the launchers, the guard, the precheck, register, write-arming, `quota-ledger-today.mjs`, and `live40.wav`'s sha;
  - §7.3 named as a change to the ear under the pipeline;
  - the Task 3 probe deviation;
  - the Task 13 precheck split;
  - the plan choices (the `q_at` field, the dispatch line, `shown=-` on dup/unpaired, the whole-wav smoke);
  - the grading setup (pinned `claude-opus-5-5`, memory-clean, flight-eq's grader command form);
  - the quota table recomputed from the ledger at writing time.
- [ ] **Step 2: The re-check** (a separate fresh Opus subagent) reads the spec, this plan, the smoke result and the registration. It returns APPROVE, APPROVE WITH CHANGES, or REJECT, with numbered findings. Findings go back to the author (amendment), then a re-check. No review is cut.
- [ ] **Step 3: Commit to MAIN through `commit-main-paths.ps1`:**
  - `passes/PREREGISTER-router-default.md`;
  - the instrument copies, under `passes/router-default/` (reader, launch sources, guard, precheck);
  - `passes/INDEX.md`.
  The flight HEAD is that commit.
- [ ] **Step 4: Go/no-go at 05:30.** The controller checks the list in spec §1 and writes `LAB\GO-NOGO.md`. On no-go: run `register-rd.ps1 -Which supersede` if anything was registered, and recompute §10.1 for the 23:00 fallback.

---

### Task 20: Arming (after go, by 07:50, controller, 20 min)

- [ ] **Step 1: Generate the launchers** with `--commit <flight HEAD>` and `--t '2026-10-07 08:00'`. The generator reads its bytes back.
- [ ] **Step 2: Register.** `register-rd.ps1 -Which armed -T '2026-10-07 08:00'` (flight + precheck at 07:54). Read both back.
- [ ] **Step 3: Fresh ledger read** (with the known-answer check passing first), then confirm the headroom ≥ 224 / ≥ 90.
- [ ] **Step 4: Write the arming record** with `node write-arming-rd.mjs`. Its last line `ARMING COMPLETE <stamp ≤ 07:50>` must pass the precheck's own pattern.
- [ ] **Step 5: Remind the user:** a quiet machine from 07:45; the user logged on; power on AC.

---

## Self-review (done at plan time)

**Spec coverage**

| Spec section | Task |
|--|--|
| §4.1 | 2 |
| §4.1a | 2 (+ the 3/17 deviation) |
| §4.2 | 4 |
| §4.3 | 5 |
| §4.4 | 11 (cuttable) + 1 (model parameter) |
| §4.5 | 5, 7, 8, 10 |
| §4.6 | 5, 7, 10 |
| §5 lines | 1, 2, 5, 10 |
| §5 capture | 5 (in-app), 13 (harness) |
| §5 reader | 14 |
| §7.1 | 9 |
| §7.2 | 13 |
| §7.3 | 1 |
| §7.4 | 12 |
| §9.1 | 4–13 |
| §9.2 | 6 |
| §9.3 | 3 |
| §9.4 | 17 |
| §10 | 18, 19 |
| §10.1 | 18 (ledger, gate), 13 (arms) |
| §11 | 14, 19 |

**Gaps closed at plan time:**
- The flight's arm list: spec §10.1 counts 3 arms, but the flight runs 2 untagged + 13 paired arms + chains. Task 13 adds `NATIVELY_FLIGHT_ARMS`.
- The precheck/app-start conflict: Task 13 splits it.
- The probe/knowledge-DB conflict: Task 3 deviation.
- The manifest sha covers whole files: Task 12.
- The RH07/RH17 replay lateness: Task 6.

**Placeholders.**
- Values that only the smoke can give are named as inputs to Task 19 (`context_sha12`, the gap, `I60_PROBE_DEADLINE_MIN`, the down limit); they are not left open.
- main.ts edits name exact regions. Their exact text is read at execution because MAIN may move.

**Type consistency.**
- `RouterTurnEvent` (Task 2) is structurally assignable to `RouterTurnIn` (Task 5); `'cap'` exists only in the arbiter.
- `PipelineIn` `history`/`end` match Task 7's sink and event.
- `Outbound` → the preload payload fields (Task 8).
- `turnDispatched(id, at, q, qSrc)` ↔ `speechEnd()`.

**Not covered by any test (residual):**
- The real 3.8 behaviour on in-app audio over a whole session with reconnects (smoke and run only).
- Renderer layout of the "(full answer)" header (visual, smoke only if the user looks).
- The main.ts glue (no unit seam; type gate + smoke).
- Two concurrent Live sessions' quota on one key (precheck, smoke, VOID rule).
