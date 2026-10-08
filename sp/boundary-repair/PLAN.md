# Deepgram Boundary Repair (rule v3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Intended home: `MAIN\docs\superpowers\plans\2026-09-29-deepgram-boundary-repair.md` (gitignored folder). The planning session ran inside a worktree whose guard refuses writes to the shared checkout, so the file was saved here; the controller may copy it there. This version (v3, 17:1x) replaces the v1 plan written at 16:55 in this same file.

**Goal:** Put back the word(s) Deepgram drops when it finalizes a segment short of its own latest interim and resumes the next segment after them, so the interviewer turn no longer answers "How do you cut in a rag answer without just making it refuse?" when "hallucinations" was spoken.

**Architecture:** A pure, clock-free, log-free module `electron/audio/deepgramBoundaryRepair.ts` exports `createBoundaryRepair()`, a line-for-line port of the design's reference `rule-v3.mjs`; `DeepgramStreamingSTT.connect()` creates one per live socket (beside `stale()`) and its Transcript handler feeds every non-empty event to `onTranscript(text, isFinal, Date.now())` after the empty-transcript return, emits the returned text and logs one line per restore. The unit tests replay the design's `fixtures-v3.json` (copied byte-for-byte into the repo) and assert the reference's expected output for each; the adapter test uses the same file's seam fixture through a fake socket, including a restart.

**Tech Stack:** TypeScript under `electron/` (Electron 33 / Node 20, CommonJS, `noImplicitAny`, `resolveJsonModule`), vitest 2.1.9 (fake timers; Node `require.cache` seeding to fake `@deepgram/sdk`), esbuild transpile build (per-file CJS output under `dist-electron/electron/audio/`, which `rule-sim.mjs --impl` requires). No new dependency.

