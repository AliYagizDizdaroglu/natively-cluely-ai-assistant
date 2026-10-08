# After5 Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three upstream failures of the after5 hour (phantom replacements, head fragments answered whole, the intro shortcut firing inside scenario questions), give the flight harness a way to run on Deepgram without touching the credential store, and re-fly the hour.

**Architecture:** Three one-function edits on existing predicates (`reconcileLiveQuestion`'s guard, `looksFragmentary`, `isIntroQuestion`), one 12-line pure helper for the STT provider override wired into `createSTTProvider`, and one preflight check in the harness. No changes to dispatch, dedupe, prompts, the renderer, or the answering stage.

**Tech Stack:** TypeScript (Electron main process), vitest, the `interview60` golden harness (ESM `.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-05-after5-fixes-design.md`

## Global Constraints

- All edits go to the MAIN checkout `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`, branch `fix/coding-style-suffix-all-gemini`. Never edit or build inside `.claude/worktrees/`. Run every command from the main checkout.
- Never stage `natively_debug.log.1`, `resume_prompt.txt`, `retry_claude_print.bat` (the user's uncommitted files). Stage the files each task names, nothing else. Never `git stash`, never `git checkout --` a file with user hunks.
- Commit message trailer on every commit: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Constants, verbatim from the spec: `TERMINAL_PUNCTUATION = /[.!?？…]["'”’)\]]*$/`; `TRAILING_FUNCTION_WORDS` = that, the, a, an, and, or, of, for, to, in, into, on, at, with, without, from, by, as, like, than, because, if, while, your, our, their, its, my, his, her; `SENTENCE_BREAK = /[.!?？]+\s+/`; `PLEASANTRY_MAX_WORDS = 4`; the env variable name `NATIVELY_STT_PROVIDER`.
- Log lines, verbatim: `[Main] NATIVELY_STT_PROVIDER=<provider> overrides the saved STT provider (<saved>) for this launch`; the preflight label `STT provider is the one requested`.
- No new dependencies. No changes to `ChipDeduper.ts`, `detectionDispatch.ts`, `QuestionDetector.ts`, `IntelligenceEngine.ts`, the prompts, or the renderer. `questionReconcile.ts` changes only its import line and its guard line plus that guard's comment.
- Keys stay in `.env`/the credential store; nothing prints a key value; nothing reads or writes `credentials.enc`.
- Tests: `npx vitest run <file>` from the main checkout. Type gates: `npx tsc --noEmit -p tsconfig.json` and `npx tsc --noEmit -p electron/tsconfig.json` (six pre-existing errors in the electron project are known — 1 in GeminiLiveRouter, 3 in ipcHandlers, 2 in KnowledgeOrchestrator; none may be added).
- Existing style wins: 4-space indent in `electron/`, single quotes, `describe/it` vitest tests beside the module, provenance comments on constants.

---

### Task 1: Fix A — the reconcile guard refuses fragmentary replacements

**Files:**
- Modify: `electron/services/questionReconcile.ts` (import at line 13; guard at line 54 and its comment)
- Test: `electron/services/questionReconcile.test.ts`

**Interfaces:**
- Consumes: `looksFragmentary(text: string): boolean` from `./questionShape` (exists).
- Produces: nothing new; `reconcileLiveQuestion`'s signature and verdict set are unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `electron/services/questionReconcile.test.ts`:

```ts
describe('reconcileLiveQuestion — phantom guard (2026-09-04 after5 hour, Groq REST on a noisy channel)', () => {
    it('M19: a four-word Whisper hallucination is the latest thing said → unverifiable, Live wording kept', () => {
        const live = 'What is your approach to health checks for a model serving container?';
        const r = reconcileLiveQuestion(live, [sp("I'm going to go.", 0)]);
        expect(r.verdict).toBe('unverifiable');
        expect(r.text).toBe(live);
        expect(r.anchor).toBeNull();
    });
    it('the guard is looksFragmentary, not isFragment: four words with no question shape do not replace', () => {
        // Four words pass isFragment (< 4); only looksFragmentary refuses this one.
        const live = 'Why do Docker layers matter for build times?';
        const r = reconcileLiveQuestion(live, [sp('Latency is creeping up.', 0)]);
        expect(r.verdict).toBe('unverifiable');
        expect(r.text).toBe(live);
    });
    it('W05: a whole short question the interviewer actually said still replaces an unmatched Live claim', () => {
        // "What is a DAG?" — 4 words, ends in "?", question opener: not fragmentary, so the
        // replacement path is intact for real speech.
        const r = reconcileLiveQuestion('Tell me about a time you handled a resource constraint problem.', [sp('What is a DAG?', 0)]);
        expect(r.verdict).toBe('replaced');
        expect(r.text).toBe('What is a DAG?');
        expect(r.anchor).toBe('What is a DAG?');
    });
});
```

- [ ] **Step 2: Run the file to see the first two fail**

Run: `npx vitest run electron/services/questionReconcile.test.ts`
Expected: the M19 and "four words with no question shape" cases FAIL with verdict `replaced`; the W05 case and every existing case PASS.

- [ ] **Step 3: Change the import and the guard**

Line 13 becomes:

```ts
import { looksFragmentary } from './questionShape';
```

Replace the two comment lines above the guard and the guard itself (the block that begins `// A fragment ("?", "Um.") is no evidence`) with:

```ts
    // A fragment is no evidence of what was said: it must not replace a substantive Live
    // question. The first guard was isFragment (< 4 words; 2026-09-03 Live-only hour, W04
    // lost to "?"). The 2026-09-04 after5 hour had Whisper hallucinating exactly four words
    // ("I'm going to go.") on a channel that never went silent; that passed the guard and
    // replaced correct Live claims three times (W02 and M19 were answered as phantoms).
    // looksFragmentary — the fragment hold's own predicate — refuses those too, and over
    // the nine replaced verdicts in eight flight hours it changes only the phantom cases
    // (spec 2026-09-05 §2).
    if (looksFragmentary(latest.text)) return { text: liveText, anchor: null, verdict: 'unverifiable', score: bestScore };
```

- [ ] **Step 4: Run the file and the shape tests**

Run: `npx vitest run electron/services/questionReconcile.test.ts electron/services/questionShape.test.ts`
Expected: all PASS (the existing M04 fixture still ends `replaced`: its said text is a long real question).

- [ ] **Step 5: Type gate and commit**

Run: `npx tsc --noEmit -p electron/tsconfig.json` — expected: only the six known errors.

```bash
git add electron/services/questionReconcile.ts electron/services/questionReconcile.test.ts
git commit -m "fix(reconcile): a fragmentary STT sentence cannot replace Live's question

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Fix B — heads cut mid-sentence are fragmentary

**Files:**
- Modify: `electron/services/questionShape.ts` (`looksFragmentary` and the constants above it)
- Test: `electron/services/questionShape.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `looksFragmentary` (same signature) now returns true for unpunctuated heads; `main.ts`'s fragment hold and Task 1's guard both inherit it without changes.

- [ ] **Step 1: Write the failing tests and rewrite the two that pin the opener normalisation**

In `electron/services/questionShape.test.ts`, inside `describe('looksFragmentary', …)`:

Replace the body of the test `'a contraction opener keeps its word after the apostrophe is stripped'` with:

```ts
        // With a period the terminal-punctuation rule does not fire, so only the opener
        // rule decides — which is what this test pins.
        expect(looksFragmentary("Who's on call tonight.")).toBe(false);
```

Replace the `expect` line of the test `'leading punctuation glued to the first word does not hide its opener'` with:

```ts
        expect(looksFragmentary('"What should we deploy.')).toBe(false);
```

Append these tests to the same `describe`:

```ts
    it('after5 heads: a Whisper chunk cut mid-sentence is fragmentary past six words when it ends on a function word', () => {
        expect(looksFragmentary('How would you design a pipeline that')).toBe(true); // H03, 7 words
        expect(looksFragmentary('How would you roll back a model that')).toBe(true); // H10
        expect(looksFragmentary('How would you backfill a year of data without')).toBe(true); // M24
        expect(looksFragmentary('How would you handle a task in airflow that intermittently fails because')).toBe(true); // M07
    });
    it('after5 heads: a short chunk with no terminal punctuation is fragmentary even with a question opener', () => {
        expect(looksFragmentary('What problem does infrastructure')).toBe(true); // W09, 4 words
        expect(looksFragmentary('Why would you use CloudFormation in')).toBe(true); // M04
    });
    it('the terminal-punctuation rule is load-bearing: the same short opener text with a period is whole', () => {
        expect(looksFragmentary('What problem does infrastructure.')).toBe(false);
    });
    it('the function-word rule is load-bearing: a long unpunctuated text ending on a content word stays whole', () => {
        expect(looksFragmentary('How would you shrink an eight gigabyte training image')).toBe(false);
    });
    it('a sentence-final verb is not a function word: the degraded-detector chip stays whole', () => {
        expect(looksFragmentary('How would you handle a task that intermittently fails and what would you do')).toBe(false);
    });
```

- [ ] **Step 2: Run the file to see the new cases fail**

Run: `npx vitest run electron/services/questionShape.test.ts`
Expected: the two "after5 heads" tests FAIL (all six texts currently return false); the two rewritten tests and every other test PASS.

- [ ] **Step 3: Add the constants and the rule**

Directly above the `looksFragmentary` doc comment in `electron/services/questionShape.ts`, add:

```ts
/** Terminal punctuation a whole sentence ends on (closing quotes/brackets allowed after it). */
const TERMINAL_PUNCTUATION = /[.!?？…]["'”’)\]]*$/;

/**
 * Last words no English sentence ends on — determiners, prepositions,
 * conjunctions, possessives — plus "that", which the corpus shows ending
 * Whisper heads six times ("…a pipeline that", "…a model that") and whole
 * questions never. A text with no terminal punctuation that ends on one of
 * these was cut mid-clause: Groq REST's six-second chunks did that to seven
 * of the 2026-09-04 after5 hour's questions. Verbs and pronouns that can end
 * a question (do, is, not, …) are deliberately absent, so a degraded-detector
 * chip that only lost its punctuation ("…will not update What do you do")
 * is not held (spec 2026-09-05 §3).
 */
const TRAILING_FUNCTION_WORDS = new Set([
    'that', 'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'into', 'on', 'at', 'with', 'without',
    'from', 'by', 'as', 'like', 'than', 'because', 'if', 'while', 'your', 'our', 'their', 'its', 'my', 'his', 'her',
]);
```

Replace the `looksFragmentary` doc comment and function with:

```ts
/**
 * Is this detection text not a whole question — an STT tail or head the other
 * ear may still complete? True when it has fewer than 4 words, opens with a
 * coordinating conjunction ("And when would you not?", 2026-09-04 M27), has no
 * terminal punctuation and is either at most 6 words ("What problem does
 * infrastructure", after5 W09) or ends on a word no sentence ends on ("How
 * would you design a pipeline that", after5 H03), or is at most 6 words with
 * no terminal '?' and no question/imperative opener ("Cross many model
 * services."). Measured: 317 chip and Live texts from four Deepgram hours → 2
 * flagged, both real fragments (parent spec §3.1); the after5 Groq REST hour's
 * 58 full chip texts → 6 more flagged, all six real heads, 0 of the 55 scripted
 * questions (spec 2026-09-05 §1). A whole question that lost its punctuation
 * and ends on one of those words waits at most 2.5 s for the other ear.
 */
export function looksFragmentary(text: string): boolean {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (!TERMINAL_PUNCTUATION.test(trimmed)) {
        if (words.length <= 6) return true;
        const last = words[words.length - 1].toLowerCase().replace(/[^a-z']+/g, '');
        if (TRAILING_FUNCTION_WORDS.has(last)) return true;
    }
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, '');
    return !FRAGMENT_OPENERS.has(first);
}
```

- [ ] **Step 4: Run the shape, reconcile and fragment-hold tests**

Run: `npx vitest run electron/services/questionShape.test.ts electron/services/questionReconcile.test.ts electron/services/fragmentHold.test.ts`
Expected: all PASS, including `every spoken script question is whole` (the 52 scripted questions all carry terminal punctuation) and `long text is whole even without punctuation` (its last word is "do").

- [ ] **Step 5: Type gate and commit**

Run: `npx tsc --noEmit -p electron/tsconfig.json` — expected: only the six known errors.

```bash
git add electron/services/questionShape.ts electron/services/questionShape.test.ts
git commit -m "fix(detector): an unpunctuated head cut mid-sentence is fragmentary

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Fix C — the intro shortcut only fires on an intro request

**Files:**
- Modify: `electron/knowledge/ContextAssembler.ts` (`INTRO_PATTERNS` at line 16, `isIntroQuestion` at line 38)
- Create: `electron/knowledge/ContextAssembler.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function isIntroQuestion(questionLower: string): boolean` (was module-private; `assemblePromptContext` keeps calling it with the lower-cased, trimmed question).

- [ ] **Step 1: Write the failing tests**

Create `electron/knowledge/ContextAssembler.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isIntroQuestion } from './ContextAssembler';

// assemblePromptContext lower-cases and trims the question before this check; the
// fixtures below are already in that form.
describe('isIntroQuestion', () => {
    it('H09 (2026-09-04 after5 hour): a scenario question whose last clause is "what do you do" is not an intro', () => {
        expect(isIntroQuestion('someone changed a resource by hand and now your stack will not update. what do you do?')).toBe(false);
    });
    it('the two generic phrases are no longer intro requests on their own', () => {
        expect(isIntroQuestion('what do you do?')).toBe(false);
        expect(isIntroQuestion('who are you reporting to in that role?')).toBe(false);
    });
    it('a plain intro request is an intro, however politely wrapped', () => {
        expect(isIntroQuestion('tell me about yourself')).toBe(true);
        expect(isIntroQuestion('so, to start, could you tell me a little bit about yourself?')).toBe(true);
        expect(isIntroQuestion('could you walk me through your background?')).toBe(true);
        expect(isIntroQuestion('please introduce yourself.')).toBe(true);
    });
    it('a pleasantry before the request does not hide it; a scenario before it does', () => {
        expect(isIntroQuestion('thanks for joining. tell me about yourself.')).toBe(true);
        expect(isIntroQuestion('great! describe yourself in three words.')).toBe(true);
        expect(isIntroQuestion('we run a three-person platform team. could you tell me about yourself?')).toBe(false);
    });
    it('an ordinary question with no intro phrase is not an intro', () => {
        expect(isIntroQuestion('tell me about a time you handled a resource constraint problem.')).toBe(false);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run electron/knowledge/ContextAssembler.test.ts`
Expected: FAIL — `isIntroQuestion` is not exported (import resolves to undefined). If instead the file fails to load because `ContextAssembler.ts`'s import chain (`./HybridSearchEngine`, `./NegotiationConversationTracker`) needs Electron at module load, move `INTRO_PATTERNS`, `SENTENCE_BREAK`, `PLEASANTRY_MAX_WORDS` and `isIntroQuestion` into a new pure module `electron/knowledge/introQuestion.ts`, import it from `ContextAssembler.ts`, and point the test at `./introQuestion` — record which of the two happened in the report.

- [ ] **Step 3: Narrow the patterns and add the sentence rule**

Replace `INTRO_PATTERNS` and `isIntroQuestion` in `electron/knowledge/ContextAssembler.ts` with:

```ts
const INTRO_PATTERNS = [
    'introduce yourself',
    'tell me about yourself',
    'describe yourself',
    'about yourself',
    'tell me who you are',
    'give me your introduction',
    'walk me through your background',
    'brief introduction',
    'self introduction',
];
// Dropped 2026-09-05: 'what do you do' and 'who are you'. Both occur inside ordinary
// interview questions ("…now your stack will not update. What do you do?", "Who are you
// reporting to?") — the after5 hour's H09 was answered with a self-introduction because
// of the first — and neither is asked on its own in an interview.

/** Sentence boundaries inside one question. */
const SENTENCE_BREAK = /[.!?？]+\s+/;
/** A sentence this short ahead of the request is a pleasantry ("Thanks for joining."), not a scenario. */
const PLEASANTRY_MAX_WORDS = 4;

/**
 * Is the interviewer asking for a self-introduction? The intro phrase must sit
 * in the first substantive sentence: a scenario sentence ahead of it means the
 * question is about the scenario, whatever its last clause says. A missed
 * intro is still answered from the résumé context by the normal path (its
 * system prompt introduces only when asked); a false intro is a
 * self-introduction spoken in place of the real answer (spec 2026-09-05 §4).
 * Exported for its tests; assemblePromptContext passes the lower-cased question.
 */
export function isIntroQuestion(questionLower: string): boolean {
    const sentences = questionLower.split(SENTENCE_BREAK).map((s) => s.trim()).filter(Boolean);
    const at = sentences.findIndex((s) => INTRO_PATTERNS.some((pattern) => s.includes(pattern)));
    if (at < 0) return false;
    return sentences.slice(0, at).every((s) => s.split(/\s+/).length <= PLEASANTRY_MAX_WORDS);
}
```

- [ ] **Step 4: Run the test file and the knowledge tests**

Run: `npx vitest run electron/knowledge`
Expected: all PASS.

- [ ] **Step 5: Type gate and commit**

Run: `npx tsc --noEmit -p electron/tsconfig.json` — expected: only the six known errors (the two in KnowledgeOrchestrator are pre-existing and unrelated).

```bash
git add electron/knowledge/ContextAssembler.ts electron/knowledge/ContextAssembler.test.ts
git commit -m "fix(knowledge): the intro shortcut fires only on an intro request

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(If Step 2 forced the split, add `electron/knowledge/introQuestion.ts` to the `git add` and name it in the commit body.)

---

### Task 4: Fix D — `NATIVELY_STT_PROVIDER` override and the preflight check

**Files:**
- Create: `electron/services/sttProviderOverride.ts`
- Create: `electron/services/sttProviderOverride.test.ts`
- Modify: `electron/main.ts` (`createSTTProvider`, currently lines 938–941: the `sttProvider` lookup)
- Modify: `electron/test/golden/interview60.run.mjs` (the `preflight()` function, after the Live-mode check; the header comment near line 18)
- Modify: `electron/test/golden/interview60.flight.mjs` (the header comment; one `log` line after the `LIVE` line)

**Interfaces:**
- Produces: `resolveSttProvider(saved: SttProviderName, envValue: string | undefined, isPackaged: boolean): { provider: SttProviderName; overridden: boolean }`; `STT_PROVIDERS` (the ten names, matching `CredentialsManager.setSttProvider`'s union).
- Consumes: `app.isPackaged` (Electron, already imported in `main.ts`), `logSince(DEBUG_LOG, offset)` and `ok(label, good, detail)` in `run.mjs` (exist).

- [ ] **Step 1: Write the failing tests**

Create `electron/services/sttProviderOverride.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveSttProvider, STT_PROVIDERS } from './sttProviderOverride';

describe('resolveSttProvider', () => {
    it('unset → the saved provider, not overridden', () => {
        expect(resolveSttProvider('groq', undefined, false)).toEqual({ provider: 'groq', overridden: false });
        expect(resolveSttProvider('groq', '', false)).toEqual({ provider: 'groq', overridden: false });
    });
    it('a known name → that provider, overridden when it differs from the saved one', () => {
        expect(resolveSttProvider('groq', 'deepgram', false)).toEqual({ provider: 'deepgram', overridden: true });
        expect(resolveSttProvider('deepgram', 'deepgram', false)).toEqual({ provider: 'deepgram', overridden: false });
    });
    it('an unknown name refuses loudly, naming the value', () => {
        expect(() => resolveSttProvider('groq', 'whisper', false)).toThrow(/NATIVELY_STT_PROVIDER="whisper"/);
    });
    it('a packaged build ignores the variable', () => {
        expect(resolveSttProvider('groq', 'deepgram', true)).toEqual({ provider: 'groq', overridden: false });
    });
    it('the known names are the ten the credential store accepts', () => {
        expect([...STT_PROVIDERS]).toEqual(['none', 'google', 'groq', 'openai', 'deepgram', 'elevenlabs', 'azure', 'ibmwatson', 'soniox', 'natively']);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run electron/services/sttProviderOverride.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the helper**

Create `electron/services/sttProviderOverride.ts`:

```ts
/**
 * Harness-only STT provider override. The saved provider lives in the
 * encrypted credential store, which a flight test must not edit; like
 * NATIVELY_LIVE_MODE, a dev-only environment variable selects the provider
 * for one launch instead. An unknown value refuses loudly rather than falling
 * back, and a packaged build ignores the variable entirely (spec 2026-09-05 §5).
 */
export const STT_PROVIDERS = ['none', 'google', 'groq', 'openai', 'deepgram', 'elevenlabs', 'azure', 'ibmwatson', 'soniox', 'natively'] as const;
export type SttProviderName = typeof STT_PROVIDERS[number];

export function resolveSttProvider(saved: SttProviderName, envValue: string | undefined, isPackaged: boolean): { provider: SttProviderName; overridden: boolean } {
    if (isPackaged || !envValue) return { provider: saved, overridden: false };
    if (!(STT_PROVIDERS as readonly string[]).includes(envValue)) {
        throw new Error(`NATIVELY_STT_PROVIDER=${JSON.stringify(envValue)} is not one of ${STT_PROVIDERS.join(', ')}`);
    }
    return { provider: envValue as SttProviderName, overridden: envValue !== saved };
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run electron/services/sttProviderOverride.test.ts` — expected: PASS.

- [ ] **Step 5: Wire it into `createSTTProvider`**

In `electron/main.ts`, add to the imports near the other `./services/...` imports:

```ts
import { resolveSttProvider } from './services/sttProviderOverride';
```

In `createSTTProvider`, replace

```ts
    const sttProvider = CredentialsManager.getInstance().getSttProvider();
```

with

```ts
    const savedSttProvider = CredentialsManager.getInstance().getSttProvider();
    // Dev-only: the flight harness selects the ear for one launch without editing the
    // credential store (electron/services/sttProviderOverride.ts). Throws on a bad value.
    const { provider: sttProvider, overridden } = resolveSttProvider(savedSttProvider, process.env.NATIVELY_STT_PROVIDER, app.isPackaged);
    if (overridden) console.log(`[Main] NATIVELY_STT_PROVIDER=${sttProvider} overrides the saved STT provider (${savedSttProvider}) for this launch`);
```

Every later use of `sttProvider` in the function is unchanged.

- [ ] **Step 6: The preflight check**

In `electron/test/golden/interview60.run.mjs`, inside `preflight()`, directly after the `ok('Live mode is AUTO …')` call and before the `NOT READY/READY` line, add:

```js
    // Which STT ear the hour runs on. NATIVELY_STT_PROVIDER (dev-only, see
    // electron/services/sttProviderOverride.ts) selects it for this launch and the
    // app logs "[Main] Using <Class> for interviewer" when a streaming provider
    // starts. Require the last such line to name the requested provider: a missing
    // Deepgram key falls back to GoogleSTT with only a warning, which would silently
    // run the hour on the wrong ear. Proved for deepgram (DeepgramStreamingSTT).
    const wantedStt = process.env.NATIVELY_STT_PROVIDER;
    if (wantedStt) {
        const using = [...logSince(DEBUG_LOG, 0).matchAll(/\[Main\] Using (\w+) for interviewer/g)].pop();
        ok('STT provider is the one requested', !!using && using[1].toLowerCase().includes(wantedStt.toLowerCase()),
            using ? `${using[1]} (NATIVELY_STT_PROVIDER=${wantedStt})` : `no [Main] Using <Class> for interviewer line for NATIVELY_STT_PROVIDER=${wantedStt}`);
    }
```

In the header comment of `run.mjs` (the paragraph near line 18 that names `NATIVELY_AUTOSTART_MEETING`), add one sentence: `NATIVELY_STT_PROVIDER=<name> makes the app run its STT on that provider for the launch (dev builds only) and makes preflight verify it.`

- [ ] **Step 7: The flight log line**

In `electron/test/golden/interview60.flight.mjs`, directly after the line that logs `LIVE  ${liveModel}…`, add:

```js
    log(`STT   ${process.env.NATIVELY_STT_PROVIDER ?? "the app's saved provider"}${process.env.NATIVELY_STT_PROVIDER ? '   (NATIVELY_STT_PROVIDER, verified by preflight)' : ''}`);
```

In the header comment, after step 2's paragraph, add: ` *      NATIVELY_STT_PROVIDER=deepgram (set in the environment that launches this script) runs the hour on Deepgram; auto's preflight refuses the hour if the app did not start that ear.`

- [ ] **Step 8: Gates, a dry run, and commit**

Run: `npx vitest run electron/services/sttProviderOverride.test.ts` — PASS.
Run: `npx tsc --noEmit -p electron/tsconfig.json` — only the six known errors.
Run: `node electron/test/golden/interview60.flight.mjs after6 --dry-run` — expected: the log shows the `LIVE` line, then `STT   the app's saved provider`, and no command executes.
Run: `NATIVELY_STT_PROVIDER=deepgram node electron/test/golden/interview60.flight.mjs after6 --dry-run` — expected: `STT   deepgram   (NATIVELY_STT_PROVIDER, verified by preflight)`.

```bash
git add electron/services/sttProviderOverride.ts electron/services/sttProviderOverride.test.ts electron/main.ts electron/test/golden/interview60.run.mjs electron/test/golden/interview60.flight.mjs
git commit -m "feat(golden): NATIVELY_STT_PROVIDER selects the STT ear for a flight, preflight verifies it

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: The after6 proof hour on Deepgram (run by the controller, not a subagent)

**Files:** none modified until the report of record.

- [ ] **Step 1: Whole-suite gates**

Run: `npx vitest run` — expected: every test green (405 before this plan plus the new ones).
Run: `npx tsc --noEmit -p tsconfig.json` and `npx tsc --noEmit -p electron/tsconfig.json` — only the six known electron errors.

- [ ] **Step 2: Launch the flight**

From the main checkout, in the background:

```bash
NATIVELY_STT_PROVIDER=deepgram node electron/test/golden/interview60.flight.mjs after6
```

Watch the flight log for `STT   deepgram`, then auto's preflight for `PASS  STT provider is the one requested   DeepgramStreamingSTT` and `PASS  app heard the clip via Live`. If preflight fails on the STT row, stop: the Deepgram key is not in the store, and only the user can add it.

- [ ] **Step 3: Grade and report, exactly as after5**

Opus subagents grade `interview60.judge.pairs.json` and the three arm pairs files with the scratchpad brief; then `interview60.judge.mjs <run> --verdicts …` (and `--answers … --verdicts …` per arm), `interview60.run.mjs gate <run>`, `interview60.report-html.mjs <after5 dir> <after6 dir>`, republish the flight artifact (read first), render the run's markdown with the judge row, commit `interview60.report.md`, `interview60.report.html`, `interview60.chains.json`.

- [ ] **Step 4: Verdict against the spec §6 pass condition**

Report: the gate table, the judge counts, and H03/H09/W02/M19 individually, side by side with after5.
