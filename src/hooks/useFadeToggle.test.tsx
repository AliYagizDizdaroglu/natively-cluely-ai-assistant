import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFadeToggle } from './useFadeToggle';

type State = { enabled: boolean; faded: boolean };

function setupElectronAPI(initial: State) {
    let listener: ((s: State) => void) | null = null;
    const fadeGetState = vi.fn().mockResolvedValue(initial);
    const fadeSetEnabled = vi.fn().mockResolvedValue({ success: true });
    const onFadeStateChanged = vi.fn((cb: (s: State) => void) => {
        listener = cb;
        return () => { listener = null; };
    });
    (window as any).electronAPI = { fadeGetState, fadeSetEnabled, onFadeStateChanged };
    return {
        fadeGetState,
        fadeSetEnabled,
        emit: (s: State) => listener?.(s),
    };
}

afterEach(() => {
    delete (window as any).electronAPI;
    vi.restoreAllMocks();
});

describe('useFadeToggle', () => {
    it('reads initial state on mount', async () => {
        setupElectronAPI({ enabled: true, faded: false });
        const { result } = renderHook(() => useFadeToggle());
        await waitFor(() => expect(result.current.enabled).toBe(true));
        expect(result.current.faded).toBe(false);
    });

    it('setEnabled(true) calls fadeSetEnabled and updates optimistically', async () => {
        const { fadeSetEnabled } = setupElectronAPI({ enabled: false, faded: false });
        const { result } = renderHook(() => useFadeToggle());
        await waitFor(() => expect(result.current.enabled).toBe(false));

        await act(async () => { await result.current.setEnabled(true); });

        expect(fadeSetEnabled).toHaveBeenCalledWith(true);
        expect(result.current.enabled).toBe(true);
    });

    it('reacts to fade:state broadcasts', async () => {
        const { emit } = setupElectronAPI({ enabled: true, faded: false });
        const { result } = renderHook(() => useFadeToggle());
        await waitFor(() => expect(result.current.enabled).toBe(true));

        act(() => { emit({ enabled: true, faded: true }); });
        expect(result.current.faded).toBe(true);

        act(() => { emit({ enabled: false, faded: false }); });
        expect(result.current.enabled).toBe(false);
        expect(result.current.faded).toBe(false);
    });

    it('rolls back on setEnabled failure', async () => {
        (window as any).electronAPI = {
            fadeGetState: vi.fn().mockResolvedValue({ enabled: false, faded: false }),
            fadeSetEnabled: vi.fn().mockResolvedValue({ success: false, error: 'nope' }),
            onFadeStateChanged: vi.fn(() => () => {}),
        };
        const { result } = renderHook(() => useFadeToggle());
        await waitFor(() => expect(result.current.enabled).toBe(false));

        await act(async () => { await result.current.setEnabled(true); });
        expect(result.current.enabled).toBe(false);
    });
});
