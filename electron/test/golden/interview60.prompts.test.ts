import { describe, it, expect } from 'vitest';
import { readDispatches, idsForDispatches, findShiftedIds } from './interview60.prompts.mjs';

const T0 = Date.parse('2026-09-14T07:10:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();
const dispatchLine = (at: number, question: string) =>
    `${iso(at)} [LOG] [Main] dispatch: answer source=whisper anchor="${question.slice(0, 40)}" verdict=match question="${question}"`;

describe('readDispatches', () => {
    it('reads the pinned question off each answer dispatch, unescaping it', () => {
        const log = [
            `${iso(T0)} [LOG] [Main] something else entirely`,
            dispatchLine(T0 + 20_000, 'Explain your RAG pipeline: walk through ingestion, then say \\"why\\".'),
            dispatchLine(T0 + 90_000, 'Design a multi-tenant service.'),
        ].join('\n');
        const d = readDispatches(log);
        expect(d).toHaveLength(2);
        expect(d[0].question).toBe('Explain your RAG pipeline: walk through ingestion, then say "why".');
        expect(d[1].at).toBe(iso(T0 + 90_000));
    });

    it('counts a supersede — it regenerates the answer, so it has a prompt behind it and is what the question ended up with', () => {
        // The smoke of 2026-09-13 delivered three of four answers as supersedes. Skipping them
        // leaves those questions uncaptured, and the focused arm then refuses the whole set.
        const log = [
            `${iso(T0 + 3000)} [LOG] [Main] dispatch: supersede source=whisper anchor="a" verdict=match replaces="the first answer" question="the question it settled on"`,
            dispatchLine(T0 + 4000, 'a plain answer'),
        ].join('\n');
        expect(readDispatches(log).map((d) => d.question)).toEqual(['the question it settled on', 'a plain answer']);
    });

    it('ignores mark and extend — a mark has sent nothing yet and extend is a deleted path', () => {
        const log = [
            `${iso(T0 + 1000)} [LOG] [Main] dispatch: mark source=whisper anchor="a" verdict=match question="only marked"`,
            `${iso(T0 + 1500)} [LOG] [Main] dispatch: extend source=live anchor="a" verdict=match question="a longer question"`,
            dispatchLine(T0 + 2000, 'the real one'),
        ].join('\n');
        expect(readDispatches(log).map((d) => d.question)).toEqual(['the real one']);
    });
});

describe('idsForDispatches', () => {
    const timeline = {
        items: [
            { id: 'S1Q01', kind: 'spoken', playedAt: T0 },
            { id: 'S1Q01F', kind: 'spoken', playedAt: T0 + 60_000 },
            { id: 'S1Q02', kind: 'spoken', playedAt: T0 + 120_000 },
        ],
    };

    it('attributes a dispatch to the question whose play window contains it, not to the nearest text match', () => {
        // Attribution is by play window on purpose: the app answers what STT heard, which
        // rarely matches the scripted text ("RAC service" for "RAG service"), so matching on
        // the words would drop exactly the questions worth measuring.
        const d = [
            { at: iso(T0 + 25_000), question: 'heard something quite different' },
            { at: iso(T0 + 95_000), question: 'the follow-up as heard' },
        ];
        expect(idsForDispatches(d, timeline)).toEqual([
            { id: 'S1Q01', dispatchedAt: iso(T0 + 25_000), question: 'heard something quite different' },
            { id: 'S1Q01F', dispatchedAt: iso(T0 + 95_000), question: 'the follow-up as heard' },
        ]);
    });

    it('drops a dispatch from before the first clip — a warm-up belongs to no question', () => {
        expect(idsForDispatches([{ at: iso(T0 - 5_000), question: 'warm-up' }], timeline)).toEqual([]);
    });

    it('keeps the last question open for a while, so its answer is not lost to the end of the timeline', () => {
        expect(idsForDispatches([{ at: iso(T0 + 150_000), question: 'last' }], timeline))
            .toEqual([{ id: 'S1Q02', dispatchedAt: iso(T0 + 150_000), question: 'last' }]);
    });

    it('ignores screenshot cues in the timeline, which are never spoken questions', () => {
        const withCue = { items: [{ id: 'CUE1', kind: 'screenshot', playedAt: T0 }, ...timeline.items] };
        expect(idsForDispatches([{ at: iso(T0 + 25_000), question: 'q' }], withCue)[0].id).toBe('S1Q01');
    });
});

describe('findShiftedIds', () => {
    const p = (q: string) => ({ system: 's', user: `[INTERVIEWER]: older
[INTERVIEWER]: ${q}

YOUR RESPONSE:`, model: 'm', at: iso(T0) });
    const d = (id: string, question: string) => ({ id, dispatchedAt: iso(T0), question });

    it('flags an id that holds the prompt of another id (the r1 shift)', () => {
        const prompts = { A: p('question b'), B: p('question c') };
        const dispatches = [d('A', 'question a'), d('B', 'question b'), d('C', 'question c')];
        expect(findShiftedIds(prompts, dispatches)).toEqual({ shifted: ['A', 'B'], noDispatch: [] });
    });

    it('flags nothing when every id holds its own prompt', () => {
        const prompts = { A: p('question a'), B: p('question b') };
        expect(findShiftedIds(prompts, [d('A', 'question a'), d('B', 'question b')])).toEqual({ shifted: [], noDispatch: [] });
    });

    it('does not flag an id whose prompt equals the supersede question exactly, though not the answer one', () => {
        const prompts = { A: p('how do pods scale under load'), B: p('question b') };
        const dispatches = [d('A', 'how do pods'), d('A', 'how do pods scale under load'), d('B', 'something else'), d('B', 'question b')];
        expect(findShiftedIds(prompts, dispatches)).toEqual({ shifted: [], noDispatch: [] });
    });

    it('flags an id whose prompt is only a word-prefix of its dispatched question', () => {
        expect(findShiftedIds({ A: p('how do pods') }, [d('A', 'how do pods scale under load')])).toEqual({ shifted: ['A'], noDispatch: [] });
    });

    it('reports an id in the prompts with no dispatch at all', () => {
        expect(findShiftedIds({ A: p('question a'), Z: p('zed') }, [d('A', 'question a')])).toEqual({ shifted: [], noDispatch: ['Z'] });
    });
});
