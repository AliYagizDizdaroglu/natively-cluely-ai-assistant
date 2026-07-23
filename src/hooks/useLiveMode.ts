import { useCallback, useEffect, useState } from 'react';

export interface LiveModeStatus {
    state: string; // idle | connecting | connected | reconnecting | failed | stopped
    reason?: string;
}

/**
 * Renderer-side state for the optional Live Mode (Gemini Live listener).
 * - Loads the current enabled flag + router state from main on mount
 * - Subscribes to live-mode-status broadcasts (hard-fail states included —
 *   'failed' carries a reason and must stay VISIBLE, never silently cleared)
 * - toggle() flips the mode in main; main starts/stops the router as needed
 */
export function useLiveMode() {
    const [enabled, setEnabled] = useState(false);
    const [status, setStatus] = useState<LiveModeStatus>({ state: 'idle' });

    useEffect(() => {
        let mounted = true;
        window.electronAPI.getLiveMode?.()
            .then((r) => {
                if (mounted && r) {
                    setEnabled(r.enabled);
                    setStatus({ state: r.state });
                }
            })
            .catch(() => { /* main not ready — stay idle */ });

        const cleanup = window.electronAPI.onLiveModeStatus?.((s) => {
            setStatus(s);
        });
        return () => {
            mounted = false;
            cleanup?.();
        };
    }, []);

    const toggle = useCallback(async () => {
        const next = !enabled;
        setEnabled(next); // optimistic — main's reply below is authoritative
        try {
            const r = await window.electronAPI.setLiveMode(next);
            setEnabled(r.enabled);
            setStatus({ state: r.state });
        } catch {
            setEnabled(!next);
        }
    }, [enabled]);

    return { enabled, status, toggle };
}
