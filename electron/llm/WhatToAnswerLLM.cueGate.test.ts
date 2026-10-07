import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';
import { VERBAL_TYPED_PROMPT, VERBAL_WHAT_TO_ANSWER_PROMPT } from './prompts';

/**
 * Cues by question shape (bundle-1 SPEC 3.2): the verbal system prompt is chosen ONCE from the heard
 * question (lastInterviewerTurn) and every verbal call of the answer sends it, the fallback included.
 * The helper is a stub; the sent prompt is read off its call arguments.
 */
const PROSE = 'Ten million vectors take about thirty gigabytes. Quantizing to int eight cuts that to about seven and a half.';
const SHORT_Q = 'What is a vector database?';
const LONG_Q = 'Name the layers, the caches, the queues';

async function* ok(): AsyncGenerator<string> { yield PROSE; }
async function* failsBeforeFirstToken(): AsyncGenerator<string> { throw new Error('got status: 503 Service Unavailable'); }

function makeHelper(opts: { primaryFails?: boolean } = {}) {
    return {
        streamChat: vi.fn(() => (opts.primaryFails ? failsBeforeFirstToken() : ok())),
        streamVerbalWithGeminiFlash: vi.fn(() => (opts.primaryFails ? failsBeforeFirstToken() : ok())),
        getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite'),
    } as any;
}
const GENERAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
const BEHAVIORAL = { intent: 'behavioral', confidence: 0.9, answerShape: '' } as any;
const CODING = { intent: 'coding', confidence: 0.9, answerShape: '' } as any;

async function drain(gen: AsyncGenerator<string>): Promise<string> { let out = ''; for await (const c of gen) out += c; return out; }
const ask = (helper: any, q: string, intent: any) =>
    drain(new WhatToAnswerLLM(helper).generateStream(`[INTERVIEWER]: ${q}`, undefined, intent));
/** Every system prompt the helper was handed, in call order. streamChat takes it 4th, streamVerbalWithGeminiFlash 2nd. */
const sent = (h: any): string[] => [
    ...h.streamChat.mock.calls.map((c: any[]) => c[3]),
    ...h.streamVerbalWithGeminiFlash.mock.calls.map((c: any[]) => c[1]),
];

describe('WhatToAnswerLLM cue gate', () => {
    afterEach(() => vi.restoreAllMocks());

    it('short question, deep route: the sent system is VERBAL_TYPED_PROMPT; one "cue rule: skipped" line', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const h = makeHelper();
        await ask(h, SHORT_Q, GENERAL);
        expect(sent(h)).toEqual([VERBAL_TYPED_PROMPT]);
        expect(logs.filter((l) => l.startsWith('[Answer] cue rule:'))).toEqual(['[Answer] cue rule: skipped words=5']);
    });

    it('long question, deep route: the sent system is VERBAL_WHAT_TO_ANSWER_PROMPT; one "cue rule: sent" line', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const h = makeHelper();
        await ask(h, LONG_Q, GENERAL);
        expect(sent(h)).toEqual([VERBAL_WHAT_TO_ANSWER_PROMPT]);
        expect(logs.filter((l) => l.startsWith('[Answer] cue rule:'))).toEqual(['[Answer] cue rule: sent words=7']);
    });

    it('fast (behavioral) route follows the same gate', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const a = makeHelper(); await ask(a, SHORT_Q, BEHAVIORAL);
        expect(sent(a)).toEqual([VERBAL_TYPED_PROMPT]);
        const b = makeHelper(); await ask(b, LONG_Q, BEHAVIORAL);
        expect(sent(b)).toEqual([VERBAL_WHAT_TO_ANSWER_PROMPT]);
    });

    it('the fallback sends the same prompt as the primary, and the line is still logged once per answer', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        // the primary (streamChat, deep route) fails before its first token; the fallback is a second stream through streamVerbalWithGeminiFlash
        const failing = makeHelper({ primaryFails: true });
        failing.streamVerbalWithGeminiFlash.mockImplementation(() => ok());
        await ask(failing, SHORT_Q, GENERAL);
        expect(sent(failing)).toEqual([VERBAL_TYPED_PROMPT, VERBAL_TYPED_PROMPT]);
        const failingLong = makeHelper({ primaryFails: true });
        failingLong.streamVerbalWithGeminiFlash.mockImplementation(() => ok());
        await ask(failingLong, LONG_Q, GENERAL);
        expect(sent(failingLong)).toEqual([VERBAL_WHAT_TO_ANSWER_PROMPT, VERBAL_WHAT_TO_ANSWER_PROMPT]);
        expect(logs.filter((l) => l.startsWith('[Answer] cue rule:'))).toHaveLength(2);
    });

    it('review fix: a gate-skipped answer with no block logs the expected-empty marker IMMEDIATELY before the cues callback (pairs per answer, survives a supersede)', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const onCues = vi.fn((c: string[]) => { logs.push(`ONCUES ${JSON.stringify(c)}`); });
        await drain(new WhatToAnswerLLM(makeHelper()).generateStream(`[INTERVIEWER]: ${SHORT_Q}`, undefined, GENERAL, undefined, undefined, undefined, undefined, onCues));
        const i = logs.indexOf('ONCUES []');
        expect(i).toBeGreaterThan(0);
        expect(logs[i - 1]).toBe('[Answer] cue block: expected-empty (cue rule skipped)');
        // a long question (rule sent), or a skipped one that nevertheless wrote a block: no marker
        logs.length = 0;
        await drain(new WhatToAnswerLLM(makeHelper()).generateStream(`[INTERVIEWER]: ${LONG_Q}`, undefined, GENERAL, undefined, undefined, undefined, undefined, onCues));
        expect(logs.some((l) => l.includes('expected-empty'))).toBe(false);
        logs.length = 0;
        const withBlock = makeHelper(); withBlock.streamChat.mockImplementation(async function* () { yield `__CUES__\n1| a b\n${PROSE}`; });
        await drain(new WhatToAnswerLLM(withBlock).generateStream(`[INTERVIEWER]: ${SHORT_Q}`, undefined, GENERAL, undefined, undefined, undefined, undefined, onCues));
        expect(logs.some((l) => l.includes('expected-empty'))).toBe(false);
    });

    it('coding path is untouched: no verbal prompt, no cue-rule line', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const h = makeHelper();
        await ask(h, SHORT_Q, CODING);
        expect(sent(h)).not.toContain(VERBAL_TYPED_PROMPT);
        expect(sent(h)).not.toContain(VERBAL_WHAT_TO_ANSWER_PROMPT);
        expect(logs.some((l) => l.startsWith('[Answer] cue rule:'))).toBe(false);
    });
});
