import { useCallback, useEffect, useRef, useState } from 'react';

interface UseContextToggleResult {
    /** True when the orchestrator has knowledgeMode active. */
    enabled: boolean;
    /** True when at least one of Resume or JD is loaded. */
    available: boolean;
    /** True if a resume is loaded. */
    hasResume: boolean;
    /** True if a job description is loaded. */
    hasJobDescription: boolean;
    /** Candidate name from resume summary, if any. */
    resumeName?: string;
    /** Candidate role/title from resume summary, if any. */
    resumeRole?: string;
    /** Flip the toggle. No-op when unavailable. */
    toggle: () => Promise<void>;
    /** Open the Settings overlay focused on the Profile tab. */
    openSettings: () => Promise<void>;
}

const TOGGLE_DEBOUNCE_MS = 150;

export function useContextToggle(): UseContextToggleResult {
    const [enabled, setEnabled] = useState(false);
    const [available, setAvailable] = useState(false);
    const [hasResume, setHasResume] = useState(false);
    const [hasJobDescription, setHasJobDescription] = useState(false);
    const [resumeName, setResumeName] = useState<string | undefined>(undefined);
    const [resumeRole, setResumeRole] = useState<string | undefined>(undefined);
    const lastClickRef = useRef(0);

    const refresh = useCallback(async () => {
        try {
            const status = await window.electronAPI?.profileGetStatus?.();
            if (!status) return;
            setAvailable(Boolean(status.hasProfile || status.hasJobDescription));
            setEnabled(Boolean(status.profileMode));
            setHasResume(Boolean(status.hasProfile));
            setHasJobDescription(Boolean(status.hasJobDescription));
            setResumeName(status.name);
            setResumeRole(status.role);
        } catch (err) {
            console.error('[useContextToggle] profileGetStatus failed:', err);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Re-fetch whenever main process changes profile state (upload, delete).
    useEffect(() => {
        const unsub = window.electronAPI?.onProfileStatusChanged?.(() => {
            void refresh();
        });
        return () => { unsub?.(); };
    }, [refresh]);

    const toggle = useCallback(async () => {
        if (!available) return;

        const now = Date.now();
        if (now - lastClickRef.current < TOGGLE_DEBOUNCE_MS) return;
        lastClickRef.current = now;

        const next = !enabled;
        setEnabled(next); // optimistic
        try {
            const result = await window.electronAPI?.profileSetMode?.(next);
            if (!result?.success) {
                console.warn('[useContextToggle] profileSetMode failed:', result?.error);
                setEnabled(!next); // roll back
            }
        } catch (err) {
            console.error('[useContextToggle] profileSetMode threw:', err);
            setEnabled(!next);
        }
    }, [available, enabled]);

    const openSettings = useCallback(async () => {
        try {
            await window.electronAPI?.openSettingsTab?.('profile');
        } catch (err) {
            console.error('[useContextToggle] openSettingsTab failed:', err);
        }
    }, []);

    return {
        enabled,
        available,
        hasResume,
        hasJobDescription,
        resumeName,
        resumeRole,
        toggle,
        openSettings,
    };
}
