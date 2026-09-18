import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/**
 * The verbal path streams under SPOKEN_WORD_GUARD (clamp at 200 words, flight
 * s50c 2026-09-12) — never the old question-scaled sentence cut; the coding
 * path is exempt.
 */
const sentence = (n: number, i: number) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
const words = (s: string) => (s.match(/\S+/g) ?? []).length;
const SIX = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');        // 120 words
const FOUR = [1, 2, 3, 4].map((i) => sentence(i === 4 ? 50 : 40, i)).join(' ');   // 170 words — the bare arm's longest (S2Q02)
const FIVE = [1, 2, 3, 4, 5].map((i) => sentence(46, i)).join(' ');         // 230 words — a runaway

function makeHelper(text: string) {
    let consumed = 0;
    const total = Math.ceil(text.length / 9);
    async function* stream(): AsyncGenerator<string> {
        for (let i = 0; i < text.length; i += 9) { consumed++; yield text.slice(i, i + 9); }
    }
    const helper = {
        streamChat: vi.fn(() => stream()),
        streamVerbalWithGeminiFlash: vi.fn(() => stream()),
        getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite'),
    } as any;
    return { helper, consumed: () => consumed, total };
}
async function drain(gen: AsyncGenerator<string>): Promise<string> {
    let out = '';
    for await (const c of gen) out += c;
    return out.replace(/__model_source:[^_]*__/g, '');
}
const VERBAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
const CODING = { intent: 'coding', confidence: 0.9, answerShape: '' } as any;

describe('WhatToAnswerLLM word guard', () => {
    afterEach(() => vi.restoreAllMocks());

    it('verbal: 120 words in six sentences to a short question come out whole (the 80-word cut is gone), the budget line is logged', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper, consumed, total } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Walk me through it.', undefined, VERBAL));
        expect(words(out)).toBe(120);
        expect(consumed()).toBe(total);
        expect(logs).toContain('[Answer] budget: words=120 cut=no allowance=no');
    });
    it('behavioral (fast path) streams under the same guard', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Tell me about a time.', undefined, { ...VERBAL, intent: 'behavioral' }));
        expect(words(out)).toBe(120);
        expect(logs).toContain('[Answer] budget: words=120 cut=no allowance=no');
    });
    it('coding is exempt: no guard, no budget line', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Write it.', undefined, CODING));
        expect(words(out)).toBe(120);
        expect(logs.some((l) => l.startsWith('[Answer] budget:'))).toBe(false);
    });
    it('verbal: a 170-word answer streams whole whether the question is 5 or 60 words — the guard does not scale with the question', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        for (const question of ['Walk me through it.', sentence(60, 9)]) {
            const { helper } = makeHelper(FOUR);
            const out = await drain(new WhatToAnswerLLM(helper).generateStream(`[INTERVIEWER]: ${question}`, undefined, VERBAL));
            expect(words(out)).toBe(170);
        }
        expect(logs.filter((l) => l === '[Answer] budget: words=170 cut=no allowance=no')).toHaveLength(2);
    });
    it('verbal: a 230-word runaway stops on its last finished sentence, under 200, and the source is not drained', async () => {
        // Sentences end at 46, 92, 138, 184, 230 words; the fifth would pass 200, so the spoken
        // answer ends at 184 with its full stop rather than being sliced at word 200. Flight s50i
        // (2026-09-18) is why — see SPOKEN_WORD_GUARD.
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper, consumed, total } = makeHelper(FIVE);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Walk me through it.', undefined, VERBAL));
        expect(words(out)).toBe(184);
        expect(out.trimEnd()).toMatch(/[.!?]$/);
        expect(consumed()).toBeLessThan(total);
        expect(logs).toContain('[Answer] budget: words=184 cut=yes allowance=no');
    });
});
