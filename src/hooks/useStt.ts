import { useCallback, useEffect, useState } from 'react';

/**
 * Renderer-side on/off for the INTERVIEWER speech-to-text channel.
 *
 * Separate from the detection toggle: that one stops chips being produced from
 * the transcript, this one stops the transcript being produced at all. With
 * Live Mode running, transcribing the interviewer is largely redundant —
 * measured 2026-07-28, Live detects every question ~2.5s sooner and finds
 * nothing the whisper path finds.
 *
 * Turning it off does cost something: the interviewer's words stop reaching
 * conversation context and meeting summaries. The user's own mic channel is
 * unaffected. Default on.
 */
export function useStt() {
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        let mounted = true;
        window.electronAPI.getSttEnabled?.()
            .then((r) => { if (mounted && r) setEnabled(r.enabled); })
            .catch(() => { /* main not ready — assume on */ });
        return () => { mounted = false; };
    }, []);

    const toggle = useCallback(async () => {
        const next = !enabled;
        setEnabled(next); // optimistic
        try {
            const r = await window.electronAPI.setSttEnabled(next);
            setEnabled(r.enabled);
        } catch {
            setEnabled(!next);
        }
    }, [enabled]);

    return { enabled, toggle };
}
