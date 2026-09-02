# Interview Reliability Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every open finding from the 2026-09-02 flight test, re-run the identical hands-free hour, and pass a fixed reliability gate.

**Architecture:** The Electron main process gains four small, testable seams (a dispatch decision, a Live-vs-transcript reconciler, a provider cooldown, a socket summary) and the harness under `electron/test/golden/` gains app lifecycle control, a metrics module shared by the gate and the report, and a two-run comparison page. Every fix is pure-function-first with the wiring kept thin.

**Tech Stack:** TypeScript (Electron 33 main process, Node 20), React renderer, vitest (`npm test` = `vitest run`, jsdom), `@deepgram/sdk` 3.13, `@google/genai`, Node ESM `.mjs` harness scripts, Windows PowerShell for audio playback.

**Spec:** `docs/superpowers/specs/2026-09-02-interview-reliability-pass-design.md` — read it first; every task below cites the section it implements.

## Global Constraints

- All work happens in the MAIN checkout `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` on branch `fix/coding-style-suffix-all-gemini`. Never touch the worktree under `.claude/worktrees/`.
- Commit each task as it lands, staging ONLY the files the task names. The working tree carries unrelated uncommitted changes (`electron/MeetingPersistence.ts`, `electron/llm/prompts.ts` has pre-existing edits, `electron/rag/*`, `resume_prompt.txt`, a staged deletion of `natively_debug.log.1`) — leave them alone. `git add <file> <file>`, never `git add -A` or `git add .`.
- `docs/superpowers/` is gitignored upstream; commit plan/spec files with `git add -f`.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Tests: `npx vitest run <file>` for one file, `npm test` for all (223 pass before this plan starts). Type check: `npx tsc --noEmit`. Electron build: `npm run build:electron` (rebuilds `dist-electron/` — the running app does NOT pick up changes until relaunched).
- Test files that import anything under `electron/` that transitively imports `electron` must start with the `vi.mock('electron', …)` shim shown in Task 3; copy it verbatim.
- `verbal-diag.log` and `natively_debug.log` in the checkout root are the LIVE app's logs — never write to them from tests (`diagLog` is already a no-op under `VITEST`).
- Log lines are the harness's contract. Every log line named in this plan must appear character-for-character as written, because `interview60.metrics.mjs` parses them.
- Nothing speculative: no extra options, no abstractions beyond what a task names, no error handling for cases that cannot occur.
- The app currently running was started by hand (`npm start`, 4 electron processes). Task 2's `app:stop` handles that case.

---

## File structure

**Created**
- `electron/services/liveMode.ts` — `LiveMode` type + `normalizeLiveMode()`.
- `electron/services/liveMode.test.ts`
- `electron/services/detectionDispatch.ts` — `decideDispatch()` (pure).
- `electron/services/detectionDispatch.test.ts`
- `electron/services/questionReconcile.ts` — `overlap`, `sameAnchor`, `reconcileLiveQuestion` (pure).
- `electron/services/questionReconcile.test.ts`
- `electron/services/providerCooldown.ts` — `ProviderCooldown` (pure, injectable clock).
- `electron/services/providerCooldown.test.ts`
- `electron/llm/lastInterviewerTurn.ts` — `lastInterviewerTurn()` (pure).
- `electron/llm/lastInterviewerTurn.test.ts`
- `electron/llm/streamTaps.ts` — `tapFirstToken()` (pure async generator).
- `electron/llm/streamTaps.test.ts`
- `electron/audio/DeepgramStreamingSTT.socketSummary.test.ts`
- `electron/IntelligenceEngine.codingAdvisory.test.ts`
- `electron/knowledge/IntentClassifier.test.ts`
- `electron/test/golden/interview60.lib.mjs` — harness helpers shared by run/metrics/report.
- `electron/test/golden/interview60.lib.test.ts`
- `electron/test/golden/interview60.metrics.mjs` — `computeRun(dir)`, `GATE`, `evaluateGate()`.
- `electron/test/golden/interview60.metrics.test.ts`
- `electron/test/golden/interview60.calibrate-detector.mjs` — real-Groq calibration of the detection prompt.

**Modified**
- `electron/services/CredentialsManager.ts` — `liveMode` field + get/set.
- `electron/main.ts` — Live-mode persist/restore, autostart hook, `dispatchDetection`, ring-buffer use.
- `electron/services/ChipDeduper.ts` — `answered` mark, `anchor` matching.
- `electron/services/ChipDeduper.test.ts` — new cases.
- `electron/audio/DeepgramStreamingSTT.ts` — per-socket summary; the fix chosen by Task 4.
- `electron/IntelligenceManager.ts` — interviewer speech ring buffer.
- `electron/IntelligenceEngine.ts` — coding intent advisory without images.
- `electron/knowledge/IntentClassifier.ts` — word-boundary, strong/weak negotiation.
- `electron/LLMHelper.ts` — `knowledgeQuestion` parameter; provider cooldown.
- `electron/llm/WhatToAnswerLLM.ts` — passes the question; model sentinel; first-token/answer diag lines.
- `electron/llm/prompts.ts` — `SPOKEN_WORD_TARGET`.
- `electron/llm/prompts/questionDetection.ts` — complete-question contract.
- `src/components/NativelyInterface.tsx` — delete the two label guesses.
- `electron/test/golden/interview60.run.mjs` — `app:start`, `app:stop`, `probe`, `gate`, new `auto`.
- `electron/test/golden/interview60.report-html.mjs` — reads metrics from the module; two-run mode.
- `electron/test/golden/README.md` — the new commands.

---

### Task 1: Persist Live mode (spec §1.1)

**Files:**
- Create: `electron/services/liveMode.ts`, `electron/services/liveMode.test.ts`
- Modify: `electron/services/CredentialsManager.ts` (interface at line ~33, getters near line 212, setters near line 351)
- Modify: `electron/main.ts` (`setLiveMode` at ~1806, `startMeeting` after `this.chipDeduper.reset()` at ~1725)

**Interfaces:**
- Produces: `export type LiveMode = 'off' | 'suggest' | 'auto'`; `export function normalizeLiveMode(value: unknown): LiveMode`; `CredentialsManager.getLiveMode(): LiveMode`; `CredentialsManager.setLiveMode(mode: LiveMode): void`; log line `[Main] Live Mode restored → auto` (Task 2's waiter and Task 16 parse it).

- [ ] **Step 1: Write the failing test**

`electron/services/liveMode.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeLiveMode } from './liveMode';

describe('normalizeLiveMode', () => {
    it('passes the three valid modes through', () => {
        expect(normalizeLiveMode('off')).toBe('off');
        expect(normalizeLiveMode('suggest')).toBe('suggest');
        expect(normalizeLiveMode('auto')).toBe('auto');
    });
    it('maps anything else to off — a corrupt or missing stored value must never start the router', () => {
        expect(normalizeLiveMode(undefined)).toBe('off');
        expect(normalizeLiveMode(null)).toBe('off');
        expect(normalizeLiveMode('AUTO')).toBe('off');
        expect(normalizeLiveMode(42)).toBe('off');
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run electron/services/liveMode.test.ts`
Expected: FAIL — cannot resolve `./liveMode`.

- [ ] **Step 3: Implement**

`electron/services/liveMode.ts`:
```ts
export type LiveMode = 'off' | 'suggest' | 'auto';

/** Stored values come from disk; only the three literal modes are trusted. */
export function normalizeLiveMode(value: unknown): LiveMode {
    return value === 'suggest' || value === 'auto' ? value : 'off';
}
```

`electron/services/CredentialsManager.ts` — add to `StoredCredentials` after `defaultModel?: string;`:
```ts
    /** Live listener mode, restored on the next meeting start (was lost on every restart). */
    liveMode?: 'off' | 'suggest' | 'auto';
```
Add next to `getDefaultModel()`:
```ts
    public getLiveMode(): 'off' | 'suggest' | 'auto' {
        return normalizeLiveMode(this.credentials.liveMode);
    }
```
Add next to `setDefaultModel()`:
```ts
    public setLiveMode(mode: 'off' | 'suggest' | 'auto'): void {
        this.credentials.liveMode = normalizeLiveMode(mode);
        this.saveCredentials();
        console.log(`[CredentialsManager] Live Mode set to: ${this.credentials.liveMode}`);
    }
```
Import at the top of the file: `import { normalizeLiveMode } from './liveMode';`

`electron/main.ts` — in `setLiveMode`, after `this.liveMode = next;`:
```ts
    CredentialsManager.getInstance().setLiveMode(next);
```
(`CredentialsManager` is required inline elsewhere in this file: `const { CredentialsManager } = require('./services/CredentialsManager');` — use the same inline require immediately above the call.)

In `startMeeting`, directly after `this.chipDeduper.reset();`:
```ts
    // Live mode used to live only in memory, so every restart forgot it and an
    // unattended relaunch came up deaf. Restore the stored mode when the
    // meeting starts — the router needs an active meeting anyway.
    {
      const { CredentialsManager } = require('./services/CredentialsManager');
      const stored = CredentialsManager.getInstance().getLiveMode();
      if (stored !== 'off' && this.liveMode === 'off') {
        this.liveMode = stored;
        console.log(`[Main] Live Mode restored → ${stored}`);
        this.startLiveRouter();
      }
    }
```
Note `startLiveRouter()` is already called later in `setLiveMode` when `isMeetingActive`; here `isMeetingActive` was set true two lines above, so the router starts exactly as an IPC set would.

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run electron/services/liveMode.test.ts && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add electron/services/liveMode.ts electron/services/liveMode.test.ts electron/services/CredentialsManager.ts electron/main.ts
git commit -m "feat(live): persist Live mode and restore it when a meeting starts

An app restart reverted Live to Off in memory, so an unattended relaunch
came up deaf. The mode is stored with the other credentials-file settings
and restored at meeting start, logged as '[Main] Live Mode restored → …'.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Dev-only meeting autostart + harness app lifecycle (spec §1.2, §1.3)

**Files:**
- Modify: `electron/main.ts` (after `appState.createWindow()` at ~3116)
- Create: `electron/test/golden/interview60.lib.mjs`, `electron/test/golden/interview60.lib.test.ts`
- Modify: `electron/test/golden/interview60.run.mjs` (imports, new commands, `auto`)
- Modify: `electron/test/golden/README.md`

**Interfaces:**
- Consumes: `[Main] Live Mode restored → auto` (Task 1); the existing line `[Main] Starting Meeting...`.
- Produces: `interview60.lib.mjs` exports `logSize(file)`, `logSince(file, from, to)`, `overlap(a, b)`, `waitForLogLines(file, fromOffset, patterns, opts)`, `snapshotRun(destDir, files)`; `run.mjs` commands `app:start`, `app:stop`, `probe`, `auto [label]`; pid file `electron/test/golden/interview60.runs/app.pid`.

- [ ] **Step 1: Write the failing test for the waiter**

`electron/test/golden/interview60.lib.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore — untyped ESM harness module; vitest resolves it, tsc has no declaration for it
import { waitForLogLines, logSince, overlap } from './interview60.lib.mjs';

const tmp = () => path.join(os.tmpdir(), `i60-lib-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);

describe('waitForLogLines', () => {
    it('resolves once every pattern has appeared after the offset', async () => {
        const f = tmp();
        fs.writeFileSync(f, 'old line\n');
        const from = fs.statSync(f).size;
        setTimeout(() => fs.appendFileSync(f, '[Main] Starting Meeting...\n'), 30);
        setTimeout(() => fs.appendFileSync(f, '[Main] Live Mode restored → auto\n'), 60);
        const r = await waitForLogLines(f, from, [/Starting Meeting/, /Live Mode restored → auto/], { timeoutMs: 2000, pollMs: 10 });
        expect(r.ok).toBe(true);
        expect(r.missing).toEqual([]);
    });
    it('reports which pattern never appeared and does not hang', async () => {
        const f = tmp();
        fs.writeFileSync(f, '');
        fs.appendFileSync(f, '[Main] Starting Meeting...\n');
        const r = await waitForLogLines(f, 0, [/Starting Meeting/, /Live Mode restored → auto/], { timeoutMs: 100, pollMs: 10 });
        expect(r.ok).toBe(false);
        expect(r.missing.map(String)).toEqual([String(/Live Mode restored → auto/)]);
    });
    it('ignores lines written before the offset', async () => {
        const f = tmp();
        fs.writeFileSync(f, '[Main] Live Mode restored → auto\n');
        const from = fs.statSync(f).size;
        const r = await waitForLogLines(f, from, [/Live Mode restored → auto/], { timeoutMs: 100, pollMs: 10 });
        expect(r.ok).toBe(false);
    });
});

describe('logSince / overlap', () => {
    it('reads only the byte range asked for', () => {
        const f = tmp();
        fs.writeFileSync(f, 'abcdef');
        expect(logSince(f, 2, 4)).toBe('cd');
        expect(logSince(f, 4)).toBe('ef');
        expect(logSince(f, 9)).toBe('');
    });
    it('overlap is the fraction of the first text’s content words found in the second', () => {
        expect(overlap('Why do Docker layers matter for build times?', 'why do docker layer\'s matter for build')).toBeCloseTo(3 / 5, 5);
        expect(overlap('', 'anything')).toBe(0);
    });
});
```
(`overlap` keeps words longer than 3 letters: `docker, layers, matter, build, times` → `layer's` normalises to `layer` + `s`, so 3 of 5 match: docker, matter, build.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run electron/test/golden/interview60.lib.test.ts`
Expected: FAIL — cannot resolve `./interview60.lib.mjs`.

- [ ] **Step 3: Implement the library**

