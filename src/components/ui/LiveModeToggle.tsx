import React from 'react';
import { Radio } from 'lucide-react';
import type { OverlayAppearance } from '../../lib/overlayAppearance';
import { useLiveMode } from '../../hooks/useLiveMode';

interface LiveModeToggleProps {
    appearance: OverlayAppearance;
}

/**
 * TopPill chip for the optional Live Mode (Gemini Live listener).
 * One click toggles; the status dot mirrors the router state:
 *   gray  = off / idle / stopped
 *   amber = connecting / reconnecting
 *   green = connected (listening)
 *   red   = FAILED — hard-fail visible (user's choice): the reason goes in the
 *           tooltip and the chip stays red until toggled off/on or fixed.
 */
export const LiveModeToggle: React.FC<LiveModeToggleProps> = ({ appearance }) => {
    const { enabled, status, toggle } = useLiveMode();

    const failed = enabled && status.state === 'failed';
    const connecting = enabled && (status.state === 'connecting' || status.state === 'reconnecting');
    const connected = enabled && status.state === 'connected';

    const dotClass = failed
        ? 'bg-red-400'
        : connected
            ? 'bg-emerald-400'
            : connecting
                ? 'bg-amber-300 animate-pulse'
                : 'bg-white/30';

    const label = !enabled
        ? 'Live: OFF'
        : failed
            ? 'Live: FAILED'
            : connected
                ? 'Live: ON'
                : connecting
                    ? 'Live: …'
                    : 'Live: ON';

    const title = failed
        ? `Live Mode failed: ${status.reason ?? 'unknown error'} — auto-retrying every 15s; answers still work via the standard pipeline.`
        : enabled
            ? 'Live Mode is listening to the interviewer channel and auto-answers detected questions. Click to turn off.'
            : 'Turn on Live Mode: a Gemini Live listener hears the interviewer and auto-answers (Gemma for coding, Flash for verbal).';

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
                ${failed ? 'border-red-400/50' : ''}
            `}
            style={appearance.chipStyle}
        >
            <Radio className="w-3 h-3" />
            <span className="tracking-wide">{label}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        </button>
    );
};
