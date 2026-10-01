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
        // spec 2026-09-30: a block inside the limits with nothing to clean logs no trimmed line
        expect(logs.some((l) => l.startsWith('[Answer] cues trimmed:'))).toBe(false);
    });

    it('no block: an empty cues line is logged and no token carries cues', async () => {
        const logs = captureLogs();
        stubStream([], ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits.every((e) => e.cues === undefined)).toBe(true);
        expect(logs).toContain('[Answer] cues: []');
        expect(logs.some((l) => l.startsWith('[Answer] cues trimmed:'))).toBe(false);
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

    it('spec 2026-09-30: dropped only — the smoke\'s real S1Q09 block, 8 lines of at most 5 words, keeps 3 and logs the 5 dropped lines first', async () => {
        const logs = captureLogs();
        const eight = ['Blob Storage for data', 'Azure ML for training', 'Model Registry for versioning', 'ACR for images', 'AKS for inference', 'Data Factory for orchestration', 'Entra ID for security', 'Azure Monitor for observability'];
        stubStream(eight, ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits[0].cues).toEqual(eight.slice(0, 3));
        expect(emits[1].cues).toBeUndefined();
        const trimmedAt = logs.findIndex((l) => l.startsWith('[Answer] cues trimmed: '));
        expect(trimmedAt).toBeGreaterThan(-1);
        expect(logs.indexOf(`[Answer] cues: ${JSON.stringify(eight.slice(0, 3))}`)).toBeGreaterThan(trimmedAt);
        expect(JSON.parse(logs[trimmedAt].slice('[Answer] cues trimmed: '.length))).toEqual({ rawLines: 8, dropped: eight.slice(3), cut: [], cleaned: [] });
    });

    it('spec 2026-09-30: cut only — one 7-word line is displayed as its first 5 words and logged first, with nothing dropped', async () => {
        const logs = captureLogs();
        const seven = 'Batch/Online Architecture: Feature Store and Shared Logic';
        stubStream([seven], ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits[0].cues).toEqual(['Batch/Online Architecture: Feature Store and']);
        const trimmedAt = logs.findIndex((l) => l.startsWith('[Answer] cues trimmed: '));
        expect(trimmedAt).toBeGreaterThan(-1);
        expect(logs.indexOf('[Answer] cues: ["Batch/Online Architecture: Feature Store and"]')).toBeGreaterThan(trimmedAt);
        expect(JSON.parse(logs[trimmedAt].slice('[Answer] cues trimmed: '.length))).toEqual({ rawLines: 1, dropped: [], cut: [seven], cleaned: [] });
    });

    it('spec 2026-09-30: dropped and cut together — an 8-line block with a 7-word line is displayed as 3 lines of 5 words, both cuts logged first', async () => {
        const logs = captureLogs();
        const eight = ['Blob Storage for data', 'Azure ML for training and registry work', 'Model Registry for versioning', 'ACR for images', 'AKS for inference', 'Data Factory for orchestration', 'Entra ID for security', 'Azure Monitor for observability'];
        const shown = ['Blob Storage for data', 'Azure ML for training and', 'Model Registry for versioning'];
        stubStream(eight, ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits[0].cues).toEqual(shown);
        expect(emits[1].cues).toBeUndefined();
        const trimmedAt = logs.findIndex((l) => l.startsWith('[Answer] cues trimmed: '));
        const cuesAt = logs.indexOf(`[Answer] cues: ${JSON.stringify(shown)}`);
        expect(trimmedAt).toBeGreaterThan(-1);
        expect(cuesAt).toBeGreaterThan(trimmedAt);
        expect(JSON.parse(logs[trimmedAt].slice('[Answer] cues trimmed: '.length))).toEqual({ rawLines: 8, dropped: eight.slice(3), cut: ['Azure ML for training and registry work'], cleaned: [] });
        expect(logs.filter((l) => l.startsWith('[Answer] cues'))).toHaveLength(2);
    });

    it('spec 2026-09-30: cleaned only — a cue in raw LaTeX is displayed spoken-clean, and the cleanup is logged in `cleaned` on the trimmed line, first', async () => {
        const logs = captureLogs();
        stubStream(['$O(\\log n)$ time complexity'], ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits[0].cues).toEqual(['O(log n) time complexity']);
        const trimmedAt = logs.findIndex((l) => l.startsWith('[Answer] cues trimmed: '));
        expect(trimmedAt).toBeGreaterThan(-1);
        expect(logs.indexOf('[Answer] cues: ["O(log n) time complexity"]')).toBeGreaterThan(trimmedAt);
        expect(JSON.parse(logs[trimmedAt].slice('[Answer] cues trimmed: '.length))).toEqual({ rawLines: 1, dropped: [], cut: [], cleaned: ['$O(\\log n)$ time complexity'] });
    });

    it('spec 2026-09-30: a cue that was nothing but notation is displayed empty, not dropped — it is logged in `cleaned`, and the row and the smoke check flag it', async () => {
        const logs = captureLogs();
        stubStream(['**', 'Parquet'], ['Ten million ', 'vectors take thirty gigabytes.']);
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        const emits = listen(engine);
        await engine.runWhatShouldISay(QUESTION, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(emits[0].cues).toEqual(['', 'Parquet']);
        const trimmedAt = logs.findIndex((l) => l.startsWith('[Answer] cues trimmed: '));
        expect(trimmedAt).toBeGreaterThan(-1);
        expect(logs.indexOf('[Answer] cues: ["","Parquet"]')).toBeGreaterThan(trimmedAt);
        expect(JSON.parse(logs[trimmedAt].slice('[Answer] cues trimmed: '.length))).toEqual({ rawLines: 2, dropped: [], cut: [], cleaned: ['**'] });
    });
});