`electron/test/golden/interview60.lib.mjs`:
```js
/**
 * Shared helpers for the interview60 harness. Pure where possible so they can
 * be unit-tested; the run script, the metrics module and the report import them.
 */
import fs from 'node:fs';
import path from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nowIso = () => new Date().toISOString();

export function logSize(file) {
    try { return fs.statSync(file).size; } catch { return 0; }
}

/** Bytes [from, to) of a file as utf8; '' when the range is empty or the file is missing. */
export function logSince(file, from, to) {
    if (!fs.existsSync(file)) return '';
    const size = fs.statSync(file).size;
    const end = Math.min(to ?? size, size);
    if (end <= from) return '';
    const fd = fs.openSync(file, 'r');
    try {
        const buf = Buffer.alloc(end - from);
        fs.readSync(fd, buf, 0, buf.length, from);
        return buf.toString('utf8');
    } finally { fs.closeSync(fd); }
}

const norm = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3));

/** Fraction of a's content words (len > 3) present in b. 0 when a has none. */
export function overlap(a, b) {
    const A = norm(a), B = norm(b);
    if (!A.size) return 0;
    let hit = 0;
    for (const w of A) if (B.has(w)) hit++;
    return hit / A.size;
}

/**
 * Poll a log file until every pattern has matched in the bytes appended after
 * fromOffset. Never throws: returns { ok, missing } so callers can report.
 */
export async function waitForLogLines(file, fromOffset, patterns, { timeoutMs = 90_000, pollMs = 500 } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const text = logSince(file, fromOffset);
        const missing = patterns.filter((p) => !p.test(text));
        if (!missing.length) return { ok: true, missing: [] };
        if (Date.now() >= deadline) return { ok: false, missing };
        await sleep(pollMs);
    }
}

/** Copy the named files into destDir (created), skipping ones that do not exist. Returns the copied names. */
export function snapshotRun(destDir, files) {
    fs.mkdirSync(destDir, { recursive: true });
    const copied = [];
    for (const f of files) {
        if (!fs.existsSync(f)) continue;
        fs.copyFileSync(f, path.join(destDir, path.basename(f)));
        copied.push(path.basename(f));
    }
    return copied;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run electron/test/golden/interview60.lib.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the autostart hook**

`electron/main.ts`, immediately after the line `appState.createWindow()` (~3116):
```ts
  // Dev-only: the interview60 harness relaunches the app unattended and needs a
  // meeting running without a click. Same env-gate pattern as
  // NATIVELY_DETECTOR_CHAIN_TEST; production never sets it.
  if (process.env.NATIVELY_AUTOSTART_MEETING === '1') {
    setTimeout(() => {
      console.log('[Init] NATIVELY_AUTOSTART_MEETING=1 — starting a meeting automatically');
      appState.startMeeting({ title: 'autostart', source: 'env' })
        .catch((err: any) => console.error('[Init] autostart meeting failed:', err?.message ?? err));
    }, 1500);
  }
```

- [ ] **Step 6: Add the lifecycle commands to the run script**

`electron/test/golden/interview60.run.mjs` — add to the imports:
```js
import { spawn } from 'child_process';
import { logSize as libLogSize, logSince as libLogSince, waitForLogLines, snapshotRun, sleep as libSleep } from './interview60.lib.mjs';
```
Add constants after `REPORT`:
```js
const RUNS_DIR = path.join(HERE, 'interview60.runs');
const PID_FILE = path.join(RUNS_DIR, 'app.pid');
const ANSWERS = path.join(HERE, 'interview60.answers.json');
const CHAINS = path.join(HERE, 'interview60.chains.json');
const HTML = path.join(HERE, 'interview60.report.html');
```
Replace the local `sleep`, `logSize`, `logSince` definitions with the imported ones (keep the names `sleep`, `logSize`, `logSince` bound: `const sleep = libSleep; const logSize = libLogSize; const logSince = libLogSince;`). Delete the old function bodies so there is one implementation.

Add the commands (before `// ── PREFLIGHT`):
```js
// ── APP LIFECYCLE ──────────────────────────────────────────────────────────
function ps(cmd) {
    return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', stdio: 'pipe' });
}

/** Kill the app: the tree we spawned if we have its pid, else every electron process running THIS checkout. */
function appStop() {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
    if (fs.existsSync(PID_FILE)) {
        const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
        console.log(`APP STOP  taskkill tree pid=${pid}`);
        try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'pipe' }); } catch { /* already gone */ }
        fs.unlinkSync(PID_FILE);
    }
    // Hand-started instance (or a leftover): match on the checkout path in the
    // command line. Exclude THIS process and its parent — the harness itself is
    // a node process whose command line contains the checkout path.
    const needle = PROJ.replace(/\\/g, '\\\\');
    const out = ps(`Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(electron|node)\\.exe$' -and $_.CommandLine -match '${needle.replace(/'/g, "''")}' -and $_.ProcessId -ne ${process.pid} -and $_.ProcessId -ne ${process.ppid} } | ForEach-Object { $_.ProcessId }`);
    const pids = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    for (const pid of pids) {
        try { execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'pipe' }); } catch { /* raced */ }
    }
    console.log(`APP STOP  killed ${pids.length} process(es) of this checkout`);
}

/** Spawn `npm start` with the autostart flag; wait for the two log lines that prove it is listening in Auto. */
async function appStart() {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
    const from = logSize(DEBUG_LOG);
    const child = spawn('cmd.exe', ['/c', 'npm', 'start'], {
        cwd: PROJ,
        env: { ...process.env, NATIVELY_AUTOSTART_MEETING: '1' },
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
    });
    child.unref();
    fs.writeFileSync(PID_FILE, String(child.pid));
    console.log(`APP START  pid=${child.pid}  waiting for the app to come up listening in Auto…`);
    const r = await waitForLogLines(DEBUG_LOG, from, [/\[Main\] Starting Meeting/, /\[Main\] Live Mode restored → auto/], { timeoutMs: 90_000, pollMs: 1000 });
    if (!r.ok) {
        console.log(`APP START  FAILED — never saw: ${r.missing.map(String).join(', ')}`);
        console.log('  If "Live Mode restored → auto" is missing, set Live to Auto once in the UI (it is persisted from then on).');
        process.exit(1);
    }
    console.log('APP START  listening in Auto');
}

/** One flash-lite call + the Live preflight. Any 429 postpones the hour. */
async function probe() {
    const s = await modelAlive('gemini-3.1-flash-lite');
    console.log(`PROBE  gemini-3.1-flash-lite HTTP ${s}`);
    if (s === 429) return { ready: false, reason: 'flash-lite quota (429)' };
    if (s !== 200) return { ready: false, reason: `flash-lite HTTP ${s}` };
    const out = runPreflight();
    console.log(out);
    return /READY — safe to start the hour/.test(out) ? { ready: true } : { ready: false, reason: 'preflight not green' };
}
```
Replace the whole `auto` function with:
```js
/**
 * stop → build → start → probe → hour → report → snapshot. One command.
 * Polls the probe every 2 min up to the deadline so a quota wall postpones
 * rather than wastes the hour.
 */
async function auto(label = 'after') {
    appStop();
    console.log('AUTO  building electron…');
    execFileSync('cmd.exe', ['/c', 'npm', 'run', 'build:electron'], { cwd: PROJ, stdio: 'inherit' });
    await appStart();

    const DEADLINE_MS = Number(process.env.I60_PROBE_DEADLINE_MIN ?? 45) * 60 * 1000;
    const startedWaiting = Date.now();
    for (let attempt = 1; ; attempt++) {
        console.log(`\nAUTO  probe attempt ${attempt}  ${now()}`);
        const p = await probe();
        if (p.ready) break;
        if (Date.now() - startedWaiting > DEADLINE_MS) {
            console.log(`AUTO  GAVE UP after ${Math.round(DEADLINE_MS / 60000)} min — ${p.reason}. The hour was NOT spent.`);
            process.exit(1);
        }
        console.log(`AUTO  not ready (${p.reason}) — retrying in 2 min.`);
        await sleep(120000);
    }
    await appPass();
    report();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(RUNS_DIR, `${stamp}-${label}`);
    const copied = snapshotRun(dest, [DEBUG_LOG, DIAG_LOG, TIMELINE, REPORT, ANSWERS, CHAINS, HTML]);
    console.log(`AUTO  snapshot ${dest}: ${copied.join(', ')}`);
}
```
Update the dispatch at the bottom:
```js
const cmd = process.argv[2];
if (cmd === 'preflight') await preflight();
else if (cmd === 'app') await appPass();
else if (cmd === 'report') report();
else if (cmd === 'app:start') await appStart();
else if (cmd === 'app:stop') appStop();
else if (cmd === 'probe') { const p = await probe(); console.log(p.ready ? 'PROBE READY' : `PROBE NOT READY — ${p.reason}`); process.exit(p.ready ? 0 : 1); }
else if (cmd === 'auto') await auto(process.argv[3]);   // label defaults to "after"
else { console.log('usage: interview60.run.mjs preflight|app|report|app:start|app:stop|probe|auto [label]'); process.exit(2); }
```
Also update the header comment of the file: replace the paragraph starting "Live mode is NOT persisted" with:
```
 * Live mode IS persisted now (CredentialsManager.liveMode, restored at meeting
 * start) and NATIVELY_AUTOSTART_MEETING=1 starts a meeting on launch, so `auto`
 * can stop, rebuild and relaunch the app itself. Preflight still runs right
 * before the hour because the audio chain is what fails silently.
```

- [ ] **Step 7: README**

In `electron/test/golden/README.md`, replace the `auto` line in the interview60 code block and the "Live mode is not persisted" bullet with:
```
node electron/test/golden/interview60.run.mjs auto [label]   # stop → build → relaunch → probe → hour → report → snapshot to interview60.runs/<stamp>-<label>/
node electron/test/golden/interview60.run.mjs app:start|app:stop|probe   # the pieces, individually
```
and
```
- **Relaunch is unattended.** Live mode is persisted (set it to Auto once in the UI) and
  `NATIVELY_AUTOSTART_MEETING=1` starts a meeting on launch; `app:start` waits for
  `[Main] Starting Meeting` and `[Main] Live Mode restored → auto` in the debug log and
  fails loudly after 90 s.
```

- [ ] **Step 8: Build, relaunch twice, prove it**

Run: `npx tsc --noEmit && npm run build:electron`
Then: `node electron/test/golden/interview60.run.mjs app:stop` (kills the hand-started instance), then `node electron/test/golden/interview60.run.mjs app:start` — expected `APP START  listening in Auto`. If it fails with the restore line missing: the stored mode is still `off` (Task 1 only persists on the next set) — open the app UI once, click the Live pill to Auto, then `app:stop` + `app:start` again. Then repeat `app:stop` + `app:start` a second time — expected the same two lines with no click. Then `node electron/test/golden/interview60.run.mjs preflight` — expected `READY — safe to start the hour`. Quote the four log lines in the commit body.

- [ ] **Step 9: Commit**

```bash
git add electron/main.ts electron/test/golden/interview60.lib.mjs electron/test/golden/interview60.lib.test.ts electron/test/golden/interview60.run.mjs electron/test/golden/README.md
git commit -m "feat(harness): the run script relaunches the app itself

NATIVELY_AUTOSTART_MEETING=1 (dev-only, env-gated like the detector chain
test) starts a meeting on launch; interview60.run.mjs gains app:start /
app:stop / probe, and auto now stops, rebuilds, relaunches, probes quota,
runs the hour and snapshots the run's logs into interview60.runs/.

Proof: <paste the two relaunch log-line pairs and the preflight READY line>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Per-socket summary instrumentation in DeepgramStreamingSTT (spec §2.2)

**Files:**
- Modify: `electron/audio/DeepgramStreamingSTT.ts` (fields ~line 19–34; `write()` ~116; Open handler ~160–200; Close handler ~210)
- Create: `electron/audio/DeepgramStreamingSTT.socketSummary.test.ts`

**Interfaces:**
- Produces the log line, parsed by Task 4's reading and Task 16:
  `[DeepgramStreaming] socket #<n> lived <s>s — <chunks> chunks / <bytes> bytes to send() after the flush, <k> keepalive ticks, last send <t>s before close, readyState at last write=<r>, writes while not open=<w>`

- [ ] **Step 1: Write the failing test**

`electron/audio/DeepgramStreamingSTT.socketSummary.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The class requires '@deepgram/sdk' inside connect(); replace it with a fake
// whose live object records sends and lets the test fire Open / Close.
type Handler = (...a: any[]) => void;
const handlers: Record<string, Handler[]> = {};
const sent: any[] = [];
let keepAlives = 0;
let readyState = 1;
const fakeLive = {
    on: (ev: string, cb: Handler) => { (handlers[ev] ??= []).push(cb); },
    send: (d: any) => { sent.push(d); },
    keepAlive: () => { keepAlives++; },
    requestClose: () => {},
    getReadyState: () => readyState,
};
const fire = (ev: string, ...args: any[]) => (handlers[ev] ?? []).forEach((h) => h(...args));

vi.mock('@deepgram/sdk', () => ({
    createClient: () => ({ listen: { live: () => fakeLive } }),
    LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results' },
}));

import { DeepgramStreamingSTT } from './DeepgramStreamingSTT';

describe('DeepgramStreamingSTT socket summary', () => {
    let log: string[];
    beforeEach(() => {
        for (const k of Object.keys(handlers)) delete handlers[k];
        sent.length = 0; keepAlives = 0; readyState = 1;
        log = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

    it('logs one summary per socket with what was actually handed to send()', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        // two chunks buffered before open are the flush; they must NOT count
        stt.write(Buffer.alloc(1920));
        stt.write(Buffer.alloc(1920));
        fire('open');
        vi.advanceTimersByTime(80);
        stt.write(Buffer.alloc(1920));
        vi.advanceTimersByTime(80);
        stt.write(Buffer.alloc(1920));
        vi.advanceTimersByTime(8000);          // one keepalive tick (KEEPALIVE_INTERVAL_MS = 8000)
        vi.advanceTimersByTime(2000);
        fire('close', { code: 1011, reason: 'timeout' });

        const summary = log.find((l) => l.includes('socket #1 lived'));
        expect(summary).toBeDefined();
        expect(summary).toMatch(/2 chunks \/ 3840 bytes to send\(\) after the flush/);
        expect(summary).toMatch(/1 keepalive ticks/);
        expect(summary).toMatch(/last send 10\.0s before close/);
        expect(summary).toMatch(/readyState at last write=1/);
        expect(summary).toMatch(/writes while not open=0/);
        expect(summary).toMatch(/lived 10\.2s/);
    });

    it('counts writes the SDK would silently buffer because its socket is not open', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        fire('open');
        readyState = 0;                          // SDK says CONNECTING although we saw Open
        stt.write(Buffer.alloc(1920));
        fire('close', { code: 1011, reason: 'timeout' });
        const summary = log.find((l) => l.includes('socket #1 lived'));
        expect(summary).toMatch(/writes while not open=1/);
        expect(summary).toMatch(/readyState at last write=0/);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run electron/audio/DeepgramStreamingSTT.socketSummary.test.ts`
Expected: FAIL — no line containing `socket #1 lived`.

- [ ] **Step 3: Implement**

`electron/audio/DeepgramStreamingSTT.ts` — add fields after `private isConnecting = false;`:
```ts
    // Per-socket accounting for the close summary. The 2026-09-02 flight test
    // showed the server closing every socket ~10 s after open as idle even
    // while it was transcribing; this line is what says whether our audio and
    // keepalives actually reached send().
    private sockSeq = 0;
    private sockOpenedAt = 0;
    private sockChunks = 0;
    private sockBytes = 0;
    private sockKeepAlives = 0;
    private sockLastSendAt = 0;
    private sockLastReadyState: number | string = 'n/a';
    private sockNotOpenWrites = 0;
```
In `write()`, replace the `try { this.live.send(chunk); }` block with:
```ts
        try {
            const rs = typeof this.live?.getReadyState === 'function' ? this.live.getReadyState() : 'n/a';
            this.sockLastReadyState = rs;
            if (rs !== 'n/a' && rs !== 1) this.sockNotOpenWrites++;
            this.live.send(chunk);
            this.sockChunks++;
            this.sockBytes += chunk.length;
            this.sockLastSendAt = Date.now();
        } catch (err: any) {
            console.error('[DeepgramStreaming] Send error:', err?.message);
        }
```
In the Open handler, right after `console.log('[DeepgramStreaming] Connected');`:
```ts
                this.sockSeq++;
                this.sockOpenedAt = Date.now();
                this.sockChunks = 0; this.sockBytes = 0; this.sockKeepAlives = 0;
                this.sockLastSendAt = this.sockOpenedAt; this.sockLastReadyState = 'n/a'; this.sockNotOpenWrites = 0;
```
The flush loop (`for (const chunk of buffered) { try { this.live?.send(chunk); } catch { } }`) stays as it is — flushed chunks are deliberately not counted.
In the keepalive interval callback, after `this.live?.keepAlive();` add `this.sockKeepAlives++;`.
In the Close handler, right after the `Closed (code=…)` log:
```ts
                if (this.sockOpenedAt) {
                    const now = Date.now();
                    console.log(`[DeepgramStreaming] socket #${this.sockSeq} lived ${((now - this.sockOpenedAt) / 1000).toFixed(1)}s — ${this.sockChunks} chunks / ${this.sockBytes} bytes to send() after the flush, ${this.sockKeepAlives} keepalive ticks, last send ${((now - this.sockLastSendAt) / 1000).toFixed(1)}s before close, readyState at last write=${this.sockLastReadyState}, writes while not open=${this.sockNotOpenWrites}`);
                    this.sockOpenedAt = 0;
                }
