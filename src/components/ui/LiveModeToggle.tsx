import React from 'react';
import { Radio } from 'lucide-react';
import type { OverlayAppearance } from '../../lib/overlayAppearance';
import { useLiveMode } from '../../hooks/useLiveMode';

interface LiveModeToggleProps {
    appearance: OverlayAppearance;
}

/**
 * TopPill chip for the optional Live Mode (Gemini Live listener).
 * One click cycles Off → Suggest → Auto → Off.
 *   Off     — grey, router down
 *   Suggest — detected question drops a chip you click (safest for real interviews)
 *   Auto    — detected question answered hands-free
 * The status dot mirrors the router:
 *   grey off/idle · amber connecting/reconnecting · green connected · red FAILED
 * Red is hard-fail VISIBLE (auto-retrying) — reason lives in the tooltip.
 */
export const LiveModeToggle: React.FC<LiveModeToggleProps> = ({ appearance }) => {
    const { mode, status, cycle } = useLiveMode();

    const on = mode !== 'off';
    const failed = on && status.state === 'failed';
    const connecting = on && (status.state === 'connecting' || status.state === 'reconnecting');
    const connected = on && status.state === 'connected';

    const dotClass = !on
        ? 'bg-white/30'
        : failed
            ? 'bg-red-400'
            : connected
                ? 'bg-emerald-400'
                : connecting
                    ? 'bg-amber-300 animate-pulse'
                    : 'bg-white/30';

    const label = mode === 'off' ? 'Live: OFF' : mode === 'suggest' ? 'Live: Suggest' : 'Live: Auto';

    const modeExplain = mode === 'suggest'
        ? 'Suggest: a detected question drops a chip you click to answer.'
        : mode === 'auto'
            ? 'Auto: detected questions are answered hands-free.'
            : 'Off: the Live listener is not running.';
    const title = failed
        ? `Live Mode failed: ${status.reason ?? 'unknown error'} — auto-retrying every 15s; answers still work via the standard pipeline.`
        : `${modeExplain} Click to cycle Off → Suggest → Auto.`;

    return (
        <button
            type="button"
            onClick={() => { void cycle(); }}
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
                ${on ? 'opacity-100' : 'opacity-80'}
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
