import { describe, it, expect } from 'vitest';
import {
    INTERVIEW_COPILOT_PROMPT,
    CODE_HINT_PROMPT,
    BRAINSTORM_MODE_PROMPT,
    UNIVERSAL_WHAT_TO_ANSWER_PROMPT,
    VERBAL_WHAT_TO_ANSWER_PROMPT,
    CODING_STYLE_SUFFIX,
    GEMMA_CODE_HINT_STYLE_SUFFIX,
    STDLIB_FRAMING_APPLIES,
    STDLIB_FRAMING_EXCLUDES,
    CODE_MUST_RUN_RULE,
    SPOKEN_WORD_BUDGET,
    SPOKEN_WORD_TARGET,
    SPOKEN_WORD_CEILING,
    resolveGemmaSystemPrompt,
    resolveStyleSuffix,
} from './prompts';

describe('INTERVIEW_COPILOT_PROMPT (Gemma 4 31B default prompt when no caller override is given)', () => {
    it('still defaults to Python and preserves the requested-language override', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toContain('requested language (Python by default)');
    });

    it('instructs idiomatic/Pythonic style for Python output', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/idiomatic|Pythonic/i);
        // Concrete idioms, not just a vague "be clean" instruction.
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/comprehension/i);
    });

    it('preserves interview integrity: explicitly-asked data structures must still be hand-rolled', () => {
        // Guards against the LLM substituting e.g. collections.OrderedDict for a
        // hand-asked "implement an LRU cache" question, which would skip the
        // actual exercise the interviewer is testing.
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/hand|by hand|implement.*yourself|skip(s|ping)? the exercise/i);
    });

    it('uses hybrid framing: names a concrete stdlib shortcut in the opening sentence, then still hand-rolls', () => {
        // Pure hand-roll-only lost the "it can be Pythonic" signal; pure
        // stdlib-only risks skipping the exercise. The hybrid names the shortcut
        // (proves stdlib fluency) without gambling the actual answer on a guess
        // about what the interviewer wanted.
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/OrderedDict/);
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/opening sentence|step 1/i);
    });

    it('reinforced: gives a fill-in template for the stdlib-naming sentence so Gemma cannot drop it as flourish', () => {
        // A single live run via Live Mode dropped the stdlib mention while still
        // hand-rolling correctly — the soft clause was the most droppable line.
        // Front-loaded template + "skipping it is a failure" hardens compliance.
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/but let me implement the mechanism directly/);
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/skipping it is a failure/i);
    });

    it('keeps the 5-part output shape intact (regression guard on the surrounding structure)', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toContain('One short first-person sentence stating your approach');
        expect(INTERVIEW_COPILOT_PROMPT).toContain('step-by-step walkthrough');
        expect(INTERVIEW_COPILOT_PROMPT).toContain('Time:');
        expect(INTERVIEW_COPILOT_PROMPT).toContain('Space:');
        expect(INTERVIEW_COPILOT_PROMPT).toContain('Why:');
    });
});

describe('CODING_STYLE_SUFFIX / GEMMA_CODE_HINT_STYLE_SUFFIX content', () => {
    it('full suffix (fresh-solution paths) uses the same hybrid framing as INTERVIEW_COPILOT_PROMPT', () => {
        expect(CODING_STYLE_SUFFIX).toMatch(/idiomatic|Pythonic/i);
        expect(CODING_STYLE_SUFFIX).toMatch(/OrderedDict/);
        expect(CODING_STYLE_SUFFIX).toMatch(/opening.*sentence/i);
        expect(CODING_STYLE_SUFFIX).toMatch(/by hand/i);
        // Reinforcement (2026-07): front-loaded fill-in template + hard failure
        // framing, after a live miss on the Live Mode path.
        expect(CODING_STYLE_SUFFIX).toMatch(/but let me implement the mechanism directly/);
        expect(CODING_STYLE_SUFFIX).toMatch(/skipping it is a failure/i);
    });

    it('lighter Code Hint suffix stays idiomatic-only — never redirects the candidate to a different approach', () => {
        // Code Hint debugs code the candidate already started. Suggesting they
        // switch to a stdlib shortcut mid-flow would replace their approach,
        // not help them finish it — the opposite of what a hint should do.
        expect(GEMMA_CODE_HINT_STYLE_SUFFIX).toMatch(/idiomatic|Pythonic/i);
        expect(GEMMA_CODE_HINT_STYLE_SUFFIX).toMatch(/existing approach|never suggest switching/i);
        expect(GEMMA_CODE_HINT_STYLE_SUFFIX).not.toMatch(/OrderedDict/);
    });
});

