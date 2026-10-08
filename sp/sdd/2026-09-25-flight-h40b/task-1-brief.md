### Task 1: The R09 fix, test first

**Files:**
- Modify: `electron/knowledge/IntentClassifier.ts:25-32` (the `STRONG_NEGOTIATION` list)
- Test: `electron/knowledge/IntentClassifier.test.ts` (add two tests)
- Reads: `electron/test/golden/holdout40.questions.mjs` (exports `HOLDOUT40`, `SPOKEN`, `AREAS`, `PLAN`)

**Interfaces:**
- Produces: `classifyIntent('Give me the SQL for the second highest salary in each department.') === IntentType.TECHNICAL`; no holdout40 spoken item classifies as `NEGOTIATION`; the four real negotiation questions in the existing test still do.

- [ ] **Step 1: Root cause, stated** — `STRONG_NEGOTIATION` (IntentClassifier.ts:29) holds the bare word `'salary'`; `classifyIntent` checks negotiation before technical (lines 53–57), so any question containing "salary" as a whole word becomes `NEGOTIATION`, and `KnowledgeOrchestrator.processQuestion` (line 363) then returns `liveNegotiationResponse`, which `LLMHelper.streamChat` (line 2449) yields as the raw `__negotiationCoaching` JSON instead of answering. h40a R09 ("second highest salary in each department") is that path; its captured verbal prompt does not exist because the verbal call never happened. The 2026-09-02 fix already narrowed the list to "strong" terms; bare "salary" is not one.

- [ ] **Step 2: Write the failing tests**

Stage `electron/knowledge/IntentClassifier.test.ts` as the current file plus this import (after the `INTERVIEW` import):

```ts
// @ts-ignore — untyped ESM harness module
import { SPOKEN as HOLDOUT_SPOKEN } from '../test/golden/holdout40.questions.mjs';
```

and these two tests inside the existing `describe`:

```ts
    it('classifies none of holdout40\'s 45 spoken questions as negotiation (h40a R09 went to the coaching card on "salary", 2026-09-24)', () => {
        expect((HOLDOUT_SPOKEN as any[]).length).toBe(45);
        const wrong = (HOLDOUT_SPOKEN as any[]).filter((i) => classifyIntent(i.q) === IntentType.NEGOTIATION).map((i) => i.id);
        expect(wrong).toEqual([]);
    });
    it('a technical question that mentions salary is technical, not negotiation', () => {
        expect(classifyIntent('Give me the SQL for the second highest salary in each department.')).toBe(IntentType.TECHNICAL);
    });
```

Copy: `Copy-Item "$sp\stage\electron\knowledge\IntentClassifier.test.ts" "$m\electron\knowledge\IntentClassifier.test.ts"`

- [ ] **Step 3: Run the test file to verify the new tests fail**

Run: `Push-Location $m; node node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts; Pop-Location`
Expected: 2 failed (`wrong` equals `['R09']`; the SQL question returns `negotiation`), 5 passed. If the import of `holdout40.questions.mjs` itself fails, read the module's export lines (`export const SPOKEN` is at line 271) and fix the import name; the test must fail on the classification, not on the import.

- [ ] **Step 4: The fix**

Stage `electron/knowledge/IntentClassifier.ts` with lines 25–32 replaced by:

```ts
// A strong term alone means negotiation. On 2026-09-02, also matching on
// everyday technical vocabulary ("base image", "expect", "range", "stock")
// labelled 25 of 27 technical questions "negotiation" and routed them through
// the coaching path — only strong terms are checked now.
// "salary" by itself is not strong either: on 2026-09-24 (h40a R09) "the SQL for the
// second highest salary in each department" went to the coaching card. The salary terms
// are the phrases an interviewer uses about the candidate's own pay.
const STRONG_NEGOTIATION = [
    'salary expectation', 'salary expectations', 'expected salary', 'salary range', 'your salary',
    'salary requirement', 'salary requirements', 'desired salary', 'base salary', 'salary offer',
    'what salary', 'compensation', 'negotiate', 'negotiable', 'equity', 'rsu', 'rsus', 'signing bonus',
    'total comp', 'market rate', 'counteroffer', 'counter offer',
];
```

Nothing else in the file changes. Copy: `Copy-Item "$sp\stage\electron\knowledge\IntentClassifier.ts" "$m\electron\knowledge\IntentClassifier.ts"`

- [ ] **Step 5: Run the test file to verify it passes**

Run: `Push-Location $m; node node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts; Pop-Location`
Expected: 7 passed, 0 failed (the 76-question roster, the four real negotiation questions, the weak-word cases, whole-word matching, the other categories, plus the two new ones).

- [ ] **Step 6: The suites and the type check**

Run from MAIN's root: `node node_modules/vitest/vitest.mjs run` — expected 759 + 2 pass, 5 skipped, 0 fail (the two cwd-sensitive files pass from the root after a build; if `interview60.prompts.test.ts` fails on a missing `dist-electron` module, run Task 3's build first and re-run). Then `node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` — expected exactly the 6 pre-existing errors; `node node_modules/typescript/bin/tsc --noEmit` — 0.

- [ ] **Step 7: Commit the two files with a private index**

Write `<SP>\r09-commit-msg.txt`:

```
fix(knowledge): a technical question that mentions salary is not a negotiation

STRONG_NEGOTIATION carried the bare word "salary", so "the SQL for the second highest salary in
each department" (h40a R09, 2026-09-24) was answered with the negotiation coaching card. The
salary terms are now the phrases an interviewer uses about the candidate's own pay.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

Write `<SP>\commit-r09.ps1`: the `commit-hedge-probe.ps1` script of the hedge plan with these substitutions — `$expected` = `git -C $m rev-parse HEAD` taken at the start (the hedge-probe commit if it landed first, else 92d04a5; print it), `$paths = @('electron/knowledge/IntentClassifier.ts', 'electron/knowledge/IntentClassifier.test.ts')`, `$msg = "$sp\r09-commit-msg.txt"`, index file `r09-commit.index`, ref message `'commit: fix(knowledge): salary is not a negotiation word'`. Run it: `PRE OK`, four `POST: ... True`, `--stat` with exactly 2 files.

