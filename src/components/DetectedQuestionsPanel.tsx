import React, { useEffect, useRef, useState } from 'react';
import { QuestionChip } from './QuestionChip';
import { useDetectedQuestions } from '../hooks/useDetectedQuestions';

const AUTO_COLLAPSE_MS = 10_000;

/**
 * Collapsible panel above chat that shows up to 5 detected interviewer questions.
 * - Hidden entirely when chip queue is empty (zero height).
 * - Auto-collapses 10s after last user interaction (hover/click).
 * - Manual collapse toggle in header.
 */
export const DetectedQuestionsPanel: React.FC = () => {
    const { chips, clickChip } = useDetectedQuestions();
    const [collapsed, setCollapsed] = useState(false);
    const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetCollapseTimer = () => {
        if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
        setCollapsed(false);
        interactionTimerRef.current = setTimeout(() => setCollapsed(true), AUTO_COLLAPSE_MS);
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
                mx-3 mb-2 rounded-lg
                bg-bg-primary/50 border border-border-subtle
                backdrop-blur-sm
                overflow-hidden
            "
            onMouseEnter={resetCollapseTimer}
            onMouseMove={resetCollapseTimer}
        >
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] uppercase tracking-wide text-text-tertiary">
                <span>Detected Questions ({chips.length})</span>
                <button
                    type="button"
                    onClick={() => setCollapsed(c => !c)}
                    className="hover:text-text-secondary transition-colors"
                    aria-label={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed ? '▸' : '▾'}
                </button>
            </div>
            {!collapsed && (
                <div className="flex flex-col gap-1 px-2 pb-2">
                    {chips.map(chip => (
                        <QuestionChip
                            key={chip.id}
                            id={chip.id}
                            question={chip.question}
                            intent={chip.intent}
                            onClick={(id) => {
                                resetCollapseTimer();
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
                    className="w-full px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary text-left"
                >
                    {chips.length} {chips.length === 1 ? 'question' : 'questions'} ready ▸
                </button>
            )}
        </div>
    );
};
