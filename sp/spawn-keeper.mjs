// Stand-in for `run.mjs app:start`: spawn the keeper DETACHED exactly as appStart would, then exit.
import { spawn } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const out = `${process.env.TEMP}\\keeper-test.log`;
if (existsSync(out)) unlinkSync(out);
const keeper = spawn(process.execPath, [`${SP}/keeper-stand-in.mjs`, out], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
});
keeper.unref();
console.log(`spawned keeper pid ${keeper.pid}; this parent exits now. Read ${out} in ~12 s.`);
