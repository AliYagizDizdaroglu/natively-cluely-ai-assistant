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
