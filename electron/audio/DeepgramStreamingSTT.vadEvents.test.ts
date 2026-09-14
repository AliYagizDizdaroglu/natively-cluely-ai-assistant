import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// The class requires '@deepgram/sdk' inside connect(); replace it with a fake
// whose live object records sends and lets the test fire Open / Close.
type Handler = (...a: any[]) => void;
const handlers: Record<string, Handler[]> = {};
const sent: any[] = [];
let keepAlives = 0;
let readyState = 1;
const fakeLive = {
    on: (ev: string, cb: Handler) => { (handlers[ev] ??= []).push(cb); },
    send: (d: any) => { sent.push(d); },
    keepAlive: () => { keepAlives++; },
    requestClose: () => {},
    getReadyState: () => readyState,
};
const fire = (ev: string, ...args: any[]) => (handlers[ev] ?? []).forEach((h) => h(...args));

vi.mock('@deepgram/sdk', () => ({
    createClient: () => ({ listen: { live: () => fakeLive } }),
    LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results', SpeechStarted: 'SpeechStarted', UtteranceEnd: 'UtteranceEnd' },
}));

// vi.mock() only intercepts the `import` keyword — Vitest's runner does not mock a
// CommonJS require() call ("Vitest does not support mocking modules imported via
// require", https://vitest.dev/guide/common-errors); require() "bypass[es] the
// module runner directly to Node.js". connect() loads the SDK with
// require('@deepgram/sdk'), so the vi.mock above never reaches it — confirmed by
// running this test against the real @deepgram/sdk package (it logged the real
// LiveTranscriptionEvents enum, not the 4-key fake). Seed Node's own require cache
// for the resolved path instead, so the class's own require() call returns the fake.
const deepgramPath = require.resolve('@deepgram/sdk');
const priorDeepgramCacheEntry = require.cache[deepgramPath];
require.cache[deepgramPath] = {
    id: deepgramPath,
    filename: deepgramPath,
    loaded: true,
    exports: {
        createClient: () => ({ listen: { live: () => fakeLive } }),
        LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results', SpeechStarted: 'SpeechStarted', UtteranceEnd: 'UtteranceEnd' },
    },
    children: [],
    paths: [],
} as any;

import { DeepgramStreamingSTT } from './DeepgramStreamingSTT';

describe('DeepgramStreamingSTT VAD events', () => {
    it('re-emits SpeechStarted and UtteranceEnd with a timestamp, on the live socket only', () => {
        const stt = new DeepgramStreamingSTT('key');
        const seen: string[] = [];
        stt.on('speech-started', (e: { at: number }) => seen.push(`start@${typeof e.at}`));
        stt.on('utterance-end', (e: { at: number }) => seen.push(`end@${typeof e.at}`));
        stt.start();
        fire('open');
        fire('SpeechStarted', { type: 'SpeechStarted', timestamp: 1.2 });
        fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 2.9 });
        expect(seen).toEqual(['start@number', 'end@number']);
    });

    it('surfaces a final with no words as wordless-final instead of dropping it — the turn needs to know a voice blip carried nothing', () => {
        // 2026-09-13 smoke: chime-like energy between two questions kept the energy VAD
        // flapping, Deepgram answered each blip with is_final=true and an empty transcript,
        // and because those were dropped here the turn machine never learned the "speech"
        // it was waiting on had no words — it held the answered turn open and merged the
        // next question into it as a continuation.
        const stt = new DeepgramStreamingSTT('key');
        const seen: string[] = [];
        stt.on('wordless-final', (e: { at: number }) => seen.push(`wordless@${typeof e.at}`));
        stt.on('transcript', (s: { text: string; isFinal: boolean }) => seen.push(`text:${s.text}:${s.isFinal}`));
        stt.start();
        fire('open');
        fire('Results', { is_final: true, channel: { alternatives: [{ transcript: '' }] } });
        fire('Results', { is_final: false, channel: { alternatives: [{ transcript: '' }] } });   // an empty interim is still nothing
        fire('Results', { is_final: true, channel: { alternatives: [{ transcript: 'and when would you not', confidence: 0.9 }] } });
        expect(seen).toEqual(['wordless@number', 'text:and when would you not:true']);
    });
});
