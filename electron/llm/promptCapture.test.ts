import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { capturePrompt, capturePromptsEnabled, pairCapturesToDispatches, lastInterviewerLine, captureAsksQuestion, CAPTURE_FILE, type CapturedPrompt } from './promptCapture';

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
    // The user turn carries transcript lines with the pinned question last.
    const cap = (at: string, question: string): CapturedPrompt => ({
        at, model: 'gemini-3.1-flash-lite', system: 'S',
        user: `[INTERVIEWER]: an earlier line\n[ASSISTANT]: a reply\n[INTERVIEWER]: ${question}\n\nYOUR RESPONSE:`,
    });

    it('gives each question the capture that follows its dispatch', () => {
        const captures = [cap('2026-09-14T07:10:02.000Z', 'first'), cap('2026-09-14T07:12:01.500Z', 'second')];
        const paired = pairCapturesToDispatches(captures, [
            { id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:01.000Z', question: 'first' },
            { id: 'S1Q02', dispatchedAt: '2026-09-14T07:12:01.000Z', question: 'second' },
        ]);
        expect(lastInterviewerLine(paired.S1Q01.user)).toBe('first');
        expect(lastInterviewerLine(paired.S1Q02.user)).toBe('second');
    });

    it('drops a capture that precedes every dispatch (a warm-up) rather than guessing', () => {
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T06:00:00.000Z', 'warmup'), cap('2026-09-14T07:10:02.000Z', 'real')],
            [{ id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:01.000Z', question: 'real' }],
        );
        expect(Object.keys(paired)).toEqual(['S1Q01']);
        expect(lastInterviewerLine(paired.S1Q01.user)).toBe('real');
    });

    it('refuses a capture issued shortly BEFORE the dispatch — that one belongs to the previous question', () => {
        // The real shape this guards: the previous answer's capture lands seconds before this
        // question is dispatched. A window that measures distance rather than direction would
        // hand the earlier answer's prompt to this question and the arm would replay the wrong call.
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:09:55.000Z', 'previous question')],
            [{ id: 'S1Q02', dispatchedAt: '2026-09-14T07:10:00.000Z', question: 'previous question' }],
        );
        expect(paired).toEqual({});
    });

    it('leaves a question out when nothing was captured inside the window', () => {
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:11:00.000Z', 'too late')],
            [{ id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:00.000Z', question: 'too late' }],
            30_000,
        );
        expect(paired).toEqual({});
    });

    it('never hands the same capture to two questions', () => {
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:10:01.200Z', 'only one')],
            [
                { id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:01.000Z', question: 'only one' },
                { id: 'S1Q02', dispatchedAt: '2026-09-14T07:10:01.500Z', question: 'only one' },
            ],
        );
        expect(Object.keys(paired)).toEqual(['S1Q01']);
    });

    it('a turn with no capture of its own gets none and does not take the next turn\'s', () => {
        // r1: the behavioural verbal route never captures, so D1 would take D2's capture
        // (23 s later, inside the window) and the shift chained down the hour.
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:10:23.500Z', 'q2'), cap('2026-09-14T07:10:46.500Z', 'q3')],
            [
                { id: 'D1', dispatchedAt: '2026-09-14T07:10:00.000Z', question: 'q1' },
                { id: 'D2', dispatchedAt: '2026-09-14T07:10:23.000Z', question: 'q2' },
                { id: 'D3', dispatchedAt: '2026-09-14T07:10:46.000Z', question: 'q3' },
            ],
        );
        expect(Object.keys(paired)).toEqual(['D2', 'D3']);
        expect(lastInterviewerLine(paired.D2.user)).toBe('q2');
        expect(lastInterviewerLine(paired.D3.user)).toBe('q3');
    });

    it('refuses a capture inside the window whose last interviewer line is a different question', () => {
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:10:01.500Z', 'something else entirely')],
            [{ id: 'S1Q01', dispatchedAt: '2026-09-14T07:10:01.000Z', question: 'the dispatched question' }],
        );
        expect(paired).toEqual({});
    });

    it('pairs an answer and its supersede when the answer capture lands AFTER the supersede was dispatched', () => {
        // Measured shape: answer +0, supersede +437 ms, answer capture +478 ms, supersede capture +914 ms.
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:10:00.914Z', 'q short plus more words'), cap('2026-09-14T07:10:00.478Z', 'q short')],
            [
                { id: 'A', dispatchedAt: '2026-09-14T07:10:00.000Z', question: 'q short' },
                { id: 'A2', dispatchedAt: '2026-09-14T07:10:00.437Z', question: 'q short plus more words' },
            ],
        );
        expect(lastInterviewerLine(paired.A.user)).toBe('q short');
        expect(lastInterviewerLine(paired.A2.user)).toBe('q short plus more words');
    });

    it('drops an id whose LAST dispatch has no capture — the replaced answer is not the one the question ended up with', () => {
        // A supersede on the behavioural route captures nothing; keeping the answer's capture would
        // replay a call the judge never grades.
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:10:00.500Z', 'q short')],
            [
                { id: 'A', dispatchedAt: '2026-09-14T07:10:00.000Z', question: 'q short' },
                { id: 'A', dispatchedAt: '2026-09-14T07:10:03.000Z', question: 'q short plus more words' },
            ],
        );
        expect(paired).toEqual({});
    });

    it('keeps the later dispatch\'s capture for an id whatever order the dispatches arrive in', () => {
        const paired = pairCapturesToDispatches(
            [cap('2026-09-14T07:10:00.500Z', 'q short'), cap('2026-09-14T07:10:03.500Z', 'q short plus more words')],
            [
                { id: 'A', dispatchedAt: '2026-09-14T07:10:03.000Z', question: 'q short plus more words' },
                { id: 'A', dispatchedAt: '2026-09-14T07:10:00.000Z', question: 'q short' },
            ],
        );
        expect(lastInterviewerLine(paired.A.user)).toBe('q short plus more words');
    });
});

describe('captureAsksQuestion', () => {
    const c = (user: string): CapturedPrompt => ({ at: '2026-09-14T07:10:00.000Z', model: 'm', system: 's', user });

    it('matches ignoring case and punctuation', () => {
        expect(captureAsksQuestion(c('[INTERVIEWER]: How do pods, scale?'), 'how do pods scale')).toBe(true);
    });

    it('refuses a word-prefix: a capture asks its own dispatched question exactly', () => {
        expect(captureAsksQuestion(c('[INTERVIEWER]: how do pods'), 'How do pods scale under load?')).toBe(false);
    });

    it('refuses a non-word prefix', () => {
        expect(captureAsksQuestion(c('[INTERVIEWER]: pod'), 'pods are scheduled by what?')).toBe(false);
    });

    it('refuses a capture with no interviewer line, and an empty line', () => {
        expect(captureAsksQuestion(c('[ASSISTANT]: hello'), 'hello')).toBe(false);
        expect(captureAsksQuestion(c('[INTERVIEWER]:   '), 'anything')).toBe(false);
    });

    it('reads the LAST interviewer line', () => {
        expect(lastInterviewerLine('[INTERVIEWER]: one\n[ASSISTANT]: x\n[INTERVIEWER]: two')).toBe('two');
        expect(lastInterviewerLine('nothing here')).toBeNull();
    });
});