describe('resolveGemmaSystemPrompt (streamChat Gemma branch must not silently discard caller overrides)', () => {
    it('falls back to INTERVIEW_COPILOT_PROMPT when the caller passed no override', () => {
        // Even if internal knowledge-mode/active-mode injection later mutated the
        // resolved prompt, Gemma's TTFT-critical default path must stay untouched
        // unless the caller itself asked for something specific.
        expect(resolveGemmaSystemPrompt(undefined, 'some internally-injected prompt')).toBe(INTERVIEW_COPILOT_PROMPT);
    });

    it('passes non-coding overrides through untouched (e.g. BRAINSTORM_MODE_PROMPT — no code allowed there at all)', () => {
        expect(resolveGemmaSystemPrompt(BRAINSTORM_MODE_PROMPT, BRAINSTORM_MODE_PROMPT)).toBe(BRAINSTORM_MODE_PROMPT);
    });

    it('passes an unrecognized override through untouched (general fallthrough — Clarify/Recap/FollowUp/Answer, etc.)', () => {
        const augmented = 'some other prompt\n\n## ACTIVE MODE\nSome suffix';
        expect(resolveGemmaSystemPrompt('some other prompt', augmented)).toBe(augmented);
    });

    it('WhatToAnswerLLM coding path (UNIVERSAL_WHAT_TO_ANSWER_PROMPT): resolved prompt + full hybrid style suffix', () => {
        const augmented = `${UNIVERSAL_WHAT_TO_ANSWER_PROMPT}\n\n## ACTIVE MODE\nSome suffix`;
        const result = resolveGemmaSystemPrompt(UNIVERSAL_WHAT_TO_ANSWER_PROMPT, augmented);
        expect(result).toBe(`${augmented}${CODING_STYLE_SUFFIX}`);
        // The caller's own content (incl. any mode augmentation) must survive —
        // this is not a silent replacement, only an addition.
        expect(result).toContain(augmented);
    });

    it('CodeHintLLM path (CODE_HINT_PROMPT): resolved prompt + lighter idiomatic-only suffix, no hand-roll exception', () => {
        const augmented = `${CODE_HINT_PROMPT}\n\n## ACTIVE MODE\nSome suffix`;
        const result = resolveGemmaSystemPrompt(CODE_HINT_PROMPT, augmented);
        expect(result).toBe(`${augmented}${GEMMA_CODE_HINT_STYLE_SUFFIX}`);
        expect(result).toContain(augmented);
        expect(result).toContain('DO NOT WRITE THE FULL SOLUTION');
    });
});

describe('stdlib framing rule — shared between the voice and screenshot coding paths', () => {
    // The rule used to be written out twice: inline in INTERVIEW_COPILOT_PROMPT
    // (screenshot/default path) and in CODING_STYLE_SUFFIX (voice path).
    // They drifted — a fix to one never reached the other, and the screenshot
    // path spuriously claimed "Python has collections.deque for this" on
    // sliding-window, anagram and bracket-matching problems. These tests fail if
    // either path stops composing the shared constants.
    it('both coding prompts carry the SAME trigger list', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toContain(STDLIB_FRAMING_APPLIES);
        expect(CODING_STYLE_SUFFIX).toContain(STDLIB_FRAMING_APPLIES);
    });

    it('both coding prompts carry the SAME over-application guard', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toContain(STDLIB_FRAMING_EXCLUDES);
        expect(CODING_STYLE_SUFFIX).toContain(STDLIB_FRAMING_EXCLUDES);
    });

    it('the trigger list maps interviewer phrasings, not just textbook tool names', () => {
        // Listing "collections.deque" alone did not fire on "push and pop from
        // both ends" (0/6 measured); the phrasings are what made it work.
        for (const phrase of [
            'push and pop from both ends',
            'leftmost/rightmost insertion point',
            'least recently used',
            'priority queue',
        ]) {
            expect(STDLIB_FRAMING_APPLIES).toContain(phrase);
        }
    });

    it('the guard names each case measured firing spuriously', () => {
        for (const kase of ['sliding-window', 'anagrams', 'bracket matching', 'k most frequent']) {
            expect(STDLIB_FRAMING_EXCLUDES).toContain(kase);
        }
    });

    it('the guard rejects NEAR-neighbour tools, not just auxiliary ones (LFU regression)', () => {
        // Measured 2026-07-30, n=4 per arm: "implement an LFU cache" made the model
        // claim "Python has collections.OrderedDict for this" 4/4 WITH the suffix and
        // 0/4 without it. OrderedDict gives least-RECENTLY-used; the claim is simply
        // false, and the answers then died on NameError. The exclusion has to cover
        // "close but wrong tool", not only "right tool, auxiliary use".
        expect(STDLIB_FRAMING_EXCLUDES).toMatch(/LFU/);
        expect(STDLIB_FRAMING_EXCLUDES).toMatch(/EXACT match|exactly/i);
        // The other measured mis-fire from the same run: heapq inside a median finder.
        expect(STDLIB_FRAMING_EXCLUDES).toMatch(/median/i);
    });

    it('every coding prompt insists the code still runs as pasted', () => {
        // Root cause of the LFU failures: the hand-roll rule was read as licence to
        // drop `import collections` while the code still used collections.defaultdict
        // internally. NameError, 4/4. Both coding paths must carry the counter-rule.
        expect(INTERVIEW_COPILOT_PROMPT).toContain(CODE_MUST_RUN_RULE);
        expect(CODING_STYLE_SUFFIX).toContain(CODE_MUST_RUN_RULE);
        expect(CODE_MUST_RUN_RULE).toMatch(/import/i);
        expect(CODE_MUST_RUN_RULE).toMatch(/NameError/);
    });
});

