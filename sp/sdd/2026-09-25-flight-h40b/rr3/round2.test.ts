import { describe, it, expect } from 'vitest';
import { classifyIntent } from './IntentClassifier';
import { IntentType } from './types';
// The 52 spoken questions of the flight test. On 2026-09-02, 25 of 27
// classifications were "negotiation" — for Docker, Airflow and Kubernetes.
// @ts-ignore — untyped ESM harness module
import { INTERVIEW } from '../test/golden/interview60.questions.mjs';
// @ts-ignore — untyped ESM harness module
import { SPOKEN as HOLDOUT_SPOKEN } from '../test/golden/holdout40.questions.mjs';

describe('classifyIntent — negotiation must need a negotiation word', () => {
    it('classifies none of the 76 spoken interview questions as negotiation', () => {
        // 52 base + 6 long design questions + 18 follow-ups (2026-09-08 roster).
        const spoken = (INTERVIEW as any[]).filter((i) => i.kind !== 'screenshot');
        expect(spoken.length).toBe(76);
        const wrong = spoken.filter((i) => classifyIntent(i.q) === IntentType.NEGOTIATION).map((i) => i.id);
        expect(wrong).toEqual([]);
    });
    it('classifies none of holdout40\'s 45 spoken questions as negotiation (h40a R09 went to the coaching card on "salary", 2026-09-24)', () => {
        expect((HOLDOUT_SPOKEN as any[]).length).toBe(45);
        const wrong = (HOLDOUT_SPOKEN as any[]).filter((i) => classifyIntent(i.q) === IntentType.NEGOTIATION).map((i) => i.id);
        expect(wrong).toEqual([]);
    });
    it('a technical question that mentions salary is technical, not negotiation (bare word or phrase, with a technical marker)', () => {
        expect(classifyIntent('Give me the SQL for the second highest salary in each department.')).toBe(IntentType.TECHNICAL);
    });
    it('a technical marker beats any pay term (the h40a R09 class: a coaching card is unspeakable on a technical question)', () => {
        for (const q of [
            'For each department, write a query that returns the salary range: the minimum and the maximum salary.',
            'Write a SQL query that joins each employee to the pay grade whose salary range contains their salary.',
            "Compute each employee's total pay in SQL as base salary plus bonus.",
            'Train a regression model that predicts expected salary from years of experience.',
            'Write a query that computes total compensation per department.',
            'Design a pipeline that ingests equity trades from three exchanges.',
        ]) expect(classifyIntent(q)).not.toBe(IntentType.NEGOTIATION);
    });
    it('a pay question without a technical marker is still a negotiation', () => {
        for (const q of [
            "What's your expected salary?",
            'What is your salary range for this level?',
            'Is the compensation package negotiable?',
        ]) expect(classifyIntent(q)).toBe(IntentType.NEGOTIATION);
    });
    it('a negotiation idiom is not a technical marker ("on the table", "join us")', () => {
        for (const q of [
            'A signing bonus is also on the table if that helps you decide.',
            'What salary would it take for you to join us?',
            'Is equity on the table for you, or would you rather have a higher base?',
        ]) expect(classifyIntent(q)).toBe(IntentType.NEGOTIATION);
    });
    it('a plural technical marker vetoes too (queries, tables, functions)', () => {
        for (const q of [
            "Write queries that return each department's salary range.",
            "Given the employees and departments tables, return each department's salary range.",
            'Use window functions to rank employees by base salary within each department.',
        ]) expect(classifyIntent(q)).not.toBe(IntentType.NEGOTIATION);
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
