import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// D2 (spec bundle-1/fixes/D2-SPEC.md rev 2 §2 B.1): each FINAL carries the arrival time of the first
// non-empty interim since the previous final (onsetAt) and the last time the interim's text changed
// (textSinceAt), per socket. Fake '@deepgram/sdk' as in DeepgramStreamingSTT.staleSocket.test.ts.
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

const results = (transcript: string, isFinal: boolean) => ({ is_final: isFinal, speech_final: false, channel: { alternatives: [{ transcript, confidence: 0.9 }] } });
const T = 1_000_000;

describe('DeepgramStreamingSTT: onset provenance on finals (D2)', () => {
    let got: any[];
    let stt: DeepgramStreamingSTT;
    const at = (ms: number) => vi.setSystemTime(T + ms);
    beforeEach(() => {
        lives.length = 0;
        got = [];
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.useFakeTimers();
        vi.setSystemTime(T);
        stt = new DeepgramStreamingSTT('key');
        stt.on('transcript', (e: any) => got.push(e));
        stt.start();
        lives[0].fire('open');
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });
    const finals = () => got.filter((e) => e.isFinal);

    it('a final carries its first interim\'s arrival and the last time that interim\'s text changed', () => {
        const [s] = lives;
        at(100); s.fire('Results', results('and your', false));
        at(200); s.fire('Results', results('and your reason', false));
        at(300); s.fire('Results', results('And your reason?', true));      // same words, only case/punctuation differ
        expect(finals()).toHaveLength(1);
        expect(finals()[0]).toMatchObject({ onsetAt: T + 100, textSinceAt: T + 200 });
    });

    it('a stalled interim that repeats unchanged keeps its change time; the final long after still reports it', () => {
        const [s] = lives;
        at(100); s.fire('Results', results('and your reason', false));
        at(5_000); s.fire('Results', results('and your reason', false));
        at(10_000); s.fire('Results', results('and your reason', false));
        at(17_000); s.fire('Results', results('and your reason', true));
        expect(finals()[0]).toMatchObject({ onsetAt: T + 100, textSinceAt: T + 100 });
    });

    it('a final whose words differ from the last interim reports its own arrival as textSinceAt', () => {
        const [s] = lives;
        at(100); s.fire('Results', results('and your reason', false));
        at(900); s.fire('Results', results('and your reason for that choice', true));
        expect(finals()[0]).toMatchObject({ onsetAt: T + 100, textSinceAt: T + 900 });
    });

    it('a final with no interim before it carries no provenance fields at all', () => {
        const [s] = lives;
        at(300); s.fire('Results', results('Straight to final.', true));
        expect('onsetAt' in finals()[0]).toBe(false);
        expect('textSinceAt' in finals()[0]).toBe(false);
    });

    it('state resets on every final, an empty one included: the next final\'s onset is its own interim', () => {
        const [s] = lives;
        at(100); s.fire('Results', results('first words', false));
        at(150); s.fire('Results', results('', true));                      // an empty final: a pause
        at(200); s.fire('Results', results('second words', false));
        at(300); s.fire('Results', results('second words', true));
        at(400); s.fire('Results', results('third', true));                 // no interim since the last final
        expect(finals().map((e) => e.onsetAt)).toEqual([T + 200, undefined]);
    });

    it('an empty interim sets no onset', () => {
        const [s] = lives;
        at(100); s.fire('Results', results('', false));
        at(300); s.fire('Results', results('words here', true));
        expect('onsetAt' in finals()[0]).toBe(false);
    });

    it('a restarted socket starts empty, and the replaced socket\'s interims never reach it', () => {
        const [first] = lives;
        at(100); first.fire('Results', results('old socket words', false));
        stt.setSampleRate(48000);                                           // restartStream(): a second socket
        const second = lives[1];
        second.fire('open');
        at(600); first.fire('Results', results('late old interim', false)); // the replaced socket still talking
        at(700); second.fire('Results', results('new socket final', true));
        expect('onsetAt' in finals()[0]).toBe(false);
        at(800); second.fire('Results', results('fresh interim', false));
        at(900); second.fire('Results', results('fresh interim', true));
        expect(finals()[1]).toMatchObject({ onsetAt: T + 800, textSinceAt: T + 800 });
    });
});