describe('resolveStyleSuffix — one mapping shared by the Gemma and plain-Gemini branches', () => {
    // The bug this locks down: streamChat applied the coding suffix ONLY inside
    // `activeModelId.startsWith('gemma-')`, while CredentialsManager defaults and
    // migrates every user to gemini-3.1-flash-lite. Measured result on the shipped
    // default: 0/4 correct framing and 13/15 executable, vs 15/15 with the suffix.
    it('gives the coding suffix to the coding caller', () => {
        expect(resolveStyleSuffix(UNIVERSAL_WHAT_TO_ANSWER_PROMPT)).toBe(CODING_STYLE_SUFFIX);
    });

    it('gives the lighter hint suffix to CodeHint', () => {
        expect(resolveStyleSuffix(CODE_HINT_PROMPT)).toBe(GEMMA_CODE_HINT_STYLE_SUFFIX);
    });

    it('gives nothing to callers with no style rule, and is safe to concatenate', () => {
        for (const caller of [BRAINSTORM_MODE_PROMPT, undefined, 'some unrelated prompt']) {
            expect(resolveStyleSuffix(caller)).toBe('');
        }
    });

    it('is what the Gemma branch uses, so the two branches cannot drift apart again', () => {
        const augmented = `${UNIVERSAL_WHAT_TO_ANSWER_PROMPT}\n\n[MODE]`;
        expect(resolveGemmaSystemPrompt(UNIVERSAL_WHAT_TO_ANSWER_PROMPT, augmented))
            .toBe(`${augmented}${resolveStyleSuffix(UNIVERSAL_WHAT_TO_ANSWER_PROMPT)}`);
    });

    it('the template sentence itself is identical in both paths', () => {
        const template = 'Python has <stdlib tool> for this, but let me implement the mechanism directly.';
        expect(INTERVIEW_COPILOT_PROMPT).toContain(template);
        expect(CODING_STYLE_SUFFIX).toContain(template);
    });

    it('CodeHint still has NO hand-roll rule — it debugs in-progress code', () => {
        expect(GEMMA_CODE_HINT_STYLE_SUFFIX).not.toContain(STDLIB_FRAMING_APPLIES);
        expect(GEMMA_CODE_HINT_STYLE_SUFFIX).not.toContain('implement the mechanism directly');
    });
});

describe('spoken word budget', () => {
    it('instructs the model to a target below the gate, because flash-lite lands ~5 words over what it is told', () => {
        expect(SPOKEN_WORD_TARGET).toBe(60);
        expect(SPOKEN_WORD_BUDGET).toBe(70);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).toContain(`AT MOST ${SPOKEN_WORD_TARGET} words`);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).not.toContain(`AT MOST ${SPOKEN_WORD_BUDGET} words`);
    });

    it('carries the structured multi-part rule (bare arms: 8→13 and 10→14 acceptable of 20, 0 wrong, 2026-09-09)', () => {
        expect(SPOKEN_WORD_CEILING).toBe(150);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).toContain('[ANSWER THE QUESTION\'S STRUCTURE — THIS OVERRIDES THE LENGTH RULE ABOVE WHEN THE QUESTION HAS SEVERAL PARTS]');
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).toContain(`never more than ${SPOKEN_WORD_CEILING} words in total`);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).toContain('Never output code, SQL text, formulas, LaTeX, markdown or numbered lists');
        // The rule goes LAST, and that is measured, not stylistic. The arms that justify it
        // appended it to the end of this whole prompt and scored 13/20 acceptable against
        // 8/20 without it. Shipped directly after the length paragraph instead, the identical
        // text scored 9/20 — no better than no rule, with the same four delivery failures
        // (code blocks and raw LaTeX) that its own third bullet forbids. Only the position
        // differed, so the position is the assertion.
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.indexOf('[ANSWER THE QUESTION\'S STRUCTURE')).toBeGreaterThan(VERBAL_WHAT_TO_ANSWER_PROMPT.indexOf('Rules for that block:'));
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.trimEnd().endsWith('- Still first person, still open with substance, still no questions back.')).toBe(true);
    });
});