**Spec:** `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\boundary-repair\DESIGN.md` (design brief **v3**; read it first — the plan argues from it). Same folder: `rule-v3.mjs` (the REFERENCE the module must reproduce event for event), `fixtures-v3.json` (the unit-test fixtures: 1 symptom, 1 seam, 15 positives, 28 negatives, each with the reference's expected output), `rule-sim.mjs` (the controller's replay harness: `--impl <built .js>` must match the reference's 25 + 4 repairs), `check-v3-fixtures.mjs` (planning check, 2026-09-29: the reference reproduces all 45 fixtures; a pass-through stub fails exactly 17 of them; the edge values quoted below are its output).

**Paths.** `MAIN = C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (Git Bash form `/c/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant`), branch `fix/coding-style-suffix-all-gemini`, HEAD `0e1e8b2`. Edit MAIN, not any `.claude\worktrees\*` checkout. Before touching anything, confirm the branch by reading the plain file `MAIN\.git\HEAD` (must print `ref: refs/heads/fix/coding-style-suffix-all-gemini`) and that `MAIN\electron\audio\DeepgramStreamingSTT.ts` still has its 2026-09-20 01:58 mtime (13,865 bytes) — other sessions share MAIN's tree. `SP = C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`.

## Global Constraints

- Test-first: each test is watched failing before the code that makes it pass.
- Tests run from a temp cwd with the repo as root, never from the repo cwd. The one test command (`TEST <file>` below; both forms verified 2026-09-29 against `electron/audio/deepgramKeyterms.test.ts` and `electron/audio/DeepgramStreamingSTT.staleSocket.test.ts`, 6/6 tests each):

  ```bash
  # Git Bash (Bash tool), from any directory outside the repo, e.g. the scratchpad:
  cd "/c/Users/sotka/AppData/Local/Temp" && npx --prefix "/c/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant" vitest run --root "/c/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant" <file>
  ```
  ```powershell
  # PowerShell 5.1 equivalent (bare npx/npm fail under the PowerShell tool; go through cmd):
  Set-Location $env:TEMP; cmd /c "npx --prefix ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" vitest run --root ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" <file>"
  ```
  `<file>` is a repo-relative path such as `electron/audio/deepgramBoundaryRepair.test.ts` (vitest matches it as a substring, so `electron/audio/DeepgramStreamingSTT` runs every `DeepgramStreamingSTT.*.test.ts`). Never run the full suite from here (memory: a timed-out test can corrupt the next).
- Type-check both projects: root `npx tsc --noEmit` AND `npx tsc -p electron/tsconfig.json --noEmit`; the electron project has 6 pre-existing errors that are not ours — the gate is "no new errors", not "zero errors". Exact commands (verified 2026-09-29 from the scratchpad cwd, Git Bash; PowerShell wraps them in `cmd /c "..."` the same way as TEST):

  ```bash
  npx --prefix "/c/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant" tsc --noEmit -p "/c/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/tsconfig.json"
  npx --prefix "/c/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant" tsc --noEmit -p "/c/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/tsconfig.json"
  ```
  Baseline at 0e1e8b2: root prints nothing, exit 0. Electron prints exactly these 6 (compare by file + code + message; line numbers drift):
  `electron/audio/GeminiLiveRouter.ts(125,44) TS2339 'length' does not exist on type 'never'`; `electron/ipcHandlers.ts(3433,18) TS2339 'canceled' on 'string[]'`; `electron/ipcHandlers.ts(3433,38) TS2339 'filePaths' on 'string[]'`; `electron/ipcHandlers.ts(3436,31) TS2339 'filePaths' on 'string[]'`; `electron/knowledge/KnowledgeOrchestrator.ts(349,35) TS2322 'CompanyDossier' not assignable to 'null'`; `electron/knowledge/KnowledgeOrchestrator.ts(351,25) TS2322` (same). The root config does not include `electron/`, so the electron run is the one that sees the new module; run both anyway.
- No new dependency. No change outside the two production files and their tests. The tests are: `deepgramBoundaryRepair.test.ts`, `DeepgramStreamingSTT.boundaryRepair.test.ts`, and the fixture data file `deepgramBoundaryRepair.fixtures.json` they import — a byte-for-byte copy of the design's `fixtures-v3.json`, never edited by hand (a fixture that looks wrong is reported; the controller regenerates the file with `fixtures-v3.mjs`). Match the file's existing style (comment density, naming): 4-space indent, single quotes, semicolons, comments that state the measured reason (dates, counts), as `deepgramKeyterms.ts` and `DeepgramStreamingSTT.ts` do. New files LF-only, UTF-8 (the neighbours are; the controller's commit helper refuses CR).
- Constants carry their provenance in a comment (5000 ms from the observed max 3715 ms; one skipped word from 21 of 21 observed losses) — **v3 provenance supersedes those numbers**: 5000 ms = the observed max F1->F2 gap among repaired losses, 4441 ms, with margin; k <= 2 = the largest skip observed (1 case of 2, 25 of 1); m = min(2, available) = the evidence every observed loss provides. Use the v3 numbers in the code.
- The module must reproduce `rule-v3.mjs` event for event (same restored words, same output text): tolerant cut; k = 1..2 with k < |T|; m = min(2, |T| - k) EXACT token matches; the 5000 ms window measured from F1's arrival, inclusive (`<=`); any final clears the remembered cut; Traw is the interim's own spelling from the same token regex without lowercasing on the same comma-stripped text. Export shape the replay harness requires: a factory named `createBoundaryRepair` (CommonJS export after the build) returning an object with `onTranscript(text, isFinal, atMs)` whose result has `.text`.
- The repair state is per live socket: created in `connect()` where the handlers are wired, so a reconnect or restart starts fresh.
- The module is called AFTER the existing empty-transcript return and BEFORE `this.emit('transcript', …)`; it never sees an empty text (the harness skips empties the same way).
- The existing log line `[DeepgramStreaming] Transcript event — isFinal=..., text="..."` stays byte-identical and keeps logging Deepgram's RAW text (the flight harness, `rule-sim.mjs` and future scans parse it); the repair adds its own `boundary repair:` line.
- Commits: the implementer does NOT run git commit in MAIN; each task ends by listing the exact changed paths, and the controller commits them with its own helper. (MAIN's index is shared with other sessions.) Also no `git add`, no `git stash`.
- Never read, print or copy .env or any key.
- Holdout runs (folder names containing `h40`) are never fixtures; the only holdout sequence in the tests is `fixtures.symptom` (h40c R22), the reproduction of the reported defect, as the design allows. No invented sequences beyond the synthetic edges the design lists (5001 ms gap, F1 not a prefix, interim-only stream) — the plan's edge tests reuse the symptom's strings and one real interim from the after7 log.

---

### Task 1: The pure module `deepgramBoundaryRepair.ts`, test-first against the design's fixtures

**Files:**
- Create: `electron/audio/deepgramBoundaryRepair.ts`
- Create (copy, not authored): `electron/audio/deepgramBoundaryRepair.fixtures.json` ← `SP\boundary-repair\fixtures-v3.json` (22,788 bytes, LF)
- Test: `electron/audio/deepgramBoundaryRepair.test.ts`

**Interfaces:**
- Consumes: nothing from the repo.
- Produces (Task 2 and the controller's `rule-sim.mjs --impl` rely on these exact names):
  ```ts
  export interface BoundaryRepairResult { text: string; restored: string[] | null; }
  export interface BoundaryRepair { onTranscript(text: string, isFinal: boolean, atMs: number): BoundaryRepairResult; }
  export function createBoundaryRepair(): BoundaryRepair;
  ```
  One call per NON-EMPTY Transcript event, in arrival order; `atMs` is the arrival time in ms (only finals read it). `text` in the result is what to emit: the input unchanged, or `restored.join(' ') + ' ' + input`. `restored` is the restored word(s) in the interim's own spelling, or null (the reference omits the key on interims; the port returns null — the texts are identical, and the harness reads only `.text`).

- [ ] **Step 1: Copy the fixture file, byte for byte**

PowerShell (the memory-approved way for the non-ASCII path):
```powershell
Copy-Item -LiteralPath "C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\boundary-repair\fixtures-v3.json" -Destination "C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\audio\deepgramBoundaryRepair.fixtures.json"
(Get-Item -LiteralPath "C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\audio\deepgramBoundaryRepair.fixtures.json").Length
```
Expected: `22788`. (Git Bash alternative: `cp` with the two POSIX paths, then `file <dest>` must say `JSON text data` with no `CRLF`.) Do not open it in an editor that would reformat it.

- [ ] **Step 2: Write the failing tests**

Create `MAIN\electron\audio\deepgramBoundaryRepair.test.ts` with exactly this content:

```ts
import { describe, it, expect } from 'vitest';
import { createBoundaryRepair } from './deepgramBoundaryRepair';
import fixtures from './deepgramBoundaryRepair.fixtures.json';

/**
 * The fixture file is a byte-for-byte copy of the design's fixtures-v3.json (2026-09-29): every
 * sequence was extracted VERBATIM from a non-holdout run log (the `run` field) as [interim I,
 * final F1, final F2] with atMs relative to I, and expectedF2 is what the reference rule-v3.mjs
 * emits for F2 — checked by the extractor to equal what it emitted inside the full stream. Only
 * `symptom` (flight h40c R22, the reported defect) comes from a holdout run, as the reproduction;
 * `seam` is a live seam-probe recording (S2Q07 play 3, the tolerant "RAC" -> "Rag" cut).
 * The synthetic edges at the end reuse the symptom's strings and one real interim from the logs.
 */
type Fixture = { run: string; cls: string; events: { text: string; isFinal: boolean; atMs: number }[]; expectedF2: string };

function lastFinal(f: Fixture): string {
    const r = createBoundaryRepair();
    let out = '';
    for (const e of f.events) {
        const res = r.onTranscript(e.text, e.isFinal, e.atMs);
        if (e.isFinal) out = res.text;
    }
    return out;
}
const lastRaw = (f: Fixture): string => f.events[f.events.length - 1].text;

describe('deepgramBoundaryRepair reproduces the reference (rule-v3.mjs) on the extracted fixtures', () => {
    it('the fixture file is the design\'s: 1 symptom, 1 seam, 15 positives that change F2, 28 negatives that do not', () => {
        expect(fixtures.positives).toHaveLength(15);
        expect(fixtures.negatives).toHaveLength(28);
        for (const f of [fixtures.symptom, fixtures.seam, ...fixtures.positives]) expect(f.expectedF2).not.toBe(lastRaw(f));
        for (const f of fixtures.negatives) expect(f.expectedF2).toBe(lastRaw(f));
    });

    it(`symptom — ${fixtures.symptom.run}: restores "hallucinations"`, () => {
        expect(lastFinal(fixtures.symptom)).toBe(fixtures.symptom.expectedF2);
    });

    it(`seam — ${fixtures.seam.run}: the tolerant cut ("RAC" re-spelled "Rag" at the cut) restores "service"`, () => {
        expect(lastFinal(fixtures.seam)).toBe(fixtures.seam.expectedF2);
    });

    describe('positives: every distinct v3 repair in the non-holdout logs', () => {
        fixtures.positives.forEach((f, i) => {
            it(`#${i + 1} ${f.run}: -> "${f.expectedF2.slice(0, 50)}"`, () => {
                expect(lastFinal(f)).toBe(f.expectedF2);
            });
        });
    });

    describe('negatives: cuts the rule leaves alone (NORMAL, the |T| == 1 tail whether re-heard or really lost, number-formatted evidence, tolerant re-cover, turn boundaries)', () => {
        fixtures.negatives.forEach((f, i) => {
            it(`#${i + 1} ${f.cls} ${f.run}: "${lastRaw(f).slice(0, 40)}" unchanged`, () => {
                expect(lastFinal(f)).toBe(lastRaw(f));
            });
        });
    });

    it('pins the documented residuals as NOT repaired: real losses in the |T| == 1 tail ("between", "scaling") and number-formatted evidence ("eighty" / "84%")', () => {
        const byF2 = (start: string): Fixture => {
            const f = fixtures.negatives.find((n) => lastRaw(n).startsWith(start));
            if (!f) throw new Error(`fixture missing: F2 starting "${start}"`);
            return f;
        };
        for (const f of [byF2('training and serving?'), byF2('for a model inference service on Kubernetes?'), byF2('by 84%,')]) {
            expect(lastFinal(f)).toBe(lastRaw(f));
        }
    });
});

describe('deepgramBoundaryRepair synthetic edges (the symptom\'s strings)', () => {
    const [I, F1, F2] = fixtures.symptom.events;                 // atMs 0 / 17 / 1564
    const play = (events: Fixture['events']): string => lastFinal({ run: 'synthetic', cls: 'EDGE', events, expectedF2: '' });

    it('the window is 5000 ms from F1\'s arrival, inclusive: 5000 restores, 5001 does not', () => {
        expect(play([I, F1, { ...F2, atMs: F1.atMs + 5000 }])).toBe(fixtures.symptom.expectedF2);
        expect(play([I, F1, { ...F2, atMs: F1.atMs + 5001 }])).toBe(F2.text);
    });

    it('a final that is not a prefix of its interim is no cut — only F1\'s LAST token may differ (the tolerant cut)', () => {
        expect(play([I, { ...F1, text: 'How do we cut' }, F2])).toBe(F2.text);
        expect(play([I, { ...F1, text: 'How do you cat' }, F2])).toBe(fixtures.symptom.expectedF2);
    });

    it('an interim-only stream passes through unchanged and leaves nothing to repair', () => {
        const r = createBoundaryRepair();
        expect(r.onTranscript('How do', false, 0)).toEqual({ text: 'How do', restored: null });
        expect(r.onTranscript(I.text, false, 500)).toEqual({ text: I.text, restored: null });
        expect(r.onTranscript(I.text, true, 1000)).toEqual({ text: I.text, restored: null });    // equal to its interim: no cut
        expect(r.onTranscript(F2.text, true, 2000)).toEqual({ text: F2.text, restored: null });
    });

    it('any final clears the remembered cut: only the NEXT final can be repaired', () => {
        expect(play([I, F1, { text: 'Okay.', isFinal: true, atMs: 500 }, F2])).toBe(F2.text);
    });

    it('an interim between F1 and F2 does not disturb the repair (after7 M13: the log has "as code without" at 07:38:26.576Z between the two finals)', () => {
        const m13 = fixtures.positives[2];                       // 2026-09-06T08-14-21-after7, "infrastructure"
        const [i, f1, f2] = m13.events;
        expect(m13.run).toBe('2026-09-06T08-14-21-after7');
        expect(play([i, f1, { text: 'as code without', isFinal: false, atMs: f1.atMs + 2 }, f2])).toBe(m13.expectedF2);
    });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: FAIL — the file cannot be collected: `Failed to load url ./deepgramBoundaryRepair` (the module does not exist yet); 0 tests run. If instead the JSON import fails to resolve, Step 1 was not done or landed under another name.

- [ ] **Step 4: Write the pass-through skeleton (today's behaviour) — the failing run that means something**

Create `MAIN\electron\audio\deepgramBoundaryRepair.ts` with the full header, constants, tokenisers and API, but a body that changes nothing:

```ts
/**
 * Puts back the word(s) Deepgram drops at a segment boundary.
 *
 * nova-3 (interim_results, endpointing 300, smart_format) sometimes finalizes a segment SHORT of
 * its own latest interim and starts the next segment after a word that then appears in no final;
 * the app joins finals verbatim, so the word is gone before any app logic sees it. Reproduced at
 * the seam on 2026-09-29 (scratchpad seam-probe.mjs, 4 clips x 5 plays straight to Deepgram, the
 * app's exact options): 6 of 20 plays lost a word. Flight h40c R22 is the symptom:
 *
 *   interim  "How do you cut hallucinations in a rag answer without just making"
 *   final    "How do you cut"
 *   final    "in a rag answer without just making it refuse?"
 *
 * The app answered "How do you cut in a rag answer without just making it refuse?" and all six
 * replays of that prompt answered about refusals.
 *
 * This is rule v3 of the design brief (scratchpad boundary-repair/DESIGN.md), a line-for-line port
 * of its reference rule-v3.mjs; the two must agree event for event (rule-sim.mjs --impl proves it).
 *
 *   CUT    a final F1 whose tokens equal the preceding interim I's first |F1| tokens (strict), or
 *          all but F1's last token (tolerant: Deepgram re-spells the word at the cut, "RAC" ->
 *          "Rag", in 5 of 5 seam plays of S2Q07), with I longer than F1. T = I's tokens after F1;
 *          Traw = the same words in I's own spelling.
 *   REPAIR on the NEXT final F2 only, within REPAIR_WINDOW_MS of F1, when F2 does not simply start
 *          with T[0] (the normal case, 527 in the logs: the word moved to the next segment): for
 *          k = 1 then 2 (k < |T|), if F2's first min(2, |T| - k) tokens EXACTLY equal T[k..], emit
 *          Traw[0..k) + ' ' + F2. Anything else, and every interim, passes through unchanged.
 *
 * Measured over every run log (rule-sim.mjs, 2026-09-29): non-holdout 25 repairs, 25 TRUE against
 * the scripted question, 0 FALSE; holdout 4 / 4 TRUE; on the seam recording 4 of the 6 lost words,
 * nothing else. v2's two wider branches were dropped after 4 FALSE repairs on holdout ("two" before
 * "to answer", "fee" before "feature", "four point" before "4.1%"), so two shapes stay unrepaired
 * on purpose: the |T| == 1 tail (F2 does not start with the interim's one remaining word — text
 * alone cannot tell a lost word from Deepgram re-hearing the same audio, "schedule" ->
 * "scheduled"), and resumption evidence that differs only by number formatting ("eighty" / "84%").
 *
 * Pure: no clock, no logging. DeepgramStreamingSTT creates one per live socket, feeds every
 * NON-EMPTY Transcript event with its arrival time, and logs each restore.
 */

/** The longest F1 -> F2 gap among the repaired losses was 4441 ms; the margin keeps a tail from being glued onto the next, unrelated utterance. */
const REPAIR_WINDOW_MS = 5000;
/** The largest skip observed: 1 loss of 2 words, 25 of 1 (non-holdout logs). */
const MAX_SKIPPED_WORDS = 2;
/** Resumption tokens that must match exactly: 2 — the evidence every observed loss provides — or 1 when the interim holds no more. */
const RESUME_MATCH_WORDS = 2;

/** Comparison tokens: thousands commas between digits removed ("10,000" -> "10000"), lowercase, [a-z0-9']+ runs — the evidence scans' normalisation. */
const stripThousands = (s: string): string => s.replace(/(\d),(\d)/g, '$1$2');
const tok = (s: string): string[] => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
/** The same tokens in the text's own spelling (not lowercased): index-aligned with tok() on the same text. */
const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];

export interface BoundaryRepairResult {
    /** What to emit: `text` as received, or the restored word(s) + ' ' + `text`. */
    text: string;
    /** The restored word(s) in the interim's own spelling, in order; null when nothing was restored. */
    restored: string[] | null;
}

export interface BoundaryRepair {
    /** One call per NON-EMPTY Transcript event, in arrival order; `atMs` is the arrival time (only finals read it). */
    onTranscript(text: string, isFinal: boolean, atMs: number): BoundaryRepairResult;
}

export function createBoundaryRepair(): BoundaryRepair {
    return {
        onTranscript(text, isFinal, atMs) {
            return { text, restored: null };
        },
    };
}
```

- [ ] **Step 5: Run the tests — the positives must fail, the negatives must pass**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: `Tests  20 failed | 32 passed (52)`. Failing: `symptom`, `seam`, the 15 positives, and three edges ("the window is 5000 ms …" — its first `expect` sees F2 unchanged; "a final that is not a prefix …" — its tolerant half; "an interim between F1 and F2 …"). Passing: the fixture-file check, all 28 negatives, the residuals, "interim-only stream", "any final clears". This is the calibration (rule 8): every check that decides something answers differently when the effect is absent. If a negative fails here, the fixture copy is wrong (Step 1) — do not touch the skeleton.

- [ ] **Step 6: Implement the rule — the port of `rule-v3.mjs`**

Replace `createBoundaryRepair` (only it changes; header, constants, tokenisers and interfaces stay as written):

```ts
export function createBoundaryRepair(): BoundaryRepair {
    let lastInterim: string | null = null;
    let cut: { T: string[]; Traw: string[]; atMs: number } | null = null;
    return {
        onTranscript(text, isFinal, atMs) {
            if (!isFinal) {
                lastInterim = text;
                return { text, restored: null };
            }
            let out = text;
            let restored: string[] | null = null;
            const remembered = cut;
            if (remembered && atMs - remembered.atMs <= REPAIR_WINDOW_MS) {
                const T = remembered.T, f = tok(text);
                if (f.length && f[0] !== T[0]) {
                    for (let k = 1; k <= MAX_SKIPPED_WORDS && k < T.length && !restored; k++) {
                        const m = Math.min(RESUME_MATCH_WORDS, T.length - k);
                        if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = remembered.Traw.slice(0, k);
                    }
                }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim) {
                const iw = tok(lastInterim), fw = tok(text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: rawTok(lastInterim).slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
```

Fidelity check against `rule-v3.mjs` before running: same `norm`/`tok`/`rawTok` regexes; `f[0] !== T[0]` guard; `k` from 1 to 2 with `k < T.length`, first match wins; `m = Math.min(2, T.length - k)` with `f.length >= m`; `Traw.slice(0, k)`; `cut = null` before the new-cut check; strict/tolerant exactly as the reference; `lastInterim = null` after every final. The only differences are names and `restored: null` on interims.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: `Tests  52 passed (52)`.

- [ ] **Step 8: Type-check both projects**

Run the two tsc commands from Global Constraints.
Expected: root — no output, exit 0. Electron — exactly the 6 baseline errors; none in `electron/audio/deepgramBoundaryRepair.ts`, its test, or the JSON import. (If tsc rejects the JSON default import, `esModuleInterop`/`resolveJsonModule` are both on in `electron/tsconfig.json` — check that the file name in the import matches Step 1 exactly.)

- [ ] **Step 9: Report — no commit**

Do not run git. Report the changed paths for the controller to commit:
- `electron/audio/deepgramBoundaryRepair.ts` (new)
- `electron/audio/deepgramBoundaryRepair.fixtures.json` (new, byte-for-byte copy of `SP\boundary-repair\fixtures-v3.json`, 22,788 bytes)
- `electron/audio/deepgramBoundaryRepair.test.ts` (new)

and quote the two test-run counts (Step 5: 20 failed / 32 passed; Step 7: 52 passed) and the tsc results.

---

### Task 2: Wire the repair into `DeepgramStreamingSTT` — one state per socket, repaired text emitted, raw text still logged

**Files:**
- Modify: `electron/audio/DeepgramStreamingSTT.ts` (import at lines 11–13; a per-socket const after line 198 `const stale = (): boolean => this.live !== live;`; the Transcript handler at lines 214–230)
- Test: `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`

**Interfaces:**
- Consumes (from Task 1): `import { createBoundaryRepair } from './deepgramBoundaryRepair';` — `createBoundaryRepair().onTranscript(text: string, isFinal: boolean, atMs: number): { text: string; restored: string[] | null }`; and the fixture file `./deepgramBoundaryRepair.fixtures.json` (its `seam` entry).
- Produces: the `'transcript'` event's `text` is the repaired text; a log line `[DeepgramStreaming] boundary repair: restored "<words>" before "<first 40 chars of the final as received>"` per restore. Event shape `{ text, isFinal, confidence }` and every other log line are unchanged; the repair state lives and dies with its socket.

- [ ] **Step 1: Write the failing adapter test**

Create `MAIN\electron\audio\DeepgramStreamingSTT.boundaryRepair.test.ts` (the multi-socket fake of `DeepgramStreamingSTT.staleSocket.test.ts`, with its `afterAll` restore):

```ts
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import fixtures from './deepgramBoundaryRepair.fixtures.json';

// The class requires '@deepgram/sdk' inside connect(). vi.mock() does not reach a CommonJS
// require() (see DeepgramStreamingSTT.socketSummary.test.ts for the evidence), so Node's own
// require cache is seeded with a fake whose listen.live() returns a NEW live object per call —
// a restart makes a second socket, and the repair state must not follow it there.
type Handler = (...a: any[]) => void;
interface FakeLive {
    handlers: Record<string, Handler[]>;
    on: (ev: string, cb: Handler) => void;
    send: (d: any) => void;
    keepAlive: () => void;
    requestClose: () => void;
    getReadyState: () => number;
    fire: (ev: string, ...args: any[]) => void;
}
const lives: FakeLive[] = [];
function makeLive(): FakeLive {
    const live: FakeLive = {
        handlers: {},
        on(ev, cb) { (this.handlers[ev] ??= []).push(cb); },
        send() { },
        keepAlive() { },
        requestClose() { },
        getReadyState: () => 1,
        fire(ev, ...args) { (this.handlers[ev] ?? []).forEach((h: Handler) => h(...args)); },
    };
    lives.push(live);
    return live;
}
const deepgramPath = require.resolve('@deepgram/sdk');
const priorDeepgramCacheEntry = require.cache[deepgramPath];
require.cache[deepgramPath] = {
    id: deepgramPath,
    filename: deepgramPath,
    loaded: true,
    exports: {
        createClient: () => ({ listen: { live: () => makeLive() } }),
        LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results', SpeechStarted: 'SpeechStarted', UtteranceEnd: 'UtteranceEnd' },
    },
    children: [],
    paths: [],
} as any;

import { DeepgramStreamingSTT } from './DeepgramStreamingSTT';

const results = (transcript: string, isFinal: boolean) => ({ is_final: isFinal, channel: { alternatives: [{ transcript, confidence: 0.9 }] } });

describe('DeepgramStreamingSTT boundary repair (the seam fixture: S2Q07 play 3, the tolerant "RAC" -> "Rag" cut)', () => {
    let log: string[];
    beforeEach(() => {
        lives.length = 0;
        log = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });

    it('emits the repaired final, logs the raw text plus one repair line, and a restarted socket starts with no remembered cut', () => {
        const [I, F1, F2] = fixtures.seam.events;                // atMs 0 / 990 / 4180
        const stt = new DeepgramStreamingSTT('key');
        const seen: { text: string; isFinal: boolean; confidence: number }[] = [];
        stt.on('transcript', (t: any) => seen.push(t));
        stt.start();
        lives[0].fire('open');

        // socket #1 remembers a cut; a sample-rate restart replaces it before the resumption arrives
        lives[0].fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        lives[0].fire('Results', results(F1.text, true));
        stt.setSampleRate(48000);                                // restartStream(): stop() + start() -> socket #2
        lives[1].fire('open');
        vi.advanceTimersByTime(F2.atMs - F1.atMs);               // 3190 ms: inside the window, but a fresh socket
        lives[1].fire('Results', results(F2.text, true));

        // the whole sequence on socket #2
        lives[1].fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        lives[1].fire('Results', results(F1.text, true));
        vi.advanceTimersByTime(F2.atMs - F1.atMs);
        lives[1].fire('Results', results(F2.text, true));
        lives[1].fire('Results', results('', false));            // empty: still not emitted
        stt.stop();

        expect(seen.map((t) => [t.text, t.isFinal])).toEqual([
            [I.text, false],
            [F1.text, true],
            [F2.text, true],                                     // socket #2's first final: nothing remembered
            [I.text, false],
            [F1.text, true],
            [fixtures.seam.expectedF2, true],                    // 'service over 10,000,000 documents, it has to support document updates'
        ]);
        expect(seen.every((t) => t.confidence === 0.9)).toBe(true);
        expect(log.filter((l) => l.includes('boundary repair:'))).toEqual([
            '[DeepgramStreaming] boundary repair: restored "service" before "over 10,000,000 documents, it has to sup"',
        ]);
        // The event line the harness and the offline scans parse still carries Deepgram's RAW text.
        expect(log.filter((l) => l === `[DeepgramStreaming] Transcript event — isFinal=true, text="${F2.text}"`)).toHaveLength(2);
        expect(log.some((l) => l.includes(`text="${fixtures.seam.expectedF2}"`))).toBe(false);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`
Expected: FAIL at the first `expect`: the sixth emitted entry is `'over 10,000,000 documents, it has to support document updates'` (no `service `). (The `boundary repair:` filter would also be `[]` — the run stops at the first failed assertion.)

- [ ] **Step 3: Wire the module in — three edits to `DeepgramStreamingSTT.ts`**

(a) Import. After line 13 `import { keytermsFor } from './deepgramKeyterms';` add:

```ts
import { createBoundaryRepair } from './deepgramBoundaryRepair';
```

(b) Per-socket state. After line 198 `            const stale = (): boolean => this.live !== live;` add:

```ts
            // The boundary repair belongs to THIS socket, like the handlers: a restart's new socket
            // starts with no remembered cut, so nothing is ever repaired across a reconnect.
            const boundaryRepair = createBoundaryRepair();
```

(c) The Transcript handler. Replace lines 215–230 — this block:

```ts
                live.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                    try {
                        const alt = data.channel?.alternatives?.[0];
                        const transcript = alt?.transcript;
                        const isFinal = data.is_final ?? false;
                        console.log(`[DeepgramStreaming] Transcript event — isFinal=${isFinal}, text="${transcript ?? '(empty)'}"`);
                        if (!transcript) return;
                        this.emit('transcript', {
                            text: transcript,
                            isFinal,
                            confidence: alt?.confidence ?? 1.0,
                        });
                    } catch (err) {
                        console.error('[DeepgramStreaming] Parse error:', err);
                    }
                });
```

with:

```ts
                live.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                    try {
                        const alt = data.channel?.alternatives?.[0];
                        const transcript = alt?.transcript;
                        const isFinal = data.is_final ?? false;
                        console.log(`[DeepgramStreaming] Transcript event — isFinal=${isFinal}, text="${transcript ?? '(empty)'}"`);
                        if (!transcript) return;
                        // Deepgram sometimes finalizes short of its own interim and resumes one word
                        // later; the word is in no final. Measured 2026-09-29 (25 losses in the
                        // non-holdout logs, 6 of 20 seam plays); the rule lives in deepgramBoundaryRepair.
                        const repaired = boundaryRepair.onTranscript(transcript, isFinal, Date.now());
                        if (repaired.restored) {
                            console.log(`[DeepgramStreaming] boundary repair: restored "${repaired.restored.join(' ')}" before "${transcript.slice(0, 40)}"`);
                        }
                        this.emit('transcript', {
                            text: repaired.text,
                            isFinal,
                            confidence: alt?.confidence ?? 1.0,
                        });
                    } catch (err) {
                        console.error('[DeepgramStreaming] Parse error:', err);
                    }
                });
```

Nothing else in the file changes: the `Transcript event` line is byte-identical and logs the raw text, `stale()` handling, VAD events, flush, keepalive and the Close summary are untouched. Both Deepgram instances (interviewer and candidate mic) get a repair per socket through `connect()`.

- [ ] **Step 4: Run the adapter test to verify it passes**

Run: `TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`
Expected: `Tests  1 passed (1)`.

- [ ] **Step 5: Prove the per-socket assertion can fail (rule 8), then revert**

Temporarily hoist the state: delete the `const boundaryRepair = createBoundaryRepair();` line from `connect()` and add `private boundaryRepair = createBoundaryRepair();` to the class fields (after line 48 `private sockNotOpenWrites = 0;`), changing the handler's call to `this.boundaryRepair.onTranscript(...)`. Run: `TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`
Expected: FAIL — the third emitted entry becomes `'service over 10,000,000 documents, it has to support document updates'` (socket #2 repaired with socket #1's cut) and the repair-line filter has 2 entries. Revert both edits exactly (Step 3(b) and the `boundaryRepair.onTranscript` call), run again → `1 passed`.

- [ ] **Step 6: Run the neighbours — nothing else moved**

Run: `TEST electron/audio/` (the whole folder: the four `DeepgramStreamingSTT.*.test.ts`, the module test, `deepgramKeyterms`, `GeminiLiveRouter`, `RestSTT`, `SttChannel`, `energyVad`).
Expected: every file passes; in particular `DeepgramStreamingSTT.socketSummary` 2, `DeepgramStreamingSTT.staleSocket` 6 (its "late final transcript from the replaced socket" test still sees `{ text: 'tail of the last utterance', isFinal: true, confidence: 0.9 }` — that socket's own, empty repair state changes nothing), `DeepgramStreamingSTT.vadEvents` 1, `deepgramBoundaryRepair` 52, `DeepgramStreamingSTT.boundaryRepair` 1. A failure in a file this change does not touch is reported, not fixed.

- [ ] **Step 7: Type-check both projects**

Run the two tsc commands from Global Constraints.
Expected: root — no output, exit 0. Electron — exactly the 6 baseline errors; none in `DeepgramStreamingSTT.ts`, the module, or either test.

- [ ] **Step 8: Report — no commit**

Do not run git. Report the changed paths for the controller to commit:
- `electron/audio/DeepgramStreamingSTT.ts` (modified: 1 import, 1 per-socket const in `connect()`, the Transcript handler)
- `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` (new)

and quote the Step 2 failure, the Step 5 failure-and-revert, the Step 4/6 counts and the tsc results. State what the tests did NOT exercise: a real socket, the built `dist-electron` output (the harness contract `createBoundaryRepair` / `onTranscript` / `.text` is only exercised by the controller's replay), and the mic instance (same code path, never fired in a test).

---

## Controller verification (not a task)

Everything below is the controller's, after both tasks are committed; none of it is an implementer step.

1. **Offline replay of the BUILT module** (design §Verification 2). Build MAIN (`cmd /c "npm run build:electron -- --force"` from MAIN; verify `dist-electron/electron/audio/deepgramBoundaryRepair.js` exists with a fresh timestamp and exports `createBoundaryRepair` (CJS), and that no concurrent `.ts` edit was captured — ListAgents + mtimes before and after). Then `node SP\boundary-repair\rule-sim.mjs --impl "<MAIN>\dist-electron\electron\audio\deepgramBoundaryRepair.js" --holdout` must print exactly `rule-v3.out.txt`: `non-holdout repairs: {"TRUE":25,"FALSE":0,"UNKNOWN":0}`, `holdout repairs (validation only): {"TRUE":4,"FALSE":0,"UNKNOWN":0}`, the same 29 restored/before lines. The seam recording (`seam-probe/events-2026-09-29T13-36-36-838Z.jsonl`, via `seam-analyze.mjs` or the same loop) must show the reference's 4 repairs and no other. Any difference = the port is not the reference; stop.
2. **Live at the Deepgram seam** (design §Verification 3): a fresh seam probe on OTHER non-holdout clips (a new recording — fresh data for v3), the built module applied, before/after against the script. The key is read in-process from MAIN's `.env` and never printed.
3. **Live through the app** (design §Verification 4): a scenario50 S1+S2 hour on the rebuilt MAIN via a Windows scheduled task (never from a Claude session — the app would read a shadow credentials store), finishing well before the 05:00 cue smoke; every `boundary repair:` line read against the scripted question playing, and the dispatched `question=` of each repaired item.
4. **Commit** both tasks' paths with the controller's helper (private index + compare-and-swap); pass record per the user's rule if a live pass is measured.
5. **Residual risks the tests do not reach** (from the design): the |T| == 1 tail stays unrepaired (half the losses; per-word timestamps are the follow-up), as does number-formatted evidence; holdout is no longer an independent validation of v3 (its failures chose what v3 removed) — the fresh seam recording in item 2 is the new evidence.

## Spec coverage (self-review)

| Design v3 requirement | Where |
|---|---|
| Latest interim kept, cleared after every final | Task 1 Step 6 (`lastInterim = null`); edge "interim-only stream" |
| CUT strict or tolerant (|F1| >= 2 for tolerant, interim longer) | Task 1 Step 6; `seam` fixture; edge "only F1's LAST token may differ" |
| T / Traw remembered with F1's arrival; any final clears the cut | Task 1 Step 6 (`cut = null`); edge "any final clears" |
| Window 5000 ms from F1, `f[0] !== T[0]`, k = 1..2 (k < |T|), m = min(2, |T|-k), first k wins | Task 1 Step 6; positives (k = 2 in #1 "for a"; m = 1 in `seam`, #7, #12 …); edge 5000/5001 |
| Emit `Traw[0..k).join(' ') + ' ' + F2`; log line with the first 40 chars of F2 | Task 1 Step 6; Task 2 Step 3(c); adapter test asserts the exact line |
| Normalisation (thousands commas, lowercase, `[a-z0-9']+`); Traw same regex un-lowercased on the comma-stripped text | `stripThousands` / `tok` / `rawTok` |
| Constants with v3 provenance | `REPAIR_WINDOW_MS`, `MAX_SKIPPED_WORDS`, `RESUME_MATCH_WORDS` comments |
| Residuals pinned as NOT repaired (|T| == 1 real losses, number formatting) | Task 1 residuals test + 28 negatives |
| Fixtures verbatim from `fixtures-v3.json`; 15 positives; listed negatives; seam; R22 symptom; 5001 ms; F1 not a prefix; interim-only | Task 1 Steps 1–2 |
| Per-socket state created where `connect()` wires the handlers; reconnect starts fresh | Task 2 Step 3(b); adapter test + Step 5 calibration |
| Called after the empty return, before emit; raw text still logged | Task 2 Step 3(c); adapter test (empty event, raw-line assertions) |
| Harness contract for `rule-sim.mjs --impl` | `createBoundaryRepair` / `onTranscript` / `.text`; controller item 1 |
| Both Deepgram instances repaired | per-socket const in the shared `connect()` |
