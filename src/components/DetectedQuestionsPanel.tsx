import React, { useEffect, useRef, useState } from 'react';
import { QuestionChip } from './QuestionChip';
import { useDetectedQuestions } from '../hooks/useDetectedQuestions';

const AUTO_COLLAPSE_MS = 10_000;

interface DetectedQuestionsPanelProps {
    /**
     * Called before the chip-click IPC fires. Use this to kick off stream-metrics
     * tracking in the parent (sm.start + sm.setSource), so the resulting answer
     * gets a TTFT/model attribution in its message bubble — same as the manual
     * "What to answer?" flow.
     */
    onChipClickStart?: (
        intent: 'verbal' | 'coding' | 'behavioral',
        question?: string,
        contextSnapshot?: string,
    ) => void;
}

/**
 * Collapsible panel above chat that shows up to 5 detected interviewer questions.
 * - Hidden entirely when chip queue is empty (zero height).
 * - Auto-collapses 10s after last user interaction (hover/click).
 * - Manual collapse toggle in header.
 */
export const DetectedQuestionsPanel: React.FC<DetectedQuestionsPanelProps> = ({ onChipClickStart }) => {
    const { chips, clickChip } = useDetectedQuestions();
    const [collapsed, setCollapsed] = useState(false);
    const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const armCollapseTimer = () => {
        if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
        interactionTimerRef.current = setTimeout(() => setCollapsed(true), AUTO_COLLAPSE_MS);
    };
    // Expand AND arm — for new chips arriving and for a chip being clicked.
    const resetCollapseTimer = () => {
        setCollapsed(false);
        armCollapseTimer();
    };
    // Hover never expands. It only stops an OPEN panel from auto-collapsing
    // while the mouse is over it; opening is the header click's job. The panel
    // used to drop open whenever the cursor crossed it (reported 2026-09-02).
    const keepOpenWhileHovered = () => {
        if (!collapsed) armCollapseTimer();
    };

    // Restart timer whenever new chips arrive
    useEffect(() => {
        if (chips.length > 0) resetCollapseTimer();
        return () => {
            if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
        };
    }, [chips.length]);

    if (chips.length === 0) return null;

    return (
        <div
            className="
                shrink-0
                mx-3 mb-2 rounded-xl
                bg-white/[0.05] border border-white/10
                backdrop-blur-md
                overflow-hidden
            "
            onMouseEnter={keepOpenWhileHovered}
            onMouseMove={keepOpenWhileHovered}
        >
            <button
                type="button"
                onClick={() => setCollapsed(c => !c)}
                aria-expanded={!collapsed}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] uppercase tracking-wide overlay-text-muted hover:opacity-100 opacity-80 transition-opacity text-left"
            >
                <span>Detected Questions ({chips.length})</span>
                <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
            </button>
            {!collapsed && (
                <div className="flex flex-col gap-1 px-2 pb-2">
                    {chips.map(chip => (
                        <QuestionChip
                            key={chip.id}
                            id={chip.id}
                            question={chip.question}
                            intent={chip.intent}
                            source={chip.source}
                            onClick={(id) => {
                                resetCollapseTimer();
                                onChipClickStart?.(chip.intent, chip.question, chip.contextSnapshot);
                                clickChip(id);
                            }}
                        />
                    ))}
                </div>
            )}
            {collapsed && (
                <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    className="w-full px-3 py-1.5 text-xs overlay-text-muted hover:opacity-100 opacity-80 text-left transition-opacity"
                >
                    {chips.length} {chips.length === 1 ? 'question' : 'questions'} ready ▸
                </button>
            )}
        </div>
    );
};
