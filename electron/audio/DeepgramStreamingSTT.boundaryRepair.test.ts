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

const results = (transcript: string, isFinal: boolean, speechFinal = false) => ({ is_final: isFinal, speech_final: speechFinal, channel: { alternatives: [{ transcript, confidence: 0.9 }] } });

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

    describe('v4: pauses forget the cut, speech_final reaches the module, non-English connections pass through (spec review 2026-09-29)', () => {
        const [I, F1, F2] = fixtures.seam.events;                // atMs 0 / 990 / 4180
        const unchanged = [[I.text, false], [F1.text, true], [F2.text, true]];
        const repairs = () => log.filter((l) => l.includes('boundary repair:'));
        /** A started instance on socket #1, recording every emitted transcript as [text, isFinal]. */
        const start = (language?: string) => {
            const stt = new DeepgramStreamingSTT('key');
            if (language) stt.setRecognitionLanguage(language);   // before start(): no restart, just the code
            const seen: [string, boolean][] = [];
            stt.on('transcript', (t: any) => seen.push([t.text, t.isFinal]));
            stt.start();
            lives[0].fire('open');
            return { stt, seen };
        };
        /** Streams the seam fixture with its own timing on socket #1, running `between` right after F1. */
        const playSeam = (between: () => void = () => { }, f1SpeechFinal = false) => {
            lives[0].fire('Results', results(I.text, false));
            vi.advanceTimersByTime(F1.atMs);
            lives[0].fire('Results', results(F1.text, true, f1SpeechFinal));
            between();
            vi.advanceTimersByTime(F2.atMs - F1.atMs);
            lives[0].fire('Results', results(F2.text, true));
        };

        it('an empty FINAL between F1 and F2 is a pause: F2 is emitted as received, no repair line', () => {
            const { stt, seen } = start();
            playSeam(() => lives[0].fire('Results', results('', true)));
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(repairs()).toEqual([]);
        });

        it('an UtteranceEnd between F1 and F2 is a pause too, and is still re-emitted', () => {
            const { stt, seen } = start();
            const ends: number[] = [];
            stt.on('utterance-end', (e: { at: number }) => ends.push(e.at));
            playSeam(() => lives[0].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 }));
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(ends).toHaveLength(1);
            expect(repairs()).toEqual([]);
        });

        it('speech_final on F1 reaches the module: Deepgram heard the utterance end there, so nothing is restored', () => {
            const { stt, seen } = start();
            playSeam(() => { }, true);
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(repairs()).toEqual([]);
        });

        it('an empty INTERIM is not a pause: the repair still happens (the control for the three above)', () => {
            const { stt, seen } = start();
            playSeam(() => lives[0].fire('Results', results('', false)));
            stt.stop();
            expect(seen).toEqual([[I.text, false], [F1.text, true], [fixtures.seam.expectedF2, true]]);
            expect(repairs()).toHaveLength(1);
        });

        it('the 5 s window runs on the arrival clock: F2 5001 ms after F1 is emitted as received, no repair line', () => {
            const { stt, seen } = start();
            playSeam(() => vi.advanceTimersByTime(5001 - (F2.atMs - F1.atMs)));   // F1 -> F2 = 5001 ms, one past the window
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(repairs()).toEqual([]);
        });

        // Indonesian is written in plain ASCII, so the module's own non-ASCII guard does not refuse it: the rule ALONE
        // would restore "menangani" here (a rule never validated for that language). Only the gate keeps it out.
        // (The reviews' Spanish/Russian probes are refused by the module's guard already, so they cannot test the gate.)
        it('a non-English connection passes every transcript through untouched, with no repair line', () => {
            const { stt, seen } = start('indonesian');            // RECOGNITION_LANGUAGES.indonesian.iso639 = 'id'
            const id = ['bagaimana cara anda menangani data yang hilang di pipeline', 'Bagaimana cara Anda', 'data yang hilang di pipeline?'];
            lives[0].fire('Results', results(id[0], false));
            vi.advanceTimersByTime(100);
            lives[0].fire('Results', results(id[1], true));
            vi.advanceTimersByTime(2000);
            lives[0].fire('Results', results(id[2], true));
            stt.stop();
            expect(log.some((l) => l.includes('lang=id)'))).toBe(true);   // the connection really was Indonesian
            expect(seen).toEqual([[id[0], false], [id[1], true], [id[2], true]]);
            expect(repairs()).toEqual([]);
        });

        // A non-English or 'multi' connection holds NO repair object (null), so both pause signals must be harmless on it too. Nothing
        // else pins the `?.` on those two clear() calls: electron/tsconfig.json has no strictNullChecks, so tsc accepts a bare call, and
        // the Transcript handler's try/catch turns its TypeError into one logged "Parse error" (hence the console.error spy below).
        const noRepair = [['indonesian', 'id'], ['auto', 'multi']];   // [picker key, the code Deepgram is connected with]

        it('an empty FINAL on a non-English or multi connection is harmless: F2 is emitted as received, no error is logged', () => {
            const errors = vi.spyOn(console, 'error').mockImplementation(() => { });
            for (const [language, code] of noRepair) {
                lives.length = 0;                                     // each connection is socket #1 of a fresh instance
                const { stt, seen } = start(language);
                playSeam(() => lives[0].fire('Results', results('', true)));
                stt.stop();
                expect(log.some((l) => l.includes(`lang=${code})`)), language).toBe(true);   // the connection really was that language
                expect(seen, language).toEqual(unchanged);
            }
            expect(errors).not.toHaveBeenCalled();
            expect(repairs()).toEqual([]);
        });

        it('an UtteranceEnd on a non-English or multi connection is harmless and still re-emitted', () => {
            for (const [language, code] of noRepair) {
                lives.length = 0;
                const { stt, seen } = start(language);
                const ends: number[] = [];
                stt.on('utterance-end', (e: { at: number }) => ends.push(e.at));
                playSeam(() => lives[0].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 }));   // a bare clear() throws here, outside any try/catch
                stt.stop();
                expect(log.some((l) => l.includes(`lang=${code})`)), language).toBe(true);
                expect(seen, language).toEqual(unchanged);
                expect(ends, language).toHaveLength(1);
            }
            expect(repairs()).toEqual([]);
        });

        // interview60.turns-finals.mjs pairs each `boundary repair:` line with the `Transcript event` line directly above it, so the
        // repair is logged before the emit and nothing is logged in between. A logging listener makes that observable: a repair line
        // logged after the emit, or any other log line before it, would put a different line first.
        it('the repair line is the very next log line after its final\'s Transcript event line, before any listener runs', () => {
            const { stt } = start();
            stt.on('transcript', (t: any) => console.log(`[listener] ${t.text}`));   // the app's own listener logs synchronously
            playSeam();
            stt.stop();
            const k = log.findIndex((l) => l.includes('boundary repair:'));
            expect(k).toBeGreaterThan(0);
            expect(log[k - 1]).toBe(`[DeepgramStreaming] Transcript event — isFinal=true, text="${F2.text}"`);
        });

        // Each socket owns its repair. The restart test above covers stop() + start(); this covers another way a socket is replaced:
        // the server closes it (1011) and scheduleReconnect() opens a new one 1000 ms later (RECONNECT_BASE_DELAY_MS).
        it('a socket the server closed (1011) and replaced does not share its cut: F2 on the reconnected socket is emitted as received', () => {
            const { stt, seen } = start();
            lives[0].fire('Results', results(I.text, false));
            vi.advanceTimersByTime(F1.atMs);
            lives[0].fire('Results', results(F1.text, true));
            lives[0].fire('close', { code: 1011, reason: 'timeout' });
            vi.advanceTimersByTime(1000);
            expect(lives).toHaveLength(2);
            lives[1].fire('open');
            vi.advanceTimersByTime(F2.atMs - F1.atMs - 1000);     // still inside the 5 s window: only the socket differs
            lives[1].fire('Results', results(F2.text, true));
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(repairs()).toEqual([]);
        });
    });
});
