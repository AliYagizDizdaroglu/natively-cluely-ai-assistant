import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import fixtures from './deepgramBoundaryRepair.fixtures.json';

// The class requires '@deepgram/sdk' inside connect(). vi.mock() does not reach a CommonJS
// require() (see DeepgramStreamingSTT.socketSummary.test.ts for the evidence), so Node's own
// require cache is seeded with a fake whose listen.live() returns a NEW live object per call —
// a restart makes a second socket, and the repair state must not follow it there.
type Handler = (...a: any[]) => void;
interface FakeLive {
    handlers: Record<string, Handler[]>;
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
        handlers: {},
        on(ev, cb) { (this.handlers[ev] ??= []).push(cb); },
        send() { },
        keepAlive() { },
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
        LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results', SpeechStarted: 'SpeechStarted', UtteranceEnd: 'UtteranceEnd' },
    },
    children: [],
    paths: [],
} as any;

import { DeepgramStreamingSTT } from './DeepgramStreamingSTT';

const results = (transcript: string, isFinal: boolean) => ({ is_final: isFinal, channel: { alternatives: [{ transcript, confidence: 0.9 }] } });

describe('DeepgramStreamingSTT boundary repair (the seam fixture: S2Q07 play 3, the tolerant "RAC" -> "Rag" cut)', () => {
    let log: string[];
    beforeEach(() => {
        lives.length = 0;
        log = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });

    it('emits the repaired final, logs the raw text plus one repair line, and a restarted socket starts with no remembered cut', () => {
        const [I, F1, F2] = fixtures.seam.events;                // atMs 0 / 990 / 4180
        const stt = new DeepgramStreamingSTT('key');
        const seen: { text: string; isFinal: boolean; confidence: number }[] = [];
        stt.on('transcript', (t: any) => seen.push(t));
        stt.start();
        lives[0].fire('open');

        // socket #1 remembers a cut; a sample-rate restart replaces it before the resumption arrives
        lives[0].fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        lives[0].fire('Results', results(F1.text, true));
        stt.setSampleRate(48000);                                // restartStream(): stop() + start() -> socket #2
        lives[1].fire('open');
        vi.advanceTimersByTime(F2.atMs - F1.atMs);               // 3190 ms: inside the window, but a fresh socket
        lives[1].fire('Results', results(F2.text, true));

        // the whole sequence on socket #2
        lives[1].fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        lives[1].fire('Results', results(F1.text, true));
        vi.advanceTimersByTime(F2.atMs - F1.atMs);
        lives[1].fire('Results', results(F2.text, true));
        lives[1].fire('Results', results('', false));            // empty: still not emitted
        stt.stop();

        expect(seen.map((t) => [t.text, t.isFinal])).toEqual([
            [I.text, false],
            [F1.text, true],
            [F2.text, true],                                     // socket #2's first final: nothing remembered
            [I.text, false],
            [F1.text, true],
            [fixtures.seam.expectedF2, true],                    // 'service over 10,000,000 documents, it has to support document updates'
        ]);
        expect(seen.every((t) => t.confidence === 0.9)).toBe(true);
        expect(log.filter((l) => l.includes('boundary repair:'))).toEqual([
            '[DeepgramStreaming] boundary repair: restored "service" before "over 10,000,000 documents, it has to sup"',
        ]);
        // The event line the harness and the offline scans parse still carries Deepgram's RAW text.
        expect(log.filter((l) => l === `[DeepgramStreaming] Transcript event — isFinal=true, text="${F2.text}"`)).toHaveLength(2);
        expect(log.some((l) => l.includes(`text="${fixtures.seam.expectedF2}"`))).toBe(false);
    });
});
