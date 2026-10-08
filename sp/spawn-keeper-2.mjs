import { spawn } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const out = `${process.env.TEMP}\\keeper-test-2.log`;
if (existsSync(out)) unlinkSync(out);
const keeper = spawn(process.execPath, [`${SP}/keeper-stand-in-2.mjs`, out], { detached: true, stdio: 'ignore', windowsHide: false });
keeper.unref();
console.log(`spawned keeper-2 pid ${keeper.pid}`);