```

- [ ] **Step 4: Run the test, the whole suite, and tsc**

Run: `npx vitest run electron/audio/DeepgramStreamingSTT.socketSummary.test.ts && npm test && npx tsc --noEmit`
Expected: the new tests PASS; suite all green; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add electron/audio/DeepgramStreamingSTT.ts electron/audio/DeepgramStreamingSTT.socketSummary.test.ts
git commit -m "feat(stt): per-socket summary line at close

One line per Deepgram socket: lifetime, chunks and bytes handed to send()
after the reconnect flush, keepalive ticks, time since the last send, the
SDK ready state at the last write, and writes made while not open. This is
the number the 2026-09-02 flight test could not produce.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 6: Reproduce in the app and record the numbers**

Run: `npm run build:electron && node electron/test/golden/interview60.run.mjs app:stop && node electron/test/golden/interview60.run.mjs app:start`
Then note the debug log size, play the probe and wait through silence:
```bash
node -e "console.log(require('fs').statSync('natively_debug.log').size)"
powershell -NoProfile -Command "(New-Object Media.SoundPlayer 'C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\probe-continuous.wav').PlaySync(); Start-Sleep -Seconds 60"
```
Then extract every summary written after that offset:
```bash
node -e "const fs=require('fs');const from=Number(process.argv[1]);const t=fs.readFileSync('natively_debug.log','utf8').slice(from);console.log(t.split('\n').filter(l=>/socket #\d+ lived|Transcript event — isFinal=(true|false), text=\"[^\"]/.test(l)).map(l=>l.replace(/^\S+T([0-9:.]{12})Z /,'$1  ')).join('\n'))" <offset>
```
Write the summaries into `docs/superpowers/plans/2026-09-02-socket-evidence.md` (force-add) together with one paragraph saying which row of the spec's §2.4 decision table they match. Commit that file alone: `git add -f docs/superpowers/plans/2026-09-02-socket-evidence.md && git commit -m "docs(stt): socket summaries from the probe reproduction" …`.

---

### Task 4: The socket fix, chosen by Task 3's numbers (spec §2.4–2.5)

**Files:**
- Modify: `electron/audio/DeepgramStreamingSTT.ts`
- Modify: `electron/audio/DeepgramStreamingSTT.socketSummary.test.ts` (add the case for the chosen fix)

**Interfaces:** none new. The summary line format from Task 3 is unchanged.

Read `docs/superpowers/plans/2026-09-02-socket-evidence.md` first. Implement EXACTLY ONE of the two variants below, the one the evidence selects. If the evidence points at the transport row of the spec's table ("bytes flow at capture rate, server still closes") or matches no row, STOP: do not implement anything, report the evidence file back to the coordinator — that fix is planned only once the cause is known.

**Variant A — writes are not reaching send() (chunks after the flush ≈ 0 while transcripts arrive, or `writes while not open` > 0 with readyState ≠ 1).**

- [ ] **A1: Write the failing test** — append to the test file:
```ts
    it('A: a write while the SDK reports CONNECTING is buffered and flushed when the SDK reports OPEN, not dropped into the SDK', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        fire('open');
        readyState = 0;
        stt.write(Buffer.alloc(1920));           // must be held, not handed to the SDK
        expect(sent.length).toBe(0);
        readyState = 1;
        stt.write(Buffer.alloc(1920));           // now both go out, in order
        expect(sent.length).toBe(2);
    });
```
- [ ] **A2: Run it** — `npx vitest run electron/audio/DeepgramStreamingSTT.socketSummary.test.ts` — Expected: FAIL (`sent.length` is 1 on the first assertion).
- [ ] **A3: Implement** — in `write()`, replace the readiness test `if (!this.isOpen) {` with a check that consults the SDK's own state, and drain our buffer when it reports open:
```ts
        const sdkOpen = typeof this.live?.getReadyState === 'function' ? this.live.getReadyState() === 1 : this.isOpen;
        if (!this.isOpen || !sdkOpen) {
            this.buffer.push(chunk);
            if (this.buffer.length > 500) this.buffer.shift();
            if (!this.isConnecting && this.shouldReconnect && !this.reconnectTimer && !this.isOpen) {
                this.connect();
            }
            return;
        }
        if (this.buffer.length) {
            const held = this.buffer.splice(0);
            for (const c of held) { try { this.live.send(c); this.sockChunks++; this.sockBytes += c.length; } catch { } }
        }
```
(the existing `try { … this.live.send(chunk) … }` block follows unchanged).
- [ ] **A4: Adjust Task 3's second test** — with A, a write while the SDK reports CONNECTING is buffered rather than handed to the SDK, so that test's expectations become `writes while not open=0` and `readyState at last write=1` (the write happens on the later flush). Change those two assertions; the counter stays in the summary line for the day it is non-zero again.
- [ ] **A5: Run the test file and the suite** — Expected: PASS.

**Variant C — the capture goes quiet in silence and the keepalive is not being sent (chunks after the flush ≈ 0 in silence AND `keepalive ticks` = 0 on sockets that lived > 8 s).**

- [ ] **C1: Write the failing test** — append:
```ts
    it('C: the keepalive keeps ticking for the life of the socket, including after a reconnect', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        fire('open');
        vi.advanceTimersByTime(8000 * 3 + 10);
        expect(keepAlives).toBe(3);
        fire('close', { code: 1011, reason: 'timeout' });
        vi.advanceTimersByTime(1000 + 10);       // reconnect delay
        fire('open');
        keepAlives = 0;
        vi.advanceTimersByTime(8000 * 2 + 10);
        expect(keepAlives).toBe(2);
    });
```
- [ ] **C2: Run it** — Expected: FAIL with `keepAlives` below the expected count (the evidence says the interval is not alive).
- [ ] **C3: Implement** — the interval is created in the Open handler and cleared by `clearTimers()` in the Close handler. Make its lifecycle unconditional on `isOpen` and re-created on every Open: in the Open handler, before creating it, add `if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);` and change the callback to
```ts
                this.keepAliveInterval = setInterval(() => {
                    try { this.live?.keepAlive(); this.sockKeepAlives++; } catch { }
                }, KEEPALIVE_INTERVAL_MS);
```
(the `if (this.isOpen)` guard goes: `isOpen` is set false by our own Close handler, which also clears the interval, so the guard only ever suppressed ticks on a socket we still believed open).
- [ ] **C4: Run the test file and the suite** — Expected: PASS.

- [ ] **Step 5 (both variants): Live proof**

`npm run build:electron`, then `app:stop` + `app:start`, then play the probe followed by three minutes of silence and count closes and utterance completeness:
```bash
node -e "console.log(require('fs').statSync('natively_debug.log').size)"
powershell -NoProfile -Command "(New-Object Media.SoundPlayer '<checkout>\electron\test\golden\probe-continuous.wav').PlaySync(); Start-Sleep -Seconds 180"
node -e "const fs=require('fs');const t=fs.readFileSync('natively_debug.log','utf8').slice(Number(process.argv[1]));console.log('code-1011 closes:',(t.match(/Closed \(code=1011/g)||[]).length);console.log(t.split('\n').filter(l=>/isFinal=true, text=\"[^\"]/.test(l)).map(l=>l.replace(/^\S+T([0-9:.]{12})Z /,'$1  ')).join('\n'))" <offset>
```
Expected: `code-1011 closes: 0` and two complete finals ("Why do docker layers matter for build times?" and the full autoscaling question). If closes are not 0, the variant was wrong: revert the variant (`git checkout -- electron/audio/DeepgramStreamingSTT.ts`, remove the test case) and STOP with the new numbers.

- [ ] **Step 6: Commit**

```bash
git add electron/audio/DeepgramStreamingSTT.ts electron/audio/DeepgramStreamingSTT.socketSummary.test.ts
git commit -m "fix(stt): <one line naming the cause the evidence showed>

<two or three sentences: the summary numbers before, the change, the
numbers after — closes over 3 min of probe audio + silence: N → 0>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: ChipDeduper answered-mark, anchor matching, and the dispatch decision (spec §3.1, §3.3)

**Files:**
- Create: `electron/services/questionReconcile.ts`, `electron/services/questionReconcile.test.ts`
- Modify: `electron/services/ChipDeduper.ts`, `electron/services/ChipDeduper.test.ts`
- Create: `electron/services/detectionDispatch.ts`, `electron/services/detectionDispatch.test.ts`

**Interfaces:**
- Produces:
  - `questionReconcile.ts`: `export function overlap(a: string, b: string): number`; `export function sameAnchor(a: string, b: string): boolean`; `export interface RecentSpeech { text: string; at: number; final: boolean }`; `export type ReconcileVerdict = 'match' | 'paraphrase' | 'replaced' | 'unverifiable'`; `export interface Reconciled { text: string; anchor: string | null; verdict: ReconcileVerdict; score: number }`; `export function reconcileLiveQuestion(liveText: string, recent: RecentSpeech[]): Reconciled`.
  - `ChipDeduper`: `DedupCandidate.anchor?: string`; `AdmitResult.alreadyAnswered?: boolean`; `markAnswered(question: string): void`.
  - `detectionDispatch.ts`: `export type DispatchAction = 'answer' | 'chip' | 'drop'`; `export function decideDispatch(mode: 'off' | 'suggest' | 'auto', verdict: AdmitResult): DispatchAction`.

- [ ] **Step 1: Write the failing reconcile tests** — `electron/services/questionReconcile.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { overlap, sameAnchor, reconcileLiveQuestion, type RecentSpeech } from './questionReconcile';

const t0 = 1_000_000;
const sp = (text: string, dt: number, final = true): RecentSpeech => ({ text, at: t0 + dt, final });

describe('overlap / sameAnchor', () => {
    it('overlap = fraction of the first text’s content words (len > 3) found in the second', () => {
        expect(overlap('How would you handle a dataset that must be deleted on request for compliance?',
            'How do you design a system where customer data must be deleted on request for co')).toBeCloseTo(3 / 8, 5);
    });
    it('sameAnchor holds when either side covers the other by half, or one contains the other', () => {
        expect(sameAnchor('Why do Docker layers matter for build times?', 'why do docker layer\'s matter for build')).toBe(true);
        expect(sameAnchor('architecture.', 'Can you explain Transformers? architecture.')).toBe(true);
        expect(sameAnchor('What is a SageMaker endpoint?', 'How do you keep base images patched?')).toBe(false);
    });
});

describe('reconcileLiveQuestion — fixtures from the 2026-09-02 log', () => {
    it('M04: Live invented a question; the interim transcript carried the real one → replaced', () => {
        const r = reconcileLiveQuestion(
            'Tell me about a time you handled a resource constraint problem in a deployment.',
            [sp('Why would you use CloudFormation instead of configuring things by', -5000, false)],
        );
        expect(r.verdict).toBe('replaced');
        expect(r.text).toBe('Why would you use CloudFormation instead of configuring things by');
        expect(r.anchor).toBe('Why would you use CloudFormation instead of configuring things by');
    });
    it('M25: Live rewrote the question → paraphrase, anchored to the transcript sentence', () => {
        const r = reconcileLiveQuestion(
            'How do you design a system where customer data must be deleted on request for co',
            [sp('How would you handle a dataset that must be deleted on request for compliance?', -4000)],
        );
        expect(r.verdict).toBe('paraphrase');
        expect(r.text).toBe('How do you design a system where customer data must be deleted on request for co');
        expect(r.anchor).toBe('How would you handle a dataset that must be deleted on request for compliance?');
    });
    it('W02: Live matched the transcript closely → match, Live wording kept', () => {
        const r = reconcileLiveQuestion('Why do Docker layers matter for build times?',
            [sp('why do docker layer\'s matter for build times?', -3000)]);
        expect(r.verdict).toBe('match');
        expect(r.text).toBe('Why do Docker layers matter for build times?');
    });
    it('no interviewer speech in the window → unverifiable, Live accepted as the only ear', () => {
        const r = reconcileLiveQuestion('What is a Pod?', []);
        expect(r.verdict).toBe('unverifiable');
        expect(r.text).toBe('What is a Pod?');
        expect(r.anchor).toBeNull();
    });
    it('picks the best-matching sentence when several are in the window', () => {
        const r = reconcileLiveQuestion('How do you keep base images patched across many model services?', [
            sp('How would you handle a dataset that must be deleted on request for compliance?', -60000),
            sp('How do you keep base images patched across many model services?', -3000),
        ]);
        expect(r.verdict).toBe('match');
        expect(r.anchor).toBe('How do you keep base images patched across many model services?');
    });
});
```

