import { describe, it, expect } from 'vitest';
import {
    buildEarlierQuestion, recordAsked, formatBlock, clip, interviewerLinesBefore,
    earlierQuestionEnabled, describeEarlierQuestionAtStartup,
    LABEL, LEDGER_DEPTH, PARENT_MAX_CHARS, CLIP_HEAD, CLIP_TAIL, EARLIER_QUESTION_ENV, type AskedQuestion,
} from './earlierQuestion';
import { gate } from './earlierQuestionGate';

// Invented sentences only — the same ones as the reference's tests (none is a scenario50 or holdout sentence).
const P_CACHE = 'Which eviction policy would you pick for the session cache, so that hot users stay resident?';
const F_WHY = 'Why that one?';
const P_QUEUE = 'How would you size the worker pool that drains the invoice queue during month end?';
const F_PRON = 'What happens to it when a worker crashes halfway?';
const P_SHARD = 'Describe how you would shard the telemetry store by tenant.';
const Q_AUDIT = 'Explain how you would audit access to the telemetry store.';
const P_SAME = 'How would you keep the same shard layout with twice the tenants?';
const P_REF = 'How would your design for the invoice queue survive a regional outage?';
const F_THOSE = 'How would you rebalance those shards after a tenant doubles in size?';
const P_LONG = `Design the ingestion path for a fleet of ${'regional '.repeat(20)}edge collectors that batch readings, sign each batch, and upload them to a central lake; then say how you would verify, end to end, that no batch was lost, duplicated or reordered before the nightly roll-up reads it, while preserving the per-device ordering guarantee.`;

const L = (...texts: string[]): AskedQuestion[] => texts.map((text, i) => ({ text, turnId: i + 1, seq: i + 1 }));
const block = (parent: string) => `${LABEL}\n- ${parent}`;

type Case = { row: string; input: Parameters<typeof buildEarlierQuestion>[0]; expect: { block: string; why?: string; cue?: string }; mustHaveCue?: boolean; wrongReferent?: { shown: string; truth: string }; ledgerWrite?: { text: string; turnId: number | null; seq: number; before: AskedQuestion[]; after: AskedQuestion[] } };

