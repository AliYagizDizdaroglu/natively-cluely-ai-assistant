import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * roster.mjs reads the environment once, at module load, so every case has to
 * reset the module registry and re-import. That is also how the harness sees it:
 * one process, one roster, decided before anything is spent.
 */
const VARS = ['NATIVELY_ROSTER', 'NATIVELY_SCENARIOS'] as const;

async function load(env: Partial<Record<(typeof VARS)[number], string>>) {
    vi.resetModules();
    // DELETE rather than assign undefined: process.env coerces, so assigning
    // undefined stores the literal string "undefined" and every case would test
    // the unknown-roster path instead of the one it names.
    const saved = Object.fromEntries(VARS.map((v) => [v, process.env[v]]));
    for (const v of VARS) delete process.env[v];
    Object.assign(process.env, env);
    try {
        return await import('./roster.mjs');
    } finally {
        for (const v of VARS) {
            if (saved[v] === undefined) delete process.env[v];
            else process.env[v] = saved[v];
        }
    }
}

afterEach(() => vi.resetModules());

describe('roster selection', () => {
    it('defaults to interview60 with its own audio paths, so after7/8/9 stay comparable', async () => {
        const r = await load({});
        expect(r.ROSTER_NAME).toBe('interview60');
        expect(r.INTERVIEW).toHaveLength(79);
        expect(r.INTERVIEW[0].id).toBe('W01');
        expect(r.WAV_NAME).toBe('interview60.wav');
        expect(r.TTS_LOCAL_DIR).toBe('interview60-tts-local');
    });

    it('treats a blank NATIVELY_ROSTER as unset — clearing the variable must not abort the hour', async () => {
        const r = await load({ NATIVELY_ROSTER: '  ' });
        expect(r.ROSTER_NAME).toBe('interview60');
    });

    it('switches the questions AND the audio directory together', async () => {
        const i60 = await load({});
        const s50 = await load({ NATIVELY_ROSTER: 'scenario50' });
        expect(s50.INTERVIEW).toHaveLength(100);
        expect(s50.INTERVIEW[0].id).toBe('S1Q01');
        // The local TTS builder caches clips by id and returns early when the file
        // exists. Sharing a directory would mean a stale clip is spoken instead of
        // the question you think you are asking — for an hour, with no error.
        expect(s50.TTS_LOCAL_DIR).not.toBe(i60.TTS_LOCAL_DIR);
        expect(s50.TTS_GEMINI_DIR).not.toBe(i60.TTS_GEMINI_DIR);
        expect(s50.WAV_NAME).not.toBe(i60.WAV_NAME);
    });

    it('restricts to the named scenarios, in roster order', async () => {
        const r = await load({ NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1, S2' });
        expect(r.INTERVIEW).toHaveLength(40);
        expect(r.INTERVIEW[0].id).toBe('S1Q01');
        expect(r.INTERVIEW.at(-1)!.id).toBe('S2Q10F');
        expect(r.rosterLabel()).toContain('S1, S2');
    });

    it('refuses an unknown roster rather than running something else', async () => {
        await expect(load({ NATIVELY_ROSTER: 'scenario_50' })).rejects.toThrow(/is not a roster/);
    });

    // The dangerous shape: a typo'd scenario would otherwise run a SHORTER hour and
    // look like a flight that simply had fewer questions.
    it('refuses a scenario the roster does not have', async () => {
        await expect(load({ NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S9' })).rejects.toThrow(/S9/);
        await expect(load({ NATIVELY_SCENARIOS: 'S1' })).rejects.toThrow(/no scenarios/);
    });
});

describe('scenario50 as a stimulus', () => {
    it('is the long-question set: every main has one follow-up, and 26 mains split across finals', async () => {
        const { INTERVIEW } = await load({ NATIVELY_ROSTER: 'scenario50' });
        const mains = INTERVIEW.filter((x: any) => x.level !== 'followup');
        const follow = INTERVIEW.filter((x: any) => x.level === 'followup');
        expect(mains).toHaveLength(50);
        expect(follow).toHaveLength(50);
        expect(new Set(follow.map((f: any) => f.chain)).size).toBe(50);
        // 26 is measured, not chosen: it is how many mains reach LONG_WORDS. interview60
        // reaches that bar 6 times in 76, which is why it could never settle the question.
        expect(INTERVIEW.filter((x: any) => x.long)).toHaveLength(26);
    });

    it('cannot collide with interview60 ids — a shared id would speak the wrong question', async () => {
        const i60 = await load({});
        const s50 = await load({ NATIVELY_ROSTER: 'scenario50' });
        const old = new Set(i60.INTERVIEW.map((x: any) => x.id));
        expect(s50.INTERVIEW.filter((x: any) => old.has(x.id))).toEqual([]);
    });
});

/**
 * holdout40 is the set that is NEVER tuned on: it answers "does the change still hold on
 * questions it was not tuned against" — once per shipped change. Its shape is the opposite of
 * scenario50's on purpose (short, mostly single-part, seven areas, AWS and Databricks named),
 * so a count drifting towards scenario50's is a design regression, not a detail.
 */
describe('holdout40 as a stimulus', () => {
    it('is 33 mains and 12 follow-ups, R01 first and R33 last, with the level mix the spec fixes', async () => {
        const { HOLDOUT40 } = await import('./holdout40.questions.mjs');
        expect(HOLDOUT40).toHaveLength(45);
        expect(HOLDOUT40[0].id).toBe('R01');
        expect(HOLDOUT40.at(-1)!.id).toBe('R33');
        const mains = HOLDOUT40.filter((x: any) => x.level !== 'followup');
        expect(mains).toHaveLength(33);
        expect(HOLDOUT40.filter((x: any) => x.level === 'followup')).toHaveLength(12);
        expect(mains.reduce((a: any, x: any) => ({ ...a, [x.level]: (a[x.level] ?? 0) + 1 }), {}))
            .toEqual({ verbal: 6, reasoning: 17, design: 4, coding: 2, sql: 1, cloud: 3 });
    });

    it('chains every follow-up to an item spoken before it, exactly one of them two deep', async () => {
        const { HOLDOUT40 } = await import('./holdout40.questions.mjs');
        const asked = new Set<string>();
        let twoDeep = 0;
        for (const x of HOLDOUT40 as any[]) {
            if (x.level === 'followup') {
                expect(asked.has(x.chain), `${x.id} chains to ${x.chain}, which is not asked before it`).toBe(true);
                if (x.chain.endsWith('F')) twoDeep++;
            }
            asked.add(x.id);
        }
        // R22 -> R22F -> R22F2. Every roster so far chains once, so context carried two turns
        // deep has never been measured. judge.mjs brackets R22F2 with R22F's text only — stated
        // in the spec, not a defect.
        expect(twoDeep).toBe(1);
    });

    it('is the short-question set — median under 20 words, at most one item at LONG_WORDS — and names no Azure service', async () => {
        const { HOLDOUT40 } = await import('./holdout40.questions.mjs');
        const { wordsOf } = await import('./scenario50.questions.mjs');
        const words = HOLDOUT40.map((x: any) => wordsOf(x.q)).sort((a: number, b: number) => a - b);
        expect(words[Math.floor(words.length / 2)]).toBeLessThan(20);
        expect(HOLDOUT40.filter((x: any) => x.long).length).toBeLessThanOrEqual(1);
        // The résumé and JD the app holds are Azure-heavy, so every provider question here is a
        // test of priming on providers the résumé barely mentions.
        expect(HOLDOUT40.filter((x: any) => /azure/i.test(x.q))).toEqual([]);
    });

    it('cannot collide with interview60 or scenario50 ids', async () => {
        const { HOLDOUT40 } = await import('./holdout40.questions.mjs');
        const i60 = await load({});
        const s50 = await load({ NATIVELY_ROSTER: 'scenario50' });
        const taken = new Set([...i60.INTERVIEW, ...s50.INTERVIEW].map((x: any) => x.id));
        expect(HOLDOUT40.filter((x: any) => taken.has(x.id))).toEqual([]);
    });
});

describe('holdout40 in the harness', () => {
    it('loads with its own audio paths and the eight-clip calibration sample', async () => {
        const r = await load({ NATIVELY_ROSTER: 'holdout40' });
        expect(r.ROSTER_NAME).toBe('holdout40');
        expect(r.INTERVIEW).toHaveLength(45);
        expect(r.INTERVIEW[0].id).toBe('R01');
        // Its own directory and wav: the local TTS builder caches clips by id, so a shared
        // directory would speak a stale clip for an hour without an error.
        expect(r.TTS_LOCAL_DIR).toBe('holdout40-tts-local');
        expect(r.TTS_GEMINI_DIR).toBe('holdout40-tts');
        expect(r.WAV_NAME).toBe('holdout40.wav');
        // The two longest clips, spoken SQL, a spoken identifier, numerals twice, two product
        // names no keyterm covers — the renderings most likely to be misheard.
        expect(r.calibrationSample().map((x: any) => x.id)).toEqual(['R02', 'R09', 'R13', 'R23', 'R25', 'R26', 'R29', 'R31']);
    });
});