- [ ] **Step 2: Run it** — `npx vitest run electron/services/questionReconcile.test.ts` — Expected: FAIL, module missing.

- [ ] **Step 3: Implement `questionReconcile.ts`**
```ts
/**
 * Reconcile what the Live listener SAYS was asked with what the STT HEARD.
 *
 * On 2026-09-02 Live emitted "Tell me about a time you handled a resource
 * constraint problem…" while the interim transcript carried, verbatim, "Why
 * would you use CloudFormation instead of configuring things by…". Nothing
 * compared the two, so the invented question became the chip and the intent.
 * Live also paraphrases freely, which defeated text-based dedupe (12 double
 * chips in the hour). Both problems have one fix: anchor every Live question
 * to the transcript sentence it came from.
 */
export interface RecentSpeech { text: string; at: number; final: boolean }
export type ReconcileVerdict = 'match' | 'paraphrase' | 'replaced' | 'unverifiable';
export interface Reconciled { text: string; anchor: string | null; verdict: ReconcileVerdict; score: number }

const words = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3));

/** Fraction of a's content words (len > 3) present in b. 0 when a has none. */
export function overlap(a: string, b: string): number {
    const A = words(a), B = words(b);
    if (!A.size) return 0;
    let hit = 0;
    for (const w of A) if (B.has(w)) hit++;
    return hit / A.size;
}

/** Two detections describe the same utterance when either covers half the other's content, or one contains the other. */
export function sameAnchor(a: string, b: string): boolean {
    const na = a.toLowerCase().trim(), nb = b.toLowerCase().trim();
    if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
    return overlap(a, b) >= 0.5 || overlap(b, a) >= 0.5;
}

const MATCH = 0.5;
const PARAPHRASE = 0.25;

export function reconcileLiveQuestion(liveText: string, recent: RecentSpeech[]): Reconciled {
    const spoken = recent.filter((r) => r.text.trim().length > 0);
    if (!spoken.length) return { text: liveText, anchor: null, verdict: 'unverifiable', score: 0 };
    let best = spoken[0], bestScore = -1;
    for (const r of spoken) {
        const s = overlap(liveText, r.text);
        if (s > bestScore) { best = r; bestScore = s; }
    }
    if (bestScore >= MATCH) return { text: liveText, anchor: best.text, verdict: 'match', score: bestScore };
    if (bestScore >= PARAPHRASE) return { text: liveText, anchor: best.text, verdict: 'paraphrase', score: bestScore };
    // Below the floor while the window holds speech: Live's text is not what was said.
    // Surface the most recent thing the interviewer actually said instead.
    const latest = spoken.reduce((a, b) => (b.at > a.at ? b : a));
    return { text: latest.text, anchor: latest.text, verdict: 'replaced', score: bestScore };
}
```

- [ ] **Step 4: Run it** — Expected: PASS (7 tests).

- [ ] **Step 5: Write the failing deduper tests** — append to `electron/services/ChipDeduper.test.ts`:
```ts
describe('ChipDeduper — answered mark and anchors (2026-09-02)', () => {
  it('a suppressed duplicate says whether the original was already answered', () => {
    const d = new ChipDeduper();
    d.admit({ question: 'What is a Pod?', source: 'whisper' });
    expect(d.admit({ question: 'What is a Pod?', source: 'live' }).alreadyAnswered).toBe(false);
    d.markAnswered('What is a Pod?');
    expect(d.admit({ question: 'What is a Pod?', source: 'live' }).alreadyAnswered).toBe(true);
  });

  it('two detections anchored to the same transcript sentence are one question even when their texts differ', () => {
    const d = new ChipDeduper();
    const anchor = 'How would you handle a dataset that must be deleted on request for compliance?';
    d.admit({ question: anchor, source: 'whisper', anchor });
    const live = d.admit({
      question: 'How do you design a system where customer data must be deleted on request for co',
      source: 'live',
      anchor,
    });
    expect(live.admitted).toBe(false);
    expect(live.duplicateOfSource).toBe('whisper');
  });

  it('anchors only compare against anchors — an unrelated question with no anchor is still admitted', () => {
    const d = new ChipDeduper();
    d.admit({ question: 'What is a Pod?', source: 'whisper', anchor: 'What is a Pod?' });
    expect(d.admit({ question: 'How do you keep base images patched?', source: 'live' }).admitted).toBe(true);
  });
});
```

- [ ] **Step 6: Run it** — Expected: FAIL (`markAnswered` is not a function).

- [ ] **Step 7: Implement in `ChipDeduper.ts`**

Change the types:
```ts
export interface DedupCandidate {
  question: string;
  source: ChipSource;
  /** Transcript sentence this detection came from (Task 5 reconcile); anchors match anchors. */
  anchor?: string;
}

export interface AdmitResult {
  admitted: boolean;
  duplicateOfSource?: ChipSource;
  duplicateOfQuestion?: string;
  /** Set only when suppressed: whether the original detection has already been answered. */
  alreadyAnswered?: boolean;
}

interface CacheEntry {
  text: string;
  source: ChipSource;
  at: number;
  anchor?: string;
  answered: boolean;
}
```
Import `sameAnchor`: `import { sameAnchor } from './questionReconcile';`
In `admit()`, the suppressed return becomes:
```ts
      return {
        admitted: false,
        duplicateOfSource: match.source,
        duplicateOfQuestion: match.text,
        alreadyAnswered: match.answered,
      };
```
and the push becomes `this.cache.push({ text, source: candidate.source, at: now, anchor: candidate.anchor, answered: false });`. `findSimilar` gains the anchor rule — signature `private findSimilar(text: string, anchor?: string): CacheEntry | null`, called as `this.findSimilar(text, candidate.anchor)`, with this block first inside the loop:
```ts
      if (anchor && entry.anchor && sameAnchor(anchor, entry.anchor)) return entry;
```
Add the method:
```ts
  /** Record that the question (or its near-duplicate already in the cache) has been answered. */
  markAnswered(question: string): void {
    const text = (question ?? '').trim();
    if (!text) return;
    const entry = this.findSimilar(text);
    if (entry) entry.answered = true;
  }
```

- [ ] **Step 8: Run the deduper tests** — `npx vitest run electron/services/ChipDeduper.test.ts` — Expected: PASS (29).

- [ ] **Step 9: Write the failing dispatch tests** — `electron/services/detectionDispatch.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { decideDispatch } from './detectionDispatch';

describe('decideDispatch', () => {
    it('auto: the first admitted detection answers, whichever detector it came from', () => {
        expect(decideDispatch('auto', { admitted: true })).toBe('answer');
    });
    it('auto: a duplicate never answers a second time', () => {
        expect(decideDispatch('auto', { admitted: false, duplicateOfSource: 'whisper', alreadyAnswered: true })).toBe('drop');
        expect(decideDispatch('auto', { admitted: false, duplicateOfSource: 'live', alreadyAnswered: true })).toBe('drop');
    });
    it('auto: a duplicate of a detection that was NOT answered answers now — this is the 2026-09-02 race', () => {
        expect(decideDispatch('auto', { admitted: false, duplicateOfSource: 'whisper', alreadyAnswered: false })).toBe('answer');
    });
    it('suggest: admitted → chip, duplicate → drop', () => {
        expect(decideDispatch('suggest', { admitted: true })).toBe('chip');
        expect(decideDispatch('suggest', { admitted: false, duplicateOfSource: 'live', alreadyAnswered: false })).toBe('drop');
    });
    it('off: nothing is surfaced', () => {
        expect(decideDispatch('off', { admitted: true })).toBe('drop');
    });
});
```

- [ ] **Step 10: Run it** — Expected: FAIL, module missing.

- [ ] **Step 11: Implement `detectionDispatch.ts`**
```ts
import type { AdmitResult } from './ChipDeduper';

export type DispatchAction = 'answer' | 'chip' | 'drop';

/**
 * What to do with a detected interviewer question, given the Live mode and the
 * deduper's verdict. Pure, so every cell of mode × admitted × alreadyAnswered
 * is a test. Auto answers the first detection from EITHER pipeline and never
 * twice; before this, only the Live branch could answer, so a question the
 * STT detector surfaced first was never answered (22 of 52 on 2026-09-02).
 */
export function decideDispatch(mode: 'off' | 'suggest' | 'auto', verdict: AdmitResult): DispatchAction {
    if (mode === 'off') return 'drop';
    if (mode === 'suggest') return verdict.admitted ? 'chip' : 'drop';
    if (verdict.admitted) return 'answer';
    return verdict.alreadyAnswered ? 'drop' : 'answer';
}
```

- [ ] **Step 12: Run everything** — `npm test && npx tsc --noEmit` — Expected: all green.

- [ ] **Step 13: Commit**
```bash
git add electron/services/questionReconcile.ts electron/services/questionReconcile.test.ts electron/services/ChipDeduper.ts electron/services/ChipDeduper.test.ts electron/services/detectionDispatch.ts electron/services/detectionDispatch.test.ts
git commit -m "feat(detect): reconcile Live questions with the transcript; answered mark and anchors in the deduper; pure dispatch decision

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Wire `dispatchDetection` in main.ts and the speech ring buffer (spec §3.1, §3.3)

**Files:**
- Modify: `electron/IntelligenceManager.ts` (`handleTranscript` at ~239; add the buffer)
- Modify: `electron/main.ts` (Live handler inside `startLiveRouter` ~1840–1885; whisper handler ~2158–2172)

**Interfaces:**
- Consumes: Task 5's `decideDispatch`, `reconcileLiveQuestion`, `ChipDeduper.markAnswered`, `anchor`.
- Produces: `IntelligenceManager.getRecentInterviewerSpeech(windowMs = 15000): RecentSpeech[]`; log lines
  `[Main] dispatch: answer source=<live|whisper> anchor="<text>" verdict=<v>`,
  `[Main] dispatch: chip source=<live|whisper> anchor="<text>" verdict=<v>`,
  `[Main] dispatch: drop source=<live|whisper> anchor="<text>" verdict=<v> duplicateOf=<source> answered=<true|false>`
  (anchor is the first 80 characters; verdict for whisper detections is always `match`).

- [ ] **Step 1: Ring buffer in IntelligenceManager**

Add near the other fields: `private recentInterviewerSpeech: import('./services/questionReconcile').RecentSpeech[] = [];`
Replace `handleTranscript`:
```ts
    handleTranscript(segment: import('./SessionTracker').TranscriptSegment): void {
        if (segment.speaker === 'interviewer' && segment.text.trim()) {
            // Interims included: on 2026-09-02 the only record of a question the
            // STT socket dropped mid-sentence was its last interim.
            this.recentInterviewerSpeech.push({ text: segment.text, at: segment.timestamp, final: segment.final });
            if (this.recentInterviewerSpeech.length > 40) this.recentInterviewerSpeech.shift();
        }
        this.engine.handleTranscript(segment);
    }

    /** Interviewer finals and interims from the last windowMs, oldest first. */
    getRecentInterviewerSpeech(windowMs: number = 15_000): import('./services/questionReconcile').RecentSpeech[] {
        const cutoff = Date.now() - windowMs;
        return this.recentInterviewerSpeech.filter((s) => s.at >= cutoff);
    }
```

- [ ] **Step 2: The dispatcher in main.ts**

Add imports at the top of `electron/main.ts`:
```ts
import { decideDispatch } from './services/detectionDispatch';
import { reconcileLiveQuestion } from './services/questionReconcile';
```
Add a private method to `AppState` (next to `startLiveRouter`):
```ts
  /**
   * One path for both detectors. The deduper decides identity; decideDispatch
   * decides the action; Auto answers exactly once per question from whichever
   * detector fired first (the STT detector could never answer before this).
   */
  private dispatchDetection(d: {
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    source: 'live' | 'whisper';
    anchor?: string;
    verdict: 'match' | 'paraphrase' | 'replaced' | 'unverifiable';
    chip?: any;
  }): void {
    const verdict = this.chipDeduper.admit({ question: d.question, source: d.source, anchor: d.anchor });
    const action = decideDispatch(this.liveMode, verdict);
    const anchorLog = JSON.stringify((d.anchor ?? d.question).slice(0, 80));
    if (action === 'drop') {
      console.log(`[Main] dispatch: drop source=${d.source} anchor=${anchorLog} verdict=${d.verdict} duplicateOf=${verdict.duplicateOfSource ?? 'none'} answered=${verdict.alreadyAnswered === true}`);
      return;
    }
    console.log(`[Main] dispatch: ${action} source=${d.source} anchor=${anchorLog} verdict=${d.verdict}`);
    if (action === 'chip') {
      let contextSnapshot = '';
      try { contextSnapshot = this.intelligenceManager.getFormattedContext(60) ?? ''; } catch { /* chip still works */ }
      const chip = d.chip ?? {
        id: `live-${Date.now()}-${++this.liveChipSeq}`,
        question: d.question,
        intent: d.intent,
        confidence: 1.0,
        contextSnapshot,
        detectedAt: Date.now(),
        source: 'live' as const,
      };
      this.broadcast('detected-question', chip);
      return;
    }
    // answer — mark first so a duplicate arriving during generation is dropped
    this.chipDeduper.markAnswered(verdict.admitted ? d.question : (verdict.duplicateOfQuestion ?? d.question));
    this.broadcast('live-question', { question: d.question, intent: d.intent, source: d.source });
    void this.intelligenceManager
      .runWhatShouldISay(d.question, 1.0, undefined, { intentOverride: d.intent, bypassCooldown: true })
      .catch((err: any) => console.error('[Main] auto-answer failed:', err?.message ?? err));
  }
