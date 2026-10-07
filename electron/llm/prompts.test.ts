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
    CUE_RULE, CUE_SHAPE_RULE, CUES_SENTINEL, CUE_MAX_LINES, CUE_MAX_WORDS, VERBAL_TYPED_PROMPT,
    SPOKEN_LENGTH_AND_DEPTH, cueRuleApplies, verbalPromptFor,
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
        // The rule goes LAST because that is the configuration the arms measured (they
        // appended it to the end of this whole prompt: 13/20 acceptable against 8/20 without
        // it). The 2026-09-10 "mid-block scores 9/20" comparison was a stale-build artifact,
        // and the n=20 arm's run-to-run noise is about ±5, so the position is asserted to
        // keep the measured configuration, not because a move was shown to hurt.
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.indexOf('[ANSWER THE QUESTION\'S STRUCTURE')).toBeGreaterThan(VERBAL_WHAT_TO_ANSWER_PROMPT.indexOf('Rules for that block:'));
        // Since cue mode (spec 2026-09-20) the cue rule follows the structured rule; nothing else may.
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.endsWith('- Still first person, still open with substance, still no questions back.' + CUE_RULE)).toBe(true);
    });
});

const SHORT_ANSWER_RULE = 'If the question can be answered in one or two words — yes or no, a choice between options it names, a name or a number — say exactly that first, then one supporting sentence: about 15 to 25 words in all. A question with several parts follows the structure rule below instead.';

describe('short-answer rule (bundle-1 SPEC 2)', () => {
    it('is in SPOKEN_LENGTH_AND_DEPTH exactly once, right after the "read aloud" line and before the structure rule', () => {
        expect(SPOKEN_LENGTH_AND_DEPTH.split(SHORT_ANSWER_RULE).length - 1).toBe(1);
        const at = SPOKEN_LENGTH_AND_DEPTH.indexOf(SHORT_ANSWER_RULE);
        expect(at).toBeGreaterThan(SPOKEN_LENGTH_AND_DEPTH.indexOf('Your spoken answer is read aloud'));
        expect(at).toBeLessThan(SPOKEN_LENGTH_AND_DEPTH.indexOf("[ANSWER THE QUESTION'S STRUCTURE"));
        expect(at).toBeLessThan(SPOKEN_LENGTH_AND_DEPTH.indexOf('If, and ONLY if, there is genuinely substantive depth'));
    });
    it('reaches both verbal prompts (typed chat included, D5) and the knowledge-budget check still matches', () => {
        expect(VERBAL_TYPED_PROMPT).toContain(SHORT_ANSWER_RULE);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).toContain(SHORT_ANSWER_RULE);
        expect(VERBAL_TYPED_PROMPT.includes(SPOKEN_LENGTH_AND_DEPTH)).toBe(true);
    });
    it('the structure rule still overrides length, and the tail pins hold', () => {
        expect(VERBAL_TYPED_PROMPT.endsWith('- Still first person, still open with substance, still no questions back.')).toBe(true);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.endsWith('- Still first person, still open with substance, still no questions back.' + CUE_RULE)).toBe(true);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).toContain("[ANSWER THE QUESTION'S STRUCTURE — THIS OVERRIDES THE LENGTH RULE ABOVE WHEN THE QUESTION HAS SEVERAL PARTS]");
    });
});

describe('cueRuleApplies / verbalPromptFor — cues by question shape (bundle-1 SPEC 3)', () => {
    // Invented questions of the table's shapes; the gate reads the heard question, never the router.
    it.each([
        ['a short definition', 'What is a vector database?', false],
        ['a choice joined by "or"', 'Should we pick Redis or Memcached for this?', false],
        ['a "difference between X and Y"', 'What is the difference between a mutex and a semaphore?', true],
        ['"X, and why Y"', 'Walk me through caching, and why it matters', true],
        ['a comma list', 'Name the layers, the caches, the queues', true],
        ['a semicolon', 'Describe the cache; then the queue', true],
        ['exactly 12 words, no markers', 'Can you describe how the system handles a sudden spike in traffic', false],
        ['a 13-word single clause', 'Can you describe how the system handles a sudden spike in traffic overnight', true],
        ['two question marks', 'What is a mutex? What is a semaphore?', true],
        ['one question mark', 'What is a mutex?', false],
        ['"and" inside a word is not a marker', 'What is a sandbox?', false],
        ['upper-case AND', 'Compare Kafka AND Pulsar', true],
        ['empty', '', false],
    ])('%s -> %s', (_label, q, applies) => {
        expect(cueRuleApplies(q as string)).toBe(applies);
    });
    it('verbalPromptFor sends the cue rule only when the gate says so', () => {
        expect(verbalPromptFor('What is a vector database?')).toBe(VERBAL_TYPED_PROMPT);
        expect(verbalPromptFor('Name the layers, the caches, the queues')).toBe(VERBAL_WHAT_TO_ANSWER_PROMPT);
        expect(verbalPromptFor('')).toBe(VERBAL_TYPED_PROMPT);
    });
});

