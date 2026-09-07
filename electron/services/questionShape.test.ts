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
    it('every base and long script question is whole', () => {
        for (const item of SPOKEN.filter((i: any) => i.level !== 'followup')) expect(looksFragmentary(item.q), item.q).toBe(false);
    });
    it('follow-ups that open with a conjunction are held (2.5 s), not answered on arrival — the rest are whole', () => {
        // 2026-09-08 roster: five follow-ups start with "And …", the way a real interviewer
        // chains on the previous answer. By text shape alone they are indistinguishable
        // from a Deepgram tail (M27: "And when would you not?"), so main.ts holds them for
        // the other ear and answers on the hold's expiry — a +2.5 s cost the after9 detect
        // latency will show, not a lost question.
        const followups = SPOKEN.filter((i: any) => i.level === 'followup');
        expect(followups.length).toBe(18);
        for (const item of followups) expect(looksFragmentary(item.q), item.q).toBe(/^(and|so|but|or|then|because)\b/i.test(item.q));
    });
    it('the length rule is load-bearing: an opener word under 4 words is still fragmentary', () => {
        // 'Serving.'/'Latency is up.' (above) also pass through the opener
        // fallthrough with no length rule at all, so they don't isolate it.
        // 'What now.' has an opener ("what") and no '?', so only the < 4
        // words rule makes this true.
        expect(looksFragmentary('What now.')).toBe(true);
    });
    it('the terminal "?" rule is load-bearing: a non-opener first word is still whole when it ends in "?"', () => {
        // Every existing '?' example above also starts with an opener word,
        // so none of them isolate this rule. "Running" is not an opener.
        expect(looksFragmentary('Running the tests now?')).toBe(false);
    });
    it('a contraction opener keeps its word after the apostrophe is stripped', () => {
        // With a period the terminal-punctuation rule does not fire, so only the opener
        // rule decides — which is what this test pins.
        expect(looksFragmentary("Who's on call tonight.")).toBe(false);
    });
    it('leading punctuation glued to the first word does not hide its opener', () => {
        // A smart quote glued onto "What" as one token ('"What') must not
        // erase the whole word: strip the leading punctuation run first,
        // then cut at the first remaining non-letter.
        expect(looksFragmentary('"What should we deploy.')).toBe(false);
    });
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
});
