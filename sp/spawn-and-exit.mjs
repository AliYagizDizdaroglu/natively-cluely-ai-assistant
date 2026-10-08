// Stand-in for `run.mjs app:start`: spawn NON-detached with appStart's stdio shape, then exit
// at once. The grandchild (cmd -> node) keeps printing for 8 s after this process is gone.
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
const out = process.argv[2];
const fd = openSync(out, 'w');
const child = spawn('cmd.exe', ['/c', 'node -e "console.log(\'t0 alive\'); setTimeout(() => console.log(\'t8 still alive after parent exit\'), 8000)"'], {
    detached: false,
    stdio: ['ignore', fd, fd],
    windowsHide: false,
});
child.unref();
closeSync(fd);
console.log(`intermediate spawned cmd pid ${child.pid}, exiting now`);
