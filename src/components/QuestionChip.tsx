import React from 'react';

export interface QuestionChipProps {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    /** 'live' shows a small "· Live" badge so Live-heard chips are distinguishable from whisper ones. */
    source?: 'live' | 'whisper';
    onClick: (id: string) => void;
}

const INTENT_ICON: Record<QuestionChipProps['intent'], string> = {
    verbal: '❓',
    coding: '💻',
    behavioral: '📖',
};

const INTENT_LABEL: Record<QuestionChipProps['intent'], string> = {
    verbal: 'Direct question',
    coding: 'Coding question',
    behavioral: 'Behavioral prompt',
};

/**
 * Single chip row in the detected-questions panel.
 * Icon badge + truncated text; clicking routes to the answer flow.
 *
 * Uses the overlay design-system surface classes (overlay-chip-surface /
 * overlay-text-primary) so the chip is actually visible on the pure-black
 * overlay. The previous generic tokens (bg-bg-secondary / border-border-subtle)
 * resolved to near-black + transparent in the dark theme — an invisible chip.
 */
export const QuestionChip: React.FC<QuestionChipProps> = ({ id, question, intent, source, onClick }) => {
    const isLive = source === 'live';
    return (
        <button
            type="button"
            onClick={() => onClick(id)}
            title={isLive ? `${question}\n\n(heard by Live listener)` : question}
            aria-label={`${INTENT_LABEL[intent]}${isLive ? ' (Live)' : ''}: ${question}`}
            className="
                w-full flex items-center gap-2
                px-3 py-2 rounded-lg
                text-left text-sm
                overlay-chip-surface overlay-text-primary
                border border-white/10
                backdrop-blur-md
                transition-colors duration-150
            "
        >
            <span aria-hidden="true" className="text-base shrink-0 leading-none">{INTENT_ICON[intent]}</span>
            <span className="flex-1 min-w-0 truncate">{question}</span>
            {isLive && (
                <span
                    className="shrink-0 inline-flex items-center gap-1 text-[10px] tracking-wide text-emerald-300/90"
                    title="Heard by the Live listener"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Live
                </span>
            )}
            <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-60">{intent}</span>
        </button>
    );
};
