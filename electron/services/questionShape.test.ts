import { describe, it, expect } from 'vitest';
import { isFragment, looksLikeQuestion } from './questionShape';

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
