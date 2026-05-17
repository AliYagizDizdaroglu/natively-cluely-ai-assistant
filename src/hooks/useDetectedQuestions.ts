import { useCallback, useEffect, useState } from 'react';

export interface DetectedQuestionChip {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
}

const MAX_CHIPS = 5;

/**
 * Renderer-side chip queue for passive question detector.
 * - Subscribes to detected-question + detected-question-update IPC events
 * - Maintains a FIFO queue capped at 5
 * - Update events preserve chip position; new events push to top
 */
export function useDetectedQuestions() {
    const [chips, setChips] = useState<DetectedQuestionChip[]>([]);

    useEffect(() => {
        const cleanups: (() => void)[] = [];

        cleanups.push(
            window.electronAPI.onDetectedQuestion((chip) => {
                setChips(prev => {
                    const next = [chip, ...prev];
                    if (next.length > MAX_CHIPS) next.length = MAX_CHIPS;
                    return next;
                });
            })
        );

        cleanups.push(
            window.electronAPI.onDetectedQuestionUpdate((chip) => {
                setChips(prev => {
                    const idx = prev.findIndex(c => c.id === chip.id);
                    if (idx === -1) {
                        // Treat as new if we never had it
                        const next = [chip, ...prev];
                        if (next.length > MAX_CHIPS) next.length = MAX_CHIPS;
                        return next;
                    }
                    const next = [...prev];
                    next[idx] = chip;
                    return next;
                });
            })
        );

        return () => { cleanups.forEach(fn => fn()); };
    }, []);

    const dismissChip = useCallback((id: string) => {
        setChips(prev => prev.filter(c => c.id !== id));
    }, []);

    const clickChip = useCallback((id: string) => {
        setChips(prev => {
            const chip = prev.find(c => c.id === id);
            if (chip) {
                window.electronAPI.answerDetectedQuestion({
                    question: chip.question,
                    intent: chip.intent,
                    contextSnapshot: chip.contextSnapshot,
                }).catch((e: any) => {
                    console.error('[useDetectedQuestions] answerDetectedQuestion failed:', e);
                });
            }
            return prev.filter(c => c.id !== id);
        });
    }, []);

    return { chips, dismissChip, clickChip };
}
