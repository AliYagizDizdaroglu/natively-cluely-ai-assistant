import { describe, it, expect } from 'vitest';
import { ANSWER_MODELS, FOCUSED_ONLY, LIVE_DEFAULT, LIVE_FALLBACK, answersFileFor, chooseLiveModel, newestRunDir } from './interview60.flight.mjs';

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
        const mains = new Set(SCENARIO50.filter((i) => (i.kind ?? 'spoken') === 'spoken' && i.level !== 'followup').map((i) => i.id));
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
});
