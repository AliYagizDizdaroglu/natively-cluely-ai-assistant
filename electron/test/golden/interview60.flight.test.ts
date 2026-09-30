import { describe, it, expect } from 'vitest';
import { ANSWER_MODELS, CUE_RULE_MARK, FOCUSED_MODELS, FOCUSED_ONLY_BY_ROSTER, LIVE_DEFAULT, LIVE_FALLBACK, PAIRED_ARMS, answersFileFor, capturedOnly, chooseLiveModel, focusedOnlyFor, hasCueRule, newestRunDir } from './interview60.flight.mjs';
import { CUE_RULE } from '../../llm/prompts';

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

describe('FOCUSED_ONLY is re-picked from the last hour, not left to go stale', () => {
    // A focused arm exists to SEPARATE models, so its questions must be ones arms disagree on.
    // Scored across s50j's six app-bytes arms (in-app, three 3.1-LOW twins, 3.1 no-thinking,
    // 3.5-lite HIGH) — the captured prompt is what a focused arm replays, so that is the right
    // input to rank on, not the bare scripted text:
    //
    //   S1Q02  2/6   S1Q08  3/6   S2Q02  4/6   S1Q07  4/6      <- the four targets
    //   S1Q06  6/6                                             <- the control, see below
    //   S2Q07  6/6   S2Q09  6/6   S2Q10  6/6                   <- DROPPED, separating nothing
    //
    // Shipping thinking LOW moved three of the old five to 6 of 6 on captured bytes: the arms
    // were spending 20 calls a day on questions every model now passes.
    it('targets the four mains s50j arms actually disagreed on', () => {
        for (const id of ['S1Q02', 'S1Q08', 'S2Q02', 'S1Q07']) {
            expect(FOCUSED_ONLY_BY_ROSTER.scenario50.split(','), `${id} was 4 of 6 or worse on captured bytes`).toContain(id);
        }
    });

    it('drops the three that every app-bytes arm now passes', () => {
        for (const id of ['S2Q07', 'S2Q09', 'S2Q10']) {
            expect(FOCUSED_ONLY_BY_ROSTER.scenario50.split(','), `${id} is 6 of 6 — it separates nothing`).not.toContain(id);
        }
    });

    it('keeps S1Q06 as the control, which is a different job from being a target', () => {
        // 9 of 10 arms pass it on captured bytes, and it still splits the bare arms 2 of 6. A
        // focused arm that fails S1Q06 is a broken arm rather than a hard question, and that
        // reading is what makes the four targets trustworthy. Do not drop it for being easy —
        // being easy is the point.
        expect(FOCUSED_ONLY_BY_ROSTER.scenario50.split(',')).toContain('S1Q06');
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
        const ids = FOCUSED_ONLY_BY_ROSTER.scenario50.split(',');
        expect(ids.length).toBeLessThanOrEqual(5);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(mains.has(id), `${id} is not a scenario50 main`).toBe(true);
    });
});