describe('CUE_RULE — cue mode (spec 2026-09-20; limits and wording spec 2026-09-30)', () => {
    it('names the sentinel and the limits the engine enforces at the display boundary', () => {
        expect(CUES_SENTINEL).toBe('__CUES__');
        expect(CUE_MAX_LINES).toBe(3);
        expect(CUE_MAX_WORDS).toBe(5);
        expect(CUE_RULE).toContain('[CUES FIRST]');
        expect(CUE_RULE).toContain(CUES_SENTINEL);
        // The two edits every spike made to the captured prompt: the template line's number and
        // the shape bullet. Both follow the constants, so the prompt and the code cap cannot drift.
        expect(CUE_RULE).toContain(`1| <key phrase for the first part the question names, at most ${CUE_MAX_WORDS} words>`);
        expect(CUE_RULE.split(CUE_SHAPE_RULE).length - 1).toBe(1);
        // ...and where the old bullet stood: first under the block's rules, above the three kept bullets
        expect(CUE_RULE).toContain(`Rules for that block:\n${CUE_SHAPE_RULE}\n- Each line carries`);
        expect(CUE_RULE).not.toContain('Never more than');
        expect(CUE_RULE.startsWith('\n\n')).toBe(true);   // it is appended to a prompt that ends without a newline
    });

    it("the shape bullet is spike 6's winner, verbatim (passes/PREREGISTER-spike6.md, 2026-09-30): a swap edits this pin and the constant, nothing else", () => {
        // ── benched wording: one-first ──
        expect(CUE_SHAPE_RULE).toBe('- At most 3 lines, each at most 5 words. The first line is the answer itself in the fewest words that carry it: one or two words when that is enough (asked "Tabs or spaces?", the whole block is 1| Spaces). A one-part question gets exactly one line. Add a line only for another part the QUESTION names, never for a point you add on your own; when it names more than 3 parts, group related parts into themes so every part is still covered in 3 lines.');
        // The lines the delta keeps, unchanged.
        expect(CUE_RULE).toContain('- Each line carries the specific thing you will say for that part: the number, the named service, the mechanism, the trade-off. Never a generic label.');
        expect(CUE_RULE).toContain('- They are cues, not questions. Never address the listener.');
        expect(CUE_RULE).toContain('- The spoken answer follows on the next line, in the same form as always.');
    });

    it('sits at the tail of the verbal prompt, directly after the structured rule, and nowhere else', () => {
        // The structured rule was measured at the END of the prompt (13/20 against 8/20). The cue
        // rule goes after it; the bench measures this position rather than assuming it (§4).
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.endsWith('- Still first person, still open with substance, still no questions back.' + CUE_RULE)).toBe(true);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT.split(CUE_RULE).length - 1).toBe(1);
        expect(UNIVERSAL_WHAT_TO_ANSWER_PROMPT).not.toContain(CUES_SENTINEL);   // the coding path has no cue block
    });
});

describe('the typed chat path answers without a cue block (spec 2026-09-30 §3.6)', () => {
    it('the typed prompt is the hands-free prompt minus the cue rule, derived so the two cannot drift', () => {
        expect(VERBAL_TYPED_PROMPT).not.toContain(CUES_SENTINEL);
        expect(VERBAL_TYPED_PROMPT).not.toContain('[CUES FIRST]');
        expect(VERBAL_TYPED_PROMPT.endsWith('- Still first person, still open with substance, still no questions back.')).toBe(true);
        expect(VERBAL_WHAT_TO_ANSWER_PROMPT).toBe(`${VERBAL_TYPED_PROMPT}${CUE_RULE}`);
    });
});
