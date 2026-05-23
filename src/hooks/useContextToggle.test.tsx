import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContextToggle } from './useContextToggle';

type Status = {
    hasProfile: boolean;
    hasJobDescription: boolean;
    profileMode: boolean;
};

const setupElectronAPI = (status: Status) => {
    const profileGetStatus = vi.fn().mockResolvedValue(status);
    const profileSetMode = vi.fn().mockResolvedValue({ success: true });
    const openSettingsTab = vi.fn().mockResolvedValue(undefined);
    (window as any).electronAPI = {
        profileGetStatus,
        profileSetMode,
        openSettingsTab,
    };
    return { profileGetStatus, profileSetMode, openSettingsTab };
};

afterEach(() => {
    delete (window as any).electronAPI;
    vi.restoreAllMocks();
});

describe('useContextToggle', () => {
    it('reads initial status and computes available + enabled', async () => {
        setupElectronAPI({ hasProfile: true, hasJobDescription: false, profileMode: true });
        const { result } = renderHook(() => useContextToggle());

        await waitFor(() => expect(result.current.available).toBe(true));
        expect(result.current.enabled).toBe(true);
    });

    it('marks unavailable when neither profile nor JD is loaded', async () => {
        setupElectronAPI({ hasProfile: false, hasJobDescription: false, profileMode: false });
        const { result } = renderHook(() => useContextToggle());

        await waitFor(() => expect(result.current.available).toBe(false));
        expect(result.current.enabled).toBe(false);
    });

    it('toggle() flips enabled and calls profileSetMode with the negation', async () => {
        const { profileSetMode } = setupElectronAPI({
            hasProfile: true,
            hasJobDescription: true,
            profileMode: true,
        });
        const { result } = renderHook(() => useContextToggle());

        await waitFor(() => expect(result.current.available).toBe(true));

        await act(async () => {
            await result.current.toggle();
        });

        expect(profileSetMode).toHaveBeenCalledWith(false);
        expect(result.current.enabled).toBe(false);
    });

    it('toggle() is a no-op when unavailable', async () => {
        const { profileSetMode } = setupElectronAPI({
            hasProfile: false,
            hasJobDescription: false,
            profileMode: false,
        });
        const { result } = renderHook(() => useContextToggle());

        await waitFor(() => expect(result.current.available).toBe(false));

        await act(async () => {
            await result.current.toggle();
        });

        expect(profileSetMode).not.toHaveBeenCalled();
    });

    it('openSettings() calls openSettingsTab with the profile tab', async () => {
        const { openSettingsTab } = setupElectronAPI({
            hasProfile: false,
            hasJobDescription: false,
            profileMode: false,
        });
        const { result } = renderHook(() => useContextToggle());

        await waitFor(() => expect(result.current.available).toBe(false));

        await act(async () => {
            await result.current.openSettings();
        });

        expect(openSettingsTab).toHaveBeenCalledWith('profile');
    });
});
