import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { capturePrompt, capturePromptsEnabled, pairCapturesToDispatches, CAPTURE_FILE, type CapturedPrompt } from './promptCapture';

const dirs: string[] = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-')); dirs.push(d); return d; };
afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
const read = (d: string) => fs.readFileSync(path.join(d, CAPTURE_FILE), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

describe('capturePrompt — off unless the harness asks for it', () => {
    it('writes nothing without NATIVELY_CAPTURE_PROMPTS=1: a normal session never puts the résumé context on disk', () => {
        const d = tmp();
        capturePrompt({ model: 'gemini-3.1-flash-lite', system: 'S', user: 'U' }, { dir: d, env: {} as NodeJS.ProcessEnv });
        capturePrompt({ model: 'gemini-3.1-flash-lite', system: 'S', user: 'U' }, { dir: d, env: { NATIVELY_CAPTURE_PROMPTS: '0' } as NodeJS.ProcessEnv });
        expect(fs.existsSync(path.join(d, CAPTURE_FILE))).toBe(false);
        expect(capturePromptsEnabled({} as NodeJS.ProcessEnv)).toBe(false);
        expect(capturePromptsEnabled({ NATIVELY_CAPTURE_PROMPTS: '1' } as NodeJS.ProcessEnv)).toBe(true);
    });

    it('appends one JSON line per call with the system and user turns byte-for-byte', () => {
        const d = tmp();
        const env = { NATIVELY_CAPTURE_PROMPTS: '1' } as NodeJS.ProcessEnv;
        const system = 'line one\nline two with "quotes" and a \\ backslash';
        const user = 'INTERVIEWER JUST SAID:\n[INTERVIEWER]: Explain your RAG pipeline.\n\nYOUR RESPONSE:';
        capturePrompt({ model: 'gemini-3.1-flash-lite', system, user }, { dir: d, env, now: () => new Date('2026-09-14T07:20:00.000Z') });
        capturePrompt({ model: 'gemini-3.1-flash-lite', system, user: 'second' }, { dir: d, env, now: () => new Date('2026-09-14T07:21:00.000Z') });
        const lines = read(d);
        expect(lines).toHaveLength(2);
        expect(lines[0]).toEqual({ at: '2026-09-14T07:20:00.000Z', model: 'gemini-3.1-flash-lite', system, user });
        expect(lines[1].user).toBe('second');
    });

    it('never throws when the directory is gone — a capture must not break an answer', () => {
        const d = tmp();
        fs.rmSync(d, { recursive: true, force: true });
        expect(() => capturePrompt({ model: 'm', system: 's', user: 'u' }, { dir: d, env: { NATIVELY_CAPTURE_PROMPTS: '1' } as NodeJS.ProcessEnv })).not.toThrow();
    });
});

describe('pairCapturesToDispatches', () => {
    const cap = (at: string, user: string): CapturedPrompt => ({ at, model: 'gemini-3.1-flash-lite', system: 'S', user });

    it('gives each question the capture that follows its dispatch', () => {
        const captures = [cap('2026-09-14T07:10:02.000Z', 'first'), cap('2026-09-14T07:12:01.500Z', 'second')];
        const paired = pairCapturesToDispatches(captures, [
            { id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:01.000Z' },
            { id: 'S1Q02', dispatchedAt: '2026-09-14T07:12:01.000Z' },
        ]);
        expect(paired.S1Q01.user).toBe('first');
        expect(paired.S1Q02.user).toBe('second');
    });

    it('drops a capture that precedes every dispatch (a warm-up) rather than guessing', () => {
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T06:00:00.000Z', 'warmup'), cap('2026-09-14T07:10:02.000Z', 'real')],
            [{ id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:01.000Z' }],
        );
        expect(Object.keys(paired)).toEqual(['S1Q01']);
        expect(paired.S1Q01.user).toBe('real');
    });

    it('refuses a capture issued shortly BEFORE the dispatch — that one belongs to the previous question', () => {
        // The real shape this guards: the previous answer's capture lands seconds before this
        // question is dispatched. A window that measures distance rather than direction would
        // hand the earlier answer's prompt to this question and the arm would replay the wrong call.
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:09:55.000Z', 'previous question')],
            [{ id: 'S1Q02', dispatchedAt: '2026-09-14T07:10:00.000Z' }],
        );
        expect(paired).toEqual({});
    });

    it('leaves a question out when nothing was captured inside the window', () => {
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:11:00.000Z', 'too late')],
            [{ id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:00.000Z' }],
            30_000,
        );
        expect(paired).toEqual({});
    });

    it('never hands the same capture to two questions', () => {
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:10:02.000Z', 'only one')],
            [
                { id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:01.000Z' },
                { id: 'S1Q02', dispatchedAt: '2026-09-14T07:10:01.500Z' },
            ],
        );
        expect(Object.keys(paired)).toEqual(['S1Q01']);
    });
});