```
Replace the body of the `router.on('question', …)` handler in `startLiveRouter` (everything after the `Live question (…)` console.log) with:
```ts
      const r = reconcileLiveQuestion(q.question, this.intelligenceManager.getRecentInterviewerSpeech(15_000));
      if (r.verdict === 'replaced') {
        console.log(`[Main] Live question replaced by transcript: live=${JSON.stringify(q.question.slice(0, 80))} said=${JSON.stringify(r.text.slice(0, 80))}`);
      }
      this.dispatchDetection({
        question: r.text,
        intent: r.verdict === 'replaced' ? 'verbal' : q.intent,
        source: 'live',
        anchor: r.anchor ?? undefined,
        verdict: r.verdict,
      });
```
Replace the body of `this.intelligenceManager.on('question-detected', (chip) => { … })` with:
```ts
      const question = String(chip?.question ?? '');
      this.dispatchDetection({
        question,
        intent: chip?.intent ?? 'verbal',
        source: 'whisper',
        anchor: question,
        verdict: 'match',
        chip,
      });
```
Keep the existing `if (!this.isMeetingActive || this.liveMode === 'off') return;` guard at the top of the Live handler. For the whisper handler, when `liveMode === 'off'`, `decideDispatch` returns `drop` — that would silence the STT chips in Off mode, which today are forwarded. Preserve today's behaviour: in `dispatchDetection`, compute `const action = this.liveMode === 'off' && d.source === 'whisper' ? (verdict.admitted ? 'chip' : 'drop') : decideDispatch(this.liveMode, verdict);`.

- [ ] **Step 3: Type check and full suite** — `npx tsc --noEmit && npm test` — Expected: clean, green. (No new unit test: `AppState` is not constructible in vitest; the decision is covered by Task 5 and the wiring is proven live below.)

- [ ] **Step 4: Live proof**

`npm run build:electron && node electron/test/golden/interview60.run.mjs app:stop && node electron/test/golden/interview60.run.mjs app:start`, note the log offset, play `probe-continuous.wav`, then:
```bash
node -e "const fs=require('fs');const t=fs.readFileSync('natively_debug.log','utf8').slice(Number(process.argv[1]));console.log(t.split('\n').filter(l=>/\[Main\] dispatch:|Live question|forwarding detected|route: /.test(l)).map(l=>l.replace(/^\S+T([0-9:.]{12})Z /,'$1  ')).join('\n'))" <offset>
```
Expected: for each of the two probe questions exactly one `dispatch: answer` (source may be `whisper` or `live`) followed by a `route:` line in `verbal-diag.log`, and the other detector's arrival logged as `dispatch: drop … answered=true`. Paste these lines into the commit body.

- [ ] **Step 5: Commit**
```bash
git add electron/IntelligenceManager.ts electron/main.ts
git commit -m "fix(live): Auto answers the first detection from either detector, once

Both detector handlers now go through dispatchDetection: the deduper
decides identity (text, or transcript anchor), decideDispatch decides
the action, and Auto answers exactly once per question whichever
detector fired first. Live questions are reconciled with the last 15 s
of interviewer speech; one that matches nothing said is replaced by the
transcript sentence with its intent demoted to verbal.

Proof: <paste the dispatch/route lines from the probe>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Intent classifier — classify the question, word boundaries, strong/weak negotiation (spec §3.2 parts 1–2)

**Files:**
- Modify: `electron/knowledge/IntentClassifier.ts`
- Create: `electron/knowledge/IntentClassifier.test.ts`
- Create: `electron/llm/lastInterviewerTurn.ts`, `electron/llm/lastInterviewerTurn.test.ts`
- Modify: `electron/LLMHelper.ts` (`streamChat` signature ~2394–2405; knowledge intercept ~2421–2428)
- Modify: `electron/llm/WhatToAnswerLLM.ts` (the two verbal `streamChat` calls ~264 and ~283; the coding call ~244)

**Interfaces:**
- Produces: `classifyIntent(question: string): IntentType` (same name, new rules); `lastInterviewerTurn(transcript: string): string`; `LLMHelper.streamChat(message, imagePaths?, context?, systemPromptOverride?, ignoreKnowledgeMode = false, modelOverride?, knowledgeQuestion?: string)`.

- [ ] **Step 1: Write the failing classifier tests** — `electron/knowledge/IntentClassifier.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { classifyIntent } from './IntentClassifier';
import { IntentType } from './types';
// The 52 spoken questions of the flight test. On 2026-09-02, 25 of 27
// classifications were "negotiation" — for Docker, Airflow and Kubernetes.
// @ts-ignore — untyped ESM harness module
import { INTERVIEW } from '../test/golden/interview60.questions.mjs';

describe('classifyIntent — negotiation must need a negotiation word', () => {
    it('classifies none of the 52 interview questions as negotiation', () => {
        const spoken = (INTERVIEW as any[]).filter((i) => i.kind !== 'screenshot');
        expect(spoken.length).toBe(52);
        const wrong = spoken.filter((i) => classifyIntent(i.q) === IntentType.NEGOTIATION).map((i) => i.id);
        expect(wrong).toEqual([]);
    });
    it('still recognises real negotiation questions', () => {
        for (const q of [
            'What are your salary expectations for this role?',
            'We can offer 140k base plus equity — how does that sound?',
            'Is the compensation package negotiable?',
            'What signing bonus would make this work for you?',
        ]) expect(classifyIntent(q)).toBe(IntentType.NEGOTIATION);
    });
    it('weak words alone do not trigger negotiation', () => {
        expect(classifyIntent('What do you expect the base image to contain?')).not.toBe(IntentType.NEGOTIATION);
        expect(classifyIntent('How would you reduce the payload size of the request?')).not.toBe(IntentType.NEGOTIATION);
        expect(classifyIntent('What is the requirement for the range of a counter in this stock system?')).not.toBe(IntentType.NEGOTIATION);
    });
    it('matches whole words, not substrings ("pay" is not in "payload", "base" is not in "database")', () => {
        expect(classifyIntent('How do you scale the database?')).toBe(IntentType.TECHNICAL);
    });
    it('keeps the other categories as before', () => {
        expect(classifyIntent('Tell me about yourself.')).toBe(IntentType.INTRO);
        expect(classifyIntent('What is the company culture like?')).toBe(IntentType.COMPANY_RESEARCH);
        expect(classifyIntent('Walk me through your projects.')).toBe(IntentType.PROFILE_DETAIL);
        expect(classifyIntent('Explain the algorithm complexity.')).toBe(IntentType.TECHNICAL);
        expect(classifyIntent('Good morning.')).toBe(IntentType.GENERAL);
    });
});
```

- [ ] **Step 2: Run it** — `npx vitest run electron/knowledge/IntentClassifier.test.ts` — Expected: the first test FAILS listing ids (e.g. questions containing "base", "expect", "requirement", "range", "stock").

- [ ] **Step 3: Implement** — replace the negotiation list and `classifyIntent` in `electron/knowledge/IntentClassifier.ts`:
```ts
// A strong term alone means negotiation. Weak terms are everyday technical
// vocabulary ("base image", "expect", "range", "stock") and count only next to
// a strong one — on 2026-09-02 they labelled 25 of 27 technical questions
// "negotiation" and routed them through the coaching path.
const STRONG_NEGOTIATION = [
    'salary', 'compensation', 'negotiate', 'negotiable', 'equity', 'rsu', 'rsus', 'signing bonus',
    'total comp', 'market rate', 'counteroffer', 'counter offer',
];
const WEAK_NEGOTIATION = [
    'base', 'range', 'expect', 'expectations', 'pay', 'offer', 'package', 'budget', 'raise', 'stock', 'worth', 'requirement',
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole-word (or whole-phrase) match; "pay" must not match "payload", "base" must not match "database". */
export function hasWord(lower: string, term: string): boolean {
    return new RegExp(`(^|[^a-z0-9])${escapeRe(term)}(?![a-z0-9])`).test(lower);
}

export function classifyIntent(question: string): IntentType {
    const lower = question.toLowerCase();

    if (INTRO_KEYWORDS.some(kw => hasWord(lower, kw))) return IntentType.INTRO;
    const strong = STRONG_NEGOTIATION.some(kw => hasWord(lower, kw));
    if (strong) return IntentType.NEGOTIATION;
    if (COMPANY_KEYWORDS.some(kw => hasWord(lower, kw))) return IntentType.COMPANY_RESEARCH;
    if (PROFILE_DETAIL_KEYWORDS.some(kw => hasWord(lower, kw))) return IntentType.PROFILE_DETAIL;
    if (TECHNICAL_KEYWORDS.some(kw => hasWord(lower, kw))) return IntentType.TECHNICAL;

    return IntentType.GENERAL;
}
```
Delete the old `NEGOTIATION_KEYWORDS` constant. `WEAK_NEGOTIATION` is intentionally not consulted on its own; it documents the words that used to fire. (`needsCompanyResearch` keeps its `includes` — out of scope.)
Note: `COMPANY_KEYWORDS` contains `product`, `team`, `growth`, `market` — check the first test's output; if a bank question is now `COMPANY_RESEARCH` because of "market" or "team", that is acceptable (the test only forbids NEGOTIATION), but `strategy`, `market` remain substrings-safe under `hasWord`.

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Failing test for the last interviewer turn** — `electron/llm/lastInterviewerTurn.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { lastInterviewerTurn } from './lastInterviewerTurn';

describe('lastInterviewerTurn', () => {
    it('returns the text of the last [INTERVIEWER] line', () => {
        const t = '[INTERVIEWER]: What is a Pod?\n[ME]: A Pod is…\n[ASSISTANT (PREVIOUS SUGGESTION)]: base salary offer\n[INTERVIEWER]: How would you autoscale that deployment?';
        expect(lastInterviewerTurn(t)).toBe('How would you autoscale that deployment?');
    });
    it('falls back to the last non-empty line when no speaker labels are present', () => {
        expect(lastInterviewerTurn('first\n\nsecond line \n')).toBe('second line');
    });
    it('returns an empty string for an empty transcript', () => {
        expect(lastInterviewerTurn('')).toBe('');
    });
});
```

- [ ] **Step 6: Run it** — Expected: FAIL, module missing.

- [ ] **Step 7: Implement `electron/llm/lastInterviewerTurn.ts`**
```ts
/**
 * The question to classify is the interviewer's last turn — never the composed
 * prompt. The prompt carries prior assistant suggestions (which can contain
 * coaching vocabulary) and framing text, and classifying it kept every
 * technical question in the negotiation path on 2026-09-02.
 */
export function lastInterviewerTurn(transcript: string): string {
    const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
        const m = lines[i].match(/^\[INTERVIEWER\]:\s*(.*)$/);
        if (m) return m[1].trim();
    }
    return lines.length ? lines[lines.length - 1] : '';
}
```

- [ ] **Step 8: Run it** — Expected: PASS.

- [ ] **Step 9: Plumb the question through `streamChat`**

`electron/LLMHelper.ts` — add the parameter after `modelOverride?: string,`:
```ts
    // The interviewer's actual question, for the knowledge orchestrator. The
    // composed `message` carries prior suggestions and framing; classifying
    // that kept every technical question in the negotiation path.
    knowledgeQuestion?: string,
```
In the knowledge intercept, change `const knowledgeResult = await this.knowledgeOrchestrator.processQuestion(message);` to
```ts
        const knowledgeResult = await this.knowledgeOrchestrator.processQuestion(knowledgeQuestion ?? message);
```
(`feedForDepthScoring(message)` stays.) Make the same one-line change at the non-streaming intercept at ~line 1125 if that call site also receives a composed message — inspect it; if its `message` is already the raw user text, leave it.

`electron/llm/WhatToAnswerLLM.ts` — add `import { lastInterviewerTurn } from './lastInterviewerTurn';` and compute once, right after `fullMessage` is built:
```ts
            const knowledgeQuestion = lastInterviewerTurn(cleanedTranscript);
```
Then pass it as the 7th argument on all three `streamChat` calls in `generateStream` (coding ~244, deep verbal ~264, fallback ~283): each call becomes `this.llmHelper.streamChat(fullMessage, <images or undefined>, undefined, <PROMPT>, undefined, undefined, knowledgeQuestion)`.

- [ ] **Step 10: Run the suite and tsc** — `npm test && npx tsc --noEmit` — Expected: green.

- [ ] **Step 11: Commit**
```bash
git add electron/knowledge/IntentClassifier.ts electron/knowledge/IntentClassifier.test.ts electron/llm/lastInterviewerTurn.ts electron/llm/lastInterviewerTurn.test.ts electron/LLMHelper.ts electron/llm/WhatToAnswerLLM.ts
git commit -m "fix(knowledge): classify the interviewer's question, whole words, strong negotiation terms only

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Provider cooldown after a 429 in structured generation (spec §3.2 part 3)

**Files:**
- Create: `electron/services/providerCooldown.ts`, `electron/services/providerCooldown.test.ts`
- Modify: `electron/LLMHelper.ts` (structured generation loop ~1487–1508; a field on the class)

**Interfaces:**
- Produces: `export class ProviderCooldown { constructor(cooldownMs = 600_000); noteFailure(name: string, reason: string, now?: number): void; shouldSkip(name: string, now?: number): boolean }`; `export function isRateLimit(reason: string): boolean`.

- [ ] **Step 1: Failing test** — `electron/services/providerCooldown.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ProviderCooldown, isRateLimit } from './providerCooldown';

