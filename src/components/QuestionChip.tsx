import React from 'react';

export interface QuestionChipProps {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
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
 */
export const QuestionChip: React.FC<QuestionChipProps> = ({ id, question, intent, onClick }) => {
    return (
        <button
            type="button"
            onClick={() => onClick(id)}
            title={question}
            aria-label={`${INTENT_LABEL[intent]}: ${question}`}
            className="
                w-full flex items-center gap-2
                px-3 py-1.5 rounded-md
                text-left text-sm text-text-secondary
                bg-bg-secondary/40 hover:bg-bg-secondary/70
                border border-border-subtle hover:border-border-muted
                transition-colors duration-150
                truncate
            "
        >
            <span aria-hidden="true" className="text-base shrink-0">{INTENT_ICON[intent]}</span>
            <span className="truncate">{question}</span>
        </button>
    );
};
