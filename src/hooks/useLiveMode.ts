import { useCallback, useEffect, useState } from 'react';

export type LiveMode = 'off' | 'suggest' | 'auto';

export interface LiveModeStatus {
    state: string; // idle | connecting | connected | reconnecting | failed | stopped
    reason?: string;
}

// Toggle order when the chip is clicked: Off → Suggest → Auto → Off.
const NEXT: Record<LiveMode, LiveMode> = { off: 'suggest', suggest: 'auto', auto: 'off' };

/**
 * Renderer-side state for the optional Live Mode (Gemini Live listener).
 * Three modes:
 *   off     — router down
 *   suggest — detected question surfaces a chip you click (safest for real interviews)
 *   auto    — detected question is answered hands-free
 * Subscribes to live-mode-status broadcasts; 'failed' stays VISIBLE (hard-fail).
 */
export function useLiveMode() {
    const [mode, setMode] = useState<LiveMode>('off');
    const [status, setStatus] = useState<LiveModeStatus>({ state: 'idle' });

    useEffect(() => {
        let mounted = true;
        window.electronAPI.getLiveMode?.()
            .then((r) => {
                if (mounted && r) {
                    setMode(r.mode);
                    setStatus({ state: r.state });
                }
            })
            .catch(() => { /* main not ready — stay off */ });

        const cleanup = window.electronAPI.onLiveModeStatus?.((s) => setStatus(s));
        return () => {
            mounted = false;
            cleanup?.();
        };
    }, []);

    const setLiveMode = useCallback(async (next: LiveMode) => {
        setMode(next); // optimistic — main's reply is authoritative
        try {
            const r = await window.electronAPI.setLiveMode(next);
            setMode(r.mode);
            setStatus({ state: r.state });
        } catch {
            // revert handled on next getLiveMode; leave optimistic value
        }
    }, []);

    const cycle = useCallback(() => setLiveMode(NEXT[mode]), [mode, setLiveMode]);

    return { mode, status, setLiveMode, cycle };
}