describe('isRateLimit', () => {
    it('recognises the failures the flight test saw', () => {
        expect(isRateLimit('Transient error (429)')).toBe(true);
        expect(isRateLimit('Model busy, try again')).toBe(true);
        expect(isRateLimit('You exceeded your current quota')).toBe(true);
        expect(isRateLimit('RESOURCE_EXHAUSTED')).toBe(true);
        expect(isRateLimit('empty response')).toBe(false);
        expect(isRateLimit('socket hang up')).toBe(false);
    });
});

describe('ProviderCooldown', () => {
    it('skips a provider for the cooldown window after a rate-limit failure, then tries it again', () => {
        const c = new ProviderCooldown(10 * 60 * 1000);
        expect(c.shouldSkip('Gemini Pro', 0)).toBe(false);
        c.noteFailure('Gemini Pro', 'Transient error (429)', 0);
        expect(c.shouldSkip('Gemini Pro', 1)).toBe(true);
        expect(c.shouldSkip('Gemini Pro', 10 * 60 * 1000 - 1)).toBe(true);
        expect(c.shouldSkip('Gemini Pro', 10 * 60 * 1000)).toBe(false);
    });
    it('a non-rate-limit failure does not start a cooldown', () => {
        const c = new ProviderCooldown();
        c.noteFailure('Groq', 'socket hang up', 0);
        expect(c.shouldSkip('Groq', 1)).toBe(false);
    });
    it('is per provider', () => {
        const c = new ProviderCooldown();
        c.noteFailure('Gemini Pro', '429', 0);
        expect(c.shouldSkip('Gemini Flash', 1)).toBe(false);
    });
});
```

- [ ] **Step 2: Run it** — Expected: FAIL, module missing.

- [ ] **Step 3: Implement `electron/services/providerCooldown.ts`**
```ts
/**
 * After a rate-limit failure a provider is skipped for a while instead of
 * being retried first every time. On 2026-09-02 every structured call tried
 * Gemini Pro first, got three 429s (~3.2 s) and only then fell back to Flash.
 */
export function isRateLimit(reason: string): boolean {
    return /\b429\b|rate limit|quota|resource.?exhausted|model busy|too many requests/i.test(reason);
}

export class ProviderCooldown {
    private until = new Map<string, number>();
    constructor(private readonly cooldownMs: number = 10 * 60 * 1000) {}

    noteFailure(name: string, reason: string, now: number = Date.now()): void {
        if (isRateLimit(reason)) this.until.set(name, now + this.cooldownMs);
    }

    shouldSkip(name: string, now: number = Date.now()): boolean {
        const t = this.until.get(name);
        return t !== undefined && now < t;
    }
}
```

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Use it in the rotation loop** — `electron/LLMHelper.ts`: `import { ProviderCooldown } from './services/providerCooldown';`, add the field `private structuredCooldown = new ProviderCooldown();`, and in the loop:
```ts
      for (const provider of providers) {
        if (this.structuredCooldown.shouldSkip(provider.name)) {
          console.log(`[LLMHelper] ⏭️ Structured generation: skipping ${provider.name} (rate-limited within the last 10 min)`);
          continue;
        }
        try {
```
and in the catch, after `lastFailureByProvider.set(provider.name, reason);` add `this.structuredCooldown.noteFailure(provider.name, reason);`. Also note the failure where the `Transient error (429)` retries are exhausted if that path throws a different message: the thrown message reaches this catch — `isRateLimit` covers `429`, `quota`, `Model busy`.

- [ ] **Step 6: Suite + tsc** — `npm test && npx tsc --noEmit` — Expected: green.

- [ ] **Step 7: Commit**
```bash
git add electron/services/providerCooldown.ts electron/services/providerCooldown.test.ts electron/LLMHelper.ts
git commit -m "feat(llm): skip a rate-limited provider for 10 minutes in structured generation

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Detection prompt returns the complete question + calibration script (spec §3.4)

**Files:**
- Modify: `electron/llm/prompts/questionDetection.ts`
- Create: `electron/test/golden/interview60.calibrate-detector.mjs`
- Modify: `electron/test/golden/README.md`

**Interfaces:** the JSON schema and `DetectionResponse` are unchanged.

- [ ] **Step 1: Change the contract** — in `QUESTION_DETECTION_SYSTEM_PROMPT`, replace the line `Identify the MOST RECENT question or prompt that requires the candidate to respond.` with:
```
Identify the most recent question or prompt that requires the candidate to respond, and return it COMPLETE as asked: when the question leans on the sentence just before it — it begins with "and", "so", or refers to "it", "that", "this" — include that sentence, so the question stands on its own. Quote the interviewer's own words; do not shorten or rephrase.
```
Update the file's doc comment: replace "biases towards detection of the MOST RECENT interviewer prompt" with "returns the most recent prompt complete with the scenario sentence it depends on (H02/H03 on 2026-09-02 surfaced as bare 'How do you diagnose and fix it?')".

- [ ] **Step 2: Write the calibration script** — `electron/test/golden/interview60.calibrate-detector.mjs`:
```js
/**
 * Prove the detection prompt returns two-clause questions whole, against the
 * REAL Groq model. Not a unit test: a model contract can only be checked on
 * the model. Reads GROQ_API_KEY (or the first *GROQ* variable) from .env.
 *
 *   node --env-file=.env electron/test/golden/interview60.calibrate-detector.mjs
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const require = createRequire(path.join(PROJ, 'package.json'));
const { GroqDetectionClient } = require(path.join(PROJ, 'dist-electron/electron/services/GroqDetectionClient.js'));

const found = Object.entries(process.env).find(([k, v]) => /GROQ/i.test(k) && v);
if (!found) { console.error('no *GROQ* variable in env — add GROQ_API_KEY to .env'); process.exit(2); }
console.log(`using env var ${found[0]}`);

const CASES = [
    { id: 'H02', transcript: 'INTERVIEWER: A SageMaker endpoint serving ten thousand requests per second has p99 latency creeping up.\nINTERVIEWER: How do you diagnose and fix it?', mustContain: ['sagemaker', 'latency', 'diagnose'] },
    { id: 'H03', transcript: 'INTERVIEWER: How would you design a pipeline that retrains, validates, and deploys with no human in the loop, and what guardrails would you put in?', mustContain: ['pipeline', 'guardrails'] },
    { id: 'H08', transcript: 'INTERVIEWER: The same image behaves differently on your laptop and in the cluster.\nINTERVIEWER: How do you track that down?', mustContain: ['image', 'laptop', 'track'] },
    { id: 'W01', transcript: 'INTERVIEWER: What is the difference between a Docker image and a container?', mustContain: ['image', 'container'] },
];

const client = new GroqDetectionClient({ getApiKey: () => found[1] });
let fail = 0;
for (const c of CASES) {
    const r = await client.detect({ recentInterviewerTranscript: c.transcript, fullConversationContext: c.transcript });
    const q = (r?.question ?? '').toLowerCase();
    const missing = c.mustContain.filter((w) => !q.includes(w));
    const ok = r?.detected && !missing.length;
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.id}  detected=${r?.detected}  q=${JSON.stringify(r?.question ?? '')}${missing.length ? `  missing: ${missing.join(', ')}` : ''}`);
}
console.log(fail ? `\n${fail} case(s) failed — the prompt does not return the complete question` : '\nall cases pass');
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Build and run it** — `npm run build:electron && node --env-file=.env electron/test/golden/interview60.calibrate-detector.mjs` — Expected: 4 PASS. If H02/H08 FAIL with the question missing the scenario words, strengthen the prompt sentence (it is the contract under test) and re-run; do not change the schema.

- [ ] **Step 4: README** — add under the interview60 table: `| \`interview60.calibrate-detector.mjs\` | proves the STT detector's prompt returns two-clause questions whole, on the real Groq model |`.

- [ ] **Step 5: Suite** — `npm test` — Expected: green (prompt tests, if any assert the old sentence, are updated to the new one).

- [ ] **Step 6: Commit**
```bash
git add electron/llm/prompts/questionDetection.ts electron/test/golden/interview60.calibrate-detector.mjs electron/test/golden/README.md
git commit -m "fix(detect): the STT detector returns the complete question, scenario sentence included

Calibrated on the real Groq model: <paste the four PASS lines>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: A detector's `coding` intent is advisory without screenshots (spec §3.5)

**Files:**
- Modify: `electron/IntelligenceEngine.ts` (intent override mapping ~354–362)
- Create: `electron/IntelligenceEngine.codingAdvisory.test.ts`

**Interfaces:** none new. Log line: `[IntelligenceEngine] runWhatShouldISay: intent override coding → general (spoken question, no screenshot)`.

- [ ] **Step 1: Failing test** — `electron/IntelligenceEngine.codingAdvisory.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';

// Stub helper that records what generateStream was routed with by capturing the
// intent the engine logs. streamChat/streamVerbal throw, so the run completes
// on WhatToAnswerLLM's failure path without network.
const stubHelper = () => ({} as any);

describe('coding intent from a detector without a screenshot', () => {
    afterEach(() => vi.restoreAllMocks());

    it('is mapped to general so the spoken answer goes through the verbal filters', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.join(' ')); });
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        await engine.runWhatShouldISay('How would you handle a task in Airflow that intermittently fails?', 1.0, undefined, {
            contextOverride: '[INTERVIEWER]: How would you handle a task in Airflow that intermittently fails?', intentOverride: 'coding',
        });
        expect(logs.some((l) => l.includes('intent override coding → general (spoken question, no screenshot)'))).toBe(true);
        expect(logs.some((l) => l.includes('intent override → coding'))).toBe(false);
    });

    it('stays coding when a screenshot is attached', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.join(' ')); });
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        await engine.runWhatShouldISay('Solve this', 1.0, ['C:/tmp/shot.png'], {
            contextOverride: '[INTERVIEWER]: Solve this', intentOverride: 'coding',
        });
        expect(logs.some((l) => l.includes('intent override → coding'))).toBe(true);
    });
});
```

- [ ] **Step 2: Run it** — `npx vitest run electron/IntelligenceEngine.codingAdvisory.test.ts` — Expected: first test FAILS.

- [ ] **Step 3: Implement** — in `runWhatShouldISay`, replace the `if (options.intentOverride) { const mapped = … }` block's mapping with:
```ts
            if (options.intentOverride) {
                const hasImages = !!(imagePaths && imagePaths.length > 0);
                // A detector's "coding" is a guess about the answer's shape. Spoken,
                // with nothing on screen, the candidate answers aloud — the verbal
                // prompt and filters apply. 4 of 52 spoken questions were routed
                // past every filter on 2026-09-02.
                const advisoryCoding = options.intentOverride === 'coding' && !hasImages;
                const mapped = options.intentOverride === 'verbal' ? 'general'
                            : options.intentOverride === 'behavioral' ? 'behavioral'
                            : advisoryCoding ? 'general'
                            : 'coding';
                intentResult = {
                    intent: mapped,
                    confidence: 1.0,
                    answerShape: getAnswerShapeGuidance(mapped),
                };
                if (advisoryCoding) console.log('[IntelligenceEngine] runWhatShouldISay: intent override coding → general (spoken question, no screenshot)');
                else console.log(`[IntelligenceEngine] runWhatShouldISay: intent override → ${mapped}`);
            }
```

- [ ] **Step 4: Run the test, suite, tsc** — Expected: green.

- [ ] **Step 5: Commit**
```bash
git add electron/IntelligenceEngine.ts electron/IntelligenceEngine.codingAdvisory.test.ts
git commit -m "fix(answer): a detector's coding intent is advisory unless a screenshot is attached

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Model sentinel on every verbal stream; first-token and answer diag lines; delete the label guesses (spec §3.6, §4.3)

**Files:**
- Create: `electron/llm/streamTaps.ts`, `electron/llm/streamTaps.test.ts`
- Modify: `electron/llm/WhatToAnswerLLM.ts` (verbal branch ~255–330)
- Modify: `electron/llm/verbalFallback.test.ts` (one new case)
- Modify: `src/components/NativelyInterface.tsx` (lines ~814 and ~2570)

**Interfaces:**
- Produces: `export async function* tapFirstToken(stream: AsyncGenerator<string>, onFirst: (ms: number) => void, onHead: (head: string) => void, t0?: number): AsyncGenerator<string>`; diag lines `first token <ms>ms` and `answer head: <first 120 chars>`; the sentinel `__model_source:<model>__` yielded at the head of every verbal answer (outside the filters, exactly like the fallback sentinel).
- Consumes: `LLMHelper.getCurrentModelId()`; `GEMINI_FLASH_MODEL` exported from `../LLMHelper` (already exported? check: `GEMINI_FLASH_FALLBACK_MODEL` is; if `GEMINI_FLASH_MODEL` is not, export it the same way).

- [ ] **Step 1: Failing tap test** — `electron/llm/streamTaps.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { tapFirstToken } from './streamTaps';

async function* chunks(cs: string[]) { for (const c of cs) yield c; }
async function drain(g: AsyncGenerator<string>) { const out: string[] = []; for await (const c of g) out.push(c); return out; }

describe('tapFirstToken', () => {
    it('reports the first token time once and the first 120 characters once, and passes every chunk through unchanged', async () => {
        const firsts: number[] = []; const heads: string[] = [];
        const out = await drain(tapFirstToken(chunks(['', 'Hello ', 'world', ' '.repeat(200)]), (ms) => firsts.push(ms), (h) => heads.push(h), Date.now() - 5));
        expect(out).toEqual(['', 'Hello ', 'world', ' '.repeat(200)]);
        expect(firsts.length).toBe(1);
        expect(firsts[0]).toBeGreaterThanOrEqual(5);
        expect(heads).toEqual([('Hello world' + ' '.repeat(200)).slice(0, 120)]);
    });
    it('reports the head at the end when the answer is shorter than 120 characters', async () => {
        const heads: string[] = [];
        await drain(tapFirstToken(chunks(['short']), () => {}, (h) => heads.push(h)));
        expect(heads).toEqual(['short']);
    });
    it('reports nothing for an empty stream', async () => {
        const firsts: number[] = []; const heads: string[] = [];
        await drain(tapFirstToken(chunks([]), (ms) => firsts.push(ms), (h) => heads.push(h)));
        expect(firsts).toEqual([]); expect(heads).toEqual([]);
    });
});
```

