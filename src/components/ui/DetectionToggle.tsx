import React from 'react';
import { Ear } from 'lucide-react';
import type { OverlayAppearance } from '../../lib/overlayAppearance';
import { useDetection } from '../../hooks/useDetection';

interface DetectionToggleProps {
    appearance: OverlayAppearance;
}

/**
 * TopPill chip for the whisper→Groq→chip question-detection pipeline.
 * Independent of Live Mode, so the user can pick any combination:
 * chips-only, Live-only, both, or neither. Default on.
 */
export const DetectionToggle: React.FC<DetectionToggleProps> = ({ appearance }) => {
    const { enabled, toggle } = useDetection();

    const title = enabled
        ? 'Question detection (whisper → chips) is ON. Click to turn off.'
        : 'Question detection (whisper → chips) is OFF. Click to turn on.';

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
            <Ear className="w-3 h-3" />
            <span className="tracking-wide">{enabled ? 'Detect: ON' : 'Detect: OFF'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-white/30'}`} />
        </button>
    );
};
