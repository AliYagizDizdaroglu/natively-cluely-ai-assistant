import { useCallback, useEffect, useState } from 'react';

/**
 * Renderer-side on/off for the whisper→Groq→chip detection pipeline.
 * Independent of Live Mode, so the user can run: chips-only, Live-only,
 * both, or neither. Default on (matches the detector's default).
 */
export function useDetection() {
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        let mounted = true;
        window.electronAPI.getDetectionEnabled?.()
            .then((r) => { if (mounted && r) setEnabled(r.enabled); })
            .catch(() => { /* main not ready — assume on */ });
        return () => { mounted = false; };
    }, []);

    const toggle = useCallback(async () => {
        const next = !enabled;
        setEnabled(next); // optimistic
        try {
            const r = await window.electronAPI.setDetectionEnabled(next);
            setEnabled(r.enabled);
        } catch {
            setEnabled(!next);
        }
    }, [enabled]);

    return { enabled, toggle };
}
