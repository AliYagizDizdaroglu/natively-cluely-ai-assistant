import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';

/**
 * Cue mode (spec 2026-09-20 §6.7): the cues are logged once and ride the FIRST prose token
 * only; `[Answer] full:` stays prose. generateStream is stubbed to drive the eighth
 * parameter the way stripCueBlock does — the callback fires before the first prose token.
 */
const stubHelper = () => ({} as any);
const QUESTION = 'How much memory for ten million embeddings?';
const PROSE = 'Ten million vectors take thirty gigabytes.';

function stubStream(cues: string[], tokens: string[]) {
    vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* (_t: any, _tc: any, _ir: any, _img: any, _fast: any, _sugg: any, _live: any, onCues?: (c: string[]) => void) {
        onCues?.(cues);
        for (const t of tokens) yield t;
    });
}
function captureLogs() {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
    return logs;
}
function listen(engine: IntelligenceEngine) {
    const emits: Array<{ token: string; cues?: string[] }> = [];
    engine.on('suggested_answer_token', (token: string, _q: string, _c: number, _r?: boolean, cues?: string[]) => { emits.push({ token, cues }); });
    return emits;
}

describe('runWhatShouldISay carries the cue block', () => {
    afterEach(() => vi.restoreAllMocks());

    it('logs the cues once, attaches them to the first token only, and keeps the full-answer line prose', async () => {
        const logs = captureLogs();
        stubStream(['thirty gigabytes in float32', 'int8, then shard'], ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits.map((e) => e.token)).toEqual(['Ten million ', 'vectors take thirty gigabytes.']);
        expect(emits[0].cues).toEqual(['thirty gigabytes in float32', 'int8, then shard']);
        expect(emits[1].cues).toBeUndefined();
        expect(logs).toContain('[Answer] cues: ["thirty gigabytes in float32","int8, then shard"]');
        expect(logs).toContain(`[Answer] full: ${JSON.stringify(PROSE)}`);
    });

    it('no block: an empty cues line is logged and no token carries cues', async () => {
        const logs = captureLogs();
        stubStream([], ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits.every((e) => e.cues === undefined)).toBe(true);
        expect(logs).toContain('[Answer] cues: []');
    });

    it('a hedge-won answer: the sentinel-only chunk between the cues and the prose names the model and does not swallow the cues', async () => {
        // The hedge's own head sentinel is stripped earlier, by stripModelSentinel. After onCues the engine gets nameStallSwitch's
        // re-announce of the winner, on its own before the first prose chunk, and must skip it before it reads pendingCues.
        const logs = captureLogs();
        stubStream(['a', 'b'], ['__model_source:gemini-3.5-flash-lite (hedge)__', 'Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        const sources: string[] = [];
        engine.on('suggested_answer_source', (label: string) => { sources.push(label); });
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(sources).toEqual(['gemini-3.5-flash-lite (hedge)']);
        expect(emits.map((e) => e.token)).toEqual(['Ten million ', 'vectors take thirty gigabytes.']);
        expect(emits[0].cues).toEqual(['a', 'b']);
        expect(emits[1].cues).toBeUndefined();
        expect(logs).toContain(`[Answer] full: ${JSON.stringify(PROSE)}`);
    });
});
