// Run after both builds, with other Natively instances closed.
// This opens the real app but does not start recording a meeting.
// Usage: node scripts/verify-windows-icons.cjs <output-directory> [--native]
const { _electron } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.argv[2];
if (process.platform !== 'win32' || !output) throw new Error('Windows and an output directory are required.');
fs.mkdirSync(output, { recursive: true });
const report = [];
let instance;
async function snapshot(label) {
  const state = await instance.evaluate(async ({ app, BrowserWindow, globalShortcut }) => {
    const require = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
    const path = require('node:path');
    const state = require(path.join(app.getAppPath(), 'dist-electron/electron/main.js')).AppState.getInstance();
    const keys = require(path.join(app.getAppPath(), 'dist-electron/electron/services/KeybindManager.js')).KeybindManager.getInstance();
    const windows = await Promise.all(BrowserWindow.getAllWindows().map(async w => ({
      id: w.id, visible: w.isVisible(), bounds: w.getBounds(),
      url: w.webContents.getURL(),
      notice: await Promise.race([
        w.webContents.executeJavaScript('[...document.querySelectorAll("[role=status]")].find(n => n.textContent.includes("Icons hidden:"))?.textContent || ""').catch(() => ''),
        new Promise(resolve => setTimeout(() => resolve('renderer not ready'), 2000)),
      ]),
    })));
    return { pid: process.pid, hidden: state.getBackgroundMode(), undetectable: state.getUndetectable(),
      tray: !!state.tray && !state.tray.isDestroyed(),
      shortcut: keys.getKeybind('general:toggle-background'),
      registered: globalShortcut.isRegistered(keys.getKeybind('general:toggle-background')), windows };
  });
  report.push({ label, ...state });
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(label, JSON.stringify(state));
  return state;
}
async function action(id) {
  await instance.evaluate(async ({ app }, actionId) => {
    const require = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
    const keys = require(require('node:path').join(app.getAppPath(), 'dist-electron/electron/services/KeybindManager.js')).KeybindManager.getInstance();
    for (const callback of keys.onShortcutTriggeredCallbacks) await callback(actionId);
  }, id);
  await new Promise(r => setTimeout(r, 300));
}
(async () => {
  const env = { ...process.env, NODE_ENV: 'production', NATIVELY_AUTOSTART_MEETING: '0' };
  delete env.ELECTRON_RUN_AS_NODE;
  instance = await _electron.launch({ args: [root], env, timeout: 60000 });
  console.log('Electron launched');
  await instance.firstWindow();
  const page = instance.windows().find(p => p.url().includes('window=launcher'))
    || await instance.waitForEvent('window', { predicate: p => p.url().includes('window=launcher'), timeout: 30000 });
  console.log('Launcher selected', page.url());
  page.on('pageerror', err => console.error('Renderer error:', err.message));
  await page.waitForLoadState('domcontentloaded');
  await page.screenshot({ path: path.join(output, 'launcher.png') });
  const dismissInfo = page.getByRole('button', {name: 'All set — continue', exact: true});
  if (await dismissInfo.isVisible()) await dismissInfo.click();
  if (await page.getByRole('button', {name: 'Continue ›', exact: true}).isVisible()) await page.getByRole('button', {name: 'Continue ›', exact: true}).click();
  await page.waitForSelector('[role=status]', { timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('[role=status]')].some(n => n.textContent.includes('Icons hidden: On')));
  const start = await snapshot('startup');
  assert.equal(start.hidden, true); assert.equal(start.undetectable, true);
  assert.equal(start.tray, false); assert.equal(start.registered, true);
  assert(start.windows.some(w => w.visible && w.url.includes('window=launcher')));
  for (const expected of [false, true]) {
    await action('general:toggle-background');
    const next = await snapshot(expected ? 'handler-hide' : 'handler-show');
    assert.equal(next.hidden, expected); assert.equal(next.tray, !expected);
    assert.equal(next.undetectable, true);
    assert.deepEqual(next.windows.map(w => [w.id, w.visible]).sort(), start.windows.map(w => [w.id, w.visible]).sort());
    assert(next.windows.filter(w => w.url.includes('window=launcher') || w.url.includes('window=overlay')).every(w => w.notice.includes(`Icons hidden: ${expected ? 'On' : 'Off'}`)));
  }
  await action('window:move-right');
  const moved = await snapshot('other-shortcut-move-right');
  assert(moved.windows.some(w => w.visible && start.windows.some(s => s.id === w.id && s.bounds.x !== w.bounds.x)));
  await action('window:move-left');
  // A changed binding must reach both reminders, then restore the user's binding.
  try {
    await instance.evaluate(({ app }) => {
      const require = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
      require('./dist-electron/electron/services/KeybindManager.js').KeybindManager.getInstance().setKeybind('general:toggle-background', 'Control+Alt+Shift+B');
    });
    await page.waitForFunction(() => document.querySelector('[role=status] kbd')?.textContent?.includes('Shift'));
    const rebound = await snapshot('configured-shortcut');
    assert(rebound.windows.filter(w => /window=(launcher|overlay)/.test(w.url)).every(w => w.notice.includes('Shift')));
  } finally {
    await instance.evaluate(({ app }, original) => {
      const require = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
      require('./dist-electron/electron/services/KeybindManager.js').KeybindManager.getInstance().setKeybind('general:toggle-background', original);
    }, start.shortcut);
  }
  await page.waitForFunction(() => !document.querySelector('[role=status] kbd')?.textContent?.includes('Shift'));
  await page.screenshot({ path: path.join(output, 'launcher-hidden.png') });
  await instance.evaluate(({ app }) => {
    const require = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
    require('./dist-electron/electron/main.js').AppState.getInstance().getWindowHelper().setWindowMode('overlay');
  });
  const overlay = instance.windows().find(p => p.url().includes('window=overlay'));
  await overlay.waitForSelector('[role=status]');
  await overlay.screenshot({ path: path.join(output, 'meeting-hidden.png') });
  const meetingStart = await snapshot('meeting-hidden');
  for (const expected of [false, true]) {
    await action('general:toggle-background');
    const next = await snapshot(expected ? 'meeting-hide' : 'meeting-show');
    assert.equal(next.hidden, expected); assert.equal(next.tray, !expected);
    assert.deepEqual(next.windows.map(w => [w.id, w.visible]).sort(), meetingStart.windows.map(w => [w.id, w.visible]).sort());
    assert(next.windows.find(w => w.visible && w.url.includes('window=overlay')).notice.includes(`Icons hidden: ${expected ? 'On' : 'Off'}`));
  }
  console.log('AUTOMATED CHECKS PASSED. With --native, control.json accepts overlay, launcher, finish.');
  for (let i = 0; process.argv.includes('--native') && i < 600; i++) {
    const controlFile = path.join(output, 'control.json');
    if (fs.existsSync(controlFile)) {
      const command = JSON.parse(fs.readFileSync(controlFile, 'utf8')).command;
      fs.unlinkSync(controlFile);
      if (command === 'finish') break;
      if (command === 'overlay' || command === 'launcher') {
        await instance.evaluate(({ app }, mode) => {
          const require = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
          require(require('node:path').join(app.getAppPath(), 'dist-electron/electron/main.js')).AppState.getInstance().getWindowHelper().setWindowMode(mode);
        }, command);
      }
    }
    await new Promise(r => setTimeout(r, 1000));
    const last = report[report.length - 1];
    const current = await instance.evaluate(({app}) => process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json')('./dist-electron/electron/main.js').AppState.getInstance().getBackgroundMode());
    if (current !== last.hidden || i % 15 === 0) await snapshot('native-observation');
  }
  await snapshot('final');
})().catch(err => { console.error(err); process.exitCode = 1; }).finally(async () => { if (instance) await instance.close(); });
