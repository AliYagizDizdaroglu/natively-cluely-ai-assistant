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

const NEGOTIATION_KEYWORDS = [
    'salary', 'compensation', 'pay', 'offer', 'negotiate', 'counter', 'package',
    'equity', 'stock', 'rsu', 'signing bonus', 'raise', 'budget', 'range',
    'base', 'total comp', 'market rate', 'worth', 'expect', 'requirement',
];

const PROFILE_DETAIL_KEYWORDS = [
    'projects', 'experience', 'work history', 'achievements', 'certifications',
    'education', 'skills', 'background', 'what have you', 'tell me about your',
    'describe your', 'walk me through', 'portfolio', 'leadership',
];

/**
 * Classifies the intent of a question using keyword matching.
 */
export function classifyIntent(question: string): IntentType {
    const lower = question.toLowerCase();

    if (INTRO_KEYWORDS.some(kw => lower.includes(kw))) return IntentType.INTRO;
    if (NEGOTIATION_KEYWORDS.some(kw => lower.includes(kw))) return IntentType.NEGOTIATION;
    if (COMPANY_KEYWORDS.some(kw => lower.includes(kw))) return IntentType.COMPANY_RESEARCH;
    if (PROFILE_DETAIL_KEYWORDS.some(kw => lower.includes(kw))) return IntentType.PROFILE_DETAIL;
    if (TECHNICAL_KEYWORDS.some(kw => lower.includes(kw))) return IntentType.TECHNICAL;

    return IntentType.GENERAL;
}

/**
 * Returns true if the question likely needs company information.
 */
export function needsCompanyResearch(question: string): boolean {
    const lower = question.toLowerCase();
    return COMPANY_KEYWORDS.some(kw => lower.includes(kw));
}
