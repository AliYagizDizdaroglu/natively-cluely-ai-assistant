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

// A strong term alone means negotiation. Weak terms are everyday technical
// vocabulary ("base image", "expect", "range", "stock") and count only next to
// a strong one — on 2026-09-02 they labelled 25 of 27 technical questions
// "negotiation" and routed them through the coaching path.
const STRONG_NEGOTIATION = [
    'salary', 'compensation', 'negotiate', 'negotiable', 'equity', 'rsu', 'rsus', 'signing bonus',
    'total comp', 'market rate', 'counteroffer', 'counter offer',
];
const WEAK_NEGOTIATION = [
    'base', 'range', 'expect', 'expectations', 'pay', 'offer', 'package', 'budget', 'raise', 'stock', 'worth', 'requirement',
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
    const strong = STRONG_NEGOTIATION.some(kw => hasWord(lower, kw));
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
