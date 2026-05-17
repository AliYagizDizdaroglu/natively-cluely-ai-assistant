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