describe('focusedOnlyFor', () => {
    it('gives scenario50 its five and a roster without a pick nothing, so the flight skips the focused arms instead of failing them', () => {
        // answers.mjs exits 2 on --only ids outside its roster, and the flight tolerates a missing
        // answers file with one WARN — so scenario50's ids sent on holdout40 would fail all four
        // focused arms and read as four accidents in the pass record. No pick means no arm, said
        // once in the log. holdout40 picks its five after its baseline hour ranks the mains.
        expect(focusedOnlyFor('scenario50')).toBe(FOCUSED_ONLY_BY_ROSTER.scenario50);
        expect(focusedOnlyFor('holdout40')).toBeNull();
        expect(focusedOnlyFor('interview60')).toBeNull();
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

describe('ANSWER_MODELS', () => {
    it('the flight answers with the two Flash Lites only: no Groq comparison arms (user, 2026-09-26)', () => {
        expect(ANSWER_MODELS).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
    });

    it('no id the flight can schedule runs on Groq: answer, focused and paired arms (user, 2026-09-26)', () => {
        for (const m of [...ANSWER_MODELS, ...FOCUSED_MODELS, ...PAIRED_ARMS.map((a) => a.model)]) expect(m, m).not.toContain('/');
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

    it('runs the offline twin three times, identical but for the tag, so the hour has its own noise floor', () => {
        // s50i measured in-app 28/39 against this arm's 33/39 on identical bytes, same model, same
        // level — but at one sample per side, against a ±4 bench floor. Three reps give the twin's
        // own rep-to-rep spread, which is the band the single live hour has to fall outside before
        // the pipeline gap counts as real rather than sampling.
        const twins = PAIRED_ARMS.filter((a) => a.tag.startsWith('captured-low'));
        expect(twins).toHaveLength(3);
        expect(new Set(twins.map((a) => a.tag)).size).toBe(3);
        for (const t of twins) expect(t).toMatchObject({ model: ANSWER_MODELS[0], captured: true, args: ['--thinking', 'LOW'] });
    });

    it('covers gemini-3.5-flash-lite at HIGH on both byte shapes, in the same window as the 3.1 arms', () => {
        // The 2026-09-18 bench tied 3.5 HIGH with 3.1 LOW on quality but could not compare latency:
        // the 3.1 arms ran at 10:05 and the 3.5 arms at 03:00. These two arms run minutes after the
        // hour, beside their 3.1 twins, so the comparison is same-window.
        expect(byTag('captured-high')).toMatchObject({ model: ANSWER_MODELS[1], captured: true, args: ['--thinking', 'HIGH'] });
        expect(byTag('high')).toMatchObject({ model: ANSWER_MODELS[1], captured: false, args: ['--thinking', 'HIGH'] });
    });

    it('runs the 3.5 HIGH twin three times too, so the model comparison is band against band', () => {
        // s50j: the single captured-high arm scored 35 of 39 against the 3.1-LOW twin band of
        // 29-33. Read against the worst rep that is +6 and clears the ship rule; read against
        // the band it is +2 over the top. One arm against a band overstates by up to 4, so the
        // model decision needs 3.5 HIGH's own band, same bytes, same window.
        const twins = PAIRED_ARMS.filter((a) => a.tag.startsWith('captured-high'));
        expect(twins).toHaveLength(3);
        expect(new Set(twins.map((a) => a.tag)).size).toBe(3);
        for (const t of twins) expect(t).toMatchObject({ model: ANSWER_MODELS[1], captured: true, args: ['--thinking', 'HIGH'] });
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

    it('runs the same-bytes no-cue twin three times on the hedge\'s front leg, only on an hour that flew with cues', () => {
        // Cue mode (spec 2026-09-20 §8): a cue hour's control is its own captured bytes with the
        // exact rule stripped, band against band within one hour. On a pre-cue hour the arm would
        // silently duplicate the control, so it is gated on the bytes and skipped with a log line.
        // The twins pair with captured-high (3.5-lite, HIGH, same bytes, rule stripped): under the
        // hedge default 3.5-lite writes almost every answer (h40c: 44 of 45), so the cue-vs-no-cue
        // band has to be read on that model, not on 3.1-lite, which is only the back leg.
        const twins = PAIRED_ARMS.filter((a) => a.tag.startsWith('captured-no-cues'));
        expect(twins.map((a) => a.tag)).toEqual(['captured-no-cues-high', 'captured-no-cues-high-r2', 'captured-no-cues-high-r3']);
        for (const t of twins) {
            expect(t).toMatchObject({ model: ANSWER_MODELS[1], captured: true, args: ['--thinking', 'HIGH', '--no-cues'] });
            expect(t.when).toBe(hasCueRule);
        }
        expect(PAIRED_ARMS.filter((a) => !a.tag.startsWith('captured-no-cues')).every((a) => a.when === undefined)).toBe(true);
    });

    it('hasCueRule reads the shipped rule\'s header out of the captured system prompts', () => {
        expect(CUE_RULE).toContain(CUE_RULE_MARK);
        // Scoped through capturedOnly, exactly what the captured-no-cues arm replays: only ids
        // the roster calls spoken, with both a system and a user turn, are read at all — and
        // ALL of those replayable prompts must carry the rule. A mixed hour (some captured
        // prompts with it, some without) must fail closed rather than wave the arm through on
        // .some() and have answers.mjs refuse it per id, mid-flight, instead. W01 and W02 are
        // real interview60 ids (both spoken); C01 is real too but kind: 'screenshot'.
        expect(hasCueRule({ W01: { system: `prompt ${CUE_RULE_MARK} more`, user: 'u' } })).toBe(true);
        expect(hasCueRule({ W01: { system: 'prompt without it', user: 'u' } })).toBe(false);
        // MIXED: one replayable prompt carries the rule, the other does not — this is the case
        // that tells .every() apart from .some(); a .some() reading would wrongly say true here.
        expect(hasCueRule({ W01: { system: `prompt ${CUE_RULE_MARK} more`, user: 'u' }, W02: { system: 'no rule here', user: 'u' } })).toBe(false);
        expect(hasCueRule({})).toBe(false);
        // C01 is a screenshot cue — capturedOnly never replays it, so a rule-carrying capture of
        // it alone must not count either; a .some() over every entry would wrongly say true here.
        expect(hasCueRule({ C01: { system: `prompt ${CUE_RULE_MARK} more`, user: 'u' } })).toBe(false);
    });
});
