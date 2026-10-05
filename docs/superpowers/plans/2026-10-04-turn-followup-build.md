# Turn-based follow-up context (EARLIER QUESTION block) — build plan

> **Revision log**
>
> - **2026-10-04 15:56 TST** (`date`: `Sun Oct  4 15:56:16 TST 2026`) — revised in place per `PLAN-REVIEW.md` (Opus, APPROVE WITH FIXES: C1, I1–I7, 12 Minors). The plan was written at 15:36 against the Temp scratchpad; MAIN is at 89c8f53.
>   - **C1 applied:** every working path → `L = C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp` (`SP` = L, `F` = `L\followup-turn`; `TMP` = `L\eq-tmp`, throwaway). The parity fixtures are read from `L\followup-turn\R\turn-parity-*.json` (already there; never committed or printed). The controller has ALREADY re-saved `L\commit-main-paths.ps1` with a UTF-8 BOM (bytes EF BB BF confirmed) and proven it parses (0 errors); Task 9 Step 3 re-checks the BOM before the call. A missing fixture dir is a FAIL in every controller gate (`parity-dist.mjs`, Task 8 Step 2's "skipped = FAIL" rule); only the committed vitest test may skip. The smoke launcher lives under the non-ASCII path and its guard chain runs from THAT location.
>   - **I1:** the worktree is created from MAIN HEAD **89c8f53** (= `BASE`), not 800d6a5; Task 9's precondition is the diff over the landed paths only (empty today: those paths did not change between 800d6a5 and 89c8f53, checked); the status check lists every landed path including `turnDispatch.test.ts` and the harness files.
>   - **I2:** `commit-main-paths.ps1` is invoked in-process with `-Paths @('…', '…')`, never through a nested `powershell -File` (which binds one string).
>   - **I3:** Task 7 also changes the two existing 2-argument `turnDispatchInput` calls (`turnDispatch.test.ts:56`, `:76`) to pass `null`; the parameter stays required.
>   - **I4:** Task 5 gets a characterization test pinning the literal flag-off message for three shapes (`{}`, `{VERBAL, TEMPORAL}`, `{VERBAL, liveTexts}`), green on the UNMODIFIED file in Step 2 and again after Step 3; Task 6's flag-unset test pins the first eight `generateStream` arguments against the pre-change shape.
>   - **I5:** `interviewerLinesBefore` drops empty texts, exactly as the replay's `interviewerLines` (`gate-report-turn.mjs:128–132`); it is checked against the replay's derivation on the captured prompts of the three hours at source level (Task 3, env-gated, keys/counts/hashes only) and at dist level inside `parity-dist.mjs` (Task 9, missing prompts = FAIL); the smoke's captured prompts get a private hash check (Task 10 Step 6: strip → rebuild with the reference → re-insert, `OK`/sha12 only).
>   - **I6:** the spec's quick follow-up is ADDED to the smoke (Task 10): the invented clip `WHY` = "Why that one?" (the spec's own §3.6 sentence; 3 words, ~1.3 s of audio — the plain "Why?" at ~0.5 s is a weaker STT target and is not used) played 30 s after S1Q06F; expected `gate=parent-in-prompt cue=short chars=0 turn=<id>`; a `pinned question` line is REQUIRED for it and `NOT EXERCISED` is never a pass (spec §6: the 4-word `isFragment` drop at main.ts:2089 applies to Live-sourced claims; the whisper-sourced turn path has no such drop, which is what the smoke now shows or fails to show). The clip is rendered from the invented text with the roster builder's SAPI recipe into `F\smoke\clips\`, outside the roster folder.
>   - **I7:** both type-check gates call MAIN's compiler directly (`node "<MAIN>\node_modules\typescript\bin\tsc"`), never `npx`; Setup Step 3 FAILS unless the electron baseline is exactly the six errors measured at 89c8f53 today: `audio/GeminiLiveRouter.ts(125,44)`, `ipcHandlers.ts(3436,18)`, `(3436,38)`, `(3439,31)`, `knowledge/KnowledgeOrchestrator.ts(349,35)`, `(351,25)`.
>   - **Minors applied:** m1 (build → write → ONE log line; a throwing write logs `gate=error` only), m2 (flag off returns before anything is read, built, logged or written), m3 (documented, not a new diag field: on the non-override path the framing is decided by `classifyIntent` AFTER the block is logged, so the engine cannot name it there; STATES.md, the checker's notes and the smoke/flight records say `chars` is "built", never "inserted"), m4 (the two tracked files the suite rewrites are checked out; `node_modules` is deleted only if it is not a reparse point), m5 (578), m6 (the launcher logs `dirty-lines=`; no app or `Natively-*` task may be running before the rebuild), m7 (`process.exitCode` asserted in code), m8 (mutants named for Tasks 4 and 7; the three `main.ts` lines are proven only by the smoke's `turn=<id>`; the "transcript not changed" test is marked as passing before the change too), m9 (the `reset()` anchor), m10 (one hedge-leg test: every `generateContentStream` call of one answer carries the same `contents`, block included), m11 (`NATIVELY_FOLLOWUP_PARENT` cleared in `beforeEach`), m12 (spec committed in 0536581; HEAD 89c8f53; the worktree and branch are KEPT until the flight's result note lands, then removed — stated in Task 9 Step 7).
>   - **Minors rejected:** none.
>   - **Added Task 7b** (the flight harness's twin-arm option, `PREREGISTER-flight-eq.md` §7 b4, ruling §11.1): `electron/test/golden/earlierQuestionArm.mjs` (`splitEarlierQuestion`, `withEarlierQuestion`) + `earlierQuestionArm.test.ts` (invented round trips, four refusals, and the 21 gated fixture turns: `strip(userB) === userA`, re-insert `=== userB`, `userA` refused — checked today on all 21: holds) + `--no-block` in `interview60.answers.mjs` (needs `--captured` and `--tag`, exclusive with `--cues/--no-cues`, REFUSES exit 2 on a prompt without one block immediately before `INTERVIEWER JUST SAID:`, never prints a prompt). Lands in Task 9 with the rest; its CLI refusal is exercised in Task 9 Step 5b, its strip on the smoke's capture in Task 10 Step 6. The flight-side arm rows (`captured-no-block-high` r1–r5, `--only <G>`) are the flight registration's own harness edit (PREREGISTER §2), not this plan's.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, behind `NATIVELY_EARLIER_QUESTION` (default OFF), the one-line "EARLIER QUESTION" context block whose offline replay PASSED (gain +19 on 40 pairs, 0 new wrong), byte-equivalent to the replay's reference implementation, and prove it live once on the built app.

**Architecture:** A pure module (`electron/llm/earlierQuestion.ts` + its gate `earlierQuestionGate.ts`) ports the reference `earlierQuestion.ref.mjs` function for function; `SessionTracker` holds the 3-deep question ledger; `IntelligenceEngine.runWhatShouldISay` builds the block from the ledger, logs one diag line, writes the ledger (same tick, no await between), and hands the block to `WhatToAnswerLLM.generateStream` as its own argument, where it is pushed as the last context part before `INTERVIEWER JUST SAID:` on the verbal path only; `main.ts` captures the turn machine's id on the `DetectionInput` at dispatch so only the auto turn path gets a block. Flag off = today's bytes and no ledger write.

**Tech Stack:** TypeScript (Electron main process, CommonJS), vitest 2.1.9 (MAIN's binary), esbuild via `scripts/build-electron.js`, node ESM scripts in the scratchpad for the dist-level parity and the smoke, a Windows scheduled task for the live smoke.

**Spec:** MAIN `docs/superpowers/specs/2026-10-03-turn-based-followup-context-design.md` (revision 4, approved; committed in MAIN at 0536581). Reference implementation and its tests: `<F>\earlierQuestion.ref.mjs`, `<F>\earlierQuestion.ref.test.mjs` (47/47). Replay result: `<F>\R\RESULT-front-back.txt` (DECISION: PASS). Pre-registration build gate: `<F>\PREREGISTER-turn-followup.md` §9 (c1, c2, c3).

## Paths used throughout

```
MAIN = C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant        (branch fix/coding-style-suffix-all-gemini, HEAD 89c8f53 at revision time)
BASE = 89c8f53                                                             (MAIN HEAD the worktree is created from; record the actual sha in Setup Step 1 if it moved)
WT   = <MAIN>\.claude\worktrees\eq-build                                   (the implementation worktree, branch build/earlier-question, created from BASE)
SP   = C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp                    (L, the durable lab folder — NEVER the Temp scratchpad, which Storage Sense deletes)
F    = <SP>\followup-turn                                                  (the replay folder: reference, tests, R\ fixtures; plan\, build\, smoke\ are written here)
TMP  = <SP>\eq-tmp                                                         (an empty folder: the cwd for every single-file vitest run; throwaway)
RUNS = <MAIN>\electron\test\golden\interview60.runs                        (gitignored captured runs: the three hours' interview60.prompts.json, the smoke's logs)
```

Evidence files (the tsc baseline, the full-suite output, LANDED.txt, parity outputs) go under `<F>\build\`; nothing of this plan is written under `%TEMP%`.

Test command (one file; PowerShell; always from `<TMP>` so cwd-relative writes never touch a live log):

```
Set-Location "<TMP>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/llm/earlierQuestion.test.ts --root "<WT>"
```

The filter is root-relative. `<WT>` sits under `<MAIN>\.claude\`, so `node_modules` resolves by walking up into MAIN; nothing is installed in the worktree. Vitest leaves `<WT>\node_modules\.vite\` behind — delete it in Task 8 before the review.

Type-check gates (both; MAIN's compiler called directly — `npx` in a worktree with no `node_modules` may fetch the unrelated `tsc` package, whose stub prints no `error TS` line and would make an empty baseline that every later gate passes; review I7):

```
node "<MAIN>\node_modules\typescript\bin\tsc" --noEmit -p "<WT>\tsconfig.json"
node "<MAIN>\node_modules\typescript\bin\tsc" --noEmit -p "<WT>\electron\tsconfig.json"
```

The second carries exactly six pre-existing errors, measured on MAIN at 89c8f53 on 2026-10-04: `electron/audio/GeminiLiveRouter.ts(125,44)`, `electron/ipcHandlers.ts(3436,18)`, `electron/ipcHandlers.ts(3436,38)`, `electron/ipcHandlers.ts(3439,31)`, `electron/knowledge/KnowledgeOrchestrator.ts(349,35)`, `electron/knowledge/KnowledgeOrchestrator.ts(351,25)`. Setup Step 3 records them and FAILS on any other list. "Clean" = the same six, no error in any file this plan touches.

## Global Constraints

- TDD per task: the failing test is written and watched failing before the code; every test is calibrated (a mutant or a known-bad input must fail it) where the task says so.
- MAIN's working tree is shared with other sessions: implementation happens ONLY in `<WT>` (a git worktree off MAIN's branch at `<BASE>` = 89c8f53), never in MAIN's working tree. The implementer's commits land on `build/earlier-question` in `<WT>`.
- Commits to MAIN's branch happen only through the controller's shared-index recipe `<SP>\commit-main-paths.ps1` (private `GIT_INDEX_FILE`, commit-tree, compare-and-swap), invoked IN-PROCESS from a PowerShell session not isolated to a worktree with `-Paths @(...)` (a nested `powershell -File` binds `-Paths` to ONE string and stops at `PRE FAIL: missing`), AFTER the Opus review (Task 9); never `git commit` in MAIN.
- Type-check gates: root `tsc` AND `tsc -p electron/tsconfig.json`, both through `node "<MAIN>\node_modules\typescript\bin\tsc"` (the electron list must equal the six-error baseline exactly).
- Tests run with MAIN's vitest from a temp cwd: `node <MAIN>\node_modules\vitest\vitest.mjs run <file> --root <WT>` (see above). The full suite (Task 8) runs with cwd = `<WT>` root (two files read fixtures relative to the cwd; see the vitest-temp-cwd note).
- The built dist must be rebuilt (`node scripts/build-electron.js --force`, cwd = MAIN, guarded) and a marker checked in `dist-electron\electron\llm\earlierQuestion.js`, `IntelligenceEngine.js` and `main.js` before any live run (Task 9).
- Never print captured prompts: `<F>\R\turn-parity-*.json`, `<F>\R\*-gated-turn.json`, `<RUNS>\*\interview60.prompts.json` and `verbal-prompts.log` carry the user's profile. They are read at run time only, never committed, and a failing check prints keys, cue names, lengths and hashes only. The committed vitest tests SKIP when the local files are absent; every controller gate that reads them (`parity-dist.mjs`, Task 8 Step 2, Task 10 Step 6) FAILS when they are absent — a skip is never a pass there.
- Flag off is literally today's path: `runWhatShouldISay` returns from the earlier-question step before anything is read, built, logged or written (m2), and the message bytes are pinned by a characterization test green before and after the change (I4).
- Byte equivalence: the app's `buildEarlierQuestion`, `recordAsked`, `clip`, `formatBlock`, `LABEL` and the gate reproduce the reference's outputs byte for byte on the same inputs (Task 3's parity test over 126 fixture entries + Task 9's dist-level script).
- Spec constants, verbatim: `LEDGER_DEPTH = 3`; `PARENT_MAX_CHARS = 450`; clip = head 150 + `…` (U+2026) + tail 299; `LABEL` = `EARLIER QUESTION (asked earlier; context only, do not answer it again; answer only the question under INTERVIEWER JUST SAID):` (125 chars); block = `${LABEL}\n- ${clip(parent)}` (exactly two lines, ONE parent line); placement = last context part before `INTERVIEWER JUST SAID:\n`; verbal framing only (`intentResult?.intent !== 'coding'`); the block is built only when `turnId != null`; a supersede (`replaceAnswer === true`) returns `''`; parent = the newest ledger entry; no text dedup, no age cap, no grandparent.
- Flag `NATIVELY_EARLIER_QUESTION`: unset / `''` / `'0'` off, `'1'` on, anything else throws at startup (the app refuses to start); `'1'` together with `NATIVELY_FOLLOWUP_PARENT=1` refuses too. Default OFF in this plan; turning it ON is a separate decision after the flight. `withParentExchange` and `NATIVELY_FOLLOWUP_PARENT` are NOT removed here (the spec removes them in the commit that makes this default).
- Diag line (flag on only, exactly ONE per `runWhatShouldISay` call, logged AFTER the ledger write so a throwing write never leaves a `gate=block` line in front of its `gate=error`), exact shape: `[IntelligenceEngine] earlier question: gate=<block|off|no-question|no-turn|supersede|no-cue|no-parent|parent-in-pinned|parent-in-prompt|error> cue=<cue> chars=<n> turn=<id|none> ms=<n>` — never the question or parent text.
- Every change traces to the spec; nothing else in the touched files is reformatted or "improved" (surgical changes). Commit messages end with the session's attribution line.
- The live smoke (Task 10) is launched by the controller through a Windows scheduled task (or the user's terminal), never from a Claude session (shadow AppData), on a quiet machine (system audio hears everything), with the user logged on.

## Review Focus

Inputs the spec implies but no reference test exercises, most likely to bite first; each has its test pinned to the owning task below.

1. **Turn id 0.** `interviewerTurn.ts` starts ids at 1 today (`let nextTurnId = 1`), but any `if (turnId)` instead of `turnId != null` would silently turn a future id 0 into "chip path, no block". Expected: 0 is a valid turn (a block is built; remove-and-push works). → Task 2 test "turnId 0".
2. **A parent whose text holds a line break** (the whole-turn dispatch joins STT finals; a joined text can carry `\n`). Expected: the ledger stores it as dispatched, the prompt-presence check still finds it (overlap, not only containment), and the block line stays ONE line (clip collapses whitespace). → Task 2 test "parent with a line break".
3. **Overlapping calls.** Two `runWhatShouldISay` calls in flight at once (a supersede racing a chip click). Expected: the ledger order is the call order and the second call's block sees the first call's write, because block-then-write is synchronous with no `await` between. → Task 6 test "two calls started without awaiting".
4. **The diag line must never carry text.** A flight log is read by scripts and quoted in notes; the parent is the user's interview content. Expected: the `earlier question:` line contains no question or parent text. → Task 6 test "the diag line carries counts, never text".
5. **A prepared transcript with only the pinned line, or with `[ME]`/`[ASSISTANT]` lines between interviewer lines.** Expected: `interviewerLinesBefore` returns `[]` for a lone pinned line, strips the `[INTERVIEWER]: ` prefix, ignores other roles and blank lines, and drops exactly the LAST interviewer line (the pin). → Task 2 test "interviewerLinesBefore".

Not fixed by design (parity with the reference): `clip` slices UTF-16 code units, so a surrogate pair at offset 150 or at the tail cut would split; the reference does the same and byte equivalence wins. Named here so a reviewer does not "fix" it.

---

## Setup (controller, before Task 1)

- [ ] **Step 1: Create the worktree from MAIN's branch tip**

Run from a shell whose cwd is NOT a worktree-isolated Claude session (the controller's own terminal, or a session cwd'd at MAIN):

```
git -C "<MAIN>" rev-parse --short HEAD          # expect 89c8f53 (or later: record the actual sha as BASE and use it below)
git -C "<MAIN>" worktree add "<MAIN>\.claude\worktrees\eq-build" -b build/earlier-question <BASE>
```

`.claude/` is gitignored, so the worktree folder never shows in MAIN's status. The worktree is based on the CURRENT tip, not 800d6a5: 89c8f53 added 153 files under `electron/test/golden/passes/` and the landed paths of this plan are byte-identical between the two (checked), so a worktree off 800d6a5 would only buy a pointless rebase in Task 9 (review I1).

- [ ] **Step 2: Make the vitest cwd and the evidence folders**

```
New-Item -ItemType Directory -Force "<SP>\eq-tmp", "<F>\build", "<F>\smoke" | Out-Null
```

- [ ] **Step 3: Record the type-check baseline in the untouched worktree**

```
Set-Location "<WT>"
node "<MAIN>\node_modules\typescript\bin\tsc" --noEmit -p tsconfig.json
node "<MAIN>\node_modules\typescript\bin\tsc" --noEmit -p electron\tsconfig.json | Select-String "error TS" | ForEach-Object { ($_.Line -split ': error')[0] } | Out-File "<F>\build\tsc-electron-baseline.txt" -Encoding utf8
Get-Content "<F>\build\tsc-electron-baseline.txt"
```

Expected: root tsc prints nothing; the baseline file holds EXACTLY these six lines (the list measured on MAIN at 89c8f53, 2026-10-04) and nothing else:

```
electron/audio/GeminiLiveRouter.ts(125,44)
electron/ipcHandlers.ts(3436,18)
electron/ipcHandlers.ts(3436,38)
electron/ipcHandlers.ts(3439,31)
electron/knowledge/KnowledgeOrchestrator.ts(349,35)
electron/knowledge/KnowledgeOrchestrator.ts(351,25)
```

Any other list (0 lines = the compiler did not run; a different line = BASE moved past a type change) is a FAIL of this step: stop and report before any edit. Every later gate compares its list against this file (`Compare-Object` must print nothing).

- [ ] **Step 4: Prove the reference still passes (the parity target)**

```
Set-Location "<F>"; node earlierQuestion.ref.test.mjs
```

Expected last line: `EARLIER-QUESTION REF TESTS: 47/47 passed`.

---

### Task 1: The gate — port design 2's cue set to TypeScript

**Files:**
- Create: `electron/llm/earlierQuestionGate.ts`
- Test: `electron/llm/earlierQuestionGate.test.ts`

**Interfaces:**
- Consumes: nothing from this plan.
- Produces: `export type Cue = 'callback' | 'reference' | 'leading' | 'constraint' | 'pronoun' | 'short' | 'none'`; `export function gate(question: string | null | undefined): { fires: boolean; cue: Cue }`; `export function firstSegment(q: string): string`; `export function wordsOf(q: string): number`. Task 2 imports `gate` and `Cue`.

The regexes below are copied verbatim from `<SP>\followup-context\earlierQuestions.ref.mjs` (sha256 0459f578…), which the reference imports unchanged. Do not "clean them up": a changed character changes which questions get a block, and the parity test (Task 3) will catch it, but only after the fact.

- [ ] **Step 1: Write the failing test**

`electron/llm/earlierQuestionGate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { gate, firstSegment, wordsOf } from './earlierQuestionGate';
import { SCENARIO50 } from '../test/golden/scenario50.questions.mjs';

// Design 2's calibration set (spec §3.2: 19 must-fire / 10 must-not), re-run on the TS port.
// Roster sentences come from the committed scenario50 roster (never holdout40); the rest are invented.
const rosterQ = (id: string): string => {
    const item = (SCENARIO50 as { id: string; q: string }[]).find((i) => i.id === id);
    if (!item) throw new Error(`scenario50 id ${id} missing`);
    return item.q;
};

const SHOULD_FIRE: [string, string][] = [
    ['leading', 'Now without a cache, how would you meet the same latency?'], ['pronoun', rosterQ('S1Q06F')], ['pronoun', rosterQ('S2Q06F')], ['pronoun', rosterQ('S2Q08F')],
    ['constraint', rosterQ('S1Q04F')], ['reference', rosterQ('S2Q09F')], ['leading', rosterQ('S3Q04F')], ['leading', rosterQ('S4Q09F')], ['short', 'Why?'],
    ['leading', 'And in production?'], ['pronoun', 'Does that scale?'], ['leading', 'What about Redis instead?'], ['leading', 'Okay, and if it fails?'],
    ['callback', 'Going back to the micro-batcher, how would you shard it?'], ['callback', 'You mentioned idempotency earlier. How do you enforce it?'],
    ['pronoun', 'Would that still hold under a network partition?'], ['leading', 'Same question, but for a write-heavy workload.'],
    ['pronoun', 'How would you keep the same latency budget with twice the traffic?'], ['leading', 'And what if it has to run on a single core?'],
];
const SHOULD_NOT_FIRE: string[] = [
    'Explain the CAP theorem.', 'What is a Kubernetes readiness probe?', 'In this scenario, what would you monitor first?', 'Design a URL shortener that handles a billion requests a day.',
    'Tell me about a time you disagreed with a manager.', 'Given an array of integers, return the indices of two numbers that add up to a target.', 'How would you ensure that a nightly job never runs twice?',
    'Walk me through how you would debug a memory leak in a Python service.', 'Design the next version of the churn platform, it has to support nightly scoring for 400,000 customers.', rosterQ('S4Q04F'),
];

describe('earlierQuestionGate — design 2 cue set, ported byte for byte', () => {
    it('19 must-fire sentences fire with their cue', () => {
        for (const [cue, q] of SHOULD_FIRE) expect({ q: q.slice(0, 40), ...gate(q) }).toEqual({ q: q.slice(0, 40), fires: true, cue });
    });
    it('10 must-not sentences stay silent', () => {
        for (const q of SHOULD_NOT_FIRE) expect({ q: q.slice(0, 40), ...gate(q) }).toEqual({ q: q.slice(0, 40), fires: false, cue: 'none' });
    });
    it('empty, blank, null and undefined never fire', () => {
        for (const q of ['', '   ', null, undefined]) expect(gate(q as any)).toEqual({ fires: false, cue: 'none' });
    });
    it('a leading interjection is stripped before the cue is read ("Okay, and if it fails?" is leading, not pronoun)', () => {
        expect(gate('Okay, and if it fails?').cue).toBe('leading');
        expect(gate('Yeah. So, what about Redis instead?').cue).toBe('leading');
    });
    it('"that" after a noun is a relative clause, not a pronoun ("a batch that fails" stays silent)', () => {
        expect(gate('How would you retry a batch that fails halfway?').fires).toBe(false);
    });
    it('the constraint cue is read before the pronoun cue, and only on a short question (over 25 words the question states its own constraint)', () => {
        expect(gate('How would you shard it while preserving the ordering guarantee?').cue).toBe('constraint');
        expect(gate('How would you shard the store while preserving the ordering guarantee?').cue).toBe('constraint');
        const long = 'How would you shard the telemetry store across twelve regions with independent failure domains and still keep every single tenant fully local while preserving the ordering guarantee?';
        expect(wordsOf(long)).toBe(27);
        expect(gate(long).cue).toBe('none');
    });
    it('firstSegment stops at the first . : ; ? ! , or em dash', () => {
        expect(firstSegment('Does that scale, and at what cost?')).toBe('Does that scale');
        expect(firstSegment('No punctuation here')).toBe('No punctuation here');
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```
Set-Location "<TMP>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/llm/earlierQuestionGate.test.ts --root "<WT>"
```

Expected: FAIL — `Failed to resolve import "./earlierQuestionGate"`.

- [ ] **Step 3: Write the port**

`electron/llm/earlierQuestionGate.ts`:

```ts
// The surface cue gate of the turn-based follow-up context (spec 2026-10-03 §3.2): design 2's
// calibrated cue set, unchanged. Ported byte for byte from the replay's hashed reference
// (scratchpad followup-context/earlierQuestions.ref.mjs, sha256 0459f578…): every regex below is
// that file's. Designed on scenario50 texts and general language, never on holdout40.
// Measured on the scenario50 roster: follow-ups needing a parent 11/12 fired, standalone
// follow-ups 1/38 false, dependent mains 4/4, standalone mains 0/46 (spec §3.2).

export type Cue = 'callback' | 'reference' | 'leading' | 'constraint' | 'pronoun' | 'short' | 'none';

/** Leading interjections and connectives are not part of the question ("Okay, and if it fails?"). */
const INTERJECTION = /^(?:(?:yes|no|ok|okay|alright|right|sure|great|good|fine|well|hmm|mm|yeah|so)\b[,.!]?\s*)+/i;

/** The first comma-free segment: text up to the first . : ; ? ! , or an em dash. */
export function firstSegment(q: string): string {
    const m = q.match(/^[^.:;?!,—]*/);
    return (m ? m[0] : q).trim();
}

// Explicit reference to something said earlier in the interview.
const CALLBACK = /\b(going back to|go back to|back to (the|your|that|what)|coming back to|to come back to|returning to|you (mentioned|said|described|talked about|proposed|suggested|outlined|brought up|discussed)|as (you|we) (said|discussed|mentioned)|we (discussed|talked about|covered)|earlier (you|question|answer|design|approach|solution)|(mentioned|said|discussed|described|asked|talked about) earlier|previously|a (moment|minute|few minutes|while) ago|from earlier|earlier on)\b/i;

// A determiner or possessive on a thing the candidate produced or was asked about. "this" is
// left out: "in this scenario" names the current setup.
const REFERENCE = /\b(your|that|the previous|the earlier|the last|the first|the original) (answer|approach|design|solution|function|query|queries|code|implementation|pipeline|service|limiter|cache|schema|architecture|system|plan|example|gateway|endpoint|adapter|batcher|runner|manifest|manifests|response|strategy|recommendation|estimate|configuration|policy|migration|rollout|contract|budget|index|table|tables|job|test|tests|version|number|numbers|figure|figures|calculation|logic|setup|design task)\b/i;

// Continuations and comparatives that only make sense against something before.
const LEADING = /^(and|but|so|then|also|what about|how about|what if|and if|but if|if instead|now without|now with|now that|without the|without a|without using|instead of the|instead of that|same question|in that case|otherwise|one more|follow[- ]?up|what breaks|what fails|what goes wrong|what would break|what could go wrong|what would change|what changes|what else|what more|anything else|what would you (add|change|do differently|remove|drop|keep))\b/i;

// Keep/preserve a constraint that was stated before ("while preserving the tie rule").
const CONSTRAINT = /\b(while|still|and still|but still|yet still|without (losing|breaking|violating))\s+(preserv|keep|maintain|retain|respect|honou?r|satisfy|meet)\w*\s+(the|that|those|its|their|our|my)\b[^.?!]{0,60}?\b(rule|rules|constraint|constraints|requirement|requirements|guarantee|guarantees|invariant|invariants|property|properties|semantics|ordering|order|behaviou?r|contract|budget|limit|limits|tie|ties|target|targets|sla|slo|slos|deadline|latency)\b/i;

// "that" is a pronoun after an auxiliary/preposition/verb, or before an auxiliary; never in
// these fixed phrases, where it is a conjunction or a relative.
const THAT_NOT = /\b(so|such|given|now|provided|assuming|except|in|the fact|means|ensure|ensures|assume|note|say|says|know|think|require|requires|argue) that\b/gi;
const THAT_PRE = /\b(is|was|are|were|does|did|do|would|could|should|will|can|might|may|has|have|had|if|when|while|where|because|unless|until|once|whether|about|with|for|to|of|on|from|at|than|and|or|but|then|extend|make|handle|change|run|test|scale|deploy|shard|secure|monitor|cache|retry|resume|restart|version|index|store|serve|call|use|keep|move|split|merge|swap|replace|rewrite|debug|fix|break|build|write|implement|design|prove|verify|validate|check|reduce|improve|optimize|tune|simplify|generalize|adapt|port|migrate|convert|apply|reuse|repeat|redo|explain|describe|justify|defend|like|beyond|after|before|without|against) that\b/i;
const THIS_NOT = /\bthis (case|scenario|situation|question|problem|example|interview|role|company|context|setup|task|exercise|round)\b/i;

const SHORT_WORDS = 3;
const CONSTRAINT_MAX_WORDS = 25; // a long question that keeps a constraint states it itself (S2Q06, S4Q07)
export const wordsOf = (q: string): number => (q.match(/[A-Za-z0-9']+/g) ?? []).length;

/** Returns { fires, cue }. cue: 'callback' | 'reference' | 'leading' | 'constraint' | 'pronoun' | 'short' | 'none'. */
export function gate(question: string | null | undefined): { fires: boolean; cue: Cue } {
    const raw = (question ?? '').trim();
    if (!raw) return { fires: false, cue: 'none' };
    const q = raw.replace(INTERJECTION, '').trim() || raw;
    if (CALLBACK.test(q)) return { fires: true, cue: 'callback' };
    if (REFERENCE.test(q)) return { fires: true, cue: 'reference' };
    if (LEADING.test(q)) return { fires: true, cue: 'leading' };
    if (wordsOf(q) <= CONSTRAINT_MAX_WORDS && CONSTRAINT.test(q)) return { fires: true, cue: 'constraint' };
    const seg = firstSegment(q);
    const segl = ` ${seg.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ')} `;
    for (const p of ['it', 'they', 'them', 'those', 'these']) if (segl.includes(` ${p} `)) return { fires: true, cue: 'pronoun' };
    if (segl.includes(' this ') && !THIS_NOT.test(seg)) return { fires: true, cue: 'pronoun' };
    const segThat = seg.replace(THAT_NOT, ' ');
    // "that" after a noun is a relative clause ("a batch that fails"): only after an auxiliary,
    // preposition or verb (THAT_PRE), or as the segment's first word, is it a pronoun.
    if (THAT_PRE.test(segThat) || /^that\b/i.test(segThat)) return { fires: true, cue: 'pronoun' };
    if (/\b(the same|such a|such an)\b/i.test(seg)) return { fires: true, cue: 'pronoun' };
    if (wordsOf(q) <= SHORT_WORDS) return { fires: true, cue: 'short' };
    return { fires: false, cue: 'none' };
}
```

Note `THAT_NOT` carries the `g` flag in the reference; `String.replace` with a global regex has no `lastIndex` state problem, so keep it exactly as is.

- [ ] **Step 4: Run the test; expect PASS**

Same command as Step 2. Expected: 7 passed. If a roster sentence fails, the port differs from the reference: diff the regex against `<SP>\followup-context\earlierQuestions.ref.mjs` character by character; never adjust the expectation.

- [ ] **Step 5: Calibrate (rule 8)**

Temporarily remove `|short` handling (comment out the `SHORT_WORDS` line's `if`), re-run: the must-fire test must FAIL on `'Why?'`. Restore. Then run the type-check gates (both; the electron list must equal the baseline file).

- [ ] **Step 6: Commit**

```
git -C "<WT>" add electron/llm/earlierQuestionGate.ts electron/llm/earlierQuestionGate.test.ts
git -C "<WT>" commit -m "feat(earlier-question): port design 2's cue gate to TypeScript, 19/10 calibration set as tests"
```

---

### Task 2: The pure core — ledger rules, selector, clip, block, flag, prompt lines

**Files:**
- Create: `electron/llm/earlierQuestion.ts`
- Test: `electron/llm/earlierQuestion.test.ts`

**Interfaces:**
- Consumes: `gate`, `Cue` from Task 1; `sameAnchor` from `electron/services/questionReconcile.ts` (existing, unchanged).
- Produces (Tasks 3–7 rely on these exact names):
  - `export const EARLIER_QUESTION_ENV = 'NATIVELY_EARLIER_QUESTION'`
  - `export const LEDGER_DEPTH = 3`, `PARENT_MAX_CHARS = 450`, `CLIP_HEAD = 150`, `CLIP_TAIL = 299`, `LABEL: string`
  - `export interface AskedQuestion { text: string; turnId: number | null; seq: number }`
  - `export type EarlierWhy = '' | 'off' | 'no-question' | 'no-turn' | 'supersede' | 'no-cue' | 'no-parent' | 'parent-in-pinned' | 'parent-in-prompt' | 'error'`
  - `export interface EarlierQuestion { block: string; cue: Cue; why: EarlierWhy; parent: string | null }`
  - `export function earlierQuestionEnabled(env?: NodeJS.ProcessEnv): boolean` (throws on junk)
  - `export function describeEarlierQuestionAtStartup(env?: NodeJS.ProcessEnv): string` → `'earlier question: on' | 'earlier question: off'`; throws on junk and on both flags set
  - `export function clip(text: string): string`, `export function formatBlock(parent: string): string`
  - `export function recordAsked(ledger: readonly AskedQuestion[], write: { text: string | null | undefined; turnId?: number | null; seq: number; enabled?: boolean }): readonly AskedQuestion[]` (returns the SAME array reference when nothing is written)
  - `export function interviewerLinesBefore(preparedTranscript: string): string[]`
  - `export function buildEarlierQuestion(input: { enabled?: boolean; question: string | null | undefined; turnId?: number | null; supersede?: boolean; ledger?: readonly AskedQuestion[]; promptLines?: readonly string[] }): EarlierQuestion` (never throws)

- [ ] **Step 1: Write the failing test**

`electron/llm/earlierQuestion.test.ts` — every spec §3.6 row a pure function can hold, as the reference's `CASES` (same invented sentences, same expectations), plus the ledger rules, label/clip/format, the flag, `interviewerLinesBefore`, and the Review Focus rows 1, 2 and 5:

```ts
import { describe, it, expect } from 'vitest';
import {
    buildEarlierQuestion, recordAsked, formatBlock, clip, interviewerLinesBefore,
    earlierQuestionEnabled, describeEarlierQuestionAtStartup,
    LABEL, LEDGER_DEPTH, PARENT_MAX_CHARS, CLIP_HEAD, CLIP_TAIL, EARLIER_QUESTION_ENV, type AskedQuestion,
} from './earlierQuestion';
import { gate } from './earlierQuestionGate';

// Invented sentences only — the same ones as the reference's tests (none is a scenario50 or holdout sentence).
const P_CACHE = 'Which eviction policy would you pick for the session cache, so that hot users stay resident?';
const F_WHY = 'Why that one?';
const P_QUEUE = 'How would you size the worker pool that drains the invoice queue during month end?';
const F_PRON = 'What happens to it when a worker crashes halfway?';
const P_SHARD = 'Describe how you would shard the telemetry store by tenant.';
const Q_AUDIT = 'Explain how you would audit access to the telemetry store.';
const P_SAME = 'How would you keep the same shard layout with twice the tenants?';
const P_REF = 'How would your design for the invoice queue survive a regional outage?';
const F_THOSE = 'How would you rebalance those shards after a tenant doubles in size?';
const P_LONG = `Design the ingestion path for a fleet of ${'regional '.repeat(20)}edge collectors that batch readings, sign each batch, and upload them to a central lake; then say how you would verify, end to end, that no batch was lost, duplicated or reordered before the nightly roll-up reads it, while preserving the per-device ordering guarantee.`;

const L = (...texts: string[]): AskedQuestion[] => texts.map((text, i) => ({ text, turnId: i + 1, seq: i + 1 }));
const block = (parent: string) => `${LABEL}\n- ${parent}`;

type Case = { row: string; input: Parameters<typeof buildEarlierQuestion>[0]; expect: { block: string; why?: string; cue?: string }; mustHaveCue?: boolean; wrongReferent?: { shown: string; truth: string }; ledgerWrite?: { text: string; turnId: number | null; seq: number; before: AskedQuestion[]; after: AskedQuestion[] } };

const CASES: Case[] = [
    { row: 'ledger empty (first question)', input: { question: F_PRON, turnId: 2, ledger: [], promptLines: [] }, expect: { block: '', why: 'no-parent' } },
    { row: 'settled null (manual with nothing dispatched)', input: { question: null, turnId: null, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-question' } },
    { row: 'settled blank', input: { question: '   ', turnId: 3, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-question' } },
    { row: 'flag off', input: { enabled: false, question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'off', cue: 'none' } },
    { row: 'evicted parent + cue: the block (control for every silent row below)', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: block(P_SHARD), why: '' } },
    { row: 'parent in the prompt (short gap)', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [P_SHARD] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'parent in the prompt, older question absent: the grandparent is never read (S2Q09F shape)', input: { question: 'How would your design change if the audit trail had to be tamper evident?', turnId: 3, ledger: L(P_SHARD, P_QUEUE), promptLines: [P_QUEUE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'parent contained in the pinned line (Live merge)', input: { question: `${P_SHARD} Then how would your design change if a tenant doubled in size?`, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' } },
    { row: 're-ask of the parent (same text, earlier copy evicted)', input: { question: P_SAME, turnId: 3, ledger: L(P_SAME), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned' }, mustHaveCue: true },
    { row: 'quick follow-up < 60 s sharing a frame word ("Why that one?"), parent in the prompt', input: { question: F_WHY, turnId: 2, ledger: L(P_CACHE), promptLines: [P_CACHE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'quick follow-up, its 90 s control: identical inputs, identical output (no clock)', input: { question: F_WHY, turnId: 2, ledger: L(P_CACHE), promptLines: [P_CACHE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'supersede, continuation of the same question', input: { question: `${P_QUEUE} Include the retry policy.`, turnId: 4, supersede: true, ledger: [{ text: P_QUEUE, turnId: 4, seq: 4 }], promptLines: [] }, expect: { block: '', why: 'supersede' } },
    { row: 'two questions in one turn: supersede of a different question, older parent absent', input: { question: 'And how would you rebalance those shards afterwards?', turnId: 5, supersede: true, ledger: [{ text: P_SHARD, turnId: 4, seq: 4 }, { text: Q_AUDIT, turnId: 5, seq: 5 }], promptLines: [] }, expect: { block: '', why: 'supersede', cue: 'leading' } },
    { row: 'two questions in one turn, control without supersede: the same inputs would add the previous turn', input: { question: 'And how would you rebalance those shards afterwards?', turnId: 5, supersede: false, ledger: [{ text: P_SHARD, turnId: 4, seq: 4 }, { text: Q_AUDIT, turnId: 5, seq: 5 }], promptLines: [] }, expect: { block: block(Q_AUDIT), why: '' } },
    { row: 'R21 supersede re-entering as answer, head dropped by the deduper (duplicate of an answered question still in the prompt)', input: { question: `${P_REF} Include the retry policy.`, turnId: 6, supersede: false, ledger: L(P_REF), promptLines: [P_REF] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' },
      ledgerWrite: { text: `${P_REF} Include the retry policy.`, turnId: 6, seq: 6, before: L(P_REF), after: [...L(P_REF), { text: `${P_REF} Include the retry policy.`, turnId: 6, seq: 6 }] } },
    { row: 'R21 supersede, head dropped by isFragment (Live-sourced, under 4 words): the normal gated block, parent = the previous turn', input: { question: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, supersede: false, ledger: L(P_QUEUE, P_SHARD), promptLines: [P_QUEUE] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, seq: 7, before: L(P_QUEUE, P_SHARD), after: [...L(P_QUEUE, P_SHARD), { text: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, seq: 7 }] } },
    { row: 'supersede after an answer-now re-ran the head (turnId null entry newer than the head): remove + push newest',
      input: { question: `${P_QUEUE} Include the retry policy.`, turnId: 4, supersede: true, ledger: [{ text: P_QUEUE, turnId: 4, seq: 4 }, { text: P_QUEUE, turnId: null, seq: 5 }], promptLines: [] }, expect: { block: '', why: 'supersede' },
      ledgerWrite: { text: `${P_QUEUE} Include the retry policy.`, turnId: 4, seq: 6, before: [{ text: P_QUEUE, turnId: 4, seq: 4 }, { text: P_QUEUE, turnId: null, seq: 5 }], after: [{ text: P_QUEUE, turnId: null, seq: 5 }, { text: `${P_QUEUE} Include the retry policy.`, turnId: 4, seq: 6 }] } },
    { row: 'double dispatch past the deduper: duplicate entry, parent unchanged', input: { question: F_THOSE, turnId: 9, ledger: [{ text: P_SHARD, turnId: 7, seq: 7 }, { text: P_SHARD, turnId: 8, seq: 8 }], promptLines: [] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: P_SHARD, turnId: 8, seq: 8, before: L(P_SHARD), after: [{ text: P_SHARD, turnId: 1, seq: 1 }, { text: P_SHARD, turnId: 8, seq: 8 }] } },
    { row: 'chip click / answer-now / manual in auto mode (turnId null): ledger written, block ""', input: { question: F_THOSE, turnId: null, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-turn', cue: 'pronoun' },
      ledgerWrite: { text: F_THOSE, turnId: null, seq: 2, before: L(P_SHARD), after: [...L(P_SHARD), { text: F_THOSE, turnId: null, seq: 2 }] } },
    { row: 'late Live echo of Q dispatched at 61 s (before the next question R): harmless duplicate parent', input: { question: F_PRON, turnId: 12, ledger: [{ text: P_QUEUE, turnId: 10, seq: 10 }, { text: P_QUEUE, turnId: 11, seq: 11 }], promptLines: [] }, expect: { block: block(P_QUEUE), why: '' } },
    { row: 'late Live echo of Q at 76 s AFTER the next question R: the WRONG referent, bounded by the label (ledger [Q, R, Q-echo])', input: { question: F_THOSE, turnId: 13, ledger: [{ text: P_QUEUE, turnId: 10, seq: 10 }, { text: P_SHARD, turnId: 11, seq: 11 }, { text: P_QUEUE, turnId: 12, seq: 12 }], promptLines: [P_SHARD] }, expect: { block: block(P_QUEUE), why: '' },
      wrongReferent: { shown: P_QUEUE, truth: P_SHARD } },
    { row: 'never-dispatched parent: the previous DISPATCHED question becomes the referent (measured by the D-cases)', input: { question: F_THOSE, turnId: 3, ledger: L(P_QUEUE), promptLines: [] }, expect: { block: block(P_QUEUE), why: '' } },
    { row: 'suggest/off mode: click Q1, skip Q2 and Q3, click a follow-up chip: ledger [Q1], turnId null -> ""', input: { question: F_PRON, turnId: null, ledger: [{ text: P_QUEUE, turnId: null, seq: 1 }], promptLines: [] }, expect: { block: '', why: 'no-turn' },
      ledgerWrite: { text: F_PRON, turnId: null, seq: 2, before: [{ text: P_QUEUE, turnId: null, seq: 1 }], after: [{ text: P_QUEUE, turnId: null, seq: 1 }, { text: F_PRON, turnId: null, seq: 2 }] } },
    { row: 'parent over 450 chars: head 150 + ellipsis + tail 299', input: { question: 'How would you test that end to end?', turnId: 2, ledger: L(P_LONG), promptLines: [] }, expect: { block: `${LABEL}\n- ${P_LONG.replace(/\s+/g, ' ').trim().slice(0, 150)}…${P_LONG.replace(/\s+/g, ' ').trim().slice(-299)}`, why: '' } },
    { row: 'parent present only as a tail fragment after the sparsify cut counts as present', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: ['store by tenant.'] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'no cue: a standalone question gets nothing', input: { question: 'Describe how you would design a retention policy for audit logs.', turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-cue', cue: 'none' } },
    { row: 'blank parent text', input: { question: F_THOSE, turnId: 2, ledger: [{ text: '  ', turnId: 1, seq: 1 }], promptLines: [] }, expect: { block: '', why: 'no-parent' } },
    { row: 'exception in select (a null prompt line) -> "" and gate=error, never a throw', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [null as any] }, expect: { block: '', why: 'error', cue: 'none' } },
    { row: 'exception: ledger missing', input: { question: F_THOSE, turnId: 2, ledger: null as any, promptLines: [] }, expect: { block: '', why: 'error' } },
    // Review Focus 1: turn id 0 is a turn, not "no turn".
    { row: 'turnId 0 is a valid turn: the block is built', input: { question: F_THOSE, turnId: 0, ledger: L(P_SHARD), promptLines: [] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: `${P_SHARD} And the hot tenants?`, turnId: 0, seq: 3, before: [{ text: P_QUEUE, turnId: 1, seq: 1 }, { text: P_SHARD, turnId: 0, seq: 2 }], after: [{ text: P_QUEUE, turnId: 1, seq: 1 }, { text: `${P_SHARD} And the hot tenants?`, turnId: 0, seq: 3 }] } },
    // Review Focus 2: a joined whole-turn text with a line break inside.
    { row: 'parent with a line break (two joined finals): present in the prompt by overlap -> ""', input: { question: F_THOSE, turnId: 2, ledger: [{ text: 'Describe how you would shard\nthe telemetry store by tenant.', turnId: 1, seq: 1 }], promptLines: ['describe how you would shard the telemetry store by tenant.'] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'parent with a line break, evicted: the block line is ONE line (whitespace collapsed)', input: { question: F_THOSE, turnId: 2, ledger: [{ text: 'Describe how you would shard\nthe telemetry store by tenant.', turnId: 1, seq: 1 }], promptLines: [] }, expect: { block: block(P_SHARD), why: '' } },
];

describe('buildEarlierQuestion — spec §3.6 rows', () => {
    for (const c of CASES) {
        it(c.row, () => {
            const r = buildEarlierQuestion(c.input);
            expect(r.block).toBe(c.expect.block);
            if (c.expect.why !== undefined) expect(r.why).toBe(c.expect.why);
            if (c.expect.cue !== undefined) expect(r.cue).toBe(c.expect.cue);
            if (c.mustHaveCue) expect(r.cue).not.toBe('none');
            if (c.wrongReferent) { expect(r.block).toContain(c.wrongReferent.shown); expect(r.block).not.toContain(c.wrongReferent.truth); }
            if (c.expect.block) {
                expect(r.block.split('\n')).toHaveLength(2);
                expect(r.cue).toBe(gate(c.input.question).cue);
                expect(r.cue).not.toBe('none');
                expect(r.parent).toBe(c.input.ledger![c.input.ledger!.length - 1].text);
            }
            if (c.ledgerWrite) {
                const w = c.ledgerWrite;
                expect(recordAsked(w.before, { text: w.text, turnId: w.turnId, seq: w.seq })).toEqual(w.after);
            }
        });
    }
});

describe('recordAsked — spec §3.1 ledger table', () => {
    it('a settled call whose turnId the ledger does not hold pushes', () => expect(recordAsked(L(P_QUEUE), { text: P_SHARD, turnId: 9, seq: 9 })).toEqual([...L(P_QUEUE), { text: P_SHARD, turnId: 9, seq: 9 }]));
    it('the 8 s supersede (turnId held) removes the head and pushes the merged text newest (remove-and-push, not replace in place)', () => {
        const before: AskedQuestion[] = [{ text: 'old', turnId: 1, seq: 1 }, { text: 'head', turnId: 2, seq: 2 }, { text: 'other', turnId: 3, seq: 3 }];
        expect(recordAsked(before, { text: 'head tail', turnId: 2, seq: 4 })).toEqual([{ text: 'old', turnId: 1, seq: 1 }, { text: 'other', turnId: 3, seq: 3 }, { text: 'head tail', turnId: 2, seq: 4 }]);
    });
    it('turnId null never removes (two null entries coexist)', () => expect(recordAsked([{ text: 'a', turnId: null, seq: 1 }], { text: 'a', turnId: null, seq: 2 })).toEqual([{ text: 'a', turnId: null, seq: 1 }, { text: 'a', turnId: null, seq: 2 }]));
    it('no text dedup: a follow-up sharing a frame word does not replace its parent (review C1), and the next question gets the follow-up', () => {
        const after = recordAsked(L(P_CACHE), { text: F_WHY, turnId: 2, seq: 2 });
        expect(after.map((e) => e.text)).toEqual([P_CACHE, F_WHY]);
        expect(buildEarlierQuestion({ question: 'What about the writes then, how do they reach it?', turnId: 3, ledger: after, promptLines: [] }).block).toBe(block(F_WHY));
    });
    it('an aborted or stalled parent is recorded (the write happens at dispatch, before any answer exists), so its follow-up gets it', () => {
        const afterDispatch = recordAsked([], { text: P_SHARD, turnId: 1, seq: 1 });
        expect(afterDispatch.map((e) => e.text)).toEqual([P_SHARD]);
        expect(buildEarlierQuestion({ question: F_THOSE, turnId: 2, ledger: afterDispatch, promptLines: [] }).block).toBe(block(P_SHARD));
    });
    it('depth is 3, oldest dropped', () => {
        let l: readonly AskedQuestion[] = [];
        for (let i = 1; i <= 5; i++) l = recordAsked(l, { text: `q${i}`, turnId: i, seq: i });
        expect(l.map((e) => e.text)).toEqual(['q3', 'q4', 'q5']);
        expect(LEDGER_DEPTH).toBe(3);
    });
    it('settled null / blank text writes nothing and returns the same array', () => { const l = L(P_QUEUE); expect(recordAsked(l, { text: null, turnId: 2, seq: 2 })).toBe(l); expect(recordAsked(l, { text: '  ', turnId: 2, seq: 2 })).toBe(l); });
    it('flag off writes nothing and returns the same array', () => { const l = L(P_QUEUE); expect(recordAsked(l, { text: P_SHARD, turnId: 2, seq: 2, enabled: false })).toBe(l); });
    it('does not mutate its input', () => { const l = Object.freeze(L(P_QUEUE).map((e) => Object.freeze(e))); recordAsked(l, { text: P_SHARD, turnId: 1, seq: 9 }); recordAsked(l, { text: P_SHARD, turnId: 5, seq: 9 }); expect(l).toEqual(L(P_QUEUE)); });
});

describe('label, clip, formatBlock', () => {
    it('label: 125 chars, says asked earlier / context only / do not answer it again, never "answered"', () => {
        expect(LABEL).toHaveLength(125);
        expect(LABEL).toContain('asked earlier'); expect(LABEL).toContain('context only'); expect(LABEL).toContain('do not answer it again');
        expect(/answered/i.test(LABEL)).toBe(false);
    });
    it('clip: exactly 450 stays whole, 451 is cut to head 150 + ellipsis + tail 299 (length 450)', () => {
        const t450 = 'x'.repeat(450), t451 = `${'h'.repeat(150)}${'m'.repeat(152)}${'t'.repeat(149)}`;
        expect(clip(t450)).toBe(t450);
        expect(clip(t451)).toHaveLength(450);
        expect(clip(t451)).toBe(`${'h'.repeat(150)}…${'m'.repeat(150)}${'t'.repeat(149)}`);
        expect([PARENT_MAX_CHARS, CLIP_HEAD, CLIP_TAIL]).toEqual([450, 150, 299]);
    });
    it('clip: the tail keeps the referent of a long parent', () => { expect(clip(P_LONG).endsWith('per-device ordering guarantee.')).toBe(true); expect(clip(P_LONG).startsWith('Design the ingestion path')).toBe(true); });
    it('clip: whitespace is collapsed before measuring', () => expect(clip('  a \n\n b\t c  ')).toBe('a b c'));
    it('formatBlock: label, newline, dash, parent', () => expect(formatBlock('Why X?')).toBe(`${LABEL}\n- Why X?`));
});

describe('interviewerLinesBefore — the [INTERVIEWER] lines of the prepared transcript except the pinned last one (Review Focus 5)', () => {
    it('drops exactly the last interviewer line, strips the prefix, ignores [ME]/[ASSISTANT] and blank lines', () => {
        const t = '[INTERVIEWER]: first question?\n[ASSISTANT]: an answer.\n\n[ME]: a mumble\n[INTERVIEWER]: second question?\n[INTERVIEWER]: the pinned one?';
        expect(interviewerLinesBefore(t)).toEqual(['first question?', 'second question?']);
    });
    it('a transcript holding only the pinned line gives []', () => expect(interviewerLinesBefore('[INTERVIEWER]: the pinned one?')).toEqual([]));
    it('an empty transcript gives []', () => expect(interviewerLinesBefore('')).toEqual([]));
    it('an [INTERVIEWER] line with no text is dropped, as the replay\'s interviewerLines drops it (review I5)', () => {
        expect(interviewerLinesBefore('[INTERVIEWER]: first?\n[INTERVIEWER]:\n[INTERVIEWER]:   \n[INTERVIEWER]: the pinned one?')).toEqual(['first?']);
    });
});

describe('the flag', () => {
    const E = (v?: string, parent?: string) => ({ ...(v === undefined ? {} : { [EARLIER_QUESTION_ENV]: v }), ...(parent === undefined ? {} : { NATIVELY_FOLLOWUP_PARENT: parent }) }) as NodeJS.ProcessEnv;
    it('is off unless the flag is exactly 1', () => {
        expect(earlierQuestionEnabled(E())).toBe(false); expect(earlierQuestionEnabled(E(''))).toBe(false); expect(earlierQuestionEnabled(E('0'))).toBe(false);
        expect(earlierQuestionEnabled(E('1'))).toBe(true);
        expect(() => earlierQuestionEnabled(E('yes'))).toThrow(/NATIVELY_EARLIER_QUESTION/);
    });
    it('describeEarlierQuestionAtStartup names on/off, throws on junk, and refuses both flags on', () => {
        expect(describeEarlierQuestionAtStartup(E())).toBe('earlier question: off');
        expect(describeEarlierQuestionAtStartup(E('0'))).toBe('earlier question: off');
        expect(describeEarlierQuestionAtStartup(E('1'))).toBe('earlier question: on');
        expect(describeEarlierQuestionAtStartup(E('1', '0'))).toBe('earlier question: on');
        expect(() => describeEarlierQuestionAtStartup(E('yes'))).toThrow(/NATIVELY_EARLIER_QUESTION/);
        expect(() => describeEarlierQuestionAtStartup(E('1', '1'))).toThrow(/NATIVELY_FOLLOWUP_PARENT/);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```
Set-Location "<TMP>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/llm/earlierQuestion.test.ts --root "<WT>"
```

Expected: FAIL — `Failed to resolve import "./earlierQuestion"`.

- [ ] **Step 3: Write the module**

`electron/llm/earlierQuestion.ts`:

```ts
// Turn-based follow-up context (spec docs/superpowers/specs/2026-10-03-turn-based-followup-context-design.md
// §3.1–3.6): the question ledger's rules, the gate-and-select, the clip and the one-line block. Pure, no
// I/O, no model call. Ported function for function from the replay's reference (scratchpad
// followup-turn/earlierQuestion.ref.mjs); the app must reproduce its outputs byte for byte on the same
// inputs (earlierQuestion.parity.test.ts; the pre-registration's build gate c1). Off unless
// NATIVELY_EARLIER_QUESTION=1: flag off, every prompt is today's bytes and the ledger is never written.
import { gate, type Cue } from './earlierQuestionGate';
import { sameAnchor } from '../services/questionReconcile';

export const EARLIER_QUESTION_ENV = 'NATIVELY_EARLIER_QUESTION';
/** Spec §3.1: v1 reads only the newest entry; 3 is an audit buffer for the diag line and a flight read (1 would select identically). */
export const LEDGER_DEPTH = 3;
/** Spec §3.4: the longest scenario50 question is 407 chars; the cut keeps the head (the task) and the tail (the referent). */
export const PARENT_MAX_CHARS = 450;
export const CLIP_HEAD = 150;
export const CLIP_TAIL = 299;   // 150 + 1 ('…') + 299 = 450
/** Spec §3.4, 125 chars: names the three facts — asked earlier, context only, do not re-answer. "asked", not "answered": the ledger holds parents whose answer was aborted. */
export const LABEL = 'EARLIER QUESTION (asked earlier; context only, do not answer it again; answer only the question under INTERVIEWER JUST SAID):';

export interface AskedQuestion { text: string; turnId: number | null; seq: number }
export type EarlierWhy = '' | 'off' | 'no-question' | 'no-turn' | 'supersede' | 'no-cue' | 'no-parent' | 'parent-in-pinned' | 'parent-in-prompt' | 'error';
export interface EarlierQuestion { block: string; cue: Cue; why: EarlierWhy; parent: string | null }

export function earlierQuestionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env[EARLIER_QUESTION_ENV]?.trim();
    if (!raw || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(`${EARLIER_QUESTION_ENV}="${raw}" is not 1, 0 or unset`);
}

/**
 * The startup validate-and-describe step, the shape of describeFollowUpParentAtStartup: returns the
 * line WITHOUT the "[Main] " prefix (main.ts adds it); throws on a junk value, and when both this
 * flag and NATIVELY_FOLLOWUP_PARENT are 1 (spec §3.5: the two designs never run together), so the
 * caller exits rather than starting with a config nobody chose.
 */
export function describeEarlierQuestionAtStartup(env: NodeJS.ProcessEnv = process.env): string {
    const on = earlierQuestionEnabled(env);
    if (on && env.NATIVELY_FOLLOWUP_PARENT?.trim() === '1') throw new Error(`${EARLIER_QUESTION_ENV}=1 and NATIVELY_FOLLOWUP_PARENT=1 cannot both be set`);
    return on ? 'earlier question: on' : 'earlier question: off';
}

/** Whitespace-collapsed parent text, cut to head 150 + '…' + tail 299 when over 450. Exact slices: no word-boundary logic. */
export function clip(text: string): string {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t.length <= PARENT_MAX_CHARS) return t;
    return `${t.slice(0, CLIP_HEAD)}…${t.slice(t.length - CLIP_TAIL)}`;
}

export function formatBlock(parent: string): string {
    return `${LABEL}\n- ${clip(parent)}`;
}

const norm = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Spec §3.1 ledger write, pure. ledger: newest last.
 *  - flag off, or no pinned text (settled null / blank): the ledger is returned unchanged (same reference);
 *  - a turnId the ledger holds (the 8 s supersede, head + tail): REMOVE that entry, PUSH the new text newest;
 *  - anything else (new turn id, null, R21 re-entry): PUSH. No text dedup (review C1).
 * Capped at LEDGER_DEPTH, oldest dropped. Never mutates its input.
 */
export function recordAsked(
    ledger: readonly AskedQuestion[],
    { text, turnId = null, seq, enabled = true }: { text: string | null | undefined; turnId?: number | null; seq: number; enabled?: boolean },
): readonly AskedQuestion[] {
    if (!enabled || typeof text !== 'string' || !text.trim()) return ledger;
    const rest = turnId != null ? ledger.filter((e) => e.turnId !== turnId) : ledger;
    return [...rest, { text, turnId, seq }].slice(-LEDGER_DEPTH);
}

const INTERVIEWER_LINE = /^\[INTERVIEWER\]:\s*(.*)$/;

/**
 * The [INTERVIEWER] texts of the prepared transcript BEFORE the pinned one. pinSettledQuestion
 * appends the pinned question as the LAST line, so the last interviewer line is dropped. Checked
 * on the prepared transcript, not on getContext: sparsifyTranscript keeps 6 interviewer turns past
 * 12, so "in the window" and "in the prompt" differ (spec §3.2). The same derivation as the
 * replay's interviewerLines (gate-report-turn.mjs:128–132): lines trimmed, blank lines and empty
 * captures dropped — the parity fixtures' promptLines were made that way.
 */
export function interviewerLinesBefore(preparedTranscript: string): string[] {
    const texts: string[] = [];
    for (const raw of preparedTranscript.split('\n')) {
        const m = raw.trim().match(INTERVIEWER_LINE);
        if (m && m[1]) texts.push(m[1]);   // the line is trimmed and \s* eats the leading space, so m[1] has no edge whitespace
    }
    return texts.slice(0, -1);
}

/**
 * Spec §3.5 buildEarlierQuestion. question = the pinned text (`settled`); turnId = the machine turn's id
 * on the auto turn path, null elsewhere; supersede = replaceAnswer; ledger = BEFORE this call's own
 * write; promptLines = interviewerLinesBefore(preparedTranscript). Returns at most ONE parent line.
 * `why` is '' when a block is returned, else the reason. Any exception is caught: block '', why 'error'.
 */
export function buildEarlierQuestion(input: {
    enabled?: boolean; question: string | null | undefined; turnId?: number | null; supersede?: boolean;
    ledger?: readonly AskedQuestion[]; promptLines?: readonly string[];
}): EarlierQuestion {
    const silent = (why: EarlierWhy, cue: Cue = 'none'): EarlierQuestion => ({ block: '', cue, why, parent: null });
    try {
        const { enabled = true, question, turnId = null, supersede = false, ledger = [], promptLines = [] } = input;
        if (!enabled) return silent('off');
        if (typeof question !== 'string' || !question.trim()) return silent('no-question');
        const cue = gate(question).cue;
        if (turnId == null) return silent('no-turn', cue);                 // spec §3.1: the block is built only on the auto turn path
        if (supersede) return silent('supersede', cue);                    // spec §3.3: the newest entry is this turn's own head
        if (cue === 'none') return silent('no-cue', cue);
        const parent = ledger.length ? ledger[ledger.length - 1].text : null;
        if (typeof parent !== 'string' || !parent.trim()) return silent('no-parent', cue);
        const np = norm(parent), nq = norm(question);
        if (np.length >= 3 && nq.includes(np)) return silent('parent-in-pinned', cue);   // Live merge, re-ask: the text is already there
        if (promptLines.some((l) => sameAnchor(l, parent))) return silent('parent-in-prompt', cue);
        return { block: formatBlock(parent), cue, why: '', parent };
    } catch {
        return silent('error');
    }
}
```

A `null` ledger or a `null` prompt line reaches the code through `as any` in the tests and through nothing else; the destructuring default applies only to `undefined`, so `null` throws inside the `try` and becomes `why: 'error'` — exactly the reference's behaviour.

- [ ] **Step 4: Run the test; expect PASS**

Same command. Expected: every `it` passes — 52 in all (32 rows + 9 ledger + 5 format + 4 lines + 2 flag).

- [ ] **Step 5: Calibrate three mutants, one at a time, restoring after each**

1. In `buildEarlierQuestion` change `if (turnId == null)` to `if (!turnId)` → the "turnId 0" row must FAIL.
2. In `recordAsked` change remove-and-push to replace-in-place (`ledger.map((e) => e.turnId === turnId ? { text, turnId, seq } : e)`) → the "answer-now re-ran the head" and the "8 s supersede" tests must FAIL.
3. In `clip` change `CLIP_TAIL` to 300 → the "451" test must FAIL.
4. In `interviewerLinesBefore` change `if (m && m[1])` to `if (m)` → the "line with no text" test must FAIL.

Then run both type-check gates (electron list == baseline).

- [ ] **Step 6: Commit**

```
git -C "<WT>" add electron/llm/earlierQuestion.ts electron/llm/earlierQuestion.test.ts
git -C "<WT>" commit -m "feat(earlier-question): ledger rules, gate-and-select, clip, block and flag — the pure core, every spec 3.6 row as a test"
```

---

### Task 3: Parity with the replay reference on the captured fixtures (local-only, never committed)

**Files:**
- Test: `electron/llm/earlierQuestion.parity.test.ts`

**Interfaces:**
- Consumes: `buildEarlierQuestion`, `interviewerLinesBefore` (Task 2).
- Produces: nothing for later tasks; the test is the pre-registration's build gate (c1) at source level, plus review I5's seam check. Task 9 repeats both at dist level.

The fixtures `<F>\R\turn-parity-s50m.json`, `-s50l.json`, `-s50k.json` are objects keyed `<hour>:<id>` (42 entries each: 39 ids + D1–D3) whose entries carry `id, question, turnId, supersede, ledger[{text,turnId,seq}], promptLines, expectedCue, expectedBlock, expectedSha (12 hex), expectedSha256`. They hold captured interviewer text and the user's profile: the test reads them from the folder named by `NATIVELY_EQ_PARITY_DIR` and is skipped when that variable is unset or the folder holds no fixture. The second describe reads the three hours' captured prompts (`<RUNS>\<run>\interview60.prompts.json`, keyed by id, entries `{ system, user, model, at }`) from `NATIVELY_EQ_RUNS_DIR` and is skipped when that is unset: it checks the app's own seam — `interviewerLinesBefore(transcript block)` — against the fixture's `promptLines` (the replay's `interviewerLines` derivation) and the block's last `[INTERVIEWER]` text against the fixture's `question`. On a mismatch either prints keys, cue names, lengths and hashes — never text.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { createHash } from 'crypto';
import { buildEarlierQuestion, interviewerLinesBefore } from './earlierQuestion';

// Build gate c1 (PREREGISTER-turn-followup.md §9): the app reproduces every parity-fixture entry of the
// replay that PASSED. The fixtures carry captured prompts with the user's profile: local only, read from
// NATIVELY_EQ_PARITY_DIR at run time, never committed, never printed. Skipped when absent.
// NATIVELY_EQ_PARITY_BREAK=1 corrupts every ledger's newest text before building, to prove the check
// can fail (rule 8); that run must FAIL.
const DIR = process.env.NATIVELY_EQ_PARITY_DIR;
const FILES = DIR && fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^turn-parity-.+\.json$/.test(f)).sort() : [];
const BREAK = process.env.NATIVELY_EQ_PARITY_BREAK === '1';
// The reference itself sits one folder up from R\ (F\earlierQuestion.ref.mjs): when present, every entry is
// ALSO run through it, so `why` (which the fixture does not store) is compared as well.
const REF_PATH = DIR ? path.join(DIR, '..', 'earlierQuestion.ref.mjs') : '';
type Ref = { buildEarlierQuestion: (i: any) => { block: string; cue: string; why: string } };

describe.skipIf(FILES.length === 0)('parity with the replay reference (local fixtures)', () => {
    it('three hours are present, and the reference is beside them', () => {
        expect(FILES).toEqual(['turn-parity-s50k.json', 'turn-parity-s50l.json', 'turn-parity-s50m.json']);
        expect(fs.existsSync(REF_PATH)).toBe(true);
    });
    for (const f of FILES) {
        it(`${f}: every entry reproduces its (cue, block, sha256) and the reference's (cue, why, block)`, async () => {
            const ref = (await import(/* @vite-ignore */ pathToFileURL(REF_PATH).href)) as Ref;
            const fx = JSON.parse(fs.readFileSync(path.join(DIR!, f), 'utf8')) as Record<string, any>;
            const keys = Object.keys(fx);
            expect(keys).toHaveLength(42);
            const bad: string[] = [];
            let withBlock = 0;
            for (const key of keys) {
                const e = fx[key];
                const ledger = BREAK && e.ledger.length ? [...e.ledger.slice(0, -1), { ...e.ledger[e.ledger.length - 1], text: `${e.ledger[e.ledger.length - 1].text} extra` }] : e.ledger;
                const input = { question: e.question, turnId: e.turnId, supersede: e.supersede, ledger, promptLines: e.promptLines };
                const r = buildEarlierQuestion(input);
                const x = ref.buildEarlierQuestion({ ...input, ledger: e.ledger });   // the reference always sees the recorded inputs
                const sha = createHash('sha256').update(r.block).digest('hex');
                if (r.block) withBlock++;
                if (r.block !== e.expectedBlock || r.cue !== e.expectedCue || sha !== e.expectedSha256 || sha.slice(0, 12) !== e.expectedSha) {
                    bad.push(`${key}: cue ${r.cue}/${e.expectedCue} chars ${r.block.length}/${e.expectedBlock.length} sha ${sha.slice(0, 12)}/${e.expectedSha}`);
                }
                if (r.block !== x.block || r.cue !== x.cue || r.why !== x.why) bad.push(`${key}: vs reference cue ${r.cue}/${x.cue} why ${r.why}/${x.why} chars ${r.block.length}/${x.block.length}`);
            }
            expect(bad).toEqual([]);
            expect(withBlock).toBe(7);   // 4 roster + 3 D-cases per hour (PREREGISTER §3)
        });
    }
});

// Review I5: the app's own seam, interviewerLinesBefore(preparedTranscript), against the replay's
// derivation (gate-report-turn.mjs interviewerLines) on the captured prompts of the same three hours.
// The prompts carry the user's profile: read from NATIVELY_EQ_RUNS_DIR (MAIN's gitignored
// interview60.runs) at run time, never printed. The D-cases' prompts are rebuilt by the replay, not
// captured, so they are skipped: 39 roster entries per hour.
const RUNS = process.env.NATIVELY_EQ_RUNS_DIR;
const RUN_OF: Record<string, string> = { s50m: '2026-09-22T08-22-50-s50m', s50l: '2026-09-21T08-22-34-s50l', s50k: '2026-09-20T11-22-43-s50k' };
const BEFORE_MARKER = 'INTERVIEWER JUST SAID:\n';
const AFTER_MARKERS = ['\n\nTHE LIVE LISTENER', '\n\nYOUR RESPONSE'];
/** The transcript block of a captured user turn, cut exactly as the replay's splitUser cuts it. */
function transcriptBlock(user: string): string {
    const mi = user.indexOf(BEFORE_MARKER);
    if (mi < 0) throw new Error('no INTERVIEWER JUST SAID marker');
    const rest = user.slice(mi + BEFORE_MARKER.length);
    const hits = AFTER_MARKERS.map((m) => rest.indexOf(m)).filter((i) => i >= 0);
    if (!hits.length) throw new Error('no end marker after INTERVIEWER JUST SAID');
    return rest.slice(0, Math.min(...hits));
}
const h12 = (a: readonly string[]) => createHash('sha256').update(JSON.stringify(a)).digest('hex').slice(0, 12);

describe.skipIf(FILES.length === 0 || !RUNS || !fs.existsSync(RUNS))('interviewerLinesBefore against the replay\'s prompt lines (local captured prompts)', () => {
    for (const f of FILES) {
        const hour = f.replace(/^turn-parity-(.+)\.json$/, '$1');
        it(`${f}: every roster entry's promptLines and question are what the seam derives from the captured user turn`, () => {
            const fx = JSON.parse(fs.readFileSync(path.join(DIR!, f), 'utf8')) as Record<string, any>;
            const prompts = JSON.parse(fs.readFileSync(path.join(RUNS!, RUN_OF[hour], 'interview60.prompts.json'), 'utf8')) as Record<string, { user: string }>;
            const bad: string[] = [];
            let n = 0;
            for (const [key, e] of Object.entries(fx)) {
                if (/^D\d$/.test(e.id)) continue;
                const user = prompts[e.id]?.user;
                if (!user) { bad.push(`${key}: no captured prompt`); continue; }
                n++;
                const block = transcriptBlock(user);
                const current = block.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => /^\[INTERVIEWER\]:\s*(.*)$/.exec(l)?.[1]).filter(Boolean).at(-1);
                const mine = interviewerLinesBefore(block);
                if (JSON.stringify(mine) !== JSON.stringify(e.promptLines)) bad.push(`${key}: promptLines ${mine.length}/${e.promptLines.length} sha ${h12(mine)}/${h12(e.promptLines)}`);
                if (current !== e.question) bad.push(`${key}: current line ${(current ?? '').length}/${e.question.length} chars`);
            }
            expect(bad).toEqual([]);
            expect(n).toBe(39);
        });
    }
});
```

- [ ] **Step 2: Run it skipped (no env) — proves the committed shape is harmless**

```
Set-Location "<TMP>"; Remove-Item Env:NATIVELY_EQ_PARITY_DIR, Env:NATIVELY_EQ_RUNS_DIR -ErrorAction SilentlyContinue; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/llm/earlierQuestion.parity.test.ts --root "<WT>"
```

Expected: `skipped` (1 file, both describes skipped), exit 0.

- [ ] **Step 3: Run it against the fixtures and the captured prompts — expect PASS**

```
Set-Location "<TMP>"; $env:NATIVELY_EQ_PARITY_DIR = "<F>\R"; $env:NATIVELY_EQ_RUNS_DIR = "<RUNS>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/llm/earlierQuestion.parity.test.ts --root "<WT>"
```

Expected: **7 passed** (1 presence + 3 hours of parity + 3 hours of prompt lines), 126 entries reproduced, 21 with a block, 3 × 39 prompt-line rows equal. A `skipped` here means a path is wrong, not a pass. If a parity entry fails, the port differs from the reference at that entry: compare `<F>\earlierQuestion.ref.mjs` and Task 1's regexes; never edit a fixture. If a prompt-line row fails, the seam differs from the replay's derivation (trim, blank-line and empty-capture handling): fix `interviewerLinesBefore`, never the fixture. If vite-node refuses the file-URL dynamic import of the reference (an ESM-scheme or externalisation error, not a parity failure), remove the `ref` comparison and the `REF_PATH` assertion from this test and keep the fixture comparison; Task 9's dist-level script runs the reference directly in plain node and covers `why`. Say so in the commit message.

- [ ] **Step 4: Calibrate — both checks must be able to fail**

```
$env:NATIVELY_EQ_PARITY_BREAK = '1'; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/llm/earlierQuestion.parity.test.ts --root "<WT>"; Remove-Item Env:NATIVELY_EQ_PARITY_BREAK
```

Expected: the three parity hour tests FAIL, each listing at least the 7 gated keys with `chars`/`sha` mismatches and no text; the three prompt-line tests still pass. Then the prompt-line mutant: in `interviewerLinesBefore` change `texts.slice(0, -1)` to `texts.slice(0, -2)`, re-run → the three prompt-line tests FAIL listing every key whose prompt holds an earlier interviewer line (lengths and 12-hex hashes only). Restore. Confirm by eye that neither failure output holds a sentence from a fixture or a prompt. Then run both type-check gates.

- [ ] **Step 5: Commit**

```
git -C "<WT>" add electron/llm/earlierQuestion.parity.test.ts
git -C "<WT>" commit -m "test(earlier-question): parity with the replay reference over the local captured fixtures, and the prompt-line seam against the replay's derivation; both skipped when absent"
```

---

### Task 4: SessionTracker holds the question ledger

**Files:**
- Modify: `electron/SessionTracker.ts` (fields near line 48 `assistantResponseHistory`; methods after `getAssistantResponseHistory()` ~line 356; `reset()` at 479–492)
- Test: `electron/SessionTracker.askedQuestions.test.ts`

**Interfaces:**
- Consumes: `recordAsked`, `AskedQuestion` (Task 2).
- Produces: `SessionTracker.recordAskedQuestion(text: string, turnId: number | null): void`; `SessionTracker.getAskedQuestions(): readonly AskedQuestion[]`; `reset()` clears both the ledger and its sequence.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SessionTracker } from './SessionTracker';

afterEach(() => vi.restoreAllMocks());

describe('SessionTracker question ledger (spec 2026-10-03 §3.1)', () => {
    it('starts empty, records newest last with increasing seq, keyed by turn id', () => {
        const s = new SessionTracker();
        expect(s.getAskedQuestions()).toEqual([]);
        s.recordAskedQuestion('How would you shard the store?', 1);
        s.recordAskedQuestion('And the hot tenants?', 2);
        expect(s.getAskedQuestions()).toEqual([{ text: 'How would you shard the store?', turnId: 1, seq: 1 }, { text: 'And the hot tenants?', turnId: 2, seq: 2 }]);
    });
    it('a held turn id is removed and the new text pushed newest with a fresh seq (the 8 s supersede)', () => {
        const s = new SessionTracker();
        s.recordAskedQuestion('head', 1); s.recordAskedQuestion('other', 2); s.recordAskedQuestion('head tail', 1);
        expect(s.getAskedQuestions()).toEqual([{ text: 'other', turnId: 2, seq: 2 }, { text: 'head tail', turnId: 1, seq: 3 }]);
    });
    it('keeps at most three, oldest dropped', () => {
        const s = new SessionTracker();
        for (let i = 1; i <= 5; i++) s.recordAskedQuestion(`q${i}`, i);
        expect(s.getAskedQuestions().map((e) => e.text)).toEqual(['q3', 'q4', 'q5']);
    });
    it('reset() (new meeting) clears the ledger and restarts seq at 1', () => {
        const s = new SessionTracker();
        s.recordAskedQuestion('q1', 1); s.recordAskedQuestion('q2', null);
        s.reset();
        expect(s.getAskedQuestions()).toEqual([]);
        s.recordAskedQuestion('q3', 7);
        expect(s.getAskedQuestions()).toEqual([{ text: 'q3', turnId: 7, seq: 1 }]);
    });
    it('a snapshot taken before a write keeps its length (recordAsked builds a new array; nothing mutates the one a caller holds)', () => {
        const s = new SessionTracker();
        s.recordAskedQuestion('q1', 1);
        const before = s.getAskedQuestions();
        s.recordAskedQuestion('q2', 2);
        expect(before).toHaveLength(1);               // a snapshot taken before a write keeps its length (recordAsked builds a new array)
        expect(s.getAskedQuestions()).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```
Set-Location "<TMP>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/SessionTracker.askedQuestions.test.ts --root "<WT>"
```

Expected: FAIL — `s.getAskedQuestions is not a function`.

- [ ] **Step 3: Implement**

In `electron/SessionTracker.ts`:

Add the import after `import { isVerboseLogging } from './verboseLog';`:

```ts
import { recordAsked, type AskedQuestion } from './llm/earlierQuestion';
```

Add the fields after `private assistantResponseHistory: AssistantResponse[] = [];`:

```ts
    // Turn-based follow-up context (spec 2026-10-03 §3.1): the last LEDGER_DEPTH questions
    // runWhatShouldISay was dispatched with, newest last, keyed by machine turn id (null off the
    // auto turn path). Written at dispatch, not at answer completion: an aborted answer still
    // leaves the question the interviewer asked.
    private askedQuestions: readonly AskedQuestion[] = [];
    private askedSeq: number = 0;
```

Add the methods right after `getAssistantResponseHistory()`:

```ts
    /** Spec §3.1: push, or remove-and-push when `turnId` is already held (the 8 s supersede). Blank text writes nothing. */
    recordAskedQuestion(text: string, turnId: number | null): void {
        const next = recordAsked(this.askedQuestions, { text, turnId, seq: this.askedSeq + 1 });
        if (next === this.askedQuestions) return;
        this.askedQuestions = next;
        this.askedSeq++;
    }

    getAskedQuestions(): readonly AskedQuestion[] {
        return this.askedQuestions;
    }
```

In `reset()` (the method at lines 479–492, NOT `clearCodingQuestion`: `this.recentInterviewerBuffer = [];` occurs twice in the file, at :162 inside `clearCodingQuestion` and at :491 inside `reset()` — anchor on `reset()`'s block, review m9), after its `this.recentInterviewerBuffer = [];`:

```ts
        this.askedQuestions = [];
        this.askedSeq = 0;
```

- [ ] **Step 4: Run the test; expect PASS.** Also re-run the existing `electron/SessionTracker.test.ts` (unchanged behaviour) and both type-check gates.

- [ ] **Step 5: Calibrate (review m8)**

Temporarily remove the two lines added to `reset()` → the "reset() clears the ledger" test must FAIL (the ledger survives and `seq` continues at 3). Restore.

- [ ] **Step 6: Commit**

```
git -C "<WT>" add electron/SessionTracker.ts electron/SessionTracker.askedQuestions.test.ts
git -C "<WT>" commit -m "feat(earlier-question): SessionTracker keeps the 3-deep question ledger, cleared on reset"
```

---

### Task 5: WhatToAnswerLLM takes the block as its own argument — the byte rule (build gate c3)

**Files:**
- Modify: `electron/llm/WhatToAnswerLLM.ts:180-227` (the `generateStream` signature and the `contextParts` assembly)
- Test: `electron/llm/WhatToAnswerLLM.earlierQuestion.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (the block is a string).
- Produces: `generateStream(cleanedTranscript, temporalContext?, intentResult?, imagePaths?, forceFastModel?, onSuggestions?, liveTexts?, onCues?, earlierQuestionBlock?: string)` — the 9th positional argument. Task 6 passes it.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';
import { LABEL } from './earlierQuestion';

/** Captures the fullMessage the verbal (or coding) stream call receives — the same seam liveEars.test.ts uses. */
function makeHelper() {
    const calls: string[] = [];
    async function* stream(): AsyncGenerator<string> { yield 'Answer.'; }
    const helper = {
        streamChat: vi.fn((fullMessage: string) => { calls.push(fullMessage); return stream(); }),
        streamVerbalWithGeminiFlash: vi.fn((fullMessage: string) => { calls.push(fullMessage); return stream(); }),
        getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite'),
    } as any;
    return { helper, calls };
}
async function drain(gen: AsyncGenerator<string>): Promise<void> { for await (const _ of gen) { /* drain */ } }
const VERBAL = { intent: 'general', confidence: 1, answerShape: 'spoken' } as any;
const CODING = { intent: 'coding', confidence: 1, answerShape: '' } as any;
const TEMPORAL = { hasRecentResponses: true, previousResponses: ['I would rank per department.'], toneSignals: [] } as any;
const TRANSCRIPT = '[INTERVIEWER]: describe how you would shard the telemetry store by tenant.\n[INTERVIEWER]: How would you rebalance those shards after a tenant doubles in size?';
const BLOCK = `${LABEL}\n- Describe how you would shard the telemetry store by tenant.`;
const BEFORE_MARKER = 'INTERVIEWER JUST SAID:\n';
/** The replay's insertBlock: `${block}\n\n` immediately before the marker; '' is identity. */
function insertBlock(user: string, block: string): string {
    if (!block) return user;
    const i = user.indexOf(BEFORE_MARKER);
    if (i < 0) throw new Error('no INTERVIEWER JUST SAID marker');
    return `${user.slice(0, i)}${block}\n\n${user.slice(i)}`;
}
/** One generateStream call; returns the fullMessage the helper received (exactly one call). */
async function message(args: { intent?: any; temporal?: any; liveTexts?: string[]; block?: string }): Promise<string> {
    const { helper, calls } = makeHelper();
    await drain(new WhatToAnswerLLM(helper).generateStream(TRANSCRIPT, args.temporal, args.intent, undefined, false, undefined, args.liveTexts, undefined, args.block));
    expect(calls).toHaveLength(1);   // one fullMessage per stream — the hedge's legs share these bytes downstream
    return calls[0];
}

describe('the EARLIER QUESTION block in the verbal message (spec 2026-10-03 §3.4; build gate c3)', () => {
    afterEach(() => vi.restoreAllMocks());
    it('extraContext empty: on === insertBlock(off, block)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const off = await message({});
        const on = await message({ block: BLOCK });
        expect(off).not.toContain(LABEL);
        expect(on).toBe(insertBlock(off, BLOCK));
        expect(on.startsWith(`${BLOCK}\n\n${BEFORE_MARKER}`)).toBe(true);
    });
    it('extraContext non-empty (intent + previous responses): the block is the LAST context part, on === insertBlock(off, block)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const off = await message({ intent: VERBAL, temporal: TEMPORAL });
        const on = await message({ intent: VERBAL, temporal: TEMPORAL, block: BLOCK });
        expect(on).toBe(insertBlock(off, BLOCK));
        expect(on.indexOf('PREVIOUS RESPONSES')).toBeLessThan(on.indexOf(BLOCK));
    });
    it('with Live texts: the Live block and the trailer are untouched, on === insertBlock(off, block)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const live = ['How would you rebalance those shards after a tenant doubles?'];
        const off = await message({ intent: VERBAL, liveTexts: live });
        const on = await message({ intent: VERBAL, liveTexts: live, block: BLOCK });
        expect(on).toBe(insertBlock(off, BLOCK));
        expect(on.indexOf(BLOCK)).toBeLessThan(on.indexOf('THE LIVE LISTENER'));
    });
    it('coding framing drops the block: on === off', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const off = await message({ intent: CODING });
        const on = await message({ intent: CODING, block: BLOCK });
        expect(on).toBe(off);
        expect(on).not.toContain(LABEL);
    });
    it('an empty or undefined block is byte-identical to today (flag off is literally today\'s code)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const off = await message({ intent: VERBAL, temporal: TEMPORAL });
        expect(await message({ intent: VERBAL, temporal: TEMPORAL, block: '' })).toBe(off);
        expect(await message({ intent: VERBAL, temporal: TEMPORAL, block: undefined })).toBe(off);
    });
    it('the transcript passed in is not changed by the block (the knowledge lookup and the classifier read the same last line) — passes before the change too', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const on = await message({ intent: VERBAL, block: BLOCK });
        expect(on.endsWith(`${BEFORE_MARKER}${TRANSCRIPT}\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):`)).toBe(true);
    });
    // Review I4: "flag off = today's bytes" compared with TODAY, not with the new code against itself. The three
    // literals below are the unmodified file's output (WhatToAnswerLLM.ts:211-239 at 89c8f53); this test is green
    // on the unmodified file in Step 2 and must stay green after Step 3. A reordered contextParts or a changed
    // join would pass every insertBlock test above and fail here.
    it('characterization: the flag-off message is today\'s, byte for byte, for three shapes (green before and after this task)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const TRAILER = '\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):';
        const INTENT = '<intent_and_shape>\nDETECTED INTENT: general\nANSWER SHAPE: spoken\n</intent_and_shape>';
        expect(await message({})).toBe(`INTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`);
        expect(await message({ intent: VERBAL, temporal: TEMPORAL })).toBe(`${INTENT}\n\nPREVIOUS RESPONSES (Avoid Repetition):\n1. "I would rank per department."\n\nINTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`);
        const live = ['How would you rebalance those shards after a tenant doubles?'];
        expect(await message({ intent: VERBAL, liveTexts: live })).toBe(`${INTENT}\n\nINTERVIEWER JUST SAID:\n${TRANSCRIPT}\n\nTHE LIVE LISTENER HEARD THE SAME QUESTION AS (use both; where they differ, the transcript's numbers and names are the ones spoken):\n${live.join('\n')}${TRAILER}`);
    });
});
```

- [ ] **Step 2: Run it and watch it fail — and watch the controls pass on the UNMODIFIED file**

```
Set-Location "<TMP>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/llm/WhatToAnswerLLM.earlierQuestion.test.ts --root "<WT>"
```

Expected: the three `insertBlock` tests FAIL (`on` equals `off`: the 9th argument is ignored today); the coding, empty-block, "transcript not changed" and characterization tests PASS already (they are the controls). If the characterization test fails HERE, a literal in the plan is wrong, not the code: correct the literal to the bytes the unmodified file produces (read from the assertion diff of this run only), say so in the commit message, and only then proceed. A literal corrected after Step 3 proves nothing.

- [ ] **Step 3: Implement**

In `electron/llm/WhatToAnswerLLM.ts`, extend the `generateStream` signature after `onCues?: (cues: string[]) => void,` (line 201):

```ts
        // Turn-based follow-up context (spec 2026-10-03 §3.4): the one-line EARLIER QUESTION block,
        // already gated by IntelligenceEngine; '' or undefined = today's bytes. Verbal framing only —
        // the coding path ignores it. Its own argument, so cleanedTranscript (the classifier's input
        // and the knowledge lookup's last line) and temporalContext stay byte-identical.
        earlierQuestionBlock?: string,
```

After the PREVIOUS RESPONSES push (the `if (temporalContext && temporalContext.hasRecentResponses) { … }` block, before `const extraContext = contextParts.join('\n\n');` at line 227), add:

```ts
            // The last context part before INTERVIEWER JUST SAID (spec §3.4 placement; m5: the
            // coding check is made here because isCodingForFraming is declared after the join).
            if (intentResult?.intent !== 'coding' && earlierQuestionBlock) {
                contextParts.push(earlierQuestionBlock);
            }
```

Nothing else in the file changes.

- [ ] **Step 4: Run the test; expect PASS (7 passed, the characterization test still green).** Then re-run the neighbours that pin this assembly: `electron/llm/WhatToAnswerLLM.liveEars.test.ts`, `WhatToAnswerLLM.cues.test.ts`, `WhatToAnswerLLM.hedgeCues.test.ts`, `WhatToAnswerLLM.leadingChars.test.ts`, `WhatToAnswerLLM.negotiationCard.test.ts` (all must stay green: with no 9th argument nothing changed). Both type-check gates.

- [ ] **Step 4b: The hedge's legs receive the same bytes (review m10)**

"Same bytes to every leg" was structural until now: Task 5's helper is a stub and `LLMHelper.verbalHedge` tests do not assert it. Append ONE case to `electron/llm/WhatToAnswerLLM.hedgeCues.test.ts` (the real `WhatToAnswerLLM` over the real `LLMHelper`, only the SDK stubbed; its `plan`/`signals`/`asked` helpers are reused as they are), inside the `describe('hedge x cue mode')`:

```ts
    it('E. every leg of one answer receives the same contents, EARLIER QUESTION block included (plan review m10)', async () => {
        vi.useFakeTimers();
        plan.push('silent', CHUNKED);                                   // the front stalls, the back answers after the trigger
        const block = 'EARLIER QUESTION (asked earlier; context only, do not answer it again; answer only the question under INTERVIEWER JUST SAID):\n- Which index would you add first?';
        const out = drain(new WhatToAnswerLLM(new LLMHelper('fake-gemini-key')).generateStream('How much memory does it take?', undefined, TECHNICAL, undefined, undefined, undefined, undefined, vi.fn(), block));
        await vi.advanceTimersByTimeAsync(5000);
        await out;
        expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
        const texts = generateContentStream.mock.calls.map((c) => JSON.stringify(c[0].contents));
        expect(texts[1]).toBe(texts[0]);
        expect(texts[0]).toContain('EARLIER QUESTION (asked earlier');
        expect(texts[0].indexOf('EARLIER QUESTION')).toBeLessThan(texts[0].indexOf('INTERVIEWER JUST SAID'));
    });
```

Run `electron/llm/WhatToAnswerLLM.hedgeCues.test.ts`: E passes (and A–D unchanged). Calibrate with a test-side mutant — temporarily assert `expect(texts[1]).toBe(texts[0] + 'x')` and watch E fail, then restore: the legs share one `fullMessage` by construction in `LLMHelper`'s hedge, so no code mutant separates them without rewriting the hedge; the mutant proves the test reads BOTH legs' `contents`, which is what was unproven. The test is committed with this task.

- [ ] **Step 5: Calibrate**

Move the new `push` ABOVE the PREVIOUS RESPONSES push: the "non-empty" test must FAIL (the block would no longer be the last part) and the characterization test must still PASS (it has no block). Restore.

- [ ] **Step 6: Commit**

```
git -C "<WT>" add electron/llm/WhatToAnswerLLM.ts electron/llm/WhatToAnswerLLM.earlierQuestion.test.ts electron/llm/WhatToAnswerLLM.hedgeCues.test.ts
git -C "<WT>" commit -m "feat(earlier-question): WhatToAnswerLLM.generateStream takes the block as its own argument, last context part, verbal only"
```

---

### Task 6: IntelligenceEngine builds the block, logs the diag line, writes the ledger

**Files:**
- Modify: `electron/IntelligenceEngine.ts:16-18` (imports), `:249-259` (options type), `:354-357` (after the pinned-question log), `:424` (the `generateStream` call)
- Modify: `electron/IntelligenceManager.ts:342-349` (the forwarded options type)
- Test: `electron/IntelligenceEngine.earlierQuestion.test.ts`

**Interfaces:**
- Consumes: `earlierQuestionEnabled`, `buildEarlierQuestion`, `interviewerLinesBefore`, `formatBlock` (Task 2); `SessionTracker.recordAskedQuestion/getAskedQuestions` (Task 4); the 9th `generateStream` argument (Task 5).
- Produces: `runWhatShouldISay(question, confidence, imagePaths, options)` accepts `turnId?: number | null` (both in the engine and in `IntelligenceManager`). Task 7 passes it from `main.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';
import { EARLIER_QUESTION_ENV, formatBlock } from './llm/earlierQuestion';

const stubHelper = () => ({} as any);
/** Captures EVERY argument of each generateStream call; the block is args[8]. */
function captureCalls() {
    const calls: any[][] = [];
    vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* (...args: any[]) { calls.push(args); yield 'A stubbed answer.'; });
    return calls;
}
// Invented sentences (the reference's); none is a roster or holdout sentence.
const PARENT = 'Describe how you would shard the telemetry store by tenant.';
const FOLLOWUP = 'How would you rebalance those shards after a tenant doubles in size?';   // pronoun cue
const OTHER = 'Explain how you would audit access to the telemetry store.';            // no cue
const AUTO = { intentOverride: 'verbal' as const, bypassCooldown: true };
const T0 = new Date('2026-10-04T10:00:00Z');

/** The parent is dispatched on the auto path (turn 1) at T; the follow-up's final lands gapMs later. SessionTracker evicts context older than 120 s on every add. */
async function sessionAfterGap(gapMs: number, parentTurnId: number | null = 1): Promise<{ session: SessionTracker; calls: any[][] }> {
    const session = new SessionTracker();
    const calls = captureCalls();
    const T = T0.getTime();
    session.handleTranscript({ speaker: 'interviewer', text: PARENT, timestamp: T, final: true, confidence: 1 });
    await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(PARENT, 1.0, undefined, { ...AUTO, ...(parentTurnId === null ? {} : { turnId: parentTurnId }) });
    vi.setSystemTime(T + gapMs);
    session.handleTranscript({ speaker: 'interviewer', text: FOLLOWUP, timestamp: T + gapMs, final: true, confidence: 1 });
    vi.setSystemTime(T + gapMs + 1_000);
    return { session, calls };
}
const diagLines = (logSpy: ReturnType<typeof vi.spyOn>) => logSpy.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('[IntelligenceEngine] earlier question:'));

describe('runWhatShouldISay and the EARLIER QUESTION block (spec 2026-10-03 §3.5–3.6)', () => {
    const saved = { eq: process.env[EARLIER_QUESTION_ENV], parent: process.env.NATIVELY_FOLLOWUP_PARENT };
    let logSpy: ReturnType<typeof vi.spyOn>;
    // m11: a shell value of NATIVELY_FOLLOWUP_PARENT would rewrite the transcript under every assertion below.
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); delete process.env.NATIVELY_FOLLOWUP_PARENT; logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); });
    afterEach(() => {
        vi.useRealTimers(); vi.restoreAllMocks();
        const back = (k: string, v: string | undefined) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };
        back(EARLIER_QUESTION_ENV, saved.eq); back('NATIVELY_FOLLOWUP_PARENT', saved.parent);
    });

    it('flag unset (shipped): no block, no diag line, no ledger write, the call is today\'s shape (review I4)', async () => {
        delete process.env[EARLIER_QUESTION_ENV];
        const { session, calls } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        // The first eight arguments are what the pre-change engine passes (IntelligenceEngine.ts:424 at 89c8f53):
        // transcript, temporal context, intent, no images, no forceFastModel, no onSuggestions, no liveTexts, onCues.
        expect(calls[1].slice(0, 8)).toEqual([
            `[INTERVIEWER]: ${FOLLOWUP}`,
            expect.objectContaining({ hasRecentResponses: expect.any(Boolean) }),
            expect.objectContaining({ intent: expect.any(String) }),
            undefined, undefined, undefined, undefined, expect.any(Function),
        ]);
        expect(calls[1][8] ?? '').toBe('');
        expect(diagLines(logSpy)).toEqual([]);
        expect(session.getAskedQuestions()).toEqual([]);
    });
    it('flag on, auto path, parent evicted (156 s): the block is the parent line, the transcript is byte-identical to flag off, the diag line names the turn', async () => {
        delete process.env[EARLIER_QUESTION_ENV];
        const off = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), off.session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        vi.setSystemTime(T0);
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(calls[1][8]).toBe(formatBlock(PARENT));
        expect(calls[1][0]).toBe(off.calls[1][0]);
        expect(session.getAskedQuestions()).toEqual([{ text: PARENT, turnId: 1, seq: 1 }, { text: FOLLOWUP, turnId: 2, seq: 2 }]);
        const lines = diagLines(logSpy);
        expect(lines.at(-1)).toMatch(/^\[IntelligenceEngine\] earlier question: gate=block cue=pronoun chars=\d+ turn=2 ms=\d+$/);
    });
    it('the diag line carries counts, never text (Review Focus 4)', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        for (const l of diagLines(logSpy)) { expect(l).not.toContain('shard'); expect(l).not.toContain('rebalance'); }
    });
    it('flag on, short gap (60 s): the parent is in the prompt -> "" and gate=parent-in-prompt', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(60_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(calls[1][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=parent-in-prompt cue=pronoun chars=0 turn=2');
    });
    it('flag on, chip click (contextOverride, no turnId): ledger written with turnId null, block "" (gate=no-turn)', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { intentOverride: 'verbal', contextOverride: `[INTERVIEWER]: ${FOLLOWUP}` });
        expect(calls[1][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=no-turn cue=pronoun chars=0 turn=none');
        expect(session.getAskedQuestions().at(-1)).toEqual({ text: FOLLOWUP, turnId: null, seq: 2 });
    });
    it('flag on, supersede (replaceAnswer, same turn id as the head): "" and the ledger removes the head, pushes the merged text newest', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(10_000, 1);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(`${PARENT} ${FOLLOWUP}`, 1.0, undefined, { ...AUTO, turnId: 1, replaceAnswer: true });
        expect(calls[1][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=supersede');
        expect(session.getAskedQuestions()).toEqual([{ text: `${PARENT} ${FOLLOWUP}`, turnId: 1, seq: 2 }]);
    });
    it('flag on, the ledger write throws: "" , ONE diag line (gate=error, no gate=block before it), the answer is still delivered and the history untouched', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(156_000);
        const linesBefore = diagLines(logSpy).length;
        vi.spyOn(session, 'recordAskedQuestion').mockImplementation(() => { throw new Error('boom'); });
        const historyBefore = session.getAssistantResponseHistory().length;
        const answer = await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(answer).toBe('A stubbed answer.');
        expect(calls[1][8]).toBe('');
        const lines = diagLines(logSpy).slice(linesBefore);
        expect(lines).toHaveLength(1);                                   // m1: build -> write -> log once
        expect(lines[0]).toMatch(/^\[IntelligenceEngine\] earlier question: gate=error cue=none chars=0 turn=2 ms=\d+/);
        expect(session.getAssistantResponseHistory().length).toBe(historyBefore + 1);
    });
    it('flag unset: the ledger is never read (m2: flag off returns before anything is read, built, logged or written)', async () => {
        delete process.env[EARLIER_QUESTION_ENV];
        const { session } = await sessionAfterGap(156_000);
        const ledgerRead = vi.spyOn(session, 'getAskedQuestions');
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(ledgerRead).not.toHaveBeenCalled();
        expect(diagLines(logSpy)).toEqual([]);
    });
    it('junk flag at call time (belt and braces; startup refuses first): gate=error, "" , the answer still delivered', async () => {
        process.env[EARLIER_QUESTION_ENV] = 'yes';
        const session = new SessionTracker();
        const calls = captureCalls();
        session.handleTranscript({ speaker: 'interviewer', text: FOLLOWUP, timestamp: T0.getTime(), final: true, confidence: 1 });
        const answer = await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(answer).toBe('A stubbed answer.');
        expect(calls[0][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=error');
    });
    it('flag on, no pinned question (settled null): nothing written, gate=no-question', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const { session, calls } = await sessionAfterGap(156_000);
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay('', 1.0, undefined, { ...AUTO, turnId: 5 });
        expect(calls[1][8]).toBe('');
        expect(diagLines(logSpy).at(-1)).toContain('gate=no-question cue=none chars=0 turn=5');
        expect(session.getAskedQuestions()).toEqual([{ text: PARENT, turnId: 1, seq: 1 }]);
    });
    it('two calls started without awaiting (Review Focus 3): ledger order = call order, and the second call\'s build already sees the first\'s write', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const session = new SessionTracker();
        captureCalls();
        const T = T0.getTime();
        session.handleTranscript({ speaker: 'interviewer', text: PARENT, timestamp: T, final: true, confidence: 1 });
        session.handleTranscript({ speaker: 'interviewer', text: FOLLOWUP, timestamp: T + 1_000, final: true, confidence: 1 });
        const engine = new IntelligenceEngine(stubHelper(), session);
        const a = engine.runWhatShouldISay(PARENT, 1.0, undefined, { ...AUTO, turnId: 1 });
        const b = engine.runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        await Promise.all([a, b]);
        expect(session.getAskedQuestions().map((e) => [e.text, e.turnId])).toEqual([[PARENT, 1], [FOLLOWUP, 2]]);
        const lines = diagLines(logSpy);
        expect(lines[0]).toContain('turn=1'); expect(lines[0]).toContain('gate=no-cue');
        expect(lines[1]).toContain('turn=2'); expect(lines[1]).toContain('gate=parent-in-prompt');   // not no-parent: call A's write landed before call B built
    });
    it('a coding main is recorded, so a verbal follow-up to it gets it (S1Q04F\'s case)', async () => {
        process.env[EARLIER_QUESTION_ENV] = '1';
        const session = new SessionTracker();
        const calls = captureCalls();
        const T = T0.getTime();
        session.handleTranscript({ speaker: 'interviewer', text: OTHER, timestamp: T, final: true, confidence: 1 });
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(OTHER, 1.0, ['C:/tmp/shot.png'], { intentOverride: 'coding', bypassCooldown: true, turnId: 1 });
        expect(calls[0][2].intent).toBe('coding');
        vi.setSystemTime(T + 156_000);
        session.handleTranscript({ speaker: 'interviewer', text: FOLLOWUP, timestamp: T + 156_000, final: true, confidence: 1 });
        await new IntelligenceEngine(stubHelper(), session).runWhatShouldISay(FOLLOWUP, 1.0, undefined, { ...AUTO, turnId: 2 });
        expect(calls[1][8]).toBe(formatBlock(OTHER));
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```
Set-Location "<TMP>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/IntelligenceEngine.earlierQuestion.test.ts --root "<WT>"
```

Expected: the "flag unset" test passes (control — it pins TODAY's call shape; if it fails here the expectation is wrong, not the code: correct it to the shape the unmodified engine passes, read from this run's diff, and say so in the commit message); every flag-on test FAILS (`calls[1][8]` undefined, no diag line, empty ledger). TypeScript may also reject `turnId` in the options object — that is the same failure.

- [ ] **Step 3: Implement**

`electron/IntelligenceEngine.ts` — add the import after `import { withParentExchange } from './llm/followUpParent';`:

```ts
import { earlierQuestionEnabled, buildEarlierQuestion, interviewerLinesBefore } from './llm/earlierQuestion';
```

Extend the `options` type of `runWhatShouldISay` after `replaceAnswer?: boolean;`:

```ts
            /** The machine turn's id on the auto turn path (main.ts turn dispatch/supersede); absent or null elsewhere. Spec 2026-10-03 §3.1. */
            turnId?: number | null;
```

Insert after the pinned-question log line (`if (settled) console.log(`[IntelligenceEngine] runWhatShouldISay: pinned question …`);`, line 356) and before the `temporalContext` comment:

```ts
            // Turn-based follow-up context (spec 2026-10-03 §3.5). The block is built from the ledger
            // BEFORE this call's own write, then the write, then ONE diag line — all synchronous, with
            // no await between them, so overlapping calls keep call order and a write can never change
            // the bytes of the call that makes it. Flag off: this step returns before anything is read,
            // built, logged or written (today's path). Any failure in here is today's prompt: the
            // answer, the history and the UI are untouched (§3.6). The diag line carries counts only:
            // `chars` is the block BUILT here; WhatToAnswerLLM drops it on the coding framing, which is
            // decided by classifyIntent after this line on the non-override path, so a coding call can
            // read `gate=block chars=N` with nothing inserted (plan review m3; STATES.md says so).
            let earlierQuestionBlock = '';
            try {
                if (earlierQuestionEnabled()) {
                    const t0 = Date.now();
                    const turnId = options.turnId ?? null;
                    const earlier = buildEarlierQuestion({
                        question: settled, turnId, supersede: options.replaceAnswer === true,
                        ledger: this.session.getAskedQuestions(), promptLines: interviewerLinesBefore(preparedTranscript),
                    });
                    if (settled) this.session.recordAskedQuestion(settled, turnId);
                    earlierQuestionBlock = earlier.block;
                    console.log(`[IntelligenceEngine] earlier question: gate=${earlier.why || 'block'} cue=${earlier.cue} chars=${earlier.block.length} turn=${turnId ?? 'none'} ms=${Date.now() - t0}`);
                }
            } catch (e) {
                earlierQuestionBlock = '';
                console.log(`[IntelligenceEngine] earlier question: gate=error cue=none chars=0 turn=${options.turnId ?? 'none'} ms=0 error=${JSON.stringify((e as Error)?.message ?? String(e))}`);
            }
```

The order is build → write → log (review m1): a write that throws produces exactly one line, `gate=error`, never a `gate=block` followed by it — the smoke checker pairs each pinned line with the FIRST diag line after it. A junk flag value throws in `earlierQuestionEnabled()` and lands in the same `catch`.

Change the `generateStream` call (line 424) to pass the block as the 9th argument:

```ts
            const stream = this.whatToAnswerLLM.generateStream(preparedTranscript, temporalContext, intentResult, imagePaths, options.forceFastModel, undefined, options.liveTexts, onCues, earlierQuestionBlock);
```

`electron/IntelligenceManager.ts` — in `runWhatShouldISay`'s options type (lines 342–349) add after `replaceAnswer?: boolean;`:

```ts
            turnId?: number | null;
```

Nothing else changes: `withParentExchange` stays (flag off), the pinned log line stays, `classifyIntent` and `temporalContext` read what they read today.

- [ ] **Step 4: Run the test; expect PASS (12 passed).** Then the neighbours: `electron/IntelligenceEngine.followUpParent.test.ts`, `IntelligenceEngine.pinnedQuestion.test.ts`, `IntelligenceEngine.cues.test.ts`, `IntelligenceEngine.codingAdvisory.test.ts`, `IntelligenceEngine.cooldown.test.ts` (green; their `generateStream` spies take only the first argument and ignore the rest). Both type-check gates.

- [ ] **Step 5: Calibrate**

1. Move the `recordAskedQuestion` write ABOVE `buildEarlierQuestion` (write-then-build): the "parent evicted" test must FAIL (the parent would be the follow-up itself → `parent-in-pinned`) and the overlapping-calls test must change its reading. Restore.
2. Move the `console.log` ABOVE the write (log-then-write): the "ledger write throws" test must FAIL (two lines). Restore.
3. Hoist `const ledger = this.session.getAskedQuestions();` ABOVE the `if (earlierQuestionEnabled())` (the plan's first shape, which read the ledger with the flag off): the "never called" test must FAIL. Restore.

- [ ] **Step 6: Commit**

```
git -C "<WT>" add electron/IntelligenceEngine.ts electron/IntelligenceManager.ts electron/IntelligenceEngine.earlierQuestion.test.ts
git -C "<WT>" commit -m "feat(earlier-question): runWhatShouldISay builds the block, logs one diag line, writes the ledger — same tick, fail-safe to today's prompt"
```

---

### Task 7: The turn id reaches the call — main.ts and turnDispatch; the startup check

**Files:**
- Modify: `electron/services/turnDispatch.ts` (`turnDispatchInput` gains a `turnId` parameter)
- Modify: `electron/services/turnDispatch.test.ts` (two cases)
- Modify: `electron/main.ts:206-229` (`DetectionInput.turnId`), `:1005`, `:1017`, `:1020` (the three `turnDispatchInput` calls), `:2194` (`answerDetection` forwards it), `:259` and `:3448` (startup check)

**Interfaces:**
- Consumes: `describeEarlierQuestionAtStartup` (Task 2); `turnId` option (Task 6).
- Produces: `turnDispatchInput(base, d, turnId: number | null)` → the input carries `turnId` when non-null; `DetectionInput.turnId?: number`; `answerDetection` passes `turnId` to `runWhatShouldISay`; `main.ts` logs `[Main] earlier question: on|off` at startup and exits on a bad value.

`main.ts` has no unit tests; its three lines are proven ONLY by Task 10's smoke — an omitted forward reads `gate=no-turn … turn=none` on every auto-path call there, a correct one reads `turn=<id>` (review m8). The pure seam `turnDispatchInput` is unit-tested here.

`electron/tsconfig.json` includes `**/*.ts`, tests included: making `turnId` a required third parameter turns the two EXISTING 2-argument calls in `turnDispatch.test.ts` (`:56` in "builds the DetectionInput …", `:76` in "also works on a supersede decision") into TS2554 errors — vitest stays green (it does not type-check) but the electron gate grows by 2. Step 3 changes those two calls to pass `null`; the parameter stays REQUIRED (an optional one would let a future `main.ts` call silently drop the id) (review I3).

- [ ] **Step 1: Write the failing test** — append to `electron/services/turnDispatch.test.ts` inside a new `describe`:

```ts
describe('turnDispatchInput — the machine turn id rides the DetectionInput (spec 2026-10-03 §3.1)', () => {
    const dispatch = { kind: 'dispatch', text: 'What is a DAG?', live: [], finished: true, gateMs: 1200, finals: 1, fromLive: false } as Extract<TurnDecision, { kind: 'dispatch' }>;
    it('carries the turn id when the machine has one', () => {
        expect(turnDispatchInput(detection(), dispatch, 7).turnId).toBe(7);
        expect(turnDispatchInput(detection(), dispatch, 0).turnId).toBe(0);
    });
    it('carries no turnId key at all when the id is null', () => {
        expect('turnId' in turnDispatchInput(detection(), dispatch, null)).toBe(false);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```
Set-Location "<TMP>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/services/turnDispatch.test.ts --root "<WT>"
```

Expected: FAIL (type error: expected 2 arguments; `turnId` undefined).

- [ ] **Step 3: Implement**

`electron/services/turnDispatch.ts` — replace `turnDispatchInput`:

```ts
/** The DetectionInput the turn's dispatch/supersede sends through dispatchDetection. `turnId` is the machine turn's id, captured here at dispatch (spec 2026-10-03 §3.1): the answer call's ledger key and the only path that gets an EARLIER QUESTION block. */
export function turnDispatchInput<T extends MarkedDetection>(base: T, d: Extract<TurnDecision, { kind: 'dispatch' | 'supersede' }>, turnId: number | null): T & { anchor: string; liveTexts: string[]; turnDispatch: true; resolving: true; turnId?: number } {
    return { ...base, question: d.text, anchor: d.text, liveTexts: d.live, turnDispatch: true, resolving: true, ...(turnId != null ? { turnId } : {}) };
}
```

`electron/services/turnDispatch.test.ts` — the two existing calls become three-argument calls, nothing else in those cases changes:

```ts
        const input = turnDispatchInput(base, decision, null);        // line 56 ("builds the DetectionInput …")
        const input = turnDispatchInput(base, decision, null);        // line 76 ("also works on a supersede decision")
```

`electron/main.ts`:

In `interface DetectionInput` after `turnDispatch?: true;`:

```ts
  /** Set on a turn dispatch/supersede: the machine turn's id at dispatch (spec 2026-10-03 §3.1) — runWhatShouldISay's ledger key; absent on every other path, which then gets no EARLIER QUESTION block. */
  turnId?: number;
```

The three `turnDispatchInput(base, d)` calls in `actOnTurn` (lines 1005, 1017, 1020) become `turnDispatchInput(base, d, this.turn.snapshot().id)`.

In `answerDetection` (line 2194) add the forward:

```ts
    await this.intelligenceManager.runWhatShouldISay(d.question, 1.0, imagePaths, { intentOverride: intent, bypassCooldown: true, ...(d.liveTexts?.length ? { liveTexts: d.liveTexts } : {}), ...(opts.replace ? { replaceAnswer: true } : {}), ...(d.turnId != null ? { turnId: d.turnId } : {}) });
```

Import, after `import { describeFollowUpParentAtStartup } from './llm/followUpParent'`:

```ts
import { describeEarlierQuestionAtStartup } from './llm/earlierQuestion'
```

Startup (line 3448), inside the existing `try`, after the follow-up line:

```ts
    console.log(`[Main] ${describeEarlierQuestionAtStartup()}`)
```

The existing `catch` already logs `— refusing to start` and `app.exit(1)`.

- [ ] **Step 4: Run the turnDispatch test; expect PASS.** Both type-check gates: the electron list must equal the baseline exactly — `main.ts` AND `turnDispatch.test.ts` compile under the electron config, so a wrong option name or a leftover 2-argument call shows up here (the list would grow by 2).

- [ ] **Step 5: Calibrate (review m8)**

In `turnDispatchInput` drop the `...(turnId != null ? { turnId } : {})` spread → "carries the turn id" must FAIL (and "no turnId key" still passes). Restore.

- [ ] **Step 6: Commit**

```
git -C "<WT>" add electron/services/turnDispatch.ts electron/services/turnDispatch.test.ts electron/main.ts
git -C "<WT>" commit -m "feat(earlier-question): the turn id rides the DetectionInput from dispatch to runWhatShouldISay; NATIVELY_EARLIER_QUESTION validated at startup"
```

---

### Task 7b: The flight harness's same-bytes control — `interview60.answers.mjs --no-block` (PREREGISTER-flight-eq §7 b4, ruling §11.1)

**Files:**
- Create: `electron/test/golden/earlierQuestionArm.mjs` (pure string functions, `cueArm.mjs`'s shape)
- Test: `electron/test/golden/earlierQuestionArm.test.ts` (`cueArm.test.ts`'s shape; the fixture half is local-only, skipped when absent)
- Modify: `electron/test/golden/interview60.answers.mjs` (`:28` import; after the `--cues/--no-cues` block ending `:109`; the `CAPTURED` precheck `:301-308`; the header line `:311`; the call `:318`)

**Interfaces:**
- Consumes: `LABEL`, `formatBlock` (Task 2) — in the test directly from `../../llm/earlierQuestion`; in the harness from the BUILT `dist-electron/electron/llm/earlierQuestion.js` (the harness is plain node and already reads `prompts.js` from the dist), required lazily so an older dist still runs every other arm.
- Produces: `splitEarlierQuestion(user, label) → { user, block } | null`; `withEarlierQuestion(user, block) → string` (the replay's `insertBlock`); the CLI option `--no-block` (needs `--captured` and `--tag`; exclusive with `--cues`/`--no-cues` — one prompt variable per arm, the harness's standing rule; refuses Groq; REFUSES with exit 2 any captured prompt whose user turn does not carry exactly one block immediately before `INTERVIEWER JUST SAID:\n`, naming the id only). What b4 asks: "removes `${LABEL}\n- <one line>\n\n` immediately before `INTERVIEWER JUST SAID:\n`; REFUSES (exit 2) any captured prompt that carries no block (so it runs with `--only <G>`); never prints a prompt. Tests (vitest, the byte rule in reverse): `insertBlock(strip(user), block) === user` on the parity fixtures' `userB`, and a `userA` is refused."

The flight-side arm rows (`captured-no-block-high` r1–r5 on 3.5-lite HIGH with `--only <G>`, a `when: hasBlock` gate like `hasCueRule`) belong to the flight registration's own harness edit (PREREGISTER §2, beside ruling 3's rows), not to this plan: this task delivers the option they call.

- [ ] **Step 1: Write the failing test**

`electron/test/golden/earlierQuestionArm.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore — untyped ESM harness module
import { splitEarlierQuestion, withEarlierQuestion } from './earlierQuestionArm.mjs';
import { LABEL, formatBlock } from '../../llm/earlierQuestion';

/**
 * The flight's same-bytes control (PREREGISTER-flight-eq §7 b4): answers.mjs --no-block replays a captured user
 * turn with the EARLIER QUESTION block removed byte for byte and refuses a turn that carries none. The byte rule
 * in reverse: withEarlierQuestion(split(user).user, split(user).block) === user.
 */
const PARENT = 'Describe how you would shard the telemetry store by tenant.';
const TRANSCRIPT = '[INTERVIEWER]: first question?\n[INTERVIEWER]: How would you rebalance those shards after a tenant doubles in size?';
const TRAILER = '\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):';
const INTENT = '<intent_and_shape>\nDETECTED INTENT: general\nANSWER SHAPE: spoken\n</intent_and_shape>';
const OFF_BARE = `INTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`;
const OFF_CTX = `${INTENT}\n\nPREVIOUS RESPONSES (Avoid Repetition):\n1. "I would rank per department."\n\nINTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`;
const BLOCK = formatBlock(PARENT);

describe('--no-block: the EARLIER QUESTION block of a captured user turn, removed byte for byte', () => {
    it('strip then insert round-trips both shapes (the block the only context part, and the last of several)', () => {
        for (const off of [OFF_BARE, OFF_CTX]) {
            const on = withEarlierQuestion(off, BLOCK);
            expect(on).not.toBe(off);
            const s = splitEarlierQuestion(on, LABEL)!;
            expect(s).not.toBeNull();
            expect(s.block).toBe(BLOCK);
            expect(s.user).toBe(off);
            expect(withEarlierQuestion(s.user, s.block)).toBe(on);
        }
    });
    it('refuses a turn without a block, a block that is not the last context part, two labels, and a two-line block', () => {
        expect(splitEarlierQuestion(OFF_CTX, LABEL)).toBeNull();
        expect(splitEarlierQuestion(`${BLOCK}\n\n${OFF_CTX}`, LABEL)).toBeNull();                                      // PREVIOUS RESPONSES sits between the block and the marker
        expect(splitEarlierQuestion(withEarlierQuestion(`${LABEL}\n- x\n\n${OFF_BARE}`, BLOCK), LABEL)).toBeNull();     // two labels
        expect(splitEarlierQuestion(withEarlierQuestion(OFF_BARE, `${BLOCK}\n- a second line`), LABEL)).toBeNull();   // two parent lines
    });
    it('the stripped turn ends with the untouched transcript and trailer; an empty block is identity', () => {
        expect(splitEarlierQuestion(withEarlierQuestion(OFF_CTX, BLOCK), LABEL)!.user.endsWith(`INTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`)).toBe(true);
        expect(withEarlierQuestion(OFF_CTX, '')).toBe(OFF_CTX);
    });
});

// The replay's captured turns (userA = the flag-off bytes, userB = userA with the block inserted; checked on all
// 21 entries 2026-10-04): local only, read from NATIVELY_EQ_PARITY_DIR's `<hour>-gated-turn.json`, never
// committed, never printed; skipped when absent. Keys and lengths only on a failure.
const DIR = process.env.NATIVELY_EQ_PARITY_DIR;
const GATED = DIR && fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^s50[klm]-gated-turn\.json$/.test(f)).sort() : [];
describe.skipIf(GATED.length === 0)('--no-block on the replay\'s captured turns (local fixtures)', () => {
    for (const f of GATED) {
        it(`${f}: every gated entry's userB strips to its userA and re-inserts to userB; userA is refused`, () => {
            const fx = JSON.parse(fs.readFileSync(path.join(DIR!, f), 'utf8')) as Record<string, { userA: string; userB: string; block: string }>;
            const bad: string[] = [];
            for (const [key, e] of Object.entries(fx)) {
                const s = splitEarlierQuestion(e.userB, LABEL);
                if (!s) { bad.push(`${key}: userB refused`); continue; }
                if (s.block !== e.block) bad.push(`${key}: block ${s.block.length}/${e.block.length} chars`);
                if (s.user !== e.userA) bad.push(`${key}: stripped ${s.user.length}/${e.userA.length} chars`);
                if (withEarlierQuestion(s.user, s.block) !== e.userB) bad.push(`${key}: round trip ${withEarlierQuestion(s.user, s.block).length}/${e.userB.length} chars`);
                if (splitEarlierQuestion(e.userA, LABEL) !== null) bad.push(`${key}: userA not refused`);
            }
            expect(bad).toEqual([]);
            expect(Object.keys(fx)).toHaveLength(7);
        });
    }
});
```

- [ ] **Step 2: Run it and watch it fail**

```
Set-Location "<TMP>"; $env:NATIVELY_EQ_PARITY_DIR = "<F>\R"; node "<MAIN>\node_modules\vitest\vitest.mjs" run electron/test/golden/earlierQuestionArm.test.ts --root "<WT>"
```

Expected: FAIL — `Failed to resolve import "./earlierQuestionArm.mjs"`.

- [ ] **Step 3: Write the module**

`electron/test/golden/earlierQuestionArm.mjs`:

```js
/**
 * EARLIER QUESTION variants of a captured user turn, for the flight's same-bytes control
 * (PREREGISTER-flight-eq §7 b4): the block the app inserted (spec 2026-10-03 §3.4: the last
 * context part, `${LABEL}\n- <one line>`, joined with "\n\n" before INTERVIEWER JUST SAID),
 * removed byte for byte. Pure string functions, so interview60.answers.mjs stays a runner and
 * these stay tested without a key or a build.
 */
const MARKER = 'INTERVIEWER JUST SAID:\n';

/**
 * Splits a captured user turn into { user, block }: `block` is the one EARLIER QUESTION block
 * placed immediately before the marker, `user` the turn with `${block}\n\n` removed — the
 * flag-off bytes of the same call. Returns null when the turn carries no label, more than one,
 * a label that is not the start of a block, a block of more than one parent line, or a block
 * not immediately before the marker: the caller refuses rather than sending bytes it did not
 * strip, which would bench a different control from the registered one.
 */
export function splitEarlierQuestion(user, label) {
    const head = `${label}\n- `;
    const first = user.indexOf(label);
    if (first < 0 || !user.startsWith(head, first) || user.indexOf(label, first + 1) >= 0) return null;
    const mi = user.indexOf(MARKER, first);
    if (mi < 0) return null;
    const removed = user.slice(first, mi);                       // `${label}\n- <line>\n\n`
    if (!removed.endsWith('\n\n')) return null;
    const block = removed.slice(0, -2);
    if (block.slice(head.length).includes('\n')) return null;    // exactly one parent line, nothing between it and the marker
    return { user: user.slice(0, first) + user.slice(mi), block };
}

/** The replay's insertBlock: `${block}\n\n` immediately before the marker; '' is identity. */
export function withEarlierQuestion(user, block) {
    if (!block) return user;
    const i = user.indexOf(MARKER);
    if (i < 0) throw new Error('no INTERVIEWER JUST SAID marker');
    return `${user.slice(0, i)}${block}\n\n${user.slice(i)}`;
}
```

- [ ] **Step 4: Run the test; expect PASS** — 6 passed (3 invented + 3 fixture hours, 21 entries). Without `NATIVELY_EQ_PARITY_DIR`: 3 passed, 3 skipped.

- [ ] **Step 5: Calibrate**

1. In `splitEarlierQuestion` drop the `user.indexOf(label, first + 1) >= 0` clause → the "two labels" refusal must FAIL. Restore.
2. Change `removed.slice(0, -2)` to `removed.slice(0, -1)` → every round-trip assertion must FAIL (the stripped user keeps one `\n`). Restore.

- [ ] **Step 6: The harness option**

`electron/test/golden/interview60.answers.mjs`:

Import, after `import { carriesCueRule, withCueRule, withoutCueRule } from './cueArm.mjs';`:

```js
import { splitEarlierQuestion } from './earlierQuestionArm.mjs';
```

After the `cueVariant` definition (the line ending `: captured;` at `:109`):

```js
// --no-block (PREREGISTER-flight-eq §7 b4): the captured user turn with the EARLIER QUESTION block
// removed byte for byte — a flag-on hour's same-bytes control. Needs --captured and --tag, is one
// prompt variable per arm (exclusive with --cues/--no-cues), and refuses any captured prompt that
// carries no block, so it runs with --only <the gated ids>. The label is read from the BUILT module,
// lazily: an older dist without it still runs every other arm.
const NO_BLOCK = process.argv.includes('--no-block');
if (NO_BLOCK && !CAPTURED) { console.error('--no-block needs --captured: the plain arm sends no block to strip'); process.exit(2); }
if (NO_BLOCK && !TAG) { console.error('--no-block needs --tag <name>, or the variant would overwrite the plain arm'); process.exit(2); }
if (NO_BLOCK && (CUES_ADD || CUES_STRIP)) { console.error('--no-block and --cues/--no-cues are exclusive: one prompt variable per arm'); process.exit(2); }
if (NO_BLOCK && IS_GROQ) { console.error('--no-block replays captured Gemini bytes; the Groq arms have no captured prompt'); process.exit(2); }
const EQ_LABEL = NO_BLOCK ? require(path.join(PROJ, 'dist-electron/electron/llm/earlierQuestion.js')).LABEL : null;
const blockVariant = (captured) => !captured || !NO_BLOCK ? captured : { ...captured, user: splitEarlierQuestion(captured.user, EQ_LABEL).user };
```

In the `if (CAPTURED) { … }` precheck, after the `if (CUES_ADD || CUES_STRIP) { … }` block:

```js
    if (NO_BLOCK) {
        for (const id of ids) {
            if (splitEarlierQuestion(CAPTURED[id].user, EQ_LABEL) === null) { console.error(`--no-block: the captured prompt for ${id} carries no EARLIER QUESTION block immediately before INTERVIEWER JUST SAID — the id is not in G; run with --only <the gated ids>`); process.exit(2); }
        }
    }
```

The header line (`console.log(\`ANSWER-ONLY PASS …`) gains, after the cues clause: `${NO_BLOCK ? '  block=stripped from the captured prompt' : ''}`.

The call at `:318` becomes `r = await answerStreamed(item.q, blockVariant(cueVariant(CAPTURED?.[item.id] ?? null)));`. `sentSystem` (`:336`) is unchanged: the block lives in the user turn, the cue checks read the system prompt. Nothing else in the file changes.

- [ ] **Step 7: Prove the two option checks that run before the dist is touched**

The harness refuses a missing key first (`:42`) and reads the dist `prompts.js` at import, so in the worktree (no `.env`, no `dist-electron`) only the checks that precede the lazy `require` can be probed, with a dummy key that no call ever uses:

```
Set-Location "<TMP>"; $env:GEMINI_API_KEY = 'not-a-key'
node "<WT>\electron\test\golden\interview60.answers.mjs" --no-block --tag x; $LASTEXITCODE                                       # 2: --no-block needs --captured
node "<WT>\electron\test\golden\interview60.answers.mjs" --no-block --captured "<F>\R\turn-parity-s50m.json"; $LASTEXITCODE      # 2: --no-block needs --tag (checked before the dist require)
Remove-Item Env:GEMINI_API_KEY
```

If the first probe fails on `dist-electron/electron/llm/prompts.js` instead, the worktree has no dist: run both from `<MAIN>` instead (the import succeeds there; the two checks still fire before any request). The refusal on a REAL captured file without blocks is Task 9 Step 5b (MAIN's dist, after the landing); the strip on real blocks is Task 10 Step 6. Record both exit codes.

- [ ] **Step 8: Commit**

```
git -C "<WT>" add electron/test/golden/earlierQuestionArm.mjs electron/test/golden/earlierQuestionArm.test.ts electron/test/golden/interview60.answers.mjs
git -C "<WT>" commit -m "feat(harness): interview60.answers.mjs --no-block strips the EARLIER QUESTION block from a captured prompt byte for byte and refuses a prompt without one (flight-eq b4)"
```

---

### Task 8: Whole-branch gates and the Opus review

**Files:** none new. Runs in `<WT>`.

- [ ] **Step 1: Full suite from the worktree root** (cwd = `<WT>`, so cwd-relative writes land in the worktree, never MAIN; the two fixture-relative files need this cwd):

```
Set-Location "<WT>"; node "<MAIN>\node_modules\vitest\vitest.mjs" run --root "<WT>" | Tee-Object -FilePath "<F>\build\full-suite.txt" | Select-Object -Last 15
```

Expected: 0 failed. Known exception: `electron/test/golden/interview60.prompts.test.ts` fails in a fresh worktree until `dist-electron` exists there — if it does, run `node scripts/build-electron.js --force` with cwd = `<WT>` (the script resolves against its own root) and re-run; then `git -C "<WT>" status --ignored` must show only `dist-electron/`, `node_modules/.vite/` and `*.log` under ignored. Record the pass/fail/skip counts. The suite rewrites two TRACKED files (review m4; this very worktree shows them modified): restore them right after the run —

```
git -C "<WT>" checkout -- electron/test/golden/interview60.report.md natively_debug.log.1
```

- [ ] **Step 2: Parity against the fixtures and the captured prompts once more on the final tree** (Task 3 Step 3 command, BOTH env vars set). Expected: **7 passed**, nothing skipped. A `skipped` result is a FAIL of this step (a path is wrong, or L lost the fixtures): stop, do not proceed to the review. Also Task 7b's fixture half: `earlierQuestionArm.test.ts` with `NATIVELY_EQ_PARITY_DIR` set → 6 passed.

- [ ] **Step 3: Both type-check gates on the final tree** (MAIN's compiler, as above); the electron error list must equal `<F>\build\tsc-electron-baseline.txt` exactly (`Compare-Object` prints nothing).

- [ ] **Step 4: Clean the worktree of test residue**

```
(Get-Item "<WT>\node_modules" -ErrorAction SilentlyContinue).Attributes      # must NOT contain ReparsePoint: a junction into MAIN's node_modules would be emptied by the Remove-Item below (m4)
Remove-Item -Recurse -Force "<WT>\node_modules\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "<WT>\dist-electron" -ErrorAction SilentlyContinue
git -C "<WT>" status --porcelain
```

If `node_modules` is a reparse point, remove only `.vite` inside it and say so. Expected: empty status (only committed changes on `build/earlier-question`).

- [ ] **Step 5: Enumerate the states, then request the review**

Write `<F>\plan\STATES.md`: for each branch of the change (flag off / on; turnId present / null; supersede; coding; ledger throw; junk flag; each `why`; `--no-block` accept / each refusal), which test exercised it and which only a live run can (the `main.ts` lines — proven only by the smoke's `turn=<id>`; the startup refusal; the hedge legs under a real race). State m3 explicitly: on a coding/screenshot call the diag line reads `gate=block chars=N` while `WhatToAnswerLLM` drops the block — `chars` is BUILT, never "inserted", in every audit of a log. Then use `superpowers:requesting-code-review` with an **Opus** reviewer: the diff `git -C "<WT>" diff <BASE>..HEAD` reviewed AGAINST the spec (§3.1–3.6, §5), the pre-registration's §9 build gate and `PREREGISTER-flight-eq.md` §7 b4 (Task 7b) — a hunt for what is missing, byte-equivalence with `<F>\earlierQuestion.ref.mjs` included. Findings go through `superpowers:receiving-code-review` (verify before implementing); fixes are new commits on `build/earlier-question`, each with its test, and Steps 1–4 re-run after the last fix.

---

### Task 9 (controller): Land in MAIN, rebuild, prove the dist (build gates c1, c2)

**Files:**
- MAIN, the 19 landed paths (`LANDED_PATHS`): `electron/llm/earlierQuestionGate.ts`, `earlierQuestionGate.test.ts`, `earlierQuestion.ts`, `earlierQuestion.test.ts`, `earlierQuestion.parity.test.ts`, `WhatToAnswerLLM.ts`, `WhatToAnswerLLM.earlierQuestion.test.ts`, `WhatToAnswerLLM.hedgeCues.test.ts`; `electron/SessionTracker.ts`, `SessionTracker.askedQuestions.test.ts`, `IntelligenceEngine.ts`, `IntelligenceEngine.earlierQuestion.test.ts`, `IntelligenceManager.ts`, `main.ts`; `electron/services/turnDispatch.ts`, `turnDispatch.test.ts`; `electron/test/golden/earlierQuestionArm.mjs`, `earlierQuestionArm.test.ts`, `interview60.answers.mjs`; plus `docs/superpowers/plans/2026-10-04-turn-followup-build.md` (this plan) = 20 paths in the commit
- Create (L): `<F>\build\parity-dist.mjs`, `<F>\build\commit-msg.txt`, `<F>\build\LANDED.txt`

- [ ] **Step 1: Preconditions**

```
git -C "<MAIN>" symbolic-ref --short HEAD              # fix/coding-style-suffix-all-gemini
git -C "<MAIN>" rev-parse --short HEAD                 # record as EXPECTED
git -C "<MAIN>" diff --cached --name-only              # must be empty (shared index)
git -C "<MAIN>" status --porcelain -- <the 19 LANDED_PATHS>          # must be empty: no peer's uncommitted edit in ANY file this lands (turnDispatch.test.ts and the harness files included — Step 2 overwrites them; review I1)
git -C "<MAIN>" diff --stat <BASE> HEAD -- <the 19 LANDED_PATHS>     # must be empty: none of the landed paths changed in MAIN since the worktree's base (a pass record under passes/ does not count); otherwise rebase build/earlier-question onto HEAD first and re-run Task 8
```

Check `ListAgents` for peers busy in MAIN.

- [ ] **Step 2: Copy the reviewed files into MAIN's working tree, LF endings**

For each path P in `LANDED_PATHS`: `Copy-Item "<WT>\P" "<MAIN>\P"` then normalise to LF with node (the recipe refuses a blob with CR):

```
node -e "const fs=require('fs');for(const p of process.argv.slice(1)){fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'))}" <absolute MAIN paths…>
```

Copy this plan to `<MAIN>\docs\superpowers\plans\2026-10-04-turn-followup-build.md` the same way.

- [ ] **Step 3: Commit through the shared-index recipe — in-process, from a PowerShell session not isolated to a worktree (review I2, C1(b))**

First confirm the recipe's encoding and parse (the controller re-saved it with a BOM on 2026-10-04; a BOM-less copy would read `$sp` as ANSI mojibake and point the private index at a folder that does not exist):

```
[System.IO.File]::ReadAllBytes("<SP>\commit-main-paths.ps1")[0..2] -join ' '        # 239 187 191
$null = [System.Management.Automation.Language.Parser]::ParseFile("<SP>\commit-main-paths.ps1", [ref]$null, [ref]$errs); $errs.Count   # 0
```

Write `<F>\build\commit-msg.txt` (subject `feat(earlier-question): turn-based follow-up context behind NATIVELY_EARLIER_QUESTION (OFF), and answers.mjs --no-block — spec 2026-10-03, replay PASS +19/40`, body naming the spec, the replay result file, the review, the harness option's pre-registration (flight-eq §7 b4), and the attribution line). Then, in-process with an ARRAY (a nested `powershell -File … -Paths a,b,c` binds ONE string and stops at `PRE FAIL: missing`):

```
& "<SP>\commit-main-paths.ps1" -Expected <EXPECTED> -Paths @(
  'electron/llm/earlierQuestionGate.ts', 'electron/llm/earlierQuestionGate.test.ts', 'electron/llm/earlierQuestion.ts', 'electron/llm/earlierQuestion.test.ts', 'electron/llm/earlierQuestion.parity.test.ts',
  'electron/llm/WhatToAnswerLLM.ts', 'electron/llm/WhatToAnswerLLM.earlierQuestion.test.ts', 'electron/llm/WhatToAnswerLLM.hedgeCues.test.ts',
  'electron/SessionTracker.ts', 'electron/SessionTracker.askedQuestions.test.ts', 'electron/IntelligenceEngine.ts', 'electron/IntelligenceEngine.earlierQuestion.test.ts', 'electron/IntelligenceManager.ts', 'electron/main.ts',
  'electron/services/turnDispatch.ts', 'electron/services/turnDispatch.test.ts',
  'electron/test/golden/earlierQuestionArm.mjs', 'electron/test/golden/earlierQuestionArm.test.ts', 'electron/test/golden/interview60.answers.mjs',
  'docs/superpowers/plans/2026-10-04-turn-followup-build.md'
) -MessageFile "<F>\build\commit-msg.txt" -RefMessage 'feat(earlier-question): behind the flag' -IndexName eq-land
```

Expected: `PRE OK: … 20 path(s) present`, `tree … built; no CR in the blobs`, `POST: HEAD … is the new commit: True`, `POST: the paths are clean: True`, `POST: every other status line identical: True`. Record the new sha as LANDED.

- [ ] **Step 4: Guarded build of MAIN's dist**

Before: `ListAgents`; `git -C "<MAIN>" status --porcelain -- electron` must show no `.ts` a peer is mid-edit on (a dirty `.ts` is compiled as it is on disk). No Natively app and no `Natively-*` scheduled task may be running from MAIN (review m6: a rebuild under a running app, or a Step 2 copy picked up by a peer's `app:start`, mixes builds): `Get-Process electron -ErrorAction SilentlyContinue` empty, `Get-ScheduledTask -TaskName 'Natively-*' | Where-Object State -eq Running` empty. Record mtimes of every `electron/**/*.ts`. Then:

```
Start-Process node -ArgumentList "scripts/build-electron.js --force" -WorkingDirectory "<MAIN>" -Wait -NoNewWindow
```

After: the recorded mtimes are unchanged (no peer edit during the build). Markers:

```
Select-String -Path "<MAIN>\dist-electron\electron\llm\earlierQuestion.js" -Pattern "EARLIER QUESTION \(asked earlier; context only" -Quiet
Select-String -Path "<MAIN>\dist-electron\electron\IntelligenceEngine.js" -Pattern "earlier question: gate=" -Quiet
Select-String -Path "<MAIN>\dist-electron\electron\main.js" -Pattern "describeEarlierQuestionAtStartup" -Quiet
Select-String -Path "<MAIN>\dist-electron\electron\llm\WhatToAnswerLLM.js" -Pattern "earlierQuestionBlock" -Quiet
(Get-Item "<MAIN>\dist-electron\electron\main.js").LastWriteTime
```

Expected: four `True`, mtime after the build start.

- [ ] **Step 5: Build gate c1 at dist level — the BUILT module against the reference, the fixtures and the captured prompt lines**

Write `<F>\build\parity-dist.mjs`:

```js
// Build gate c1 (PREREGISTER §9): the BUILT dist module reproduces the replay reference on the 126 parity
// entries and on the reference's own invented CASES; and (review I5) the built interviewerLinesBefore
// reproduces the replay's prompt lines on the three hours' captured prompts. Prints keys, cues, lengths
// and hashes only. A missing fixture, reference or prompts file is a FAIL (exit 1), never a skip.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const RUNS = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs');
const F = path.dirname(path.dirname(fileURLToPath(import.meta.url)));   // this file lives in F\build\ (L, not Temp)
const BREAK = process.env.EQ_DIST_BREAK === '1';                          // rule 8: corrupts every newest ledger text AND drops one prompt line; the run must then FAIL
const HOURS = { s50m: '2026-09-22T08-22-50-s50m', s50l: '2026-09-21T08-22-34-s50l', s50k: '2026-09-20T11-22-43-s50k' };
const needed = [path.join(F, 'earlierQuestion.ref.mjs'), path.join(F, 'earlierQuestion.ref.test.mjs'),
    ...Object.keys(HOURS).map((h) => path.join(F, 'R', `turn-parity-${h}.json`)),
    ...Object.values(HOURS).map((r) => path.join(RUNS, r, 'interview60.prompts.json'))];
const missing = needed.filter((p) => !fs.existsSync(p));
if (missing.length) { console.log(`PARITY DIST: FAIL — missing ${missing.map((p) => path.basename(p)).join(', ')}`); process.exit(1); }
const require = createRequire(path.join(MAIN, 'package.json'));
const dist = require(path.join(MAIN, 'dist-electron/electron/llm/earlierQuestion.js'));
const distGate = require(path.join(MAIN, 'dist-electron/electron/llm/earlierQuestionGate.js'));
const ref = await import(pathToFileURL(path.join(F, 'earlierQuestion.ref.mjs')).href);
process.env.EQ_QUIET = '1';
const { CASES } = await import(pathToFileURL(path.join(F, 'earlierQuestion.ref.test.mjs')).href);   // prints its one summary line
if (process.exitCode) { console.log('PARITY DIST: FAIL — the reference\'s own tests do not pass (m7: asserted in code, not by eye)'); process.exit(1); }
const sha = (s) => createHash('sha256').update(s).digest('hex');
const h12 = (a) => sha(JSON.stringify(a)).slice(0, 12);
const BEFORE_MARKER = 'INTERVIEWER JUST SAID:\n', AFTER_MARKERS = ['\n\nTHE LIVE LISTENER', '\n\nYOUR RESPONSE'];
const transcriptBlock = (user) => { const mi = user.indexOf(BEFORE_MARKER); const rest = user.slice(mi + BEFORE_MARKER.length); const hits = AFTER_MARKERS.map((m) => rest.indexOf(m)).filter((i) => i >= 0); if (mi < 0 || !hits.length) throw new Error('no marker'); return rest.slice(0, Math.min(...hits)); };
let bad = 0, n = 0, withBlock = 0, lines = 0;
for (const [hour, run] of Object.entries(HOURS)) {
    const fx = JSON.parse(fs.readFileSync(path.join(F, 'R', `turn-parity-${hour}.json`), 'utf8'));
    const prompts = JSON.parse(fs.readFileSync(path.join(RUNS, run, 'interview60.prompts.json'), 'utf8'));
    for (const [key, e] of Object.entries(fx)) {
        n++;
        const ledger = BREAK && e.ledger.length ? [...e.ledger.slice(0, -1), { ...e.ledger[e.ledger.length - 1], text: `${e.ledger[e.ledger.length - 1].text} extra` }] : e.ledger;
        const a = dist.buildEarlierQuestion({ question: e.question, turnId: e.turnId, supersede: e.supersede, ledger, promptLines: e.promptLines });
        const r = ref.buildEarlierQuestion({ question: e.question, turnId: e.turnId, supersede: e.supersede, ledger: e.ledger, promptLines: e.promptLines });
        if (a.block) withBlock++;
        if (a.block !== r.block || a.cue !== r.cue || a.why !== r.why || a.block !== e.expectedBlock || sha(a.block) !== e.expectedSha256) { bad++; console.log(`MISMATCH ${key}: dist cue=${a.cue} why=${a.why} chars=${a.block.length} sha=${sha(a.block).slice(0, 12)} ref cue=${r.cue} why=${r.why} chars=${r.block.length} expected ${e.expectedSha}`); }
        if (distGate.gate(e.question).cue !== ref.gate(e.question).cue) { bad++; console.log(`GATE MISMATCH ${key}`); }
        if (/^D\d$/.test(e.id)) continue;                                  // the D-cases' prompts are rebuilt by the replay, not captured
        const user = prompts[e.id]?.user;
        if (!user) { bad++; console.log(`LINES MISMATCH ${key}: no captured prompt`); continue; }
        lines++;
        const mine = dist.interviewerLinesBefore(transcriptBlock(user)).slice(0, BREAK ? -1 : undefined);
        if (JSON.stringify(mine) !== JSON.stringify(e.promptLines)) { bad++; console.log(`LINES MISMATCH ${key}: ${mine.length}/${e.promptLines.length} sha ${h12(mine)}/${h12(e.promptLines)}`); }
    }
}
for (const c of CASES) {
    const a = dist.buildEarlierQuestion(c.input), r = ref.buildEarlierQuestion(c.input);
    if (a.block !== r.block || a.cue !== r.cue || a.why !== r.why) { bad++; console.log(`CASE MISMATCH ${c.row}`); }
    if (c.ledgerWrite) { const w = c.ledgerWrite; if (JSON.stringify(dist.recordAsked(w.before, { text: w.text, turnId: w.turnId, seq: w.seq })) !== JSON.stringify(ref.recordAsked(w.before, { text: w.text, turnId: w.turnId, seq: w.seq }))) { bad++; console.log(`LEDGER MISMATCH ${c.row}`); } }
}
if (dist.LABEL !== ref.LABEL || dist.LEDGER_DEPTH !== ref.LEDGER_DEPTH || dist.clip('x'.repeat(451)) !== ref.clip('x'.repeat(451))) { bad++; console.log('CONSTANT MISMATCH'); }
console.log(`PARITY DIST: ${n} fixture entries (${withBlock} with a block) + ${CASES.length} invented cases + ${lines} captured prompt-line rows; mismatches ${bad}`);
process.exit(bad ? 1 : 0);
```

Run `node "<F>\build\parity-dist.mjs"` from `<F>`. Expected: the reference's own summary `EARLIER-QUESTION REF TESTS: 47/47 passed`, then `PARITY DIST: 126 fixture entries (21 with a block) + 29 invented cases + 117 captured prompt-line rows; mismatches 0`, exit 0. Calibrate: `$env:EQ_DIST_BREAK = '1'; node "<F>\build\parity-dist.mjs"; Remove-Item Env:EQ_DIST_BREAK` → must print at least the 21 gated `MISMATCH` lines and every `LINES MISMATCH` row whose prompt holds an earlier interviewer line (keys, cues, lengths, hashes only) and exit 1. Then rename `<F>\R\turn-parity-s50k.json` for one run → `PARITY DIST: FAIL — missing turn-parity-s50k.json`, exit 1; rename it back (the gate FAILS on a missing fixture; the vitest test is the only place that may skip).

- [ ] **Step 5b: The harness option refuses on a real captured file without blocks (Task 7b, b4's exit 2)**

```
Set-Location "<MAIN>"; node electron\test\golden\interview60.answers.mjs --captured "<RUNS>\2026-09-22T08-22-50-s50m\interview60.prompts.json" --tag refusal-probe --no-block --only S1Q04F; $LASTEXITCODE
```

Expected: exit 2 with `--no-block: the captured prompt for S1Q04F carries no EARLIER QUESTION block …` BEFORE any model call (no `ANSWER-ONLY PASS` header, no request, nothing written: `electron\test\golden\interview60.answers.*refusal-probe*` must not exist). The positive strip on real blocks is Task 10 Step 6.

- [ ] **Step 6: Build gate c2 — the flag-off dist builder reproduces the captured bytes**

```
Set-Location "<F>\build"; node "<MAIN>\electron\test\golden\passes\2026-09-26-followup-replay\scripts\followup-replay-build.mjs" "<MAIN>\electron\test\golden\interview60.runs\2026-09-22T08-22-50-s50m" "<F>\build\c2-out" --calibrate
```

Expected: `CALIBRATION OK 39/39`. (This proves the three transcript modules the replay rests on still reproduce the captured user turn with the flag off; it does not run the block — c3 did, in Task 5.) Then `REPLAY_BREAK=1` once → must fail (rule 8).

- [ ] **Step 7: Record** `<F>\build\LANDED.txt`: EXPECTED → LANDED sha, build time, the four markers, c1 (parity + prompt lines + the missing-fixture FAIL) / c2 / Step 5b outputs, the full-suite counts from Task 8. The `eq-build` worktree and the `build/earlier-question` branch are KEPT until the flight's result note lands in MAIN (a review finding or a smoke defect is fixed there and re-landed through the same recipe); they are removed then (`git -C "<MAIN>" worktree remove eq-build; git -C "<MAIN>" branch -d build/earlier-question`), stated in the result note (review m12).

---

### Task 10 (controller): Live smoke on the built app — the flag reaches the process, one follow-up gets the block

**Files:**
- Create (L, under the non-ASCII path; `.cmd` ASCII + CRLF): `<F>\smoke\launch-smoke-eq.cmd`, `<F>\smoke\smoke-eq.mjs`, `<F>\smoke\check-smoke-eq.mjs`, `<F>\smoke\render-clip.ps1`, `<F>\smoke\clips\WHY.wav` + `WHY.txt` (the invented quick follow-up, rendered in Step 0), `<F>\smoke\verify-smoke-prompts.mjs` (Step 6)
- Reuse: `<SP>\register-smoke-hedge.ps1` (registration), `<SP>\smoke-turn.mjs` (the playback/app pattern), MAIN `electron/test/golden/interview60.run.mjs` (`app:start`/`app:stop`), MAIN `electron/test/golden/scenario50-tts-local/S1Q04.wav`, `S1Q04F.wav`, `S1Q06.wav`, `S1Q06F.wav` (+ `.txt`; the folder is gitignored, the invented clip is NOT put there), MAIN `interview60.build-audio-local.mjs:54-66` (the SAPI recipe `render-clip.ps1` copies)

What it proves: `[Main] earlier question: on` in the app's own log (the env var crossed the scheduled-task → `npm start` → Electron seam); two gated follow-ups (S1Q04F constraint cue, S1Q06F pronoun cue — the replay's own gated items, their parents evicted by a 150 s gap) each produce `earlier question: gate=block … turn=<id>`; two mains produce `gate=no-cue`; **the spec's quick follow-up (§6, §3.6 row "quick follow-up < 60 s sharing a frame word"; review I6)** — the invented `WHY` = "Why that one?" played 30 s after S1Q06F — pins a `pinned question` line of its own and produces `gate=parent-in-prompt cue=short chars=0 turn=<id>` (its parent S1Q06F is still in the prompt; the ledger keeps the parent entry and pushes the follow-up, the C1 regime, which the unit rows prove and this line observes live); a control segment with the flag unset produces no `earlier question:` line and `[Main] earlier question: off`. Per spec §6 a missing `pinned question` line for `WHY` is `NOT EXERCISED`, never a pass: the 3-word turn arrives on the whisper (STT) path, which has no `isFragment` drop (`main.ts:2089` drops Live-sourced claims only); if it is not pinned, the reason is found (STT, VAD, the detector's verdict) and the smoke re-run — the check is never widened. The cue-mode shape flown is MAIN's shipped one (`CUE_RULE` present; stated in the record). Nothing about answer quality is read here — that is the flight's pre-registration.

- [ ] **Step 0: Render the invented clip** — `<F>\smoke\render-clip.ps1` (UTF-8 with BOM; the SAPI recipe of `interview60.build-audio-local.mjs:54-66`, 24 kHz mono 16-bit, voice `Microsoft David Desktop`, rate 0):

```
param([Parameter(Mandatory=$true)][string]$Id, [Parameter(Mandatory=$true)][string]$Text)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$dir = Join-Path $PSScriptRoot 'clips'; New-Item -ItemType Directory -Force $dir | Out-Null
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.SelectVoice('Microsoft David Desktop') } catch { }
$s.Rate = 0
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile((Join-Path $dir "$Id.wav"), $fmt)
$s.Speak($Text)
$s.SetOutputToNull(); $s.Dispose()
[System.IO.File]::WriteAllText((Join-Path $dir "$Id.txt"), $Text, (New-Object System.Text.UTF8Encoding($false)))
"$Id.wav $((Get-Item (Join-Path $dir "$Id.wav")).Length) bytes"
```

Run `powershell -NoProfile -ExecutionPolicy Bypass -File "<F>\smoke\render-clip.ps1" -Id WHY -Text "Why that one?"`. Expected: `WHY.wav` of roughly 60–90 KB (1.2–1.8 s at 48 KB/s), `WHY.txt` = `Why that one?`. Play it once locally (`(New-Object System.Media.SoundPlayer "<F>\smoke\clips\WHY.wav").PlaySync()`) and confirm by ear it says the three words. The sentence is the spec's own (§3.6; `gate('Why that one?')` = `short`, checked against Task 1's port: 3 words, no leading/pronoun/constraint cue); the plain "Why?" (1 word, ~0.5 s) is a weaker STT target and is not used.

- [ ] **Step 1: `smoke-eq.mjs`** — a copy of `<SP>\smoke-turn.mjs` with these exact changes: (a) items are `id` or `id:+<seconds>` (`S1Q04:+150` = wait 150 s after this clip instead of `GAP_MS`); parse with `const [id, plus] = item.split(':+'); const waitMs = plus ? Number(plus) * 1000 : GAP_MS;` and use `waitMs` in the loop; (b) `OUT` = `interview60.runs/smoke-eq.json`; (c) the assertion block (`bad`, the table, `SMOKE PASSED/FAILED`) is replaced by writing `{ ranAt, played }` only — the checker reads the log; (d) a clip is looked up in the roster folder first, then in the smoke's own `clips\` beside the script (`const OWN_CLIPS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'clips'); const clipOf = (id) => [CLIPS, OWN_CLIPS].map((d) => path.join(d, `${id}.wav`)).find((p) => fs.existsSync(p));` — the ABORT check and `playWav` use `clipOf(id)`). Keep `app:stop` → `app:start` (which rebuilds from MAIN's tree) → play → `app:stop`, and the `MUST be launched by a scheduled task` header.

- [ ] **Step 2: `check-smoke-eq.mjs`** (`node check-smoke-eq.mjs <segment natively_debug.log> <played json> --mode on|off`):

```js
// Reads the smoke's segment log back. `chars` in a diag line is the block the engine BUILT; on a coding
// framing WhatToAnswerLLM drops it, so chars is never read as "inserted" (plan review m3) — every item
// here is verbal.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [logPath, playedPath, , mode] = process.argv.slice(2);
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const CLIPS = path.join(MAIN, 'electron', 'test', 'golden', 'scenario50-tts-local');
const OWN_CLIPS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'clips');     // the invented quick follow-up
const clipText = (id) => { for (const d of [CLIPS, OWN_CLIPS]) { const p = path.join(d, `${id}.txt`); if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); } throw new Error(`${id}.txt not found in the roster folder or ${OWN_CLIPS}`); };
const lines = fs.readFileSync(logPath, 'utf8').split('\n');
const played = JSON.parse(fs.readFileSync(playedPath, 'utf8')).played;
const words = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = words(a), B = words(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const STAMP = /^(\S+) /;                                                   // every debug-log line starts with its ISO instant
const PINNED = /\[IntelligenceEngine\] runWhatShouldISay: pinned question (".*")$/;
const DIAG = /\[IntelligenceEngine\] earlier question: gate=(\S+) cue=(\S+) chars=(\d+) turn=(\S+) ms=(\d+)/;
const bad = [], notes = [];
const startup = lines.find((l) => l.includes('[Main] earlier question: '));
if (!startup) bad.push('no [Main] earlier question startup line');
else if (!startup.includes(mode === 'on' ? 'earlier question: on' : 'earlier question: off')) bad.push(`startup line is "${startup.slice(-40)}", mode ${mode}`);
// pair each pinned-question line with the diag line logged right after it (same tick; a few STT lines may interleave)
const events = [];
for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(PINNED); if (!m) continue;
    let diag = null;
    for (let j = i + 1; j < Math.min(i + 13, lines.length) && !lines[j].match(PINNED); j++) { const d = lines[j].match(DIAG); if (d) { diag = { gate: d[1], cue: d[2], chars: +d[3], turn: d[4], ms: +d[5] }; break; } }
    events.push({ at: Date.parse(lines[i].match(STAMP)?.[1] ?? ''), text: JSON.parse(m[1]), diag });
}
// WHY = "Why that one?" 30 s after S1Q06F (spec §6 quick follow-up): its parent is still in the prompt, so no block.
const EXPECT = { S1Q04: { gate: 'no-cue' }, S1Q04F: { gate: 'block', cue: 'constraint' }, S1Q06: { gate: 'no-cue' }, S1Q06F: { gate: 'block', cue: 'pronoun' }, WHY: { gate: 'parent-in-prompt', cue: 'short' } };
const seenTurns = [];
for (const [i, p] of played.entries()) {
    // Attribute by play window (smoke-turn.mjs's rule): the first pinned question at or after this clip's
    // start and before the next clip's start. The whole-turn answer fires after the voice stops, and the
    // next clip starts at least 14 s later, so the window is unambiguous; a text overlap with the clip's
    // own .txt is only a note (S1Q04F shares words with S1Q04, so text alone could not tell them apart).
    const windowEnd = played[i + 1]?.startedMs ?? Infinity;
    const ev = events.find((e) => e.at >= p.startedMs && e.at < windowEnd);
    if (!ev) { bad.push(`${p.id}: NOT EXERCISED (no pinned question line in its play window)`); continue; }
    const spoken = clipText(p.id);
    if (overlap(spoken, ev.text) < 0.5) notes.push(`${p.id}: pinned text overlaps its clip only ${overlap(spoken, ev.text).toFixed(2)} (STT drift?)`);
    if (mode === 'off') { if (ev.diag) bad.push(`${p.id}: a diag line with the flag unset`); else notes.push(`${p.id}: pinned, no diag line (flag off)`); continue; }
    if (!ev.diag) { bad.push(`${p.id}: pinned but no earlier-question diag line`); continue; }
    const want = EXPECT[p.id];
    if (ev.diag.gate !== want.gate) bad.push(`${p.id}: gate=${ev.diag.gate}, want ${want.gate}`);
    if (want.cue && ev.diag.cue !== want.cue) bad.push(`${p.id}: cue=${ev.diag.cue}, want ${want.cue}`);
    if (want.gate === 'block' && !(ev.diag.chars >= 200 && ev.diag.chars <= 578)) bad.push(`${p.id}: chars=${ev.diag.chars} outside 200..578`);   // max = 125 label + 3 ("\n- ") + 450 clip (m5)
    if (want.gate !== 'block' && ev.diag.chars !== 0) bad.push(`${p.id}: chars=${ev.diag.chars} on a ${want.gate}`);
    if (!/^\d+$/.test(ev.diag.turn)) bad.push(`${p.id}: turn=${ev.diag.turn} is not a turn id`); else seenTurns.push(+ev.diag.turn);
    if (ev.diag.ms > 50) notes.push(`${p.id}: ms=${ev.diag.ms} (slow build)`);
    notes.push(`${p.id}: gate=${ev.diag.gate} cue=${ev.diag.cue} chars=${ev.diag.chars} turn=${ev.diag.turn} ms=${ev.diag.ms}`);
}
if (mode === 'on' && seenTurns.length === played.length && !seenTurns.every((t, i) => i === 0 || t > seenTurns[i - 1])) bad.push(`turn ids not increasing: ${seenTurns.join(',')}`);
if (mode === 'off' && lines.some((l) => DIAG.test(l))) bad.push('flag off: an earlier-question diag line exists');
if (lines.some((l) => /\[CRITICAL\].*(Unhandled Rejection|Uncaught Exception)/.test(l))) bad.push('a CRITICAL unhandled rejection / uncaught exception in the segment');
const answers = lines.filter((l) => l.includes('[Answer] full:')).length;
if (answers < played.length) bad.push(`${answers} answers for ${played.length} clips`);
for (const n of notes) console.log(`  ${n}`);
console.log(bad.length ? `CHECK FAILED (${bad.length}):\n  - ${bad.join('\n  - ')}` : `CHECK CLEAN: ${played.length}/${played.length} exercised, ${answers} answers, mode ${mode}`);
console.log(`CHECK EXIT ${bad.length ? 1 : 0}`);
process.exit(bad.length ? 1 : 0);
```

Calibrate it BEFORE the run against a synthetic log: write a small log with the five pinned lines (from the clips' `.txt`, `WHY.txt` included) and five diag lines → `CHECK CLEAN: 5/5`; flip S1Q04F's `gate=block` to `gate=no-cue` → FAILED naming S1Q04F; drop S1Q06F's pinned line → `NOT EXERCISED`; give WHY `gate=block cue=short chars=132` → FAILED naming WHY (`gate=block, want parent-in-prompt`); drop WHY's pinned line → `WHY: NOT EXERCISED`; mode `off` with one diag line → FAILED.

- [ ] **Step 3: `launch-smoke-eq.cmd`** (ASCII only, CRLF, no parentheses inside echoed text; modelled on `<SP>\launch-smoke-hedge.cmd`):

```
@echo off
rem Live smoke for NATIVELY_EARLIER_QUESTION on the built app: segment 1 flag on, segment 2 control off.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-eq-launcher-error.log"
  exit /b 9
)
findstr /C:"describeEarlierQuestionAtStartup" "electron\main.ts" >nul 2>&1
if errorlevel 1 (
  echo earlier-question startup check not in this checkout >> "%TEMP%\natively-smoke-eq-launcher-error.log"
  exit /b 7
)
findstr /C:"asked earlier; context only" "dist-electron\electron\llm\earlierQuestion.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron does not carry the earlier-question module - rebuild MAIN >> "%TEMP%\natively-smoke-eq-launcher-error.log"
  exit /b 7
)
set NODE="C:\Program Files\nodejs\node.exe"
set RUNS=electron\test\golden\interview60.runs
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_FOLLOWUP_PARENT=
set NATIVELY_VERBAL_PRIMARY_MODEL=
set NATIVELY_GEMINI_THINKING_LEVEL=
set NATIVELY_FIRST_TOKEN_TIMEOUT_MS=
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=
set NATIVELY_CAPTURE_PROMPTS=

set LOG1=%RUNS%\smoke-eq-on.log
set LOG2=%RUNS%\smoke-eq-off.log

echo === EQ SMOKE 1: flag on === > %LOG1%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG1%
set NATIVELY_EARLIER_QUESTION=1
%NODE% "%~dp0smoke-eq.mjs" S1Q04:+150 S1Q04F S1Q06:+150 S1Q06F:+30 WHY >> %LOG1% 2>&1
set SMOKE1=%ERRORLEVEL%
echo SMOKE1 EXIT %SMOKE1% >> %LOG1%
copy /Y natively_debug.log %RUNS%\smoke-eq-on.natively_debug.log >nul
copy /Y verbal-prompts.log %RUNS%\smoke-eq-on.verbal-prompts.log >nul
copy /Y %RUNS%\smoke-eq.json %RUNS%\smoke-eq-on.played.json >nul
git rev-parse HEAD >> %LOG1% 2>&1
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG1%
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%LOG1%

echo === EQ SMOKE 2: control, flag unset === > %LOG2%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG2%
set NATIVELY_EARLIER_QUESTION=
%NODE% "%~dp0smoke-eq.mjs" S1Q04:+150 S1Q04F >> %LOG2% 2>&1
set SMOKE2=%ERRORLEVEL%
echo SMOKE2 EXIT %SMOKE2% >> %LOG2%
copy /Y natively_debug.log %RUNS%\smoke-eq-off.natively_debug.log >nul
copy /Y %RUNS%\smoke-eq.json %RUNS%\smoke-eq-off.played.json >nul
git rev-parse HEAD >> %LOG2% 2>&1
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG2%

if not "%SMOKE1%"=="0" exit /b %SMOKE1%
exit /b %SMOKE2%
```

The `dirty-lines=` line is `launch-smoke-hedge.cmd`'s M5 form (review m6): `app:start` rebuilds from MAIN's tree, so the record says what tree ran (expected `dirty-lines=0`, or the exact count of known tracked-but-rotated files, named). `verbal-prompts.log` is copied beside the debug log for Step 6 (gitignored, never printed).

After writing: convert to CRLF with node (`fs.writeFileSync(p, fs.readFileSync(p,'utf8').replace(/\r?\n/g,'\r\n'))`), then `head -2 file | cat -A` shows `^M$` and `LC_ALL=C grep -n "[^ -~]" file` prints nothing (the file's CONTENT is ASCII; its PATH is not, and that is the point of the next check). Run the guard chain (flight-launcher-guards note) **from the launcher's real location under `…\Masaüstü\natively-lab\sp\followup-turn\smoke\`, not from a copy elsewhere (review C1(c)):** a guards-only copy IN THE SAME FOLDER (drop the two `%NODE% "%~dp0smoke-eq.mjs"` lines and everything after the `set LOG2` line; append `echo GUARDS_ALL_PASSED` and `exit /b 0`) run with `cmd.exe /c "<F>\smoke\launch-smoke-eq.guards.cmd"` from `<MAIN>` must print `GUARDS_ALL_PASSED` — this is where `%~dp0` resolves through the non-ASCII path; a copy with the dist marker string mangled must exit 7 and write the error log line. Then a third copy that keeps only the header and `%NODE% "%~dp0check-smoke-eq.mjs"` with no arguments must reach the script (a usage error from node, not a "file not found" from cmd) — the proof that `%~dp0` + a `.mjs` under `Masaüstü` resolves for `node.exe` from a scheduled task's `cmd.exe`. Delete the three copies.

- [ ] **Step 4: Register and arm (controller or user, never a Claude session)** — `app:start` rebuilds from MAIN's tree, so MAIN must be at LANDED with no dirty `electron/*.ts`; the machine quiet (no voice chat, no other app answering); the user logged on; Deepgram and Gemini keys in the user's own credentials; no `Natively-*` task Running and no Electron process (m6).

```
powershell -NoProfile -ExecutionPolicy Bypass -File "<SP>\register-smoke-hedge.ps1" -TaskName Natively-smoke-eq -Launcher "<F>\smoke\launch-smoke-eq.cmd" -StartAt "<ISO local time>" -Hours 1
```

Expected runtime ~16 min (two app starts; clips 30+10+30+10+1.5 s; waits 150+14+150+30+14 and 150+14 s). `app:start` sets `NATIVELY_CAPTURE_PROMPTS=1` itself, so `<MAIN>\verbal-prompts.log` receives every call's exact prompt (the two gated ones with the block): gitignored, never printed, never committed; Step 6 reads it for hashes only.

- [ ] **Step 5: Read the result**

```
Get-ScheduledTaskInfo -TaskName Natively-smoke-eq | Select LastRunTime, LastTaskResult     # 0
node "<F>\smoke\check-smoke-eq.mjs" "<RUNS>\smoke-eq-on.natively_debug.log" "<RUNS>\smoke-eq-on.played.json" --mode on
node "<F>\smoke\check-smoke-eq.mjs" "<RUNS>\smoke-eq-off.natively_debug.log" "<RUNS>\smoke-eq-off.played.json" --mode off
```

Expected: both `CHECK CLEAN`, `CHECK EXIT 0` (segment 1: `5/5 exercised`); segment 1's notes show `S1Q04F: gate=block cue=constraint chars=<200..578> turn=<n>`, `S1Q06F: gate=block cue=pronoun …` and `WHY: gate=parent-in-prompt cue=short chars=0 turn=<n>` with increasing turn ids. A `NOT EXERCISED` line is never a pass — for `WHY` least of all (spec §6: the quick follow-up is the one state neither roster holds): re-run after finding why the clip did not pin (STT, VAD, the detector's verdict on a 3-word turn), never widen the check. Quote the two `CHECK` lines and the five diag notes in `<F>\smoke\RESULT-smoke-eq.md` beside: LANDED sha, dist mtime, `dirty-lines=`, the segment's `[Main] earlier question:` line, the cue-mode shape (`CUE_RULE` shipped), the m3 reading rule (`chars` = built), Step 6's hashes, and what the smoke did NOT show (answer quality; the hedge legs' shared bytes under a real race; the supersede, chip and Live-merge rows; the "Why?" one-word shape; the startup REFUSAL on a junk value — proven only by the unit test and the hedge's earlier live probe of the same `try`/`app.exit(1)` block). The smoke record is not a pass record; the flag stays OFF; the scenario50 S1+S2 flight with the flag ON is its own pre-registration (`L\flight-eq\PREREGISTER-flight-eq.md`), after this.

- [ ] **Step 6: The captured prompts, privately: strip → rebuild with the reference → re-insert (review I5(b); flight-eq b4's calibration of `--no-block` on a real capture)**

`<F>\smoke\verify-smoke-prompts.mjs <segment natively_debug.log> <segment verbal-prompts.log>` — plain node, reads the dist and the reference, prints `OK`/`FAIL` per call with sha12s only, never a prompt:

1. Parse the segment's calls: `verbal-prompts.log` is one JSON object per answer (`promptCapture`; `interview60.prompts.mjs` pairs them to dispatches by time — reuse `pairCapturesToDispatches` from `dist-electron/electron/llm/promptCapture.js` exactly as `interview60.prompts.mjs:19,26-31` does, with the debug log's `dispatch: answer|supersede` lines), and the `pinned question` + `earlier question:` diag lines in order (the same pairing as the checker).
2. Rebuild the ledger as the app did: walk the pinned lines in order, `ledger = ref.recordAsked(ledger, { text, turnId, seq })` with `turnId` from the diag line's `turn=` (`none` → null).
3. For each call whose diag line reads `gate=block`: `s = splitEarlierQuestion(user, LABEL)` (Task 7b's module, from MAIN's `electron/test/golden/earlierQuestionArm.mjs`) must not be null; `ref.buildEarlierQuestion({ question: pinned, turnId, supersede: false, ledger: <the ledger BEFORE this call's write>, promptLines: interviewerLines(s.user).promptLines })` (the replay's `interviewerLines`, imported from `<F>\gate-report-turn.mjs`) `.block === s.block`; `withEarlierQuestion(s.user, s.block) === user` and `ref.insertBlock(s.user, s.block) === user` (the reference exports its own `insertBlock`: the harness's re-insert and the replay's agree on real bytes); `dist.interviewerLinesBefore(transcriptBlock(s.user))` deep-equals the replay's `promptLines`. Print `OK <id> block sha12=<…> user sha12=<…> stripped sha12=<…>`. Importing `gate-report-turn.mjs` is side-effect free: its CLI sits behind an entry guard (`:201`, `process.argv[1] === fileURLToPath(import.meta.url)`); only its pure helpers and the reference load.
4. For each call whose diag line reads anything else: `splitEarlierQuestion(user, LABEL) === null` (no block was inserted) — print `OK <id> no block`.
5. Exit 1 on any `FAIL`. Expected on segment 1: two `OK … block …` (S1Q04F, S1Q06F) and three `OK … no block` (S1Q04, S1Q06, WHY); on segment 2: four `OK … no block` and no diag lines. Calibrate once: run with the segment-2 log against the segment-1 prompts (every pairing is wrong) → `FAIL`, exit 1.

The stripped sha12s of S1Q04F and S1Q06F go into `RESULT-smoke-eq.md`: they are the bytes b4's `captured-no-block-high` twins will send, and the flight's controller compares them with c2's builder's flag-off reproduction of the same transcript (b4's last clause) when it builds the flight's run folder — that comparison needs the builder's timeline pairing and is the flight registration's step, not this plan's.

---

## Self-review (done while writing; kept for the executor)

- Spec coverage: §3.1 ledger write (Tasks 2, 4, 6), block only on the auto path (Tasks 2, 6, 7), remove-and-push (Task 2, 4), reset (Task 4); §3.2 gate (Task 1) and parent-absent-from-the-PROMPT via `interviewerLinesBefore` (Tasks 2, 3, 6; the seam against the replay's derivation in Tasks 3 and 9); §3.3 newest entry, supersede '', no grandparent (Task 2); §3.4 label, clip, placement, own argument, byte rule (Tasks 2, 5; flag off pinned against TODAY's bytes in Task 5's characterization test and Task 6's call-shape test); §3.5 data flow and diag line (Tasks 6, 7; one line per call, after the write); flag incl. both-flags refusal (Tasks 2, 7); §3.6 every row (Task 2 pure rows; Task 6 coding-recorded, ledger-throw, junk flag, overlapping calls; Task 10 live, the quick follow-up "Why that one?" included — spec §6's smoke regime, with the pinned-line requirement); §6 build gate c1 (Tasks 3, 9), c2 (Task 9), c3 (Task 5). PREREGISTER-flight-eq §7 b4 (Task 7b, the harness option; its flight-side arm rows are the flight's own harness edit). Not in scope by the spec: removing `withParentExchange` (the default-ON commit), chip-path blocks (v2), callbacks (v2), the flight itself (its registration is `L\flight-eq\PREREGISTER-flight-eq.md`), the one-word "Why?" clip (a weaker STT target; the three-word sentence of §3.6 is flown).
- Names are consistent across tasks: `buildEarlierQuestion`, `recordAsked`, `interviewerLinesBefore`, `formatBlock`, `clip`, `LABEL`, `earlierQuestionEnabled`, `describeEarlierQuestionAtStartup`, `AskedQuestion`, `recordAskedQuestion`, `getAskedQuestions`, the 9th `generateStream` argument `earlierQuestionBlock`, the option `turnId`, `turnDispatchInput(base, d, turnId)`, `DetectionInput.turnId`, `splitEarlierQuestion`, `withEarlierQuestion`, `--no-block`.
- Review Focus rows 1, 2, 5 → Task 2 tests; 3, 4 → Task 6 tests.
- Paths: every path in this plan resolves under L (`natively-lab\sp`) or MAIN; `%TEMP%` appears only in the launcher's error-log line, which is the convention of every launcher in L.
