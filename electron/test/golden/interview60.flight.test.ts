import { describe, it, expect } from 'vitest';
import { ANSWER_MODELS, FOCUSED_ONLY, LIVE_DEFAULT, LIVE_FALLBACK, PAIRED_ARMS, answersFileFor, capturedOnly, chooseLiveModel, newestRunDir } from './interview60.flight.mjs';

describe('chooseLiveModel', () => {
    it('keeps 3.x on a tool call, aborts only when no key reached the probe, falls to 2.5 on silence or a dead session', () => {
        expect(chooseLiveModel(0)).toBe(LIVE_DEFAULT);
        expect(chooseLiveModel(2)).toBeNull();          // no Gemini key in the env
        expect(chooseLiveModel(3)).toBe(LIVE_FALLBACK); // connected, transcribed, never called the tool
        expect(chooseLiveModel(1)).toBe(LIVE_FALLBACK); // FATAL mid-clip, e.g. an explicit 1011 quota close
        expect(chooseLiveModel(null)).toBe(LIVE_FALLBACK);
    });
});

describe('newestRunDir', () => {
    it('picks the newest folder with the label stamped at or after the flight start, never an older day with the same label', () => {
        const names = [
            '2026-09-03T10-08-22-after3',
            '2026-09-03T15-05-21-liveonly2',
            '2026-09-04T07-05-00-after4',   // an aborted attempt, stamped at the flight's start
            '2026-09-04T08-11-40-after4',   // the hour that ran
            'app.pid',
        ];
        expect(newestRunDir(names, 'after4', '2026-09-04T07:05:00.000Z')).toBe('2026-09-04T08-11-40-after4');
        expect(newestRunDir(names, 'after3', '2026-09-04T07:05:00.000Z')).toBeNull();
        expect(newestRunDir(names, 'after3', '2026-09-03T00:00:00.000Z')).toBe('2026-09-03T10-08-22-after3');
        expect(newestRunDir([], 'after4', '2026-09-04T07:05:00.000Z')).toBeNull();
    });
});

describe('FOCUSED_ONLY', () => {
    it('names only scenario50 mains, and no more than the free tier allows per model', async () => {
        // A typo here is expensive and silent until flight time: interview60.answers.mjs
        // exits 2 on an unknown id, so that arm writes nothing and the model's handful of
        // free calls for the day goes with it. Follow-ups are refused there too — answered
        // standalone they have no parent — so every id must be a main.
        const { SCENARIO50 } = await import('./scenario50.questions.mjs');
        // scenario50 carries no screenshot cues, so level is the only filter needed here.
        const mains = new Set(SCENARIO50.filter((i) => i.level !== 'followup').map((i) => i.id));
        const ids = FOCUSED_ONLY.split(',');
        expect(ids.length).toBeLessThanOrEqual(5);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(mains.has(id), `${id} is not a scenario50 main`).toBe(true);
    });
});

describe('answersFileFor', () => {
    it('keeps the default arm on the plain file the report reads and suffixes every other arm', () => {
        expect(ANSWER_MODELS[0]).toBe('gemini-3.1-flash-lite');
        expect(answersFileFor('gemini-3.1-flash-lite')).toBe('interview60.answers.json');
        expect(answersFileFor('gemma-4-31b-it')).toBe('interview60.answers.gemma-4-31b-it.json');
    });

    it('a tagged arm of the default model gets its own file, the way answers.mjs --tag names it', () => {
        expect(answersFileFor('gemini-3.1-flash-lite', 'low')).toBe('interview60.answers.gemini-3.1-flash-lite_low.json');
        expect(answersFileFor('gemini-3.1-flash-lite', 'captured-minimal')).toBe('interview60.answers.gemini-3.1-flash-lite_captured-minimal.json');
    });
});

/**
 * The 2026-09-17 bench showed the level change (+21 on 117 pairs) and the app-context tax
 * (+6 on 57) only in PAIRED grading on the same bytes. These two arms give every flight its
 * own pairs: the hour's captured prompts replayed at the pre-bench level, and the bare prompt
 * at the shipped level, both on the app's answer model.
 */
describe('PAIRED_ARMS', () => {
    const byTag = (tag: string) => PAIRED_ARMS.find((a) => a.tag === tag)!;

    it('every arm is one of the two Flash Lites, with a distinct tag', () => {
        expect(PAIRED_ARMS.length).toBeGreaterThan(0);
        for (const a of PAIRED_ARMS) expect([ANSWER_MODELS[0], ANSWER_MODELS[1]]).toContain(a.model);
        expect(new Set(PAIRED_ARMS.map((a) => a.tag)).size).toBe(PAIRED_ARMS.length);
    });

    it('covers the level on the app answer model: bare at LOW, the captured hour at the default and at LOW', () => {
        expect(byTag('low')).toMatchObject({ model: ANSWER_MODELS[0], captured: false, args: ['--thinking', 'LOW'] });
        expect(byTag('captured-minimal')).toMatchObject({ model: ANSWER_MODELS[0], captured: true, args: [] });
        expect(byTag('captured-low')).toMatchObject({ model: ANSWER_MODELS[0], captured: true, args: ['--thinking', 'LOW'] });
    });

    it('covers gemini-3.5-flash-lite at HIGH on both byte shapes, in the same window as the 3.1 arms', () => {
        // The 2026-09-18 bench tied 3.5 HIGH with 3.1 LOW on quality but could not compare latency:
        // the 3.1 arms ran at 10:05 and the 3.5 arms at 03:00. These two arms run minutes after the
        // hour, beside their 3.1 twins, so the comparison is same-window.
        expect(byTag('captured-high')).toMatchObject({ model: ANSWER_MODELS[1], captured: true, args: ['--thinking', 'HIGH'] });
        expect(byTag('high')).toMatchObject({ model: ANSWER_MODELS[1], captured: false, args: ['--thinking', 'HIGH'] });
    });

    it('never sets LOW on gemini-3.5-flash-lite, which does not honour it', () => {
        // Probes 2026-09-17 (n=2 per cell): 3.5-lite reported no thought tokens at LOW on 3 of 4
        // calls and honoured MEDIUM and HIGH every time. An arm at LOW would silently measure the
        // provider default and be reported as a thinking arm.
        for (const a of PAIRED_ARMS.filter((x) => x.model === ANSWER_MODELS[1])) {
            const level = a.args[a.args.indexOf('--thinking') + 1];
            expect(['MEDIUM', 'HIGH']).toContain(level);
        }
    });

    it('capturedOnly names the spoken roster items the hour captured, so one missing capture does not refuse the whole arm', () => {
        // s50f captured 38 of 40 (S1Q01 and S2Q02 missing); answers.mjs --captured refuses any
        // id without a prompt, so the arm is pointed at exactly what was captured.
        const items = [
            { id: 'S1Q01', kind: 'spoken' }, { id: 'S1Q01F', kind: 'spoken' }, { id: 'S1Q02', kind: 'spoken' }, { id: 'S2Q02', kind: 'spoken' },
            { id: 'C01', kind: 'screenshot' },
        ];
        const cap = {
            S1Q01F: { system: 'sys', user: 'usr' },
            S1Q02: { system: 'sys', user: 'usr' },
            S2Q02: { system: 'sys' },          // user turn never recorded → not replayable
            C01: { system: 'sys', user: 'usr' }, // a screenshot cue is not a spoken question
        };
        expect(capturedOnly(cap, items)).toEqual(['S1Q01F', 'S1Q02']);
        expect(capturedOnly({}, items)).toEqual([]);
    });
});
