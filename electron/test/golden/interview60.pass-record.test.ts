import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { collectPass, renderPassRecord, renderPassIndex, passRow } from './interview60.pass-record.mjs';

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
        expect(q.arms.map((a: any) => a.model).sort()).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b']);
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
});
