// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
const state = vi.hoisted(() => ({ windows: [] as any[], app: undefined as any }));
vi.mock('electron', async () => {
    const { EventEmitter } = await import('node:events');
    state.app = new EventEmitter();
    return { app: state.app, BrowserWindow: { getAllWindows: () => state.windows } };
});
import { BackgroundVisibility } from './BackgroundVisibility';
function window() {
    return Object.assign(new EventEmitter(), {
        hide: vi.fn(), show: vi.fn(), setSkipTaskbar: vi.fn(), isDestroyed: () => false,
    });
}
describe('Windows shell icons without changing UI visibility', () => {
    beforeEach(() => { state.windows = [window(), window()]; state.app.removeAllListeners(); });
    it('defaults to taskbar icons hidden and leaves windows alone', () => {
        const mode = new BackgroundVisibility(vi.fn(), vi.fn());
        expect(mode.active).toBe(true);
        for (const win of state.windows) {
            expect(win.setSkipTaskbar).toHaveBeenLastCalledWith(true);
            expect(win.hide).not.toHaveBeenCalled();
            expect(win.show).not.toHaveBeenCalled();
        }
    });
    it('toggles tray/taskbar icons and emits actual status without hiding the UI', () => {
        const hideTray = vi.fn(), showTray = vi.fn(), onChange = vi.fn();
        const mode = new BackgroundVisibility(hideTray, showTray, onChange);
        mode.show();
        expect(mode.active).toBe(false);
        expect(showTray).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenLastCalledWith(false);
        state.windows.forEach(win => expect(win.setSkipTaskbar).toHaveBeenLastCalledWith(false));
        mode.hide();
        expect(hideTray).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenLastCalledWith(true);
        for (const win of state.windows) {
            expect(win.setSkipTaskbar).toHaveBeenLastCalledWith(true);
            expect(win.hide).not.toHaveBeenCalled();
            expect(win.show).not.toHaveBeenCalled();
        }
    });
    it('applies current icon state to future windows and re-shown windows', () => {
        const mode = new BackgroundVisibility(vi.fn(), vi.fn());
        const added = window();
        state.app.emit('browser-window-created', {}, added);
        expect(added.setSkipTaskbar).toHaveBeenLastCalledWith(true);
        mode.show(); added.emit('show');
        expect(added.setSkipTaskbar).toHaveBeenLastCalledWith(false);
        expect(added.hide).not.toHaveBeenCalled();
    });
});
