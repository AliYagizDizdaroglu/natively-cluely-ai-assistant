### Task 1: The cue rule at the tail of the verbal prompt

**Files:**
- Modify: `electron/llm/prompts.ts` (after `SPOKEN_WORD_CEILING`, line 191; and the tail of `VERBAL_WHAT_TO_ANSWER_PROMPT`, the line `${SPOKEN_LENGTH_AND_DEPTH}\`;` near line 2380)
- Test: `electron/llm/prompts.test.ts`

**Interfaces:**
- Produces: `CUES_SENTINEL = '__CUES__'`, `CUE_MAX_LINES = 5`, `CUE_MAX_WORDS = 8`, `CUE_RULE: string` (starts with `\n\n[CUES FIRST]`); `VERBAL_WHAT_TO_ANSWER_PROMPT` ends with `${SPOKEN_LENGTH_AND_DEPTH}${CUE_RULE}`.

- [ ] **Step 1: Write the failing tests**

In `electron/llm/prompts.test.ts`, extend the import list with `CUE_RULE, CUES_SENTINEL, CUE_MAX_LINES, CUE_MAX_WORDS,` and append after the last `describe`:

```ts
describe('CUE_RULE — cue mode (spec 2026-09-20)', () => {
    it('names the sentinel and the limits the checks enforce', () => {
        expect(CUES_SENTINEL).toBe('__CUES__');
        expect(CUE_MAX_LINES).toBe(5);
        expect(CUE_MAX_WORDS).toBe(8);
        expect(CUE_RULE).toContain('[CUES FIRST]');
        expect(CUE_RULE).toContain(CUES_SENTINEL);
        expect(CUE_RULE).toContain(`at most ${CUE_MAX_WORDS} words`);
        expect(CUE_RULE).toContain(`Never more than ${CUE_MAX_LINES}`);
        expect(CUE_RULE.startsWith('\n\n')).toBe(true);   // it is appended to a prompt that ends without a newline
    });

    it('sits at the tail of the verbal prompt, directly after the structured rule, and nowhere else', () => {
        // The structured rule was measured at the END of the prompt (13/20 against 8/20). The cue
        // rule goes after it; the bench measures this position rather than assuming it (§4).
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.endsWith('- Still first person, still open with substance, still no questions back.' + CUE_RULE)).toBe(true);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.split(CUE_RULE).length - 1).toBe(1);
        expect(UNIVERSAL_WHAT_TO_ANSWER_PROMPT).not.toContain(CUES_SENTINEL);   // the coding path has no cue block
    });
});
```

Also change the existing tail assertion (line 236) from

```ts
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.trimEnd().endsWith('- Still first person, still open with substance, still no questions back.')).toBe(true);
```

to

```ts
        // Since cue mode (spec 2026-09-20) the cue rule follows the structured rule; nothing else may.
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.endsWith('- Still first person, still open with substance, still no questions back.' + CUE_RULE)).toBe(true);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run electron/llm/prompts.test.ts`
Expected: FAIL — `CUE_RULE` is not exported (`undefined`), both new cases and the changed tail case fail.

- [ ] **Step 3: Add the constants and append the rule**

In `electron/llm/prompts.ts`, directly after the `SPOKEN_WORD_CEILING` line (191):

```ts
/**
 * Sentinel that opens the cue block every verbal answer now begins with (cue mode, spec
 * 2026-09-20). Same `__NAME__` convention as `__MORE__`; stripCueBlock in verbalStreamFilter
 * removes it before display and hands the lines to the UI.
 */
export const CUES_SENTINEL = '__CUES__';

/** Cue lines per answer: one per part the question names, never more. */
export const CUE_MAX_LINES = 5;

/** Words per cue line — a glance, not a sentence. */
export const CUE_MAX_WORDS = 8;

/**
 * Cue mode: the answer opens with a cue block — one key-phrase line per part the question
 * names — and the spoken answer follows unchanged. The main process strips the block
 * (stripCueBlock), logs it, and shows it above the answer so the candidate composes the
 * sentences and only glances at the prose. Appended at the TAIL of the verbal prompt, after
 * the structured rule; the bench measures that position rather than assuming it, and this
 * wording is a benched input (spec §9), not a settled text. Opens with a blank line because
 * the prompt it is appended to ends without one.
 */
export const CUE_RULE = `

[CUES FIRST]
Before the spoken answer, output a cue block in this exact form, on its own lines:
${CUES_SENTINEL}
1| <key phrase for the first part the question names, at most ${CUE_MAX_WORDS} words>
2| <the next part, in the order asked>
Rules for that block:
- One line per part the question names. A one-part question gets exactly one line. Never more than ${CUE_MAX_LINES}.
- Each line carries the specific thing you will say for that part: the number, the named service, the mechanism, the trade-off. Never a generic label.
- They are cues, not questions. Never address the listener.
- The spoken answer follows on the next line, in the same form as always.`;
```

Then change the tail of `VERBAL_WHAT_TO_ANSWER_PROMPT` (the closing line `${SPOKEN_LENGTH_AND_DEPTH}\`;` that follows `Output ONLY the spoken answer. Nothing else.`) to:

```ts
${SPOKEN_LENGTH_AND_DEPTH}${CUE_RULE}`;
```

`CUE_RULE` is declared above the prompt (line ~192), so the template resolves.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run electron/llm/prompts.test.ts electron/llm/knowledgePromptBudget.test.ts electron/llm/promptCapture.test.ts`
Expected: PASS. If `knowledgePromptBudget.test.ts` fails on a pinned prompt size, the pin is a measurement of the old prompt: update the pinned number to the new measured value in that test and say so in the commit message.

- [ ] **Step 5: Type check and commit**

Run: `node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit 2>&1 | grep -c "error TS"` → Expected: `6`.

```bash
git add electron/llm/prompts.ts electron/llm/prompts.test.ts
git commit -m "feat(cues): the cue rule at the tail of the verbal prompt

Cue mode (spec 2026-09-20): the answer opens with __CUES__ and one N| key
phrase line per part the question names, then the prose. The rule sits after
the structured rule, the position the bench measures; its wording is a
benched input. CUES_SENTINEL, CUE_MAX_LINES (5) and CUE_MAX_WORDS (8) are
what the filter, the checks and the metrics row read.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

