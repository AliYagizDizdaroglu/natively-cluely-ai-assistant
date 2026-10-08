### Task 4: Engine log line, cues on the first token, IPC and types

**Files:**
- Modify: `electron/IntelligenceEngine.ts` (event type line 46; the `generateStream` call line 404 and the token loop 411–437)
- Modify: `electron/main.ts:2422–2427`, `electron/preload.ts:780`, `src/types/electron.d.ts:197`
- Test: `electron/IntelligenceEngine.cues.test.ts` (new)

**Interfaces:**
- Consumes: `generateStream(..., liveTexts, onCues)` (Task 3).
- Produces: engine event `suggested_answer_token(token, question, confidence, replace, cues?: string[])` where `cues` rides only the first prose token of a stream that had a block; log line `[Answer] cues: <JSON array>` once per verbal answer; IPC payload `intelligence-suggested-answer-token: { token, question, confidence, replace, cues? }`; `window.electronAPI.onIntelligenceSuggestedAnswerToken` callback data gains `cues?: string[]`.

- [ ] **Step 1: Write the failing test**

Create `electron/IntelligenceEngine.cues.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';

/**
 * Cue mode (spec 2026-09-20 §6.7): the cues are logged once and ride the FIRST prose token
 * only; `[Answer] full:` stays prose. generateStream is stubbed to drive the eighth
 * parameter the way stripCueBlock does — the callback fires before the first prose token.
 */
const stubHelper = () => ({} as any);
const QUESTION = 'How much memory for ten million embeddings?';
const PROSE = 'Ten million vectors take thirty gigabytes.';

function stubStream(cues: string[], tokens: string[]) {
    vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* (_t: any, _tc: any, _ir: any, _img: any, _fast: any, _sugg: any, _live: any, onCues?: (c: string[]) => void) {
        onCues?.(cues);
        for (const t of tokens) yield t;
    });
}
function captureLogs() {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
    return logs;
}
function listen(engine: IntelligenceEngine) {
    const emits: Array<{ token: string; cues?: string[] }> = [];
    engine.on('suggested_answer_token', (token: string, _q: string, _c: number, _r?: boolean, cues?: string[]) => { emits.push({ token, cues }); });
    return emits;
}

describe('runWhatShouldISay carries the cue block', () => {
    afterEach(() => vi.restoreAllMocks());

    it('logs the cues once, attaches them to the first token only, and keeps the full-answer line prose', async () => {
        const logs = captureLogs();
        stubStream(['thirty gigabytes in float32', 'int8, then shard'], ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits.map((e) => e.token)).toEqual(['Ten million ', 'vectors take thirty gigabytes.']);
        expect(emits[0].cues).toEqual(['thirty gigabytes in float32', 'int8, then shard']);
        expect(emits[1].cues).toBeUndefined();
        expect(logs).toContain('[Answer] cues: ["thirty gigabytes in float32","int8, then shard"]');
        expect(logs).toContain(`[Answer] full: ${JSON.stringify(PROSE)}`);
    });

    it('no block: an empty cues line is logged and no token carries cues', async () => {
        const logs = captureLogs();
        stubStream([], ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits.every((e) => e.cues === undefined)).toBe(true);
        expect(logs).toContain('[Answer] cues: []');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run electron/IntelligenceEngine.cues.test.ts`
Expected: FAIL — no `[Answer] cues:` line and `emits[0].cues` is undefined.

- [ ] **Step 3: Implement**

(a) `electron/IntelligenceEngine.ts` line 46 — change the event type to:

```ts
    'suggested_answer_token': (token: string, question: string, confidence: number, replace?: boolean, cues?: string[]) => void;
```

(b) Replace line 404 (`const stream = this.whatToAnswerLLM.generateStream(...)`) with:

```ts
            // Cue mode (spec 2026-09-20): the filter reports the cue lines once, at block close —
            // before the first prose token — so they ride that token into the renderer. One
            // log line per answer is what the flight's cue row reads; fullAnswer stays prose.
            let pendingCues: string[] | null = null;
            const onCues = (cues: string[]) => {
                console.log(`[Answer] cues: ${JSON.stringify(cues)}`);
                if (cues.length) pendingCues = cues;
            };
            const stream = this.whatToAnswerLLM.generateStream(preparedTranscript, temporalContext, intentResult, imagePaths, options.forceFastModel, undefined, options.liveTexts, onCues);
```

(c) In the token loop, both emit sites. The model-source branch (lines ~429–433):

```ts
                    const replace = firstReplaceToken;
                    firstReplaceToken = false;
                    const cues = pendingCues ?? undefined;
                    pendingCues = null;
                    this.emit('suggested_answer_token', stripped, question || 'inferred', confidence, replace, cues);
                    fullAnswer += stripped;
                    continue;
```

and the plain branch (lines ~434–437):

```ts
                const replace = firstReplaceToken;
                firstReplaceToken = false;
                const cues = pendingCues ?? undefined;
                pendingCues = null;
                this.emit('suggested_answer_token', token, question || 'inferred', confidence, replace, cues);
                fullAnswer += token;
```

(d) `electron/main.ts` lines 2422–2427 — the forwarder becomes:

```ts
    this.intelligenceManager.on('suggested_answer_token', (token: string, question: string, confidence: number, replace?: boolean, cues?: string[]) => {
      const win = mainWindow()
      if (win) {
        // `cues` rides the first prose token of a stream that opened with a cue block (cue mode).
        win.webContents.send('intelligence-suggested-answer-token', { token, question, confidence, replace: replace === true, ...(cues ? { cues } : {}) })
      }
    })
```

(`IntelligenceManager.forwardEngineEvents` re-emits with `...args`, so the fifth argument already passes through.)

(e) `electron/preload.ts` line 780 — the callback type becomes `(data: { token: string; question: string; confidence: number; replace?: boolean; cues?: string[] }) => void`. The body is unchanged.

(f) `src/types/electron.d.ts` line 197 — the same type: `onIntelligenceSuggestedAnswerToken: (callback: (data: { token: string; question: string; confidence: number; replace?: boolean; cues?: string[] }) => void) => () => void`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run electron/IntelligenceEngine.cues.test.ts electron/IntelligenceEngine.pinnedQuestion.test.ts electron/IntelligenceEngine.cooldown.test.ts electron/IntelligenceEngine.codingAdvisory.test.ts`
Expected: PASS.

- [ ] **Step 5: Type check and commit**

Run: `node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit 2>&1 | grep -c "error TS"` → Expected: `6`.

```bash
git add electron/IntelligenceEngine.ts electron/IntelligenceEngine.cues.test.ts electron/main.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat(cues): log the cues once and send them on the first prose token

One [Answer] cues: line per verbal answer for the flight's cue row; the cues
ride the first token's payload as an optional field, so a supersede carries
its own cues with its replace flag and no new channel is needed.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

