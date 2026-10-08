// REVIEW-ONLY probes (Task 4 Opus review). Lives only in the mirror tree; never copied into MAIN.
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import fixtures from './deepgramBoundaryRepair.fixtures.json';

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
const prior = require.cache[deepgramPath];
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

const results = (transcript: string, isFinal: boolean, speechFinal = false) => ({ is_final: isFinal, speech_final: speechFinal, channel: { alternatives: [{ transcript, confidence: 0.9 }] } });
const [I, F1, F2] = fixtures.seam.events;
const ID = ['bagaimana cara anda menangani data yang hilang di pipeline', 'Bagaimana cara Anda', 'data yang hilang di pipeline?'];

describe('REVIEW probes', () => {
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
        if (prior) require.cache[deepgramPath] = prior;
        else delete require.cache[deepgramPath];
    });

    const seam = (s: FakeLive) => {
        s.fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        s.fire('Results', results(F1.text, true));
        vi.advanceTimersByTime(F2.atMs - F1.atMs);
        s.fire('Results', results(F2.text, true));
    };
    const indo = (s: FakeLive) => {
        s.fire('Results', results(ID[0], false));
        vi.advanceTimersByTime(100);
        s.fire('Results', results(ID[1], true));
        vi.advanceTimersByTime(2000);
        s.fire('Results', results(ID[2], true));
    };

    it('R-LANGSWITCH: en -> id -> en -> multi on ONE running instance; each restarted socket gets its own gate', () => {
        const stt = new DeepgramStreamingSTT('key');
        const seen: string[] = [];
        stt.on('transcript', (t: any) => { if (t.isFinal) seen.push(t.text); });
        stt.start();
        lives[0].fire('open');
        seam(lives[0]);
        stt.setRecognitionLanguage('indonesian');
        expect(lives).toHaveLength(2);
        lives[1].fire('open');
        indo(lives[1]);
        stt.setRecognitionLanguage('english-us');
        expect(lives).toHaveLength(3);
        lives[2].fire('open');
        seam(lives[2]);
        stt.setRecognitionLanguage('auto');
        expect(lives).toHaveLength(4);
        lives[3].fire('open');
        indo(lives[3]);
        lives[3].fire('Results', results('', true));
        lives[3].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 });
        stt.stop();
        const langs = log.filter((l) => l.includes('Connecting (')).map((l) => (/lang=([^)]+)\)/.exec(l) ?? [])[1]);
        expect(langs).toEqual(['en', 'id', 'en', 'multi']);
        expect(seen).toEqual([F1.text, fixtures.seam.expectedF2, ID[1], ID[2], F1.text, fixtures.seam.expectedF2, ID[1], ID[2]]);
        expect(log.filter((l) => l.includes('boundary repair:'))).toHaveLength(2);
    });

    it('R-RECONNECT: a cut remembered on a socket the server closed (1011) is not repaired on the reconnected socket', () => {
        const stt = new DeepgramStreamingSTT('key');
        const seen: string[] = [];
        stt.on('transcript', (t: any) => { if (t.isFinal) seen.push(t.text); });
        stt.start();
        lives[0].fire('open');
        lives[0].fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        lives[0].fire('Results', results(F1.text, true));
        lives[0].fire('close', { code: 1011, reason: 'timeout' });
        vi.advanceTimersByTime(1000);
        expect(lives).toHaveLength(2);
        lives[1].fire('open');
        vi.advanceTimersByTime(F2.atMs - F1.atMs - 1000);
        lives[1].fire('Results', results(F2.text, true));
        stt.stop();
        expect(seen).toEqual([F1.text, F2.text]);
        expect(log.filter((l) => l.includes('boundary repair:'))).toEqual([]);
    });

    it('R-ADJACENT: the repair line is the very next log line after its final\'s Transcript event line (a logging listener present)', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.on('transcript', (t: any) => console.log(`[listener] ${t.text}`));
        stt.start();
        lives[0].fire('open');
        seam(lives[0]);
        stt.stop();
        const k = log.findIndex((l) => l.includes('boundary repair:'));
        expect(k).toBeGreaterThan(0);
        expect(log[k - 1]).toBe(`[DeepgramStreaming] Transcript event — isFinal=true, text="${F2.text}"`);
    });

    it('R-STALE-UE: an UtteranceEnd on a REPLACED socket still clears that socket\'s own cut (its late F2 passes unchanged)', () => {
        const stt = new DeepgramStreamingSTT('key');
        const seen: string[] = [];
        stt.on('transcript', (t: any) => { if (t.isFinal) seen.push(t.text); });
        stt.start();
        lives[0].fire('open');
        lives[0].fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        lives[0].fire('Results', results(F1.text, true));
        stt.setSampleRate(48000);
        lives[1].fire('open');
        lives[0].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 });
        vi.advanceTimersByTime(F2.atMs - F1.atMs);
        lives[0].fire('Results', results(F2.text, true));
        stt.stop();
        expect(seen).toEqual([F1.text, F2.text]);
    });
});
