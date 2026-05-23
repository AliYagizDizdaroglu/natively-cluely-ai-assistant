import React from 'react';
import { Sparkles } from 'lucide-react';
import type { OverlayAppearance } from '../../lib/overlayAppearance';
import { useContextToggle } from '../../hooks/useContextToggle';

interface ContextToggleProps {
    appearance: OverlayAppearance;
}

export const ContextToggle: React.FC<ContextToggleProps> = ({ appearance }) => {
    const { enabled, available, toggle, openSettings } = useContextToggle();

    const label = !available ? 'Context: —' : enabled ? 'Context: ON' : 'Context: OFF';
    const ariaLabel = !available
        ? 'Profile context unavailable — open settings to upload resume or job description'
        : enabled
            ? 'Profile context is ON. Click to turn off for faster, less personalized answers.'
            : 'Profile context is OFF. Click to turn on for resume- and JD-grounded answers.';

    const handleClick = () => {
        if (!available) {
            void openSettings();
        } else {
            void toggle();
        }
    };

    const stateClasses = !available
        ? 'opacity-40'
        : enabled
            ? 'opacity-100'
            : 'opacity-70';

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={ariaLabel}
            aria-pressed={available ? enabled : undefined}
            disabled={false}
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
                ${stateClasses}
            `}
            style={appearance.chipStyle}
        >
            <Sparkles className="w-3 h-3" />
            <span className="tracking-wide">{label}</span>
        </button>
    );
};

export default ContextToggle;
