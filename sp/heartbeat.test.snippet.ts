
describe('LLMHelper keep-warm heartbeat — idle-aware (2026-09-03)', () => {
    /**
     * Measured on every hour logged on 2026-09-03: the 60 s heartbeat pinged
     * flash-lite, its fallback and Gemma 64 times an hour each — 500 requests
     * per model per day is the free tier, so eight hours of an open app spent
     * the whole answer budget on pings (run 1 walled at 04:10, 12 answers 429'd
     * in the 15:05 hour). During an interview the answers themselves keep a
     * model warm; a ping is only worth its request when the model has sat idle.
     */
    beforeEach(() => {
        generateContentStream.mockReset();
        generateContentStream.mockImplementation(defaultImpl);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('defaults to a five-minute cadence, not sixty seconds', () => {
        vi.useFakeTimers();
        const helper = new LLMHelper('fake-gemini-key');
        const gemmaSpy = vi.spyOn(helper, 'warmupGemma').mockResolvedValue(undefined);
        vi.spyOn(helper, 'warmupGemmaVision').mockResolvedValue(undefined);
        vi.spyOn(helper, 'warmupGeminiFlash').mockResolvedValue(undefined);

        helper.startWarmthHeartbeat();
        expect(gemmaSpy).toHaveBeenCalledTimes(1); // meeting-start warm stays immediate
        vi.advanceTimersByTime(60_000);
        expect(gemmaSpy).toHaveBeenCalledTimes(1); // no ping at the old 60 s mark
        vi.advanceTimersByTime(240_000);
        expect(gemmaSpy).toHaveBeenCalledTimes(2); // 5 min: idle, so ping
        helper.stopWarmthHeartbeat();
    });

    it('skips a model the answers used inside the interval and still pings the idle ones', async () => {
        vi.useFakeTimers();
        const helper = new LLMHelper('fake-gemini-key');
        const gemmaSpy = vi.spyOn(helper, 'warmupGemma').mockResolvedValue(undefined);
        const visionSpy = vi.spyOn(helper, 'warmupGemmaVision').mockResolvedValue(undefined);
        const flashSpy = vi.spyOn(helper, 'warmupGeminiFlash').mockResolvedValue(undefined);

        helper.startWarmthHeartbeat(1000);
        expect(flashSpy).toHaveBeenCalledTimes(1);

        // A real verbal answer streams through the flash model 400 ms in.
        vi.advanceTimersByTime(400);
        await drain(helper.streamChat('What is a pod?', [], undefined, undefined, false));
        expect(helper.isModelIdle('gemini-3.1-flash-lite', 1000)).toBe(false);

        vi.advanceTimersByTime(600); // interval tick at 1000 ms
        // The primary was used 600 ms ago: only the still-idle fallback is pinged.
        expect(flashSpy).toHaveBeenCalledTimes(2);
        expect(flashSpy.mock.calls[0][0]).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']); // meeting-start: everything
        expect(flashSpy.mock.calls[1][0]).toEqual(['gemini-3.5-flash-lite']);
        expect(gemmaSpy).toHaveBeenCalledTimes(2); // gemma text was idle: pinged
        expect(visionSpy).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(1000); // 2000 ms: the primary has now been idle ≥ interval → both
        expect(flashSpy).toHaveBeenCalledTimes(3);
        expect(flashSpy.mock.calls[2][0]).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
        helper.stopWarmthHeartbeat();
    });

    it('a successful warmup counts as use, so back-to-back pings never double up', async () => {
        vi.useFakeTimers();
        generateContent.mockClear();
        const helper = new LLMHelper('fake-gemini-key');
        await helper.warmupGemmaVision();
        expect(helper.isModelIdle('gemma-4-31b-it', 60_000)).toBe(false);
        vi.advanceTimersByTime(60_000);
        expect(helper.isModelIdle('gemma-4-31b-it', 60_000)).toBe(true);
    });
});
