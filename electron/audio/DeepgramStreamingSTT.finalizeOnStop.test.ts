import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// F2b (st25-smoke 2026-10-12, SF02; b1-final RH02): a 1.6 s utterance's final arrived 17 s after its
// first interim, only when the next item's speech began (the other ~110 finals: 0.7 s after the last
// interim). The system-audio stream is thinned in silence (one 20 ms frame per 100 ms), so Deepgram's
// audio clock crawls and endpointing cannot fire. The app's own energy VAD says the voice stopped:
// that is the moment to send Finalize, once per speech segment, on the CURRENT socket only.
// Same fake-SDK technique as DeepgramStreamingSTT.staleSocket.test.ts (vi.mock does not reach require()).
type Handler = (...a: any[]) => void;
interface FakeLive {
    handlers: Record<string, Handler[]>;
    sent: any[];
    finalizes: number;
    on: (ev: string, cb: Handler) => void;
    send: (d: any) => void;
    keepAlive: () => void;
    finalize: () => void;
    requestClose: () => void;
    getReadyState: () => number;
    fire: (ev: string, ...args: any[]) => void;
}
const lives: FakeLive[] = [];
function makeLive(): FakeLive {
    const live: FakeLive = {
        handlers: {}, sent: [], finalizes: 0,
        on(ev, cb) { (this.handlers[ev] ??= []).push(cb); },
        send(d) { this.sent.push(d); },
        keepAlive() { },
        finalize() { this.finalizes++; },
        requestClose() { },
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

describe('DeepgramStreamingSTT: Finalize on the app VAD voice stop', () => {
    beforeEach(() => {
        lives.length = 0;
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });

    function open(): { stt: DeepgramStreamingSTT; live: FakeLive } {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        lives[0].fire('open');
        return { stt, live: lives[0] };
    }

    it('a voice stop sends exactly one Finalize', () => {
        const { stt, live } = open();
        stt.notifyVoice(true);
        stt.notifyVoice(false);
        expect(live.finalizes).toBe(1);
    });

    it('none while the speech continues', () => {
        const { stt, live } = open();
        stt.notifyVoice(true);
        expect(live.finalizes).toBe(0);
    });

    it('at most once per segment: a repeated stop sends nothing; the next segment sends again', () => {
        const { stt, live } = open();
        stt.notifyVoice(true);
        stt.notifyVoice(false);
        stt.notifyVoice(false);
        expect(live.finalizes).toBe(1);
        stt.notifyVoice(true);
        stt.notifyVoice(false);
        expect(live.finalizes).toBe(2);
    });

    it('a stop with no segment before it sends nothing', () => {
        const { stt, live } = open();
        stt.notifyVoice(false);
        expect(live.finalizes).toBe(0);
    });

    it('only the current socket gets it: after a restart the replaced socket is never finalized', () => {
        const { stt, live: first } = open();
        stt.notifyVoice(true);
        stt.setSampleRate(48000);                      // restartStream(): a second socket
        const second = lives[1];
        second.fire('open');
        stt.notifyVoice(false);
        expect(first.finalizes).toBe(0);
        expect(second.finalizes).toBe(1);
    });

    it('nothing is sent while the socket is not open, and a stopped instance sends nothing', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();                                   // connecting, not open
        stt.notifyVoice(true);
        stt.notifyVoice(false);
        expect(lives[0].finalizes).toBe(0);
        lives[0].fire('open');
        stt.stop();
        stt.notifyVoice(true);
        stt.notifyVoice(false);
        expect(lives[0].finalizes).toBe(0);
    });
});
