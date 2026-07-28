import { useCallback, useEffect, useState } from 'react';

export interface DetectedQuestionChip {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
    /** 'live' = heard by the Gemini Live listener; absent/undefined = whisper→Groq detector. */
    source?: 'live' | 'whisper';
}

const MAX_CHIPS = 5;

/**
 * How long a Live chip stays supersedable by the next Live chip.
 *
 * Measured 2026-07-29: when the interviewer gives a contentful lead-in, pauses
 * 2.5-3s, then asks the real question, the Live listener fires a
 * plausible-but-wrong question during the pause ("Okay, a tree question for
 * you." → "What kind of data do you want to store in the tree?"). The correct
 * question always followed, 7.4-11.6s later in every observed case, so 15s
 * covers the gap.
 *
 * Trade-off, accepted deliberately: two genuinely distinct questions asked
 * within 15s collapse to the later one. Only chips the user has not clicked are
 * affected — clicking removes the chip from this queue, so a chip they acted on
 * is never pulled out from under them.
 */
const LIVE_SUPERSEDE_WINDOW_MS = 15_000;

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
                    let base = prev;
                    if (chip.source === 'live') {
                        // Drop the previous, still-unclicked Live chip if this one
                        // arrived hot on its heels — it is almost certainly the real
                        // question replacing one guessed during a mid-question pause.
                        const stale = prev.findIndex(c =>
                            c.source === 'live' &&
                            chip.detectedAt - c.detectedAt <= LIVE_SUPERSEDE_WINDOW_MS
                        );
                        if (stale !== -1) base = prev.filter((_, i) => i !== stale);
                    }
                    const next = [chip, ...base];
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
        // Side effect MUST live outside the setChips updater. React StrictMode
        // invokes updater functions twice in dev as a sanity check — putting the
        // IPC call inside `setChips(prev => …)` was firing answerDetectedQuestion
        // twice per click in dev, producing two duplicate "SAY THIS" cards.
        const chip = chips.find(c => c.id === id);
        setChips(prev => prev.filter(c => c.id !== id));
        if (chip) {
            window.electronAPI.answerDetectedQuestion({
                question: chip.question,
                intent: chip.intent,
                contextSnapshot: chip.contextSnapshot,
            }).catch((e: any) => {
                console.error('[useDetectedQuestions] answerDetectedQuestion failed:', e);
            });
        }
    }, [chips]);

    return { chips, dismissChip, clickChip };
}
