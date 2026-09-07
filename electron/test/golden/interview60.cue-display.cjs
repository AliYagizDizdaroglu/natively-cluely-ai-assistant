/**
 * Show one image on the primary display for a while, then quit — the "problem on
 * screen" behind a spoken screenshot cue in an unattended flight.
 *
 *   npx electron electron/test/golden/interview60.cue-display.cjs <png> <ms> [logFile]
 *
 * A frameless, always-on-top window the size of the primary work area, plain white
 * behind the image. The image is inlined as a data URL: a file:// image inside a
 * data: document is blocked by Chromium's origin rules, and would have shown a
 * blank page. After load the page reports the image's natural size to logFile
 * ("image 2260x930 loaded" or "IMAGE FAILED"), so a blank page is a logged failure,
 * not a silent one. An application running exclusive fullscreen on the primary
 * display still wins over this window (spike 2026-09-07: the capture showed that
 * application) — a flight needs a free desktop. The app's own capture
 * (desktopCapturer of its target display) sees this window; the app hides its own
 * windows while it captures.
 */
const { app, BrowserWindow, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const [png, msArg, logFile] = process.argv.slice(2);
const ms = Number(msArg ?? 20000);
const log = (m) => {
    const line = `${new Date().toISOString()} display ${path.basename(png ?? '?')}: ${m}\n`;
    if (logFile) fs.appendFileSync(logFile, line); else process.stdout.write(line);
};
if (!png || !fs.existsSync(png)) { log(`missing image ${png}`); process.exit(2); }

app.whenReady().then(async () => {
    const area = screen.getPrimaryDisplay().workArea;
    const win = new BrowserWindow({
        x: area.x, y: area.y, width: area.width, height: area.height,
        frame: false, alwaysOnTop: true, skipTaskbar: true, backgroundColor: '#ffffff',
        webPreferences: { sandbox: true },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    const src = 'data:image/png;base64,' + fs.readFileSync(png).toString('base64');
    const html = `<!doctype html><meta charset="utf-8"><title>cue</title>
<style>html,body{margin:0;background:#fff;height:100%;overflow:hidden}img{display:block;max-width:100%;max-height:100%;margin:0 auto}</style>
<img src="${src}">`;
    // Quit is scheduled before anything can fail: a rejected load must not leave
    // a white always-on-top window covering the desktop until the next app:stop.
    setTimeout(() => app.quit(), ms);
    try {
        await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    } catch (e) {
        log(`LOAD FAILED: ${e.message}`);
        return;
    }
    win.show(); win.moveTop(); win.focus();
    try {
        const size = await win.webContents.executeJavaScript(`new Promise((resolve) => {
            const i = document.images[0];
            const done = () => resolve(i && i.naturalWidth > 0 ? i.naturalWidth + 'x' + i.naturalHeight : '');
            if (!i) return resolve('');
            if (i.complete) return done();
            i.onload = done; i.onerror = () => resolve(''); setTimeout(done, 3000);
        })`);
        log(size ? `image ${size} loaded, window ${area.width}x${area.height} at ${area.x},${area.y}, showing ${Math.round(ms / 1000)} s` : 'IMAGE FAILED to load');
    } catch (e) { log(`IMAGE CHECK FAILED: ${e.message}`); }
});
app.on('window-all-closed', () => app.quit());
