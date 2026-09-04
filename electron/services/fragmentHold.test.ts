import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChipDeduper } from './ChipDeduper';
import { decideDispatch } from './detectionDispatch';
import { createLiveHold } from './liveHold';
import { isFragment, looksFragmentary } from './questionShape';

/**
 * Mirrors electron/main.ts dispatchDetection() in its committed order —
 * Live fragment drop, (unverifiable hold: omitted, every detection here has
 * an anchor), FRAGMENT HOLD, deduper, decideDispatch — with the real
 * primitives. main.ts is the Electron entry point and has no test harness;
 * the wiring itself is proven by the flight hour (spec 2026-09-04 §6.2).
 */
type Mode = 'off' | 'suggest' | 'auto';
interface D { question: string; source: 'live' | 'whisper'; anchor?: string; verdict: string; chip?: { id: string }; resolving?: boolean }

function makeDispatcher(mode: Mode) {
    const log: string[] = [];
    const deduper = new ChipDeduper();
    const hold = createLiveHold<D>({ holdMs: 2500, onResolve: (held) => dispatch({ ...held, resolving: true }) });
    function dispatch(d: D): void {
        if (d.source === 'live' && isFragment(d.question)) { log.push(`drop:fragment:${d.question}`); return; }
        if (mode !== 'off' && !d.resolving && looksFragmentary(d.question)) { hold.offer(d); log.push(`hold:${d.source}:${d.question}`); return; }
        const verdict = deduper.admit({ question: d.question, source: d.source, anchor: d.anchor });
        const action = mode === 'off' && d.source === 'whisper' ? (verdict.admitted ? 'chip' : 'drop') : decideDispatch(mode, verdict);
        if (action === 'answer') deduper.markAnswered(verdict.id);
        log.push(`${action}:${d.source}:${d.question}`);
    }
    // the question-detected-update hook (main.ts): a held chip that grew is re-dispatched with the new text
    function chipUpdate(id: string, question: string): void {
        const held = hold.peek();
        if (held?.chip?.id === id) { hold.cancel(); dispatch({ ...held, question, anchor: question, chip: { id } }); }
    }
    return { dispatch, chipUpdate, log };
}

const TAIL = 'And when would you not?';
const WHOLE = 'When would you reach for a service mesh in an ML serving stack, and when would you not?';
const whisperTail = (): D => ({ question: TAIL, source: 'whisper', anchor: TAIL, verdict: 'match', chip: { id: 'c1' } });
// reconcile's paraphrase verdict against the only STT speech, the tail itself
const liveWhole = (): D => ({ question: WHOLE, source: 'live', anchor: TAIL, verdict: 'paraphrase' });

afterEach(() => vi.useRealTimers());

describe('fragment hold (spec 2026-09-04 §3)', () => {
    it('M27 in Auto: the tail is held, Live’s whole sentence is answered on arrival, the tail resolves as a duplicate', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('auto');
        dispatch(whisperTail());
        expect(log).toEqual([`hold:whisper:${TAIL}`]);
        vi.advanceTimersByTime(1300);
        dispatch(liveWhole());
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:live:${WHOLE}`]);
        vi.advanceTimersByTime(1200);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:live:${WHOLE}`, `drop:whisper:${TAIL}`]);
        expect(log.filter((l) => l.startsWith('answer:'))).toHaveLength(1);
    });
    it('expiry with nothing better answers the fragment — hold briefly, then answer', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('auto');
        dispatch(whisperTail());
        vi.advanceTimersByTime(2499);
        expect(log).toEqual([`hold:whisper:${TAIL}`]);
        vi.advanceTimersByTime(1);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:whisper:${TAIL}`]);
    });
    it('a whole text is never held', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('auto');
        dispatch({ question: 'How do you keep base images patched across many model services?', source: 'live', anchor: 'Cross many model services.', verdict: 'paraphrase' });
        expect(log).toEqual(['answer:live:How do you keep base images patched across many model services?']);
    });
    it('Suggest: one chip, the whole one', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('suggest');
        dispatch(whisperTail());
        vi.advanceTimersByTime(1300);
        dispatch(liveWhole());
        vi.advanceTimersByTime(1200);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `chip:live:${WHOLE}`, `drop:whisper:${TAIL}`]);
    });
    it('Live off: no other ear, no hold', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('off');
        dispatch(whisperTail());
        expect(log).toEqual([`chip:whisper:${TAIL}`]);
    });
    it('resolving bypasses the hold — a resolution is never re-held', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('auto');
        dispatch({ ...whisperTail(), resolving: true });
        expect(log).toEqual([`answer:whisper:${TAIL}`]);
        vi.advanceTimersByTime(10_000);
        expect(log).toHaveLength(1);
    });
    it('a chip update that completes the held text is answered at once; the old timer never fires', () => {
        vi.useFakeTimers();
        const { dispatch, chipUpdate, log } = makeDispatcher('auto');
        dispatch(whisperTail());
        vi.advanceTimersByTime(800);
        chipUpdate('c1', WHOLE);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:whisper:${WHOLE}`]);
        vi.advanceTimersByTime(5000);
        expect(log).toHaveLength(2);
    });
    it('a chip update for a different chip leaves the hold alone', () => {
        vi.useFakeTimers();
        const { dispatch, chipUpdate, log } = makeDispatcher('auto');
        dispatch(whisperTail());
        chipUpdate('other', WHOLE);
        expect(log).toEqual([`hold:whisper:${TAIL}`]);
        vi.advanceTimersByTime(2500);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:whisper:${TAIL}`]);
    });
});
