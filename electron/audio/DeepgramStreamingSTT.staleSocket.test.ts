import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// The class requires '@deepgram/sdk' inside connect(). vi.mock() does not reach a
// CommonJS require() (see DeepgramStreamingSTT.socketSummary.test.ts for the
// evidence), so Node's own require cache is seeded with a fake whose listen.live()
// returns a NEW live object per call — after a restart two sockets exist at once,
// and that is exactly what these tests exercise.
type Handler = (...a: any[]) => void;
interface FakeLive {
    handlers: Record<string, Handler[]>;
    sent: any[];
    keepAlives: number;
    closeRequests: number;
    on: (ev: string, cb: Handler) => void;
    send: (d: any) => void;
    keepAlive: () => void;
    requestClose: () => void;
    getReadyState: () => number;
    fire: (ev: string, ...args: any[]) => void;
}
const lives: FakeLive[] = [];
function makeLive(): FakeLive {
    const live: FakeLive = {
        handlers: {}, sent: [], keepAlives: 0, closeRequests: 0,
        on(ev, cb) { (this.handlers[ev] ??= []).push(cb); },
        send(d) { this.sent.push(d); },
        keepAlive() { this.keepAlives++; },
        requestClose() { this.closeRequests++; },
        getReadyState: () => 1,
        fire(ev, ...args) { (this.handlers[ev] ?? []).forEach((h: Handler) => h(...args)); },
    };
    lives.push(live);
    return live;
}
const deepgramPath = require.resolve('@deepgram/sdk');
const priorDeepgramCacheEntry = require.cache[deepgramPath];
require.cache[deepgramPath] = {
    id: deepgramPath,
    filename: deepgramPath,
    loaded: true,
    exports: {
        createClient: () => ({ listen: { live: () => makeLive() } }),
        LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results' },
    },
    children: [],
    paths: [],
} as any;

import { DeepgramStreamingSTT } from './DeepgramStreamingSTT';

const CHUNK = Buffer.alloc(1920);

describe('DeepgramStreamingSTT: events from a replaced socket never touch the current one (spec 2026-09-05 §2)', () => {
    let log: string[];
    beforeEach(() => {
        lives.length = 0;
        log = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });

    it('the first socket closing (1000) after a sample-rate restart does not orphan the second', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();                                   // socket #1 at the 16 kHz default
        const [first] = lives;
        first.fire('open');
        stt.write(CHUNK);
        expect(first.sent).toHaveLength(1);

        stt.setSampleRate(48000);                      // restartStream(): stop() then start()
        expect(first.closeRequests).toBe(1);
        expect(lives).toHaveLength(2);
        const second = lives[1];
        second.fire('open');
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(1);

        first.fire('close', { code: 1000, reason: '' });   // the server closes the replaced socket

        expect(log.some((l) => l.includes('Stale socket closed (code=1000) — ignored'))).toBe(true);
        expect(lives).toHaveLength(2);                 // no reconnect
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(2);           // still open: written to, not buffered
        vi.advanceTimersByTime(8000);
        expect(second.keepAlives).toBe(1);             // its keepalive interval survived
        vi.advanceTimersByTime(2000);
        expect(lives).toHaveLength(2);
    });

    it('a socket still connecting at the restart is closed when it opens, and its later 1011 is ignored', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        const [first] = lives;                         // never opened before the restart
        stt.setSampleRate(48000);
        const second = lives[1];
        second.fire('open');
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(1);

        first.fire('open');                            // the late Open of the replaced socket
        expect(log.some((l) => l.includes('Stale socket opened after a restart — closing it'))).toBe(true);
        expect(first.closeRequests).toBeGreaterThanOrEqual(2);   // stop() asked once; the late Open asks again
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(2);           // the second socket is still the current one

        first.fire('close', { code: 1011, reason: 'Deepgram did not receive audio data or a text message within the timeout window.' });
        vi.advanceTimersByTime(1500);
        expect(lives).toHaveLength(2);                 // a stale close schedules no reconnect
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(3);
        expect(log.some((l) => l.includes(' lived '))).toBe(false);   // no summary printed for another socket's close
    });

    it('the current socket closing with 1011 still reconnects and prints its summary', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        lives[0].fire('open');
        lives[0].fire('close', { code: 1011, reason: 'timeout' });
        expect(log.some((l) => l.includes('socket #1 lived'))).toBe(true);
        vi.advanceTimersByTime(1000);
        expect(lives).toHaveLength(2);
    });
});
