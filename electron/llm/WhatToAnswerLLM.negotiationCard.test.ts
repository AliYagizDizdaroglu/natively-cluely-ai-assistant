import { describe, it, expect, vi } from 'vitest';

// Same import-time shims as LLMHelper.knowledgeBudget.test.ts (electron surface + Gemini SDK).
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => 'C:/tmp'),
        getName: vi.fn(() => 'test'),
        on: vi.fn(),
    },
    safeStorage: {
        isEncryptionAvailable: () => false,
        encryptString: (s: string) => Buffer.from(s),
        decryptString: (b: Buffer) => b.toString(),
    },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

// The card skips the answer model and the knowledge engine is a stand-in, so a request here is a
// failure, never a network call.
const generateContentStream = vi.fn(async () => { throw new Error('the coaching card must not call the answer model'); });

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: { generateContentStream },
    })),
}));

import { LLMHelper } from '../LLMHelper';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';
import { SPOKEN_WORD_GUARD } from './verbalStreamFilter';

/**
 * streamChat's knowledge short-circuit answers a live salary question with a coaching card: one
 * JSON object ({"__negotiationCoaching":…}) in place of speech, without the answer model. On the
 * verbal route that object then crosses the spoken filter chain, and the renderer draws the card
 * only if JSON.parse of the finished answer succeeds (NativelyInterface.tsx,
 * onIntelligenceSuggestedAnswer); anything else is shown as raw text.
 */

// The card as LiveNegotiationAdvisor builds it (knowledge/types.ts, LiveCoachingResponse). Both
// texts are meant to be model output, and the advisor asks for "1-2 sentences" and "under 3
// sentences" but checks neither. As of 2026-09-30 its model never sees that prompt (main.ts hands
// generateContentStructured only contents[0]), so every card seen so far is the ~31-word fallback.
const CARD = {
    tacticalNote: 'Recruiter made an offer. Their offer: USD 120,000.\nCounter above your target and ground it in market data.',
    exactScript: '$120k is below the market range for this role. Given the pipeline work I led, I am looking for "$135,000 base".',
    showSilenceTimer: true,
    phase: 'ANCHOR',
    theirOffer: 120000,
    yourTarget: 135000,
    currency: 'USD',
    isNegotiationCoaching: true,
};

// A script from a model that ignored "under 3 sentences": four paragraphs.
const LONG_SCRIPT = [
    '$120k is a fair place to start, and I appreciate you sharing the number. Based on what I have delivered and the market data for senior platform roles, I am looking for $135,000 in base salary.',
    'Let me explain where that comes from. In my current role I cut our model deployment time from two weeks to two days, which let the team ship eleven models last year instead of four. I also moved our training pipelines to spot instances, which took roughly $400,000 a year off the compute bill. Those are the problems this role exists to solve, so I expect to be productive from the first month.',
    'On the market side, the ranges I have seen for this level in this city run from $128,000 to $145,000, and the two other processes I am in both sit inside that band. I would rather join your team, which is why I am being direct about the number instead of letting this drag on.',
    'If the base really is fixed at $120k, I am open to closing the gap another way. Could we look at a signing bonus or additional equity to bring the first-year total closer to $135,000? What is the budget band for this role, and is there any flexibility in it?',
].join('\n\n');

// The Context toggle's knowledge engine on a live salary question, reduced to what streamChat's
// intercept reads (KnowledgeOrchestrator.processQuestion, "Live negotiation path").
const coaching = (card: typeof CARD) => ({
    isKnowledgeMode: () => true,
    feedForDepthScoring: () => { /* no-op */ },
    processQuestion: async () => ({ systemPromptInjection: '', contextBlock: '', isIntroQuestion: false, liveNegotiationResponse: card }),
});

const GENERAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
const words = (s: string) => (s.match(/\S+/g) ?? []).length;

/** The finished answer as IntelligenceEngine hands it to the renderer: every token, minus the model-source sentinels. */
async function finishedAnswer(card: typeof CARD): Promise<string> {
    const helper = new LLMHelper('fake-gemini-key');
    helper.setKnowledgeOrchestrator(coaching(card));
    let out = '';
    for await (const c of new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: We can offer 120k. How does that sound?', undefined, GENERAL)) out += c;
    return out.replace(/__model_source:[^_]*__/g, '');
}

describe('a negotiation coaching card crosses the verbal route as the JSON the renderer parses', () => {
    it('keeps a salary figure that follows a quote, and an escaped newline', async () => {
        expect(JSON.parse(await finishedAnswer(CARD))).toEqual({ __negotiationCoaching: CARD });
    });

    it('arrives whole when its texts run past the spoken word guard', async () => {
        const card = { ...CARD, exactScript: LONG_SCRIPT };
        expect(words(JSON.stringify({ __negotiationCoaching: card }))).toBeGreaterThan(SPOKEN_WORD_GUARD.limit);
        expect(JSON.parse(await finishedAnswer(card))).toEqual({ __negotiationCoaching: card });
    });
});
