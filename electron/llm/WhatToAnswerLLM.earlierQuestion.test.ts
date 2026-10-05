import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';
import { LABEL } from './earlierQuestion';

/** Captures the fullMessage the verbal (or coding) stream call receives — the same seam liveEars.test.ts uses. */
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
async function drain(gen: AsyncGenerator<string>): Promise<void> { for await (const _ of gen) { /* drain */ } }
const VERBAL = { intent: 'general', confidence: 1, answerShape: 'spoken' } as any;
const CODING = { intent: 'coding', confidence: 1, answerShape: '' } as any;
const TEMPORAL = { hasRecentResponses: true, previousResponses: ['I would rank per department.'], toneSignals: [] } as any;
const TRANSCRIPT = '[INTERVIEWER]: describe how you would shard the telemetry store by tenant.\n[INTERVIEWER]: How would you rebalance those shards after a tenant doubles in size?';
const BLOCK = `${LABEL}\n- Describe how you would shard the telemetry store by tenant.`;
const BEFORE_MARKER = 'INTERVIEWER JUST SAID:\n';
/** The replay's insertBlock: `${block}\n\n` immediately before the marker; '' is identity. */
function insertBlock(user: string, block: string): string {
    if (!block) return user;
    const i = user.indexOf(BEFORE_MARKER);
    if (i < 0) throw new Error('no INTERVIEWER JUST SAID marker');
    return `${user.slice(0, i)}${block}\n\n${user.slice(i)}`;
}
/** One generateStream call; returns the fullMessage the helper received (exactly one call). */
async function message(args: { intent?: any; temporal?: any; liveTexts?: string[]; block?: string }): Promise<string> {
    const { helper, calls } = makeHelper();
    await drain(new WhatToAnswerLLM(helper).generateStream(TRANSCRIPT, args.temporal, args.intent, undefined, false, undefined, args.liveTexts, undefined, args.block));
    expect(calls).toHaveLength(1);   // one fullMessage per stream — the hedge's legs share these bytes downstream
    return calls[0];
}

describe('the EARLIER QUESTION block in the verbal message (spec 2026-10-03 §3.4; build gate c3)', () => {
    afterEach(() => vi.restoreAllMocks());
    it('extraContext empty: on === insertBlock(off, block)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const off = await message({});
        const on = await message({ block: BLOCK });
        expect(off).not.toContain(LABEL);
        expect(on).toBe(insertBlock(off, BLOCK));
        expect(on.startsWith(`${BLOCK}\n\n${BEFORE_MARKER}`)).toBe(true);
    });
    it('extraContext non-empty (intent + previous responses): the block is the LAST context part, on === insertBlock(off, block)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const off = await message({ intent: VERBAL, temporal: TEMPORAL });
        const on = await message({ intent: VERBAL, temporal: TEMPORAL, block: BLOCK });
        expect(on).toBe(insertBlock(off, BLOCK));
        expect(on.indexOf('PREVIOUS RESPONSES')).toBeLessThan(on.indexOf(BLOCK));
    });
    it('with Live texts: the Live block and the trailer are untouched, on === insertBlock(off, block)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const live = ['How would you rebalance those shards after a tenant doubles?'];
        const off = await message({ intent: VERBAL, liveTexts: live });
        const on = await message({ intent: VERBAL, liveTexts: live, block: BLOCK });
        expect(on).toBe(insertBlock(off, BLOCK));
        expect(on.indexOf(BLOCK)).toBeLessThan(on.indexOf('THE LIVE LISTENER'));
    });
    it('coding framing drops the block: on === off', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const off = await message({ intent: CODING });
        const on = await message({ intent: CODING, block: BLOCK });
        expect(on).toBe(off);
        expect(on).not.toContain(LABEL);
    });
    it('an empty or undefined block is byte-identical to today (flag off is literally today\'s code)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const off = await message({ intent: VERBAL, temporal: TEMPORAL });
        expect(await message({ intent: VERBAL, temporal: TEMPORAL, block: '' })).toBe(off);
        expect(await message({ intent: VERBAL, temporal: TEMPORAL, block: undefined })).toBe(off);
    });
    it('the transcript passed in is not changed by the block (the knowledge lookup and the classifier read the same last line) — passes before the change too', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const on = await message({ intent: VERBAL, block: BLOCK });
        expect(on.endsWith(`${BEFORE_MARKER}${TRANSCRIPT}\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):`)).toBe(true);
    });
    // Review I4: "flag off = today's bytes" compared with TODAY, not with the new code against itself. The three
    // literals below are the unmodified file's output (WhatToAnswerLLM.ts:211-239 at 89c8f53); this test is green
    // on the unmodified file in Step 2 and must stay green after Step 3. A reordered contextParts or a changed
    // join would pass every insertBlock test above and fail here.
    it('characterization: the flag-off message is today\'s, byte for byte, for three shapes (green before and after this task)', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const TRAILER = '\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):';
        const INTENT = '<intent_and_shape>\nDETECTED INTENT: general\nANSWER SHAPE: spoken\n</intent_and_shape>';
        expect(await message({})).toBe(`INTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`);
        expect(await message({ intent: VERBAL, temporal: TEMPORAL })).toBe(`${INTENT}\n\nPREVIOUS RESPONSES (Avoid Repetition):\n1. "I would rank per department."\n\nINTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`);
        const live = ['How would you rebalance those shards after a tenant doubles?'];
        expect(await message({ intent: VERBAL, liveTexts: live })).toBe(`${INTENT}\n\nINTERVIEWER JUST SAID:\n${TRANSCRIPT}\n\nTHE LIVE LISTENER HEARD THE SAME QUESTION AS (use both; where they differ, the transcript's numbers and names are the ones spoken):\n${live.join('\n')}${TRAILER}`);
    });
});
