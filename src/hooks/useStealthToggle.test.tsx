import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStealthToggle } from './useStealthToggle';

type State = { enabled: boolean; faded: boolean };

function setupElectronAPI(initial: State) {
    let listener: ((s: State) => void) | null = null;
    const stealthGetState = vi.fn().mockResolvedValue(initial);
    const stealthSetEnabled = vi.fn().mockResolvedValue({ success: true });
    const onStealthStateChanged = vi.fn((cb: (s: State) => void) => {
        listener = cb;
        return () => { listener = null; };
    });
    (window as any).electronAPI = { stealthGetState, stealthSetEnabled, onStealthStateChanged };
    return {
        stealthGetState,
        stealthSetEnabled,
        emit: (s: State) => listener?.(s),
    };
}

afterEach(() => {
    delete (window as any).electronAPI;
    vi.restoreAllMocks();
});

describe('useStealthToggle', () => {
    it('reads initial state on mount', async () => {
        setupElectronAPI({ enabled: true, faded: false });
        const { result } = renderHook(() => useStealthToggle());
        await waitFor(() => expect(result.current.enabled).toBe(true));
        expect(result.current.faded).toBe(false);
    });

    it('setEnabled(true) calls stealthSetEnabled and updates optimistically', async () => {
        const { stealthSetEnabled } = setupElectronAPI({ enabled: false, faded: false });
        const { result } = renderHook(() => useStealthToggle());
        await waitFor(() => expect(result.current.enabled).toBe(false));

        await act(async () => { await result.current.setEnabled(true); });

        expect(stealthSetEnabled).toHaveBeenCalledWith(true);
        expect(result.current.enabled).toBe(true);
    });

    it('reacts to stealth:state broadcasts', async () => {
        const { emit } = setupElectronAPI({ enabled: true, faded: false });
        const { result } = renderHook(() => useStealthToggle());
        await waitFor(() => expect(result.current.enabled).toBe(true));

        act(() => { emit({ enabled: true, faded: true }); });
        expect(result.current.faded).toBe(true);

        act(() => { emit({ enabled: false, faded: false }); });
        expect(result.current.enabled).toBe(false);
        expect(result.current.faded).toBe(false);
    });

    it('rolls back on setEnabled failure', async () => {
        (window as any).electronAPI = {
            stealthGetState: vi.fn().mockResolvedValue({ enabled: false, faded: false }),
            stealthSetEnabled: vi.fn().mockResolvedValue({ success: false, error: 'nope' }),
            onStealthStateChanged: vi.fn(() => () => {}),
        };
        const { result } = renderHook(() => useStealthToggle());
        await waitFor(() => expect(result.current.enabled).toBe(false));

        await act(async () => { await result.current.setEnabled(true); });
        expect(result.current.enabled).toBe(false);
    });
});
