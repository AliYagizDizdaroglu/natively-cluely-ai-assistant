// Would the new stdio wiring actually have caught the line that went missing?
// Same shape as the patched appStart — detached cmd.exe, an owned fd for stdout AND
// stderr, our copy closed straight after — but spawning a stand-in that prints the
// exact message main.ts emits when it loses the single-instance lock, on both streams.
// If this file comes back empty the patch is decoration (rule 8).
import { spawn } from 'node:child_process';
import { openSync, closeSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.env.TEMP ?? '.', 'calibrate-capture-out.log');
if (existsSync(OUT)) unlinkSync(OUT);

const fd = openSync(OUT, 'w');
const child = spawn('cmd.exe', ['/c', 'echo [Main] Another instance is already running. Exiting this instance. & echo STDERR-SIDE 1>&2'], {
    detached: true,
    stdio: ['ignore', fd, fd],
    windowsHide: false,
});
child.unref();
closeSync(fd);

await new Promise((r) => setTimeout(r, 1500));

const got = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
console.log('captured bytes:', got.length);
console.log(JSON.stringify(got));

const okOut = got.includes('Another instance is already running');
const okErr = got.includes('STDERR-SIDE');
console.log(`stdout captured: ${okOut}   stderr captured: ${okErr}`);
if (!okOut || !okErr) { console.error('CALIBRATION FAILED — the patched wiring would not have caught it'); process.exit(1); }
console.log('CALIBRATION OK — a pre-whenReady message on either stream lands in the file');
