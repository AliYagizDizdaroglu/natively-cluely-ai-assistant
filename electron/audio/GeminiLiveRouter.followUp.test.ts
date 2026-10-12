import { describe, it, expect, vi, afterEach } from 'vitest';
import { GeminiLiveRouter, isFollowUpQuestion, type LiveConnectFn, type LiveSessionLike } from './GeminiLiveRouter';

// F2a (st25-smoke 2026-10-12): the ear reported "Why that one?" 24.1 s after the last answer and
// hasQuestionSubstance dropped it ("ignored fragment (no subject matter)"). A short follow-up is kept
// only shortly after an answered turn; mid-turn junk ("What is?") stays dropped.

function harness() {
    const toolResponses: any[] = [];
    const session: LiveSessionLike = { sendRealtimeInput: () => {}, sendToolResponse: (p) => toolResponses.push(p), close: () => {} };
    let cbs: any = null;
    const connectFn: LiveConnectFn = (async (params: any) => { cbs = params.callbacks; return session; }) as any;
    const router = new GeminiLiveRouter(() => 'test-key', connectFn);
    const questions: any[] = [];
    router.on('question', (q) => questions.push(q));
    const fire = (question: string, id = 'c1') =>
        cbs.onmessage({ toolCall: { functionCalls: [{ id, name: 'handle_question', args: { question, category: 'verbal_technical' } }] } });
    return { router, questions, toolResponses, fire, open: () => cbs.onopen() };
}

async function started() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T06:15:29.000Z'));
    const h = harness();
    await h.router.start();
    h.open();
    return h;
}

afterEach(() => { vi.useRealTimers(); });

describe('short follow-ups after an answered turn', () => {
    it('keeps "Why that one?" 24.1 s after an answer (the observed gap), marked as a follow-up', async () => {
        const h = await started();
        h.router.noteAnswered();
        vi.advanceTimersByTime(24_100);
        h.fire('Why that one?');
        expect(h.questions).toHaveLength(1);
        expect(h.questions[0]).toMatchObject({ question: 'Why that one?', followUp: true });
    });

    it.each(['Why?', 'How so?', 'Which one?', 'And then?', 'What else?', 'And what would you do differently?'])(
        'keeps %s right after an answer', async (q) => {
            const h = await started();
            h.router.noteAnswered();
            vi.advanceTimersByTime(5_000);
            h.fire(q);
            expect(h.questions.map((x) => x.question)).toEqual([q]);
        });

    it('drops the same follow-up when no answer came before it', async () => {
        const h = await started();
        h.fire('Why that one?');
        expect(h.questions).toHaveLength(0);
    });

    it('drops it once the answer is older than the 30 s window', async () => {
        const h = await started();
        h.router.noteAnswered();
        vi.advanceTimersByTime(30_500);
        h.fire('Why that one?');
        expect(h.questions).toHaveLength(0);
    });

    it.each(['Okay.', 'Hmm?', 'Right?', 'What is?', 'So?', 'Um, so what is'])(
        'still drops junk %s right after an answer, and still acks it', async (q) => {
            const h = await started();
            h.router.noteAnswered();
            vi.advanceTimersByTime(2_000);
            h.fire(q);
            expect(h.questions).toHaveLength(0);
            expect(h.toolResponses).toHaveLength(1);
        });

    it('a repeated report inside the duplicate window is still deduped', async () => {
        const h = await started();
        h.router.noteAnswered();
        h.fire('Why?', 'c1');
        h.fire('Why?', 'c2');
        expect(h.questions).toHaveLength(1);
    });
});

describe('isFollowUpQuestion', () => {
    it('accepts only a pinned set of "?"-ended follow-up shapes', () => {
        for (const q of ['Why?', 'Why not?', 'Why that one?', 'How so?', 'How come?', 'Which one?', 'And then?', 'Then what?', 'What else?', 'And why?'])
            expect(isFollowUpQuestion(q), q).toBe(true);
        for (const q of ['Why', 'Right?', 'Hmm?', 'Okay?', 'What is?', 'Really?', 'Why did you', 'Tell me about yourself.'])
            expect(isFollowUpQuestion(q), q).toBe(false);
    });
});
