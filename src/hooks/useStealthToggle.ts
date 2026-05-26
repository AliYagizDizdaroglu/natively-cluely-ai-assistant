import { useCallback, useEffect, useState } from 'react';

export interface UseStealthToggleResult {
    enabled: boolean;
    faded: boolean;
    setEnabled: (enabled: boolean) => Promise<void>;
}

export function useStealthToggle(): UseStealthToggleResult {
    const [enabled, setEnabledState] = useState(false);
    const [faded, setFaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const state = await window.electronAPI?.stealthGetState?.();
                if (cancelled || !state) return;
                setEnabledState(state.enabled);
                setFaded(state.faded);
            } catch (err) {
                console.error('[useStealthToggle] stealthGetState failed:', err);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const unsub = window.electronAPI?.onStealthStateChanged?.((state) => {
            setEnabledState(state.enabled);
            setFaded(state.faded);
        });
        return () => { unsub?.(); };
    }, []);

    const setEnabled = useCallback(async (next: boolean) => {
        const prev = enabled;
        setEnabledState(next); // optimistic
        try {
            const result = await window.electronAPI?.stealthSetEnabled?.(next);
            if (!result?.success) {
                console.warn('[useStealthToggle] stealthSetEnabled failed:', result?.error);
                setEnabledState(prev);
            }
        } catch (err) {
            console.error('[useStealthToggle] stealthSetEnabled threw:', err);
            setEnabledState(prev);
        }
    }, [enabled]);

    return { enabled, faded, setEnabled };
}
