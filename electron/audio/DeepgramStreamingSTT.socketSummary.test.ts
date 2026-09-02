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
    LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results' },
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
        LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results' },
    },
    children: [],
    paths: [],
} as any;

import { DeepgramStreamingSTT } from './DeepgramStreamingSTT';

describe('DeepgramStreamingSTT socket summary', () => {
    let log: string[];
    beforeEach(() => {
        for (const k of Object.keys(handlers)) delete handlers[k];
        sent.length = 0; keepAlives = 0; readyState = 1;
        log = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });

    it('logs one summary per socket with what was actually handed to send()', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        // two chunks buffered before open are the flush; they must NOT count
        stt.write(Buffer.alloc(1920));
        stt.write(Buffer.alloc(1920));
        fire('open');
        vi.advanceTimersByTime(80);
        stt.write(Buffer.alloc(1920));
        vi.advanceTimersByTime(80);
        stt.write(Buffer.alloc(1920));
        vi.advanceTimersByTime(8000);          // one keepalive tick (KEEPALIVE_INTERVAL_MS = 8000)
        vi.advanceTimersByTime(2000);
        fire('close', { code: 1011, reason: 'timeout' });

        const summary = log.find((l) => l.includes('socket #1 lived'));
        expect(summary).toBeDefined();
        expect(summary).toMatch(/2 chunks \/ 3840 bytes to send\(\) after the flush/);
        expect(summary).toMatch(/1 keepalive ticks/);
        expect(summary).toMatch(/last send 10\.0s before close/);
        expect(summary).toMatch(/readyState at last write=1/);
        expect(summary).toMatch(/writes while not open=0/);
        expect(summary).toMatch(/lived 10\.2s/);
    });

    it('counts writes the SDK would silently buffer because its socket is not open', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        fire('open');
        readyState = 0;                          // SDK says CONNECTING although we saw Open
        stt.write(Buffer.alloc(1920));
        fire('close', { code: 1011, reason: 'timeout' });
        const summary = log.find((l) => l.includes('socket #1 lived'));
        expect(summary).toMatch(/writes while not open=1/);
        expect(summary).toMatch(/readyState at last write=0/);
    });
});