- [ ] **Step 2: Run it** — Expected: FAIL, module missing.

- [ ] **Step 3: Implement `electron/llm/streamTaps.ts`**
```ts
/** Observe a token stream without altering it: first non-empty token time, and the first 120 characters. */
export async function* tapFirstToken(
    stream: AsyncGenerator<string>,
    onFirst: (ms: number) => void,
    onHead: (head: string) => void,
    t0: number = Date.now(),
): AsyncGenerator<string> {
    let first = true, head = '', headSent = false;
    for await (const chunk of stream) {
        if (first && chunk.length > 0) { first = false; onFirst(Date.now() - t0); }
        if (!headSent) {
            head += chunk;
            if (head.length >= 120) { onHead(head.slice(0, 120)); headSent = true; }
        }
        yield chunk;
    }
    if (!headSent && head.length > 0) onHead(head);
}
```

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Failing sentinel test** — append to `electron/llm/verbalFallback.test.ts` (inside its `describe`, using its existing `makeHelper`/`drain` helpers; if `makeHelper` does not expose `getCurrentModelId`, add `getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite')` to the helper object it builds):
```ts
    it('announces the primary model at the head of every verbal answer, not only on redirect', async () => {
        const { helper } = makeHelper({ streamChat: () => fromChunks(['Answer text.']) });
        const llm = new WhatToAnswerLLM(helper);
        // Call generateStream exactly the way the existing cases in this file do
        // (same positional arguments), with the intent set to 'general' so the
        // verbal-technical route (streamChat, selected model) is taken.
        const out = await drain(llm.generateStream(/* copy the argument shape of the case above; intent: 'general' */));
        expect(out[0]).toBe('__model_source:gemini-3.1-flash-lite__');
        expect(out.join('')).toContain('Answer text.');
    });
```
(The verbal-technical route uses `streamChat`, i.e. the selected model; the sentinel names `getCurrentModelId()`. For the behavioral/fast route it names `GEMINI_FLASH_MODEL`.)

- [ ] **Step 6: Run it** — Expected: FAIL (`out[0]` is the answer text).

- [ ] **Step 7: Implement in `WhatToAnswerLLM.ts`**

Imports: `import { tapFirstToken } from './streamTaps';` and add `GEMINI_FLASH_MODEL` to the existing import from `'../LLMHelper'` (export it there if it is not exported: `export const GEMINI_FLASH_MODEL = …` — keep its current value).
In the verbal branch, right before `let rawStream: AsyncGenerator<string>;`:
```ts
                // Name the model that will answer, outside the filter chain (which
                // strips sentinels), so the bar under the answer stops guessing.
                const primaryModel = useDeepModel ? this.llmHelper.getCurrentModelId() : GEMINI_FLASH_MODEL;
                yield `__model_source:${primaryModel}__`;
                const t0 = Date.now();
```
Wrap the final `yield*` of the verbal branch (the `withVerbalFallback(...)` expression) as:
```ts
                yield* tapFirstToken(
                    this.withVerbalFallback(filtered(rawStream), () => filtered(this.llmHelper.streamVerbalWithGeminiFlash(fullMessage, VERBAL_WHAT_TO_ANSWER_PROMPT, undefined, GEMINI_FLASH_FALLBACK_MODEL))),
                    (ms) => diagLog(`first token ${ms}ms`),
                    (head) => diagLog(`answer head: ${JSON.stringify(head)}`),
                    t0,
                );
```
`getCurrentModelId()` returns ids like `gemini-3.1-flash-lite` — no underscores, so the consumer regex `/__model_source:([^_]+)__/` matches. If a custom model id could contain `_`, replace `_` with `-` in the label: `primaryModel.replace(/_/g, '-')`.

- [ ] **Step 8: Delete the renderer guesses** — `src/components/NativelyInterface.tsx`: line ~814 `sm.setSource(\`${data.intent === 'behavioral' ? 'Gemini Flash 3.1' : 'Gemma 4 31B'} · Live\`);` becomes `sm.setSource('…');` and line ~2570 `sm.setSource(intent === 'behavioral' ? 'Gemini Flash 3.1' : 'Gemma 4 31B');` becomes `sm.setSource('…');`. The existing `onIntelligenceSuggestedAnswerSource` subscription (~1399) replaces the placeholder when the sentinel arrives. Update the comment above each: `// Model attribution arrives with the stream's __model_source sentinel (suggested_answer_source); no guessing.`

- [ ] **Step 9: Suite, tsc, renderer build** — `npm test && npx tsc --noEmit && npx vite build` — Expected: green. `DetectedQuestionsPanel.test.tsx` and other renderer tests unaffected.

- [ ] **Step 10: Commit**
```bash
git add electron/llm/streamTaps.ts electron/llm/streamTaps.test.ts electron/llm/WhatToAnswerLLM.ts electron/llm/verbalFallback.test.ts electron/LLMHelper.ts src/components/NativelyInterface.tsx
git commit -m "feat(answer): name the answering model on every verbal stream; log first-token time and the answer head

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
(Stage `electron/LLMHelper.ts` only if Step 7 needed the export.)

---

### Task 12: Word budget target 60, gate stays 70 (spec §3.7)

**Files:**
- Modify: `electron/llm/prompts.ts` (line 181 and the sentence at ~212)
- Modify: `electron/llm/prompts.test.ts` if it asserts the sentence.

- [ ] **Step 1: Failing test** — add to `electron/llm/prompts.test.ts`:
```ts
import { SPOKEN_WORD_BUDGET, SPOKEN_WORD_TARGET, VERBAL_WHAT_TO_ANSWER_PROMPT } from './prompts';

describe('spoken word budget', () => {
    it('instructs the model to a target below the gate, because flash-lite lands ~5 words over what it is told', () => {
        expect(SPOKEN_WORD_TARGET).toBe(60);
        expect(SPOKEN_WORD_BUDGET).toBe(70);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).toContain(`AT MOST ${SPOKEN_WORD_TARGET} words`);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).not.toContain(`AT MOST ${SPOKEN_WORD_BUDGET} words`);
    });
});
```
(Merge into the file's existing imports/describe structure.)

- [ ] **Step 2: Run it** — Expected: FAIL (`SPOKEN_WORD_TARGET` undefined).

- [ ] **Step 3: Implement** — in `prompts.ts` after `export const SPOKEN_WORD_BUDGET = 70;`:
```ts
/**
 * What the model is TOLD. Measured 2026-09-02 (answer-only pass, 52 questions):
 * told 70 it produced a median of 71 and a max of 81. The gate stays at 70;
 * the instruction aims lower so the answers land inside it.
 */
export const SPOKEN_WORD_TARGET = 60;
```
and change the prompt sentence to use `${SPOKEN_WORD_TARGET}` instead of `${SPOKEN_WORD_BUDGET}` (only the "AT MOST … words" sentence; any gate/check that reads `SPOKEN_WORD_BUDGET` — `run.mjs:174`, `interview60.answers.mjs` — is unchanged).

- [ ] **Step 4: Run the test and the suite** — Expected: green.

- [ ] **Step 5: Measure** — `node --env-file=.env electron/test/golden/interview60.answers.mjs` (rebuild first: `npm run build:electron`; the pass imports the shipped prompt from `dist-electron`). Record `words median` and `over` from its summary next to the before values (median 71, over 70w: see the before report) in the commit body. If median did not drop, revert this task (the hypothesis did not hold) and say so in the final report.

- [ ] **Step 6: Commit**
```bash
git add electron/llm/prompts.ts electron/llm/prompts.test.ts
git commit -m "feat(verbal): tell the model 60 words so it lands inside the 70-word gate

Answer-only pass, 52 questions: median <x> (was 71), over 70 words <n>/52 (was <m>).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Metrics module, gate command, two-run report (spec §4)

**Files:**
- Create: `electron/test/golden/interview60.metrics.mjs`, `electron/test/golden/interview60.metrics.test.ts`
- Modify: `electron/test/golden/interview60.report-html.mjs` (replace its inline analysis with `computeRun`; accept two run dirs)
- Modify: `electron/test/golden/interview60.run.mjs` (`gate <dir>` command)
- Modify: `electron/test/golden/README.md`

**Interfaces:**
- Produces: `computeRun(dir) → RunMetrics` where `RunMetrics` is
```js
{
  dir, startedAt, endedAt, durationMin,
  items: [{ id, q, playedAt, spokeEnd, heardBy: 'live'|'whisper'|'both'|null, answered: boolean, answeredAt, detectMs, dispatches: number, verdict, routeCoding: boolean }],
  heard, answered, answersToNobody, surfacedMax, surfacedMulti, invented, raceLosses,
  sttCloses, lostUtterances, fragmentChips, coachingAnswers, codingForSpoken, expiryLoops,
  liveReconnects, detectP50, ttftP90, ttftSource: 'in-app'|'answer-only'|null,
}
```
plus `GATE` (the spec §6 table as `{ key, label, before, pass: (m) => boolean, show: (m) => string }[]`) and `evaluateGate(metrics) → { rows: [{ label, value, gate, pass }], pass: boolean }`.
- A run dir contains: `natively_debug.log`, `verbal-diag.log`, `interview60.timeline.json`, optionally `interview60.answers.json`, `interview60.chains.json`. The before dir is `electron/test/golden/interview60.runs/2026-09-02-before/` and has NO `dispatch:` lines — `computeRun` must fall back to the pre-dispatch attribution (Live question / forwarding / suppressed lines) when a run has zero `dispatch:` lines, so before and after are computed by one function.

- [ ] **Step 1: Failing test against the before-run** — `electron/test/golden/interview60.metrics.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore — untyped ESM harness module
import { computeRun, evaluateGate, GATE } from './interview60.metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BEFORE = path.join(HERE, 'interview60.runs', '2026-09-02-before');
const have = fs.existsSync(path.join(BEFORE, 'natively_debug.log'));

describe.skipIf(!have)('computeRun on the 2026-09-02 baseline (regression: the numbers the published report shows)', () => {
    const m = computeRun(BEFORE);
    it('attributes the hour the way the report did', () => {
        expect(m.items.length).toBe(52);
        expect(m.heard).toBe(51);
        expect(m.answered).toBe(26);
        expect(m.items.filter((i) => i.heardBy === null).map((i) => i.id)).toEqual(['M04']);
        expect(m.raceLosses).toBe(22);
        expect(m.sttCloses).toBe(299);
        expect(m.lostUtterances).toBe(2);
        expect(m.fragmentChips).toBe(5);
        expect(m.coachingAnswers).toBe(25);
        // The published page counted 4 CODING routes; 2 of those were the screenshot
        // cues, which are not spoken items. Per-item the count is 2–4 depending on
        // how the cue windows attribute — pin the range, not a guess.
        expect(m.codingForSpoken).toBeGreaterThanOrEqual(2);
        expect(m.codingForSpoken).toBeLessThanOrEqual(4);
        expect(m.expiryLoops).toBe(0);
        expect(m.invented).toBe(1);
        expect(m.surfacedMulti).toBe(12);
        expect(m.ttftSource).toBe('answer-only');
    });
    it('fails the gate on the baseline, on the rows the report named', () => {
        const g = evaluateGate(m);
        expect(g.pass).toBe(false);
        const failed = g.rows.filter((r) => !r.pass).map((r) => r.label);
        expect(failed).toContain('Answered hands-free');
        expect(failed).toContain('STT socket closes / lost utterances / fragment chips');
        expect(failed).toContain('Technical questions answered via the coaching path');
    });
});

describe('GATE', () => {
    it('has one row per spec §6 line', () => {
        expect(GATE.map((g) => g.label)).toEqual([
            'Answered hands-free',
            'Heard by either detector',
            'Surfaced detections per question',
            'STT socket closes / lost utterances / fragment chips',
            'Technical questions answered via the coaching path',
            'Spoken questions routed CODING',
            'Live expiry loops',
            'Answer TTFT p90 · detect p50',
        ]);
    });
});
```

- [ ] **Step 2: Run it** — Expected: FAIL, module missing.

- [ ] **Step 3: Implement `interview60.metrics.mjs`**

