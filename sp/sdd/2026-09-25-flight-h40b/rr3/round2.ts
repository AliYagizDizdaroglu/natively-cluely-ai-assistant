// electron/knowledge/IntentClassifier.ts
// Keyword-based intent classification for routing questions to the right pipeline.

import { IntentType } from './types';

const TECHNICAL_KEYWORDS = [
    'algorithm', 'complexity', 'design pattern', 'architecture', 'system design',
    'database', 'sql', 'api', 'rest', 'graphql', 'microservice', 'docker', 'kubernetes',
    'ci/cd', 'testing', 'debugging', 'optimize', 'performance', 'scalability',
    'data structure', 'recursion', 'concurrency', 'thread', 'async', 'memory',
    'code', 'implement', 'build', 'write', 'function', 'class', 'object',
];

const INTRO_KEYWORDS = [
    'introduce yourself', 'tell me about yourself', 'who are you',
    'walk me through your background', 'brief introduction', 'self introduction',
];

const COMPANY_KEYWORDS = [
    'company', 'culture', 'values', 'mission', 'vision', 'glassdoor', 'reviews',
    'competitors', 'industry', 'market', 'strategy', 'product', 'team', 'growth',
    'benefits', 'perks', 'work life', 'remote', 'office', 'environment',
];

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

// A marker vetoes NEGOTIATION. On 2026-09-24 (h40a R09) "the SQL for the second highest salary
// in each department" went to the negotiation coaching card, and the phrase list alone still sends
// "write a query that returns the salary range" there. A technical question wrongly sent to the
// card is unspeakable; a negotiation question wrongly vetoed gets an ordinary answer without the
// salary block. "table" and "join" are not markers: "on the table" and "join us" are negotiation
// idioms.
const TECHNICAL_CONTEXT = [
    'sql', 'query', 'queries', 'tables', 'database', 'databases', 'schema', 'schemas', 'column',
    'columns', 'function', 'functions', 'algorithm', 'algorithms', 'regression', 'pipeline',
    'pipelines', 'dataset', 'datasets', 'implement', 'code',
];

const PROFILE_DETAIL_KEYWORDS = [
    'projects', 'experience', 'work history', 'achievements', 'certifications',
    'education', 'skills', 'background', 'what have you', 'tell me about your',
    'describe your', 'walk me through', 'portfolio', 'leadership',
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole-word (or whole-phrase) match; "pay" must not match "payload", "base" must not match "database". */
export function hasWord(lower: string, term: string): boolean {
    return new RegExp(`(^|[^a-z0-9])${escapeRe(term)}(?![a-z0-9])`).test(lower);
}

/**
 * Classifies the intent of a question using keyword matching.
 */
export function classifyIntent(question: string): IntentType {
    const lower = question.toLowerCase();

    if (INTRO_KEYWORDS.some(kw => hasWord(lower, kw))) return IntentType.INTRO;
    const strong = STRONG_NEGOTIATION.some(kw => hasWord(lower, kw)) && !TECHNICAL_CONTEXT.some(kw => hasWord(lower, kw));
    if (strong) return IntentType.NEGOTIATION;
    if (COMPANY_KEYWORDS.some(kw => hasWord(lower, kw))) return IntentType.COMPANY_RESEARCH;
    if (PROFILE_DETAIL_KEYWORDS.some(kw => hasWord(lower, kw))) return IntentType.PROFILE_DETAIL;
    if (TECHNICAL_KEYWORDS.some(kw => hasWord(lower, kw))) return IntentType.TECHNICAL;

    return IntentType.GENERAL;
}

/**
 * Returns true if the question likely needs company information.
 */
export function needsCompanyResearch(question: string): boolean {
    const lower = question.toLowerCase();
    return COMPANY_KEYWORDS.some(kw => lower.includes(kw));
}
