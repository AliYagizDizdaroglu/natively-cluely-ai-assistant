import { describe, it, expect } from 'vitest';
import { classifyIntent } from './IntentClassifier';
import { IntentType } from './types';
// The 52 spoken questions of the flight test. On 2026-09-02, 25 of 27
// classifications were "negotiation" — for Docker, Airflow and Kubernetes.
// @ts-ignore — untyped ESM harness module
import { INTERVIEW } from '../test/golden/interview60.questions.mjs';

describe('classifyIntent — negotiation must need a negotiation word', () => {
    it('classifies none of the 76 spoken interview questions as negotiation', () => {
        // 52 base + 6 long design questions + 18 follow-ups (2026-09-08 roster).
        const spoken = (INTERVIEW as any[]).filter((i) => i.kind !== 'screenshot');
        expect(spoken.length).toBe(76);
        const wrong = spoken.filter((i) => classifyIntent(i.q) === IntentType.NEGOTIATION).map((i) => i.id);
        expect(wrong).toEqual([]);
    });
    it('still recognises real negotiation questions', () => {
        for (const q of [
            'What are your salary expectations for this role?',
            'We can offer 140k base plus equity — how does that sound?',
            'Is the compensation package negotiable?',
            'What signing bonus would make this work for you?',
        ]) expect(classifyIntent(q)).toBe(IntentType.NEGOTIATION);
    });
    it('weak words alone do not trigger negotiation', () => {
        expect(classifyIntent('What do you expect the base image to contain?')).not.toBe(IntentType.NEGOTIATION);
        expect(classifyIntent('How would you reduce the payload size of the request?')).not.toBe(IntentType.NEGOTIATION);
        expect(classifyIntent('What is the requirement for the range of a counter in this stock system?')).not.toBe(IntentType.NEGOTIATION);
    });
    it('matches whole words, not substrings ("pay" is not in "payload", "base" is not in "database")', () => {
        expect(classifyIntent('How do you scale the database?')).toBe(IntentType.TECHNICAL);
    });
    it('keeps the other categories as before', () => {
        expect(classifyIntent('Tell me about yourself.')).toBe(IntentType.INTRO);
        expect(classifyIntent('What is the company culture like?')).toBe(IntentType.COMPANY_RESEARCH);
        expect(classifyIntent('Walk me through your projects.')).toBe(IntentType.PROFILE_DETAIL);
        expect(classifyIntent('Explain the algorithm complexity.')).toBe(IntentType.TECHNICAL);
        expect(classifyIntent('Good morning.')).toBe(IntentType.GENERAL);
    });
});
