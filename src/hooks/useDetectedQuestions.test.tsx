import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetectedQuestions } from './useDetectedQuestions';

interface MockChip {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
}

let detectedCb: ((chip: MockChip) => void) | null = null;
let updateCb: ((chip: MockChip) => void) | null = null;
const answerDetectedQuestionMock = vi.fn();

beforeEach(() => {
    detectedCb = null;
    updateCb = null;
    answerDetectedQuestionMock.mockReset();
    // @ts-ignore — install window.electronAPI mock
    globalThis.window = globalThis.window || {};
    (globalThis.window as any).electronAPI = {
        onDetectedQuestion: (cb: (c: MockChip) => void) => {
            detectedCb = cb;
            return () => { detectedCb = null; };
        },
        onDetectedQuestionUpdate: (cb: (c: MockChip) => void) => {
            updateCb = cb;
            return () => { updateCb = null; };
        },
        answerDetectedQuestion: answerDetectedQuestionMock,
    };
});

const makeChip = (id: string, q: string): MockChip => ({
    id,
    question: q,
    intent: 'verbal',
    confidence: 0.9,
    contextSnapshot: 'ctx',
    detectedAt: Date.now(),
});

describe('useDetectedQuestions', () => {
    it('starts with empty chip queue', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        expect(result.current.chips).toEqual([]);
    });

    it('appends new chips at the top', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(makeChip('a', 'question A')));
        act(() => detectedCb?.(makeChip('b', 'question B')));
        expect(result.current.chips).toHaveLength(2);
        expect(result.current.chips[0].id).toBe('b');
        expect(result.current.chips[1].id).toBe('a');
    });

    it('FIFO evicts oldest when 6th chip arrives (max 5)', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        for (let i = 0; i < 6; i++) {
            act(() => detectedCb?.(makeChip(`id${i}`, `q${i}`)));
        }
        expect(result.current.chips).toHaveLength(5);
        // Oldest (id0) should be gone, newest (id5) at top
        expect(result.current.chips[0].id).toBe('id5');
        expect(result.current.chips.find(c => c.id === 'id0')).toBeUndefined();
    });

    it('dedup-update preserves position', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(makeChip('a', 'old text')));
        act(() => detectedCb?.(makeChip('b', 'middle')));
        // update chip a — position preserved (still at index 1 since b is on top)
        act(() => updateCb?.(makeChip('a', 'new text')));
        expect(result.current.chips).toHaveLength(2);
        expect(result.current.chips[1].id).toBe('a');
        expect(result.current.chips[1].question).toBe('new text');
    });

    it('clickChip removes the chip and calls IPC with payload', () => {
        answerDetectedQuestionMock.mockResolvedValue({ ok: true });
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(makeChip('a', 'question A')));
        act(() => { result.current.clickChip('a'); });
        expect(result.current.chips).toHaveLength(0);
        expect(answerDetectedQuestionMock).toHaveBeenCalledWith({
            question: 'question A',
            intent: 'verbal',
            contextSnapshot: 'ctx',
        });
    });

    it('dismissChip removes the chip without calling IPC', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(makeChip('a', 'q')));
        act(() => { result.current.dismissChip('a'); });
        expect(result.current.chips).toHaveLength(0);
        expect(answerDetectedQuestionMock).not.toHaveBeenCalled();
    });
});

describe('useDetectedQuestions — Live supersede', () => {
    const liveChip = (id: string, q: string, at: number): MockChip & { source: 'live' } => ({
        ...makeChip(id, q), detectedAt: at, source: 'live',
    });
    const whisperChip = (id: string, q: string, at: number): MockChip & { source: 'whisper' } => ({
        ...makeChip(id, q), detectedAt: at, source: 'whisper',
    });

    it('replaces an unclicked Live chip when the real question follows', () => {
        // Measured 2026-07-29: a contentful lead-in plus a 2.5-3s pause makes the
        // listener guess ("Okay, a tree question for you." → "What kind of data
        // do you want to store in the tree?"), and the real question lands
        // 7.4-11.6s later. The guess must not linger next to it.
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(liveChip('a', 'What kind of data goes in the tree?', 1000)));
        act(() => detectedCb?.(liveChip('b', 'Check whether a binary tree is height-balanced.', 9000)));
        expect(result.current.chips).toHaveLength(1);
        expect(result.current.chips[0].id).toBe('b');
    });

    it('keeps both when the next Live question arrives after the window', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(liveChip('a', 'first', 1000)));
        act(() => detectedCb?.(liveChip('b', 'second', 20000)));
        expect(result.current.chips.map(c => c.id)).toEqual(['b', 'a']);
    });

    it('never supersedes a chip the user already clicked', () => {
        answerDetectedQuestionMock.mockResolvedValue({ ok: true });
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(liveChip('a', 'first', 1000)));
        act(() => { result.current.clickChip('a'); });
        act(() => detectedCb?.(liveChip('b', 'second', 3000)));
        expect(result.current.chips.map(c => c.id)).toEqual(['b']);
        expect(answerDetectedQuestionMock).toHaveBeenCalledTimes(1);
    });

    it('leaves whisper chips alone — only Live guesses mid-pause', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(whisperChip('a', 'first', 1000)));
        act(() => detectedCb?.(whisperChip('b', 'second', 3000)));
        expect(result.current.chips.map(c => c.id)).toEqual(['b', 'a']);
    });

    it('a Live chip does not displace a whisper chip', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(whisperChip('w', 'from whisper', 1000)));
        act(() => detectedCb?.(liveChip('l', 'from live', 3000)));
        expect(result.current.chips.map(c => c.id)).toEqual(['l', 'w']);
    });
});
