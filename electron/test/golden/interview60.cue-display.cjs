/**
 * Show one image on the primary display for a while, then quit — the "problem on
 * screen" behind a spoken screenshot cue in an unattended flight.
 *
 *   npx electron electron/test/golden/interview60.cue-display.cjs <png> <ms>
 *
 * A frameless, always-on-top window the size of the primary work area, plain white
 * behind the image. The app's own capture (desktopCapturer of the primary display)
 * sees exactly this; the app hides its own windows while it captures.
 */
const { app, BrowserWindow, screen } = require('electron');
const path = require('node:path');

const [png, msArg] = process.argv.slice(2);
const ms = Number(msArg ?? 20000);
if (!png) { console.error('usage: cue-display <png> <ms>'); process.exit(2); }

app.whenReady().then(() => {
    const area = screen.getPrimaryDisplay().workArea;
    const win = new BrowserWindow({
        x: area.x, y: area.y, width: area.width, height: area.height,
        frame: false, alwaysOnTop: true, skipTaskbar: true, backgroundColor: '#ffffff',
        webPreferences: { sandbox: true },
    });
    // Highest ordinary z-order. An application running exclusive fullscreen on the
    // primary display still wins (spike 2026-09-07: the capture showed that
    // application, not this page) — a flight needs a free desktop.
    win.setAlwaysOnTop(true, 'screen-saver');
    const src = 'file:///' + path.resolve(png).replace(/\\/g, '/');
    const html = `<!doctype html><meta charset="utf-8"><title>cue</title>
<style>html,body{margin:0;background:#fff;height:100%;overflow:hidden}img{display:block;max-width:100%;max-height:100%;margin:0 auto}</style>
<img src="${src}">`;
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    win.once('ready-to-show', () => { win.show(); win.moveTop(); win.focus(); });
    setTimeout(() => app.quit(), ms);
});
app.on('window-all-closed', () => app.quit());
