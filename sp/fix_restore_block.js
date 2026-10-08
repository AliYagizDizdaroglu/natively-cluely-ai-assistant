const fs = require('fs');
const path = 'electron/main.ts';
const src = fs.readFileSync(path, 'utf8');

const oldLines = [
  '    // Live mode used to live only in memory, so every restart forgot it and an',
  '    // unattended relaunch came up deaf. Restore the stored mode when the',
  '    // meeting starts — the router needs an active meeting anyway.',
  '    {',
  "      const { CredentialsManager } = require('./services/CredentialsManager');",
  '      const stored = CredentialsManager.getInstance().getLiveMode();',
  "      if (stored !== 'off' && this.liveMode === 'off') {",
  '        this.liveMode = stored;',
  '        console.log(`[Main] Live Mode restored → ${stored}`);',
  '        this.startLiveRouter();',
  '      }',
  '    }',
];

const newLines = [
  '    // Live mode used to live only in memory, so every restart forgot it and an',
  '    // unattended relaunch came up deaf. Restore the stored mode when the',
  '    // meeting starts — just the mode, not the router: the deferred audio-init',
  "    // callback below already starts the router once when liveMode !== 'off',",
  '    // the same path an IPC live-mode:set before a meeting takes. Starting it',
  '    // here too would tear it down and rebuild it a tick later (startLiveRouter()',
  '    // begins with stopLiveRouter()).',
  '    {',
  "      const { CredentialsManager } = require('./services/CredentialsManager');",
  '      const stored = CredentialsManager.getInstance().getLiveMode();',
  "      if (stored !== 'off' && this.liveMode === 'off') {",
  '        this.liveMode = stored;',
  '        console.log(`[Main] Live Mode restored → ${stored}`);',
  '      }',
  '    }',
];

const oldBlock = oldLines.join('\r\n');
const newBlock = newLines.join('\r\n');

const count = src.split(oldBlock).length - 1;
if (count !== 1) {
  console.error(`FATAL: expected exactly 1 match for oldBlock, found ${count}`);
  process.exit(1);
}

const out = src.replace(oldBlock, newBlock);
fs.writeFileSync(path, out, 'utf8');
console.log('Replacement applied successfully.');