const CASES: Case[] = [
    { row: 'ledger empty (first question)', input: { question: F_PRON, turnId: 2, ledger: [], promptLines: [] }, expect: { block: '', why: 'no-parent' } },
    { row: 'settled null (manual with nothing dispatched)', input: { question: null, turnId: null, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-question' } },
    { row: 'settled blank', input: { question: '   ', turnId: 3, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-question' } },
    { row: 'flag off', input: { enabled: false, question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'off', cue: 'none' } },
    { row: 'evicted parent + cue: the block (control for every silent row below)', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: block(P_SHARD), why: '' } },
    { row: 'parent in the prompt (short gap)', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [P_SHARD] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'parent in the prompt, older question absent: the grandparent is never read (S2Q09F shape)', input: { question: 'How would your design change if the audit trail had to be tamper evident?', turnId: 3, ledger: L(P_SHARD, P_QUEUE), promptLines: [P_QUEUE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'parent contained in the pinned line (Live merge)', input: { question: `${P_SHARD} Then how would your design change if a tenant doubled in size?`, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' } },
    { row: 're-ask of the parent (same text, earlier copy evicted)', input: { question: P_SAME, turnId: 3, ledger: L(P_SAME), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned' }, mustHaveCue: true },
    { row: 'quick follow-up < 60 s sharing a frame word ("Why that one?"), parent in the prompt', input: { question: F_WHY, turnId: 2, ledger: L(P_CACHE), promptLines: [P_CACHE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'quick follow-up, its 90 s control: identical inputs, identical output (no clock)', input: { question: F_WHY, turnId: 2, ledger: L(P_CACHE), promptLines: [P_CACHE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'supersede, continuation of the same question', input: { question: `${P_QUEUE} Include the retry policy.`, turnId: 4, supersede: true, ledger: [{ text: P_QUEUE, turnId: 4, seq: 4 }], promptLines: [] }, expect: { block: '', why: 'supersede' } },
    { row: 'two questions in one turn: supersede of a different question, older parent absent', input: { question: 'And how would you rebalance those shards afterwards?', turnId: 5, supersede: true, ledger: [{ text: P_SHARD, turnId: 4, seq: 4 }, { text: Q_AUDIT, turnId: 5, seq: 5 }], promptLines: [] }, expect: { block: '', why: 'supersede', cue: 'leading' } },
    { row: 'two questions in one turn, control without supersede: the same inputs would add the previous turn', input: { question: 'And how would you rebalance those shards afterwards?', turnId: 5, supersede: false, ledger: [{ text: P_SHARD, turnId: 4, seq: 4 }, { text: Q_AUDIT, turnId: 5, seq: 5 }], promptLines: [] }, expect: { block: block(Q_AUDIT), why: '' } },
    { row: 'R21 supersede re-entering as answer, head dropped by the deduper (duplicate of an answered question still in the prompt)', input: { question: `${P_REF} Include the retry policy.`, turnId: 6, supersede: false, ledger: L(P_REF), promptLines: [P_REF] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' },
      ledgerWrite: { text: `${P_REF} Include the retry policy.`, turnId: 6, seq: 6, before: L(P_REF), after: [...L(P_REF), { text: `${P_REF} Include the retry policy.`, turnId: 6, seq: 6 }] } },
    { row: 'R21 supersede, head dropped by isFragment (Live-sourced, under 4 words): the normal gated block, parent = the previous turn', input: { question: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, supersede: false, ledger: L(P_QUEUE, P_SHARD), promptLines: [P_QUEUE] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, seq: 7, before: L(P_QUEUE, P_SHARD), after: [...L(P_QUEUE, P_SHARD), { text: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, seq: 7 }] } },
    { row: 'supersede after an answer-now re-ran the head (turnId null entry newer than the head): remove + push newest',
      input: { question: `${P_QUEUE} Include the retry policy.`, turnId: 4, supersede: true, ledger: [{ text: P_QUEUE, turnId: 4, seq: 4 }, { text: P_QUEUE, turnId: null, seq: 5 }], promptLines: [] }, expect: { block: '', why: 'supersede' },
      ledgerWrite: { text: `${P_QUEUE} Include the retry policy.`, turnId: 4, seq: 6, before: [{ text: P_QUEUE, turnId: 4, seq: 4 }, { text: P_QUEUE, turnId: null, seq: 5 }], after: [{ text: P_QUEUE, turnId: null, seq: 5 }, { text: `${P_QUEUE} Include the retry policy.`, turnId: 4, seq: 6 }] } },
    { row: 'double dispatch past the deduper: duplicate entry, parent unchanged', input: { question: F_THOSE, turnId: 9, ledger: [{ text: P_SHARD, turnId: 7, seq: 7 }, { text: P_SHARD, turnId: 8, seq: 8 }], promptLines: [] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: P_SHARD, turnId: 8, seq: 8, before: L(P_SHARD), after: [{ text: P_SHARD, turnId: 1, seq: 1 }, { text: P_SHARD, turnId: 8, seq: 8 }] } },
    { row: 'chip click / answer-now / manual in auto mode (turnId null): ledger written, block ""', input: { question: F_THOSE, turnId: null, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-turn', cue: 'pronoun' },
      ledgerWrite: { text: F_THOSE, turnId: null, seq: 2, before: L(P_SHARD), after: [...L(P_SHARD), { text: F_THOSE, turnId: null, seq: 2 }] } },
    { row: 'late Live echo of Q dispatched at 61 s (before the next question R): harmless duplicate parent', input: { question: F_PRON, turnId: 12, ledger: [{ text: P_QUEUE, turnId: 10, seq: 10 }, { text: P_QUEUE, turnId: 11, seq: 11 }], promptLines: [] }, expect: { block: block(P_QUEUE), why: '' } },
    { row: 'late Live echo of Q at 76 s AFTER the next question R: the WRONG referent, bounded by the label (ledger [Q, R, Q-echo])', input: { question: F_THOSE, turnId: 13, ledger: [{ text: P_QUEUE, turnId: 10, seq: 10 }, { text: P_SHARD, turnId: 11, seq: 11 }, { text: P_QUEUE, turnId: 12, seq: 12 }], promptLines: [P_SHARD] }, expect: { block: block(P_QUEUE), why: '' },
      wrongReferent: { shown: P_QUEUE, truth: P_SHARD } },
    { row: 'never-dispatched parent: the previous DISPATCHED question becomes the referent (measured by the D-cases)', input: { question: F_THOSE, turnId: 3, ledger: L(P_QUEUE), promptLines: [] }, expect: { block: block(P_QUEUE), why: '' } },
    { row: 'suggest/off mode: click Q1, skip Q2 and Q3, click a follow-up chip: ledger [Q1], turnId null -> ""', input: { question: F_PRON, turnId: null, ledger: [{ text: P_QUEUE, turnId: null, seq: 1 }], promptLines: [] }, expect: { block: '', why: 'no-turn' },
      ledgerWrite: { text: F_PRON, turnId: null, seq: 2, before: [{ text: P_QUEUE, turnId: null, seq: 1 }], after: [{ text: P_QUEUE, turnId: null, seq: 1 }, { text: F_PRON, turnId: null, seq: 2 }] } },
    { row: 'parent over 450 chars: head 150 + ellipsis + tail 299', input: { question: 'How would you test that end to end?', turnId: 2, ledger: L(P_LONG), promptLines: [] }, expect: { block: `${LABEL}\n- ${P_LONG.replace(/\s+/g, ' ').trim().slice(0, 150)}…${P_LONG.replace(/\s+/g, ' ').trim().slice(-299)}`, why: '' } },
    { row: 'parent present only as a tail fragment after the sparsify cut counts as present', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: ['store by tenant.'] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'no cue: a standalone question gets nothing', input: { question: 'Describe how you would design a retention policy for audit logs.', turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-cue', cue: 'none' } },
    { row: 'blank parent text', input: { question: F_THOSE, turnId: 2, ledger: [{ text: '  ', turnId: 1, seq: 1 }], promptLines: [] }, expect: { block: '', why: 'no-parent' } },
    { row: 'exception in select (a null prompt line) -> "" and gate=error, never a throw', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [null as any] }, expect: { block: '', why: 'error', cue: 'none' } },
    { row: 'exception: ledger missing', input: { question: F_THOSE, turnId: 2, ledger: null as any, promptLines: [] }, expect: { block: '', why: 'error' } },
    // Review Focus 1: turn id 0 is a turn, not "no turn".
    { row: 'turnId 0 is a valid turn: the block is built', input: { question: F_THOSE, turnId: 0, ledger: L(P_SHARD), promptLines: [] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: `${P_SHARD} And the hot tenants?`, turnId: 0, seq: 3, before: [{ text: P_QUEUE, turnId: 1, seq: 1 }, { text: P_SHARD, turnId: 0, seq: 2 }], after: [{ text: P_QUEUE, turnId: 1, seq: 1 }, { text: `${P_SHARD} And the hot tenants?`, turnId: 0, seq: 3 }] } },
    // Review Focus 2: a joined whole-turn text with a line break inside.
    // The ledger stores the text exactly as dispatched, line break included (audit / diag fidelity); only the block line collapses it.
    { row: 'parent with a line break (two joined finals): present in the prompt by overlap -> ""', input: { question: F_THOSE, turnId: 2, ledger: [{ text: 'Describe how you would shard\nthe telemetry store by tenant.', turnId: 1, seq: 1 }], promptLines: ['describe how you would shard the telemetry store by tenant.'] }, expect: { block: '', why: 'parent-in-prompt' },
      ledgerWrite: { text: 'Describe how you would shard\nthe telemetry store by tenant.', turnId: 1, seq: 1, before: [], after: [{ text: 'Describe how you would shard\nthe telemetry store by tenant.', turnId: 1, seq: 1 }] } },
    { row: 'parent with a line break, evicted: the block line is ONE line (whitespace collapsed)', input: { question: F_THOSE, turnId: 2, ledger: [{ text: 'Describe how you would shard\nthe telemetry store by tenant.', turnId: 1, seq: 1 }], promptLines: [] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: 'Describe how you would shard\nthe telemetry store by tenant.', turnId: 1, seq: 1, before: [], after: [{ text: 'Describe how you would shard\nthe telemetry store by tenant.', turnId: 1, seq: 1 }] } },
    // parent-in-pinned compares lowercased, whitespace-collapsed text, and only for a parent of 3+ chars (review finding 3).
    { row: 'parent contained in the pinned line in other CASE only -> parent-in-pinned', input: { question: 'DESCRIBE how you would shard the telemetry store by tenant. Then how would your design change if a tenant doubled in size?', turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' } },
    { row: 'parent contained in the pinned line with other WHITESPACE only (line break, runs of spaces) -> parent-in-pinned', input: { question: 'Describe how you would shard\n  the telemetry   store by tenant. Then how would your design change if a tenant doubled in size?', turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' } },
    { row: 'parent contained in the pinned line in other case AND whitespace -> parent-in-pinned', input: { question: 'describe how you would SHARD\nthe telemetry store by tenant. Then how would your design change if a tenant doubled in size?', turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' } },
    { row: 'a 3-char parent contained in the question counts (the boundary: np.length >= 3)', input: { question: 'Why would your design change if a tenant doubled in size?', turnId: 2, ledger: L('Why'), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' } },
    { row: 'a 2-char parent contained in the question does NOT count: the block is built', input: { question: 'Is it ok to do that, and how would your design change if a tenant doubled in size?', turnId: 2, ledger: L('Ok'), promptLines: [] }, expect: { block: block('Ok'), why: '', cue: 'reference' } },
];

describe('buildEarlierQuestion — spec §3.6 rows', () => {
    for (const c of CASES) {
        it(c.row, () => {
            const r = buildEarlierQuestion(c.input);
            expect(r.block).toBe(c.expect.block);
            if (c.expect.why !== undefined) expect(r.why).toBe(c.expect.why);
            if (c.expect.cue !== undefined) expect(r.cue).toBe(c.expect.cue);
            if (c.mustHaveCue) expect(r.cue).not.toBe('none');
            if (c.wrongReferent) { expect(r.block).toContain(c.wrongReferent.shown); expect(r.block).not.toContain(c.wrongReferent.truth); }
            if (c.expect.block) {
                expect(r.block.split('\n')).toHaveLength(2);
                expect(r.cue).toBe(gate(c.input.question).cue);
                expect(r.cue).not.toBe('none');
                expect(r.parent).toBe(c.input.ledger![c.input.ledger!.length - 1].text);
            }
            if (c.ledgerWrite) {
                const w = c.ledgerWrite;
                expect(recordAsked(w.before, { text: w.text, turnId: w.turnId, seq: w.seq })).toEqual(w.after);
            }
        });
    }
});

describe('recordAsked — spec §3.1 ledger table', () => {
    it('a settled call whose turnId the ledger does not hold pushes', () => expect(recordAsked(L(P_QUEUE), { text: P_SHARD, turnId: 9, seq: 9 })).toEqual([...L(P_QUEUE), { text: P_SHARD, turnId: 9, seq: 9 }]));
    it('the 8 s supersede (turnId held) removes the head and pushes the merged text newest (remove-and-push, not replace in place)', () => {
        const before: AskedQuestion[] = [{ text: 'old', turnId: 1, seq: 1 }, { text: 'head', turnId: 2, seq: 2 }, { text: 'other', turnId: 3, seq: 3 }];
        expect(recordAsked(before, { text: 'head tail', turnId: 2, seq: 4 })).toEqual([{ text: 'old', turnId: 1, seq: 1 }, { text: 'other', turnId: 3, seq: 3 }, { text: 'head tail', turnId: 2, seq: 4 }]);
    });
    it('turnId null never removes (two null entries coexist)', () => expect(recordAsked([{ text: 'a', turnId: null, seq: 1 }], { text: 'a', turnId: null, seq: 2 })).toEqual([{ text: 'a', turnId: null, seq: 1 }, { text: 'a', turnId: null, seq: 2 }]));
    it('no text dedup: a follow-up sharing a frame word does not replace its parent (review C1), and the next question gets the follow-up', () => {
        const after = recordAsked(L(P_CACHE), { text: F_WHY, turnId: 2, seq: 2 });
        expect(after.map((e) => e.text)).toEqual([P_CACHE, F_WHY]);
        expect(buildEarlierQuestion({ question: 'What about the writes then, how do they reach it?', turnId: 3, ledger: after, promptLines: [] }).block).toBe(block(F_WHY));
    });
    it('an aborted or stalled parent is recorded (the write happens at dispatch, before any answer exists), so its follow-up gets it', () => {
        const afterDispatch = recordAsked([], { text: P_SHARD, turnId: 1, seq: 1 });
        expect(afterDispatch.map((e) => e.text)).toEqual([P_SHARD]);
        expect(buildEarlierQuestion({ question: F_THOSE, turnId: 2, ledger: afterDispatch, promptLines: [] }).block).toBe(block(P_SHARD));
    });
    it('depth is 3, oldest dropped', () => {
        let l: readonly AskedQuestion[] = [];
        for (let i = 1; i <= 5; i++) l = recordAsked(l, { text: `q${i}`, turnId: i, seq: i });
        expect(l.map((e) => e.text)).toEqual(['q3', 'q4', 'q5']);
        expect(LEDGER_DEPTH).toBe(3);
    });
    it('settled null / blank text writes nothing and returns the same array', () => { const l = L(P_QUEUE); expect(recordAsked(l, { text: null, turnId: 2, seq: 2 })).toBe(l); expect(recordAsked(l, { text: '  ', turnId: 2, seq: 2 })).toBe(l); });
    it('flag off writes nothing and returns the same array', () => { const l = L(P_QUEUE); expect(recordAsked(l, { text: P_SHARD, turnId: 2, seq: 2, enabled: false })).toBe(l); });
    it('does not mutate its input', () => { const l = Object.freeze(L(P_QUEUE).map((e) => Object.freeze(e))); recordAsked(l, { text: P_SHARD, turnId: 1, seq: 9 }); recordAsked(l, { text: P_SHARD, turnId: 5, seq: 9 }); expect(l).toEqual(L(P_QUEUE)); });
});

describe('label, clip, formatBlock', () => {
    it('label: 125 chars, says asked earlier / context only / do not answer it again, never "answered"', () => {
        expect(LABEL).toHaveLength(125);
        // The exact string (plan Global Constraints / spec §3.4): every block() expectation above is built from LABEL itself, so only this pins the wording.
        expect(LABEL).toBe('EARLIER QUESTION (asked earlier; context only, do not answer it again; answer only the question under INTERVIEWER JUST SAID):');
        expect(LABEL).toContain('asked earlier'); expect(LABEL).toContain('context only'); expect(LABEL).toContain('do not answer it again');
        expect(/answered/i.test(LABEL)).toBe(false);
    });
    it('clip: exactly 450 stays whole, 451 is cut to head 150 + ellipsis + tail 299 (length 450)', () => {
        const t450 = 'x'.repeat(450), t451 = `${'h'.repeat(150)}${'m'.repeat(152)}${'t'.repeat(149)}`;
        expect(clip(t450)).toBe(t450);
        expect(clip(t451)).toHaveLength(450);
        expect(clip(t451)).toBe(`${'h'.repeat(150)}…${'m'.repeat(150)}${'t'.repeat(149)}`);
        expect([PARENT_MAX_CHARS, CLIP_HEAD, CLIP_TAIL]).toEqual([450, 150, 299]);
    });
    it('clip: the tail keeps the referent of a long parent', () => { expect(clip(P_LONG).endsWith('per-device ordering guarantee.')).toBe(true); expect(clip(P_LONG).startsWith('Design the ingestion path')).toBe(true); });
    it('clip: whitespace is collapsed before measuring', () => expect(clip('  a \n\n b\t c  ')).toBe('a b c'));
    it('formatBlock: label, newline, dash, parent', () => expect(formatBlock('Why X?')).toBe(`${LABEL}\n- Why X?`));
});

describe('interviewerLinesBefore — the [INTERVIEWER] lines of the prepared transcript except the pinned last one (Review Focus 5)', () => {
    it('drops exactly the last interviewer line, strips the prefix, ignores [ME]/[ASSISTANT] and blank lines', () => {
        const t = '[INTERVIEWER]: first question?\n[ASSISTANT]: an answer.\n\n[ME]: a mumble\n[INTERVIEWER]: second question?\n[INTERVIEWER]: the pinned one?';
        expect(interviewerLinesBefore(t)).toEqual(['first question?', 'second question?']);
    });
    it('a transcript holding only the pinned line gives []', () => expect(interviewerLinesBefore('[INTERVIEWER]: the pinned one?')).toEqual([]));
    it('an empty transcript gives []', () => expect(interviewerLinesBefore('')).toEqual([]));
    it('an [INTERVIEWER] line with no text is dropped, as the replay\'s interviewerLines drops it (review I5)', () => {
        expect(interviewerLinesBefore('[INTERVIEWER]: first?\n[INTERVIEWER]:\n[INTERVIEWER]:   \n[INTERVIEWER]: the pinned one?')).toEqual(['first?']);
    });
});

describe('the flag', () => {
    const E = (v?: string, parent?: string) => ({ ...(v === undefined ? {} : { [EARLIER_QUESTION_ENV]: v }), ...(parent === undefined ? {} : { NATIVELY_FOLLOWUP_PARENT: parent }) }) as NodeJS.ProcessEnv;
    it('is off unless the flag is exactly 1', () => {
        expect(earlierQuestionEnabled(E())).toBe(false); expect(earlierQuestionEnabled(E(''))).toBe(false); expect(earlierQuestionEnabled(E('0'))).toBe(false);
        expect(earlierQuestionEnabled(E('1'))).toBe(true);
        expect(() => earlierQuestionEnabled(E('yes'))).toThrow(/NATIVELY_EARLIER_QUESTION/);
    });
    it('describeEarlierQuestionAtStartup names on/off, throws on junk, and refuses both flags on', () => {
        expect(describeEarlierQuestionAtStartup(E())).toBe('earlier question: off');
        expect(describeEarlierQuestionAtStartup(E('0'))).toBe('earlier question: off');
        expect(describeEarlierQuestionAtStartup(E('1'))).toBe('earlier question: on');
        expect(describeEarlierQuestionAtStartup(E('1', '0'))).toBe('earlier question: on');
        expect(() => describeEarlierQuestionAtStartup(E('yes'))).toThrow(/NATIVELY_EARLIER_QUESTION/);
        expect(() => describeEarlierQuestionAtStartup(E('1', '1'))).toThrow(/NATIVELY_FOLLOWUP_PARENT/);
    });
});
