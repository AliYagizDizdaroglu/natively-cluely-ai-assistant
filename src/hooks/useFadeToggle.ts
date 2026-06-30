import { useCallback, useEffect, useState } from 'react';

export interface UseFadeToggleResult {
    enabled: boolean;
    faded: boolean;
    setEnabled: (enabled: boolean) => Promise<void>;
}

export function useFadeToggle(): UseFadeToggleResult {
    const [enabled, setEnabledState] = useState(false);
    const [faded, setFaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const state = await window.electronAPI?.fadeGetState?.();
                if (cancelled || !state) return;
                setEnabledState(state.enabled);
                setFaded(state.faded);
            } catch (err) {
                console.error('[useFadeToggle] fadeGetState failed:', err);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const unsub = window.electronAPI?.onFadeStateChanged?.((state) => {
            setEnabledState(state.enabled);
            setFaded(state.faded);
        });
        return () => { unsub?.(); };
    }, []);

    const setEnabled = useCallback(async (next: boolean) => {
        const prev = enabled;
        setEnabledState(next); // optimistic
        try {
            const result = await window.electronAPI?.fadeSetEnabled?.(next);
            if (!result?.success) {
                console.warn('[useFadeToggle] fadeSetEnabled failed:', result?.error);
                setEnabledState(prev);
            }
        } catch (err) {
            console.error('[useFadeToggle] fadeSetEnabled threw:', err);
            setEnabledState(prev);
        }
    }, [enabled]);

    return { enabled, faded, setEnabled };
}
