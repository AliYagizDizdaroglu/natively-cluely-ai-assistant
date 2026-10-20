import { app, BrowserWindow } from 'electron';

/** Windows shell icons only. This never hides or shows application windows. */
export class BackgroundVisibility {
    public active = true;

    constructor(
        private readonly hideTray: () => void,
        private readonly showTray: () => void,
        private readonly onChange: (hidden: boolean) => void = () => {},
    ) {
        const watch = (win: BrowserWindow) => {
            if (!win.isDestroyed()) win.setSkipTaskbar(this.active);
            win.on('show', () => {
                if (!win.isDestroyed()) win.setSkipTaskbar(this.active);
            });
        };
        BrowserWindow.getAllWindows().forEach(watch);
        app.on('browser-window-created', (_event, win) => watch(win));
    }

    public hide(): void { this.setHidden(true); }
    public show(): void { this.setHidden(false); }

    private setHidden(hidden: boolean): void {
        this.active = hidden;
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) win.setSkipTaskbar(hidden);
        }
        if (hidden) this.hideTray(); else this.showTray();
        this.onChange(hidden);
    }
}
