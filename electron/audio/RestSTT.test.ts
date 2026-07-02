import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('axios', () => ({
    default: { post: vi.fn(async () => ({ data: { text: 'hello world from stt' } })) },
}));

import axios from 'axios';
import { RestSTT } from './RestSTT';

/** ≥16000 bytes (MIN_BUFFER_BYTES) of clearly non-silent 16-bit PCM. */
function nonSilentPcm(bytes = 20000): Buffer {
    const buf = Buffer.alloc(bytes);
    for (let i = 0; i + 1 < bytes; i += 2) buf.writeInt16LE(3000, i);
    return buf;
}

/** Flush enough microtasks for the un-awaited flushAndUpload chain to finish. */
async function flushMicrotasks(): Promise<void> {
    for (let i = 0; i < 12; i++) await Promise.resolve();
}

describe('RestSTT speechEndedAt stamping', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        (axios.post as any).mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('stamps speechEndedAt with the VAD flush time on speech-ended flushes', async () => {
        const stt = new RestSTT('groq', 'test-key');
        const events: any[] = [];
        stt.on('transcript', (e: any) => events.push(e));

        stt.start();
        stt.write(nonSilentPcm());

        const vadFiredAt = Date.now();
        stt.notifySpeechEnded();
        await flushMicrotasks();

        expect(events).toHaveLength(1);
        expect(events[0].text).toBe('hello world from stt');
        expect(events[0].isFinal).toBe(true);
        expect(events[0].speechEndedAt).toBe(vadFiredAt);

        stt.stop();
    });

    it('does NOT stamp speechEndedAt on safety-net interval flushes (speech may be ongoing)', async () => {
        const stt = new RestSTT('groq', 'test-key');
        const events: any[] = [];
        stt.on('transcript', (e: any) => events.push(e));

        stt.start();
        stt.write(nonSilentPcm());

        // Advance to the 6s safety-net flush without any VAD signal
        await vi.advanceTimersByTimeAsync(6000);
        await flushMicrotasks();

        expect(events).toHaveLength(1);
        expect(events[0].speechEndedAt).toBeUndefined();

        stt.stop();
    });
});
