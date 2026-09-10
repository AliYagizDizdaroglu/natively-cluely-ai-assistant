import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/** Captures the fullMessage argument the verbal stream call receives (spec 2026-09-09 §3.4). */
function makeHelper() {
    const calls: string[] = [];
    async function* stream(): AsyncGenerator<string> { yield 'Answer.'; }
    const helper = {
        streamChat: vi.fn((fullMessage: string) => { calls.push(fullMessage); return stream(); }),
        streamVerbalWithGeminiFlash: vi.fn((fullMessage: string) => { calls.push(fullMessage); return stream(); }),
        getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite'),
    } as any;
    return { helper, calls };
}
async function drain(gen: AsyncGenerator<string>): Promise<void> {
    for await (const _ of gen) { /* drain */ }
}
const VERBAL = { intent: 'general', confidence: 1, answerShape: '' } as any;

describe('both ears in the verbal prompt (spec 2026-09-09 §3.4)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('appends the Live block after the transcript, before the trailer, only when Live texts exist', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => { });
        const { helper, calls } = makeHelper();
        await drain(new WhatToAnswerLLM(helper).generateStream(
            '[INTERVIEWER]: Can you reconcile the metrics on your CV?',
            undefined,
            VERBAL,
            undefined,
            false,
            undefined,
            ['Can you reconcile the metrics on your CV, the churn rate and the precision?'],
        ));

        const message = calls[0];
        const transcriptIdx = message.indexOf('INTERVIEWER JUST SAID:\n[INTERVIEWER]: Can you reconcile the metrics on your CV?');
        const liveIdx = message.indexOf('\n\nTHE LIVE LISTENER HEARD THE SAME QUESTION AS (use both; where they differ, the transcript\'s numbers and names are the ones spoken):\nCan you reconcile the metrics on your CV, the churn rate and the precision?');
        const trailerIdx = message.indexOf('\n\nYOUR RESPONSE AS THE CANDIDATE');
        expect(transcriptIdx).toBeGreaterThanOrEqual(0);
        expect(liveIdx).toBeGreaterThan(transcriptIdx);
        expect(trailerIdx).toBeGreaterThan(liveIdx);

        const { helper: helper2, calls: calls2 } = makeHelper();
        await drain(new WhatToAnswerLLM(helper2).generateStream(
            '[INTERVIEWER]: Can you reconcile the metrics on your CV?',
            undefined,
            VERBAL,
        ));
        expect(calls2[0]).not.toContain('THE LIVE LISTENER');
    });
});
