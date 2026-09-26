import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { collectPass, renderPassRecord, renderPassIndex, passRow, graderOf, verbalHedgeFromLog } from './interview60.pass-record.mjs';
import { describeVerbalHedgeAtStartup } from '../../llm/verbalHedge';

/**
 * One record per pass, so a change to the pipeline can be read against the same golden
 * questions: the scripted question, what was heard, every answer the app gave, the
 * grader's scores and reason for each, and each arm's answer to the same question —
 * in one place, per question. Plus an index across passes.
 */
// vitest runs from the project root; the run folder is git-ignored, so this suite skips itself where it is absent.
const S50A = path.resolve(process.cwd(), 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a');

const grade = (correctness: number, on_topic: number, delivery: number, verdict: string, reason: string) => ({ correctness, on_topic, delivery, verdict, reason });

/** A one-question pass with everything filled in. */
const pass = (overrides: Record<string, unknown> = {}) => ({
    meta: {
        label: 's50a', dirName: '2026-09-09T15-00-55-s50a', runDir: 'C:/runs/2026-09-09T15-00-55-s50a',
        startedAt: '2026-09-09T13:52:13.132Z', endedAt: '2026-09-09T15:00:55.730Z', durationMin: 68.7,
        roster: 'scenario50', rosterLabel: 'scenario50 [S1, S2]  40 items', liveModel: 'gemini-3.1-flash-live-preview',
        stt: 'DeepgramStreamingSTT', answerModel: 'gemini-3.1-flash-lite', commit: '249e643abcdef', graded: true,
        graderPrompt: 'e53dff6256aa', judgeModel: 'claude-opus-5',
    },
    gate: { pass: false, rows: [{ label: 'Heard by either detector', value: '40/40', pass: true }, { label: 'Long questions answered whole', value: '12 of 15', pass: false }] },
    summary: {
        items: 40, heard: 40, answered: 40, delivered: 39, doubles: 13, extends: 22, supersedes: 0, longs: 15, longWhole: 12, ttftP90: 12113, detectP50: 1714, liveReconnects: 25, lostUtterances: 1,
        inApp: { questions: 20, acceptable: 5, weak: 14, wrong: 1, error: 0 }, inAppPairs: { n: 36, acceptable: 6, weak: 24, wrong: 6, error: 0 },
        followups: { n: 20, acceptable: 11, weak: 9, wrong: 0, error: 0 },
        arms: [{ model: 'qwen/qwen3.8-27b', n: 20, acceptable: 10, weak: 10, wrong: 0, error: 0, ttftP50: 512, ttftP90: 681, graded: true }],
    },
    questions: [{
        id: 'S1Q02', level: 'reasoning', kind: 'spoken', long: true, words: 56, clipSecs: 26.2, detectMs: -21367, coverage: 0.37,
        q: 'Can you reconcile the metrics on your CV? Your CV reports a 9.5% churn rate.',
        inApp: [
            { n: 1, source: 'whisper', dispatchedAt: '2026-09-09T13:55:03.674Z', offsetS: -21.4, heard: 'Can you reconcile the metrics on your CV?', heardExtended: null as string | null, extended: false, answer: 'The F1 of the extraction model rose from 0.72 to 0.84.', grade: grade(0, 0, 2, 'wrong', 'Reconciles the document-extraction metrics instead of the churn figures the question named.') },
            { n: 2, source: 'whisper', dispatchedAt: '2026-09-09T13:55:25.000Z', offsetS: 0.0, heard: 'Assuming the same population and observation period, use 100,000 to estimate', heardExtended: null as string | null, extended: false, answer: 'With 100,000 customers a 9.5% churn rate is 9,500 churners.', grade: grade(1, 2, 2, 'weak', 'Arithmetic right, but never reconciles the two CV figures.') },
        ],
        arms: [{ model: 'qwen/qwen3.8-27b', answer: 'Both figures can hold if the denominators differ.', ttft: 512, words: 9, grade: grade(2, 2, 2, 'acceptable', 'Names the denominator difference and the period.') }],
    }],
    ...overrides,
});

describe('renderPassRecord — one file holds the whole pass', () => {
    const md = renderPassRecord(pass());

    it('opens with what was flown: label, roster, models, ear, commit, grader stamp', () => {
        for (const s of ['s50a', 'scenario50 [S1, S2]  40 items', 'gemini-3.1-flash-live-preview', 'DeepgramStreamingSTT', 'gemini-3.1-flash-lite', '249e643', 'e53dff6256aa', '2026-09-09T13:52:13']) {
            expect(md, s).toContain(s);
        }
    });

    it('carries the gate table with each row\'s verdict', () => {
        expect(md).toMatch(/PASS[^\n]*Heard by either detector[^\n]*40\/40/);
        expect(md).toMatch(/FAIL[^\n]*Long questions answered whole[^\n]*12 of 15/);
    });

    it('puts the scripted question, what was heard, every answer, its scores and the grader\'s reason under the question', () => {
        const q = md.slice(md.indexOf('S1Q02'));
        for (const s of [
            'Can you reconcile the metrics on your CV? Your CV reports a 9.5% churn rate.',
            'Can you reconcile the metrics on your CV?', 'The F1 of the extraction model rose from 0.72 to 0.84.',
            'Reconciles the document-extraction metrics', 'wrong', 'With 100,000 customers a 9.5% churn rate is 9,500 churners.', 'weak',
        ]) expect(q, s).toContain(s);
        expect(q).toMatch(/correctness 0[^\n]*on_topic 0[^\n]*delivery 2/);
        expect(q).toContain('−21.4 s'); // fired 21.4 s before the clip ended
    });

    it('lists each arm\'s answer to the same question beside the app\'s', () => {
        const q = md.slice(md.indexOf('S1Q02'));
        expect(q).toContain('qwen/qwen3.8-27b');
        expect(q).toContain('Both figures can hold if the denominators differ.');
        expect(q).toContain('Names the denominator difference and the period.');
    });

    it('summarises the pass in numbers a later pass can be read against', () => {
        expect(md).toMatch(/5 acceptable[^\n]*14 weak[^\n]*1 wrong[^\n]*20/); // in-app, best answer per question
        expect(md).toMatch(/13 doubles/);
        expect(md).toMatch(/12 of 15/);
        expect(md).toMatch(/12\.1 s/); // ttft p90
    });

    it('shows supersedes in the summary line, beside extends (spec 2026-09-09 whole-turn)', () => {
        const md2 = renderPassRecord(pass({ summary: { ...pass().summary, supersedes: 1 } }));
        expect(md2).toContain('· 1 supersedes ·');
    });

    it('marks a superseded in-app answer inline, the same place "extended" is printed', () => {
        const p = pass();
        (p.questions[0].inApp[0] as any).superseded = true;
        const md2 = renderPassRecord(p);
        const q = md2.slice(md2.indexOf('S1Q02'));
        expect(q).toMatch(/\*\*In-app answer 1\*\*[^\n]*superseded/);
    });

    it('prints the superseding text, symmetric with "extended with:" (fix round 1, R28)', () => {
        const p = pass();
        (p.questions[0].inApp[0] as any).superseded = true;
        (p.questions[0].inApp[0] as any).heardSuperseded = 'And what about a service mesh instead?';
        const md2 = renderPassRecord(p);
        const q = md2.slice(md2.indexOf('S1Q02'));
        expect(q).toContain('superseded with: "And what about a service mesh instead?"');
    });

    it('says plainly when a pass has not been graded yet, and still shows the answers', () => {
        const ungraded = pass({ meta: { ...pass().meta, graded: false, graderPrompt: null, judgeModel: null }, summary: { ...pass().summary, inApp: null, inAppPairs: null, followups: null, arms: [{ model: 'qwen/qwen3.8-27b', n: 20, acceptable: 0, weak: 0, wrong: 0, error: 0, ttftP50: 512, ttftP90: 681, graded: false }] } });
        ungraded.questions[0].inApp.forEach((a: any) => { a.grade = null; });
        ungraded.questions[0].arms.forEach((a: any) => { a.grade = null; });
        const out = renderPassRecord(ungraded);
        expect(out).toContain('not graded');
        expect(out).toContain('The F1 of the extraction model rose from 0.72 to 0.84.');
        expect(out).not.toContain('undefined');
    });

    it('h40c review M6: no verbal-hedge startup line (every run before da28f25) — renders exactly as before, no new line', () => {
        expect(md).not.toContain('Verbal hedge');
        expect(md).toContain('| answers | gemini-3.1-flash-lite (in-app) · arms: qwen/qwen3.8-27b |');
    });

    it('h40c review M6: verbal hedge off — one extra summary line names it, the answers row is unchanged', () => {
        const md2 = renderPassRecord(pass({ meta: { ...pass().meta, verbalHedge: 'off' } }));
        expect(md2).toContain('- Verbal hedge: off');
        expect(md2).toContain('| answers | gemini-3.1-flash-lite (in-app) · arms: qwen/qwen3.8-27b |');
    });

    it('h40c review M6: verbal hedge on — the summary line names the trigger, and the answers row names both lites instead of 3.1-lite alone', () => {
        const md2 = renderPassRecord(pass({ meta: { ...pass().meta, verbalHedge: 'on trigger=5000ms' } }));
        expect(md2).toContain('- Verbal hedge: on trigger=5000ms (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)');
        expect(md2).toContain('| answers | hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back) (in-app) · arms: qwen/qwen3.8-27b |');
    });

    it('h40c review M6 fix round 1 (Minor 3): the hedge can only engage on one of the two lites — a different answer model keeps its own name even with the hedge on', () => {
        const md2 = renderPassRecord(pass({ meta: { ...pass().meta, verbalHedge: 'on trigger=5000ms', answerModel: 'gemini-3.5-flash' } }));
        // The flag was still on for the run, so the summary bullet still names it.
        expect(md2).toContain('- Verbal hedge: on trigger=5000ms (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)');
        // But the hedge never raced for THIS primary, so the answers row keeps naming it, not the hedge pair.
        expect(md2).toContain('| answers | gemini-3.5-flash (in-app) · arms: qwen/qwen3.8-27b |');
        expect(md2).not.toContain('hedge (gemini-3.5-flash-lite front');
    });
});

describe('renderPassIndex — the trend line across passes', () => {
    it('has one row per pass, chronological, linking the record and carrying the headline numbers', () => {
        const a = passRow(pass());
        const b = passRow(pass({ meta: { ...pass().meta, dirName: '2026-09-10T07-10-00-s50b', label: 's50b', startedAt: '2026-09-10T07:10:00.000Z', graded: false, commit: 'abc1234def' }, summary: { ...pass().summary, doubles: 0, inApp: null, inAppPairs: null, arms: [] } }));
        const md = renderPassIndex([b, a]);
        const rows = md.split('\n').filter((l) => l.startsWith('| 2026-'));
        expect(rows).toHaveLength(2);
        expect(rows[0]).toContain('2026-09-09T15-00-55-s50a');
        expect(rows[1]).toContain('2026-09-10T07-10-00-s50b');
        expect(rows[0]).toContain('(2026-09-09T15-00-55-s50a.md)');
        expect(rows[0]).toMatch(/5\/20/);      // in-app acceptable of mains
        expect(rows[0]).toMatch(/13/);         // doubles
        expect(rows[0]).toContain('249e643');
        expect(rows[1]).toContain('not graded');
    });

    it('carries supersedes in the header and each row', () => {
        const md2 = renderPassIndex([passRow(pass({ summary: { ...pass().summary, supersedes: 4 } }))]);
        expect(md2).toContain('| supersedes |');
        const row = md2.split('\n').find((l) => l.startsWith('| 2026-'));
        expect(row).toMatch(/\| 4 \|/);
    });
});

describe('the grader model — a pass names the model that graded it', () => {
    // The grading agents moved from claude-opus-5 to claude-opus-5-5 between two passes
    // (2026-09-22 → 09-24): the same answers lost 4-7 of 39 acceptable, and nothing on the
    // record showed it, because every judge file carried the same default label.
    const opus55 = 'claude-opus-5-5';
    const graded55 = (over: Record<string, unknown> = {}) => pass({ meta: { ...pass().meta, graderModel: opus55, ...over }, summary: { ...pass().summary, arms: [{ ...pass().summary.arms[0], graderModel: opus55 }] } });

    it('reads the grader from a judge file only where the file recorded it', () => {
        expect(graderOf({ model: opus55, graderModel: opus55, effort: null })).toBe(opus55);
        // The API route wrote the model it called, together with its effort.
        expect(graderOf({ model: 'claude-opus-5', effort: 'high' })).toBe('claude-opus-5');
        // A --verdicts merge from before the model was recorded: its label is not evidence.
        expect(graderOf({ model: 'claude-opus-5', effort: null })).toBeNull();
        expect(graderOf(null)).toBeNull();
    });

    it('prints the recorded grader in the record header and on each graded arm', () => {
        const md = renderPassRecord(graded55());
        expect(md).toContain('| grader | claude-opus-5-5, prompt e53dff6256aa |');
        expect(md).toMatch(/- Arm qwen\/qwen3\.8-27b [^\n]*grader claude-opus-5-5/);
    });

    it('says the grader is unrecorded instead of printing the default label as fact', () => {
        const md = renderPassRecord(pass({ meta: { ...pass().meta, graderModel: null } }));
        expect(md).toMatch(/\| grader \| unrecorded[^\n]*claude-opus-5[^\n]*prompt e53dff6256aa \|/);
        expect(md).toMatch(/- Arm qwen\/qwen3\.8-27b [^\n]*grader unrecorded/);
    });

    it('gives the index a grader column, so passes graded by different models read as not comparable', () => {
        const allNew = passRow(graded55());
        const allOld = passRow(pass({ meta: { ...pass().meta, dirName: '2026-09-10T07-10-00-s50b', startedAt: '2026-09-10T07:10:00.000Z', graderModel: null } }));
        const mixed = passRow(pass({ meta: { ...pass().meta, dirName: '2026-09-11T07-10-00-s50c', startedAt: '2026-09-11T07:10:00.000Z', graderModel: opus55 } }));
        const ungraded = passRow(pass({ meta: { ...pass().meta, dirName: '2026-09-12T07-10-00-s50d', startedAt: '2026-09-12T07:10:00.000Z', graded: false, graderModel: null }, summary: { ...pass().summary, inApp: null, arms: [] } }));
        const md = renderPassIndex([allNew, allOld, mixed, ungraded]);
        expect(md).toContain('| arms | grader |');
        const rows = md.split('\n').filter((l) => l.startsWith('| 2026-'));
        expect(rows[0]).toMatch(/\| claude-opus-5-5 \|$/);
        expect(rows[1]).toMatch(/\| unrecorded \|$/);
        expect(rows[2]).toMatch(/\| claude-opus-5-5 \+ unrecorded \|$/);
        expect(rows[3]).toMatch(/\| — \|$/);
    });

    it('explains the grader column in the index preface, including what "unrecorded" means', () => {
        const preface = renderPassIndex([]).split('\n').slice(0, 4).join('\n');
        expect(preface).toMatch(/"grader"/);
        expect(preface).toMatch(/unrecorded/);
    });

    it('escapes a grader name inside table cells', () => {
        const odd = pass({ meta: { ...pass().meta, graderModel: 'model|x' } });
        expect(renderPassRecord(odd)).toContain('| grader | model\\|x, prompt e53dff6256aa |');
        const row = renderPassIndex([passRow(odd)]).split('\n').find((l) => l.startsWith('| 2026-'));
        expect(row).toMatch(/\| model\\\|x \+ unrecorded \|$/);
    });
});

describe('verbalHedgeFromLog (h40c review, fix round 1, Minor 1): the regex M6 exists for, proved against the real describe function', () => {
    // A debug log line looks like "<ISO> [LOG] <text>" — the timestamp and level prefix that
    // M6's regex must see past, not just a hand-typed "[Main] verbal hedge: …" fixture.
    const at = (line: string) => `2026-09-26T10:00:00.000Z [LOG] ${line}`;

    it('reads off and on-trigger from the real describeVerbalHedgeAtStartup output', () => {
        expect(verbalHedgeFromLog(at(describeVerbalHedgeAtStartup({})))).toBe('off');
        expect(verbalHedgeFromLog(at(describeVerbalHedgeAtStartup({ NATIVELY_VERBAL_HEDGE: '1' } as any)))).toBe('on trigger=5000ms');
    });

    it('is null when the log holds no hedge line at all (every run before da28f25)', () => {
        expect(verbalHedgeFromLog(at('=== Natively session started 2026-09-26T10:00:00.000Z ==='))).toBeNull();
    });
});

describe.skipIf(!fs.existsSync(path.join(S50A, 'interview60.judge.json')))('collectPass on the real s50a run (skipped where the run folder is absent)', () => {
    let p: any;
    beforeAll(() => { p = collectPass(S50A); });

    it('reads the run as flown', () => {
        expect(p.meta.rosterLabel).toContain('scenario50');
        expect(p.meta.stt).toMatch(/Deepgram/);
        expect(p.meta.answerModel).toBe('gemini-3.1-flash-lite');
        expect(p.meta.liveModel).toBe('gemini-3.1-flash-live-preview');
        expect(p.meta.graded).toBe(true);
        expect(p.questions).toHaveLength(40);
        expect(p.gate.rows.length).toBeGreaterThanOrEqual(10);
    });

    it('joins each in-app answer with its grade and each arm with its own', () => {
        const q = p.questions.find((x: any) => x.id === 'S1Q02');
        expect(q.inApp).toHaveLength(2);
        expect(q.inApp[0].grade.verdict).toBe('wrong');
        expect(q.inApp[0].grade.reason).toMatch(/document-extraction/);
        expect(q.inApp[0].offsetS).toBeLessThan(-20);
        // collectPass takes the arms from whatever answer files the run folder holds, and an
        // experiment can add one (the 2026-09-09 *_structured prompt arms), so the canonical
        // four must be present, not be the whole set.
        const models = q.arms.map((a: any) => a.model).sort();
        for (const m of ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b']) expect(models, m).toContain(m);
        expect(q.arms.every((a: any) => a.grade && a.answer)).toBe(true);
        const f = p.questions.find((x: any) => x.id === 'S1Q02F');
        expect(f.arms).toHaveLength(0);
        expect(f.inApp[0].grade.verdict).toBe('acceptable');
    });

    it('reproduces the gate\'s own numbers', () => {
        expect(p.summary.inApp).toEqual({ questions: 20, acceptable: 5, weak: 14, wrong: 1, error: 0 });
        expect(p.summary.inAppPairs).toMatchObject({ n: 36, acceptable: 6, weak: 24, wrong: 6 });
        expect(p.summary.doubles).toBe(13);
        expect(p.summary.longWhole).toBe(12);
        expect(p.summary.arms.find((a: any) => a.model === 'qwen/qwen3.8-27b')).toMatchObject({ n: 20, acceptable: 10, weak: 10, wrong: 0 });
    });

    it('reads each judge file\'s grader: s50a was merged before graders were recorded, so none is claimed', () => {
        expect(p.meta.graderModel).toBeNull();
        expect(p.summary.arms.length).toBeGreaterThan(0);
        expect(p.summary.arms.every((a: any) => a.graderModel === null)).toBe(true);
    });
});
