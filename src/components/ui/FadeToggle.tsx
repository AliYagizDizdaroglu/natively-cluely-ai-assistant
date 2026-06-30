import React from 'react';
import { EyeOff } from 'lucide-react';
import type { OverlayAppearance } from '../../lib/overlayAppearance';
import { useFadeToggle } from '../../hooks/useFadeToggle';

interface FadeToggleProps {
    appearance: OverlayAppearance;
}

export const FadeToggle: React.FC<FadeToggleProps> = ({ appearance }) => {
    const { enabled, faded, setEnabled } = useFadeToggle();

    const label = enabled ? 'Fade: ON' : 'Fade: OFF';
    const ariaLabel = enabled
        ? 'Privacy fade is ON. Overlay fades while typing outside the app. Click to disable.'
        : 'Privacy fade is OFF. Click to enable typing-aware fade.';

    // Visual states: off | on-idle | on-faded (subtle pulse).
    const stateClasses = !enabled
        ? 'opacity-80'
        : faded
            ? 'opacity-60 animate-pulse'
            : 'opacity-100';

    const dotClass = !enabled
        ? 'bg-white/30'
        : faded
            ? 'bg-amber-400'
            : 'bg-emerald-400';

    const handleClick = async () => {
        await setEnabled(!enabled);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={ariaLabel}
            aria-pressed={enabled}
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
            <EyeOff className="w-3 h-3" />
            <span className="tracking-wide">{label}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        </button>
    );
};

export default FadeToggle;
