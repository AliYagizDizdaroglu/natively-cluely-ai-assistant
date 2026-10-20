import { useEffect, useState } from 'react';
import { useShortcuts } from '../hooks/useShortcuts';
import { isWindows } from '../utils/platformUtils';

export function BackgroundModeNotice() {
    const { shortcuts } = useShortcuts();
    const [active, setActive] = useState<boolean | null>(null);

    useEffect(() => {
        if (!isWindows) return;
        let disposed = false;
        let receivedEvent = false;
        const unsubscribe = window.electronAPI.onBackgroundModeChanged(state => {
            receivedEvent = true;
            if (!disposed) setActive(state);
        });
        window.electronAPI.getBackgroundMode().then(state => {
            if (!disposed && !receivedEvent) setActive(state);
        }).catch(() => { /* Keep status unknown if the main process is unavailable. */ });
        return () => { disposed = true; unsubscribe(); };
    }, []);

    if (!isWindows) return null;
    const shortcut = shortcuts.toggleBackground.join('+') || 'Shortcut not set';
    return (
        <div role="status" aria-live="polite"
            className="no-drag rounded-lg border border-current/15 px-2.5 py-1.5 text-[11px] leading-snug text-text-secondary"
            title="Toggles the app’s tray and taskbar icons. Your application windows stay visible.">
            <kbd className="font-semibold">{shortcut}</kbd>
            <span> · Icons hidden: {active === null ? 'Status unavailable' : active ? 'On' : 'Off'}</span>
            <span className="block opacity-75">Toggle tray/taskbar icons. UI stays visible.</span>
        </div>
    );
}
