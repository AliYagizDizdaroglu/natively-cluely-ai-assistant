import React from 'react';

interface Props {
    cues: string[];
    className?: string;
}

/**
 * Cue mode (spec 2026-09-20, layout B): the key phrases above the spoken answer, one per part
 * of the question, larger and bolder than the prose so the eye lands here first and only
 * glances at the text below. The parent passes the theme border; precedent for a small
 * component rendered inside the bubble is MessageMetricsBar.
 */
export const CueBlock: React.FC<Props> = ({ cues, className = '' }) => {
    if (!cues.length) return null;
    return (
        <ol className={`list-none m-0 p-0 pr-7 flex flex-col gap-1 ${className}`} aria-label="Cues">
            {cues.map((cue, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[15px] leading-snug font-medium overlay-text-primary">
                    <span className="w-4 shrink-0 text-[11px] font-semibold overlay-text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <span>{cue}</span>
                </li>
            ))}
        </ol>
    );
};
