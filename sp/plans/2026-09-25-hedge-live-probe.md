# Live Hedge Probe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure, live and under real concurrency, whether the hedge answer policy (3.5-lite first, 3.1-lite started alongside at 5 s, first token wins) beats the policy the app runs today (3.1-lite first, 3.5-lite after a 503 or a 10 s stall), on the 39 s50m captured prompts, in three evening windows on 2026-09-25, against a decision rule written and committed before the first window.

**Architecture:** A pure policy module (`runToday`, `runHedge`) over an injectable `ask(model, signal)` that resolves at the first token, unit-tested with a fake `ask` and small timings. A probe script wires the real streaming call (the 09-23 latency probe's call shape) to those policies and writes one JSON row per (prompt, policy). A decide script pools the windows and prints the pre-registered verdict. A scratchpad runner starts the three windows at 19:30, 21:30 and 23:30 local as one detached process.

**Tech Stack:** Node 22 ESM scripts under `electron/test/golden/`, vitest for the policy tests, the Gemini streaming REST endpoint (`v1alpha ... :streamGenerateContent?alt=sse`), PowerShell `Start-Process` for the detached run.

**Spec:** MAIN `docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md` (hypotheses H1–H4; H3 = the concurrency assumption this probe tests) and the conversation of 2026-09-25 (windows tonight, decision on 09-27).

## Global Constraints

- MAIN checkout = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`, branch `fix/coding-style-suffix-all-gemini`, HEAD `92d04a5` at the start of this plan. The Write/Edit tools refuse MAIN paths: write every repo file to the scratchpad staging folder `<SP>\stage\<repo-relative path>` and copy it with PowerShell `Copy-Item`. `<SP>` = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`.
- The Gemini key reaches a probe only through `node --env-file=.env`; no script prints, copies or stores it. `credentials.enc` is never read.
- Never `git add -A`/`-u`, never `git stash`, never push. Commits on MAIN use the private-index recipe (Task 4) so the user's uncommitted files (`natively_debug.log.1`, `interview60.chains.json`, `interview60.report.md`, the untracked probes) never ride along. Commit trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Tests run as `node node_modules/vitest/vitest.mjs run <file>` from MAIN's root (PowerShell `Push-Location`). No `npx`. Bash inline text never contains backticks.
- `.ps1`/`.cmd` scripts are ASCII-only; the repo path is resolved by wildcard (`OneDrive\Masa*\natively-cluely-ai-assistant`) FILTERED to the match that holds `.git` — a stray mojibake `MasaÃ¼stÃ¼` tree also matches (seen 2026-09-25 18:15) — never spelled with accents.
- Throwaway scripts (the window runner, the decide calibration) live in the scratchpad, never the repo.
- The app is not started from a Claude session. The app is not running today (debug log last written 2026-09-24 11:20), so its warm-ups do not pollute the probe.
- Quota: today's Gemini day (resets 10:00 local 2026-09-26) has ~497 requests left on 3.1-lite and 500 on 3.5-lite; the three windows spend about 180 and 150. Tomorrow's flight is in the next quota day.
- The hedge probe's rule is fixed by Task 4 BEFORE Task 5 runs; the rule file is never edited afterwards.

---

### Task 1: Policy module with tests (TDD)

**Files:**
- Create: `electron/test/golden/hedge-live.policy.mjs` (staged at `<SP>\stage\electron\test\golden\hedge-live.policy.mjs`)
- Test: `electron/test/golden/hedge-live.policy.test.ts` (staged likewise)

**Interfaces:**
- Consumes: nothing.
- Produces: `runToday({ ask, primary?, fallback?, stallMs? })` and `runHedge({ ask, front?, back?, triggerMs? })`, both `async` and returning `{ wait: number|null, by: string, extra: boolean, legs: Array<{ model, startedAt, ttft, at, error?, aborted? }> }`; constants `TODAY = { primary: 'gemini-3.1-flash-lite', fallback: 'gemini-3.5-flash-lite', stallMs: 10000 }` and `HEDGE = { front: 'gemini-3.5-flash-lite', back: 'gemini-3.1-flash-lite', triggerMs: 5000 }`. The `ask(model, signal)` contract: resolves at the FIRST TOKEN with `{ ttft }` (ms from its own start), or at failure with `{ ttft: null, error }`, or, once `signal` is aborted, with `{ ttft: null, aborted: true }`.

- [ ] **Step 1: Write the failing tests**

Stage `electron/test/golden/hedge-live.policy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
// @ts-ignore — untyped ESM harness module
import { runToday, runHedge } from './hedge-live.policy.mjs';

// Timings are tens of milliseconds; the policies take their deadlines as parameters.
type Plan = Record<string, { tokenAt?: number; errorAt?: number }>;
/** A fake ask: a token at tokenAt, or a failure at errorAt; an abort resolves at once as aborted. */
const fakeAsk = (plan: Plan) => (model: string, signal: AbortSignal) => new Promise<any>((resolve) => {
    const p = plan[model];
    const timer = setTimeout(() => resolve(p.tokenAt != null ? { ttft: p.tokenAt } : { ttft: null, error: 'HTTP 503' }), p.tokenAt ?? p.errorAt);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve({ ttft: null, aborted: true }); });
});
const near = (x: number | null, want: number) => x != null && Math.abs(x - want) <= 40;
const leg = (r: any, model: string) => r.legs.find((l: any) => l.model === model);
const P = 'primary-model', F = 'fallback-model';   // the policies treat model names as opaque
const today = (plan: Plan) => runToday({ ask: fakeAsk(plan), primary: P, fallback: F, stallMs: 200 });
const hedge = (plan: Plan) => runHedge({ ask: fakeAsk(plan), front: F, back: P, triggerMs: 100 });

describe('today: primary first, fallback on error or at the stall', () => {
    it('answers from the primary when it speaks before the stall', async () => {
        const r = await today({ [P]: { tokenAt: 60 }, [F]: { tokenAt: 10 } });
        expect(r.by).toBe(P); expect(near(r.wait, 60)).toBe(true); expect(r.extra).toBe(false); expect(r.legs).toHaveLength(1);
    });
    it('starts the fallback at once when the primary fails', async () => {
        const r = await today({ [P]: { errorAt: 30 }, [F]: { tokenAt: 50 } });
        expect(r.by).toBe(F); expect(near(r.wait, 80)).toBe(true); expect(r.extra).toBe(true);
        expect(leg(r, P).error).toBe('HTTP 503'); expect(near(leg(r, F).startedAt, 30)).toBe(true);
    });
    it('aborts a silent primary at the stall and takes the fallback', async () => {
        const r = await today({ [P]: { tokenAt: 600 }, [F]: { tokenAt: 50 } });
        expect(r.by).toBe(F); expect(near(r.wait, 250)).toBe(true); expect(leg(r, P).aborted).toBe(true);
    });
    it('has no answer when both fail', async () => {
        const r = await today({ [P]: { errorAt: 30 }, [F]: { errorAt: 30 } });
        expect(r.wait).toBeNull(); expect(r.by).toBe('none'); expect(r.extra).toBe(true);
    });
});

describe('hedge: front first, back alongside at the trigger, first token wins', () => {
    it('answers from the front alone when it speaks before the trigger', async () => {
        const r = await hedge({ [F]: { tokenAt: 60 }, [P]: { tokenAt: 10 } });
        expect(r.by).toBe(F); expect(near(r.wait, 60)).toBe(true); expect(r.extra).toBe(false); expect(r.legs).toHaveLength(1);
    });
    it('the back wins when the front is slow, and the front is aborted', async () => {
        const r = await hedge({ [F]: { tokenAt: 300 }, [P]: { tokenAt: 50 } });
        expect(r.by).toBe(P); expect(near(r.wait, 150)).toBe(true); expect(r.extra).toBe(true);
        expect(near(leg(r, P).startedAt, 100)).toBe(true); expect(leg(r, F).aborted).toBe(true);
    });
    it('the front still wins after the trigger when it speaks first, and the back is aborted', async () => {
        const r = await hedge({ [F]: { tokenAt: 130 }, [P]: { tokenAt: 100 } });
        expect(r.by).toBe(F); expect(near(r.wait, 130)).toBe(true); expect(r.extra).toBe(true); expect(leg(r, P).aborted).toBe(true);
    });
    it('starts the back at once when the front fails', async () => {
        const r = await hedge({ [F]: { errorAt: 30 }, [P]: { tokenAt: 50 } });
        expect(r.by).toBe(P); expect(near(r.wait, 80)).toBe(true); expect(near(leg(r, P).startedAt, 30)).toBe(true);
    });
    it('a failed back leaves the front to finish', async () => {
        const r = await hedge({ [F]: { tokenAt: 400 }, [P]: { errorAt: 50 } });
        expect(r.by).toBe(F); expect(near(r.wait, 400)).toBe(true); expect(leg(r, P).error).toBe('HTTP 503');
    });
    it('has no answer when both fail', async () => {
        const r = await hedge({ [F]: { errorAt: 30 }, [P]: { errorAt: 30 } });
        expect(r.wait).toBeNull(); expect(r.by).toBe('none');
    });
});
```

Copy the staged test into MAIN:

```powershell
$sp = "C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad"; $m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path; Copy-Item "$sp\stage\electron\test\golden\hedge-live.policy.test.ts" "$m\electron\test\golden\hedge-live.policy.test.ts"
```

- [ ] **Step 2: Run the test to verify it fails**

Run (PowerShell): `Push-Location $m; node node_modules/vitest/vitest.mjs run electron/test/golden/hedge-live.policy.test.ts; Pop-Location`
Expected: FAIL — the import of `./hedge-live.policy.mjs` cannot be resolved (module missing).

- [ ] **Step 3: Write the policy module**

Stage `electron/test/golden/hedge-live.policy.mjs`:

```js
// hedge-live.policy.mjs — the two spoken-answer policies the live hedge probe compares, as pure
// functions over an injected ask(model, signal). ask resolves at the FIRST TOKEN ({ ttft }, ms from
// its own start), or at the failure ({ ttft: null, error }), or, once signal is aborted, with
// ({ ttft: null, aborted: true }). Deadlines are parameters so the tests run in milliseconds.
//   today: primary first; on its error start the fallback at once; at stallMs with no token abort
//          the primary and start the fallback (LLMHelper.streamGeminiWithStallFallback today).
//   hedge: front first; on its error start the back at once; at triggerMs with no token start the
//          back WITHOUT stopping the front; the first token from either wins, the other is aborted;
//          a leg that fails leaves the other to finish.
// Both resolve { wait, by, extra, legs }: wait = ms from the policy start to the first token (null =
// no answer), by = the model that spoke ('none'), extra = a second request was made, legs = every
// request's record with startedAt and at (both ms from the policy start).
export const TODAY = { primary: 'gemini-3.1-flash-lite', fallback: 'gemini-3.5-flash-lite', stallMs: 10000 };
export const HEDGE = { front: 'gemini-3.5-flash-lite', back: 'gemini-3.1-flash-lite', triggerMs: 5000 };

const after = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
function leg(ask, model, t0) {
    const ac = new AbortController();
    const startedAt = Date.now() - t0;
    const p = ask(model, ac.signal).then((r) => ({ model, startedAt, ...r, at: r.ttft != null ? startedAt + r.ttft : null }));
    return { model, p, abort: () => ac.abort() };
}
async function finish(legs, winner) {
    const records = await Promise.all(legs.map((l) => l.p));
    return { wait: winner ? winner.at : null, by: winner ? winner.model : 'none', extra: legs.length > 1, legs: records };
}

export async function runToday({ ask, primary = TODAY.primary, fallback = TODAY.fallback, stallMs = TODAY.stallMs }) {
    const t0 = Date.now();
    const a = leg(ask, primary, t0);
    const first = await Promise.race([a.p, after(stallMs, 'stall')]);
    if (first !== 'stall' && first.ttft != null) return finish([a], first);
    if (first === 'stall') a.abort();
    const b = leg(ask, fallback, t0);
    const r = await b.p;
    return finish([a, b], r.ttft != null ? r : null);
}

export async function runHedge({ ask, front = HEDGE.front, back = HEDGE.back, triggerMs = HEDGE.triggerMs }) {
    const t0 = Date.now();
    const f = leg(ask, front, t0);
    const first = await Promise.race([f.p, after(triggerMs, 'trigger')]);
    if (first !== 'trigger' && first.ttft != null) return finish([f], first);
    const b = leg(ask, back, t0);
    if (first !== 'trigger') { const r = await b.p; return finish([f, b], r.ttft != null ? r : null); }
    // Both alive: the first token wins; a failed leg leaves the other to finish.
    const winner = await new Promise((resolve) => {
        let alive = 2;
        for (const l of [f, b]) l.p.then((r) => { if (r.ttft != null) resolve({ r, other: l === f ? b : f }); else if (--alive === 0) resolve(null); });
    });
    if (winner) winner.other.abort();
    return finish([f, b], winner ? winner.r : null);
}
```

Copy it into MAIN:

```powershell
Copy-Item "$sp\stage\electron\test\golden\hedge-live.policy.mjs" "$m\electron\test\golden\hedge-live.policy.mjs"
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `Push-Location $m; node node_modules/vitest/vitest.mjs run electron/test/golden/hedge-live.policy.test.ts; Pop-Location`
Expected: 10 passed, 0 failed. If a timing assertion is off by more than 40 ms on this machine, widen `near` to 60 ms once and re-run; a policy assertion (wrong `by`, wrong `aborted`) is a bug in the module, not the tolerance.

- [ ] **Step 5: Break it and watch it fail (calibration of the tests)**

Temporarily change `if (winner) winner.other.abort();` to `if (winner) {}` in the staged module, copy, run: expected 2 failures (the two "aborted" assertions in the hedge block). Restore the line, copy, re-run: 10 passed.

### Task 2: The probe script

**Files:**
- Create: `electron/test/golden/hedge-live.probe.mjs` (staged, then copied)
- Reads: `electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json` (the 09-23 probe's 39 prompts)
- Writes: `electron/test/golden/interview60.runs/latency-probe/<date>-hedge-<H1|H2|H3>.json` (gitignored run output)

**Interfaces:**
- Consumes: `runToday`, `runHedge` from Task 1.
- Produces: rows `{ id, policy: 'today'|'hedge', at, wait, by, extra, legs }`, one per (prompt, policy), in the JSON file; the console prints one line per row.

- [ ] **Step 1: Write the probe**

Stage `electron/test/golden/hedge-live.probe.mjs`:

```js
// hedge-live.probe.mjs — one window of the LIVE hedge probe (passes/PREREGISTER-hedge-probe.md).
// The policy the app runs today against the hedge, each run for real on s50m's 39 captured prompts
// (the 09-23 latency probe's set), alternating which goes first per prompt, 8 s apart so the two
// never overlap. What the 09-23 probe could not measure: what happens to one model's request when
// the other model is started beside it.
//   node --env-file=.env electron/test/golden/hedge-live.probe.mjs <H1|H2|H3> [--dry]
// --dry: the same loop over a fake ask with fixed timings, 3 prompts; no request, no file.
// Close the app first (its warm-ups send each model a request). The key reaches this process only
// through --env-file; nothing here prints or stores it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runToday, runHedge } from './hedge-live.policy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS = path.join(HERE, 'interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json');
const OUT_DIR = path.join(HERE, 'interview60.runs/latency-probe');
const window = process.argv[2];
const dry = process.argv.includes('--dry');
if (!/^H[1-3]$/.test(window ?? '')) { console.error('usage: hedge-live.probe.mjs <H1|H2|H3> [--dry]'); process.exit(2); }
const KEY = process.env.GEMINI_API_KEY?.trim();
if (!dry && !KEY) { console.error('GEMINI_API_KEY: not in the environment — run with --env-file'); process.exit(2); }
const OUT = path.join(OUT_DIR, `${new Date().toISOString().slice(0, 10)}-hedge-${window}.json`);
if (!dry && fs.existsSync(OUT)) { console.error(`${OUT} exists — a window that ran is never run again`); process.exit(2); }

// The levels the app flies each model at (guard-h40a.mjs check 4); the call shape is the harness's.
const THINKING = { 'gemini-3.1-flash-lite': 'LOW', 'gemini-3.5-flash-lite': 'HIGH' };
const HARD_CAP_MS = 45000;  // never hang a leg on a dead request
const GAP_MS = 8000;        // between the two policies of a prompt, and between prompts

// Resolves at the FIRST TOKEN, then keeps reading to 400 chars and drops the stream. The policy's
// abort resolves it as aborted; the cap as an error. Never resolves twice.
function ask(model, captured, signal) {
    return new Promise((resolve) => {
        let resolved = false;
        const done = (r) => { if (!resolved) { resolved = true; resolve(r); } };
        const ac = new AbortController();
        const onAbort = () => ac.abort();
        signal.addEventListener('abort', onAbort);
        const cap = setTimeout(() => ac.abort(), HARD_CAP_MS);
        const t0 = Date.now();
        (async () => {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`, {
                    method: 'POST', signal: ac.signal,
                    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: captured.user }] }],
                        systemInstruction: { parts: [{ text: captured.system }] },
                        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: THINKING[model] } },
                    }),
                });
                if (!res.ok) return done({ ttft: null, error: `HTTP ${res.status}`, total: Date.now() - t0 });
                const reader = res.body.getReader();
                const dec = new TextDecoder();
                let buf = '', ttft = null, chars = 0;
                for (;;) {
                    const { value, done: end } = await reader.read();
                    if (end) break;
                    buf += dec.decode(value, { stream: true });
                    let i;
                    while ((i = buf.indexOf('\n')) >= 0) {
                        const line = buf.slice(0, i).trim();
                        buf = buf.slice(i + 1);
                        if (!line.startsWith('data:')) continue;
                        let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
                        const piece = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
                        if (piece) { if (ttft === null) { ttft = Date.now() - t0; done({ ttft }); } chars += piece.length; }
                    }
                    if (ttft !== null && chars > 400) { ac.abort(); break; }
                }
                if (ttft === null) done({ ttft: null, error: 'stream ended with no token', total: Date.now() - t0 });
            } catch (e) {
                if (signal.aborted) done({ ttft: null, aborted: true, total: Date.now() - t0 });
                else done({ ttft: null, error: e?.name === 'AbortError' ? 'aborted at cap' : String(e?.message || e), total: Date.now() - t0 });
            } finally { clearTimeout(cap); signal.removeEventListener('abort', onAbort); }
        })();
    });
}
// --dry: fixed timings, so the wiring runs end to end without a request.
const fakeAsk = (model, signal) => new Promise((resolve) => {
    const ms = model === 'gemini-3.5-flash-lite' ? 150 : 300;
    const t = setTimeout(() => resolve({ ttft: ms }), ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve({ ttft: null, aborted: true }); });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (m) => m.replace('gemini-', '').replace('-flash-lite', '-lite');

const prompts = JSON.parse(fs.readFileSync(PROMPTS, 'utf8'));
const ids = Object.keys(prompts).sort().slice(0, dry ? 3 : undefined);
console.log(`window ${window}${dry ? ' DRY' : ''}: ${ids.length} prompts x 2 policies, alternating order, ${GAP_MS / 1000} s apart — ${new Date().toISOString()}`);
const rows = [];
for (const [n, id] of ids.entries()) {
    const askP = dry ? fakeAsk : (model, signal) => ask(model, prompts[id], signal);
    const order = n % 2 === 0 ? ['today', 'hedge'] : ['hedge', 'today'];   // balance any first-in-pair advantage
    for (const policy of order) {
        const r = policy === 'today' ? await runToday({ ask: askP }) : await runHedge({ ask: askP });
        rows.push({ id, policy, at: new Date().toISOString(), ...r });
        const legs = r.legs.map((l) => `${short(l.model)}@${l.startedAt}: ${l.aborted ? 'aborted' : l.error ? l.error : l.ttft + 'ms'}`).join(', ');
        console.log(`${String(n + 1).padStart(2)}/${ids.length} ${id.padEnd(8)} ${policy.padEnd(5)} ${r.wait == null ? 'NO ANSWER' : `${r.wait} ms by ${short(r.by)}`}${r.extra ? ' (+1 request)' : ''}   [${legs}]`);
        if (!dry) await sleep(GAP_MS);
    }
}
if (dry) { console.log('dry run complete; nothing written'); process.exit(0); }
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
console.log(`\nwrote ${OUT}\ndecide after the last window: node electron/test/golden/hedge-live.decide.mjs ${path.join(OUT_DIR, '<date>-hedge-H1.json')} ...`);
```

Copy it into MAIN:

```powershell
Copy-Item "$sp\stage\electron\test\golden\hedge-live.probe.mjs" "$m\electron\test\golden\hedge-live.probe.mjs"
```

- [ ] **Step 2: Dry-run the wiring**

Run: `Push-Location $m; node electron/test/golden/hedge-live.probe.mjs H1 --dry; Pop-Location`
Expected: 3 prompts × 2 lines; every `today` line says `~300 ms by 3.1-lite`, every `hedge` line `~150 ms by 3.5-lite`, no `(+1 request)`, then `dry run complete; nothing written`. No file appears under `interview60.runs/latency-probe/`.

- [ ] **Step 3: One real prompt as a smoke, then discard it**

Run: `Push-Location $m; node --env-file=.env electron/test/golden/hedge-live.probe.mjs H1 2>&1 | Select-Object -First 4; Pop-Location` is NOT usable (it would write the H1 file). Instead run the smoke through the dry path only; the first real window IS the smoke: watch its first two lines in the window log (Task 5) and stop the runner if the legs show `HTTP 400` (a malformed request) rather than tokens, 503s or caps.

### Task 3: The decide script and its calibration

**Files:**
- Create: `electron/test/golden/hedge-live.decide.mjs` (staged, then copied)
- Create (throwaway): `<SP>\hedge-decide-cal.mjs`

**Interfaces:**
- Consumes: the row shape from Task 2.
- Produces: per-window and pooled lines; the independence lines; a `RULE` line and a `VERDICT:` line that is either `PROCEED to the env-flagged build` or `DO NOT BUILD — the hedge did not beat today live`.

- [ ] **Step 1: Write the decide script**

Stage `electron/test/golden/hedge-live.decide.mjs`:

```js
// hedge-live.decide.mjs — applies passes/PREREGISTER-hedge-probe.md to the hedge probe's windows.
//   node electron/test/golden/hedge-live.decide.mjs <window.json> [<window.json> ...]
// A no-answer counts as the 45 s cap in the median and p90, as the 09-23 latency rule counted it.
import fs from 'node:fs';
import path from 'node:path';

const CAP_MS = 45000;
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: hedge-live.decide.mjs <window.json> ...'); process.exit(2); }
const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).map((r) => ({ ...r, file: path.basename(f) })));
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const s = (ms) => (ms >= CAP_MS ? 'cap' : `${(ms / 1000).toFixed(1)} s`);
const short = (m) => m.replace('gemini-', '').replace('-flash-lite', '-lite');
function summarize(rs) {
    const waits = rs.map((r) => r.wait ?? CAP_MS);
    return { n: rs.length, median: pct(waits, 0.5), p90: pct(waits, 0.9), none: rs.filter((r) => r.wait == null).length,
        extra: rs.filter((r) => r.extra).length, by: rs.reduce((a, r) => (a[r.by] = (a[r.by] ?? 0) + 1, a), {}) };
}
const line = (label, x) => `${label.padEnd(8)} n=${String(x.n).padStart(3)}  median ${s(x.median).padEnd(7)} p90 ${s(x.p90).padEnd(7)} none ${String(x.none).padStart(2)}  extra ${String(x.extra).padStart(3)}  by ${Object.entries(x.by).map(([k, v]) => `${short(k)} ${v}`).join(', ')}`;
for (const f of files) {
    console.log(path.basename(f));
    for (const p of ['today', 'hedge']) console.log('  ' + line(p, summarize(rows.filter((r) => r.file === path.basename(f) && r.policy === p))));
}
const T = summarize(rows.filter((r) => r.policy === 'today')), H = summarize(rows.filter((r) => r.policy === 'hedge'));
console.log(`pooled (${files.length} windows)`);
console.log('  ' + line('today', T));
console.log('  ' + line('hedge', H));

// Independence: a model's failure rate (errors over requests that were not aborted) when it is the
// hedge's second request, against the same model as today's first request — the replay assumed equal.
const legs = (policy, model, pick) => rows.filter((r) => r.policy === policy).flatMap((r) => r.legs).filter((l) => l.model === model && !l.aborted && pick(l));
const rate = (ls) => (ls.length ? `${ls.filter((l) => l.error).length}/${ls.length} failed` : 'no requests');
console.log('independence (failures over non-aborted requests):');
console.log(`  3.1-lite as today's first request ${rate(legs('today', 'gemini-3.1-flash-lite', (l) => l.startedAt === 0))}   vs as the hedge's second ${rate(legs('hedge', 'gemini-3.1-flash-lite', (l) => l.startedAt > 0))}`);
console.log(`  3.5-lite as the hedge's first request ${rate(legs('hedge', 'gemini-3.5-flash-lite', (l) => l.startedAt === 0))}   vs as today's second ${rate(legs('today', 'gemini-3.5-flash-lite', (l) => l.startedAt > 0))}`);

const c1 = H.none <= T.none, c2 = H.p90 <= T.p90, c3 = H.median <= T.median + 1000;
console.log(`RULE: hedge none <= today none (${H.none} <= ${T.none}: ${c1}); hedge p90 <= today p90 (${s(H.p90)} <= ${s(T.p90)}: ${c2}); hedge median <= today median + 1 s (${s(H.median)} <= ${s(T.median + 1000)}: ${c3})`);
console.log(`VERDICT: ${c1 && c2 && c3 ? 'PROCEED to the env-flagged build' : 'DO NOT BUILD — the hedge did not beat today live'}`);
```

Copy it into MAIN:

```powershell
Copy-Item "$sp\stage\electron\test\golden\hedge-live.decide.mjs" "$m\electron\test\golden\hedge-live.decide.mjs"
```

- [ ] **Step 2: Calibrate it on synthetic windows with known answers**

Write `<SP>\hedge-decide-cal.mjs`:

```js
// Throwaway: hedge-live.decide.mjs on synthetic windows whose verdict is known by hand.
//   case A: today waits [2000, 3000, null, 4000], hedge [1000, 2500, 3000, null]
//           sorted with cap: today [2000,3000,4000,45000] -> median idx 2 = 4.0 s, p90 idx 3 = cap, none 1
//                            hedge [1000,2500,3000,45000] -> median 3.0 s, p90 cap, none 1  => PROCEED
//   case B: hedge [1000, null, null, 3000] -> none 2 > 1                                    => DO NOT BUILD
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const M = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hedge-cal-'));
const row = (policy, wait, by) => ({ id: 'X', policy, wait, by, extra: false, legs: [{ model: by === 'none' ? 'gemini-3.1-flash-lite' : by, startedAt: 0, ttft: wait, error: wait == null ? 'HTTP 503' : undefined }] });
const today = [2000, 3000, null, 4000].map((w) => row('today', w, w == null ? 'none' : 'gemini-3.1-flash-lite'));
const cases = {
    A: { hedge: [1000, 2500, 3000, null], expect: [/today\s+n=  4  median 4\.0 s   p90 cap     none  1/, /hedge\s+n=  4  median 3\.0 s   p90 cap     none  1/, /VERDICT: PROCEED/] },
    B: { hedge: [1000, null, null, 3000], expect: [/none  2/, /VERDICT: DO NOT BUILD/] },
};
let failed = 0;
for (const [name, c] of Object.entries(cases)) {
    const f = path.join(dir, `${name}.json`);
    fs.writeFileSync(f, JSON.stringify([...today, ...c.hedge.map((w) => row('hedge', w, w == null ? 'none' : 'gemini-3.5-flash-lite'))]));
    const out = execFileSync(process.execPath, [`${M}/electron/test/golden/hedge-live.decide.mjs`, f], { encoding: 'utf8' });
    const bad = c.expect.filter((re) => !re.test(out));
    console.log(`case ${name}: ${bad.length ? 'FAIL' : 'ok'}`); if (bad.length) { failed++; console.log(out); }
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(failed ? 'CALIBRATION FAILED' : 'CALIBRATION OK'); process.exit(failed ? 1 : 0);
```

Run: `node "$sp\hedge-decide-cal.mjs"`
Expected: `case A: ok`, `case B: ok`, `CALIBRATION OK`. If a regex misses only on spacing, fix the regex (the calibration), not the scorer; if a number is wrong, fix the scorer.

### Task 4: Pre-register the rule and commit the instrument BEFORE the first window

**Files:**
- Create: `electron/test/golden/passes/PREREGISTER-hedge-probe.md` (staged, then copied)
- Create (throwaway): `<SP>\commit-hedge-probe.ps1`, `<SP>\hedge-probe-commit-msg.txt`

- [ ] **Step 1: Write the pre-registration**

Stage `electron/test/golden/passes/PREREGISTER-hedge-probe.md`:

```markdown
# Pre-registered: the live hedge probe (2026-09-25, windows H1–H3)

**Question.** Does the hedge (3.5-lite HIGH first; 3.1-lite LOW started at 5 s without stopping
3.5; the first token wins) beat the policy the app runs today (3.1-lite LOW first; 3.5-lite HIGH
after a 503 or at a 10 s first-token stall) when both are run for real, in the same minutes, on
the same prompts? The 2026-09-24 replay of the 09-23 latency windows (117 pairs) says yes — p90
12.9 s vs 18.6 s, no-answers 2 vs 4, median 6.4 vs 5.9 s, extra requests 58% — but it assumed a
model's outcome does not change when the other model is started beside it (H3 in
docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md). This probe measures that.

**Instrument.** electron/test/golden/hedge-live.probe.mjs: s50m's 39 captured prompts (the
09-23 probe's set), each prompt run through both policies back to back, the order alternating by
prompt, 8 s between runs so the policies never overlap, each request capped at 45 s; recorded per
policy: the wait to the first token, which model spoke, whether a second request was made, and
every request's own outcome. Policies: electron/test/golden/hedge-live.policy.mjs, unit-tested.

**Windows.** H1 19:30, H2 21:30, H3 23:30 local, 2026-09-25, the app closed. Evening only: the
09-23 noon window was the worst of the three and is NOT covered here; a daytime window is owed
before any decision to ship the hedge, and its result will be read by the same rule.

**Decision** (electron/test/golden/hedge-live.decide.mjs, pooled over the three windows, a
no-answer counted as 45 s): the hedge goes to an env-flagged build only if all three hold:
1. hedge no-answers <= today's no-answers;
2. hedge p90 wait <= today's p90 wait;
3. hedge median wait <= today's median wait + 1.0 s.
Otherwise the hedge is not built and today's order stays. Per-window numbers are reported, not
gated. The independence check (each model's failure rate as the hedge's second request against
the same model as today's first request) is reported, not gated; a large gap there means the
replay's assumption was wrong, whichever way the verdict goes.

Written and committed before H1 ran. Not edited afterwards.
```

Copy it into MAIN:

```powershell
New-Item -ItemType Directory -Force "$m\electron\test\golden\passes" | Out-Null; Copy-Item "$sp\stage\electron\test\golden\passes\PREREGISTER-hedge-probe.md" "$m\electron\test\golden\passes\PREREGISTER-hedge-probe.md"
```

- [ ] **Step 2: Commit the four files with a private index**

Write `<SP>\hedge-probe-commit-msg.txt`:

```
probe(hedge): live A/B of the hedge policy against today's, pre-registered

Policies as pure functions (unit-tested), the streaming call the app makes, s50m's 39 captured
prompts, three evening windows; the rule and the independence check are fixed before H1 runs.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

Write `<SP>\commit-hedge-probe.ps1` (ASCII only; the shared-index recipe of commit-h40a-passes.ps1):

```powershell
# Throwaway: commits ONLY the hedge probe's four files in MAIN: private GIT_INDEX_FILE, commit-tree,
# update-ref compare-and-swap, then sync the shared index for these paths only.
$sp = 'C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad'
$m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not (Test-Path -LiteralPath "$m\.git")) { "MAIN does not resolve: $m"; exit 1 }
$branch = 'fix/coding-style-suffix-all-gemini'
$expected = (git -C $m rev-parse --verify '92d04a5^{commit}').Trim()
$paths = @('electron/test/golden/hedge-live.policy.mjs', 'electron/test/golden/hedge-live.policy.test.ts', 'electron/test/golden/hedge-live.probe.mjs', 'electron/test/golden/hedge-live.decide.mjs', 'electron/test/golden/passes/PREREGISTER-hedge-probe.md')
$msg = "$sp\hedge-probe-commit-msg.txt"
$cur = (git -C $m symbolic-ref --short HEAD).Trim(); if ($cur -ne $branch) { "PRE FAIL: MAIN is on $cur"; exit 2 }
$old = (git -C $m rev-parse HEAD).Trim(); if ($old -ne $expected) { "PRE FAIL: MAIN HEAD is $old, expected $expected"; exit 2 }
$staged = @(git -C $m diff --cached --name-only); if ($staged.Count) { "PRE FAIL: the shared index has staged changes: $($staged -join ', ')"; exit 2 }
foreach ($p in $paths) { if (-not (Test-Path -LiteralPath (Join-Path $m $p))) { "PRE FAIL: missing $p"; exit 2 } }
$before = @(git -C $m status --porcelain | Where-Object { $p = $_.Substring(3); $paths -notcontains $p })
"PRE OK: $branch at $($old.Substring(0,7)); nothing staged"
$idx = "$sp\hedge-probe-commit.index"
if (Test-Path -LiteralPath $idx) { Remove-Item -LiteralPath $idx -Force }
$env:GIT_INDEX_FILE = $idx
git -C $m read-tree HEAD
git -C $m update-index --add -- $paths
$tree = (git -C $m write-tree).Trim()
Remove-Item Env:GIT_INDEX_FILE
$new = (git -C $m commit-tree $tree -p $old -F $msg).Trim()
git -C $m update-ref -m 'commit: probe(hedge): live A/B, pre-registered' "refs/heads/$branch" $new $old
if ($LASTEXITCODE) { 'CAS REFUSED: a peer moved the branch; nothing committed'; exit 4 }
git -C $m reset -q -- $paths
Remove-Item -LiteralPath $idx -Force
"POST: HEAD is the new commit: $(((git -C $m rev-parse HEAD).Trim()) -eq $new)"
"POST: HEAD tree equals the built tree: $(((git -C $m rev-parse 'HEAD^{tree}').Trim()) -eq $tree)"
"POST: the paths are clean: $(-not (git -C $m status --porcelain -- $paths))"
$after = @(git -C $m status --porcelain | Where-Object { $p = $_.Substring(3); $paths -notcontains $p })
"POST: every other status line identical: $(-not (Compare-Object $before $after))"
git -C $m show --stat --format='%h %s' HEAD
```

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File "$sp\commit-hedge-probe.ps1"`
Expected: `PRE OK`, then all four `POST:` lines `True`, then the `--stat` showing exactly 5 files. Note the new short SHA; the flight plan's commit step expects it as its parent.

### Task 5: Run the three windows detached, watched

**Files:**
- Create (throwaway): `<SP>\run-hedge-windows.mjs`

- [ ] **Step 1: Write the window runner**

```js
// Throwaway: starts the hedge probe's three windows at their local times, one detached process for
// the evening. Each window: node --env-file=.env electron/test/golden/hedge-live.probe.mjs Hn from
// MAIN's root; stdout+stderr to interview60.runs/latency-probe/<date>-hedge-Hn.log. A window whose
// time has passed at launch starts at once. The key never touches this process: --env-file loads it
// in the child.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const M = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const LOGS = `${M}/electron/test/golden/interview60.runs/latency-probe`;
const WINDOWS = [['H1', '19:30'], ['H2', '21:30'], ['H3', '23:30']];
const stamp = () => new Date().toTimeString().slice(0, 8);
const at = (hhmm) => { const d = new Date(); const [h, mi] = hhmm.split(':').map(Number); d.setHours(h, mi, 0, 0); return d; };
fs.mkdirSync(LOGS, { recursive: true });
for (const [w, hhmm] of WINDOWS) {
    const wait = Math.max(0, at(hhmm) - Date.now());
    console.log(`${stamp()} ${w} at ${hhmm}: waiting ${Math.round(wait / 60000)} min`);
    await new Promise((r) => setTimeout(r, wait));
    const log = `${LOGS}/${new Date().toISOString().slice(0, 10)}-hedge-${w}.log`;
    const fd = fs.openSync(log, 'a');
    const code = await new Promise((resolve) => {
        const c = spawn(process.execPath, ['--env-file=.env', 'electron/test/golden/hedge-live.probe.mjs', w], { cwd: M, stdio: ['ignore', fd, fd] });
        c.on('exit', resolve);
    });
    fs.closeSync(fd);
    console.log(`${stamp()} ${w} exit ${code}`);
}
console.log(`${stamp()} WINDOWS DONE`);
```

- [ ] **Step 2: Launch it detached and arm the watch**

```powershell
$d = Start-Process -FilePath node -ArgumentList "`"$sp\run-hedge-windows.mjs`"" -WorkingDirectory $sp -RedirectStandardOutput "$sp\hedge-windows.log" -RedirectStandardError "$sp\hedge-windows.err.log" -WindowStyle Hidden -PassThru; "detached pid $($d.Id) at $(Get-Date -Format HH:mm:ss)"
```

Then a Monitor (30 min, re-armed at each expiry) on the runner log and the current window's log:

```
tail -n +1 -f "<SP as /c/...>/hedge-windows.log" | grep -E --line-buffered "exit|DONE|Error|error"
```

and, once each window starts, a second Monitor on its `.log` filtered to `NO ANSWER|HTTP 4|aborted at cap|wrote|Error`. The first two lines of H1 are the smoke: legs showing tokens, 503s or caps are the instrument working; `HTTP 400` is a malformed request — stop the runner (`Stop-Process` on the pid and its node children matched by `hedge-live.probe.mjs` in the command line) and fix before H2.

- [ ] **Step 3: Keep the machine awake**

The PC never sleeps on AC with wake timers on (health check 2026-09-23); confirm with `powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE` showing AC index 0, or tell the user to keep the machine on until 00:15.

### Task 6: Decide, report, remember

- [ ] **Step 1: After H3 (about 23:55), run the decide script on the three files**

Run: `Push-Location $m; node electron/test/golden/hedge-live.decide.mjs electron/test/golden/interview60.runs/latency-probe/2026-09-25-hedge-H1.json electron/test/golden/interview60.runs/latency-probe/2026-09-25-hedge-H2.json electron/test/golden/interview60.runs/latency-probe/2026-09-25-hedge-H3.json; Pop-Location`
Expected: three per-window blocks, the pooled block, two independence lines, the RULE line, the VERDICT line. Quote all of it in the report.

- [ ] **Step 2: Report to the user** (they asked to be pinged): the verdict, the pooled table, the per-window medians, the independence lines, and what the probe did NOT cover (no daytime window; one evening; H = 5 s fixed).

- [ ] **Step 3: Memory**: update `project_hedge_simulation.md` with the live result and the verdict; add the index line in `MEMORY.md`.

## Self-review

- Spec coverage: H3 (independence) → Task 3's independence lines + Task 4's rule; the hedge policy as specified → Task 1; the pre-registration before running → Task 4 precedes Task 5; the evening-only limitation is named in the rule file.
- Placeholders: none; every script is complete. The smoke in Task 2 Step 3 is deliberately the first real window rather than a throwaway request, because a request costs quota and a written H1 file would block a re-run of H1.
- Names: `runToday`/`runHedge`/`TODAY`/`HEDGE` match between the module, the tests and the probe; the row fields `id, policy, at, wait, by, extra, legs` match between the probe and the decide script; `legs[].startedAt`/`error`/`aborted` match between the policy module and the independence check.