Move the analysis code out of `interview60.report-html.mjs` (its `liveQ`, `suppressed`, `whisperFwd`, `routes`, `stats`, `stt`, `items`, `orphanLive`, `invented`, `doubleChips` blocks) into this module, parameterised by `dir`, and add the `dispatch:` parsing. Skeleton to fill with that moved code:
```js
/**
 * One analysis for one run folder. Used by `run.mjs gate` and by the report,
 * so the verdict and the page cannot disagree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { INTERVIEW } from './interview60.questions.mjs';
import { overlap, logSince } from './interview60.lib.mjs';

const CONTAMINATED = ['[2026-09-02T16:21:50'];
const ts = (s) => Date.parse(s);
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);

export function computeRun(dir) {
    const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
    const has = (f) => fs.existsSync(path.join(dir, f));
    const timeline = JSON.parse(rd('interview60.timeline.json'));
    const dbg = logSince(path.join(dir, 'natively_debug.log'), timeline.startDebug, timeline.endDebug);
    const diag = logSince(path.join(dir, 'verbal-diag.log'), timeline.startDiag, timeline.endDiag)
        .split('\n').filter((l) => !CONTAMINATED.some((p) => l.startsWith(p))).join('\n');
    const answers = has('interview60.answers.json') ? JSON.parse(rd('interview60.answers.json')) : null;

    // — parse (moved verbatim from the report generator) —
    const liveQ = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), intent: m[2], mode: m[3], heard: m[4] }));
    const suppressed = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] suppressed duplicate live question \(already surfaced by (\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), by: m[2], heard: m[3] }));
    const whisperFwd = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] forwarding detected-question → renderer \(win=\w+\) intent=(\w+) q="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), intent: m[2], heard: m[3] }));
    const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?/gm)]
        .map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse(`"${m[4]}"`), verdict: m[5], duplicateOf: m[6] ?? null, answered: m[7] === 'true' }));
    const routes = [...diag.matchAll(/^\[(\S+)\] route: ([^\n]+)/gm)].map((m) => ({ at: ts(m[1]), route: m[2].trim() }));
    const firstTokens = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((m) => ({ at: ts(m[1]), ms: Number(m[2]) }));
    const count = (re, s = dbg) => (s.match(re) || []).length;
    // … stats / stt blocks moved from the report (sttCloses, lostUtterances, finalsAfterReconnect, expiry, reconnects, coachingBlobs) …

    const hasDispatch = dispatches.length > 0;
    const spoken = timeline.items.filter((i) => i.kind === 'spoken');
    const items = spoken.map((it) => {
        const spokeEnd = it.playedAt + Math.round(it.clipSecs * 1000);
        const win = (ev) => ev.at >= it.playedAt - 2000 && ev.at <= spokeEnd + 60000;
        const best = (list, key = 'heard') => {
            const c = list.filter(win).map((e) => ({ e, ov: overlap(e[key], it.q) })).sort((a, b) => b.ov - a.ov);
            if (!c.length) return null;
            if (c[0].ov >= 0.3) return c[0].e;
            return c.length === 1 && c[0].ov >= 0.15 ? c[0].e : null;
        };
        if (hasDispatch) {
            const mine = dispatches.filter(win).filter((d) => overlap(d.anchor, it.q) >= 0.15 || overlap(it.q, d.anchor) >= 0.15);
            const ans = mine.find((d) => d.action === 'answer') ?? null;
            const route = ans ? routes.find((r) => r.at >= ans.at && r.at <= ans.at + 4000) ?? null : null;
            const sources = new Set(mine.map((d) => d.source));
            const heardBy = sources.size === 2 ? 'both' : sources.size === 1 ? [...sources][0] : null;
            const surfaced = mine.filter((d) => d.action !== 'drop').length;
            return { ...it, spokeEnd, heardBy, answered: !!(ans && route), answeredAt: ans?.at ?? null,
                detectMs: mine.length ? Math.min(...mine.map((d) => d.at)) - spokeEnd : null,
                dispatches: surfaced, verdict: ans?.verdict ?? mine[0]?.verdict ?? null,
                routeCoding: !!(route && /^CODING/.test(route.route)),
                raceLoss: mine.some((d) => d.action === 'drop' && !d.answered) && !ans };
        }
        // baseline attribution (no dispatch lines): the report's original rule
        const live = best(liveQ);
        const sup = live ? suppressed.find((s) => Math.abs(s.at - live.at) < 50) ?? null : null;
        const wf = best(whisperFwd);
        const route = live && !sup ? routes.find((r) => r.at >= live.at && r.at <= live.at + 4000) ?? null : null;
        const heardBy = live && wf ? 'both' : live ? 'live' : wf ? 'whisper' : null;
        return { ...it, spokeEnd, heardBy, answered: !!route, answeredAt: live?.at ?? null,
            detectMs: live ? live.at - spokeEnd : wf ? wf.at - spokeEnd : null,
            dispatches: (live && !sup ? 1 : 0) + (wf ? 1 : 0), verdict: null,
            routeCoding: !!(route && /^CODING/.test(route.route)),
            raceLoss: !!(live && sup) };
    });

    // … invented / surfacedMulti / answersToNobody / codingForSpoken / detectP50 / ttft … (invented: baseline = orphan Live lines with best overlap < 0.3 against every item; after = dispatches with verdict 'replaced')
    // ttft: in-app from firstTokens when present, else from answers (p90 of v.ttft), ttftSource accordingly
    return { dir, startedAt: timeline.startedAt, endedAt: timeline.endedAt, durationMin, items, heard, answered, answersToNobody, surfacedMax, surfacedMulti, invented, raceLosses, sttCloses, lostUtterances, fragmentChips, coachingAnswers, codingForSpoken, expiryLoops, liveReconnects, detectP50, ttftP90, ttftSource };
}

export const GATE = [
    { key: 'answered', label: 'Answered hands-free', before: '26/52', pass: (m) => m.answered >= 50 && m.answersToNobody === 0, show: (m) => `${m.answered}/${m.items.length}, ${m.answersToNobody} to nobody` },
    { key: 'heard', label: 'Heard by either detector', before: '51/52', pass: (m) => m.heard >= 51, show: (m) => `${m.heard}/${m.items.length}` },
    { key: 'surfaced', label: 'Surfaced detections per question', before: '12 doubles, 1 invented', pass: (m) => m.surfacedMulti === 0 && m.invented === 0, show: (m) => `${m.surfacedMulti} doubles, ${m.invented} invented` },
    { key: 'stt', label: 'STT socket closes / lost utterances / fragment chips', before: '299 / 2 / 5', pass: (m) => m.sttCloses <= 5 && m.lostUtterances === 0 && m.fragmentChips === 0, show: (m) => `${m.sttCloses} / ${m.lostUtterances} / ${m.fragmentChips}` },
    { key: 'coaching', label: 'Technical questions answered via the coaching path', before: '25', pass: (m) => m.coachingAnswers === 0, show: (m) => String(m.coachingAnswers) },
    { key: 'coding', label: 'Spoken questions routed CODING', before: '4 routes (2 of them screenshot cues)', pass: (m) => m.codingForSpoken === 0, show: (m) => String(m.codingForSpoken) },
    { key: 'expiry', label: 'Live expiry loops', before: '0', pass: (m) => m.expiryLoops === 0, show: (m) => String(m.expiryLoops) },
    { key: 'latency', label: 'Answer TTFT p90 · detect p50', before: '3.7 s (answer-only pass) · 4.1 s', pass: (m) => (m.ttftP90 ?? Infinity) <= 5000 && (m.detectP50 ?? Infinity) <= 5000, show: (m) => `${m.ttftP90 == null ? '—' : (m.ttftP90 / 1000).toFixed(1) + ' s'}${m.ttftSource === 'answer-only' ? ' (answer-only pass)' : ''} · ${m.detectP50 == null ? '—' : (m.detectP50 / 1000).toFixed(1) + ' s'}` },
];

export function evaluateGate(m) {
    const rows = GATE.map((g) => ({ label: g.label, before: g.before, value: g.show(m), pass: g.pass(m) }));
    return { rows, pass: rows.every((r) => r.pass) };
}
```
The "…" comments mark code that MOVES from the report generator; move it, do not rewrite it, and keep the exact regexes — the baseline test pins the numbers.

- [ ] **Step 4: Run the metrics test** — Expected: PASS (the baseline numbers are the ones the published page shows; if one differs, the move changed a rule — find it, do not adjust the expectation).

- [ ] **Step 5: `gate` command** — in `run.mjs`: `import { computeRun, evaluateGate } from './interview60.metrics.mjs';` and
```js
function gate(dir) {
    const m = computeRun(dir);
    const g = evaluateGate(m);
    console.log(`GATE  ${path.basename(dir)}  ${m.startedAt} → ${m.endedAt}\n`);
    for (const r of g.rows) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.label.padEnd(56)} ${r.value}   (before: ${r.before})`);
    console.log(`\n  ${g.pass ? 'GATE PASSED' : 'GATE FAILED — ' + g.rows.filter((r) => !r.pass).map((r) => r.label).join('; ')}`);
    process.exit(g.pass ? 0 : 1);
}
```
dispatch: `else if (cmd === 'gate') gate(path.resolve(process.argv[3]));`. In `auto`, after the snapshot, run `gate(dest)` (it exits with the verdict).

- [ ] **Step 6: Two-run report** — `interview60.report-html.mjs`: read `const [beforeDir, afterDir] = process.argv.slice(2)`; when none, behave as today but source all numbers from `computeRun(HERE-equivalent)` — simplest: when no args, build a temporary run dir view from the checkout's live files (`natively_debug.log`, `verbal-diag.log`, `interview60.timeline.json`, `interview60.answers.json`) by passing an object with the same fields (`computeRun` accepts a dir; add `computeRunFromFiles({ debugLog, diagLog, timelinePath, answersPath })` in the metrics module and make `computeRun(dir)` call it). When two dirs are given, render additionally, directly under the verdict: a gate table (`label · before · after · gate · PASS/FAIL` using `evaluateGate(after).rows` and `GATE[i].before`), two strips stacked (`renderStrip(before.items)` above `renderStrip(after.items)`, same cell classes, labelled "Before · 2026-09-02" and "After · <date>"), and an "Iterations" table listing every subfolder of `interview60.runs/` with its `answered/heard/sttCloses`. Each finding object gains `after: (m) => string` returning the after-number for its metric (race: `raceLosses`; coaching: `coachingAnswers`; socket: `sttCloses / lostUtterances`; invented: `invented + surfacedMulti`; split: none; coding: `codingForSpoken`; label: none; budget: from answers) shown as a fifth `<dt>After</dt>` row when an after run is present. Title stays "Natively Flight Test".

- [ ] **Step 7: Regenerate the single-run page and diff** — `node electron/test/golden/interview60.report-html.mjs` then `node electron/test/golden/interview60.report-html.mjs electron/test/golden/interview60.runs/2026-09-02-before electron/test/golden/interview60.runs/2026-09-02-before` (before vs itself) — Expected: the first renders identical headline numbers to the published page (52 / 51 / 26 / 25 / 1 / 0); the second shows a gate table with every row FAIL/PASS as the baseline and two identical strips. Open both on `http://localhost:8765/interview60.report.html` (the `golden-report` launch config) and check no horizontal overflow.

- [ ] **Step 8: README** — add `gate <dir>` and the two-dir report form to the interview60 block.

- [ ] **Step 9: Suite** — `npm test` — Expected: green.

- [ ] **Step 10: Commit**
```bash
git add electron/test/golden/interview60.metrics.mjs electron/test/golden/interview60.metrics.test.ts electron/test/golden/interview60.report-html.mjs electron/test/golden/interview60.run.mjs electron/test/golden/README.md
git commit -m "feat(harness): one metrics module for the gate and the report; before/after page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Full gates, the hour, the verdict (spec §5 steps 6–7)

**Files:** none new. Produces the after-run folder and the republished page.

- [ ] **Step 1: Everything green** — `npm test && npx tsc --noEmit && npm run build:electron && npx vite build` — Expected: all pass. Then the three calibrations: `npx vitest run electron/knowledge/IntentClassifier.test.ts electron/services/questionReconcile.test.ts` and `node --env-file=.env electron/test/golden/interview60.calibrate-detector.mjs` — Expected: PASS ×3.

- [ ] **Step 2: The hour** — `node electron/test/golden/interview60.run.mjs auto after 2>&1 | tee electron/test/golden/interview60.auto.log` (the log file is gitignored by the existing run-log rule). This stops the app, rebuilds, relaunches, probes quota (postponing up to `I60_PROBE_DEADLINE_MIN`, default 45), plays the hour, writes the report, snapshots to `interview60.runs/<stamp>-after/`, and prints the gate verdict.

- [ ] **Step 3: After-run passes** — `node --env-file=.env electron/test/golden/interview60.answers.mjs && node --env-file=.env electron/test/golden/interview60.chains.mjs`, then copy the two JSON files into the after folder: `cp electron/test/golden/interview60.answers.json electron/test/golden/interview60.chains.json electron/test/golden/interview60.runs/<stamp>-after/`.

- [ ] **Step 4: The comparison page** — `node electron/test/golden/interview60.report-html.mjs electron/test/golden/interview60.runs/2026-09-02-before electron/test/golden/interview60.runs/<stamp>-after`, render-check on `localhost:8765`, then republish to the existing artifact (same file path `electron/test/golden/interview60.report.html`, URL `https://claude.ai/code/artifact/65145db8-9501-4c4a-83bb-7a7a37021122`, label `After run 1`).

- [ ] **Step 5: Verdict and loop** — if `gate` printed `GATE PASSED`: done; report the before/after table. If it FAILED: the failing rows name the metric; open the after folder's logs, write the failing evidence into `docs/superpowers/plans/2026-09-02-iteration-<n>.md` (force-add, commit), fix on the branch with its own test, and repeat from Step 1 with label `after<n+1>`. Never edit the gate to make it pass.

- [ ] **Step 6: Commit the report page**
```bash
git add electron/test/golden/interview60.report.html electron/test/golden/interview60.report.md
git commit -m "docs(golden): before/after flight-test page — <PASSED|FAILED: rows>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review notes (done while writing)

- **Spec coverage:** §1.1 Task 1 · §1.2–1.3 Task 2 · §2.2–2.5 Tasks 3–4 · §3.1 Tasks 5–6 · §3.2 Tasks 7–8 · §3.3 Tasks 5–6 · §3.4 Task 9 · §3.5 Task 10 · §3.6 Task 11 · §3.7 Task 12 · §4 Task 13 · §5–6 Task 14. §1.1's renderer mount-time `live-mode:get` already exists in `useLiveMode.ts` — no task needed.
- **Names used consistently:** `normalizeLiveMode`, `getLiveMode/setLiveMode`, `waitForLogLines`, `snapshotRun`, `overlap` (same definition in `interview60.lib.mjs` and `questionReconcile.ts` — the harness cannot import TypeScript), `sameAnchor`, `reconcileLiveQuestion`, `RecentSpeech`, `markAnswered`, `alreadyAnswered`, `anchor`, `decideDispatch`, `dispatchDetection`, `getRecentInterviewerSpeech`, `lastInterviewerTurn`, `knowledgeQuestion`, `ProviderCooldown`, `isRateLimit`, `tapFirstToken`, `SPOKEN_WORD_TARGET`, `computeRun`, `GATE`, `evaluateGate`.
- **Order matters:** Task 6 needs Task 5; Task 13 needs the log lines from Tasks 3, 6 and 11; Task 14 needs everything. Tasks 7–12 are independent of each other and of 3–6.
