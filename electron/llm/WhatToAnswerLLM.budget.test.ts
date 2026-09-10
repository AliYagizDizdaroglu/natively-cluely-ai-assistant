import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/** The verbal path's stream is cut at 80 words at a sentence end (spec 2026-09-04 §4.2); the coding path is exempt. */
const sentence = (n: number, i: number) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
const words = (s: string) => (s.match(/\S+/g) ?? []).length;
const SIX = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');
const FOUR = [1, 2, 3, 4].map((i) => sentence(30, i)).join(' ');   // sentence ends at 30, 60, 90, 120 words
const FIVE = [1, 2, 3, 4, 5].map((i) => sentence(40, i)).join(' ');   // sentence ends at 40, 80, 120, 160, 200 words

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

describe('WhatToAnswerLLM word budget', () => {
    afterEach(() => vi.restoreAllMocks());

    it('verbal: 120 words in six sentences come out as 80, the source is not drained, the budget line is logged', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper, consumed, total } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Walk me through it.', undefined, VERBAL));
        expect(words(out)).toBe(80);
        expect(consumed()).toBeLessThan(total);
        expect(logs).toContain('[Answer] budget: words=80 cut=yes allowance=no');
    });
    it('behavioral (fast path) is under the same budget', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Tell me about a time.', undefined, { ...VERBAL, intent: 'behavioral' }));
        expect(words(out)).toBe(80);
        expect(logs.some((l) => l.startsWith('[Answer] budget: words=80'))).toBe(true);
    });
    it('coding is exempt: no cut, no budget line', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Write it.', undefined, CODING));
        expect(words(out)).toBe(120);
        expect(logs.some((l) => l.startsWith('[Answer] budget:'))).toBe(false);
    });
    it('verbal: the sentence in progress at 80 finishes (floor 80): four 30-word sentences come out as 90', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(FOUR);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Walk me through it.', undefined, VERBAL));
        expect(words(out)).toBe(90);
        expect(logs).toContain('[Answer] budget: words=90 cut=yes allowance=yes');
    });
    it('a 60-word question gets a 150-word limit: four 40-word sentences come out as 160 (the sentence in progress at 150 finishes)', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(FIVE);
        const question = sentence(60, 9);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream(`[INTERVIEWER]: ${question}`, undefined, VERBAL));
        expect(words(out)).toBe(160);
        expect(logs).toContain('[Answer] budget: words=160 cut=yes allowance=yes');
    });
});
