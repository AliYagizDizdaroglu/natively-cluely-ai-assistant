import React from 'react';
import { Captions } from 'lucide-react';
import type { OverlayAppearance } from '../../lib/overlayAppearance';
import { useStt } from '../../hooks/useStt';

interface SttToggleProps {
    appearance: OverlayAppearance;
}

/**
 * TopPill chip for the INTERVIEWER speech-to-text channel.
 *
 * Distinct from the Detect chip: that one stops chips being made from the
 * transcript, this one stops the transcript being made. With Live Mode on,
 * transcribing the interviewer is largely redundant — but it is what feeds
 * conversation context and meeting summaries, so the tooltip says so rather
 * than letting the user discover it mid-interview.
 */
export const SttToggle: React.FC<SttToggleProps> = ({ appearance }) => {
    const { enabled, toggle } = useStt();

    const title = enabled
        ? 'Interviewer transcription is ON. Click to turn off (saves STT cost; interviewer speech stops feeding context and summaries).'
        : 'Interviewer transcription is OFF — context and summaries will not include their speech. Click to turn on.';

    return (
        <button
            type="button"
            onClick={() => { void toggle(); }}
            aria-label={title}
            title={title}
            className={`
                flex items-center gap-1.5
                px-3 py-1.5
                rounded-full
                backdrop-blur-md
                overlay-chip-surface
                overlay-text-interactive
                text-[11px]
                font-medium
                border
                interaction-base interaction-hover interaction-press
                ${enabled ? 'opacity-100' : 'opacity-80'}
            `}
            style={appearance.chipStyle}
        >
            <Captions className="w-3 h-3" />
            <span className="tracking-wide">{enabled ? 'STT: ON' : 'STT: OFF'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-white/30'}`} />
        </button>
    );
};
