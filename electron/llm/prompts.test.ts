import { describe, it, expect } from 'vitest';
import {
    INTERVIEW_COPILOT_PROMPT,
    CODE_HINT_PROMPT,
    BRAINSTORM_MODE_PROMPT,
    UNIVERSAL_WHAT_TO_ANSWER_PROMPT,
    GEMMA_CODING_STYLE_SUFFIX,
    GEMMA_CODE_HINT_STYLE_SUFFIX,
    STDLIB_FRAMING_APPLIES,
    STDLIB_FRAMING_EXCLUDES,
    resolveGemmaSystemPrompt,
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

describe('GEMMA_CODING_STYLE_SUFFIX / GEMMA_CODE_HINT_STYLE_SUFFIX content', () => {
    it('full suffix (fresh-solution paths) uses the same hybrid framing as INTERVIEW_COPILOT_PROMPT', () => {
        expect(GEMMA_CODING_STYLE_SUFFIX).toMatch(/idiomatic|Pythonic/i);
        expect(GEMMA_CODING_STYLE_SUFFIX).toMatch(/OrderedDict/);
        expect(GEMMA_CODING_STYLE_SUFFIX).toMatch(/opening.*sentence/i);
        expect(GEMMA_CODING_STYLE_SUFFIX).toMatch(/by hand/i);
        // Reinforcement (2026-07): front-loaded fill-in template + hard failure
        // framing, after a live miss on the Live Mode path.
        expect(GEMMA_CODING_STYLE_SUFFIX).toMatch(/but let me implement the mechanism directly/);
        expect(GEMMA_CODING_STYLE_SUFFIX).toMatch(/skipping it is a failure/i);
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
        expect(result).toBe(`${augmented}${GEMMA_CODING_STYLE_SUFFIX}`);
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
    // (screenshot/default path) and in GEMMA_CODING_STYLE_SUFFIX (voice path).
    // They drifted — a fix to one never reached the other, and the screenshot
    // path spuriously claimed "Python has collections.deque for this" on
    // sliding-window, anagram and bracket-matching problems. These tests fail if
    // either path stops composing the shared constants.
    it('both coding prompts carry the SAME trigger list', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toContain(STDLIB_FRAMING_APPLIES);
        expect(GEMMA_CODING_STYLE_SUFFIX).toContain(STDLIB_FRAMING_APPLIES);
    });

    it('both coding prompts carry the SAME over-application guard', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toContain(STDLIB_FRAMING_EXCLUDES);
        expect(GEMMA_CODING_STYLE_SUFFIX).toContain(STDLIB_FRAMING_EXCLUDES);
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

    it('the template sentence itself is identical in both paths', () => {
        const template = 'Python has <stdlib tool> for this, but let me implement the mechanism directly.';
        expect(INTERVIEW_COPILOT_PROMPT).toContain(template);
        expect(GEMMA_CODING_STYLE_SUFFIX).toContain(template);
    });

    it('CodeHint still has NO hand-roll rule — it debugs in-progress code', () => {
        expect(GEMMA_CODE_HINT_STYLE_SUFFIX).not.toContain(STDLIB_FRAMING_APPLIES);
        expect(GEMMA_CODE_HINT_STYLE_SUFFIX).not.toContain('implement the mechanism directly');
    });
});
