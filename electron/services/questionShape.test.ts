import { describe, it, expect } from 'vitest';
import { isFragment, looksLikeQuestion, looksFragmentary } from './questionShape';
// @ts-ignore — untyped ESM harness module
import { SPOKEN } from '../test/golden/interview60.questions.mjs';

describe('isFragment', () => {
    it('fewer than 4 words is a fragment', () => {
        expect(isFragment('training jobs are')).toBe(true); // 3 words (run-2 H06)
        expect(isFragment('yeah')).toBe(true);
        expect(isFragment('')).toBe(true);
    });

    it('4 or more words is not a fragment', () => {
        expect(isFragment('training jobs are queued')).toBe(false); // exactly 4
        expect(isFragment('What is a Kubernetes Pod?')).toBe(false);
    });
});

describe('looksLikeQuestion', () => {
    it('run 3, W09/M10: two STT finals joined, ellipsis/period runs normalized to a space, still question-shaped', () => {
        // The Groq detection model hit its free-tier TPD limit (64 of 85
        // detect() calls returned null); these two texts are QuestionDetector's
        // own join of the two interviewer finals each was split into.
        expect(
            looksLikeQuestion('What problem does infrastructure as code actually... solve....')
        ).toBe(true);
        expect(
            looksLikeQuestion('Which metrics would you put on a dashboard for a production... model....')
        ).toBe(true);
    });

    it('a plain statement is not question-shaped', () => {
        expect(looksLikeQuestion('We use Airflow for orchestration.')).toBe(false);
    });

    it('a fragment is also not question-shaped by this check (isFragment is the separate, length-based guard)', () => {
        expect(looksLikeQuestion('training jobs are')).toBe(false);
    });

    it('ends with a question mark', () => {
        expect(looksLikeQuestion('Kubernetes or ECS for this?')).toBe(true);
    });

    it('round 8: an opener word that also starts plain statements is excluded, so those statements are not question-shaped', () => {
        // "let"/"is"/"give" were all in QUESTION_WORDS through round 7,
        // purely because they can also open a question ("Let's...", "Is
        // X...", "Give an example..."). A false positive here does not just
        // show a stray chip, it gets answered hands-free, so round 8 narrows
        // the list to words that plausibly open an interview question.
        expect(looksLikeQuestion('Let me tell you about the team.')).toBe(false);
        expect(looksLikeQuestion('Is that clear.')).toBe(false);
    });

    it('round 8: a narrowed opener word ("tell") still matches', () => {
        expect(looksLikeQuestion('Tell me about a time you disagreed with a manager.')).toBe(true);
    });

    it('round 8: the terminal "?" rule is unaffected by the narrower opener list', () => {
        expect(looksLikeQuestion('Is a Pod the same as a container?')).toBe(true);
    });
});

describe('looksFragmentary', () => {
    it('the two texts the 2026-09-04 hour would have held, both real fragments', () => {
        expect(looksFragmentary('And when would you not?')).toBe(true); // M27: Deepgram lost the head
        expect(looksFragmentary('but the input schema is unchanged How do you debug this?')).toBe(true); // heuristic chip, conjunction opener
    });
    it('fewer than four words is fragmentary, as isFragment', () => {
        expect(looksFragmentary('Serving.')).toBe(true);
        expect(looksFragmentary('Latency is up.')).toBe(true);
    });
    it('a short statement without a question mark or a question opener is fragmentary', () => {
        expect(looksFragmentary('Cross many model services.')).toBe(true); // M26's STT tail
        expect(looksFragmentary('Latency is creeping up.')).toBe(true);
    });
    it('a short imperative or question is whole', () => {
        expect(looksFragmentary('Tell me about yourself.')).toBe(false);
        expect(looksFragmentary('What is a Pod?')).toBe(false);
        expect(looksFragmentary('Is that clear enough?')).toBe(false);
    });
    it('long text is whole even without punctuation (the degraded detector strips it)', () => {
        expect(looksFragmentary('Someone changed the resource by hand and now your stack will not update What do you do')).toBe(false);
    });
    it('every spoken script question is whole', () => {
        for (const item of SPOKEN) expect(looksFragmentary(item.q), item.q).toBe(false);
    });
});
